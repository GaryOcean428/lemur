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
  groqApiKey: string, 
  modelPreference: string = 'auto',
  geo_location: string = 'AU',
  isContextual: boolean = false,
  conversationContext: Array<{query: string; answer?: string; timestamp: number}> = [],
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

    // Choose model based on preference
    // Note: Some Llama models may have varying tool calling capabilities,
    // so we need different handling based on whether tools are needed
    
    // Model selection map
    // Using currently available Groq models (as of May 2024)
    const modelMap: Record<string, string> = {
      "auto": "mixtral-8x7b-32768", // Balanced performance and quality
      "fast": "llama2-70b-4096", // Faster with lower latency
      "comprehensive": "mixtral-8x7b-32768", // Higher quality for reasoning
      "maverick": "mixtral-8x7b-32768" // Fallback to mixtral model
    };
    
    // Normalize the preference to lowercase for consistent matching
    const normalizedPref = modelPreference.toLowerCase();
    
    // Select the model based on preference, defaulting to mixtral-8x7b-32768 if not found
    const model = modelMap[normalizedPref] || "mixtral-8x7b-32768";
    
    // Check if the model supports tool calling
    // Currently, only compound-beta and compound-beta-mini supported tool calling
    // However, they seem to be unavailable or renamed, so disabling tools for now
    const supportsTools = false;
    
    // For non-tool compatible models, use a simpler system prompt without tool instructions
    const isToolModel = supportsTools;
    
    // Log which model was selected
    console.log(`Using Groq model: ${model} for query: "${query.substring(0, 50)}${query.length > 50 ? '...' : ''}"`);

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
        
        const searchRequestBody = {
          query: query,
          search_depth: "basic",
          include_domains: filters?.include_domains || [],
          exclude_domains: filters?.exclude_domains || [],
          max_results: 5
        };
        
        const searchResponse = await fetch(searchApiUrl, {
          method: 'POST',
          headers: searchHeaders,
          body: JSON.stringify(searchRequestBody)
        });
        
        if (searchResponse.ok) {
          const searchData = await searchResponse.json();
          if (searchData.results && searchData.results.length > 0) {
            // Format search results as context for the model
            searchContext = 'Here are some recent search results that may be helpful:\n\n';
            searchData.results.forEach((result: any, index: number) => {
              searchContext += `[${index + 1}]: ${result.title}\n`;
              searchContext += `URL: ${result.url}\n`;
              searchContext += `Content: ${result.content.substring(0, 300)}...\n\n`;
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
5. Adapt content to be contextually relevant for users in ${geo_location}

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
    if (isContextual && conversationContext.length > 0) {
      // Add a context message summarizing previous conversation
      let contextMessage = "Previous conversation context:\n";
      conversationContext.forEach((ctx, index) => {
        contextMessage += `User: ${ctx.query}\n`;
        if (ctx.answer) {
          contextMessage += `Assistant: ${ctx.answer.substring(0, 150)}${ctx.answer.length > 150 ? '...' : ''}\n`;
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

    // Prepare API request body based on whether tools are supported
    const requestBody = supportsTools ? {
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
      messages,
      temperature: 0.3
    };

    console.log(`Making API request with${supportsTools ? '' : 'out'} tools to Groq API`);
    
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
  } catch (error) {
    console.error("Error calling Groq Compound Beta API:", error);
    throw error;
  }
}
