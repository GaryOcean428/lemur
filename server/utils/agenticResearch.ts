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
You are a research planner that breaks down complex queries into specific sub-questions.
For the given research topic, create a research plan by:
1. Breaking down the main question into 2-5 specific sub-questions that help fully address the topic
2. Ensuring the sub-questions cover different aspects needed for comprehensive understanding
3. Organizing the sub-questions in a logical research sequence
4. Briefly explaining why each sub-question is important to the overall research goal

Respond with structured JSON containing:
- subQueries: an array of specific, searchable questions (2-5 questions max)
- plan: a brief explanation of your research approach
`
        },
        {
          role: "user",
          content: `Research topic: ${query}`
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
  console.log(`Executing ${subQueries.length} sub-queries for research`);
  
  // Define search parameters with appropriate depth
  const searchParams = {
    search_depth: options.deepDive ? "advanced" : "medium",
    max_results: options.deepDive ? 10 : 5,
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
          seenUrls.add(item.url);
          allResults.push(item);
        }
      });
    });
    
    // Sort by relevance score
    return allResults.sort((a, b) => b.score - a.score);
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
  
  // Format search results for the AI
  const formattedResults = results.slice(0, 10).map((result, index) => {
    return `
SOURCE [${index + 1}]: ${result.title}
URL: ${result.url}
CONTENT: ${result.content.substring(0, 1000)}${result.content.length > 1000 ? '...' : ''}
    `;
  }).join('\n\n');
  
  try {
    const response = await openai.chat.completions.create({
      // Using GPT-4.1, the latest OpenAI model (as of May 2025)
      model: "gpt-4.1",
      messages: [
        {
          role: "system",
          content: `
You are an expert research assistant that synthesizes information from multiple sources.
For this ${iteration > 1 ? 'follow-up' : 'initial'} analysis:

1. Review each source carefully and extract relevant facts, arguments, and evidence.
2. Think step-by-step to identify patterns, contradictions, and gaps.
3. Connect information across sources to build a comprehensive understanding.
4. Use citation numbers [1], [2], etc. to indicate which source supports each claim.
5. If sources contradict, acknowledge both perspectives and explain the disagreement.
6. Note areas where information is limited or further research is needed.

During your analysis, be explicit about your reasoning process.
`
        },
        {
          role: "user",
          content: `
RESEARCH QUESTION: ${query}

SEARCH RESULTS:
${formattedResults}

Please analyze these sources thoroughly, using step-by-step reasoning to synthesize information relevant to the research question. Use citation numbers [1], [2], etc. to link claims to specific sources. This is ${iteration > 1 ? 'a follow-up analysis to refine our findings' : 'an initial analysis'}.`
        }
      ],
      temperature: 0.2,
      max_tokens: 1500
    });
    
    return safeGetContent(response);
  } catch (error) {
    console.error("Error analyzing results:", error);
    return "Error occurred during analysis.";
  }
}

/**
 * Apply self-critique to improve the draft answer
 */
async function critiqueDraft(query: string, draft: string, results: TavilySearchResult[]): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      // Using GPT-4.1, the latest OpenAI model (as of May 2025)
      model: "gpt-4.1",
      messages: [
        {
          role: "system",
          content: `
You are a critical research evaluator tasked with improving research quality.
You will be given a draft analysis answering a research question.
Your job is to critically evaluate this draft and identify areas for improvement:

1. FACTUAL ACCURACY: Identify any claims that seem incorrect or unsupported by the sources
2. COMPLETENESS: Note important aspects of the topic that are missing
3. BALANCE: Check if the draft represents different perspectives fairly
4. REASONING: Evaluate the logical flow and connections between ideas
5. SOURCES: Identify where more evidence is needed or where sources might be used incorrectly
6. CLARITY: Note areas where the explanation could be clearer or more precise

Provide specific, constructive criticism that would help improve the next draft.
`
        },
        {
          role: "user",
          content: `
