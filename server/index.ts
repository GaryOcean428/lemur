import express, { type Request, Response, NextFunction } from "express";
import { auth } from "./firebaseAdmin"; // Import auth from the modular firebaseAdmin.ts
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

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
  } catch (error) {
    log("Error verifying Firebase ID token:", error);
    return res.status(403).send({ message: "Forbidden: Invalid or expired token." });
  }
};

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

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
            logLine += ` :: ${responseString.substring(0, 49)}…`;
        } else {
            logLine += ` :: ${responseString}`;
        }
      }

      if (logLine.length > 120) { // Adjusted for potentially longer log lines with user ID
        logLine = logLine.slice(0, 119) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
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

