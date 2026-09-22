/**
 * Two-Tier Persistent Cache (L1 RAM + L2 Disk)
 *
 * Prevents cold-start latency and preserves exact cache hits across CLI invocations.
 * L1: Instant RAM lookup (<0.1ms).
 * L2: Persistent atomic disk storage at ~/.jev/cache.json with TTL & LRU management.
 */

import * as fs from "fs";
import * as path from "path";
import * as os from "os";

export interface CacheEntry<T> {
  value: T;
  createdAtMs: number;
  expiresAtMs: number;
  lastAccessedMs: number;
  hits: number;
}

export interface TwoTierCacheOptions {
  diskPath?: string;
  defaultTtlMs?: number;
  maxEntries?: number;
  autoPersistOnSet?: boolean;
}

export class TwoTierPersistentCache<T = any> {
  private l1 = new Map<string, CacheEntry<T>>();
  private diskPath: string;
  private defaultTtlMs: number;
  private maxEntries: number;
  private autoPersistOnSet: boolean;
  private hits = 0;
  private misses = 0;
  private isNodeEnv = false;

  constructor(options: TwoTierCacheOptions = {}) {
    this.defaultTtlMs = options.defaultTtlMs ?? 24 * 60 * 60 * 1000; // 24h default
    this.maxEntries = options.maxEntries ?? 2000;
    this.autoPersistOnSet = options.autoPersistOnSet ?? true;

    try {
      if (typeof process !== "undefined" && process.versions && process.versions.node) {
        this.isNodeEnv = true;
      }
    } catch {
      this.isNodeEnv = false;
    }

    if (options.diskPath) {
      this.diskPath = options.diskPath;
    } else if (this.isNodeEnv) {
      const jevDir = path.join(os.homedir(), ".jev");
      this.diskPath = path.join(jevDir, "cache.json");
    } else {
      this.diskPath = "";
    }

    this.rehydrateFromDisk();
  }

  /**
   * Rehydrates L1 cache from L2 disk storage.
   */
  private rehydrateFromDisk(): void {
    if (!this.isNodeEnv || !this.diskPath) return;

    try {
      if (fs.existsSync(this.diskPath)) {
        const raw = fs.readFileSync(this.diskPath, "utf-8");
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          const now = Date.now();
          for (const [k, v] of Object.entries(parsed)) {
            const entry = v as CacheEntry<T>;
            if (entry && entry.expiresAtMs > now) {
              this.l1.set(k, entry);
            }
          }
        }
      }
    } catch {
      // Degrade gracefully on read error or corrupted disk cache
    }
  }

  /**
   * Retrieves value from cache if present and unexpired.
   */
  get(key: string): T | undefined {
    const entry = this.l1.get(key);
    if (!entry) {
      this.misses++;
      return undefined;
    }

    const now = Date.now();
    if (now > entry.expiresAtMs) {
      this.l1.delete(key);
      this.misses++;
      return undefined;
    }

    entry.lastAccessedMs = now;
    entry.hits++;
    this.hits++;
    return entry.value;
  }

  /**
   * Checks if unexpired key exists.
   */
  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  /**
   * Inserts or updates cache entry.
   */
  set(key: string, value: T, ttlMs?: number): void {
    const now = Date.now();
    const expiresAtMs = now + (ttlMs ?? this.defaultTtlMs);

    // Evict oldest if exceeding max entries
    if (this.l1.size >= this.maxEntries && !this.l1.has(key)) {
      this.evictLru();
    }

    this.l1.set(key, {
      value,
      createdAtMs: now,
      expiresAtMs,
      lastAccessedMs: now,
      hits: 0,
    });

    if (this.autoPersistOnSet) {
      this.flushToDisk();
    }
  }

  /**
   * Deletes a key from cache.
   */
  delete(key: string): boolean {
    const deleted = this.l1.delete(key);
    if (deleted && this.autoPersistOnSet) {
      this.flushToDisk();
    }
    return deleted;
  }

  /**
   * Evicts least recently used / lowest accessed item.
   */
  private evictLru(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [k, entry] of this.l1.entries()) {
      if (entry.lastAccessedMs < oldestTime) {
        oldestTime = entry.lastAccessedMs;
        oldestKey = k;
      }
    }

    if (oldestKey) {
      this.l1.delete(oldestKey);
    }
  }

  /**
   * Atomically flushes L1 cache to L2 disk file via temporary swap.
   */
  flushToDisk(): void {
    if (!this.isNodeEnv || !this.diskPath) return;

    try {
      const dir = path.dirname(this.diskPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const dump: Record<string, CacheEntry<T>> = {};
      const now = Date.now();

      for (const [k, entry] of this.l1.entries()) {
        if (entry.expiresAtMs > now) {
          dump[k] = entry;
        }
      }

      const tmpPath = `${this.diskPath}.tmp.${Date.now()}`;
      fs.writeFileSync(tmpPath, JSON.stringify(dump, null, 2), "utf-8");
      fs.renameSync(tmpPath, this.diskPath);
    } catch {
      // Graceful degradation on permission or disk write error
    }
  }

  /**
   * Clears entire cache.
   */
  clear(): void {
    this.l1.clear();
    if (this.isNodeEnv && this.diskPath && fs.existsSync(this.diskPath)) {
      try {
        fs.unlinkSync(this.diskPath);
      } catch {}
    }
  }

  stats(): { l1Size: number; diskPath: string; hits: number; misses: number } {
    return {
      l1Size: this.l1.size,
      diskPath: this.diskPath,
      hits: this.hits,
      misses: this.misses,
    };
  }
}
