import { spawnSync } from 'node:child_process';
import { request as httpsRequest } from 'node:https';
import { redact } from './log-redactor.js';

export const ALL_PROVIDER_IDS = [
  'codex',
  'claude',
  'antigravity',
  'gemini',
  'chatgpt',
  'ollama'
] as const;

export type ProviderId = typeof ALL_PROVIDER_IDS[number];
export type AgentRole = 'PLANNER' | 'TEST_DESIGNER' | 'IMPLEMENTER' | 'REVIEWER';
export type ProviderMode = 'READ_ONLY' | 'WORKSPACE_WRITE';
export type ProviderCircuit = 'CLOSED' | 'OPEN';

export interface ProviderHealth {
  id: ProviderId;
  available: boolean;
  authenticated: boolean;
  version?: string;
  circuit: ProviderCircuit;
  consecutiveFailures: number;
  cooldownUntil?: number;
  lastError?: string;
  lastSuccessAt?: number;
  lastProbeAt?: number;
}

export interface ProviderRunRequest {
  provider: ProviderId;
  prompt: string;
  cwd: string;
  mode: ProviderMode;
  timeoutMs?: number;
}

export interface ProviderRunResult {
  provider: ProviderId;
  success: boolean;
  output: string;
  error: string;
  exitCode: number | null;
  authRequired: boolean;
  retryable: boolean;
}

export interface ProviderCommandSpec {
  command: string;
  args: string[];
  env?: NodeJS.ProcessEnv;
  virtual?: boolean;
}

const LOCAL_OLLAMA_BIN = process.env.HUY_AI_OLLAMA_BIN ?? '/mnt/data1/HUY-AI/runtime/ollama/bin/ollama';
const LOCAL_OLLAMA_HOST = process.env.HUY_AI_OLLAMA_HOST ?? 'http://127.0.0.1:11434';
const LOCAL_OLLAMA_MODEL = process.env.HUY_AI_LOCAL_MODEL ?? 'qwen2.5-coder:3b';

export const DEFAULT_ROLE_PRIORITY: Record<AgentRole, ProviderId[]> = {
  PLANNER: ['antigravity', 'gemini', 'claude', 'chatgpt', 'codex', 'ollama'],
  TEST_DESIGNER: ['gemini', 'claude', 'codex', 'chatgpt', 'antigravity', 'ollama'],
  IMPLEMENTER: ['antigravity', 'codex', 'gemini', 'claude', 'ollama'],
  REVIEWER: ['gemini', 'claude', 'chatgpt', 'antigravity', 'codex', 'ollama']
};

/** Provider availability is runtime evidence-driven; never quarantine by a hard-coded calendar date. */
export function isProviderTemporarilyQuarantined(
  _provider: ProviderId,
  _now = Date.now()
): boolean {
  return false;
}

const AUTH_PATTERNS = [
  'unauthenticated',
  'please login',
  'login required',
  'not logged in',
  'authentication failed',
  'invalid api key',
  'api_key_invalid',
  'missing api key'
];

export function createProviderHealth(now = Date.now()): Record<ProviderId, ProviderHealth> {
  return Object.fromEntries(
    ALL_PROVIDER_IDS.map(id => [id, {
      id,
      available: false,
      authenticated: false,
      circuit: 'CLOSED' as const,
      consecutiveFailures: 0,
      lastProbeAt: now
    }])
  ) as Record<ProviderId, ProviderHealth>;
}

export function markProviderFailure(
  provider: ProviderHealth,
  error: string,
  now = Date.now(),
  options: { failureThreshold?: number; cooldownMs?: number } = {}
): void {
  const threshold = options.failureThreshold ?? 3;
  const cooldownMs = options.cooldownMs ?? 120_000;
  provider.consecutiveFailures += 1;
  provider.lastError = redact(error).slice(0, 1000);
  provider.lastProbeAt = now;

  const capacityFailure = /provider_capacity_wait|provider_timeout|rate limit|too many requests|\b429\b|quota|usage limit|resource[_ ]exhausted|insufficient_quota|limit reached|weighted tokens/i.test(error);
  if (capacityFailure) {
    const capacityCooldownMs = options.cooldownMs ?? Math.min(
      6 * 60 * 60_000,
      15 * 60_000 * (2 ** Math.max(0, provider.consecutiveFailures - 1))
    );
    provider.circuit = 'OPEN';
    provider.cooldownUntil = now + capacityCooldownMs;
    return;
  }

  if (provider.consecutiveFailures >= threshold) {
    provider.circuit = 'OPEN';
    provider.cooldownUntil = now + cooldownMs;
  }
}

export function markProviderSuccess(
  provider: ProviderHealth,
  now = Date.now()
): void {
  provider.available = true;
  provider.authenticated = true;
  provider.circuit = 'CLOSED';
  provider.consecutiveFailures = 0;
  provider.cooldownUntil = undefined;
  provider.lastError = undefined;
  provider.lastSuccessAt = now;
  provider.lastProbeAt = now;
}

