import { AIServiceAdapter } from '@huy-ai/contracts';
import { WorkerEnv } from '@huy-ai/config';
import { Logger } from '@huy-ai/shared';
import { BaseAIServiceAdapter } from './base.js';
import { MockAdapter } from './mock.adapter.js';
import { OllamaAdapter } from './ollama.js';
import { LiteLLMAdapter } from './litellm.js';
import { LangflowAdapter } from './langflow.js';
import { N8nAdapter } from './n8n.js';

export {
  BaseAIServiceAdapter,
  MockAdapter,
  OllamaAdapter,
  LiteLLMAdapter,
  LangflowAdapter,
  N8nAdapter,
};

export function createAdapterRegistry(
  env: WorkerEnv,
  logger: Logger
): Map<string, AIServiceAdapter> {
  const adapters = new Map<string, AIServiceAdapter>();

  // Always register MockAdapter
  const mockAdapter = new MockAdapter(logger);
  adapters.set('mock', mockAdapter);

  // Register real adapters
  const ollamaAdapter = new OllamaAdapter(env.OLLAMA_BASE_URL, logger);
  adapters.set('ollama', ollamaAdapter);

  const litellmAdapter = new LiteLLMAdapter(env.LITELLM_BASE_URL, env.LITELLM_API_KEY, logger);
  adapters.set('litellm', litellmAdapter);

  const langflowAdapter = new LangflowAdapter(env.LANGFLOW_BASE_URL, env.LANGFLOW_API_KEY, logger);
  adapters.set('langflow', langflowAdapter);

  const n8nAdapter = new N8nAdapter(env.N8N_BASE_URL, env.N8N_API_KEY, logger);
  adapters.set('n8n', n8nAdapter);

  logger.info(`[AdapterRegistry] Configured provider mode: ${env.AI_PROVIDER_MODE}`);
  logger.info(`[AdapterRegistry] Registered adapters: ${Array.from(adapters.keys()).join(', ')}`);

  return adapters;
}
