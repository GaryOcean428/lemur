/**
 * Groq Model Validation Utility
 * 
 * This module enforces the use of approved Groq models throughout the codebase
 * to prevent accidental use of unsupported or incorrect model names.
 */

// The approved models for the Lemur application as documented in docs/groq-compound-beta.md
export const APPROVED_MODELS = {
  // Main inference models
  COMPOUND_BETA: "compound-beta",      // Default model with multiple tool call support
  COMPOUND_BETA_MINI: "compound-beta-mini", // Faster model with single tool call support
  
  // All valid models in a simple array for validation
  ALL_VALID: ["compound-beta", "compound-beta-mini"]
};

/**
 * Validates and ensures a model name is one of the approved models
 * 
 * @param model The model name to validate
 * @param preferFast Whether to prefer the faster mini model on fallback
 * @returns A valid model name from the approved list
 */
export function validateGroqModel(model: string, preferFast: boolean = false): string {
  // If model is already valid, return it
  if (APPROVED_MODELS.ALL_VALID.includes(model)) {
    return model;
  }
  
  // Log error for invalid model
  console.error(`⚠️ CRITICAL MODEL ERROR: Invalid Groq model '${model}' detected. This violates the Lemur architecture guidelines.`);
  console.error(`Only these models are approved: ${APPROVED_MODELS.ALL_VALID.join(', ')}`);
  
  // Return the appropriate fallback model
  if (preferFast) {
    console.error(`Falling back to ${APPROVED_MODELS.COMPOUND_BETA_MINI}`);
    return APPROVED_MODELS.COMPOUND_BETA_MINI;
  } else {
    console.error(`Falling back to ${APPROVED_MODELS.COMPOUND_BETA}`);
    return APPROVED_MODELS.COMPOUND_BETA;
  }
}

/**
 * Maps user-friendly model preference to a valid Groq model
 * 
 * @param preference User preference (auto, fast, comprehensive, etc.)
 * @returns A valid model from the approved list
 */
export function mapModelPreference(preference: string): string {
  // Normalize preference to lowercase
  const normalizedPref = preference.toLowerCase();
  
  // Map preference to approved model
  switch (normalizedPref) {
    case 'fast':
      return APPROVED_MODELS.COMPOUND_BETA_MINI;
    case 'comprehensive':
    case 'auto':
    case 'maverick':
    default:
      return APPROVED_MODELS.COMPOUND_BETA;
  }
}

/**
 * Utility function to determine if a model supports multiple tool calling
 * 
 * @param model The model name to check
 * @returns Boolean indicating whether the model supports multiple tools
 */
export function supportsMultipleTools(model: string): boolean {
  // Validate model first to ensure it's a known model
  const validModel = validateGroqModel(model);
  
  // Only compound-beta supports multiple tool calls
  return validModel === APPROVED_MODELS.COMPOUND_BETA;
}