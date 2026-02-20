import { NextRequest, NextResponse } from 'next/server';
import {
  BedrockRuntimeClient,
  InvokeModelCommand,
  ConverseCommand,
  type Message as ConverseMessage,
  type ContentBlock,
  type SystemContentBlock,
} from '@aws-sdk/client-bedrock-runtime';
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

// ============================================
// ANTHROPIC (Claude) -- InvokeModel API
// ============================================
async function invokeAnthropic(
  message: string, history: ChatMsg[], maxTokens: number,
  temperature: number, enableThinking: boolean, modelId: string, images?: ImageData[]
) {
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

  const cmd = new InvokeModelCommand({
    modelId, contentType: 'application/json', accept: 'application/json',
    body: JSON.stringify(payload),
  });

  const res = await client.send(cmd);
  const resBody = JSON.parse(new TextDecoder().decode(res.body));

  let content = '';
  let thinking: string | undefined;
  const blocks = resBody.content;
  if (blocks && Array.isArray(blocks)) {
    for (const b of blocks) {
      if (b.type === 'thinking' && b.thinking) thinking = (thinking || '') + b.thinking;
      else if (b.type === 'text' && b.text) content += b.text;
    }
  }

  return {
    content: content || 'No response from Claude.',
    thinking,
    inputTokens: resBody.usage?.input_tokens || 0,
    outputTokens: resBody.usage?.output_tokens || 0,
  };
}

// ============================================
// META (Llama 4) -- Converse API
// AWS Bedrock Llama 4 Maverick requires Converse API
// Ref: https://docs.aws.amazon.com/bedrock/latest/userguide/conversation-inference-supported-models-features.html
// ============================================
async function invokeLlama4Converse(
  message: string, history: ChatMsg[], maxTokens: number,
  temperature: number, modelId: string
) {
  // Build Converse API messages
  const converseMessages: ConverseMessage[] = [];

  for (const m of history) {
    const role = m.role === 'assistant' ? 'assistant' : 'user';
    converseMessages.push({
      role: role as 'user' | 'assistant',
      content: [{ text: m.content } as ContentBlock],
    });
  }

  converseMessages.push({
    role: 'user',
    content: [{ text: message } as ContentBlock],
  });

  const systemContent: SystemContentBlock[] = [
    { text: 'You are a helpful, harmless, and honest AI assistant. Always respond in the same language the user uses.' } as SystemContentBlock,
  ];

  try {
    const command = new ConverseCommand({
      modelId,
      messages: converseMessages,
      system: systemContent,
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
        if ('text' in block && block.text) content += block.text;
      }
    }

    return {
      content: content || 'No response from Llama.',
      inputTokens: response.usage?.inputTokens || 0,
      outputTokens: response.usage?.outputTokens || 0,
    };
  } catch (converseError: unknown) {
    // Fallback: try InvokeModel with prompt format
    console.warn('[Bedrock] Converse API failed, trying InvokeModel fallback:', converseError);
    return invokeLlama4Invoke(message, history, maxTokens, temperature, modelId);
  }
}

// Fallback: InvokeModel for Llama 4
async function invokeLlama4Invoke(
  message: string, history: ChatMsg[], maxTokens: number,
  temperature: number, modelId: string
) {
  let prompt = '<|begin_of_text|>';
  prompt += '<|start_header_id|>system<|end_header_id|>\n\nYou are a helpful AI assistant. Respond in the same language the user uses.<|eot_id|>';
  for (const m of history) {
    const role = m.role === 'assistant' ? 'assistant' : 'user';
    prompt += '<|start_header_id|>' + role + '<|end_header_id|>\n\n' + m.content + '<|eot_id|>';
  }
  prompt += '<|start_header_id|>user<|end_header_id|>\n\n' + message + '<|eot_id|>';
  prompt += '<|start_header_id|>assistant<|end_header_id|>\n\n';

  const cmd = new InvokeModelCommand({
    modelId,
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify({ prompt, max_gen_len: maxTokens, temperature, top_p: 0.9 }),
  });

  const res = await client.send(cmd);
  const resBody = JSON.parse(new TextDecoder().decode(res.body));

  return {
    content: resBody.generation || resBody.output || 'No response.',
    inputTokens: resBody.prompt_token_count || 0,
    outputTokens: resBody.generation_token_count || 0,
  };
}

// ============================================
// MAIN HANDLER
// ============================================
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

    console.log('[Bedrock] Invoking:', mc.name, '| provider:', mc.provider, '| converse:', mc.useConverseAPI || false);
    const start = Date.now();

    let result: { content: string; thinking?: string; inputTokens: number; outputTokens: number };

    if (mc.provider === 'Anthropic') {
      result = await invokeAnthropic(message.trim(), history, effMax, temperature, mc.supportsThinking, selId, images);
    } else if (mc.provider === 'Meta') {
      result = await invokeLlama4Converse(message.trim(), history, effMax, temperature, selId);
    } else {
      return NextResponse.json({ error: 'Unsupported: ' + mc.provider }, { status: 400 });
    }

    const duration = Date.now() - start;
    const costVal = result.inputTokens > 0 || result.outputTokens > 0
      ? (result.inputTokens / 1000) * mc.inputPricePer1K + (result.outputTokens / 1000) * mc.outputPricePer1K
      : undefined;

    console.log('[Bedrock]', mc.name, '|', result.content.length, 'chars |', duration, 'ms |', result.inputTokens, '+', result.outputTokens, 'tokens');

    return NextResponse.json({
      message: result.content, model: selId, modelName: mc.name, provider: mc.provider,
      thinking: result.thinking, cost: costVal, inputTokens: result.inputTokens,
      outputTokens: result.outputTokens, duration,
    });
  } catch (error: unknown) {
    console.error('[Bedrock] Error:', error);
    if (error instanceof Error) {
      const name = (error as Error & { name?: string }).name || '';
      const msg = error.message || '';
      if (msg.includes('inference profile')) return NextResponse.json({ error: 'Inference profile required. Cek Model Access di Bedrock Console region ' + AWS_REGION + '.' }, { status: 400 });
      if (name === 'AccessDeniedException') return NextResponse.json({ error: 'Access denied. Cek IAM permission & Model Access.' }, { status: 403 });
      if (name === 'ValidationException') return NextResponse.json({ error: 'Validation: ' + msg }, { status: 400 });
      if (name === 'ThrottlingException') return NextResponse.json({ error: 'Rate limited. Coba lagi.' }, { status: 429 });
      if (name === 'ResourceNotFoundException') return NextResponse.json({ error: 'Model not found. Pastikan model sudah enabled di Bedrock Console.' }, { status: 404 });
      return NextResponse.json({ error: msg }, { status: 500 });
    }
    return NextResponse.json({ error: 'Unexpected error.' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: 'ok', region: AWS_REGION });
}