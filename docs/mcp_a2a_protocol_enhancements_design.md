# MCP/A2A Protocol Enhancements Design for Lemur

**Date:** May 09, 2025

**Version:** 1.0

## 1. Introduction

This document outlines the proposed design enhancements for the Multi-Agent Control Protocol (MCP) and Agent-to-Agent (A2A) communication protocols within the Lemur project. The design is informed by a review of the existing implementation and research into best practices for multi-agent systems. The goal is to create a more robust, scalable, secure, and extensible framework for agent collaboration.

## 2. Guiding Principles (Recap from Best Practices Research)

The design will adhere to the following principles:

*   **Standardization and Interoperability**: Use common data formats and established patterns.
*   **Clear Message Semantics**: Ensure unambiguous message structures and meanings.
*   **Contextual Awareness**: Enable agents to maintain and share relevant context.
*   **Efficient Communication**: Minimize overhead and optimize message flow.
*   **Robust Error Handling and Resilience**: Implement mechanisms for fault tolerance.
*   **Security and Trust**: Ensure secure communication and data integrity.
*   **Scalability and Performance**: Design for growth in agents and message volume.
*   **Flexibility and Adaptability**: Allow for easy extension and modification.

## 3. Proposed Enhancements

### 3.1. Enhanced Message Structures and Semantics

*   **Standardized Message Envelope**: All messages (MCP tasks, A2A messages) will use a common envelope structure:
    ```json
    {
      "messageId": "uuid", // Unique message ID
      "protocolVersion": "1.1", // Version of this protocol
      "timestamp": "iso8601_datetime",
      "senderAgentId": "string",
      "recipientAgentId": "string | null", // Null for broadcast/orchestrator messages
      "messageType": "string", // e.g., "task_dispatch", "task_status", "task_result", "a2a_query", "a2a_response"
      "correlationId": "uuid | null", // To correlate requests and responses
      "securityContext": { // Details TBD, e.g., signature, encryption info
        "token": "jwt_or_api_key_if_applicable"
      },
      "payload": { ... } // Message-specific content
    }
    ```
*   **Detailed Payload Schemas**: Each `messageType` will have a clearly defined and versioned JSON schema for its `payload`. These schemas will be centrally documented and potentially discoverable by agents.
*   **Performatives**: For A2A communication, adopt a set of standard performatives (e.g., `request`, `inform`, `query`, `propose`, `accept_proposal`, `reject_proposal`, `failure`) inspired by FIPA-ACL to clarify the intent of messages.

### 3.2. Agent Definition, Discovery, and Capability Negotiation

*   **Persistent Agent Registry**: The `agentRegistryService` will be refactored to use Firestore for persistence, as originally planned in the TODOs. This ensures agent declarations are not lost on server restart and can be managed more robustly.
*   **Enhanced AgentCapabilityDeclaration**:
    *   Add `supportedProtocols`: `["mcp_v1.1", "a2a_v1.1"]`.
    *   Add `dynamicCapabilities`: `boolean` (true if agent can learn/add new task types).
    *   More detailed `inputSchema` and `outputSchema` for each capability, possibly referencing external JSON schema definitions.
    *   `rateLimits`: Optional information on API rate limits if the agent wraps an external service.
    *   `authenticationMethods`: `["oauth2", "apiKey"]` for external agents.
*   **Service Discovery**: Implement a mechanism (e.g., a dedicated orchestrator endpoint) for agents to query the registry for other agents based on `agentType`, `taskType`, or other metadata.
*   **Capability Negotiation (Future Consideration)**: For more advanced scenarios, explore lightweight protocols for agents to negotiate specific parameters or versions of a task they can handle.

### 3.3. Task Management and Orchestration

*   **Persistent Task and Project Storage**: `researchProjects` and their associated `TaskDefinition` and `TaskResult` objects in `orchestratorService.ts` will be migrated to Firestore. This provides persistence, scalability, and better querying capabilities.
*   **Task Lifecycle Management**: Define a clearer task lifecycle (e.g., `pending_assignment`, `assigned`, `in_progress`, `paused`, `completed`, `failed`, `cancelled`) and ensure `TaskStatusUpdate` reflects these states accurately.
*   **Task Dependencies**: Introduce a mechanism to define dependencies between tasks within a `DeepResearchProject`. The orchestrator will manage the execution flow based on these dependencies (DAG execution).
    *   `TaskDefinition` to include `dependsOnTaskIds: string[]`.
