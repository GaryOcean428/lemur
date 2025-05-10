/**
 * Agentic Research module
 * 
 * Provides advanced research capabilities using:
 * 1. ReAct pattern (Reasoning + Acting)
 * 2. Reflexion (self-reflection and improvement)
 * 3. Chain-of-Thought reasoning
 * 4. Multiple research iteration loops, including iterative search refinement.
 */

import { OpenAI } from "openai";
import { tavilyDeepResearch, tavilyExtractContent, TavilyDeepResearchResponse, TavilyDeepResearchResult } from "../utils/tavilyDeepResearch";
import { tavilySearch } from "../tavilySearch";
import type { TavilySearchResponse, TavilySearchResult } from "../tavilySearch";
import { searchCache } from "../utils/cache";
import { serperGoogleScholarSearch } from "./integrations/serperGoogleScholarSearch"; // Added for academic search

// Define types for the agentic reasoning process
export type ResearchState = 
  | { status: "idle" }
  | { status: "planning"; query: string }
  | { status: "searching"; query: string; subQueries?: string[]; searchFocus?: string; iteration: number }
  | { status: "analyzing"; results: TavilySearchResult[]; iteration: number }
  | { status: "critiquing"; draft: string; results: TavilySearchResult[]; iteration: number }
  | { status: "refining_queries"; critique: string; draft: string; iteration: number}
  | { status: "refining_draft"; critique: string; draft: string; results: TavilySearchResult[]; iteration: number }
  | { status: "finished"; answer: string; iterations: number; sources: Array<{url: string, title: string}>; process: string[] };

export interface AgenticResearchOptions {
  maxIterations?: number;
  includeReasoning?: boolean;
  deepDive?: boolean;
  userTier?: string;
  useWebSearch?: boolean; // This might be deprecated in favor of searchFocus
  searchFocus?: "web" | "academic"; // Added to specify search type
  searchContextSize?: "low" | "medium" | "high";
  serperApiKey?: string; // Added for Google Scholar
  tavilyApiKey?: string; // Added for Tavily
}

export interface AgenticResearchProgress {
  state: ResearchState;
  log: string[];
  iterations: number;
  currentQuery?: string;
  currentSubQueries?: string[];
  currentResultsCount?: number;
  currentDraft?: string;
  currentCritique?: string;
}

// Import Node.js process to avoid confusion with our local process variable
import { env } from "node:process";

// Initialize the OpenAI client with enhanced error checking
let openai: OpenAI;
try {
  if (!env.OPENAI_API_KEY) {
    console.error("OPENAI_API_KEY not found. Agentic research requires a valid OpenAI API key.");
    throw new Error("OpenAI API key is missing");
  }
  
  const partialKey = env.OPENAI_API_KEY.substring(0, 4) + "...";
  console.log(`OpenAI API initialized with key starting with: ${partialKey}`);
  
  openai = new OpenAI({ 
    apiKey: env.OPENAI_API_KEY,
    timeout: 90000 // 90 seconds timeout to prevent hanging requests for complex tasks
  });
} catch (error) {
  console.error("Failed to initialize OpenAI client:", error);
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

// Helper function to safely get content from OpenAI response
function safeGetContent(response: any): string {
  if (!response || !response.choices || !Array.isArray(response.choices) || response.choices.length === 0 || !response.choices[0].message || !response.choices[0].message.content) {
    console.error("Invalid or empty response from OpenAI API", JSON.stringify(response).substring(0, 200) + "...");
    return "";
  }
  return response.choices[0].message.content;
}

/**
 * Planning step: Break down complex research queries into sub-questions
 */
async function planResearch(query: string, existingPlan?: string): Promise<{
  subQueries: string[];
  plan: string;
}> {
  const cacheKey = { query, type: "agentic-research-plan", existingPlan };
  const cachedPlan = searchCache.get(cacheKey);
  if (cachedPlan) {
    console.log(`Cache hit for research planning: "${query}"`);
    return cachedPlan as { subQueries: string[]; plan: string };
  }

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4.1", // Using a capable model for planning
      messages: [
        {
          role: "system",
          content: `You are a research planner. Your goal is to break down a main research query into a set of 2-4 specific, actionable sub-queries that will help gather comprehensive information. 
          ${existingPlan ? `You have already developed a plan: ${existingPlan}. Now, refine or add to this plan based on new insights or needs.` : ``}
          Focus on creating sub-queries that are distinct yet complementary. Ensure the sub-queries are phrased as effective search terms.
          Respond with structured JSON containing:
          - subQueries: an array of specific, searchable questions (2-4 questions max)
          - plan: a brief explanation of your research approach, building on or replacing the existing plan if provided.`
        },
        {
          role: "user",
          content: `Research topic: ${query}`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3
    });
    const planData = JSON.parse(safeGetContent(response) || JSON.stringify({ subQueries: [query], plan: `Direct research on: ${query}` }));
    searchCache.set(cacheKey, planData, 3600);
    return planData;
  } catch (error) {
    console.error("Error in research planning:", error);
    return { subQueries: [query], plan: `Direct research on: ${query}` };
  }
}

