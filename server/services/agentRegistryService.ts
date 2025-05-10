// server/services/agentRegistryService.ts

import { AgentCapabilityDeclaration } from "../types/agentProtocols";

/**
 * In-memory store for registered agents. 
 * TODO: Persist this to Firestore for scalability and persistence as outlined in mcp_a2a_protocol_design.md
 */
const agentRegistry: Map<string, AgentCapabilityDeclaration> = new Map();

/**
 * Registers an agent with the system.
 * If an agent with the same agentId already exists, it will be overwritten.
 * @param declaration - The agent capability declaration.
 */
export const registerAgent = async (declaration: AgentCapabilityDeclaration): Promise<void> => {
  if (!declaration.agentId) {
    throw new Error("Agent ID is required for registration.");
  }
  agentRegistry.set(declaration.agentId, declaration);
  console.log(`Agent registered: ${declaration.displayName} (ID: ${declaration.agentId})`);
};

/**
 * Retrieves the capability declaration for a specific agent.
 * @param agentId - The unique ID of the agent.
 * @returns The agent capability declaration, or undefined if not found.
 */
export const getAgentDeclaration = async (agentId: string): Promise<AgentCapabilityDeclaration | undefined> => {
  return agentRegistry.get(agentId);
};

/**
 * Finds agents that match a specific task type.
 * @param taskType - The type of task the agent should be capable of performing.
 * @returns An array of agent capability declarations that match the task type.
 */
export const findAgentsByTaskType = async (taskType: string): Promise<AgentCapabilityDeclaration[]> => {
  const matchingAgents: AgentCapabilityDeclaration[] = [];
  agentRegistry.forEach(declaration => {
    if (declaration.capabilities.some((cap: { taskType: string; inputSchema: any; outputSchema: any; }) => cap.taskType === taskType)) {
      matchingAgents.push(declaration);
    }
  });
  return matchingAgents;
};

/**
 * Lists all registered agents.
 * @returns An array of all registered agent capability declarations.
 */
export const listAllAgents = async (): Promise<AgentCapabilityDeclaration[]> => {
  return Array.from(agentRegistry.values());
};

/**
 * Unregisters an agent from the system.
 * @param agentId - The unique ID of the agent to unregister.
 * @returns True if the agent was found and unregistered, false otherwise.
 */
export const unregisterAgent = async (agentId: string): Promise<boolean> => {
  if (agentRegistry.has(agentId)) {
    agentRegistry.delete(agentId);
    console.log(`Agent unregistered: ${agentId}`);
    return true;
  }
  return false;
};

// Example of how an agent might be registered (e.g., during server startup)
// This would typically be done by each agent module itself.
/*
(async () => {
  await registerAgent({
    agentId: "tavily-search-001",
    agentType: "tavily_web_search",
    displayName: "Tavily Web Searcher",
    version: "1.0.0",
    description: "Performs web searches using the Tavily API.",
    capabilities: [
      {
        taskType: "web_search",
        inputSchema: { type: "object", properties: { query: { type: "string" } }, required: ["query"] },
        outputSchema: { type: "object", properties: { results: { type: "array" } } }
      }
    ],
    invokeEndpoint: "internal/tavilySearch" // Placeholder for internal invocation path
  });
})();
*/
