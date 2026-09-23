/**
 * TYPES — Codex × Antigravity Automation Bridge
 * Phase: AI-DEV-BRIDGE-A
 *
 * Core type definitions for the agent automation bridge.
 * All components reference these shared types.
 */

// ─────────────────────────────────────────────────
// Risk Classification (Deterministic, never AI-mutable)
// ─────────────────────────────────────────────────

export type RiskLevel = "R0" | "R1" | "R2" | "R3" | "R4";

export interface RiskAssessment {
  level: RiskLevel;
  reason: string;
  staticDeterministic: boolean;       // true = decided by static policy
  modelSuggested?: RiskLevel;          // model's suggestion (may be lower)
  effectiveLevel: RiskLevel;           // MAX(static, modelSuggested)
}

// ─────────────────────────────────────────────────
// Task Contract
// ─────────────────────────────────────────────────

export interface TaskRepository {
  root: string;
  baseRef: string;
  taskBranch: string;
}

export interface TaskScope {
  allowedPaths: string[];
  forbiddenPaths: string[];
}

export interface TaskExecution {
  maxCycles: number;
  timeoutSeconds: number;
}

export interface TaskVerification {
  commands: string[];
}

export interface TaskSourceControl {
  commitAllowed: boolean;
  pushFeatureBranchAllowed: boolean;
  prCreationAllowed: boolean;
  mergeAllowed: false; // Always false — merge is R3/HUMAN
}

export interface TaskContract {
  taskId: string;
  title: string;
  objective: string;
  repository: TaskRepository;
  scope: TaskScope;
  risk: Pick<RiskAssessment, "level" | "reason">;
  execution: TaskExecution;
  verification: TaskVerification;
  sourceControl: TaskSourceControl;
  createdAt: string;
}

// ─────────────────────────────────────────────────
// Agent Plan
// ─────────────────────────────────────────────────

export interface AgentPlanStep {
  stepIndex: number;
  description: string;
  targetFiles?: string[];
  riskEstimate: RiskLevel;
}

export interface AgentPlan {
  planId: string;
  taskId: string;
  model: string;
  generatedAt: string;
  steps: AgentPlanStep[];
  estimatedDurationSeconds?: number;
  requiredTools: string[];
  approvedByGate: boolean;
  rawOutput?: string;   // Antigravity stdout (redacted)
}

// ─────────────────────────────────────────────────
// Agent Result
// ─────────────────────────────────────────────────

export type AgentResultStatus =
  | "PASS"
  | "FAIL"
  | "CORRECTION_REQUIRED"
  | "HUMAN_DECISION_REQUIRED"
  | "AUTOMATION_BLOCKED"
  | "CODEX_UNAVAILABLE"
  | "ANTIGRAVITY_UNAVAILABLE"
  | "AGENT_PLAN_INVALID"
  | "RECOVERY_REQUIRED";

export interface VerificationResult {
  command: string;
  exitCode: number;
  passed: boolean;
  stdout?: string;
  stderr?: string;
  durationMs: number;
}

export interface AgentResult {
  taskId: string;
  planId?: string;
  cycle: number;
  status: AgentResultStatus;
  changedFiles: string[];
  diffStat?: string;
  verificationResults: VerificationResult[];
  auditNotes: string;
  completedAt: string;
  errorMessage?: string;
}

// ─────────────────────────────────────────────────
// Approval Request (R3/R4 gate)
// ─────────────────────────────────────────────────

export interface ApprovalRequest {
  taskId: string;
  requestedAction: string;
  riskLevel: RiskLevel;
  whyApprovalRequired: string;
  affectedResources: string[];
  proposedCommand?: string;
  rollbackProcedure: string;
  validationCompleted: string[];
  recommendedNextStep: string;
  createdAt: string;
}

// ─────────────────────────────────────────────────
// Command Guard
// ─────────────────────────────────────────────────

export type CommandGuardDecision = "ALLOW" | "DENY" | "HUMAN_REQUIRED";

export interface CommandGuardRequest {
  command: string;
  workingDirectory: string;
  targetBranch?: string;
  targetEnvironment?: "production" | "feature" | "local" | "test";
  modelSuggestedRisk?: RiskLevel;
}

export interface CommandGuardResult {
  decision: CommandGuardDecision;
  effectiveRisk: RiskLevel;
  reason: string;
  matchedPattern?: string;
}

// ─────────────────────────────────────────────────
// Autonomy Policy (loaded from config)
// ─────────────────────────────────────────────────

export type ApprovalMode =
  | "AUTO"
  | "HUMAN_REQUIRED"
  | "HUMAN_OWNER_REQUIRED";

export interface RiskPolicy {
  approval: ApprovalMode;
  sandboxRequired?: boolean;
}

export interface AutonomyPolicy {
  R0: RiskPolicy;
  R1: RiskPolicy;
  R2: RiskPolicy;
  R3: RiskPolicy;
  R4: RiskPolicy;
}

// ─────────────────────────────────────────────────
// CLI Adapter Results
// ─────────────────────────────────────────────────

export type CliStatus =
  | "READY"
  | "UNAVAILABLE"
  | "HUMAN_AUTH_REQUIRED";

export interface CliCheckResult {
  name: string;
  installed: boolean;
  authenticated: boolean;
  status: CliStatus;
  version?: string;
}

// ─────────────────────────────────────────────────
// Worktree
// ─────────────────────────────────────────────────

export interface WorktreeInfo {
  taskId: string;
  path: string;
  branch: string;
  created: boolean;
  cleanedUp: boolean;
}

// ─────────────────────────────────────────────────
// Bridge Task State (runtime)
// ─────────────────────────────────────────────────

export type BridgeTaskStatus =
  | "PENDING"
  | "RISK_ASSESSED"
  | "PLANNING"
  | "IMPLEMENTING"
  | "VERIFYING"
  | "AUDITING"
  | "COMMITTING"
  | "COMPLETE"
  | "BLOCKED"
  | "HUMAN_GATE"
  | "FAILED";

export interface BridgeTaskState {
  contract: TaskContract;
  risk?: RiskAssessment;
  plan?: AgentPlan;
  worktree?: WorktreeInfo;
  result?: AgentResult;
  status: BridgeTaskStatus;
  cycles: number;
  approvalRequest?: ApprovalRequest;
}
