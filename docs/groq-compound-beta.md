# Groq Compound Beta Integration

## Overview

Groq Compound Beta is a powerful compound AI system that combines multiple models with built-in tool capabilities, including web search powered by Tavily. This document describes how Lemure uses these technologies and potential improvements to our search engine implementation.

## Current Implementation

Lemure currently uses two methods to deliver search results:

1. **Traditional Search Results**: Using Tavily's API directly for web search results
2. **AI-Generated Answers**: Using Groq's API with separate models (compound-beta and compound-beta-mini)

## Understanding Groq Compound Beta

Groq Compound Beta offers two versions:

- **compound-beta**: Supports multiple tool calls per request, more comprehensive
- **compound-beta-mini**: Supports one tool call per request with 3x lower latency

Both versions utilize Llama 4 Scout for core reasoning along with Llama 3.3 70B to help with routing and tool use.

## Potential Improvements

### 1. Direct Compound Beta Integration

Instead of separate Tavily + Groq integration, we could leverage Groq Compound Beta's built-in Tavily search capability:

```typescript
// Example using Groq Compound Beta with integrated Tavily search
const completion = await groqClient.chat.completions.create({
  model: "compound-beta",  // or "compound-beta-mini" for faster responses
  messages: [
    {
      role: "user",
      content: "What are the latest advancements in quantum computing?"
    }
  ]
});

// Response includes both the answer and tool usage information
const answer = completion.choices[0].message.content;
const toolUsage = completion.choices[0].message.executed_tools;
```

This approach would simplify our codebase by letting Groq handle when and how to use the Tavily search tool.

### 2. Performance Optimizations

- Use `compound-beta-mini` for anonymous and free users (as we already do)
- Implement client-side caching to reduce redundant searches
- Consider implementing a more sophisticated rate limiting system

### 3. Enhanced Contextual Features

We've already implemented contextual follow-up support. We could enhance this by:

- Improving the detection of follow-up questions using more sophisticated NLP techniques
- Adding more context from previous interactions (not just the queries but also parts of answers)
- Implementing conversation branching for more complex search flows

## Implementation Considerations

- **API Integration**: Our current approach is suitable for web applications
- **Model Selection Logic**: Our tier-based model selection (mini for free/anonymous, full for paid) aligns with best practices
- **Error Handling**: We should enhance error handling for Groq API failures

## Conclusion

Groq Compound Beta with Tavily integration offers a powerful approach for our search engine AI. While our current implementation is effective, adopting the built-in Tavily integration in Compound Beta could simplify our architecture and potentially improve performance.