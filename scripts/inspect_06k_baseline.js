const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://bdeluacbzbdflxubhpha.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkZWx1YWNiemJkZmx4dWJocGhhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODEwMzUyNywiZXhwIjoyMDkzNjc5NTI3fQ.VVgu_yee1g-1KzA_3CoEzYluKFSzW5X7MSw5vruZm18';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const ALL_34_TABLES = [
  'contacts', 'videos', 'resources', 'resource_views', 'premium_contents',
  'item_reviews', 'audit_logs', 'user_activity_metrics', 'student_points_balance',
  'daily_tasks', 'task_completions', 'cms_folders', 'orders', 'cms_settings',
  'knowledge_chunks', 'user_video_progress', 'user_document_progress', 'leads',
  'site_content',
  'ai_tasks', 'ai_task_steps', 'ai_outputs',
  'nodes', 'node_heartbeats',
  'ai_providers', 'ai_models', 'tools', 'tool_versions', 'tool_capabilities',
  'agents', 'agent_versions',
  'github_projects', 'github_reviews', 'github_versions'
];

async function inspectBaseline() {
  console.log('=== PHASE 06K-A READ-ONLY PRODUCTION DATABASE BASELINE INSPECTION ===\n');

  // 1. Verify 34 public tables
  console.log('--- 1. PUBLIC TABLES CHECK ---');
  let existingTables = [];
  for (const t of ALL_34_TABLES) {
    const { count, error } = await supabase.from(t).select('*', { count: 'exact', head: true });
    if (!error) {
      existingTables.push({ table: t, count });
    } else {
      console.log(`Table ${t} error: ${error.message} (${error.code})`);
    }
  }
  console.log(`Found ${existingTables.length}/34 public tables.`);

  // 2. Check schema_migrations
  console.log('\n--- 2. SCHEMA MIGRATIONS CHECK ---');
  try {
    const { data: migs, error: migErr } = await supabase.from('schema_migrations').select('*');
    if (migErr) {
      // Sometimes it is supabase_migrations.schema_migrations
      console.log('from("schema_migrations") error:', migErr.message);
    } else {
      console.log(`Migrations found: ${migs.length}`);
      migs.forEach(m => console.log(`  - version: ${m.version}`));
    }
  } catch (e) {
    console.log('Migration check exception:', e.message);
  }

  // 3. Inspect Registry: agents & agent_versions
  console.log('\n--- 3. AI REGISTRY TABLES ROW COUNT & COLUMNS ---');
  const { count: agentCount } = await supabase.from('agents').select('*', { count: 'exact', head: true });
  const { count: agentVersionCount } = await supabase.from('agent_versions').select('*', { count: 'exact', head: true });
  console.log(`agents rows: ${agentCount}`);
  console.log(`agent_versions rows: ${agentVersionCount}`);

  // Query sample row or options to detect column names for agents & agent_versions
  // Since table is empty, we can query with limit(0) and check data or inspect error on non-existent column
  const { data: agentSample } = await supabase.from('agents').select('*').limit(1);
  console.log('agents sample return:', agentSample);

  const { data: agentVerSample } = await supabase.from('agent_versions').select('*').limit(1);
  console.log('agent_versions sample return:', agentVerSample);

  // Check if agent_card column exists in agent_versions:
  const { error: cardColErr } = await supabase.from('agent_versions').select('agent_card').limit(1);
  if (cardColErr) {
    console.log(`Confirmed: agent_card column does NOT exist in agent_versions (${cardColErr.message})`);
  } else {
    console.log('agent_card column exists in agent_versions.');
  }

  // Check existing columns of agent_versions
  const knownAgentVerCols = [
    'id', 'agent_id', 'version', 'capabilities', 'accepted_inputs', 'output_types',
    'runtime', 'risk_ceiling', 'max_parallel_tasks', 'configuration', 'metadata',
    'schema_version', 'created_at'
  ];
  const { error: knownColsErr } = await supabase.from('agent_versions').select(knownAgentVerCols.join(',')).limit(1);
  if (!knownColsErr) {
    console.log('Verified: All 13 canonical columns exist in agent_versions:');
    knownAgentVerCols.forEach(c => console.log(`  - ${c}`));
  } else {
    console.log('Error verifying agent_versions columns:', knownColsErr.message);
  }

  // 4. Inspect ai_tasks columns
  console.log('\n--- 4. AI_TASKS COLUMNS CHECK ---');
  const { count: taskCount } = await supabase.from('ai_tasks').select('*', { count: 'exact', head: true });
  console.log(`ai_tasks rows: ${taskCount}`);
  const knownTaskCols = [
    'id', 'owner_user_id', 'conversation_id', 'parent_task_id', 'idempotency_key',
    'haip_version', 'source_app', 'intent', 'priority', 'assigned_capability',
    'assigned_agent_id', 'depends_on', 'parallel_group', 'completion_condition',
    'status', 'risk_level', 'risk_context', 'approval_required', 'approval_status',
    'approved_by', 'approved_at', 'approval_note', 'budget_config', 'estimated_cost_usd',
    'actual_cost_usd', 'token_usage', 'runtime_ms', 'constraints', 'input_refs',
    'input', 'expected_outputs', 'output', 'project_context_ref', 'task_memory_ref',
    'retry_count', 'max_retries', 'review_cycle', 'state_version', 'claimed_by_node_id',
    'expires_at', 'claimed_at', 'started_at', 'completed_at', 'created_at', 'updated_at'
  ];
  const { error: taskColsErr } = await supabase.from('ai_tasks').select(knownTaskCols.join(',')).limit(1);
  if (!taskColsErr) {
    console.log(`Verified: All ${knownTaskCols.length} canonical columns exist in ai_tasks.`);
  } else {
    console.log('Error verifying ai_tasks columns:', taskColsErr.message);
  }

  // 5. Inspect nodes & node_heartbeats
  console.log('\n--- 5. NODES & HEARTBEATS CHECK ---');
  const { data: nodes } = await supabase.from('nodes').select('*');
  console.log('Nodes count:', nodes ? nodes.length : 0);
  if (nodes) {
    nodes.forEach(n => console.log(`  - Node: id=${n.id}, name=${n.name}, status=${n.status}`));
  }
  const { count: hbCount } = await supabase.from('node_heartbeats').select('*', { count: 'exact', head: true });
  console.log('node_heartbeats count:', hbCount);

  // 6. Inspect PGMQ ai-jobs queue
  console.log('\n--- 6. PGMQ QUEUE STATUS ---');
  try {
    const { data: qJobs, error: qJobsErr } = await supabase.rpc('haip_read_jobs', {
      p_worker_id: 'readonly-inspector',
      p_batch_size: 1,
      p_vt: 1
    });
    if (!qJobsErr) {
      console.log(`haip_read_jobs returned jobs count: ${qJobs ? qJobs.length : 0}`);
    } else {
      console.log('haip_read_jobs query returned:', qJobsErr.message);
    }
  } catch (e) {
    console.log('Queue check error:', e.message);
  }

  console.log('\n=== READ-ONLY INSPECTION COMPLETE (ZERO MUTATIONS) ===');
}

inspectBaseline().catch(console.error);
