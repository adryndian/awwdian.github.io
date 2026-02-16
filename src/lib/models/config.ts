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
    bedrockId: 'anthropic.claude-sonnet-4-5-v1',
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
    bedrockId: 'anthropic.claude-opus-4-6-v1',
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
    bedrockId: 'arn:aws:bedrock:us-west-2:903732996256:inference-profile/us.deepseek.r1-v1:0',
    region: 'us-west-2',
    supportsStreaming: true,
    inputPricePer1K: 0.5,
    outputPricePer1K: 2.0,
    color: '#10B981',
    icon: 'bolt',
  },
};

export const DEFAULT_MODEL: ModelId = 'claude-sonnet-4-5';

export function calculateCost(modelId: ModelId, inputTokens: number, outputTokens: number): number {
  const model = MODELS[modelId];
  const inputCost = (inputTokens / 1000) * model.inputPricePer1K;
  const outputCost = (outputTokens / 1000) * model.outputPricePer1K;
  return Number((inputCost + outputCost).toFixed(6));
}
