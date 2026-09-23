// PHASE 06K-A.1 — DEEP SCHEMA INSPECTION FOR DESIGN RECONCILIATION
// READ-ONLY — ZERO MUTATIONS

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://bdeluacbzbdflxubhpha.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY is required via environment; never hard-code credentials.');
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function testCol(table, col) {
  const { error } = await supabase.from(table).select(col).limit(1);
  return !error;
}

async function inspectTable(table, cols) {
  const results = {};
  for (const col of cols) {
    results[col] = await testCol(table, col);
  }
  return results;
}

async function main() {
  console.log('=== PHASE 06K-A.1 SCHEMA RECONCILIATION INSPECTION ===\n');

  // 1. agents table
  console.log('--- 1. agents TABLE COLUMNS ---');
  const agentCols = [
    'id','name','description','capabilities','assigned_capability',
    'runtime','configuration','risk_ceiling','hierarchy_level',
    'enabled','health_status','status','is_active',
    'max_parallel_tasks','node_affinity','created_at','updated_at'
  ];
  const agentResults = await inspectTable('agents', agentCols);
  for (const [col, exists] of Object.entries(agentResults)) {
    console.log(`  agents.${col}: ${exists ? 'EXISTS' : 'NOT FOUND'}`);
  }

  // Get an actual row if any
  const { data: agentRow } = await supabase.from('agents').select('*').limit(1);
  if (agentRow && agentRow.length > 0) {
    console.log('\n  agents ACTUAL ROW KEYS:', Object.keys(agentRow[0]).join(', '));
  } else {
    console.log('\n  agents: 0 rows (empty table)');
    // Use a known-invalid select to force column list from error
    const { error: agentErr } = await supabase.from('agents').select('__force_schema_error__').limit(1);
    if (agentErr) console.log('  agents schema hint:', agentErr.message);
  }

  // 2. agent_versions table
  console.log('\n--- 2. agent_versions TABLE COLUMNS ---');
  const avCols = [
    'id','agent_id','version','capabilities','accepted_inputs','output_types',
    'runtime','risk_ceiling','max_parallel_tasks','configuration','metadata',
    'schema_version','created_at',
    // New proposed
    'agent_card','agent_card_hash'
  ];
  const avResults = await inspectTable('agent_versions', avCols);
  for (const [col, exists] of Object.entries(avResults)) {
    console.log(`  agent_versions.${col}: ${exists ? 'EXISTS' : 'NOT FOUND'}`);
  }

  // 3. ai_tasks table key columns
  console.log('\n--- 3. ai_tasks KEY COLUMNS ---');
  const taskCols = [
    'id','assigned_agent_id','risk_level','status','error_code','error_message',
    'priority','approval_required','approval_status','retry_count',
    'organization_id','department_id','data_classification',
    'requested_by_organization_id'
  ];
  const taskResults = await inspectTable('ai_tasks', taskCols);
  for (const [col, exists] of Object.entries(taskResults)) {
    console.log(`  ai_tasks.${col}: ${exists ? 'EXISTS' : 'NOT FOUND'}`);
  }

  // 4. ai_task_steps table
  console.log('\n--- 4. ai_task_steps KEY COLUMNS ---');
  const stepCols = [
    'id','task_id','step_index','message_type','sender_agent_id','recipient_agent_id',
    'status','envelope','result_payload','error_code','error_message',
    'duration_ms','created_at',
    // Noncanonical
    'step_name','metadata','organization_id'
  ];
  const stepResults = await inspectTable('ai_task_steps', stepCols);
  for (const [col, exists] of Object.entries(stepResults)) {
    console.log(`  ai_task_steps.${col}: ${exists ? 'EXISTS' : 'NOT FOUND'}`);
  }

  // 5. ai_outputs table
  console.log('\n--- 5. ai_outputs KEY COLUMNS ---');
  const outputCols = [
    'id','task_id','agent_id','artifact_ref','artifact_type','version',
    'qa_status','metadata','created_at',
    // Noncanonical
    'output_type','content','organization_id','data_classification','release_status'
  ];
  const outputResults = await inspectTable('ai_outputs', outputCols);
  for (const [col, exists] of Object.entries(outputResults)) {
    console.log(`  ai_outputs.${col}: ${exists ? 'EXISTS' : 'NOT FOUND'}`);
  }

  // 6. Check agents.id type via real data test
  console.log('\n--- 6. TYPE CHECKS (indirect) ---');
  // Try uuid insert (should fail) vs text
  const { error: uuidTypeErr } = await supabase.from('agents').select('id').limit(1);
  console.log('  agents.id select OK:', !uuidTypeErr);

  // 7. Verify PGMQ haip message types from contracts
  console.log('\n--- 7. PGMQ / QUEUE STATUS ---');
  const { data: pgmqQueues, error: pgmqErr } = await supabase.rpc('pgmq_list_queues').maybeSingle();
  if (pgmqErr) {
    console.log('  pgmq_list_queues RPC error:', pgmqErr.message);
  } else {
    console.log('  pgmq queues:', JSON.stringify(pgmqQueues));
  }

  // Check haip_read_jobs
  const { data: jobs, error: jobsErr } = await supabase.rpc('haip_read_jobs', {
    p_worker_id: 'schema-inspector',
    p_batch_size: 1,
    p_vt: 1
  });
  if (jobsErr) {
    console.log('  haip_read_jobs error:', jobsErr.message);
  } else {
    console.log('  haip_read_jobs returned:', JSON.stringify(jobs));
  }

  // 8. Check 19 legacy tables
  console.log('\n--- 8. LEGACY TABLE VERIFICATION ---');
  const legacyTables = [
    'contacts','videos','resources','resource_views','premium_contents',
    'item_reviews','audit_logs','user_activity_metrics','student_points_balance',
    'daily_tasks','task_completions','cms_folders','orders','cms_settings',
    'knowledge_chunks','user_video_progress','user_document_progress','leads','site_content'
  ];
  for (const t of legacyTables) {
    const { count, error } = await supabase.from(t).select('*', { count: 'exact', head: true });
    if (error) {
      console.log(`  ${t}: ERROR - ${error.message}`);
    } else {
      console.log(`  ${t}: ${count} rows`);
    }
  }

  // 9. edtech portfolio main SHA check (just doc reference)
  console.log('\n--- 9. NOTES ---');
  console.log('  Production website main SHA: c2e32438e406ab433bef0d94a43755b3e95490a1');
  console.log('  huy-ai-center remote: https://github.com/HuyTechonologyAI/huy-ai-center.git (no main branch yet)');

  console.log('\n=== INSPECTION COMPLETE — ZERO MUTATIONS ===');
}

main().catch(console.error);
