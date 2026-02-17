/**
 * Bedrock Client Singleton - Hindari multiple instance
 */

import { BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime';
import { AWS_REGION } from '@/types';

// Singleton pattern untuk menghindari koneksi berulang
let bedrockClient: BedrockRuntimeClient | null = null;

export function getBedrockClient(): BedrockRuntimeClient {
  if (!bedrockClient) {
    bedrockClient = new BedrockRuntimeClient({
      region: AWS_REGION,
      // Credential akan otomatis dari environment/IAM role
      // Jika running local, pastikan AWS credentials terkonfigurasi
    });
  }
  return bedrockClient;
}

// Reset client jika diperlukan (misal: error credential)
export function resetBedrockClient(): void {
  bedrockClient = null;
}
