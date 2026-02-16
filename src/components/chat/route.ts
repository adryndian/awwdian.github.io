import { NextRequest } from 'next/server';
import { invokeClaude } from '@/lib/bedrock/claude';
import { streamDeepSeek } from '@/lib/bedrock/deepseek';
import { MODELS } from '@/lib/models/config';
import { ModelId } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const { messages, model, files } = await req.json();
    const modelConfig = MODELS[model as ModelId];

    if (modelConfig.supportsStreaming) {
      // DeepSeek streaming
      const stream = new ReadableStream({
        async start(controller) {
          try {
            const generator = streamDeepSeek(messages, files);
            let result: { inputTokens: number; outputTokens: number; costUSD: number } = { inputTokens: 0, outputTokens: 0, costUSD: 0 };
            
            for await (const chunk of generator) {
              const data = `data: ${JSON.stringify({ content: chunk })}\n\n`;
              controller.enqueue(new TextEncoder().encode(data));
            }
            
            // Get final result
            const finalResult = await generator.next();
            if (finalResult.value && typeof finalResult.value === 'object') {
              result = finalResult.value as { inputTokens: number; outputTokens: number; costUSD: number };
            }
            
            // Send usage data
            const usageData = `data: ${JSON.stringify({ usage: result })}\n\n`;
            controller.enqueue(new TextEncoder().encode(usageData));
            controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
            controller.close();
          } catch (error) {
            controller.error(error);
          }
        },
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    } else {
      // Claude standard
      const result = await invokeClaude(messages, model as ModelId, files);
      
      return Response.json({
        content: result.content,
        usage: result.usage,
        cost: result.usage.costUSD,
      });
    }
  } catch (error) {
    console.error('API error:', error);
    return Response.json(
      { error: 'Failed to generate response' },
      { status: 500 }
    );
  }
}
