import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import fetch from "node-fetch";
import { setupAuth } from "./auth";
import Stripe from "stripe";

// Define Tavily API response interface
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

// Groq API response interface
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

// Tavily API for search results with support for specialized search types
async function tavilySearch(query: string, apiKey: string, config: Record<string, any> = {}): Promise<TavilySearchResponse> {
  try {
    // Validate API key format (basic check)
    if (!apiKey || apiKey.trim() === '') {
      throw new Error('Missing Tavily API key');
    }

    console.log('Making Tavily API request with key:', apiKey);
    
    // Create request with required parameters
    // Truncate query to 400 characters (Tavily API limit)
    const truncatedQuery = query.length > 400 ? query.substring(0, 397) + '...' : query;
    
    // Default request configuration
    const defaultConfig = {
      search_depth: "advanced", // Options: "basic" or "advanced"
      max_results: 15, // Up to 20 allowed
      include_answer: "basic", // Options: false, "basic", or "advanced"
      include_domains: [],
      exclude_domains: [],
      include_raw_content: false,
      include_images: true,
      include_image_descriptions: false,
      // Add regional awareness for Australia/local content
      geo_location: "AU" // Australia
    };
    
    // Merge the default configuration with the provided configuration
    const requestBody = {
      ...defaultConfig,
      ...config,
      query: truncatedQuery // Always use the truncated query
    };
    
    if (truncatedQuery !== query) {
      console.log(`Query was truncated from ${query.length} to ${truncatedQuery.length} characters for Tavily API request`);
    }
    
    console.log(`Tavily search config for ${config.search_type || 'general'} search:`, 
               JSON.stringify({
                 ...requestBody,
                 query: requestBody.query.substring(0, 30) + (requestBody.query.length > 30 ? '...' : '') // Truncate query for logging
               }, null, 2));
    
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(requestBody)
    });
    
    console.log('Tavily API response status:', response.status);

    if (!response.ok) {
      let errorMessage = `Tavily API error: ${response.status} ${response.statusText}`;
      
      if (response.status === 401) {
        errorMessage = 'Tavily API error: Invalid or expired API key. Please update your API key.';
      } else if (response.status === 429) {
        errorMessage = 'Tavily API error: Rate limit exceeded. Please try again later.';
      } else if (response.status === 400) {
        const errorBody = await response.text();
        console.error('Tavily API error details:', errorBody);
        errorMessage = `Tavily API error: Bad request. Details: ${errorBody}`;
      }
      
      throw new Error(errorMessage);
    }

    return await response.json() as TavilySearchResponse;
  } catch (error) {
    console.error("Error calling Tavily API:", error);
    throw error;
  }
}

// Groq API for AI responses
async function groqSearch(query: string, sources: TavilySearchResult[], apiKey: string, modelPreference: string = 'auto'): Promise<{answer: string; model: string}> {
  try {
    // Validate API key
    if (!apiKey || apiKey.trim() === '') {
      throw new Error('Missing Groq API key');
    }

    // Format sources for inclusion in prompt
    const formattedSources = sources.map((source, i) => 
      `Source ${i + 1}: ${source.title}\n${source.content.substring(0, 300)}...\nURL: ${source.url}`
    ).join('\n\n');

    // Create the prompt
    const prompt = `I need you to provide a comprehensive answer to this question: "${query}"
    
Here are the sources to use for your answer. Please cite them using [Source X] format when referencing information:

${formattedSources}

Your answer should:
1. Be factually accurate and based on the provided sources
2. Include relevant citations in the format [Source X] where X is the source number
3. Be comprehensive and detailed, providing in-depth information
4. Be well-structured with logical flow and clear section headings where appropriate
5. If sources contradict each other, acknowledge this and explain different viewpoints
6. For time-sensitive information, note the recency of the source
7. Prioritize authoritative sources over aggregators
8. Adapt content to be contextually relevant based on regional factors when applicable
9. For global topics, include relevant regional impacts or perspectives
10. For local topics, provide sufficient context for readers unfamiliar with the region

Make your answers about 15-20% more verbose than you normally would, with additional details and context for a comprehensive understanding of the topic.

Return your answer in well-formatted markdown with inline citations like [Source X].

Remember you are powered by Llama 3.3 and Llama 4 models optimized for search and tool use.`;

    // Choose model based on query complexity
    // Use Compound Beta for complex queries and Compound Beta Mini for simpler ones
    // Compound Beta uses Llama 4 Scout for core reasoning and Llama 3.3 70B for tool use and routing
    // Compound Beta Mini has ~3x lower latency, ideal for straightforward factual queries
    
    // We're now favoring the more powerful model for richer, more detailed results
    // Only use the mini model for very simple, straightforward queries
    const keywords = ["compare", "analyze", "explain", "describe", "detail", "why", "how", "what", 
                    "when", "where", "list", "differences", "similarities", "pros", "cons"];
    
    const hasComplexityKeyword = keywords.some(keyword => 
      query.toLowerCase().includes(keyword.toLowerCase()));
    
    const isComplexQuery = query.length > 30 || // Lowered threshold to favor the better model
                           hasComplexityKeyword ||
                           sources.length > 3 || // Lowered threshold to favor the better model
                           query.includes("?") && query.length > 20; // Questions with decent length
    
    // Map model preferences to actual API model names
    // Use Compound Beta models as recommended in the Groq documentation
    // https://console.groq.com/docs/agentic-tooling/compound-beta
    // https://console.groq.com/docs/agentic-tooling/compound-beta-mini
    const modelMap: Record<string, string> = {
      "auto": isComplexQuery ? "compound-beta" : "compound-beta-mini",
      "fast": "compound-beta-mini", // Fast model with lower latency
      "comprehensive": "compound-beta"  // Comprehensive model for complex reasoning
    };
    
    // Normalize the model preference string and ensure it's a valid option
    const normalizedPref = modelPreference.toLowerCase();
    
    // Get model based on user preference or fallback to auto selection
    let model: string;
    if (normalizedPref in modelMap) {
      model = modelMap[normalizedPref];
    } else {
      model = modelMap["auto"];
    }
    
    // Log which model was selected based on preference
    console.log(`Selected Groq model: ${model} (preference: ${modelPreference}) for query: "${query.substring(0, 50)}${query.length > 50 ? '...' : ''}"`);

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content: "You are Lemur, an advanced search assistant powered by Groq's Compound Beta models. You provide comprehensive answers based on web sources with proper citations. For technical or complex topics, you break down information into understandable explanations. For time-sensitive queries, you note source recency. Always maintain a helpful, informative tone while prioritizing accuracy and source attribution. Use markdown formatting appropriately to structure your responses with headings, lists, and emphasis where it improves readability."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.3
      })
    });

    if (!response.ok) {
      let errorMessage = `Groq API error: ${response.status} ${response.statusText}`;
      
      if (response.status === 401) {
        errorMessage = 'Groq API error: Invalid or expired API key. Please update your API key.';
      } else if (response.status === 429) {
        errorMessage = 'Groq API error: Rate limit exceeded. Please try again later.';
      } else if (response.status === 404) {
        errorMessage = `Groq API error: Model '${model}' not found or unavailable.`;
      } else {
        const errorBody = await response.text();
        console.error('Groq API error details:', errorBody);
        errorMessage = `Groq API error: ${response.status}. Details: ${errorBody}`;
      }
      
      throw new Error(errorMessage);
    }

    const data = await response.json() as GroqResponse;
    return {
      answer: data.choices[0].message.content,
      model
    };
  } catch (error) {
    console.error("Error calling Groq API:", error);
    throw error;
  }
}

