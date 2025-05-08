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

Thanks for the detailed context. I’ll prepare a production-ready architecture and setup guide for a React + TypeScript AI search engine similar to Perplexity or Grok, integrating Tavily and Groq with compound-beta and compound-beta-mini models, including features like source citations, code snippet rendering, and multiple search APIs (Google Scholar, Bing, Brave, SerpAPI).

I'll use the referenced Lemur GitHub repository to inform the implementation pattern. I’ll get back to you shortly with a detailed breakdown and recommendations.


# AI-Powered Search Engine (Perplexity-Like) – Architecture & Setup Guide

## Overview

Building an AI-driven search engine involves connecting a user-friendly frontend to a powerful backend that integrates web search APIs and large language models (LLMs). In this guide, we design a **Perplexity/Grok-style search assistant** using **React + TypeScript** for the frontend and a **Node.js (Express)** backend. The system will let users ask natural language questions and receive answers with relevant source citations and formatted code snippets. Key features include:

* **Multiple Search Providers:** Integration with Tavily (an LLM-tailored search API) and others like SerpAPI (for Google/Web/Scholar), Bing, and Brave Search, to retrieve up-to-date information.
* **Groq LLM (Compound Beta) Integration:** Use Groq’s Compound Beta and Compound Beta Mini models as the answering engine. These models can handle tool usage (e.g. web search) internally, but we will provide our own retrieved context to ensure answers come with explicit citations.
* **Source Attribution:** The system will associate each fact in the answer with a source. The LLM’s output will include reference markers (e.g. “\[1]”) that correspond to a list of cited URLs. Code examples in answers will be properly formatted (in Markdown code blocks) for display.
* **Modern Web Stack:** A responsive React frontend for user query input and answer display, and a scalable Express backend to handle search queries, API calls, and response formatting. We’ll use TypeScript across both for type safety and maintainability.

By the end, you’ll have a clear architecture and implementation approach for a production-ready AI search assistant, including component structure, API integration code, and examples of rendering answers with citations and code.

## System Architecture Overview

&#x20;*Figure: High-level architecture for the AI-powered search engine. The system is divided into three layers – **Frontend (React)** for user interaction, **Backend (Node/Express)** as an API orchestrator, and an **LLM + Tools layer** that handles the AI reasoning (Groq Compound Beta) and web search integration. In this design, the backend coordinates search queries via external APIs (Tavily, SerpAPI, etc.) and provides the aggregated context to the LLM. The LLM generates an answer with references, which the backend returns to the frontend for display.*

The architecture is similar to other agent-based search chatbots (e.g. one reference implementation uses a FastAPI backend with LangChain agents and Tavily for retrieval). Our design uses Node/Express, but follows the same principle of separating concerns:

* **Frontend (Client)** – A React app where users enter questions and view answers. It sends the query to the backend and presents the response with rich formatting (e.g. hyperlinks for citations, syntax highlighting for code).
* **Backend (Server)** – An Express server that receives the query and orchestrates the search and answer process. It interacts with various **Search Provider APIs** (Tavily, SerpAPI, Bing, Brave, etc.) to retrieve relevant snippets, then calls the **Groq LLM API** (Compound Beta) to generate an answer using those snippets as context. The backend then formats the answer and sources into a response for the frontend.
* **External APIs (Search & LLM)** – The backend’s “tools”:

  * *Search APIs* to fetch up-to-date information (e.g. Tavily’s LLM-tailored search, SerpAPI for Google and Scholar, Bing Web Search, Brave Search, etc.).
  * *LLM API* to generate answers. We will use Groq’s Compound Beta models via Groq’s cloud API (which is OpenAI-compatible) for answer synthesis. Optionally, OpenAI’s API or others could be plugged in with minimal changes if needed.

This modular architecture ensures each component can be developed, tested, and scaled independently. For example, you could swap out the LLM backend or add caching without affecting the frontend UI. Next, we’ll dive into each component and how to implement the integrations.

## Key Components and Responsibilities

### 1. Frontend (React & TypeScript)

The React frontend is responsible for capturing user queries and displaying the AI’s answers with proper formatting. Key parts of the frontend include:

* **Query Input Component:** A search bar or chat box (`<SearchBar />`) where the user types a question. This component handles form submission (e.g. on Enter key or button click) and triggers an API call to the backend. It can be a simple controlled `<input>` element or a text area for multi-line questions.

