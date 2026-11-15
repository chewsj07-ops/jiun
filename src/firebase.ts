import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
const configWithDb = firebaseConfig as typeof firebaseConfig & {
  firestoreDatabaseId?: string;
};
const firestoreDatabaseId =
  configWithDb.firestoreDatabaseId || 'ai-studio-036bf2e8-69bc-4d05-ab44-ddb837094012';
export const db = getFirestore(app, firestoreDatabaseId);
export const auth = getAuth(app); 
 