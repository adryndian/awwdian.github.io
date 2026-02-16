import { NextRequest } from 'next/server';
import { invokeClaude } from '@/lib/bedrock/claude';
import { streamDeepSeek } from '@/lib/bedrock/deepseek';
import { streamLlama } from '@/lib/bedrock/llama';
import { MODELS } from '@/lib/models/config';
import { ModelId } from '@/types';
import { rateLimit } from '@/lib/ratelimit';

// Input validation
function validateMessages(messages: any[]): boolean {
  if (!Array.isArray(messages)) return false;
  if (messages.length === 0 || messages.length > 100) return false; // Max 100 messages
  return messages.every(
    (m) =>
      m &&
      typeof m === 'object' &&
      typeof m.role === 'string' &&
      typeof m.content === 'string' &&
      (m.role === 'user' || m.role === 'assistant') &&
      m.content.length <= 50000 // Max 50k chars per message
  );
}

function sanitizeMessages(messages: { role: string; content: string }[]) {
  return messages
    .filter((m) => m.content && m.content.trim().length > 0)
    .reduce<{ role: string; content: string }[]>((acc, msg) => {
      const last = acc[acc.length - 1];
      if (last && last.role === msg.role) {
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
        console.error('[SSE] Streaming error:', error);
        const errMsg = error instanceof Error ? error.message : 'Streaming failed';
        controller.enqueue(encode(`data: ${JSON.stringify({ error: errMsg })}\n\n`));
        controller.enqueue(encode('data: [DONE]\n\n'));
        controller.close();
      }
    },
  });
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    // Rate limiting berdasarkan IP
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    if (!rateLimit(ip, 20, 60000)) {
      return Response.json(
        { error: 'Rate limit exceeded. Maximum 20 requests per minute.' },
        { status: 429 }
      );
    }

    // Parse dan validate request body
    let body;
    try {
      body = await req.json();
    } catch {
      return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { messages, model } = body;

    // Validate model
    const modelConfig = MODELS[model as ModelId];
    if (!modelConfig) {
      return Response.json({ error: 'Invalid model selected' }, { status: 400 });
    }

    // Validate messages
    if (!validateMessages(messages)) {
      return Response.json(
        { error: 'Invalid messages format or length' },
        { status: 400 }
      );
    }

    // Sanitize messages
    const cleanMessages = sanitizeMessages(messages);
    if (cleanMessages.length === 0) {
      return Response.json({ error: 'No valid messages to send' }, { status: 400 });
    }

    console.log(`[API] Model: ${model}, Messages: ${cleanMessages.length}, IP: ${ip}`);

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
        return Response.json({ error: 'Streaming not available for this model' }, { status: 500 });
      }

      return new Response(createSSEStream(generator), {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache, no-transform',
          'Connection': 'keep-alive',
          'X-Accel-Buffering': 'no', // Disable nginx buffering
        },
      });
    }

    // === NON-STREAMING: Claude Sonnet & Opus ===
    const result = await invokeClaude(cleanMessages, model as ModelId);
    const elapsed = Date.now() - startTime;
    console.log(`[API] ${model} completed in ${elapsed}ms`);

    return Response.json({
      content: result.content,
      usage: result.usage,
    });
  } catch (error) {
    const elapsed = Date.now() - startTime;
    console.error(`[API] Error after ${elapsed}ms:`, error);

    const errMsg = error instanceof Error ? error.message : 'Failed to generate response';
    const statusCode = errMsg.includes('ValidationException') ? 400 : 500;

    return Response.json({ error: errMsg }, { status: statusCode });
  }
}
