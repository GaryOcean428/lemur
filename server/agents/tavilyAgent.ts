// server/agents/tavilyAgent.ts
import {
  AgentCapabilityDeclaration,
  TaskDefinition,
  TaskStatusUpdatePayload,
  TaskResultPayload,
  WebSearchInput,
  WebSearchOutput,
} from "../types/agentProtocols.js";
import { tavilySearch, TavilySearchResponse, TavilySearchResult } from "../tavilySearch.js";

export const TAVILY_AGENT_ID = "tavily-search-agent";
export const TAVILY_AGENT_TYPE = "web-search";

// Extend AgentCapabilityDeclaration with runtime methods
interface RuntimeAgentDeclaration extends AgentCapabilityDeclaration {
  healthCheck: () => Promise<boolean>;
  handleTask: (task: TaskDefinition) => Promise<TaskResultPayload>;
}

export const tavilyAgentDeclaration: RuntimeAgentDeclaration = {
  agentId: TAVILY_AGENT_ID,
  agentType: TAVILY_AGENT_TYPE,
  displayName: "Tavily Web Search Agent",
  version: "1.0.0",
  description: "Performs web searches using the Tavily API",
  supportedProtocols: ["mcp_v1.1"],
  capabilities: [
    {
      taskType: "web_search",
      description: "Performs web searches with configurable depth and result limits",
      inputSchema: {
        type: "object",
        properties: {
          query: { type: "string" },
          search_depth: { type: "string", enum: ["basic", "advanced"] },
          max_results: { type: "number" },
        },
        required: ["query"],
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
                content: { type: "string" },
                score: { type: "number" },
              },
            },
          },
        },
      },
    },
  ],
  healthCheck: async () => {
    try {
      const testQuery = "test query";
      const testResponse = await tavilySearch(testQuery, process.env.TAVILY_API_KEY!, { search_depth: "basic" });
      return testResponse && Array.isArray(testResponse.results);
    } catch (error) {
      console.error("Tavily agent health check failed:", error);
      return false;
    }
  },
  handleTask: async (task: TaskDefinition): Promise<TaskResultPayload> => {
    if (task.taskType !== "web_search") {
      return {
        taskId: task.taskId,
        finalStatus: "failed",
        errorDetails: {
          errorCode: "UNSUPPORTED_TASK_TYPE",
          errorMessage: `Tavily agent cannot handle task type: ${task.taskType}`,
        },
      };
    }

    const input = task.inputData as WebSearchInput;
    const apiKey = process.env.TAVILY_API_KEY;
    if (!apiKey) {
      return {
        taskId: task.taskId,
        finalStatus: "failed",
        errorDetails: {
          errorCode: "CONFIGURATION_ERROR",
          errorMessage: "TAVILY_API_KEY not configured",
        },
      };
    }

    try {
      const searchResponse = await tavilySearch(input.query, apiKey, {
        search_depth: input.search_depth || "basic",
        max_results: input.max_results || 5,
      });

      const outputData: WebSearchOutput = {
        results: searchResponse.results || [],
      };

      return {
        taskId: task.taskId,
        finalStatus: "completed",
        outputData,
      };
    } catch (error) {
      console.error("Tavily search error:", error);
      return {
        taskId: task.taskId,
        finalStatus: "failed",
        errorDetails: {
          errorCode: "SEARCH_ERROR",
          errorMessage: error instanceof Error ? error.message : "Unknown error during search",
        },
      };
    }
  },
};
