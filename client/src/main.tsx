import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles/globals.css";

// Initialize Firebase App Check before any other Firebase services
import "./firebaseAppCheck";
// Initialize other Firebase services
import "./firebaseConfigDirect";

// Connect to emulators in development environment
import { connectToEmulators } from "./firebaseEmulators";

// Debug flag for developers - remove in production
const FORCE_EMULATORS = false;

// Only connect to emulators in development mode
if (import.meta.env.DEV || FORCE_EMULATORS) {
  connectToEmulators();
  
  // Developer feedback
  console.log("🧪 Running in development mode with Firebase emulators");
  console.log("📊 Firebase Emulator UI available at: http://localhost:4000");
}

createRoot(document.getElementById("root")!).render(<App />);
