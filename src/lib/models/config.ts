export const AWS_REGION: string = process.env.AWS_REGION || 'us-west-2';

export const MODELS = {
  'anthropic.claude-opus-4-6-20250514-v1:0': {
    id: 'anthropic.claude-opus-4-6-20250514-v1:0' as const,
    name: 'Claude Opus 4.6',
    provider: 'Anthropic' as const,
    description: 'Most powerful Claude model',
    maxTokens: 16384,
    inputTokenLimit: 200000,
    supportsStreaming: true,
    supportsVision: true,
    supportsThinking: true,
    costLevel: 'high' as const,
    inputPricePer1K: 0.015,
    outputPricePer1K: 0.075,
  },
  'anthropic.claude-sonnet-4-20250514-v1:0': {
    id: 'anthropic.claude-sonnet-4-20250514-v1:0' as const,
    name: 'Claude Sonnet 4.0',
    provider: 'Anthropic' as const,
    description: 'Balanced performance and cost',
    maxTokens: 8192,
    inputTokenLimit: 200000,
    supportsStreaming: true,
    supportsVision: true,
    supportsThinking: false,
    costLevel: 'medium' as const,
    inputPricePer1K: 0.003,
    outputPricePer1K: 0.015,
  },
  'meta.llama4-maverick-17b-128e-instruct-v1:0': {
    id: 'meta.llama4-maverick-17b-128e-instruct-v1:0' as const,
    name: 'Llama 4 Maverick',
    provider: 'Meta' as const,
    description: 'Open-source model by Meta',
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

export type ModelId = keyof typeof MODELS;
export type ModelConfig = (typeof MODELS)[ModelId];
export type Provider = ModelConfig['provider'];

export const DEFAULT_MODEL: ModelId = 'anthropic.claude-sonnet-4-20250514-v1:0';

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