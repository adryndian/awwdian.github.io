import { NextRequest } from 'next/server';
import { invokeClaude } from '@/lib/bedrock/claude';
import { streamDeepSeek } from '@/lib/bedrock/deepseek';
import { streamLlama } from '@/lib/bedrock/llama';
import { MODELS } from '@/lib/models/config';
import { ModelId } from '@/types';
import * as Sentry from '@sentry/nextjs';

// Rate limiting dengan Upstash Redis
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Initialize Redis client (production)
let redis: Redis | null = null;
let ratelimit: Ratelimit | null = null;

if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });

  ratelimit = new Ratelimit({
    redis: redis,
    limiter: Ratelimit.slidingWindow(20, '1 m'), // 20 requests per minute
    analytics: true,
    prefix: '@upstash/ratelimit',
  });
}

// Fallback in-memory rate limiter (development)
const inMemoryRateLimit = new Map<string, { count: number; resetAt: number }>();

function checkInMemoryRateLimit(identifier: string, limit: number = 20, windowMs: number = 60000): boolean {
  const now = Date.now();
  const entry = inMemoryRateLimit.get(identifier);

  // Cleanup expired entries
  if (entry && now > entry.resetAt) {
    inMemoryRateLimit.delete(identifier);
  }

  const current = inMemoryRateLimit.get(identifier);

  if (!current) {
    inMemoryRateLimit.set(identifier, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (current.count >= limit) {
    return false; // Rate limit exceeded
  }

  current.count++;
  return true;
}

// Input validation
interface ValidatedMessage {
  role: 'user' | 'assistant';
  content: string;
}

function validateMessages(messages: any[]): { valid: boolean; error?: string; data?: ValidatedMessage[] } {
  if (!Array.isArray(messages)) {
    return { valid: false, error: 'Messages must be an array' };
  }

  if (messages.length === 0) {
    return { valid: false, error: 'Messages array cannot be empty' };
  }

  if (messages.length > 100) {
    return { valid: false, error: 'Maximum 100 messages allowed per request' };
  }

  const validatedMessages: ValidatedMessage[] = [];

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];

    if (!msg || typeof msg !== 'object') {
      return { valid: false, error: `Message at index ${i} is invalid` };
    }

    if (typeof msg.role !== 'string' || !['user', 'assistant'].includes(msg.role)) {
      return { valid: false, error: `Message at index ${i} has invalid role. Must be 'user' or 'assistant'` };
    }

    if (typeof msg.content !== 'string') {
      return { valid: false, error: `Message at index ${i} has invalid content. Must be a string` };
    }

    if (msg.content.length > 50000) {
      return { valid: false, error: `Message at index ${i} exceeds maximum length of 50,000 characters` };
    }

    validatedMessages.push({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    });
  }

  return { valid: true, data: validatedMessages };
}

// Sanitize messages - remove empty, merge duplicates
function sanitizeMessages(messages: ValidatedMessage[]): ValidatedMessage[] {
  return messages
    .filter((m) => m.content && m.content.trim().length > 0)
    .reduce<ValidatedMessage[]>((acc, msg) => {
      const last = acc[acc.length - 1];
      
      // Merge consecutive messages from same role
      if (last && last.role === msg.role) {
        last.content += '\n' + msg.content;
        return acc;
      }
      
      return [...acc, { role: msg.role, content: msg.content.trim() }];
    }, []);
}

