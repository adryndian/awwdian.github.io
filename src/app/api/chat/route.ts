import { NextRequest, NextResponse } from 'next/server';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

const client = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function POST(req: NextRequest) {
  try {
    const { messages, modelId, files } = await req.json();

    // Build message content with files
    const messageContent = messages.map((m: any) => {
      const content: any[] = [{ type: 'text', text: m.content }];
      
      // Add images if present
      if (files && m.role === 'user') {
        files.forEach((file: any) => {
          if (file.type.startsWith('image/')) {
            content.push({
              type: 'image',
              source: {
                type: 'base64',
                media_type: file.type,
                data: file.data,
              },
            });
          }
        });
      }
      
      return { role: m.role, content };
    });

    const payload = {
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 4096,
      messages: messageContent,
      temperature: 0.7,
    };

    const command = new InvokeModelCommand({
      modelId: modelId || 'anthropic.claude-sonnet-4-6-v1',
      body: JSON.stringify(payload),
      contentType: 'application/json',
    });

    const response = await client.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));

    return NextResponse.json({
      content: responseBody.content[0].text,
    });
  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json(
      { error: 'Failed to get response' },
      { status: 500 }
    );
  }
}
