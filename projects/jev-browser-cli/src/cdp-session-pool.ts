export interface CdpResponse<T = any> {
  id: number;
  result?: {
    result?: {
      value?: T;
      description?: string;
    };
    exceptionDetails?: {
      exception?: {
        description?: string;
      };
      text?: string;
    };
    [key: string]: any;
  };
  error?: {
    code: number;
    message: string;
  };
}

interface InFlightRequest {
  resolve: (value: any) => void;
  reject: (reason: any) => void;
  timer: NodeJS.Timeout;
}

interface PooledSocket {
  ws: WebSocket;
  wsUrl: string;
  inFlight: Map<number, InFlightRequest>;
  nextId: number;
  idleTimer: NodeJS.Timeout | null;
  isClosing: boolean;
}

export class CdpSessionPool {
  private static instance: CdpSessionPool;
  private pool: Map<string, PooledSocket> = new Map();
  private idleTimeoutMs: number;

  constructor(idleTimeoutMs = 60000) {
    this.idleTimeoutMs = idleTimeoutMs;
  }

  static getInstance(): CdpSessionPool {
    if (!CdpSessionPool.instance) {
      CdpSessionPool.instance = new CdpSessionPool();
    }
    return CdpSessionPool.instance;
  }

  private resetIdleTimer(session: PooledSocket) {
    if (session.idleTimer) {
      clearTimeout(session.idleTimer);
    }
    session.idleTimer = setTimeout(() => {
      this.closeSession(session.wsUrl);
    }, this.idleTimeoutMs);
    if (session.idleTimer && typeof session.idleTimer.unref === "function") {
      session.idleTimer.unref();
    }
  }

  private async getOrCreateSession(wsUrl: string, retryCount = 0): Promise<PooledSocket> {
    const existing = this.pool.get(wsUrl);
    if (existing && !existing.isClosing) {
      if (existing.ws.readyState === WebSocket.OPEN) {
        this.resetIdleTimer(existing);
        return existing;
      }
      if (existing.ws.readyState === WebSocket.CONNECTING) {
        // Wait for connection to open
        return new Promise((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error("Connecting to CDP socket timed out")), 5000);
          const onOpen = () => {
            clearTimeout(timeout);
            existing.ws.removeEventListener("open", onOpen);
            existing.ws.removeEventListener("error", onError);
            resolve(existing);
          };
          const onError = (err: any) => {
            clearTimeout(timeout);
            existing.ws.removeEventListener("open", onOpen);
            existing.ws.removeEventListener("error", onError);
            reject(err);
          };
          existing.ws.addEventListener("open", onOpen);
          existing.ws.addEventListener("error", onError);
        });
      }
    }

    // Clean up stale session if any
    if (existing) {
      this.closeSession(wsUrl);
    }

    // Create new persistent session
    return new Promise((resolve, reject) => {
      let resolved = false;
      const ws = new WebSocket(wsUrl);

      const session: PooledSocket = {
        ws,
        wsUrl,
        inFlight: new Map(),
        nextId: 1,
        idleTimer: null,
        isClosing: false,
      };

      const connectTimer = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          try { ws.close(); } catch {}
          reject(new Error(`Failed to connect to CDP socket at ${wsUrl} within 5000ms`));
        }
      }, 5000);

      ws.onopen = () => {
        if (!resolved) {
          resolved = true;
          clearTimeout(connectTimer);
          this.pool.set(wsUrl, session);
          this.resetIdleTimer(session);
          resolve(session);
        }
      };

      ws.onmessage = (event) => {
        this.resetIdleTimer(session);
        try {
          const data: CdpResponse = JSON.parse(String(event.data));
          const req = session.inFlight.get(data.id);
          if (req) {
            clearTimeout(req.timer);
            session.inFlight.delete(data.id);

            if (data.error) {
              req.reject(new Error(data.error.message || `CDP Error ${data.error.code}`));
            } else if (data.result?.exceptionDetails) {
              const desc =
                data.result.exceptionDetails.exception?.description ||
                data.result.exceptionDetails.text ||
                "JS Evaluation Error";
              req.reject(new Error(desc));
            } else {
              req.resolve(data.result);
            }
          }
        } catch (err) {
          console.error("Error parsing CDP message:", err);
        }
      };

      ws.onerror = (err) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(connectTimer);
          reject(err);
        }
      };

      ws.onclose = () => {
        // Flush any pending in-flight requests
        for (const [id, req] of session.inFlight.entries()) {
          clearTimeout(req.timer);
          req.reject(new Error("CDP socket closed unexpectedly while awaiting response"));
        }
        session.inFlight.clear();
        this.pool.delete(wsUrl);
      };
    });
  }

  /**
   * Executes a CDP method over the persistent pooled connection
   */
  async send<T = any>(
    wsUrl: string,
    method: string,
    params: Record<string, any> = {},
    timeoutMs = 8000,
    maxRetries = 2
  ): Promise<T> {
    let lastError: any;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const session = await this.getOrCreateSession(wsUrl);
        const id = session.nextId++;

        return await new Promise<T>((resolve, reject) => {
          const timer = setTimeout(() => {
            session.inFlight.delete(id);
            reject(new Error(`CDP command ${method} (id=${id}) timed out after ${timeoutMs}ms`));
          }, timeoutMs);

          session.inFlight.set(id, {
            resolve: (result) => resolve(result as T),
            reject,
            timer,
          });

          session.ws.send(JSON.stringify({ id, method, params }));
        });
      } catch (err: any) {
        lastError = err;
        this.closeSession(wsUrl);
        if (attempt < maxRetries) {
          // Exponential backoff
          await new Promise((r) => setTimeout(r, 50 * Math.pow(2, attempt)));
        }
      }
    }

    throw lastError;
  }

  /**
   * Evaluates a JavaScript expression in the page context
   */
  async evaluate<T = any>(wsUrl: string, expression: string, timeoutMs = 8000): Promise<T> {
    const res = await this.send<{ result?: { value?: T } }>(
      wsUrl,
      "Runtime.evaluate",
      {
        expression,
        returnByValue: true,
        awaitPromise: true,
      },
      timeoutMs
    );
    return res?.result?.value as T;
  }

  closeSession(wsUrl: string) {
    const session = this.pool.get(wsUrl);
    if (session) {
      session.isClosing = true;
      if (session.idleTimer) clearTimeout(session.idleTimer);
      for (const [id, req] of session.inFlight.entries()) {
        clearTimeout(req.timer);
        req.reject(new Error("CDP session closed"));
      }
      session.inFlight.clear();
      try {
        session.ws.close();
      } catch {}
      this.pool.delete(wsUrl);
    }
  }

  closeAll() {
    for (const wsUrl of Array.from(this.pool.keys())) {
      this.closeSession(wsUrl);
    }
  }

  getActiveSessionsCount(): number {
    return this.pool.size;
  }
}
