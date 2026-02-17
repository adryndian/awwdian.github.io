// src/lib/bedrock/llama.ts
import {
  BedrockRuntimeClient,
  InvokeModelCommand,
  ConverseCommand,
} from "@aws-sdk/client-bedrock-runtime";
import { getBedrockClient } from "./client";

// ============================================
// LLaMA Model Configuration
// ============================================
const LLAMA_MODELS = {
  // LLaMA 3.1 variants on Bedrock
  primary: "meta.llama3-1-70b-instruct-v1:0",
  fallback1: "meta.llama3-1-8b-instruct-v1:0",
  // LLaMA 3 (older, wider availability)
  fallback2: "meta.llama3-70b-instruct-v1:0",
  fallback3: "meta.llama3-8b-instruct-v1:0",
} as const;

interface LlamaMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface LlamaResponse {
  content: string;
  inputTokens: number;
  outputTokens: number;
}

// ============================================
// Build LLaMA Prompt
// CRITICAL: Must match exact template format
// ============================================
function buildLlamaPrompt(messages: LlamaMessage[]): string {
  let prompt = "<|begin_of_text|>";

  // Add system message if not present
  const hasSystem = messages.some((m) => m.role === "system");
  if (!hasSystem) {
    prompt +=
      "<|start_header_id|>system<|end_header_id|>\n\n" +
      "Kamu adalah asisten AI yang membantu. Jawab dalam bahasa yang sama dengan pertanyaan user." +
      "<|eot_id|>";
  }

  for (const msg of messages) {
    prompt +=
      `<|start_header_id|>${msg.role}<|end_header_id|>\n\n` +
      `${msg.content}<|eot_id|>`;
  }

  // Signal assistant to respond
  prompt += "<|start_header_id|>assistant<|end_header_id|>\n\n";

  return prompt;
}

// ============================================
// Build InvokeModel Payload
// ============================================
function buildInvokePayload(
  messages: LlamaMessage[],
  maxTokens: number = 2048,
  temperature: number = 0.7
) {
  return {
    prompt: buildLlamaPrompt(messages),
    max_gen_len: maxTokens,
    temperature,
    top_p: 0.9,
  };
}

// ============================================
// Parse InvokeModel Response
// ============================================
function parseLlamaResponse(responseBody: any): LlamaResponse {
  // Format 1: Standard LLaMA response
  if (responseBody.generation !== undefined) {
    return {
      content: responseBody.generation.trim(),
      inputTokens: responseBody.prompt_token_count || 0,
      outputTokens: responseBody.generation_token_count || 0,
    };
  }

  // Format 2: Choices array
  if (responseBody.choices && responseBody.choices.length > 0) {
    const choice = responseBody.choices[0];
    return {
      content:
        choice.message?.content ||
        choice.text ||
        "",
      inputTokens: responseBody.usage?.prompt_tokens || 0,
      outputTokens: responseBody.usage?.completion_tokens || 0,
    };
  }

  // Format 3: Direct output
  if (responseBody.output || responseBody.text || responseBody.content) {
    return {
      content:
        responseBody.output ||
        responseBody.text ||
        responseBody.content ||
        "",
      inputTokens: 0,
      outputTokens: 0,
    };
  }

  // Format 4: Results array (some Bedrock versions)
  if (responseBody.results && responseBody.results.length > 0) {
    return {
      content: responseBody.results[0].outputText || "",
      inputTokens: 0,
      outputTokens: 0,
    };
  }

  console.error(
    "Unknown LLaMA response format:",
    JSON.stringify(responseBody, null, 2)
  );
  throw new Error(
    "Format respons LLaMA tidak dikenali. Response: " +
      JSON.stringify(responseBody).substring(0, 200)
  );
}

// ============================================
// Method 1: InvokeModel (primary method)
// ============================================
async function tryInvokeModel(
  client: BedrockRuntimeClient,
  modelId: string,
  messages: LlamaMessage[],
  maxTokens: number,
  temperature: number
): Promise<LlamaResponse> {
  const payload = buildInvokePayload(messages, maxTokens, temperature);

  console.log(`[LLaMA] InvokeModel with ${modelId}`);
  console.log(`[LLaMA] Prompt preview:`, payload.prompt.substring(0, 300));

  const command = new InvokeModelCommand({
    modelId,
    contentType: "application/json",
    accept: "application/json",
    body: JSON.stringify(payload),
  });

  const response = await client.send(command);
  const responseText = new TextDecoder().decode(response.body);

  console.log(`[LLaMA] Raw response:`, responseText.substring(0, 500));

  const responseBody = JSON.parse(responseText);
  return parseLlamaResponse(responseBody);
}

