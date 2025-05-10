// server/types/agentProtocols.ts

/**
<<<<<<< HEAD
 * Represents the declaration of an agent's capabilities.
=======
 * Standardized Message Envelope for all MCP and A2A communications.
 */
export interface MessageEnvelope<T_Payload> {
  messageId: string; // Unique message ID (UUID)
  protocolVersion: string; // Version of this protocol, e.g., "1.1"
  timestamp: string; // ISO8601 datetime string
  senderAgentId: string;
  recipientAgentId?: string | null; // Null for broadcast or messages to the orchestrator itself
  messageType: string; // e.g., "task_dispatch", "task_status", "task_result", "a2a_query", "a2a_response"
  correlationId?: string | null; // UUID to correlate requests and responses
  securityContext?: { // Security-related information
    token?: string; // JWT or API key if applicable for inter-service calls
    // signature?: string; // For message integrity, TBD
  };
  payload: T_Payload; // Message-specific content
}

/**
 * Represents the declaration of an agent's capabilities.
 * To be stored persistently (e.g., in Firestore).
>>>>>>> origin/development
 */
export interface AgentCapabilityDeclaration {
  agentId: string; // unique ID for the agent instance
  agentType: string; // e.g., 'tavily_web_search', 'serper_scholar_search', 'groq_summarizer'
  displayName: string; // Human-readable name
  version: string; // e.g., '1.0.0'
  description: string; // Brief description of what the agent does
<<<<<<< HEAD
  capabilities: Array<{
    taskType: string; // e.g., 'web_search', 'academic_search', 'summarize_text'
    inputSchema: any; // JSON schema for expected input (can be more specific later)
    outputSchema: any; // JSON schema for produced output (can be more specific later)
  }>;
  configurationSchema?: any; // Optional: JSON schema for agent-specific configuration
  statusEndpoint?: string; // URL for health checks, optional
  invokeEndpoint?: string; // URL to send tasks to this agent, if it's an external service
=======
  supportedProtocols: string[]; // e.g., ["mcp_v1.1", "a2a_v1.1"]
  dynamicCapabilities?: boolean; // True if agent can learn/add new task types at runtime
  capabilities: Array<{
    taskType: string; // e.g., 'web_search', 'academic_search', 'summarize_text'
    description?: string; // Optional description of the specific task capability
    inputSchema: any; // JSON schema for expected input
    outputSchema: any; // JSON schema for produced output
  }>;
  configurationSchema?: any; // Optional: JSON schema for agent-specific configuration
  statusEndpoint?: string; // URL for health checks, optional (for external agents)
  invokeEndpoint?: string; // URL to send tasks to this agent, if it's an external service
  rateLimits?: { // Optional information on API rate limits
    requestsPerMinute?: number;
    concurrentRequests?: number;
  };
  authenticationMethods?: Array<'oauth2' | 'apiKey' | 'internal_jwt'>; // For external or secured internal agents
  registeredAt: string; // ISO8601 datetime string
  lastHeartbeatAt?: string; // ISO8601 datetime string, updated by health checks
>>>>>>> origin/development
}

/**
 * Defines a task to be assigned to an agent by the orchestrator.
<<<<<<< HEAD
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
=======
 * To be stored persistently (e.g., in Firestore).
 */
export interface TaskDefinition {
  taskId: string; // unique ID for this specific task instance (UUID)
  parentResearchId: string; // ID of the overarching research project (UUID)
  taskType: string; // e.g., 'web_search', 'summarize_text'
  assignedToAgentType?: string; // Optional: orchestrator can pick best agent based on this type
  assignedToAgentId?: string; // Specific agent instance ID, if pre-assigned or after assignment
  priority: number; // e.g., 0-high, 1-medium, 2-low
  timeoutSeconds?: number; // Optional, task execution timeout
  inputData: any; // task-specific input, conforming to the agent's declared inputSchema
  statusCallbackUrl?: string; // URL for the agent to post status updates (if external or asynchronous)
  resultWebhookUrl?: string; // URL for the agent to post final results (if external or asynchronous)
  createdAt: string; // ISO8601 datetime string
  updatedAt?: string; // ISO8601 datetime string
  maxRetries?: number; // default 0
  retryCount?: number; // current number of retries attempted
  status: TaskLifecycleStatus; // Current status of the task
  dependsOnTaskIds?: string[]; // Array of taskIds that must be completed before this task can start
  outputArtifacts?: Array<{ name: string, artifactId: string, storagePath: string }>; // References to stored outputs
}

