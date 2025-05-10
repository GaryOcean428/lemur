/**
 * Firebase Emulators Configuration
 * 
 * This file contains configuration constants for connecting to Firebase emulators
 * during local development. It's used by both the client and server code.
 */

// Emulator ports (matching firebase.json)
export const FIREBASE_EMULATOR_PORTS = {
  auth: 9099,
  firestore: 8080,
  functions: 5001,
  database: 9000,
  hosting: 5000,
  storage: 9199,
};

// Host - typically localhost for local development
export const FIREBASE_EMULATOR_HOST = 'localhost';

// Determine if we should use emulators
export const shouldUseEmulators = (): boolean => {
  // Check for specific environment variables or hostname
  const isCloudWorkspace = process.env.HOSTNAME?.includes('cloudworkstations.dev') || false;
  const isLocalhost = process.env.NODE_ENV !== 'production';
  
  // Enable emulators for local development and cloud workspaces
  return isLocalhost || isCloudWorkspace;
};

// Get emulator URLs for use in API endpoints
export const getEmulatorUrls = () => {
  const host = FIREBASE_EMULATOR_HOST;
  return {
    authUrl: `http://${host}:${FIREBASE_EMULATOR_PORTS.auth}`,
    firestoreUrl: `http://${host}:${FIREBASE_EMULATOR_PORTS.firestore}`,
    functionsUrl: `http://${host}:${FIREBASE_EMULATOR_PORTS.functions}`,
    databaseUrl: `http://${host}:${FIREBASE_EMULATOR_PORTS.database}`,
    storageUrl: `http://${host}:${FIREBASE_EMULATOR_PORTS.storage}`,
  };
};