// ============================================
// Method 2: Converse API (fallback method)
// Bedrock's unified API that works across models
// ============================================
async function tryConverseAPI(
  client: BedrockRuntimeClient,
  modelId: string,
  messages: LlamaMessage[],
  maxTokens: number,
  temperature: number
): Promise<LlamaResponse> {
  console.log(`[LLaMA] Converse API with ${modelId}`);

  // Separate system message
  const systemMessages = messages.filter((m) => m.role === "system");
  const chatMessages = messages.filter((m) => m.role !== "system");

  // Build Converse API params
  const converseMessages = chatMessages.map((msg) => ({
    role: msg.role as "user" | "assistant",
    content: [{ text: msg.content }],
  }));

  // Ensure messages alternate user/assistant
  // Converse API requires first message to be "user"
  if (converseMessages.length === 0 || converseMessages[0].role !== "user") {
    throw new Error("First message must be from user");
  }

  const params: any = {
    modelId,
    messages: converseMessages,
    inferenceConfig: {
      maxTokens,
      temperature,
      topP: 0.9,
    },
  };

  // Add system prompt if present
  if (systemMessages.length > 0) {
    params.system = [{ text: systemMessages[0].content }];
  }

  const command = new ConverseCommand(params);
  const response = await client.send(command);

  console.log(`[LLaMA] Converse response:`, JSON.stringify(response.output).substring(0, 500));

  const outputContent = response.output?.message?.content;
  if (!outputContent || outputContent.length === 0) {
    throw new Error("Empty response from Converse API");
  }

  const text = outputContent
    .map((block: any) => block.text || "")
    .join("");

  return {
    content: text.trim(),
    inputTokens: response.usage?.inputTokens || 0,
    outputTokens: response.usage?.outputTokens || 0,
  };
}

// ============================================
// Main: Invoke LLaMA
// Tries multiple models and methods
// ============================================
export async function invokeLlama(
  messages: LlamaMessage[],
  maxTokens: number = 2048,
  temperature: number = 0.7
): Promise<LlamaResponse> {
  const client = getBedrockClient();

  const modelsToTry = [
    LLAMA_MODELS.primary,
    LLAMA_MODELS.fallback1,
    LLAMA_MODELS.fallback2,
    LLAMA_MODELS
    LLAMA_MODELS.fallback3,
  ];

  // Try each model with both methods
  type InvokeMethod = (
    client: BedrockRuntimeClient,
    modelId: string,
    messages: LlamaMessage[],
    maxTokens: number,
    temperature: number
  ) => Promise<LlamaResponse>;

  const methods: { name: string; fn: InvokeMethod }[] = [
    { name: "InvokeModel", fn: tryInvokeModel },
    { name: "ConverseAPI", fn: tryConverseAPI },
  ];

  let lastError: Error | null = null;

  for (const modelId of modelsToTry) {
    for (const method of methods) {
      try {
        console.log(`[LLaMA] Trying ${modelId} with ${method.name}...`);

        const result = await method.fn(
          client,
          modelId,
          messages,
          maxTokens,
          temperature
        );

        if (result.content && result.content.trim().length > 0) {
          console.log(`[LLaMA] ✅ Success: ${modelId} + ${method.name}`);
          return result;
        }

        console.warn(`[LLaMA] Empty response, trying next...`);
      } catch (err: any) {
        lastError = err;
        console.warn(
          `[LLaMA] ❌ ${modelId} + ${method.name} failed:`,
          err.message
        );

        // If AccessDeniedException, model not enabled - skip all methods for this model
        if (
          err.name === "AccessDeniedException" ||
          err.message?.includes("not authorized") ||
          err.message?.includes("not enabled") ||
          err.message?.includes("no access")
        ) {
          console.warn(`[LLaMA] Model ${modelId} not enabled, skipping...`);
          break; // Skip to next model
        }

        continue;
      }
    }
  }

  // All failed
  throw new Error(
    `LLaMA gagal merespon setelah mencoba semua model dan metode. ` +
      `Error terakhir: ${lastError?.message || "Unknown"}. ` +
      `Pastikan minimal satu model LLaMA sudah di-enable di AWS Bedrock Console ` +
      `(region: ${process.env.AWS_REGION || "us-east-1"}). ` +
      `Model yang dicoba: ${modelsToTry.join(", ")}`
  );
}