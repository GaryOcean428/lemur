// server/routes.ts
import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { db, FieldValue } from "./firebaseAdmin.js";
import { authenticateFirebaseToken } from "./middleware/authMiddleware.js";
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
  PRICE_IDS,
} from "./services/stripeService.js";

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn("Warning: Missing STRIPE_SECRET_KEY environment variable");
}

// Initialize Stripe with the secret key if available
let stripe: Stripe | null = null;
try {
  if (process.env.STRIPE_SECRET_KEY) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2025-04-30.basil",
      typescript: true,
    });
    console.log(`Stripe initialized successfully with API version 2025-04-30.basil. Key starts with: ${process.env.STRIPE_SECRET_KEY.substring(0, 8)}...`);
  }
} catch (error) {
  console.error("Error initializing Stripe:", error);
}

// Serper Google Scholar import from local changes
import { serperGoogleScholarSearch, SerperGoogleScholarSearchResponse } from "./integrations/serperGoogleScholarSearch.js";

// Import Tavily search interfaces from the dedicated module
import { tavilySearch, TavilySearchResult, TavilySearchResponse } from "./tavilySearch.js";
import { tavilyDeepResearch, tavilyExtractContent, TavilyDeepResearchResponse } from "./utils/tavilyDeepResearch.js";
import { performAgenticResearch, ResearchState, AgenticResearchProgress } from "./utils/agenticResearch.js";

// Import Orchestrator routes
import orchestratorRoutes from "./routes/orchestratorRoutes.js";

// Firebase Admin SDK is initialized in firebaseAdmin.ts, and db is imported from there.

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
    console.error("Error incrementing search count:", error);
  }
}

