import test from 'node:test';
import assert from 'node:assert/strict';
import { validateRoadmap, decideTask, checkScope } from '../../automation/agent-bridge/a2a-runner.mjs';

const task = (id, depends_on = [], risk = 'R2') => ({ id, depends_on, risk, allowed_paths: ['automation/'] });
const road = tasks => ({ mode: 'SERIAL_FAIL_CLOSED', max_concurrency: 1, tasks });

test('orders a serial DAG and rejects missing dependencies and cycles', () => {
  assert.deepEqual(validateRoadmap(road([task('b', ['a']), task('a')])).map(x => x.id), ['a', 'b']);
  assert.throws(() => validateRoadmap(road([task('a', ['missing'])])), /MISSING_DEPENDENCY/);
  assert.throws(() => validateRoadmap(road([task('a', ['b']), task('b', ['a'])])), /DAG_CYCLE/);
  assert.throws(() => validateRoadmap({ ...road([task('a')]), max_concurrency: 2 }), /ROADMAP_POLICY/);
});

test('halts at human gates and dependencies', () => {
  assert.equal(decideTask(task('a', [], 'R4'), new Set()), 'HUMAN_GATE');
  assert.equal(decideTask(task('b', ['a']), new Set()), 'BLOCKED');
  assert.equal(decideTask(task('b', ['a']), new Set(['a'])), 'READY');
});

test('enforces allowed scope and production denial', () => {
  checkScope(['automation/x.ts'], ['automation/']);
  assert.throws(() => checkScope(['supabase/migrations/x.sql'], ['supabase/']), /SCOPE_VIOLATION/);
  assert.throws(() => checkScope(['.env'], ['.env']), /SCOPE_VIOLATION/);
  assert.throws(() => checkScope(['apps/x.ts'], ['automation/']), /SCOPE_VIOLATION/);
});
