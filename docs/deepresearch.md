# Deep Research Implementation Guide

## Overview

Deep Research is a premium feature of Lemur that allows for comprehensive, multi-source information gathering and analysis similar to capabilities seen in Perplexity, OpenAI, and Grok. This document outlines the implementation details, architecture decisions, and usage guidelines for developers working on the Lemur search engine.

## Architecture

Lemur's Deep Research functionality is built on a dual-approach architecture that balances efficiency with comprehensive information gathering:

### Approach 1: Integrated Groq Compound-Beta

The primary approach leverages Groq's compound-beta model, which integrates Tavily search capabilities directly within its tool-calling framework.

**Benefits:**
- Single API call efficiency (reduced latency)
- Integrated reasoning and search
- Simplified development workflow
- Optimized for AI agents

**Implementation:**
- API call to compound-beta with structured prompt
- Parse `executed_tools` from response to extract search sources
- Format answer with proper citation linking

### Approach 2: Advanced Multi-Agent Research

For more complex research tasks, Lemur implements a supervisor-researcher architecture inspired by LangChain's approach:

**Components:**
- **Supervisor Agent**: Manages research workflow, determines research sections
- **Researcher Agents**: Work in parallel on specific subtopics
- **Planner**: Creates structured research plan based on query
- **Writer**: Synthesizes research findings into coherent response

**Implementation:**
```javascript
// Simplified implementation of deep research workflow
async function deepResearch(query, tavilyApiKey, groqApiKey) {
  // 1. Planning phase - determine research areas
  const plan = await createResearchPlan(query, groqApiKey);
  
  // 2. Research phase - parallel searches for each area
  const researchPromises = plan.sections.map(section => 
    performSectionResearch(section, tavilyApiKey)
  );
  const sectionResults = await Promise.all(researchPromises);
  
  // 3. Synthesis phase - compile comprehensive answer
  const finalReport = await synthesizeResults(query, sectionResults, groqApiKey);
  
  return {
    answer: finalReport.answer,
    sources: finalReport.sources,
    sectionResults: sectionResults
  };
}
```

## Feature Comparison

| Feature | Standard Search | Deep Research |
|---------|----------------|---------------|
| **Sources Analyzed** | 5-10 | 20+ |
| **Search Depth** | Surface level | Multiple levels deep |
| **Response Structure** | Concise answer | Comprehensive report |
| **Source Types** | General web | Academic, news, forums, etc. |
| **Processing Time** | 3-8 seconds | 10-30 seconds |
| **Content Analysis** | Basic context | Nuanced understanding |
| **Visualization** | Text only | Tabular data inclusion |
| **Contradictions** | Single perspective | Multi-perspective analysis |
| **Citations** | Inline references | Detailed bibliography |
| **User Subscription** | Basic & Free tiers | Pro tier exclusive |

## Implementation Details

### Deep Research Tab

The Deep Research tab in the SearchTabs component displays comprehensive research results with an enhanced layout:

- Structured sections with collapsible areas
- Highlighted key findings
- Interactive source citations with preview cards
- Tabular data visualization when appropriate
- Multi-perspective presentation of conflicting viewpoints

### Research Process Visualization

The SearchInsightsPanel provides real-time visibility into the research process:

1. **Planning Phase**: Shows research plan and sections
2. **Research Phase**: Displays ongoing searches and findings
3. **Synthesis Phase**: Illustrates how information is combined
4. **Finalization**: Formatting and citation preparation

This panel is inspired by Grok's "lens-like window" that displays thinking and research steps.

### Tavily Integration

Tavily's search API is specifically designed for AI agents with features particularly valuable for Deep Research:

- **Intelligent Query Generation**: Automatically generates optimized search queries
- **Source Diversity**: Pulls from academic, news, and specialized sources
- **Content Extraction**: Pulls relevant snippets optimized for LLMs
- **Fact-Checking**: Verifies information across multiple sources

### Model Selection Logic

Deep Research dynamically selects between compound-beta and compound-beta-mini based on:

