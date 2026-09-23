/**
 * RISK CLASSIFIER — Deterministic, Static-Policy-First
 * Phase: AI-DEV-BRIDGE-A.1 (Fail-Closed & Authoritative Command Policy)
 *
 * INVARIANT: effective_risk = MAX(static_risk, model_suggested_risk)
 * AI models CANNOT reclassify themselves into a lower risk tier.
 * UNKNOWN COMMANDS FAIL CLOSED TO R3 (HUMAN_REQUIRED).
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import type {
  RiskLevel,
  RiskAssessment,
  CommandGuardRequest,
} from "./types.js";

export interface CommandPolicyConfig {
  auto_blocked: string[];
  r2_sandbox_required: string[];
  r1_automatic: string[];
  r0_automatic: string[];
}

// ─────────────────────────────────────────────────
// Precedence 1: Hard-Coded Invariants (Highest Precedence)
// These cannot be overridden or weakened by external configuration.
// ─────────────────────────────────────────────────

const HARD_CODED_INVARIANTS: Array<{
  pattern: RegExp;
  risk: RiskLevel;
  reason: string;
}> = [
  // R4 — Destructive DB / Infrastructure / Secrets
  {
    pattern: /\bDROP\s+(DATABASE|TABLE|SCHEMA)\b/i,
    risk: "R4",
    reason: "HARD_INVARIANT: Destructive DDL against database",
  },
  {
    pattern: /\bTRUNCATE\b/i,
    risk: "R4",
    reason: "HARD_INVARIANT: TRUNCATE is destructive — production guard",
  },
  {
    pattern: /\bDELETE\s+FROM\b/i,
    risk: "R4",
    reason: "HARD_INVARIANT: DELETE without explicit scope confirmation",
  },
  {
    pattern: /\bsecret[-_]?rotat/i,
    risk: "R4",
    reason: "HARD_INVARIANT: Secret rotation requires Human Owner",
  },
  {
    pattern: /cloudflare|dns.*change|iam.*change/i,
    risk: "R4",
    reason: "HARD_INVARIANT: DNS/IAM/Cloudflare change requires Human Owner",
  },
  // R3 — Destructive file operations
  {
    pattern: /\brm\s+-[a-zA-Z]*r[a-zA-Z]*f\b/i, // rm -rf, rm -fr, etc.
    risk: "R3",
    reason: "HARD_INVARIANT: rm -rf is destructive — requires human approval",
  },
  {
    pattern: /\bRemove-Item\b.*-Recurse\b/i,
    risk: "R3",
    reason: "HARD_INVARIANT: Remove-Item -Recurse is destructive — requires human approval",
  },
  // R3 — Force push / history rewrite
  {
    pattern: /git\s+push\s+.*(-f\b|--force\b)/i,
    risk: "R3",
    reason: "HARD_INVARIANT: Force push is forbidden — blocks history rewrite",
  },
  {
    pattern: /git\s+push\s+.*origin\s+main\b/i,
    risk: "R3",
    reason: "HARD_INVARIANT: Direct push to main requires Human approval",
  },
  {
    pattern: /git\s+reset\s+--hard/i,
    risk: "R3",
    reason: "HARD_INVARIANT: Hard reset may destroy uncommitted user work",
  },
  {
    pattern: /git\s+clean\s+-f/i,
    risk: "R3",
    reason: "HARD_INVARIANT: git clean -f risks destroying untracked files outside worktree",
  },
  // R3 — Production deploy
  {
    pattern: /vercel\s+.*--prod\b/i,
    risk: "R3",
    reason: "HARD_INVARIANT: Production Vercel deploy requires Human approval",
  },
  {
    pattern: /supabase\s+(db\s+push|migration\s+up)\b/i,
    risk: "R3",
    reason: "HARD_INVARIANT: Supabase production migration requires Human approval",
  },
  // R3 — PR merge
  {
    pattern: /gh\s+pr\s+merge\b/i,
    risk: "R3",
    reason: "HARD_INVARIANT: PR merge requires Human approval",
  },
  // R3 — External mutations via curl / wget
  {
    pattern: /\b(curl|wget)\b/i,
    risk: "R3",
    reason: "HARD_INVARIANT: External network mutations (curl/wget) require human approval",
  },
  // R3 — Production queue
  {
    pattern: /pgmq.*send|haip.*enqueue/i,
    risk: "R3",
    reason: "HARD_INVARIANT: Production queue write requires Human approval",
  },
  // R3 — Raw env dump
  {
    pattern: /^\s*(env|printenv)\s*$/i,
    risk: "R3",
    reason: "HARD_INVARIANT: Raw environment dump into logs is forbidden",
  },
];

// ─────────────────────────────────────────────────
// Precedence 2: Config Policy Loader (config/autonomy/command-policy.json)
// ─────────────────────────────────────────────────

let _cachedCommandPolicy: CommandPolicyConfig | null = null;

export function loadCommandPolicy(customPath?: string): CommandPolicyConfig {
  if (_cachedCommandPolicy && !customPath) return _cachedCommandPolicy;

  const defaultPath = resolve(process.cwd(), "config/autonomy/command-policy.json");
  const policyFile = customPath ?? defaultPath;

  try {
    if (existsSync(policyFile)) {
      const raw = readFileSync(policyFile, "utf-8");
      _cachedCommandPolicy = JSON.parse(raw) as CommandPolicyConfig;
      return _cachedCommandPolicy;
    }
  } catch (err) {
    console.warn(`[risk-classifier] Could not load command policy from ${policyFile}:`, err);
  }

  // Safe fallback policy
  return {
    auto_blocked: [
      "git push --force", "git push -f", "git push origin main",
      "git reset --hard", "git clean -fdx", "vercel --prod",
      "supabase db push", "supabase migration up", "DROP TABLE",
      "DROP DATABASE", "TRUNCATE", "DELETE FROM", "env", "printenv",
      "gh pr merge", "rm -rf", "Remove-Item -Recurse", "curl", "wget"
    ],
    r2_sandbox_required: [
      "npm run build", "npm install", "git push", "git commit", "gh pr create", "gh pr edit"
    ],
    r1_automatic: [
      "npm run test", "npm run typecheck", "npm run lint", "npx tsx",
      "git status", "git diff", "git log", "git branch", "git checkout -b",
      "npm run test:bridge", "npm run bridge:test", "npm run build:shared"
    ],
    r0_automatic: [
      "cat", "ls", "find", "grep", "node --version", "npm --version",
      "git --version", "agy --version", "codex --version", "gh --version"
    ]
  };
}

export function resetCommandPolicyCache(): void {
  _cachedCommandPolicy = null;
}

// ─────────────────────────────────────────────────
// Classify a raw command string (FAIL CLOSED)
// ─────────────────────────────────────────────────

export function classifyCommand(
  command: string,
  customPolicyPath?: string
): {
  risk: RiskLevel;
  reason: string;
  matchedPattern?: string;
} {
  const trimmed = command.trim();

  // 1. Check Hard-Coded Invariants first (highest precedence)
  for (const entry of HARD_CODED_INVARIANTS) {
    if (entry.pattern.test(trimmed)) {
      return {
        risk: entry.risk,
        reason: entry.reason,
        matchedPattern: entry.pattern.toString(),
      };
    }
  }

  // 2. Load and check authoritative JSON policy
  const policy = loadCommandPolicy(customPolicyPath);

  // Check auto_blocked in JSON policy
  for (const patternStr of policy.auto_blocked) {
    const regex = new RegExp(`(^|\\s)${escapeRegex(patternStr)}(\\s|$)`, "i");
    if (regex.test(trimmed) || trimmed.toLowerCase().includes(patternStr.toLowerCase())) {
      return {
        risk: "R3",
        reason: `POLICY_BLOCKED: Command matches auto_blocked pattern '${patternStr}'`,
        matchedPattern: patternStr,
      };
    }
  }

  // Check R0 allowlist (read/inspect)
  for (const allow of policy.r0_automatic) {
    if (matchesAllowlistPattern(trimmed, allow)) {
      return {
        risk: "R0",
        reason: `POLICY_ALLOW: Command matches r0_automatic '${allow}'`,
        matchedPattern: allow,
      };
    }
  }

  // Check R1 allowlist (test, typecheck, lint, non-destructive git)
  for (const allow of policy.r1_automatic) {
    if (matchesAllowlistPattern(trimmed, allow)) {
      return {
        risk: "R1",
        reason: `POLICY_ALLOW: Command matches r1_automatic '${allow}'`,
        matchedPattern: allow,
      };
    }
  }

  // Check R2 allowlist (build, feature push, commit, pr create - sandbox required)
  for (const allow of policy.r2_sandbox_required) {
    if (matchesAllowlistPattern(trimmed, allow)) {
      return {
        risk: "R2",
        reason: `POLICY_ALLOW: Command matches r2_sandbox_required '${allow}'`,
        matchedPattern: allow,
      };
    }
  }

  // 3. FAIL CLOSED: Any command not explicitly allowlisted is classified as R3
  return {
    risk: "R3",
    reason: "FAIL_CLOSED: Unknown command not found in allowlist — requires human approval",
  };
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function matchesAllowlistPattern(command: string, pattern: string): boolean {
  const cmd = command.trim();
  const pat = pattern.trim();

  // Exact command match or prefix match with args
  if (cmd === pat || cmd.startsWith(pat + " ")) {
    return true;
  }

  // Wildcard matching e.g. "git push origin feature/*"
  if (pat.includes("*")) {
    const regexPattern = "^" + escapeRegex(pat).replace(/\\\*/g, ".*") + "$";
    return new RegExp(regexPattern, "i").test(cmd);
  }

  // Common CLI command word match (e.g. "cat", "ls", "grep")
  if (!pat.includes(" ")) {
    const firstWord = cmd.split(/\s+/)[0];
    if (firstWord === pat) {
      return true;
    }
  }

  return false;
}

