declare module '@/lib/models/config' {
  export const MODELS: Record<string, any>;
  export const DEFAULT_MODEL: string;
  export function isValidModelId(id: string): boolean;
  export function getModelConfig(id: string): any;
}

declare module '@/lib/bedrock/invoker' {
  export class BedrockInvoker {
    static invoke(request: any): Promise<any>;
    static invokeStream(request: any): AsyncGenerator<string, any, unknown>;
  }
}
