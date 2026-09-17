import { createClient } from '@supabase/supabase-js';
import { AIServiceAdapter } from '@huy-ai/contracts';
import { parseWorkerEnv } from '@huy-ai/config';
import { rootLogger } from '@huy-ai/shared';
import { OllamaAdapter } from './adapters/ollama.js';
import { LiteLLMAdapter } from './adapters/litellm.js';
import { LangflowAdapter } from './adapters/langflow.js';
import { N8nAdapter } from './adapters/n8n.js';
import { HeartbeatManager } from './heartbeat.js';
import { QueuePoller } from './queue/poller.js';
import { HealthServer } from './health.js';

async function bootstrap() {
  const logger = rootLogger.child('DispatcherDaemon');
  logger.info('========================================================');
  logger.info('Starting HUY TECHNOLOGY AI Dispatcher Worker Daemon');
  logger.info('Target Hardware: Dell Precision M4800 / Cloud Integration');
  logger.info('========================================================');

  let env;
  try {
    env = parseWorkerEnv(process.env);
  } catch (err) {
    logger.error('Invalid environment configuration. Check your .env file.', err);
    process.exit(1);
  }

  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  // Register AI adapters
  const adapters = new Map<string, AIServiceAdapter>();
  adapters.set('ollama', new OllamaAdapter(env.OLLAMA_BASE_URL, logger));
  adapters.set('litellm', new LiteLLMAdapter(env.LITELLM_BASE_URL, env.LITELLM_API_KEY, logger));
  adapters.set('langflow', new LangflowAdapter(env.LANGFLOW_BASE_URL, env.LANGFLOW_API_KEY, logger));
  adapters.set('n8n', new N8nAdapter(env.N8N_BASE_URL, env.N8N_API_KEY, logger));

  const capabilities = Array.from(adapters.keys());
  logger.info(`Initialized adapters: ${capabilities.join(', ')}`);

  let currentActiveJobs = 0;
  let isReady = false;

  // Initialize HTTP Health Check Server
  const healthServer = new HealthServer(
    {
      port: env.DISPATCHER_HEALTH_PORT,
      workerId: env.WORKER_NODE_ID,
      getActiveJobs: () => currentActiveJobs,
      isReady: () => isReady,
    },
    logger
  );
  await healthServer.start();

  // Initialize heartbeat manager
  const heartbeat = new HeartbeatManager(
    supabase,
    {
      nodeId: env.WORKER_NODE_ID,
      nodeName: env.WORKER_NODE_NAME,
      intervalMs: env.WORKER_HEARTBEAT_INTERVAL_MS,
      capabilities,
    },
    logger
  );

  // Initialize queue poller
  const poller = new QueuePoller(
    supabase,
    adapters,
    {
      workerId: env.WORKER_NODE_ID,
      pollIntervalMs: env.WORKER_POLL_INTERVAL_MS,
      concurrency: env.WORKER_CONCURRENCY,
    },
    logger,
    (activeCount) => {
      currentActiveJobs = activeCount;
      heartbeat.setLoad(activeCount);
    }
  );

  // Register worker in DB & start services
  await heartbeat.register();
  heartbeat.start();
  poller.start();
  isReady = true;

  logger.info('Worker is running and listening for AI tasks.');

  // Graceful shutdown handling
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}. Shutting down gracefully...`);
    isReady = false;
    poller.stop();
    await heartbeat.stop();
    await healthServer.stop();
    logger.info('Dispatcher stopped. Exiting.');
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch((err) => {
  rootLogger.error('Unhandled fatal exception during bootstrap', err);
  process.exit(1);
});
