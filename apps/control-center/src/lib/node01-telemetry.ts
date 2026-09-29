import { createPublicKey, verify } from 'node:crypto';

export interface Node01TelemetryEnvelope {
  payload: string;
  signature: string;
}

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

const metricNames = [
  'cpu', 'ram', 'disk', 'queue', 'active', 'ramTotal', 'ramFree',
] as const;

interface SanitizedPayload {
  version: 1;
  nodeId: 'huy-ai-node-01';
  timestamp: string;
  status: 'ONLINE' | 'DEGRADED' | 'OFFLINE';
  metrics: Record<typeof metricNames[number], number>;
  metadata: Record<string, JsonValue>;
}

type VerificationResult =
  | { ok: true; payload: SanitizedPayload; reason?: never }
  | { ok: false; reason: string; payload?: never };

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object'
    && Object.getPrototypeOf(value) === Object.prototype;
}

function sanitizeJson(value: unknown, depth = 0): JsonValue {
  if (depth > 6) throw new Error('Metadata depth exceeded');
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (Array.isArray(value)) return value.map(item => sanitizeJson(item, depth + 1));
  if (!isRecord(value)) throw new Error('Invalid metadata');
  const result: Record<string, JsonValue> = {};
  for (const key of Object.keys(value)) {
    if (/secret|token|env/i.test(key) || ['__proto__', 'constructor', 'prototype'].includes(key)) continue;
    result[key] = sanitizeJson(value[key], depth + 1);
  }
  return result;
}

function isIsoTimestamp(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,3})?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return month >= 1 && month <= 12 && day >= 1 && day <= days[month - 1];
}

export function verifyNode01TelemetryEnvelope(
  envelope: Node01TelemetryEnvelope,
  publicKeyPem: string,
  nowMs = Date.now(),
): VerificationResult {
  const reject = (reason: string): VerificationResult => ({ ok: false, reason });
  try {
    if (!isRecord(envelope) || typeof envelope.payload !== 'string') return reject('PAYLOAD_INVALID');
    const payloadText = envelope.payload;
    if (Buffer.byteLength(payloadText, 'utf8') > 32768) return reject('PAYLOAD_TOO_LARGE');

    try {
      const signatureText = envelope.signature;
      // Ed25519 signatures are exactly 64 bytes, canonically encoded with two padding characters.
      if (typeof signatureText !== 'string' || !/^[A-Za-z0-9+/]{86}==$/.test(signatureText)) {
        return reject('SIGNATURE_INVALID');
      }
      const signature = Buffer.from(signatureText, 'base64');
      if (signature.length !== 64 || signature.toString('base64') !== signatureText) return reject('SIGNATURE_INVALID');
      if (typeof publicKeyPem !== 'string') return reject('SIGNATURE_INVALID');
      const key = createPublicKey(publicKeyPem);
      if (key.asymmetricKeyType !== 'ed25519'
        || !verify(null, Buffer.from(payloadText, 'utf8'), key, signature)) return reject('SIGNATURE_INVALID');
    } catch {
      return reject('SIGNATURE_INVALID');
    }

    const parsed: unknown = JSON.parse(payloadText);
    if (!isRecord(parsed) || parsed.version !== 1) return reject('PAYLOAD_INVALID');
    if (parsed.nodeId !== 'huy-ai-node-01') return reject('NODE_ID_INVALID');
    if (!isIsoTimestamp(parsed.timestamp) || !Number.isFinite(nowMs)) return reject('TIMESTAMP_INVALID');
    const timestampMs = Date.parse(parsed.timestamp);
    if (!Number.isFinite(timestampMs)) return reject('TIMESTAMP_INVALID');
    if (Math.abs(timestampMs - nowMs) > 300_000) return reject('TIMESTAMP_STALE');
    const normalizedStatus = typeof parsed.status === 'string' ? parsed.status.toUpperCase() : '';
    if (!['ONLINE', 'DEGRADED', 'OFFLINE'].includes(normalizedStatus)) return reject('PAYLOAD_INVALID');

    if (!isRecord(parsed.metrics)) return reject('METRICS_INVALID');
    const metrics = {} as SanitizedPayload['metrics'];
    for (const name of metricNames) {
      const value = parsed.metrics[name];
      const isPct = name === 'cpu' || name === 'ram' || name === 'disk';
      if (typeof value !== 'number' || !Number.isFinite(value) || value < 0
        || (isPct && value > 100)) return reject('METRICS_INVALID');
      metrics[name] = value;
    }
    if (metrics.ramFree > metrics.ramTotal) return reject('METRICS_INVALID');

    const metadata: Record<string, JsonValue> = {};
    if (parsed.metadata !== undefined) {
      if (!isRecord(parsed.metadata)) return reject('PAYLOAD_INVALID');
      const allowedMetadata = [
        'supervisorState', 'providerHealth', 'backlogTaskStatuses', 'runtimeWorkers',
        'workExecution', 'runtimeAgents', 'a2aTimeline', 'handoffs', 'providerAttempts',
        'checkpointHistory', 'currentOwner', 'lastAction', 'nextAction',
        'latestBottleneck', 'remoteSyncStatus',
      ];
      for (const name of allowedMetadata) {
        if (!Object.hasOwn(parsed.metadata, name)) continue;
        metadata[name] = sanitizeJson(parsed.metadata[name]);
      }
    }
    return {
      ok: true,
      payload: {
        version: 1, nodeId: 'huy-ai-node-01', timestamp: parsed.timestamp,
        status: normalizedStatus as SanitizedPayload['status'], metrics, metadata,
      },
    };
  } catch {
    return reject('PAYLOAD_INVALID');
  }
}