import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  initializeFirestore,
  getFirestore,
  Firestore
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase App safely
export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Force long-polling and disable fetch streams to eliminate the 10-second backend timeout warning
// in restricted iframe environments, proxies, and web containers.
const databaseId = firebaseConfig.firestoreDatabaseId || '(default)';

let firestoreDb: Firestore;
try {
  firestoreDb = initializeFirestore(
    app,
    {
      experimentalForceLongPolling: true
    },
    databaseId
  );
} catch {
  firestoreDb = getFirestore(app, databaseId);
}

export const db = firestoreDb;

