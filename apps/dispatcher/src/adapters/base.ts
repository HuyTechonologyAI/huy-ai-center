import { AIServiceAdapter, AdapterType, TaskPayload, TaskResult } from '@huy-ai/contracts';
import { Logger } from '@huy-ai/shared';

export abstract class BaseAIServiceAdapter implements AIServiceAdapter {
  abstract readonly type: AdapterType;
  abstract readonly name: string;
  protected logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  abstract isAvailable(): Promise<boolean>;
  protected abstract executeInternal(payload: TaskPayload): Promise<TaskResult>;

  async execute(payload: TaskPayload): Promise<TaskResult> {
    const startTime = Date.now();
    this.logger.info(`Starting execution on adapter ${this.name}`, { adapter: this.type });

    try {
      const result = await this.executeInternal(payload);
      const executionTimeMs = Date.now() - startTime;
      this.logger.info(`Execution completed on adapter ${this.name}`, { executionTimeMs });

      return {
        ...result,
        executionTimeMs,
      };
    } catch (error) {
      const executionTimeMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Execution failed on adapter ${this.name}`, error, { executionTimeMs });

      return {
        error: errorMessage,
        executionTimeMs,
      };
    }
  }
}
