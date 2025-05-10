import 'dotenv/config'; // Load environment variables
// server/index.ts
import express, { type Request, Response, NextFunction } from "express";
import { auth } from "./firebaseAdmin"; // Import auth from the modular firebaseAdmin.ts
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { registerAgent } from "./services/agentRegistryService"; // Added import
import { tavilyAgentDeclaration } from "./agents/tavilyAgent"; // Added import
import cors from 'cors';

// Firebase Admin SDK is initialized in firebaseAdmin.ts

// Middleware to verify Firebase ID token
export const authenticateFirebaseToken = async (req: Request, res: Response, next: NextFunction) => {
  console.log(`[Server Auth] Authenticating request for: ${req.method} ${req.path}`); // Log entry into middleware
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    console.log("[Server Auth] Authorization header missing or not Bearer type.");
    return res.status(401).send({ message: "Unauthorized: No token provided or invalid format." });
  }

  const idToken = authHeader.split("Bearer ")[1];

  if (!idToken || idToken === "null" || idToken === "undefined" || idToken.trim() === "") {
    console.log("[Server Auth] Bearer token is effectively empty (null, undefined, or whitespace).");
    return res.status(401).send({ message: "Unauthorized: Bearer token is empty or invalid." });
  }

  // Log a longer portion of the token for better inspection if needed, but be mindful of logging sensitive data.
  console.log("[Server Auth] Received ID token starts with:", idToken ? idToken.substring(0, 30) + '...' : 'null/undefined');

  try {
    const decodedToken = await auth.verifyIdToken(idToken);
    console.log("[Server Auth] Token verification successful. Decoded token UID:", decodedToken.uid);
    (req as any).user = decodedToken; // Add Firebase user to request object
    // The 'log' function below seems to be from './vite.ts', for general server logging.
    // Using a standard console.log for clarity within auth logic, or use 'log' if preferred.
    console.log(`[Server Auth] User authenticated: ${decodedToken.uid} for path: ${req.path}`);
    next();
  } catch (error: any) {
    console.error("[Server Auth] Error verifying Firebase ID token. Code:", error.code, "Message:", error.message);
    // For more detailed debugging, you might want to log the full error object during development:
    // console.error("[Server Auth] Full error object during Firebase ID token verification:", error);
    
    // Respond with 403 Forbidden for token verification failures, as per common practice.
    return res.status(403).send({ 
        message: "Forbidden: Invalid, expired, or malformed token.", 
        code: error.code, // Send back the Firebase error code if available
        detail: error.message // Send back the Firebase error message
    });
  }
};

const app = express();

// Setup CORS
const corsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    // Replace with your client's actual origin in production
    const allowedOrigins = [
      'http://localhost:5173', // Vite dev server (adjust port if necessary)
      'http://localhost:9000', // IDX preview
      // Add your production frontend URL here
    ];
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true, // Important for cookies, authorization headers with HTTPS
};
app.use(cors(corsOptions));


app.use(express.json()); // Middleware to parse JSON bodies, crucial for POST/PUT requests

// Initialize agent registry
registerAgent(tavilyAgentDeclaration);

// Set port for the server
const PORT = process.env.PORT || 3000;

// Register API routes first (before any client-side routing)
// All /api routes should be authenticated
app.use('/api', authenticateFirebaseToken); // Apply auth middleware to all /api routes
registerRoutes(app); // This function should define routes like /api/user/status, /api/search etc.

// Register error handling middleware BEFORE starting server but AFTER routes
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error("[Server Error Handler] An unexpected error occurred:", err.stack);
  res.status(500).send({ message: 'Something broke!', error: err.message });
});

// Setup Vite and static file serving (make sure this is correctly ordered)
if (process.env.NODE_ENV === "development") {
  const server = app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
    console.log("Development server running. Vite HMR should be active for the client.");
  });
  setupVite(app, server);
} else {
  serveStatic(app); // Serve static files from 'dist/client' in production
  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}
