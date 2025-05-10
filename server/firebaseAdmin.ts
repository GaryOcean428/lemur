import { initializeApp, cert, getApps, App as FirebaseApp } from 'firebase-admin/app';
import { getFirestore, Firestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth, Auth } from 'firebase-admin/auth';

// Import the service account key using ESM syntax for JSON modules
// This requires Node.js v16.14+ or v17.5+ and the --experimental-json-modules flag if not enabled by default by tsx
// Or, if tsx handles it directly, this should work.
import serviceAccount from "./serviceAccountKey.json" assert { type: "json" };

// We will use console.log for this module to avoid circular dependencies or complex logger setup here.

let app: FirebaseApp;
let dbInstance: Firestore;
let authInstance: Auth;

if (getApps().length === 0) {
  try {
    app = initializeApp({
      credential: cert(serviceAccount as any), // Cast as any if type issues arise with the import
    });
    console.log("Firebase Admin SDK initialized successfully in firebaseAdmin.ts (modular).");
  } catch (error: any) {
    console.error("Error initializing Firebase Admin SDK in firebaseAdmin.ts (modular):", error.message, error.stack);
    throw error; // Rethrow to make it clear initialization failed
  }
} else {
  app = getApps()[0]; // Get the already initialized app
  console.log("Firebase Admin SDK already initialized (checked by getApps().length in firebaseAdmin.ts - modular).");
}

dbInstance = getFirestore(app);
authInstance = getAuth(app);

export { app, dbInstance as db, authInstance as auth, FieldValue };
