# Lemur Documentation

This directory contains comprehensive documentation for the Lemur search engine project.

## Documentation Structure

### `/docs`
- Main documentation directory
- `index.md` - Documentation homepage with navigation
- `README.md` - This file
- `advanced_features_review.md` - Comprehensive review of proposed advanced features
- `tool_page_implementation_guide.md` - Detailed guide for implementing the Tool Page
- `agent_development_guide.md` - Guide for developing new agents
- `mcp_a2a_protocol_design.md` - Design specification for MCP and A2A protocols
- `mcp_a2a_protocol_enhancements_design.md` - Enhancements to the MCP and A2A protocols
- `lemur_enhancements_design_v2.md` - Comprehensive design for Lemur enhancements

### `/docs/api`
- API reference documentation
- Details on REST API, endpoints, parameters, and responses
- Protocol integration documentation (MCP, A2A)

### `/docs/architecture`
- Technical architecture documentation
- System components and their interactions
- Backend architecture details

### `/docs/development`
- Product requirements document
- Development guidelines
- Project planning documentation

### `/docs/protocols`
- MCP and A2A protocol integration details
- Configuration examples
- Protocol specifications

### `/docs/design`
- Design guidelines
- Color scheme specification
- UI wireframes

## Getting Started

Begin by reviewing the `index.md` file for an overview of all available documentation.

For developers, the recommended reading order is:

1. Product Requirements Document (`/docs/development/product-requirements.md`)
2. Search Architecture (`/docs/architecture/search-architecture.md`)
3. Advanced Features Review (`/docs/advanced_features_review.md`)
4. MCP and A2A Protocol Design (`/docs/mcp_a2a_protocol_design.md`)
5. API Reference (`/docs/api/reference.md`)

## Advanced Features

Lemur is being enhanced with advanced features to transform it from a search engine to a sophisticated multi-agent research platform:

### Tool Page
A centralized hub for users to manage, configure, and interact with research tools and AI agents. See `tool_page_implementation_guide.md` for implementation details.

### Multi-Agent Control Protocol (MCP)
A protocol that defines how a central orchestrator manages multiple specialized agents to accomplish complex research tasks. See `mcp_a2a_protocol_design.md` and `mcp_a2a_protocol_enhancements_design.md` for design specifications.

### Agent-to-Agent (A2A) Communication
A protocol enabling direct communication between specialized agents for more efficient collaboration. See `mcp_a2a_protocol_design.md` for details.

### Agent Development
Guidelines and templates for creating new specialized agents. See `agent_development_guide.md` for a comprehensive development guide.

## Implementation Roadmap

The advanced features are planned to be implemented in phases:

1. Foundation (1-2 months) - Core data structures and agent interfaces
2. Basic Multi-Agent System (2-3 months) - Task management, basic A2A messaging, simplified Tool Page
3. Advanced Features (3-4 months) - Workflow Builder, external agent support, advanced orchestration
4. Refinement and Scaling (2-3 months) - Performance optimization, security enhancements, developer tools

For detailed implementation plans, see `advanced_features_review.md`.
