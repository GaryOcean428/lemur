# Contextual Follow-up Searches

## Overview

Lemure now supports contextual follow-up searches, which means users can ask follow-up questions that reference previous searches without explicitly repeating all context. This creates a more natural conversation-like interaction with the search engine.

## How It Works

1. **Session-Based Context Storage**
   - Each user's search session maintains a history of recent queries and answers
   - Limited to 5 most recent queries to optimize performance and memory usage
   - Context is stored in the session, persisting for 30 days

2. **Automatic Detection**
   - The system analyzes new queries to detect if they might be follow-up questions
   - Uses natural language patterns to identify likely follow-ups (question starters, pronouns, etc.)
   - Queries like "What about their pricing?" or "Who are the main companies involved?" are recognized as follow-ups

3. **Context Enhancement**
   - When a follow-up is detected, the system enhances the query with context from previous searches
   - For AI responses, the enhanced query includes previous questions to maintain continuity
   - Traditional web results are still based on the original query for result variety

4. **Visual Indicator**
   - Contextual follow-up answers are marked with a special badge
   - Users can see when a response is based on previous context

## Examples

### Initial Query
"What's new in AI today?"

### Follow-up Queries
- "Who are the main companies involved?"
- "What are the ethical concerns?"
- "How is it being used in healthcare?"

The system recognizes these as follow-ups and uses the context from the original AI query to provide relevant answers.

## Technical Implementation

- Context is stored in `req.session.conversationContext` as an array of query/answer objects
- Each entry includes timestamp for potential time-based context decay
- The follow-up detection uses regex patterns to identify question structures
- For enhanced privacy, only query text and truncated answer summaries are stored, not full result data

## Limitations

- Currently works best with simple follow-up patterns
- Limited to the 5 most recent queries (configurable)
- Context chains can occasionally produce unexpected results if queries shift topics dramatically
- Session must be maintained (requires cookies enabled)