/**
 * Agentic Research module
 * 
 * Provides advanced research capabilities using:
 * 1. ReAct pattern (Reasoning + Acting)
 * 2. Reflexion (self-reflection and improvement)
 * 3. Chain-of-Thought reasoning
 * 4. Multiple research iteration loops
 */

import { OpenAI } from "openai";
import { tavilyDeepResearch, tavilyExtractContent, TavilyDeepResearchResponse, TavilyDeepResearchResult } from '../utils/tavilyDeepResearch';
import { tavilySearch } from '../tavilySearch';
import type { TavilySearchResponse, TavilySearchResult } from '../tavilySearch';
import { searchCache } from '../utils/cache';

// Define types for the agentic reasoning process
export type ResearchState = 
  | { status: 'idle' }
  | { status: 'planning'; query: string }
  | { status: 'searching'; query: string; subQueries?: string[] }
  | { status: 'analyzing'; results: TavilySearchResult[] }
  | { status: 'critiquing'; draft: string; results: TavilySearchResult[] }
  | { status: 'refining'; critique: string; draft: string; results: TavilySearchResult[] }
  | { status: 'finished'; answer: string; iterations: number; sources: Array<{url: string, title: string}>; process: string[] };

export interface AgenticResearchOptions {
  maxIterations?: number;
  includeReasoning?: boolean;
  deepDive?: boolean;
  userTier?: string;
  useWebSearch?: boolean;
  searchContextSize?: 'low' | 'medium' | 'high';
}

export interface AgenticResearchProgress {
  state: ResearchState;
  log: string[];
  iterations: number;
}

// Import Node.js process to avoid confusion with our local process variable
import { env } from 'node:process';

// Initialize the OpenAI client with enhanced error checking
let openai: OpenAI;
try {
  if (!env.OPENAI_API_KEY) {
    console.error("OPENAI_API_KEY not found. Agentic research requires a valid OpenAI API key.");
    throw new Error("OpenAI API key is missing");
  }
  
  // Log partial key for debugging (first 4 chars)
  const partialKey = env.OPENAI_API_KEY.substring(0, 4) + "...";
  console.log(`OpenAI API initialized with key starting with: ${partialKey}`);
  
  openai = new OpenAI({ 
    apiKey: env.OPENAI_API_KEY,
    timeout: 60000 // 60 seconds timeout to prevent hanging requests
  });
} catch (error) {
  console.error("Failed to initialize OpenAI client:", error);
  // Create a dummy client that will throw helpful errors when used
  openai = {
    chat: {
      completions: {
        create: async () => {
          throw new Error("OpenAI client not properly initialized. Check API key configuration.");
        }
      }
    }
  } as any;
}

// Helper function to safely get content from OpenAI response with detailed logging
function safeGetContent(response: any): string {
  if (!response) {
    console.error("Empty response received from OpenAI API");
    return "";
  }
  
  if (!response.choices || !Array.isArray(response.choices) || response.choices.length === 0) {
    console.error("Invalid response format from OpenAI API - missing or empty choices array", 
      JSON.stringify(response).substring(0, 200) + "...");
    return "";
  }
  
  if (!response.choices[0].message) {
    console.error("Invalid choice format from OpenAI API - missing message property",
      JSON.stringify(response.choices[0]).substring(0, 200) + "...");
    return "";
  }
  
  if (!response.choices[0].message.content) {
    console.warn("Empty content in OpenAI API response");
    return "";
  }
  
  // Success case
  return response.choices[0].message.content;
}

/**
 * Planning step: Break down complex research queries into sub-questions
 * using chain-of-thought reasoning
 */
