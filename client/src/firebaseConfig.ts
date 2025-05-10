import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, GithubAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: "lemur-86e1b.firebaseapp.com",
  projectId: "lemur-86e1b",
  storageBucket: "lemur-86e1b.firebasestorage.app", // Corrected from .appspot.com
  messagingSenderId: "152028390182", // This was different in .env.local, using this one from user's paste
  appId: "1:152028390182:web:3b7465b2bf78dbffdfd7e7", // This was different in .env.local
  measurementId: "G-7KXBY7P514" // This was different in .env.local
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const googleProvider = new GoogleAuthProvider();
const githubProvider = new GithubAuthProvider();

export { app, auth, db, googleProvider, githubProvider, firebaseConfig };
