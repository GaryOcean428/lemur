import { initializeApp, cert, getApps, App as FirebaseApp } from 'firebase-admin/app';
import { getFirestore, Firestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth, Auth } from 'firebase-admin/auth';
import 'dotenv/config'; // Ensure environment variables are loaded

// We will use console.log for this module to avoid circular dependencies or complex logger setup here.

let app: FirebaseApp;
let dbInstance: Firestore;
let authInstance: Auth;

// Check if we have necessary environment variables
const hasEnvCredentials = 
  process.env.FIREBASE_PROJECT_ID && 
  process.env.FIREBASE_CLIENT_EMAIL && 
  process.env.FIREBASE_PRIVATE_KEY;

if (getApps().length === 0) {
  try {
    if (hasEnvCredentials) {
      // Initialize using environment variables (recommended for production)
      app = initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          // Replace escaped newlines in the private key
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
        }),
      });
      console.log("Firebase Admin SDK initialized successfully using environment variables");
    } else {
      // Fallback to service account file (only for development)
      try {
        // Import dynamically to avoid build-time dependency on the file
        const serviceAccount = require('./serviceAccountKey.json');
        app = initializeApp({
          credential: cert(serviceAccount),
        });
        console.log("Firebase Admin SDK initialized using service account file (DEVELOPMENT ONLY)");
        console.warn("WARNING: Using serviceAccountKey.json file is not recommended for production!");
      } catch (fileError) {
        console.error("Failed to load service account file and no environment variables found.");
        console.error("Please set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY environment variables");
        throw new Error("Firebase credentials not available");
      }
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
