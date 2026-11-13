import { ScriptureEntry } from '../data/scripturesDatabase';
import { safeStorage } from '../utils/safeStorage';

const DB_NAME = 'ZenScripturesVaultDB';
const DB_VERSION = 1;
const STORE_NAME = 'custom_scriptures';
const FAVORITES_KEY = 'zen_favorite_scriptures';
const CUSTOM_SCRIPTURES_KEY = 'zen_custom_scriptures';

class ScriptureDatabaseService {
  private dbPromise: Promise<IDBDatabase | null> | null = null;

  constructor() {
    this.initDB();
  }

  private initDB(): Promise<IDBDatabase | null> {
    if (this.dbPromise) return this.dbPromise;
    if (typeof window === 'undefined' || !window.indexedDB) {
      this.dbPromise = Promise.resolve(null);
      return this.dbPromise;
    }

    this.dbPromise = new Promise((resolve) => {
      try {
        const request = window.indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = (event: any) => {
          const db = event.target.result as IDBDatabase;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          }
        };
        request.onsuccess = (event: any) => resolve(event.target.result as IDBDatabase);
        request.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });

    return this.dbPromise;
  }

  public async saveCustomScriptures(items: ScriptureEntry[]): Promise<void> {
    safeStorage.setJSON(CUSTOM_SCRIPTURES_KEY, items);
    try {
      const db = await this.initDB();
      if (!db) return;
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.clear();
      for (const item of items) {
        store.put({ ...item, isCustom: true });
      }
    } catch (e) {
      console.warn('[ScriptureDB] IndexedDB save notice:', e);
    }
  }

  public async getCustomScriptures(): Promise<ScriptureEntry[]> {
    const localItems = safeStorage.getJSON<ScriptureEntry[]>(CUSTOM_SCRIPTURES_KEY, []);
    try {
      const db = await this.initDB();
      if (!db) return localItems;
      const idbItems = await new Promise<ScriptureEntry[]>((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      });

      if (idbItems.length > localItems.length) {
        safeStorage.setJSON(CUSTOM_SCRIPTURES_KEY, idbItems);
        return idbItems;
      }
    } catch {
      // Fallback to local
    }
    return localItems;
  }

  public getFavorites(): string[] {
    return safeStorage.getJSON<string[]>(FAVORITES_KEY, []);
  }

  public toggleFavorite(id: string): string[] {
    const current = this.getFavorites();
    const next = current.includes(id)
      ? current.filter(fid => fid !== id)
      : [...current, id];
    safeStorage.setJSON(FAVORITES_KEY, next);
    return next;
  }

  public searchScriptures(
    allScriptures: ScriptureEntry[],
    query: string,
    category: 'all' | 'sutra' | 'mantra' | 'name' | 'meditation' | 'favorites' | 'custom',
    favoriteIds: string[]
  ): ScriptureEntry[] {
    const q = query.trim().toLowerCase();
    return allScriptures.filter((item) => {
      if (category === 'favorites' && !favoriteIds.includes(item.id)) return false;
      if (category === 'custom' && !item.id.startsWith('custom-') && !item.isCustom) return false;
      if (
        category !== 'all' &&
        category !== 'favorites' &&
        category !== 'custom' &&
        item.category !== category
      ) {
        return false;
      }

      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        (item.subtitle && item.subtitle.toLowerCase().includes(q)) ||
        (item.source && item.source.toLowerCase().includes(q)) ||
        item.content.toLowerCase().includes(q) ||
        (item.pinyin && item.pinyin.toLowerCase().includes(q)) ||
        (item.explanation && item.explanation.toLowerCase().includes(q)) ||
        (item.keyTakeaway && item.keyTakeaway.toLowerCase().includes(q))
      );
    });
  }

  public exportDatabaseJSON(allScriptures: ScriptureEntry[]): string {
    return JSON.stringify(
      {
        name: 'VowZen Buddhist Scriptures Database',
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        count: allScriptures.length,
        scriptures: allScriptures.map(s => ({
          id: s.id,
          title: s.title,
          subtitle: s.subtitle || '',
          category: s.category,
          source: s.source || '',
          content: s.content,
          pinyin: s.pinyin || '',
          explanation: s.explanation || '',
          keyTakeaway: s.keyTakeaway || ''
        }))
      },
      null,
      2
    );
  }
}

export const scriptureDatabaseService = new ScriptureDatabaseService();