/**
 * Execute search for each sub-query and combine results, supporting different search engines.
 */
async function executeSearches(subQueries: string[], options: AgenticResearchOptions): Promise<TavilySearchResult[]> {
  console.log(`Executing ${subQueries.length} sub-queries for research. Focus: ${options.searchFocus}, DeepDive: ${options.deepDive}`);
  
  const searchParams = {
    search_depth: options.deepDive ? "advanced" : "basic",
    max_results: options.deepDive ? 7 : 4, // Adjusted for token efficiency
    include_answer: options.searchFocus === "web", // Tavily answer might not be relevant for academic
    include_raw_content: options.deepDive,
    searchContextSize: options.searchContextSize || "medium",
  };

  let searchPromises: Promise<TavilySearchResponse | any>[];

  if (options.searchFocus === "academic") {
    if (!options.serperApiKey) throw new Error("Serper API key is required for academic search.");
    searchPromises = subQueries.map(subQuery => 
      serperGoogleScholarSearch(subQuery, options.serperApiKey!, { num: searchParams.max_results })
        .then(data => { 
          // Adapt Serper response to TavilySearchResult structure
          return {
            query: subQuery,
            answer: data.answerBox?.answer || data.answerBox?.snippet || "",
            results: (data.organic || []).map((item: any) => ({
              title: item.title,
              url: item.link,
              content: item.snippet || "No snippet available.",
              score: item.position || 0, // Use position as a proxy for score
              source: "Google Scholar",
              published_date: item.publicationDate || undefined
            })),
          } as TavilySearchResponse;
        })
    );
  } else { // Default to web search (Tavily)
    if (!options.tavilyApiKey) throw new Error("Tavily API key is required for web search.");
    searchPromises = subQueries.map(subQuery => 
      tavilySearch(subQuery, options.tavilyApiKey!, searchParams)
    );
  }
  
  try {
    const searchResponses = await Promise.all(searchPromises);
    const allResults: TavilySearchResult[] = [];
    const seenUrls = new Set<string>();
    
    searchResponses.forEach((response: TavilySearchResponse) => {
      (response.results || []).forEach((item: TavilySearchResult) => {
        if (item.url && !seenUrls.has(item.url)) {
          item.content = (item.content || "").substring(0, 700) + ((item.content || "").length > 700 ? "..." : "");
          seenUrls.add(item.url);
          allResults.push(item);
        }
      });
    });
    
    const limitedResults = allResults
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, options.deepDive ? 10 : 7); // Limit total results
    
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
async function analyzeResults(query: string, results: TavilySearchResult[], iteration: number, existingAnalysis?: string): Promise<string> {
  if (!results || results.length === 0) {
    return existingAnalysis || "No new results found to analyze.";
  }
  
  const formattedResults = results.slice(0, 7).map((result, index) => {
    return `
SOURCE [${index + 1}]: ${result.title} (${result.source || (result.url && new URL(result.url).hostname) || "Unknown Source"})
URL: ${result.url}
CONTENT: ${result.content}
    `;
  }).join("\n\n");
  
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [
        {
          role: "system",
          content: `You are an expert research assistant. Your task is to synthesize information from multiple sources to answer a research question. This is iteration ${iteration} of the analysis.
          ${existingAnalysis ? `You have a previous analysis: ${existingAnalysis}. Integrate new information from the provided SEARCH RESULTS with this existing analysis. Identify new insights, corroborating evidence, or contradictions.` : ``}
          1. Review each source carefully. Extract relevant facts, arguments, and evidence.
          2. Think step-by-step to identify patterns, contradictions, and gaps.
          3. Connect information across sources to build a comprehensive understanding.
          4. Use citation numbers [1], [2], etc. to indicate which source supports each claim. These numbers refer to the current list of SEARCH RESULTS.
          5. If sources contradict, acknowledge both perspectives and explain the disagreement.
          6. Note areas where information is limited or further research might be needed.
          Be explicit about your reasoning process. Focus on integrating new information if an existing analysis is provided.`
        },
        {
          role: "user",
          content: `
RESEARCH QUESTION: ${query}

${existingAnalysis ? "PREVIOUS ANALYSIS (for context, do not repeat verbatim unless expanding):\n" + existingAnalysis + "\n\nNEW/UPDATED SEARCH RESULTS (focus on these for new insights):" : "SEARCH RESULTS:"}
${formattedResults}

Please provide a synthesized analysis. If there was a previous analysis, integrate new findings and refine it. Use citation numbers [1], [2], etc. for the NEW/UPDATED SEARCH RESULTS.`
        }
      ],
      temperature: 0.2,
      max_tokens: 1800 // Increased for more comprehensive synthesis
    });
    return safeGetContent(response);
  } catch (error) {
    console.error("Error analyzing results:", error);
    return existingAnalysis || "Error occurred during analysis.";
  }
}

/**
 * Apply self-critique to improve the draft answer and suggest further research if needed.
 */