// ─────────────────────────────────────────────────
// Classify a task by its properties (static)
// ─────────────────────────────────────────────────

export function classifyTask(params: {
  targetBranch?: string;
  targetEnvironment?: CommandGuardRequest["targetEnvironment"];
  actionDescription: string;
  modelSuggested?: RiskLevel;
}): RiskAssessment {
  const { targetBranch, targetEnvironment, actionDescription, modelSuggested } =
    params;

  // Production environment = R3 minimum
  if (targetEnvironment === "production") {
    const staticRisk: RiskLevel = "R3";
    const effective: RiskLevel = maxRisk(staticRisk, modelSuggested);
    return {
      level: effective,
      reason: "Target environment is production (R3 minimum)",
      staticDeterministic: true,
      modelSuggested,
      effectiveLevel: effective,
    };
  }

  // Push/merge to main or master or protected = R3
  if (
    targetBranch === "main" ||
    targetBranch === "master" ||
    targetBranch?.startsWith("prod") ||
    targetBranch?.startsWith("release")
  ) {
    const staticRisk: RiskLevel = "R3";
    const effective: RiskLevel = maxRisk(staticRisk, modelSuggested);
    return {
      level: effective,
      reason: `Target branch is protected ('${targetBranch}') — R3 minimum`,
      staticDeterministic: true,
      modelSuggested,
      effectiveLevel: effective,
    };
  }

  // 3. Check if actionDescription contains any hard-coded invariants / destructive patterns
  for (const entry of HARD_CODED_INVARIANTS) {
    if (entry.pattern.test(actionDescription)) {
      const effective = maxRisk(entry.risk, modelSuggested);
      return {
        level: effective,
        reason: entry.reason,
        staticDeterministic: true,
        modelSuggested,
        effectiveLevel: effective,
      };
    }
  }

  // 4. Check if actionDescription is an explicit command matching allowlist or policy
  const cmdClassification = classifyCommand(actionDescription);
  if (
    cmdClassification.reason.startsWith("HARD_INVARIANT") ||
    cmdClassification.reason.startsWith("POLICY_BLOCKED")
  ) {
    const staticRisk = cmdClassification.risk;
    const effective = maxRisk(staticRisk, modelSuggested);
    return {
      level: effective,
      reason: cmdClassification.reason,
      staticDeterministic: true,
      modelSuggested,
      effectiveLevel: effective,
    };
  }

  // 5. For non-production feature branch tasks:
  // Baseline task risk is R1 (or R0 if specifically matched as R0), effective = MAX(baseRisk, modelSuggested)
  const baseRisk: RiskLevel = cmdClassification.risk === "R0" ? "R0" : "R1";
  const effective: RiskLevel = maxRisk(baseRisk, modelSuggested);

  return {
    level: effective,
    reason: `Feature branch task baseline: ${baseRisk} (effective: ${effective})`,
    staticDeterministic: true,
    modelSuggested,
    effectiveLevel: effective,
  };
}

// ─────────────────────────────────────────────────
// Risk comparison utility
// ─────────────────────────────────────────────────

const RISK_ORDER: Record<RiskLevel, number> = {
  R0: 0,
  R1: 1,
  R2: 2,
  R3: 3,
  R4: 4,
};

/** Returns the higher of two risk levels (static policy + AI suggestion). */
export function maxRisk(a: RiskLevel, b?: RiskLevel): RiskLevel {
  if (!b) return a;
  return RISK_ORDER[a] >= RISK_ORDER[b] ? a : b;
}

/** Returns true if level is automatically executable (R0, R1, R2). */
export function isAutomatic(level: RiskLevel): boolean {
  return RISK_ORDER[level] <= RISK_ORDER["R2"];
}

/** Returns true if level requires a human (R3, R4). */
export function requiresHuman(level: RiskLevel): boolean {
  return RISK_ORDER[level] >= RISK_ORDER["R3"];
}
