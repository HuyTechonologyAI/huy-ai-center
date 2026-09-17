export interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffFactor?: number;
  shouldRetry?: (error: unknown) => boolean;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelayMs = 500,
    maxDelayMs = 10000,
    backoffFactor = 2,
    shouldRetry = () => true,
  } = options;

  let attempt = 0;
  let delay = initialDelayMs;

  while (true) {
    try {
      return await fn();
    } catch (error) {
      attempt++;
      if (attempt > maxRetries || !shouldRetry(error)) {
        throw error;
      }

      // Add slight jitter (0 - 20%)
      const jitter = delay * 0.2 * Math.random();
      const actualDelay = Math.min(delay + jitter, maxDelayMs);

      await new Promise((resolve) => setTimeout(resolve, actualDelay));
      delay = Math.min(delay * backoffFactor, maxDelayMs);
    }
  }
}
