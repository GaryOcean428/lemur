import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, GithubAuthProvider, connectAuthEmulator } from "firebase/auth";
import {
  getFirestore,
  connectFirestoreEmulator,
  Firestore,
  enableMultiTabIndexedDbPersistence
} from "firebase/firestore";

// Direct Firebase configuration (no env variables)
const firebaseConfig = {
  apiKey: "AIzaSyDK-sGc06yhE24rUWuXzce87zosdyg6D_M",
  authDomain: "lemur-86e1b.firebaseapp.com",
  projectId: "lemur-86e1b",
  storageBucket: "lemur-86e1b.appspot.com",
  messagingSenderId: "152028390182",
  appId: "1:152028390182:web:3b7465b2bf78dbffdfd7e7",
  measurementId: "G-7KXBY7P514"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and Firestore
const auth = getAuth(app);
const db: Firestore = getFirestore(app);

// Determine if emulators should be used
const isLocalhost = window.location.hostname === "localhost";
const useEmulators = isLocalhost;

if (useEmulators) {
  console.log("Using Firebase Auth and Firestore emulators");
  try {
    connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
    connectFirestoreEmulator(db, 'localhost', 8080);
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
        console.warn("Firestore persistence failed: Multiple tabs open, persistence can only be enabled in one tab at a time.");
      } else if (err.code === 'unimplemented') {
        console.warn("Firestore persistence failed: The current browser does not support all required features.");
      } else {
        console.error("Firestore persistence error:", err);
      }
    });
}

const googleProvider = new GoogleAuthProvider();
const githubProvider = new GithubAuthProvider();

export { app, auth, db, googleProvider, githubProvider, firebaseConfig };