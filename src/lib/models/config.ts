/**
 * Model Configuration - Centralized registry untuk semua model
 */

// Import types dari @/types (sekarang aman karena types tidak import dari sini)
import type { ModelId, ModelConfig } from '@/types';

export const AWS_REGION = process.env.AWS_REGION || 'us-west-2';

export const MODEL_IDS = {
  CLAUDE_OPUS_4_6: 'us.anthropic.claude-opus-4-6-v1',
  CLAUDE_SONNET_4_0: 'us.anthropic.claude-sonnet-4-0-v1',
  LLAMA_4_MAVERICK: 'us.meta.llama4-maverick-17b-instruct-v1',
} as const;

export const MODELS: Record<ModelId, ModelConfig> = {
  [MODEL_IDS.CLAUDE_OPUS_4_6]: {
    id: MODEL_IDS.CLAUDE_OPUS_4_6,
    name: 'Claude Opus 4.6',
    provider: 'anthropic',
    maxTokens: 4096,
    supportsStreaming: true,
    supportsThinking: true,
    description: 'Maximum reasoning & coding capabilities',
    costLevel: 'high',
  },
  [MODEL_IDS.CLAUDE_SONNET_4_0]: {
    id: MODEL_IDS.CLAUDE_SONNET_4_0,
    name: 'Claude Sonnet 4.0',
    provider: 'anthropic',
    maxTokens: 4096,
    supportsStreaming: true,
    supportsThinking: false,
    description: 'Balanced performance for most tasks',
    costLevel: 'medium',
  },
  [MODEL_IDS.LLAMA_4_MAVERICK]: {
    id: MODEL_IDS.LLAMA_4_MAVERICK,
    name: 'Llama 4 Maverick',
    provider: 'meta',
    maxTokens: 8192,
    supportsStreaming: true,
    supportsThinking: false,
    description: 'Open source, efficient for general tasks',
    costLevel: 'low',
  },
};

// DEFAULT_MODEL dengan explicit type annotation
export const DEFAULT_MODEL: ModelId = MODEL_IDS.CLAUDE_SONNET_4_0;

// Validasi model ID
export function isValidModelId(id: string): id is ModelId {
  return Object.values(MODEL_IDS).includes(id as ModelId);
}

export function getModelConfig(id: string): ModelConfig {
  if (!isValidModelId(id)) {
    throw new Error(`Invalid model ID: ${id}. Available: ${Object.keys(MODEL_IDS).join(', ')}`);
  }
  return MODELS[id];
}
