# Lemur: MCP and A2A Protocol Design

This document details the design for the Multi-Agent Control Protocol (MCP) and Agent-to-Agent (A2A) communication protocols for the Lemur application. It builds upon the concepts outlined in `advanced_features_proposal.md`.

## 1. Core Principles

*   **Modularity:** Agents should be self-contained and expose clear capabilities.
*   **Extensibility:** The system should easily accommodate new agents and tools.
*   **Asynchronous Operations:** Many research tasks are long-running; protocols must support asynchronous execution and callbacks/notifications.
*   **Standardization:** Clear, versioned schemas for messages and data interchange.
*   **Orchestration:** A central orchestrator (Lemur backend) will manage high-level task decomposition and agent coordination, while A2A allows for more direct, fine-grained collaboration.

## 2. Data Structures (JSON Schema)

### 2.1. Agent Capability Declaration

Agents will register their capabilities with the orchestrator.

```json
{
  "agentId": "string (unique ID for the agent instance)",
  "agentType": "string (e.g., 'tavily_web_search', 'serper_scholar_search', 'groq_summarizer', 'data_extractor_v1')",
  "displayName": "string (Human-readable name)",
  "version": "string (e.g., '1.0.0')",
  "description": "string (Brief description of what the agent does)",
  "capabilities": [
    {
      "taskType": "string (e.g., 'web_search', 'academic_search', 'summarize_text', 'extract_entities')",
      "inputSchema": { "$ref": "#/definitions/taskInputSchemas/webSearchInput" }, // JSON schema for expected input
      "outputSchema": { "$ref": "#/definitions/taskOutputSchemas/webSearchOutput" } // JSON schema for produced output
    }
    // ... more capabilities
  ],
  "configurationSchema": { "$ref": "#/definitions/agentConfigSchemas/tavilyConfig" }, // Optional: JSON schema for agent-specific configuration
  "statusEndpoint": "string (URL for health checks, optional)",
  "invokeEndpoint": "string (URL to send tasks to this agent, if it's an external service)"
}
```

*   **`definitions`**: This section (not shown for brevity) would contain detailed JSON schemas for various `taskInputSchemas`, `taskOutputSchemas`, and `agentConfigSchemas`.

### 2.2. Task Definition (MCP)

Used by the orchestrator to assign tasks to agents.

```json
{
  "taskId": "string (unique ID for this specific task instance)",
  "parentResearchId": "string (ID of the overarching research project)",
  "taskType": "string (e.g., 'web_search', 'summarize_text')",
  "assignedToAgentType": "string (e.g., 'tavily_web_search')", // Optional: orchestrator can pick best agent
  "assignedToAgentId": "string", // Specific agent instance ID, if known
  "priority": "integer (e.g., 0-high, 1-medium, 2-low)",
  "timeoutSeconds": "integer (Optional)",
  "inputData": {
    // ... task-specific input, conforming to the agent's declared inputSchema for this taskType
    "query": "example search query",
    "search_depth": "advanced"
  },
  "statusCallbackUrl": "string (URL for the agent to post status updates)",
  "resultWebhookUrl": "string (URL for the agent to post final results)",
  "createdAt": "timestamp",
  "maxRetries": "integer (default 0)"
}
```

### 2.3. Task Status Update (MCP & A2A)

Used by agents to report progress.

```json
{
  "taskId": "string",
  "agentId": "string",
  "timestamp": "timestamp",
  "status": "string (e.g., 'received', 'in_progress', 'completed', 'failed', 'retrying')",
  "progressPercentage": "integer (0-100, optional)",
  "message": "string (Optional human-readable status message)",
  "intermediateResults": [
    // ... any partial results, if applicable
  ]
}
```

### 2.4. Task Result (MCP & A2A)

Used by agents to deliver final results.

```json
{
  "taskId": "string",
  "agentId": "string",
  "timestamp": "timestamp",
  "status": "string ('completed' or 'failed')",
  "outputData": {
    // ... task-specific output, conforming to the agent's declared outputSchema
  },
  "errorDetails": {
    // ... present if status is 'failed'
    "errorCode": "string",
    "errorMessage": "string"
  }
}
```

### 2.5. A2A Message

For direct communication between agents.

```json
{
  "messageId": "string (unique ID for the message)",
  "senderAgentId": "string",
  "recipientAgentId": "string",
  "timestamp": "timestamp",
  "conversationId": "string (Optional, to group related messages)",
  "messageType": "string (e.g., 'service_request', 'service_response', 'data_query', 'data_response', 'notification')",
  "payloadSchema": "string (URI to JSON schema for the payload, optional)",
  "payload": {
    // ... message-specific content
  },
  "requiresAck": "boolean (default false)"
}
```

