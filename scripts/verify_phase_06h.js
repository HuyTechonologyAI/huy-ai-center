const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const SUPABASE_URL = 'https://bdeluacbzbdflxubhpha.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkZWx1YWNiemJkZmx4dWJocGhhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODEwMzUyNywiZXhwIjoyMDkzNjc5NTI3fQ.VVgu_yee1g-1KzA_3CoEzYluKFSzW5X7MSw5vruZm18';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const EXPECTED_LEGACY_COUNTS = {
  contacts: 0,
  videos: 1,
  resources: 1,
  resource_views: 31,
  premium_contents: 0,
  item_reviews: 0,
  audit_logs: 0,
  user_activity_metrics: 20,
  student_points_balance: 3,
  daily_tasks: 0,
  task_completions: 0,
  cms_folders: 2,
  orders: 177,
  cms_settings: 3,
  knowledge_chunks: 0,
  user_video_progress: 0,
  user_document_progress: 0,
  leads: 0,
  site_content: 1
};

const TARGET_NEW_TABLES = [
  'ai_tasks', 'ai_task_steps', 'ai_outputs',
  'nodes', 'node_heartbeats',
  'ai_providers', 'ai_models', 'tools', 'tool_versions', 'tool_capabilities',
  'agents', 'agent_versions',
  'github_projects', 'github_reviews', 'github_versions'
];

