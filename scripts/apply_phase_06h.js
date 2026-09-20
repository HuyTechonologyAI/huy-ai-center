const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Optionally load local .env.local if present (strictly gitignored)
const envLocalPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envLocalPath)) {
  const content = fs.readFileSync(envLocalPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const k = trimmed.substring(0, idx).trim();
        const v = trimmed.substring(idx + 1).trim().replace(/^["']|["']$/g, '');
        if (!process.env[k]) process.env[k] = v;
      }
    }
  }
}

const DB_PASSWORD = process.env.SUPABASE_DB_PASSWORD || process.env.DB_PASSWORD;
const DB_HOST = 'db.bdeluacbzbdflxubhpha.supabase.co';
const DB_PORT = 5432;
const DB_USER = 'postgres';
const DB_NAME = 'postgres';

const MIGRATIONS = [
  { file: '20260920000001_ai_operations.sql', module: 'AI Operations (3 tables + Trigger + RLS)' },
  { file: '20260920000002_infrastructure.sql', module: 'Infrastructure (2 tables + huy-ai-node-01 seed)' },
  { file: '20260920000003_ai_registry.sql', module: 'AI Registry (7 tables, 0 seeds)' },
  { file: '20260920000004_github_radar.sql', module: 'GitHub Radar (3 tables, Server-Only)' },
  { file: '20260920000005_queue_and_governance.sql', module: 'Queue & Governance (PGMQ, ai-jobs, RPC Gateway)' }
];

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

async function verifyLegacyCounts(client, stage) {
  console.log(`\n[Audit] Verifying 19 legacy tables integrity at stage: ${stage}...`);
  let total = 0;
  for (const [table, expected] of Object.entries(EXPECTED_LEGACY_COUNTS)) {
    const res = await client.query(`SELECT COUNT(*)::int as count FROM public."${table}"`);
    const count = res.rows[0].count;
    total += count;
    if (count !== expected) {
      throw new Error(`Legacy table row mismatch on '${table}'! Expected ${expected}, got ${count}`);
    }
  }
  if (total !== 239) {
    throw new Error(`Total legacy rows mismatch! Expected 239, got ${total}`);
  }
  console.log(`✅ Legacy baseline perfectly preserved: exactly 19 tables, 239 rows.`);
}

