import 'dotenv/config'; // Load environment variables
// server/index.ts
import express, { type Request, Response, NextFunction } from "express";
import { auth } from "./firebaseAdmin"; // Import auth from the modular firebaseAdmin.ts
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { registerAgent } from "./services/agentRegistryService"; // Added import
import { tavilyAgentDeclaration } from "./agents/tavilyAgent"; // Added import

// Firebase Admin SDK is initialized in firebaseAdmin.ts

// Middleware to verify Firebase ID token
export const authenticateFirebaseToken = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).send({ message: "Unauthorized: No token provided or invalid format." });
  }

  const idToken = authHeader.split("Bearer ")[1];
  try {
    // Use the imported auth instance directly
    const decodedToken = await auth.verifyIdToken(idToken);
    (req as any).user = decodedToken; // Add Firebase user to request object
    log(`User authenticated: ${decodedToken.uid}`);
    next();
  } catch (error: any) {
    log("Error verifying Firebase ID token:", error.message || error);
    return res.status(403).send({ message: "Forbidden: Invalid or expired token." });
  }
};

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Add Content Security Policy middleware to allow WebAssembly
app.use((req, res, next) => {
  // Only apply to HTML requests to avoid affecting API responses
  const acceptHeader = req.headers.accept || '';
  if (acceptHeader.includes("text/html")) {
    // Set Content-Security-Policy header to allow WebAssembly and other needed features
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://replit.com https://apis.google.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https:; connect-src 'self' https://* wss://*; font-src 'self' data: https://fonts.gstatic.com; frame-src 'self' https://apis.google.com https://*.google.com https://*.firebaseapp.com; object-src 'none'; worker-src 'self' blob:"
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
    }
  });

  next();
});

(async () => {
  // Register agents
  try {
    await registerAgent(tavilyAgentDeclaration);
    log("Tavily agent registered successfully.");
    // Register other agents here as they are developed
  } catch (error: any) {
    log("Error registering agents:", error.message || String(error));
  }

  const server = await registerRoutes(app); // registerRoutes will now need to handle protected routes

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    let logMessage = `Error Handler: ${status} - ${message}`;
    if (err.stack) {
      logMessage += `
Stack: ${err.stack}`;
    }
    log(logMessage);
  });

  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Determine port from command line arguments or default to 8180
  let port = 8180;
  const portArgIndex = process.argv.indexOf('--port');
  if (portArgIndex !== -1 && process.argv[portArgIndex + 1]) {
    const parsedPort = parseInt(process.argv[portArgIndex + 1], 10);
    if (!isNaN(parsedPort)) {
      port = parsedPort;
    }
  }

  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
