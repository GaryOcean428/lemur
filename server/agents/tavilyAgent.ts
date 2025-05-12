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

export const tavilyAgentDeclaration: AgentCapabilityDeclaration = {
  agentId: "tavily-search-agent",
  agentType: "web-search",
  capabilities: [
    {
      taskType: "web-search",
      inputSchema: {
        type: "object",
        properties: {
          query: { type: "string" },
          searchDepth: { type: "string", enum: ["basic", "advanced"] },
          maxResults: { type: "number" },
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
    if (task.type !== "web-search") {
      throw new Error(`Tavily agent cannot handle task type: ${task.type}`);
    }

    const input = task.input as WebSearchInput;
    const apiKey = process.env.TAVILY_API_KEY;
    if (!apiKey) {
      throw new Error("TAVILY_API_KEY not configured");
    }

    try {
      const searchResponse = await tavilySearch(input.query, apiKey, {
        search_depth: input.searchDepth || "basic",
        max_results: input.maxResults || 5,
      });

      const output: WebSearchOutput = {
        results: searchResponse.results || [],
      };

      return {
        taskId: task.taskId,
        status: "completed",
        output,
      };
    } catch (error) {
      console.error("Tavily search error:", error);
      return {
        taskId: task.taskId,
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error during search",
      };
    }
  },
};