export type TaskLifecycleStatus = 
  | 'pending_assignment' 
  | 'assigned' 
  | 'in_progress' 
  | 'paused' 
  | 'completed' 
  | 'failed' 
  | 'cancelled' 
  | 'retrying';

/**
 * Represents a status update from an agent regarding a task.
 */
export interface TaskStatusUpdatePayload {
  taskId: string;
  // agentId is in the envelope
  newStatus: TaskLifecycleStatus;
>>>>>>> origin/development
  progressPercentage?: number; // 0-100, optional
  message?: string; // Optional human-readable status message
  intermediateResults?: any[]; // any partial results, if applicable
}

/**
 * Represents the final result of a task executed by an agent.
 */
<<<<<<< HEAD
export interface TaskResult {
  taskId: string;
  agentId: string;
  timestamp: number;
  status: 'completed' | 'failed';
  outputData?: any; // task-specific output, conforming to the agent's declared outputSchema
  errorDetails?: {
    errorCode: string;
    errorMessage: string;
=======
export interface TaskResultPayload {
  taskId: string;
  // agentId is in the envelope
  finalStatus: 'completed' | 'failed'; // Should align with TaskLifecycleStatus
  outputData?: any; // task-specific output, conforming to the agent's declared outputSchema
  errorDetails?: {
    errorCode: string; // Standardized error code
    errorMessage: string;
    errorStackTrace?: string; // Optional, for debugging
>>>>>>> origin/development
  }; // present if status is 'failed'
}

/**
 * Defines a message for direct Agent-to-Agent (A2A) communication.
 */
<<<<<<< HEAD
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
=======
export type A2APerformative = 
  | 'request' 
  | 'inform' 
  | 'query_ref' // Query for a reference/resource
  | 'query_if'  // Query if a statement is true
  | 'propose' 
  | 'accept_proposal' 
  | 'reject_proposal' 
  | 'subscribe' // Request to subscribe to events/updates
  | 'notify'    // Notification of an event
  | 'failure'   // Indicates failure of a previous request
  | 'confirm'   // Confirms a previous action
  | 'disconfirm'; // Disconfirms a previous action

export interface A2AMessagePayload {
  // messageId, senderAgentId, recipientAgentId, timestamp, conversationId are in the envelope
  performative: A2APerformative;
  conversationId?: string; // Optional, to group related messages, can also be in envelope if preferred
  inReplyToMessageId?: string; // ID of the message this is a reply to
  language?: string; // e.g., 'en', 'json-schema' for payload content language
  ontology?: string; // Ontology used for the payload content
  payloadSchema?: string; // URI to JSON schema for the payload, optional
  // payload itself is part of the generic MessageEnvelope<A2AMessagePayload>
  content: any; // message-specific content, structured according to performative and ontology/schema
  requiresAck?: boolean; // default false
}

// --- Concrete Payload Examples (can be expanded significantly) ---

>>>>>>> origin/development
export interface WebSearchInput {
  query: string;
  search_depth?: 'basic' | 'advanced';
  max_results?: number;
<<<<<<< HEAD
=======
  includeDomains?: string[];
  excludeDomains?: string[];
>>>>>>> origin/development
}

export interface WebSearchOutput {
  results: Array<{
    title: string;
    url: string;
    snippet?: string;
    content?: string; // If content is fetched
<<<<<<< HEAD
  }>;
  summary?: string;
}

export interface SummarizeTextInput {
  text: string;
  maxLength?: number;
=======
    score?: number;
    raw_content?: any;
  }>;
  summary?: string;
  relatedQueries?: string[];
}

export interface SummarizeTextInput {
  text?: string;
  textArtifactId?: string; // Reference to text stored in artifact store
  maxLength?: number;
  minLength?: number;
  format?: 'paragraph' | 'bullet_points';
>>>>>>> origin/development
}

export interface SummarizeTextOutput {
  summary: string;
<<<<<<< HEAD
}
=======
  summaryArtifactId?: string; // Reference to summary stored in artifact store
}

// --- Orchestrator Specific Types (not strictly agent protocols but related) ---

export interface DeepResearchProject {
  projectId: string; // UUID
  userId: string; // Firebase User UID
  originalQuery: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'archived';
  // tasks: TaskDefinition[]; // Tasks will be a sub-collection in Firestore
  // results: TaskResult[]; // Results will be part of task documents or a sub-collection
  createdAt: string; // ISO8601
  updatedAt: string; // ISO8601
  finalReportId?: string; // Reference to a final report artifact
  configuration?: any; // Project-specific configurations
}

>>>>>>> origin/development