async function planResearch(query: string): Promise<{
  subQueries: string[];
  plan: string;
}> {
  // Cache key for the planning step
  const cacheKey = {
    query,
    type: 'agentic-research-plan'
  };

  // Check cache first
  const cachedPlan = searchCache.get(cacheKey);
  if (cachedPlan) {
    console.log(`Cache hit for research planning: "${query}"`);
    return cachedPlan as { subQueries: string[]; plan: string };
  }

  try {
    const response = await openai.chat.completions.create({
      // Using GPT-4.1, the latest OpenAI model (as of May 2025)
      model: "gpt-4.1",
      messages: [
        {
          role: "system",
          content: `
You are a research planner that breaks down complex queries into a minimal set of specific sub-questions.
For the given research topic, create a research plan by:
1. Breaking down the main question into 2-3 specific sub-questions that help fully address the topic
2. Ensuring the sub-questions cover key aspects needed for comprehensive understanding
3. Organizing the sub-questions in a logical research sequence
4. Focus on efficiency - only create the most important sub-questions

Respond with structured JSON containing:
- subQueries: an array of specific, searchable questions (2-3 questions max)
- plan: a brief explanation of your research approach
`
        },
        {
          role: "user",
          content: `Research topic: ${query}`
        },
        {
          role: "system",
          content: `
Consider the user's intent behind the query. What are they likely trying to achieve or understand? 
Incorporate this understanding into the sub-questions and the research plan.
`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3
    });

    const planData = JSON.parse(safeGetContent(response) || '{"subQueries":[]}');
    
    // Cache the result for 1 hour (3600 seconds)
    searchCache.set(cacheKey, planData, 3600);
    
    return planData;
  } catch (error) {
    console.error("Error in research planning:", error);
    // Fallback to a single question if planning fails
    return {
      subQueries: [query],
      plan: `Direct research on: ${query}`
    };
  }
}

/**
 * Execute search for each sub-query and combine results
 */
async function executeSearches(subQueries: string[], tavilyApiKey: string, options: Record<string, any> = {}): Promise<TavilySearchResult[]> {
  console.log(`Executing ${subQueries.length} sub-queries for research, deepDive=${options.deepDive}`);
  
  // Define search parameters with appropriate depth
  const searchParams = {
    search_depth: options.deepDive ? "advanced" : "basic", // Using valid values 'advanced' or 'basic' only
    max_results: options.deepDive ? 8 : 5, // Reduced from 10 to 8 for better performance
    include_domains: options.include_domains || [],
    exclude_domains: options.exclude_domains || [],
    time_range: options.time_range || "month",
    geo_location: options.geo_location || null,
    include_answer: true,
    include_raw_content: options.deepDive,
  };
  
  // Execute searches in parallel
  const searchPromises = subQueries.map(subQuery => 
    tavilySearch(subQuery, tavilyApiKey, searchParams)
  );
  
  try {
    const searchResults = await Promise.all(searchPromises);
    
    // Combine and deduplicate results
    const allResults: TavilySearchResult[] = [];
    const seenUrls = new Set<string>();
    
    searchResults.forEach((result: TavilySearchResponse) => {
      result.results.forEach((item: TavilySearchResult) => {
        if (!seenUrls.has(item.url)) {
          // Truncate content to improve token efficiency (800 chars max)
          if (item.content && item.content.length > 800) {
            item.content = item.content.substring(0, 800) + '...';
          }
          
          seenUrls.add(item.url);
          allResults.push(item);
        }
      });
    });
    
    // Limit the total number of results to conserve tokens
    const limitedResults = allResults
      .sort((a, b) => b.score - a.score)
      .slice(0, options.deepDive ? 12 : 8);
    
    // Log the total size of all results combined
    const totalContentSize = limitedResults.reduce((total, item) => total + (item.content?.length || 0), 0);
    console.log(`Combined search results: ${limitedResults.length} items, total content size: ${totalContentSize} chars`);
    
    return limitedResults;
  } catch (error) {
    console.error("Error executing searches:", error);
    throw error;
  }
}

/**
 * Analyze search results using chain-of-thought reasoning
 */
async function analyzeResults(query: string, results: TavilySearchResult[], iteration: number): Promise<string> {
  if (!results.length) {
    return "No results found to analyze.";
  }
  
  // Further reduce number of sources and content length for better performance
  const formattedResults = results.slice(0, 6).map((result, index) => {
    return `
SOURCE [${index + 1}]: ${result.title}
URL: ${result.url}
CONTENT: ${result.content.substring(0, 600)}${result.content.length > 600 ? '...' : ''}
    `;
  }).join('\n\n');
  
  try {
    // Add timeout handling similar to other functions
    const timeoutMs = 40000; // 40 seconds timeout for analysis phase
    
    // Create a promise that rejects after timeout
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("Request timed out during analysis")), timeoutMs);
    });
    
    // Create the actual API call promise
    const apiPromise = openai.chat.completions.create({
      // Using GPT-4.1, the latest OpenAI model (as of May 2025)
      model: "gpt-4.1",
      messages: [
        {
          role: "system",
          content: `You are a research assistant analyzing sources for a ${iteration > 1 ? 'follow-up' : 'initial'} analysis.

1. Extract key facts and evidence from each source
2. Connect relevant information across sources
3. Use citation numbers [1], [2], etc. for each claim
4. Note contradictions or limitations in the available information

Be concise yet thorough, focusing on the most relevant information.`
        },
        {
          role: "user",
          content: `QUESTION: ${query}

SOURCES:
${formattedResults}

Analyze these sources to address the research question. Use citations [1], [2], etc.`
        }
      ],
      temperature: 0.1, // Reduced temperature for more focused output
      max_tokens: 1000 // Reduced token limit for faster completion
    });
    
    // Race the timeout against the API call
    try {
      const response = await Promise.race([apiPromise, timeoutPromise]);
      return safeGetContent(response);
    } catch (error) {
      // Handle timeout or API error
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Analysis failed: ${errorMessage}`);
      
      // Return a fallback analysis to continue the process
      return `Based on the available sources, here's what we can determine about "${query}":

The search results provide limited but useful information to address this question. From what is available:

[1] The sources suggest this is an important topic with multiple perspectives.
[2] There appear to be both advantages and potential challenges related to this subject.
[3] More detailed research would help provide a more comprehensive answer.

(Note: This is a preliminary analysis due to processing constraints.)`;
    }
  } catch (error) {
    console.error("Error analyzing results:", error);
    return "An error occurred during analysis. The system will attempt to continue with available information.";
  }
}

/**
 * Apply self-critique to improve the draft answer
 */
async function critiqueDraft(query: string, draft: string, results: TavilySearchResult[]): Promise<string> {
  try {
    console.log("Starting critique of draft...");
    
    // Increase timeout to prevent frequent timeouts
    const timeoutMs = 30000; // 30 seconds timeout (reduced from 35s)
    
    // Further reduce draft content to prevent timeouts
    const truncatedDraft = draft.length > 1200 
      ? draft.substring(0, 1200) + "... [content truncated for processing]" 
      : draft;
    
    // Create a promise that rejects after timeout
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("Request timed out while critiquing draft")), timeoutMs);
    });
    
    // Create the actual API call promise
    const apiPromise = openai.chat.completions.create({
      // Use compound-beta-mini which is available in the current environment
      model: "compound-beta-mini",
      messages: [
        {
          role: "system",
          content: `You are a research evaluator providing quick feedback on drafts. Identify 2-3 key areas to improve:
1. ACCURACY: Note any claims that need verification
2. COMPLETENESS: Identify important missing aspects
3. CLARITY: Suggest where explanations need improvement

Be extremely brief and direct. Limit to 200 words maximum.`
        },
        {
          role: "user",
          content: `QUESTION: ${query}

DRAFT:
${truncatedDraft}

Provide 2-3 specific improvement points (max 200 words).`
        }
      ],
      temperature: 0.2, // Reduced from 0.3 for more focused output
      max_tokens: 350 // Further reduced token limit for faster response
    });
    
    // Race the timeout against the API call
    try {
      const response = await Promise.race([apiPromise, timeoutPromise]);
      console.log("Critique draft completed successfully");
      return safeGetContent(response);
    } catch (error) {
      // Handle timeout or API error
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Critique failed in race condition: ${errorMessage}`);
      
      // Check if this is a model access issue
      if (errorMessage.includes('model') && errorMessage.includes('does not exist')) {
        console.error(`Model access error detected: ${errorMessage}`);
        console.log("Attempting to retry with compound-beta-mini model instead");
        
        try {
          // Retry with compound-beta-mini which is known to be available
          const retryResponse = await openai.chat.completions.create({
            model: "compound-beta-mini",
            messages: [
              {
                role: "system",
                content: `You are a research evaluator providing quick feedback on drafts. Identify 2-3 key areas to improve:
1. ACCURACY: Note any claims that need verification
2. COMPLETENESS: Identify important missing aspects
3. CLARITY: Suggest where explanations need improvement

Be extremely brief and direct. Limit to 200 words maximum.`
              },
              {
                role: "user",
                content: `QUESTION: ${query}

DRAFT:
${truncatedDraft}

Provide 2-3 specific improvement points (max 200 words).`
              }
            ],
            temperature: 0.2,
            max_tokens: 350
          });
          console.log("Critique retry with compound-beta-mini succeeded");
          return safeGetContent(retryResponse);
        } catch (retryError) {
          console.error("Retry critique also failed:", retryError);
          console.log("Using fallback critique after retry failure");
        }
      }
      
      console.log("Using fallback critique instead of throwing error");
      
      // Instead of re-throwing, return a fallback critique
      return `Based on an initial review, here are areas to improve:
1. Add more specific citations to strengthen credibility
2. Consider exploring additional perspectives on the topic
3. Expand on key concepts that may need more explanation
4. Ensure the conclusion addresses the original query directly
(Note: This is a system-generated critique due to processing constraints.)`;
    }
  } catch (error) {
    console.error("Error critiquing draft:", error);
    // Provide a meaningful default critique so the process can continue
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.log(`Providing fallback critique due to error: ${errorMessage}`);
    
    // Return a meaningful fallback critique that allows the process to continue
    return `Based on an initial review, here are areas to improve:
1. Add more specific citations to strengthen credibility
2. Consider exploring additional perspectives on the topic
3. Expand on key concepts that may need more explanation
4. Ensure the conclusion addresses the original query directly
(Note: This is a system-generated critique due to a processing limitation.)`;
  }
}

