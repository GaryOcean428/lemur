# Lemur API Reference

This document provides a comprehensive reference for the Lemur API and protocols. 

## REST API

The Lemur API gives you programmatic access to search functionality.

### Base URL

```
YOUR_LEMUR_DEPLOYMENT_URL
```

Replace `YOUR_LEMUR_DEPLOYMENT_URL` with the actual deployment URL of your Lemur instance.

### Endpoints

#### GET /search

Perform a search with both AI answers and traditional web results.

**Query Parameters:**

- `q` (string, required): The search query
- `mode` (string, optional): Result mode: "all" (default), "ai", or "web"
- `limit` (integer, optional): Number of web results to return (1-20, default: 10)
- `region` (string, optional): ISO country code for regional results

**Response Format:**

```json
{
  "ai": {
    "answer": "AI-generated answer text...",
    "sources": [
      {
        "title": "Source Title",
        "url": "https://example.com/source",
        "domain": "example.com"
      }
    ],
    "model": "llama-3.3-70b-versatile"
  },
  "traditional": [
    {
      "title": "Result Title",
      "url": "https://example.com/result",
      "snippet": "Preview of the content...",
      "domain": "example.com",
      "date": "May 1, 2025"
    }
  ]
}
```

## MCP Protocol Integration

MCP (Model Context Protocol) enables Lemur to connect to diverse data sources and tools while allowing external clients to access Lemur's capabilities.

### MCP Server

Lemur exposes the following endpoints for MCP clients:

- **Tool Discovery**: `/.well-known/mcp.json`
- **WebSocket/SSE**: `/mcp`

### Available Tools

- **search**: Core search functionality
- **voice_to_text**: Convert audio queries to text
- **image_analysis**: Analyze image content for search
- **result_formatter**: Format search results

### Configuration Example

Add this to your `mcp_config.json` file to connect to Lemur's MCP server:

```json
{
  "mcpServers": {
    "lemur": {
      "url": "YOUR_LEMUR_DEPLOYMENT_URL",
      "auth": {
        "type": "bearer",
        "token": "YOUR_API_KEY"
      },
      "tools": ["search", "voice_to_text", "image_analysis", "result_formatter"]
    }
  }
}
```

## A2A Protocol Integration

A2A (Agent-to-Agent) is an open protocol enabling communication between opaque agentic applications, providing enterprise-grade agent ecosystems with capability discovery, user experience negotiation, and secure collaboration.

### A2A Agent Details

Lemur's AgentCard is available at:

```
YOUR_LEMUR_DEPLOYMENT_URL/.well-known/agent.json
```

### Capabilities

- **search**: Search the web and synthesize results
- **multimodal_input**: Process voice and image inputs

### Configuration Example

Add this to your configuration file to connect to Lemur's A2A server:

```json
{
  "agents": {
    "lemur": {
      "url": "YOUR_LEMUR_DEPLOYMENT_URL",
      "auth": {
        "type": "bearer",
        "token": "YOUR_API_KEY"
      },
      "capabilities": ["search", "multimodal_input"],
      "discoveryPath": "/.well-known/agent.json"
    }
  }
}
```

### A2A Endpoints

- **AgentCard**: `GET /.well-known/agent.json` - Get agent capabilities and metadata
- **Task Management**:
  - `POST /tasks/send` - Create a new task
  - `GET /tasks/{task_id}` - Get task status and results

## Authentication & Security

### Authentication Methods

Lemur supports the following authentication methods:

- **Bearer Token**: OAuth 2.0 tokens
- **API Key**: For server-to-server communication

### Security Features

- **Token-based Authentication**: Secure access control
- **Tool-level Access Control**: Fine-grained permissions
- **Request Validation**: Input validation and sanitization
- **Rate Limiting**: Prevent abuse
