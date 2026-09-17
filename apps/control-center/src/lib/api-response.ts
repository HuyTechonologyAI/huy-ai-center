import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { ErrorCode, StandardError } from '@huy-ai/contracts';

export function createRequestId(): string {
  return `req_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
}

export function errorResponse(
  code: ErrorCode,
  message: string,
  statusCode: number,
  requestId: string,
  retryable = false,
  details?: Record<string, unknown>
): NextResponse {
  const errorObj: StandardError = {
    code,
    message,
    retryable,
    request_id: requestId,
    details,
  };

  return NextResponse.json(
    { error: errorObj },
    {
      status: statusCode,
      headers: {
        'x-request-id': requestId,
      },
    }
  );
}

// In-memory idempotency cache for V1 (Key -> { taskId, status, expiresAt })
interface IdempotencyRecord {
  taskId: string;
  status: string;
  expiresAt: number;
}

const IDEMPOTENCY_STORE = new Map<string, IdempotencyRecord>();
const IDEMPOTENCY_TTL_MS = 10 * 60 * 1000; // 10 minutes cache window

export function checkIdempotency(key: string): IdempotencyRecord | null {
  const record = IDEMPOTENCY_STORE.get(key);
  if (!record) return null;

  if (Date.now() > record.expiresAt) {
    IDEMPOTENCY_STORE.delete(key);
    return null;
  }

  return record;
}

export function saveIdempotency(key: string, taskId: string, status: string): void {
  IDEMPOTENCY_STORE.set(key, {
    taskId,
    status,
    expiresAt: Date.now() + IDEMPOTENCY_TTL_MS,
  });
}
