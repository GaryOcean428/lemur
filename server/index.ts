import 'dotenv/config'; // Load environment variables
import express, { type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import { registerRoutes } from "./routes.js";
import { auth } from "./firebaseAdmin.js"; // Import auth from the modular firebaseAdmin.ts
import { setupAuth } from "./auth.js";
import { shouldUseEmulators } from "./firebaseEmulators.js";
import { registerAgent } from "./services/agentRegistryService.js";
import { tavilyAgentDeclaration } from "./agents/tavilyAgent.js";
import { setupVite } from "./vite.js";
import { serveStatic } from "./vite.js";

// Middleware to verify Firebase ID token
export const authenticateFirebaseToken = async (req: Request, res: Response, next: NextFunction) => {
  console.log(`[Server Auth] Authenticating request for: ${req.method} ${req.path}`);
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

  console.log("[Server Auth] Received ID token starts with:", idToken ? idToken.substring(0, 30) + '...' : 'null/undefined');

  try {
    const decodedToken = await auth.verifyIdToken(idToken);
    console.log("[Server Auth] Token verification successful. Decoded token UID:", decodedToken.uid);
    (req as any).user = decodedToken;
    console.log(`[Server Auth] User authenticated: ${decodedToken.uid} for path: ${req.path}`);
    next();
  } catch (error: any) {
    console.error("[Server Auth] Error verifying Firebase ID token. Code:", error.code, "Message:", error.message);
    return res.status(403).send({
        message: "Forbidden: Invalid, expired, or malformed token.",
        code: error.code,
        detail: error.message
    });
  }
};

const app = express();

// Setup CORS
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
    
    if (process.env.PREVIEW_URL) {
        allowedOrigins.push(process.env.PREVIEW_URL);
    }

    if (allowedOrigins.some(allowedOrigin => origin.startsWith(allowedOrigin))) {
      return callback(null, true);
    } else {
      console.warn(`CORS: Origin ${origin} not allowed. Allowed: ${allowedOrigins.join(', ')}`);
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
  },
  credentials: true,
};
app.use(cors(corsOptions));

app.use(express.json());

// Add debug logging for all /api routes
app.use('/api', (req, res, next) => {
  console.log(`[API Debug] ${req.method} ${req.path}`);
  console.log('[API Debug] Headers:', JSON.stringify(req.headers, null, 2));
  next();
});

// Initialize agent registry
registerAgent(tavilyAgentDeclaration);
console.log("Tavily agent registered.");

// Set port for the server
const PORT = parseInt(process.env.SERVER_PORT || "5080", 10);

// Register API routes
registerRoutes(app);

// Debug handler for unhandled /api routes
app.use('/api/:path*', (req, res, next) => {
  console.log(`[DEBUG] Unhandled /api path: ${req.originalUrl} - THIS SHOULD NOT HAPPEN FOR DEFINED ROUTES`);
  res.status(404).json({ error: 'API route not found by Express, fell to debug handler' });
});

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error("[Server Error Handler] An unexpected error occurred:", err.stack);
  const status = err.status || err.statusCode || 500;
  res.status(status).send({ message: err.message || 'Something broke!' });
});

// Setup Vite and static file serving
async function startServer() {
  if (process.env.NODE_ENV === "development") {
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`Backend server listening on port ${PORT}`);
      console.log("Development mode. Vite HMR will be set up by server/vite.ts.");
    });
    await setupVite(app, server);
  } else {
    serveStatic(app);
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Production server listening on port ${PORT}`);
    });
  }
}

startServer().catch(error => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
