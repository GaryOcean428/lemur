/**
 * Utility functions for error handling in API integrations
 */

import { GroqCompoundResponse } from '../directCompound';

// Define error types for more structured error handling
export interface ApiError extends Error {
  statusCode?: number;
  isToolError?: boolean;
  isAuthError?: boolean;
  isRateLimitError?: boolean;
  isNetworkError?: boolean;
}

/**
 * Attempts a fallback request without tools when tool usage fails
 * 
 * @param groqApiKey - Groq API key for authentication
 * @param model - Model to use for the request
 * @param messages - Messages to send to the model
 * @returns The fallback response or null if the fallback also failed
 */
export async function attemptFallbackWithoutTools(
  groqApiKey: string,
  model: string,
  messages: any[]
): Promise<GroqCompoundResponse | null> {
  try {
    console.log("Attempting fallback without tools due to tool error");
    
    // Create a simplified request without tools
    const fallbackRequestBody = {
      model,
      messages,
      temperature: 0.3
    };
    
    // Make the API request to Groq (without tools)
    const fallbackResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${groqApiKey}`
      },
      body: JSON.stringify(fallbackRequestBody)
    });
    
    if (!fallbackResponse.ok) {
      console.error(`Fallback API request failed with status: ${fallbackResponse.status}`);
      return null;
    }
    
    return await fallbackResponse.json() as GroqCompoundResponse;
  } catch (error) {
    console.error("Fallback attempt failed:", error);
    return null;
  }
}

/**
 * Extract sources from citation formatting in text
 * 
 * @param text - Text to extract citations from
 * @returns Array of sources extracted from the text
 */
export function extractSourcesFromText(text: string): { title: string; url: string; domain: string }[] {
  // Check if there are citations in markdown format [1]: https://example.com
  const citationRegex = /\[([0-9]+)\]:\s*(https?:\/\/[^\s]+)\s*(?:"([^"]+)")?/g;
  let citation;
  const citationMap = new Map<string, { title: string; url: string; domain: string }>();
  
  while ((citation = citationRegex.exec(text)) !== null) {
    const number = citation[1];
    const url = citation[2];
    let title = citation[3] || "";
    
    if (!title) {
      try {
        const domain = new URL(url).hostname.replace('www.', '');
        title = domain.charAt(0).toUpperCase() + domain.slice(1);
      } catch (e) {
        title = "Reference " + number;
      }
    }
    
    const source = {
      title,
      url,
      domain: new URL(url).hostname.replace('www.', '')
    };
    
    citationMap.set(number, source);
  }
  
  // Convert the map to an array for sources
  return Array.from(citationMap.values());
}

/**
 * Analyzes an API error and enhances it with additional information
 * 
 * @param error - The original error object
 * @returns Enhanced error object with additional context
 */
export function enhanceApiError(error: Error): ApiError {
  const enhancedError = error as ApiError;
  
  // Try to parse error message if it's JSON
  try {
    if (typeof error.message === 'string' && error.message.startsWith('{')) {
      const errorData = JSON.parse(error.message);
      
      if (errorData.error) {
        // Check for typical API error patterns
        if (errorData.error.type === 'invalid_request_error' && 
            errorData.error.message.includes('tool')) {
          enhancedError.isToolError = true;
        }
        
        if (errorData.error.type === 'authentication_error') {
          enhancedError.isAuthError = true;
          enhancedError.statusCode = 401;
        }
        
        if (errorData.error.type === 'rate_limit_exceeded') {
          enhancedError.isRateLimitError = true;
          enhancedError.statusCode = 429;
        }
      }
    }
  } catch (parseError) {
    // If JSON parsing fails, continue with basic error enhancement
  }
  
  // Handle fetch/network errors
  if (error.name === 'FetchError' || error.message.includes('network')) {
    enhancedError.isNetworkError = true;
  }
  
  return enhancedError;
}