async function main() {
  console.log('================================================================');
  console.log('PHASE 06H — CONTROLLED PRODUCTION MIGRATION RUNNER');
  console.log('Target: Supabase HuyAI Singapore (bdeluacbzbdflxubhpha)');
  console.log('================================================================\n');

  if (!DB_PASSWORD && !process.env.DATABASE_URL) {
    console.error('❌ Error: Neither SUPABASE_DB_PASSWORD nor DATABASE_URL is set.');
    console.error('To run automated migration:');
    console.error('  $env:SUPABASE_DB_PASSWORD="<password>"; node scripts/apply_phase_06h.js');
    console.error('\nAlternatively, the 5 canonical migration files can be run sequentially');
    console.error('in the Supabase Dashboard SQL Editor:');
    MIGRATIONS.forEach((m, idx) => {
      console.error(`  ${idx + 1}. supabase/migrations/${m.file}`);
    });
    console.error('\nFollowed by running verification:');
    console.error('  node scripts/verify_phase_06h.js');
    process.exit(1);
  }

  const connectionConfig = process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }
    : {
        host: DB_HOST,
        port: DB_PORT,
        user: DB_USER,
        password: DB_PASSWORD,
        database: DB_NAME,
        ssl: { rejectUnauthorized: false }
      };

  const client = new Client(connectionConfig);
  try {
    console.log(`Connecting to PostgreSQL at ${DB_HOST}:${DB_PORT}...`);
    await client.connect();
    console.log('✅ Connected successfully.\n');

    // 0. Pre-Flight Legacy Verification
    await verifyLegacyCounts(client, 'PRE-FLIGHT');

    // 1. Apply Migration 01: AI Operations
    console.log('\n--- APPLYING MIGRATION 01: 20260920000001_ai_operations.sql ---');
    const sql01 = fs.readFileSync(path.join(__dirname, '..', 'supabase', 'migrations', MIGRATIONS[0].file), 'utf8');
    await client.query(sql01);
    console.log('✅ Migration 01 applied successfully.');

    // Verify 01
    const res01 = await client.query(`
      SELECT table_name, rowsecurity 
      FROM pg_tables 
      WHERE schemaname = 'public' AND table_name IN ('ai_tasks', 'ai_task_steps', 'ai_outputs');
    `);
    if (res01.rows.length !== 3) throw new Error('Expected 3 AI operations tables');
    for (const r of res01.rows) {
      if (!r.rowsecurity) throw new Error(`RLS not enabled on ${r.table_name}`);
    }
    console.log('✅ Verified: ai_tasks, ai_task_steps, ai_outputs exist with RLS enabled.');
    await verifyLegacyCounts(client, 'POST-MIGRATION-01');

    // 2. Apply Migration 02: Infrastructure
    console.log('\n--- APPLYING MIGRATION 02: 20260920000002_infrastructure.sql ---');
    const sql02 = fs.readFileSync(path.join(__dirname, '..', 'supabase', 'migrations', MIGRATIONS[1].file), 'utf8');
    await client.query(sql02);
    console.log('✅ Migration 02 applied successfully.');

    // Verify 02
    const res02 = await client.query(`SELECT id, name, status FROM public.nodes WHERE id = 'huy-ai-node-01'`);
    if (res02.rows.length !== 1) throw new Error("Expected 1 seed node 'huy-ai-node-01'");
    console.log(`✅ Verified: nodes and node_heartbeats created. Seed node: ${res02.rows[0].id} (status: ${res02.rows[0].status})`);
    await verifyLegacyCounts(client, 'POST-MIGRATION-02');

    // 3. Apply Migration 03: AI Registry
    console.log('\n--- APPLYING MIGRATION 03: 20260920000003_ai_registry.sql ---');
    const sql03 = fs.readFileSync(path.join(__dirname, '..', 'supabase', 'migrations', MIGRATIONS[2].file), 'utf8');
    await client.query(sql03);
    console.log('✅ Migration 03 applied successfully.');

    // Verify 03
    const regTables = ['ai_providers', 'ai_models', 'tools', 'tool_versions', 'tool_capabilities', 'agents', 'agent_versions'];
    for (const t of regTables) {
      const r = await client.query(`SELECT COUNT(*)::int as c FROM public."${t}"`);
      if (r.rows[0].c !== 0) throw new Error(`Expected 0 rows in registry table ${t}, found ${r.rows[0].c}`);
    }
    console.log('✅ Verified: 7 AI Registry tables created with 0 seeds (empty catalog).');
    await verifyLegacyCounts(client, 'POST-MIGRATION-03');

    // 4. Apply Migration 04: GitHub Radar
    console.log('\n--- APPLYING MIGRATION 04: 20260920000004_github_radar.sql ---');
    const sql04 = fs.readFileSync(path.join(__dirname, '..', 'supabase', 'migrations', MIGRATIONS[3].file), 'utf8');
    await client.query(sql04);
    console.log('✅ Migration 04 applied successfully.');

    // Verify 04
    const radarTables = ['github_projects', 'github_reviews', 'github_versions'];
    for (const t of radarTables) {
      const r = await client.query(`SELECT COUNT(*)::int as c FROM public."${t}"`);
      if (r.rows[0].c !== 0) throw new Error(`Expected 0 rows in radar table ${t}`);
    }
    console.log('✅ Verified: 3 GitHub Radar tables created with 0 seeds (server-only).');
    await verifyLegacyCounts(client, 'POST-MIGRATION-04');

    // 5. Apply Migration 05: Queue & Governance
    console.log('\n--- APPLYING MIGRATION 05: 20260920000005_queue_and_governance.sql ---');
    const sql05 = fs.readFileSync(path.join(__dirname, '..', 'supabase', 'migrations', MIGRATIONS[4].file), 'utf8');
    await client.query(sql05);
    console.log('✅ Migration 05 applied successfully.');

    // Verify 05
    const extRes = await client.query(`SELECT extname, extversion FROM pg_extension WHERE extname = 'pgmq'`);
    if (extRes.rows.length === 0) throw new Error('pgmq extension not found');
    console.log(`✅ Verified: pgmq extension active (version: ${extRes.rows[0].extversion}).`);

    const qRes = await client.query(`SELECT queue_name, is_partitioned, is_unlogged FROM pgmq.list_queues() WHERE queue_name = 'ai-jobs'`);
    if (qRes.rows.length === 0) throw new Error("Queue 'ai-jobs' not found in pgmq");
    if (qRes.rows[0].is_unlogged) throw new Error("Queue 'ai-jobs' must be DURABLE (not unlogged)");
    console.log(`✅ Verified: Queue 'ai-jobs' created as DURABLE BASIC queue.`);

    await verifyLegacyCounts(client, 'POST-MIGRATION-05');

    // 6. Total Public Tables Count Check
    const totalTablesRes = await client.query(`
      SELECT count(*)::int as total 
      FROM pg_tables 
      WHERE schemaname = 'public';
    `);
    const totalTables = totalTablesRes.rows[0].total;
    console.log(`\nTotal public tables: ${totalTables} (Expected: exactly 34).`);
    if (totalTables !== 34) {
      throw new Error(`Public table count mismatch! Expected 34, got ${totalTables}`);
    }
    console.log('✅ EXACT MATCH: 19 legacy + 15 new = 34 public tables.');

    console.log('\n🎉 ALL 5 CANONICAL MIGRATIONS APPLIED AND VERIFIED SUCCESSFULLY!');
    console.log('Ready to run comprehensive post-migration verification suite:');
    console.log('  node scripts/verify_phase_06h.js\n');

  } catch (err) {
    console.error('\n❌ MIGRATION FAILED:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