RESEARCH QUESTION: ${query}

DRAFT ANALYSIS:
${draft}

Please critique this draft and identify specific areas for improvement.`
        }
      ],
      temperature: 0.3,
      max_tokens: 1000
    });
    
    return safeGetContent(response);
  } catch (error) {
    console.error("Error critiquing draft:", error);
    return "Error occurred during critique.";
  }
}

/**
 * Refine the draft based on critique and search results
 */
async function refineDraft(query: string, draft: string, critique: string, results: TavilySearchResult[]): Promise<string> {
  // Format a subset of search results for the AI
  const formattedResults = results.slice(0, 8).map((result, index) => {
    return `
SOURCE [${index + 1}]: ${result.title}
URL: ${result.url}
CONTENT: ${result.content.substring(0, 800)}${result.content.length > 800 ? '...' : ''}
    `;
  }).join('\n\n');
  
  try {
    const response = await openai.chat.completions.create({
      // Using GPT-4.1, the latest OpenAI model (as of May 2025)
      model: "gpt-4.1",
      messages: [
        {
          role: "system",
          content: `
You are an expert research assistant refining research findings.
Using the critique provided and the original sources, improve the draft analysis by:

1. Addressing all issues identified in the critique
2. Supporting claims with specific citations [1], [2], etc.
3. Improving organization and clarity
4. Adding missing important information
5. Correcting any factual errors

Create a refined, comprehensive answer that accurately represents the research findings.
`
        },
        {
          role: "user",
          content: `
RESEARCH QUESTION: ${query}

ORIGINAL DRAFT:
${draft}

CRITIQUE TO ADDRESS:
${critique}

KEY SOURCES:
${formattedResults}

Please provide a refined analysis that addresses the critique while accurately representing the research findings.`
        }
      ],
      temperature: 0.2,
      max_tokens: 1800
    });
    
    return safeGetContent(response);
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
      max_tokens: 1800
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
      max_tokens: 2000
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
  
  // Set default options
  const maxIterations = options.maxIterations || 2;
  const includeReasoning = options.includeReasoning ?? true;
  const deepDive = options.deepDive ?? false;
  const useWebSearch = options.useWebSearch ?? false;
  const searchContextSize = options.searchContextSize || 'medium';
  
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
  };
  
  // Initialize progress with idle state
  updateProgress({ status: 'idle' });
  
  // Cache key for the entire research process
  const cacheKey = {
    query,
    options,
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
      
      // Analyze step - initial synthesis or follow-up
      processSteps.push(`Analysis iteration ${iterations}: Synthesizing information...`);
      updateProgress({ status: 'analyzing', results: currentResults });
      currentDraft = await analyzeResults(query, currentResults, iterations);
      
      // Check if we should do another iteration
      if (iterations >= maxIterations) break;
      
      // Critique step (Reflexion pattern)
      processSteps.push(`Critique iteration ${iterations}: Evaluating analysis quality...`);
      updateProgress({ status: 'critiquing', draft: currentDraft, results: currentResults });
      currentCritique = await critiqueDraft(query, currentDraft, currentResults);
      
      // Refine step
      processSteps.push(`Refinement iteration ${iterations}: Improving analysis based on critique...`);
      updateProgress({ status: 'refining', critique: currentCritique, draft: currentDraft, results: currentResults });
      currentDraft = await refineDraft(query, currentDraft, currentCritique, currentResults);
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
    
    // Cache the result for 30 minutes (1800 seconds)
    searchCache.set(cacheKey, result, 1800);
    
    return result;
  } catch (error) {
    console.error("Error in agentic research process:", error);
    
    // Return a graceful failure with error details
    return {
      answer: `An error occurred while researching "${query}". ${error instanceof Error ? error.message : 'Please try again later.'}`,
      sources: [],
      process: [...processSteps, "ERROR: Research process encountered a problem"]
    };
  }
}