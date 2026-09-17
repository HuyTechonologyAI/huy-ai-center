import { AdapterType, TaskPayload, TaskResult } from '@huy-ai/contracts';
import { Logger } from '@huy-ai/shared';
import { BaseAIServiceAdapter } from './base.js';

export class OllamaAdapter extends BaseAIServiceAdapter {
  readonly type: AdapterType = 'ollama';
  readonly name = 'Ollama Local LLM Engine';
  private baseUrl: string;

  constructor(baseUrl: string, logger: Logger) {
    super(logger.child('OllamaAdapter'));
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        signal: AbortSignal.timeout(3000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  protected async executeInternal(payload: TaskPayload): Promise<TaskResult> {
    const model = payload.model || 'qwen2.5:7b';
    const prompt = payload.prompt || '';

    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt,
        stream: false,
        options: payload.parameters,
      }),
      signal: AbortSignal.timeout(120000),
    });

    if (!response.ok) {
      throw new Error(`Ollama responded with status: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as {
      response?: string;
      prompt_eval_count?: number;
      eval_count?: number;
    };

    return {
      text: data.response || '',
      output: data,
      tokensUsed: {
        prompt: data.prompt_eval_count,
        completion: data.eval_count,
        total: (data.prompt_eval_count || 0) + (data.eval_count || 0),
      },
    };
  }
}
