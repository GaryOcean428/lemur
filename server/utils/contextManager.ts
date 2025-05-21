/**
 * Re-export conversation context utilities from context.ts
 * 
 * This file exists to maintain backward compatibility with code that
 * might still be importing from './utils/contextManager' instead of './utils/context'.
 * 
 * ATTENTION: For new code, please import directly from './utils/context' instead.
 * This file is provided as a compatibility layer for existing code only.
 * 
 * Issue reference: Server Error: Missing Export 'createContextualPrompt' in contextManager
 * Fix: Created this compatibility layer to ensure existing imports continue to work.
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