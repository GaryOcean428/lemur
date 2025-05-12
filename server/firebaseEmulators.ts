// Firebase emulator configuration - to be imported by server modules
// This file controls whether Firebase emulators should be used

/**
 * Firebase emulator port configuration
 */
export const FIREBASE_EMULATOR_PORTS = {
  auth: 9099,
  functions: 5001,
  firestore: 8080,
  database: 9000,
  hosting: 5000,
  storage: 9199,
};

// This is the host where emulators are running
export const FIREBASE_EMULATOR_HOST = "127.0.0.1";

/**
 * Determine if Firebase emulators should be used based on the environment
 * @returns boolean indicating whether emulators should be used
 */
export function shouldUseEmulators(): boolean {
  // In development mode, use emulators
  if (process.env.NODE_ENV === "development") {
    return true;
  }
  
  // Check for explicit emulator flag
  if (process.env.USE_FIREBASE_EMULATORS === "true") {
    return true;
  }
  
  // By default, don't use emulators in production
  return false;
}