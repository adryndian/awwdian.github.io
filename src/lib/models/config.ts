import type { ModelId, ModelConfig } from '@/types';

export { type ModelId } from '@/types';

export const AWS_REGION = process.env.AWS_REGION || 'us-west-2';

export const MODEL_IDS = {
  CLAUDE_OPUS_4_6:   'us.anthropic.claude-opus-4-6-v1:0',
  CLAUDE_SONNET_4_0: 'us.anthropic.claude-sonnet-4-0-v1:0',
  DEEPSEEK_R1:       'us.deepseek.r1-v1:0',
  LLAMA_4_MAVERICK:  'us.meta.llama4-maverick-17b-instruct-v1:0',
} as const;

export const MODELS: Record<ModelId, ModelConfig> = {
  [MODEL_IDS.CLAUDE_OPUS_4_6]: {
    id: MODEL_IDS.CLAUDE_OPUS_4_6,
    name: 'Claude Opus 4.6',
    provider: 'anthropic',
    maxTokens: 8192,
    supportsStreaming: true,
    supportsThinking: true,
    description: 'Maximum reasoning - extended thinking',
    costLevel: 'high',
    inputPricePer1K: 15.0,
    outputPricePer1K: 75.0,
  },
  [MODEL_IDS.CLAUDE_SONNET_4_0]: {
    id: MODEL_IDS.CLAUDE_SONNET_4_0,
    name: 'Claude Sonnet 4.0',
    provider: 'anthropic',
    maxTokens: 8192,
    supportsStreaming: true,
    supportsThinking: false,
    description: 'Balanced performance - fast and smart',
    costLevel: 'medium',
    inputPricePer1K: 3.0,
    outputPricePer1K: 15.0,
  },
  [MODEL_IDS.DEEPSEEK_R1]: {
    id: MODEL_IDS.DEEPSEEK_R1,
    name: 'DeepSeek R1',
    provider: 'deepseek',
    maxTokens: 8192,
    supportsStreaming: true,
    supportsThinking: true,
    description: 'Open source reasoning - cost effective',
    costLevel: 'low',
    inputPricePer1K: 0.55,
    outputPricePer1K: 2.19,
  },
  [MODEL_IDS.LLAMA_4_MAVERICK]: {
    id: MODEL_IDS.LLAMA_4_MAVERICK,
    name: 'Llama 4 Maverick',
    provider: 'meta',
    maxTokens: 8192,
    supportsStreaming: true,
    supportsThinking: false,
    description: 'Meta open source - efficient and fast',
    costLevel: 'low',
    inputPricePer1K: 0.19,
    outputPricePer1K: 0.19,
  },
};

export const DEFAULT_MODEL: ModelId = MODEL_IDS.CLAUDE_SONNET_4_0;

export function isValidModelId(id: string): id is ModelId {
  return Object.values(MODEL_IDS).includes(id as ModelId);
}

export function getModelConfig(id: string): ModelConfig {
  if (!isValidModelId(id)) {
    throw new Error('Invalid model ID: ' + id);
  }
  return MODELS[id as ModelId];
}

export function calculateCost(
  modelId: ModelId,
  inputTokens: number,
  outputTokens: number
): number {
  const model = MODELS[modelId];
  if (!model) return 0;
  const inputCost = (inputTokens / 1000) * model.inputPricePer1K;
  const outputCost = (outputTokens / 1000) * model.outputPricePer1K;
  return Number((inputCost + outputCost).toFixed(6));
}