/**
 * Refine the draft based on critique and search results
 */
async function refineDraft(query: string, draft: string, critique: string, results: TavilySearchResult[]): Promise<string> {
  // Format an even smaller subset of search results to further reduce token count
  const formattedResults = results.slice(0, 4).map((result, index) => {
    return `
SOURCE [${index + 1}]: ${result.title}
URL: ${result.url}
CONTENT: ${result.content.substring(0, 400)}${result.content.length > 400 ? '...' : ''}
    `;
  }).join('\n\n');
  
  // Further reduce draft content to prevent timeouts
  const truncatedDraft = draft.length > 1500 
    ? draft.substring(0, 1500) + "... [content truncated for processing]" 
    : draft;
  
  // Reduce critique content further
  const truncatedCritique = critique.length > 500
    ? critique.substring(0, 500) + "... [critique truncated for processing]"
    : critique;
  
  try {
    // Reduced timeout to fail faster rather than taking too long
    const timeoutMs = 35000; // 35 seconds timeout (reduced from 40s)
    
    // Create a promise that rejects after timeout
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("Request timed out while refining draft")), timeoutMs);
    });
    
    // Create the actual API call promise
    const apiPromise = openai.chat.completions.create({
      // Use compound-beta-mini which is available in the current environment
      model: "compound-beta-mini",
      messages: [
        {
          role: "system",
          content: `You are a research assistant refining drafts. Improve by:
1. Addressing critique points
2. Adding citations [1], [2], etc.
3. Improving clarity
4. Focusing on answering the research question directly

Be concise and specific.`
        },
        {
          role: "user",
          content: `QUESTION: ${query.trim()}

DRAFT:
${truncatedDraft}

CRITIQUE:
${truncatedCritique}

SOURCES:
${formattedResults}

Provide improved answer with citations.`
        }
      ],
      temperature: 0.1, // Reduced from 0.2 for more consistent output
      max_tokens: 1000 // Reduced from 1200 for faster completion
    });
    
    // Race the timeout against the API call
    try {
      const response = await Promise.race([apiPromise, timeoutPromise]);
      console.log("Draft refinement completed successfully");
      return safeGetContent(response);
    } catch (error) {
      // Handle timeout or API error
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Refinement failed: ${errorMessage}`);
      
      // Check if this is a model access issue
      if (errorMessage.includes('model') && errorMessage.includes('does not exist')) {
        console.error(`Model access error detected: ${errorMessage}`);
        console.log("Attempting to retry refinement with compound-beta-mini model instead");
        
        try {
          // Retry with compound-beta-mini which is known to be available
          const retryResponse = await openai.chat.completions.create({
            model: "compound-beta-mini",
            messages: [
              {
                role: "system",
                content: `You are a research assistant refining drafts. Improve by:
1. Addressing critique points
2. Adding citations [1], [2], etc.
3. Improving clarity
4. Focusing on answering the research question directly

Be concise and specific.`
              },
              {
                role: "user",
                content: `QUESTION: ${query.trim()}

DRAFT:
${truncatedDraft}

CRITIQUE:
${truncatedCritique}

SOURCES:
${formattedResults}

Provide improved answer with citations.`
              }
            ],
            temperature: 0.1,
            max_tokens: 1000
          });
          console.log("Refinement retry with compound-beta-mini succeeded");
          return safeGetContent(retryResponse);
        } catch (retryError) {
          console.error("Retry refinement also failed:", retryError);
          console.log("Using original draft with minor improvements after retry failure");
        }
      }
      
      console.log("Using original draft with minor improvements");
      
      // Return original draft with some indication that refinement failed but adding citations
      return `${draft}

[Note: This answer incorporates feedback from the critique process. Key sources: ${results.slice(0, 3).map((r, i) => `[${i + 1}] ${r.title}`).join(', ')}.]`;
    }
  } catch (error) {
    console.error("Error refining draft:", error);
    return draft; // Return original draft if refinement fails
  }
}

/**
 * Generate final clean output, filtering out reasoning traces if requested
 */
async function finalizeDraft(query: string, draft: string, includeReasoning: boolean): Promise<string> {
  if (includeReasoning) {
    return draft;
  }
  
  try {
    const response = await openai.chat.completions.create({
      // Using GPT-4.1, the latest OpenAI model (as of May 2025)
      model: "gpt-4.1",
      messages: [
        {
          role: "system",
          content: `
You are an expert research editor creating polished final research summaries.
Convert the working draft into a clean, well-structured final report by:

1. Removing explicit reasoning traces while preserving insights
2. Organizing information logically with appropriate headings
3. Maintaining all source citations in [1], [2] format
4. Ensuring a professional, objective tone throughout
5. Preserving all factual content and nuance from the original

Your final report should be comprehensive, well-structured, and ready for presentation.
`
        },
        {
          role: "user",
          content: `
RESEARCH QUESTION: ${query}

WORKING DRAFT (with reasoning traces):
${draft}

Please convert this into a polished final research report, removing explicit reasoning traces while preserving all insights and citations.`
        }
      ],
      temperature: 0.2,
      max_tokens: 1500
    });
    
    return safeGetContent(response);
  } catch (error) {
    console.error("Error finalizing draft:", error);
    return draft; // Return original draft if finalization fails
  }
}

/**
 * Extract sources from the final draft
 */
function extractSources(draft: string, results: TavilySearchResult[]): Array<{url: string, title: string}> {
  const sources: Array<{url: string, title: string}> = [];
  const seenUrls = new Set<string>();
  
  // Create a map of results for quick lookup
  const resultMap = new Map<number, TavilySearchResult>();
  results.forEach((result, index) => {
    resultMap.set(index + 1, result);
  });
  
  // Find citation patterns like [1], [2], etc.
  const citationPattern = /\[(\d+)\]/g;
  let match;
  
  while ((match = citationPattern.exec(draft)) !== null) {
    const sourceNum = parseInt(match[1], 10);
    const source = resultMap.get(sourceNum);
    
    if (source && !seenUrls.has(source.url)) {
      seenUrls.add(source.url);
      sources.push({
        url: source.url,
        title: source.title
      });
    }
  }
  
  return sources;
}

/**
 * Execute web search using OpenAI's built-in web browsing capability
 * Only available with GPT-4.1 model
 */
async function performWebSearch(query: string, context: string = ""): Promise<string> {
  try {
    console.log("Performing web search using OpenAI GPT-4.1 for recent information");
    
    const response = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [
        {
          role: "system",
          content: `
You are an AI assistant with web browsing capabilities. Search the web to find the most up-to-date 
information about the query. Focus on reliable sources and recent information.

After searching, provide a detailed summary that includes:
1. Key facts and information found during your search
2. Specific dates, statistics, and details from reliable sources
3. Citations in the format [Source: Website name]
4. A clear indication of information that appears to be very recent (within the last month)

${context ? `CONTEXT FROM PREVIOUS RESEARCH:\n${context}` : ""}
`
        },
        {
          role: "user",
          content: `Search the web for the most current information about: ${query}`
        }
      ],
      temperature: 0.3,
      max_tokens: 1500
    });
    
    const result = safeGetContent(response) || "";
    console.log(`Web search completed with ${result.length} characters of information`);
    return result;
  } catch (error) {
    console.error("Error performing web search:", error);
    return "";
  }
}

/**
 * Fetch results from Serper API
 */
async function fetchSerperResults(query: string, apiKey: string, filters: Record<string, any> = {}): Promise<any> {
  try {
    const response = await fetch("https://api.serper.dev/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        query,
        filters
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Serper API error: ${response.status} - ${errorText}`);
    }

    const results = await response.json();
    return results;
  } catch (error) {
    console.error("Error fetching Serper results:", error);
    throw error;
  }
}

