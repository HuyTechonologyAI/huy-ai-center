import { SupabaseClient } from '@supabase/supabase-js';
import { AIServiceAdapter, AITask } from '@huy-ai/contracts';
import { Logger } from '@huy-ai/shared';

export interface QueuePollerConfig {
  workerId: string;
  pollIntervalMs: number;
  concurrency: number;
}

export class QueuePoller {
  private supabase: SupabaseClient;
  private adapters: Map<string, AIServiceAdapter>;
  private config: QueuePollerConfig;
  private logger: Logger;
  private running = false;
  private activeJobs = 0;
  private onActiveCountChange?: (count: number) => void;

  constructor(
    supabase: SupabaseClient,
    adapters: Map<string, AIServiceAdapter>,
    config: QueuePollerConfig,
    logger: Logger,
    onActiveCountChange?: (count: number) => void
  ) {
    this.supabase = supabase;
    this.adapters = adapters;
    this.config = config;
    this.logger = logger.child('QueuePoller');
    this.onActiveCountChange = onActiveCountChange;
  }

  start(): void {
    this.running = true;
    this.logger.info(`Starting queue poller (interval: ${this.config.pollIntervalMs}ms, concurrency: ${this.config.concurrency})`);
    this.pollLoop();
  }

  stop(): void {
    this.running = false;
    this.logger.info('Stopping queue poller');
  }

  private async pollLoop(): Promise<void> {
    while (this.running) {
      try {
        if (this.activeJobs < this.config.concurrency) {
          const task = await this.claimNextTask();
          if (task) {
            this.activeJobs++;
            this.onActiveCountChange?.(this.activeJobs);
            // Process in background, do not await here
            this.processTask(task).finally(() => {
              this.activeJobs--;
              this.onActiveCountChange?.(this.activeJobs);
            });
          }
        }
      } catch (err) {
        this.logger.error('Error during poll iteration', err);
      }

      await new Promise((resolve) => setTimeout(resolve, this.config.pollIntervalMs));
    }
  }

  private async claimNextTask(): Promise<AITask | null> {
    // Stored procedure / atomic claim query via Supabase RPC or update
    const { data, error } = await this.supabase.rpc('claim_ai_task', {
      p_worker_id: this.config.workerId,
    });

    if (error) {
      // If RPC is not present yet, fallback to update-limit approach
      this.logger.debug('claim_ai_task RPC call result', { note: error.message });
      return null;
    }

    if (!data || data.length === 0) {
      return null;
    }

    const raw = data[0];
    return {
      id: raw.id,
      sourceApp: raw.source_app,
      taskType: raw.task_type,
      priority: raw.priority,
      status: raw.status,
      payload: raw.payload,
      result: raw.result,
      claimedByWorkerId: raw.claimed_by_worker_id,
      claimedAt: raw.claimed_at,
      startedAt: raw.started_at,
      completedAt: raw.completed_at,
      timeoutSeconds: raw.timeout_seconds,
      retryCount: raw.retry_count,
      maxRetries: raw.max_retries,
      createdAt: raw.created_at,
      updatedAt: raw.updated_at,
    };
  }

  private async processTask(task: AITask): Promise<void> {
    const taskId = task.id;
    this.logger.info(`Processing task [${taskId}] (${task.taskType}) from ${task.sourceApp}`);

    await this.supabase
      .from('ai_tasks')
      .update({
        status: 'running',
        started_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', taskId);

    const adapter = this.selectAdapterForTask(task);
    if (!adapter) {
      const errorMsg = `No suitable adapter registered for task type: ${task.taskType}`;
      this.logger.error(errorMsg);
      await this.markTaskFailed(taskId, errorMsg);
      return;
    }

    try {
      const result = await adapter.execute(task.payload);

      if (result.error) {
        await this.markTaskFailed(taskId, result.error, result);
      } else {
        await this.supabase
          .from('ai_tasks')
          .update({
            status: 'completed',
            result,
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', taskId);

        this.logger.info(`Task [${taskId}] completed successfully`);
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      await this.markTaskFailed(taskId, errMsg);
    }
  }

  private selectAdapterForTask(task: AITask): AIServiceAdapter | undefined {
    if (task.taskType === 'llm_inference') {
      return this.adapters.get('litellm') || this.adapters.get('ollama');
    }
    if (task.taskType === 'rag_query') {
      return this.adapters.get('langflow') || this.adapters.get('ollama');
    }
    if (task.taskType === 'workflow_automation') {
      return this.adapters.get('n8n') || this.adapters.get('langflow');
    }
    return this.adapters.values().next().value;
  }

  private async markTaskFailed(taskId: string, error: string, result?: unknown): Promise<void> {
    await this.supabase
      .from('ai_tasks')
      .update({
        status: 'failed',
        result: (result as Record<string, unknown>) || { error },
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', taskId);

    this.logger.error(`Task [${taskId}] marked as failed: ${error}`);
  }
}
