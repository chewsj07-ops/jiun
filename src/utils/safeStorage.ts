// Exception-safe storage wrapper for iOS Safari, WebViews, and private browsing modes.
// Fallbacks to in-memory store if localStorage throws SecurityError or QuotaExceededError.

class SafeStorage {
  private memoryStore: Map<string, string> = new Map();
  private isStorageAvailable: boolean;

  constructor() {
    this.isStorageAvailable = this.checkAvailability();
  }

  private checkAvailability(): boolean {
    if (typeof window === 'undefined' || !window.localStorage) {
      return false;
    }
    try {
      const testKey = '__zen_storage_test__';
      window.localStorage.setItem(testKey, '1');
      window.localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  public getItem(key: string, fallback: string | null = null): string | null {
    if (this.isStorageAvailable) {
      try {
        const val = window.localStorage.getItem(key);
        return val !== null ? val : fallback;
      } catch (err) {
        console.warn(`[SafeStorage] Error reading ${key}, falling back to memory:`, err);
      }
    }
    return this.memoryStore.has(key) ? this.memoryStore.get(key)! : fallback;
  }

  public setItem(key: string, value: string): void {
    if (this.isStorageAvailable) {
      try {
        window.localStorage.setItem(key, value);
        return;
      } catch (err) {
        console.warn(`[SafeStorage] Error setting ${key}, using memory fallback:`, err);
      }
    }
    this.memoryStore.set(key, value);
  }

  public removeItem(key: string): void {
    if (this.isStorageAvailable) {
      try {
        window.localStorage.removeItem(key);
      } catch (err) {
        console.warn(`[SafeStorage] Error removing ${key}:`, err);
      }
    }
    this.memoryStore.delete(key);
  }

  public clear(): void {
    if (this.isStorageAvailable) {
      try {
        window.localStorage.clear();
      } catch (err) {
        console.warn(`[SafeStorage] Error clearing localStorage:`, err);
      }
    }
    this.memoryStore.clear();
  }

  public getJSON<T>(key: string, fallback: T): T {
    const raw = this.getItem(key);
    if (!raw) return fallback;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  }

  public setJSON<T>(key: string, value: T): void {
    try {
      this.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn(`[SafeStorage] Failed to stringify JSON for key ${key}:`, e);
    }
  }
}

export const safeStorage = new SafeStorage();
