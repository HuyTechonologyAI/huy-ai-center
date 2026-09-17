import { AdapterType, TaskPayload, TaskResult } from '@huy-ai/contracts';
import { Logger } from '@huy-ai/shared';
import { BaseAIServiceAdapter } from './base.js';

export class LiteLLMAdapter extends BaseAIServiceAdapter {
  readonly type: AdapterType = 'litellm';
  readonly name = 'LiteLLM Intelligent Router';
  private baseUrl: string;
  private apiKey?: string;

  constructor(baseUrl: string, apiKey: string | undefined, logger: Logger) {
    super(logger.child('LiteLLMAdapter'));
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.apiKey = apiKey;
  }

  async isAvailable(): Promise<boolean> {
    try {
      const headers: Record<string, string> = {};
      if (this.apiKey) headers['Authorization'] = `Bearer ${this.apiKey}`;

      const response = await fetch(`${this.baseUrl}/health`, {
        headers,
        signal: AbortSignal.timeout(3000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  protected async executeInternal(payload: TaskPayload): Promise<TaskResult> {
    const model = payload.model || 'gpt-4o-mini';
    const prompt = payload.prompt || '';

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.apiKey) headers['Authorization'] = `Bearer ${this.apiKey}`;

    const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        ...payload.parameters,
      }),
      signal: AbortSignal.timeout(120000),
    });

    if (!response.ok) {
      throw new Error(`LiteLLM responded with status: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
    };

    const text = data.choices?.[0]?.message?.content || '';

    return {
      text,
      output: data,
      tokensUsed: {
        prompt: data.usage?.prompt_tokens,
        completion: data.usage?.completion_tokens,
        total: data.usage?.total_tokens,
      },
    };
  }
}
