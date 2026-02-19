import { BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime';
import { AWS_REGION } from '@/lib/models/config';

const bedrockClient = new BedrockRuntimeClient({
  region: AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

export default bedrockClient;
