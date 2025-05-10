// server/types/agentProtocols.ts

/**
 * Represents the declaration of an agent's capabilities.
 */
export interface AgentCapabilityDeclaration {
  agentId: string; // unique ID for the agent instance
  agentType: string; // e.g., 'tavily_web_search', 'serper_scholar_search', 'groq_summarizer'
  displayName: string; // Human-readable name
  version: string; // e.g., '1.0.0'
  description: string; // Brief description of what the agent does
  capabilities: Array<{
    taskType: string; // e.g., 'web_search', 'academic_search', 'summarize_text'
    inputSchema: any; // JSON schema for expected input (can be more specific later)
    outputSchema: any; // JSON schema for produced output (can be more specific later)
  }>;
  configurationSchema?: any; // Optional: JSON schema for agent-specific configuration
  statusEndpoint?: string; // URL for health checks, optional
  invokeEndpoint?: string; // URL to send tasks to this agent, if it's an external service
}

/**
 * Defines a task to be assigned to an agent by the orchestrator.
 */
export interface TaskDefinition {
  taskId: string; // unique ID for this specific task instance
  parentResearchId: string; // ID of the overarching research project
  taskType: string; // e.g., 'web_search', 'summarize_text'
  assignedToAgentType?: string; // Optional: orchestrator can pick best agent
  assignedToAgentId?: string; // Specific agent instance ID, if known
  priority: number; // e.g., 0-high, 1-medium, 2-low
  timeoutSeconds?: number; // Optional
  inputData: any; // task-specific input, conforming to the agent's declared inputSchema
  statusCallbackUrl?: string; // URL for the agent to post status updates
  resultWebhookUrl?: string; // URL for the agent to post final results
  createdAt: number; // timestamp
  maxRetries?: number; // default 0
}

/**
 * Represents a status update from an agent regarding a task.
 */
export interface TaskStatusUpdate {
  taskId: string;
  agentId: string;
  timestamp: number;
  status: 'received' | 'in_progress' | 'completed' | 'failed' | 'retrying';
  progressPercentage?: number; // 0-100, optional
  message?: string; // Optional human-readable status message
  intermediateResults?: any[]; // any partial results, if applicable
}

/**
 * Represents the final result of a task executed by an agent.
 */
export interface TaskResult {
  taskId: string;
  agentId: string;
  timestamp: number;
  status: 'completed' | 'failed';
  outputData?: any; // task-specific output, conforming to the agent's declared outputSchema
  errorDetails?: {
    errorCode: string;
    errorMessage: string;
  }; // present if status is 'failed'
}

/**
 * Defines a message for direct Agent-to-Agent (A2A) communication.
 */
export interface A2AMessage {
  messageId: string; // unique ID for the message
  senderAgentId: string;
  recipientAgentId: string;
  timestamp: number;
  conversationId?: string; // Optional, to group related messages
  messageType: string; // e.g., 'service_request', 'service_response', 'data_query', 'data_response', 'notification'
  payloadSchema?: string; // URI to JSON schema for the payload, optional
  payload: any; // message-specific content
  requiresAck?: boolean; // default false
}

// Placeholder for more specific input/output/config schemas
// These would be defined in more detail as agents are developed.
export interface WebSearchInput {
  query: string;
  search_depth?: 'basic' | 'advanced';
  max_results?: number;
}

export interface WebSearchOutput {
  results: Array<{
    title: string;
    url: string;
    snippet?: string;
    content?: string; // If content is fetched
  }>;
  summary?: string;
}

export interface SummarizeTextInput {
  text: string;
  maxLength?: number;
}

export interface SummarizeTextOutput {
  summary: string;
}
