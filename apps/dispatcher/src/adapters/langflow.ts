import { AdapterType, TaskPayload, TaskResult } from '@huy-ai/contracts';
import { Logger } from '@huy-ai/shared';
import { BaseAIServiceAdapter } from './base.js';

export class LangflowAdapter extends BaseAIServiceAdapter {
  readonly type: AdapterType = 'langflow';
  readonly name = 'Langflow Agent Orchestrator';
  private baseUrl: string;
  private apiKey?: string;

  constructor(baseUrl: string, apiKey: string | undefined, logger: Logger) {
    super(logger.child('LangflowAdapter'));
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.apiKey = apiKey;
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        signal: AbortSignal.timeout(3000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  protected async executeInternal(payload: TaskPayload): Promise<TaskResult> {
    const flowId = payload.workflowId;
    if (!flowId) {
      throw new Error('Langflow execution requires workflowId in task payload');
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.apiKey) {
      headers['x-api-key'] = this.apiKey;
    }

    const response = await fetch(`${this.baseUrl}/api/v1/run/${flowId}?stream=false`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        input_value: payload.prompt,
        input_type: 'chat',
        output_type: 'chat',
        tweaks: payload.inputs,
      }),
      signal: AbortSignal.timeout(180000),
    });

    if (!response.ok) {
      throw new Error(`Langflow returned status: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as Record<string, unknown>;
    return {
      output: data,
    };
  }
}
