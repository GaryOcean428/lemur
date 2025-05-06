/**
 * Direct integration with Groq Compound Beta
 * 
 * This module provides an alternative to the separate Tavily + Groq approach by
 * directly using Groq Compound Beta's built-in Tavily integration.
 */

export interface GroqCompoundResponse {
  id: string;
  choices: {
    message: {
      content: string;
      role: string;
      executed_tools?: {
        type: string;
        input: any;
        output: any;
      }[];
    };
    index: number;
    finish_reason: string;
  }[];
  model: string;
}

/**
 * Uses Groq Compound Beta's built-in search capabilities
 * @param query The user's search query
 * @param apiKey Groq API key
 * @param modelPreference Model preference (fast, auto, comprehensive)
 * @param geo_location Geographic location for search results (e.g., "AU" for Australia)
 * @returns Object containing the answer, model used, and search tool usage information
 */
interface Source {
  title: string;
  url: string;
  domain: string;
}

export interface SearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
  published_date?: string;
  image?: {
    url: string;
    alt?: string;
  };
}

export async function directGroqCompoundSearch(
  query: string, 
  apiKey: string, 
  modelPreference: string = 'auto',
  geo_location: string = 'AU',
  isContextual: boolean = false
): Promise<{
  answer: string;
  model: string;
  contextual?: boolean;
  search_tools_used?: any[];
  sources?: Source[];
  searchResults?: SearchResult[];
}> {
  try {
    // Validate API key
    if (!apiKey || apiKey.trim() === '') {
      // More helpful error message with suggestion
      throw new Error('Missing Groq API key. Please make sure the GROQ_API_KEY environment variable is set.');
    }
    
    // Check if API key seems valid (basic format check)
    if (!apiKey.startsWith('gsk_')) {
      console.warn('Warning: Groq API key does not have the expected format (should start with "gsk_"). API calls may fail.');
    }

    // Choose model based on preference
    // Note: compound-beta-mini doesn't support tool calling,
    // so we need different handling based on whether tools are needed
    
    // The compound-beta models were initially expected to support tool calling,
    // but there appear to be issues with their availability or capabilities.
    // Let's use standard models that are more reliably available.
    
    // Model selection map - using established Groq models that are known to be stable
    const modelMap: Record<string, string> = {
      "auto": "llama3-70b-8192", // Default to Llama 3 for auto
      "fast": "mixtral-8x7b-32768", // Faster but less comprehensive
      "comprehensive": "llama3-70b-8192" // More comprehensive but slower
    };
    
    // Normalize the preference to lowercase for consistent matching
    const normalizedPref = modelPreference.toLowerCase();
    
    // Select the model based on preference, defaulting to llama3 if not found
    const model = modelMap[normalizedPref] || "llama3-70b-8192";
    
    // Currently no Groq models reliably support tool calling, so set to false
    const supportsTools = false;
    
    // For non-tool models (fast/mini), use a simpler system prompt without tool instructions
    const isToolModel = supportsTools;
    
    // Log which model was selected
    console.log(`Using Direct Groq Compound Beta model: ${model} for query: "${query.substring(0, 50)}${query.length > 50 ? '...' : ''}"`);

    // Create the system message with search preferences
    // Use different prompts for tool and non-tool models
    const systemMessage = {
      role: "system",
      content: supportsTools ? 
        // For tool-enabled models (compound-beta)
        `You are Lemur, an advanced search assistant powered by Groq's Compound Beta models.

Important: Use the search function for EVERY query to find current, authoritative information before responding. 

When responding to search queries, follow these guidelines:
1. Always use the search function to find information before answering
2. Be comprehensive and detailed in your answers
3. Include proper citations for all factual information
4. Use markdown formatting for structure (headings, lists, etc.)
5. Break down complex information into understandable parts
6. For time-sensitive information, note the recency of sources
7. Adapt content to be contextually relevant for users in ${geo_location}

When using the search function, prefer sources that are:
- Recent and up-to-date
- Authoritative and reliable
- Directly relevant to the query

Format your response with clear section headings and a logical structure.

Remember: You MUST use the search function for all queries, even if you think you know the answer.` : 
        // For non-tool models (compound-beta-mini)
        `You are Lemur, an advanced search assistant powered by Groq's AI models.

When responding to search queries, follow these guidelines:
1. Be concise yet informative in your answers
2. Use markdown formatting for structure (headings, lists, etc.)
3. Break down complex information into understandable parts
4. Provide balanced viewpoints on controversial topics
5. Adapt content to be contextually relevant for users in ${geo_location}

Format your response with clear section headings and a logical structure.

Note: You're working with a limited model that doesn't have real-time search capabilities. Acknowledge when information might be outdated or when you don't have enough context to provide a complete answer.`
    };

    // Prepare the user message
    const userMessage = {
      role: "user",
      content: query
    };

    // Prepare API request body based on whether tools are supported
    const requestBody = supportsTools ? {
      model,
      messages: [systemMessage, userMessage],
      temperature: 0.3,
      tools: [
        {
          type: "function",
          function: {
            name: "search",
            description: "Search the web for relevant information based on user query",
            parameters: {
              type: "object",
              properties: {
                query: {
                  type: "string",
                  description: "The search query to use for finding information"
                },
                region: {
                  type: "string",
                  description: "The region to focus search results on, e.g., AU for Australia"
                }
              },
              required: ["query"]
            }
          }
        }
      ],
      tool_choice: "auto"
    } : {
      model,
      messages: [systemMessage, userMessage],
      temperature: 0.3
    };

    console.log(`Making API request with${supportsTools ? '' : 'out'} tools to Groq API`);
    
    // Make the API request to Groq
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(requestBody)
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

    const data = await response.json() as GroqCompoundResponse;
    
    // Extract executed tools information (if available)
    const executedTools = data.choices[0].message.executed_tools || [];
    
    // Debug logging for tools - this helps diagnose what's being returned
    console.log('Executed tools count:', executedTools.length);
    if (executedTools.length > 0) {
      console.log('First tool type:', executedTools[0].type);
      
      // Safely log tool input with null check
      if (executedTools[0].input) {
        console.log('First tool input:', JSON.stringify(executedTools[0].input).substring(0, 100) + '...');
      } else {
        console.log('First tool input: undefined or null');
      }
      
      // Safely log tool output with null check
      if (executedTools[0].output !== undefined) {
        console.log('First tool output structure:', typeof executedTools[0].output, 
          Array.isArray(executedTools[0].output) ? executedTools[0].output.length + ' items' : 'not an array');
      } else {
        console.log('First tool output: undefined or null');
      }
    }
    
    // Process search results if available
    let sources: Source[] = [];
    let searchResults: SearchResult[] = [];
    
    if (executedTools.length > 0 && executedTools[0].type === 'function' && 
        executedTools[0].output && Array.isArray(executedTools[0].output.results)) {
      // Extract search results from tool output
      searchResults = executedTools[0].output.results.map((result: any) => ({
        title: result.title || '',
        url: result.url || '',
        content: result.content || result.snippet || '',
        score: result.score || 1.0,
        published_date: result.published_date,
        image: result.image
      }));
      
      // Generate sources from search results
      sources = searchResults.map((result) => ({
        title: result.title,
        url: result.url,
        domain: new URL(result.url).hostname.replace('www.', '')
      }));
    }
    
    return {
      answer: data.choices[0].message.content,
      model: data.model,
      contextual: isContextual,
      search_tools_used: executedTools,
      sources: sources,
      searchResults: searchResults
    };
  } catch (error) {
    console.error("Error calling Groq Compound Beta API:", error);
    throw error;
  }
}
