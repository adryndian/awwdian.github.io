// src/app/api/chat/route.ts

import { NextRequest, NextResponse } from 'next/server';
import {
  BedrockRuntimeClient,
  InvokeModelCommand,
  InvokeModelWithResponseStreamCommand,
} from '@aws-sdk/client-bedrock-runtime';
import {
  AWS_REGION,
  getModelConfig,
  isValidModelId,
  DEFAULT_MODEL,
} from '@/config';

// ============================================
// Bedrock Client (us-west-2)
// ============================================
const bedrockClient = new BedrockRuntimeClient({
  region: AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

// ============================================
// Types
// ============================================
interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatRequestBody {
  message: string;
  modelId?: string;
  history?: ChatMessage[];
  stream?: boolean;
  temperature?: number;
  maxTokens?: number;
}

// ============================================
// Request Body Builders (per Provider)
// ============================================

function buildAnthropicBody(
  message: string,
  history: ChatMessage[],
  maxTokens: number,
  temperature: number
): string {
  const messages = [
    ...history.map((msg) => ({
      role: msg.role,
      content: msg.content,
    })),
    { role: 'user', content: message },
  ];

  return JSON.stringify({
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: maxTokens,
    temperature,
    messages,
  });
}

function buildMetaLlama4Body(
  message: string,
  history: ChatMessage[],
  maxTokens: number,
  temperature: number
): string {
  // Llama 4 Maverick menggunakan format chat messages
  const messages = [
    {
      role: 'system',
      content: 'You are a helpful, harmless, and honest AI assistant.',
    },
    ...history.map((msg) => ({
      role: msg.role,
      content: msg.content,
    })),
    { role: 'user', content: message },
  ];

  return JSON.stringify({
    prompt: formatLlama4ChatPrompt(messages),
    max_gen_len: maxTokens,
    temperature,
    top_p: 0.9,
  });
}

function formatLlama4ChatPrompt(
  messages: { role: string; content: string }[]
): string {
  // Llama 4 chat template
  let prompt = '<|begin_of_text|>';

  for (const msg of messages) {
    prompt += `<|start_header_id|>${msg.role}<|end_header_id|>\n\n${msg.content}<|eot_id|>`;
  }

  // Signal the model to generate assistant response
  prompt += '<|start_header_id|>assistant<|end_header_id|>\n\n';

  return prompt;
}

// ============================================
// Response Parsers (per Provider)
// ============================================

function parseAnthropicResponse(responseBody: Record<string, unknown>): string {
  const content = responseBody.content as Array<{ type: string; text: string }>;
  if (content && content.length > 0) {
    return content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('');
  }
  return 'No response from Claude.';
}

function parseMetaResponse(responseBody: Record<string, unknown>): string {
  return (responseBody.generation as string) || 'No response from Llama.';
}

// ============================================
// Main API Handler — NO RATE LIMITING (Personal Use)
// ============================================

export async function POST(req: NextRequest) {
  try {
    // ✅ Parse request body
    const body: ChatRequestBody = await req.json();
    const {
      message,
      modelId = DEFAULT_MODEL,
      history = [],
      temperature = 0.7,
      maxTokens,
    } = body;

    // ✅ Validasi input
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message is required and must be a non-empty string.' },
        { status: 400 }
      );
    }

    // ✅ Validasi & resolve model
    const selectedModelId = isValidModelId(modelId) ? modelId : DEFAULT_MODEL;
    const modelConfig = getModelConfig(selectedModelId);
    const effectiveMaxTokens = maxTokens || modelConfig.maxTokens;

    // ✅ Build request body berdasarkan provider
    let requestBody: string;

    switch (modelConfig.provider) {
      case 'Anthropic':
        requestBody = buildAnthropicBody(
          message,
          history,
          effectiveMaxTokens,
          temperature
        );
        break;

      case 'Meta':
        requestBody = buildMetaLlama4Body(
          message,
          history,
          effectiveMaxTokens,
          temperature
        );
        break;

      default:
        return NextResponse.json(
          { error: `Unsupported provider: ${modelConfig.provider}` },
          { status: 400 }
        );
    }

    // ✅ Kirim ke AWS Bedrock — TANPA BATASAN APAPUN
    const command = new InvokeModelCommand({
      modelId: selectedModelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: requestBody,
    });

    console.log(`[Bedrock] Sending request to ${selectedModelId} in ${AWS_REGION}`);

    const response = await bedrockClient.send(command);
    const responseBody = JSON.parse(
      new TextDecoder().decode(response.body)
    ) as Record<string, unknown>;

    // ✅ Parse response berdasarkan provider
    let assistantMessage: string;

    switch (modelConfig.provider) {
      case 'Anthropic':
        assistantMessage = parseAnthropicResponse(responseBody);
        break;

      case 'Meta':
        assistantMessage = parseMetaResponse(responseBody);
        break;

      default:
        assistantMessage = 'Unsupported provider response.';
    }

    console.log(
      `[Bedrock] Response received from ${modelConfig.name} (${assistantMessage.length} chars)`
    );

    // ✅ Return response
    return NextResponse.json({
      message: assistantMessage,
      model: selectedModelId,
      modelName: modelConfig.name,
      provider: modelConfig.provider,
      usage: {
        maxTokens: effectiveMaxTokens,
      },
    });
  } catch (error: unknown) {
    console.error('[Bedrock] API Error:', error);

    // ✅ Detailed error handling
    if (error instanceof Error) {
      // AWS SDK specific errors
      const awsError = error as Error & {
        name?: string;
        $metadata?: { httpStatusCode?: number };
      };

      if (awsError.name === 'AccessDeniedException') {
        return NextResponse.json(
          {
            error: 'Access denied to AWS Bedrock model.',
            details:
              'Pastikan IAM role/user memiliki permission bedrock:InvokeModel dan model sudah di-enable di AWS Bedrock console.',
          },
          { status: 403 }
        );
      }

      if (awsError.name === 'ValidationException') {
        return NextResponse.json(
          {
            error: 'Invalid request to Bedrock.',
            details: awsError.message,
          },
          { status: 400 }
        );
      }

      if (awsError.name === 'ThrottlingException') {
        return NextResponse.json(
          {
            error: 'AWS Bedrock is throttling requests.',
            details: 'Coba lagi dalam beberapa detik.',
          },
          { status: 429 }
        );
      }

      if (awsError.name === 'ModelNotReadyException') {
        return NextResponse.json(
          {
            error: 'Model belum ready.',
            details: 'Model mungkin sedang cold start. Coba lagi.',
          },
          { status: 503 }
        );
      }

      return NextResponse.json(
        {
          error: 'Failed to get AI response.',
          details: awsError.message,
          errorType: awsError.name,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'An unexpected error occurred.' },
      { status: 500 }
    );
  }
}

// ============================================
// Streaming Endpoint (Optional - for better UX)
// ============================================

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    region: AWS_REGION,
    availableModels: [
      'Claude Opus 4.6',
      'Claude Sonnet 4.0',
      'Llama 4 Maverick',
    ],
    rateLimit: 'none (personal use)',
  });
}
