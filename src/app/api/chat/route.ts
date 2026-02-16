import { NextRequest } from 'next/server';
import { invokeClaude } from '@/lib/bedrock/claude';
import { streamDeepSeek } from '@/lib/bedrock/deepseek';
import { streamLlama } from '@/lib/bedrock/llama';
import { MODELS } from '@/lib/models/config';
import { ModelId } from '@/types';

// FIX UTAMA: Bersihkan messages dari konten kosong sebelum dikirim ke Bedrock
// Ini mencegah ValidationException "all messages must have non-empty content"
function sanitizeMessages(messages: { role: string; content: string }[]) {
  return messages
    .filter(m => m.content && m.content.trim().length > 0)
    .reduce<{ role: string; content: string }[]>((acc, msg) => {
      // Hindari 2 pesan dari role yang sama berturut-turut
      const last = acc[acc.length - 1];
      if (last && last.role === msg.role) {
        // Gabung jika sama role
        last.content += '\n' + msg.content;
        return acc;
      }
      return [...acc, { role: msg.role, content: msg.content.trim() }];
    }, []);
}

function createSSEStream(
  generator: AsyncGenerator<string, { inputTokens: number; outputTokens: number; costUSD: number }>
): ReadableStream {
  return new ReadableStream({
    async start(controller) {
      const encode = (data: string) => new TextEncoder().encode(data);
      try {
        while (true) {
          const { value, done } = await generator.next();
          if (done) {
            // value = usage stats object
            const result = value as { inputTokens: number; outputTokens: number; costUSD: number };
            controller.enqueue(encode(`data: ${JSON.stringify({ usage: result })}\n\n`));
            break;
          }
          if (typeof value === 'string' && value) {
            controller.enqueue(encode(`data: ${JSON.stringify({ content: value })}\n\n`));
          }
        }
        controller.enqueue(encode('data: [DONE]\n\n'));
        controller.close();
      } catch (error) {
        console.error('Streaming error:', error);
        const errMsg = error instanceof Error ? error.message : 'Streaming failed';
        controller.enqueue(encode(`data: ${JSON.stringify({ error: errMsg })}\n\n`));
        controller.enqueue(encode('data: [DONE]\n\n'));
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

    // Sanitize messages - ini kunci mencegah ValidationException
    const cleanMessages = sanitizeMessages(messages);

    if (cleanMessages.length === 0) {
      return Response.json({ error: 'No valid messages to send' }, { status: 400 });
    }

    // === STREAMING: DeepSeek & Llama ===
    if (modelConfig.supportsStreaming) {
      let generator:
        | AsyncGenerator<string, { inputTokens: number; outputTokens: number; costUSD: number }>
        | undefined;

      if (model === 'deepseek-r1') {
        generator = streamDeepSeek(cleanMessages);
      } else if (model === 'llama-4-maverick') {
        generator = streamLlama(cleanMessages);
      }

      if (!generator) {
        return Response.json({ error: 'Streaming generator not found' }, { status: 500 });
      }

      return new Response(createSSEStream(generator), {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // === NON-STREAMING: Claude Sonnet & Opus ===
    const result = await invokeClaude(cleanMessages, model as ModelId);
    return Response.json({
      content: result.content,
      usage: result.usage,
    });

  } catch (error) {
    console.error('API error:', error);
    const errMsg = error instanceof Error ? error.message : 'Failed to generate response';
    return Response.json({ error: errMsg }, { status: 500 });
  }
}
