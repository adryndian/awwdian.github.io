export const AWS_REGION: string = process.env.AWS_REGION || 'us-west-2';

export interface ModelDef {
  id: string;
  name: string;
  provider: 'Anthropic' | 'Meta';
  description: string;
  maxTokens: number;
  inputTokenLimit: number;
  supportsStreaming: boolean;
  supportsVision: boolean;
  supportsThinking: boolean;
  costLevel: 'high' | 'medium' | 'low';
  inputPricePer1K: number;
  outputPricePer1K: number;
}

export const MODELS: Record<string, ModelDef> = {
  'anthropic.claude-opus-4-6-20250514-v1:0': {
    id: 'anthropic.claude-opus-4-6-20250514-v1:0',
    name: 'Claude Opus 4.6',
    provider: 'Anthropic',
    description: 'Most powerful Claude model',
    maxTokens: 16384,
    inputTokenLimit: 200000,
    supportsStreaming: true,
    supportsVision: true,
    supportsThinking: true,
    costLevel: 'high',
    inputPricePer1K: 0.015,
    outputPricePer1K: 0.075,
  },
  'anthropic.claude-sonnet-4-20250514-v1:0': {
    id: 'anthropic.claude-sonnet-4-20250514-v1:0',
    name: 'Claude Sonnet 4.0',
    provider: 'Anthropic',
    description: 'Balanced performance and cost',
    maxTokens: 8192,
    inputTokenLimit: 200000,
    supportsStreaming: true,
    supportsVision: true,
    supportsThinking: false,
    costLevel: 'medium',
    inputPricePer1K: 0.003,
    outputPricePer1K: 0.015,
  },
  'meta.llama4-maverick-17b-128e-instruct-v1:0': {
    id: 'meta.llama4-maverick-17b-128e-instruct-v1:0',
    name: 'Llama 4 Maverick',
    provider: 'Meta',
    description: 'Open-source model by Meta',
    maxTokens: 8192,
    inputTokenLimit: 131072,
    supportsStreaming: true,
    supportsVision: false,
    supportsThinking: false,
    costLevel: 'low',
    inputPricePer1K: 0.00065,
    outputPricePer1K: 0.00195,
  },
};

export type ModelId = string;

export const DEFAULT_MODEL = 'anthropic.claude-sonnet-4-20250514-v1:0';

export function isValidModelId(modelId: string): boolean {
  return modelId in MODELS;
}

export function getModelConfig(modelId: string): ModelDef {
  if (modelId in MODELS) {
    return MODELS[modelId];
  }
  return MODELS[DEFAULT_MODEL];
}

export function getAllModels(): ModelDef[] {
  return Object.values(MODELS);
}