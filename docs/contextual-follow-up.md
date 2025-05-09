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

## Code Examples

### AIAnswer Component

```typescript
import { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

interface AIAnswerProps {
  answer: string;
  sources: Source[];
  model: string;
  contextual?: boolean;
  authRequired?: boolean;
}

export default function AIAnswer({ answer, sources, model, contextual = false, authRequired = false }: AIAnswerProps) {
  const [, setLocation] = useLocation();
  const [followUpQuery, setFollowUpQuery] = useState('');
  const [showFollowUpInput, setShowFollowUpInput] = useState(false);
  const { user } = useAuth();

  const handleFollowUpSubmit = () => {
    if (!followUpQuery.trim()) return;
    setLocation(`/search?q=${encodeURIComponent(followUpQuery)}&isFollowUp=true`);
  };

  return (
    <div>
      <div>
        <h3>{contextual ? 'Contextual Follow-up Answer' : 'AI-Generated Answer'}</h3>
        <div dangerouslySetInnerHTML={{ __html: answer }} />
      </div>
      {!showFollowUpInput ? (
        <Button onClick={() => setShowFollowUpInput(true)}>Ask a follow-up question</Button>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); handleFollowUpSubmit(); }}>
          <input
            type="text"
            value={followUpQuery}
            onChange={(e) => setFollowUpQuery(e.target.value)}
            placeholder="Ask a follow-up question..."
          />
          <Button type="submit">Search</Button>
        </form>
      )}
    </div>
  );
}
```

### DeepResearchPanel Component

```typescript
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/use-auth';

export default function DeepResearchPanel() {
  const [query, setQuery] = useState('');
  const [isResearching, setIsResearching] = useState(false);
  const [researchResults, setResearchResults] = useState(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleResearch = async () => {
    if (!query.trim()) {
      toast({
        title: "Research query required",
        description: "Please enter a research topic to investigate",
        variant: "destructive"
      });
      return;
    }

    setIsResearching(true);
    setResearchResults(null);

    try {
      const response = await apiRequest('POST', '/api/deep-research', {
        query: query.trim(),
        options: {
          previous_queries: getPreviousQueries()
        }
      });

      if (response.ok) {
        const data = await response.json();
        setResearchResults(data);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to perform deep research');
      }
    } catch (error) {
      toast({
        title: "Research failed",
        description: error.message || "An unexpected error occurred during research",
        variant: "destructive"
      });
    } finally {
      setIsResearching(false);
    }
  };

  const getPreviousQueries = () => {
    const previousQueries = JSON.parse(localStorage.getItem('previousQueries') || '[]');
    return previousQueries.slice(-5);
  };

  return (
    <div>
      <Input
        placeholder="Enter research topic..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        disabled={isResearching}
      />
      <Button onClick={handleResearch} disabled={isResearching || !query.trim()}>
        {isResearching ? 'Researching...' : 'Research'}
      </Button>
      {researchResults && (
        <div>
          <h3>Research Results: {researchResults.query}</h3>
          <div>
            {researchResults.results.map((result, index) => (
              <div key={index}>
                <h4>{result.title}</h4>
                <p>{result.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

## Guidelines for Developers

1. **Implementing Contextual Follow-up Questions**
   - Ensure that the session context is properly maintained and updated with each new query and answer.
   - Use the `previous_queries` option in API requests to include context from previous interactions.

2. **Testing Contextual Follow-up Questions**
   - Test with a variety of follow-up question patterns to ensure accurate context detection.
   - Verify that the context is correctly applied to enhance the query and provide relevant answers.
   - Check the visual indicators to ensure users can easily identify contextual follow-up answers.

3. **Improving Citation Links and Styling**
   - Enhance citation handling to include visual indicators for different citation styles.
   - Ensure that citation links are styled for better readability and user experience.

4. **Presenting Data, Charts, and Graphs**
   - Improve the rendering of data, charts, and graphs within AI answers and research results.
   - Use interactive charts and graphs to enhance the presentation of research data.
