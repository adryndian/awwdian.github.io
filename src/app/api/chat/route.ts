import { NextRequest, NextResponse } from 'next/server';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { AWS_REGION, getModelConfig, isValidModelId, DEFAULT_MODEL } from '@/lib/models/config';

const client = new BedrockRuntimeClient({
  region: AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

interface ChatMsg {
  role: string;
  content: string;
}

interface ImageData {
  type: string;
  data: string;
}

function buildAnthropicPayload(
  message: string,
  history: ChatMsg[],
  maxTokens: number,
  temperature: number,
  enableThinking: boolean,
  images?: ImageData[]
): string {
  // Build message content - text or multimodal
  let userContent: unknown;

  if (images && images.length > 0) {
    // Multimodal: text + images
    const contentParts: unknown[] = [];

    for (const img of images) {
      const mediaType = img.type || 'image/png';
      contentParts.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: mediaType,
          data: img.data,
        },
      });
    }

    contentParts.push({ type: 'text', text: message });
    userContent = contentParts;
  } else {
    userContent = message;
  }

  const msgs = [
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: 'user', content: userContent },
  ];

  const payload: Record<string, unknown> = {
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: maxTokens,
    messages: msgs,
  };

  if (enableThinking) {
    payload.thinking = { type: 'enabled', budget_tokens: 10000 };
  } else {
    payload.temperature = temperature;
  }

  return JSON.stringify(payload);
}

function buildLlama4Payload(
  message: string,
  history: ChatMsg[],
  maxTokens: number,
  temperature: number
): string {
  let prompt = '<|begin_of_text|>';
  prompt += '<|start_header_id|>system<|end_header_id|>\n\nYou are a helpful, harmless, and honest AI assistant. Always respond in the same language the user uses.<|eot_id|>';

  for (const m of history) {
    const role = m.role === 'assistant' ? 'assistant' : 'user';
    prompt += '<|start_header_id|>' + role + '<|end_header_id|>\n\n' + m.content + '<|eot_id|>';
  }

  prompt += '<|start_header_id|>user<|end_header_id|>\n\n' + message + '<|eot_id|>';
  prompt += '<|start_header_id|>assistant<|end_header_id|>\n\n';

  return JSON.stringify({
    prompt,
    max_gen_len: maxTokens,
    temperature,
    top_p: 0.9,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      message,
      modelId = DEFAULT_MODEL,
      history = [],
      temperature = 0.7,
      maxTokens,
      images,
    } = body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return NextResponse.json({ error: 'Message required.' }, { status: 400 });
    }

    const selId = isValidModelId(modelId) ? modelId : DEFAULT_MODEL;
    const mc = getModelConfig(selId);
    const effMax = maxTokens || mc.maxTokens;
    const enableThinking = mc.supportsThinking === true;

    let reqBody: string;

    if (mc.provider === 'Anthropic') {
      reqBody = buildAnthropicPayload(
        message.trim(),
        history,
        effMax,
        temperature,
        enableThinking,
        images
      );
    } else if (mc.provider === 'Meta') {
      reqBody = buildLlama4Payload(message.trim(), history, effMax, temperature);
    } else {
      return NextResponse.json({ error: 'Unsupported provider: ' + mc.provider }, { status: 400 });
    }

    console.log('[Bedrock] Invoking:', selId, '| images:', images?.length || 0);

    const start = Date.now();
    const cmd = new InvokeModelCommand({
      modelId: selId,
      contentType: 'application/json',
      accept: 'application/json',
      body: reqBody,
    });

    const res = await client.send(cmd);
    const duration = Date.now() - start;
    const resBody = JSON.parse(new TextDecoder().decode(res.body));

    let content = '';
    let thinking: string | undefined;

    if (mc.provider === 'Anthropic') {
      const blocks = resBody.content;
      if (blocks && Array.isArray(blocks)) {
        for (const b of blocks) {
          if (b.type === 'thinking' && b.thinking) thinking = (thinking || '') + b.thinking;
          else if (b.type === 'text' && b.text) content += b.text;
        }
      }
      content = content || 'No response from Claude.';
    } else if (mc.provider === 'Meta') {
      content = resBody.generation || 'No response from Llama.';
    }

    const usage = resBody.usage;
    const inTok = usage?.input_tokens || 0;
    const outTok = usage?.output_tokens || 0;
    const costVal = inTok > 0 || outTok > 0
      ? (inTok / 1000) * mc.inputPricePer1K + (outTok / 1000) * mc.outputPricePer1K
      : undefined;

    console.log('[Bedrock]', mc.name, '|', content.length, 'chars |', duration, 'ms');

    return NextResponse.json({
      message: content,
      model: selId,
      modelName: mc.name,
      provider: mc.provider,
      thinking,
      cost: costVal,
      inputTokens: inTok,
      outputTokens: outTok,
      duration,
    });
  } catch (error: unknown) {
    console.error('[Bedrock] Error:', error);

    if (error instanceof Error) {
      const name = (error as Error & { name?: string }).name || '';
      const msg = error.message || '';

      if (msg.includes('inference profile'))
        return NextResponse.json({ error: 'Model memerlukan inference profile dengan prefix "us." — Cek Model Access di Bedrock Console.' }, { status: 400 });
      if (name === 'AccessDeniedException')
        return NextResponse.json({ error: 'Access denied. Cek IAM permission dan Model Access di Bedrock Console.' }, { status: 403 });
      if (name === 'ValidationException')
        return NextResponse.json({ error: 'Validation: ' + msg }, { status: 400 });
      if (name === 'ThrottlingException')
        return NextResponse.json({ error: 'Rate limited. Coba lagi.' }, { status: 429 });
      if (name === 'ResourceNotFoundException')
        return NextResponse.json({ error: 'Model tidak ditemukan di Bedrock.' }, { status: 404 });

      return NextResponse.json({ error: msg }, { status: 500 });
    }

    return NextResponse.json({ error: 'Unexpected error.' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: 'ok', region: AWS_REGION });
}