import { ModelId } from '@/types';

export interface ModelConfig {
  id: ModelId;
  name: string;
  description: string;
  bedrockId: string;
  region: string;
  supportsStreaming: boolean;
  inputPricePer1K: number;
  outputPricePer1K: number;
  color: string;
  icon: string;
}

export const MODELS: Record<ModelId, ModelConfig> = {
  'claude-sonnet-4-5': {
    id: 'claude-sonnet-4-5',
    name: 'Claude Sonnet 4.5',
    description: 'Balanced performance & speed',
    // Global Inference Profile ID dari AWS Bedrock console
    bedrockId: 'global.anthropic.claude-sonnet-4-5-20250929-v1:0',
    region: 'us-west-2',
    supportsStreaming: false,
    inputPricePer1K: 3.0,
    outputPricePer1K: 15.0,
    color: '#3B82F6',
    icon: 'zap',
  },
  'claude-opus-4-6': {
    id: 'claude-opus-4-6',
    name: 'Claude Opus 4.6',
    description: 'Most powerful reasoning',
    // Global Inference Profile ID dari AWS Bedrock console
    bedrockId: 'global.anthropic.claude-opus-4-6-v1',
    region: 'us-west-2',
    supportsStreaming: false,
    inputPricePer1K: 15.0,
    outputPricePer1K: 75.0,
    color: '#8B5CF6',
    icon: 'brain',
  },
  'deepseek-r1': {
    id: 'deepseek-r1',
    name: 'DeepSeek R1',
    description: 'Fast & cost-effective streaming',
    // US Inference Profile ID dari AWS Bedrock console
    bedrockId: 'us.deepseek.r1-v1:0',
    region: 'us-west-2',
    supportsStreaming: true,
    inputPricePer1K: 0.5,
    outputPricePer1K: 2.0,
    color: '#10B981',
    icon: 'cpu',
  },
  'llama-4-maverick': {
    id: 'llama-4-maverick',
    name: 'Llama 4 Maverick',
    description: 'Meta Llama 4 17B Instruct',
    // US Inference Profile ID dari AWS Bedrock console
    bedrockId: 'us.meta.llama4-maverick-17b-instruct-v1:0',
    region: 'us-west-2',
    supportsStreaming: true,
    inputPricePer1K: 0.19,
    outputPricePer1K: 0.19,
    color: '#F59E0B',
    icon: 'flame',
  },
};

export const DEFAULT_MODEL: ModelId = 'claude-sonnet-4-5';

export function calculateCost(modelId: ModelId, inputTokens: number, outputTokens: number): number {
  const model = MODELS[modelId];
  const inputCost = (inputTokens / 1000) * model.inputPricePer1K;
  const outputCost = (outputTokens / 1000) * model.outputPricePer1K;
  return Number((inputCost + outputCost).toFixed(6));
}
