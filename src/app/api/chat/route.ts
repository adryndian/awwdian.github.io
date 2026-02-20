import { NextRequest, NextResponse } from 'next/server';
import { BedrockRuntimeClient, InvokeModelCommand, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';
import { AWS_REGION, getModelConfig, isValidModelId, DEFAULT_MODEL } from '@/lib/models/config';

const client = new BedrockRuntimeClient({
  region: AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

interface ChatMsg { role: string; content: string; }
interface ImageData { type: string; data: string; }

function buildAnthropicPayload(
  message: string, history: ChatMsg[], maxTokens: number,
  temperature: number, enableThinking: boolean, images?: ImageData[]
): string {
  let userContent: unknown;
  if (images && images.length > 0) {
    const parts: unknown[] = [];
    for (const img of images) {
      parts.push({ type: 'image', source: { type: 'base64', media_type: img.type || 'image/png', data: img.data } });
    }
    parts.push({ type: 'text', text: message });
    userContent = parts;
  } else {
    userContent = message;
  }
  const msgs = [...history.map((m) => ({ role: m.role, content: m.content })), { role: 'user', content: userContent }];
  const payload: Record<string, unknown> = { anthropic_version: 'bedrock-2023-05-31', max_tokens: maxTokens, messages: msgs };
  if (enableThinking) { payload.thinking = { type: 'enabled', budget_tokens: 10000 }; }
  else { payload.temperature = temperature; }
  return JSON.stringify(payload);
}

async function invokeLlama4(
  message: string, history: ChatMsg[], maxTokens: number,
  temperature: number, modelId: string
) {
  // Llama 4 Maverick on Bedrock uses Converse API
  const converseMessages = [
    ...history.map((m) => ({
      role: m.role === 'assistant' ? 'assistant' as const : 'user' as const,
      content: [{ text: m.content }],
    })),
    { role: 'user' as const, content: [{ text: message }] },
  ];

  const command = new ConverseCommand({
    modelId,
    messages: converseMessages,
    system: [{ text: 'You are a helpful, harmless, and honest AI assistant. Always respond in the same language the user uses.' }],
    inferenceConfig: {
      maxTokens,
      temperature,
      topP: 0.9,
    },
  });

  const response = await client.send(command);

  let content = '';
  if (response.output?.message?.content) {
    for (const block of response.output.message.content) {
      if (block.text) content += block.text;
    }
  }

  const usage = response.usage;
  return {
    content: content || 'No response from Llama.',
    inputTokens: usage?.inputTokens || 0,
    outputTokens: usage?.outputTokens || 0,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, modelId = DEFAULT_MODEL, history = [], temperature = 0.7, maxTokens, images } = body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return NextResponse.json({ error: 'Message required.' }, { status: 400 });
    }

    const selId = isValidModelId(modelId) ? modelId : DEFAULT_MODEL;
    const mc = getModelConfig(selId);
    const effMax = maxTokens || mc.maxTokens;
    const enableThinking = mc.supportsThinking === true;

    console.log('[Bedrock] Invoking:', mc.name, '(' + selId + ')');
    const start = Date.now();

    let content = '';
    let thinking: string | undefined;
    let inTok = 0;
    let outTok = 0;

    if (mc.provider === 'Anthropic') {
      const reqBody = buildAnthropicPayload(message.trim(), history, effMax, temperature, enableThinking, images);
      const cmd = new InvokeModelCommand({ modelId: selId, contentType: 'application/json', accept: 'application/json', body: reqBody });
      const res = await client.send(cmd);
      const resBody = JSON.parse(new TextDecoder().decode(res.body));

      const blocks = resBody.content;
      if (blocks && Array.isArray(blocks)) {
        for (const b of blocks) {
          if (b.type === 'thinking' && b.thinking) thinking = (thinking || '') + b.thinking;
          else if (b.type === 'text' && b.text) content += b.text;
        }
      }
      content = content || 'No response from Claude.';
      inTok = resBody.usage?.input_tokens || 0;
      outTok = resBody.usage?.output_tokens || 0;

    } else if (mc.provider === 'Meta') {
      const result = await invokeLlama4(message.trim(), history, effMax, temperature, selId);
      content = result.content;
      inTok = result.inputTokens;
      outTok = result.outputTokens;
    } else {
      return NextResponse.json({ error: 'Unsupported: ' + mc.provider }, { status: 400 });
    }

    const duration = Date.now() - start;
    const costVal = inTok > 0 || outTok > 0
      ? (inTok / 1000) * mc.inputPricePer1K + (outTok / 1000) * mc.outputPricePer1K
      : undefined;

    console.log('[Bedrock]', mc.name, '|', content.length, 'chars |', duration, 'ms');

    return NextResponse.json({
      message: content, model: selId, modelName: mc.name, provider: mc.provider,
      thinking, cost: costVal, inputTokens: inTok, outputTokens: outTok, duration,
    });
  } catch (error: unknown) {
    console.error('[Bedrock] Error:', error);
    if (error instanceof Error) {
      const name = (error as Error & { name?: string }).name || '';
      const msg = error.message || '';
      if (msg.includes('inference profile')) return NextResponse.json({ error: 'Model memerlukan inference profile. Cek Model Access di Bedrock Console.' }, { status: 400 });
      if (name === 'AccessDeniedException') return NextResponse.json({ error: 'Access denied. Cek IAM + Model Access.' }, { status: 403 });
      if (name === 'ValidationException') return NextResponse.json({ error: 'Validation: ' + msg }, { status: 400 });
      if (name === 'ThrottlingException') return NextResponse.json({ error: 'Rate limited.' }, { status: 429 });
      if (name === 'ResourceNotFoundException') return NextResponse.json({ error: 'Model tidak ditemukan.' }, { status: 404 });
      return NextResponse.json({ error: msg }, { status: 500 });
    }
    return NextResponse.json({ error: 'Unexpected error.' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: 'ok', region: AWS_REGION });
}