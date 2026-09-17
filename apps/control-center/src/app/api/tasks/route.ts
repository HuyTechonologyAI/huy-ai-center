import { NextResponse } from 'next/server';
import { CreateTaskInputSchema } from '@huy-ai/contracts';
import { getServerAdminSupabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const validatedInput = CreateTaskInputSchema.parse(json);

    const supabase = getServerAdminSupabase();
    const { data, error } = await supabase
      .from('ai_tasks')
      .insert({
        source_app: validatedInput.sourceApp,
        task_type: validatedInput.taskType,
        priority: validatedInput.priority,
        payload: validatedInput.payload,
        timeout_seconds: validatedInput.timeoutSeconds,
        max_retries: validatedInput.maxRetries,
        status: 'queued',
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ task: data }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Invalid request payload';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const taskId = searchParams.get('id');

  if (!taskId) {
    return NextResponse.json({ error: 'Missing task id query parameter' }, { status: 400 });
  }

  try {
    const supabase = getServerAdminSupabase();
    const { data, error } = await supabase
      .from('ai_tasks')
      .select('*')
      .eq('id', taskId)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json({ task: data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