async function critiqueDraft(query: string, draft: string, results: TavilySearchResult[]): Promise<{critique: string, needsMoreResearch: boolean, suggestedQueries: string[]}> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [
        {
          role: "system",
          content: `You are a critical research evaluator. Evaluate the provided DRAFT ANALYSIS for a RESEARCH QUESTION.
          Your goals are:
          1. Identify weaknesses: factual accuracy, completeness, balance, reasoning, source usage, clarity.
          2. Suggest improvements: Be specific and constructive.
          3. Determine if more research is needed: If the draft has significant gaps or unanswered aspects, state this clearly.
          4. Suggest new search queries: If more research is needed, provide 1-2 specific sub-queries to address the gaps. These queries should be distinct from previous ones.

          Respond in JSON format with the following fields:
          - critique: (string) Your detailed critique and suggestions for improvement.
          - needsMoreResearch: (boolean) True if more research is essential, false otherwise.
          - suggestedQueries: (array of strings) New search queries if needsMoreResearch is true, otherwise an empty array.`
        },
        {
          role: "user",
          content: `
RESEARCH QUESTION: ${query}

DRAFT ANALYSIS:
${draft}

AVAILABLE SOURCES (for context, not to re-summarize):
${results.slice(0,5).map(r => `- ${r.title} (${r.url})`).join("\n")}

Please provide your evaluation in the specified JSON format.`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.4,
      max_tokens: 1200
    });
    const critiqueData = JSON.parse(safeGetContent(response) || JSON.stringify({ critique: "No critique generated.", needsMoreResearch: false, suggestedQueries: [] }));
    return critiqueData;
  } catch (error) {
    console.error("Error critiquing draft:", error);
    return { critique: "Error occurred during critique.", needsMoreResearch: false, suggestedQueries: [] };
  }
}

/**
 * Refine the draft based on critique and search results
 */
async function refineDraft(query: string, draft: string, critique: string, results: TavilySearchResult[], iteration: number): Promise<string> {
  const formattedResults = results.slice(0, 10).map((result, index) => { // Provide more sources for refinement
    return `
SOURCE [${index + 1}]: ${result.title} (${result.source || (result.url && new URL(result.url).hostname) || "Unknown Source"})
URL: ${result.url}
CONTENT: ${result.content}
    `;
  }).join("\n\n");
  
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [
        {
          role: "system",
          content: `You are an expert research assistant. This is iteration ${iteration} of refining research findings.
          Using the CRITIQUE provided and the available KEY SOURCES, improve the DRAFT ANALYSIS by:
          1. Addressing all issues identified in the critique.
          2. Supporting claims with specific citations [1], [2], etc. from the KEY SOURCES.
          3. Improving organization, clarity, and logical flow.
          4. Adding missing important information or correcting factual errors based on the critique and sources.
          Create a refined, comprehensive answer. Ensure the answer is well-structured and directly addresses the RESEARCH QUESTION.`
        },
        {
          role: "user",
          content: `
RESEARCH QUESTION: ${query}

CURRENT DRAFT:
${draft}

CRITIQUE TO ADDRESS:
${critique}

KEY SOURCES (use these for refinement and citation):
${formattedResults}

Please provide the refined analysis.`
        }
      ],
      temperature: 0.2,
      max_tokens: 2000 // Increased for more comprehensive refinement
    });
    return safeGetContent(response);
  } catch (error) {
    console.error("Error refining draft:", error);
    return draft; 
  }
}

/**
 * Generate final clean output, filtering out reasoning traces if requested
 */
async function finalizeDraft(query: string, draft: string, includeReasoning: boolean): Promise<string> {
  if (includeReasoning) {
    // If reasoning is included, we can still ask for a slightly more polished version
    // but the core reasoning steps should remain.
    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4.1",
            messages: [
                {
                    role: "system",
                    content: `You are a research editor. The user wants to see the reasoning process. Polish the provided DRAFT, which includes reasoning steps, into a well-structured and readable report. 
                    Ensure all key insights, analyses, critiques, and refinements are clear. Maintain source citations [1], [2], etc. 
                    The final output should be a comprehensive research report that also reveals the research journey.`
                },
                {
                    role: "user",
                    content: `
RESEARCH QUESTION: ${query}

WORKING DRAFT (with reasoning traces):
${draft}

Please polish this draft for clarity and structure, while preserving the reasoning steps and all citations.`
                }
            ],
            temperature: 0.1,
            max_tokens: 2500
        });
        return safeGetContent(response);
    } catch (error) {
        console.error("Error polishing draft with reasoning:", error);
        return draft; // Return original draft if polishing fails
    }
  }
  
  // If reasoning is NOT included, generate a clean summary.
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [
        {
          role: "system",
          content: `You are an expert research editor. Convert the working draft into a clean, well-structured final research summary.
          1. Remove explicit reasoning traces (e.g., "My thinking process was...") while preserving all insights and conclusions derived from that reasoning.
          2. Organize information logically with appropriate headings and clear language.
          3. Maintain all source citations in [1], [2] format.
          4. Ensure a professional, objective tone.
          5. The final report should be comprehensive, directly answer the RESEARCH QUESTION, and be ready for presentation.`
        },
        {
          role: "user",
          content: `
RESEARCH QUESTION: ${query}

WORKING DRAFT (may include reasoning traces):
${draft}

Please convert this into a polished final research summary, removing explicit reasoning traces but preserving all insights and citations.`
        }
      ],
      temperature: 0.2,
      max_tokens: 2000
    });
    return safeGetContent(response);
  } catch (error) {
    console.error("Error finalizing draft without reasoning:", error);
    return draft; 
  }
}

