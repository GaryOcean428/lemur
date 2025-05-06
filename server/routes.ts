import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { directGroqCompoundSearch } from "./directCompound";
import { storage } from "./storage";
import fetch from "node-fetch";
import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn("Warning: Missing STRIPE_SECRET_KEY environment variable");
}

// Initialize Stripe with the secret key if available
const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY) 
  : null;

// Define Tavily search result interfaces
interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
  published_date?: string; // Publication date when available
  image?: {
    url: string;
    alt?: string; // Description of the image if available
  };
}

interface TavilySearchResponse {
  results: TavilySearchResult[];
  query: string;
  search_depth: string;
}

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

// Function to perform Tavily search
async function tavilySearch(query: string, apiKey: string, config: Record<string, any> = {}): Promise<TavilySearchResponse> {
  console.log(`Tavily search for: "${query}" with depth: ${config.search_depth || 'basic'}`);
  
  // Clean and validate the query
  const cleanedQuery = query.trim();
  if (!cleanedQuery) {
    throw new Error('Search query cannot be empty');
  }
  
  // Extra validation for Tavily API key format
  if (!apiKey || !apiKey.trim()) {
    console.warn('Tavily API key is missing or empty. Using Groq only without web search results.');
    // Return empty results rather than throwing an error to allow the system to continue with just Groq
    return {
      results: [],
      query: cleanedQuery,
      search_depth: config.search_depth || "basic"
    };
  }
  
  // Detailed debug info about the API key
  console.log(`DEBUG: Tavily API key details:`);
  console.log(`- Length: ${apiKey.length}`);
  console.log(`- First 8 chars: ${apiKey.substring(0, 8)}...`);
  console.log(`- Starts with 'tvly-': ${apiKey.startsWith('tvly-')}`);
  console.log(`- Contains whitespace: ${apiKey.includes(' ')}`);
  console.log(`- Has quotes: ${apiKey.includes('"') || apiKey.includes("'")}`);
  
  if (!apiKey.startsWith('tvly-')) {
    console.warn('Warning: Tavily API key does not have the expected format (should start with "tvly-"). API calls may fail.');
  }
  
  try {
    // Use Bearer token authentication as it's the correct method
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey.trim()}`, // Use Bearer token auth
      },
      body: JSON.stringify({
        query: cleanedQuery,
        search_depth: config.search_depth || "basic",
        include_domains: config.include_domains || [],
        exclude_domains: config.exclude_domains || [],
        max_results: config.max_results || 15,
        include_answer: false,
        include_images: config.include_images !== false, // Default to true
        include_raw_content: false,
        geo_location: config.geo_location || null, // e.g. "AU" for Australia
        time_range: config.time_range || null, // e.g. "day", "week", "month"
        // Additional filter options can be added here
      }),
    });

    if (!response.ok) {
      let errorMessage = `Tavily API error ${response.status}`;
      
      try {
        const errorBody = await response.text();
        console.error('Tavily API error details:', errorBody);
        
        // Provide specific error messages for common error codes
        if (response.status === 401) {
          console.warn('Tavily API authentication failed. Using Groq only without web search results.');
          // Return empty results rather than throwing, so Groq can still provide some answer
          return {
            results: [],
            query: cleanedQuery,
            search_depth: config.search_depth || "basic"
          };
        } else if (response.status === 429) {
          errorMessage = 'Tavily API error: Rate limit exceeded. Please try again later.';
        } else {
          errorMessage = `Tavily API error ${response.status}: ${errorBody}`;
        }
      } catch (parseError) {
        console.error('Failed to parse Tavily error response:', parseError);
      }
      
      throw new Error(errorMessage);
    }

    const results = await response.json() as TavilySearchResponse;
    return results;
  } catch (error) {
    // Add more detailed error information
    console.error('Tavily API call failed:', error);
    
    // Instead of throwing, return empty results to allow Groq to still function
    console.warn('Tavily search failed. Using Groq only without web search results.');
    return {
      results: [],
      query: cleanedQuery,
      search_depth: config.search_depth || "basic"
    };
  }
}

// Function to perform Groq search
async function groqSearch(query: string, sources: TavilySearchResult[], apiKey: string, modelPreference: string = 'auto'): Promise<{answer: string; model: string}> {
  // Map modelPreference to actual Groq models
  // Using Compound Beta models as documented
  let model = "compound-beta"; // Default
  if (modelPreference === 'fast') {
    model = "compound-beta-mini"; // Faster with single tool call
  } else if (modelPreference === 'comprehensive') {
    model = "compound-beta"; // Full-featured for comprehensive results
  }
  
  console.log(`Using Groq model: ${model} for synthesis`);
  
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

  const data: GroqResponse = await response.json();
  
  if (!data.choices || data.choices.length === 0) {
    throw new Error("No response generated from Groq API");
  }
  
  return {
    answer: data.choices[0].message.content,
    model: data.model
  };
}

// Function to get search suggestions
async function getSearchSuggestions(partialQuery: string): Promise<string[]> {
  // This is a simple implementation for demo purposes
  // In a production environment, you would connect to a real suggestion API
  if (!partialQuery || partialQuery.length < 2) {
    return [];
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
  return baseSuggestions
    .filter(suggestion => 
      suggestion.toLowerCase().includes(partialQuery.toLowerCase()))
    .concat([`${partialQuery} latest news`, `${partialQuery} research papers`])
    .slice(0, 7); // Return at most 7 suggestions
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
          
          // Test Groq compound-beta with search
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
  
  // Search suggestions endpoint
  app.get("/api/suggestions", async (req, res) => {
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
    try {
      const query = req.query.q as string;
      const searchType = req.query.type as string || 'all'; // 'all', 'ai', or 'traditional'
      
      if (!query) {
        return res.status(400).json({ message: "Query parameter is required" });
      }
      
      // Parse search filters if provided
      const filters: Record<string, any> = {};
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
      
      // Perform searches based on the requested search type
      let traditional: TavilySearchResponse | null = null;
      let ai: { answer: string; model: string; sources: TavilySearchResult[] } | null = null;
      
      // For free tier and anonymous users, force the use of a lighter model
      if (userTier === 'free' || userTier === 'anonymous') {
        // Ensure limited model use for free tier
        preferredModel = 'fast';
      }
      
      // Perform traditional search if requested
      if (searchType === 'all' || searchType === 'traditional') {
        traditional = await tavilySearch(query, tavilyApiKey, filters);
      }
      
      // Perform AI search if requested and user has access
      if (searchType === 'all' || searchType === 'ai') {
        // Use direct compound approach for unified search
        try {
          // Load conversation context for follow-up queries
          let conversationContext: string[] = [];
          if (req.query.isFollowUp === 'true' && req.session.conversationContext) {
            // Format previous queries for context
            conversationContext = req.session.conversationContext.map(
              (ctx: any) => `User: ${ctx.query}${ctx.answer ? `\nAssistant: ${ctx.answer}` : ''}`
            );
          }
          
          // For follow-up queries with context, enhance the prompt
          let enhancedQuery = query;
          if (conversationContext.length > 0) {
            enhancedQuery = `Previous conversation:\n${conversationContext.join('\n\n')}\n\nCurrent query: ${query}`;
          }
          
          // For free/anonymous tier, we use direct Groq without tool calling
          if (useLimitedAIResponse) {
            console.log('Using limited AI response with model: compound-beta-mini');
            
            // First get search results from Tavily
            if (!traditional) {
              traditional = await tavilySearch(query, tavilyApiKey, filters);
            }
            
            // Then use Groq to synthesize an answer
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
              sources: sources
            };
          } else {
            // Pro and basic tiers get access to full compound with tool calling
            console.log('Using enhanced AI response with model: compound-beta');
            
            // Get direct search results using Groq's built-in Tavily integration
            const directResult = await directGroqCompoundSearch(
              query,
              groqApiKey,
              preferredModel,
              filters.geo_location || null,
              conversationContext.length > 0, // Flag to indicate if this is a contextual search
              req.session.conversationContext || [] // Pass conversation context for better contextual responses
            );
            
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
        } catch (error) {
          console.error("Error in AI search:", error);
          ai = {
            answer: "I encountered an error while processing your search. Please try again or refine your query.",
            model: "error",
            sources: []
          };
        }
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
    try {
      const query = req.query.q as string;
      const isFollowUp = req.query.isFollowUp === 'true';
      
      if (!query) {
        return res.status(400).json({ message: "Query parameter is required" });
      }
      
      // Parse search filters if provided
      const filters: Record<string, any> = {};
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
            filters.geo_location || null,
            conversationContext.length > 0,
            req.session.conversationContext || [] // Pass conversation context for better contextual responses
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

  // Stripe payment routes
  // Create a subscription
  app.post("/api/create-subscription", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    if (!stripe) {
      return res.status(500).json({ message: "Stripe not configured" });
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
        await storage.updateUserSubscription(req.user.id, tier);
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
        await storage.updateUserSubscription(req.user.id, 'free');
        
        return res.json({
          success: true,
          message: "Successfully subscribed to free tier",
          tier: 'free'
        });
      }
      
      // For paid tiers, get Stripe price ID
      let priceId;
      
      if (tier === 'basic') {
        priceId = process.env.STRIPE_BASIC_PRICE_ID;
      } else if (tier === 'pro') {
        priceId = process.env.STRIPE_PRO_PRICE_ID;
      }
      
      // Need a valid Stripe price ID, can't continue without one
      if (!priceId) {
        console.error(`No price ID found for tier: ${tier}`);
        return res.status(400).json({ 
          message: "Stripe price ID not configured for this tier",
          details: "Please contact the administrator to set up proper Stripe price IDs"
        });
      }
      
      // Get or create customer
      let customerId = req.user.stripeCustomerId;
      
      // Log available price ID for debugging
      console.log(`Using price ID for ${tier} tier: ${priceId}`);
      
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
      } else {
        console.log(`Using existing Stripe customer: ${customerId}`);
      }
      
      // Create subscription
      const subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        payment_behavior: 'default_incomplete',
        expand: ['latest_invoice.payment_intent']
      });
      
      // Update user in database
      await storage.updateStripeInfo(
        req.user.id,
        customerId,
        subscription.id
      );
      
      // Return subscription details
      if (subscription.latest_invoice && 
          typeof subscription.latest_invoice !== 'string' && 
          subscription.latest_invoice.payment_intent && 
          typeof subscription.latest_invoice.payment_intent !== 'string' &&
          subscription.latest_invoice.payment_intent.client_secret) {
        console.log(`Successfully created subscription with ID: ${subscription.id}`);
        return res.json({
          subscriptionId: subscription.id,
          clientSecret: subscription.latest_invoice.payment_intent.client_secret
        });
      } else {
        console.error("Missing expected payment_intent.client_secret in subscription response");
        console.log("Subscription response structure issue");
        return res.status(500).json({ 
          message: "Payment setup incomplete", 
          details: "Could not retrieve payment details from Stripe" 
        });
      }
    } catch (error) {
      console.error("Error creating subscription:", error);
      res.status(500).json({ message: "Error creating subscription" });
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

  // Downgrade to free tier
  app.post("/api/change-subscription", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const { planType } = req.body;
      
      if (planType === 'free') {
        // If user wants to downgrade to free, we'll update their tier immediately
        const user = await storage.updateUserSubscription(req.user.id, 'free');
        
        // If they have an active Stripe subscription, cancel it at period end
        if (req.user.stripeSubscriptionId && stripe) {
          await stripe.subscriptions.update(req.user.stripeSubscriptionId, {
            cancel_at_period_end: true
          });
        }
        
        return res.json({
          success: true,
          message: "Successfully downgraded to free tier",
          user
        });
      } else if (planType === 'basic' || planType === 'pro') {
        // If switching between paid plans, a simple tier update is needed first
        // The payment flow will be handled separately in create-subscription
        await storage.updateUserSubscription(req.user.id, planType);
        
        return res.json({
          success: true,
          message: `Plan changed to ${planType}`,
          requiresPayment: true
        });
      } else {
        return res.status(400).json({
          message: "Invalid plan type. Must be 'free', 'basic', or 'pro'."
        });
      }
    } catch (error) {
      console.error("Error changing subscription plan:", error);
      res.status(500).json({ message: "Error changing subscription plan" });
    }
  });

  // Create HTTP server
  const httpServer = createServer(app);

  return httpServer;
}
