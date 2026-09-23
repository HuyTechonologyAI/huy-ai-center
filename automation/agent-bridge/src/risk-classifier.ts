/**
 * RISK CLASSIFIER — Deterministic, Static-Policy-First
 * Phase: AI-DEV-BRIDGE-A
 *
 * INVARIANT: effective_risk = MAX(static_risk, model_suggested_risk)
 * AI models CANNOT reclassify themselves into a lower risk tier.
 */

import type {
  RiskLevel,
  RiskAssessment,
  CommandGuardRequest,
} from "./types.js";

// ─────────────────────────────────────────────────
// Static forbidden command patterns → R3/R4 hard rules
// These patterns ALWAYS produce HUMAN_REQUIRED or higher.
// Order matters — first match wins.
// ─────────────────────────────────────────────────

const FORBIDDEN_PATTERNS: Array<{
  pattern: RegExp;
  risk: RiskLevel;
  reason: string;
}> = [
  // R4 — Production-destructive DDL
  {
    pattern: /\bDROP\s+(DATABASE|TABLE|SCHEMA)\b/i,
    risk: "R4",
    reason: "Destructive DDL against database",
  },
  {
    pattern: /\bTRUNCATE\b/i,
    risk: "R4",
    reason: "TRUNCATE is destructive — production guard",
  },
  {
    pattern: /\bDELETE\s+FROM\b/i,
    risk: "R4",
    reason: "DELETE without explicit scope confirmation",
  },
  // R4 — Secrets / credentials
  {
    pattern: /\bsecret[-_]?rotat/i,
    risk: "R4",
    reason: "Secret rotation requires Human Owner",
  },
  // R4 — Infrastructure mutations
  {
    pattern: /cloudflare|dns.*change|iam.*change/i,
    risk: "R4",
    reason: "DNS/IAM/Cloudflare change requires Human Owner",
  },
  // R3 — Force push / history rewrite
  {
    pattern: /git\s+push\s+.*(-f\b|--force\b)/i,
    risk: "R3",
    reason: "Force push is forbidden — blocks history rewrite",
  },
  {
    pattern: /git\s+push\s+.*origin\s+main\b/i,
    risk: "R3",
    reason: "Direct push to main requires Human approval",
  },
  {
    pattern: /git\s+reset\s+--hard/i,
    risk: "R3",
    reason: "Hard reset may destroy uncommitted user work",
  },
  {
    pattern: /git\s+clean\s+-f/i,
    risk: "R3",
    reason: "git clean -f risks destroying untracked files outside worktree",
  },
  // R3 — Production deploy
  {
    pattern: /vercel\s+.*--prod\b/i,
    risk: "R3",
    reason: "Production Vercel deploy requires Human approval",
  },
  {
    pattern: /supabase\s+(db\s+push|migration\s+up)\b/i,
    risk: "R3",
    reason: "Supabase production migration requires Human approval",
  },
  // R3 — PR merge (creation is R2/AUTO, merge is R3)
  {
    pattern: /gh\s+pr\s+merge\b/i,
    risk: "R3",
    reason: "PR merge requires Human approval",
  },
  // R3 — Production queue
  {
    pattern: /pgmq.*send|haip.*enqueue/i,
    risk: "R3",
    reason: "Production queue write requires Human approval",
  },
  // R3 — env dump
  {
    pattern: /^\s*(env|printenv)\s*$/i,
    risk: "R3",
    reason: "Raw environment dump into logs is forbidden",
  },
];

// ─────────────────────────────────────────────────
// R2 patterns — automatic but sandbox required
// ─────────────────────────────────────────────────

const R2_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  {
    pattern: /npm\s+(run\s+)?(build|start)\b/i,
    reason: "Local build — R2",
  },
  {
    pattern: /git\s+push\s+(?!.*(-f|--force|origin\s+main))/i,
    reason: "Feature branch push — R2",
  },
  {
    pattern: /gh\s+pr\s+(create|edit|view)\b/i,
    reason: "PR create/update — R2",
  },
  {
    pattern: /npm\s+install\b/i,
    reason: "Dependency install — R2",
  },
  {
    pattern: /git\s+commit\b/i,
    reason: "Commit on branch — R2 (verified by source control policy)",
  },
];

// ─────────────────────────────────────────────────
// R1 patterns — automatic, no sandbox required
// ─────────────────────────────────────────────────

const R1_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  {
    pattern: /npm\s+(run\s+)?(test|typecheck|lint|check)\b/i,
    reason: "Tests/typecheck/lint — R1",
  },
  {
    pattern: /npx\s+tsx\s+/i,
    reason: "Local tsx script — R1",
  },
  {
    pattern: /git\s+(status|diff|log|branch|checkout -b)\b/i,
    reason: "Non-destructive git read/branch — R1",
  },
];

// ─────────────────────────────────────────────────
// Classify a raw command string (static, deterministic)
// ─────────────────────────────────────────────────

export function classifyCommand(command: string): {
  risk: RiskLevel;
  reason: string;
  matchedPattern?: string;
} {
  // Check forbidden patterns first (R3/R4)
  for (const entry of FORBIDDEN_PATTERNS) {
    if (entry.pattern.test(command)) {
      return {
        risk: entry.risk,
        reason: entry.reason,
        matchedPattern: entry.pattern.toString(),
      };
    }
  }

  // Check R2 patterns
  for (const entry of R2_PATTERNS) {
    if (entry.pattern.test(command)) {
      return {
        risk: "R2",
        reason: entry.reason,
        matchedPattern: entry.pattern.toString(),
      };
    }
  }

  // Check R1 patterns
  for (const entry of R1_PATTERNS) {
    if (entry.pattern.test(command)) {
      return {
        risk: "R1",
        reason: entry.reason,
        matchedPattern: entry.pattern.toString(),
      };
    }
  }

  // Default: R1 (safe local operation)
  return {
    risk: "R1",
    reason: "No pattern matched — classified as R1 (safe local operation)",
  };
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

  // Push/merge to main = R3
  if (targetBranch === "main" || targetBranch === "master") {
    const staticRisk: RiskLevel = "R3";
    const effective: RiskLevel = maxRisk(staticRisk, modelSuggested);
    return {
      level: effective,
      reason: "Target branch is main/master (R3 minimum)",
      staticDeterministic: true,
      modelSuggested,
      effectiveLevel: effective,
    };
  }

  // Check if the action description matches forbidden command patterns
  const cmdClassification = classifyCommand(actionDescription);
  const staticRisk = cmdClassification.risk;
  const effective: RiskLevel = maxRisk(staticRisk, modelSuggested);

  return {
    level: effective,
    reason: cmdClassification.reason,
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