/**
 * Extract sources from the final draft and map to original search results
 */
function extractSources(draft: string, allResultsUsed: TavilySearchResult[]): Array<{url: string, title: string, originalIndex?: number}> {
  const sources: Array<{url: string, title: string, originalIndex?: number}> = [];
  const seenUrls = new Set<string>();

  // Create a map of results for quick lookup by URL, as citation numbers might reset or be inconsistent across LLM calls
  const resultMapByUrl = new Map<string, TavilySearchResult>();
  allResultsUsed.forEach(result => {
      if(result.url) resultMapByUrl.set(result.url, result);
  });

  // Regex to find markdown links: [text](url 
/**
 * Agentic Research module
 * 
 * Provides advanced research capabilities using:
 * 1. ReAct pattern (Reasoning + Acting)
 * 2. Reflexion (self-reflection and improvement)
 * 3. Chain-of-Thought reasoning
 * 4. Multiple research iteration loops, including iterative search refinement.
 */

import { OpenAI } from "openai";
import { tavilyDeepResearch, tavilyExtractContent, TavilyDeepResearchResponse, TavilyDeepResearchResult } from "../utils/tavilyDeepResearch";
import { tavilySearch } from "../tavilySearch";
import type { TavilySearchResponse, TavilySearchResult } from "../tavilySearch";
import { searchCache } from "../utils/cache";
import { serperGoogleScholarSearch } from "./integrations/serperGoogleScholarSearch"; // Added for academic search

// Define types for the agentic reasoning process
export type ResearchState = 
  | { status: "idle" }
  | { status: "planning"; query: string; iteration: number }
  | { status: "searching"; query: string; subQueries?: string[]; searchFocus?: string; iteration: number }
  | { status: "analyzing"; results: TavilySearchResult[]; iteration: number }
  | { status: "critiquing"; draft: string; results: TavilySearchResult[]; iteration: number }
  | { status: "refining_queries"; critique: string; draft: string; iteration: number; originalQuery: string; previousSubQueries: string[]}
  | { status: "refining_draft"; critique: string; draft: string; results: TavilySearchResult[]; iteration: number }
  | { status: "finished"; answer: string; iterations: number; sources: Array<{url: string, title: string}>; processLog: string[] }; // Renamed process to processLog

export interface AgenticResearchOptions {
  maxIterations?: number;
  includeReasoning?: boolean;
  deepDive?: boolean;
  userTier?: string;
  searchFocus?: "web" | "academic"; 
  searchContextSize?: "low" | "medium" | "high";
  serperApiKey?: string; 
  tavilyApiKey?: string; 
  onProgress?: (progress: AgenticResearchProgress) => void; // Callback for progress updates
}

export interface AgenticResearchProgress {
  state: ResearchState;
  log: string[]; // Detailed log of actions and thoughts
  iterations: number;
  currentQuery?: string;
  currentSubQueries?: string[];
  currentResultsCount?: number;
  currentDraft?: string;
  currentCritique?: string;
  overallProgress?: number; // Percentage (0-100)
  estimatedTimeRemaining?: number; // In seconds
}

import { env } from "node:process";

let openai: OpenAI;
try {
  if (!env.OPENAI_API_KEY) {
    console.error("OPENAI_API_KEY not found. Agentic research requires a valid OpenAI API key.");
    throw new Error("OpenAI API key is missing");
  }
  openai = new OpenAI({ 
    apiKey: env.OPENAI_API_KEY,
    timeout: 120000 // 120 seconds timeout
  });
  console.log(`OpenAI API initialized successfully.`);
} catch (error) {
  console.error("Failed to initialize OpenAI client:", error);
  openai = {
    chat: { completions: { create: async () => { throw new Error("OpenAI client not properly initialized."); } } }
  } as any;
}

function safeGetContent(response: any): string {
  if (!response?.choices?.[0]?.message?.content) {
    console.warn("Invalid or empty response from OpenAI API", JSON.stringify(response).substring(0, 200));
    return "";
  }
  return response.choices[0].message.content;
}

async function planResearch(query: string, iteration: number, existingPlan?: string, previousSubQueries?: string[]): Promise<{
  subQueries: string[];
  plan: string;
}> {
  const cacheKey = { query, type: "agentic-research-plan", iteration, existingPlan, previousSubQueries };
  const cachedPlan = searchCache.get(cacheKey);
  if (cachedPlan) return cachedPlan as { subQueries: string[]; plan: string };

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4.1-turbo", // Using a capable and fast model for planning
      messages: [
        {
          role: "system",
          content: `You are a research planner. Your goal is to break down a main research query into a set of 2-3 specific, actionable sub-queries. This is iteration ${iteration} of planning.
          ${existingPlan ? `PREVIOUS PLAN: ${existingPlan}.` : ``}
          ${previousSubQueries ? `PREVIOUS SUB-QUERIES: ${previousSubQueries.join(", ")}.` : ``}
          Based on the main query and any previous attempts, refine or generate new sub-queries. Avoid repeating previous sub-queries unless absolutely necessary for a new angle.
          Focus on creating sub-queries that are distinct yet complementary, and phrased as effective search terms.
          Respond with structured JSON containing:
          - subQueries: an array of specific, searchable questions (2-3 questions max)
          - plan: a brief explanation of your research approach for this iteration.`
        },
        {
          role: "user",
          content: `Main Research Query: ${query}`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.4 // Slightly higher temperature for more diverse plans if iterating
    });
    const planData = JSON.parse(safeGetContent(response) || JSON.stringify({ subQueries: [query], plan: `Direct research on: ${query}` }));
    searchCache.set(cacheKey, planData, 3600);
    return planData;
  } catch (error) {
    console.error(`Error in research planning (iteration ${iteration}):`, error);
    return { subQueries: [query], plan: `Fallback: Direct research on: ${query}` };
  }
}

