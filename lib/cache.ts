// A simple in-memory cache for API responses (useful for short TTLs during polling)
interface CacheItem<T> {
  data: T;
  timestamp: number;
}

class MemoryCache {
  private store = new Map<string, CacheItem<any>>();

  set<T>(key: string, data: T, ttlMs: number = 5000) {
    this.store.set(key, {
      data,
      timestamp: Date.now() + ttlMs,
    });
  }

  get<T>(key: string): T | null {
    const item = this.store.get(key);
    if (!item) return null;
    
    if (Date.now() > item.timestamp) {
      this.store.delete(key);
      return null;
    }

    return item.data as T;
  }

  delete(key: string) {
    this.store.delete(key);
  }

  clear() {
    this.store.clear();
  }
}

export const apiCache = new MemoryCache();
