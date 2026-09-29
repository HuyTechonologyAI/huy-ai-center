import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { dirname, isAbsolute, resolve, sep } from 'node:path';
import { spawnSync } from 'node:child_process';
import { redact } from './log-redactor.js';

const LOCAL_OLLAMA_HOST = process.env.HUY_AI_OLLAMA_HOST?? 'http://127.0.0.1:11434';
const LOCAL_OLLAMA_MODEL = process.env.HUY_AI_LOCAL_MODEL ?? 'qwen2.5-coder:3b';
const MAX_SNAPSHOT_BYTES = 16 * 1024;
const MAX_FILE_BYTES = 12 * 1024;
const MAX_EDIT_FILE_BYTES = 64 * 1024;

export interface LocalFileEdit {
  path: string;
  content: string;
}

export type LocalPatchOperation =
  | { op: 'append_text'; path: string; text: string }
  | { op: 'replace_text'; path: string; oldText: string; newText: string }
  | { op: 'create_file'; path: string; content: string };

export interface ValidatedLocalEdits {
  edits: LocalFileEdit[];
  changedLines: number;
}

export function validateGeneratedTestQuality(path: string, content: string): void {
  if (!/\.(?:[cm]?[jt]sx?|mts|cts)$/i.test(path)) return;
  if (!/from\s+['"]node:test['"]|require\(['"]node:test['"]\)/.test(content)) {
    throw new Error(`LOCAL_TEST_NODE_RUNNER_REQUIRED:${path}`);
  }
  if (!/node:assert\/strict/.test(content)) {
    throw new Error(`LOCAL_TEST_ASSERT_LIBRARY_REQUIRED:${path}`);
  }
  if (/from\s+['"](?:vitest|jest|mocha)['"]|require\(['"](?:vitest|jest|mocha)['"]\)/i.test(content)) {
    throw new Error(`LOCAL_TEST_EXTERNAL_FRAMEWORK_DENIED:${path}`);
  }
  if (/import\s*\{[^}]*\bexpect\b[^}]*\}\s*from\s*['"]node:test['"]/s.test(content)) {
    throw new Error(`LOCAL_TEST_INVALID_NODE_IMPORT:${path}`);
  }
  const executable = content
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .map(line => line.replace(/\/\/.*$/, ''))
    .join('\n');
  if (!/\bassert(?:\.[A-Za-z_$][\w$]*)?\s*\(/.test(executable)) {
    throw new Error(`LOCAL_TEST_ASSERTION_REQUIRED:${path}`);
  }
  if (/\bassert\.(?:ok)\s*\(\s*true\s*\)|\bassert\.(?:equal|strictEqual)\s*\(\s*true\s*,\s*true\s*\)/.test(executable)) {
    throw new Error(`LOCAL_TEST_TAUTOLOGY_DENIED:${path}`);
  }
  if (!/(?:from\s+['"]\.\.?\/|require\(['"]\.\.?\/|import\(['"]\.\.?\/|node:fs)/.test(executable)) {
    throw new Error(`LOCAL_TEST_IMPLEMENTATION_REFERENCE_REQUIRED:${path}`);
  }
}

export interface LocalOllamaEditRequest {
  prompt: string;
  worktreePath: string;
  allowedPaths: string[];
  forbiddenPaths: string[];
  timeoutMs: number;
  maxChangedLines: number;
  writePolicy?: 'ANY_ALLOWED' | 'TEST_FILES_ONLY';
}

export interface LocalOllamaEditResult {
  success: boolean;
  output: string;
  error: string;
  changedFiles: string[];
}

function normalizeRepoPath(value: string): string {
  return value.replace(/\\/g, '/').replace(/^\.\//, '');
}

function globToRegex(pattern: string): RegExp {
  const normalized = normalizeRepoPath(pattern);
  let escaped = '';
  for (const ch of normalized) {
    if (ch === '*') {
      escaped += '.*';
    } else if ('\\^$.*+?()[]{}|'.includes(ch)) {
      escaped += '\\' + ch;
    } else {
      escaped += ch;
    }
  }
  return new RegExp('^' + escaped + '$');
}

function matchesPattern(path: string, pattern: string): boolean {
  const p = normalizeRepoPath(path);
  const normalized = normalizeRepoPath(pattern);
  if (normalized.includes('*')) return globToRegex(normalized).test(p);
  if (normalized.endsWith('/')) return p.startsWith(normalized);
  return p === normalized || p.startsWith(`${normalized}/`);
}

export function isRecognizedTestFilePath(filePath: string): boolean {
  const normalized = normalizeRepoPath(filePath);
  const base = normalized.split('/').at(-1)?.toLowerCase() ?? '';
  return (
    /\.(test|spec)\.[a-z0-9]+$/.test(base) ||
    /^test_.+\.[a-z0-9]+$/.test(base) ||
    /_test\.[a-z0-9]+$/.test(base) ||
    /test\.(java|kt|kts)$/.test(base) ||
    /tests\.(cs|fs)$/.test(base) ||
    base === 'conftest.py' ||
    base.endsWith('.feature') ||
    base.endsWith('.snap')
  );
}

function assertSafePath(worktreePath: string, filePath: string): string {
  const normalized = normalizeRepoPath(filePath);
  if (
    !normalized ||
    normalized.includes('\\0') ||
    isAbsolute(normalized) ||
    normalized.split('/').some(part => part === '..' || part === '')
  ) {
    throw new Error(`LOCAL_EDIT_PATH_INVALID:${redact(filePath)}`);
  }

  const root = resolve(worktreePath);
  const absolute = resolve(root, normalized);
  if (absolute !== root && !absolute.startsWith(root + sep)) {
    throw new Error(`LOCAL_EDIT_PATH_INVALID:${redact(filePath)}`);
  }

  const parts = normalized.split('/');
  let cursor = root;
  for (const part of parts) {
    cursor = resolve(cursor, part);
    if (!existsSync(cursor)) continue;
    const stat = lstatSync(cursor);
    if (stat.isSymbolicLink()) {
      throw new Error(`LOCAL_EDIT_SYMLINK_DENIED:${redact(filePath)}`);
    }
  }

  return normalized;
}

export function parseLocalEditEnvelope(raw: string): { edits: LocalFileEdit[] } | null {
  try {
    const parsed = JSON.parse(raw) as { edits?: unknown };
    if (!Array.isArray(parsed.edits)) return null;
    const edits: LocalFileEdit[] = [];
    for (const edit of parsed.edits) {
      if (!edit || typeof edit !== 'object') return null;
      const candidate = edit as { path?: unknown; content?: unknown };
      if (typeof candidate.path !== 'string' || typeof candidate.content !== 'string') return null;
      edits.push({ path: candidate.path, content: candidate.content });
    }
    return { edits };
  } catch {
    return null;
  }
}

export function parseLocalPatchEnvelope(raw: string): { operations: LocalPatchOperation[] } | null {
  try {
    const parsed = JSON.parse(raw) as { operations?: unknown };
    if (!Array.isArray(parsed.operations) || parsed.operations.length === 0 || parsed.operations.length > 12) return null;
    const operations: LocalPatchOperation[] = [];
    for (const item of parsed.operations) {
      if (!item || typeof item !== 'object') return null;
      const op = item as Record<string, unknown>;
      if (op.op === 'append_text' && typeof op.path === 'string' && typeof op.text === 'string') {
        operations.push({ op: 'append_text', path: op.path, text: op.text });
        continue;
      }
      if (
        op.op === 'replace_text' &&
        typeof op.path === 'string' &&
        typeof op.oldText === 'string' &&
        typeof op.newText === 'string' &&
        op.oldText.length > 0
      ) {
        operations.push({ op: 'replace_text', path: op.path, oldText: op.oldText, newText: op.newText });
        continue;
      }
      if (op.op === 'create_file' && typeof op.path === 'string' && typeof op.content === 'string') {
        operations.push({ op: 'create_file', path: op.path, content: op.content });
        continue;
      }
      return null;
    }
    return { operations };
  } catch {
    return null;
  }
}

export function normalizeLocalPatchOperationsForPolicy(
  worktreePath: string,
  operations: LocalPatchOperation[],
  writePolicy: 'ANY_ALLOWED' | 'TEST_FILES_ONLY' = 'ANY_ALLOWED'
): LocalPatchOperation[] {
  if (writePolicy !== 'TEST_FILES_ONLY') return operations;

  return operations.map(operation => {
    if (operation.op !== 'append_text' || !isRecognizedTestFilePath(operation.path)) return operation;
    const path = assertSafePath(worktreePath, operation.path);
    if (existsSync(resolve(worktreePath, path))) return operation;
    return { op: 'create_file', path, content: operation.text };
  });
}

function readPatchFile(worktreePath: string, path: string): string {
  const normalized = assertSafePath(worktreePath, path);
  const absolute = resolve(worktreePath, normalized);
  if (!existsSync(absolute) || !lstatSync(absolute).isFile()) {
    throw new Error(`LOCAL_PATCH_FILE_MISSING:${normalized}`);
  }
  const buffer = readFileSync(absolute);
  if (buffer.includes(0) || buffer.length > MAX_EDIT_FILE_BYTES) {
    throw new Error(`LOCAL_PATCH_FILE_UNSUPPORTED:${normalized}`);
  }
  return buffer.toString('utf8');
}

export function materializeLocalPatchOperations(
  worktreePath: string,
  operations: LocalPatchOperation[]
): LocalFileEdit[] {
  if (!Array.isArray(operations) || operations.length === 0 || operations.length > 12) {
    throw new Error('LOCAL_PATCH_COUNT_INVALID');
  }

  const contentByPath = new Map<string, string>();
  const order: string[] = [];

  const currentContent = (path: string): string => {
    const normalized = assertSafePath(worktreePath, path);
    if (contentByPath.has(normalized)) return contentByPath.get(normalized)!;
    const content = readPatchFile(worktreePath, normalized);
    contentByPath.set(normalized, content);
    order.push(normalized);
    return content;
  };

  for (const operation of operations) {
    const path = assertSafePath(worktreePath, operation.path);
    if (operation.op === 'create_file') {
      const absolute = resolve(worktreePath, path);
      if (existsSync(absolute) || contentByPath.has(path)) {
        throw new Error(`LOCAL_PATCH_CREATE_EXISTS:${path}`);
      }
      if (Buffer.byteLength(operation.content, 'utf8') > MAX_EDIT_FILE_BYTES) {
        throw new Error(`LOCAL_PATCH_CONTENT_TOO_LARGE:${path}`);
      }
      contentByPath.set(path, operation.content);
      order.push(path);
      continue;
    }

    const before = currentContent(path);
    if (operation.op === 'append_text') {
      const next = before.includes(operation.text) ? before : before + operation.text;
      if (Buffer.byteLength(next, 'utf8') > MAX_EDIT_FILE_BYTES) {
        throw new Error(`LOCAL_PATCH_CONTENT_TOO_LARGE:${path}`);
      }
      contentByPath.set(path, next);
      continue;
    }

    const first = before.indexOf(operation.oldText);
    const last = before.lastIndexOf(operation.oldText);
    if (first < 0) throw new Error(`LOCAL_PATCH_REPLACE_MISSING:${path}`);
    if (first !== last) throw new Error(`LOCAL_PATCH_REPLACE_AMBIGUOUS:${path}`);
    const next = before.slice(0, first) + operation.newText + before.slice(first + operation.oldText.length);
    if (Buffer.byteLength(next, 'utf8') > MAX_EDIT_FILE_BYTES) {
      throw new Error(`LOCAL_PATCH_CONTENT_TOO_LARGE:${path}`);
    }
    contentByPath.set(path, next);
  }

  return order.map(path => ({ path, content: contentByPath.get(path)! }));
}

export function changedLineBudget(oldText: string, newText: string): number {
  if (oldText === newText) return 0;
  const before = oldText.split('\n');
  const after = newText.split('\n');

  let prefix = 0;
  while (prefix < before.length && prefix < after.length && before[prefix] === after[prefix]) prefix += 1;

  let suffix = 0;
  while (
    suffix < before.length - prefix &&
    suffix < after.length - prefix &&
    before[before.length - 1 - suffix] === after[after.length - 1 - suffix]
  ) {
    suffix += 1;
  }

  const removed = Math.max(0, before.length - prefix - suffix);
  const added = Math.max(0, after.length - prefix - suffix);
  return removed + added;
}

export function validateLocalFileEdits(params: {
  worktreePath: string;
  edits: LocalFileEdit[];
  allowedPaths: string[];
  forbiddenPaths: string[];
  maxChangedLines: number;
  writePolicy?: 'ANY_ALLOWED' | 'TEST_FILES_ONLY';
}): ValidatedLocalEdits {
  if (!Array.isArray(params.edits) || params.edits.length === 0 || params.edits.length > 12) {
    throw new Error('LOCAL_EDIT_COUNT_INVALID');
  }

  const seen = new Set<string>();
  const validated: LocalFileEdit[] = [];
  let changedLines = 0;

  for (const edit of params.edits) {
    const path = assertSafePath(params.worktreePath, edit.path);
    if (seen.has(path)) throw new Error(`LOCAL_EDIT_DUPLICATE_PATH:${path}`);
    seen.add(path);

    if (params.forbiddenPaths.some(pattern => matchesPattern(path, pattern))) {
      throw new Error(`LOCAL_EDIT_FORBIDDEN:${path}`);
    }
    if (params.allowedPaths.length > 0 && !params.allowedPaths.some(pattern => matchesPattern(path, pattern))) {
      throw new Error(`LOCAL_EDIT_OUT_OF_SCOPE:${path}`);
    }
    if (params.writePolicy === 'TEST_FILES_ONLY') {
      if (!isRecognizedTestFilePath(path)) {
        throw new Error(`LOCAL_EDIT_TEST_FILE_REQUIRED:${path}`);
      }
      validateGeneratedTestQuality(path, edit.content);
    }

    const absolute = resolve(params.worktreePath, path);
    if (Buffer.byteLength(edit.content, 'utf8') > MAX_EDIT_FILE_BYTES) {
      throw new Error(`LOCAL_EDIT_FILE_TOO_LARGE:${path}`);
    }
    if (existsSync(absolute) && !lstatSync(absolute).isFile()) {
      throw new Error(`LOCAL_EDIT_NOT_REGULAR_FILE:${path}`);
    }

    const before = existsSync(absolute) ? readFileSync(absolute, 'utf8') : '';
    changedLines += changedLineBudget(before, edit.content);
    if (changedLines > params.maxChangedLines) {
      throw new Error(`LOCAL_EDIT_BUDGET_EXCEEDED:${changedLines}>${params.maxChangedLines}`);
    }

    validated.push({ path, content: edit.content });
  }

  if (changedLines === 0) throw new Error('LOCAL_EDIT_NO_CHANGE');
  return { edits: validated, changedLines };
}

export function applyValidatedLocalEdits(worktreePath: string, edits: LocalFileEdit[]): void {
  const originals = edits.map(edit => {
    const absolute = resolve(worktreePath, edit.path);
    return {
      absolute,
      existed: existsSync(absolute),
      content: existsSync(absolute) ? readFileSync(absolute) : undefined,
    };
  });

  try {
    for (const edit of edits) {
      const absolute = resolve(worktreePath, edit.path);
      mkdirSync(dirname(absolute), { recursive: true });
      writeFileSync(absolute, edit.content, { encoding: 'utf8', mode: 0o600 });
    }
  } catch (error) {
    for (const original of originals.reverse()) {
      try {
        if (original.existed && original.content) {
          writeFileSync(original.absolute, original.content);
        } else if (!original.existed && existsSync(original.absolute)) {
          rmSync(original.absolute, { force: true });
        }
      } catch {
        // Best-effort rollback; downstream scope verification remains fail-closed.
      }
    }
    throw error;
  }
}

function snapshotAllowedFiles(worktreePath: string, allowedPaths: string[]): string {
  const git = spawnSync('git', [
    'ls-files',
    '--cached',
    '--others',
    '--exclude-standard',
    '--',
    ...allowedPaths,
  ], {
    cwd: worktreePath,
    encoding: 'utf8',
    shell: false,
    timeout: 10_000,
  });

  if (git.status !== 0) {
    throw new Error(`LOCAL_EDIT_SNAPSHOT_FAILED:${redact(git.stderr || git.stdout)}`);
  }

  const files = git.stdout.split('\n').map(x => x.trim()).filter(Boolean).slice(0, 24);
  let used = 0;
  const blocks: string[] = [];

  for (const path of files) {
    const normalized = assertSafePath(worktreePath, path);
    const absolute = resolve(worktreePath, normalized);
    if (!existsSync(absolute) || !lstatSync(absolute).isFile()) continue;
    const buffer = readFileSync(absolute);
    if (buffer.includes(0) || buffer.length > MAX_FILE_BYTES) continue;
    if (used + buffer.length > MAX_SNAPSHOT_BYTES) break;
    used += buffer.length;
    blocks.push(`=== FILE ${normalized} ===\n${buffer.toString('utf8')}\n=== END FILE ===`);
  }

  return blocks.join('\n\n');
}

export async function runOllamaFileEditor(req: LocalOllamaEditRequest): Promise<LocalOllamaEditResult> {
  let snapshot = '';
  if (req.writePolicy !== 'TEST_FILES_ONLY') {
    try {
      snapshot = snapshotAllowedFiles(req.worktreePath, req.allowedPaths);
    } catch (error) {
      return { success: false, output: '', error: redact(String(error)), changedFiles: [] };
    }
  }

  const editorPrompt = [
    'You are a deterministic repository patch editor. You have NO shell and NO tools.',
    'Return JSON only. Do not use Markdown fences.',
    'Preferred output schema: {"operations":[...]} where each operation is exactly one of:',
    '{"op":"append_text","path":"relative/path","text":"TEXT TO APPEND"}',
    '{"op":"replace_text","path":"relative/path","oldText":"EXACT UNIQUE OLD TEXT","newText":"REPLACEMENT"}',
    '{"op":"create_file","path":"relative/path","content":"NEW FILE CONTENT"}',
    'Prefer append_text or replace_text. Do NOT reproduce a full existing file.',
    'Only edit paths explicitly inside Allowed paths. Never edit Forbidden paths.',
    'Preserve existing file content unless the task requires a change.',
    'Create new files only when required by the task.',
    req.writePolicy === 'TEST_FILES_ONLY'
      ? 'WRITE POLICY: TEST_FILES_ONLY. Every edited or created path MUST be a recognized test/spec filename such as *.test.*, *.spec.*, test_*.py, *_test.*, *.feature or *.snap. Do not edit README or implementation files.'
      : 'WRITE POLICY: ANY_ALLOWED within the bounded task scope.',
    `Maximum changed-line budget: ${req.maxChangedLines}.`,
    `Allowed paths: ${req.allowedPaths.join(', ') || 'none'}`,
    `Forbidden paths: ${req.forbiddenPaths.join(', ') || 'none'}`,
    '',
    'TASK INSTRUCTIONS:',
    req.prompt,
    '',
    'CURRENT ALLOWED-SCOPE FILE SNAPSHOTS:',
    req.writePolicy === 'TEST_FILES_ONLY'
      ? '(omitted intentionally: test design is isolated from production source context)'
      : snapshot || '(no tracked text files currently exist in allowed scope)',
  ].join('\n');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), req.timeoutMs);

  try {
    const response = await fetch(`${LOCAL_OLLAMA_HOST.replace(/\/$/, '')}/api/generate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        model: LOCAL_OLLAMA_MODEL,
        prompt: editorPrompt,
        stream: false,
        format: 'json',
        options: {
          temperature: 0,
          num_predict: Math.min(1600, Math.max(512, req.maxChangedLines * 10)),
        },
      }),
      signal: controller.signal,
    });

    const raw = await response.text();
    if (!response.ok) {
      return {
        success: false,
        output: '',
        error: `OLLAMA_EDITOR_HTTP_${response.status}:${redact(raw).slice(-1500)}`,
        changedFiles: [],
      };
    }

    const outer = JSON.parse(raw) as { response?: string; done?: boolean; error?: string };
    if (outer.error || outer.done === false || typeof outer.response !== 'string') {
      return {
        success: false,
        output: '',
        error: `OLLAMA_EDITOR_INVALID_RESPONSE:${redact(outer.error ?? 'incomplete')}`,
        changedFiles: [],
      };
    }

    const patchEnvelope = parseLocalPatchEnvelope(outer.response);
    const legacyEnvelope = patchEnvelope ? null : parseLocalEditEnvelope(outer.response);
    if (!patchEnvelope && !legacyEnvelope) {
      return {
        success: false,
        output: redact(outer.response).slice(-3000),
        error: 'OLLAMA_EDITOR_JSON_INVALID',
        changedFiles: [],
      };
    }

    let validated: ValidatedLocalEdits;
    try {
      const edits = patchEnvelope
        ? materializeLocalPatchOperations(
            req.worktreePath,
            normalizeLocalPatchOperationsForPolicy(
              req.worktreePath,
              patchEnvelope.operations,
              req.writePolicy ?? 'ANY_ALLOWED'
            )
          )
        : legacyEnvelope!.edits;
      validated = validateLocalFileEdits({
        worktreePath: req.worktreePath,
        edits,
        allowedPaths: req.allowedPaths,
        forbiddenPaths: req.forbiddenPaths,
        maxChangedLines: req.maxChangedLines,
        writePolicy: req.writePolicy,
      });
    } catch (error) {
      return {
        success: false,
        output: redact(outer.response).slice(-3000),
        error: redact(String(error)),
        changedFiles: [],
      };
    }

    applyValidatedLocalEdits(req.worktreePath, validated.edits);
    return {
      success: true,
      output: `LOCAL_OLLAMA_EDITOR_APPLIED:${validated.edits.length} files:${validated.changedLines} changed-lines`,
      error: '',
      changedFiles: validated.edits.map(edit => edit.path),
    };
  } catch (error) {
    return {
      success: false,
      output: '',
      error: controller.signal.aborted
        ? 'PROVIDER_TIMEOUT:ollama-editor'
        : `OLLAMA_EDITOR_REQUEST_FAILED:${redact(String(error))}`,
      changedFiles: [],
    };
  } finally {
    clearTimeout(timer);
  }
}
