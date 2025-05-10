import { initializeApp, cert, getApps, App as FirebaseApp } from 'firebase-admin/app';
import { getFirestore, Firestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth, Auth } from 'firebase-admin/auth';
import 'dotenv/config'; // Ensure environment variables are loaded

// We will use console.log for this module to avoid circular dependencies or complex logger setup here.

let app: FirebaseApp;
let dbInstance: Firestore;
let authInstance: Auth;

if (getApps().length === 0) {
  try {
    // For production, use environment variables
    const hasEnvCredentials = 
      process.env.FIREBASE_PROJECT_ID && 
      process.env.FIREBASE_CLIENT_EMAIL && 
      process.env.FIREBASE_PRIVATE_KEY;

    if (hasEnvCredentials) {
      // Initialize using environment variables
      app = initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          // Replace escaped newlines in the private key
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
        }),
        databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com`
      });
      console.log("Firebase Admin SDK initialized successfully using environment variables");
    } else {
      // For development purposes only, use a demo project
      app = initializeApp({
        projectId: 'lemur-86e1b',
      });
      console.log("Firebase Admin SDK initialized with demo project (development only)");
    }
  } catch (error: any) {
    console.error("Error initializing Firebase Admin SDK:", error.message, error.stack);
    throw error; // Rethrow to make it clear initialization failed
  }
} else {
  app = getApps()[0]; // Get the already initialized app
  console.log("Firebase Admin SDK already initialized");
}

dbInstance = getFirestore(app);
authInstance = getAuth(app);

export { app, dbInstance as db, authInstance as auth, FieldValue };
