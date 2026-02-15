import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime'

const client = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

export async function invokeClaude(messages: any[]) {
  const payload = {
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: 4096,
    messages: messages.map(m => ({
      role: m.role,
      content: m.content
    })),
    temperature: 0.7,
  }

  const command = new InvokeModelCommand({
    modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
    body: JSON.stringify(payload),
    contentType: 'application/json',
    accept: 'application/json',
  })

  try {
    const response = await client.send(command)
    const responseBody = JSON.parse(new TextDecoder().decode(response.body))
    return responseBody.content[0].text
  } catch (error) {
    console.error('Bedrock error:', error)
    throw error
  }
}
