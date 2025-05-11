# Agent Development Guide for Lemur

**Date:** May 10, 2025

## 1. Introduction

This guide provides instructions and best practices for developing agents compatible with Lemur's Multi-Agent Control Protocol (MCP) and Agent-to-Agent (A2A) communication protocols. It is intended for developers looking to extend Lemur's capabilities by creating new specialized agents.

## 2. Agent Architecture Overview

A Lemur agent is a specialized component that performs specific tasks within the research process. Agents can:

- Process search queries
- Analyze and transform data
- Generate content or visualizations
- Interface with external APIs
- Collaborate with other agents

Each agent must implement the standard interfaces defined by the MCP and A2A protocols to ensure seamless integration with the Lemur ecosystem.

## 3. Agent Types

Lemur supports several types of agents:

### 3.1 Internal Agents

- Built directly into the Lemur backend
- Implemented as TypeScript/JavaScript modules
- Run in the same process as the orchestrator
- Example: TavilySearchAgent, GroqSummarizer

### 3.2 Function Agents

- Deployed as serverless functions (Firebase Functions)
- Can scale independently
- Communicate via HTTP with the orchestrator
- Example: DeepResearchAgent, EntityExtractor

### 3.3 External Agents

- Hosted outside the Lemur environment
- Expose compatible APIs that adhere to MCP standards
- Integrated via the agent registry
- Example: Third-party specialized research tools, organization-specific agents

## 4. Creating an Internal Agent

Internal agents are the simplest to implement as they run within the Lemur backend.

### 4.1 Basic Structure

Create a new file in the `server/agents` directory with the following structure:

```typescript
// server/agents/mySpecializedAgent.ts

import { Agent, AgentCapabilityDeclaration, TaskDefinition, TaskResult, TaskStatusUpdate } from '../types/agentProtocols';

export class MySpecializedAgent implements Agent {
  // Unique identifier for this agent type
  private agentType = 'my_specialized_agent';
  
  // Agent instance ID (generated at runtime)
  private agentId: string;
  
  constructor() {
    this.agentId = `${this.agentType}_${Date.now()}`;
  }
  
  // Return this agent's capabilities
  getCapabilityDeclaration(): AgentCapabilityDeclaration {
    return {
      agentId: this.agentId,
      agentType: this.agentType,
      displayName: 'My Specialized Agent',
      version: '1.0.0',
      description: 'This agent performs specialized processing for XYZ data',
      capabilities: [
        {
          taskType: 'process_xyz_data',
          inputSchema: {
            type: 'object',
            properties: {
              data: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    // Define expected input data structure
                  }
                }
              },
              options: {
                type: 'object',
                properties: {
                  // Define configuration options
                }
              }
            },
            required: ['data']
          },
          outputSchema: {
            type: 'object',
            properties: {
              results: {
                type: 'array',
                items: {
                  // Define output data structure
                }
              },
              metadata: {
                type: 'object',
                properties: {
                  // Define output metadata
                }
              }
            },
            required: ['results']
          }
        }
      ],
      configurationSchema: {
        // Define agent-level configuration options
      }
    };
  }
  
  // Handle a task assigned to this agent
  async executeTask(task: TaskDefinition, statusCallback?: (status: TaskStatusUpdate) => void): Promise<TaskResult> {
    try {
      // Report initial status
      if (statusCallback) {
        statusCallback({
          taskId: task.taskId,
          agentId: this.agentId,
          timestamp: new Date().toISOString(),
          status: 'in_progress',
          message: 'Processing started',
          progressPercentage: 10
        });
      }
      
      // Process the task
      const inputData = task.inputData;
      
      // [Your processing logic here]
      // ...
      
      // Report progress (optional)
      if (statusCallback) {
        statusCallback({
          taskId: task.taskId,
          agentId: this.agentId,
          timestamp: new Date().toISOString(),
          status: 'in_progress',
          message: 'Processing halfway complete',
          progressPercentage: 50
        });
      }
      
      // [More processing logic]
      // ...
      
      // Return successful result
      return {
        taskId: task.taskId,
        agentId: this.agentId,
        timestamp: new Date().toISOString(),
        status: 'completed',
        outputData: {
          // Your result data here
          results: [],
          metadata: {}
        }
      };
    } catch (error) {
      console.error('Error executing task:', error);
      
      // Return error result
      return {
        taskId: task.taskId,
        agentId: this.agentId,
        timestamp: new Date().toISOString(),
        status: 'failed',
        errorDetails: {
          errorCode: 'PROCESSING_ERROR',
          errorMessage: error.message || 'An unknown error occurred'
        }
      };
    }
  }
}
```

