import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  HAIP_VERSION,
  HaipEnvelopeSchema,
  HaipAgentCardSchema,
  HaipTaskStateSchema,
  HaipApprovalDecisionSchema,
  type HaipEnvelope,
  type HaipAgentCard
} from './haip.js';

test('HAIP Envelope: validates valid canonical envelope', () => {
  const validEnvelope: HaipEnvelope = {
    haip_version: HAIP_VERSION,
    message_id: '11111111-1111-4111-8111-111111111111',
    conversation_id: '22222222-2222-4222-8222-222222222222',
    task_id: '33333333-3333-4333-8333-333333333333',
    parent_task_id: null,
    type: 'TASK',
    sender: {
      type: 'orchestrator',
      id: 'master-orchestrator'
    },
    recipient: {
      type: 'agent',
      id: 'teacher-ai-worker'
    },
    intent: 'generate_lesson_plan',
    priority: 'high',
    input_refs: [],
    constraints: {
      required_capabilities: ['lesson_planning']
    },
    expected_outputs: [
      { name: 'lesson_plan_doc', type: 'markdown' }
    ],
    budget: {
      max_cost_usd: 0.15,
      max_tokens: 4000,
      prefer_local: true
    },
    risk: {
      level: 1,
      production: false,
      financial: false,
      external_action: false
    },
    limits: {
      max_hops: 8,
      max_retries: 3,
      max_review_cycles: 2
    },
    trace: {
      hop: 0,
      route_history: ['master-orchestrator']
    },
    payload: {
      subject: 'Toán',
      grade: '10',
      topic: 'Hàm số bậc hai'
    },
    created_at: new Date().toISOString()
  };

  const parsed = HaipEnvelopeSchema.parse(validEnvelope);
  assert.equal(parsed.haip_version, 'HAIP/1.0');
  assert.equal(parsed.type, 'TASK');
  assert.equal(parsed.risk.level, 1);
});

test('HAIP Envelope: rejects invalid message type', () => {
  assert.throws(() => {
    HaipEnvelopeSchema.parse({
      haip_version: 'HAIP/1.0',
      message_id: '11111111-1111-4111-8111-111111111111',
      conversation_id: '22222222-2222-4222-8222-222222222222',
      task_id: '33333333-3333-4333-8333-333333333333',
      type: 'UNKNOWN_TYPE_XYZ',
      sender: { type: 'agent', id: 'a1' },
      recipient: { type: 'agent', id: 'a2' },
      intent: 'test',
      priority: 'normal',
      budget: { max_cost_usd: 0, max_tokens: 100, prefer_local: true },
      risk: { level: 0, production: false, financial: false, external_action: false },
      limits: { max_hops: 8, max_retries: 3, max_review_cycles: 2 },
      trace: { hop: 0 },
      created_at: new Date().toISOString()
    });
  });
});

test('HAIP Agent Card: validates capability-based card', () => {
  const card: HaipAgentCard = {
    agent_id: 'teacher-ai-node-01',
    name: 'Teacher AI Autonomous Agent',
    version: '1.2.0',
    description: 'Autonomous lesson plan and educational material synthesizer',
    capabilities: ['lesson_planning', 'slide_generation', 'quiz_synthesis'],
    accepted_inputs: [
      { type: 'curriculum_requirement', required: true }
    ],
    output_types: [
      { type: 'lesson_plan', mime_type: 'text/markdown' },
      { type: 'slides_json', mime_type: 'application/json' }
    ],
    runtime: {
      type: 'node_worker',
      target_node: 'huy-ai-node-01',
      memory_mb: 2048,
      timeout_seconds: 300
    },
    risk_ceiling: 1,
    max_parallel_tasks: 2,
    health_status: 'healthy',
    configuration: {
      default_model_preference: ['qwen2.5:7b-instruct-q4_K_M', 'gemini-1.5-flash']
    },
    metadata: {
      author: 'HUY TECHNOLOGY AI CENTER'
    }
  };

  const parsed = HaipAgentCardSchema.parse(card);
  assert.equal(parsed.agent_id, 'teacher-ai-node-01');
  assert.equal(parsed.risk_ceiling, 1);
  assert.deepEqual(parsed.capabilities, ['lesson_planning', 'slide_generation', 'quiz_synthesis']);
});

test('HAIP Task State Machine: verifies canonical and failure states', () => {
  const canonicalStates = [
    'CREATED', 'PLANNING', 'QUEUED', 'CLAIMED', 'RUNNING',
    'REVIEWING', 'CORRECTING', 'FINALIZING', 'AWAITING_APPROVAL', 'APPROVED', 'COMPLETED'
  ];
  for (const s of canonicalStates) {
    assert.equal(HaipTaskStateSchema.parse(s), s);
  }

  const failureStates = ['RETRY_WAIT', 'BLOCKED', 'FAILED', 'CANCELLED', 'EXPIRED'];
  for (const s of failureStates) {
    assert.equal(HaipTaskStateSchema.parse(s), s);
  }
});

test('HAIP Human Approval: verifies supported decisions', () => {
  const decisions = ['APPROVE', 'REJECT', 'REQUEST_REVISION'];
  for (const d of decisions) {
    assert.equal(HaipApprovalDecisionSchema.parse(d), d);
  }
});
