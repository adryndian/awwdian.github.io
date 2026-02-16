import { BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime';
import { MODELS } from '../models/config';
import { ModelId } from '@/types';

const client = new BedrockRuntimeClient({
  region: 'us-west-2',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export { client };
