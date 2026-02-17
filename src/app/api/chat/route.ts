import { NextRequest } from 'next/server';
import { invokeClaude } from '@/lib/bedrock/claude';
import { streamDeepSeek } from '@/lib/bedrock/deepseek';
import { streamLlama } from '@/lib/bedrock/llama';
import { MODELS } from '@/lib/models/config';
import { ModelId } from '@/types';
import { checkRateLimit } from '@/lib/ratelimit';

// ─── Input Validation ────────────────────────────────────────────────────────

interface ValidatedMessage {
  role: 'user' | 'assistant';
  content: string;
}

function validateMessages(messages: unknown[]): {
  valid: boolean;
  error?: string;
  data?: ValidatedMessage[];
} {
  if (!Array.isArray(messages))
    return { valid: false, error: 'Messages must be an array' };

  if (messages.length === 0)
    return { valid: false, error: 'Messages array cannot be empty' };

  if (messages.length > 100)
    return { valid: false, error: 'Maximum 100 messages per request' };

  const validated: ValidatedMessage[] = [];

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i] as Record<string, unknown>;

    if (!msg || typeof msg !== 'object')
      return { valid: false, error: `Message[${i}] is invalid` };

    if (!['user', 'assistant'].includes(msg.role as string))
      return { valid: false, error: `Message[${i}] role must be 'user' or 'assistant'` };

    if (typeof msg.content !== 'string')
      return { valid: false, error: `Message[${i}] content must be a string` };

    if ((msg.content as string).length > 50000)
      return { valid: false, error: `Message[${i}] exceeds 50,000 character limit` };

    validated.push({
      role: msg.role as 'user' | 'assistant',
      content: msg.content as string,
    });
  }

  return { valid: true, data: validated };
}

// ─── Sanitize: remove empty + merge consecutive same-role messages ────────────

function sanitizeMessages(messages: ValidatedMessage[]): ValidatedMessage[] {
  return messages
    .filter((m) => m.content.trim().length > 0)
    .reduce<ValidatedMessage[]>((acc, msg) => {
      const last = acc[acc.length - 1];
      if (last && last.role === msg.role) {
        last.content += '\n' + msg.content;
        return acc;
      }
      return [...acc, { role: msg.role, content: msg.content.trim() }];
    }, []);
}

// ─── SSE Stream from async generator ─────────────────────────────────────────

function createSSEStream(
  generator: AsyncGenerator<
    string,
    { inputTokens: number; outputTokens: number; costUSD: number }
  >,
  model: ModelId,
  startTime: number
): ReadableStream {
  return new ReadableStream({
    async start(controller) {
      const enc = (s: string) => new TextEncoder().encode(s);
      let chunkCount = 0;
      let totalChars = 0;

      try {
        while (true) {
          const { value, done } = await generator.next();

          if (done) {
            const usage = value as {
              inputTokens: number;
              outputTokens: number;
              costUSD: number;
            };
            const elapsed = Date.now() - startTime;

            console.log(`[API] ${model} stream done in ${elapsed}ms`, {
              chunks: chunkCount,
              chars: totalChars,
              tokens: `${usage.inputTokens}in/${usage.outputTokens}out`,
              cost: `$${usage.costUSD.toFixed(4)}`,
            });

            controller.enqueue(enc(`data: ${JSON.stringify({ usage })}\n\n`));
            break;
          }

          if (typeof value === 'string' && value.length > 0) {
            chunkCount++;
            totalChars += value.length;
            controller.enqueue(enc(`data: ${JSON.stringify({ content: value })}\n\n`));
          }
        }

        controller.enqueue(enc('data: [DONE]\n\n'));
        controller.close();
      } catch (err) {
        const elapsed = Date.now() - startTime;
        console.error(`[API] ${model} stream error after ${elapsed}ms:`, err);

        // Optional: send to Sentry if configured
        try {
          if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
            const Sentry = await import('@sentry/nextjs');
            Sentry.captureException(err, {
              tags: { model, type: 'streaming_error' },
            });
          }
        } catch { /* sentry optional */ }

        const msg = err instanceof Error ? err.message : 'Streaming failed';
        controller.enqueue(enc(`data: ${JSON.stringify({ error: msg })}\n\n`));
        controller.enqueue(enc('data: [DONE]\n\n'));
        controller.close();
      }
    },
  });
}

