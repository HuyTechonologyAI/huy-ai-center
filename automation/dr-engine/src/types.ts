export enum FileClassification {
  VERSIONED_SOURCE = 'VERSIONED_SOURCE',
  DR_ENCRYPTED = 'DR_ENCRYPTED',
  REGENERABLE_EXCLUDE = 'REGENERABLE_EXCLUDE',
  PROHIBITED = 'PROHIBITED'
}

export interface FileClassificationResult {
  filePath: string;
  category: FileClassification;
  uploadAllowed: boolean;
  prohibitedForPlaintextGit: boolean;
  presenceOnly: boolean;
  reason: string;
}

export interface SecretFinding {
  type: string;
  line: number;
  snippetMasked: string;
}

export interface SecretScanResult {
  hasSecret: boolean;
  findings: SecretFinding[];
}

export interface DiscoveredProject {
  project_id: string;
  display_name: string;
  source_path_windows: string;
  source_path_wsl: string;
  git_root: string | null;
  git_remote: string | null;
  current_branch: string | null;
  HEAD: string | null;
  dirty: boolean;
  staged: boolean;
  untracked_count: number;
  worktrees: string[];
  submodules: string[];
  size_bytes: number;
  file_count: number;
  project_markers: string[];
  github_repo: string | null;
  classification: string;
  migration_required: boolean;
  isControlOrArtifactRoot?: boolean;
  isAuthoritativeSource?: boolean;
}

export interface GitDirtyState {
  hasUnstagedChanges: boolean;
  unstagedDiff: string;
  hasStagedChanges: boolean;
  stagedDiff: string;
  untrackedFiles: string[];
  worktrees: Array<{ path: string; branch: string; head: string }>;
}

export interface GitBackupResult {
  projectId: string;
  bundlePath: string;
  sha256: string;
  refs: {
    heads: string[];
    tags: string[];
  };
  dirtyState: GitDirtyState;
}

export interface CheckpointRecord {
  migration_id: string;
  phase: string;
  status: 'PENDING' | 'RUNNING' | 'PASS' | 'COMPLETED' | 'FAILED';
  started_at?: string;
  completed_at?: string;
  source_manifest_sha256?: string;
  artifact_manifest_sha256?: string;
  github_receipt?: Record<string, any>;
  tests?: Record<string, any>;
  human_gate?: any;
  next_phase?: string;
  details?: Record<string, any>;
}

export interface FinalReceipt {
  GITHUB_DR: 'PASS' | 'FAIL';
  RESTORE_TEST: 'PASS' | 'FAIL';
  NODE01_MIGRATION_TOOLKIT: 'READY' | 'NOT_READY';
  SOURCE_DATA_DELETED: 'NO' | 'YES';
  OWNER_PRIVATE_KEY_UPLOADED: 'NO' | 'YES';
  PLAINTEXT_SECRET_UPLOADED: 'NO' | 'YES';
  DATA2_MUTATED: 'NO' | 'YES';
  NODE01_AUTHORITATIVE_CUTOVER: 'NOT_EXECUTED' | 'EXECUTED';
  SAFE_TO_START_NODE01_MIGRATION: 'YES' | 'NO';
  migration_id: string;
  timestamp: string;
  checkpoints: Record<string, string>;
}
