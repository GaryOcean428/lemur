# Lemur: MCP and A2A Protocol Integration Architecture

## Diagnostic Overview

The Lemur webapp requires bidirectional protocol integration capabilities to function both as a consumer of external AI services and as a service provider to other AI applications. Based on analysis of the technical requirements, I'll outline a comprehensive implementation architecture for both MCP (Model Context Protocol) and A2A (Agent-to-Agent) integration.

## Protocol Foundation Architecture

### 1. MCP Integration Architecture

MCP enables Lemur to connect to diverse data sources and tools while allowing external clients to access Lemur's capabilities. The Model Context Protocol is an open standard for connecting AI assistants to systems where data lives, including content repositories, tools, and development environments.

#### 1.1 Inbound MCP Connection (Being Connected To)

To expose Lemur's services via MCP:

```
LEMUR MCP SERVER ARCHITECTURE
┌────────────────────────────────────────────────────────┐
│                Lemur MCP Server                        │
├────────────────────────────────────────────────────────┤
│ ┌─────────────┐   ┌────────────────┐   ┌────────────┐  │
│ │ HTTP/SSE    │   │ Tool Registry  │   │ Auth       │  │
│ │ Endpoint    │   │                │   │ Manager    │  │
│ └─────────────┘   └────────────────┘   └────────────┘  │
│ ┌─────────────────────────────────────────────────────┐│
│ │              Tool Implementation Layer              ││
│ │  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   ││
│ │  │ Search   │  │ Multi-   │  │ Document         │   ││
│ │  │ Tools    │  │ Modal    │  │ Processing       │   ││
│ │  └──────────┘  └──────────┘  └──────────────────┘   ││
│ └─────────────────────────────────────────────────────┘│
└────────────────────────────────────────────────────────┘
```

**Implementation Requirements:**

1. **Server Endpoint Configuration:**
   - Implement WebSocket/SSE transport for real-time streaming
   - Configure tool introspection endpoints at `/.well-known/mcp.json`

2. **Tool Adapter Implementation:**
   - Build adapters for core search capabilities
   - Implement voice-to-text and image analysis tools
   - Create search result formatting tools

3. **Authentication & Security:**
   - Implement token-based authentication
   - Configure access control for tools
   - Implement rate limiting and request validation

#### 1.2 Outbound MCP Connection (Connecting To)

To consume external MCP services:

```
LEMUR MCP CLIENT ARCHITECTURE
┌────────────────────────────────────────────────────────┐
│                 Lemur MCP Client                       │
├────────────────────────────────────────────────────────┤
│ ┌─────────────┐   ┌────────────────┐   ┌────────────┐  │
│ │ Connection  │   │ Tool Discovery │   │ Credential │  │
│ │ Manager     │   │ & Registry     │   │ Vault      │  │
│ └─────────────┘   └────────────────┘   └────────────┘  │
│ ┌─────────────────────────────────────────────────────┐│
│ │              Tool Integration Layer                 ││
│ │  ┌───────────────┐  ┌──────────────┐  ┌──────────┐  ││
│ │  │ Request       │  │ Response     │  │ Error    │  ││
│ │  │ Builder       │  │ Parser       │  │ Handler  │  ││
│ │  └───────────────┘  └──────────────┘  └──────────┘  ││
│ └─────────────────────────────────────────────────────┘│
└────────────────────────────────────────────────────────┘
```

**Implementation Requirements:**

1. **Client Connection Management:**
   - Implement connection pooling for multiple MCP servers
   - Handle connection lifecycle (initialization, reconnection)
   - Implement timeout and fallback mechanisms

2. **Tool Discovery:**
   - Fetch and parse tool definitions from MCP servers
   - Maintain registry of available external tools
   - Handle tool capability updates

3. **Credential Management:**
   - Securely store and manage authentication tokens
   - Implement credential rotation
   - Handle authentication failures

### 2. A2A Integration Architecture

A2A is an open protocol enabling communication between opaque agentic applications, providing enterprise-grade agent ecosystems with capability discovery, user experience negotiation, and secure collaboration.

#### 2.1 Inbound A2A Connection (Being Connected To)

For Lemur to serve as an A2A agent:

```
LEMUR A2A SERVER ARCHITECTURE
┌────────────────────────────────────────────────────────┐
│                Lemur A2A Server                        │
├────────────────────────────────────────────────────────┤
│ ┌─────────────┐   ┌────────────────┐   ┌────────────┐  │
│ │ AgentCard   │   │ Task           │   │ Auth       │  │
│ │ Endpoint    │   │ Management     │   │ Service    │  │
│ └─────────────┘   └────────────────┘   └────────────┘  │
│ ┌─────────────────────────────────────────────────────┐│
│ │              Agent Implementation Layer             ││
│ │  ┌───────────┐  ┌───────────────┐  ┌──────────────┐ ││
│ │  │ Message   │  │ State         │  │ Artifact     │ ││
│ │  │ Handler   │  │ Management    │  │ Generator    │ ││
│ │  └───────────┘  └───────────────┘  └──────────────┘ ││
│ └─────────────────────────────────────────────────────┘│
└────────────────────────────────────────────────────────┘
```