### 4.2 Register the Agent

Agents need to be registered with the Agent Registry. This happens automatically for internal agents when the server starts:

```typescript
// server/services/registerInternalAgents.ts

import { agentRegistryService } from './agentRegistryService';
import { TavilySearchAgent } from '../agents/tavilySearchAgent';
import { GroqSummarizerAgent } from '../agents/groqSummarizerAgent';
import { MySpecializedAgent } from '../agents/mySpecializedAgent';

export async function registerInternalAgents() {
  // Register existing agents
  await agentRegistryService.registerAgent(new TavilySearchAgent());
  await agentRegistryService.registerAgent(new GroqSummarizerAgent());
  
  // Register your new agent
  await agentRegistryService.registerAgent(new MySpecializedAgent());
  
  console.log('All internal agents registered successfully');
}
```

## 5. Creating a Function Agent

Function agents run as serverless functions, allowing for better scaling and isolation.

### 5.1 Basic Structure

Create a new file in the `functions/src/agents` directory:

```typescript
// functions/src/agents/myFunctionAgent.ts

import * as functions from 'firebase-functions';
import { AgentCapabilityDeclaration, TaskDefinition, TaskResult } from '../../../server/types/agentProtocols';

// Define the agent's capabilities
const agentCapability: AgentCapabilityDeclaration = {
  agentId: 'my_function_agent',
  agentType: 'my_specialized_function',
  displayName: 'My Function Agent',
  version: '1.0.0',
  description: 'This agent performs specialized processing as a serverless function',
  capabilities: [
    {
      taskType: 'process_specialized_data',
      inputSchema: {
        // Define input schema
      },
      outputSchema: {
        // Define output schema
      }
    }
  ],
  configurationSchema: {
    // Define configuration schema
  },
  invokeEndpoint: 'https://us-central1-lemur-86e1b.cloudfunctions.net/myFunctionAgent'
};

// Export the capability endpoint for agent discovery
export const getCapability = functions.https.onRequest(async (req, res) => {
  res.json(agentCapability);
});

// Main function to execute tasks
export const executeTask = functions.https.onRequest(async (req, res) => {
  try {
    const task: TaskDefinition = req.body;
    
    // Validate task
    if (!task || !task.taskId || !task.taskType) {
      res.status(400).json({
        error: 'Invalid task definition'
      });
      return;
    }
    
    // Process the task
    // [Your processing logic here]
    // ...
    
    // Return result
    const result: TaskResult = {
      taskId: task.taskId,
      agentId: agentCapability.agentId,
      timestamp: new Date().toISOString(),
      status: 'completed',
      outputData: {
        // Your result data
      }
    };
    
    res.json(result);
  } catch (error) {
    console.error('Error executing task:', error);
    
    res.status(500).json({
      taskId: req.body.taskId,
      agentId: agentCapability.agentId,
      timestamp: new Date().toISOString(),
      status: 'failed',
      errorDetails: {
        errorCode: 'FUNCTION_ERROR',
        errorMessage: error.message || 'An unknown error occurred'
      }
    });
  }
});

// Status update webhook (optional)
export const updateStatus = functions.https.onRequest(async (req, res) => {
  // Implement if your agent supports long-running tasks with status updates
  // ...
  
  res.json({ success: true });
});
```

### 5.2 Deploy the Function

Deploy your function agent to Firebase:

```bash
firebase deploy --only functions:getCapability,functions:executeTask,functions:updateStatus
```

### 5.3 Register with Agent Registry

Function agents need to be registered manually or through an admin API:

