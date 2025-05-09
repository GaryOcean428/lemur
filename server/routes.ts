import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { db, FieldValue } from "./firebaseAdmin"; // Import db and FieldValue from the modular firebaseAdmin.ts
import { authenticateFirebaseToken } from "./index"; // Import the middleware

import { directGroqCompoundSearch } from "./directCompound";
import { validateGroqModel, mapModelPreference, APPROVED_MODELS } from "./utils/modelValidation";
import fetch from "node-fetch";

// Stripe import and initialization from remote
import Stripe from "stripe";
if (!process.env.STRIPE_SECRET_KEY) {
  console.warn("Warning: Missing STRIPE_SECRET_KEY environment variable");
}

// Initialize Stripe with the secret key if available
let stripe: Stripe | null = null;
try {
  if (process.env.STRIPE_SECRET_KEY) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16', // Use the latest stable API version
    });
    console.log(`Stripe initialized successfully with API version 2023-10-16. Key starts with: ${process.env.STRIPE_SECRET_KEY.substring(0, 8)}...`);
  }
} catch (error) {
  console.error("Error initializing Stripe:", error);
}

// Serper Google Scholar import from local changes
import { serperGoogleScholarSearch, SerperGoogleScholarSearchResponse } from "./integrations/serperGoogleScholarSearch";

// Import Tavily search interfaces from the dedicated module
import { tavilySearch, TavilySearchResult, TavilySearchResponse } from './tavilySearch';
import { tavilyDeepResearch, tavilyExtractContent, TavilyDeepResearchResponse } from './utils/tavilyDeepResearch';
import { executeAgenticResearch, ResearchState, AgenticResearchProgress } from './utils/agenticResearch';

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

