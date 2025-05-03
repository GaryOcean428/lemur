import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import fetch from "node-fetch";

// Define Tavily API response interface
interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
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

// Tavily API for search results
async function tavilySearch(query: string, apiKey: string): Promise<TavilySearchResponse> {
  try {
    // Validate API key format (basic check)
    if (!apiKey || apiKey.trim() === '') {
      throw new Error('Missing Tavily API key');
    }

    console.log('Making Tavily API request with key:', apiKey);
    
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        query,
        search_depth: "advanced",
        include_domains: [],
        exclude_domains: [],
        max_results: 10
      })
    });
    
    console.log('Tavily API response status:', response.status);

    if (!response.ok) {
      let errorMessage = `Tavily API error: ${response.status} ${response.statusText}`;
      
      if (response.status === 401) {
        errorMessage = 'Tavily API error: Invalid or expired API key. Please update your API key.';
      } else if (response.status === 429) {
        errorMessage = 'Tavily API error: Rate limit exceeded. Please try again later.';
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
async function groqSearch(query: string, sources: TavilySearchResult[], apiKey: string): Promise<{answer: string; model: string}> {
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
3. Be comprehensive yet concise
4. Be well-structured with logical flow
5. If sources contradict each other, acknowledge this and explain different viewpoints

Return your answer in plain text with inline citations like [Source X].`;

    // Choose model based on query complexity
    // For simplicity, we're using llama3-70b-8192 for everything here
    const model = "llama3-70b-8192";

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
            content: "You are a helpful search assistant that answers questions based on provided sources."
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

export async function registerRoutes(app: Express): Promise<Server> {
  // Search API endpoint
  app.get("/api/search", async (req, res) => {
    try {
      const query = req.query.q as string;
      
      if (!query) {
        return res.status(400).json({ message: "Query parameter 'q' is required" });
      }

      // API Keys from environment variables
      const tavilyApiKey = process.env.VITE_TAVILY_API_KEY || process.env.TAVILY_API_KEY || "";
      const groqApiKey = process.env.VITE_GROQ_API_KEY || process.env.GROQ_API_KEY || "";

      console.log('API Key status - Tavily:', tavilyApiKey ? 'Present (starts with: ' + tavilyApiKey.substring(0, 5) + '...)' : 'Not found');
      console.log('API Key status - Groq:', groqApiKey ? 'Present (starts with: ' + groqApiKey.substring(0, 5) + '...)' : 'Not found');
      
      if (!tavilyApiKey || !groqApiKey) {
        return res.status(500).json({ message: "API keys not configured" });
      }

      // Get search results from Tavily
      const tavilyResults = await tavilySearch(query, tavilyApiKey);
      
      // Convert to our format
      const traditional = tavilyResults.results.map((result) => ({
        title: result.title,
        url: result.url,
        snippet: result.content.substring(0, 200) + "...",
        domain: new URL(result.url).hostname.replace("www.", "")
      }));

      // Get AI answer from Groq using the sources
      const { answer, model } = await groqSearch(query, tavilyResults.results, groqApiKey);

      // Format sources for the AI answer
      const sources = tavilyResults.results.slice(0, 5).map((result) => ({
        title: result.title,
        url: result.url,
        domain: new URL(result.url).hostname.replace("www.", "")
      }));

      // Log search in database (without userId for anonymous searches)
      try {
        await storage.createSearchHistory({
          query,
          userId: null, // For anonymous searches
        });
        console.log(`Search logged: "${query}"`);
      } catch (dbError) {
        // Log error but don't fail the search request
        console.error("Failed to log search to database:", dbError);
      }

      // Return combined results
      res.json({
        ai: {
          answer,
          sources,
          model
        },
        traditional
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
