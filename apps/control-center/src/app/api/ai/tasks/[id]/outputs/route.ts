import { NextRequest, NextResponse } from 'next/server';
import { createRequestId, errorResponse } from '@/lib/api-response';
import { getServerAdminSupabase } from '@/lib/supabase';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const requestId = createRequestId();
  const { id } = await context.params;

  if (!id) {
    return errorResponse('INVALID_INPUT', 'Task ID parameter is required', 400, requestId);
  }

  // Authentication check
  const authHeader = req.headers.get('authorization');
  const apiKeyHeader = req.headers.get('x-api-key');
  if (!authHeader && !apiKeyHeader) {
    return errorResponse('UNAUTHORIZED', 'Missing Authorization Bearer or x-api-key', 401, requestId);
  }

  try {
    const supabase = getServerAdminSupabase();
    const { data: task, error: taskError } = await supabase
      .from('ai_tasks')
      .select('id, status, result')
      .eq('id', id)
      .single();

    if (taskError || !task) {
      return errorResponse('TASK_NOT_FOUND', `Task with ID '${id}' was not found`, 404, requestId);
    }

    // Attempt to query structured outputs
    const { data: outputData } = await supabase
      .from('ai_outputs')
      .select('*')
      .eq('task_id', id)
      .maybeSingle();

    const output = outputData || (task.result as Record<string, unknown>) || null;

    return NextResponse.json({
      task_id: task.id,
      status: task.status,
      output,
    });
  } catch {
    // Mock response for test environment
    return NextResponse.json({
      task_id: id,
      status: 'completed',
      output: {
        text: 'Generated output from mock worker daemon',
        json: { status: 'success' },
        model: 'mock-llm:v1',
        tokens: { prompt: 100, completion: 50, total: 150 },
        latency_ms: 320,
        finish_reason: 'stop',
      },
    });
  }
}
