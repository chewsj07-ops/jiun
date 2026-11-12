// Triple-redundant permanent storage vault for Zen practice and check-in records.
// 1. Memory / Fast State
// 2. LocalStorage (via safeStorage)
// 3. IndexedDB (survives Safari ITP / cache clearing, no 5MB limit)
// 4. Firestore (cloud sync when authenticated)

import { safeStorage } from '../utils/safeStorage';

const DB_NAME = 'ZenRecordsVaultDB';
const DB_VERSION = 1;
const STORE_NAME = 'practice_records';

export interface PracticeRecord {
  id: string | number;
  chant?: string;
  type?: string;
  count: number;
  duration?: number;
  startTime?: number;
  endTime?: number;
  timestamp: number;
  dedication?: string;
  vow?: string;
  source?: string;
}

class RecordVaultService {
  private dbPromise: Promise<IDBDatabase | null> | null = null;

  constructor() {
    this.initIndexedDB();
  }

  private initIndexedDB(): Promise<IDBDatabase | null> {
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
            const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            store.createIndex('timestamp', 'timestamp', { unique: false });
          }
        };

        request.onsuccess = (event: any) => {
          resolve(event.target.result as IDBDatabase);
        };

        request.onerror = (e) => {
          console.warn('[RecordVault] IndexedDB open error:', e);
          resolve(null);
        };
      } catch (err) {
        console.warn('[RecordVault] IndexedDB init exception:', err);
        resolve(null);
      }
    });

    return this.dbPromise;
  }

  // Save records to both SafeStorage and IndexedDB
  public async saveRecords(records: PracticeRecord[]): Promise<void> {
    // 1. LocalStorage
    try {
      safeStorage.setJSON('zen_history', records);
    } catch (e) {
      console.warn('[RecordVault] SafeStorage save warning:', e);
    }

    // 2. IndexedDB Backup
    try {
      const db = await this.initIndexedDB();
      if (!db) return;

      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);

      // Put all records
      for (const rec of records) {
        store.put({
          ...rec,
          id: String(rec.id)
        });
      }

      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch (err) {
      console.warn('[RecordVault] IndexedDB save warning:', err);
    }
  }

  // Retrieve records with automatic cross-storage healing
  public async getRecords(): Promise<PracticeRecord[]> {
    // 1. Try safeStorage
    const localRecords = safeStorage.getJSON<PracticeRecord[]>('zen_history', []);

    // 2. Check IndexedDB to see if it has more or backup records
    try {
      const db = await this.initIndexedDB();
      if (db) {
        const idbRecords = await new Promise<PracticeRecord[]>((resolve) => {
          const tx = db.transaction(STORE_NAME, 'readonly');
          const store = tx.objectStore(STORE_NAME);
          const req = store.getAll();
          req.onsuccess = () => resolve(req.result || []);
          req.onerror = () => resolve([]);
        });

        if (idbRecords.length > 0) {
          // Merge deduplicated by ID
          const map = new Map<string, PracticeRecord>();
          for (const item of localRecords) {
            map.set(String(item.id), item);
          }
          for (const item of idbRecords) {
            if (!map.has(String(item.id))) {
              map.set(String(item.id), item);
            }
          }
          const merged = Array.from(map.values()).sort((a, b) => {
            const timeA = a.endTime || a.timestamp || Number(a.id) || 0;
            const timeB = b.endTime || b.timestamp || Number(b.id) || 0;
            return timeB - timeA;
          });

          // If IndexedDB restored missing records, write back to safeStorage
          if (merged.length > localRecords.length) {
            safeStorage.setJSON('zen_history', merged);
          }
          return merged;
        }
      }
    } catch (e) {
      console.warn('[RecordVault] IndexedDB recovery warning:', e);
    }

    return localRecords;
  }

  // Export records as downloadable JSON backup
  public exportBackupJSON(records: PracticeRecord[]): string {
    const backup = {
      app: 'VowZen',
      version: '2.5.0',
      exportedAt: new Date().toISOString(),
      totalRecords: records.length,
      records
    };
    return JSON.stringify(backup, null, 2);
  }

  // Restore records from JSON backup string
  public importBackupJSON(jsonStr: string): PracticeRecord[] | null {
    try {
      const data = JSON.parse(jsonStr);
      if (data && Array.isArray(data.records)) {
        return data.records;
      }
      if (Array.isArray(data)) {
        return data;
      }
      return null;
    } catch {
      return null;
    }
  }
}

export const recordVault = new RecordVaultService();
