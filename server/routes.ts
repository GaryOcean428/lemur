import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import fetch from "node-fetch";

// Tavily API for search results
async function tavilySearch(query: string, apiKey: string) {
  try {
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey
      },
      body: JSON.stringify({
        query,
        search_depth: "advanced",
        include_domains: [],
        exclude_domains: [],
        max_results: 10
      })
    });

    if (!response.ok) {
      throw new Error(`Tavily API error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error calling Tavily API:", error);
    throw error;
  }
}

// Groq API for AI responses
async function groqSearch(query: string, sources: any[], apiKey: string) {
  try {
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
    // For simplicity, we're using compound-beta for everything here
    // In a real app, we'd have logic to determine which model to use
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
      throw new Error(`Groq API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
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
      const tavilyApiKey = process.env.TAVILY_API_KEY || "";
      const groqApiKey = process.env.GROQ_API_KEY || "";

      if (!tavilyApiKey || !groqApiKey) {
        return res.status(500).json({ message: "API keys not configured" });
      }

      // Get search results from Tavily
      const tavilyResults = await tavilySearch(query, tavilyApiKey);
      
      // Convert to our format
      const traditional = tavilyResults.results.map((result: any) => ({
        title: result.title,
        url: result.url,
        snippet: result.content.substring(0, 200) + "...",
        domain: new URL(result.url).hostname.replace("www.", "")
      }));

      // Get AI answer from Groq using the sources
      const { answer, model } = await groqSearch(query, tavilyResults.results, groqApiKey);

      // Format sources for the AI answer
      const sources = tavilyResults.results.slice(0, 5).map((result: any) => ({
        title: result.title,
        url: result.url,
        domain: new URL(result.url).hostname.replace("www.", "")
      }));

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

  const httpServer = createServer(app);
  return httpServer;
}