## 3. Orchestration Logic (MCP - Lemur Backend)

1.  **Research Request Intake:** User submits a research query (e.g., via `/api/deep-research` or a new endpoint).
2.  **Project Initialization:** Create a `DeepResearchProject` document in Firestore.
3.  **Task Decomposition:** The orchestrator (a new module in `server/utils/` or `server/services/`) analyzes the query and the goal. It breaks it down into a sequence or graph of tasks.
    *   Initially, this might be a predefined strategy (e.g., Web Search -> Extract Content -> Summarize).
    *   Later, a meta-agent could perform this decomposition dynamically.
4.  **Agent Discovery & Selection:** For each task, the orchestrator queries an "Agent Registry" (new Firestore collection) to find suitable agents based on `taskType` and capabilities.
5.  **Task Dispatch:** Orchestrator creates `TaskDefinition` objects and sends them to selected agents (either via direct function calls if agents are internal modules, or HTTP requests to `invokeEndpoint` if external).
6.  **Status Monitoring:** Orchestrator listens for status updates on `statusCallbackUrl` or polls agent status.
7.  **Result Handling:** Orchestrator receives results on `resultWebhookUrl`.
    *   Stores results in Firestore, linked to the `DeepResearchProject` and the specific `Task`.
    *   If a task is part of a chain, its output becomes the input for the next task.
8.  **Aggregation & Final Output:** Once all critical tasks are complete, the orchestrator (or a dedicated synthesis agent) compiles the final research report.
9.  **User Notification:** Update the `DeepResearchProject` status to 'completed' and notify the user.

## 4. Agent Implementation Considerations

*   **Internal Agents:** Existing functionalities like `tavilySearch`, `serperGoogleScholarSearch`, `groqSearchWithTiers` can be wrapped as internal agents. They would conform to the Task and Result schemas.
*   **External Agents:** If Lemur needs to integrate with external, independently running agent services, they must expose an `invokeEndpoint` and honor the callback/webhook URLs.
*   **Statefulness:** Agents might need to maintain their own state for complex tasks. This state should ideally be stored persistently (e.g., in Firestore) if the agent needs to be resumable.

## 5. A2A Communication Flow Example

*Scenario: Agent A (WebSearcher) finds several documents. Agent B (EntityExtractor) is tasked with extracting entities from these documents. Agent A could directly send the document content to Agent B.* 

1.  **Discovery (Optional):** Agent A might query the Agent Registry for an agent with `extract_entities` capability if it doesn't know Agent B's ID.
2.  **Service Request:** Agent A constructs an A2A `service_request` message to Agent B.
    *   `recipientAgentId`: Agent B's ID
    *   `messageType`: `'service_request'`
    *   `payload`: `{ "taskType": "extract_entities", "documentText": "..." }`
3.  **Processing:** Agent B receives the message, processes the document text.
4.  **Service Response:** Agent B sends an A2A `service_response` message back to Agent A.
    *   `recipientAgentId`: Agent A's ID
    *   `messageType`: `'service_response'`
    *   `payload`: `{ "entities": [...] }`

## 6. Database Schema Additions (Firestore)

*   **`AgentRegistry` Collection:** Stores `AgentCapabilityDeclaration` documents.
    *   `agentId` as document ID.
*   **`TaskQueue` Collection (Optional):** Could be used by the orchestrator to manage pending tasks if not directly invoking agents.
*   **`DeepResearchProjects` Collection (enhancements):**
    *   Add a subcollection `tasks` to store individual `TaskDefinition` and `TaskResult` documents related to the project.
    *   Add fields for overall progress, aggregated results, error logs.
*   **`A2AMessages` Collection (Optional, for logging/auditing):** Store A2A messages if persistence is needed beyond transient communication.

## 7. Initial Implementation Steps

1.  **Define Core Schemas:** Finalize and implement TypeScript interfaces/types for the data structures defined above.
2.  **Develop Agent Registry:** Create Firestore setup for `AgentRegistry` and basic functions to register/query agents.
3.  **Refactor an Existing Tool as an Internal Agent:** Wrap `tavilySearch` as a first internal agent. This involves:
    *   Creating its `AgentCapabilityDeclaration`.
    *   Modifying its input/output to conform to the new Task/Result schemas.
    *   Updating the orchestrator to dispatch tasks to it.
4.  **Basic Orchestrator Logic:** Implement the initial task decomposition (e.g., simple linear chain) and dispatch logic in the backend.
5.  **API Endpoint for Orchestration:** Create a new API endpoint (e.g., `/api/orchestrated-research`) to trigger these multi-agent workflows.

This design provides a foundation. It will evolve as specific agents and more complex interaction patterns are developed.

