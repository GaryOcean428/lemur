/**
 * Re-export conversation context utilities from context.ts
 * This file exists to maintain backward compatibility with code that
 * might still be importing from './utils/contextManager' instead of './utils/context'
 */

export {
  ConversationContext,
  ConversationTurn,
  isLikelyFollowUp,
  addTurnToContext,
  createContextualPrompt,
  getRelevantSourcesFromContext,
  createContextualSystemMessage
} from './context';