// Audio chunking, progressive buffering and offline cache service using IndexedDB
// Prevents high bandwidth consumption and mobile memory overflows on long meditation audio.

const DB_NAME = 'ZenAudioCacheDB';
const DB_VERSION = 1;
const STORE_NAME = 'audio_cache';

interface AudioCacheRecord {
  url: string;
  blob: Blob;
  size: number;
  mimeType: string;
  updatedAt: number;
}

class AudioStreamService {
  private dbPromise: Promise<IDBDatabase> | null = null;
  private activeBlobs: Map<string, string> = new Map(); // url -> objectUrl

  private getDB(): Promise<IDBDatabase> {
    if (!this.dbPromise) {
      this.dbPromise = new Promise((resolve, reject) => {
        if (typeof indexedDB === 'undefined') {
          return reject(new Error('IndexedDB not supported'));
        }
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME, { keyPath: 'url' });
          }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    }
    return this.dbPromise;
  }

  public async hasCachedAudio(url: string): Promise<boolean> {
    if (!url || url.startsWith('blob:') || url.startsWith('data:')) return true;
    try {
      const db = await this.getDB();
      return new Promise<boolean>((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(url);
        req.onsuccess = () => resolve(!!req.result);
        req.onerror = () => resolve(false);
      });
    } catch {
      return false;
    }
  }

  public async getCachedAudioUrl(url: string): Promise<string> {
    if (!url || url.startsWith('blob:') || url.startsWith('data:')) {
      return url;
    }

    // Return in-memory active object url if already loaded
    if (this.activeBlobs.has(url)) {
      return this.activeBlobs.get(url)!;
    }

    try {
      const db = await this.getDB();
      const record = await new Promise<AudioCacheRecord | null>((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(url);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      });

      if (record && record.blob) {
        const blobUrl = URL.createObjectURL(record.blob);
        this.activeBlobs.set(url, blobUrl);
        return blobUrl;
      }
    } catch (e) {
      console.warn('[AudioStreamService] Cache lookup error:', e);
    }

    // Trigger progressive background buffering if not in cache
    this.bufferAndCache(url).catch(() => {});
    return url;
  }

  public async bufferAndCache(url: string, onProgress?: (pct: number) => void): Promise<string | null> {
    if (!url || url.startsWith('blob:') || url.startsWith('data:')) return null;

    try {
      const isAlreadyCached = await this.hasCachedAudio(url);
      if (isAlreadyCached) {
        return this.getCachedAudioUrl(url);
      }

      const response = await fetch(url);
      if (!response.ok || !response.body) {
        return null;
      }

      const contentLength = response.headers.get('content-length');
      const totalBytes = contentLength ? parseInt(contentLength, 10) : 0;
      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      let receivedBytes = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value);
          receivedBytes += value.length;
          if (totalBytes > 0 && onProgress) {
            onProgress(Math.round((receivedBytes / totalBytes) * 100));
          }
        }
      }

      const mimeType = response.headers.get('content-type') || 'audio/mpeg';
      const blob = new Blob(chunks as unknown as BlobPart[], { type: mimeType });

      // Save to IndexedDB
      const db = await this.getDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const record: AudioCacheRecord = {
          url,
          blob,
          size: blob.size,
          mimeType,
          updatedAt: Date.now()
        };
        store.put(record);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });

      const blobUrl = URL.createObjectURL(blob);
      this.activeBlobs.set(url, blobUrl);
      return blobUrl;
    } catch (err) {
      console.warn('[AudioStreamService] Progressive buffering notice:', err);
      return null;
    }
  }

  public cleanupMemoryUrls(): void {
    for (const [_, blobUrl] of this.activeBlobs) {
      try {
        URL.revokeObjectURL(blobUrl);
      } catch {}
    }
    this.activeBlobs.clear();
  }
}

export const audioStreamService = new AudioStreamService();