* **Results/Answer Display Component:** A component (`<AnswerDisplay />`) that receives the answer (likely as Markdown or a structured object with text + sources) from the backend and renders it. This involves:

  * Parsing the answer text for citation markers (e.g. “\[1]”) and rendering them as superscript links to the full source URL or footnote.
  * Rendering any code snippets in a formatted way (monospaced font, code block styling, syntax highlighting).
  * Showing the list of sources (with indices matching the citations) either inline or at the bottom of the answer. For example, after the answer text, list “\[1] Source Title – URL”.

* **State Management:** We can use React’s `useState` or context to manage the query and response state. For a simple Q\&A, a single state variable for the latest answer may suffice. For a chat-like history, you might keep an array of Q\&A pairs in state and map over it to render a conversation.

* **UI/UX Enhancements:** Use a CSS framework or component library for styling (the example project uses Tailwind CSS, as evidenced by `tailwind.config.ts`). Ensure the answer text is scrollable if long, and the UI is responsive. Also consider indicating loading state while the answer is being fetched (e.g. a spinner or “Thinking…” message).

**Libraries & Packages (Frontend):**

* *React & TypeScript* – Core library for building the UI.
* *fetch or axios* – To call the backend API from the browser.
* *Markdown Rendering:* Since the answer may contain Markdown (for code, links), you can use a library like **React Markdown** with plugins for GitHub-flavored markdown (for tables, code fences) and syntax highlighting. This will allow you to safely render the answer including code blocks.
* *Syntax Highlighting:* Libraries like **highlight.js** or **Prism.js** (often used via react-syntax-highlighter or directly in a ReactMarkdown component) to format code.
* *UI Components:* (Optional) For a polished UI, you might integrate components from a library like Material-UI or Chakra UI, or use Tailwind CSS utility classes for a custom design.

### 2. Backend (Node.js & Express with TypeScript)

The Express backend acts as the middle layer between the frontend and the external AI services. It exposes an HTTP API (e.g. `POST /api/search`) that the frontend calls with a user query, and returns a JSON response containing the answer and source citations. Key responsibilities and sub-components of the backend:

* **Express Server & Routing:** Set up an Express app with a JSON body parser. Define a route handler for the search request. For example:

  ```typescript
  import express, { Request, Response } from 'express';
  import dotenv from 'dotenv';
  dotenv.config();  // Load API keys from .env

  const app = express();
  app.use(express.json());

  app.post('/api/search', async (req: Request, res: Response) => {
    const userQuery: string = req.body.query;
    // ... (logic to handle the query below)
  });
  ```

* **Query Processing & Tool Orchestration:** Inside the route handler, the server will:

  1. **Call Search APIs:** Use one or multiple search providers to retrieve relevant results for the query. This can be done sequentially or in parallel. For instance, you might first use **Tavily** to get general web results (which returns titles, snippets, and URLs), and also use **SerpAPI** with the Google Scholar engine to get scholarly articles if the query looks academic. Each API call will yield a list of search results.

  2. **Consolidate and Prepare Context:** Take the top results (e.g. top 3-5) and build a context string for the LLM. Typically, we’ll create a numbered list of snippets: e.g. `[1] {snippet from result1} — {source title}; [2] {snippet from result2} — {source title}; ...`. The numbering will be used by the LLM to cite sources. We may also include the URLs or just keep them aside and only provide the textual snippets to the LLM (to avoid the model copying full URLs into the answer).

  3. **Prompt Construction:** Construct the prompt for the LLM. We will use a **system message** and a **user message** (since we’re using a chat-completion style API). For example:

     * **System prompt:** Instruct the model about its role and format, e.g. *“You are a research assistant that answers questions with concise, factual responses. Use the provided search snippets as context. Whenever you state a fact from the snippets, add a citation like \[1] or \[2] referring to the source. If code is relevant, include a code block in the answer. If the answer is not found in the sources, say you couldn’t find it.”*
     * **User prompt:** Include the actual question and the prepared snippets context. For instance:

       ```text
       User question: "${userQuery}"
       Context:
       [1] ${result1.snippet}
       [2] ${result2.snippet}
       [3] ${result3.snippet}

       Based on the above sources, answer the question. Use [1], [2], [3] to cite sources. Include code examples if relevant.
       ```

     This prompt tells the model what the question is and provides labeled evidence to draw from. The model’s job is to synthesize an answer and label any facts with the corresponding \[number].

  4. **Call LLM API (Groq Compound Beta):** With the prompt ready, the backend calls the Groq API to generate an answer. Groq’s cloud API is OpenAI-compatible, so we can use their official Node SDK (**`groq-sdk`**) or a direct HTTP request. We’ll illustrate both approaches below.

  5. **Parse and Return the Result:** Once the LLM responds with an answer containing citations, the backend formats the output for the frontend. Typically, the LLM’s answer will be a text string with citation markers. We will return a JSON object like `{ answer: "...formatted answer...", sources: [...] }` to the frontend. The `sources` array can contain the actual URL and title for each reference number, enabling the frontend to render clickable links. We might also include the raw answer text separately if needed.