async function runVerification() {
  console.log('================================================================');
  console.log('PHASE 06H — POST-MIGRATION VERIFICATION SUITE');
  console.log('Target: Supabase HuyAI Singapore (bdeluacbzbdflxubhpha)');
  console.log('================================================================\n');

  let allPassed = true;

  // 1. Table Inventory & Legacy Data Integrity Check
  console.log('--- 1. VERIFYING 19 LEGACY TABLES (239 ROW BASELINE) ---');
  let legacyTotal = 0;
  for (const [table, expectedCount] of Object.entries(EXPECTED_LEGACY_COUNTS)) {
    const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
    if (error) {
      console.error(`❌ Table '${table}' error: ${error.message}`);
      allPassed = false;
    } else if (count !== expectedCount) {
      console.error(`❌ Table '${table}' count mismatch: expected ${expectedCount}, got ${count}`);
      allPassed = false;
    } else {
      console.log(`✅ Table '${table}': ${count} rows (PRESERVED)`);
      legacyTotal += count;
    }
  }
  console.log(`\nLegacy baseline integrity: ${legacyTotal}/239 rows intact.`);

  // 2. 15 New Tables Verification
  console.log('\n--- 2. VERIFYING 15 NEW PUBLIC TABLES ---');
  let newTablesFound = 0;
  for (const table of TARGET_NEW_TABLES) {
    const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
    if (error || count === null) {
      console.error(`❌ New Table '${table}' NOT FOUND: ${error?.message}`);
      allPassed = false;
    } else {
      console.log(`✅ Table '${table}': EXISTS (rows: ${count})`);
      newTablesFound++;
    }
  }

  if (newTablesFound < TARGET_NEW_TABLES.length) {
    console.error(`\n❌ Migration incomplete: Only ${newTablesFound}/15 new tables found.`);
    return false;
  }
  console.log(`\nTotal public tables: 19 legacy + 15 new = 34 public tables verified.`);

  // 3. Node Seed Verification
  console.log('\n--- 3. VERIFYING NODE SEED (huy-ai-node-01) ---');
  const { data: node, error: nodeErr } = await supabase
    .from('nodes')
    .select('*')
    .eq('id', 'huy-ai-node-01')
    .single();

  if (nodeErr || !node) {
    console.error(`❌ Node seed 'huy-ai-node-01' missing: ${nodeErr?.message}`);
    allPassed = false;
  } else {
    console.log(`✅ Node 'huy-ai-node-01' verified: status=${node.status}, max_concurrency=${node.max_concurrency}`);
  }

  // 4. HAIP State Machine & Trigger Transition Test
  console.log('\n--- 4. HAIP TASK STATE MACHINE CONTRACT TEST ---');
  const syntheticTaskId = crypto.randomUUID();
  const testConvId = crypto.randomUUID();
  try {
    // 4.1 Insert initial task in CREATED
    const { error: insErr } = await supabase.from('ai_tasks').insert({
      id: syntheticTaskId,
      conversation_id: testConvId,
      source_app: 'phase-06h-smoke-test',
      intent: 'SYSTEM_SMOKE_TEST',
      status: 'CREATED',
      priority: 5,
      risk_level: 0,
      approval_required: false,
      input: { test: true }
    });
    if (insErr) throw new Error(`Initial insert failed: ${insErr.message}`);
    console.log(`✅ 4.1 Insert task [CREATED] succeeded. (id: ${syntheticTaskId})`);

    // 4.2 Step through allowed state machine path:
    // CREATED -> PLANNING -> QUEUED -> CLAIMED -> RUNNING -> REVIEWING -> FINALIZING -> COMPLETED
    const validSequence = [
      'PLANNING',
      'QUEUED',
      'CLAIMED',
      'RUNNING',
      'REVIEWING',
      'FINALIZING',
      'COMPLETED'
    ];

    let currentVer = 0;
    for (const nextStatus of validSequence) {
      const { data: updData, error: updErr } = await supabase
        .from('ai_tasks')
        .update({ status: nextStatus })
        .eq('id', syntheticTaskId)
        .select()
        .single();

      if (updErr) throw new Error(`Transition to ${nextStatus} failed: ${updErr.message}`);
      if (updData.state_version <= currentVer) {
        throw new Error(`state_version did not increment! Previous: ${currentVer}, current: ${updData.state_version}`);
      }
      currentVer = updData.state_version;
      console.log(`✅ Transitioned to [${nextStatus}] (state_version: ${currentVer})`);
    }

    // 4.3 Test INVALID transition from COMPLETED (Terminal lock)
    console.log('Testing illegal transition from terminal state COMPLETED -> RUNNING (must reject)...');
    const { error: invalidErr } = await supabase
      .from('ai_tasks')
      .update({ status: 'RUNNING' })
      .eq('id', syntheticTaskId);

    if (!invalidErr) {
      throw new Error('Trigger FAILED: Terminal state transition was unexpectedly permitted!');
    }
    console.log(`✅ Rejected illegal transition properly: ${invalidErr.message}`);

  } catch (err) {
    console.error(`❌ State Machine test failed: ${err.message}`);
    allPassed = false;
  }

  // 5. Multi-Layer Idempotency Test
  console.log('\n--- 5. MULTI-LAYER IDEMPOTENCY TEST ---');
  const testIdempotencyKey = `idem-${Date.now()}-${Math.random()}`;
  const dupTaskId1 = crypto.randomUUID();
  const dupTaskId2 = crypto.randomUUID();
  try {
    // 5.1 First insert with idempotency key
    const { error: idm1Err } = await supabase.from('ai_tasks').insert({
      id: dupTaskId1,
      conversation_id: testConvId,
      source_app: 'phase-06h-smoke-test',
      intent: 'IDEMPOTENCY_TEST_1',
      idempotency_key: testIdempotencyKey,
      status: 'CREATED'
    });
    if (idm1Err) throw idm1Err;
    console.log(`✅ 5.1 First task with idempotency_key inserted successfully.`);

    // 5.2 Second insert with duplicate idempotency key (Must be rejected)
    const { error: idm2Err } = await supabase.from('ai_tasks').insert({
      id: dupTaskId2,
      conversation_id: testConvId,
      source_app: 'phase-06h-smoke-test',
      intent: 'IDEMPOTENCY_TEST_2',
      idempotency_key: testIdempotencyKey,
      status: 'CREATED'
    });
    if (!idm2Err) {
      throw new Error('Unique constraint FAILED: Duplicate idempotency_key was accepted!');
    }
    console.log(`✅ 5.2 Duplicate idempotency_key rejected properly: ${idm2Err.message}`);

    // 5.3 Duplicate message_id test on ai_task_steps
    const testMsgId = crypto.randomUUID();
    const { error: step1Err } = await supabase.from('ai_task_steps').insert({
      task_id: dupTaskId1,
      message_id: testMsgId,
      message_type: 'TASK',
      intent: 'TEST_STEP_1',
      sender_type: 'orchestrator',
      sender_id: 'mo-1',
      recipient_type: 'agent',
      recipient_id: 'worker-1'
    });
    if (step1Err) throw step1Err;
    console.log(`✅ 5.3 First task step with message_id inserted.`);

    const { error: step2Err } = await supabase.from('ai_task_steps').insert({
      task_id: dupTaskId1,
      message_id: testMsgId,
      message_type: 'PLAN',
      intent: 'TEST_STEP_2',
      sender_type: 'planner',
      sender_id: 'tp-1',
      recipient_type: 'agent',
      recipient_id: 'worker-1'
    });
    if (!step2Err) {
      throw new Error('Unique constraint FAILED: Duplicate message_id on ai_task_steps accepted!');
    }
    console.log(`✅ 5.4 Duplicate message_id rejected properly: ${step2Err.message}`);

    // Cleanup dup task
    await supabase.from('ai_tasks').delete().eq('id', dupTaskId1);

  } catch (err) {
    console.error(`❌ Idempotency test failed: ${err.message}`);
    allPassed = false;
  }

  // 6. PGMQ Queue Smoke Test (Server-Side RPCs)
  console.log('\n--- 6. PGMQ DURABLE BASIC QUEUE SMOKE TEST ---');
  try {
    const queueTaskId = crypto.randomUUID();
    const queueEnvelope = {
      haip_version: '1.0',
      task_id: queueTaskId,
      type: 'TASK',
      intent: 'SYSTEM_SMOKE_TEST',
      source: 'phase-06h'
    };

    // 6.1 Enqueue
    const { data: msgId, error: enqErr } = await supabase.rpc('haip_enqueue_job', {
      p_task_id: queueTaskId,
      p_message_type: 'TASK',
      p_envelope: queueEnvelope
    });

    if (enqErr) throw new Error(`Enqueue RPC failed: ${enqErr.message}`);
    console.log(`✅ 6.1 haip_enqueue_job succeeded! PGMQ msg_id: ${msgId}`);

    // 6.2 Read
    const { data: readMsgs, error: readErr } = await supabase.rpc('haip_read_jobs', {
      p_worker_id: 'huy-ai-node-01',
      p_batch_size: 1,
      p_vt: 10
    });

    if (readErr) throw new Error(`Read RPC failed: ${readErr.message}`);
    if (!readMsgs || readMsgs.length === 0) throw new Error('No message received from queue');
    console.log(`✅ 6.2 haip_read_jobs succeeded! Read msg_id: ${readMsgs[0].msg_id}, read_ct: ${readMsgs[0].read_ct}`);

    // 6.3 Archive
    const { data: archRes, error: archErr } = await supabase.rpc('haip_archive_job', {
      p_msg_id: readMsgs[0].msg_id
    });
    if (archErr) throw new Error(`Archive RPC failed: ${archErr.message}`);
    console.log(`✅ 6.3 haip_archive_job succeeded! Archived: ${archRes}`);

  } catch (err) {
    console.error(`❌ PGMQ smoke test failed: ${err.message}`);
    allPassed = false;
  }

  // 7. Approval Safety Test (Risk 3 Gate)
  console.log('\n--- 7. APPROVAL SAFETY & RISK GATE TEST ---');
  const riskTaskId = crypto.randomUUID();
  try {
    // 7.1 Risk Level 3 must require approval_required = true (enforced by constraint chk_risk_approval)
    const { error: riskErr } = await supabase.from('ai_tasks').insert({
      id: riskTaskId,
      conversation_id: testConvId,
      source_app: 'phase-06h-smoke-test',
      intent: 'HIGH_RISK_FINANCIAL_ACTION',
      risk_level: 3,
      approval_required: false, // Must violate chk_risk_approval
      status: 'CREATED'
    });

    if (!riskErr) {
      throw new Error('Constraint FAILED: Risk Level 3 without approval_required=true was accepted!');
    }
    console.log(`✅ 7.1 chk_risk_approval properly blocked unapproved Risk 3 task: ${riskErr.message}`);

    // 7.2 Insert with valid approval_required = true
    const { error: validRiskErr } = await supabase.from('ai_tasks').insert({
      id: riskTaskId,
      conversation_id: testConvId,
      source_app: 'phase-06h-smoke-test',
      intent: 'HIGH_RISK_ACTION_VALID',
      risk_level: 3,
      approval_required: true,
      approval_status: 'PENDING',
      status: 'CREATED'
    });
    if (validRiskErr) throw validRiskErr;
    console.log(`✅ 7.2 Valid Risk 3 task with approval_status=PENDING accepted.`);

    // Cleanup risk task
    await supabase.from('ai_tasks').delete().eq('id', riskTaskId);

  } catch (err) {
    console.error(`❌ Approval safety test failed: ${err.message}`);
    allPassed = false;
  }

  // 8. Clean up synthetic task
  try {
    await supabase.from('ai_tasks').delete().eq('id', syntheticTaskId);
    console.log('\n✅ Synthetic test tasks cleaned up cleanly.');
  } catch {}

  console.log('\n================================================================');
  if (allPassed) {
    console.log('🎉 ALL PHASE 06H PRODUCTION VERIFICATIONS PASSED WITH 100% SUCCESS!');
  } else {
    console.log('❌ SOME VERIFICATIONS FAILED OR RETURNED ERRORS.');
  }
  console.log('================================================================\n');

  return allPassed;
}

runVerification();
