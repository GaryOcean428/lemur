// Firebase Functions and Admin SDK imports
import * as functions from 'firebase-functions';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth, UserRecord } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// Express and middleware imports
import express from 'express';
import cors from 'cors';

// Local application imports
import { config } from './environment.js';
import { registerRoutes } from '../server/routes.js';
import { setupAuth } from '../server/auth.js';
import { registerAgent } from '../server/services/agentRegistryService.js';
import { tavilyAgentDeclaration } from '../server/agents/tavilyAgent.js';

// Function execution configuration - optimize for cost and performance
type RuntimeOptions = {
  timeoutSeconds: number;
  memory: '128MB' | '256MB' | '512MB' | '1GB' | '2GB' | '4GB' | '8GB';
  minInstances: number;
  maxInstances: number;
};

const runtimeOpts: RuntimeOptions = {
  timeoutSeconds: 60,       // Maximum execution time
  memory: '256MB',          // Memory allocation
  minInstances: 0,          // Minimum instances (scale to zero when not in use)
  maxInstances: 10          // Maximum concurrent instances for cost control
};

// Define regions for multi-regional deployment
const regions = ['us-central1', 'asia-east1'];

// Initialize Express app
const app = express();

// Log critical config presence (without exposing sensitive values)
const configCheck = {
  firebase: config.firebase.projectId ? '✅' : '❌',
  database: config.database.url ? '✅' : '❌',
  apis: {
    groq: config.apis.groq ? '✅' : '❌',
    openai: config.apis.openai ? '✅' : '❌',
    tavily: config.apis.tavily ? '✅' : '❌',
    stripe: config.apis.stripe.secretKey ? '✅' : '❌'
  },
  redis: config.redis.url ? '✅' : '❌'
};
console.log("[Firebase Functions] Configuration check:", configCheck);

// Add request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
  });
  next();
});

// Configure security middleware
app.use(cors({ 
  origin: ['https://lemur-86e1b.web.app', 'https://lemur-86e1b.firebaseapp.com'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
  maxAge: 86400 // 24 hours
}));

// Configure parsing middleware
app.use(express.json({ limit: '1mb' })); // Limit payload size
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Setup authentication
setupAuth(app);

// Register the Tavily agent
console.log("[Firebase Functions] Registering Tavily agent...");
registerAgent(tavilyAgentDeclaration);
console.log("[Firebase Functions] Tavily agent registered.");

// Add App Check verification middleware
app.use((req, res, next) => {
  const appCheckClaims = req.headers['x-firebase-appcheck'];
  
  // Skip verification in development environment
  if (process.env.NODE_ENV === 'development') {
    return next();
  }
  
  // For production, verify App Check claims
  if (!appCheckClaims) {
    console.warn("[Firebase Functions] Missing App Check claims for:", req.path);
    // Don't block requests without App Check in initial deployment
    // Once fully implemented, change to: return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
});

// Register API routes
console.log("[Firebase Functions] Registering routes...");
registerRoutes(app);
console.log("[Firebase Functions] Routes registered.");

// Add 404 handler for unmatched routes
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Not Found', 
    message: `Route not found: ${req.method} ${req.originalUrl}` 
  });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  // Don't expose stack traces in production
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Log detailed error information
  console.error("[Firebase Functions] Error:", {
    path: req.path,
    method: req.method,
    message: err.message,
    stack: err.stack,
    timestamp: new Date().toISOString()
  });
  
  // Send sanitized error response
  res.status(err.status || 500).json({ 
    error: 'An unexpected error occurred', 
    message: err.message || 'Server error',
    code: err.code,
    stack: isProduction ? undefined : err.stack
  });
});

// Define multi-regional API with optimal configurations for performance and cost
export const api = functions
  .runWith(runtimeOpts)
  .region(...regions)
  .https.onRequest(app);

// Background function to clean up old search history using Cloud Scheduler
export const cleanupSearchHistory = functions
  .runWith({
    timeoutSeconds: 540, // 9 minutes to handle larger cleanups
    memory: '1GB'
  })
  .region('us-central1') // Run cleanup in a single region to avoid conflicts
  .pubsub.schedule('every 24 hours')
  .onRun(async (context) => {
    console.log("Running scheduled search history cleanup");
    // Code to clean up old search history would go here
    // This function should delete search history older than X days
    return null;
  });

// Auth trigger to create new user profile in Firestore when users sign up
export const createUserProfile = functions
  .region('us-central1') // Authentication triggers in single region
  .auth.user().onCreate(async (user) => {
    console.log(`Creating user profile for ${user.uid}`);
    // User creation code would go here
    return null;
  });