```javascript
function selectModelForDeepResearch(query, complexity) {
  // Simple queries with specific factual needs use compound-beta-mini
  if (complexity < 0.5 && query.length < 50) {
    return 'compound-beta-mini';
  }
  
  // Complex queries requiring multi-step reasoning use compound-beta
  return 'compound-beta';
}
```

## Best Practices

### Query Optimization

To maximize Deep Research effectiveness:

1. **Be Specific**: Clear, focused queries yield better results
2. **Use Keywords**: Include important terms and concepts
3. **Specify Context**: Add relevant timeframes or domains
4. **Request Comparisons**: Ask for contrasting viewpoints
5. **Follow Up**: Use follow-up questions to drill deeper

### Performance Considerations

Deep Research is resource-intensive. Consider these optimization strategies:

- **Caching**: Cache research results for similar queries
- **Progressive Loading**: Display initial findings while research continues
- **Background Processing**: Run deep research asynchronously 
- **Rate Limiting**: Implement per-user quota for deep research requests

### Security & Privacy

- **API Key Protection**: Store API keys securely in environment variables
- **Query Sanitization**: Sanitize user queries before processing
- **Source Validation**: Verify credibility of sources
- **User Data Handling**: Follow privacy best practices for storing search history

## Future Enhancements

Planned improvements to the Deep Research capability:

1. **Multi-modal Research**: Incorporate image and video analysis
2. **Interactive Reports**: Allow users to expand/collapse sections
3. **Custom Research Profiles**: Save research preferences
4. **Export Functionality**: Download reports in various formats
5. **Collaborative Research**: Share and build on research sessions

## Resources

