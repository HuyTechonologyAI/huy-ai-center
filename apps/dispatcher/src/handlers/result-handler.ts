import { SupabaseClient } from '@supabase/supabase-js';
import { AITask, TaskResult } from '@huy-ai/contracts';
import { Logger } from '@huy-ai/shared';

export class ResultHandler {
  private supabase: SupabaseClient;
  private logger: Logger;

  constructor(supabase: SupabaseClient, logger: Logger) {
    this.supabase = supabase;
    this.logger = logger.child('ResultHandler');
  }

  /**
   * Persists a successful task result:
   * 1. Inserts record into `ai_outputs`
   * 2. Updates `ai_tasks` status to 'completed'
   */
  async handleSuccess(task: AITask, result: TaskResult, workerId: string): Promise<void> {
    const taskId = task.id;
    const now = new Date().toISOString();

    const tokens = result.tokens || result.tokensUsed || {};
    const promptTokens = tokens.prompt || 0;
    const completionTokens = tokens.completion || 0;
    const totalTokens = tokens.total || promptTokens + completionTokens;

    // 1. Insert into ai_outputs
    try {
      const { error: outputErr } = await this.supabase.from('ai_outputs').insert({
        task_id: taskId,
        text: result.text || (typeof result.output === 'string' ? result.output : null),
        json: typeof result.output === 'object' ? result.output : result.json || null,
        model: result.model || 'dell-m4800/default',
        tokens_prompt: promptTokens,
        tokens_completion: completionTokens,
        tokens_total: totalTokens,
        latency_ms: result.latencyMs || result.executionTimeMs || 0,
        finish_reason: result.finishReason || 'stop',
        metadata: {
          ...result.metadata,
          claimed_by_worker_id: workerId,
          completed_at: now,
        },
      });

      if (outputErr) {
        this.logger.warn(`Failed to insert record into ai_outputs for task [${taskId}]`, {
          error: outputErr.message,
        });
      }
    } catch (err) {
      this.logger.warn(`Exception during ai_outputs insert for task [${taskId}]`, {
        error: String(err),
      });
    }

    // 2. Update ai_tasks table to completed
    const { error: taskErr } = await this.supabase
      .from('ai_tasks')
      .update({
        status: 'completed',
        result,
        completed_at: now,
        updated_at: now,
      })
      .eq('id', taskId);

    if (taskErr) {
      this.logger.error(`Failed to update task [${taskId}] to completed`, taskErr);
      throw new Error(`Database error marking task completed: ${taskErr.message}`);
    }

    this.logger.info(`Task [${taskId}] successfully completed and persisted.`, {
      latencyMs: result.latencyMs,
      totalTokens,
    });
  }

  /**
   * Persists a failed task execution:
   * Updates `ai_tasks` status to 'failed' with error details.
   */
  async handleFailure(
    task: AITask,
    errorMessage: string,
    details?: unknown
  ): Promise<void> {
    const taskId = task.id;
    const now = new Date().toISOString();

    const failureResult = {
      error: errorMessage,
      details: details || null,
      failed_at: now,
    };

    const { error } = await this.supabase
      .from('ai_tasks')
      .update({
        status: 'failed',
        result: failureResult,
        completed_at: now,
        updated_at: now,
      })
      .eq('id', taskId);

    if (error) {
      this.logger.error(`Failed to update task [${taskId}] to failed state`, error);
    } else {
      this.logger.warn(`Task [${taskId}] marked as failed.`, { error: errorMessage });
    }
  }
}
