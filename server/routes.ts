console.log("[Server Routes] server/routes.ts starting...");
// server/routes.ts
import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { db, FieldValue } from "./firebaseAdmin.js";
import { authenticateFirebaseToken } from "../index.js"; // Standardized import
import express from "express";

import { directGroqCompoundSearch } from "./directCompound.js";
import { validateGroqModel, mapModelPreference, APPROVED_MODELS } from "./utils/modelValidation.js";
import fetch from "node-fetch";

// Stripe imports
import Stripe from "stripe";
import {
  getOrCreateStripeCustomer,
  createSubscriptionCheckoutSession,
  createBillingPortalSession,
  handleStripeWebhook,
  // PRICE_IDS, // Not directly used in this file, consider removing if not needed by imported functions
} from "./services/stripeService.js";

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn("[Server Routes] Warning: Missing STRIPE_SECRET_KEY environment variable");
}

// Initialize Stripe with the secret key if available
let stripe: Stripe | null = null;
try {
  if (process.env.STRIPE_SECRET_KEY) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2025-04-30.basil", // Ensure this is the version you intend to use
      typescript: true,
    });
    console.log(`[Server Routes] Stripe initialized successfully. Key starts with: ${process.env.STRIPE_SECRET_KEY.substring(0, 8)}...`);
  }
} catch (error) {
  console.error("[Server Routes] Error initializing Stripe:", error);
}

// Serper Google Scholar import
import { serperGoogleScholarSearch } from "./integrations/serperGoogleScholarSearch.js";

// Import Tavily search interfaces
import { tavilySearch, type TavilySearchResult } from "./tavilySearch.js";
// import { tavilyDeepResearch, tavilyExtractContent, TavilyDeepResearchResponse } from "./utils/tavilyDeepResearch.js"; // Not used, consider removing
// import { performAgenticResearch, ResearchState, AgenticResearchProgress } from "./utils/agenticResearch.js"; // Not used, consider removing

// Import Orchestrator routes
import orchestratorRoutes from "./routes/orchestratorRoutes.js";

// Tier definitions
const TIERS = {
  FREE: { name: "free", searchLimit: 20, model: "llama3-8b-8192", restrictedModels: ["mixtral-8x7b-32768", "gemma-7b-it"] }, 
  BASIC: { name: "basic", searchLimit: 100, model: "llama3-70b-8192", restrictedModels: ["mixtral-8x7b-32768"] }, 
  PRO: { name: "pro", searchLimit: Infinity, model: "mixtral-8x7b-32768", restrictedModels: [] }, 
};

interface GroqChoice {
  message: { content: string; role: string; };
  index: number;
  finish_reason: string;
}

interface GroqResponse {
  id: string;
  choices: GroqChoice[];
  model: string;
}

async function checkUserTierAndLimits(userId: string, requestedModel?: string): Promise<{ allowed: boolean; message: string; modelToUse: string; tier: string }> {
  const userRef = db.collection("users").doc(userId);
  const userDoc = await userRef.get();

  if (!userDoc.exists) {
    return { allowed: false, message: "User not found.", modelToUse: TIERS.FREE.model, tier: "unknown" };
  }

  const userData = userDoc.data()!;
  const tierName = userData.tier || "free";
  const currentTier = TIERS[tierName.toUpperCase() as keyof typeof TIERS] || TIERS.FREE;
  const searchCount = userData.searchCount || 0;

  if (searchCount >= currentTier.searchLimit && currentTier.searchLimit !== Infinity) {
    return { allowed: false, message: `Search limit reached for ${currentTier.name} tier. Please upgrade for more searches.`, modelToUse: currentTier.model, tier: currentTier.name };
  }

  let modelToUse = requestedModel ? mapModelPreference(requestedModel) : currentTier.model;
  modelToUse = validateGroqModel(modelToUse);

  if (currentTier.restrictedModels.includes(modelToUse) && modelToUse !== currentTier.model) {
    return { 
        allowed: false, 
        message: `Model ${modelToUse} is not available for your current tier (${currentTier.name}). Your tier allows ${currentTier.model}.`, 
        modelToUse: currentTier.model, 
        tier: currentTier.name 
    };
  } else if (!APPROVED_MODELS.includes(modelToUse)) {
    return { allowed: false, message: `Model ${modelToUse} is not an approved model.`, modelToUse: currentTier.model, tier: currentTier.name };
  }
  
  if (requestedModel && APPROVED_MODELS.includes(mapModelPreference(requestedModel)) && !currentTier.restrictedModels.includes(mapModelPreference(requestedModel))) {
    modelToUse = mapModelPreference(requestedModel);
  } else {
    modelToUse = currentTier.model;
  }
  modelToUse = validateGroqModel(modelToUse);

  return { allowed: true, message: "Access granted.", modelToUse, tier: currentTier.name };
}