*   **Retry and Dead-Letter Queues**: Implement configurable retry mechanisms for failed tasks. Tasks that repeatedly fail can be moved to a dead-letter queue (or marked as terminally failed in Firestore) for manual inspection.
*   **Asynchronous Task Handling**: Ensure the orchestrator and agents are designed for fully asynchronous operations. Callbacks (`statusCallbackUrl`, `resultWebhookUrl`) are good, but also consider WebSocket or other real-time communication for status updates for internal agents or tightly coupled UI.

### 3.4. State Management and Context Sharing

*   **Conversation Context**: For A2A interactions, the `A2AMessage` already includes a `conversationId`. The orchestrator or participating agents will be responsible for managing the state associated with a conversation.
*   **Shared Artifacts/Knowledge Base**: Introduce a concept of a shared artifact store (e.g., using Firebase Storage or a dedicated Firestore collection) where agents can publish and retrieve intermediate results or shared data relevant to a `parentResearchId` or `conversationId`. `TaskResult` and `A2AMessage` payloads can reference these artifacts by URI/ID.

### 3.5. Error Handling and Resilience

*   **Standardized Error Codes**: Define a comprehensive list of standardized error codes for `TaskResult.errorDetails.errorCode` and A2A failure messages. This will improve debugging and automated error handling.
*   **Timeouts**: Enforce `timeoutSeconds` in `TaskDefinition` more rigorously. The orchestrator should monitor task execution times and proactively mark tasks as failed if they exceed timeouts.
*   **Agent Health Checks**: Utilize the `statusEndpoint` in `AgentCapabilityDeclaration` for the orchestrator to periodically check the health of registered agents (especially external ones) and temporarily disable them if they are unresponsive.

### 3.6. Security

*   **Inter-Agent Authentication**: For A2A communication between internal agents, JWTs or a similar token-based mechanism managed by the orchestrator/identity service can be used. For external agents, API keys or OAuth2 tokens (as declared in their capabilities) will be used.
*   **Message Integrity and Confidentiality**: Enforce HTTPS for all external communication. Consider payload encryption for sensitive data in A2A messages or task inputs/outputs, especially if traversing less trusted networks.
*   **Authorization**: The orchestrator must verify that an agent is authorized to perform a requested task or access specific data. User-level permissions (via Firebase Auth) will gate project creation and access, and this context should flow down to task authorization where applicable.
*   **Input Validation**: Rigorous validation of all incoming message payloads against their defined schemas at both the orchestrator and individual agent levels.

### 3.7. Extensibility

*   **Modular Agent Design**: Continue to promote a modular design where new agents can be easily developed and registered. The enhanced `AgentCapabilityDeclaration` will aid this.
*   **Protocol Versioning**: The `protocolVersion` in the message envelope allows for future upgrades to the protocol without breaking existing agents.
*   **Plugin Architecture (Future Consideration)**: For very dynamic systems, explore a plugin-like architecture where agents can load new capabilities or communication adapters at runtime.

### 3.8. Persistence Layer (Firestore Integration)

*   **Agent Registry**: `agentRegistry` (Map in `agentRegistryService.ts`) will be replaced with a Firestore collection (e.g., `agents`).
*   **Research Projects & Tasks**: `researchProjects` (Map in `orchestratorService.ts`) will be replaced with Firestore collections (e.g., `researchProjects`, `projectTasks`, `taskResults`).
*   **Data Models**: Define clear Firestore data models corresponding to `AgentCapabilityDeclaration`, `DeepResearchProject`, `TaskDefinition`, `TaskResult`, etc.

## 4. Impact on Existing Code

Significant refactoring will be required in:

*   `server/types/agentProtocols.ts`: Update all interfaces.
*   `server/services/agentRegistryService.ts`: Implement Firestore backend.
*   `server/services/orchestratorService.ts`: Implement Firestore backend, task dependency logic, enhanced lifecycle management.
*   `server/agents/*.ts`: Update agents to conform to new message structures and error handling.
*   `server/routes/orchestratorRoutes.ts`: Adapt to new service layer logic and security considerations for agent callbacks.

## 5. Next Steps

1.  Review and refine this design document.
2.  Prioritize implementation of core enhancements (e.g., persistence, basic message structure updates).
3.  Iteratively implement and test remaining features.


