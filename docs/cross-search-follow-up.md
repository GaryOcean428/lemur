# Cross-Search Follow-Up Questions

This document outlines how the follow-up questions system works across different search types (standard web search and deep research) in the Lemur search platform.

## Overview

The follow-up questions system allows users to ask contextual, related questions after an initial search. This context is now preserved across different search types, enabling a seamless transition between:

1. Web search → Web search follow-up
2. Web search → Deep research
3. Deep research → Web search
4. Deep research → Deep research follow-up

## Implementation Details

### Context Preservation

1. **Session-Based Context**:
   - Conversation context is stored in user sessions
   - For signed-in users, context is stored in the database
   - For anonymous users, context is stored in the session object

2. **Context Structure**:
   - Each conversation turn includes:
     - Query (user question)
     - Answer (system response)
     - Timestamp
     - Type (web search or deep research)
     - Sources (simplified for context management)

3. **Context Transfer**:
   - When switching between search types, the context is passed via the `isFollowUp` URL parameter
   - The server retrieves the appropriate context from session data

### User Experience

1. **Visual Indicators**:
   - "Follow-up question" badge appears next to search queries using context
   - In search results, contextual answers are labeled as such
   - Different styling for deep research answers vs. standard answers

2. **Cross-Search Behavior**:
   - When transitioning from web search to deep research, previous context is used to inform analysis
   - When moving from deep research to standard search, the deep insights are included in context

## Components

1. **SearchForm.tsx**: Contains logic for appending `isFollowUp=true` to search URL
2. **AIAnswer.tsx**: Displays the "contextual response" indicator for follow-up answers
3. **SearchTabs.tsx**: Handles display of contextual indicators in different tabs
4. **DeepResearchButton.tsx**: Preserves follow-up context when switching to deep research

## Server-Side Implementation

1. **Context Management**:
   - The server maintains a standardized `ConversationContext` interface
   - Both the direct search and deep research endpoints use this interface
   - Context is pruned to maintain reasonable token limits (last 5 turns)

2. **Context Normalization**:
   - Deep research results are normalized to fit into the conversation context
   - Web search results are similarly normalized for consistent context format

## Limitations and Safeguards

1. **Context Window**:
   - Limited to last 5 turns to prevent token overflow
   - Context older than 1 hour is automatically pruned

2. **Error Recovery**:
   - If context retrieval fails, system gracefully falls back to non-contextual search
   - Invalid context format is detected and handled appropriately

## Future Enhancements

1. **Multi-Session Context**: Preserve context across multiple browser sessions for logged-in users
2. **Context Visualization**: Show users a visual representation of the conversation flow
3. **Context Editing**: Allow users to edit or remove specific items from context
4. **Context Branching**: Support for multiple conversation branches from a single starting point

## Related Documentation

- See `docs/contextual-follow-up.md` for detailed implementation of follow-up question handling
- See `docs/deep-research-button-integration.md` for deep research button implementation