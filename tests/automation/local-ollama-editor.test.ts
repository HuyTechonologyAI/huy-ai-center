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
  parseLocalPatchEnvelope,
  materializeLocalPatchOperations,
  normalizeLocalPatchOperationsForPolicy,
  validateGeneratedTestQuality,
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

test('local patch envelope supports bounded append, replace and create operations', () => {
  const parsed = parseLocalPatchEnvelope(JSON.stringify({
    operations: [
      { op: 'append_text', path: 'tests/safe/a.txt', text: 'three\n' },
      { op: 'replace_text', path: 'tests/safe/b.txt', oldText: 'OLD', newText: 'NEW' },
      { op: 'create_file', path: 'tests/safe/new.txt', content: 'created\n' },
    ],
  }));
  assert.ok(parsed);
  assert.equal(parsed.operations.length, 3);
});

test('local patch operations materialize concise edits and fail closed on ambiguous replace', () => {
  const root = mkdtempSync(join(tmpdir(), 'ollama-editor-patch-'));
  mkdirSync(join(root, 'tests', 'safe'), { recursive: true });
  writeFileSync(join(root, 'tests', 'safe', 'a.txt'), 'one\ntwo\n');
  writeFileSync(join(root, 'tests', 'safe', 'b.txt'), 'prefix OLD suffix\n');

  const edits = materializeLocalPatchOperations(root, [
    { op: 'append_text', path: 'tests/safe/a.txt', text: 'three\n' },
    { op: 'replace_text', path: 'tests/safe/b.txt', oldText: 'OLD', newText: 'NEW' },
    { op: 'create_file', path: 'tests/safe/new.txt', content: 'created\n' },
  ]);
  assert.deepEqual(edits, [
    { path: 'tests/safe/a.txt', content: 'one\ntwo\nthree\n' },
    { path: 'tests/safe/b.txt', content: 'prefix NEW suffix\n' },
    { path: 'tests/safe/new.txt', content: 'created\n' },
  ]);

  writeFileSync(join(root, 'tests', 'safe', 'ambiguous.txt'), 'OLD x OLD\n');
  assert.throws(() => materializeLocalPatchOperations(root, [
    { op: 'replace_text', path: 'tests/safe/ambiguous.txt', oldText: 'OLD', newText: 'NEW' },
  ]), /LOCAL_PATCH_REPLACE_AMBIGUOUS/);
});

test('TEST_FILES_ONLY policy rejects README edits and permits recognized test files', () => {
  const root = mkdtempSync(join(tmpdir(), 'ollama-editor-test-policy-'));
  mkdirSync(join(root, 'tests', 'fixture'), { recursive: true });
  writeFileSync(join(root, 'tests', 'fixture', 'README.md'), 'baseline\n');

  assert.throws(() => validateLocalFileEdits({
    worktreePath: root,
    edits: [{ path: 'tests/fixture/README.md', content: 'changed\n' }],
    allowedPaths: ['tests/fixture/'],
    forbiddenPaths: [],
    maxChangedLines: 20,
    writePolicy: 'TEST_FILES_ONLY',
  }), /LOCAL_EDIT_TEST_FILE_REQUIRED/);

  const allowed = validateLocalFileEdits({
    worktreePath: root,
    edits: [{ path: 'tests/fixture/acceptance.test.mjs', content: "import test from 'node:test';\nimport assert from 'node:assert/strict';\nimport { existsSync } from 'node:fs';\ntest('fixture',()=>assert.equal(typeof existsSync,'function'));\n" }],
    allowedPaths: ['tests/fixture/'],
    forbiddenPaths: [],
    maxChangedLines: 20,
    writePolicy: 'TEST_FILES_ONLY',
  });
  assert.equal(allowed.edits[0].path, 'tests/fixture/acceptance.test.mjs');
});

test('TEST_FILES_ONLY may normalize append-to-missing test file into create without relaxing general edits', () => {
  const root = mkdtempSync(join(tmpdir(), 'ollama-editor-normalize-'));
  mkdirSync(join(root, 'tests', 'fixture'), { recursive: true });
  const op = { op: 'append_text' as const, path: 'tests/fixture/acceptance.test.mjs', text: 'export {};\n' };

  assert.deepEqual(
    normalizeLocalPatchOperationsForPolicy(root, [op], 'TEST_FILES_ONLY'),
    [{ op: 'create_file', path: op.path, content: op.text }]
  );
  assert.deepEqual(
    normalizeLocalPatchOperationsForPolicy(root, [op], 'ANY_ALLOWED'),
    [op]
  );
});


test('generated JS/TS test quality gate rejects framework drift, comments-only assertions and tautologies', () => {
  assert.throws(
    () => validateGeneratedTestQuality('tests/x.test.ts', "import { describe, it, expect } from 'node:test';\nimport assert from 'node:assert/strict';\n// assert.ok(config)\n"),
    /LOCAL_TEST_INVALID_NODE_IMPORT/
  );
  assert.throws(
    () => validateGeneratedTestQuality('tests/x.test.ts', "import test from 'node:test';\nimport assert from 'node:assert/strict';\ntest('x',()=>{ \/\/ assert.ok(config)\n});\n"),
    /LOCAL_TEST_ASSERTION_REQUIRED/
  );
  assert.throws(
    () => validateGeneratedTestQuality('tests/x.test.ts', "import test from 'node:test';\nimport assert from 'node:assert/strict';\ntest('x',()=>assert.ok(true));\n"),
    /LOCAL_TEST_TAUTOLOGY_DENIED/
  );
  assert.doesNotThrow(
    () => validateGeneratedTestQuality('tests/x.test.ts', "import test from 'node:test';\nimport assert from 'node:assert/strict';\nimport { existsSync } from 'node:fs';\ntest('x',()=>assert.equal(existsSync('config/model-gateway/routing-policy.json'),false));\n")
  );
});
