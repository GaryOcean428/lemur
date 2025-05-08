import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { directGroqCompoundSearch } from "./directCompound";
import { storage } from "./storage";
import { InsertUserPreferences, InsertUserTopicInterest } from "@shared/schema";
import { searchCache, aiResponseCache, suggestionCache } from "./utils/cache";
import { validateGroqModel, mapModelPreference, APPROVED_MODELS } from "./utils/modelValidation";
import { enforceRegionPreference, normalizeRegionCode } from "./utils/regionUtil";
import { 
  ConversationContext, 
  ConversationTurn, 
  isLikelyFollowUp, 
  addTurnToContext, 
  createContextualPrompt,
  getRelevantSourcesFromContext,
  createContextualSystemMessage
} from "./utils/context";
import { 
  startApiTiming, 
  completeApiTiming, 
  getRecentTimings, 
  getSystemMetrics, 
  resetSystemMetrics,
  recordCacheResult,
  logEvent
} from "./utils/telemetry";
import {
  getCache,
  setCache,
  getOrCompute,
  generateCacheKey,
  isRedisAvailable
} from "./utils/redisCache";
import {
  parallelLimit,
  parallelWithCallback,
  parallelTaskGroups
} from "./utils/parallelProcessing";
import fetch from "node-fetch";
import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn("Warning: Missing STRIPE_SECRET_KEY environment variable");
}

// Initialize Stripe with the secret key if available
const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY) 
  : null;

// Import Tavily search interfaces from the dedicated module
import { tavilySearch, TavilySearchResult, TavilySearchResponse } from './tavilySearch';
import { tavilyDeepResearch, tavilyExtractContent, TavilyDeepResearchResponse } from './utils/tavilyDeepResearch';
import { executeAgenticResearch, ResearchState, AgenticResearchProgress } from './utils/agenticResearch';

// Define Groq response interfaces
interface GroqChoice {
  message: {
    content: string;
    role: string;
  };
  index: number;
  finish_reason: string;
}

interface GroqResponse {
  id: string;
  choices: GroqChoice[];
  model: string;
}

// Using tavilySearch imported from module - it handles region code formatting

// Function to perform Groq search
async function groqSearch(query: string, sources: TavilySearchResult[], apiKey: string, modelPreference: string = 'auto'): Promise<{answer: string; model: string}> {
  // Use our centralized model validation utilities to ensure only approved models are used
  
  // Map the user-friendly model preference to an actual Groq model name
  let model = mapModelPreference(modelPreference);
  
  // Validate the model to ensure it's one of the approved models
  // This is a safeguard against code modifications that might use incorrect models
  model = validateGroqModel(model);
  
  console.log(`Using validated Groq model: ${model} for synthesis`);
  
  // Create a cache key that incorporates the query, sources, and model
  const cacheKey = {
    query,
    sourcesHash: sources ? hashSources(sources) : 'no-sources',
    model,
    type: 'groq-ai-answer'
  };
  
  // Check cache first
  const cachedAnswer = aiResponseCache.get(cacheKey);
  if (cachedAnswer) {
    console.log(`Cache hit for AI answer: "${query}" using model ${model}`);
    return cachedAnswer;
  }

  // Create different prompts based on whether we have sources or not
  let prompt: string;
  
  if (sources && sources.length > 0) {
    // Extract and format context from search results
    const context = sources.map((source, index) => 
      `Source ${index + 1}:\nTitle: ${source.title}\nURL: ${source.url}\nContent: ${source.content.substring(0, 1000)}\n`
    ).join("\n");
    
    // Prompt with sources
    prompt = `You are a helpful search assistant that provides detailed, informative answers based on search results.

Search Query: "${query}"

Here are the search results to use as context for your answer:

${context}

Instructions:
1. Synthesize information from the provided search results to create a comprehensive answer.
2. Focus on accuracy and relevance to the query.
3. If the search results don't provide adequate information to answer the query, acknowledge this limitation.
4. Cite sources by referring to them as [Source X] where X is the source number.
5. Format your response in clear paragraphs with markdown formatting where appropriate.
6. Include a "Sources" section at the end with a numbered list of the sources you cited.
7. Present a balanced view if there are conflicting perspectives in the sources.

Your answer:`;
  } else {
    // If no sources available, create a prompt that acknowledges the limitation
    prompt = `You are Lemur, an advanced search assistant.

Search Query: "${query}"

Important: External web search functionality is currently unavailable. Please generate a helpful response based on your built-in knowledge and acknowledge this limitation.

Instructions:
1. Provide the most helpful answer you can based on your built-in knowledge.
2. Be clear about the limitations of your response without web search results.
3. Use markdown formatting for better readability.
4. If you don't have enough information to answer confidently, suggest alternative search queries or topics the user might explore.
5. Adapt your response to be as relevant as possible to the query.

Your answer:`;  
  }

  try {
    // Make request to Groq API
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: "system", content: "You are a helpful search assistant that provides detailed, informative answers based on search results." },
          { role: "user", content: prompt }
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
    
    if (!data.choices || data.choices.length === 0) {
      throw new Error("No response generated from Groq API");
    }
    
    const result = {
      answer: data.choices[0].message.content,
      model: data.model
    };
    
    // Cache the result
    const cacheTTL = model === 'compound-beta-mini' ? 900 : 1800; // 15 minutes for fast model, 30 minutes for others
    aiResponseCache.set(cacheKey, result, cacheTTL);
    console.log(`Cached AI answer for "${query}" using model ${model} with TTL ${cacheTTL}s`);
    
    return result;
  } catch (error) {
    console.error('Error during Groq API call:', error);
    throw error;
  }
}

// Helper function to create a hash of the sources array for cache keys
function hashSources(sources: TavilySearchResult[]): string {
  try {
    // Create a simplified representation of sources for hashing
    const simplifiedSources = sources.map(source => ({
      url: source.url,
      title: source.title.substring(0, 50) // Just use part of the title to avoid long strings
    }));
    return JSON.stringify(simplifiedSources);
  } catch (e) {
    // Fallback in case of error
    return `sources-${sources.length}`;
  }
}

// Function to get search suggestions
async function getSearchSuggestions(partialQuery: string): Promise<string[]> {
  // This is a simple implementation for demo purposes
  // In a production environment, you would connect to a real suggestion API
  if (!partialQuery || partialQuery.length < 2) {
    return [];
  }
  
  // Check cache first for this query
  const cachedSuggestions = suggestionCache.get(partialQuery.toLowerCase());
  if (cachedSuggestions) {
    console.log(`Cache hit for search suggestions: "${partialQuery}"`);
    return cachedSuggestions;
  }
  
  // Basic suggestions based on the query
  const baseSuggestions = [
    "new AI developments",
    "climate change solutions",
    "space exploration news",
    "quantum computing advances",
    "renewable energy technology",
    "artificial intelligence ethics",
    "machine learning algorithms",
    "latest smartphone reviews",
    "healthy diet recommendations",
    "workout routines for beginners"
  ];
  
  // Filter suggestions based on the query
  const suggestions = baseSuggestions
    .filter(suggestion => 
      suggestion.toLowerCase().includes(partialQuery.toLowerCase()))
    .concat([`${partialQuery} latest news`, `${partialQuery} research papers`])
    .slice(0, 7); // Return at most 7 suggestions
    
  // Cache the suggestions (short TTL for search suggestions - 5 minutes)
  suggestionCache.set(partialQuery.toLowerCase(), suggestions, 300);
  
  return suggestions;
}



