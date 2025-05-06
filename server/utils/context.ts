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
 * @returns A system message that guides the AI in providing contextual responses
 */
export function createContextualSystemMessage(context?: ConversationContext): string {
  if (!context || !context.turns || context.turns.length <= 1) {
    return "You are a helpful search assistant that provides detailed, informative answers based on search results.";
  }
  
  return `You are a helpful search assistant that provides detailed, informative answers based on search results.

The user has been asking a series of related questions. Here's the conversation so far:
${context.turns.slice(0, MAX_CONTEXT_TURNS - 1)
  .map((turn, idx) => `User: ${turn.query}\nYou: ${turn.answer ? turn.answer.substring(0, 200) + (turn.answer.length > 200 ? '...' : '') : '[No response]'}`)
  .join('\n\n')}

Please consider this conversation history when answering the user's next question. Maintain continuity and avoid repeating information already provided, unless the user is specifically asking for clarification.`;
}