async function executeSearches(subQueries: string[], options: AgenticResearchOptions): Promise<TavilySearchResult[]> {
  console.log(`Executing ${subQueries.length} sub-queries. Focus: ${options.searchFocus}, DeepDive: ${options.deepDive}`);
  const searchParams = {
    search_depth: options.deepDive ? "advanced" : "basic",
    max_results: options.deepDive ? 6 : 3, // Reduced for token efficiency and speed
    include_answer: options.searchFocus === "web",
    include_raw_content: options.deepDive,
  };

  let searchPromises: Promise<TavilySearchResponse | any>[];

  if (options.searchFocus === "academic") {
    if (!options.serperApiKey) throw new Error("Serper API key is required for academic search.");
    searchPromises = subQueries.map(subQuery => 
      serperGoogleScholarSearch(subQuery, options.serperApiKey!, { num: searchParams.max_results })
        .then(data => ({
            query: subQuery,
            answer: data.answerBox?.answer || data.answerBox?.snippet || "",
            results: (data.organic || []).map((item: any) => ({
              title: item.title,
              url: item.link,
              content: item.snippet || "No snippet available.",
              score: item.position || 0, 
              source: "Google Scholar",
              published_date: item.publicationDate || undefined
            })),
          } as TavilySearchResponse))
    );
  } else {
    if (!options.tavilyApiKey) throw new Error("Tavily API key is required for web search.");
    searchPromises = subQueries.map(subQuery => tavilySearch(subQuery, options.tavilyApiKey!, searchParams));
  }
  
  try {
    const searchResponses = await Promise.all(searchPromises);
    const allResults: TavilySearchResult[] = [];
    const seenUrls = new Set<string>();
    
    searchResponses.forEach((response: TavilySearchResponse) => {
      (response.results || []).forEach((item: TavilySearchResult) => {
        if (item.url && !seenUrls.has(item.url)) {
          item.content = (item.content || "").substring(0, 600) + ((item.content || "").length > 600 ? "..." : "");
          seenUrls.add(item.url);
          allResults.push(item);
        }
      });
    });
    
    const limitedResults = allResults
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, options.deepDive ? 8 : 5); // Limit total results
    
    console.log(`Combined search results: ${limitedResults.length} items.`);
    return limitedResults;
  } catch (error) {
    console.error("Error executing searches:", error);
    throw error;
  }
}

async function analyzeResults(query: string, results: TavilySearchResult[], iteration: number, existingAnalysis?: string): Promise<string> {
  if (!results || results.length === 0) return existingAnalysis || "No new results found to analyze.";
  
  const formattedResults = results.map((result, index) => `
SOURCE [${index + 1}]: ${result.title} (${result.source || (result.url && new URL(result.url).hostname) || "Unknown Source"})
URL: ${result.url}
CONTENT: ${result.content}
    `).join("\n\n");
  
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4.1-turbo",
      messages: [
        {
          role: "system",
          content: `You are an expert research synthesizer. This is iteration ${iteration} of analysis for the query: "${query}".
          ${existingAnalysis ? `PREVIOUS ANALYSIS: ${existingAnalysis}. Integrate new information from the CURRENT SEARCH RESULTS with this existing analysis. Focus on new insights, corroborating evidence, or contradictions.` : ``}
          Review each source carefully. Extract relevant facts, arguments, and evidence.
          Think step-by-step. Identify patterns, contradictions, and gaps.
          Connect information across sources to build a comprehensive understanding.
          Use citation numbers [1], [2], etc., referring to the CURRENT SEARCH RESULTS.
          If sources contradict, acknowledge both perspectives. Note areas needing more research.
          Be explicit about your reasoning. Output a detailed, synthesized analysis.`
        },
        {
          role: "user",
          content: `
${existingAnalysis ? "PREVIOUS ANALYSIS (for context, integrate with new findings):\n" + existingAnalysis + "\n\nCURRENT SEARCH RESULTS (focus on these for new insights and integration):" : "CURRENT SEARCH RESULTS:"}
${formattedResults}

Please provide your synthesized analysis.`
        }
      ],
      temperature: 0.2,
      max_tokens: 2000
    });
    return safeGetContent(response);
  } catch (error) {
    console.error(`Error analyzing results (iteration ${iteration}):`, error);
    return existingAnalysis || "Error occurred during analysis.";
  }
}

