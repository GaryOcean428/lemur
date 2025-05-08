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
import { searchCache } from './cache';

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
}

export interface AgenticResearchProgress {
  state: ResearchState;
  log: string[];
  iterations: number;
}

// Initialize the OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// If the key is not provided, log a warning
if (!process.env.OPENAI_API_KEY) {
  console.warn("OPENAI_API_KEY not found. Agentic research requires a valid OpenAI API key.");
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
      // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      model: "gpt-4o",
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

    const planData = JSON.parse(response.choices[0].message.content || '{"subQueries":[]}');
    
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
      // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      model: "gpt-4o",
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
    
    return response.choices[0].message.content;
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
      // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      model: "gpt-4o",
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
    
    return response.choices[0].message.content;
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
      // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      model: "gpt-4o",
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
    
    return response.choices[0].message.content;
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
      // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      model: "gpt-4o",
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
    
    return response.choices[0].message.content;
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
 * Main function to execute agentic research with reasoning loops
 */
export async function executeAgenticResearch(
  query: string,
  tavilyApiKey: string,
  options: AgenticResearchOptions = {}
): Promise<{
  answer: string;
  sources: Array<{url: string, title: string}>;
  process: string[];
}> {
  // Set default options
  const maxIterations = options.maxIterations || 2;
  const includeReasoning = options.includeReasoning ?? true;
  const deepDive = options.deepDive ?? false;
  
  // Initialize progress tracking
  const process: string[] = [];
  let iterations = 0;
  
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
    process.push("Planning research approach...");
    const { subQueries, plan } = await planResearch(query);
    process.push(`Research plan created with ${subQueries.length} sub-questions`);
    
    // Step 2: Searching - Execute searches for all sub-queries
    process.push("Searching for information...");
    const searchResults = await executeSearches(subQueries, tavilyApiKey, {
      deepDive,
      // Include any other options passed in
      ...options
    });
    process.push(`Found ${searchResults.length} relevant sources`);
    
    // Initial state
    let currentDraft = "";
    let currentCritique = "";
    let currentResults = searchResults;
    
    // Step 3: Analyze & Refine loop (with ReAct pattern)
    while (iterations < maxIterations) {
      iterations++;
      
      // Analyze step - initial synthesis or follow-up
      process.push(`Analysis iteration ${iterations}: Synthesizing information...`);
      currentDraft = await analyzeResults(query, currentResults, iterations);
      
      // Check if we should do another iteration
      if (iterations >= maxIterations) break;
      
      // Critique step (Reflexion pattern)
      process.push(`Critique iteration ${iterations}: Evaluating analysis quality...`);
      currentCritique = await critiqueDraft(query, currentDraft, currentResults);
      
      // Refine step
      process.push(`Refinement iteration ${iterations}: Improving analysis based on critique...`);
      currentDraft = await refineDraft(query, currentDraft, currentCritique, currentResults);
    }
    
    // Step 4: Final polishing
    process.push("Finalizing research report...");
    const finalDraft = await finalizeDraft(query, currentDraft, includeReasoning);
    
    // Extract sources
    const sources = extractSources(finalDraft, searchResults);
    process.push(`Complete with ${sources.length} cited sources`);
    
    // Prepare result
    const result = {
      answer: finalDraft,
      sources,
      process
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
      process: [...process, "ERROR: Research process encountered a problem"]
    };
  }
}