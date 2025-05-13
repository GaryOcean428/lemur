# Tool Page Architecture

**Date:** May 13, 2025

## Overview

This document outlines the architectural design for the Tool Page system, showing how different components interact and how the system fits into the larger Lemur platform.

## System Architecture Diagram

```
+--------------------------------------+
|            Lemur Platform            |
+--------------------------------------+
|                                      |
|  +----------+      +-------------+   |
|  |  Search  |<---->| User System |   |
|  |  Engine  |      +-------------+   |
|  +----------+            ^           |
|       ^                  |           |
|       |                  v           |
|  +----------+      +-------------+   |
|  | Database |<---->|  Auth/Tier  |   |
|  |  Layer   |      |   System    |   |
|  +----------+      +-------------+   |
|       ^                  ^           |
|       |                  |           |
+--------------------------------------+
        ^                  ^
        |                  |
+--------------------------------------+
|            Tool Page System          |
+--------------------------------------+
|                                      |
|  +-----------------------------+     |
|  |      Tool Page Router       |     |
|  +-----------------------------+     |
|                ^                     |
|                |                     |
|                v                     |
|  +-----------------------------+     |
|  |     Shared Components       |     |
|  |  +----------+ +----------+ |     |
|  |  |   Tool    | |   Tool   | |     |
|  |  | Settings  | |  Results | |     |
|  |  +----------+ +----------+ |     |
|  |  +----------+ +----------+ |     |
|  |  |   Error   | |  Loading | |     |
|  |  | Handling  | |  States  | |     |
|  |  +----------+ +----------+ |     |
|  +-----------------------------+     |
|                ^                     |
|                |                     |
|                v                     |
|  +-----------------------------+     |
|  |      Individual Tools       |     |
|  |  +----------+ +----------+ |     |
|  |  | Content  | | Citation | |     |
|  |  |Summarizer| |Generator | |     |
|  |  +----------+ +----------+ |     |
|  |  +----------+ +----------+ |     |
|  |  |  Saved   | |  Domain  | |     |
|  |  | Searches | | Research | |     |
|  |  +----------+ +----------+ |     |
|  |  +----------+ +----------+ |     |
|  |  | Research | | Content  | |     |
|  |  |Dashboard | |  Export  | |     |
|  |  +----------+ +----------+ |     |
|  |  +----------+ +----------+ |     |
|  |  |  Image   | |   News   | |     |
|  |  |  Search  | |Aggregator| |     |
|  |  +----------+ +----------+ |     |
|  |  +----------+              |     |
|  |  |  Trend   |              |     |
|  |  | Analyzer |              |     |
|  |  +----------+              |     |
|  +-----------------------------+     |
|                ^                     |
|                |                     |
|                v                     |
|  +-----------------------------+     |
|  |         API Layer           |     |
|  |  +----------+ +----------+ |     |
|  |  |   Tool   | |  Search  | |     |
|  |  | Endpoints| | Integration|     |
|  |  +----------+ +----------+ |     |
|  |  +----------+ +----------+ |     |
|  |  | Settings | | User Data| |     |
|  |  | Storage  | |  Access  | |     |
|  |  +----------+ +----------+ |     |
|  +-----------------------------+     |
|                ^                     |
|                |                     |
+--------------------------------------+
                 |
                 v
+--------------------------------------+
|         External Services            |
+--------------------------------------+
|  +----------+      +-------------+   |
|  |   Groq   |      |   Tavily    |   |
|  | Compound |      |   Search    |   |
|  +----------+      +-------------+   |
|  +----------+      +-------------+   |
|  |  Storage |      |    Other    |   |
|  | Services |      |   Services  |   |
|  +----------+      +-------------+   |
+--------------------------------------+
```

## Component Descriptions

### 1. Tool Page Router

The Tool Page Router manages navigation between different tools and ensures proper access control based on user subscription tier. It:

- Handles routes for `/tools` and all sub-routes
- Controls which tools are accessible based on user tier
- Manages the sidebar navigation and tool categories
- Passes user context to individual tool components

### 2. Shared Components

A collection of reusable UI components that ensure consistency across all tools:

- **Tool Settings:** Standardized component for tool configuration
- **Tool Results:** Display component for tool output with consistent formatting
- **Error Handling:** Error boundary components with helpful user feedback
- **Loading States:** Consistent loading indicators and progress displays

### 3. Individual Tools

Each tool is implemented as a modular component with:

- Its own route under `/tools`
- Independent UI specific to the tool's functionality
- Proper tier-based feature limitations
- Integration with shared components

### 4. API Layer

The backend service layer that supports the Tool Page functionality:

- **Tool Endpoints:** Specific API endpoints for each tool
- **Search Integration:** Connections to the main search functionality
- **Settings Storage:** Persistence of user tool preferences
- **User Data Access:** Secure access to user-specific data

### 5. External Services Integration

Connections to external services required for tool functionality:

- **Groq Compound Beta:** For AI-powered analysis and processing
- **Tavily Search:** For web search capabilities
- **Storage Services:** For document and content storage
- **Other Services:** For specialized functionality as needed

## Data Flow

### 1. Tool Initialization

```
User --> Tool Page Router --> Individual Tool
    --> API Layer (get user preferences)
    --> Render Tool UI with preferences
```

### 2. Tool Operation

```
User Input --> Individual Tool UI 
    --> API Layer (process request)
    --> External Services (if needed)
    --> API Layer (process response)
    --> Individual Tool UI (display results)
```

### 3. Settings Management

```
User Settings Change --> Tool Settings Component
    --> API Layer (save preferences)
    --> Database Layer (store preferences)
    --> API Layer (confirmation)
    --> Tool Settings Component (update UI)
```

## Technology Stack

The Tool Page system will be built using the existing technology stack:

- **Frontend:** React with Tailwind CSS and shadcn components
- **Backend:** Express.js with TypeScript
- **Database:** PostgreSQL with Drizzle ORM
- **State Management:** TanStack Query for data fetching and caching
- **Authentication:** Existing Passport.js integration
- **AI Services:** Groq Compound Beta and Compound Beta Mini

## Security Considerations

1. **Access Control**
   - All tool endpoints verify user authentication
   - Tier-based feature access control
   - Rate limiting based on user tier

2. **Data Protection**
   - Secure storage of user tool data
   - Proper input sanitization for all tool inputs
   - Output validation to prevent injection attacks

3. **API Security**
   - Proper validation of all API inputs
   - CSRF protection for all endpoints
   - Input length and content restrictions

## Performance Optimization

1. **Caching Strategy**
   - Client-side caching of tool results with TanStack Query
   - Server-side caching of expensive operations
   - Proper cache invalidation strategies

2. **Lazy Loading**
   - Load tool components only when needed
   - Progressively load tool capabilities
   - On-demand loading of external resources

3. **Resource Management**
   - Efficient use of AI service quotas based on user tier
   - Proper timeouts for external service calls
   - Graceful degradation when services are unavailable

## Conclusion

The Tool Page system is designed as a modular, extensible platform for specialized research and content processing tools. By leveraging shared components and services, we can efficiently implement a wide range of tools while maintaining consistency in user experience and performance. The architecture supports progressive enhancement, allowing us to start with core functionality and add advanced features over time.

The integration with existing Lemur systems ensures proper user authentication, tier-based access control, and seamless interaction with the main search functionality. This comprehensive approach will deliver a cohesive user experience while enabling powerful specialized tools.