async function critiqueDraft(query: string, draft: string, iteration: number): Promise<{critique: string, needsMoreResearch: boolean, suggestedQueries: string[]}> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4.1-turbo",
      messages: [
        {
          role: "system",
          content: `You are a critical research evaluator. This is iteration ${iteration} of critique for the query "${query}".
          Evaluate the DRAFT ANALYSIS for:
          1. Factual accuracy and support from potential (unseen by you) sources.
          2. Completeness: Are there obvious gaps in addressing the query?
          3. Balance and Objectivity: Are different perspectives handled fairly?
          4. Reasoning and Logic: Is the analysis well-argued?
          5. Clarity and Cohesion: Is it easy to understand?
          Determine if more research is needed to fill gaps. If so, suggest 1-2 NEW, SPECIFIC sub-queries for the next research iteration. These queries should aim to find information the current draft is missing.
          Respond in JSON format:
          { "critique": "detailed critique...", "needsMoreResearch": boolean, "suggestedQueries": ["query1", "query2"] }`
        },
        {
          role: "user",
          content: `
RESEARCH QUESTION: ${query}

DRAFT ANALYSIS (iteration ${iteration}):
${draft}

Please provide your evaluation in the specified JSON format.`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.5, // Higher temperature for more critical and diverse feedback
      max_tokens: 1500
    });
    const critiqueData = JSON.parse(safeGetContent(response) || JSON.stringify({ critique: "No critique generated.", needsMoreResearch: false, suggestedQueries: [] }));
    return critiqueData;
  } catch (error) {
    console.error(`Error critiquing draft (iteration ${iteration}):`, error);
    return { critique: "Error during critique.", needsMoreResearch: false, suggestedQueries: [] };
  }
}

async function refineDraft(query: string, draft: string, critique: string, results: TavilySearchResult[], iteration: number): Promise<string> {
  const formattedResults = results.map((result, index) => `
SOURCE [${index + 1}]: ${result.title} (${result.source || (result.url && new URL(result.url).hostname) || "Unknown Source"})
URL: ${result.url}
CONTENT: ${result.content}
    `).join("\n\n");
  
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4.1-turbo",
      messages: [
        {
          role: "system",
          content: `You are an expert research writer. This is iteration ${iteration} of refining the research answer for "${query}".
          Using the CRITIQUE and available KEY SOURCES, improve the DRAFT ANALYSIS.
          1. Address ALL points in the CRITIQUE.
          2. Integrate information from KEY SOURCES, citing them as [1], [2], etc.
          3. Enhance organization, clarity, and logical flow.
          4. Correct errors, add missing information as guided by the critique and sources.
          Produce a comprehensive, well-structured, and accurate refined answer.`
        },
        {
          role: "user",
          content: `
RESEARCH QUESTION: ${query}

PREVIOUS DRAFT (iteration ${iteration}):
${draft}

CRITIQUE TO ADDRESS:
${critique}

KEY SOURCES (for refinement and citation):
${formattedResults}

Please provide the refined analysis.`
        }
      ],
      temperature: 0.2,
      max_tokens: 2500
    });
    return safeGetContent(response);
  } catch (error) {
    console.error(`Error refining draft (iteration ${iteration}):`, error);
    return draft; 
  }
}

async function finalizeDraft(query: string, draft: string, includeReasoning: boolean, processLog: string[]): Promise<string> {
  if (includeReasoning) {
    return `RESEARCH PROCESS LOG:\n${processLog.join("\n")}\n\nFINAL SYNTHESIZED ANSWER:\n${draft}`;
  }
  
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4.1-turbo", 
      messages: [
        {
          role: "system",
          content: `You are an expert research editor. Convert the working draft into a clean, well-structured final research summary for the query "${query}".
          1. Remove explicit reasoning traces (e.g., "My thinking process was...") but preserve all insights and conclusions.
          2. Organize information logically with headings and clear language.
          3. Maintain all source citations [1], [2], etc.
          4. Ensure a professional, objective tone.
          The final report should be comprehensive and directly answer the RESEARCH QUESTION.`
        },
        {
          role: "user",
          content: `
RESEARCH QUESTION: ${query}

WORKING DRAFT (may include reasoning traces):
${draft}

Please convert this into a polished final research summary.`
        }
      ],
      temperature: 0.1,
      max_tokens: 2500
    });
    return safeGetContent(response);
  } catch (error) {
    console.error("Error finalizing draft without reasoning:", error);
    return draft; 
  }
}

