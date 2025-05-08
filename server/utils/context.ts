/**
 * Conversation context manager for handling multi-turn conversations
 * 
 * This module provides utilities for managing conversation context across multiple user queries,
 * enabling more natural follow-up questions and contextual responses.
 */

// Maximum number of conversation turns to maintain in context
const MAX_CONTEXT_TURNS = 5;

// Maximum age of context in milliseconds (30 minutes)
const MAX_CONTEXT_AGE_MS = 30 * 60 * 1000;

// Structure to represent a single turn in the conversation
export interface ConversationTurn {
  query: string;
  answer?: string;
  timestamp: number;
  sources?: Array<{title: string; url: string}> | null;
  model?: string;
}

// Structure to represent a full conversation context
export interface ConversationContext {
  turns: ConversationTurn[];
  lastUpdated: number;
}

/**
 * Determines if a query is likely a follow-up to a previous question
 * @param query The current query
 * @param previousContext The existing conversation context
 * @returns True if the query appears to be a follow-up question
 */
export function isLikelyFollowUp(query: string, previousContext?: ConversationContext): boolean {
  if (!previousContext || !previousContext.turns || previousContext.turns.length === 0) {
    return false;
  }
  
  // Check if context is too old
  const contextAge = Date.now() - previousContext.lastUpdated;
  if (contextAge > MAX_CONTEXT_AGE_MS) {
    return false;
  }
  
  // Normalize the query
  const normalizedQuery = query.toLowerCase().trim();
  
  // Simple indicators of follow-up questions
  const followUpIndicators = [
    'what about', 'how about', 'and what', 'what else', 'tell me more',
    'why', 'how', 'when', 'who', 'which', 'where', 'can you', 'could you',
    'please explain', 'elaborate', 'expand', 'so', 'then', 'therefore',
    'because', 'also', 'additionally', 'furthermore', 'moreover', 'tell me about',
    'what is', 'what are', 'is there', 'are there'
  ];
  
  // Check for common follow-up phrases
  for (const indicator of followUpIndicators) {
    if (normalizedQuery.startsWith(indicator) || 
        normalizedQuery.includes(` ${indicator} `)) {
      return true;
    }
  }
  
  // Check for very short queries, which are often follow-ups
  if (normalizedQuery.split(' ').length <= 3) {
    return true;
  }
  
  // Check for pronouns referring to previous content
  const pronouns = ['it', 'they', 'them', 'this', 'these', 'that', 'those', 'their', 'its'];
  for (const pronoun of pronouns) {
    if (normalizedQuery.startsWith(pronoun + ' ') || 
        normalizedQuery.includes(` ${pronoun} `)) {
      return true;
    }
  }
  
  // Advanced NLP techniques for follow-up detection
  const advancedFollowUpIndicators = [
    'can you elaborate on', 'could you explain further', 'what do you mean by',
    'how does this relate to', 'what are the implications of', 'can you provide more details on'
  ];
  
  for (const indicator of advancedFollowUpIndicators) {
    if (normalizedQuery.includes(indicator)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Add a new turn to an existing conversation context
 * @param context Existing conversation context (or undefined to create new)
 * @param turn New conversation turn to add
 * @returns Updated conversation context
 */
export function addTurnToContext(context: ConversationContext | undefined, turn: ConversationTurn): ConversationContext {
  const newContext: ConversationContext = context ? {
    ...context,
    lastUpdated: Date.now()
  } : {
    turns: [],
    lastUpdated: Date.now()
  };
  
  // Add the new turn and keep only the most recent MAX_CONTEXT_TURNS
  newContext.turns = [turn, ...newContext.turns].slice(0, MAX_CONTEXT_TURNS);
  
  return newContext;
}

/**
 * Create a context-aware prompt that incorporates conversation history
 * @param query Current user query
 * @param context Conversation context
 * @returns A prompt that includes relevant conversation history
 */
export function createContextualPrompt(query: string, context?: ConversationContext): string {
  if (!context || !context.turns || context.turns.length <= 1) {
    return query; // No meaningful context to add
  }
  
  // Check if context is too old
  const contextAge = Date.now() - context.lastUpdated;
  if (contextAge > MAX_CONTEXT_AGE_MS) {
    return query; // Context is too old to be relevant
  }
  
  // Build a prompt that includes context
  const relevantTurns = context.turns.slice(0, MAX_CONTEXT_TURNS - 1);
  
  const contextString = relevantTurns
    .map((turn, idx) => `Q${idx + 1}: ${turn.query}\nA${idx + 1}: ${turn.answer || '[No answer provided]'}`)
    .join('\n\n');
  
  return `I want to provide context from our conversation so far:\n\n${contextString}\n\nNew question: ${query}`;
}

/**
 * Extracts relevant previous sources from conversation context
 * @param context Conversation context
 * @returns Array of relevant sources from previous turns
 */
export function getRelevantSourcesFromContext(context?: ConversationContext): Array<{title: string; url: string}> {
  if (!context || !context.turns || context.turns.length === 0) {
    return [];
  }
  
  // Collect sources from previous turns, most recent first
  const allSources: Array<{title: string; url: string}> = [];
  
  // Get unique sources from context
  const uniqueUrls = new Set<string>();
  
  for (const turn of context.turns) {
    if (turn.sources) {
      for (const source of turn.sources) {
        if (!uniqueUrls.has(source.url)) {
          uniqueUrls.add(source.url);
          allSources.push(source);
        }
      }
    }
  }
  
  // Return top sources (limit to 5 to avoid context overload)
  return allSources.slice(0, 5);
}

/**
 * Creates a system message that incorporates conversation context for the AI
 * @param context Conversation context
 * @param isFirstTurn Whether this is the first query in a new conversation
 * @returns A system message that guides the AI in providing contextual responses
 */
export function createContextualSystemMessage(context?: ConversationContext, isFirstTurn: boolean = false): string {
  if (!context || !context.turns || context.turns.length <= 1 || isFirstTurn) {
    return `You are Lemur, a helpful search assistant that provides detailed, accurate answers based on search results.

For each response:
1. Synthesize information coherently
2. Cite sources using [Source X] notation
3. Format in clear paragraphs with markdown
4. Include a "Sources" section at the end
5. Present balanced views on controversial topics
6. Only make claims supported by the sources
7. Acknowledge when information is incomplete or uncertain

Your goal is to provide the most helpful, accurate answer possible based on the search results provided.`;
  }
  
  // Create a formatted summary of the previous conversation, including sources when available
  const previousTurns = context.turns
    .slice(1, MAX_CONTEXT_TURNS) // Skip the current query, which is already at index 0
    .map((turn, idx) => {
      let turnSummary = `User: ${turn.query}\n`;
      if (turn.answer) {
        turnSummary += `Assistant: ${turn.answer.substring(0, 300)}`;
        if (turn.answer.length > 300) turnSummary += '...';
      } else {
        turnSummary += 'Assistant: [No response]';
      }
      
      // Add source information if available
      if (turn.sources && turn.sources.length > 0) {
        const sourcesInfo = turn.sources
          .slice(0, 3) // Limit to first 3 sources to avoid context length issues
          .map((source, i) => `[Source ${i+1}]: ${source.title} (${source.url})`)
          .join('\n');
        
        turnSummary += `\n\nSources used:\n${sourcesInfo}`;
      }
      
      // Add model info if available
      if (turn.model) {
        turnSummary += `\n\nModel used: ${turn.model}`;
      }
      
      return turnSummary;
    })
    .join('\n\n');
  
  // Create a more detailed system message for follow-up questions
  return `You are Lemur, a helpful search assistant with perfect memory of this conversation.

This is a follow-up question in an ongoing conversation. Here's the detailed conversation history:

${previousTurns}

Guidelines for your response:
1. Provide a response that directly builds on the conversation so far
2. Reference information from previous turns when relevant
3. Prioritize new search results when they provide more current or relevant information
4. Maintain a coherent narrative across the entire conversation
5. Cite sources using [Source X] notation and include a sources section
6. Format your answer using markdown for readability
7. If you previously couldn't answer something but now have the information, acknowledge this

Your response should be thorough but focused specifically on the user's latest question in context.`;
}