// Create SSE stream from async generator
function createSSEStream(
  generator: AsyncGenerator<string, { inputTokens: number; outputTokens: number; costUSD: number }>,
  model: ModelId,
  startTime: number
): ReadableStream {
  return new ReadableStream({
    async start(controller) {
      const encode = (data: string) => new TextEncoder().encode(data);
      let chunkCount = 0;
      let totalChars = 0;

      try {
        while (true) {
          const { value, done } = await generator.next();
          
          if (done) {
            // value is usage stats object
            const result = value as { inputTokens: number; outputTokens: number; costUSD: number };
            const duration = Date.now() - startTime;
            
            // Log completion
            console.log(`[API] ${model} streaming completed:`, {
              duration: `${duration}ms`,
              chunks: chunkCount,
              totalChars,
              tokens: `${result.inputTokens}in/${result.outputTokens}out`,
              cost: `$${result.costUSD.toFixed(4)}`,
            });
            
            controller.enqueue(encode(`data: ${JSON.stringify({ usage: result })}\n\n`));
            break;
          }
          
          if (typeof value === 'string' && value) {
            chunkCount++;
            totalChars += value.length;
            controller.enqueue(encode(`data: ${JSON.stringify({ content: value })}\n\n`));
          }
        }
        
        controller.enqueue(encode('data: [DONE]\n\n'));
        controller.close();
      } catch (error) {
        const duration = Date.now() - startTime;
        console.error(`[API] ${model} streaming error after ${duration}ms:`, error);
        
        // Send to Sentry
        Sentry.captureException(error, {
          tags: { model, type: 'streaming_error' },
          extra: { duration, chunkCount, totalChars },
        });
        
        const errMsg = error instanceof Error ? error.message : 'Streaming failed';
        controller.enqueue(encode(`data: ${JSON.stringify({ error: errMsg })}\n\n`));
        controller.enqueue(encode('data: [DONE]\n\n'));
        controller.close();
      }
    },
  });
}

