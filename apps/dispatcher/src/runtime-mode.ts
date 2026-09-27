/** Runtime-mode safety interlocks for phased Node01 activation. */
export function parseTelemetryOnly(value: string | undefined): boolean {
  if (value === undefined || value.trim() === '' || value.trim().toLowerCase() === 'false') return false;
  if (value.trim().toLowerCase() === 'true') return true;
  throw new Error('WORKER_TELEMETRY_ONLY must be true or false');
}

export function shouldStartTaskPoller(telemetryOnly: boolean): boolean {
  return telemetryOnly !== true;
}

export function resolveHealthBindHost(telemetryOnly: boolean): string {
  return telemetryOnly ? '127.0.0.1' : '0.0.0.0';
}
