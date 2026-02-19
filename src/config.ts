// src/config.ts

import {
  MODELS,
  DEFAULT_MODEL,
  AWS_REGION,
  isValidModelId,
  getModelConfig,
  getAllModels,
} from '@/lib/models/config';

import type { ModelId, ModelConfig } from '@/lib/models/config';

// Re-export everything
export {
  MODELS,
  DEFAULT_MODEL,
  AWS_REGION,
  isValidModelId,
  getModelConfig,
  getAllModels,
};

export type { ModelId, ModelConfig };

// App-level configuration
export const APP_CONFIG = {
  name: 'Beckrock AI',
  version: '0.2.0',
  aws: {
    region: AWS_REGION,
  },
} as const;
