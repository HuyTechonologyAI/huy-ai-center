import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  HaipMessageTypeSchema,
  HaipTaskStateSchema,
  HaipApprovalStatusSchema,
  HaipNumericPrioritySchema,
  HaipRiskLevelSchema,
  haipPriorityToNumber,
  numberToHaipPriority
} from './haip.js';

test('DB-Contract Parity: 12 Canonical HAIP Message Types', () => {
  const sqlMessageTypes = [
    'TASK', 'PLAN', 'CLAIM', 'DELEGATE', 'TOOL_CALL', 'RESULT',
    'REVIEW', 'CORRECTION', 'STATE_UPDATE', 'ERROR',
    'FINAL_CANDIDATE', 'APPROVAL_REQUEST'
  ];

  assert.equal(HaipMessageTypeSchema.options.length, 12);
  for (const t of sqlMessageTypes) {
    assert.equal(HaipMessageTypeSchema.parse(t), t);
  }
  assert.deepEqual([...HaipMessageTypeSchema.options].sort(), [...sqlMessageTypes].sort());
});

test('DB-Contract Parity: 16 Canonical and Control Task States', () => {
  const sqlTaskStates = [
    'CREATED', 'PLANNING', 'QUEUED', 'CLAIMED', 'RUNNING',
    'REVIEWING', 'CORRECTING', 'FINALIZING', 'AWAITING_APPROVAL',
    'APPROVED', 'COMPLETED', 'RETRY_WAIT', 'BLOCKED', 'FAILED',
    'CANCELLED', 'EXPIRED'
  ];

  assert.equal(HaipTaskStateSchema.options.length, 16);
  for (const s of sqlTaskStates) {
    assert.equal(HaipTaskStateSchema.parse(s), s);
  }
  assert.deepEqual([...HaipTaskStateSchema.options].sort(), [...sqlTaskStates].sort());
});

test('DB-Contract Parity: Approval Statuses', () => {
  const sqlApprovalStatuses = [
    'NOT_REQUIRED', 'PENDING', 'APPROVED', 'REJECTED', 'REVISION_REQUESTED'
  ];

  assert.equal(HaipApprovalStatusSchema.options.length, 5);
  for (const a of sqlApprovalStatuses) {
    assert.equal(HaipApprovalStatusSchema.parse(a), a);
  }
  assert.deepEqual([...HaipApprovalStatusSchema.options].sort(), [...sqlApprovalStatuses].sort());
});

test('DB-Contract Parity: Numeric Priority (1-5)', () => {
  for (const p of [1, 2, 3, 4, 5]) {
    assert.equal(HaipNumericPrioritySchema.parse(p), p);
  }
  assert.throws(() => HaipNumericPrioritySchema.parse(0));
  assert.throws(() => HaipNumericPrioritySchema.parse(6));
  assert.throws(() => HaipNumericPrioritySchema.parse(-1));

  // Verify mappings
  assert.equal(haipPriorityToNumber('urgent'), 1);
  assert.equal(haipPriorityToNumber('high'), 2);
  assert.equal(haipPriorityToNumber('normal'), 3);
  assert.equal(haipPriorityToNumber('low'), 4);

  assert.equal(numberToHaipPriority(1), 'urgent');
  assert.equal(numberToHaipPriority(2), 'high');
  assert.equal(numberToHaipPriority(3), 'normal');
  assert.equal(numberToHaipPriority(4), 'normal');
  assert.equal(numberToHaipPriority(5), 'low');
});

test('DB-Contract Parity: Risk Levels (0-4)', () => {
  for (const r of [0, 1, 2, 3, 4]) {
    assert.equal(HaipRiskLevelSchema.parse(r), r);
  }
  assert.throws(() => HaipRiskLevelSchema.parse(-1));
  assert.throws(() => HaipRiskLevelSchema.parse(5));
});
