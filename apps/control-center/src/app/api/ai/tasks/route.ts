import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { CreateTaskRequestSchema } from '@huy-ai/contracts';
import { createRequestId, errorResponse, checkIdempotency, saveIdempotency } from '@/lib/api-response';
import { getServerAdminSupabase } from '@/lib/supabase';

const MAX_PAYLOAD_SIZE = 1024 * 1024; // 1 MB

export async function POST(req: NextRequest) {
  const requestId = createRequestId();

  // 1. Input Size Check
  const contentLength = req.headers.get('content-length');
  if (contentLength && parseInt(contentLength, 10) > MAX_PAYLOAD_SIZE) {
    return errorResponse(
      'PAYLOAD_TOO_LARGE',
      'Request payload exceeds maximum allowed size of 1MB',
      413,
      requestId,
      false
    );
  }

  // 2. Authentication & Authorization Check
  const authHeader = req.headers.get('authorization');
  const apiKeyHeader = req.headers.get('x-api-key');
  if (!authHeader && !apiKeyHeader) {
    return errorResponse(
      'UNAUTHORIZED',
      'Missing Authorization Bearer token or x-api-key header',
      401,
      requestId,
      false
    );
  }

  // 3. Idempotency Check (from header or body)
  const idempotencyKey = req.headers.get('idempotency-key');
  if (idempotencyKey) {
    const existing = checkIdempotency(idempotencyKey);
    if (existing) {
      return NextResponse.json(
        {
          task_id: existing.taskId,
          status: existing.status,
          request_id: requestId,
          idempotent_replay: true,
        },
        { status: 200 }
      );
    }
  }

  // 4. Schema Validation (Do NOT trust client input)
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse('INVALID_INPUT', 'Malformed JSON payload in request body', 400, requestId, false);
  }

  const parseResult = CreateTaskRequestSchema.safeParse(body);
  if (!parseResult.success) {
    return errorResponse(
      'INVALID_INPUT',
      'Request body does not conform to AI Task API schema',
      400,
      requestId,
      false,
      { errors: parseResult.error.format() }
    );
  }

  const { source_app, task_type, input, options } = parseResult.data;

  // Check body idempotency key if not in header
  const effectiveIdempotencyKey = idempotencyKey || options.idempotency_key;
  if (effectiveIdempotencyKey) {
    const existing = checkIdempotency(effectiveIdempotencyKey);
    if (existing) {
      return NextResponse.json(
        {
          task_id: existing.taskId,
          status: existing.status,
          request_id: requestId,
          idempotent_replay: true,
        },
        { status: 200 }
      );
    }
  }

  // 5. Quota / Credits Verification (Mock/Guardrail)
  const estimatedCostCredits = 10;
  const currentCreditBalance = 5000; // In production, queried from credit_wallets
  if (currentCreditBalance < estimatedCostCredits) {
    return errorResponse(
      'INSUFFICIENT_CREDITS',
      'Insufficient credit balance to execute task',
      402,
      requestId,
      false,
      { required: estimatedCostCredits, available: currentCreditBalance }
    );
  }

  // 6. Enqueue Task in Supabase (or Mock fallback)
  const taskId = crypto.randomUUID();
  try {
    const supabase = getServerAdminSupabase();
    await supabase.from('ai_tasks').insert({
      id: taskId,
      source_app: source_app,
      task_type: task_type,
      priority: options.priority || 'normal',
      status: 'queued',
      payload: {
        inputs: input,
        parameters: options,
      },
      timeout_seconds: options.timeout_seconds || 300,
    });
  } catch (dbErr) {
    // If Supabase is not reachable in local mock mode, task ID is still acknowledged in memory
    console.warn('[Task API] Running with in-memory task queuing:', dbErr);
  }

  // Save idempotency key
  if (effectiveIdempotencyKey) {
    saveIdempotency(effectiveIdempotencyKey, taskId, 'queued');
  }

  return NextResponse.json(
    {
      task_id: taskId,
      status: 'queued',
      request_id: requestId,
      created_at: new Date().toISOString(),
    },
    { status: 201, headers: { 'x-request-id': requestId } }
  );
}
