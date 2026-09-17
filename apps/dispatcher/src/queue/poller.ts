import { SupabaseClient } from '@supabase/supabase-js';
import { AITask } from '@huy-ai/contracts';
import { Logger, withRetry } from '@huy-ai/shared';
import { TaskRouter } from '../router/task-router.js';
import { ResultHandler } from '../handlers/result-handler.js';

export interface QueuePollerConfig {
  workerId: string;
  pollIntervalMs: number;
  concurrency: number;
  leaseRenewalIntervalMs?: number;
}

export class QueuePoller {
  private supabase: SupabaseClient;
  private router: TaskRouter;
  private resultHandler: ResultHandler;
  private config: QueuePollerConfig;
  private logger: Logger;
  private running = false;
  private activeJobs = 0;
  private inFlightPromises = new Set<Promise<void>>();
  private onActiveCountChange?: (count: number) => void;

  constructor(
    supabase: SupabaseClient,
    router: TaskRouter,
    config: QueuePollerConfig,
    logger: Logger,
    onActiveCountChange?: (count: number) => void
  ) {
    this.supabase = supabase;
    this.router = router;
    this.config = config;
    this.logger = logger.child('QueuePoller');
    this.resultHandler = new ResultHandler(supabase, logger);
    this.onActiveCountChange = onActiveCountChange;
  }

  start(): void {
    this.running = true;
    this.logger.info(
      `Starting queue poller (workerId: ${this.config.workerId}, interval: ${this.config.pollIntervalMs}ms, concurrency: ${this.config.concurrency})`
    );
    this.pollLoop();
  }

  async stop(): Promise<void> {
    this.running = false;
    this.logger.info('Stopping queue poller. Waiting for in-flight tasks to complete...');
    if (this.inFlightPromises.size > 0) {
      await Promise.allSettled(Array.from(this.inFlightPromises));
    }
    this.logger.info('All in-flight tasks settled. Queue poller stopped.');
  }

  private async pollLoop(): Promise<void> {
    while (this.running) {
      try {
        if (this.activeJobs < this.config.concurrency) {
          const task = await this.claimNextTask();
          if (task) {
            this.activeJobs++;
            this.onActiveCountChange?.(this.activeJobs);

            const taskPromise = this.executeTaskWithLease(task).finally(() => {
              this.activeJobs--;
              this.inFlightPromises.delete(taskPromise);
              this.onActiveCountChange?.(this.activeJobs);
            });

            this.inFlightPromises.add(taskPromise);
          }
        }
      } catch (err) {
        this.logger.error('Error during poll iteration', err);
      }

      await new Promise((resolve) => setTimeout(resolve, this.config.pollIntervalMs));
    }
  }

  /**
   * Atomically claims the next queued task.
   */
  private async claimNextTask(): Promise<AITask | null> {
    try {
      // 1. First attempt: Use database stored procedure if available
      const { data, error } = await this.supabase.rpc('claim_ai_task', {
        p_worker_id: this.config.workerId,
      });

      if (!error && data && data.length > 0) {
        return this.mapDbTask(data[0]);
      }
    } catch {
      // Stored procedure not defined or network error, fallback to direct query
    }

    // 2. Direct atomic claim via SELECT + UPDATE
    try {
      const now = new Date().toISOString();
      const { data: candidates, error: selectErr } = await this.supabase
        .from('ai_tasks')
        .select('*')
        .eq('status', 'queued')
        .order('priority', { ascending: false })
        .order('created_at', { ascending: true })
        .limit(1);

      if (selectErr || !candidates || candidates.length === 0) {
        return null;
      }

      const candidate = candidates[0];

      // Atomically claim by updating status to 'claimed' where status is still 'queued'
      const { data: claimedRows, error: updateErr } = await this.supabase
        .from('ai_tasks')
        .update({
          status: 'claimed',
          claimed_by_worker_id: this.config.workerId,
          claimed_at: now,
          updated_at: now,
        })
        .eq('id', candidate.id)
        .eq('status', 'queued')
        .select('*');

      if (updateErr || !claimedRows || claimedRows.length === 0) {
        // Lost race condition to another worker
        return null;
      }

      return this.mapDbTask(claimedRows[0]);
    } catch (err) {
      this.logger.debug('Direct claim check skipped or encountered error', { error: String(err) });
      return null;
    }
  }

