export type ModelId = 
  | 'anthropic.claude-opus-4-6-v1'
  | 'anthropic.claude-sonnet-4-6-v1'
  | 'amazon.nova-reels-v1:0'
  | 'anthropic.claude-3-sonnet-20240229-v1:0'
  | 'anthropic.claude-3-opus-20240229-v1:0';

export interface ModelConfig {
  id: ModelId;
  name: string;
  description: string;
  type: 'text' | 'image' | 'video' | 'multimodal';
  maxTokens: number;
  supportsFileUpload: boolean;
  supportsImageUpload: boolean;
  costPer1KTokens: string;
  color: string;
}

export const AVAILABLE_MODELS: ModelConfig[] = [
  {
    id: 'anthropic.claude-opus-4-6-v1',
    name: 'Claude Opus 4.6',
    description: 'Most powerful model for complex tasks',
    type: 'multimodal',
    maxTokens: 128000,
    supportsFileUpload: true,
    supportsImageUpload: true,
    costPer1KTokens: '$15.00 / $75.00',
    color: 'bg-purple-500',
  },
  {
    id: 'anthropic.claude-sonnet-4-6-v1',
    name: 'Claude Sonnet 4.6',
    description: 'Balanced performance and speed',
    type: 'multimodal',
    maxTokens: 128000,
    supportsFileUpload: true,
    supportsImageUpload: true,
    costPer1KTokens: '$3.00 / $15.00',
    color: 'bg-blue-500',
  },
  {
    id: 'amazon.nova-reels-v1:0',
    name: 'Amazon Nova Reels',
    description: 'Generate images and videos',
    type: 'video',
    maxTokens: 16000,
    supportsFileUpload: true,
    supportsImageUpload: true,
    costPer1KTokens: '$0.80 / $3.20',
    color: 'bg-orange-500',
  },
  {
    id: 'anthropic.claude-3-opus-20240229-v1:0',
    name: 'Claude 3 Opus',
    description: 'Previous generation Opus',
    type: 'text',
    maxTokens: 4096,
    supportsFileUpload: true,
    supportsImageUpload: true,
    costPer1KTokens: '$15.00 / $75.00',
    color: 'bg-indigo-500',
  },
  {
    id: 'anthropic.claude-3-sonnet-20240229-v1:0',
    name: 'Claude 3 Sonnet',
    description: 'Previous generation Sonnet',
    type: 'text',
    maxTokens: 4096,
    supportsFileUpload: true,
    supportsImageUpload: true,
    costPer1KTokens: '$3.00 / $15.00',
    color: 'bg-cyan-500',
  },
];

export const DEFAULT_MODEL: ModelId = 'anthropic.claude-sonnet-4-6-v1';

export function getModelById(id: ModelId): ModelConfig | undefined {
  return AVAILABLE_MODELS.find(model => model.id === id);
}

export function supportsFileUpload(modelId: ModelId): boolean {
  const model = getModelById(modelId);
  return model?.supportsFileUpload ?? false;
}

export function supportsImageUpload(modelId: ModelId): boolean {
  const model = getModelById(modelId);
  return model?.supportsImageUpload ?? false;
}
export const MODELS = {
  'claude-opus-4-6': 'anthropic.claude-opus-4-6-v1',
  'claude-sonnet-4-6': 'anthropic.claude-sonnet-4-6-v1', 
  'nova-reels': 'amazon.nova-reels-v1:0'
} as const;