**Implementation Requirements:**

1. **AgentCard Configuration:**
   - Expose well-known endpoint at `/.well-known/agent.json`
   - Define agent capabilities, modalities, and authentication requirements
   - Implement agent skill registration

2. **Task Management:**
   - Implement task lifecycle state machine
   - Create task persistence layer
   - Develop task queuing system for handling concurrent requests

3. **Message Processing:**
   - Implement message parsing and validation
   - Add content type handling for multimedia
   - Create message history management

#### 2.2 Outbound A2A Connection (Connecting To)

For Lemur to consume external A2A agents:

```
LEMUR A2A CLIENT ARCHITECTURE
┌────────────────────────────────────────────────────────┐
│                 Lemur A2A Client                       │
├────────────────────────────────────────────────────────┤
│ ┌─────────────┐   ┌────────────────┐   ┌────────────┐  │
│ │ Agent       │   │ Task           │   │ Auth       │  │
│ │ Discovery   │   │ Orchestration  │   │ Manager    │  │
│ └─────────────┘   └────────────────┘   └────────────┘  │
│ ┌─────────────────────────────────────────────────────┐│
│ │              Agent Integration Layer                ││
│ │  ┌───────────────┐  ┌──────────────┐  ┌──────────┐  ││
│ │  │ Message       │  │ Response     │  │ Error    │  ││
│ │  │ Builder       │  │ Processor    │  │ Handler  │  ││
│ │  └───────────────┘  └──────────────┘  └──────────┘  ││
│ └─────────────────────────────────────────────────────┘│
└────────────────────────────────────────────────────────┘
```

**Implementation Requirements:**

1. **Agent Discovery:**
   - Implement AgentCard fetching and parsing
   - Create capability matching logic
   - Build agent registry and selection algorithms

2. **Task Orchestration:**
   - Develop task creation and monitoring systems
   - Implement task state synchronization
   - Create task cancellation and cleanup mechanisms

3. **Message Construction:**
   - Build message formatting system for different modalities
   - Implement artifact handling
   - Create media conversion utilities

## Integration Implementation Details

### 1. Core Protocol Transport Layer

The foundation of both protocols requires a robust transport implementation:

```python
# protocol_transport.py
class ProtocolTransport:
    def __init__(self, protocol_type, connection_config):
        self.protocol_type = protocol_type  # "MCP" or "A2A"
        self.connection_config = connection_config
        self.session = None
        
    async def initialize_connection(self):
        if self.protocol_type == "MCP":
            # MCP uses WebSockets or SSE
            self.session = await self._create_streaming_session()
        else:
            # A2A uses HTTP with polling or SSE options
            self.session = await self._create_http_session()
            
    async def send_message(self, message_data):
        # Implementation specific to protocol
        pass
        
    async def receive_message(self):
        # Implementation specific to protocol
        pass
```

### 2. MCP Server Implementation

For Lemur to expose its capabilities to external clients:

```python
# mcp_server.py
from protocol_transport import ProtocolTransport

class LemurMCPServer:
    def __init__(self, tool_registry):
        self.tool_registry = tool_registry
        self.transport = ProtocolTransport("MCP", {
            "endpoint": "/mcp",
            "stream_type": "sse"
        })
        
    async def handle_connection(self, request):
        # Initialize MCP session
        await self.transport.initialize_connection()
        
        # Process tool calls
        while True:
            message = await self.transport.receive_message()
            if message.type == "tool_call":
                tool_result = await self._execute_tool(message.data)
                await self.transport.send_message({
                    "type": "tool_result",
                    "data": tool_result
                })
    
    async def _execute_tool(self, tool_call):
        tool_name = tool_call["name"]
        tool_args = tool_call["arguments"]
        
        # Find registered tool
        tool = self.tool_registry.get_tool(tool_name)
        if tool:
            return await tool.execute(tool_args)
        else:
            return {"error": f"Tool {tool_name} not found"}
```

### 3. A2A Server Implementation

For Lemur to be discovered and used by other agents:

```python
# a2a_server.py
import json
from fastapi import FastAPI, HTTPException, Request

app = FastAPI()

# Serve AgentCard at well-known endpoint
@app.get("/.well-known/agent.json")
async def get_agent_card():
    return {
        "name": "Lemur Search Agent",
        "description": "AI-powered search engine with traditional and AI-synthesized results",
        "version": "1.0.0",
        "auth": {
            "type": "bearer"
        },
        "capabilities": [
            {
                "name": "search",
                "description": "Search the web and synthesize results"
            },
            {
                "name": "multimodal_input",
                "description": "Process voice and image inputs"
            }
        ]
    }

# Handle task creation
@app.post("/tasks/send")
async def create_task(request: Request):
    task_data = await request.json()
    task_id = task_data.get("id", str(uuid.uuid4()))
    
    # Process the task (async)
    task_processor.process_task(task_id, task_data)
    
    # Return immediate acknowledgment
    return {
        "id": task_id,
        "state": "submitted"
    }

# Get task status
@app.get("/tasks/{task_id}")
async def get_task_status(task_id: str):
    task = task_store.get_task(task_id)
    if not task:
        raise HTTPException(404, "Task not found")
    return task
```

### 4. Cross-Protocol Integration Layer

To enable seamless interaction between both protocols:

```python
# protocol_bridge.py
class ProtocolBridge:
    def __init__(self, mcp_client, a2a_client):
        self.mcp_client = mcp_client
        self.a2a_client = a2a_client
        
    async def route_mcp_to_a2a(self, mcp_tool_call):
        """Convert MCP tool calls to A2A tasks when appropriate"""
        # Extract tool call details
        tool_name = mcp_tool_call["name"]
        tool_args = mcp_tool_call["arguments"]
        
        # Check if this should be handled by an external A2A agent
        if self._requires_external_agent(tool_name, tool_args):
            # Create A2A task
            agent = self._select_appropriate_agent(tool_name, tool_args)
            task_result = await self.a2a_client.create_task(agent, {
                "messages": [{
                    "role": "user", 
                    "content": self._convert_args_to_message(tool_args)
                }]
            })
            
            # Convert A2A result back to MCP format
            return self._convert_a2a_result_to_mcp(task_result)
            
        # Otherwise, return None to indicate the bridge doesn't handle this
        return None
        
    async def route_a2a_to_mcp(self, a2a_task):
        """Handle A2A tasks by delegating to appropriate MCP tools"""
        # Similar implementation for routing A2A tasks to MCP tools
        pass
```

### 5. Multi-Modal Input Processing

For handling voice and image inputs:

```python
# multimodal_processor.py
class MultiModalProcessor:
    def __init__(self):
        self.voice_processor = VoiceProcessor()
        self.image_processor = ImageProcessor()
        
    async def process_input(self, input_data):
        """Process different types of input and convert to text query"""
        content_type = input_data.get("type", "text")
        
        if content_type == "voice":
            return await self.voice_processor.transcribe(input_data["data"])
        elif content_type == "image":
            return await self.image_processor.analyze(input_data["data"])
        else:
            # Return text as-is
            return input_data["data"]
```

## Integration Strategy

Implementing both protocols requires a phased approach:

### Phase 1: Core Protocol Foundation
- Implement transport layers for both protocols
- Build authentication and security foundations
- Create basic discovery mechanisms
- Develop protocol bridge foundation

### Phase 2: MCP Integration
- Implement inbound MCP server capabilities
- Build outbound MCP client functionality
- Create tool adapters for Lemur core features
- Implement tool discovery and registration

### Phase 3: A2A Integration
- Implement AgentCard generation and hosting
- Build task management system
- Create message handling for different modalities
- Implement agent discovery mechanisms

### Phase 4: Advanced Features
- Add streaming results for both protocols
- Implement multi-agent orchestration
- Build advanced security features
- Create monitoring and observability layer

## Security Considerations

Security is critical for both protocols:

1. **Authentication**:
   - Implement OAuth 2.0 for both protocols
   - Add token validation and verification
   - Create role-based access controls

2. **Transport Security**:
   - Ensure TLS for all connections
   - Implement certificate validation
   - Add connection encryption

3. **Data Protection**:
   - Implement proper data sanitization
   - Add input validation at all entry points
   - Create audit logging for all operations

## Testing Strategy

Robust testing is required for protocol implementation:

1. **Unit Testing**:
   - Test protocol message serialization/deserialization
   - Verify tool execution logic
   - Validate error handling

2. **Integration Testing**:
   - Test protocol connections with mock servers
   - Verify protocol bridges function correctly
   - Validate multi-step workflows

3. **Security Testing**:
   - Perform authentication bypass testing
   - Test input validation and sanitization
   - Verify proper error handling and information disclosure

4. **Performance Testing**:
   - Measure connection handling under load
   - Test streaming performance
   - Validate concurrent request handling

## Conclusion

This architecture enables Lemur to function as both a consumer and provider of AI capabilities through MCP and A2A protocols. By implementing both protocols, Lemur can participate in the emerging ecosystem of interoperable AI agents and tools, significantly expanding its functionality and utility.