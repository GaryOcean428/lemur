/**
 * Direct integration with Groq Compound Beta
 * 
 * This module provides an alternative to the separate Tavily + Groq approach by
 * directly using Groq Compound Beta's built-in Tavily integration.
 */

import { validateGroqModel, mapModelPreference, supportsToolCalling, APPROVED_MODELS } from "./utils/modelValidation";
import { normalizeRegionCode, enforceRegionPreference, getRegionalInstructionForCode } from "./utils/regionUtil";
import { ConversationContext, ConversationTurn, createContextualSystemMessage } from "./utils/context";

// Using getRegionalInstructionForCode imported from regionUtil.ts

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

/**
 * Uses Groq Compound Beta's built-in search capabilities with improved error handling
 * @param query The user's search query
 * @param apiKey Groq API key
 * @param modelPreference Model preference (fast, auto, comprehensive)
 * @param geo_location Geographic location for search results (e.g., "AU" for Australia)
 * @param isContextual Whether this query is a follow-up to previous conversation
 * @param conversationContext Previous conversation context for contextual queries
 * @param filters Additional search filters
 * @param tavilyApiKey Optional Tavily API key for prefetching results
 * @returns Object containing the answer, model used, and search tool usage information
 */
export async function directGroqCompoundSearch(
  query: string, 
  groqApiKey: string, 
  modelPreference: string = 'auto',
  geo_location: string = 'AU',
  isContextual: boolean = false,
  conversationContext: ConversationContext = { turns: [], lastUpdated: Date.now() },
  filters: Record<string, any> = {},
  tavilyApiKey: string | null = null
): Promise<{
  answer: string;
  model: string;
  contextual?: boolean;
  search_tools_used?: any[];
  sources?: Source[];
  searchResults?: SearchResult[];
}> {
  try {
    // Validate Groq API key
    if (!groqApiKey || groqApiKey.trim() === '') {
      // More helpful error message with suggestion
      throw new Error('Missing Groq API key. Please make sure the GROQ_API_KEY environment variable is set.');
    }
    
    // Check if Groq API key seems valid (basic format check)
    if (!groqApiKey.startsWith('gsk_')) {
      console.warn('Warning: Groq API key does not have the expected format (should start with "gsk_"). API calls may fail.');
    }

    // Use our centralized model validation utilities to ensure only approved models are used
    
    // Log the model preference for debugging purposes
    console.log(`Original model preference: ${modelPreference}`);
    
    // Map the user-friendly model preference to an actual Groq model name
    // This uses our centralized mapping function from modelValidation.ts
    let model = mapModelPreference(modelPreference);
    
    // Validate the model to ensure it's one of the approved models
    // This is a critical safeguard against code modifications that might use incorrect models
    model = validateGroqModel(model);
    
    // Log the final validated model
    console.log(`Using validated Groq model: ${model} from APPROVED_MODELS list`);
    
    // Check if the model supports tool calling using our utility function
    const supportsTools = supportsToolCalling(model);
    
    // For now, based on error logs, we've determined that these models don't support tool calling
    // This is a fallback manual override until we can confirm with Groq which models support tool calling
    const supportsToolsOverride = false; // Override while we sort out tool support
    
    // For GROQ models, we need to check both the capability in our code and the actual API support
    // Note: We currently temporarily disabled tool support as we're waiting for stable tools API
    const isToolModel = supportsTools && supportsToolsOverride;
    
    // Log which model was selected with more detail about tool support
    console.log(`Using Groq model: ${model} for query: "${query.substring(0, 50)}${query.length > 50 ? '...' : ''}"`);
    console.log(`Model tool support status: Model capability=${supportsTools}, Override=${supportsToolsOverride}, Final decision=${isToolModel}`);
    
    // Normalize and validate the geo_location parameter
    const normalizedGeoLocation = normalizeRegionCode(geo_location);
    // If geo_location is valid, use it; otherwise default to AU (Australia)
    const regionCode = normalizedGeoLocation || 'AU';
    
    // Apply to filters using the enforceRegionPreference function
    const updatedFilters = enforceRegionPreference(filters, regionCode);
    
    // Log region information for debugging
    console.log(`DirectGroqCompound using region code: ${regionCode} for search results`);
    if (regionCode === 'AU') {
      console.log('AUSTRALIA region specified in directGroqCompound - results should prioritize Australian content');
    }
    
    // Create the system message with search preferences
    // Use different prompts for tool and non-tool models
    // First, fetch Tavily search results to provide context
    let searchContext = '';
    
    // Try to fetch Tavily search results if we have a Tavily API key
    if (tavilyApiKey) {
      try {
        console.log('Prefetching Tavily search results for', query);
        const searchApiUrl = 'https://api.tavily.com/search';
        const searchHeaders = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tavilyApiKey}`
        };
        
        // Apply the updated filters from region preference enforcement
        const searchRequestBody = {
          query: query,
          search_depth: updatedFilters.search_depth || "basic",
          include_domains: updatedFilters.include_domains || filters?.include_domains || [],
          exclude_domains: updatedFilters.exclude_domains || filters?.exclude_domains || [],
          max_results: 4, // Reduced from 5 to 4 for better performance
          geo_location: regionCode // Always apply the normalized region code
        };
        
        // Log the search request for debugging
        console.log(`Tavily search request in directCompound using geo_location: ${regionCode}`);
        
        const searchResponse = await fetch(searchApiUrl, {
          method: 'POST',
          headers: searchHeaders,
          body: JSON.stringify(searchRequestBody)
        });
        
        if (searchResponse.ok) {
          const searchData = await searchResponse.json();
          if (searchData.results && searchData.results.length > 0) {
            // Format search results as context for the model
            // Limit to 4 most relevant results and reduce content length to save tokens
            searchContext = 'Here are some recent search results that may be helpful:\n\n';
            searchData.results.slice(0, 4).forEach((result: any, index: number) => {
              searchContext += `[${index + 1}]: ${result.title}\n`;
              searchContext += `URL: ${result.url}\n`;
              searchContext += `Content: ${result.content.substring(0, 250)}...\n\n`;
            });
          }
        } else {
          console.log('Tavily search failed, proceeding without search context');
        }
      } catch (error) {
        console.error('Error fetching Tavily search results:', error);
        // Continue without search context
      }
    } else {
      console.log('No Tavily API key provided, skipping prefetch');
    }
    
    const systemMessage = {
      role: "system",
      content: `You are Lemur, an advanced search assistant powered by Groq's AI models.

When responding to search queries, follow these guidelines:
1. Be comprehensive and detailed in your answers
2. Use markdown formatting for structure (headings, lists, etc.)
3. Break down complex information into understandable parts
4. Be factual and provide balanced viewpoints on controversial topics
5. CRITICALLY IMPORTANT: Results must be contextually relevant for users in ${regionCode} location

REGIONAL RELEVANCE INSTRUCTION:
${getRegionalInstructionForCode(regionCode)}

IMPORTANT CITATION FORMAT: 
For any factual information from the search results provided, include numbered references at the end of your response in this format:
[1]: https://example.com "Title of Source"

Refer to these sources in-text using the number in brackets, for example: [1]

Format your response with clear section headings and a logical structure.

${searchContext ? 'SEARCH RESULTS CONTEXT:\n' + searchContext : ''}`
    };

    // Prepare conversation context and messages
    const messages = [systemMessage];
    
    // Add conversation context for follow-up questions if available
    if ((isContextual || query.startsWith("is there") || query.startsWith("what about") || query.startsWith("how about") || query.startsWith("can you")) && 
        conversationContext && conversationContext.turns && conversationContext.turns.length > 0) {
      console.log("Processing as contextual query due to phrasing or explicit follow-up flag");
      
      // Instead of manually constructing the context message, use our utility function
      const isFirstTurn = conversationContext.turns.length === 1;
      const contextSystemMessage = createContextualSystemMessage(conversationContext, isFirstTurn);
      
      // Replace the standard system message with our contextual one
      messages[0] = {
        role: "system",
        content: contextSystemMessage
      };
      
      // Add additional context message for clarity
      let contextMessage = "Previous conversation context:\n";
      
      // Use all conversation turns for better context
      const recentTurns = conversationContext.turns.slice(-3); // Use last 3 turns for more context
      recentTurns.forEach((turn: ConversationTurn) => {
        contextMessage += `User: ${turn.query}\n`;
        if (turn.answer) {
          // Include more of the answer for better context
          contextMessage += `Assistant: ${turn.answer.substring(0, 250)}${turn.answer.length > 250 ? '...' : ''}\n`;
        }
      });
      
      messages.push({
        role: "system",
        content: `This is a follow-up question. Here is the conversation history: \n\n${contextMessage}\n\nPlease consider this context when answering the new question.`
      });
    }
    
    // Add the current user message
    const userMessage = {
      role: "user",
      content: query
    };
    messages.push(userMessage);

    // Check for explicit disableTools flag in filters
    const disableTools = filters?.disableTools === true;
    if (disableTools) {
      console.log("Tools explicitly disabled by request parameter");
    }
    
    // Prepare API request body based on whether tools are supported and not explicitly disabled
    const shouldUseTools = isToolModel && !disableTools;
    console.log(`Tool support status: Raw Check=${supportsTools}, Override=${supportsToolsOverride}, Disable=${disableTools}, Final=${shouldUseTools}`);
    
    // Only include tools if the model is confirmed to support them and tools are not disabled
    const requestBody = shouldUseTools ? {
      model,
      messages,
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
                  description: `The region to focus search results on. ALWAYS use "${regionCode}" for this search to ensure regional relevance.`,
                  default: regionCode  // Default to user's preferred region code
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
      messages,
      temperature: 0.3
    };

    console.log(`Making API request with${shouldUseTools ? '' : 'out'} tools to Groq API using model: ${model}`);
    
    // Make the API request to Groq
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${groqApiKey}`
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      let errorMessage = `Groq API error: ${response.status} ${response.statusText}`;
      let errorBody = "";
      let jsonError = null;
      
      try {
        errorBody = await response.text();
        console.error('Groq API error details:', errorBody);
        
        // Try to parse as JSON for structured error information
        try {
          jsonError = JSON.parse(errorBody);
        } catch (parseError) {
          // Not JSON, continue with text error handling
        }
      } catch (e) {
        console.error('Could not read error body from Groq API response');
      }
      
      // Check for specific error codes based on status
      if (response.status === 401) {
        errorMessage = 'Groq API error: Invalid or expired API key. Please update your API key.';
      } else if (response.status === 429) {
        errorMessage = 'Groq API error: Rate limit exceeded. Please try again later.';
      } else if (response.status === 404) {
        errorMessage = `Groq API error: Model '${model}' not found or unavailable.`;
      } else if (response.status === 500 && jsonError?.error?.message?.includes('tools')) {
        // Special handling for tool-related errors
        errorMessage = `Groq API tool error: The model encountered an issue with tool usage. Specific error: ${jsonError?.error?.message || 'Unknown tool error'}`;
        console.error('Tool usage error detected, will retry without tools in future requests');
        
        // Store this information for future model capability detection
        // For now we just log it, but this could be stored in a database or cache
        console.error(`Model ${model} had tool execution error at ${new Date().toISOString()}`);
      } else if (response.status === 503) {
        // Handle service unavailable more gracefully
        errorMessage = `Groq API service unavailable (503). The Groq API is temporarily down or experiencing issues. Please try again later.`;
        console.error('Groq API service unavailable - details:', errorBody);
      } else {
        // Generic error with more detailed information if available
        if (jsonError?.error?.message) {
          errorMessage = `Groq API error (${response.status}): ${jsonError.error.message}`;
        } else {
          errorMessage = `Groq API error: ${response.status}. Details: ${errorBody}`;
        }
      }
      
      // Create a detailed error with standardized format for easier parsing in error handling
      const detailedError = new Error(errorMessage);
      (detailedError as any).statusCode = response.status;
      (detailedError as any).responseBody = errorBody;
      (detailedError as any).isToolError = jsonError?.error?.message?.includes('tools') || false;
      
      throw detailedError;
    }

    const data = await response.json() as GroqCompoundResponse;
    
    // Extract executed tools information (if available)
    const executedTools = data.choices[0].message.executed_tools || [];
    
    // Debug logging for tools - this helps diagnose what's being returned
    console.log('Executed tools count:', executedTools.length);
    
    // Try to extract search information from the response text
    // This works even if executed_tools aren't returned properly
    let searchResultsFromText: SearchResult[] = [];
    let sourcesFromText: Source[] = [];
    
    // Look for search result patterns in the content
    const answer = data.choices[0].message.content;
    
    // Check if there are citations in markdown format [1]: https://example.com
    const citationRegex = /\[([0-9]+)\]:\s*(https?:\/\/[^\s]+)\s*(?:"([^"]+)")?/g;
    let citation;
    const citationMap = new Map<string, Source>();
    
    // Also track in-text citations like [1] or [2] to count usage frequency
    const inTextCitationRegex = /\[([0-9]+)\](?![:\[])/g;
    const citationUsage = new Map<string, number>();
    
    // Find all in-text citations and count them
    let inTextMatch;
    while ((inTextMatch = inTextCitationRegex.exec(answer)) !== null) {
      const num = inTextMatch[1];
      citationUsage.set(num, (citationUsage.get(num) || 0) + 1);
    }
    
    while ((citation = citationRegex.exec(answer)) !== null) {
      const number = citation[1];
      const url = citation[2];
      let title = citation[3] || "";
      
      // If no title, extract domain as title
      if (!title) {
        try {
          const domain = new URL(url).hostname.replace('www.', '');
          title = domain.charAt(0).toUpperCase() + domain.slice(1);
        } catch (e) {
          title = "Reference " + number;
        }
      }
      
      // Get usage count, default to 1 if not found
      const usageCount = citationUsage.get(number) || 1;
      
      const source: Source = {
        title,
        url,
        domain: new URL(url).hostname.replace('www.', '')
      };
      
      citationMap.set(number, source);
      
      // Also add to search results with placeholder content and usage count
      searchResultsFromText.push({
        title,
        url,
        content: `Source ${number} cited ${usageCount} time${usageCount !== 1 ? 's' : ''} in the answer`,
        score: usageCount // Use citation frequency as relevance score
      });
    }
    
    // Convert the map to an array for sources
    sourcesFromText = Array.from(citationMap.values());
    
    // If we found sources directly in the text, prefer those
    const finalSources = sourcesFromText.length > 0 ? sourcesFromText : [];
    
    // Log what was found for debugging
    console.log('Sources extracted from text:', finalSources.length);
    
    // Also inspect executedTools if available
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
        
        // Try to extract search results from tool output if it's an object with results
        if (typeof executedTools[0].output === 'object' && 
            executedTools[0].output !== null && 
            'results' in executedTools[0].output && 
            Array.isArray(executedTools[0].output.results)) {
          
          console.log('Found search results in tool output');
          const results = executedTools[0].output.results;
          
          // Extract search results
          searchResultsFromText = results.map((result: any) => ({
            title: result.title || '',
            url: result.url || '',
            content: result.content || result.snippet || '',
            score: result.score || 1.0,
            published_date: result.published_date,
            image: result.image
          }));
          
          // Generate sources from search results
          sourcesFromText = searchResultsFromText.map((result) => ({
            title: result.title,
            url: result.url,
            domain: new URL(result.url).hostname.replace('www.', '')
          }));
        }
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
    
    // Combine information from all sources (tools and text extraction)
    const combinedSearchResults = searchResults.length > 0 ? searchResults : searchResultsFromText;
    const combinedSources = sources.length > 0 ? sources : finalSources;
    
    return {
      answer: data.choices[0].message.content,
      model: data.model,
      contextual: isContextual,
      search_tools_used: executedTools,
      sources: combinedSources,
      searchResults: combinedSearchResults
    };
  } catch (error: any) {
    console.error("Error calling Groq Compound Beta API:", error);
    
    // Check if this is likely a tool error based on error message
    const isToolError = error.message?.includes('tool') || 
                       error.message?.includes('function') || 
                       error.toString().includes('tool_call');
    
    if (isToolError) {
      console.log("Detected potential tool-related error, consider retrying without tools");
      
      // Add metadata to the error for better handling upstream
      error.isToolError = true;
      
      // Log specific advice for handling this type of error
      console.log("Tool errors can be mitigated by:");
      console.log("1. Retrying the request without tools");
      console.log("2. Using a different model that better supports tools");
      console.log("3. Simplifying the tool definition");
    }
    
    // Propagate the enhanced error
    throw error;
  }
}
