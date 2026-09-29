import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  changedLineBudget,
  validateLocalFileEdits,
  applyValidatedLocalEdits,
  parseLocalEditEnvelope,
} from '../../automation/agent-bridge/src/local-ollama-editor.js';

test('local editor parses exact structured JSON and rejects malformed payloads', () => {
  assert.deepEqual(
    parseLocalEditEnvelope('{"edits":[{"path":"tests/x.txt","content":"ok\\n"}]}'),
    { edits: [{ path: 'tests/x.txt', content: 'ok\n' }] }
  );
  assert.equal(parseLocalEditEnvelope('not-json'), null);
  assert.equal(parseLocalEditEnvelope('{"edits":"wrong"}'), null);
});

test('changed line budget is bounded and preserves unchanged prefix/suffix', () => {
  assert.equal(changedLineBudget('a\nb\nc\n', 'a\nb\nX\nc\n'), 1);
  assert.equal(changedLineBudget('a\nb\nc\n', 'a\nB\nc\n'), 2);
  assert.equal(changedLineBudget('same\n', 'same\n'), 0);
});

test('local editor rejects traversal, forbidden paths, symlink escapes and oversized edits', () => {
  const root = mkdtempSync(join(tmpdir(), 'ollama-editor-'));
  mkdirSync(join(root, 'tests', 'safe'), { recursive: true });
  writeFileSync(join(root, 'tests', 'safe', 'a.txt'), 'one\ntwo\n');

  assert.throws(() => validateLocalFileEdits({
    worktreePath: root,
    edits: [{ path: '../escape.txt', content: 'x' }],
    allowedPaths: ['tests/safe/'],
    forbiddenPaths: ['.env*'],
    maxChangedLines: 20,
  }), /LOCAL_EDIT_PATH_INVALID/);

  assert.throws(() => validateLocalFileEdits({
    worktreePath: root,
    edits: [{ path: '.env.secret', content: 'x' }],
    allowedPaths: ['.env.secret'],
    forbiddenPaths: ['.env*'],
    maxChangedLines: 20,
  }), /LOCAL_EDIT_FORBIDDEN/);

  assert.throws(() => validateLocalFileEdits({
    worktreePath: root,
    edits: [{ path: 'tests/safe/a.txt', content: Array.from({ length: 30 }, (_, i) => String(i)).join('\n') }],
    allowedPaths: ['tests/safe/'],
    forbiddenPaths: [],
    maxChangedLines: 10,
  }), /LOCAL_EDIT_BUDGET_EXCEEDED/);
});

test('validated local edits apply only inside scope', () => {
  const root = mkdtempSync(join(tmpdir(), 'ollama-editor-'));
  mkdirSync(join(root, 'tests', 'safe'), { recursive: true });
  writeFileSync(join(root, 'tests', 'safe', 'a.txt'), 'one\ntwo\n');

  const validated = validateLocalFileEdits({
    worktreePath: root,
    edits: [
      { path: 'tests/safe/a.txt', content: 'one\ntwo\nthree\n' },
      { path: 'tests/safe/new.txt', content: 'new\n' },
    ],
    allowedPaths: ['tests/safe/'],
    forbiddenPaths: ['.env*'],
    maxChangedLines: 20,
  });
  assert.equal(validated.changedLines, 2);
  applyValidatedLocalEdits(root, validated.edits);
  assert.equal(readFileSync(join(root, 'tests', 'safe', 'a.txt'), 'utf8'), 'one\ntwo\nthree\n');
  assert.equal(readFileSync(join(root, 'tests', 'safe', 'new.txt'), 'utf8'), 'new\n');
});

test('local editor rejects a symlink component even when it points inside the repository', () => {
  const root = mkdtempSync(join(tmpdir(), 'ollama-editor-'));
  mkdirSync(join(root, 'tests', 'real'), { recursive: true });
  writeFileSync(join(root, 'tests', 'real', 'a.txt'), 'safe\n');
  symlinkSync(join(root, 'tests', 'real'), join(root, 'tests', 'linked'));

  assert.throws(() => validateLocalFileEdits({
    worktreePath: root,
    edits: [{ path: 'tests/linked/a.txt', content: 'changed\n' }],
    allowedPaths: ['tests/'],
    forbiddenPaths: [],
    maxChangedLines: 20,
  }), /LOCAL_EDIT_SYMLINK_DENIED/);
});