function extractSources(draft: string, allResultsUsedAcrossIterations: TavilySearchResult[]): Array<{url: string, title: string}> {
    const sources: Array<{url: string, title: string}> = [];
    const foundSources = new Set<string>(); // To avoid duplicate entries by URL

    // Regex to find markdown links: [text](url 
 "title") or markdown image ![alt](url "title")
    const markdownLinkRegex = /\[([^\]]+)\]\(([^\s\)]+)(?:\s"([^"]+)")?\)/g;
    let match;

    while ((match = markdownLinkRegex.exec(draft)) !== null) {
        const url = match[2];
        const title = match[1] || match[3]; // Use link text or title attribute

        if (url && !foundSources.has(url)) {
            // Try to find this URL in our collected search results to get a better title if possible
            const originalResult = allResultsUsedAcrossIterations.find(r => r.url === url);
            sources.push({
                url: url,
                title: originalResult?.title || title || new URL(url).hostname.replace(/^www\./, ""),
            });
            foundSources.add(url);
        }
    }
    
    // Fallback: if no markdown links, try to match based on [number] citations if they exist and map to allResultsUsed
    if (sources.length === 0) {
        const citationPattern = /\[(\d+)\]/g;
        const citedIndices = new Set<number>();
        while ((match = citationPattern.exec(draft)) !== null) {
            citedIndices.add(parseInt(match[1], 10) - 1); // 0-indexed
        }

        citedIndices.forEach(index => {
            if (index >= 0 && index < allResultsUsedAcrossIterations.length) {
                const result = allResultsUsedAcrossIterations[index];
                if (result.url && !foundSources.has(result.url)) {
                    sources.push({
                        url: result.url,
                        title: result.title || new URL(result.url).hostname.replace(/^www\./, ""),
                        originalIndex: index + 1
                    });
                    foundSources.add(result.url);
                }
            }
        });
    }

    // Sort sources by original index if available, then by title
    sources.sort((a, b) => {
        if (a.originalIndex !== undefined && b.originalIndex !== undefined) {
            return a.originalIndex - b.originalIndex;
        }
        return (a.title || "").localeCompare(b.title || "");
    });

    return sources.map(({ url, title }) => ({ url, title })); // Remove originalIndex before returning
}

/**
 * Main agentic research loop
 */
