/**
 * Groq Model Validation Utility
 * 
 * This module enforces the use of approved Groq models throughout the codebase
 * to prevent accidental use of unsupported or incorrect model names.
 * 
 * IMPORTANT: This is a critical safeguard to ensure Lemur only uses the models
 * that we have verified will work correctly with our system. Changing these models 
 * without thorough testing will lead to failures in search functionality.
 */

// The approved models for the Lemur application as documented in docs/groq-compound-beta.md
export const APPROVED_MODELS = {
  // Main inference models
  COMPOUND_BETA: "compound-beta",      // Default model with multiple tool call support
  COMPOUND_BETA_MINI: "compound-beta-mini", // Faster model with single tool call support
  
  // All valid models in a simple array for validation
  ALL_VALID: ["compound-beta", "compound-beta-mini"]
};

// Model feature capabilities
type ModelCapability = {
  supportsMultipleTools: boolean;
  supportsToolCalling: boolean;
  maxTokens: number;
  bestFor: string;
  averageLatencyMs: number;
};

type ModelCapabilityMap = {
  [key in typeof APPROVED_MODELS.ALL_VALID[number]]: ModelCapability;
};

const MODEL_CAPABILITIES: ModelCapabilityMap = {
  "compound-beta": {
    supportsMultipleTools: false, // Updated based on error logs - doesn't seem to support tool calling
    supportsToolCalling: false,   // Added flag to indicate if tool calling is supported at all
    maxTokens: 128000,
    bestFor: "Comprehensive searches with multiple sources",
    averageLatencyMs: 2500
  },
  "compound-beta-mini": {
    supportsMultipleTools: false, // Only supports a single tool call
    supportsToolCalling: false,   // Added flag to indicate if tool calling is supported at all
    maxTokens: 16000,
    bestFor: "Quick searches and simple questions",
    averageLatencyMs: 800
  }
};

/**
 * Validates and ensures a model name is one of the approved models
 * 
 * @param model The model name to validate
 * @param preferFast Whether to prefer the faster mini model on fallback
 * @returns A valid model name from the approved list
 */
export function validateGroqModel(model: string, preferFast: boolean = false): string {
  // Handle null or undefined model
  if (!model) {
    console.error(`⚠️ CRITICAL MODEL ERROR: Null or undefined model provided. This violates the Lemur architecture guidelines.`);
    return preferFast ? APPROVED_MODELS.COMPOUND_BETA_MINI : APPROVED_MODELS.COMPOUND_BETA;
  }
  
  // Normalize to lowercase and trim whitespace
  const normalizedModel = model.toLowerCase().trim();
  
  // If model is already valid after normalization, return the canonical version
  for (const validModel of APPROVED_MODELS.ALL_VALID) {
    if (normalizedModel === validModel.toLowerCase()) {
      // Return the canonical version with correct casing
      return validModel;
    }
  }
  
  // Check for near matches or common typos
  if (normalizedModel.includes('compound') && normalizedModel.includes('beta')) {
    if (normalizedModel.includes('mini')) {
      return APPROVED_MODELS.COMPOUND_BETA_MINI;
    } else {
      return APPROVED_MODELS.COMPOUND_BETA;
    }
  }
  
  // Log error for invalid model with detailed explanation
  console.error(`⚠️ CRITICAL MODEL ERROR: Invalid Groq model '${model}' detected.`);
  console.error(`This violates the Lemur architecture guidelines which require using exactly:`);
  console.error(`- ${APPROVED_MODELS.COMPOUND_BETA} (for comprehensive search with multiple tool support)`);
  console.error(`- ${APPROVED_MODELS.COMPOUND_BETA_MINI} (for faster search with single tool support)`);
  
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
  // Handle null or undefined preference
  if (!preference) {
    return APPROVED_MODELS.COMPOUND_BETA; // Default to standard model
  }
  
  // Normalize preference to lowercase and trim
  const normalizedPref = preference.toLowerCase().trim();
  
  // Map preference to approved model
  switch (normalizedPref) {
    // Fast/Mini model cases
    case 'fast':
    case 'quick':
    case 'mini':
    case 'small':
    case 'lite':
      return APPROVED_MODELS.COMPOUND_BETA_MINI;
    
    // Standard model cases
    case 'comprehensive':
    case 'complete':
    case 'full':
    case 'standard':
    case 'default':
    case 'auto':
    case 'balanced':
    case 'normal':
    case 'maverick': // Include maverick for backward compatibility
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
  const validModel = validateGroqModel(model) as keyof typeof MODEL_CAPABILITIES;
  
  // Check the capabilities map
  return MODEL_CAPABILITIES[validModel].supportsMultipleTools;
}

/**
 * Utility function to determine if a model supports any tool calling at all
 * 
 * @param model The model name to check
 * @returns Boolean indicating whether the model supports tool calling
 */
export function supportsToolCalling(model: string): boolean {
  // Validate model first to ensure it's a known model
  const validModel = validateGroqModel(model) as keyof typeof MODEL_CAPABILITIES;
  
  // Check the capabilities map
  return MODEL_CAPABILITIES[validModel].supportsToolCalling;
}

/**
 * Get the maximum context length for a given model
 * 
 * @param model The model name to check
 * @returns Maximum context length in tokens
 */
export function getModelMaxTokens(model: string): number {
  // Validate model first to ensure it's a known model
  const validModel = validateGroqModel(model) as keyof typeof MODEL_CAPABILITIES;
  
  // Check the capabilities map
  return MODEL_CAPABILITIES[validModel].maxTokens;
}

/**
 * Get a description of what the model is best suited for
 * 
 * @param model The model name
 * @returns A string describing the model's strengths
 */
export function getModelDescription(model: string): string {
  // Validate model first to ensure it's a known model
  const validModel = validateGroqModel(model) as keyof typeof MODEL_CAPABILITIES;
  
  // Return the description from capabilities
  return MODEL_CAPABILITIES[validModel].bestFor;
}