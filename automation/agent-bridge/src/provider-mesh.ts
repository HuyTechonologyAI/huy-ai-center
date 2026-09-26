import { spawnSync } from 'node:child_process';
import { request as httpsRequest } from 'node:https';
import { redact } from './log-redactor.js';

export const ALL_PROVIDER_IDS = [
  'codex',
  'claude',
  'antigravity',
  'gemini',
  'chatgpt'
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
  virtual?: boolean;
}

export const DEFAULT_ROLE_PRIORITY: Record<AgentRole, ProviderId[]> = {
  PLANNER: ['antigravity', 'gemini', 'claude', 'chatgpt', 'codex'],
  TEST_DESIGNER: ['gemini', 'claude', 'codex', 'chatgpt', 'antigravity'],
  IMPLEMENTER: ['codex', 'claude', 'gemini'],
  REVIEWER: ['gemini', 'claude', 'chatgpt', 'antigravity', 'codex']
};

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
  if (!provider.available || !provider.authenticated) return false;
  if (provider.circuit === 'OPEN') {
    if ((provider.cooldownUntil ?? Number.MAX_SAFE_INTEGER) > now) return false;
    provider.circuit = 'CLOSED';
    provider.consecutiveFailures = 0;
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

  for (const id of DEFAULT_ROLE_PRIORITY[role]) {
    if (exclude.has(id)) continue;
    const candidate = health[id];
    if (candidate && isEligible(candidate, now)) return candidate;
  }
  return null;
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
          'plan',
          '--output-format',
          'stream-json'
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

    case 'chatgpt':
      return {
        command: 'chatgpt-api',
        args: [],
        virtual: true
      };
  }
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

  const sandboxMarkers = [
    'failed rtm_newaddr',
    'sandbox configuration error',
    'shell execution failed',
    'could not find bubblewrap',
    'bwrap:'
  ];

  if (sandboxMarkers.some(marker => combined.includes(marker))) {
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
    'capacity'
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

export function probeProviders(
  previous?: Record<ProviderId, ProviderHealth>,
  now = Date.now()
): Record<ProviderId, ProviderHealth> {
  const health = previous ?? createProviderHealth(now);

  for (const id of ['codex', 'claude', 'antigravity', 'gemini'] as ProviderId[]) {
    const command = id === 'antigravity' ? 'agy' : id;
    const version = runVersion(command);
    const h = health[id];
    h.available = version.installed;
    h.version = version.version;
    h.lastProbeAt = now;

    // Version checks cannot prove auth. Existing successful execution can.
    if (!version.installed) {
      h.authenticated = false;
    } else if (h.lastSuccessAt) {
      h.authenticated = true;
    } else {
      // Installed providers are considered routable; invocation converts auth
      // errors into HUMAN_AUTH_REQUIRED without silently claiming success.
      h.authenticated = true;
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
    encoding: 'utf8',
    timeout: timeoutMs,
    shell: false,
    env: { ...process.env }
  });

  const output = redact(r.stdout ?? '');
  const error = redact(r.stderr ?? '');
  const combined = `${error}\n${output}`;
  const authRequired = r.status !== 0 && checkAuthText(combined);
  const semanticFailure = detectProviderSemanticFailure(req.provider, output, error);

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
