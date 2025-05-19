console.log("[Server Index] server/index.ts starting...");
import 'dotenv/config'; // Load environment variables
import express, { type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import { registerRoutes } from "./routes.js";
import { auth } from "./firebaseAdmin.js"; // Import auth from the modular firebaseAdmin.ts
// import { setupAuth } from "./auth.js"; // Not used, consider removing if confirmed
// import { shouldUseEmulators } from "./firebaseEmulators.js"; // Not used, consider removing if confirmed
import { registerAgent } from "./services/agentRegistryService.js";
import { tavilyAgentDeclaration } from "./agents/tavilyAgent.js";
import { setupVite } from "./vite.js";
import { serveStatic } from "./vite.js";

// Top-level request logger
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`[Server Index - Global Request Logger] Received: ${req.method} ${req.originalUrl} from ${req.ip}`);
  next();
});

// Middleware to verify Firebase ID token
export const authenticateFirebaseToken = async (req: Request, res: Response, next: NextFunction) => {
  console.log(`[Server Auth Middleware] Attempting to authenticate: ${req.method} ${req.path}`);
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    console.warn("[Server Auth Middleware] FAIL: Authorization header missing or not Bearer type.");
    return res.status(401).send({ message: "Unauthorized: No token provided or invalid format." });
  }

  const idToken = authHeader.split("Bearer ")[1];

  if (!idToken || idToken === "null" || idToken === "undefined" || idToken.trim() === "") {
    console.warn("[Server Auth Middleware] FAIL: Bearer token is effectively empty.");
    return res.status(401).send({ message: "Unauthorized: Bearer token is empty or invalid." });
  }

  // console.log("[Server Auth Middleware] Received ID token starts with:", idToken ? idToken.substring(0, 30) + '...' : 'null/undefined');

  try {
    const decodedToken = await auth.verifyIdToken(idToken);
    // console.log("[Server Auth Middleware] Token verification successful. UID:", decodedToken.uid);
    (req as any).user = decodedToken;
    console.log(`[Server Auth Middleware] SUCCESS: User ${decodedToken.uid} authenticated for path: ${req.path}. Calling next().`);
    next();
  } catch (error: any) {
    console.error("[Server Auth Middleware] FAIL: Error verifying Firebase ID token. Code:", error.code, "Message:", error.message);
    return res.status(403).send({
        message: "Forbidden: Invalid, expired, or malformed token.",
        code: error.code,
        detail: error.message
    });
  }
};

console.log("[Server Index] Initializing Express app...");
const app = express();

// Setup CORS
console.log("[Server Index] Configuring CORS...");
const corsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    if (!origin) return callback(null, true); // Allow requests with no origin

    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:9000',
      'http://localhost:5080',
    ];
    if (process.env.PORT) {
        allowedOrigins.push(`http://localhost:${process.env.PORT}`);
    }
    if (process.env.VITE_APP_PORT) { // Also check VITE_APP_PORT for client dev server
        allowedOrigins.push(`http://localhost:${process.env.VITE_APP_PORT}`);
    }
    if (process.env.PREVIEW_URL) {
        allowedOrigins.push(process.env.PREVIEW_URL);
    }
    // Dynamically add the cluster URL if present
    const clusterUrlKey = Object.keys(process.env).find(key => key.startsWith('GOOGLE_CLOUD_WORKSTATIONS_CLUSTER_URL_') && key.endsWith(process.env.PORT || '9000'));
    if (clusterUrlKey && process.env[clusterUrlKey]) {
        allowedOrigins.push(process.env[clusterUrlKey]!);
    }

    if (allowedOrigins.some(allowedOrigin => origin.startsWith(allowedOrigin))) {
      return callback(null, true);
    } else {
      console.warn(`[Server Index] CORS Denied: Origin ${origin} not in allowed list: ${allowedOrigins.join(', ')}`);
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
  },
  credentials: true,
};
app.use(cors(corsOptions));

console.log("[Server Index] Configuring express.json middleware...");
app.use(express.json());

// Add debug logging for all /api routes
app.use('/api', (req, res, next) => {
  console.log(`[Server Index - API Debug Entry] INCOMING: ${req.method} ${req.originalUrl}`);
  // console.log('[API Debug] Headers:', JSON.stringify(req.headers, null, 2));
  next();
});

// Initialize agent registry
console.log("[Server Index] Registering Tavily agent...");
registerAgent(tavilyAgentDeclaration);
console.log("[Server Index] Tavily agent registered.");

// Set port for the server
const PORT = parseInt(process.env.SERVER_PORT || "5080", 10);
console.log(`[Server Index] Server port set to: ${PORT}`);

// Register API routes
console.log("[Server Index] Calling registerRoutes(app)...");
registerRoutes(app);
console.log("[Server Index] registerRoutes(app) finished.");

// Debug handler for unhandled /api routes
app.use('/api/:path*', (req, res, next) => {
  console.warn(`[Server Index - Unhandled API Route] 404: ${req.method} ${req.originalUrl} - This route was not handled by registerRoutes.`);
  res.status(404).json({ error: 'API route not found by Express. This means it was not defined in server/routes.ts or a sub-router.', path: req.originalUrl });
});

// General Error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error("[Server Index - General Error Handler] An unexpected error occurred:", err);
  const status = err.status || err.statusCode || 500;
  res.status(status).send({ message: err.message || 'Something broke unexpectedly on the server!', stack: process.env.NODE_ENV === 'development' ? err.stack : undefined });
});

// Setup Vite and static file serving
async function startServer() {
  console.log(`[Server Index] Starting server in ${process.env.NODE_ENV} mode...`);
  if (process.env.NODE_ENV === "development") {
    // When Vite's own dev server (e.g., on port 9000) proxies /api to this server (e.g., on 5080),
    // this Express server primarily acts as an API backend.
    // The setupVite(app, server) call here would integrate Vite's middleware into this Express app,
    // which might be redundant or an alternative way if not using Vite's separate dev server + proxy.
    // For now, keeping it to see logs, but this could be simplified if proxy is the main dev workflow.
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`[Server Index] Development Backend server (Express on ${PORT}) listening on http://0.0.0.0:${PORT}`);
      // console.log("[Server Index] Vite HMR will be set up by server/vite.ts if setupVite is called.");
    });
    await setupVite(app, server); // This integrates Vite's dev middleware into the Express app.
                                 // If vite.config.js proxy is used, this Express app (5080)
                                 // mainly serves API, and Vite dev server (9000) serves client.
  } else {
    serveStatic(app); // In production, Express serves static client files and API routes.
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`[Server Index] Production server (Express on ${PORT}) listening on http://0.0.0.0:${PORT}`);
    });
  }
}

startServer().catch(error => {
  console.error("[Server Index] FATAL: Failed to start server:", error);
  process.exit(1);
});
