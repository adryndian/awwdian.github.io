// src/lib/models/config.ts

// ✅ AWS Region Configuration
export const AWS_REGION: string = process.env.AWS_REGION || 'us-east-1';

// ✅ Model Definitions
export const MODELS = {
  'anthropic.claude-3-sonnet-20240229-v1:0': {
    id: 'anthropic.claude-3-sonnet-20240229-v1:0',
    name: 'Claude 3 Sonnet',
    provider: 'Anthropic',
    description: 'Balanced performance and speed',
    maxTokens: 4096,
  },
  'anthropic.claude-3-haiku-20240307-v1:0': {
    id: 'anthropic.claude-3-haiku-20240307-v1:0',
    name: 'Claude 3 Haiku',
    provider: 'Anthropic',
    description: 'Fast and compact',
    maxTokens: 4096,
  },
  'anthropic.claude-3-5-sonnet-20240620-v1:0': {
    id: 'anthropic.claude-3-5-sonnet-20240620-v1:0',
    name: 'Claude 3.5 Sonnet',
    provider: 'Anthropic',
    description: 'Most intelligent Claude model',
    maxTokens: 4096,
  },
  'amazon.titan-text-express-v1': {
    id: 'amazon.titan-text-express-v1',
    name: 'Amazon Titan Text Express',
    provider: 'Amazon',
    description: 'Amazon general purpose model',
    maxTokens: 4096,
  },
  'meta.llama3-8b-instruct-v1:0': {
    id: 'meta.llama3-8b-instruct-v1:0',
    name: 'Llama 3 8B Instruct',
    provider: 'Meta',
    description: 'Open source model by Meta',
    maxTokens: 2048,
  },
} as const;

// ✅ Type Definitions
export type ModelId = keyof typeof MODELS;
export type ModelConfig = (typeof MODELS)[ModelId];

// ✅ Default Model
export const DEFAULT_MODEL: ModelId = 'anthropic.claude-3-sonnet-20240229-v1:0';

// ✅ Helper Functions
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
