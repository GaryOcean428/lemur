import * as functions from 'firebase-functions';
import express from 'express';
import cors from 'cors';
import { config } from './environment';
import { registerRoutes } from '../server/routes.js';
import { setupAuth } from '../server/auth.js';
import { registerAgent } from '../server/services/agentRegistryService.js';
import { tavilyAgentDeclaration } from '../server/agents/tavilyAgent.js';

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

// Configure middleware
app.use(cors({ origin: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Setup authentication
setupAuth(app);

// Register the Tavily agent
console.log("[Firebase Functions] Registering Tavily agent...");
registerAgent(tavilyAgentDeclaration);
console.log("[Firebase Functions] Tavily agent registered.");

// Register API routes
console.log("[Firebase Functions] Registering routes...");
registerRoutes(app);
console.log("[Firebase Functions] Routes registered.");

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("[Firebase Functions] Error:", err);
  res.status(500).send({ error: 'An unexpected error occurred', message: err.message });
});

// Cloud Function to handle API requests
export const api = functions.region('us-central1').https.onRequest(app);