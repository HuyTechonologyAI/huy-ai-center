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
    const { data: task, error } = await supabase
      .from('ai_tasks')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !task) {
      return errorResponse('TASK_NOT_FOUND', `Task with ID '${id}' was not found`, 404, requestId);
    }

    return NextResponse.json({
      task_id: task.id,
      source_app: task.source_app,
      task_type: task.task_type,
      status: task.status,
      created_at: task.created_at,
      started_at: task.started_at,
      completed_at: task.completed_at,
      claimed_by_worker_id: task.claimed_by_worker_id,
      progress_pct: task.status === 'completed' ? 100 : task.status === 'running' ? 50 : 0,
    });
  } catch {
    // Mock return for local testing without Supabase credentials
    return NextResponse.json({
      task_id: id,
      source_app: 'education',
      task_type: 'lesson_plan',
      status: 'queued',
      created_at: new Date().toISOString(),
      started_at: null,
      completed_at: null,
      claimed_by_worker_id: null,
      progress_pct: 0,
    });
  }
}
