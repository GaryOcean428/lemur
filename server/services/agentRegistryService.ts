// server/services/agentRegistryService.ts
import { AgentCapabilityDeclaration } from "../types/agentProtocols";
import { db } from "../firebaseAdmin"; // Import Firestore database instance

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
    registeredAt: declaration.registeredAt || now, // Keep original registration time if updating
    updatedAt: now, // Always update the last update time
    lastHeartbeatAt: now, // Initialize heartbeat on registration
  };

  try {
    await db.collection(AGENTS_COLLECTION).doc(declaration.agentId).set(agentDataToStore, { merge: true }); // Use merge:true to allow partial updates if needed
    console.log(`Agent registered/updated in Firestore: ${declaration.displayName} (ID: ${declaration.agentId})`);
  } catch (error) {
    console.error(`Error registering agent ${declaration.agentId} in Firestore:`, error);
    throw error;
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
    // Firestore query for arrays containing a specific value in a map requires specific indexing
    // or client-side filtering. Filtering all agents is simpler for now.
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
 * @returns True if the agent was found and unregistered, false otherwise.
 */
export const unregisterAgent = async (agentId: string): Promise<boolean> => {
  try {
    const agentDocRef = db.collection(AGENTS_COLLECTION).doc(agentId);
    const agentDoc = await agentDocRef.get();
    if (!agentDoc.exists) {
      console.log(`Agent with ID ${agentId} not found in Firestore for unregistration.`);
      return false;
    }
    await agentDocRef.delete();
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
        // Check if document exists before updating to prevent creating new docs on heartbeat
        const agentDoc = await agentRef.get();
        if (!agentDoc.exists) {
            console.warn(`Agent ${agentId} not found. Cannot update heartbeat.`);
            return;
        }
        await agentRef.update({
            lastHeartbeatAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(), // Also update the general updatedAt timestamp
        });
        // console.log(`Agent heartbeat updated for ${agentId}`); // Can be too verbose
    } catch (error) {
        console.error(`Error updating heartbeat for agent ${agentId}:`, error);
    }
};
