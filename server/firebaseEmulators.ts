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
  console.log('[firebaseEmulators.ts] Checking if emulators should be used...');
  const nodeEnv = process.env.NODE_ENV;
  const hostname = process.env.HOSTNAME;
  const firebaseEmulatorHubHost = process.env.FIREBASE_EMULATOR_HUB_HOST;
  
  console.log(`[firebaseEmulators.ts] NODE_ENV: ${nodeEnv}`);
  console.log(`[firebaseEmulators.ts] HOSTNAME: ${hostname}`);
  console.log(`[firebaseEmulators.ts] FIREBASE_EMULATOR_HUB_HOST: ${firebaseEmulatorHubHost}`);

  const isCloudWorkspace = hostname?.includes('cloudworkstations.dev') || false;
  // It's safer to explicitly check for 'development' or if FIREBASE_EMULATOR_HUB_HOST is set.
  const isDevelopmentMode = nodeEnv === 'development';
  const isEmulatorHubSet = typeof firebaseEmulatorHubHost === 'string' && firebaseEmulatorHubHost.length > 0;

  const useEmulators = isDevelopmentMode || isCloudWorkspace || isEmulatorHubSet;
  
  console.log(`[firebaseEmulators.ts] isCloudWorkspace: ${isCloudWorkspace}`);
  console.log(`[firebaseEmulators.ts] isDevelopmentMode: ${isDevelopmentMode}`);
  console.log(`[firebaseEmulators.ts] isEmulatorHubSet: ${isEmulatorHubSet}`);
  console.log(`[firebaseEmulators.ts] Calculated shouldUseEmulators: ${useEmulators}`);
  
  return useEmulators;
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
