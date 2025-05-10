import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, GithubAuthProvider, connectAuthEmulator } from "firebase/auth";
import {
  getFirestore,
  connectFirestoreEmulator,
  Firestore,
  enableMultiTabIndexedDbPersistence
} from "firebase/firestore";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and Firestore
const auth = getAuth(app);
const db: Firestore = getFirestore(app); // Initialize db once

// Determine if emulators should be used
// VITE_USE_FIREBASE_EMULATORS can be set to 'true' in your .env file for local development
const isLocalhost = window.location.hostname === "localhost";
const useEmulators = import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true' || isLocalhost;

if (useEmulators) {
  console.log("Using Firebase Auth and Firestore emulators");
  try {
    connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
    connectFirestoreEmulator(db, 'localhost', 8080); // Use the 'db' instance directly
    console.log("Successfully connected to Auth and Firestore emulators.");
  } catch (error) {
    console.error("Error connecting to Firebase emulators:", error);
  }
}

if (!useEmulators) {
  // Enable multi-tab persistence only when not using emulators
  enableMultiTabIndexedDbPersistence(db)
    .then(() => {
      console.log("Firestore persistence enabled");
    })
    .catch((err) => {
      if (err.code === 'failed-precondition') {
        console.warn("Firestore persistence failed: Multiple tabs open, persistence can only be enabled in one tab at a time. Or, persistence already enabled.");
      } else if (err.code === 'unimplemented') {
        console.warn("Firestore persistence failed: The current browser does not support all of the features required to enable persistence.");
      } else {
        console.error("Firestore persistence error:", err);
      }
    });
}

const googleProvider = new GoogleAuthProvider();
const githubProvider = new GithubAuthProvider();

export { app, auth, db, googleProvider, githubProvider };