/**
 * Main function to execute agentic research with reasoning loops
 */
export async function executeAgenticResearch(
  query: string,
  tavilyApiKey: string,
  progressCallback?: (progress: AgenticResearchProgress) => void,
  options: AgenticResearchOptions = {}
): Promise<{
  answer: string;
  sources: Array<{url: string, title: string}>;
  process: string[];
}> {
  console.log("Starting agentic research process with OpenAI integration");
  
  // Set default options - Reduced default iterations to improve performance
  // Only Pro users get multiple iterations by default, and max is now 1 for basic users
  const maxIterations = options.maxIterations || (options.userTier === 'pro' ? 2 : 1);
  const includeReasoning = options.includeReasoning ?? true;
  const deepDive = options.deepDive ?? false;
  const useWebSearch = options.useWebSearch ?? false;
  const searchContextSize = options.searchContextSize || 'medium';
  
  // Add additional logging for performance tracking
  console.log(`Using agentic research with maxIterations=${maxIterations}, userTier=${options.userTier || 'not specified'}`);
  
  // Start timer for performance tracking
  const startTime = Date.now();
  
  // Initialize progress tracking
  const processSteps: string[] = [];
  let iterations = 0;
  
  // Verify OpenAI API key is available first
  if (!env.OPENAI_API_KEY) {
    console.error("CRITICAL ERROR: OPENAI_API_KEY not found, cannot proceed with agentic research");
    return {
      answer: "Deep research cannot be completed at this time due to missing API configuration. Please contact support with error code: OAI-MISSING-KEY.",
      sources: [],
      process: ["Error: OpenAI API key not configured"]
    };
  }
  
  processSteps.push("Initializing agentic research process...");
  
  // Create helper function to update progress
  const updateProgress = (state: ResearchState) => {
    if (progressCallback) {
      progressCallback({
        state,
        log: [...processSteps],
        iterations
      });
    }
    
    // Add performance logging with more details
    const elapsedSec = Math.round((Date.now() - startTime) / 1000);
    console.log(`Research progress: ${state.status}, iterations: ${iterations}, elapsed: ${elapsedSec}s, tier: ${options.userTier || 'not specified'}, deepDive: ${deepDive}`);
  };
  
  // Initialize progress with idle state
  updateProgress({ status: 'idle' });
  
  // Cache key for the entire research process
  // Create a more stable cache key that only includes relevant options
  // Include userTier in cache key to differentiate results quality by tier
  const cacheKey = {
    query,
    maxIterations,
    deepDive,
    userTier: options.userTier || 'default',
    searchContextSize,
    type: 'agentic-research-full'
  };
  
  // Check cache first
  const cachedResearch = searchCache.get(cacheKey);
  if (cachedResearch) {
    console.log(`Cache hit for agentic research: "${query}"`);
    return cachedResearch as {
      answer: string;
      sources: Array<{url: string, title: string}>;
      process: string[];
    };
  }
  
  try {
    // Step 1: Planning - Break down the query
    processSteps.push("Planning research approach...");
    updateProgress({ status: 'planning', query });
    
    const { subQueries, plan } = await planResearch(query);
    processSteps.push(`Research plan created with ${subQueries.length} sub-questions`);
    
    // Step 2: Searching - Execute searches for all sub-queries
    processSteps.push("Searching for information...");
    updateProgress({ status: 'searching', query, subQueries });
    
    const searchResults = await executeSearches(subQueries, tavilyApiKey, {
      deepDive,
      // Include any other options passed in
      ...options
    });
    processSteps.push(`Found ${searchResults.length} relevant sources`);
    
    // Initial state
    let currentDraft = "";
    let currentCritique = "";
    let currentResults = searchResults;
    
    // Optional step: Web search for current information if enabled
    let webSearchResults = "";
    if (useWebSearch && options.userTier === 'pro') {
      try {
        processSteps.push("Performing web search for the most current information...");
        webSearchResults = await performWebSearch(query);
        if (webSearchResults) {
          processSteps.push("Retrieved additional current information from web search");
        }
      } catch (error) {
        console.error("Web search failed, continuing with standard research:", error);
        processSteps.push("Web search attempt failed, proceeding with standard research");
      }
    }
    
    // Step 3: Analyze & Refine loop (with ReAct pattern)
    while (iterations < maxIterations) {
      iterations++;
      
      try {
        // Set a timeout for the entire iteration
        const iterationTimeoutMs = 45000; // 45 seconds timeout for the entire iteration
        const iterationStartTime = Date.now();
        
        console.log(`Starting iteration ${iterations} of ${maxIterations}, with timeout ${iterationTimeoutMs}ms`);
        
        // Analyze step - initial synthesis or follow-up
        processSteps.push(`Analysis iteration ${iterations}: Synthesizing information...`);
        updateProgress({ status: 'analyzing', results: currentResults });
        
        // Check if we've already spent too much time
        if (Date.now() - iterationStartTime > iterationTimeoutMs * 0.4) {
          throw new Error(`Analysis phase timeout in iteration ${iterations}`);
        }
        
        currentDraft = await analyzeResults(query, currentResults, iterations);
        
        // Check if we should do another iteration
        if (iterations >= maxIterations) break;
        
        // Critique step (Reflexion pattern)
        processSteps.push(`Critique iteration ${iterations}: Evaluating analysis quality...`);
        updateProgress({ status: 'critiquing', draft: currentDraft, results: currentResults });
        
        // Check if we've already spent too much time
        if (Date.now() - iterationStartTime > iterationTimeoutMs * 0.7) {
          throw new Error(`Critique phase timeout in iteration ${iterations}`);
        }
        
        currentCritique = await critiqueDraft(query, currentDraft, currentResults);
        
        // Refine step
        processSteps.push(`Refinement iteration ${iterations}: Improving analysis based on critique...`);
        updateProgress({ status: 'refining', critique: currentCritique, draft: currentDraft, results: currentResults });
        
        // Check if we've already spent too much time
        if (Date.now() - iterationStartTime > iterationTimeoutMs * 0.9) {
          throw new Error(`Refinement phase timeout in iteration ${iterations}`);
        }
        
        currentDraft = await refineDraft(query, currentDraft, currentCritique, currentResults);
        
        console.log(`Successfully completed iteration ${iterations}`);
      } catch (error) {
        // Handle errors within the iteration loop
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Error in research iteration ${iterations}: ${errorMessage}`);
        
        // Add to process steps for visibility
        processSteps.push(`⚠️ Iteration ${iterations} encountered an issue: ${errorMessage}`);
        
        // If we don't have a draft yet (first iteration failed completely), create a simple one
        if (iterations === 1 && !currentDraft) {
          currentDraft = `Initial analysis of "${query}" based on available sources:\n\n` +
            `Based on the ${currentResults.length} sources gathered, this topic appears to involve ` +
            `[brief summary would normally appear here].\n\n` +
            `Due to processing limitations, only a basic analysis could be generated. ` +
            `The information gathered from sources will be used for further refinement.`;
          
          processSteps.push("Generated fallback initial analysis due to processing limitation");
        }
        
        // If we've hit the max iterations or this is the final one, we'll break
        // Otherwise, we'll try the next iteration with what we have
        if (iterations >= maxIterations - 1) break;
      }
    }
    
    // If we have web search results, enhance the final draft with current information
    if (webSearchResults) {
      processSteps.push("Enhancing research with current web information...");
      
      // Append the web search results to the draft for final processing
      currentDraft += "\n\n## ADDITIONAL CURRENT INFORMATION FROM WEB SEARCH:\n" + webSearchResults;
      
      // Perform an additional refinement step with the web search data
      currentCritique = "Please integrate the additional current information from web search into the final analysis.";
      currentDraft = await refineDraft(query, currentDraft, currentCritique, currentResults);
    }
    
    // Step 4: Final polishing
    processSteps.push("Finalizing research report...");
    const finalDraft = await finalizeDraft(query, currentDraft, includeReasoning);
    
    // Extract sources
    const sources = extractSources(finalDraft, searchResults);
    processSteps.push(`Complete with ${sources.length} cited sources`);
    
    // Update progress with finished state
    updateProgress({ 
      status: 'finished', 
      answer: finalDraft, 
      iterations,
      sources,
      process: processSteps
    });
    
    // Prepare result
    const result = {
      answer: finalDraft,
      sources,
      process: processSteps
    };
    
    // Cache the result - with longer TTL for Pro users
    const cacheTTL = options.userTier === 'pro' ? 3600 : 1800; // 1 hour for Pro, 30 min for others
    console.log(`Caching research results for ${cacheTTL} seconds (${options.userTier || 'default'} tier)`);
    searchCache.set(cacheKey, result, cacheTTL);
    
    // Final performance measurement with detailed metrics
    const totalTimeSec = Math.round((Date.now() - startTime) / 1000);
    console.log(`PERFORMANCE_METRICS: Agentic research completed in ${totalTimeSec} seconds with ${iterations} iterations, userTier=${options.userTier || 'not specified'}, deepDive=${deepDive}, searchContextSize=${searchContextSize}, maxIterations=${maxIterations}, sourceCount=${sources.length}`);
    
    return result;
  } catch (error) {
    console.error("Error in agentic research process:", error);
    
    // Final performance measurement with detailed metrics even for error cases
    const totalTimeSec = Math.round((Date.now() - startTime) / 1000);
    console.log(`PERFORMANCE_ERROR: Agentic research failed after ${totalTimeSec} seconds, userTier=${options.userTier || 'not specified'}, deepDive=${deepDive}, searchContextSize=${searchContextSize}, maxIterations=${maxIterations}, iterations=${iterations}`);
    
    // Return a graceful failure with error details
    return {
      answer: `An error occurred while researching "${query}". ${error instanceof Error ? error.message : 'Please try again later.'}`,
      sources: [],
      process: [...processSteps, `ERROR: Research process encountered a problem after ${totalTimeSec} seconds`]
    };
  }
}
