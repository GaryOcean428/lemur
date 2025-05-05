import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import fetch from "node-fetch";
import { setupAuth } from "./auth";

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
    const modelMap = {
      "auto": isComplexQuery ? "llama-3.3-70b-versatile" : "llama-4-scout-17b-16e-instruct",
      "fast": "llama-4-scout-17b-16e-instruct", // Fast (Llama-4-Scout)
      "comprehensive": "llama-3.3-70b-versatile"  // Comprehensive (Llama-3.3-70B)
    };
    
    // Get model based on user preference or fallback to auto selection
    const model = modelMap[modelPreference.toLowerCase()] || modelMap["auto"];
    
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
            content: "You are Lemur, an advanced search assistant powered by Llama 3.3 and Llama 4 models. You provide comprehensive answers based on web sources with proper citations. For technical or complex topics, you break down information into understandable explanations. For time-sensitive queries, you note source recency. Always maintain a helpful, informative tone while prioritizing accuracy and source attribution. Use markdown formatting appropriately to structure your responses with headings, lists, and emphasis where it improves readability."
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
        // Get model preference from query parameters if available
        const modelPreference = req.query.model as string || 'auto';
        
        // Get AI answer from Groq using the sources
        const { answer, model } = await groqSearch(query, tavilyResults.results, groqApiKey, modelPreference);

        // Format sources for the AI answer
        const sources = tavilyResults.results.slice(0, 5).map((result) => ({
          title: result.title,
          url: result.url,
          domain: new URL(result.url).hostname.replace("www.", "")
        }));

        aiAnswer = {
          answer,
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

  const httpServer = createServer(app);
  return httpServer;
}