* **Error Handling & Performance:** The backend should handle possible errors (API timeouts, no results found, etc.) and respond accordingly. For instance, if search APIs fail or return nothing, the backend might call the LLM with just the question (letting the model try its own knowledge or tools) or return a message like “No results found.” For production, also consider caching frequent queries and implementing rate limiting, since both search APIs and LLM API have usage limits.

**Libraries & Packages (Backend):**

* *express* – Web framework for Node.js to build the API.
* *axios or node-fetch* – To make HTTP requests to search APIs and (optionally) to the Groq REST endpoint if not using their SDK.
* *groq-sdk* – Official Groq API client for Node.js. This handles auth and requests to Groq’s chat completion endpoint.
* *dotenv* – For loading API keys (Groq API key, Tavily key, SerpAPI key, etc.) from environment variables.
* *(Optional) langchain or similar* – While not required, libraries like LangChain can manage the prompt templating and tool calls. Given our custom approach, we can also implement orchestration manually for transparency.

### 3. External Integration Details

Now let’s detail how to integrate each external service in our backend.

**Tavily Search API:** Tavily is a search engine designed for use with LLMs, returning JSON results that include titles, snippets, and even full page content if requested. Its advantage is that it’s tailored for AI agents, providing factual results quickly. To use Tavily:

* Sign up at Tavily to get an API key (the first 1,000 searches per month are free).

* Install Tavily’s SDK for JavaScript (currently in beta) via NPM, or use direct HTTP requests. For example, using the official JS SDK:

  ```typescript
  import { tavily } from '@tavily/core';
  const tvlyClient = tavily({ apiKey: process.env.TAVILY_API_KEY });

  // Basic web search:
  const searchResponse = await tvlyClient.search("How far is the Sun from Earth?", { include_raw_content: false });
  // searchResponse.results is an array of results with { title, url, content, ... }

  // Alternatively, quick Q&A search (Tavily can directly extract an answer):
  const answerResult = await tvlyClient.searchQNA("How far is the Sun from Earth?");
  console.log(answerResult); // concise answer string, if available:contentReference[oaicite:11]{index=11}
  ```

  In our use case, it’s more useful to get the `results` list and supply snippets to the LLM. Tavily’s response JSON contains a field `results` with objects like `{ title, url, content (snippet), raw_content (full text if enabled) }`. We can set `include_images` or `include_raw_content` to true if needed. For brevity, we’ll use just the snippet content.

* **Using Tavily results:** After getting results, pick the top N relevant ones. For each, extract a short snippet (Tavily’s `content` field is a snippet by default) and the source title/URL. These will form the numbered context list in the prompt. For example:

  ```typescript
  const snippets = searchResponse.results.slice(0, 3).map((item, i) => {
    return `[${i+1}] "${item.content}" — *${item.title}*`;
  });
  const contextSection = snippets.join("\n");
  ```

  Each snippet is quoted and labeled \[i], and we include the title for clarity (the model might use it to identify the source type).

* *Optional:* Tavily also offers an **Extract API** to get raw full page content from a list of URLs. This can be useful if the snippet is insufficient. For instance, you could take one of the top URLs and call `await tvlyClient.extract([url])` to get `raw_content` of the page, then pass a summarized version of that to the LLM. Keep an eye on length and cost when doing this in production.

