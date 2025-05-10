// server/config/modelConfig.ts

/**
 * Defines the structure for a single AI model configuration.
 */
export interface ModelConfig {
  modelId: string; // e.g., "groq-llama3-70b", "openai-gpt-4.1", "openai-gpt-4.1-mini"
  provider: "groq" | "openai" | "tavily" | "serper" | "internal"; // Model provider
  displayName: string; // User-friendly name
  description?: string;
  tierAccess: Array<"free" | "basic" | "pro" | "unauthenticated">; // Tiers that can access this model
  capabilities: Array<"search" | "summarization" | "analysis" | "chat" | "planning" | "image_generation">; // What the model can do
  isPrimaryForCapability?: Record<string, boolean>; // e.g., { search: true } if it's a primary search model
  contextWindow?: number; // Token limit
  costPerInputToken?: number; // For cost tracking (optional)
  costPerOutputToken?: number; // For cost tracking (optional)
  nativeSearchEnabled?: boolean; // Specifically for models like GPT-4.1 that have built-in search
}

/**
 * Defines the fallback strategy for a given primary model or capability.
 */
export interface FallbackStrategy {
  primaryModelId: string; // The model for which this fallback applies
  fallbackModelIds: string[]; // Ordered list of model IDs to try in case of primary failure
}

/**
 * Defines the model preferences for different user tiers.
 */
export interface TierModelPreference {
  tier: "free" | "basic" | "pro" | "unauthenticated";
  defaultModels: {
    search?: string; // Preferred modelId for search
    summarization?: string;
    analysis?: string;
    chat?: string;
    planning?: string;
    // Add other capabilities as needed
  };
  allowedModels: string[]; // List of all modelIds accessible by this tier
}

// --- System-Wide Model Configurations ---
export const AVAILABLE_MODELS: ModelConfig[] = [
  // Groq Models
  {
    modelId: "groq-compound-beta",
    provider: "groq",
    displayName: "Groq Compound (Beta)",
    tierAccess: ["pro"],
    capabilities: ["analysis", "summarization", "chat", "planning"],
    isPrimaryForCapability: { analysis: true, summarization: true, chat: true, planning: true }, // Pro tier primary
    contextWindow: 32768, // Example, update with actual
  },
  {
    modelId: "groq-compound-beta-mini",
    provider: "groq",
    displayName: "Groq Compound Mini (Beta)",
    tierAccess: ["free", "basic"],
    capabilities: ["analysis", "summarization", "chat"],
    isPrimaryForCapability: { analysis: true, summarization: true, chat: true }, // Free/Basic tier primary
    contextWindow: 8192, // Example, update with actual
  },
  // OpenAI Models
  {
    modelId: "openai-gpt-4.1",
    provider: "openai",
    displayName: "OpenAI GPT-4.1",
    tierAccess: ["pro"],
    capabilities: ["search", "analysis", "summarization", "chat", "planning"],
    nativeSearchEnabled: true,
    contextWindow: 1000000, // From recent search results
  },
  {
    modelId: "openai-gpt-4.1-mini",
    provider: "openai",
    displayName: "OpenAI GPT-4.1 Mini",
    tierAccess: ["free", "basic", "pro"], // Accessible by all, maybe as fallback or specific tasks
    capabilities: ["search", "analysis", "summarization", "chat"],
    nativeSearchEnabled: true,
    contextWindow: 1047576, // from search results, max tokens (check if this is input or total)
  },
  // Search-Specific Agents (as models for consistency in selection)
  {
    modelId: "tavily-search-agent",
    provider: "tavily",
    displayName: "Tavily Web Search",
    tierAccess: ["free", "basic", "pro", "unauthenticated"],
    capabilities: ["search"],
    isPrimaryForCapability: { search: true },
  },
  {
    modelId: "serper-scholar-agent",
    provider: "serper",
    displayName: "Serper Google Scholar Search",
    tierAccess: ["free", "basic", "pro", "unauthenticated"],
    capabilities: ["search"],
  },
];

// --- Fallback Strategies ---
export const MODEL_FALLBACK_STRATEGIES: FallbackStrategy[] = [
  {
    primaryModelId: "groq-compound-beta",
    fallbackModelIds: ["openai-gpt-4.1", "groq-compound-beta-mini", "openai-gpt-4.1-mini"],
  },
  {
    primaryModelId: "groq-compound-beta-mini",
    fallbackModelIds: ["openai-gpt-4.1-mini"],
  },
  {
    primaryModelId: "tavily-search-agent", // If Tavily fails
    fallbackModelIds: ["openai-gpt-4.1"], // Use GPT-4.1's native search
  },
  // Add more strategies as needed
];

// --- Tier-Based Model Preferences ---
export const TIER_MODEL_PREFERENCES: TierModelPreference[] = [
  {
    tier: "unauthenticated",
    defaultModels: {
      search: "tavily-search-agent",
      // No LLM access for unauthenticated usually, or a very limited one
    },
    allowedModels: ["tavily-search-agent", "serper-scholar-agent"],
  },
  {
    tier: "free",
    defaultModels: {
      search: "tavily-search-agent",
      summarization: "groq-compound-beta-mini",
      analysis: "groq-compound-beta-mini",
      chat: "groq-compound-beta-mini",
    },
    allowedModels: [
      "tavily-search-agent", 
      "serper-scholar-agent", 
      "groq-compound-beta-mini", 
      "openai-gpt-4.1-mini"
    ],
  },
  {
    tier: "basic",
    defaultModels: {
      search: "tavily-search-agent",
      summarization: "groq-compound-beta-mini",
      analysis: "groq-compound-beta-mini",
      chat: "groq-compound-beta-mini",
    },
    allowedModels: [
      "tavily-search-agent", 
      "serper-scholar-agent", 
      "groq-compound-beta-mini", 
      "openai-gpt-4.1-mini"
    ],
  },
  {
    tier: "pro",
    defaultModels: {
      search: "tavily-search-agent",
      summarization: "groq-compound-beta",
      analysis: "groq-compound-beta",
      chat: "groq-compound-beta",
      planning: "groq-compound-beta",
    },
    allowedModels: [
      "tavily-search-agent",
      "serper-scholar-agent",
      "groq-compound-beta",
      "groq-compound-beta-mini",
      "openai-gpt-4.1",
      "openai-gpt-4.1-mini",
    ],
  },
];

/**
 * Retrieves the model configuration for a given model ID.
 */
export const getModelConfigById = (modelId: string): ModelConfig | undefined => {
  return AVAILABLE_MODELS.find(m => m.modelId === modelId);
};

/**
 * Retrieves the fallback strategy for a given primary model ID.
 */
export const getFallbackStrategy = (primaryModelId: string): FallbackStrategy | undefined => {
  return MODEL_FALLBACK_STRATEGIES.find(s => s.primaryModelId === primaryModelId);
};

/**
 * Retrieves the model preferences for a given user tier.
 */
export const getTierPreferences = (tier: "free" | "basic" | "pro" | "unauthenticated"): TierModelPreference | undefined => {
  return TIER_MODEL_PREFERENCES.find(tp => tp.tier === tier);
};

