// ============================================================
// src/config.ts — Re-export dari lib/models/config.ts
// File ini dipertahankan untuk backward compatibility.
// Gunakan @/lib/models/config untuk import baru.
// ============================================================

export {
  MODELS,
  MODEL_IDS,
  DEFAULT_MODEL,
  AWS_REGION,
  isValidModelId,
  getModelConfig,
  calculateCost,
  type ModelId,
} from '@/lib/models/config';