- [Groq Compound-Beta Documentation](https://console.groq.com/docs/agentic-tooling/compound-beta)
- [Tavily Official Website](https://www.tavily.com/)
- [Tavily Getting Started Guide](https://blog.tavily.com/getting-started-with-the-tavily-search-api/)
- [Tavily Documentation](https://docs.tavily.com/welcome)

## Technical References

The Deep Research implementation draws inspiration from these open-source projects:

- **GPT Researcher**: Framework for autonomous research agents
- **LangChain's open_deep_research**: Multi-agent research orchestration
- **Report mAIstro**: Planning agent for structured research reports

### Detailed Implementation Methods

You can implement Deep Research capability in Lemur using several methods:

#### Method 1: Using LangGraph and Tavily

For a complete workflow for deep research, LangChain, LangGraph, and Tavily can be integrated:

```javascript
// Example implementation of deep research with LangGraph
import { TavilySearch } from "@langchain/community/tools/tavily_search";
import { createGraph } from "@langchain/langgraph";

// Define research workflow
const researchGraph = createGraph({
  channels: {
    query: { value: "" },
    plan: { value: [] },
    results: { value: [] },
    report: { value: "" }
  },
  nodes: {
    planner: plannerNode,
    researcher: researcherNode,
    writer: writerNode
  },
  edges: {
    planner: { success: "researcher" },
    researcher: { success: "writer" }
  }
});

// Create Tavily search tool
const searchTool = new TavilySearch({
  maxResults: 10,
  apiKey: process.env.TAVILY_API_KEY
});

// Query execution
const result = await researchGraph.invoke({
  query: "What advances were made in quantum computing in 2024?"
});
```

#### Method 2: Using the GPT Researcher Framework

GPT Researcher can be configured with Tavily as the search engine for autonomous deep research:

```javascript
// Example of using GPT Researcher with Tavily
import { GPTResearcher } from "gpt-researcher";

async function conductDeepResearch(query) {
  const researcher = new GPTResearcher({
    query: query,
    reportType: "research_report",
    searchEngine: "tavily",
    apiKeys: {
      openai: process.env.OPENAI_API_KEY,
      tavily: process.env.TAVILY_API_KEY
    }
  });
  
  const research = await researcher.conductResearch();
  const report = await researcher.writeReport();
  
  return {
    research: research,
    report: report
  };
}
```

#### Method 3: Direct API Integration

For custom integration with Groq's Compound models and Tavily:

```javascript
// Direct integration example
async function deepResearchDirect(query) {
  // First, plan the research
  const planResponse = await fetch("https://api.groq.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "compound-beta",
      messages: [
        {
          role: "system",
          content: "You are a research planner. Create a structured research plan for the query."
        },
        {
          role: "user",
          content: `Research plan for: ${query}`
        }
      ]
    })
  });
  
  const planData = await planResponse.json();
  const researchPlan = JSON.parse(planData.choices[0].message.content);
  
  // Execute research with Tavily for each section
  const researchResults = await Promise.all(
    researchPlan.sections.map(async (section) => {
      const tavilyResponse = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": process.env.TAVILY_API_KEY
        },
        body: JSON.stringify({
          query: section.query,
          search_depth: "advanced",
          max_results: 10
        })
      });
      
      return await tavilyResponse.json();
    })
  );
  
  // Synthesize final report
  // ... implementation continues
}
```

## Development Usage

To incorporate Deep Research in your components:

```jsx
import { useDeepResearch } from '@/hooks/useDeepResearch';

function MyComponent() {
  const { 
    performDeepResearch, 
    results, 
    isLoading,
    progress
  } = useDeepResearch();
  
  const handleSearch = async () => {
    await performDeepResearch('How do quantum computers work?');
  };
  
  return (
    <div>
      {/* Component implementation */}
    </div>
  );
}
```

### React 18 Compatibility

When implementing Deep Research UI components, ensure they're compatible with React 18's rendering model:

```jsx
// Example of React 18 compatible implementation
import { createRoot } from 'react-dom/client';

// For a standalone Deep Research component
const DeepResearchApp = () => {
  // Component implementation
};

// Mount with createRoot for React 18
const container = document.getElementById('deep-research-root');
if (container) {
  const root = createRoot(container);
  root.render(<DeepResearchApp />);
}
```

Key considerations for React 18:
- Use `createRoot` from `react-dom/client` instead of `ReactDOM.render`
- Leverage automatic batching for state updates to optimize performance
- Consider using concurrent features like `useTransition` for better UX during research process visualization
- Ensure proper error boundaries to handle API failures gracefully

## Frontend Implementation Comparison

When implementing the Deep Research UI, two main approaches were considered:

| Feature | Traditional React Approach | React 18 Modern Approach |
|---------|----------------------------|--------------------------|
| **Rendering API** | `ReactDOM.render()` | `createRoot()` |
| **Import From** | `react-dom` | `react-dom/client` |
| **Performance** | Legacy rendering | Concurrent rendering, automatic batching |
| **Research Visualization** | May stutter during updates | Smoother with concurrent features |
| **Error Handling** | Manual error boundaries | Enhanced error handling |
| **Code Example** | `ReactDOM.render(<DeepResearch />, container)` | `createRoot(container).render(<DeepResearch />)` |

The React 18 modern approach was selected for Lemur's Deep Research implementation due to its performance benefits, particularly for visualizing the complex, multi-stage research process in real-time.

### Implementation Considerations

When upgrading components to support Deep Research:

1. **Update Rendering Code**: Use `createRoot` instead of `ReactDOM.render` for all components
2. **Package Versions**: Ensure both `react` and `react-dom` are version 18 or higher
3. **TypeScript Types**: Update `@types/react` and `@types/react-dom` for type safety
4. **Performance Testing**: Validate the concurrent rendering benefits for research visualization

These changes enable a more responsive UI during intensive research operations, ensuring users receive visual feedback throughout the process.

## Conclusion

Deep Research represents Lemur's premium research capability, providing Pro-tier users with comprehensive, nuanced information gathering that goes beyond standard search. By combining the best aspects of Groq's compound models and Tavily's specialized search, Lemur delivers a research experience comparable to commercial offerings like Perplexity and OpenAI's Deep Search at a fraction of the cost.

Leveraging React 18's modern features allows Lemur to present this complex functionality with a smooth, responsive user interface that maintains interactivity even during intensive research operations. This technical foundation ensures that Deep Research not only provides superior content but does so with an exceptional user experience.