// Main API handler
export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const requestId = crypto.randomUUID();

  try {
    // Get identifier for rate limiting (IP or user ID)
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
               req.headers.get('x-real-ip') || 
               'unknown';
    
    const userAgent = req.headers.get('user-agent') || 'unknown';
    
    console.log(`[API] Request ${requestId} from ${ip}`);

    // === RATE LIMITING ===
    if (ratelimit) {
      // Production: Upstash Redis rate limiting
      const { success, limit, remaining, reset } = await ratelimit.limit(ip);
      
      if (!success) {
        const retryAfter = Math.ceil((reset - Date.now()) / 1000);
        
        console.warn(`[API] Rate limit exceeded for ${ip}. Retry after ${retryAfter}s`);
        
        Sentry.captureMessage('Rate limit exceeded', {
          level: 'warning',
          tags: { ip, userAgent },
          extra: { limit, remaining, reset, retryAfter },
        });
        
        return Response.json(
          {
            error: 'Rate limit exceeded. Please try again later.',
            retryAfter,
            limit,
            remaining: 0,
          },
          {
            status: 429,
            headers: {
              'X-RateLimit-Limit': limit.toString(),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': reset.toString(),
              'Retry-After': retryAfter.toString(),
            },
          }
        );
      }
    } else {
      // Development: In-memory rate limiting
      if (!checkInMemoryRateLimit(ip, 20, 60000)) {
        console.warn(`[API] In-memory rate limit exceeded for ${ip}`);
        return Response.json(
          { error: 'Rate limit exceeded. Maximum 20 requests per minute.' },
          { status: 429 }
        );
      }
    }

    // === PARSE REQUEST BODY ===
    let body;
    try {
      body = await req.json();
    } catch {
      return Response.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    const { messages, model } = body;

    // === VALIDATE MODEL ===
    const modelConfig = MODELS[model as ModelId];
    if (!modelConfig) {
      console.error(`[API] Invalid model: ${model}`);
      return Response.json(
        { error: `Invalid model: ${model}. Available models: ${Object.keys(MODELS).join(', ')}` },
        { status: 400 }
      );
    }

    // === VALIDATE MESSAGES ===
    const validation = validateMessages(messages);
    if (!validation.valid) {
      console.error(`[API] Validation error: ${validation.error}`);
      return Response.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // === SANITIZE MESSAGES ===
    const cleanMessages = sanitizeMessages(validation.data!);
    
    if (cleanMessages.length === 0) {
      console.error('[API] No valid messages after sanitization');
      return Response.json(
        { error: 'No valid messages to send. All messages are empty.' },
        { status: 400 }
      );
    }

    // Validate message flow (should alternate user/assistant)
    const lastMessage = cleanMessages[cleanMessages.length - 1];
    if (lastMessage.role !== 'user') {
      console.error(`[API] Last message must be from user, got: ${lastMessage.role}`);
      return Response.json(
        { error: 'Last message must be from user' },
        { status: 400 }
      );
    }

    console.log(`[API] ${requestId} - Model: ${model}, Messages: ${cleanMessages.length}, IP: ${ip}`);

    // === STREAMING: DeepSeek & Llama ===
    if (modelConfig.supportsStreaming) {
      let generator:
        | AsyncGenerator<string, { inputTokens: number; outputTokens: number; costUSD: number }>
        | undefined;

      try {
        if (model === 'deepseek-r1') {
          console.log('[API] Starting DeepSeek R1 streaming...');
          generator = streamDeepSeek(cleanMessages);
        } else if (model === 'llama-4-maverick') {
          console.log('[API] Starting Llama 4 Maverick streaming...');
          generator = streamLlama(cleanMessages);
        }

        if (!generator) {
          throw new Error(`Streaming generator not found for model: ${model}`);
        }

        return new Response(createSSEStream(generator, model as ModelId, startTime), {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no', // Disable nginx buffering
            'X-Request-ID': requestId,
          },
        });
      } catch (error) {
        const elapsed = Date.now() - startTime;
        console.error(`[API] ${model} streaming setup error after ${elapsed}ms:`, error);
        
        Sentry.captureException(error, {
          tags: { model, type: 'streaming_setup_error', requestId },
          extra: { elapsed, ip, messageCount: cleanMessages.length },
        });
        
        return Response.json(
          {
            error: error instanceof Error ? error.message : 'Failed to initialize streaming',
            requestId,
          },
          { status: 500 }
        );
      }
    }

    // === NON-STREAMING: Claude Sonnet & Opus ===
    console.log(`[API] Starting ${model} non-streaming request...`);
    
    try {
      const result = await invokeClaude(cleanMessages, model as ModelId);
      const elapsed = Date.now() - startTime;
      
      console.log(`[API] ${requestId} - ${model} completed in ${elapsed}ms:`, {
        inputTokens: result.usage.inputTokens,
        outputTokens: result.usage.outputTokens,
        cost: `$${result.usage.costUSD.toFixed(4)}`,
        responseLength: result.content.length,
      });

      return Response.json({
        content: result.content,
        usage: result.usage,
        requestId,
      });
    } catch (error) {
      const elapsed = Date.now() - startTime;
      console.error(`[API] ${model} invoke error after ${elapsed}ms:`, error);
      
      Sentry.captureException(error, {
        tags: { model, type: 'invoke_error', requestId },
        extra: { elapsed, ip, messageCount: cleanMessages.length },
      });
      
      throw error; // Re-throw to be caught by outer catch
    }

  } catch (error) {
    const elapsed = Date.now() - startTime;
    console.error(`[API] Request ${requestId} failed after ${elapsed}ms:`, error);

    // Send to Sentry with context
    Sentry.captureException(error, {
      tags: {
        endpoint: '/api/chat',
        requestId,
      },
      extra: {
        elapsed,
        errorType: error instanceof Error ? error.constructor.name : 'Unknown',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      },
    });

    const errMsg = error instanceof Error ? error.message : 'Failed to generate response';
    
    // Check if it's a known error type
    let statusCode = 500;
    if (errMsg.includes('ValidationException')) {
      statusCode = 400;
    } else if (errMsg.includes('ThrottlingException')) {
      statusCode = 429;
    } else if (errMsg.includes('AccessDeniedException')) {
      statusCode = 403;
    }

    return Response.json(
      {
        error: errMsg,
        requestId,
        elapsed,
      },
      { status: statusCode }
    );
  }
}

// Health check endpoint (optional)
export async function GET(req: NextRequest) {
  return Response.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    models: Object.keys(MODELS),
    rateLimitEnabled: !!ratelimit,
  });
}