async function groqSearchWithTiers(query: string, sources: TavilySearchResult[], apiKey: string, userId: string, requestedModelPref: string = 'auto'): Promise<{answer: string; model: string; error?: string}> {
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
    console.error('Error during Groq API call for user', userId, error);
    return { answer: "", model: model, error: error instanceof Error ? error.message : "Groq API Error" };
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  app.post("/api/search", authenticateFirebaseToken, async (req: Request, res: Response) => {
    const userId = (req as any).user.uid;
    const { query, sources = [], modelPreference = 'auto', searchType = 'web' } = req.body;
    const groqApiKey = process.env.GROQ_API_KEY || "";

    if (!query) return res.status(400).json({ error: "Query is required" });
    if (!groqApiKey) return res.status(500).json({ error: "Groq API key not configured" });

    try {
      let searchResults: TavilySearchResult[] = sources;
      let academicResults: any[] = [];

      if (searchType === 'web' && searchResults.length === 0) {
        const tavilyApiKey = process.env.TAVILY_API_KEY || "";
        if (!tavilyApiKey) return res.status(500).json({ error: "Tavily API key not configured" });
        const tavilyResponse = await tavilySearch(query, tavilyApiKey, { search_depth: "basic" });
        searchResults = tavilyResponse.results || [];
      } else if (searchType === 'academic') {
        const serperApiKey = process.env.SERPER_API_KEY; // Use SERPER_API_KEY from .env
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
    const serperApiKey = process.env.SERPER_API_KEY; // Use SERPER_API_KEY from .env

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
    const userId = (req as any).user.uid;
    try {
        const userRef = db.collection("users").doc(userId);
        const userDoc = await userRef.get();
        if (!userDoc.exists) {
            return res.status(404).json({ error: "User not found" });
        }
        const userData = userDoc.data();
        res.json({
            uid: userId,
            email: userData?.email,
            displayName: userData?.displayName,
            tier: userData?.tier || "free",
            searchCount: userData?.searchCount || 0,
            searchLimit: (TIERS[ (userData?.tier?.toUpperCase() || "FREE") as keyof typeof TIERS ] || TIERS.FREE).searchLimit,
            preferences: userData?.preferences || {} // Include preferences
        });
    } catch (error) {
        console.error("Error fetching user status:", error);
        res.status(500).json({ error: "Failed to fetch user status" });
    }
  });

  // --- New route for User Preferences ---
  app.put("/api/user/preferences", authenticateFirebaseToken, async (req: Request, res: Response) => {
    const userId = (req as any).user.uid;
    const { preferences } = req.body;

    if (typeof preferences !== 'object' || preferences === null) {
        return res.status(400).json({ error: "Invalid preferences format. Expected an object." });
    }

    try {
        const userRef = db.collection("users").doc(userId);
        // Ensure user document exists, or create one if it's the first time setting preferences
        // For simplicity, we'll assume the user document is created on sign-up or first status check.
        // If not, a .set({ preferences, ...other_initial_data }, { merge: true }) might be better.
        await userRef.update({
            preferences: preferences,
            updatedAt: FieldValue.serverTimestamp() // Also update a general user updatedAt field
        });
        res.status(200).json({ message: "Preferences updated successfully.", preferences });
    } catch (error) {
        console.error("Error updating user preferences:", error);
        res.status(500).json({ error: "Failed to update preferences." });
    }
  });


  // --- Routes for Saved Searches (already implemented) ---
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
            updatedAt: FieldValue.serverTimestamp(),
        };
        await savedSearchRef.set(newSavedSearch);
        res.status(201).json({ id: savedSearchRef.id, ...newSavedSearch });
    } catch (error) {
        console.error("Error saving search:", error);
        res.status(500).json({ error: "Failed to save search." });
    }
  });

  app.get("/api/user/saved-searches", authenticateFirebaseToken, async (req: Request, res: Response) => {
    const userId = (req as any).user.uid;
    try {
        const snapshot = await db.collection("users").doc(userId).collection("savedSearches")
                                .orderBy("createdAt", "desc")
                                .get();
        const savedSearches = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json(savedSearches);
    } catch (error) {
        console.error("Error fetching saved searches:", error);
        res.status(500).json({ error: "Failed to fetch saved searches." });
    }
  });

  app.get("/api/user/saved-searches/:searchId", authenticateFirebaseToken, async (req: Request, res: Response) => {
    const userId = (req as any).user.uid;
    const { searchId } = req.params;
    try {
        const doc = await db.collection("users").doc(userId).collection("savedSearches").doc(searchId).get();
        if (!doc.exists) {
            return res.status(404).json({ error: "Saved search not found." });
        }
        res.json({ id: doc.id, ...doc.data() });
    } catch (error) {
        console.error("Error fetching saved search:", error);
        res.status(500).json({ error: "Failed to fetch saved search." });
    }
  });

  app.delete("/api/user/saved-searches/:searchId", authenticateFirebaseToken, async (req: Request, res: Response) => {
    const userId = (req as any).user.uid;
    const { searchId } = req.params;
    try {
        await db.collection("users").doc(userId).collection("savedSearches").doc(searchId).delete();
        res.status(200).json({ message: "Saved search deleted successfully." });
    } catch (error) {
        console.error("Error deleting saved search:", error);
        res.status(500).json({ error: "Failed to delete saved search." });
    }
  });

  // --- Routes for Deep Research Projects (already implemented) ---
  app.get("/api/user/deep-research-projects", authenticateFirebaseToken, async (req: Request, res: Response) => {
    const userId = (req as any).user.uid;
    try {
        const snapshot = await db.collection("deepResearchProjects")
                                .where("userId", "==", userId)
                                .orderBy("createdAt", "desc")
                                .get();
        const projects = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json(projects);
    } catch (error) {
        console.error("Error fetching deep research projects:", error);
        res.status(500).json({ error: "Failed to fetch deep research projects." });
    }
  });

  app.get("/api/user/deep-research-projects/:projectId", authenticateFirebaseToken, async (req: Request, res: Response) => {
    const userId = (req as any).user.uid;
    const { projectId } = req.params;
    try {
        const doc = await db.collection("deepResearchProjects").doc(projectId).get();
        if (!doc.exists || doc.data()?.userId !== userId) {
            return res.status(404).json({ error: "Deep research project not found or access denied." });
        }
        res.json({ id: doc.id, ...doc.data() });
    } catch (error) {
        console.error("Error fetching deep research project:", error);
        res.status(500).json({ error: "Failed to fetch deep research project." });
    }
  });
  
  app.put("/api/internal/deep-research-projects/:projectId", async (req: Request, res: Response) => {
    const { projectId } = req.params;
    const { status, content, steps, error } = req.body;
    try {
        const projectRef = db.collection("deepResearchProjects").doc(projectId);
        const updateData: any = { updatedAt: FieldValue.serverTimestamp() };
        if (status) updateData.status = status;
        if (content) updateData.content = content;
        if (steps) updateData.steps = steps;
        if (error) updateData.error = error;

        await projectRef.update(updateData);
        res.status(200).json({ message: "Deep research project updated." });
    } catch (error) {
        console.error("Error updating deep research project:", error);
        res.status(500).json({ error: "Failed to update deep research project." });
    }
  });

  const server = createServer(app);
  return server;
}

