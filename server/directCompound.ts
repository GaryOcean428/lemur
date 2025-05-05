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
export async function directGroqCompoundSearch(
  query: string, 
  apiKey: string, 
  modelPreference: string = 'auto',
  geo_location: string = 'AU'
): Promise<{
  answer: string;
  model: string;
  contextual?: boolean;
  search_tools_used?: any[];
}> {
  try {
    // Validate API key
    if (!apiKey || apiKey.trim() === '') {
      throw new Error('Missing Groq API key');
    }

    // Choose model based on preference
    const modelMap: Record<string, string> = {
      "auto": "compound-beta",
      "fast": "compound-beta-mini", // Fast model with lower latency
      "comprehensive": "compound-beta"  // Comprehensive model for complex reasoning
    };
    
    // Normalize the model preference
    const normalizedPref = modelPreference.toLowerCase();
    
    // Get model based on user preference or fallback to default
    const model = modelMap[normalizedPref] || "compound-beta";
    
    // Log which model was selected
    console.log(`Using Direct Groq Compound Beta model: ${model} for query: "${query.substring(0, 50)}${query.length > 50 ? '...' : ''}"`);

    // Create the system message with search preferences
    const systemMessage = {
      role: "system",
      content: `You are Lemur, an advanced search assistant powered by Groq's Compound Beta models.

Important: Use the search tool for EVERY query to find current, authoritative information before responding. 

When responding to search queries, follow these guidelines:
1. Always use the web_search tool to find information before answering
2. Be comprehensive and detailed in your answers
3. Include proper citations for all factual information
4. Use markdown formatting for structure (headings, lists, etc.)
5. Break down complex information into understandable parts
6. For time-sensitive information, note the recency of sources
7. Adapt content to be contextually relevant for users in ${geo_location}

When using the search tool, prefer sources that are:
- Recent and up-to-date
- Authoritative and reliable
- Directly relevant to the query

Format your response with clear section headings and a logical structure.

Remember: You MUST use the search tool for all queries, even if you think you know the answer.`
    };

    // Prepare the user message
    const userMessage = {
      role: "user",
      content: query
    };

    // Make the API request to Groq Compound Beta
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [systemMessage, userMessage],
        temperature: 0.3,
        tools: [
          {
            type: "web_search",
            web_search: {
              enable: true,
            }
          }
        ],
        tool_choice: { type: "web_search" }
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

    const data = await response.json() as GroqCompoundResponse;
    
    // Extract executed tools information (if available)
    const executedTools = data.choices[0].message.executed_tools || [];
    
    // Debug logging for tools - this helps diagnose what's being returned
    console.log('Executed tools count:', executedTools.length);
    if (executedTools.length > 0) {
      console.log('First tool type:', executedTools[0].type);
      console.log('First tool input:', JSON.stringify(executedTools[0].input).substring(0, 100) + '...');
      console.log('First tool output structure:', typeof executedTools[0].output, 
        Array.isArray(executedTools[0].output) ? executedTools[0].output.length + ' items' : 'not an array');
    }
    
    return {
      answer: data.choices[0].message.content,
      model: data.model,
      search_tools_used: executedTools
    };
  } catch (error) {
    console.error("Error calling Groq Compound Beta API:", error);
    throw error;
  }
}
