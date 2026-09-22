/**
 * Concurrency Limiter & Backpressure
 *
 * Prevents socket exhaustion, file-descriptor limits, and rate-limit spikes
 * during candidate fan-out and parallel Noul evaluations.
 */

export class Semaphore {
  private currentRunning = 0;
  private queue: Array<() => void> = [];

  constructor(public readonly maxConcurrency: number) {
    if (maxConcurrency < 1) {
      throw new Error("maxConcurrency must be at least 1");
    }
  }

  /**
   * Acquires a permit. Resolves with a release function.
   */
  async acquire(): Promise<() => void> {
    if (this.currentRunning < this.maxConcurrency) {
      this.currentRunning++;
      let released = false;
      return () => {
        if (!released) {
          released = true;
          this.release();
        }
      };
    }

    return new Promise<() => void>((resolve) => {
      this.queue.push(() => {
        this.currentRunning++;
        let released = false;
        resolve(() => {
          if (!released) {
            released = true;
            this.release();
          }
        });
      });
    });
  }

  /**
   * Executes an async task within the semaphore's concurrency limits.
   */
  async withPermit<T>(fn: () => Promise<T>): Promise<T> {
    const release = await this.acquire();
    try {
      return await fn();
    } finally {
      release();
    }
  }

  private release(): void {
    this.currentRunning--;
    if (this.queue.length > 0 && this.currentRunning < this.maxConcurrency) {
      const next = this.queue.shift();
      if (next) next();
    }
  }

  get inFlight(): number {
    return this.currentRunning;
  }

  get waiting(): number {
    return this.queue.length;
  }
}

/**
 * Maps items through an async function with bounded concurrency, preserving order.
 */
export async function limitConcurrency<T, R>(
  items: T[],
  fn: (item: T, index: number) => Promise<R>,
  concurrency = 4
): Promise<R[]> {
  if (items.length === 0) return [];
  const semaphore = new Semaphore(concurrency);
  const tasks = items.map((item, index) =>
    semaphore.withPermit(() => fn(item, index))
  );
  return Promise.all(tasks);
}
