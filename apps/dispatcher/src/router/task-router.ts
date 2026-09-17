import { AIServiceAdapter, AITask } from '@huy-ai/contracts';
import { Logger } from '@huy-ai/shared';

export interface TaskRouterOptions {
  providerMode: 'mock' | 'langflow' | 'ollama' | 'litellm' | 'auto';
  fallbackToMockOnFailure?: boolean;
}

export class TaskRouter {
  private adapters: Map<string, AIServiceAdapter>;
  private options: TaskRouterOptions;
  private logger: Logger;

  constructor(
    adapters: Map<string, AIServiceAdapter>,
    options: TaskRouterOptions,
    logger: Logger
  ) {
    this.adapters = adapters;
    this.options = options;
    this.logger = logger.child('TaskRouter');
  }

  /**
   * Resolves the most suitable adapter for a given task.
   */
  async resolveAdapter(task: AITask): Promise<AIServiceAdapter> {
    const mode = this.options.providerMode;
    this.logger.debug(`Resolving adapter for task [${task.id}] (${task.taskType}) with mode: ${mode}`);

    // If provider mode is explicitly set to mock, always use mock adapter
    if (mode === 'mock') {
      const mock = this.adapters.get('mock');
      if (mock) return mock;
    }

    // If explicit single provider is configured
    if (mode === 'langflow') {
      const adapter = this.adapters.get('langflow');
      if (adapter && (await adapter.isAvailable())) {
        return adapter;
      }
      return this.handleFallback(task, 'langflow');
    }

    if (mode === 'ollama') {
      const adapter = this.adapters.get('ollama');
      if (adapter && (await adapter.isAvailable())) {
        return adapter;
      }
      return this.handleFallback(task, 'ollama');
    }

    if (mode === 'litellm') {
      const adapter = this.adapters.get('litellm');
      if (adapter && (await adapter.isAvailable())) {
        return adapter;
      }
      return this.handleFallback(task, 'litellm');
    }

    // Mode: 'auto' — Dynamic Task Type Routing
    return this.routeByTaskType(task);
  }

  private async routeByTaskType(task: AITask): Promise<AIServiceAdapter> {
    const taskType = task.taskType;

    if (taskType === 'workflow_automation') {
      const n8n = this.adapters.get('n8n');
      if (n8n && (await n8n.isAvailable())) return n8n;

      const langflow = this.adapters.get('langflow');
      if (langflow && (await langflow.isAvailable())) return langflow;
    }

    if (taskType === 'rag_query') {
      const langflow = this.adapters.get('langflow');
      if (langflow && (await langflow.isAvailable())) return langflow;

      const ollama = this.adapters.get('ollama');
      if (ollama && (await ollama.isAvailable())) return ollama;
    }

    if (taskType === 'llm_inference') {
      const ollama = this.adapters.get('ollama');
      if (ollama && (await ollama.isAvailable())) return ollama;

      const litellm = this.adapters.get('litellm');
      if (litellm && (await litellm.isAvailable())) return litellm;
    }

    // Default fallback to mock or first available adapter
    return this.handleFallback(task, 'auto-resolver');
  }

  private handleFallback(task: AITask, primaryCandidate: string): AIServiceAdapter {
    this.logger.warn(
      `Primary adapter candidate '${primaryCandidate}' is unavailable or offline for task [${task.id}].`
    );

    if (this.options.fallbackToMockOnFailure !== false) {
      const mock = this.adapters.get('mock');
      if (mock) {
        this.logger.info(`Routing task [${task.id}] to MockAdapter as safe fallback.`);
        return mock;
      }
    }

    // If mock is missing, take any registered adapter
    const fallback = Array.from(this.adapters.values())[0];
    if (!fallback) {
      throw new Error('No AI adapters registered in TaskRouter');
    }
    return fallback;
  }
}
