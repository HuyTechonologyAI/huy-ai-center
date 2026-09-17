import { AdapterType, TaskPayload, TaskResult } from '@huy-ai/contracts';
import { Logger } from '@huy-ai/shared';
import { BaseAIServiceAdapter } from './base.js';

export class N8nAdapter extends BaseAIServiceAdapter {
  readonly type: AdapterType = 'n8n';
  readonly name = 'n8n Workflow Engine';
  private baseUrl: string;
  private apiKey?: string;

  constructor(baseUrl: string, apiKey: string | undefined, logger: Logger) {
    super(logger.child('N8nAdapter'));
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.apiKey = apiKey;
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/healthz`, {
        signal: AbortSignal.timeout(3000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  protected async executeInternal(payload: TaskPayload): Promise<TaskResult> {
    const webhookPath = payload.workflowId;
    if (!webhookPath) {
      throw new Error('n8n execution requires webhook path/workflowId in task payload');
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.apiKey) {
      headers['X-N8N-API-KEY'] = this.apiKey;
    }

    const cleanPath = webhookPath.replace(/^\//, '');
    const url = `${this.baseUrl}/webhook/${cleanPath}`;

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        prompt: payload.prompt,
        inputs: payload.inputs,
        parameters: payload.parameters,
      }),
      signal: AbortSignal.timeout(180000),
    });

    if (!response.ok) {
      throw new Error(`n8n webhook returned status: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as Record<string, unknown>;
    return {
      output: data,
    };
  }
}
