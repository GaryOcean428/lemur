<<<<<<< HEAD
import 'dotenv/config'; // Load environment variables
=======
>>>>>>> origin/development
// server/index.ts
import express, { type Request, Response, NextFunction } from "express";
import { auth } from "./firebaseAdmin"; // Import auth from the modular firebaseAdmin.ts
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { registerAgent } from "./services/agentRegistryService"; // Added import
import { tavilyAgentDeclaration } from "./agents/tavilyAgent"; // Added import
<<<<<<< HEAD
import cors from 'cors';
=======
>>>>>>> origin/development

// Firebase Admin SDK is initialized in firebaseAdmin.ts

// Middleware to verify Firebase ID token
export const authenticateFirebaseToken = async (req: Request, res: Response, next: NextFunction) => {
<<<<<<< HEAD
  console.log(`[Server Auth] Authenticating request for: ${req.method} ${req.path}`); // Log entry into middleware
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    console.log("[Server Auth] Authorization header missing or not Bearer type.");
=======
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
>>>>>>> origin/development
    return res.status(401).send({ message: "Unauthorized: No token provided or invalid format." });
  }

  const idToken = authHeader.split("Bearer ")[1];
<<<<<<< HEAD

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
=======
  try {
    // Use the imported auth instance directly
    const decodedToken = await auth.verifyIdToken(idToken);
    (req as any).user = decodedToken; // Add Firebase user to request object
    log(`User authenticated: ${decodedToken.uid}`);
    next();
  } catch (error) {
    log("Error verifying Firebase ID token:", error);
    return res.status(403).send({ message: "Forbidden: Invalid or expired token." });
>>>>>>> origin/development
  }
};

const app = express();

<<<<<<< HEAD
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
=======
// Add Content Security Policy middleware to allow WebAssembly
app.use((req, res, next) => {
  // Only apply to HTML requests to avoid affecting API responses
  const acceptHeader = req.headers.accept || 
  if (acceptHeader.includes("text/html")) {
    // Set Content-Security-Policy header to allow WebAssembly and other needed features
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://* wss://*; font-src 'self' data:; frame-src 'self'; object-src 'none'; worker-src 'self' blob:; wasm-unsafe-eval 'self'"
    );
  }
  next();
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if ((req as any).user) {
        logLine += ` (User: ${(req as any).user.uid.substring(0,5)}...)`;
      }
      if (capturedJsonResponse) {
        const responseString = JSON.stringify(capturedJsonResponse);
        if (responseString.length > 50) {
            logLine += ` :: ${responseString.substring(0, 49)}...`;
        } else {
            logLine += ` :: ${responseString}`;
        }
      }

      if (logLine.length > 120) { // Adjusted for potentially longer log lines with user ID
        logLine = logLine.slice(0, 119) + "...";
      }

      log(logLine);
>>>>>>> origin/development
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

<<<<<<< HEAD
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
=======
(async () => {
  // Register agents
  try {
    await registerAgent(tavilyAgentDeclaration);
    log("Tavily agent registered successfully.");
    // Register other agents here as they are developed
  } catch (error) {
    log("Error registering agents:", error);
  }

  const server = await registerRoutes(app); // registerRoutes will now need to handle protected routes

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    log(`Error Handler: ${status} - ${message}`, err.stack);
  });

  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = 8180;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();

>>>>>>> origin/development
