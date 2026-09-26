import { readdirSync, statSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { FileClassification, type FileClassificationResult, type SecretScanResult, type SecretFinding } from './types.js';
export { FileClassification };

const SECRET_PATTERNS: Array<{ type: string; regex: RegExp }> = [
  { type: 'GITHUB_PAT', regex: /ghp_[a-zA-Z0-9]{36}/g },
  { type: 'GITHUB_FINE_GRAINED', regex: /github_pat_[a-zA-Z0-9_]{82}/g },
  { type: 'OPENAI_KEY', regex: /sk-[a-zA-Z0-9]{20,48}/g },
  { type: 'JWT_BEARER', regex: /Bearer\s+ey[a-zA-Z0-9_-]+\.ey[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g },
  { type: 'DB_CONNECTION_URI', regex: /(?:postgres|postgresql|mysql|mongodb\+srv):\/\/[^:\s]+:[^@\s]+@[^\s/]+/gi },
  { type: 'PRIVATE_KEY_BLOCK', regex: /-----BEGIN\s+(?:RSA|OPENSSH|EC|DSA|ENCRYPTED)?\s*PRIVATE\s+KEY-----/g },
  { type: 'AGE_SECRET_KEY', regex: /AGE-SECRET-KEY-[A-Z0-9-]+/g },
  { type: 'SUPABASE_SERVICE_ROLE', regex: /ey[a-zA-Z0-9_-]{20,}\.ey[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}/g }
];

export function detectSecretsInContent(content: string): SecretScanResult {
  const findings: SecretFinding[] = [];
  const lines = content.split('\n');

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx];
    for (const pat of SECRET_PATTERNS) {
      pat.regex.lastIndex = 0;
      if (pat.regex.test(line)) {
        findings.push({
          type: pat.type,
          line: lineIdx + 1,
          snippetMasked: line.replace(/[a-zA-Z0-9]/g, '*').slice(0, 40)
        });
      }
    }
  }

  return {
    hasSecret: findings.length > 0,
    findings
  };
}

export function scanAndClassifyFile(filePath: string, content?: string): FileClassificationResult {
  const norm = filePath.replace(/\\/g, '/').toLowerCase();

  // 1. PROHIBITED (Owner Gate Private Key, Raw SSH Private Keys, Decrypted recovery keys)
  if (
    norm.includes('owner_gate_ed25519') ||
    norm.includes('dr-recovery') ||
    norm.includes('age-identity') ||
    norm.endsWith('.agekey') ||
    norm.includes('.ssh/id_') ||
    norm.endsWith('.kdbx') ||
    norm.includes('ntuser.dat') ||
    norm.includes('appdata')
  ) {
    return {
      filePath,
      category: FileClassification.PROHIBITED,
      uploadAllowed: false,
      prohibitedForPlaintextGit: true,
      presenceOnly: true,
      reason: 'Prohibited security or system file: presence only recorded, never uploaded.'
    };
  }

  if (content && /-----BEGIN (?:.*)PRIVATE KEY-----/i.test(content)) {
    return {
      filePath,
      category: FileClassification.PROHIBITED,
      uploadAllowed: false,
      prohibitedForPlaintextGit: true,
      presenceOnly: true,
      reason: 'Contains raw private key material.'
    };
  }

  // 2. REGENERABLE_EXCLUDE
  if (
    norm.includes('/node_modules/') ||
    norm.startsWith('node_modules/') ||
    norm.includes('/.cache/') ||
    norm.includes('/tmp/') ||
    norm.endsWith('.log') ||
    norm.includes('/dist/')
  ) {
    return {
      filePath,
      category: FileClassification.REGENERABLE_EXCLUDE,
      uploadAllowed: false,
      prohibitedForPlaintextGit: true,
      presenceOnly: false,
      reason: 'Regenerable or build/transient artifact.'
    };
  }

  // 3. DR_ENCRYPTED (.env, runtime state, private DB dumps, non-example credentials)
  if (
    norm.endsWith('.env') ||
    (norm.includes('.env.') && !norm.endsWith('.env.example')) ||
    norm.endsWith('.sqlite') ||
    norm.endsWith('.dump') ||
    norm.includes('credentials') ||
    norm.includes('tokens.json')
  ) {
    return {
      filePath,
      category: FileClassification.DR_ENCRYPTED,
      uploadAllowed: true,
      prohibitedForPlaintextGit: true,
      presenceOnly: false,
      reason: 'Sensitive environment/runtime state: must be encrypted for DR.'
    };
  }

  // Also check content for secrets if provided
  if (content) {
    const scan = detectSecretsInContent(content);
    if (scan.hasSecret) {
      return {
        filePath,
        category: FileClassification.DR_ENCRYPTED,
        uploadAllowed: true,
        prohibitedForPlaintextGit: true,
        presenceOnly: false,
        reason: `Contained detected secrets (${scan.findings.map(f => f.type).join(', ')})`
      };
    }
  }

  // 4. VERSIONED_SOURCE (Default for normal code, docs, schemas)
  return {
    filePath,
    category: FileClassification.VERSIONED_SOURCE,
    uploadAllowed: true,
    prohibitedForPlaintextGit: false,
    presenceOnly: false,
    reason: 'Standard versioned source code or documentation.'
  };
}

export function scanProjectFiles(dirPath: string): { hasPlaintextSecret: boolean; findings: any[] } {
  let hasPlaintextSecret = false;
  const findings: any[] = [];

  function walk(current: string) {
    const entries = readdirSync(current, { withFileTypes: true });
    for (const ent of entries) {
      const full = join(current, ent.name);
      if (ent.isDirectory()) {
        if (ent.name === '.git' || ent.name === 'node_modules' || ent.name === '.cache') continue;
        walk(full);
      } else if (ent.isFile()) {
        try {
          const content = readFileSync(full, 'utf8');
          const classification = scanAndClassifyFile(full, content);
          if (classification.category === FileClassification.DR_ENCRYPTED || classification.category === FileClassification.PROHIBITED) {
            hasPlaintextSecret = true;
            findings.push({ file: full, category: classification.category, reason: classification.reason });
          }
        } catch {
          // ignore binary read failures
        }
      }
    }
  }

  walk(dirPath);
  return { hasPlaintextSecret, findings };
}


export function assertUploadSetSafe(filePaths: string[]): void {
  const blocked: Array<{ file: string; reason: string }> = [];

  for (const filePath of filePaths) {
    let content: string | undefined;
    try {
      content = readFileSync(filePath, 'utf8');
    } catch {
      content = undefined;
    }

    const classification = scanAndClassifyFile(filePath, content);
    const secretScan = content ? detectSecretsInContent(content) : { hasSecret: false, findings: [] };

    if (
      classification.category === FileClassification.PROHIBITED ||
      classification.category === FileClassification.DR_ENCRYPTED ||
      secretScan.hasSecret
    ) {
      blocked.push({ file: filePath, reason: classification.reason });
    }
  }

  if (blocked.length > 0) {
    const names = blocked.map(x => x.file).join(', ');
    throw new Error(`UPLOAD_SET_BLOCKED: prohibited or plaintext-sensitive material detected: ${names}`);
  }
}
