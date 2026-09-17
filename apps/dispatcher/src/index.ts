import { createClient } from '@supabase/supabase-js';
import { parseWorkerEnv } from '@huy-ai/config';
import { rootLogger } from '@huy-ai/shared';
import { createAdapterRegistry } from './adapters/index.js';
import { TaskRouter } from './router/task-router.js';
import { HeartbeatManager } from './heartbeat.js';
import { QueuePoller } from './queue/poller.js';
import { HealthServer } from './health.js';

async function bootstrap() {
  const logger = rootLogger.child('DispatcherDaemon');
  logger.info('========================================================');
  logger.info('Starting HUY TECHNOLOGY AI Dispatcher Worker Daemon');
  logger.info('Target Compute Node: Dell Precision M4800 (huy-ai-node-01)');
  logger.info('========================================================');

  let env;
  try {
    env = parseWorkerEnv(process.env);
  } catch (err) {
    logger.error('Invalid environment configuration. Check your environment variables.', err);
    process.exit(1);
  }

  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  // 1. Initialize AI Adapters Registry
  const adapters = createAdapterRegistry(env, logger);
  const capabilities = Array.from(adapters.keys());

  // 2. Initialize Task Router
  const router = new TaskRouter(
    adapters,
    {
      providerMode: env.AI_PROVIDER_MODE,
      fallbackToMockOnFailure: true,
    },
    logger
  );

  let currentActiveJobs = 0;
  let isReady = false;

  // 3. Initialize HTTP Health Check Server (/health, /ready)
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

  // 4. Initialize Heartbeat Manager (targets nodes and node_heartbeats)
  const heartbeat = new HeartbeatManager(
    supabase,
    {
      nodeId: env.WORKER_NODE_ID,
      nodeName: env.WORKER_NODE_NAME,
      intervalMs: env.WORKER_HEARTBEAT_INTERVAL_MS,
      capabilities,
      maxConcurrency: env.WORKER_CONCURRENCY,
    },
    logger
  );

  // 5. Initialize Queue Poller with atomic claim and lease renewal
  const poller = new QueuePoller(
    supabase,
    router,
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

  // Register worker in DB & start background loops
  await heartbeat.register();
  heartbeat.start();
  poller.start();
  isReady = true;

  logger.info(`Dispatcher is ready. Provider mode: [${env.AI_PROVIDER_MODE}]. Concurrency: ${env.WORKER_CONCURRENCY}`);

  // Graceful shutdown handling
  let isShuttingDown = false;
  const shutdown = async (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    logger.info(`Received ${signal}. Shutting down gracefully...`);
    isReady = false;

    try {
      await poller.stop();
      await heartbeat.stop();
      await healthServer.stop();
      logger.info('Dispatcher cleanly stopped. Exiting.');
      process.exit(0);
    } catch (err) {
      logger.error('Error during graceful shutdown', err);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch((err) => {
  rootLogger.error('Unhandled fatal exception during bootstrap', err);
  process.exit(1);
});
