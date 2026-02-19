// src/lib/models/config.ts

// ============================================
// AWS Region Configuration
// ============================================
export const AWS_REGION: string = process.env.AWS_REGION || 'us-west-2';

// ============================================
// AI Model Definitions (AWS Bedrock - Latest)
// ============================================
export const MODELS = {
  // -----------------------------------------------
  // Anthropic - Claude Opus 4.6 (Flagship Model)
  // -----------------------------------------------
  'anthropic.claude-opus-4-6-20250514-v1:0': {
    id: 'anthropic.claude-opus-4-6-20250514-v1:0',
    name: 'Claude Opus 4.6',
    provider: 'Anthropic' as const,
    description:
      'Most powerful Claude model — superior reasoning, coding, and complex analysis',
    maxTokens: 16384,
    inputTokenLimit: 200000,
    supportsStreaming: true,
    supportsVision: true,
    supportsThinking: true,
    costLevel: 'high' as const,
    inputPricePer1K: 0.015,
    outputPricePer1K: 0.075,
  },

  // -----------------------------------------------
  // Anthropic - Claude Sonnet 4.0 (Balanced Model)
  // -----------------------------------------------
  'anthropic.claude-sonnet-4-20250514-v1:0': {
    id: 'anthropic.claude-sonnet-4-20250514-v1:0',
    name: 'Claude Sonnet 4.0',
    provider: 'Anthropic' as const,
    description:
      'Balanced performance — fast, intelligent, and cost-efficient',
    maxTokens: 8192,
    inputTokenLimit: 200000,
    supportsStreaming: true,
    supportsVision: true,
    supportsThinking: false,
    costLevel: 'medium' as const,
    inputPricePer1K: 0.003,
    outputPricePer1K: 0.015,
  },

  // -----------------------------------------------
  // Meta - Llama 4 Maverick (Open Source Powerhouse)
  // -----------------------------------------------
  'meta.llama4-maverick-17b-128e-instruct-v1:0': {
    id: 'meta.llama4-maverick-17b-128e-instruct-v1:0',
    name: 'Llama 4 Maverick',
    provider: 'Meta' as const,
    description:
      'Latest open-source model by Meta — 17B params with 128 experts MoE architecture',
    maxTokens: 8192,
    inputTokenLimit: 131072,
    supportsStreaming: true,
    supportsVision: false,
    supportsThinking: false,
    costLevel: 'low' as const,
    inputPricePer1K: 0.00065,
    outputPricePer1K: 0.00195,
  },
} as const;

// ============================================
// Type Definitions
// ============================================
export type ModelId = keyof typeof MODELS;
export type ModelConfig = (typeof MODELS)[ModelId];
export type Provider = ModelConfig['provider'];

// ============================================
// Default Model
// ============================================
export const DEFAULT_MODEL: ModelId =
  'anthropic.claude-sonnet-4-20250514-v1:0';

// ============================================
// Helper Functions
// ============================================
export function isValidModelId(modelId: string): modelId is ModelId {
  return modelId in MODELS;
}

export function getModelConfig(modelId: string): ModelConfig {
  if (!isValidModelId(modelId)) {
    return MODELS[DEFAULT_MODEL];
  }
  return MODELS[modelId];
}

export function getAllModels(): ModelConfig[] {
  return Object.values(MODELS);
}

export function getModelsByProvider(provider: Provider): ModelConfig[] {
  return Object.values(MODELS).filter((m) => m.provider === provider);
}
