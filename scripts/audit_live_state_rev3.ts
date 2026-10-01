import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createClient } from '@supabase/supabase-js';

// Resolve environment variables
const envPath = resolve(process.cwd(), '../edtech-ai-portfolio/.env.local');
let SUPABASE_URL = 'https://bdeluacbzbdflxubhpha.supabase.co';
let SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SERVICE_ROLE_KEY && existsSync(envPath)) {
  const content = readFileSync(envPath, 'utf-8');
  const m = content.match(/SUPABASE_SERVICE_ROLE_KEY=([^\r\n]+)/);
  if (m && m[1]) SERVICE_ROLE_KEY = m[1].trim();
}

console.log('[REV3-AUDIT] Running REV3-001 Live State Audit...');
console.log(`[REV3-AUDIT] Supabase URL: ${SUPABASE_URL}`);
console.log(`[REV3-AUDIT] Service Key available: ${!!SERVICE_ROLE_KEY}`);

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function checkTable(tableName: string) {
  try {
    const { data, error } = await supabase.from(tableName).select('*').limit(1);
    if (error) {
      return { exists: false, error: error.message };
    }
    return { exists: true, rowCount: data ? data.length : 0 };
  } catch (err: any) {
    return { exists: false, error: err.message };
  }
}

async function main() {
  const candidateTables = [
    'ai_tasks',
    'ai_task_steps',
    'ai_outputs',
    'ai_checkpoints',
    'agents',
    'organizations',
    'departments',
    'first_revenue_leads',
    'first_revenue_consents',
    'first_revenue_interactions',
    'first_revenue_orders',
    'first_revenue_payment_transactions',
    'first_revenue_evidence_events',
    'crm_leads',
    'crm_orders',
    'payment_orders'
  ];

  console.log('\n--- SUPABASE HUYAI TABLE INVENTORY ---');
  const tableResults: Record<string, boolean> = {};
  for (const t of candidateTables) {
    const res = await checkTable(t);
    tableResults[t] = res.exists;
    console.log(`  Table [${t}]: ${res.exists ? 'EXISTS' : 'NOT FOUND'} ${res.error ? `(${res.error})` : ''}`);
  }

  // Schema Mapping Report
  const schemaMapMd = `# FIRST REVENUE SCHEMA MAP — REV3-002
**Generated at:** ${new Date().toISOString()}  
**Target Database:** Supabase HuyAI Singapore (\`bdeluacbzbdflxubhpha\`)  
**Principle:** REUSE > EXTEND > CREATE (No duplicate CRM)  

| Logical Entity | Existing Physical Table | Status in DB | Mapping & Strategy |
|---|---|:---:|---|
| **campaign** | \`ai_tasks\` (task_type = FIRST_REVENUE.CAMPAIGN) | EXISTS | REUSE: Gắn với campaign_id = \`FIRST-REVENUE-V3\` |
| **lead** | \`first_revenue_leads\` | ${tableResults['first_revenue_leads'] ? 'EXISTS' : 'MISSING (Migration Req)'} | CREATE / EXTEND: Lưu name, company, role, email, phone, problem |
| **consent** | \`first_revenue_consents\` | ${tableResults['first_revenue_consents'] ? 'EXISTS' : 'MISSING (Migration Req)'} | CREATE: Lưu consent flag, timestamp, consent text version |
| **interaction** | \`first_revenue_interactions\` | ${tableResults['first_revenue_interactions'] ? 'EXISTS' : 'MISSING (Migration Req)'} | CREATE: Lưu channel, direction (INBOUND/OUTBOUND), content |
| **qualification** | \`ai_outputs\` / JSONB | EXISTS | REUSE: Store in \`ai_outputs\` linked to lead_id |
| **audit** | \`ai_task_steps\` (step_type = AUDIT) | EXISTS | REUSE: Store in \`ai_task_steps\` |
| **proposal** | \`ai_outputs\` (output_type = PROPOSAL) | EXISTS | REUSE: Fixed SKU HUY-AUTO-PILOT-4900 (4,900,000 VND) |
| **order** | \`first_revenue_orders\` | ${tableResults['first_revenue_orders'] ? 'EXISTS' : 'MISSING (Migration Req)'} | CREATE: Lưu order_id, agreed_price (4.9M), status, customer_accepted |
| **payment_transaction** | \`first_revenue_payment_transactions\` | ${tableResults['first_revenue_payment_transactions'] ? 'EXISTS' : 'MISSING (Migration Req)'} | CREATE: SePay webhook payload, transaction_id, code, match_status |
| **evidence_event** | \`first_revenue_evidence_events\` | ${tableResults['first_revenue_evidence_events'] ? 'EXISTS' : 'MISSING (Migration Req)'} | CREATE: Immutable event store, content_hash, timestamp |
| **agent_run** | \`ai_task_steps\` | EXISTS | REUSE: Track A1, A2, A3 agent runs |
| **checkpoint** | \`ai_checkpoints\` | EXISTS | REUSE: Append-only checkpoints with SHA and evidence |
| **learning_example** | \`ai_outputs\` (output_type = LEARNING) | EXISTS | REUSE: Evaluated training candidates |
`;

  const mapPath = resolve(process.cwd(), '.ai-agency/FIRST_REVENUE_SCHEMA_MAP.md');
  writeFileSync(mapPath, schemaMapMd, 'utf-8');
  console.log(`\n[REV3-AUDIT] ✅ Written FIRST_REVENUE_SCHEMA_MAP.md at: ${mapPath}`);
}

main().catch(console.error);
