import { initializeApp, cert, getApps, App as FirebaseApp } from 'firebase-admin/app';
import { getFirestore, Firestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth, Auth } from 'firebase-admin/auth';
import 'dotenv/config'; // Ensure environment variables are loaded

// Import Firebase emulator configuration
import { shouldUseEmulators, FIREBASE_EMULATOR_PORTS, FIREBASE_EMULATOR_HOST } from './firebaseEmulators';

// We will use console.log for this module to avoid circular dependencies or complex logger setup here.

let app: FirebaseApp;
let dbInstance: Firestore;
let authInstance: Auth;

// Check if we should use emulators
const isEmulatorMode = shouldUseEmulators();

// In emulator mode, we don't need real credentials
if (getApps().length === 0) {
  try {
    if (isEmulatorMode) {
      // For emulator mode, use demo project credentials
      console.log("🔑 Running in Firebase Emulator mode - using demo project credentials");
      app = initializeApp({
        projectId: 'demo-lemur-project',
      });
    } else {
      // For production, use real credentials
      const hasEnvCredentials = 
        process.env.FIREBASE_PROJECT_ID && 
        process.env.FIREBASE_CLIENT_EMAIL && 
        process.env.FIREBASE_PRIVATE_KEY;

      if (hasEnvCredentials) {
        // Initialize using environment variables (recommended for production)
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
    }
  } catch (error: any) {
    console.error("Error initializing Firebase Admin SDK:", error.message, error.stack);
    throw error; // Rethrow to make it clear initialization failed
  }
} else {
  app = getApps()[0]; // Get the already initialized app
  console.log("Firebase Admin SDK already initialized");
}

// Initialize Firestore and Auth
dbInstance = getFirestore(app);
authInstance = getAuth(app);

// Connect to emulators if in development environment
if (shouldUseEmulators()) {
  const host = FIREBASE_EMULATOR_HOST;
  console.log(`Running in development mode - connecting to Firebase emulators on ${host}`);
  
  // Connect Firestore to the emulator
  dbInstance.settings({
    host: `${host}:${FIREBASE_EMULATOR_PORTS.firestore}`,
    ssl: false,
  });
  console.log(`🔥 Firestore connected to emulator at ${host}:${FIREBASE_EMULATOR_PORTS.firestore}`);
  
  // Configure Auth to use the emulator
  process.env.FIREBASE_AUTH_EMULATOR_HOST = `${host}:${FIREBASE_EMULATOR_PORTS.auth}`;
  console.log(`🔑 Auth connected to emulator at ${host}:${FIREBASE_EMULATOR_PORTS.auth}`);
}

export { app, dbInstance as db, authInstance as auth, FieldValue };