function isEligible(provider: ProviderHealth, now: number): boolean {
  if (isProviderTemporarilyQuarantined(provider.id, now)) return false;
  if (!provider.available || !provider.authenticated) return false;
  if (provider.circuit === 'OPEN') {
    if ((provider.cooldownUntil ?? Number.MAX_SAFE_INTEGER) > now) return false;
    provider.circuit = 'CLOSED';
    provider.cooldownUntil = undefined;
  }
  return true;
}

export function selectProvider(
  role: AgentRole,
  health: Record<ProviderId, ProviderHealth>,
  options: { now?: number; exclude?: ProviderId[] } = {}
): ProviderHealth | null {
  const now = options.now ?? Date.now();
  const exclude = new Set(options.exclude ?? []);

  const eligible = DEFAULT_ROLE_PRIORITY[role]
    .filter(id => !exclude.has(id))
    .map(id => health[id])
    .filter((candidate): candidate is ProviderHealth => Boolean(candidate && isEligible(candidate, now)));

  return eligible.find(candidate => Boolean(candidate.lastSuccessAt)) ?? eligible[0] ?? null;
}

export function providerCommandSpec(
  provider: ProviderId,
  request: { prompt: string; cwd: string; mode: ProviderMode }
): ProviderCommandSpec {
  switch (provider) {
    case 'codex':
      return {
        command: 'codex',
        args: [
          'exec',
          '--sandbox',
          request.mode === 'READ_ONLY' ? 'read-only' : 'workspace-write',
          '--ephemeral',
          request.prompt
        ]
      };

    case 'claude': {
      const args = [
        '-p',
        request.prompt,
        '--output-format',
        'json',
        '--max-turns',
        '20'
      ];
      if (request.mode === 'READ_ONLY') {
        args.push('--permission-mode', 'plan');
      } else {
        // Editing is pre-authorized, shell execution is intentionally not.
        args.push('--allowedTools', 'Read,Edit,Write');
      }
      return { command: 'claude', args };
    }

    case 'antigravity':
      return {
        command: 'agy',
        args: [
          '-p',
          request.prompt,
          '--mode',
          request.mode === 'READ_ONLY' ? 'plan' : 'accept-edits',
          '--output-format',
          request.mode === 'READ_ONLY' ? 'text' : 'stream-json',
          ...(request.mode === 'WORKSPACE_WRITE' ? ['--sandbox'] : [])
        ]
      };

    case 'gemini':
      return {
        command: 'gemini',
        args: [
          '-p',
          request.prompt,
          '--output-format',
          'json',
          '--sandbox',
          '--approval-mode',
          request.mode === 'READ_ONLY' ? 'plan' : 'auto_edit'
        ]
      };

    case 'ollama':
      return {
        command: 'codex',
        args: [
          'exec',
          '--oss',
          '--local-provider',
          'ollama',
          '-m',
          LOCAL_OLLAMA_MODEL,
          '--sandbox',
          request.mode === 'READ_ONLY' ? 'read-only' : 'workspace-write',
          '--ephemeral',
          request.prompt
        ]
      };

    case 'chatgpt':
      return {
        command: 'chatgpt-api',
        args: [],
        virtual: true
      };
  }
}

export function providerStdioSpec(
  provider: ProviderId | string
): ['ignore', 'pipe', 'pipe'] | ['pipe', 'pipe', 'pipe'] {
  if (provider === 'codex' || provider === 'ollama') {
    return ['ignore', 'pipe', 'pipe'];
  }
  return ['pipe', 'pipe', 'pipe'];
}

function checkAuthText(text: string): boolean {
  const lower = text.toLowerCase();
  return AUTH_PATTERNS.some(pattern => lower.includes(pattern));
}


