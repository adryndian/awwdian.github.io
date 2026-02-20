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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      message,
      modelId = DEFAULT_MODEL,
      history = [],
      temperature = 0.7,
      maxTokens,
    } = body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return NextResponse.json({ error: 'Message required.' }, { status: 400 });
    }

    const selId = isValidModelId(modelId) ? modelId : DEFAULT_MODEL;
    const mc = getModelConfig(selId);
    const effMax = maxTokens || mc.maxTokens;
    const think = mc.supportsThinking === true;

    let reqBody: string;

    if (mc.provider === 'Anthropic') {
      const msgs = [
        ...history.map((m: ChatMsg) => ({ role: m.role, content: m.content })),
        { role: 'user', content: message.trim() },
      ];
      const payload: Record<string, unknown> = {
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: effMax,
        temperature: think ? 1 : temperature,
        messages: msgs,
      };
      if (think) {
        payload.thinking = { type: 'enabled', budget_tokens: 10000 };
      }
      reqBody = JSON.stringify(payload);
    } else if (mc.provider === 'Meta') {
      let prompt = '<|begin_of_text|>';
      prompt += '<|start_header_id|>system<|end_header_id|>\n\nYou are a helpful AI assistant.<|eot_id|>';
      for (const m of history as ChatMsg[]) {
        prompt += '<|start_header_id|>' + m.role + '<|end_header_id|>\n\n' + m.content + '<|eot_id|>';
      }
      prompt += '<|start_header_id|>user<|end_header_id|>\n\n' + message.trim() + '<|eot_id|>';
      prompt += '<|start_header_id|>assistant<|end_header_id|>\n\n';
      reqBody = JSON.stringify({ prompt, max_gen_len: effMax, temperature, top_p: 0.9 });
    } else {
      return NextResponse.json({ error: 'Unsupported provider: ' + mc.provider }, { status: 400 });
    }

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
      content = content || 'No response.';
    } else if (mc.provider === 'Meta') {
      content = resBody.generation || 'No response.';
    }

    const usage = resBody.usage;
    const inTok = usage?.input_tokens || 0;
    const outTok = usage?.output_tokens || 0;
    const costVal =
      inTok > 0 || outTok > 0
        ? (inTok / 1000) * mc.inputPricePer1K + (outTok / 1000) * mc.outputPricePer1K
        : undefined;

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
    console.error('[Bedrock]', error);
    if (error instanceof Error) {
      const name = (error as Error & { name?: string }).name || '';
      if (name === 'AccessDeniedException')
        return NextResponse.json({ error: 'Access denied. Check IAM + model access.' }, { status: 403 });
      if (name === 'ValidationException')
        return NextResponse.json({ error: error.message }, { status: 400 });
      if (name === 'ThrottlingException')
        return NextResponse.json({ error: 'Throttled. Retry.' }, { status: 429 });
      if (name === 'ResourceNotFoundException')
        return NextResponse.json({ error: 'Model not found.' }, { status: 404 });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: 'Unexpected error.' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: 'ok', region: AWS_REGION });
}