**SerpAPI Integration (Google & Scholar, etc.):** SerpAPI is a paid API that provides search results from multiple engines without scraping hassle. It supports Google Web, Google Scholar, Bing, Baidu, Yahoo, and more. To integrate SerpAPI:

* Get a SerpAPI key and install their Node client (`google-search-results-nodejs`). Or use direct HTTP calls. Using the official client, for example:

  ```typescript
  import SerpApi from 'google-search-results-nodejs';
  const serp = new SerpApi.GoogleSearch(process.env.SERPAPI_API_KEY);

  const params = {
    q: userQuery,
    engine: "google",      // use "google_scholar" for Scholar
    num: 5,                // number of results
    hl: "en",              // language
  };

  const serpData = await new Promise<any>((resolve, reject) => {
    serp.json(params, (data: any) => {
      resolve(data);
    });
  });
  // serpData.organic_results will contain results similar to Google search results
  ```

  SerpAPI returns results in a structured JSON. For Google, look at `organic_results`. For Google Scholar, look at `organic_results` which have titles and snippets of papers. For Bing, you can set `engine: "bing"` similarly.

* Process the SerpAPI results much like Tavily’s: extract top results and format snippets. Note that snippet fields might have different names (e.g. `snippet` or `snippet_highlighted_words`). You may need to concatenate title and snippet for context.

* **Choosing providers:** You might use SerpAPI as a fallback or in conjunction with Tavily. For example, use Tavily for general web and SerpAPI with Scholar if the query contains academic keywords. It’s also possible to run multiple in parallel and merge results (removing duplicates by URL). For simplicity, you can start with one (Tavily or Google via SerpAPI) and expand as needed.

**Bing Search API:** To use Bing, you can either use SerpAPI’s Bing engine or Microsoft’s Bing Web Search API. The Bing API (via Azure Cognitive Services) requires an Azure key and endpoint. For instance, using fetch:

```typescript
const bingRes = await fetch(`https://api.bing.microsoft.com/v7.0/search?q=${encodeURIComponent(userQuery)}`, {
  headers: { 'Ocp-Apim-Subscription-Key': process.env.BING_API_KEY }
});
const bingData = await bingRes.json();
// bingData.webPages.value is an array of results with 'snippet' and 'name' (title)
```

The integration and parsing would be analogous to the above – get the JSON, take top results, format snippet and title.

**Brave Search API:** Brave offers a privacy-focused search with a generous free tier (up to 2k queries/month free). After obtaining an API key (called a subscription token), call the Brave Search endpoint with the token in headers. For example:

```typescript
const braveRes = await fetch(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(userQuery)}`, {
  headers: { 
    'Accept': 'application/json',
    'X-Subscription-Token': process.env.BRAVE_API_TOKEN 
  }
});
const braveData = await braveRes.json();
// braveData.web search results structure is documented in Brave API docs
```

The request requires the `X-Subscription-Token` header for auth. The JSON includes results similar to other engines (titles, descriptions, URLs). Parse those into our context snippet format as well. Brave also has a **Summarizer API** which returns an AI-generated summary of results – however, since we have our own LLM, we might not need that.

*Note:* In a production setting, you might not integrate *all* these providers at once. Instead, abstract a search service interface with the ability to query any provider based on configuration or query type. This keeps the system flexible (e.g., use different providers for different locales or failover if one is down).

**Groq LLM API (Compound Beta & Mini):** The Groq Compound Beta models will generate our final answer. Groq’s API is similar to OpenAI’s, which simplifies integration. Steps to integrate:

* **Account & API Key:** Sign up for GroqCloud and obtain an API key (the Developer tier may provide free access). Set this key in your environment (e.g., `GROQ_API_KEY`).

* **Install SDK:** Use `npm install groq-sdk` to add Groq’s official Node.js library. Alternatively, you can call the REST endpoint directly with fetch/axios – Groq uses the path `/openai/v1/chat/completions` with a Bearer token, just like OpenAI.

* **Model Selection:** Groq offers `compound-beta` and `compound-beta-mini`. The **full Compound Beta** is more powerful (128k context, uses multiple models under the hood) with \~4.9s latency, while **Mini** is faster (\~1.6s latency) but slightly less powerful. You can choose which to call based on a parameter or query complexity. We’ll default to `compound-beta` for better quality, and you can switch to `compound-beta-mini` for speed if needed.

