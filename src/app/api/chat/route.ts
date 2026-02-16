import { NextRequest } from 'next/server';
import { invokeClaude } from '@/lib/bedrock/claude';
import { streamDeepSeek } from '@/lib/bedrock/deepseek';
import { streamLlama } from '@/lib/bedrock/llama';
import { MODELS } from '@/lib/models/config';
import { ModelId } from '@/types';

// Helper: buat SSE stream dari generator async
function createSSEStream(
  generator: AsyncGenerator<string, { inputTokens: number; outputTokens: number; costUSD: number }>
): ReadableStream {
  return new ReadableStream({
    async start(controller) {
      const encode = (data: string) => new TextEncoder().encode(data);
      try {
        // Iterasi setiap text chunk
        let result: { inputTokens: number; outputTokens: number; costUSD: number } | undefined;
        while (true) {
          const { value, done } = await generator.next();
          if (done) {
            // value di sini adalah return value (usage stats)
            result = value as { inputTokens: number; outputTokens: number; costUSD: number };
            break;
          }
          if (typeof value === 'string' && value) {
            controller.enqueue(encode(`data: ${JSON.stringify({ content: value })}\n\n`));
          }
        }
        // Kirim usage stats setelah selesai
        if (result) {
          controller.enqueue(encode(`data: ${JSON.stringify({ usage: result })}\n\n`));
        }
        controller.enqueue(encode('data: [DONE]\n\n'));
        controller.close();
      } catch (error) {
        console.error('Streaming error:', error);
        controller.enqueue(
          encode(`data: ${JSON.stringify({ error: 'Streaming failed' })}\n\n`)
        );
        controller.close();
      }
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const { messages, model } = await req.json();
    const modelConfig = MODELS[model as ModelId];

    if (!modelConfig) {
      return Response.json({ error: 'Invalid model' }, { status: 400 });
    }

    // === STREAMING: DeepSeek & Llama ===
    if (modelConfig.supportsStreaming) {
      let generator:
        | AsyncGenerator<string, { inputTokens: number; outputTokens: number; costUSD: number }>
        | undefined;

      if (model === 'deepseek-r1') {
        generator = streamDeepSeek(messages);
      } else if (model === 'llama-4-maverick') {
        generator = streamLlama(messages);
      }

      if (!generator) {
        return Response.json({ error: 'Streaming generator not found' }, { status: 500 });
      }

      const stream = createSSEStream(generator);

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // === NON-STREAMING: Claude Sonnet & Opus ===
    const result = await invokeClaude(messages, model as ModelId);
    return Response.json({
      content: result.content,
      usage: result.usage,
    });
  } catch (error) {
    console.error('API error:', error);
    return Response.json({ error: 'Failed to generate response' }, { status: 500 });
  }
}
