import {
  EmailAuthProvider,
  GoogleAuthProvider,
  deleteUser,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
} from 'firebase/auth';
import { auth } from '../firebase';
import { deleteAllUserFirestoreDocs } from '../services/consentService';
import { safeStorage } from './safeStorage';

export type AccountAuthKind = 'password' | 'google' | 'other' | 'none';

export function detectUserAuthKind(): AccountAuthKind {
  const user = auth.currentUser;
  if (!user) return 'none';
  const providers = user.providerData?.map((p) => p.providerId) || [];
  if (providers.includes('password')) return 'password';
  if (providers.includes('google.com')) return 'google';
  return 'other';
}

export async function reauthenticateCurrentUser(password?: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('请先登录您的账号');
  }

  const kind = detectUserAuthKind();
  if (kind === 'password') {
    if (!user.email) {
      throw new Error('当前账号缺少邮箱信息');
    }
    if (!password) {
      throw new Error('请输入当前密码以确认身份');
    }
    const credential = EmailAuthProvider.credential(user.email, password);
    await reauthenticateWithCredential(user, credential);
    return;
  }

  if (kind === 'google') {
    const provider = new GoogleAuthProvider();
    await reauthenticateWithPopup(user, provider);
    return;
  }

  const fallbackProvider = new GoogleAuthProvider();
  await reauthenticateWithPopup(user, fallbackProvider);
}

export async function executeRealAccountDeletion(password?: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('请先登录后再删除账号');
  }

  // 1. Re-authenticate first so deleteUser won't fail mid-way after wiping data
  await reauthenticateCurrentUser(password);

  // 2. Delete all Firestore user subcollections + root user doc
  await deleteAllUserFirestoreDocs(user.uid);

  // 3. Delete Firebase Auth account
  await deleteUser(user);
}

export function clearAllDevicePracticeData(): void {
  try {
    safeStorage.clear();
  } catch (err) {
    console.warn('safeStorage clear notice:', err);
  }
  try {
    if (typeof indexedDB !== 'undefined') {
      indexedDB.deleteDatabase('ZenMeditationDB');
      indexedDB.deleteDatabase('ZenPracticeVault');
      indexedDB.deleteDatabase('ZenScriptureDB');
    }
  } catch (err) {
    console.warn('IndexedDB clear notice:', err);
  }
}
