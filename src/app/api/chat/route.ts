/**
 * Main API Route - Entry point untuk chat completion
 * Mendukung: Claude Opus 4.6, Sonnet 4.0, Llama 4 Maverick
 */

import { NextRequest, NextResponse } from 'next/server';
import { BedrockInvoker } from '@/lib/bedrock/invoker';
import { ChatRequest } from '@/lib/models/types';
// FIX: Import dari config.ts, bukan dari types
import { DEFAULT_MODEL, isValidModelId } from '@/lib/models/config';

export const runtime = 'edge';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const chatRequest: ChatRequest = {
      messages: body.messages || [],
      modelId: body.modelId || DEFAULT_MODEL,
      temperature: body.temperature,
      maxTokens: body.maxTokens,
      enableThinking: body.enableThinking,
      stream: body.stream ?? false,
    };

    if (!isValidModelId(chatRequest.modelId!)) {
      return NextResponse.json(
        {
          error: 'Invalid model ID',
          availableModels: [
            'us.anthropic.claude-opus-4-6-v1',
            'us.anthropic.claude-sonnet-4-0-v1',
            'us.meta.llama4-maverick-17b-instruct-v1'
          ]
        },
        { status: 400 }
      );
    }

    if (!chatRequest.messages.length) {
      return NextResponse.json(
        { error: 'Messages array cannot be empty' },
        { status: 400 }
      );
    }

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

    const response = await BedrockInvoker.invoke(chatRequest);
    return NextResponse.json(response);

  } catch (error: any) {
    console.error('[API Chat Error]:', error);

    return NextResponse.json(
      {
        error: error.message || 'Internal server error',
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