// ─── POST Handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const requestId = crypto.randomUUID();

  try {
    // Rate limiting
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      'unknown';

    const rl = await checkRateLimit(ip);

    if (!rl.success) {
      const retryAfter = Math.ceil((rl.reset - Date.now()) / 1000);
      console.warn(`[API] Rate limit exceeded for ${ip}`);

      return Response.json(
        { error: 'Rate limit exceeded. Please try again later.', retryAfter },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': String(rl.limit),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(rl.reset),
            'Retry-After': String(retryAfter),
          },
        }
      );
    }

    // Parse body
    let body: { messages?: unknown; model?: unknown };
    try {
      body = await req.json();
    } catch {
      return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { messages, model } = body;

    // Validate model
    const modelConfig = MODELS[model as ModelId];
    if (!modelConfig) {
      return Response.json(
        {
          error: `Invalid model: "${model}". Valid options: ${Object.keys(MODELS).join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Validate messages
    const validation = validateMessages(messages as unknown[]);
    if (!validation.valid) {
      return Response.json({ error: validation.error }, { status: 400 });
    }

    // Sanitize
    const cleanMessages = sanitizeMessages(validation.data!);
    if (cleanMessages.length === 0) {
      return Response.json(
        { error: 'No valid messages. All content was empty.' },
        { status: 400 }
      );
    }

    // Last message must come from user
    if (cleanMessages[cleanMessages.length - 1].role !== 'user') {
      return Response.json(
        { error: 'Last message must be from "user"' },
        { status: 400 }
      );
    }

    console.log(
      `[API] ${requestId} model=${model} messages=${cleanMessages.length} ip=${ip}`
    );

    // ── Streaming: DeepSeek & Llama ──────────────────────────────────────────
    if (modelConfig.supportsStreaming) {
      let generator:
        | AsyncGenerator<
            string,
            { inputTokens: number; outputTokens: number; costUSD: number }
          >
        | undefined;

      if (model === 'deepseek-r1') {
        console.log('[API] Starting DeepSeek R1 stream...');
        generator = streamDeepSeek(cleanMessages);
      } else if (model === 'llama-4-maverick') {
        console.log('[API] Starting Llama 4 Maverick stream...');
        generator = streamLlama(cleanMessages);
      }

      if (!generator) {
        return Response.json(
          { error: `Streaming not implemented for: ${model}` },
          { status: 500 }
        );
      }

      return new Response(
        createSSEStream(generator, model as ModelId, startTime),
        {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            Connection: 'keep-alive',
            'X-Accel-Buffering': 'no',
            'X-Request-ID': requestId,
          },
        }
      );
    }

    // ── Non-streaming: Claude Sonnet & Opus ──────────────────────────────────
    console.log(`[API] Starting ${model} invoke...`);
    const result = await invokeClaude(cleanMessages, model as ModelId);
    const elapsed = Date.now() - startTime;

    console.log(`[API] ${requestId} ${model} done in ${elapsed}ms`, {
      tokens: `${result.usage.inputTokens}in/${result.usage.outputTokens}out`,
      cost: `$${result.usage.costUSD.toFixed(4)}`,
    });

    return Response.json({
      content: result.content,
      usage: result.usage,
      requestId,
    });
  } catch (err) {
    const elapsed = Date.now() - startTime;
    console.error(`[API] ${requestId} failed after ${elapsed}ms:`, err);

    // Optional Sentry
    try {
      if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
        const Sentry = await import('@sentry/nextjs');
        Sentry.captureException(err, {
          tags: { endpoint: '/api/chat', requestId },
          extra: { elapsed },
        });
      }
    } catch { /* sentry optional */ }

    const msg = err instanceof Error ? err.message : 'Failed to generate response';

    // Map AWS exception types to HTTP status codes
    let status = 500;
    if (msg.includes('ValidationException')) status = 400;
    else if (msg.includes('ThrottlingException')) status = 429;
    else if (msg.includes('AccessDeniedException')) status = 403;
    else if (msg.includes('ResourceNotFoundException')) status = 404;

    return Response.json({ error: msg, requestId }, { status });
  }
}

// ─── Health Check ─────────────────────────────────────────────────────────────
export async function GET() {
  return Response.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    models: Object.keys(MODELS),
    upstashEnabled: !!(
      process.env.UPSTASH_REDIS_REST_URL &&
      process.env.UPSTASH_REDIS_REST_TOKEN
    ),
    sentryEnabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
  });
}
