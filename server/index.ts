// server/index.ts
import 'dotenv/config'; // Load environment variables
import express, { type Request, Response, NextFunction } from "express";
import { auth } from "./firebaseAdmin"; // Import auth from the modular firebaseAdmin.ts
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { registerAgent } from "./services/agentRegistryService"; // Added import
import { tavilyAgentDeclaration } from "./agents/tavilyAgent"; // Added import
import cors from 'cors';
import path from 'path';
import session from 'express-session';

// Extend express-session with our custom properties
declare module 'express-session' {
  interface SessionData {
    anonymousSearchCount?: number;
    conversationContext?: Array<{
      query: string;
      answer?: string;
      timestamp: number;
    }>;
  }
}

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
    log(`Error verifying Firebase ID token: ${error.message || String(error)}`);
    return res.status(403).send({ message: "Forbidden: Invalid or expired token." });
  }
};

const app = express();

// Add Content Security Policy middleware to allow WebAssembly
app.use((req, res, next) => {
  // Only apply to HTML requests to avoid affecting API responses
  const acceptHeader = req.headers.accept || '';
  if (acceptHeader.includes("text/html")) {
    // Set Content-Security-Policy header to allow WebAssembly and other needed features
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://* wss://*; font-src 'self' data:; frame-src 'self'; object-src 'none'; worker-src 'self' blob:;"
    );
  }
  
  // Replit-specific: Allow embedding in Replit frames
  res.removeHeader('X-Frame-Options');
  
  // Add CORS headers for Replit environment
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  next();
});

// Setup CORS - using more permissive options for Replit environment
const corsOptions = {
  origin: '*', // Allow all origins in Replit environment
  methods: ['GET', 'POST', 'DELETE', 'UPDATE', 'PUT', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204
};

// Apply CORS to all routes
app.use(cors(corsOptions));

// Configure session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'lemur-search-secret-key',
  resave: false,
  saveUninitialized: true,
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Log information about the CORS setup
log(`CORS configured to allow all origins in Replit environment`);

// Add request logging middleware
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


app.use(express.json()); // Middleware to parse JSON bodies, crucial for POST/PUT requests

// Add a simple test route to verify server is working
app.get('/test', (req, res) => {
  log('Test route accessed');
  res.json({ 
    message: 'Server is running correctly',
    time: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    host: req.headers.host,
    origin: req.headers.origin || 'unknown'
  });
});

// Add a test page route that serves the HTML directly to bypass Vite
app.get('/testpage', (req, res) => {
  log('Test page accessed');
  res.sendFile(path.resolve(import.meta.dirname, '..', 'client', 'public', 'test.html'));
});

// Special entry point for Replit environment to bypass Vite host restrictions
app.get('/entry', (req, res) => {
  log('Entry point accessed');
  res.sendFile(path.resolve(import.meta.dirname, '..', 'client', 'public', 'entry.html'));
});

// Standalone HTML that works without Vite - fully functional client app
app.get('/standalone', (req, res) => {
  log('Standalone HTML accessed');
  res.sendFile(path.resolve(import.meta.dirname, '..', 'client', 'public', 'standalone.html'));
});

// Anonymous search API - doesn't require authentication
app.post('/api/anonymous-search', async (req, res) => {
  try {
    log('Anonymous search accessed');
    const { query } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Missing search query' });
    }
    
    // Increment session-based search count
    let anonymousSearchCount = req.session?.anonymousSearchCount || 0;
    anonymousSearchCount++;
    
    if (req.session) {
      req.session.anonymousSearchCount = anonymousSearchCount;
    }
    
    // Limit anonymous searches per session
    if (anonymousSearchCount > 1) {
      return res.status(429).json({ 
        error: 'Anonymous search limit reached',
        message: 'You have reached the limit for anonymous searches. Please sign in to continue searching.' 
      });
    }

    // Just return a simple example response for now
    res.json({
      answer: `This is a placeholder response for the query: "${query}"`,
      sources: [
        { title: "Example Source 1", url: "https://example.com/1" },
        { title: "Example Source 2", url: "https://example.com/2" }
      ]
    });
  } catch (err: any) {
    log('Error in anonymous search: ' + err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Serve the main app with a special route that doesn't use Vite's development server
app.get('/app', (req, res) => {
  log('App route accessed - serving without Vite validation');
  // For Replit compatibility, we'll serve the entire app through our Express server
  res.sendFile(path.resolve(import.meta.dirname, '..', 'client', 'index.html'));
});

// All /api routes should be authenticated (except anonymous search which is defined above)
app.use('/api', authenticateFirebaseToken); // Apply auth middleware to all /api routes

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
    log(`Error Handler: ${status} - ${message}`, err.stack);
  });

  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