import { setupAuth } from "./auth";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup auth routes and middleware
  setupAuth(app);
  
  // Test endpoint for Tavily API specifically
  app.get("/api/test-tavily", async (req, res) => {
    try {
      const tavilyApiKey = process.env.TAVILY_API_KEY || "";
      
      // Log details about the key
      console.log(`Tavily API key length: ${tavilyApiKey.length}`);
      console.log(`Tavily API key first 8 chars: ${tavilyApiKey.substring(0, 8)}...`);
      
      // Try multiple authorization methods to see what works
      console.log('Trying Tavily API with X-API-Key header...');
      let response = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": tavilyApiKey.trim(),
        },
        body: JSON.stringify({
          query: "Test query from Lemur",
          search_depth: "basic",
          max_results: 3
        }),
      });
      
      // If that didn't work, try with Bearer token
      if (response.status === 401) {
        console.log('X-API-Key method failed, trying with Bearer token...');
        response = await fetch("https://api.tavily.com/search", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${tavilyApiKey.trim()}`,
          },
          body: JSON.stringify({
            query: "Test query from Lemur",
            search_depth: "basic",
            max_results: 3
          }),
        });
      }
      
      // Return full details to help diagnose the issue
      const responseBody = await response.text();
      
      res.json({
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: responseBody,
        apiKeyInfo: {
          length: tavilyApiKey.length,
          startsWithPrefix: tavilyApiKey.startsWith('tvly-'),
          containsSpaces: tavilyApiKey.includes(' '),
          containsNewlines: tavilyApiKey.includes('\n'),
        }
      });
    } catch (error: any) {
      res.status(500).json({
        error: 'Test failed',
        message: error.message || 'Unknown error'
      });
    }
  });
  
  // System monitoring endpoint
  app.get("/api/monitoring/system", async (req, res) => {
    try {
      // Check authentication - only admins can view detailed monitoring
      const isAuthenticated = req.isAuthenticated();
      // Check for admin status based on a special username for now
      // In a real system we would have proper role-based access control
      const isAdmin = isAuthenticated && req.user.username === 'admin';
      
      // Get system health metrics
      const metrics = getSystemMetrics();
      
      // Create a simplified version for non-admin users
      if (!isAdmin) {
        // Only include non-sensitive information
        return res.json({
          status: 'ok',
          uptime: process.uptime(),
          timestamp: Date.now(),
          cacheStatus: {
            memoryCache: true,
            redisCache: isRedisAvailable()
          }
        });
      }
      
      // Include recent API timings, system metrics, and more detailed info for admins
      const recentTimings = getRecentTimings(20);
      
      res.json({
        status: 'ok',
        uptime: process.uptime(),
        timestamp: Date.now(),
        metrics,
        recentTimings,
        memory: process.memoryUsage(),
        cacheStatus: {
          memoryCache: true,
          redisCache: isRedisAvailable()
        }
      });
    } catch (error) {
      console.error('Monitoring error:', error);
      res.status(500).json({ status: 'error', message: 'Failed to retrieve monitoring data' });
    }
  });

  // Reset monitoring statistics
  app.post("/api/monitoring/reset", async (req, res) => {
    try {
      // Check authentication - only admins can reset monitoring
      // Check for admin status based on a special username for now
      if (!req.isAuthenticated() || req.user.username !== 'admin') {
        return res.status(403).json({ status: 'error', message: 'Unauthorized' });
      }
      
      // Reset the metrics
      resetSystemMetrics();
      
      res.json({ status: 'ok', message: 'Monitoring statistics reset successfully' });
    } catch (error) {
      console.error('Monitoring reset error:', error);
      res.status(500).json({ status: 'error', message: 'Failed to reset monitoring data' });
    }
  });
  
  // Test endpoint for Tavily and Groq integration
  app.get("/api/test-integration", async (req, res) => {
    try {
      // Check API keys
      const tavilyApiKey = process.env.TAVILY_API_KEY || "";
      const groqApiKey = process.env.VITE_GROQ_API_KEY || process.env.GROQ_API_KEY || "";
      
      // Validate both API keys
      const groqKeyValid = groqApiKey.trim().length > 0;
      const tavilyKeyValid = tavilyApiKey.trim().length > 0 && tavilyApiKey.startsWith('tvly-');
      
      // Test results
      const testResults: {
        groqKeyPresent: boolean;
        tavilyKeyPresent: boolean;
        tavilyKeyFormat: boolean;
        integrationStatus: string;
        tavilyDirectTest?: {
          success: boolean;
          resultCount: number;
        };
        groqCompoundTest?: {
          success: boolean;
          model: string;
          searchToolsUsed: boolean;
          sourcesCount: number;
        };
        error?: string;
      } = {
        groqKeyPresent: groqKeyValid,
        tavilyKeyPresent: tavilyKeyValid,
        tavilyKeyFormat: tavilyApiKey.startsWith('tvly-'),
        integrationStatus: 'untested'
      };
      
      // Only proceed with full integration test if both keys are present
      if (groqKeyValid && tavilyKeyValid) {
        try {
          // Test Tavily direct API
          const tavilyResponse = await tavilySearch("latest AI news", tavilyApiKey, { search_depth: "basic" });
          testResults.tavilyDirectTest = {
            success: true,
            resultCount: tavilyResponse.results.length
          };
          
          // Test Groq model with search
          const directResponse = await directGroqCompoundSearch("What are the latest developments in quantum computing?", groqApiKey, "auto", "US", false);
          
          // Check if search tools were used
          const searchToolsUsed = Boolean(directResponse.search_tools_used && 
                                 directResponse.search_tools_used.length > 0 && 
                                 directResponse.search_tools_used[0].type === 'function');
          
          testResults.groqCompoundTest = {
            success: true,
            model: directResponse.model,
            searchToolsUsed: searchToolsUsed,
            sourcesCount: directResponse.sources ? directResponse.sources.length : 0
          };
          
          testResults.integrationStatus = searchToolsUsed ? 'fully_operational' : 'partial';
        } catch (error: any) {
          testResults.integrationStatus = 'failed';
          testResults.error = error.message || 'Unknown error';
        }
      }
      
      res.json(testResults);
    } catch (error: any) {
      console.error('Integration test error:', error);
      res.status(500).json({ error: 'Integration test failed', message: error.message || 'Unknown error' });
    }
  });
  
  // Function to apply user preferences to search filters
  async function applyUserPreferencesToSearch(userId: number, filters: Record<string, any>, requestedModel?: string): Promise<{filters: Record<string, any>, preferredModel: string}> {
    let preferredModel = requestedModel || 'auto';
    
    // Get user preferences if available
    const userPreferences = await storage.getUserPreferences(userId);
    
    // Apply user preferences to the search if available
    if (userPreferences) {
      // Use preferred model from user settings if not explicitly specified in request
      if (!requestedModel && userPreferences.aiModel) {
        preferredModel = userPreferences.aiModel;
      }
      
      // IMPORTANT: Use the enforceRegionPreference utility to strongly enforce region
      // This guarantees that the user's region preference is always applied, even if
      // the request contains a different region
      if (userPreferences.defaultRegion) {
        // The enforceRegionPreference utility handles all validation and normalization
        filters = enforceRegionPreference(filters, userPreferences.defaultRegion);
        
        // Log explicit message about applied region for debugging
        if (userPreferences.defaultRegion.toLowerCase() !== 'global') {
          console.log(`ENFORCED region preference from user settings: ${userPreferences.defaultRegion}`);
        }
      }
      
      // Apply any saved search filters from user preferences
      if (userPreferences.searchFilters) {
        // Merge user's saved filters with request filters, prioritizing request filters
        // except for region which is enforced from user preferences
        Object.entries(userPreferences.searchFilters).forEach(([key, value]) => {
          // Skip geo_location as it's handled by enforceRegionPreference
          if (key !== 'geo_location' && !filters[key] && value) {
            filters[key] = value;
          }
        });
      }
    }
    
    // Extra logging to verify region is being applied
    if (filters.geo_location) {
      console.log(`Final geo_location for search: ${filters.geo_location}`);
    } else {
      console.log('No geo_location set for this search request');
    }
    
    return { filters, preferredModel };
  }

  // Search suggestions endpoint
  app.get("/api/search/suggestions", async (req, res) => {
    try {
      const query = req.query.q as string;
      if (!query) {
        return res.status(400).json({ message: "Query parameter is required" });
      }
      
      const suggestions = await getSearchSuggestions(query);
      res.json({ suggestions });
    } catch (error) {
      console.error("Error getting suggestions:", error);
      res.status(500).json({ message: "Failed to get suggestions" });
    }
  });

  // Main search endpoint - supports both AI and traditional search
  app.get("/api/search", async (req, res) => {
    let userPreferences = null;
    try {
      const query = req.query.q as string;
      const searchType = req.query.type as string || 'all'; // 'all', 'ai', or 'traditional'
      const deepResearch = req.query.deepResearch === 'true'; // Check if deep research mode is enabled
      
      if (!query) {
        return res.status(400).json({ message: "Query parameter is required" });
      }
      
      // Parse search filters if provided
      let filters: Record<string, any> = {};
      if (req.query.time_range) filters.time_range = req.query.time_range;
      if (req.query.geo_location) filters.geo_location = req.query.geo_location;
      if (req.query.include_domains) filters.include_domains = (req.query.include_domains as string).split(',');
      if (req.query.exclude_domains) filters.exclude_domains = (req.query.exclude_domains as string).split(',');
      if (req.query.search_depth) filters.search_depth = req.query.search_depth;
      if (req.query.include_images !== undefined) filters.include_images = req.query.include_images === 'true';
      
      // Get API keys from environment
      const tavilyApiKey = process.env.TAVILY_API_KEY || "";
      const groqApiKey = process.env.VITE_GROQ_API_KEY || process.env.GROQ_API_KEY || "";

      console.log('API Key status - Tavily:', tavilyApiKey ? 'Present (starts with: ' + tavilyApiKey.substring(0, 8) + '...)' : 'Not found');
      console.log('API Key status - Groq:', groqApiKey ? 'Present (starts with: ' + groqApiKey.substring(0, 8) + '...)' : 'Not found');
      console.log(`Performing ${searchType} search for: "${query}"`);
      
      if (!tavilyApiKey || !groqApiKey) {
        return res.status(500).json({ message: "API keys not configured" });
      }
      
      // Handle subscription tier restrictions
      let userTier = 'anonymous'; // Default for non-authenticated users
      let userSearchCount = 0;
      let userId = null;
      let useLimitedAIResponse = true; // Default to limited response for anonymous users
      let preferredModel = req.query.model as string || 'auto';
      
      // Check if user is authenticated
      if (req.isAuthenticated()) {
        userId = req.user.id;
        userTier = req.user.subscriptionTier;
        userSearchCount = req.user.searchCount;
        
        // Apply user preferences to search
        const { filters: enhancedFilters, preferredModel: userPreferredModel } = await applyUserPreferencesToSearch(
          userId, 
          filters, 
          preferredModel
        );
        
        // Update our filters and model with user preferences
        filters = enhancedFilters;
        preferredModel = userPreferredModel;
        
        // Pro users get 300 searches with full features
        if (userTier === 'pro') {
          useLimitedAIResponse = false;
          
          // Pro users have a limit of 300 searches
          if (userSearchCount >= 300) {
            return res.status(403).json({ 
              message: "You've reached your pro tier search limit of 300 searches.",
              limitReached: true
            });
          }
        }
        // Basic users get 100 searches
        else if (userTier === 'basic' && userSearchCount >= 100) {
          return res.status(403).json({ 
            message: "You've reached your basic tier search limit of 100 searches. Please upgrade to Pro for more searches.",
            limitReached: true
          });
        }
        // Free users get 20 searches with limited model
        else if (userTier === 'free' && userSearchCount >= 20) {
          return res.status(403).json({ 
            message: "You've reached your free tier search limit of 20 searches. Please upgrade for more searches.",
            limitReached: true
          });
        }
        // Update search count for authenticated non-pro users
        if (userTier !== 'pro') {
          await storage.incrementUserSearchCount(userId);
        }
      } else {
        // Anonymous users get 1 search before being asked to sign in
        // Initialize or retrieve session search count
        req.session.anonymousSearchCount = req.session.anonymousSearchCount || 0;
        
        if (req.session.anonymousSearchCount >= 1) {
          return res.status(403).json({
            message: "Please sign in to continue searching",
            limitReached: true,
            authRequired: true
          });
        }
        
        // Increment anonymous search count
        req.session.anonymousSearchCount++;
      }
      
      // Save search to history if user is authenticated
      if (userId) {
        try {
          await storage.createSearchHistory({
            userId,
            query,
            timestamp: new Date(),
            filters: JSON.stringify(filters)
          });
        } catch (error) {
          console.error("Error saving search history:", error);
          // Continue with the search even if saving history fails
        }
      }
      
      // Store conversation context for follow-up queries
      if (req.query.isFollowUp === 'true') {
        // Ensure conversation context is initialized
        req.session.conversationContext = req.session.conversationContext || [];
        
        // Add the current query to the conversation context
        req.session.conversationContext.push({
          query,
          timestamp: Date.now()
        });
        
        // Limit conversation context to the last 5 queries
        if (req.session.conversationContext.length > 5) {
          req.session.conversationContext = req.session.conversationContext.slice(-5);
        }
      }
      
      // Check if we should use Deep Research mode - only available for pro tier
      if (deepResearch) {
        // Verify the user has pro tier (required for deep research)
        if (userTier !== 'pro') {
          return res.status(403).json({
            message: "Deep Research is a Pro tier feature. Please upgrade your subscription to access deep research capabilities.",
            limitReached: false,
            requiresUpgrade: true
          });
        }
        
        // Start timing for telemetry
        const timingId = startApiTiming('deep-research');
        
        // Set up research parameters
        const researchParams = {
          search_depth: 'advanced',
          max_results: 15, // Increased results for deep research
          include_answer: true,
          include_raw_content: true, // Get full content where available
          include_domains: filters.include_domains,
          exclude_domains: filters.exclude_domains,
          time_range: filters.time_range || null,
          geo_location: filters.geo_location || null
        };
        
        console.log(`Starting deep research for query: "${query}"`);
        console.log(`Research parameters:`, JSON.stringify(researchParams));
        
        // Perform agentic deep research with reasoning loops
        console.log(`Using agentic research with reasoning loops for: "${query}"`);
        
        // Current research state for SSE updates
        let currentState: ResearchState = { status: 'idle' };
        let progressLog: string[] = [];
        let currentIterations = 0;
        
        // Define progress callback for real-time updates
        const progressCallback = (progress: AgenticResearchProgress) => {
          // Update our tracking variables
          currentState = progress.state;
          progressLog = progress.log;
          currentIterations = progress.iterations;
          
          // Log progress for debugging
          console.log(`Research progress: ${progress.state.status}, iterations: ${progress.iterations}`);
        };
        
        const agenticResults = await executeAgenticResearch(query, tavilyApiKey, progressCallback, {
          deepDive: true,
          maxIterations: 2,
          includeReasoning: true,
          ...researchParams
        });
        
        // Convert to the expected format for compatibility
        const researchResults: TavilyDeepResearchResponse = {
          results: agenticResults.sources.map((source, index) => ({
            title: source.title,
            url: source.url,
            content: `Source from agentic research [${index + 1}]`,
            score: 1.0 - (index * 0.05), // Assign decreasing scores
          })),
          query: query,
          research_summary: agenticResults.answer,
          topic_clusters: {
            "Research Process": agenticResults.process
          }
        };
        
        // Record search in history if authenticated
        if (userId) {
          await storage.createSearchHistory({
            userId,
            query,
            timestamp: new Date()
          });
          
          // Save the full research results to the saved searches for retrieval later
          await storage.saveSearch({
            userId,
            query,
            results: researchResults,
            savedAt: new Date()
          });
        }
        
        // Complete timing
        completeApiTiming(timingId, true);
        
        // Return results with agentic research metadata
        return res.json({
          query,
          deepResearch: true,
          research: {
            ...researchResults,
            currentIteration: currentIterations,
            maxIterations: 2, // Fixed default value since we're using 2 in the agenticResults call
            reasoningLog: progressLog
          },
          searchType: searchType
        });
      }
      
      // Standard search flow continues below for non-deep research requests
      
      // Prepare for parallel processing of search tasks
      let traditional: TavilySearchResponse | null = null;
      let ai: { answer: string; model: string; sources: TavilySearchResult[] } | null = null;
      
      // For free tier and anonymous users, force the use of a lighter model
      if (userTier === 'free' || userTier === 'anonymous') {
        // Ensure limited model use for free tier
        preferredModel = 'fast';
      }
      
      // Load conversation context for follow-up queries
      let conversationContext: string[] = [];
      if (req.query.isFollowUp === 'true' && req.session.conversationContext) {
        // Format previous queries for context
        conversationContext = req.session.conversationContext.map(
          (ctx: any) => `User: ${ctx.query}${ctx.answer ? `\nAssistant: ${ctx.answer}` : ''}`
        );
      }
      
      // Define task groups for parallel execution
      const searchTasks: Record<string, (() => Promise<any>)[]> = {
        tavily: [],
        groq: []
      };
      
      // Add Tavily search task if needed
      if (searchType === 'all' || searchType === 'traditional') {
        searchTasks.tavily.push(async () => {
          console.log('Starting Tavily search task');
          return await tavilySearch(query, tavilyApiKey, filters);
        });
      }
      
      // Prepare for AI search if requested
      if (searchType === 'all' || searchType === 'ai') {
        // For follow-up queries with context, enhance the prompt
        let enhancedQuery = query;
        if (conversationContext.length > 0) {
          enhancedQuery = `Previous conversation:\n${conversationContext.join('\n\n')}\n\nCurrent query: ${query}`;
        }
        
        // For free/anonymous tier, use direct Groq without tool calling
        if (useLimitedAIResponse) {
          console.log('Using limited AI response with model: compound-beta-mini');
          
          // Add a task that depends on Tavily search results
          searchTasks.groq.push(async () => {
            console.log('Starting limited Groq search task');
            // Get Tavily results if we don't have them yet
            let tavilyResults: TavilySearchResult[] = [];
            
            if (traditional) {
              tavilyResults = traditional.results;
            } else if (searchTasks.tavily.length > 0) {
              // Wait for Tavily task to complete if it's running in parallel
              const tavilySearchPromise = searchTasks.tavily[0]();
              traditional = await tavilySearchPromise;
              tavilyResults = traditional.results;
            } else {
              // If no Tavily task was queued, run it now
              traditional = await tavilySearch(query, tavilyApiKey, filters);
              tavilyResults = traditional.results;
            }
            
            // Generate AI answer using Groq
            const groqResult = await groqSearch(query, tavilyResults, groqApiKey, preferredModel);
            
            // Extract sources from Tavily results
            const sources = tavilyResults.slice(0, 5).map(result => ({
              title: result.title,
              url: result.url,
              domain: new URL(result.url).hostname.replace('www.', '')
            }));
            
            return {
              answer: groqResult.answer,
              model: groqResult.model,
              sources: sources
            };
          });
        } else {
          // Pro and basic tiers get access to full model features with tool calling
          console.log('Using enhanced AI response with model: compound-beta');
          
          // Add task for direct compound search
          searchTasks.groq.push(async () => {
            console.log('Starting enhanced Groq Compound search task');
            // Get direct search results using Groq's built-in Tavily integration
            return await directGroqCompoundSearch(
              query,
              groqApiKey,
              preferredModel,
              filters.geo_location ? filters.geo_location.toUpperCase() : null, // Ensure proper format
              conversationContext.length > 0, // Flag to indicate if this is a contextual search
              req.session.conversationContext || [], // Pass conversation context
              filters, // Pass search filters
              tavilyApiKey // Pass Tavily API key
            );
          });
        }
      }
      
      try {
        // Execute tasks in parallel with dependencies (Groq may depend on Tavily)
        const dependencies = searchTasks.groq.length > 0 && searchTasks.tavily.length > 0 && useLimitedAIResponse
          ? { groq: ['tavily'] } // Groq depends on Tavily for limited response
          : {}; // No dependencies for other cases
        
        console.log(`Executing search tasks: Tavily (${searchTasks.tavily.length}), Groq (${searchTasks.groq.length})`);
        
        // Execute tasks with concurrency of 2
        const results = await parallelTaskGroups(searchTasks, dependencies, 2);
        
        // Process results
        if (results.tavily && results.tavily.length > 0) {
          traditional = results.tavily[0];
        }
        
        if (results.groq && results.groq.length > 0) {
          const groqResult = results.groq[0];
          
          if (useLimitedAIResponse) {
            // For limited response mode
            ai = groqResult;
          } else {
            // For enhanced mode with direct compound
            const directResult = groqResult;
            
            // Store the generated answer in the conversation context for future follow-up queries
            if (req.session.conversationContext && req.session.conversationContext.length > 0) {
              req.session.conversationContext[req.session.conversationContext.length - 1].answer = 
                directResult.answer.substring(0, 500); // Store truncated answer for context
            }
            
            ai = {
              answer: directResult.answer,
              model: directResult.model,
              sources: directResult.sources
            };
            
            // If we haven't already performed a traditional search, extract it from the compound result
            if (!traditional && directResult.searchResults) {
              traditional = {
                results: directResult.searchResults,
                query: query,
                search_depth: filters.search_depth || "basic"
              };
            }
          }
        }
      } catch (error) {
        console.error("Error in parallel search execution:", error);
        // Provide a fallback response on error
        ai = {
          answer: "I encountered an error while processing your search. Please try again or refine your query.",
          model: "error",
          sources: []
        };
      }
      
      // Format traditional search results for the response
      const traditionalResults = traditional?.results.map(result => ({
        title: result.title,
        url: result.url,
        snippet: result.content.substring(0, 200) + '...',
        domain: new URL(result.url).hostname.replace('www.', ''),
        date: result.published_date,
        image: result.image
      })) || [];
      
      // Compose response with available results
      const response: any = {
        searchType,
        query
      };
      
      if (ai) {
        response.ai = {
          answer: ai.answer,
          sources: ai.sources,
          model: ai.model,
          contextual: req.query.isFollowUp === 'true'
        };
      }
      
      if (traditionalResults.length > 0) {
        response.traditional = traditionalResults;
      }
      
      res.json(response);
    } catch (error) {
      console.error("Search error:", error);
      res.status(500).json({ message: "An error occurred during the search" });
    }
  });

  // Direct search endpoint - primarily for mobile and external API access
  app.get("/api/direct-search", async (req, res) => {
    let userPreferences = null;
    try {
      const query = req.query.q as string;
      const isFollowUp = req.query.isFollowUp === 'true';
      
      if (!query) {
        return res.status(400).json({ message: "Query parameter is required" });
      }
      
      // Parse search filters if provided
      let filters: Record<string, any> = {};
      if (req.query.time_range) filters.time_range = req.query.time_range;
      if (req.query.geo_location) filters.geo_location = req.query.geo_location;
      if (req.query.include_domains) filters.include_domains = (req.query.include_domains as string).split(',');
      if (req.query.exclude_domains) filters.exclude_domains = (req.query.exclude_domains as string).split(',');
      if (req.query.search_depth) filters.search_depth = req.query.search_depth;
      
      // Get API keys from environment
      const tavilyApiKey = process.env.TAVILY_API_KEY || "";
      const groqApiKey = process.env.GROQ_API_KEY || "";
      
      if (!tavilyApiKey || !groqApiKey) {
        return res.status(500).json({ message: "API keys not configured" });
      }
      
      // Handle subscription tier restrictions
      let userTier = 'anonymous'; // Default for non-authenticated users
      let userSearchCount = 0;
      let userId = null;
      let useLimitedAIResponse = true; // Default to limited response for anonymous users
      let preferredModel = req.query.model as string || 'auto';
      
      // Check if user is authenticated
      if (req.isAuthenticated()) {
        userId = req.user.id;
        userTier = req.user.subscriptionTier;
        userSearchCount = req.user.searchCount;
        
        // Apply user preferences to search
        const { filters: enhancedFilters, preferredModel: userPreferredModel } = await applyUserPreferencesToSearch(
          userId, 
          filters, 
          preferredModel
        );
        
        // Update our filters and model with user preferences
        filters = enhancedFilters;
        preferredModel = userPreferredModel;
        
        // Pro users get 300 searches with full features
        if (userTier === 'pro') {
          useLimitedAIResponse = false;
          
          // Pro users have a limit of 300 searches
          if (userSearchCount >= 300) {
            return res.status(403).json({ 
              message: "You've reached your pro tier search limit of 300 searches.",
              limitReached: true
            });
          }
        }
        // Basic users get 100 searches
        else if (userTier === 'basic' && userSearchCount >= 100) {
          return res.status(403).json({ 
            message: "You've reached your basic tier search limit of 100 searches. Please upgrade to Pro for more searches.",
            limitReached: true
          });
        }
        // Free users get 20 searches with limited model
        else if (userTier === 'free' && userSearchCount >= 20) {
          return res.status(403).json({ 
            message: "You've reached your free tier search limit of 20 searches. Please upgrade for more searches.",
            limitReached: true
          });
        }
        // Update search count for authenticated non-pro users
        if (userTier !== 'pro') {
          await storage.incrementUserSearchCount(userId);
        }
      } else {
        // Anonymous users get 1 search before being asked to sign in
        req.session.anonymousSearchCount = req.session.anonymousSearchCount || 0;
        
        if (req.session.anonymousSearchCount >= 1) {
          return res.status(403).json({
            message: "Please sign in to continue searching",
            limitReached: true,
            authRequired: true
          });
        }
        
        // Increment anonymous search count
        req.session.anonymousSearchCount++;
      }
      
      // Save search to history if user is authenticated
      if (userId) {
        try {
          await storage.createSearchHistory({
            userId,
            query,
            timestamp: new Date(),
            filters: JSON.stringify(filters)
          });
        } catch (error) {
          console.error("Error saving search history:", error);
          // Continue with the search even if saving history fails
        }
      }
      
      // Handle conversation context for follow-up queries
      if (isFollowUp) {
        req.session.conversationContext = req.session.conversationContext || [];
        req.session.conversationContext.push({
          query,
          timestamp: Date.now()
        });
        
        if (req.session.conversationContext.length > 5) {
          req.session.conversationContext = req.session.conversationContext.slice(-5);
        }
      }
      
      // For free tier and anonymous users, force the use of a lighter model
      if (userTier === 'free' || userTier === 'anonymous') {
        preferredModel = 'fast';
      }
      
      try {
        // Load conversation context for follow-up queries
        let conversationContext: string[] = [];
        if (isFollowUp && req.session.conversationContext) {
          conversationContext = req.session.conversationContext.map(
            (ctx: any) => `User: ${ctx.query}${ctx.answer ? `\nAssistant: ${ctx.answer}` : ''}`
          );
        }
        
        let ai;
        let traditionalResults = [];
        
        if (useLimitedAIResponse) {
          console.log('Using limited AI response for direct search');
          
          // Get traditional search results from Tavily
          const traditional = await tavilySearch(query, tavilyApiKey, filters);
          
          // Use Groq to synthesize an answer
          const groqResult = await groqSearch(query, traditional.results, groqApiKey, preferredModel);
          
          // Extract sources from Tavily results
          const sources = traditional.results.slice(0, 5).map(result => ({
            title: result.title,
            url: result.url,
            domain: new URL(result.url).hostname.replace('www.', '')
          }));
          
          ai = {
            answer: groqResult.answer,
            model: groqResult.model,
            sources,
            contextual: isFollowUp
          };
          
          traditionalResults = traditional.results.map(result => ({
            title: result.title,
            url: result.url,
            snippet: result.content.substring(0, 200) + '...',
            domain: new URL(result.url).hostname.replace('www.', ''),
            date: result.published_date,
            image: result.image
          }));
        } else {
          console.log('Using enhanced AI response for direct search');
          
          // Use direct compound search for comprehensive results
          const directResult = await directGroqCompoundSearch(
            query,
            groqApiKey,
            preferredModel,
            // Ensure geo_location is correctly passed and log for debugging
            filters.geo_location ? filters.geo_location.toUpperCase() : null,
            conversationContext.length > 0,
            req.session.conversationContext || [], // Pass conversation context for better contextual responses
            filters, // Pass search filters
            tavilyApiKey // Pass Tavily API key
          );
          
          // Store the generated answer in the conversation context
          if (req.session.conversationContext && req.session.conversationContext.length > 0) {
            req.session.conversationContext[req.session.conversationContext.length - 1].answer = 
              directResult.answer.substring(0, 500);
          }
          
          ai = {
            answer: directResult.answer,
            model: directResult.model,
            sources: directResult.sources,
            contextual: isFollowUp
          };
          
          // Format traditional search results if available
          if (directResult.searchResults) {
            traditionalResults = directResult.searchResults.map(result => ({
              title: result.title,
              url: result.url,
              snippet: result.content.substring(0, 200) + '...',
              domain: new URL(result.url).hostname.replace('www.', ''),
              date: result.published_date,
              image: result.image
            }));
          }
        }
        
        // Compose the final response
        const response = {
          ai,
          traditional: traditionalResults,
          searchType: 'direct'
        };
        
        res.json(response);
      } catch (error) {
        console.error("Direct search error:", error);
        res.status(500).json({ message: "An error occurred during direct search" });
      }
    } catch (error) {
      console.error("Direct search route error:", error);
      res.status(500).json({ message: "An error occurred in the direct search route" });
    }
  });

  // Authentication-related endpoints are now handled in auth.ts

  // Update user profile
  app.patch("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    // Update logic would go here
    res.status(501).json({ message: "Profile update not implemented yet" });
  });

  // Get user search history
  app.get("/api/search-history", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const userId = req.user.id;
      const searchHistory = await storage.getSearchHistoryByUserId(userId);
      res.json(searchHistory);
    } catch (error) {
      console.error("Error retrieving search history:", error);
      res.status(500).json({ message: "Error retrieving search history" });
    }
  });

  // Save a search
  app.post("/api/saved-searches", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const { query, notes } = req.body;
      const userId = req.user.id;
      
      if (!query) {
        return res.status(400).json({ message: "Query is required" });
      }
      
      const savedSearch = await storage.saveSearch({
        userId,
        query,
        notes: notes || null,
        createdAt: new Date()
      });
      
      res.status(201).json(savedSearch);
    } catch (error) {
      console.error("Error saving search:", error);
      res.status(500).json({ message: "Error saving search" });
    }
  });

  // Get saved searches
  app.get("/api/saved-searches", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const userId = req.user.id;
      const savedSearches = await storage.getSavedSearchesByUserId(userId);
      res.json(savedSearches);
    } catch (error) {
      console.error("Error retrieving saved searches:", error);
      res.status(500).json({ message: "Error retrieving saved searches" });
    }
  });

  // Provide search feedback
  app.post("/api/search-feedback", async (req, res) => {
    try {
      const { searchId, rating, comments } = req.body;
      
      if (!searchId || !rating) {
        return res.status(400).json({ message: "Search ID and rating are required" });
      }
      
      const userId = req.isAuthenticated() ? req.user.id : null;
      
      const feedback = await storage.createSearchFeedback({
        searchId,
        userId,
        rating,
        comments: comments || null,
        createdAt: new Date()
      });
      
      res.status(201).json(feedback);
    } catch (error) {
      console.error("Error saving search feedback:", error);
      res.status(500).json({ message: "Error saving search feedback" });
    }
  });
  
  // Debug endpoint for agenticResearch testing
  app.post("/api/debug/agentic-research", async (req, res) => {
    try {
      // Start timing for telemetry
      const timingId = startApiTiming('/api/debug/agentic-research');
      
      // Get query and parameters
      const { query, options = {} } = req.body;
      
      if (!query || typeof query !== 'string' || query.trim() === '') {
        return res.status(400).json({ 
          error: 'invalid_query',
          message: 'A valid research query is required'
        });
      }
      
      // Get user and check subscription tier - only pro users can access this debug endpoint
      if (!req.isAuthenticated()) {
        return res.status(401).json({ 
          error: 'authentication_required',
          message: 'You must be logged in to use this endpoint'
        });
      }
      
      const userId = req.user.id;
      const userTier = req.user.subscriptionTier || 'free';
      
      // Only pro users can access this debug endpoint
      if (userTier !== 'pro' && userTier !== 'developer') {
        logEvent('unauthorized_debug_attempt', {
          userId,
          userTier,
          query: query.substring(0, 100)
        });
        
        return res.status(403).json({
          error: 'subscription_required',
          message: 'Debug tools are only available to Pro tier users',
          userTier,
          requiredTier: 'pro'
        });
      }
      
      // Get API key
      const tavilyApiKey = process.env.TAVILY_API_KEY;
      if (!tavilyApiKey) {
        throw new Error('Server configuration error: Missing Tavily API key');
      }
      
      // Get OpenAI key (for agentic reasoning)
      const openAIKey = process.env.OPENAI_API_KEY;
      if (!openAIKey) {
        throw new Error('Server configuration error: Missing OpenAI API key');
      }
      
      console.log(`Starting debug agentic research for query: "${query}"`);
      
      // Set debugging options
      const debugOptions = {
        deepDive: true,
        maxIterations: options.max_iterations || 2,
        includeReasoning: true,
        debug_mode: true,
        search_depth: options.search_depth || 'medium',
        max_results: options.max_results || 10,
        userTier: userTier
      };
      
      // Log detailed debug information
      console.log(`Debug research parameters:`, JSON.stringify(debugOptions));
      
      // Perform agentic deep research with reasoning loops
      console.log(`Using agentic research with reasoning loops for debug: "${query}"`);
      const agenticResults = await executeAgenticResearch(query, tavilyApiKey, null, debugOptions);
      
      // Format response
      const response = {
        query,
        research_summary: agenticResults.answer,
        results: agenticResults.sources,
        process_log: agenticResults.process,
        iterations: 2, // Hard-code for now since we know it's 2 iterations from our options
        debug_info: {
          options: debugOptions,
          duration_ms: 0 // Will be filled below
        }
      };
      
      // Complete timing
      const timing = completeApiTiming(timingId, true);
      if (timing && timing.durationMs) {
        response.debug_info.duration_ms = timing.durationMs;
      }
      
      return res.json(response);
    } catch (error: any) {
      console.error('Debug agentic research error:', error);
      
      // Complete timing with error status
      if (typeof timingId !== 'undefined') {
        completeApiTiming(timingId, false);
      }
      
      return res.status(500).json({
        error: 'research_error',
        message: error.message || 'An unknown error occurred during research',
        query: typeof query !== 'undefined' ? query : 'unknown',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  });
  
  // Advanced research endpoint for Pro users
  app.post("/api/deep-research", async (req, res) => {
    try {
      // Start timing for telemetry
      const timingId = startApiTiming('/api/deep-research');
      
      // Get query and parameters
      const { query, options = {} } = req.body;
      
      if (!query || typeof query !== 'string' || query.trim() === '') {
        return res.status(400).json({ 
          error: 'Invalid query',
          message: 'A valid research query is required'
        });
      }
      
      // Get user and check subscription tier
      let userId = null;
      let userTier = 'anonymous';
      
      if (req.isAuthenticated()) {
        userId = req.user.id;
        userTier = req.user.subscriptionTier || 'free';
      }
      
      // Check if user is authorized to use this feature
      if (userTier !== 'pro' && userTier !== 'developer') {
        // Create log entry for unauthorized attempt
        logEvent('unauthorized_deep_research_attempt', {
          userId,
          userTier,
          query: query.substring(0, 100)
        });
        
        return res.status(403).json({
          error: 'subscription_required',
          message: 'Deep research is a Pro tier feature. Please upgrade your subscription to access advanced research capabilities.',
          userTier,
          requiredTier: 'pro'
        });
      }
      
      // Get API key
      const tavilyApiKey = process.env.TAVILY_API_KEY;
      if (!tavilyApiKey) {
        console.error('Tavily API key missing for deep research');
        return res.status(500).json({
          error: 'configuration_error',
          message: 'Server configuration error: Missing Tavily API key'
        });
      }
      
      // Apply user preferences
      const userPrefs = userId ? await storage.getUserPreferences(userId) : null;
      const defaultRegion = userPrefs?.defaultRegion || 'global';
      const regionCode = normalizeRegionCode(defaultRegion) || null;
      
      // Build research parameters
      const researchParams = {
        max_results: options.max_results || 10,
        topic_keywords: options.topic_keywords || [],
        include_domains: options.include_domains || [],
        exclude_domains: options.exclude_domains || [],
        time_range: options.time_range || 'month',
        geo_location: regionCode || undefined,
        include_raw_content: true,
        crawl_depth: options.crawl_depth || 'medium',
        extract_content: true,
        generate_summary: true
      };
      
      console.log(`Starting deep research for query: "${query}"`);
      console.log(`Research parameters:`, JSON.stringify(researchParams));
      
      // Perform deep research
      // Perform agentic deep research with reasoning loops
      console.log(`Using agentic research with reasoning loops for: "${query}"`);
      const agenticResults = await executeAgenticResearch(query, tavilyApiKey, null, {
        deepDive: true,
        maxIterations: 2,
        includeReasoning: true,
        ...researchParams
      });
      
      // Convert to the expected format for compatibility
      const researchResults: TavilyDeepResearchResponse = {
        results: agenticResults.sources.map((source, index) => ({
          title: source.title,
          url: source.url,
          content: `Source from agentic research [${index + 1}]`,
          score: 1.0 - (index * 0.05), // Assign decreasing scores
        })),
        query: query,
        research_summary: agenticResults.answer,
        topic_clusters: {
          "Research Process": agenticResults.process
        }
      };
      
      // Record search in history if authenticated
      if (userId) {
        await storage.createSearchHistory({
          userId,
          query,
          timestamp: new Date()
        });
        
        // Save the full research results to the saved searches for retrieval later
        await storage.saveSearch({
          userId,
          query,
          results: researchResults,
          savedAt: new Date()
        });
      }
      
      // Complete timing
      completeApiTiming(timingId, true);
      
      // Return results
      res.json({
        query,
        results: researchResults.results,
        topic_clusters: researchResults.topic_clusters,
        research_summary: researchResults.research_summary,
        estimated_analysis_depth: researchResults.estimated_analysis_depth,
        user_tier: userTier
      });
      
    } catch (error: any) {
      console.error('Deep research error:', error);
      res.status(500).json({
        error: 'deep_research_error',
        message: error.message || 'An error occurred during deep research'
      });
    }
  });
  
  // Extract detailed content from URL (Pro users)
  app.post("/api/extract-content", async (req, res) => {
    try {
      // Start timing
      const timingId = startApiTiming('/api/extract-content');
      
      // Get URL from request
      const { url } = req.body;
      
      if (!url || typeof url !== 'string' || url.trim() === '') {
        return res.status(400).json({
          error: 'invalid_url',
          message: 'A valid URL is required'
        });
      }
      
      // Get user and check subscription tier
      let userTier = 'anonymous';
      
      if (req.isAuthenticated()) {
        userTier = req.user.subscriptionTier || 'free';
      }
      
      // Check if user is authorized to use this feature
      if (userTier !== 'pro' && userTier !== 'developer') {
        return res.status(403).json({
          error: 'subscription_required',
          message: 'Content extraction is a Pro tier feature. Please upgrade your subscription to access this feature.',
          userTier,
          requiredTier: 'pro'
        });
      }
      
      // Get API key
      const tavilyApiKey = process.env.TAVILY_API_KEY;
      if (!tavilyApiKey) {
        console.error('Tavily API key missing for content extraction');
        return res.status(500).json({
          error: 'configuration_error',
          message: 'Server configuration error: Missing Tavily API key'
        });
      }
      
      // Extract content
      console.log(`Extracting content from URL: ${url}`);
      const extractionResult = await tavilyExtractContent(url, tavilyApiKey);
      
      // Complete timing
      completeApiTiming(timingId, true);
      
      // Record cache hit/miss
      recordCacheResult(false);
      
      // Add to search history if user is authenticated
      if (req.isAuthenticated()) {
        const userId = req.user.id;
        try {
          await storage.createSearchHistory({
            userId,
            query: `URL: ${url}`
          });
        } catch (error) {
          console.error("Error saving extraction to history:", error);
          // Continue even if saving fails
        }
      }
      
      // Return results
      res.json({
        url: extractionResult.url,
        title: extractionResult.title,
        content: extractionResult.content,
        metadata: extractionResult.metadata || {}
      });
      
    } catch (error: any) {
      console.error('Content extraction error:', error);
      res.status(500).json({
        error: 'extraction_error',
        message: error.message || 'An error occurred during content extraction'
      });
    }
  });

  // Stripe payment routes
  // Create a subscription setup
  app.post("/api/create-subscription", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      // Accept either 'tier' or 'planType' parameter for better compatibility
      const tier = req.body.tier || req.body.planType;
      
      if (!tier || (tier !== 'free' && tier !== 'basic' && tier !== 'pro')) {
        return res.status(400).json({ message: "Valid subscription tier (free, basic, or pro) is required" });
      }
      
      // Special case for developer account - auto-approve without payment
      if (req.user.username === 'GaryOcean' || req.user.isDeveloper) {
        console.log(`Auto-approving subscription for developer account: ${req.user.username}`);
        
        // Set expiration date (30 days from now)
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);
        
        await storage.updateUserSubscription(req.user.id, tier, expiresAt);
        return res.json({
          success: true,
          isDeveloperAccount: true,
          message: `Developer account automatically subscribed to ${tier} tier`,
          tier
        });
      }
      
      // Handle free tier differently - no Stripe subscription needed
      if (tier === 'free') {
        // Just update the user's subscription tier and return success
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30); 
        await storage.updateUserSubscription(req.user.id, 'free', expiresAt);
        
        return res.json({
          success: true,
          message: "Successfully subscribed to free tier",
          tier: 'free'
        });
      }
      
      // For paid plans, check if we're in development/test mode
      const isDevMode = process.env.NODE_ENV === 'development' || !process.env.STRIPE_SECRET_KEY;
      
      if (isDevMode) {
        // In development mode, we'll skip actual payment processing and simulate the subscription
        console.log(`[DEV MODE] Simulating subscription setup for ${tier} tier`);
        
        // Create a fake setup intent ID for development
        const fakeSetupIntentId = `dev_setup_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        
        return res.json({
          clientSecret: "dev_secret",
          customerId: "dev_customer",
          setupIntentId: fakeSetupIntentId,
          tier,
          devMode: true
        });
      }
      
      // If in production with real Stripe API keys
      if (!stripe) {
        return res.status(500).json({ message: "Stripe not configured" });
      }
      
      // Get or create customer
      let customerId = req.user.stripeCustomerId;
      
      if (!customerId) {
        // Create customer, ensuring there's always a valid email
        const email = req.user.email || `${req.user.username}@example.com`;
        console.log(`Creating new Stripe customer with email: ${email}`);
        
        const customer = await stripe.customers.create({
          email,
          name: req.user.username
        });
        customerId = customer.id;
        console.log(`Created new Stripe customer with ID: ${customerId}`);
        
        // Update the customer ID in the database
        await storage.updateStripeInfo(
          req.user.id,
          customer.id,
          null
        );
      } else {
        console.log(`Using existing Stripe customer: ${customerId}`);
      }
      
      // For subscriptions, we need to create a SetupIntent instead of a PaymentIntent
      // This will be used to collect the payment method that will be charged for the subscription
      const setupIntent = await stripe.setupIntents.create({
        customer: customerId,
        payment_method_types: ['card'],
        usage: 'off_session',
      });
      
      console.log(`Created setup intent with ID: ${setupIntent.id}`);
      
      // Return setup intent details
      return res.json({
        clientSecret: setupIntent.client_secret,
        customerId,
        setupIntentId: setupIntent.id,
        tier
      });
    } catch (error) {
      console.error("Error creating subscription setup:", error);
      return res.status(500).json({ 
        message: "Error creating subscription setup", 
        details: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  // Direct subscription change endpoint (no payment processing)
  app.post("/api/change-subscription", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }
    
    const { planType } = req.body;
    
    if (!planType || !['free', 'basic', 'pro'].includes(planType)) {
      return res.status(400).json({ success: false, message: "Invalid plan type" });
    }
    
    try {
      // Handle developer accounts
      if (req.user.username === 'GaryOcean') {
        // Developers always get pro features
        await storage.updateUserSubscription(req.user.id, 'pro');
        return res.json({ 
          success: true, 
          message: "Developer account automatically upgraded to Pro tier", 
          isDeveloperAccount: true 
        });
      }
      
      // Calculate expiration date (30 days from now)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);
      
      // Update user subscription in the database
      const updatedUser = await storage.updateUserSubscription(req.user.id, planType, expiresAt);
      
      return res.json({
        success: true,
        tier: planType,
        user: updatedUser
      });
    } catch (error) {
      console.error("Error updating subscription:", error);
      return res.status(500).json({ success: false, message: "Error updating subscription" });
    }
  });
  
  // Handle Stripe webhook (for production use)
  app.post("/api/webhook", async (req, res) => {
    if (!stripe) {
      return res.status(500).json({ message: "Stripe not configured" });
    }
    
    const sig = req.headers['stripe-signature'];
    if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
      return res.status(400).json({ message: "Stripe webhook signature or secret missing" });
    }
    
    try {
      const event = stripe.webhooks.constructEvent(
        req.body, 
        sig, 
        process.env.STRIPE_WEBHOOK_SECRET
      );
      
      // Handle specific events
      switch (event.type) {
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
          const subscription = event.data.object;
          // Update user's subscription status
          // Logic would go here to find the user by subscription.customer
          // and update their subscription status
          break;
          
        case 'invoice.payment_succeeded':
          const invoice = event.data.object;
          // Process successful payment
          // Update subscription status to active
          break;
          
        case 'invoice.payment_failed':
          // Handle failed payment
          break;
          
        default:
          console.log(`Unhandled event type: ${event.type}`);
      }
      
      res.json({ received: true });
    } catch (error) {
      console.error("Webhook error:", error);
      res.status(400).json({ message: "Webhook error" });
    }
  });

  // Get subscription details
  app.get("/api/subscription", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    if (!stripe) {
      return res.status(500).json({ message: "Stripe not configured" });
    }
    
    try {
      const { stripeSubscriptionId } = req.user;
      
      if (!stripeSubscriptionId) {
        return res.json({ 
          status: 'none',
          tier: req.user.subscriptionTier,
          searchCount: req.user.searchCount
        });
      }
      
      const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
      
      res.json({
        status: subscription.status,
        currentPeriodEnd: subscription.current_period_end ? new Date(subscription.current_period_end * 1000) : null,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        tier: req.user.subscriptionTier,
        searchCount: req.user.searchCount
      });
    } catch (error) {
      console.error("Error retrieving subscription:", error);
      res.status(500).json({ message: "Error retrieving subscription" });
    }
  });

  // Activate subscription after payment method has been set up
  app.post("/api/activate-subscription", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }
    
    const { planType, setupIntentId } = req.body;
    
    if (!planType || !['basic', 'pro'].includes(planType)) {
      return res.status(400).json({ success: false, message: "Invalid plan type" });
    }
    
    if (!setupIntentId) {
      return res.status(400).json({ success: false, message: "Missing setup intent ID" });
    }
    
    try {
      // Special case for developer account - auto-approve without payment
      if (req.user.username === 'GaryOcean' || req.user.isDeveloper) {
        console.log(`Auto-approving subscription for developer account: ${req.user.username}`);
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);
        const updatedUser = await storage.updateUserSubscription(req.user.id, planType, expiresAt);
        
        return res.json({
          success: true,
          isDeveloperAccount: true,
          message: `Developer account automatically subscribed to ${planType} tier`,
          tier: planType,
          user: updatedUser
        });
      }
      
      // Check if this is a dev mode subscription (using our fake setupIntentId)
      const isDevMode = setupIntentId.startsWith('dev_setup_') || process.env.NODE_ENV === 'development';
      
      if (isDevMode) {
        console.log(`[DEV MODE] Activating ${planType} subscription for user: ${req.user.username}`);
        
        // Calculate expiration date (30 days from now)
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);
        
        // Update user subscription tier in the database
        const updatedUser = await storage.updateUserSubscription(req.user.id, planType, expiresAt);
        
        return res.json({
          success: true,
          tier: planType,
          user: updatedUser,
          devMode: true,
          message: `Your ${planType} subscription has been activated!`
        });
      }
      
      // Production mode with real Stripe API
      if (!stripe) {
        return res.status(500).json({ success: false, message: "Stripe not configured" });
      }
      
      // Verify the setup intent was successful
      const setupIntent = await stripe.setupIntents.retrieve(setupIntentId);
      
      if (setupIntent.status !== 'succeeded') {
        return res.status(400).json({
          success: false,
          message: "Payment method setup was not completed successfully"
        });
      }
      
      // Store the payment method info for future reference
      if (setupIntent.payment_method) {
        console.log(`Payment method ${setupIntent.payment_method} ready for use`);
      }
      
      // In production, we would create a real subscription here
      // But for simplicity and to avoid errors with price IDs, we'll just update the user directly
      
      // Calculate expiration date (30 days from now)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);
      
      // Update user subscription tier in the database
      const updatedUser = await storage.updateUserSubscription(req.user.id, planType, expiresAt);
      
      return res.json({
        success: true,
        tier: planType,
        user: updatedUser,
        message: `Your ${planType} subscription has been activated!`
      });
    } catch (error) {
      console.error("Error activating subscription:", error);
      return res.status(500).json({
        success: false,
        message: "Error activating subscription",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // User Preferences API endpoints
  // Get user preferences
  app.get("/api/user/preferences", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const userId = req.user.id;
      let preferences = await storage.getUserPreferences(userId);
      
      // If no preferences exist yet, create default preferences
      if (!preferences) {
        const defaultPrefs: InsertUserPreferences = {
          userId,
          defaultRegion: 'global',
          preferredLanguage: 'en',
          contentPreferences: {},
          searchFilters: {},
          aiModel: 'auto'
        };
        
        preferences = await storage.createUserPreferences(defaultPrefs);
      }
      
      res.json(preferences);
    } catch (error) {
      console.error("Error retrieving user preferences:", error);
      res.status(500).json({ message: "Error retrieving user preferences" });
    }
  });
  
  // Update user preferences
  app.post("/api/user/preferences", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const userId = req.user.id;
      const updates = req.body;
      
      // Check if preferences exist
      let preferences = await storage.getUserPreferences(userId);
      
      if (!preferences) {
        // Create new preferences
        const newPrefs: InsertUserPreferences = {
          userId,
          ...updates
        };
        preferences = await storage.createUserPreferences(newPrefs);
      } else {
        // Update existing preferences
        preferences = await storage.updateUserPreferences(userId, updates);
      }
      
      res.json(preferences);
    } catch (error) {
      console.error("Error updating user preferences:", error);
      res.status(500).json({ message: "Error updating user preferences" });
    }
  });
  
  // Topic interests endpoints
  // Get user topic interests
  app.get("/api/user/topics", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const userId = req.user.id;
      const topics = await storage.getUserTopicInterests(userId);
      res.json(topics);
    } catch (error) {
      console.error("Error retrieving user topics:", error);
      res.status(500).json({ message: "Error retrieving user topics" });
    }
  });
  
  // Add a topic interest
  app.post("/api/user/topics", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const userId = req.user.id;
      const { topic, interestLevel } = req.body;
      
      if (!topic) {
        return res.status(400).json({ message: "Topic is required" });
      }
      
      const newInterest: InsertUserTopicInterest = {
        userId,
        topic,
        interestLevel: interestLevel || 3 // Default to medium interest
      };
      
      const created = await storage.createUserTopicInterest(newInterest);
      res.status(201).json(created);
    } catch (error) {
      console.error("Error creating topic interest:", error);
      res.status(500).json({ message: "Error creating topic interest" });
    }
  });
  
  // Update a topic interest
  app.put("/api/user/topics/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const topicId = parseInt(req.params.id);
      const { interestLevel } = req.body;
      
      if (isNaN(topicId) || !interestLevel) {
        return res.status(400).json({ message: "Valid topic ID and interest level are required" });
      }
      
      const updated = await storage.updateUserTopicInterest(topicId, interestLevel);
      res.json(updated);
    } catch (error) {
      console.error("Error updating topic interest:", error);
      res.status(500).json({ message: "Error updating topic interest" });
    }
  });
  
  // Delete a topic interest
  app.delete("/api/user/topics/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const topicId = parseInt(req.params.id);
      
      if (isNaN(topicId)) {
        return res.status(400).json({ message: "Valid topic ID is required" });
      }
      
      await storage.deleteUserTopicInterest(topicId);
      res.status(204).end();
    } catch (error) {
      console.error("Error deleting topic interest:", error);
      res.status(500).json({ message: "Error deleting topic interest" });
    }
  });

  // Create HTTP server
  const httpServer = createServer(app);

  return httpServer;
}