async function groqSearchWithTiers(query: string, sources: TavilySearchResult[], apiKey: string, userId: string, requestedModelPref: string = "auto"): Promise<{answer: string; model: string; error?: string}> {
  const tierCheck = await checkUserTierAndLimits(userId, requestedModelPref);
  if (!tierCheck.allowed) {
    return { answer: "", model: tierCheck.modelToUse, error: tierCheck.message };
  }

  const model = tierCheck.modelToUse;
  console.log(`User ${userId.substring(0,5)} (${tierCheck.tier} tier) using Groq model: ${model} for synthesis`);

  let promptContent: string;
  if (sources && sources.length > 0) {
    const context = sources.map((source, index) => 
      `Source ${index + 1}:\nTitle: ${source.title}\nURL: ${source.url}\nContent: ${source.content.substring(0, 1000)}\n`
    ).join("\n");
    promptContent = `You are a helpful search assistant. Based on the following search results, provide a comprehensive answer to the query: "${query}". Cite sources as [Source X].\n\nContext:\n${context}\n\nAnswer:`;
  } else {
    promptContent = `You are Lemur, an advanced search assistant. The query is: "${query}". External web search is currently unavailable. Provide a helpful answer based on your general knowledge, acknowledging this limitation.`;
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
    if (!data.choices || data.choices.length === 0) throw new Error("No response from Groq API");
    
    await incrementSearchCount(userId);
    return { answer: data.choices[0].message.content, model: data.model };

  } catch (error) {
    console.error("Error during Groq API call for user", userId, error);
    return { answer: "", model: model, error: error instanceof Error ? error.message : "Groq API Error" };
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Stripe Webhook - IMPORTANT: This route must be before express.json()
  app.post("/api/stripe/webhook", express.raw({type: "application/json"}), async (req: Request, res: Response) => {
    const sig = req.headers["stripe-signature"];
    try {
      const handled = await handleStripeWebhook(sig, req.body);
      if (handled) {
        res.json({ received: true });
      } else {
        res.status(400).send("Webhook Error: Could not handle event");
      }
    } catch (err: any) {
      console.error("Stripe Webhook Error:", err.message);
      res.status(400).send(`Webhook Error: ${err.message}`);
    }
  });

  // Regular JSON parsing middleware for other routes
  app.use(express.json());

  // Mount orchestrator routes
  app.use("/api/orchestrator", orchestratorRoutes);

  // Simple hello endpoint
  app.get("/api/hello", (req: Request, res: Response) => {
    res.json({ message: "Hello, world from the main server!" });
  });

  app.post("/api/search", authenticateFirebaseToken, async (req: Request, res: Response) => {
    const userId = (req as any).user.uid;
    const { query, sources = [], modelPreference = "auto", searchType = "web" } = req.body;
    const groqApiKey = process.env.GROQ_API_KEY || "";

    if (!query) return res.status(400).json({ error: "Query is required" });
    if (!groqApiKey) return res.status(500).json({ error: "Groq API key not configured" });

    try {
      let searchResults: TavilySearchResult[] = sources;
      let academicResults: any[] = [];

      if (searchType === "web" && searchResults.length === 0) {
        const tavilyApiKey = process.env.TAVILY_API_KEY || "";
        if (!tavilyApiKey) return res.status(500).json({ error: "Tavily API key not configured" });
        const tavilyResponse = await tavilySearch(query, tavilyApiKey, { search_depth: "basic" });
        searchResults = tavilyResponse.results || [];
      } else if (searchType === "academic") {
        const serperApiKey = process.env.SERPER_API_KEY;
        if (!serperApiKey) return res.status(500).json({ error: "Serper API key not configured" });
        const scholarResponse = await serperGoogleScholarSearch(query, serperApiKey, { num_results: 5 });
        academicResults = scholarResponse.organic || []; 
        searchResults = academicResults.map(r => ({ title: r.title, url: r.link, content: r.snippet, score: 0, raw_content: null }));
      }

      const { answer, model, error } = await groqSearchWithTiers(query, searchResults, groqApiKey, userId, modelPreference);

      if (error) {
        return res.status(403).json({ error: error, answer, modelUsed: model });
      }
      
      res.json({ query, answer, sources: searchResults, modelUsed: model });

    } catch (error) {
      console.error("Search endpoint error:", error);
      const message = error instanceof Error ? error.message : "Error performing search and synthesis";
      res.status(500).json({ error: message });
    }
  });

  app.post("/api/scholar-search", authenticateFirebaseToken, async (req: Request, res: Response) => {
    const userId = (req as any).user.uid;
    const { query, num_results, page } = req.body;
    const serperApiKey = process.env.SERPER_API_KEY;

    if (!query) return res.status(400).json({ error: "Query is required" });
    if (!serperApiKey) return res.status(500).json({ error: "Serper API key not configured" });

    const tierCheck = await checkUserTierAndLimits(userId);
    if (!tierCheck.allowed || (tierCheck.tier !== TIERS.PRO.name && tierCheck.tier !== TIERS.BASIC.name)) { 
        return res.status(403).json({ error: "Academic search is available for Basic and Pro tiers only." });
    }

    try {
        const searchConfig: Record<string, any> = {};
        if (num_results) searchConfig.num_results = parseInt(String(num_results), 10);
        if (page) searchConfig.page = parseInt(String(page), 10);
        const scholarResponse = await serperGoogleScholarSearch(query, serperApiKey, searchConfig);
        await incrementSearchCount(userId);
        res.json(scholarResponse);
    } catch (error) {
        console.error("Serper Google Scholar search error:", error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error performing academic search";
        res.status(500).json({ error: "Error performing academic search", message: errorMessage });
    }
  });

  app.post("/api/deep-research", authenticateFirebaseToken, async (req: Request, res: Response) => {
    const userId = (req as any).user.uid;
    const { query, researchConfig } = req.body;

    if (!query) return res.status(400).json({ error: "Query is required for deep research" });

    const tierCheck = await checkUserTierAndLimits(userId);
    if (!tierCheck.allowed || tierCheck.tier !== TIERS.PRO.name) { 
        return res.status(403).json({ error: "Deep research capability is available for Pro tier users only." });
    }
    
    const openAIApiKey = process.env.OPENAI_API_KEY;
    const tavilyApiKey = process.env.TAVILY_API_KEY;
    const groqApiKey = process.env.GROQ_API_KEY;

    if (!openAIApiKey || !tavilyApiKey || !groqApiKey) {
        console.error("Missing API keys for deep research (OpenAI, Tavily, or Groq).");
        return res.status(500).json({ error: "Internal server error: Deep research service not fully configured." });
    }

    try {
        console.log(`User ${userId} (Pro) initiating deep research for query: "${query}"`);
        
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
        console.log(`Deep research project ${researchDocRef.id} started for user ${userId}`);
        
        await incrementSearchCount(userId); 

        res.status(202).json({ 
            message: "Deep research initiated. You will be notified upon completion.", 
            projectId: researchDocRef.id,
        });

    } catch (error) {
        console.error("Deep research endpoint error:", error);
        const message = error instanceof Error ? error.message : "Error initiating deep research";
        res.status(500).json({ error: message });
    }
  });

  app.get("/api/user/status", authenticateFirebaseToken, async (req: Request, res: Response) => {
    console.log("[/api/user/status] Route handler started");
    const userId = (req as any).user.uid;
    console.log(`[/api/user/status] Processing request for user: ${userId}`);
    
    try {
        const userRef = db.collection("users").doc(userId);
        console.log(`[/api/user/status] Fetching user document for: ${userId}`);
        const userDoc = await userRef.get();
        
        if (!userDoc.exists) {
            console.log(`[/api/user/status] User document not found for: ${userId}`);
            return res.status(404).json({ error: "User not found" });
        }
        
        const userData = userDoc.data();
        console.log(`[/api/user/status] Successfully retrieved user data for: ${userId}`);
        
        const response = {
            uid: userId,
            email: userData?.email,
            displayName: userData?.displayName,
            tier: userData?.tier || "free",
            searchCount: userData?.searchCount || 0,
            searchLimit: (TIERS[(userData?.tier?.toUpperCase() || "FREE") as keyof typeof TIERS] || TIERS.FREE).searchLimit,
            preferences: userData?.preferences || {},
            stripeCustomerId: userData?.stripeCustomerId,
            stripeSubscriptionId: userData?.stripeSubscriptionId,
            stripeCurrentPeriodEnd: userData?.stripeCurrentPeriodEnd,
            stripePriceId: userData?.stripePriceId
        };
        
        console.log(`[/api/user/status] Sending response for: ${userId}`);
        res.json(response);
    } catch (error) {
        console.error("[/api/user/status] Error fetching user status:", error);
        res.status(500).json({ error: "Failed to fetch user status" });
    }
  });

  app.put("/api/user/preferences", authenticateFirebaseToken, async (req: Request, res: Response) => {
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
        res.status(200).json({ message: "Preferences updated successfully.", preferences });
    } catch (error) {
        console.error("Error updating user preferences:", error);
        res.status(500).json({ error: "Failed to update preferences." });
    }
  });

  app.post("/api/user/saved-searches", authenticateFirebaseToken, async (req: Request, res: Response) => {
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
        res.status(201).json({ message: "Search saved successfully.", id: savedSearchRef.id });
    } catch (error) {
        console.error("Error saving search:", error);
        res.status(500).json({ error: "Failed to save search." });
    }
  });

  app.get("/api/user/saved-searches", authenticateFirebaseToken, async (req: Request, res: Response) => {
    const userId = (req as any).user.uid;
    try {
        const searchesSnapshot = await db.collection("users").doc(userId).collection("savedSearches")
                                      .orderBy("createdAt", "desc").limit(50).get();
        const savedSearches = searchesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json(savedSearches);
    } catch (error) {
        console.error("Error fetching saved searches:", error);
        res.status(500).json({ error: "Failed to fetch saved searches." });
    }
  });

  app.delete("/api/user/saved-searches/:searchId", authenticateFirebaseToken, async (req: Request, res: Response) => {
    const userId = (req as any).user.uid;
    const { searchId } = req.params;
    try {
        await db.collection("users").doc(userId).collection("savedSearches").doc(searchId).delete();
        res.status(200).json({ message: "Search deleted successfully." });
    } catch (error) {
        console.error("Error deleting saved search:", error);
        res.status(500).json({ error: "Failed to delete search." });
    }
  });

  // --- Stripe Routes ---
  app.post("/api/stripe/create-checkout-session", authenticateFirebaseToken, async (req: Request, res: Response) => {
    const userId = (req as any).user.uid;
    const userEmail = (req as any).user.email;
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
      res.json({ sessionId: session.id, checkoutUrl: session.url });
    } catch (error) {
      console.error("Error in /api/stripe/create-checkout-session:", error);
      res.status(500).json({ error: "Failed to create checkout session." });
    }
  });

  app.post("/api/stripe/create-portal-session", authenticateFirebaseToken, async (req: Request, res: Response) => {
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
      res.json({ portalUrl: portalSession.url });
    } catch (error) {
      console.error("Error in /api/stripe/create-portal-session:", error);
      res.status(500).json({ error: "Failed to create portal session." });
    }
  });

  const server = createServer(app);
  return server;
}
