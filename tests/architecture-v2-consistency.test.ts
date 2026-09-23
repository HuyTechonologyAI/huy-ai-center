import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// Helper to load JSON files from config/architecture/v2/
function loadConfig<T>(filename: string): T {
  const filePath = path.join(process.cwd(), 'config', 'architecture', 'v2', filename);
  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content) as T;
}

interface Organization {
  id: string;
  name: string;
  role: string;
  cost_center: string;
}

interface Department {
  id: string;
  organization_id: string;
  name: string;
}

interface Agent {
  id: string;
  name: string;
  organization_id: string;
  department_id: string | null;
  management_level: number;
  reports_to_agent_id: string | null;
  capabilities: string[];
  model_policy: {
    preferred_tier: string;
    maximum_tier: string;
    fallback_tiers: string[];
  };
  risk_ceiling: number;
}

interface CostCenter {
  code: string;
  organization_id: string;
  name: string;
}

interface DelegationRule {
  id: string;
  source_org: string;
  target_org: string;
  intent: string;
  allowed_classifications: string[];
  action: 'ALLOW' | 'DENY';
  reason?: string;
  condition?: string;
}

interface ApprovalPolicy {
  risk_level: number;
  name: string;
  human_approval_required: boolean;
  approver_role?: string;
  action: string;
}

