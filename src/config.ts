// src/config.ts

import {
  MODELS,
  DEFAULT_MODEL,
  AWS_REGION,
  isValidModelId,
  getModelConfig,
  getAllModels,
  getModelsByProvider,
} from '@/lib/models/config';

import type { ModelId, ModelConfig, Provider } from '@/lib/models/config';

// Re-export everything
export {
  MODELS,
  DEFAULT_MODEL,
  AWS_REGION,
  isValidModelId,
  getModelConfig,
  getAllModels,
  getModelsByProvider,
};

export type { ModelId, ModelConfig, Provider };

// App-level configuration (personal use — no limits)
export const APP_CONFIG = {
  name: 'Beckrock AI',
  version: '0.2.0',
  aws: {
    region: AWS_REGION,
  },
  limits: {
    // No rate limiting — personal use
    maxRequestsPerMinute: Infinity,
    maxTokensPerRequest: 16384,
  },
} as const;