export function detectProviderSemanticFailure(
  provider: ProviderId,
  output: string,
  error: string
): { reason: string; retryable: boolean } | null {
  const combined = `${output}\n${error}`.toLowerCase();

  if (provider === 'antigravity') {
    const hasJetskiPermissionDenial =
      combined.includes('no output produced') && combined.includes('command permission');
    const hasCommandActionDenial =
      (combined.includes('denied_actions') || combined.includes('action=command')) &&
      combined.includes('user denied permission to run command');

    if (hasJetskiPermissionDenial || hasCommandActionDenial) {
      return {
        reason: 'HEADLESS_PERMISSION_DENIED:antigravity',
        retryable: true
      };
    }
  }

  const actualSandboxMarkers = [
    'failed rtm_newaddr',
    'sandbox configuration error',
    'shell execution failed',
    'bwrap:',
    'bwrap error'
  ];

  const hasActualSandboxFailure = actualSandboxMarkers.some(marker => combined.includes(marker));

  const hasBundledBubblewrapFallback =
    combined.includes('bundled bubblewrap') &&
    (combined.includes('will use') || combined.includes('in the meantime') || combined.includes('using'));

  const hasMissingBubblewrapWithoutFallback =
    combined.includes('could not find bubblewrap') && !hasBundledBubblewrapFallback;

  if (hasActualSandboxFailure || hasMissingBubblewrapWithoutFallback) {
    return {
      reason: `SANDBOX_EXECUTION_FAILED:${provider}`,
      retryable: true
    };
  }

  const capacityMarkers = [
    'rate limit',
    'too many requests',
    '429',
    'temporarily unavailable',
    'capacity',
    'quota',
    'usage limit',
    'resource exhausted',
    'resource_exhausted',
    'insufficient_quota',
    'limit reached',
    'weighted tokens'
  ];

  if (capacityMarkers.some(marker => combined.includes(marker))) {
    return {
      reason: `PROVIDER_CAPACITY_WAIT:${provider}`,
      retryable: true
    };
  }

  return null;
}

function runVersion(command: string): { installed: boolean; version?: string } {
  const r = spawnSync(command, ['--version'], {
    encoding: 'utf8',
    timeout: 5_000,
    shell: false
  });
  if (r.error || r.status !== 0) return { installed: false };
  return {
    installed: true,
    version: (r.stdout || r.stderr || '').trim().split('\n')[0]
  };
}


export function parseCodexAuthStatus(status: number | null, output: string): boolean {
  return status === 0 && /logged in/i.test(output) && !/not logged in/i.test(output);
}

export function parseClaudeAuthStatus(status: number | null, output: string): boolean {
  if (status !== 0) return false;
  try {
    const parsed = JSON.parse(output) as { loggedIn?: boolean };
    return parsed.loggedIn === true;
  } catch {
    return false;
  }
}

export function parseAntigravityAuthStatus(status: number | null, output: string): boolean {
  return status === 0 && output.trim().length > 0 && !checkAuthText(output);
}

function probeInstalledAuth(id: ProviderId): boolean {
  if (id === 'codex') {
    const r = spawnSync('codex', ['login', 'status'], {
      encoding: 'utf8',
      timeout: 5_000,
      shell: false
    });
    return parseCodexAuthStatus(r.status, `${r.stdout ?? ''}\n${r.stderr ?? ''}`);
  }

  if (id === 'claude') {
    const r = spawnSync('claude', ['auth', 'status'], {
      encoding: 'utf8',
      timeout: 5_000,
      shell: false
    });
    return parseClaudeAuthStatus(r.status, r.stdout ?? '');
  }

  if (id === 'gemini') {
    const hasEnv = Boolean(
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_GENAI_USE_VERTEXAI ||
      process.env.GOOGLE_GENAI_USE_GCA
    );
    return hasEnv;
  }

  if (id === 'antigravity') {
    const r = spawnSync('agy', ['models'], {
      encoding: 'utf8',
      timeout: 12_000,
      shell: false
    });
    return parseAntigravityAuthStatus(
      r.status,
      `${r.stdout ?? ''}\n${r.stderr ?? ''}`
    );
  }

  if (id === 'ollama') {
    const r = spawnSync(LOCAL_OLLAMA_BIN, ['list'], {
      encoding: 'utf8',
      timeout: 8_000,
      shell: false,
      env: {
        ...process.env,
        OLLAMA_HOST: LOCAL_OLLAMA_HOST.replace(/^https?:\/\//, '')
      }
    });
    if (r.status !== 0 || r.error) return false;
    return (r.stdout ?? '').split('\n').some(line => line.trimStart().startsWith(`${LOCAL_OLLAMA_MODEL} `));
  }

  return false;
}

export function probeProviders(
  previous?: Record<ProviderId, ProviderHealth>,
  now = Date.now()
): Record<ProviderId, ProviderHealth> {
  const health = previous ?? createProviderHealth(now);

  for (const id of ['codex', 'claude', 'antigravity', 'gemini', 'ollama'] as ProviderId[]) {
    const command = id === 'antigravity' ? 'agy' : id === 'ollama' ? LOCAL_OLLAMA_BIN : id;
    const version = runVersion(command);
    const h = health[id];
    h.available = version.installed;
    h.version = version.version;
    h.lastProbeAt = now;

    if (!version.installed) {
      h.authenticated = false;
    } else if (h.lastSuccessAt) {
      h.authenticated = true;
    } else {
      // Fail closed: installed != authenticated.
      // Free/logged-out providers remain unavailable until explicit auth proof.
      h.authenticated = probeInstalledAuth(id);
    }
  }

  const chat = health.chatgpt;
  const hasApi = Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_AUTONOMY_MODEL);
  const hasCommand = Boolean(process.env.CHATGPT_AUTONOMY_COMMAND);
  chat.available = hasApi || hasCommand;
  chat.authenticated = chat.available;
  chat.version = hasApi ? 'responses-api' : hasCommand ? 'external-command' : undefined;
  chat.lastProbeAt = now;

  return health;
}