* **API Call (using SDK):** Here is an example of calling the Groq chat completion API with the SDK in TypeScript:

  ```typescript
  import Groq from 'groq-sdk';
  const groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });

  const messages = [
    { role: 'system', content: systemPrompt },   // system instructions, as constructed above
    { role: 'user', content: userPrompt }        // user prompt with question + context
  ];
  const completion = await groqClient.chat.completions.create({
    model: 'compound-beta',
    messages: messages
  });
  const answerText: string = completion.choices[0].message.content;
  ```

  This sends the prompt to Groq. Under the hood, Groq’s Compound Beta model will even perform its own web search or code execution if it deems necessary, but since we’ve already provided relevant context, it should primarily use that to formulate the answer. The response structure in `completion` is similar to OpenAI’s: an object with an array `choices`, where `choices[0].message.content` is the assistant’s answer.

* **API Call (using HTTP fetch):** If not using the SDK, you can do:

  ```typescript
  const completionRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
    },
    body: JSON.stringify({
      model: "compound-beta",
      messages: messages
    })
  });
  const completionJson = await completionRes.json();
  const answerText = completionJson.choices[0].message.content;
  ```

  This is exactly the format shown in Groq’s documentation for Compound Beta usage (it’s OpenAI-compatible JSON). Using the SDK abstracts this, but either approach is fine.

* **Using the LLM Output:** The `answerText` we get is expected to already contain citations like “\[1]” referring to our prompt’s sources, because of how we constructed the prompt. We should verify and maybe post-process it slightly (for example, sometimes the model might quote the source or produce an extra list of references – we can instruct it not to do that in the prompt). Typically, we’ll trust the model’s output format and move to formatting it for the user.

### 4. Prompt Construction & Source Handling (Example)

Constructing a good prompt and handling sources correctly is crucial for accurate answers with citations. Below is an **example** of how you might build the prompt and then process the LLM’s answer, in code:

```typescript
// 1. Prepare dynamic context from search results:
const searchResults = await tvlyClient.search(userQuery, { include_raw_content: false });
if (!searchResults.results.length) {
  // handle no results (could either call LLM without context or return not found)
}
const topResults = searchResults.results.slice(0, 3);
let contextText = "";
topResults.forEach((item, index) => {
  contextText += `[${index+1}] "${item.content}" — ${item.url}\n`;
});

// 2. Define the system and user prompts:
const systemPrompt = 
  "You are an AI search assistant. Use the given excerpts from web search results to answer the question. " +
  "Cite sources by their number in square brackets. If the user asks for code, provide a code block in the answer.";
const userPrompt = 
  `Question: ${userQuery}\n\nSources:\n${contextText}\nPlease provide a helpful, concise answer with appropriate citations.`;

// 3. Call the Groq LLM API (using fetch for brevity here):
const completionRes = await fetch(GROQ_API_URL, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
  },
  body: JSON.stringify({
    model: "compound-beta-mini",   // using the faster mini model in this example
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ]
  })
});
const completion = await completionRes.json();
const rawAnswer: string = completion.choices[0].message.content;
console.log("LLM raw answer:", rawAnswer);
```

In this snippet, `contextText` ends up looking something like:

```
[1] "The Earth is approximately 93 million miles away from the Sun." — https://en.wikipedia.org/wiki/Earth
[2] "...the average distance from Earth to Sun is about 149.6 million kilometers..." — https://space.com/distance-earth-sun
[3] "Distance from Earth to Sun: 1 AU (astronomical unit) which is ~149597870.7 km." — https://nasa.gov/sun-distance
```

The user prompt then includes these sources. The LLM sees the numbered snippets and ideally will produce an answer like:

“**The Earth is about 93 million miles (150 million km) away from the Sun** \[1]\[2]. This distance is defined as one astronomical unit (AU) \[3].”

Notice the model cited \[1] and \[2] for the first fact, and \[3] for the second, corresponding to the provided sources.

**Source Parsing & Citation Mapping:** Now, the backend needs to map these citation markers to the actual URLs/titles for the frontend. Since we know the ordering, we can attach the sources list:

```typescript
// 4. Map citation numbers to source info
const sources = topResults.map((item, i) => ({
  index: i+1,
  title: item.title,
  url: item.url
}));

// 5. Return the answer and sources to the frontend
res.json({ answer: rawAnswer, sources });
```

