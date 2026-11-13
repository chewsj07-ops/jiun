import { doc, setDoc, deleteDoc, collection, getDocs, writeBatch } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { safeStorage } from '../utils/safeStorage';
import { PRIVACY_VERSION } from '../content/privacyPolicy';

export const CONSENT_STORAGE_KEY = 'zen_consent';

export interface ZenConsentRecord {
  mindConsentVersion?: string;
  mindConsentAt?: string;
  cloudConsentVersion?: string;
  cloudConsentAt?: string;
  cloudSyncOptedOut?: boolean;
  cloudSyncOptedOutAt?: string;
}

const emitConsentUpdated = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('zen_consent_updated'));
  }
};

export const consentService = {
  getConsent(): ZenConsentRecord {
    return safeStorage.getJSON<ZenConsentRecord>(CONSENT_STORAGE_KEY, {});
  },

  saveConsent(next: ZenConsentRecord): ZenConsentRecord {
    safeStorage.setJSON(CONSENT_STORAGE_KEY, next);
    emitConsentUpdated();
    return next;
  },

  hasMindConsent(): boolean {
    const rec = this.getConsent();
    return rec.mindConsentVersion === PRIVACY_VERSION;
  },

  hasCloudConsent(): boolean {
    const rec = this.getConsent();
    return rec.cloudConsentVersion === PRIVACY_VERSION && !rec.cloudSyncOptedOut;
  },

  isCloudSyncOptedOut(): boolean {
    const rec = this.getConsent();
    return Boolean(rec.cloudSyncOptedOut);
  },

  hasLegacyThoughts(): boolean {
    const thoughts = safeStorage.getJSON<unknown[]>('zen_thoughts', []);
    return Array.isArray(thoughts) && thoughts.length > 0;
  },

  async syncConsentToCloud(uid: string, rec: ZenConsentRecord): Promise<void> {
    if (!uid || !auth.currentUser || auth.currentUser.uid !== uid) return;
    if (rec.cloudConsentVersion !== PRIVACY_VERSION || rec.cloudSyncOptedOut) return;

    const payload: Record<string, unknown> = {
      cloudSyncOptedOut: Boolean(rec.cloudSyncOptedOut),
      updatedAt: new Date().toISOString(),
    };
    if (rec.mindConsentVersion) payload.mindConsentVersion = rec.mindConsentVersion;
    if (rec.mindConsentAt) payload.mindConsentAt = rec.mindConsentAt;
    if (rec.cloudConsentVersion) payload.cloudConsentVersion = rec.cloudConsentVersion;
    if (rec.cloudConsentAt) payload.cloudConsentAt = rec.cloudConsentAt;
    if (rec.cloudSyncOptedOutAt) payload.cloudSyncOptedOutAt = rec.cloudSyncOptedOutAt;

    try {
      await setDoc(doc(db, 'users', uid, 'private', 'consent'), payload, { merge: true });
    } catch (err) {
      console.warn('Sync consent to cloud notice:', err);
    }
  },

  async grantMindConsent(): Promise<ZenConsentRecord> {
    const current = this.getConsent();
    const updated: ZenConsentRecord = {
      ...current,
      mindConsentVersion: PRIVACY_VERSION,
      mindConsentAt: new Date().toISOString(),
    };
    this.saveConsent(updated);
    if (auth.currentUser?.uid && updated.cloudConsentVersion === PRIVACY_VERSION && !updated.cloudSyncOptedOut) {
      await this.syncConsentToCloud(auth.currentUser.uid, updated);
    }
    return updated;
  },

  async grantCloudConsent(): Promise<ZenConsentRecord> {
    const current = this.getConsent();
    const updated: ZenConsentRecord = {
      ...current,
      cloudConsentVersion: PRIVACY_VERSION,
      cloudConsentAt: new Date().toISOString(),
      cloudSyncOptedOut: false,
    };
    delete updated.cloudSyncOptedOutAt;
    this.saveConsent(updated);
    if (auth.currentUser?.uid) {
      await this.syncConsentToCloud(auth.currentUser.uid, updated);
    }
    return updated;
  },

  optOutCloudSync(): ZenConsentRecord {
    const current = this.getConsent();
    const updated: ZenConsentRecord = {
      ...current,
      cloudSyncOptedOut: true,
      cloudSyncOptedOutAt: new Date().toISOString(),
    };
    delete updated.cloudConsentVersion;
    delete updated.cloudConsentAt;
    return this.saveConsent(updated);
  },

  async withdrawMindConsent(deleteAllMindRecords: boolean): Promise<ZenConsentRecord> {
    const current = this.getConsent();
    const updated: ZenConsentRecord = { ...current };
    delete updated.mindConsentVersion;
    delete updated.mindConsentAt;
    this.saveConsent(updated);

    if (deleteAllMindRecords) {
      safeStorage.removeItem('zen_thoughts');
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('zen_thoughts_updated', { detail: { sourceId: 'consent_withdrawal' } }));
        window.dispatchEvent(new CustomEvent('zen_data_updated'));
      }
      if (auth.currentUser?.uid) {
        await deleteCollectionDocs(auth.currentUser.uid, 'thoughts');
      }
    }

    if (auth.currentUser?.uid && updated.cloudConsentVersion === PRIVACY_VERSION && !updated.cloudSyncOptedOut) {
      await setDoc(
        doc(db, 'users', auth.currentUser.uid, 'private', 'consent'),
        {
          mindConsentVersion: '',
          mindConsentAt: '',
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      ).catch(() => {});
    }

    return updated;
  },

  async withdrawCloudConsent(deleteCloudData: boolean): Promise<ZenConsentRecord> {
    const uid = auth.currentUser?.uid;
    if (deleteCloudData && uid) {
      await deleteAllUserFirestoreDocs(uid);
    } else if (uid) {
      await setDoc(
        doc(db, 'users', uid, 'private', 'consent'),
        {
          cloudConsentVersion: '',
          cloudConsentAt: '',
          cloudSyncOptedOut: true,
          cloudSyncOptedOutAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      ).catch(() => {});
    }

    return this.optOutCloudSync();
  },
};

export async function deleteCollectionDocs(uid: string, subcollection: string): Promise<void> {
  const colRef = collection(db, 'users', uid, subcollection);
  const snap = await getDocs(colRef);
  if (snap.empty) return;

  const docs = snap.docs;
  for (let i = 0; i < docs.length; i += 400) {
    const chunk = docs.slice(i, i + 400);
    const batch = writeBatch(db);
    chunk.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
}

export async function deleteAllUserFirestoreDocs(uid: string): Promise<void> {
  const subcollections = ['thoughts', 'goodDeeds', 'history', 'vows', 'private'];
  for (const sub of subcollections) {
    await deleteCollectionDocs(uid, sub);
  }
  await deleteDoc(doc(db, 'users', uid)).catch(() => {});
}
