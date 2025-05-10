// server/agents/tavilyAgent.ts

// Importing TavilySearchResults from @langchain/community requires installing the package
// For now, using our own tavilySearch implementation
import {
  AgentCapabilityDeclaration,
  TaskDefinition,
  TaskResultPayload,
  WebSearchInput,
  WebSearchOutput
} from "../types/agentProtocols";
import { tavilySearch } from "../tavilySearch"; // Corrected import path and added types

export const TAVILY_AGENT_ID = "tavily-search-agent-v1";
export const TAVILY_AGENT_TYPE = "tavily_web_searcher";

export const tavilyAgentDeclaration: AgentCapabilityDeclaration = {
  agentId: TAVILY_AGENT_ID,
  agentType: TAVILY_AGENT_TYPE,
  displayName: "Tavily Web Search Agent",
  version: "1.0.0",
  description: "Performs web searches using the Tavily API and returns structured results.",
  supportedProtocols: ["mcp_v1.1"],
  capabilities: [
    {
      taskType: "web_search",
      description: "Performs web searches and returns structured results",
      inputSchema: {
        type: "object",
        properties: {
          query: { type: "string", description: "The search query." },
          search_depth: { type: "string", enum: ["basic", "advanced"], default: "basic", description: "Search depth." },
          max_results: { type: "integer", default: 5, description: "Maximum number of results." }
        },
        required: ["query"]
      },
      outputSchema: {
        type: "object",
        properties: {
          results: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                url: { type: "string" },
                content: { type: "string" }, // Tavily often returns content directly
                score: { type: "number" },
                raw_content: { type: "object", nullable: true } // Additional raw data if any
              },
              required: ["title", "url", "content"]
            }
          }
        }
      }
    }
  ],
  // This agent is internal, so no invokeEndpoint is needed if called directly by orchestrator
  // If it were an external microservice, invokeEndpoint would be its URL.
};

/**
 * Handles a task assigned to the Tavily Agent.
 * @param task - The task definition.
 * @returns A promise that resolves to the task result.
 */
export const handleTavilySearchTask = async (task: TaskDefinition): Promise<TaskResultPayload> => {
  if (task.taskType !== "web_search") {
    return {
      taskId: task.taskId,
      finalStatus: "failed",
      errorDetails: {
        errorCode: "invalid_task_type",
        errorMessage: `Task type ${task.taskType} is not supported by ${TAVILY_AGENT_ID}. Expected 'web_search'.`
      }
    };
  }

  const input = task.inputData as WebSearchInput;
  if (!input.query) {
    return {
      taskId: task.taskId,
      finalStatus: "failed",
      errorDetails: {
        errorCode: "missing_input",
        errorMessage: "Query is missing in inputData for web_search task."
      }
    };
  }

  try {
    // The tavilySearch function in the repo is used here
    const searchResults = await tavilySearch(
        input.query,
        process.env.TAVILY_API_KEY || "", // Assuming TAVILY_API_KEY is in process.env
        {
            search_depth: input.search_depth || "basic",
            max_results: input.max_results || 5
        }
    );

    const output: WebSearchOutput = {
      results: searchResults.results.map(r => ({
        title: r.title,
        url: r.url,
        content: r.content, 
        score: r.score, 
        raw_content: null // Handle if needed
      }))
    };

    return {
      taskId: task.taskId,
      finalStatus: "completed",
      outputData: output
    };
  } catch (error: any) {
    console.error(`Error processing Tavily search task ${task.taskId}:`, error);
    return {
      taskId: task.taskId,
      finalStatus: "failed",
      errorDetails: {
        errorCode: "tavily_api_error",
        errorMessage: error.message || "An unexpected error occurred during Tavily search."
      }
    };
  }
};

// Note: The original `server/tavilySearch.ts` might need to be slightly refactored
// if its current direct usage in routes conflicts with this agent structure,
// or this agent can call a more primitive version of it.
// For now, we assume `tavilySearch` can be called as shown.
