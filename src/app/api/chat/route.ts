// src/app/api/chat/route.ts

import { NextRequest, NextResponse } from 'next/server';
import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime';
import {
  AWS_REGION,
  getModelConfig,
  isValidModelId,
  DEFAULT_MODEL,
} from '@/lib/models/config';

// ============================================
// Bedrock Client (us-west-2) — No rate limiting
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

// ============================================
// Request Body Builders
// ============================================

function buildAnthropicBody(
  message: string,
  history: ChatMessage[],
  maxTokens: number,
  temperature: number,
  enableThinking: boolean
): string {
  const messages = [
    ...history.map((msg) => ({
      role: msg.role,
      content: msg.content,
    })),
    { role: 'user', content: message },
  ];

  const body: Record<string, unknown> = {
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: maxTokens,
    temperature,
    messages,
  };

  // Extended thinking for Opus 4.6
  if (enableThinking) {
    body.temperature = 1; // Required for extended thinking
    body.thinking = {
      type: 'enabled',
      budget_tokens: 10000,
    };
  }

  return JSON.stringify(body);
}

function buildMetaLlama4Body(
  message: string,
  history: ChatMessage[],
  maxTokens: number,
  temperature: number
): string {
  // Build chat prompt for Llama 4 Maverick
  let prompt = '<|begin_of_text|>';
  prompt +=
    '<|start_header_id|>system<|end_header_id|>\n\nYou are a helpful, harmless, and honest AI assistant.<|eot_id|>';

  for (const msg of history) {
    prompt += `<|start_header_id|>${msg.role}<|end_header_id|>\n\n${msg.content}<|eot_id|>`;
  }

  prompt += `<|start_header_id|>user<|end_header_id|>\n\n${message}<|eot_id|>`;
  prompt += '<|start_header_id|>assistant<|end_header_id|>\n\n';

  return JSON.stringify({
    prompt,
    max_gen_len: maxTokens,
    temperature,
    top_p: 0.9,
  });
}

// ============================================
// Response Parsers
// ============================================

function parseAnthropicResponse(responseBody: Record<string, unknown>): {
  content: string;
  thinking?: string;
} {
  const contentBlocks = responseBody.content as Array<{
    type: string;
    text?: string;
    thinking?: string;
  }>;

  let content = '';
  let thinking = '';

  if (contentBlocks && Array.isArray(contentBlocks)) {
    for (const block of contentBlocks) {
      if (block.type === 'thinking' && block.thinking) {
        thinking += block.thinking;
      } else if (block.type === 'text' && block.text) {
        content += block.text;
      }
    }
  }

  return {
    content: content || 'No response from Claude.',
    thinking: thinking || undefined,
  };
}

function parseMetaResponse(responseBody: Record<string, unknown>): {
  content: string;
} {
  const generation = (responseBody.generation as string) || '';
  return {
    content: generation || 'No response from Llama.',
  };
}

// ============================================
// Cost Calculator
// ============================================

function calculateCost(
  modelId: string,
  inputTokens: number,
  outputTokens: number
): number {
  const config = getModelConfig(modelId);
  const inputCost = (inputTokens / 1000) * config.inputPricePer1K;
  const outputCost = (outputTokens / 1000) * config.outputPricePer1K;
  return inputCost + outputCost;
}

