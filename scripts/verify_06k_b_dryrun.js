/** 06K-B.1: measured evidence from an explicitly isolated, disposable database. */
const fs = require('fs');
const path = require('path');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { Client } = require('pg');
const { isolatedDatabaseUrl } = require('./06k-b-db-guard');
const root = path.join(__dirname, '..');
const dir = path.join(root, '.artifacts/06k-b');
const migrations = fs.readdirSync(path.join(root, 'supabase/migrations')).filter(f => /^2026092307000[1-5]_/.test(f)).sort();
const stages = ['preflight', 'baseline', 'baseline-contract', 'apply', 'second-apply', 'schema-after', 'negative-tests', 'security-tests', 'rollback', 'baseline-verification', 'reapply', 'final-verification'];
const report = { timestamp: new Date().toISOString(), status: 'NOT_EXECUTED', production_mutations: 'ZERO', production_live_comparison: 'NOT_EXECUTED', stages: Object.fromEntries(stages.map(s => [s, { status: 'NOT_EXECUTED' }])) };
function save(name, data) {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, name + '.json'), JSON.stringify(data, null, 2));
}
function persist() { save('lifecycle', report); }
async function stage(name, fn) {
  try {
    const result = await fn();
    report.stages[name] = { status: 'PASS', ...result };
  } catch (error) {
    report.stages[name] = { status: 'FAIL', error: error.code || error.message.replace(/postgres(?:ql)?:\/\/\S+/g, '[REDACTED]') };
    throw error;
  } finally { save(name, report.stages[name]); persist(); }
}
const sql = file => fs.readFileSync(path.join(root, file), 'utf8');
async function snapshot(client) {
  const queries = {
    columns: `SELECT table_name,column_name,data_type,udt_name,is_nullable,column_default FROM information_schema.columns WHERE table_schema='public' ORDER BY table_name,ordinal_position`,
    constraints: `SELECT c.relname AS table_name,k.conname,k.contype,pg_get_constraintdef(k.oid) AS definition FROM pg_constraint k JOIN pg_class c ON c.oid=k.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' ORDER BY c.relname,k.conname`,
    indexes: `SELECT tablename,indexname,indexdef FROM pg_indexes WHERE schemaname='public' ORDER BY tablename,indexname`,
    policies: `SELECT tablename,policyname,permissive,roles,cmd,qual,with_check FROM pg_policies WHERE schemaname='public' ORDER BY tablename,policyname`,
    rls: `SELECT relname,relrowsecurity,relforcerowsecurity FROM pg_class WHERE relnamespace='public'::regnamespace AND relkind='r' ORDER BY relname`,
    functions: `SELECT p.proname,pg_get_function_identity_arguments(p.oid) AS args,pg_get_functiondef(p.oid) AS definition,p.proacl FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.prokind='f' ORDER BY p.proname,args`,
    triggers: `SELECT c.relname,t.tgname,pg_get_triggerdef(t.oid) AS definition FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid WHERE c.relnamespace='public'::regnamespace AND NOT t.tgisinternal ORDER BY c.relname,t.tgname`,
    grants: `SELECT table_name,grantee,privilege_type FROM information_schema.role_table_grants WHERE table_schema='public' ORDER BY table_name,grantee,privilege_type`,
    queue: `SELECT tablename FROM pg_tables WHERE schemaname='pgmq' ORDER BY tablename`,
  };
  const result = {};
  for (const [name, query] of Object.entries(queries)) result[name] = (await client.query(query)).rows;
  // Empty fixture rows and baseline node seed are included; no production data is read.
  result.rows = {};
  for (const { relname } of result.rls) {
    result.rows[relname] = (await client.query(`SELECT to_jsonb(t) AS row FROM public."${relname.replace(/"/g, '""')}" t ORDER BY to_jsonb(t)::text`)).rows;
  }
  return result;
}
async function apply(client) {
  const results = [];
  await client.query('BEGIN');
  try {
    for (const file of migrations) {
      await client.query(sql('supabase/migrations/' + file));
      results.push({ file, status: 'PASS' });
    }
    await client.query('COMMIT');
  } catch (e) { await client.query('ROLLBACK'); throw e; }
  return { results };
}
async function contract(client) {
  const s = await snapshot(client);
  const expected = [['agents','id','text'],['agent_versions','id','uuid'],['ai_tasks','id','uuid'],['ai_tasks','risk_level','integer'],['agents','risk_ceiling','integer']];
  for (const [table,column,type] of expected) assert.ok(s.columns.some(c=>c.table_name===table && c.column_name===column && c.data_type===type), `${table}.${column} type mismatch`);
  assert.ok(s.constraints.some(c=>c.table_name==='agent_versions' && c.conname==='uq_agent_version' && c.definition==='UNIQUE (agent_id, version)'));
  const message = s.constraints.find(c=>c.table_name==='ai_task_steps' && c.definition.includes('message_type'));
  assert.ok(message);
  const messageTypes = [...message.definition.matchAll(/'([^']+)'::text/g)].map(m=>m[1]);
  assert.equal(messageTypes.length,12);
  assert.ok(s.queue.some(t=>t.tablename==='q_ai-jobs'));
  assert.equal(s.rls.length,34);
  return { source: 'versioned local schema fixture; not a live production comparison', columns: expected, message_types: messageTypes, constraints: s.constraints, queue: s.queue, table_count: s.rls.length };
}
async function verifySchema(client) {
  const s=await snapshot(client);
  for (const table of ['organizations','departments','organization_memberships','ai_policies','agents','agent_versions','ai_tasks','ai_task_steps','ai_outputs']) assert.ok(s.rls.some(r=>r.relname===table && r.relrowsecurity), `RLS missing: ${table}`);
  for (const [table,count] of [['organizations',6],['departments',65],['ai_policies',3],['agents',0],['agent_versions',0]]) assert.equal(s.rows[table].length,count, `${table} seed count`);
  // Re-running the seed validates every canonical value, including JSONB policy rules.
  await client.query(sql('supabase/migrations/'+migrations[3]));
  assert.ok(s.constraints.some(c=>c.conname==='fk_agents_current_version'));
  return { schema: s };
}
async function negativeTests(client) {
  const results=[];
  for (const [name, mutation] of [
    ['wrong org cost center', "UPDATE public.organizations SET cost_center_code='WRONG' WHERE id='org-02-aischool'"],
    ['wrong department organization', "UPDATE public.departments SET organization_id='org-03-smarttax' WHERE id='dept-02-academic'"],
    ['policy nested rule drift', "UPDATE public.ai_policies SET rules='{}'::jsonb WHERE id='pol-group-global-ceiling'"],
    ['nullable parent drift', "UPDATE public.organizations SET parent_org_id=NULL WHERE id='org-02-aischool'"],
  ]) {
    await client.query('BEGIN');
    try {
      await client.query(mutation);
      await assert.rejects(client.query(sql('supabase/migrations/'+migrations[3])), /CANONICAL_SEED_DRIFT/);
      results.push({ name, status: 'PASS' });
    } finally { await client.query('ROLLBACK'); }
  }
  for (const value of [null, '', 'UNKNOWN', 'public']) {
    const {rows}=await client.query(`SELECT public.data_classification_rank($1::text) AS rank,
      (public.data_classification_rank($1::text)<=public.data_classification_rank('RESTRICTED')) IS TRUE AS allowed,
      (public.data_classification_rank('PUBLIC')<=public.data_classification_rank($1::text)) IS TRUE AS allowed_ceiling`,[value]);
    assert.equal(rows[0].rank,null); assert.equal(rows[0].allowed,false); assert.equal(rows[0].allowed_ceiling,false);
    results.push({ name: 'invalid classification '+JSON.stringify(value), status:'PASS' });
  }
  const unavailable=runSecurity('postgresql://postgres:postgres@127.0.0.1:1/phase06kb_test');
  assert.notEqual(unavailable.exit_code,0);
  results.push({name:'DB unavailable in required integration mode',status:'PASS',observed_exit_code:unavailable.exit_code});
  return { results };
}
function runSecurity(url) {
  const child=spawnSync(process.execPath,['--import','tsx','--test','--test-reporter=tap','tests/security/multi-org-isolation.test.ts'],{
    cwd:root,env:{...process.env,TEST_DATABASE_URL:url,REQUIRE_06K_B_DB:'true'},encoding:'utf8',timeout:120000,
  });
  const output=(child.stdout || '')+(child.stderr || '');
  const counts={};
  for (const name of ['tests','pass','fail','cancelled','skipped']) {
    const match=output.match(new RegExp('^# '+name+' (\\d+)','m'));
    counts[name]=match ? Number(match[1]) : null;
  }
  return {exit_code:child.status,...counts,output};
}
async function run() {
  // Invalidate all legacy evidence before preflight; failed runs cannot reuse old PASS.
  for (const name of [...stages,'preflight','baseline-contract','migration-apply','seed-validation','rls-tests','final-diff']) save(name,{status:'NOT_EXECUTED',timestamp:report.timestamp});
  persist();
  let client;
  try {
    let url;
    await stage('preflight',async()=>{
      url=isolatedDatabaseUrl();
      client=new Client({connectionString:url,connectionTimeoutMillis:3000});
      await client.connect();
      const {rows}=await client.query('SELECT current_database() AS database,inet_server_addr() AS server,version() AS version');
      assert.equal(rows[0].database,new URL(url).pathname.slice(1));
      const diagnostics = await client.query(`SELECT current_user AS current_user,
        current_database() AS current_database, pg_get_userbyid(datdba) AS database_owner
        FROM pg_database WHERE datname = current_database()`);
      // Catalog identifiers only: never log credentials or connection URLs.
      console.log('[DB diagnostics]', JSON.stringify(diagnostics.rows[0]));
      return {target:rows[0], diagnostics:diagnostics.rows[0]};
    });
    let baseline;
    await stage('baseline',async()=>{
      const {rows}=await client.query("SELECT count(*)::int AS count FROM pg_tables WHERE schemaname='public'");
      assert.equal(rows[0].count,0,'Fresh empty phase06kb_test required; never reset an existing DB implicitly');
      await client.query(sql('tests/fixtures/06k-b/auth-bootstrap.sql'));
      await client.query(sql('tests/fixtures/06k-b/legacy-schema.sql'));
      await client.query(sql('supabase/migrations/deploy_phase_06g_complete.sql'));
      await client.query(sql('tests/fixtures/06k-b/security-baseline.sql'));
      baseline=await snapshot(client);
      return {schema:baseline};
    });
    await stage('baseline-contract',()=>contract(client));
    await stage('apply',()=>apply(client));
    const first=await snapshot(client);
    await stage('second-apply',async()=>{ const result=await apply(client); assert.deepEqual(await snapshot(client),first); return result; });
    await stage('schema-after',()=>verifySchema(client));
    await stage('negative-tests',()=>negativeTests(client));
    await stage('security-tests',async()=>{
      const result=runSecurity(url); save('security-process',result);
      assert.equal(result.exit_code,0,'Security process failed; see security-process.json');
      assert.ok(result.tests>0); assert.equal(result.fail,0); assert.equal(result.skipped,0); assert.equal(result.cancelled,0);
      return result;
    });
    await stage('rollback',async()=>{ await client.query(sql('supabase/rollback/06k_b_multi_org_rollback.sql')); return {}; });
    await stage('baseline-verification',async()=>{ const restored=await snapshot(client); assert.deepEqual(restored,baseline); return {schema:restored}; });
    await stage('reapply',()=>apply(client));
    await stage('final-verification',async()=>{ const result=await verifySchema(client); const withoutSeedTimes = value => JSON.parse(JSON.stringify(value, (key, item) => ['created_at','updated_at'].includes(key) ? undefined : item)); assert.deepEqual(withoutSeedTimes(result.schema),withoutSeedTimes(first)); return result; });
    report.status='PASS';
  } catch(e) {
    report.status='FAIL'; process.exitCode=1;
    console.error('06K-B verification FAIL:',e.code || e.message.replace(/postgres(?:ql)?:\/\/\S+/g,'[REDACTED]'));
  } finally {
    if(client) await client.end().catch(()=>{});
    persist();
    console.log(JSON.stringify({status:report.status,stages:Object.fromEntries(Object.entries(report.stages).map(([k,v])=>[k,v.status]))}));
  }
}
if(require.main===module) run();
module.exports={runSecurity};