async function runChatGptApi(prompt: string, timeoutMs: number): Promise<ProviderRunResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_AUTONOMY_MODEL;

  if (!apiKey || !model) {
    return {
      provider: 'chatgpt',
      success: false,
      output: '',
      error: 'CHATGPT_UNAVAILABLE: OPENAI_API_KEY and OPENAI_AUTONOMY_MODEL are required',
      exitCode: null,
      authRequired: false,
      retryable: true
    };
  }

  const payload = JSON.stringify({
    model,
    input: prompt
  });

  return await new Promise(resolve => {
    const req = httpsRequest({
      hostname: 'api.openai.com',
      path: '/v1/responses',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      },
      timeout: timeoutMs
    }, res => {
      const chunks: Buffer[] = [];
      res.on('data', chunk => chunks.push(Buffer.from(chunk)));
      res.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf8');
        const status = res.statusCode ?? 0;
        if (status < 200 || status >= 300) {
          const redacted = redact(body).slice(-4000);
          resolve({
            provider: 'chatgpt',
            success: false,
            output: '',
            error: redacted,
            exitCode: status,
            authRequired: status === 401 || status === 403,
            retryable: status === 408 || status === 409 || status === 429 || status >= 500
          });
          return;
        }

        try {
          const parsed = JSON.parse(body) as {
            output_text?: string;
            output?: Array<{ content?: Array<{ text?: string }> }>;
          };
          const output = parsed.output_text ||
            parsed.output?.flatMap(x => x.content ?? []).map(x => x.text ?? '').join('\n') ||
            '';
          resolve({
            provider: 'chatgpt',
            success: true,
            output: redact(output),
            error: '',
            exitCode: 0,
            authRequired: false,
            retryable: false
          });
        } catch {
          resolve({
            provider: 'chatgpt',
            success: false,
            output: '',
            error: 'CHATGPT_RESPONSE_PARSE_FAILED',
            exitCode: status,
            authRequired: false,
            retryable: true
          });
        }
      });
    });

    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.on('error', error => {
      resolve({
        provider: 'chatgpt',
        success: false,
        output: '',
        error: redact(String(error)),
        exitCode: null,
        authRequired: false,
        retryable: true
      });
    });

    req.write(payload);
    req.end();
  });
}

export async function runProviderPrompt(req: ProviderRunRequest): Promise<ProviderRunResult> {
  const timeoutMs = req.timeoutMs ?? 20 * 60_000;

  if (req.provider === 'chatgpt') {
    if (process.env.CHATGPT_AUTONOMY_COMMAND) {
      const command = process.env.CHATGPT_AUTONOMY_COMMAND;
      const r = spawnSync(command, [], {
        cwd: req.cwd,
        input: req.prompt,
        encoding: 'utf8',
        timeout: timeoutMs,
        shell: false,
        env: { ...process.env }
      });
      const output = redact(r.stdout ?? '');
      const error = redact(r.stderr ?? '');
      const authRequired = r.status !== 0 && checkAuthText(`${error}\n${output}`);
      return {
        provider: 'chatgpt',
        success: r.status === 0,
        output,
        error,
        exitCode: r.status,
        authRequired,
        retryable: !authRequired
      };
    }
    return runChatGptApi(req.prompt, timeoutMs);
  }

  const spec = providerCommandSpec(req.provider, req);
  const r = spawnSync(spec.command, spec.args, {
    cwd: req.cwd,
    stdio: providerStdioSpec(req.provider),
    encoding: 'utf8',
    timeout: timeoutMs,
    shell: false,
    env: { ...process.env, ...spec.env }
  });

  const output = redact(r.stdout ?? '');
  const processError = r.error ? redact(String(r.error.message ?? r.error)) : '';
  const timedOut = (r.error as NodeJS.ErrnoException | undefined)?.code === 'ETIMEDOUT';
  const error = [redact(r.stderr ?? ''), processError].filter(Boolean).join('\n');
  const combined = `${error}\n${output}`;
  const authRequired = r.status !== 0 && checkAuthText(combined);
  const semanticFailure = timedOut
    ? { reason: `PROVIDER_TIMEOUT:${req.provider}`, retryable: true }
    : detectProviderSemanticFailure(req.provider, output, error);

  return {
    provider: req.provider,
    success: r.status === 0 && !semanticFailure,
    output,
    error: semanticFailure ? `${semanticFailure.reason}\n${error}`.trim() : error,
    exitCode: r.status,
    authRequired,
    retryable: semanticFailure ? semanticFailure.retryable : !authRequired
  };
}