async function incrementSearchCount(userId: string) {
  const userRef = db.collection("users").doc(userId);
  try {
    await userRef.update({
      searchCount: FieldValue.increment(1),
      lastSearchAt: FieldValue.serverTimestamp()
    });
  } catch (error) {
    console.error("[Server Routes] Error incrementing search count:", error);
    // Decide if this error should propagate or be handled silently
  }
}

async function groqSearchWithTiers(query: string, sources: TavilySearchResult[], apiKey: string, userId: string, requestedModelPref: string = "auto"): Promise<{answer: string; model: string; error?: string}> {
  const tierCheck = await checkUserTierAndLimits(userId, requestedModelPref);
  if (!tierCheck.allowed) {
    return { answer: "", model: tierCheck.modelToUse, error: tierCheck.message };
  }

  const model = tierCheck.modelToUse;
  // console.log(`[Server Routes] User ${userId.substring(0,5)} (${tierCheck.tier} tier) using Groq model: ${model} for synthesis`);

  let promptContent: string;
  if (sources && sources.length > 0) {
    const context = sources.map((source, index) => 
      `Source ${index + 1}:
Title: ${source.title}
URL: ${source.url}
Content: ${source.content.substring(0, 1000)}
` // Limit context length per source
    ).join("
");
    promptContent = `You are a helpful search assistant. Based on the following search results, provide a comprehensive answer to the query: "${query}". Cite sources as [Source X].

Context:
${context}

Answer:`;
  } else {
    promptContent = `You are Lemur, an advanced search assistant. The query is: "${query}". External web search is currently unavailable or no sources were provided. Provide a helpful answer based on your general knowledge, acknowledging this limitation if applicable.`;
  }

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: "system", content: "You are a helpful search assistant." },
          { role: "user", content: promptContent }
        ],
        temperature: 0.2,
        max_tokens: 2000,
      }),
    });
  
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Groq API error ${response.status}: ${errorText}`);
    }
  
    const data = await response.json() as GroqResponse;
    if (!data.choices || data.choices.length === 0) throw new Error("No response from Groq API (empty choices)");
    
    await incrementSearchCount(userId);
    return { answer: data.choices[0].message.content, model: data.model };

  } catch (error) {
    console.error(`[Server Routes] Groq API call error for user ${userId}:`, error);
    return { answer: "", model: model, error: error instanceof Error ? error.message : "Groq API communication error" };
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  console.log("[Server Routes] ENTERING registerRoutes function. Setting up application routes...");

  // Stripe Webhook - Special parsing, must be before global express.json()
  console.log("[Server Routes] Registering (raw body): POST /api/stripe/webhook");
  app.post("/api/stripe/webhook", express.raw({type: "application/json"}), async (req: Request, res: Response) => {
    console.log("[Server Routes - /api/stripe/webhook] Handler execution started.");
    const sig = req.headers["stripe-signature"];
    try {
      const handled = await handleStripeWebhook(sig, req.body);
      if (handled) {
        console.log("[Server Routes - /api/stripe/webhook] OK: Webhook event handled.");
        res.json({ received: true });
      } else {
        console.warn("[Server Routes - /api/stripe/webhook] WARN: Webhook event not handled by handleStripeWebhook.");
        res.status(400).send("Webhook Error: Could not handle event type or signature mismatch.");
      }
    } catch (err: any) {
      console.error("[Server Routes - /api/stripe/webhook] FAIL: Stripe Webhook Error:", err.message);
      res.status(400).send(`Webhook Error: ${err.message}`);
    }
  });

  // Global JSON parsing middleware for all subsequent routes
  console.log("[Server Routes] Applying global express.json() middleware.");
  app.use(express.json());

  // USER STATUS ROUTE - DIAGNOSTIC: TEMPORARILY REMOVED AUTH MIDDLEWARE
  console.log("[Server Routes] Registering: GET /api/user/status (DEBUG: Auth Bypassed)");
  app.get("/api/user/status", /* authenticateFirebaseToken, */ async (req: Request, res: Response) => {
    console.log("[Server Routes - /api/user/status] DEBUG HANDLER EXECUTION STARTED (Auth Bypassed).");
    // const userId = (req as any).user?.uid; // Auth is bypassed, so req.user.uid won't exist
    // For testing without auth, let's try to use a hardcoded or query param user ID IF NEEDED
    // However, the primary goal is to see if the route is HIT AT ALL.
    // If this log appears, the routing itself is working.
    // If the original error was due to auth failing *before* this handler, this will help isolate it.

    // To make it somewhat functional for testing if hit, we can check for a debug query param
    const debugUserId = req.query.debugUserId as string;
    if (debugUserId) {
        console.log(`[Server Routes - /api/user/status] DEBUG: Processing with debugUserId: ${debugUserId}`);
        try {
            const userRef = db.collection("users").doc(debugUserId);
            const userDoc = await userRef.get();
            if (!userDoc.exists) {
                console.warn(`[Server Routes - /api/user/status] DEBUG: Firestore: User document not found for debug UID: ${debugUserId}`);
                return res.status(404).json({ error: "User data not found in database (debug mode).", uid: debugUserId });
            }
            const userData = userDoc.data();
            const responsePayload = {
                uid: debugUserId,
                email: userData?.email,
                displayName: userData?.displayName,
                tier: userData?.tier || "free",
                searchCount: userData?.searchCount || 0,
                searchLimit: (TIERS[(userData?.tier?.toUpperCase() || "FREE") as keyof typeof TIERS] || TIERS.FREE).searchLimit,
                preferences: userData?.preferences || { theme: "system", defaultSearchFocus: "web", modelPreference: "compound-beta" },
            };
            console.log(`[Server Routes - /api/user/status] DEBUG OK: Sending user status response for debug UID: ${debugUserId}`);
            return res.json(responsePayload);
        } catch (error) {
            console.error(`[Server Routes - /api/user/status] DEBUG FAIL: Error for debug UID ${debugUserId}:`, error);
            return res.status(500).json({ error: "Failed to fetch user status (debug mode)." });
        }
    } else {
        // If no debugUserId, and auth is bypassed, send a simple success to confirm the route is hit.
        console.log("[Server Routes - /api/user/status] DEBUG OK: Route hit, auth bypassed, no debugUserId provided. Sending test success.");
        return res.status(200).json({ message: "DEBUG: /api/user/status route hit successfully (authentication bypassed for this test).", debugInstructions: "Add ?debugUserId=YOUR_USER_ID to test DB fetch." });
    }
  });

  // Mount orchestrator routes (all routes within will be prefixed with /api/orchestrator)
  console.log("[Server Routes] Registering sub-router: POST /api/orchestrator");
  app.use("/api/orchestrator", orchestratorRoutes);

  // Simple hello endpoint
  console.log("[Server Routes] Registering: GET /api/hello");
  app.get("/api/hello", (req: Request, res: Response) => {
    console.log("[Server Routes - /api/hello] Handler execution started.");
    res.json({ message: "Hello, world from the main server!" });
  });

  console.log("[Server Routes] Registering: POST /api/search");
  app.post("/api/search", authenticateFirebaseToken, async (req: Request, res: Response) => {
    console.log("[Server Routes - /api/search] Handler execution started.");
    const userId = (req as any).user.uid;
    const { query, sources = [], modelPreference = "auto", searchType = "web" } = req.body;
    const groqApiKey = process.env.GROQ_API_KEY || "";

    if (!query) return res.status(400).json({ error: "Query is required" });
    if (!groqApiKey) return res.status(500).json({ error: "Groq API key not configured" });

    try {
      let searchResults: TavilySearchResult[] = sources;
      // let academicResults: any[] = []; // Not used if searchType specific logic handles it

      if (searchType === "web" && searchResults.length === 0) {
        const tavilyApiKey = process.env.TAVILY_API_KEY || "";
        if (!tavilyApiKey) return res.status(500).json({ error: "Tavily API key not configured" });
        const tavilyResponse = await tavilySearch(query, tavilyApiKey, { search_depth: "basic" });
        searchResults = tavilyResponse.results || [];
      } else if (searchType === "academic") {
        const serperApiKey = process.env.SERPER_API_KEY;
        if (!serperApiKey) return res.status(500).json({ error: "Serper API key not configured" });
        const scholarResponse = await serperGoogleScholarSearch(query, serperApiKey, { num_results: 5 });
        // academicResults = scholarResponse.organic || []; 
        searchResults = (scholarResponse.organic || []).map((r:any) => ({ title: r.title, url: r.link, content: r.snippet, score: 0, raw_content: null }));
      }

      const { answer, model, error } = await groqSearchWithTiers(query, searchResults, groqApiKey, userId, modelPreference);

      if (error) {
        console.warn(`[Server Routes - /api/search] WARN: Groq search returned error for user ${userId}: ${error}`);
        return res.status(403).json({ error: error, answer, modelUsed: model }); // 403 if tier limit or model issue
      }
      
      console.log(`[Server Routes - /api/search] OK: Sending search response for user: ${userId}`);
      res.json({ query, answer, sources: searchResults, modelUsed: model });

    } catch (error) {
      console.error(`[Server Routes - /api/search] FAIL: Search endpoint error for user ${userId}:`, error);
      const message = error instanceof Error ? error.message : "Error performing search and synthesis";
      res.status(500).json({ error: message });
    }
  });

  console.log("[Server Routes] Registering: POST /api/scholar-search");
  app.post("/api/scholar-search", authenticateFirebaseToken, async (req: Request, res: Response) => {
    console.log("[Server Routes - /api/scholar-search] Handler execution started.");
    const userId = (req as any).user.uid;
    const { query, num_results, page } = req.body;
    const serperApiKey = process.env.SERPER_API_KEY;

    if (!query) return res.status(400).json({ error: "Query is required" });
    if (!serperApiKey) return res.status(500).json({ error: "Serper API key not configured" });

    const tierCheck = await checkUserTierAndLimits(userId);
    if (!tierCheck.allowed || (tierCheck.tier !== TIERS.PRO.name && tierCheck.tier !== TIERS.BASIC.name)) { 
        console.warn(`[Server Routes - /api/scholar-search] WARN: Tier restriction for user ${userId}. Tier: ${tierCheck.tier}`);
        return res.status(403).json({ error: "Academic search is available for Basic and Pro tiers only." });
    }

    try {
        const searchConfig: Record<string, any> = {};
        if (num_results) searchConfig.num_results = parseInt(String(num_results), 10);
        if (page) searchConfig.page = parseInt(String(page), 10);
        const scholarResponse = await serperGoogleScholarSearch(query, serperApiKey, searchConfig);
        await incrementSearchCount(userId);
        console.log(`[Server Routes - /api/scholar-search] OK: Sending scholar search response for user: ${userId}`);
        res.json(scholarResponse);
    } catch (error) {
        console.error(`[Server Routes - /api/scholar-search] FAIL: Serper Google Scholar search error for user ${userId}:`, error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error performing academic search";
        res.status(500).json({ error: "Error performing academic search", message: errorMessage });
    }
  });

  console.log("[Server Routes] Registering: POST /api/deep-research");
  app.post("/api/deep-research", authenticateFirebaseToken, async (req: Request, res: Response) => {
    console.log("[Server Routes - /api/deep-research] Handler execution started.");
    const userId = (req as any).user.uid;
    const { query } = req.body; // researchConfig not used directly here, passed to service

    if (!query) return res.status(400).json({ error: "Query is required for deep research" });

    const tierCheck = await checkUserTierAndLimits(userId);
    if (!tierCheck.allowed || tierCheck.tier !== TIERS.PRO.name) { 
        console.warn(`[Server Routes - /api/deep-research] WARN: Tier restriction for user ${userId}. Tier: ${tierCheck.tier}`);
        return res.status(403).json({ error: "Deep research capability is available for Pro tier users only." });
    }
    
    const openAIApiKey = process.env.OPENAI_API_KEY;
    const tavilyApiKey = process.env.TAVILY_API_KEY;
    const groqApiKey = process.env.GROQ_API_KEY;

    if (!openAIApiKey || !tavilyApiKey || !groqApiKey) {
        console.error("[Server Routes - /api/deep-research] FAIL: Missing API keys (OpenAI, Tavily, or Groq).");
        return res.status(500).json({ error: "Internal server error: Deep research service not fully configured." });
    }

    try {
        const researchDocRef = db.collection("deepResearchProjects").doc();
        const initialResearchData = {
            userId: userId,
            initialQuery: query,
            status: "starting",
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
            title: `Deep Dive: ${query.substring(0,30)}...`
        };
        await researchDocRef.set(initialResearchData);
        await incrementSearchCount(userId); 
        console.log(`[Server Routes - /api/deep-research] OK: Deep research initiated for user ${userId}. Project ID: ${researchDocRef.id}`);
        res.status(202).json({ 
            message: "Deep research initiated. You will be notified upon completion.", 
            projectId: researchDocRef.id,
        });

    } catch (error) {
        console.error(`[Server Routes - /api/deep-research] FAIL: Deep research endpoint error for user ${userId}:`, error);
        const message = error instanceof Error ? error.message : "Error initiating deep research";
        res.status(500).json({ error: message });
    }
  });

  console.log("[Server Routes] Registering: PUT /api/user/preferences");
  app.put("/api/user/preferences", authenticateFirebaseToken, async (req: Request, res: Response) => {
    console.log("[Server Routes - /api/user/preferences] Handler execution started.");
    const userId = (req as any).user.uid;
    const { preferences } = req.body;

    if (typeof preferences !== "object" || preferences === null) {
        return res.status(400).json({ error: "Invalid preferences format. Expected an object." });
    }

    try {
        const userRef = db.collection("users").doc(userId);
        await userRef.update({
            preferences: preferences,
            updatedAt: FieldValue.serverTimestamp()
        });
        console.log(`[Server Routes - /api/user/preferences] OK: Preferences updated for user ${userId}.`);
        res.status(200).json({ message: "Preferences updated successfully.", preferences });
    } catch (error) {
        console.error(`[Server Routes - /api/user/preferences] FAIL: Error updating preferences for user ${userId}:`, error);
        res.status(500).json({ error: "Failed to update preferences." });
    }
  });

  console.log("[Server Routes] Registering: POST /api/user/saved-searches");
  app.post("/api/user/saved-searches", authenticateFirebaseToken, async (req: Request, res: Response) => {
    console.log("[Server Routes - /api/user/saved-searches] Handler execution started.");
    const userId = (req as any).user.uid;
    const { query, answer, sources, modelUsed, title } = req.body;

    if (!query || !answer) {
        return res.status(400).json({ error: "Query and answer are required to save a search." });
    }

    try {
        const savedSearchRef = db.collection("users").doc(userId).collection("savedSearches").doc();
        const newSavedSearch = {
            query,
            answer,
            sources: sources || [],
            modelUsed: modelUsed || "unknown",
            title: title || query.substring(0, 50) + (query.length > 50 ? "..." : ""),
            createdAt: FieldValue.serverTimestamp(),
        };
        await savedSearchRef.set(newSavedSearch);
        console.log(`[Server Routes - /api/user/saved-searches] OK: Search saved for user ${userId}. ID: ${savedSearchRef.id}`);
        res.status(201).json({ message: "Search saved successfully.", id: savedSearchRef.id });
    } catch (error) {
        console.error(`[Server Routes - /api/user/saved-searches] FAIL: Error saving search for user ${userId}:`, error);
        res.status(500).json({ error: "Failed to save search." });
    }
  });

  console.log("[Server Routes] Registering: GET /api/user/saved-searches");
  app.get("/api/user/saved-searches", authenticateFirebaseToken, async (req: Request, res: Response) => {
    console.log("[Server Routes - /api/user/saved-searches] Handler execution started.");
    const userId = (req as any).user.uid;
    try {
        const searchesSnapshot = await db.collection("users").doc(userId).collection("savedSearches")
                                      .orderBy("createdAt", "desc").limit(50).get();
        const savedSearches = searchesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log(`[Server Routes - /api/user/saved-searches] OK: Fetched ${savedSearches.length} saved searches for user ${userId}.`);
        res.json(savedSearches);
    } catch (error) {
        console.error(`[Server Routes - /api/user/saved-searches] FAIL: Error fetching saved searches for user ${userId}:`, error);
        res.status(500).json({ error: "Failed to fetch saved searches." });
    }
  });

  console.log("[Server Routes] Registering: DELETE /api/user/saved-searches/:searchId");
  app.delete("/api/user/saved-searches/:searchId", authenticateFirebaseToken, async (req: Request, res: Response) => {
    console.log("[Server Routes - /api/user/saved-searches/:searchId] Handler execution started.");
    const userId = (req as any).user.uid;
    const { searchId } = req.params;
    try {
        await db.collection("users").doc(userId).collection("savedSearches").doc(searchId).delete();
        console.log(`[Server Routes - /api/user/saved-searches/:searchId] OK: Deleted search ${searchId} for user ${userId}.`);
        res.status(200).json({ message: "Search deleted successfully." });
    } catch (error) {
        console.error(`[Server Routes - /api/user/saved-searches/:searchId] FAIL: Error deleting search ${searchId} for user ${userId}:`, error);
        res.status(500).json({ error: "Failed to delete search." });
    }
  });

  // --- Stripe Routes ---
  console.log("[Server Routes] Registering: POST /api/stripe/create-checkout-session");
  app.post("/api/stripe/create-checkout-session", authenticateFirebaseToken, async (req: Request, res: Response) => {
    console.log("[Server Routes - /api/stripe/create-checkout-session] Handler execution started.");
    const userId = (req as any).user.uid;
    const userEmail = (req as any).user.email; // Ensure email is on req.user
    const { priceId, successUrl, cancelUrl } = req.body;

    if (!priceId || !successUrl || !cancelUrl) {
      return res.status(400).json({ error: "priceId, successUrl, and cancelUrl are required." });
    }
    if (!stripe) return res.status(500).json({ error: "Stripe service not available." });

    try {
      const customer = await getOrCreateStripeCustomer(userId, userEmail);
      if (!customer) {
        return res.status(500).json({ error: "Could not create or retrieve Stripe customer." });
      }
      const session = await createSubscriptionCheckoutSession(customer.id, priceId, successUrl, cancelUrl);
      if (!session || !session.url) {
        return res.status(500).json({ error: "Could not create Stripe Checkout session." });
      }
      console.log(`[Server Routes - /api/stripe/create-checkout-session] OK: Stripe session created for user ${userId}.`);
      res.json({ sessionId: session.id, checkoutUrl: session.url });
    } catch (error) {
      console.error(`[Server Routes - /api/stripe/create-checkout-session] FAIL: Error for user ${userId}:`, error);
      res.status(500).json({ error: "Failed to create checkout session." });
    }
  });

  console.log("[Server Routes] Registering: POST /api/stripe/create-portal-session");
  app.post("/api/stripe/create-portal-session", authenticateFirebaseToken, async (req: Request, res: Response) => {
    console.log("[Server Routes - /api/stripe/create-portal-session] Handler execution started.");
    const userId = (req as any).user.uid;
    const { returnUrl } = req.body;

    if (!returnUrl) {
      return res.status(400).json({ error: "returnUrl is required." });
    }
    if (!stripe) return res.status(500).json({ error: "Stripe service not available." });

    try {
      const userDoc = await db.collection("users").doc(userId).get();
      const stripeCustomerId = userDoc.data()?.stripeCustomerId;

      if (!stripeCustomerId) {
        return res.status(404).json({ error: "Stripe customer ID not found for this user." });
      }
      const portalSession = await createBillingPortalSession(stripeCustomerId, returnUrl);
      if (!portalSession || !portalSession.url) {
        return res.status(500).json({ error: "Could not create Stripe Billing Portal session." });
      }
      console.log(`[Server Routes - /api/stripe/create-portal-session] OK: Stripe portal session created for user ${userId}.`);
      res.json({ portalUrl: portalSession.url });
    } catch (error) {
      console.error(`[Server Routes - /api/stripe/create-portal-session] FAIL: Error for user ${userId}:`, error);
      res.status(500).json({ error: "Failed to create portal session." });
    }
  });

  console.log("[Server Routes] EXITING registerRoutes function. HTTP server instance will be returned.");
  const server = createServer(app);
  return server;
}