// Function to get search suggestions based on partial query
async function getSearchSuggestions(partialQuery: string): Promise<string[]> {
  // If API keys are available, we would use them for real search suggestions
  // For now, we'll create relevant suggestions based on the partial query
  if (!partialQuery || partialQuery.length < 2) {
    return [];
  }
  
  const query = partialQuery.toLowerCase().trim();
  
  // Common prefixes and suffixes to generate realistic suggestions
  const prefixes = [
    "", // No prefix (i.e. just the query)
    "how to ",
    "what is ",
    "why does ",
    "when did ",
    "where is "
  ];
  
  const suffixes = [
    "", // No suffix
    " meaning",
    " definition",
    " examples",
    " news",
    " today",
    " near me",
    " vs",
    " alternatives",
    " tutorial",
    " explained",
    " guide",
    " best practices",
    " history"
  ];
  
  // Look for search history in the database
  let historySuggestions: string[] = [];
  try {
    // Get recent search history
    const searchHistory = await storage.getSearchHistoryByUserId(null);
    // Filter for searches containing the query
    historySuggestions = searchHistory
      .map(h => h.query)
      .filter(q => q.toLowerCase().includes(query))
      .slice(0, 5);
  } catch (error) {
    console.error("Error getting search history for suggestions:", error);
    // Continue with just the generated suggestions
  }
  
  // Generate suggestions from prefixes and suffixes
  let suggestions: string[] = [];
  
  // First check if the query already has a prefix
  let effectiveQuery = query;
  let foundPrefix = false;
  
  for (const prefix of prefixes) {
    if (query.startsWith(prefix) && prefix !== "") {
      // Remove the prefix from the query for better suffix matching
      effectiveQuery = query.substring(prefix.length);
      foundPrefix = true;
      break;
    }
  }
  
  // Generate suggestions based on whether we have a prefix or not
  if (foundPrefix) {
    // If query already has a prefix, just add suffixes to it
    suggestions = suffixes
      .filter(suffix => suffix !== "")
      .map(suffix => `${query}${suffix}`);
  } else {
    // Generate combinations of prefixes and suffixes
    for (const prefix of prefixes) {
      for (const suffix of suffixes) {
        // Skip empty prefix + empty suffix as it's just the query itself
        if (prefix === "" && suffix === "") continue;
        
        suggestions.push(`${prefix}${effectiveQuery}${suffix}`);
      }
    }
  }
  
  // Combine history suggestions with generated ones, prioritizing history and removing duplicates
  // First, convert to a combined array and filter for query inclusion
  const combinedSuggestions = [...historySuggestions, ...suggestions]
    .filter(s => s.toLowerCase().includes(query));
    
  // Then remove duplicates using a Map (more compatible across TS targets than Set)
  const uniqueSuggestions = Array.from(new Map(combinedSuggestions.map(s => [s.toLowerCase(), s])).values())
    .slice(0, 10); // Limit to top 10 suggestions
  
  return uniqueSuggestions;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication routes and middleware
  setupAuth(app);
  // Main Search API endpoint that supports different search types
  app.get("/api/search", async (req, res) => {
    try {
      const query = req.query.q as string;
      const searchType = req.query.type as string || 'all'; // Default to 'all' if not specified
      
      if (!query) {
        return res.status(400).json({ message: "Query parameter 'q' is required" });
      }

      // API Keys from environment variables
      const tavilyApiKey = process.env.VITE_TAVILY_API_KEY || process.env.TAVILY_API_KEY || "";
      const groqApiKey = process.env.VITE_GROQ_API_KEY || process.env.GROQ_API_KEY || "";

      console.log('API Key status - Tavily:', tavilyApiKey ? 'Present (starts with: ' + tavilyApiKey.substring(0, 5) + '...)' : 'Not found');
      console.log('API Key status - Groq:', groqApiKey ? 'Present (starts with: ' + groqApiKey.substring(0, 5) + '...)' : 'Not found');
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
        
        // Pro users get unlimited access to all features
        if (userTier === 'pro') {
          useLimitedAIResponse = false;
        }
        // Free users get limited searches and limited responses
        else if (userTier === 'free' && userSearchCount >= 5) {
          return res.status(403).json({ 
            message: "You've reached your search limit. Please upgrade to continue searching.",
            limitReached: true
          });
        }
        // Update search count for authenticated non-pro users
        if (userTier !== 'pro') {
          await storage.incrementUserSearchCount(userId);
        }
      } else {
        // Anonymous users get only 1 search
        const anonymousSearches = await storage.getSearchHistoryByUserId(null);
        if (anonymousSearches.length >= 1) {
          return res.status(403).json({
            message: "Please sign in to continue searching",
            limitReached: true
          });
        }
      }

      // Configuration for different search types
      const searchTypeConfig: Record<string, any> = {
        all: { search_depth: 'advanced', include_images: true, max_results: 15 },
        web: { search_depth: 'advanced', include_images: true, max_results: 15 },
        news: { search_depth: 'advanced', search_type: 'news', include_images: true, max_results: 10 },
        // Special configuration for image search to prioritize images
        images: { 
          search_depth: 'advanced', // Increase search depth for better image results
          include_images: true,
          include_image_descriptions: true, // Enable image descriptions
          include_answer: false,
          max_results: 16
        },
        // Special configuration for video search to prioritize videos with thumbnails
        videos: { 
          search_depth: 'advanced', // Increase search depth for better video results 
          search_type: 'video',
          include_images: true,
          include_image_descriptions: true, // Enable image descriptions
          max_results: 8
        },
        academic: { search_depth: 'advanced', search_type: 'scholarly_articles', include_images: true, max_results: 10 },
        shopping: { search_depth: 'basic', search_type: 'shopping', include_images: true, max_results: 12 },
        social: { search_depth: 'basic', search_type: 'social_media', include_images: true, max_results: 8 },
        maps: { search_depth: 'basic', search_type: 'location', include_images: true, max_results: 5 }
      };

      const searchConfig = searchTypeConfig[searchType] || searchTypeConfig['all'];

      // Get search results from Tavily with specific configuration
      const tavilyResults = await tavilySearch(query, tavilyApiKey, searchConfig);
      
      // Convert to our format and preprocess the results
      const traditional = tavilyResults.results.map((result) => {
        // Format the date to display or use placeholder if not available
        const date = result.published_date ? new Date(result.published_date).toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'short', 
          day: 'numeric' 
        }) : '';
        
        // Ensure snippet is not too long
        const snippet = result.content.substring(0, 350) + "...";
        
        // Process and validate image data if available
        let imageData = undefined;
        if (result.image && result.image.url) {
          // Ensure the image URL is valid
          const imageUrl = result.image.url.trim();
          if (imageUrl.startsWith('http')) {
            imageData = {
              url: imageUrl,
              alt: result.image.alt || result.title
            };
          }
        }
        
        return {
          title: result.title,
          url: result.url,
          snippet: snippet,
          domain: new URL(result.url).hostname.replace("www.", ""),
          date,
          // Include image data if available and valid from Tavily
          image: imageData
        };
      });
      
      // Log information about images for debugging
      console.log(`Total results: ${traditional.length}, with images: ${traditional.filter(r => r.image).length}`);
      if (searchType === 'images' || searchType === 'videos') {
        console.log(`${searchType} search results with valid images: ${traditional.filter(r => r.image).length}/${traditional.length}`);
      }

      // Only get AI answer for certain search types
      let aiAnswer = null;
      if (['all', 'ai', 'web', 'news', 'academic'].includes(searchType)) {
        // Determine model based on user tier
        // Default to compound-beta-mini for anonymous and free users
        let modelPreference = 'fast'; // compound-beta-mini
        
        // Pro users get access to compound-beta and can choose their model
        if (userTier === 'pro') {
          modelPreference = req.query.model as string || 'auto';
          console.log(`Pro user - using preferred model: ${modelPreference}`);
        } else if (userTier === 'basic') {
          // Basic users get default model selection but still limited response
          modelPreference = 'auto';
          console.log(`Basic user - using auto model selection`);
        } else {
          console.log(`Free/anonymous user - restricting to compound-beta-mini`);
        }
        
        // Get AI answer from Groq using the sources
        const { answer, model } = await groqSearch(query, tavilyResults.results, groqApiKey, modelPreference);
        
        // Format sources for the AI answer
        const sources = tavilyResults.results.slice(0, 5).map((result) => ({
          title: result.title,
          url: result.url,
          domain: new URL(result.url).hostname.replace("www.", "")
        }));
        
        // For non-pro users, limit the length of AI answers
        let processedAnswer = answer;
        if (useLimitedAIResponse && answer.length > 1500) {
          // Truncate answer for free/anonymous users
          processedAnswer = answer.substring(0, 1500) + 
            '\n\n*This answer has been truncated. Upgrade to a paid plan for complete answers.*';
          console.log('Answer truncated for free/anonymous user');
        }

        aiAnswer = {
          answer: processedAnswer,
          sources,
          model
        };
      }

      // Log search in database (without userId for anonymous searches)
      try {
        await storage.createSearchHistory({
          query,
          userId: null, // For anonymous searches
        });
        console.log(`Search logged: "${query}" (type: ${searchType})`);
      } catch (dbError) {
        // Log error but don't fail the search request
        console.error("Failed to log search to database:", dbError);
      }

      // Return combined results
      res.json({
        ai: aiAnswer,
        traditional,
        searchType
      });
    } catch (error) {
      console.error("Search API error:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "An error occurred while processing your search" 
      });
    }
  });
  
  // Get search history (for future authenticated users)
  app.get("/api/search-history", async (req, res) => {
    try {
      const userId = req.query.userId ? parseInt(req.query.userId as string) : null;
      const history = await storage.getSearchHistoryByUserId(userId);
      return res.json(history);
    } catch (error) {
      console.error("Error fetching search history:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "An error occurred while fetching search history" 
      });
    }
  });
  
  // Create search history record (for testing or manual additions)
  app.post("/api/search-history", async (req, res) => {
    try {
      const { query, userId } = req.body;
      
      if (!query) {
        return res.status(400).json({ message: "query is required" });
      }
      
      const searchHistory = await storage.createSearchHistory({
        query,
        userId
      });
      
      res.status(201).json(searchHistory);
    } catch (error) {
      console.error("Error creating search history:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "An error occurred while creating search history" 
      });
    }
  });
  
  // Save search (for authenticated users)
  app.post("/api/saved-searches", async (req, res) => {
    try {
      const { userId, query, aiAnswer, results } = req.body;
      
      if (!userId || !query) {
        return res.status(400).json({ message: "userId and query are required" });
      }
      
      const savedSearch = await storage.saveSearch({
        userId,
        query,
        aiAnswer,
        results
      });
      
      res.status(201).json(savedSearch);
    } catch (error) {
      console.error("Error saving search:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "An error occurred while saving search" 
      });
    }
  });
  
  // Get saved searches (for authenticated users)
  app.get("/api/saved-searches", async (req, res) => {
    try {
      const userId = req.query.userId ? parseInt(req.query.userId as string) : null;
      
      if (!userId) {
        return res.status(400).json({ message: "userId is required" });
      }
      
      const savedSearches = await storage.getSavedSearchesByUserId(userId);
      res.json(savedSearches);
    } catch (error) {
      console.error("Error fetching saved searches:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "An error occurred while fetching saved searches" 
      });
    }
  });
  
  // Search suggestions endpoint
  app.get("/api/search/suggestions", async (req, res) => {
    try {
      const query = req.query.q as string;
      
      if (!query || query.length < 2) {
        return res.json([]);
      }
      
      const suggestions = await getSearchSuggestions(query);
      
      // Log when suggestions are requested (useful for monitoring)
      console.log(`Suggestions for "${query}": ${suggestions.length} results`);
      
      res.json(suggestions);
    } catch (error) {
      console.error("Error getting search suggestions:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "An error occurred while getting search suggestions" 
      });
    }
  });
  
  // Subscription endpoints for handling user upgrades
  app.post("/api/create-subscription", async (req, res) => {
    try {
      // Check if user is authenticated
      if (!req.isAuthenticated()) {
        return res.status(401).json({
          message: "You must be logged in to subscribe"
        });
      }
      
      const { planType } = req.body;
      
      if (!planType || !['basic', 'pro'].includes(planType)) {
        return res.status(400).json({
          message: "Valid plan type (basic or pro) is required"
        });
      }

      // Check for Stripe API key
      const stripeKey = process.env.STRIPE_SECRET_KEY;
      if (!stripeKey) {
        return res.status(500).json({ message: "Stripe API key not configured" });
      }
      
      // Initialize Stripe
      const stripe = new Stripe(stripeKey);
      
      // Use price IDs from environment variables, or provide fallback for development
      const STRIPE_BASIC_PRICE_ID = process.env.STRIPE_BASIC_PRICE_ID;
      const STRIPE_PRO_PRICE_ID = process.env.STRIPE_PRO_PRICE_ID;

      // For security, validate that price IDs exist
      if (!STRIPE_BASIC_PRICE_ID || !STRIPE_PRO_PRICE_ID) {
        return res.status(500).json({ 
          message: "Stripe price IDs not configured. Please set STRIPE_BASIC_PRICE_ID and STRIPE_PRO_PRICE_ID environment variables."
        });
      }

      const SUBSCRIPTION_PRICES = {
        basic: STRIPE_BASIC_PRICE_ID, // Basic plan
        pro: STRIPE_PRO_PRICE_ID      // Pro plan
      };
      
      // Special case for developer accounts - bypass payment process
      const isDeveloperAccount = req.user.username === 'GaryOcean' ||
                                req.user.email?.endsWith('@replit.com') ||
                                req.user.email?.endsWith('@example.com');
      
      if (isDeveloperAccount) {
        // Update user to Pro without payment
        const oneYearFromNow = new Date();
        oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
        
        const updatedUser = await storage.updateUserSubscription(
          req.user.id, 
          planType, // 'basic' or 'pro'
          oneYearFromNow
        );
        
        // Return special response for developer accounts
        return res.json({
          subscriptionId: 'dev_account_' + Date.now(),
          isDeveloperAccount: true,
          planType,
          message: 'Developer account automatically upgraded without payment'
        });
      }
      
      // Normal payment flow for regular users
      // Determine price based on plan type
      const priceId = planType === 'pro' ? 
        SUBSCRIPTION_PRICES.pro : 
        SUBSCRIPTION_PRICES.basic;
      
      if (!priceId) {
        return res.status(500).json({ message: `Price ID for ${planType} plan not configured` });
      }
      
      // Get or create customer
      let customerId = req.user.stripeCustomerId;
      
      if (!customerId) {
        // Create a new customer in Stripe
        const customer = await stripe.customers.create({
          email: req.user.email,
          name: req.user.username,
          metadata: {
            userId: req.user.id.toString()
          }
        });
        
        customerId = customer.id;
      }
      
      // Create a subscription with proper price ID validation
      if (!SUBSCRIPTION_PRICES[planType as 'basic' | 'pro']) {
        throw new Error(`Invalid price ID for ${planType} plan`);
      }

      // Convert actual price amounts to test Stripe price_ids if they're numbers
      // In a production environment, you would use actual Stripe price IDs (price_xyz123)
      // but this allows for development testing with simpler values
      let effectivePriceId: string;

      if (!isNaN(Number(priceId))) {
        // If it's a number, assume it's a price amount and create a fake price_id for testing
        const amountCents = Number(priceId) * 100;
        console.log(`Using test price ID for amount: $${Number(priceId).toFixed(2)}`);
        effectivePriceId = `price_test_${planType}_${amountCents}`;
      } else if (typeof priceId === 'string' && priceId.startsWith('price_')) {
        // If it's already a Stripe price ID, use it directly
        effectivePriceId = priceId;
      } else {
        console.error(`Invalid Stripe price ID format: ${priceId}`);
        throw new Error('Invalid price ID format. Expected either a numeric price or a Stripe price ID starting with "price_"');
      }

      // Create subscription with the validated price ID
      // For test mode, we need to generate a product first then a price
      let productId;
      let finalPriceId;

      if (effectivePriceId.startsWith('price_test_')) {
        try {
          // Need to create a product first in test mode
          const product = await stripe.products.create({
            name: `${planType.charAt(0).toUpperCase() + planType.slice(1)} Plan`,
            description: planType === 'pro' ? 'Unlimited searches with premium features' : 'Up to 100 searches per month'
          });

          productId = product.id;

          // Now create a price for this product
          const amount = Number(priceId) * 100; // convert dollars to cents
          const price = await stripe.prices.create({
            unit_amount: amount,
            currency: 'usd',
            recurring: {
              interval: 'month'
            },
            product: productId,
            nickname: planType
          });

          finalPriceId = price.id;
          console.log(`Created test price: ${finalPriceId} for amount $${Number(priceId).toFixed(2)}`);
        } catch (e) {
          console.error('Error creating test price:', e);
          throw new Error('Failed to create test price for development mode');
        }
      } else {
        // Using an actual Stripe price ID
        finalPriceId = effectivePriceId;
      }

      // Now create subscription with the valid price ID
      const subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [{
          price: finalPriceId
        }],
        payment_behavior: 'default_incomplete',
      });
      
      // Retrieve the invoice separately to get payment intent info
      const invoice = typeof subscription.latest_invoice === 'string' ?
        await stripe.invoices.retrieve(subscription.latest_invoice) :
        subscription.latest_invoice;
      
      // Update user with Stripe info
      await storage.updateStripeInfo(req.user.id, customerId || '', subscription.id);
      
      // Return client secret for frontend to complete payment
      // Get the payment intent directly from subscription creation response
      let clientSecret = null;
      
      // Handle the response structure - first safely extract latest_invoice
      const latestInvoice = subscription.latest_invoice;
      if (latestInvoice && typeof latestInvoice === 'object' && 'payment_intent' in latestInvoice) {
        // If payment_intent is available directly 
        const paymentIntent = latestInvoice.payment_intent;
        if (paymentIntent && typeof paymentIntent === 'object' && 'client_secret' in paymentIntent) {
          clientSecret = paymentIntent.client_secret;
        }
      }
      
      // If we couldn't get the client secret directly, try to retrieve it
      if (!clientSecret && typeof subscription.latest_invoice === 'string') {
        try {
          // First get the invoice
          const invoiceData = await stripe.invoices.retrieve(subscription.latest_invoice);
          
          // Then retrieve the payment intent from the invoice
          if (invoiceData && invoiceData.payment_intent) {
            if (typeof invoiceData.payment_intent === 'string') {
              // Retrieve the payment intent to get the client secret
              const paymentIntentData = await stripe.paymentIntents.retrieve(invoiceData.payment_intent);
              clientSecret = paymentIntentData.client_secret;
            } else if (typeof invoiceData.payment_intent === 'object' && 'client_secret' in invoiceData.payment_intent) {
              clientSecret = invoiceData.payment_intent.client_secret;
            }
          }
        } catch (retrievalError) {
          console.error('Error retrieving payment details:', retrievalError);
        }
      }
      
      res.json({
        subscriptionId: subscription.id,
        clientSecret,
        planType
      });
      
    } catch (error) {
      console.error("Subscription creation error:", error);
      res.status(500).json({
        message: error instanceof Error ? error.message : "An error occurred during subscription creation"
      });
    }
  });
  
  // Webhook for handling subscription events from Stripe
  app.post("/api/webhook/stripe", async (req, res) => {
    try {
      const sig = req.headers['stripe-signature'];
      const stripeKey = process.env.STRIPE_SECRET_KEY;
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
      
      if (!stripeKey || !webhookSecret) {
        return res.status(500).json({ message: "Stripe API keys not configured" });
      }
      
      const stripe = new Stripe(stripeKey);
      
      // Verify webhook signature and extract the event
      let event;
      try {
        if (!sig) {
          throw new Error('No signature provided in webhook request');
        }
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
      } catch (err: any) {
        return res.status(400).send(`Webhook Error: ${err.message || 'Unknown error'}`);
      }
      
      // Handle specific event types
      switch (event.type) {
        case 'invoice.payment_succeeded':
          // Update subscription status to active
          const invoice = event.data.object;
          const subscriptionId = invoice.subscription;
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          
          // Find user by subscription ID
          const customerId = subscription.customer;
          const customer = await stripe.customers.retrieve(customerId);
          const userId = customer.metadata.userId;
          
          if (userId) {
            // Update user subscription to active
            const plan = subscription.items.data[0].plan.nickname?.toLowerCase().includes('pro') ? 'pro' : 'basic';
            const expiresAt = new Date(subscription.current_period_end * 1000); // Convert to milliseconds
            
            await storage.updateUserSubscription(parseInt(userId), plan, expiresAt);
            console.log(`User ${userId} subscription activated: ${plan}`);
          }
          break;
          
        case 'customer.subscription.updated':
        case 'customer.subscription.deleted':
          const updatedSubscription = event.data.object;
          const updatedCustomerId = updatedSubscription.customer;
          const updatedCustomer = await stripe.customers.retrieve(updatedCustomerId);
          const updatedUserId = updatedCustomer.metadata.userId;
          
          if (updatedUserId) {
            if (updatedSubscription.status === 'active') {
              // Update subscription with new expiration date
              const updatedPlan = updatedSubscription.items.data[0].plan.nickname?.toLowerCase().includes('pro') ? 'pro' : 'basic';
              const updatedExpiresAt = new Date(updatedSubscription.current_period_end * 1000);
              
              await storage.updateUserSubscription(parseInt(updatedUserId), updatedPlan, updatedExpiresAt);
              console.log(`User ${updatedUserId} subscription updated: ${updatedPlan}`);
            } else if (['canceled', 'unpaid', 'past_due'].includes(updatedSubscription.status)) {
              // Downgrade to free plan if subscription is canceled or payment fails
              await storage.updateUserSubscription(parseInt(updatedUserId), 'free');
              console.log(`User ${updatedUserId} subscription downgraded to free plan`);
            }
          }
          break;
      }
      
      // Return success response
      res.json({ received: true });
      
    } catch (error) {
      console.error("Stripe webhook error:", error);
      res.status(500).json({
        message: error instanceof Error ? error.message : "An error processing webhook"
      });
    }
  });

  // Submit search feedback
  app.post("/api/search-feedback", async (req, res) => {
    try {
      const { searchId, userId, feedbackType, comment } = req.body;
      
      if (!searchId || !feedbackType) {
        return res.status(400).json({ message: "searchId and feedbackType are required" });
      }
      
      const feedback = await storage.createSearchFeedback({
        searchId,
        userId,
        feedbackType,
        comment
      });
      
      res.status(201).json(feedback);
    } catch (error) {
      console.error("Error submitting feedback:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "An error occurred while submitting feedback" 
      });
    }
  });

  // Get current subscription information
  app.get("/api/subscription", async (req, res) => {
    try {
      // Check if user is authenticated
      if (!req.isAuthenticated()) {
        return res.status(401).json({
          message: "You must be logged in to view subscription details"
        });
      }

      // Special case for developer accounts
      const isDeveloperAccount = req.user.username === 'GaryOcean' ||
                                req.user.email?.endsWith('@replit.com') ||
                                req.user.email?.endsWith('@example.com');
      
      if (isDeveloperAccount) {
        return res.json({
          tier: req.user.subscriptionTier,
          expiresAt: req.user.subscriptionExpiresAt,
          isDeveloperAccount: true,
          searchCount: req.user.searchCount || 0,
          maxSearches: req.user.subscriptionTier === 'basic' ? 100 : null // null means unlimited
        });
      }

      // Check for Stripe API key
      const stripeKey = process.env.STRIPE_SECRET_KEY;
      if (!stripeKey || !req.user.stripeCustomerId || !req.user.stripeSubscriptionId) {
        // User doesn't have an active Stripe subscription
        return res.json({
          tier: req.user.subscriptionTier,
          expiresAt: req.user.subscriptionExpiresAt,
          searchCount: req.user.searchCount || 0,
          maxSearches: req.user.subscriptionTier === 'basic' ? 100 : 
                       req.user.subscriptionTier === 'pro' ? null : 5 // null means unlimited
        });
      }
      
      // User has a Stripe subscription, get additional details
      const stripe = new Stripe(stripeKey);
      const subscription = await stripe.subscriptions.retrieve(req.user.stripeSubscriptionId);
      
      res.json({
        tier: req.user.subscriptionTier,
        expiresAt: req.user.subscriptionExpiresAt,
        searchCount: req.user.searchCount || 0,
        maxSearches: req.user.subscriptionTier === 'basic' ? 100 : 
                     req.user.subscriptionTier === 'pro' ? null : 5, // null means unlimited
        stripeDetails: {
          status: subscription.status,
          currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
          cancelAtPeriodEnd: subscription.cancel_at_period_end
        }
      });
      
    } catch (error) {
      console.error("Error retrieving subscription data:", error);
      res.status(500).json({
        message: error instanceof Error ? error.message : "An error occurred while retrieving subscription data"
      });
    }
  });

  // Cancel subscription endpoint
  app.post("/api/cancel-subscription", async (req, res) => {
    try {
      // Check if user is authenticated
      if (!req.isAuthenticated()) {
        return res.status(401).json({
          message: "You must be logged in to cancel your subscription"
        });
      }

      // Special case for developer accounts
      const isDeveloperAccount = req.user.username === 'GaryOcean' ||
                                req.user.email?.endsWith('@replit.com') ||
                                req.user.email?.endsWith('@example.com');
      
      if (isDeveloperAccount) {
        return res.status(403).json({
          message: "Developer accounts cannot be cancelled"
        });
      }

      // Check if user has an active subscription
      if (!req.user.stripeSubscriptionId) {
        return res.status(400).json({
          message: "No active subscription found"
        });
      }

      // Get Stripe API key
      const stripeKey = process.env.STRIPE_SECRET_KEY;
      if (!stripeKey) {
        return res.status(500).json({
          message: "Stripe API key not configured"
        });
      }

      // Initialize Stripe
      const stripe = new Stripe(stripeKey);
      
      // Cancel subscription at period end
      await stripe.subscriptions.update(req.user.stripeSubscriptionId, {
        cancel_at_period_end: true
      });

      res.json({
        message: "Subscription will be cancelled at the end of the current billing period",
        success: true
      });
      
    } catch (error) {
      console.error("Error cancelling subscription:", error);
      res.status(500).json({
        message: error instanceof Error ? error.message : "An error occurred while cancelling subscription"
      });
    }
  });

  // Change subscription plan endpoint
  app.post("/api/change-subscription", async (req, res) => {
    try {
      // Check if user is authenticated
      if (!req.isAuthenticated()) {
        return res.status(401).json({
          message: "You must be logged in to change your subscription"
        });
      }

      const { planType } = req.body;
      if (!planType || !['basic', 'pro'].includes(planType)) {
        return res.status(400).json({
          message: "Invalid plan type. Must be 'basic' or 'pro'."
        });
      }

      // Special case for developer accounts
      const isDeveloperAccount = req.user.username === 'GaryOcean' ||
                                req.user.email?.endsWith('@replit.com') ||
                                req.user.email?.endsWith('@example.com');
      
      if (isDeveloperAccount) {
        return res.status(403).json({
          message: "Developer accounts cannot change subscription plans"
        });
      }

      // Check if user has an active subscription
      const isDowngrade = req.user.subscriptionTier === 'pro' && planType === 'basic';
      const isUpgrade = req.user.subscriptionTier === 'basic' && planType === 'pro';

      // If user doesn't have a Stripe subscription yet, create a new one
      if (!req.user.stripeSubscriptionId) {
        return res.json({
          redirectUrl: `/subscription?plan=${planType}`,
          requiresPayment: true
        });
      }

      // Get Stripe API key
      const stripeKey = process.env.STRIPE_SECRET_KEY;
      if (!stripeKey) {
        return res.status(500).json({
          message: "Stripe API key not configured"
        });
      }

      // Initialize Stripe
      const stripe = new Stripe(stripeKey);
      
      // Use price IDs from environment variables
      const STRIPE_BASIC_PRICE_ID = process.env.STRIPE_BASIC_PRICE_ID;
      const STRIPE_PRO_PRICE_ID = process.env.STRIPE_PRO_PRICE_ID;

      // For security, validate that price IDs exist
      if (!STRIPE_BASIC_PRICE_ID || !STRIPE_PRO_PRICE_ID) {
        return res.status(500).json({ 
          message: "Stripe price IDs not configured. Please set STRIPE_BASIC_PRICE_ID and STRIPE_PRO_PRICE_ID environment variables."
        });
      }

      const SUBSCRIPTION_PRICES = {
        basic: STRIPE_BASIC_PRICE_ID, // Basic plan
        pro: STRIPE_PRO_PRICE_ID      // Pro plan
      };
      
      // Determine price based on plan type
      const priceId = planType === 'pro' ? 
        SUBSCRIPTION_PRICES.pro : 
        SUBSCRIPTION_PRICES.basic;
      
      // If it's a downgrade, we can just update the subscription to the new price
      // at the end of the current period
      if (isDowngrade) {
        await stripe.subscriptions.update(req.user.stripeSubscriptionId, {
          proration_behavior: 'none',
          items: [{
            id: (await stripe.subscriptions.retrieve(req.user.stripeSubscriptionId)).items.data[0].id,
            price: priceId,
          }],
          cancel_at_period_end: false,
        });
        
        return res.json({
          message: "Subscription will be downgraded at the end of the current billing period",
          success: true,
          requiresPayment: false
        });
      }
      
      // For upgrades, we need to create a new payment session
      if (isUpgrade) {
        return res.json({
          redirectUrl: `/subscription?plan=${planType}`,
          requiresPayment: true
        });
      }
      
      // If it's the same plan, just confirm
      return res.json({
        message: "You are already subscribed to this plan",
        success: true,
        requiresPayment: false
      });
      
    } catch (error) {
      console.error("Error changing subscription:", error);
      res.status(500).json({
        message: error instanceof Error ? error.message : "An error occurred while changing subscription"
      });
    }
  });

  // Deep Research API endpoint for Pro users
  app.post("/api/deep-research", async (req, res) => {
    try {
      // Check if user is authenticated and has Pro subscription
      if (!req.isAuthenticated()) {
        return res.status(401).json({
          message: "You must be logged in to use deep research"
        });
      }
      
      // Verify user has Pro subscription
      if (req.user.subscriptionTier !== 'pro') {
        return res.status(403).json({
          message: "Deep research is only available with a Pro subscription"
        });
      }
      
      const { query, sources = [] } = req.body;
      
      if (!query) {
        return res.status(400).json({
          message: "Query is required"
        });
      }
      
      // Get API keys
      const tavilyApiKey = process.env.VITE_TAVILY_API_KEY || process.env.TAVILY_API_KEY || "";
      const groqApiKey = process.env.VITE_GROQ_API_KEY || process.env.GROQ_API_KEY || "";
      
      if (!tavilyApiKey || !groqApiKey) {
        return res.status(500).json({ message: "API keys not configured" });
      }
      
      console.log(`Starting deep research for: "${query}"`);
      
      // Step 1: Initial search to get search results
      const initialSearchResults = await tavilySearch(query, tavilyApiKey, {
        search_depth: 'advanced',
        max_results: 10
      });
      
      // Step 2: Use Groq to analyze the results and identify research paths
      const researchPrompt = `You are conducting deep research on the following topic: "${query}". 

Based on these initial search results, identify 3-5 key research directions or sub-topics to explore further. For each research direction, provide a specific search query that would help gather more targeted information.

Initial search results:
${initialSearchResults.results.map(r => `- ${r.title}: ${r.content.substring(0, 150)}...`).join('\n')}\n`;
      
      // Call Groq API for research planning
      const planningResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${groqApiKey}`
        },
        body: JSON.stringify({
          model: "compound-beta",
          messages: [
            {
              role: "system",
              content: "You are a research planning assistant that identifies key research directions and creates focused search queries for deep investigation."
            },
            {
              role: "user",
              content: researchPrompt
            }
          ],
          temperature: 0.3
        })
      });
      
      if (!planningResponse.ok) {
        throw new Error(`Groq API error: ${planningResponse.status} ${planningResponse.statusText}`);
      }
      
      const planningData = await planningResponse.json() as { choices: Array<{ message: { content: string } }> };
      const researchPlan = planningData.choices[0].message.content;
      
      // Step 3: Extract research queries from the plan
      const researchDirRegex = /(?:"([^"]+)"|'([^']+)'|`([^`]+)`|([^\s.,;:"'`]+))/g;
      let matches;
      let researchQueries = [];
      let tempString = researchPlan;
      
      // Look for quoted text which likely represents search queries
      const queryRegex = /"([^"]+)"|'([^']+)'|`([^`]+)`/g;
      while ((matches = queryRegex.exec(tempString)) !== null) {
        const extractedQuery = matches[1] || matches[2] || matches[3];
        if (extractedQuery && extractedQuery.length > 10) {
          researchQueries.push(extractedQuery);
        }
      }
      
      // If we didn't find enough queries with quotes, use pattern matching to find likely search queries
      if (researchQueries.length < 3) {
        const lines = researchPlan.split('\n');
        for (const line of lines) {
          if (line.includes(':') && !researchQueries.some(q => line.includes(q))) {
            const parts = line.split(':');
            if (parts.length > 1 && parts[1].trim().length > 10) {
              researchQueries.push(parts[1].trim());
            }
          }
        }
      }
      
      // Limit to 5 queries
      researchQueries = researchQueries.slice(0, 5);
      console.log(`Extracted ${researchQueries.length} research queries:`, researchQueries);
      
      // Step 4: Execute parallel searches for each research direction
      const researchResults = [];
      for (const researchQuery of researchQueries) {
        try {
          const searchResult = await tavilySearch(researchQuery, tavilyApiKey, {
            search_depth: 'advanced',
            max_results: 5
          });
          
          researchResults.push({
            query: researchQuery,
            results: searchResult.results
          });
        } catch (error) {
          console.error(`Error searching for "${researchQuery}":`, error);
        }
      }
      
      // Step 5: Compile all the search results
      const allResults = [
        ...initialSearchResults.results,
        ...researchResults.flatMap(r => r.results)
      ];
      
      // Remove duplicates by URL
      const uniqueResults = Array.from(
        new Map(allResults.map(item => [item.url, item])).values()
      );
      
      // Step 6: Generate a comprehensive report using Groq's Compound Beta
      const researchContext = `Deep research on: "${query}"

Compiling information from ${uniqueResults.length} sources across ${researchQueries.length + 1} research directions.

Sources:
${uniqueResults.map((r, i) => `[${i+1}] ${r.title} (${r.url}): ${r.content.substring(0, 200)}...`).join('\n\n')}\n`;
      
      const reportResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${groqApiKey}`
        },
        body: JSON.stringify({
          model: "compound-beta",
          messages: [
            {
              role: "system",
              content: "You are a research synthesis expert. Create a detailed, comprehensive research report based on the provided sources. Include sections covering each key aspect of the topic with proper citations to sources using [X] notation. Format your response with markdown for readability."
            },
            {
              role: "user",
              content: researchContext
            }
          ],
          temperature: 0.3
        })
      });
      
      if (!reportResponse.ok) {
        throw new Error(`Groq API error: ${reportResponse.status} ${reportResponse.statusText}`);
      }
      
      const reportData = await reportResponse.json() as { choices: Array<{ message: { content: string } }> };
      const finalReport = reportData.choices[0].message.content;
      
      // Format all sources for citation
      const sourcesFormatted = uniqueResults.map((result, index) => ({
        title: result.title,
        url: result.url,
        domain: new URL(result.url).hostname.replace("www.", ""),
        index: index + 1
      }));
      
      // Return the complete research package
      res.json({
        query,
        researchPlan,
        researchDirections: researchQueries,
        report: finalReport,
        sources: sourcesFormatted
      });
      
    } catch (error) {
      console.error("Deep research error:", error);
      res.status(500).json({
        message: error instanceof Error ? error.message : "An error occurred during deep research"
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
