import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, GithubAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDK-sGc06yhE24rUWuXzce87zosdyg6D_M",
  authDomain: "lemur-86e1b.firebaseapp.com",
  projectId: "lemur-86e1b",
  storageBucket: "lemur-86e1b.firebasestorage.app",
  messagingSenderId: "152028390182",
  appId: "1:152028390182:web:3b7465b2bf78dbffdfd7e7",
  measurementId: "G-7KXBY7P514"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const googleProvider = new GoogleAuthProvider();
const githubProvider = new GithubAuthProvider();

export { app, auth, db, googleProvider, githubProvider, firebaseConfig };