Here, `sources` will be an array like:

```json
[
  { "index": 1, "title": "Earth - Wikipedia", "url": "https://en.wikipedia.org/wiki/Earth" },
  { "index": 2, "title": "How Far is the Sun? - Space.com", "url": "https://space.com/distance-earth-sun" },
  { "index": 3, "title": "Distance from Earth to Sun – NASA", "url": "https://nasa.gov/sun-distance" }
]
```

The `answer` string contains “\[1]”, “\[2]”, “\[3]” as needed. We’ll leave the answer text as-is and let the frontend handle rendering. (Alternatively, the backend could inject HTML anchor tags for the citations, but keeping it plain allows the frontend more control over styling.)

### 5. Frontend Display of Answer, Code, and Citations

On the React side, once we receive the JSON response from the backend, we need to display it nicely. Suppose our frontend made a request like:

```tsx
// Pseudocode for sending the request
const response = await fetch('/api/search', {
  method: 'POST', 
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: userQuery })
});
const data = await response.json();
// data: { answer: string, sources: { index, title, url }[] }
```

We then have `data.answer` and `data.sources`. We can design the `<AnswerDisplay />` component to render this. There are a couple of ways to handle the citations in the text:

**Option A: Render Markdown with Links** – If the answer is in Markdown (the model might not automatically format it, except for code), we can programmatically insert markdown links for the citations. For example, replace occurrences of `[1]` with `[1](${sources[0].url})`. However, this might be tricky to get perfect if the answer text contains other brackets. A safer approach is to use a rendering library that allows us to intercept the rendering of the citation patterns.

**Option B: Manual Parsing** – We can split the answer by the citation regex and insert `<sup>` elements. For example:

```tsx
import React from 'react';
interface AnswerDisplayProps {
  answer: string;
  sources: { index: number, title: string, url: string }[];
}
const AnswerDisplay: React.FC<AnswerDisplayProps> = ({ answer, sources }) => {
  // Split by citation markers (e.g. [1], [2]) while keeping them
  const parts = answer.split(/(\[\d+\])/g);
  return (
    <p>
      {parts.map((part, i) => {
        const match = part.match(/\[(\d+)\]/);
        if (match) {
          const citeNum = parseInt(match[1], 10);
          const source = sources.find(src => src.index === citeNum);
          if (source) {
            return (
              <sup key={i}>
                <a href={source.url} target="_blank" rel="noopener noreferrer">[{citeNum}]</a>
              </sup>
            );
          }
        }
        // Normal text part (not a citation)
        return <span key={i}>{part}</span>;
      })}
    </p>
  );
};
```

This simple parser looks for patterns like “\[2]” and replaces them with a superscript hyperlink using the sources array. The result might be an HTML snippet like:

> The Earth is about 93 million miles (150 million km) away from the Sun <sup><a href="https://en.wikipedia.org/wiki/Earth" target="_blank">\[1]</a></sup><sup><a href="https://space.com/distance-earth-sun" target="_blank">\[2]</a></sup>. This distance is defined as one astronomical unit (AU) <sup><a href="https://nasa.gov/sun-distance" target="_blank">\[3]</a></sup>.

After the answer paragraph, we can also list the sources for clarity (especially on mobile where clicking superscripts might be less convenient):

```tsx
<div className="sources-list">
  {sources.map(src => (
    <div key={src.index}>
      [{src.index}] <a href={src.url} target="_blank" rel="noopener noreferrer">{src.title}</a>
    </div>
  ))}
</div>
```

This will display a list of “\[1] Title – URL” for each source.