```typescript
// Using the API (from an admin tool or setup script)
await fetch('/api/admin/agents/register', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_ADMIN_TOKEN'
  },
  body: JSON.stringify({
    agentType: 'my_specialized_function',
    discoveryEndpoint: 'https://us-central1-lemur-86e1b.cloudfunctions.net/getCapability'
  })
});
```

## 6. Creating an External Agent

External agents are hosted outside the Lemur environment but conform to the MCP protocol.

### 6.1 Implement Required Endpoints

Your external service needs to implement these endpoints:

1. **GET /capability**: Returns the `AgentCapabilityDeclaration`
2. **POST /execute**: Accepts a `TaskDefinition` and returns a `TaskResult`
3. **POST /status** (optional): Endpoint for receiving status callback requests

### 6.2 Register with Lemur

External agents are registered the same way as function agents, through the admin API.

## 7. Agent Development Best Practices

### 7.1 Error Handling

- Implement comprehensive error handling
- Use standard error codes from the MCP specification
- Provide detailed error messages for debugging
- Try to fail gracefully with partial results when possible

### 7.2 Performance Optimization

- Implement caching for expensive operations
- Use resource pooling for external API connections
- Consider implementing batching for multiple similar requests
- Add timeouts to prevent hanging operations

### 7.3 Security Considerations

- Validate all input data against your schema
- Sanitize outputs to prevent information leakage
- Implement rate limiting for external-facing agents
- Use secure connections (HTTPS) for all external communications

### 7.4 Testing

- Create unit tests for your agent's core logic
- Test with valid and invalid inputs
- Simulate various error conditions
- Test integration with the orchestrator
- Measure and benchmark performance

## 8. Agent-to-Agent (A2A) Communication

Agents can communicate directly with each other using the A2A protocol:

```typescript
// Example of one agent communicating with another

import { a2aService } from '../services/a2aService';

// In your agent's executeTask method:
async executeTask(task: TaskDefinition): Promise<TaskResult> {
  // ...
  
  // Find a suitable entity extraction agent
  const extractionAgents = await a2aService.discoverAgents('extract_entities');
  
  if (extractionAgents.length > 0) {
    const targetAgent = extractionAgents[0];
    
    // Send a request message
    const messageResult = await a2aService.sendMessage({
      messageId: `msg_${Date.now()}`,
      senderAgentId: this.agentId,
      recipientAgentId: targetAgent.agentId,
      timestamp: new Date().toISOString(),
      conversationId: task.taskId, // Use the taskId as the conversation ID
      messageType: 'service_request',
      payload: {
        taskType: 'extract_entities',
        documentText: processedText
      }
    });
    
    // Process the response
    if (messageResult && messageResult.status === 'success') {
      const entityData = messageResult.response.payload.entities;
      // Use the extracted entities...
    }
  }
  
  // ...
}
```

## 9. Agent Templates

To help you get started quickly, we provide several agent templates:

1. **Search Agent Template**: For agents that query external search APIs
2. **Transformer Agent Template**: For agents that process and transform data
3. **Generator Agent Template**: For agents that create new content or visualizations
4. **Integration Agent Template**: For agents that connect to external services

Templates are available in the `server/templates/agents` directory. Copy and modify as needed.

## 10. Troubleshooting

### 10.1 Common Issues

- **Agent not discovered**: Check registration and ensure the capability declaration is correctly formatted
- **Task execution fails**: Verify input validation and error handling
- **A2A communication fails**: Check agent IDs and message format
- **Performance issues**: Look for blocking operations, missing caching, or resource leaks

### 10.2 Debugging Tools

- Use the `/api/debug/agents` endpoint to see registered agents
- Check logs for task execution details
- Use the Agent Playground in the admin interface to test agents directly

## 11. Conclusion

By following this guide, you should be able to create new agents that integrate seamlessly with Lemur's multi-agent system. As you develop more complex agents, consider contributing to the Lemur ecosystem by sharing your implementations or suggesting improvements to the MCP and A2A protocols.

For further assistance, refer to the API documentation or join the Lemur developer community.