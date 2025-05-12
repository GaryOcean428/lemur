/**
 * Firebase Emulator Connection Helper
 * 
 * This file configures the Firebase client SDK to connect to local emulators
 * during development. It follows the Chain of Draft approach:
 * Environment Check → Connect Emulators → Logging
 */
import { getApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { getStorage, connectStorageEmulator } from 'firebase/storage';

/**
 * Configure Firebase emulators for local development
 * Should be called after Firebase initialization
 */
export function connectToEmulators(): void {
  // Only connect to emulators in development
  if (import.meta.env.DEV) {
    try {
      const app = getApp();
      const auth = getAuth(app);
      const firestore = getFirestore(app);
      const functions = getFunctions(app);
      const storage = getStorage(app);
      
      // Use localhost for emulators
      const host = 'localhost';
      
      // Connect to Auth Emulator
      connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true });
      console.log('✅ Connected to Auth Emulator');
      
      // Connect to Firestore Emulator
      connectFirestoreEmulator(firestore, host, 8080);
      console.log('✅ Connected to Firestore Emulator');
      
      // Connect to Functions Emulator
      connectFunctionsEmulator(functions, host, 5001);
      console.log('✅ Connected to Functions Emulator');
      
      // Connect to Storage Emulator
      connectStorageEmulator(storage, host, 9199);
      console.log('✅ Connected to Storage Emulator');
      
      console.log('🔥 All Firebase emulators connected for local development');
    } catch (error) {
      console.error('❌ Failed to connect to Firebase emulators:', error);
      console.warn('⚠️ Make sure emulators are running with: firebase emulators:start');
    }
  }
}

/**
 * Utility function to check if app is running with emulators 
 */
export function isUsingEmulators(): boolean {
  return import.meta.env.DEV && window.location.hostname === 'localhost';
}
