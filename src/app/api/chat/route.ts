// ============================================================
// src/app/api/chat/route.ts — Main API entry point
// ============================================================

// KRITIS: JANGAN gunakan runtime = 'edge'!
// AWS SDK (@aws-sdk/client-bedrock-runtime) membutuhkan Node.js runtime.
// Edge runtime tidak mendukung Node.js native modules.
export const runtime = 'nodejs';
export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';
import { BedrockInvoker } from '@/lib/bedrock/invoker';
import type { ChatRequest } from '@/lib/models/types';
import { DEFAULT_MODEL, isValidModelId, calculateCost } from '@/lib/models/config';
import type { ModelId } from '@/types';

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await req.json();

    // Validasi model ID
    const modelId = body.modelId || DEFAULT_MODEL;
    if (!isValidModelId(modelId)) {
      return NextResponse.json(
        {
          error: `Invalid model ID: "${modelId}"`,
          availableModels: [
            'us.anthropic.claude-opus-4-6-v1:0',
            'us.anthropic.claude-sonnet-4-0-v1:0',
            'us.deepseek.r1-v1:0',
            'us.meta.llama4-maverick-17b-instruct-v1:0',
          ],
        },
        { status: 400 }
      );
    }

    const chatRequest: ChatRequest = {
      messages: body.messages || [],
      modelId,
      temperature: body.temperature,
      maxTokens: body.maxTokens,
      enableThinking: body.enableThinking ?? false,
      stream: body.stream ?? false,
    };

    if (!chatRequest.messages.length) {
      return NextResponse.json(
        { error: 'messages array cannot be empty' },
        { status: 400 }
      );
    }

    // Streaming response
    if (chatRequest.stream) {
      const stream = await createStream(chatRequest);
      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // Non-streaming response
    const response = await BedrockInvoker.invoke(chatRequest);
    const duration = Date.now() - startTime;

    // Hitung cost jika ada usage data
    let cost: number | undefined;
    if (response.usage) {
      cost = calculateCost(
        modelId as ModelId,
        response.usage.inputTokens,
        response.usage.outputTokens
      );
    }

    return NextResponse.json({
      content: response.content,
      thinking: response.thinking,
      model: response.model,
      usage: response.usage,
      cost,
      duration,
    });

  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('[API Chat Error]:', error);

    return NextResponse.json(
      {
        error: error.message || 'Internal server error',
        duration,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

async function createStream(request: ChatRequest): Promise<ReadableStream> {
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      try {
        const generator = BedrockInvoker.invokeStream(request);

        for await (const chunk of generator) {
          const data = `data: ${JSON.stringify({ content: chunk })}\n\n`;
          controller.enqueue(encoder.encode(data));
        }

        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      } catch (error) {
        const errorData = `data: ${JSON.stringify({ error: (error as Error).message })}\n\n`;
        controller.enqueue(encoder.encode(errorData));
        controller.close();
      }
    },
  });
}
