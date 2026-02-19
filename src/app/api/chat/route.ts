// src/app/api/chat/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { AWS_REGION, getModelConfig, isValidModelId, DEFAULT_MODEL } from '@/config';

// ✅ Inisialisasi Bedrock Client (TANPA rate limiting)
const bedrockClient = new BedrockRuntimeClient({
  region: AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, modelId = DEFAULT_MODEL, history = [] } = body;

    // ✅ Validasi input dasar (tanpa rate limiting)
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // ✅ Validasi model
    const selectedModelId = isValidModelId(modelId) ? modelId : DEFAULT_MODEL;
    const modelConfig = getModelConfig(selectedModelId);

    // ✅ Build request berdasarkan provider
    let requestBody: string;
    const provider = modelConfig.provider;

    if (provider === 'Anthropic') {
      // Claude models
      const messages = [
        ...history.map((msg: { role: string; content: string }) => ({
          role: msg.role,
          content: msg.content,
        })),
        { role: 'user', content: message },
      ];

      requestBody = JSON.stringify({
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: modelConfig.maxTokens,
        messages,
      });
    } else if (provider === 'Amazon') {
      // Titan models
      requestBody = JSON.stringify({
        inputText: message,
        textGenerationConfig: {
          maxTokenCount: modelConfig.maxTokens,
          temperature: 0.7,
          topP: 0.9,
        },
      });
    } else if (provider === 'Meta') {
      // Llama models
      const prompt = `<|begin_of_text|><|start_header_id|>user<|end_header_id|>\n\n${message}<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n\n`;
      requestBody = JSON.stringify({
        prompt,
        max_gen_len: modelConfig.maxTokens,
        temperature: 0.7,
        top_p: 0.9,
      });
    } else {
      return NextResponse.json(
        { error: `Unsupported provider: ${provider}` },
        { status: 400 }
      );
    }

    // ✅ Kirim request ke Bedrock (TANPA batasan)
    const command = new InvokeModelCommand({
      modelId: selectedModelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: requestBody,
    });

    const response = await bedrockClient.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));

    // ✅ Parse response berdasarkan provider
    let assistantMessage: string;

    if (provider === 'Anthropic') {
      assistantMessage = responseBody.content?.[0]?.text || 'No response';
    } else if (provider === 'Amazon') {
      assistantMessage = responseBody.results?.[0]?.outputText || 'No response';
    } else if (provider === 'Meta') {
      assistantMessage = responseBody.generation || 'No response';
    } else {
      assistantMessage = 'No response';
    }

    return NextResponse.json({
      message: assistantMessage,
      model: selectedModelId,
    });

  } catch (error: unknown) {
    console.error('Bedrock API Error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      {
        error: 'Failed to get AI response',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
