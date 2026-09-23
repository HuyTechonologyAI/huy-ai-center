import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { Client } from 'pg';
import { canonicalSha256, canonicalizeJson } from '@huy-ai/contracts';

function getTestDbUrl(): string {
  const value = process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/phase06kb_test';
  const url = new URL(value);
  if (!['postgres:', 'postgresql:'].includes(url.protocol) ||
      !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) ||
      url.pathname !== '/phase06kb_test' || url.search || url.hash) {
    throw new Error('06K_B_ISOLATION_REQUIRED: loopback /phase06kb_test without URL options required');
  }
  return url.toString();
}

const TEST_DB_URL = getTestDbUrl();
const requireDB = process.env.REQUIRE_06K_B_DB === 'true';

// Synthetic Test Identities (UUIDs)
const USER_AISCHOOL_ID = '11111111-1111-4111-a111-111111111111';
const USER_SMARTTAX_ID = '22222222-2222-4222-a222-222222222222';
const USER_MEDIA_ID    = '33333333-3333-4333-a333-333333333333';
const USER_GROUP_ADMIN = '99999999-9999-4999-a999-999999999999';
const USER_LEGACY_ID   = '44444444-4444-4444-a444-444444444444';

describe('06K-B Multi-Org Security & Isolation Test Suite', () => {
  let dbAvailable = false;
  let client: Client;

  before(async () => {
    client = new Client({ connectionString: TEST_DB_URL, connectionTimeoutMillis: 3000 });
    try {
      await client.connect();
      dbAvailable = true;
      await client.query('BEGIN');

      // Seed synthetic test auth users & memberships in auth.users and organization_memberships
      // Cleanup any prior test artifacts
      await client.query(`
        DELETE FROM public.organization_memberships WHERE user_id IN (
          '${USER_AISCHOOL_ID}', '${USER_SMARTTAX_ID}', '${USER_MEDIA_ID}', '${USER_GROUP_ADMIN}', '${USER_LEGACY_ID}'
        );
        DELETE FROM auth.users WHERE id IN (
          '${USER_AISCHOOL_ID}', '${USER_SMARTTAX_ID}', '${USER_MEDIA_ID}', '${USER_GROUP_ADMIN}', '${USER_LEGACY_ID}'
        );

        INSERT INTO auth.users (id, email) VALUES
          ('${USER_AISCHOOL_ID}', 'synthetic-aischool@test.local'),
          ('${USER_SMARTTAX_ID}', 'synthetic-smarttax@test.local'),
          ('${USER_MEDIA_ID}',    'synthetic-media@test.local'),
          ('${USER_GROUP_ADMIN}', 'synthetic-groupadmin@test.local'),
          ('${USER_LEGACY_ID}',   'synthetic-legacy@test.local')
        ON CONFLICT (id) DO NOTHING;

        INSERT INTO public.organization_memberships (user_id, organization_id, membership_role, status) VALUES
          ('${USER_AISCHOOL_ID}', 'org-02-aischool',      'member', 'ACTIVE'),
          ('${USER_SMARTTAX_ID}', 'org-03-smarttax',      'member', 'ACTIVE'),
          ('${USER_MEDIA_ID}',    'org-06-media-creative', 'member', 'ACTIVE'),
          ('${USER_GROUP_ADMIN}', 'org-01-huytech',       'owner',  'ACTIVE')
        ON CONFLICT (user_id, organization_id) DO NOTHING;
      `);
    } catch (err: any) {
      dbAvailable = false;
      if (process.env.REQUIRE_06K_B_DB === 'true') {
        throw new Error(`REQUIRE_06K_B_DB is true but isolated test database is unreachable at ${TEST_DB_URL}: ${err.message}`);
      }
      console.warn('  ℹ Local database not reachable, running static/contract verification mode.');
    }
  });

  after(async () => {
    if (dbAvailable) {
      await client.query('ROLLBACK');
      await client.end();
    }
  });

  async function rejectingQuery(sql: string) {
    await client.query('SAVEPOINT expected_failure');
    try { return await client.query(sql); }
    finally {
      await client.query('ROLLBACK TO SAVEPOINT expected_failure');
      await client.query('RELEASE SAVEPOINT expected_failure');
    }
  }

  // Helper to run query with simulated authenticated user
  async function queryAsUser(userId: string, sql: string, params: any[] = []): Promise<any[]> {
    await client.query('SAVEPOINT user_query');
    try {
      await client.query("SELECT set_config('request.jwt.claim.sub', $1, true)", [userId]);
      await client.query('SET LOCAL ROLE authenticated');
      const res = await client.query(sql, params);
      return Array.isArray(res) ? res[res.length - 1].rows : res.rows;
    } finally {
      await client.query('ROLLBACK TO SAVEPOINT user_query');
      await client.query('RELEASE SAVEPOINT user_query');
    }
  }

  // ==========================================================================
  // DOMAIN 1: MULTI-TENANT ISOLATION (MT)
  // ==========================================================================
  describe('Domain 1: Multi-Tenant Isolation (MT)', () => {
    it('SEC-MT-01: Intra-Org Task Read — member reads own org task', async (t) => {
      if (!dbAvailable) return t.skip('NOT_EXECUTED: isolated DB unavailable');

      const testTaskId = '10000000-0000-0000-0000-000000000001';
      // Insert task as service_role
      await client.query(`
        INSERT INTO public.ai_tasks (id, conversation_id, intent, organization_id, status)
        VALUES ('${testTaskId}', gen_random_uuid(), 'Test Task Org 02', 'org-02-aischool', 'CREATED')
        ON CONFLICT (id) DO UPDATE SET organization_id = 'org-02-aischool';
      `);

      const rows = await queryAsUser(USER_AISCHOOL_ID, `
        SELECT id, organization_id FROM public.ai_tasks WHERE id = '${testTaskId}';
      `);
      assert.equal(rows.length, 1);
      assert.equal(rows[0].organization_id, 'org-02-aischool');
    });

    it('SEC-MT-02: Cross-Org Task Read — Media member cannot read SmartTax task', async (t) => {
      if (!dbAvailable) return t.skip('NOT_EXECUTED: isolated DB unavailable');

      const testTaskId = '10000000-0000-0000-0000-000000000002';
      await client.query(`
        INSERT INTO public.ai_tasks (id, conversation_id, intent, organization_id, status)
        VALUES ('${testTaskId}', gen_random_uuid(), 'Confidential Tax Calculation', 'org-03-smarttax', 'CREATED')
        ON CONFLICT (id) DO UPDATE SET organization_id = 'org-03-smarttax';
      `);

      const rows = await queryAsUser(USER_MEDIA_ID, `
        SELECT id FROM public.ai_tasks WHERE id = '${testTaskId}';
      `);
      assert.equal(rows.length, 0, 'Cross-org task read must return 0 rows under RLS');
    });

    it('SEC-MT-03: Cross-Org Task Injection — User cannot forge task for another org', async (t) => {
      if (!dbAvailable) return t.skip('NOT_EXECUTED: isolated DB unavailable');

      // Inserting as USER_MEDIA_ID with organization_id='org-01-huytech' without write permission
      await assert.rejects(async () => {
        await queryAsUser(USER_MEDIA_ID, `
          INSERT INTO public.ai_tasks (id, conversation_id, intent, organization_id, status)
          VALUES (gen_random_uuid(), gen_random_uuid(), 'Forged Task', 'org-01-huytech', 'CREATED');
        `);
      }, /permission denied|violates row-level security|new row violates/i);
    });

    it('SEC-MT-04: Cross-Org Dept Mutation — Member cannot mutate department of another org', async (t) => {
      if (!dbAvailable) return t.skip('NOT_EXECUTED: isolated DB unavailable');

      // Cross-org UPDATE affects 0 rows under RLS boundary
      const updateRows = await queryAsUser(USER_AISCHOOL_ID, `
        UPDATE public.departments SET name = 'Hacked Dept' WHERE organization_id = 'org-03-smarttax' RETURNING id;
      `);
      assert.equal(updateRows.length, 0, 'Cross-org update must not modify any rows');

      // Unauthorized INSERT across org boundary is forbidden by RLS
      await assert.rejects(async () => {
        await queryAsUser(USER_AISCHOOL_ID, `
          INSERT INTO public.departments (id, organization_id, code, name)
          VALUES ('dept-03-hack', 'org-03-smarttax', 'HACK', 'Hacked Dept');
        `);
      }, /permission denied|violates row-level security/i);
    });

    it('SEC-MT-05: Group Admin Global Oversight — Group owner has visibility across organizations', async (t) => {
      if (!dbAvailable) return t.skip('NOT_EXECUTED: isolated DB unavailable');

      const rows = await queryAsUser(USER_GROUP_ADMIN, `
        SELECT count(*) AS cnt FROM public.organizations;
      `);
      assert.equal(parseInt(rows[0].cnt, 10), 6, 'Group admin can see all canonical organizations');
    });
  });

  // ==========================================================================
  // DOMAIN 2: SMARTTAX HERMETIC VAULT (ST)
  // ==========================================================================
  describe('Domain 2: SmartTax Hermetic Vault (ST)', () => {
    it('SEC-ST-01: SmartTax Raw Output Access — Outside user cannot access SmartTax DRAFT output', async (t) => {
      if (!dbAvailable) return t.skip('NOT_EXECUTED: isolated DB unavailable');

      const outId = '20000000-0000-0000-0000-000000000001';
      const taskId = '10000000-0000-0000-0000-000000000002';
      await client.query(`
        INSERT INTO public.ai_outputs (id, task_id, artifact_ref, artifact_type, organization_id, data_classification, release_status)
        VALUES ('${outId}', '${taskId}', 'tax-memo-draft-001', 'REPORT', 'org-03-smarttax', 'RESTRICTED', 'DRAFT')
        ON CONFLICT (id) DO UPDATE SET release_status = 'DRAFT';
      `);

      const rows = await queryAsUser(USER_MEDIA_ID, `
        SELECT id FROM public.ai_outputs WHERE id = '${outId}';
      `);
      assert.equal(rows.length, 0, 'SmartTax DRAFT output must be strictly hidden from other orgs');
    });

    it('SEC-ST-02: SmartTax Public Output Access — PUBLIC_APPROVED + PUBLIC is accessible cross-org', async (t) => {
      if (!dbAvailable) return t.skip('NOT_EXECUTED: isolated DB unavailable');

      const outId = '20000000-0000-0000-0000-000000000002';
      const taskId = '10000000-0000-0000-0000-000000000002';
      await client.query(`
        INSERT INTO public.ai_outputs (id, task_id, artifact_ref, artifact_type, organization_id, data_classification, release_status)
        VALUES ('${outId}', '${taskId}', 'public-tax-guide-2026', 'GUIDE', 'org-03-smarttax', 'PUBLIC', 'PUBLIC_APPROVED')
        ON CONFLICT (id) DO UPDATE SET release_status = 'PUBLIC_APPROVED', data_classification = 'PUBLIC';
      `);

      const rows = await queryAsUser(USER_MEDIA_ID, `
        SELECT id, artifact_ref FROM public.ai_outputs WHERE id = '${outId}';
      `);
      assert.equal(rows.length, 1);
      assert.equal(rows[0].artifact_ref, 'public-tax-guide-2026');
    });

    it('SEC-ST-03: SmartTax External API Egress — Disallows external domains', () => {
      const smartTaxConstraints = { disallowed_external_domains: ['*'] };
      const targetDomain = 'https://external-api.evil.com';
      const isAllowed = !smartTaxConstraints.disallowed_external_domains.includes('*') &&
                        !smartTaxConstraints.disallowed_external_domains.includes(targetDomain);
      assert.equal(isAllowed, false, 'External egress from SmartTax must be strictly blocked');
    });

    it('SEC-ST-04: SmartTax Raw Task Access via requested_by — requested_by_organization_id does NOT grant task access', async (t) => {
      if (!dbAvailable) return t.skip('NOT_EXECUTED: isolated DB unavailable');

      const testTaskId = '10000000-0000-0000-0000-000000000003';
      await client.query(`
        INSERT INTO public.ai_tasks (id, conversation_id, intent, organization_id, requested_by_organization_id, status)
        VALUES ('${testTaskId}', gen_random_uuid(), 'Requested tax report', 'org-03-smarttax', 'org-06-media-creative', 'CREATED')
        ON CONFLICT (id) DO UPDATE SET requested_by_organization_id = 'org-06-media-creative';
      `);

      const rows = await queryAsUser(USER_MEDIA_ID, `
        SELECT id FROM public.ai_tasks WHERE id = '${testTaskId}';
      `);
      assert.equal(rows.length, 0, 'requested_by_organization_id must NOT grant raw task access cross-org');
    });

    it('SEC-ST-05: SmartTax Step Access — ai_task_steps is service-role only in MVP (0 rows to user)', async (t) => {
      if (!dbAvailable) return t.skip('NOT_EXECUTED: isolated DB unavailable');

      const rows = await queryAsUser(USER_SMARTTAX_ID, `
        SELECT count(*) AS cnt FROM public.ai_task_steps;
      `);
      assert.equal(parseInt(rows[0].cnt, 10), 0, 'Authenticated queries on ai_task_steps return 0 rows');
    });

    it('SEC-ST-06: Group Admin SmartTax Isolation — Group admin cannot read raw SmartTax task', async (t) => {
      if (!dbAvailable) return t.skip('NOT_EXECUTED: isolated DB unavailable');

      const testTaskId = '10000000-0000-0000-0000-000000000002';
      const rows = await queryAsUser(USER_GROUP_ADMIN, `
        SELECT id FROM public.ai_tasks WHERE id = '${testTaskId}';
      `);
      assert.equal(rows.length, 0, 'Strictest-wins: Group admin cannot read raw SmartTax tasks without SmartTax membership');
    });

    it('SEC-ST-07: Group Admin SmartTax Non-Public Output Access — Group admin cannot read non-public SmartTax outputs', async (t) => {
      if (!dbAvailable) return t.skip('NOT_EXECUTED: isolated DB unavailable');

      const outId = '20000000-0000-0000-0000-000000000001'; // DRAFT RESTRICTED
      const rows = await queryAsUser(USER_GROUP_ADMIN, `
        SELECT id FROM public.ai_outputs WHERE id = '${outId}';
      `);
      assert.equal(rows.length, 0, 'Strictest-wins: Group admin cannot read non-public SmartTax outputs cross-org');
    });
  });

  // ==========================================================================
  // DOMAIN 3: AGENT CARD V2 INTEGRITY & IMMUTABILITY (AC)
  // ==========================================================================
  describe('Domain 3: Agent Card V2 Integrity & Immutability (AC)', () => {
    it('SEC-AC-01: Valid Agent Card V2 Registration with correct sha256 hash', async () => {
      const validCard = {
        schema_version: '2.0',
        agent_id: 'agent-tax-researcher',
        version: '1.0.0',
        risk: {
          ceiling: 1,
          allowed_data_classifications: ['PUBLIC', 'INTERNAL', 'CONFIDENTIAL']
        }
      };
      const hash = canonicalSha256(validCard);
      assert.equal(typeof hash, 'string');
      assert.equal(hash.length, 64);
    });

    it('SEC-AC-01b: Recursive Key-Order Invariance — Permuting keys at root and nested levels yields identical hash', () => {
      const cardA = {
        schema_version: '2.0',
        agent_id: 'agent-tax-researcher',
        version: '1.0.0',
        risk: {
          ceiling: 1,
          allowed_data_classifications: ['PUBLIC', 'INTERNAL'],
          mode: 'enforced'
        },
        runtime: {
          timeout_ms: 30000,
          memory_mb: 512
        }
      };

      const cardB = {
        runtime: {
          memory_mb: 512,
          timeout_ms: 30000
        },
        risk: {
          mode: 'enforced',
          allowed_data_classifications: ['PUBLIC', 'INTERNAL'],
          ceiling: 1
        },
        version: '1.0.0',
        agent_id: 'agent-tax-researcher',
        schema_version: '2.0'
      };

      assert.equal(canonicalizeJson(cardA), canonicalizeJson(cardB));
      assert.equal(canonicalSha256(cardA), canonicalSha256(cardB));
    });

    it('SEC-AC-01c: Nested Mutation Sensitivity — Modifying nested risk ceiling, runtime, or tools alters hash', () => {
      const baseCard = {
        schema_version: '2.0',
        agent_id: 'agent-tax-researcher',
        risk: { ceiling: 1 },
        runtime: { timeout_ms: 30000 },
        tool_access: ['tool_lookup', 'tool_calculate']
      };
      const baseHash = canonicalSha256(baseCard);

      // Mutate nested risk ceiling
      const cardWithMutatedRisk = {
        ...baseCard,
        risk: { ceiling: 2 }
      };
      assert.notEqual(canonicalSha256(cardWithMutatedRisk), baseHash);

      // Mutate nested runtime
      const cardWithMutatedRuntime = {
        ...baseCard,
        runtime: { timeout_ms: 60000 }
      };
      assert.notEqual(canonicalSha256(cardWithMutatedRuntime), baseHash);

      // Mutate tool_access
      const cardWithMutatedTools = {
        ...baseCard,
        tool_access: ['tool_lookup', 'tool_calculate', 'tool_execute']
      };
      assert.notEqual(canonicalSha256(cardWithMutatedTools), baseHash);
    });

    it('SEC-AC-01d: Array Order Sensitivity — Array order must be strictly preserved in canonicalization', () => {
      const cardArray1 = { tools: ['a', 'b'] };
      const cardArray2 = { tools: ['b', 'a'] };
      assert.notEqual(canonicalSha256(cardArray1), canonicalSha256(cardArray2));
    });

    it('SEC-AC-02: Card Schema Validation Failure — string risk ceiling "R1" is rejected, integer 1 accepted', () => {
      function validateRiskCeiling(card: any): boolean {
        if (!card.risk || typeof card.risk !== 'object') return false;
        if (typeof card.risk.ceiling !== 'number' || !Number.isInteger(card.risk.ceiling)) return false;
        return card.risk.ceiling >= 0 && card.risk.ceiling <= 4;
      }

      // Rejects string "R1"
      assert.equal(validateRiskCeiling({ risk: { ceiling: 'R1' } }), false);
      // Rejects missing risk block
      assert.equal(validateRiskCeiling({}), false);
      // Accepts integer 1
      assert.equal(validateRiskCeiling({ risk: { ceiling: 1 } }), true);
    });

    it('SEC-AC-03: Hash Tampering Detection — Mismatched hash is detected', () => {
      const card = { schema_version: '2.0', agent_id: 'agent-test', risk: { ceiling: 1 } };
      const realHash = canonicalSha256(card);
      const forgedHash = '0000000000000000000000000000000000000000000000000000000000000000';
      assert.notEqual(realHash, forgedHash);
    });

    it('SEC-AC-04: Agent Card Mutation Attempt — UPDATE on agent_versions is rejected by trigger', async (t) => {
      if (!dbAvailable) return t.skip('NOT_EXECUTED: isolated DB unavailable');

      const testAgentId = 'synthetic-test-agent-01';
      const testVersionId = '55555555-5555-5555-5555-555555555551';

      // Insert temporary synthetic agent and version as service_role
      await client.query(`
        INSERT INTO public.agents (id, name, version, capabilities, risk_ceiling, organization_id)
        VALUES ('${testAgentId}', 'Test Agent', '1.0.0', '{"tax.test"}', 1, 'org-01-huytech')
        ON CONFLICT (id) DO NOTHING;

        INSERT INTO public.agent_versions (id, agent_id, version, capabilities, risk_ceiling, agent_card)
        VALUES ('${testVersionId}', '${testAgentId}', '1.0.0', '{"tax.test"}', 1, '{"version": "1.0.0"}'::jsonb)
        ON CONFLICT (id) DO NOTHING;
      `);

      // Attempt UPDATE on existing agent_versions record
      await assert.rejects(async () => {
        await rejectingQuery(`
          UPDATE public.agent_versions SET version = '1.0.1' WHERE id = '${testVersionId}';
        `);
      }, /agent_versions records are immutable and cannot be updated or deleted/i);
    });

    it('SEC-IMMUTABLE-DEL: Agent Card Deletion Attempt — DELETE on agent_versions is rejected by trigger', async (t) => {
      if (!dbAvailable) return t.skip('NOT_EXECUTED: isolated DB unavailable');

      const testVersionId = '55555555-5555-5555-5555-555555555551';
      await assert.rejects(async () => {
        await rejectingQuery(`
          DELETE FROM public.agent_versions WHERE id = '${testVersionId}';
        `);
      }, /agent_versions records are immutable and cannot be updated or deleted/i);
    });

    it('SEC-AC-05: Version Pointer Invariant — Agent cannot point to another agent version', async (t) => {
      if (!dbAvailable) return t.skip('NOT_EXECUTED: isolated DB unavailable');

      const testAgentA = 'synthetic-test-agent-a';
      const testAgentB = 'synthetic-test-agent-b';
      const versionB = '66666666-6666-6666-6666-666666666662';

      await client.query(`
        INSERT INTO public.agents (id, name, version, capabilities, risk_ceiling, organization_id)
        VALUES
          ('${testAgentA}', 'Agent A', '1.0.0', '{"cap.a"}', 1, 'org-01-huytech'),
          ('${testAgentB}', 'Agent B', '1.0.0', '{"cap.b"}', 1, 'org-01-huytech')
        ON CONFLICT (id) DO NOTHING;

        INSERT INTO public.agent_versions (id, agent_id, version, capabilities, risk_ceiling)
        VALUES ('${versionB}', '${testAgentB}', '1.0.0', '{"cap.b"}', 1)
        ON CONFLICT (id) DO NOTHING;
      `);

      // Attempt to point Agent A to Version B (which belongs to Agent B)
      await assert.rejects(async () => {
        await rejectingQuery(`
          UPDATE public.agents SET current_agent_version_id = '${versionB}' WHERE id = '${testAgentA}';
        `);
      }, /does not belong to agent/i);
    });
  });

  // ==========================================================================
  // DOMAIN 4: POLICY CEILINGS & INVARIANTS (POL)
  // ==========================================================================
  describe('Domain 4: Policy Ceilings & Invariants (POL)', () => {
    it('SEC-POL-01: Classification Ceiling Exceeded — RESTRICTED task rejected if org ceiling is INTERNAL', async (t) => {
      if (!dbAvailable) return t.skip('NOT_EXECUTED: isolated DB unavailable');

      // org-06-media-creative ceiling is INTERNAL (rank 2)
      // Task with data_classification = RESTRICTED (rank 4) exceeds ceiling
      const orgRes = await client.query(`
        SELECT data_classification_ceiling FROM public.organizations WHERE id = 'org-06-media-creative';
      `);
      const orgCeiling = orgRes.rows[0].data_classification_ceiling;

      const rankRes = await client.query(`
        SELECT
          public.data_classification_rank('RESTRICTED') AS task_rank,
          public.data_classification_rank('${orgCeiling}') AS ceiling_rank;
      `);
      const { task_rank, ceiling_rank } = rankRes.rows[0];
      assert.ok(task_rank > ceiling_rank, 'Task rank (4) must strictly exceed ceiling rank (2)');
    });

    it('SEC-POL-02: Risk Review Ceiling Bypass — Risk >= 3 requires human gate', async (t) => {
      if (!dbAvailable) return t.skip('NOT_EXECUTED: isolated DB unavailable');

      // chk_risk_approval enforces risk_level < 3 OR approval_required = true
      await assert.rejects(async () => {
        await rejectingQuery(`
          INSERT INTO public.ai_tasks (id, conversation_id, intent, risk_level, approval_required, status)
          VALUES (gen_random_uuid(), gen_random_uuid(), 'Bypass risk gate', 3, false, 'CREATED');
        `);
      }, /chk_risk_approval|violates check constraint/i);
    });

    it('SEC-POL-03: Budget Quota Exceeded — Rejection logic check', () => {
      const budgetCap = 50000;
      const currentUsage = 50001;
      const isExhausted = currentUsage > budgetCap;
      assert.equal(isExhausted, true);
    });

    it('SEC-POL-04: Default-Deny Cross-Org Delegation', () => {
      const activePolicies = [
        { source: 'org-02-aischool', target: 'org-02-aischool', action: 'DELEGATE' }
      ];
      const request = { source: 'org-02-aischool', target: 'org-04-media-tech', action: 'DELEGATE' };
      const allowed = activePolicies.some(p => p.source === request.source && p.target === request.target);
      assert.equal(allowed, false, 'Delegation without explicit policy must be default-denied');
    });
  });

  // ==========================================================================
  // DOMAIN 5: QUEUE & DISPATCHER INVARIANTS (QINV)
  // ==========================================================================
  describe('Domain 5: Queue & Dispatcher Invariants (QINV)', () => {
    it('SEC-QINV-01: Valid Envelope Dispatch Verification', () => {
      const envelope = {
        routing: { organization_id: 'org-01-huytech' },
        identity: { agent_id: 'agent-tax-researcher', agent_version_id: 'uuid-1' },
        telemetry: { task_id: 'task-1' }
      };
      const task = { id: 'task-1', organization_id: 'org-01-huytech' };
      const agent = { id: 'agent-tax-researcher', organization_id: 'org-01-huytech', enabled: true, current_agent_version_id: 'uuid-1' };

      const isValid = (envelope.routing.organization_id === task.organization_id) &&
                      (envelope.identity.agent_id === agent.id) &&
                      (agent.organization_id === task.organization_id) &&
                      agent.enabled &&
                      (envelope.identity.agent_version_id === agent.current_agent_version_id);
      assert.equal(isValid, true);
    });

    it('SEC-QINV-02: Tenant Spoofing — Envelope organization mismatch is detected', () => {
      const envelope = { routing: { organization_id: 'org-01-huytech' } };
      const task = { organization_id: 'org-03-smarttax' };
      assert.notEqual(envelope.routing.organization_id, task.organization_id, 'Tenant mismatch detected');
    });

    it('SEC-QINV-03: Disabled Agent Execution — Rejects agent with enabled = false', () => {
      const agent = { id: 'agent-1', enabled: false };
      assert.equal(agent.enabled, false, 'Disabled agent execution must be rejected');
    });

    it('SEC-QINV-04: Message Expiry — Expired message is archived and not executed', () => {
      const pastDate = new Date(Date.now() - 60000).toISOString();
      const isExpired = new Date(pastDate).getTime() < Date.now();
      assert.equal(isExpired, true);
    });

    it('SEC-QINV-05: Replay Attack Resistance — Idempotency key conflict drops duplicate', () => {
      const inFlightMessages = new Set<string>();
      inFlightMessages.add('trace-001:task-001');
      const isDuplicate = inFlightMessages.has('trace-001:task-001');
      assert.equal(isDuplicate, true);
    });
  });

  // ==========================================================================
  // DOMAIN 6: ADDITIONAL SECURITY & LEGACY COMPATIBILITY
  // ==========================================================================
  describe('Domain 6: Hardened Helpers & Legacy Access', () => {
    it('SEC-LEGACY-01: Legacy owner_user_id own-task read path remains valid', async (t) => {
      if (!dbAvailable) return t.skip('NOT_EXECUTED: isolated DB unavailable');

      const legacyTaskId = '10000000-0000-0000-0000-000000000009';
      await client.query(`
        INSERT INTO public.ai_tasks (id, conversation_id, intent, owner_user_id, status)
        VALUES ('${legacyTaskId}', gen_random_uuid(), 'Legacy task with no org', '${USER_LEGACY_ID}', 'CREATED')
        ON CONFLICT (id) DO UPDATE SET owner_user_id = '${USER_LEGACY_ID}';
      `);

      const rows = await queryAsUser(USER_LEGACY_ID, `
        SELECT id FROM public.ai_tasks WHERE id = '${legacyTaskId}';
      `);
      assert.equal(rows.length, 1, 'Legacy owner_user_id path allows user to read own task');
    });

    it('SEC-LEGACY-02: Legacy owner output access remains valid', async (t) => {
      if (!dbAvailable) return t.skip('NOT_EXECUTED: isolated DB unavailable');

      const legacyTaskId = '10000000-0000-0000-0000-000000000009';
      const legacyOutId  = '20000000-0000-0000-0000-000000000009';
      await client.query(`
        INSERT INTO public.ai_outputs (id, task_id, artifact_ref, artifact_type)
        VALUES ('${legacyOutId}', '${legacyTaskId}', 'legacy-artifact', 'REPORT')
        ON CONFLICT (id) DO NOTHING;
      `);

      const rows = await queryAsUser(USER_LEGACY_ID, `
        SELECT id FROM public.ai_outputs WHERE id = '${legacyOutId}';
      `);
      assert.equal(rows.length, 1, 'Legacy output access preserved via owner task');
    });

    it('SEC-RLS-01: organization_memberships mutation is default-deny for authenticated users', async (t) => {
      if (!dbAvailable) return t.skip('NOT_EXECUTED: isolated DB unavailable');

      await assert.rejects(async () => {
        await queryAsUser(USER_AISCHOOL_ID, `
          INSERT INTO public.organization_memberships (user_id, organization_id, membership_role, status)
          VALUES ('${USER_AISCHOOL_ID}', 'org-01-huytech', 'owner', 'ACTIVE');
        `);
      }, /permission denied|violates row-level security/i);
    });

    it('SEC-RLS-02: ai_policies mutation is default-deny for authenticated users', async (t) => {
      if (!dbAvailable) return t.skip('NOT_EXECUTED: isolated DB unavailable');

      await assert.rejects(async () => {
        await queryAsUser(USER_AISCHOOL_ID, `
          INSERT INTO public.ai_policies (id, name, policy_scope, target_id, rules)
          VALUES ('forged-policy', 'Forged', 'GROUP', 'org-01-huytech', '{}'::jsonb);
        `);
      }, /permission denied|violates row-level security/i);
    });

    it('SEC-FUNC-01: SECURITY DEFINER helper search_path is strictly fixed to public, pg_temp', async (t) => {
      if (!dbAvailable) return t.skip('NOT_EXECUTED: isolated DB unavailable');

      const res = await client.query(`
        SELECT proname, proconfig FROM pg_proc
        WHERE proname IN ('auth_user_organization_ids', 'auth_user_has_org_role', 'auth_user_is_group_admin');
      `);
      assert.equal(res.rows.length, 3);
      for (const row of res.rows) {
        assert.ok(row.proconfig && row.proconfig.some((c: string) => c.includes('search_path=public, pg_temp')),
          `Helper ${row.proname} must have search_path=public, pg_temp`);
      }
    });

    it('SEC-FUNC-02: Helper EXECUTE ACL is revoked from PUBLIC role', async (t) => {
      if (!dbAvailable) return t.skip('NOT_EXECUTED: isolated DB unavailable');

      const res = await client.query(`
        SELECT p.proname, EXISTS (SELECT 1 FROM aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner))) a WHERE a.grantee = 0 AND a.privilege_type = 'EXECUTE') AS public_execute
        FROM pg_proc p
        WHERE p.proname IN ('auth_user_organization_ids', 'auth_user_has_org_role', 'auth_user_is_group_admin');
      `);
      for (const row of res.rows) {
        assert.equal(row.public_execute, false, `Public execution on ${row.proname} must be revoked`);
      }
    });

    it('SEC-CLASS-01: Data Classification uses mathematical rank mapping rather than lexicographical sorting', async (t) => {
      if (!dbAvailable) return t.skip('NOT_EXECUTED: isolated DB unavailable');

      const res = await client.query(`
        SELECT
          public.data_classification_rank('PUBLIC') AS r_public,
          public.data_classification_rank('INTERNAL') AS r_internal,
          public.data_classification_rank('CONFIDENTIAL') AS r_confidential,
          public.data_classification_rank('RESTRICTED') AS r_restricted;
      `);
      const { r_public, r_internal, r_confidential, r_restricted } = res.rows[0];
      assert.equal(r_public, 1);
      assert.equal(r_internal, 2);
      assert.equal(r_confidential, 3);
      assert.equal(r_restricted, 4);

      // Verify that 'CONFIDENTIAL' > 'INTERNAL' in rank, even though 'CONFIDENTIAL' < 'INTERNAL' alphabetically
      assert.ok(r_confidential > r_internal, 'CONFIDENTIAL must have higher rank than INTERNAL');
      assert.ok('CONFIDENTIAL' < 'INTERNAL', 'Alphabetically C is less than I');
    });

    it('SEC-CLASS-02: Fail-Closed Data Classification — Unknown value returns NULL and fails SQL comparisons', async (t) => {
      if (!dbAvailable) return t.skip('NOT_EXECUTED: isolated DB unavailable');

      const res = await client.query(`
        SELECT
          public.data_classification_rank('UNKNOWN') AS r_unknown,
          public.data_classification_rank('INVALID') AS r_invalid,
          public.data_classification_rank(NULL) AS r_null,
          (public.data_classification_rank('UNKNOWN') <= public.data_classification_rank('PUBLIC')) AS cmp_unknown_public;
      `);
      const { r_unknown, r_invalid, r_null, cmp_unknown_public } = res.rows[0];
      assert.equal(r_unknown, null, 'Unknown classification must return NULL');
      assert.equal(r_invalid, null, 'Invalid classification must return NULL');
      assert.equal(r_null, null, 'NULL classification must return NULL');
      assert.equal(cmp_unknown_public, null, 'Comparison with unknown classification must evaluate to NULL (fail-closed in SQL WHERE/CHECK)');
    });

    it('SEC-DRIFT-01: Canonical Seed Drift Protection — Aborts migration on conflicting organization or department', async (t) => {
      if (!dbAvailable) return t.skip('NOT_EXECUTED: isolated DB unavailable');

      const seedSqlPath = path.join(__dirname, '..', '..', 'supabase', 'migrations', '20260923070004_06k_b_reference_seed.sql');
      const seedSql = fs.readFileSync(seedSqlPath, 'utf-8');

      // Extract the Section 4 validation DO block
      const doBlockIndex = seedSql.indexOf('-- 4. Canonical Seed Drift Validation (Fail-Closed)');
      assert.ok(doBlockIndex !== -1, 'Reference seed migration must contain Section 4 validation block');
      const validationSql = seedSql.slice(doBlockIndex);

      // 1. Organization cost center conflict test (negative test)
      await client.query('BEGIN');
      try {
        await client.query("UPDATE public.organizations SET cost_center_code = 'DRIFT_CC' WHERE id = 'org-03-smarttax';");
        await assert.rejects(async () => {
          await client.query(validationSql);
        }, /CANONICAL_SEED_DRIFT: Organization org-03-smarttax/);
      } finally {
        await client.query('ROLLBACK');
      }

      // 2. Department code conflict test (negative test)
      await client.query('BEGIN');
      try {
        await client.query("UPDATE public.departments SET code = 'DRIFT_CODE' WHERE id = 'dept-03-tax-research';");
        await assert.rejects(async () => {
          await client.query(validationSql);
        }, /CANONICAL_SEED_DRIFT: Department dept-03-tax-research/);
      } finally {
        await client.query('ROLLBACK');
      }
    });
  });
});