describe('HUY AI AGENCY GROUP V2.0 — Architecture Consistency Verification', () => {
  const orgsData = loadConfig<{ organizations: Organization[] }>('organizations.json');
  const deptsData = loadConfig<{ departments: Department[] }>('departments.json');
  const agentsData = loadConfig<{ agents: Agent[] }>('agents.mvp.json');
  const costCentersData = loadConfig<{ cost_centers: CostCenter[] }>('cost_centers.json');
  const delegationData = loadConfig<{ rules: DelegationRule[]; default_policy: string }>('delegation_matrix.json');
  const approvalData = loadConfig<{ policies: ApprovalPolicy[] }>('approval_policies.json');

  test('Organization Count & Canonical IDs (Exact 6 BUs)', () => {
    assert.strictEqual(orgsData.organizations.length, 6, 'Must have exactly 6 canonical organizations');
    const expectedOrgIds = [
      'org-01-huytech',
      'org-02-aischool',
      'org-03-smarttax',
      'org-04-media-tech',
      'org-05-media-edu',
      'org-06-media-creative'
    ];
    const actualOrgIds = orgsData.organizations.map((o) => o.id);
    assert.deepStrictEqual(actualOrgIds, expectedOrgIds, 'Canonical organization IDs must match exactly');
  });

  test('Departments have unique IDs and valid organization references', () => {
    assert.strictEqual(deptsData.departments.length, 65, 'Must have exactly 65 canonical departments');
    const deptIds = new Set<string>();
    const validOrgIds = new Set(orgsData.organizations.map((o) => o.id));

    for (const dept of deptsData.departments) {
      assert.ok(!deptIds.has(dept.id), `Duplicate department ID: ${dept.id}`);
      deptIds.add(dept.id);
      assert.ok(validOrgIds.has(dept.organization_id), `Orphan department ${dept.id} references invalid org ${dept.organization_id}`);
    }
  });

  test('MVP Agent Roster Count & Level Distribution (Exact 25 Agents)', () => {
    assert.strictEqual(agentsData.agents.length, 25, 'Must have exactly 25 MVP logical agents');

    const l4 = agentsData.agents.filter((a) => a.management_level === 4);
    const l3 = agentsData.agents.filter((a) => a.management_level === 3);
    const l2 = agentsData.agents.filter((a) => a.management_level === 2);
    const l1 = agentsData.agents.filter((a) => a.management_level === 1);

    assert.strictEqual(l4.length, 1, 'Must have exactly 1 L4 Group Executive Orchestrator');
    assert.strictEqual(l3.length, 6, 'Must have exactly 6 L3 Company Orchestrators (1 per BU)');
    assert.strictEqual(l2.length, 9, 'Must have exactly 9 L2 Department Managers');
    assert.strictEqual(l1.length, 9, 'Must have exactly 9 L1 Specialists');
  });

  test('Reporting Hierarchy Graph is Strictly Acyclic and Hierarchical', () => {
    const agentMap = new Map<string, Agent>();
    for (const agent of agentsData.agents) {
      assert.ok(!agentMap.has(agent.id), `Duplicate agent ID: ${agent.id}`);
      agentMap.set(agent.id, agent);
    }

    // 1. Check L4 has no supervisor
    const l4 = agentsData.agents.find((a) => a.management_level === 4);
    assert.ok(l4, 'L4 agent must exist');
    assert.strictEqual(l4.reports_to_agent_id, null, 'L4 agent reports_to must be null');

    // 2. Check all L3 report to L4
    const l3List = agentsData.agents.filter((a) => a.management_level === 3);
    for (const l3 of l3List) {
      assert.strictEqual(l3.reports_to_agent_id, l4.id, `L3 agent ${l3.id} must report to L4 agent (${l4.id})`);
    }

    // 3. Check all L2 report to their same-org L3 orchestrator
    const l2List = agentsData.agents.filter((a) => a.management_level === 2);
    for (const l2 of l2List) {
      assert.ok(l2.reports_to_agent_id, `L2 agent ${l2.id} must have reports_to`);
      const parent = agentMap.get(l2.reports_to_agent_id);
      assert.ok(parent, `L2 agent ${l2.id} references missing parent ${l2.reports_to_agent_id}`);
      assert.strictEqual(parent.management_level, 3, `L2 agent ${l2.id} must report to an L3 agent`);
      assert.strictEqual(parent.organization_id, l2.organization_id, `L2 agent ${l2.id} cannot report across organizations`);
    }

    // 4. Check all L1 report to a valid L2 department manager
    const l1List = agentsData.agents.filter((a) => a.management_level === 1);
    for (const l1 of l1List) {
      assert.ok(l1.reports_to_agent_id, `L1 agent ${l1.id} must have reports_to`);
      const parent = agentMap.get(l1.reports_to_agent_id);
      assert.ok(parent, `L1 agent ${l1.id} references missing parent ${l1.reports_to_agent_id}`);
      assert.strictEqual(parent.management_level, 2, `L1 agent ${l1.id} must report to an L2 agent`);
      assert.strictEqual(parent.organization_id, l1.organization_id, `L1 agent ${l1.id} cannot report across organizations`);
    }

    // 5. Check graph is completely acyclic
    for (const agent of agentsData.agents) {
      const visited = new Set<string>();
      let curr: Agent | undefined = agent;
      while (curr && curr.reports_to_agent_id) {
        assert.ok(!visited.has(curr.id), `Cycle detected in reports_to hierarchy at agent ${curr.id}`);
        visited.add(curr.id);
        curr = agentMap.get(curr.reports_to_agent_id);
      }
    }
  });

  test('Department Assignment Rules (L4/L3 may be null; L2/L1 MUST have valid dept)', () => {
    const deptSet = new Set(deptsData.departments.map((d) => d.id));

    for (const agent of agentsData.agents) {
      if (agent.management_level >= 3) {
        assert.strictEqual(agent.department_id, null, `Level ${agent.management_level} agent ${agent.id} should have null department_id`);
      } else {
        assert.ok(agent.department_id, `Level ${agent.management_level} agent ${agent.id} must have valid department_id`);
        assert.ok(deptSet.has(agent.department_id), `Agent ${agent.id} references non-existent department ${agent.department_id}`);
      }
    }
  });

  test('Cost Center Model Integrity (Exact 6 Cost Centers Matching Orgs)', () => {
    assert.strictEqual(costCentersData.cost_centers.length, 6, 'Must have exactly 6 cost centers');
    const orgCostCenters = new Map(orgsData.organizations.map((o) => [o.id, o.cost_center]));

    for (const cc of costCentersData.cost_centers) {
      assert.strictEqual(cc.code, orgCostCenters.get(cc.organization_id), `Cost center mismatch for org ${cc.organization_id}`);
    }
  });

  test('Policy Decision Logic: Default Deny, Isolation, and Approval Gates', () => {
    // Conceptual Policy Engine Simulator based on canonical rules
    function evaluatePolicy(req: {
      source_org: string;
      target_org: string;
      intent: string;
      classification: string;
      risk_level?: number;
      action_type?: string;
      approval_status?: string;
    }): { decision: 'ALLOW' | 'DENY' | 'REQUIRE_APPROVAL'; reason: string } {
      // Rule: Default Deny
      if (!req.source_org || !req.target_org) {
        return { decision: 'DENY', reason: 'Missing organization coordinates' };
      }

      // Rule: Media querying SmartTax confidential or restricted data is strictly DENIED
      if (
        ['org-04-media-tech', 'org-05-media-edu', 'org-06-media-creative'].includes(req.source_org) &&
        req.target_org === 'org-03-smarttax' &&
        ['CONFIDENTIAL', 'RESTRICTED'].includes(req.classification)
      ) {
        return { decision: 'DENY', reason: 'Media agents strictly forbidden from querying SmartTax confidential or restricted records' };
      }

      // Rule: Media accessing AI School confidential student/teacher data is strictly DENIED
      if (
        ['org-04-media-tech', 'org-05-media-edu', 'org-06-media-creative'].includes(req.source_org) &&
        req.target_org === 'org-02-aischool' &&
        req.classification === 'CONFIDENTIAL'
      ) {
        return { decision: 'DENY', reason: 'Media agents strictly forbidden from accessing AI School confidential student/teacher data' };
      }

      // Rule: Risk 4 requires human owner approval
      if (req.risk_level === 4) {
        return { decision: 'REQUIRE_APPROVAL', reason: 'Risk Level 4 operations require mandatory Human System Owner approval' };
      }

      // Rule: Risk 3 or public social publishing requires human editorial approval
      if (req.risk_level === 3 || req.action_type === 'tool.social.publish') {
        if (req.approval_status !== 'APPROVED') {
          return { decision: 'REQUIRE_APPROVAL', reason: 'Risk Level 3 and public publishing require human editorial approval' };
        }
      }

      // Rule: Cross-org delegation allowed only if matching explicit ALLOW rule
      const rule = delegationData.rules.find(
        (r) =>
          (r.source_org === req.source_org || r.source_org === '*') &&
          (r.target_org === req.target_org || r.target_org === '*') &&
          (r.intent === req.intent || r.intent === '*') &&
          r.allowed_classifications.includes(req.classification)
      );

      if (rule) {
        if (rule.action === 'ALLOW') {
          return { decision: 'ALLOW', reason: rule.condition || 'Authorized delegation rule' };
        }
        return { decision: 'DENY', reason: rule.reason || 'Explicit deny rule' };
      }

      return { decision: 'DENY', reason: 'Default Deny: No explicit matching delegation policy' };
    }

    // 1. Unknown flow -> DENY
    const unknownResult = evaluatePolicy({
      source_org: 'org-06-media-creative',
      target_org: 'org-02-aischool',
      intent: 'UNKNOWN_ACTION',
      classification: 'INTERNAL'
    });
    assert.strictEqual(unknownResult.decision, 'DENY', 'Unknown requests must default to DENY');

    // 2. Media -> SmartTax raw access -> DENY
    const mediaToTaxRaw = evaluatePolicy({
      source_org: 'org-04-media-tech',
      target_org: 'org-03-smarttax',
      intent: 'READ_CLIENT_LEDGER',
      classification: 'RESTRICTED'
    });
    assert.strictEqual(mediaToTaxRaw.decision, 'DENY', 'Media querying SmartTax RESTRICTED data must be DENIED');

    // 3. Media -> AI School confidential -> DENY
    const mediaToSchoolConf = evaluatePolicy({
      source_org: 'org-05-media-edu',
      target_org: 'org-02-aischool',
      intent: 'READ_STUDENT_SCORES',
      classification: 'CONFIDENTIAL'
    });
    assert.strictEqual(mediaToSchoolConf.decision, 'DENY', 'Media accessing student confidential data must be DENIED');

    // 4. Valid PUBLIC_APPROVED delegation -> ALLOW
    const validDelegation = evaluatePolicy({
      source_org: 'org-02-aischool',
      target_org: 'org-05-media-edu',
      intent: 'GENERATE_CAMPAIGN_MEDIA',
      classification: 'PUBLIC'
    });
    assert.strictEqual(validDelegation.decision, 'ALLOW', 'Valid PUBLIC_APPROVED delegation must be ALLOWED');

    // 5. Social publishing unapproved -> REQUIRE_APPROVAL
    const publishUnapproved = evaluatePolicy({
      source_org: 'org-04-media-tech',
      target_org: 'org-04-media-tech',
      intent: 'PUBLISH_YOUTUBE',
      classification: 'PUBLIC',
      action_type: 'tool.social.publish',
      approval_status: 'PENDING'
    });
    assert.strictEqual(publishUnapproved.decision, 'REQUIRE_APPROVAL', 'Unapproved publishing must REQUIRE_APPROVAL');

    // 6. Risk 4 operation -> REQUIRE_APPROVAL
    const risk4Op = evaluatePolicy({
      source_org: 'org-03-smarttax',
      target_org: 'org-03-smarttax',
      intent: 'SUBMIT_FORMAL_TAX_RETURN',
      classification: 'RESTRICTED',
      risk_level: 4
    });
    assert.strictEqual(risk4Op.decision, 'REQUIRE_APPROVAL', 'Risk Level 4 must REQUIRE_APPROVAL');
  });
});