export async function performAgenticResearch(
  initialQuery: string, 
  options: AgenticResearchOptions
): Promise<ResearchState> {
  let currentQuery = initialQuery;
  let currentDraft = "";
  let currentPlan = "";
  let currentSubQueries: string[] = [];
  let allResultsUsed: TavilySearchResult[] = []; // Accumulate all sources used across iterations
  let processLog: string[] = []; // Log of the research process
  let iteration = 0;
  const maxIterations = options.maxIterations || 3;

  const updateProgress = (state: ResearchState, logEntry?: string) => {
    if (logEntry) processLog.push(`[Iter ${iteration} - ${state.status}] ${logEntry}`);
    if (options.onProgress) {
      const overallProgress = Math.min(95, (iteration / maxIterations) * 100); // Cap at 95% until truly finished
      options.onProgress({
        state,
        log: processLog,
        iterations: iteration,
        currentQuery,
        currentSubQueries,
        currentResultsCount: allResultsUsed.length,
        currentDraft: options.includeReasoning ? currentDraft : undefined, // Only send draft if reasoning is included
        overallProgress,
      });
    }
  };

  updateProgress({ status: "idle" }, `Starting agentic research for: "${initialQuery}"`);

  while (iteration < maxIterations) {
    iteration++;
    processLog.push(`--- Iteration ${iteration} ---`);

    // 1. Planning Step
    updateProgress({ status: "planning", query: currentQuery, iteration }, `Planning research for query: "${currentQuery}"`);
    const planResult = await planResearch(currentQuery, iteration, iteration > 1 ? currentPlan : undefined, iteration > 1 ? currentSubQueries : undefined);
    currentPlan = planResult.plan;
    currentSubQueries = planResult.subQueries;
    updateProgress({ status: "planning", query: currentQuery, iteration }, `Generated plan: ${currentPlan}. Sub-queries: ${currentSubQueries.join(", ")}`);

    // 2. Searching Step
    updateProgress({ status: "searching", query: currentQuery, subQueries: currentSubQueries, searchFocus: options.searchFocus, iteration }, `Executing searches for sub-queries.`);
    let searchResults: TavilySearchResult[] = [];
    try {
      searchResults = await executeSearches(currentSubQueries, options);
      allResultsUsed = [...allResultsUsed, ...searchResults].filter((value, index, self) => // Deduplicate
          index === self.findIndex((t) => (t.url === value.url))
      );
      updateProgress({ status: "searching", query: currentQuery, subQueries: currentSubQueries, searchFocus: options.searchFocus, iteration }, `Found ${searchResults.length} new results. Total unique results: ${allResultsUsed.length}.`);
    } catch (searchError: any) {
      processLog.push(`Search error: ${searchError.message}. Attempting to continue or finalize.`);
      updateProgress({ status: "searching", query: currentQuery, subQueries: currentSubQueries, searchFocus: options.searchFocus, iteration }, `Search error: ${searchError.message}`);
      // If search fails critically, try to finalize with what we have or end
      if (iteration === 1 && allResultsUsed.length === 0) { // First iteration and no results at all
        return { status: "finished", answer: "Could not retrieve any search results. Please try a different query or check connectivity.", iterations: iteration, sources: [], processLog };
      }
      // Otherwise, proceed to analysis with potentially empty new results, relying on previous draft
    }
    
    // 3. Analyzing Step
    updateProgress({ status: "analyzing", results: searchResults, iteration }, `Analyzing ${searchResults.length} new search results.`);
    currentDraft = await analyzeResults(currentQuery, searchResults, iteration, currentDraft);
    updateProgress({ status: "analyzing", results: searchResults, iteration }, `Analysis complete. Current draft length: ${currentDraft.length} chars.`);

    // 4. Critiquing Step (unless it's the last iteration and we just want to finalize)
    if (iteration < maxIterations) {
      updateProgress({ status: "critiquing", draft: currentDraft, results: allResultsUsed, iteration }, `Critiquing current draft.`);
      const critiqueResult = await critiqueDraft(initialQuery, currentDraft, iteration); // Critique against original query
      updateProgress({ status: "critiquing", draft: currentDraft, results: allResultsUsed, iteration }, `Critique: ${critiqueResult.critique.substring(0,100)}... Needs more research: ${critiqueResult.needsMoreResearch}`);

      if (critiqueResult.needsMoreResearch && critiqueResult.suggestedQueries.length > 0) {
        processLog.push(`Critique suggests more research. New suggested queries: ${critiqueResult.suggestedQueries.join(", ")}`);
        // Refine queries for the next iteration based on critique
        updateProgress({ status: "refining_queries", critique: critiqueResult.critique, draft: currentDraft, iteration, originalQuery: initialQuery, previousSubQueries: currentSubQueries }, `Refining queries based on critique.`);
        currentQuery = initialQuery; // Reset to original query or a refined version if planner supports it
        // The planResearch function will now take these suggestedQueries into account implicitly via `existingPlan` and `previousSubQueries`
        // Or, we could explicitly set currentSubQueries = critiqueResult.suggestedQueries if the planner is simple.
        // For now, let the planner decide based on the full context.
        processLog.push(`Next iteration will focus on addressing critique with potentially new sub-queries based on: ${critiqueResult.suggestedQueries.join("; ")}`)
      } else if (!critiqueResult.needsMoreResearch && iteration < maxIterations) {
         // If no more research needed, but not last iteration, refine draft and then break to finalize.
        processLog.push("Critique suggests no more research needed. Refining draft once more before finalizing.");
        updateProgress({ status: "refining_draft", critique: critiqueResult.critique, draft: currentDraft, results: allResultsUsed, iteration }, `Refining draft based on final critique.`);
        currentDraft = await refineDraft(initialQuery, currentDraft, critiqueResult.critique, allResultsUsed, iteration);
        updateProgress({ status: "refining_draft", critique: critiqueResult.critique, draft: currentDraft, results: allResultsUsed, iteration }, `Final draft refinement complete.`);
        break; // Exit loop to finalize
      } else {
        // No more research and it's not the last iteration yet, but no new queries. Refine and break.
         processLog.push("Critique suggests no more research, and no new queries. Refining draft.");
        updateProgress({ status: "refining_draft", critique: critiqueResult.critique, draft: currentDraft, results: allResultsUsed, iteration }, `Refining draft based on critique.`);
        currentDraft = await refineDraft(initialQuery, currentDraft, critiqueResult.critique, allResultsUsed, iteration);
        updateProgress({ status: "refining_draft", critique: critiqueResult.critique, draft: currentDraft, results: allResultsUsed, iteration }, `Draft refinement complete.`);
        // Potentially break here if the critique is very positive and no changes are needed.
        // For now, we continue to maxIterations or until needsMoreResearch is false and new queries are empty.
      }
    } else {
        processLog.push("Max iterations reached. Proceeding to finalization without further critique.");
    }
  }

  // 5. Finalizing Step
  processLog.push("Finalizing research report.");
  updateProgress({ status: "finished", answer: "", iterations: iteration, sources: [], processLog }, "Generating final answer.");
  const finalAnswer = await finalizeDraft(initialQuery, currentDraft, options.includeReasoning || false, processLog);
  const finalSources = extractSources(finalAnswer, allResultsUsed);
  
  if (options.onProgress) {
    options.onProgress({ // Send final progress update
      state: { status: "finished", answer: finalAnswer, iterations: iteration, sources: finalSources, processLog },
      log: processLog,
      iterations: iteration,
      overallProgress: 100,
    });
  }

  return { status: "finished", answer: finalAnswer, iterations: iteration, sources: finalSources, processLog };
}

