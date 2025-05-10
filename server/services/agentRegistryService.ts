// server/services/agentRegistryService.ts

import { AgentCapabilityDeclaration } from "../types/agentProtocols";
import { db, FieldValue } from "../firebaseAdmin"; // Import Firestore database instance and FieldValue

const AGENTS_COLLECTION = "agents";

/**
 * Registers an agent with the system in Firestore.
 * If an agent with the same agentId already exists, it will be overwritten.
 * @param declaration - The agent capability declaration.
 */
export const registerAgent = async (declaration: AgentCapabilityDeclaration): Promise<void> => {
  if (!declaration.agentId) {
    throw new Error("Agent ID is required for registration.");
  }
  // Add/update timestamps
  const now = new Date().toISOString();
  const agentDataToStore = {
    ...declaration,
    registeredAt: declaration.registeredAt || now,
    updatedAt: now, // Keep track of the last update to this record
  };

  try {
    await db.collection(AGENTS_COLLECTION).doc(declaration.agentId).set(agentDataToStore);
    console.log(`Agent registered/updated in Firestore: ${declaration.displayName} (ID: ${declaration.agentId})`);
  } catch (error) {
    console.error(`Error registering agent ${declaration.agentId} in Firestore:`, error);
    throw error; // Re-throw the error for upstream handling
  }
};

/**
 * Retrieves the capability declaration for a specific agent from Firestore.
 * @param agentId - The unique ID of the agent.
 * @returns The agent capability declaration, or undefined if not found.
 */
export const getAgentDeclaration = async (agentId: string): Promise<AgentCapabilityDeclaration | undefined> => {
  try {
    const agentDoc = await db.collection(AGENTS_COLLECTION).doc(agentId).get();
    if (!agentDoc.exists) {
      console.log(`Agent with ID ${agentId} not found in Firestore.`);
      return undefined;
    }
    return agentDoc.data() as AgentCapabilityDeclaration;
  } catch (error) {
    console.error(`Error retrieving agent ${agentId} from Firestore:`, error);
    throw error;
  }
};

/**
 * Finds agents that match a specific task type from Firestore.
 * @param taskType - The type of task the agent should be capable of performing.
 * @returns An array of agent capability declarations that match the task type.
 */
export const findAgentsByTaskType = async (taskType: string): Promise<AgentCapabilityDeclaration[]> => {
  const matchingAgents: AgentCapabilityDeclaration[] = [];
  try {
    const snapshot = await db.collection(AGENTS_COLLECTION)
      .where("capabilities", "array-contains-any", [{ taskType: taskType }]) // This query needs careful construction based on how capabilities are structured.
      .get();
    
    // Firestore `array-contains-any` is not ideal for matching nested objects directly with a specific property value.
    // A more robust way is to fetch all agents and filter, or structure capabilities differently.
    // For now, let's fetch all and filter, or assume a simpler capabilities structure if possible.
    // The design document suggests `capabilities: Array<{ taskType: string; ... }>`
    // A direct query for a nested field like `capabilities.taskType` is not standard in Firestore without specific indexing or data duplication.
    // We will fetch all and filter for simplicity and correctness with the current structure.

    const allAgentsSnapshot = await db.collection(AGENTS_COLLECTION).get();
    allAgentsSnapshot.forEach(doc => {
      const declaration = doc.data() as AgentCapabilityDeclaration;
      if (declaration.capabilities && declaration.capabilities.some(cap => cap.taskType === taskType)) {
        matchingAgents.push(declaration);
      }
    });

  } catch (error) {
    console.error(`Error finding agents by task type "${taskType}" in Firestore:`, error);
    throw error;
  }
  return matchingAgents;
};

/**
 * Lists all registered agents from Firestore.
 * @returns An array of all registered agent capability declarations.
 */
export const listAllAgents = async (): Promise<AgentCapabilityDeclaration[]> => {
  const allAgents: AgentCapabilityDeclaration[] = [];
  try {
    const snapshot = await db.collection(AGENTS_COLLECTION).get();
    snapshot.forEach(doc => {
      allAgents.push(doc.data() as AgentCapabilityDeclaration);
    });
  } catch (error) {
    console.error("Error listing all agents from Firestore:", error);
    throw error;
  }
  return allAgents;
};

/**
 * Unregisters an agent from the system by deleting it from Firestore.
 * @param agentId - The unique ID of the agent to unregister.
 * @returns True if the agent was found and unregistered, false otherwise (though Firestore delete won't error if doc doesn't exist).
 */
export const unregisterAgent = async (agentId: string): Promise<boolean> => {
  try {
    // Check if agent exists first to provide a more accurate boolean return, though not strictly necessary for delete.
    const agentDoc = await db.collection(AGENTS_COLLECTION).doc(agentId).get();
    if (!agentDoc.exists) {
      console.log(`Agent with ID ${agentId} not found in Firestore for unregistration.`);
      return false;
    }
    await db.collection(AGENTS_COLLECTION).doc(agentId).delete();
    console.log(`Agent unregistered from Firestore: ${agentId}`);
    return true;
  } catch (error) {
    console.error(`Error unregistering agent ${agentId} from Firestore:`, error);
    throw error;
  }
};

/**
 * Updates the last heartbeat timestamp for a given agent.
 * @param agentId The ID of the agent.
 * @returns Promise<void>
 */
export const updateAgentHeartbeat = async (agentId: string): Promise<void> => {
    const agentRef = db.collection(AGENTS_COLLECTION).doc(agentId);
    try {
        await agentRef.update({
            lastHeartbeatAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        });
        console.log(`Agent heartbeat updated for ${agentId}`);
    } catch (error) {
        console.error(`Error updating heartbeat for agent ${agentId}:`, error);
        // Decide if this should throw or just log, depending on how critical heartbeat failures are.
        // For now, log and continue.
    }
};

// Example of how an agent might be registered (e.g., during server startup)
// This would typically be done by each agent module itself, calling this service.
/*
(async () => {
  try {
    await registerAgent({
      agentId: "tavily-search-001",
      agentType: "tavily_web_search",
      displayName: "Tavily Web Searcher",
      version: "1.0.0",
      description: "Performs web searches using the Tavily API.",
      supportedProtocols: ["mcp_v1.1"],
      capabilities: [
        {
          taskType: "web_search",
          inputSchema: { type: "object", properties: { query: { type: "string" } }, required: ["query"] },
          outputSchema: { type: "object", properties: { results: { type: "array" } } }
        }
      ],
      // invokeEndpoint: "internal/tavilySearch" // Placeholder for internal invocation path
      // registeredAt and updatedAt will be handled by the service
    });
  } catch (e) {
    console.error("Failed to register example agent during startup:", e);
  }
})();
*/