**Code Snippets Rendering:** If the answer contains a code block (the model may produce markdown code fences, e.g. \`\`\`javascript ... \`\`\`), we should render that as formatted code. Using a Markdown renderer is effective here. For example, we can use **React Markdown** with a syntax highlight component:

```tsx
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {Prism as SyntaxHighlighter} from 'react-syntax-highlighter';
import { dracula } from 'react-syntax-highlighter/dist/cjs/styles/prism';  // theme

const MarkdownAnswer: React.FC<{ markdown: string }> = ({ markdown }) => {
  return (
    <ReactMarkdown 
      children={markdown}
      remarkPlugins={[remarkGfm]}
      components={{
        code({ node, inline, className, children, ...props }) {
          const langMatch = /language-(\w+)/.exec(className || '');
          const language = langMatch?.[1] || '';
          return !inline ? (
            <SyntaxHighlighter style={dracula} language={language} PreTag="div" {...props}>
              {String(children).replace(/\n$/, '')}
            </SyntaxHighlighter>
          ) : (
            <code className={className} {...props}>{children}</code>
          );
        }
      }}
    />
  );
};
```

We could incorporate this into our AnswerDisplay. Essentially, we convert the answer (with our inserted citation links) into markdown and let `ReactMarkdown` handle it. If we already inserted `<a>` tags in Option B, we might want to do the linking differently for Markdown. Another approach: instruct the model to output in Markdown (for both text and links) in the prompt. For instance, we can ask it to format the answer in markdown and use markdown links for sources. Then our job is even easier – just render the markdown.

Regardless of approach, the front-end should ensure that:

* Code blocks are displayed with monospace font and distinct background. The above snippet with `react-syntax-highlighter` will achieve that, coloring the code using a theme like Dracula.
* Citations are clickable and open the source in a new tab.
* Long answers are wrapped or scrollable, and the UI remains clean.

### 6. Putting It All Together (Workflow Example)

Bringing the components together, here’s the end-to-end flow when a user asks a question:

1. **User Input:** The user types a question in the React app (e.g. “What is the latest on quantum computing research?”) and submits. The frontend makes a POST request to the backend `/api/search` with JSON `{ query: "...question..." }`.

2. **Backend Search Orchestration:** The Express server receives the query. It first queries the Tavily Search API (real-time web results) for that question. If needed, it also queries Google Scholar via SerpAPI to get academic results. The server then selects a handful of the most relevant snippets from all sources. For our example, it might get a few recent news snippets on quantum computing and maybe a snippet from an ArXiv paper. It then builds a prompt containing those snippets as context.

3. **LLM Query (Groq):** The backend sends the composed prompt to Groq’s Compound Beta model. The model processes the question in light of the provided snippets (and potentially could even do additional searches via its tools, though ideally our snippets suffice). It then generates an answer like:

   *“Recent advances in quantum computing include achieving higher qubit coherence and demonstrations of quantum advantage in certain tasks \[1]\[2]. For instance, a 2024 research paper from MIT showed a **>20% increase in qubit stability** using new error-correction techniques \[2]. Tech companies like IBM and Google are also scaling up the number of qubits in their quantum processors, aiming for systems with over 1000 qubits in the next few years \[1]\[3].*”

   with \[1], \[2], \[3] referencing the sources we gave (say \[1] a news article, \[2] the MIT paper, \[3] a company blog). The answer may include a short code snippet if the question required (not in this example). The Groq API responds with this answer text.

4. **Backend Response Formatting:** The backend takes the answer and attaches the actual source URLs and titles for \[1], \[2], \[3] based on its earlier context mapping. It sends back to the frontend:

   ```json
   {
     "answer": "<answer text with [1][2][3]>",
     "sources": [
       { "index": 1, "title": "Quantum Computing Update 2025 - TechNews", "url": "https://technews.com/quantum-2025" },
       { "index": 2, "title": "Quantum Error Correction Breakthrough (MIT 2024)", "url": "https://arxiv.org/abs/xyz..."},
       { "index": 3, "title": "IBM Blog – 1000-Qubit Milestone", "url": "https://ibm.com/blog/quantum-1000qubits"}
     ]
   }
   ```

5. **Frontend Rendering:** The React app receives this JSON. It then renders the answer text, replacing `[1]` with a superscript link to the TechNews article, `[2]` linking to the ArXiv paper, etc. It also lists the sources at the bottom for transparency. Any code in the answer (e.g., if the user asked for a sample algorithm) is rendered in a styled `<code>` block. The user sees a nicely formatted answer with citations they can click to verify the information.

Throughout this process, each piece is decoupled: the frontend doesn’t need to know how we got the answer, just how to display it, and the backend can improve its search or LLM logic without changing the frontend contract (the JSON format).

## Libraries and Packages Summary

To recap, here are the main libraries and tools you’ll utilize in this project:

* **Frontend:** `react`, `typescript`, `react-dom` (core); optionally UI library (e.g. `@mui/material` or `tailwindcss` for styling). For rendering answer content: `react-markdown` + `remark-gfm` for Markdown support, and a syntax highlighter like `react-syntax-highlighter` (with a Prism or Highlight.js theme) for code blocks.

* **Backend:** `express` for the server; `axios` or `node-fetch` for making API calls; `groq-sdk` for Groq API; `@tavily/core` for Tavily API; `google-search-results` (SerpAPI client) for Google/Scholar/Bing if using SerpAPI; `dotenv` for configuration. You might also include `cors` middleware if serving the frontend separately and need to allow requests, or use a proxy setup during development.

* **Types & Utils:** Since we use TypeScript, you may have types for the response objects (e.g. define interfaces for Tavily result, SerpAPI result, etc., or use the SDK’s provided types). This helps ensure you access fields correctly. Logging libraries (winston, etc.) can be useful for debugging in a production environment.

## Groq Compound Beta Integration Notes

Groq’s Compound Beta is a relatively new offering, so a few additional tips:

* The Compound Beta models can handle very large context (up to 128K tokens), which is great for stuffing many search results or long documents. However, keep in mind the response speed – if you feed very large context, the 5k ms latency could grow. Compound Beta Mini has a smaller context (likely 16k or 32k tokens) but faster response. For most questions, a few paragraphs of context is sufficient.

* If you find that the model isn’t using the provided sources properly (for example, hallucinating or not citing), you can refine the system prompt to be more explicit: *“If the answer is not in the above sources, say you don’t know. Do not make up information. Always cite a source for each factual statement.”* This will encourage the model to stick to the given snippets. In testing, Compound Beta performed well on real-time search tasks, outperforming some GPT-4 based baselines, so it should handle our use-case well.

* Groq’s API also supports function calling and tool use, but since we’re handling the tools ourselves, we didn’t use those features. We treat the model as a pure completion engine here.

## Example Component Structure (Frontend)

Finally, to outline how you might structure your React components for clarity and reusability (in a file tree format):

```
src/
├── components/
│   ├── SearchBar.tsx        // input box and submit button
│   ├── AnswerDisplay.tsx    // displays the answer text with citations
│   ├── SourceList.tsx       // (optional) displays list of sources
│   └── CodeBlock.tsx        // (optional) a component for rendering code with highlight (or use markdown as above)
├── pages/
│   └── HomePage.tsx         // main page composing the SearchBar and AnswerDisplay
├── api/
│   └── client.ts            // optional: abstraction for calling backend (using fetch/axios)
└── App.tsx                  // root component rendering HomePage, etc.
```

For instance, `HomePage.tsx` can maintain state and handle interactions:

```tsx
const HomePage: React.FC = () => {
  const [query, setQuery] = React.useState("");
  const [answer, setAnswer] = React.useState<string | null>(null);
  const [sources, setSources] = React.useState<{ index: number, title: string, url: string }[]>([]);
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    const res = await fetch('/api/search', {
      method: 'POST', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ query })
    });
    const data = await res.json();
    setAnswer(data.answer);
    setSources(data.sources);
    setLoading(false);
  };

  return (
    <div className="home-page">
      <SearchBar query={query} onInputChange={setQuery} onSubmit={handleSubmit} />
      {loading && <p>Loading...</p>}
      {answer && 
        <AnswerDisplay answer={answer} sources={sources} />
      }
    </div>
  );
};
```

This ties everything together in the frontend. The `SearchBar` component would call `onSubmit` (passed from above) when the user presses Enter or clicks "Ask". The `AnswerDisplay` will use the logic we discussed to render the answer with citations, possibly using `MarkdownAnswer` internally for code formatting. The user can then read the answer and click on citation links to verify the sources in a new tab.

---

**Conclusion:** Following this guide, you can implement a full-stack AI search engine that resembles the functionality of Perplexity or Grok – leveraging multiple information sources and advanced language models. With React and TypeScript, the frontend remains maintainable and user-friendly, while the Node/Express backend orchestrates complex search and AI tasks behind the scenes. By integrating Tavily for real-time search and Groq’s compound models for reasoning, the system is equipped to provide up-to-date, cited answers and even handle code Q\&A, making it a powerful research assistant.