  /**
   * Executes task, keeps processing lease alive, routes to adapter, handles retries and results.
   */
  private async executeTaskWithLease(task: AITask): Promise<void> {
    const taskId = task.id;
    const leaseIntervalMs = this.config.leaseRenewalIntervalMs || 15000;
    this.logger.info(`Starting execution for task [${taskId}] (${task.taskType}) from ${task.sourceApp}`);

    // Update status to 'running'
    const startTime = new Date().toISOString();
    await this.supabase
      .from('ai_tasks')
      .update({
        status: 'running',
        started_at: startTime,
        updated_at: startTime,
      })
      .eq('id', taskId);

    // Lease renewal timer to prevent task being considered dead during long processing
    let isTaskDone = false;
    const leaseTimer = setInterval(async () => {
      if (isTaskDone) return;
      try {
        await this.renewTaskLease(taskId);
      } catch (err) {
        this.logger.warn(`Failed to renew lease for task [${taskId}]`, { error: String(err) });
      }
    }, leaseIntervalMs);

    try {
      // 1. Resolve adapter via TaskRouter
      const adapter = await this.router.resolveAdapter(task);
      this.logger.info(`Resolved adapter '${adapter.name}' for task [${taskId}]`);

      // 2. Execute with transient retry wrapper
      const result = await withRetry(
        async () => {
          const res = await adapter.execute(task.payload);
          if (res.error) {
            throw new Error(`Adapter execution returned error: ${res.error}`);
          }
          return res;
        },
        {
          maxRetries: 2,
          initialDelayMs: 500,
          maxDelayMs: 2000,
        }
      );

      // 3. Persist success result via ResultHandler
      await this.resultHandler.handleSuccess(task, result, this.config.workerId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      this.logger.error(`Task execution failed for [${taskId}]`, err);

      // Check if we can retry the entire task or fail safely
      const currentRetries = task.retryCount || 0;
      const maxRetries = task.maxRetries || 3;

      if (currentRetries < maxRetries) {
        const nextRetry = currentRetries + 1;
        this.logger.info(`Re-queuing task [${taskId}] for retry ${nextRetry}/${maxRetries}`);
        await this.supabase
          .from('ai_tasks')
          .update({
            status: 'queued',
            retry_count: nextRetry,
            claimed_by_worker_id: null,
            claimed_at: null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', taskId);
      } else {
        await this.resultHandler.handleFailure(task, errorMessage);
      }
    } finally {
      isTaskDone = true;
      clearInterval(leaseTimer);
    }
  }

  /**
   * Renews task processing lease by updating updated_at timestamp.
   */
  private async renewTaskLease(taskId: string): Promise<void> {
    await this.supabase
      .from('ai_tasks')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', taskId)
      .eq('status', 'running');
    this.logger.debug(`Renewed lease for task [${taskId}]`);
  }

  private mapDbTask(raw: Record<string, unknown>): AITask {
    return {
      id: String(raw.id),
      sourceApp: (raw.source_app || 'control_center') as AITask['sourceApp'],
      taskType: (raw.task_type || 'llm_inference') as AITask['taskType'],
      priority: (raw.priority || 'normal') as AITask['priority'],
      status: (raw.status || 'claimed') as AITask['status'],
      payload: (raw.payload as AITask['payload']) || {},
      output: raw.result as AITask['output'],
      result: raw.result as AITask['result'],
      steps: (raw.steps as AITask['steps']) || [],
      claimedByWorkerId: raw.claimed_by_worker_id as string,
      claimedAt: raw.claimed_at as string,
      startedAt: raw.started_at as string,
      completedAt: raw.completed_at as string,
      timeoutSeconds: Number(raw.timeout_seconds) || 300,
      retryCount: Number(raw.retry_count) || 0,
      maxRetries: Number(raw.max_retries) || 3,
      createdAt: (raw.created_at || new Date().toISOString()) as string,
      updatedAt: (raw.updated_at || new Date().toISOString()) as string,
    };
  }
}