// ============================================
// Main Handler — NO RATE LIMITING (Personal Use)
// ============================================

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      message,
      modelId = DEFAULT_MODEL,
      history = [],
      temperature = 0.7,
      maxTokens,
    } = body;

    // Validate input
    if (
      !message ||
      typeof message !== 'string' ||
      message.trim().length === 0
    ) {
      return NextResponse.json(
        { error: 'Message is required.' },
        { status: 400 }
      );
    }

    // Resolve model
    const selectedModelId = isValidModelId(modelId)
      ? modelId
      : DEFAULT_MODEL;
    const modelConfig = getModelConfig(selectedModelId);
    const effectiveMaxTokens = maxTokens || modelConfig.maxTokens;

    // Determine if thinking is supported
    const enableThinking =
      modelConfig.supportsThinking === true;

    // Build request body
    let requestBody: string;

    switch (modelConfig.provider) {
      case 'Anthropic':
        requestBody = buildAnthropicBody(
          message.trim(),
          history,
          effectiveMaxTokens,
          enableThinking ? 1 : temperature,
          enableThinking
        );
        break;

      case 'Meta':
        requestBody = buildMetaLlama4Body(
          message.trim(),
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

    // Send to Bedrock
    console.log(
      `[Bedrock] → ${modelConfig.name} (${selectedModelId}) in ${AWS_REGION}`
    );

    const startTime = Date.now();

    const command = new InvokeModelCommand({
      modelId: selectedModelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: requestBody,
    });

    const response = await bedrockClient.send(command);
    const duration = Date.now() - startTime;

    const responseBody = JSON.parse(
      new TextDecoder().decode(response.body)
    ) as Record<string, unknown>;

    // Parse response
    let content: string;
    let thinking: string | undefined;

    switch (modelConfig.provider) {
      case 'Anthropic': {
        const parsed = parseAnthropicResponse(responseBody);
        content = parsed.content;
        thinking = parsed.thinking;
        break;
      }
      case 'Meta': {
        const parsed = parseMetaResponse(responseBody);
        content = parsed.content;
        break;
      }
      default:
        content = 'Unsupported provider.';
    }

    // Extract token usage (if available)
    const usage = responseBody.usage as
      | { input_tokens?: number; output_tokens?: number }
      | undefined;
    const inputTokens = usage?.input_tokens || 0;
    const outputTokens = usage?.output_tokens || 0;
    const cost =
      inputTokens > 0 || outputTokens > 0
        ? calculateCost(selectedModelId, inputTokens, outputTokens)
        : undefined;

    console.log(
      `[Bedrock] ← ${modelConfig.name} | ${content.length} chars | ${duration}ms | ${inputTokens}+${outputTokens} tokens`
    );

    // Return response
    return NextResponse.json({
      message: content,
      model: selectedModelId,
      modelName: modelConfig.name,
      provider: modelConfig.provider,
      thinking,
      cost,
      inputTokens,
      outputTokens,
      duration,
    });
  } catch (error: unknown) {
    console.error('[Bedrock] Error:', error);

    if (error instanceof Error) {
      const awsError = error as Error & {
        name?: string;
        $metadata?: { httpStatusCode?: number };
      };

      const errorMap: Record<string, { msg: string; status: number }> = {
        AccessDeniedException: {
          msg: 'Access denied. Pastikan IAM memiliki permission bedrock:InvokeModel dan model sudah di-enable.',
          status: 403,
        },
        ValidationException: {
          msg: `Validation error: ${awsError.message}`,
          status: 400,
        },
        ThrottlingException: {
          msg: 'AWS Bedrock throttling. Coba lagi dalam beberapa detik.',
          status: 429,
        },
        ModelNotReadyException: {
          msg: 'Model sedang cold start. Coba lagi.',
          status: 503,
        },
        ResourceNotFoundException: {
          msg: 'Model tidak ditemukan. Pastikan model ID benar dan sudah di-enable di Bedrock console.',
          status: 404,
        },
      };

      const mapped = errorMap[awsError.name || ''];
      if (mapped) {
        return NextResponse.json(
          { error: mapped.msg },
          { status: mapped.status }
        );
      }

      return NextResponse.json(
        { error: `Bedrock error: ${awsError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'An unexpected error occurred.' },
      { status: 500 }
    );
  }
}

// Health check
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    region: AWS_REGION,
    models: Object.values(
      await import('@/lib/models/config').then((m) => m.MODELS)
    ).map((m) => m.name),
  });
}
