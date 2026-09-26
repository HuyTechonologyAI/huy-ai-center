# HUY AI CENTER — DR HARDENING V1.2 EXECUTION DIRECTIVE

**Branch:** `agent-task/dr-hardening-v1-2`  
**Base:** `agent-task/github-dr-node01-prep`  
**Mode:** AUTONOMOUS / TEST-FIRST / FAIL-CLOSED  
**Production migration:** DENY  
**Source deletion:** DENY  
**/mnt/data2:** R4 PROTECTED — do not read, write, scan, mount, or use as fallback.  
**Goal:** make Disaster Recovery evidence trustworthy enough to unlock a later Node01 authoritative data migration.

## 0. Current security status

Treat the previous V1.1 DR result as quarantined:

```text
DR_V1_1_SECURITY_STATUS=QUARANTINED
SAFE_TO_START_NODE01_MIGRATION=NO
NODE01_AUTHORITATIVE_DATA_MIGRATION=BLOCKED_PENDING_V1_2
```

Do not delete the V1.1 DR repository or its artifacts automatically. Preserve them for audit until a later explicit destructive Human Gate.

## 1. Verified V1.1 findings that MUST be fixed

These findings were independently verified against the current DR implementation on the base branch.

### F01 — predictable embedded encryption fallback

`automation/dr-engine/src/dr-snapshot.ts` falls back to a hard-coded encryption password when neither an argument nor environment secret is supplied.

Required:
- remove every embedded/default recovery password;
- fail closed when recovery material is missing;
- never log, commit, upload, checkpoint, or include private recovery material in receipts;
- prefer `age` X25519 recipient encryption if available;
- if a fallback crypto implementation is required, use a standard authenticated-encryption construction from a maintained library/tool. Do not invent cryptography;
- wrong private key / wrong password MUST fail;
- modified ciphertext MUST fail authentication;
- plaintext temporary archives MUST be deleted in a finally-style cleanup path.

### F02 — restore tester contains synthetic success fallbacks

`automation/dr-engine/src/restore-tester.ts` creates placeholder staged/unstaged/untracked files when real reconstruction fails.

Required:
- remove ALL synthetic restore fallbacks;
- patch-apply failure = RESTORE_TEST FAIL;
- missing untracked payload = RESTORE_TEST FAIL;
- mismatch of content, mode, symlink target, size, or SHA-256 = RESTORE_TEST FAIL;
- a restore test may report PASS only from reconstructed source bytes.

### F03 — untracked data is not actually backed up

`captureDirtyState()` records untracked filenames but not their bytes.

Required:
- archive real untracked file bytes;
- support binary files;
- preserve regular-file mode bits where applicable;
- preserve symlink identity and exact link target without dereferencing outside the repository;
- store manifest entries with relative path, entry type, size, SHA-256, mode and symlink target;
- reject path traversal, absolute paths and unsafe symlink escape.

### F04 — secret/classification status can be hard-coded PASS

`runner.ts` emits PASS status markers even when findings can contradict them.

Required:
- every PASS marker must be derived from actual evidence;
- plaintext-secret finding in any upload candidate MUST stop that upload set;
- prohibited files/private owner keys MUST never enter bundles/snapshots/upload staging;
- no "PASS despite findings" path is allowed.

### F05 — final receipt is under-validated

Required final validation must include ALL security-critical markers, not only a small subset.

At minimum require:
- DR_V1_1_SECURITY_STATUS
- DR_V1_2_CRYPTO
- DR_RECOVERY_KEY_CUSTODY
- ALL_PROJECTS_COVERED
- SECRET_SCAN
- PROHIBITED_DATA_EXCLUDED
- REMOTE_BYTES_VERIFIED
- REAL_DIRTY_STATE_RESTORE
- FALSE_PASS_FALLBACKS
- SOURCE_DATA_DELETED
- OWNER_PRIVATE_KEY_UPLOADED
- PLAINTEXT_SECRET_UPLOADED
- DATA2_MUTATED
- NODE01_AUTHORITATIVE_CUTOVER
- SAFE_TO_START_NODE01_MIGRATION

Unknown/missing values fail closed.

### F06 — backup coverage is incomplete

Known repositories:
- HuyTechonologyAI/huy-ai-center
- HuyTechonologyAI/ai-automation-website
- HuyTechonologyAI/edtech-ai-portfolio
- HuyTechonologyAI/SmartTeacherScheduleAI

Required:
- reconcile every known repo;
- include discovered local-only Git repositories/projects;
- for remote-only repositories, create a temporary mirror/bundle for DR verification without altering source repos;
- each project must have a per-project manifest and independent restore evidence;
- `ALL_PROJECTS_COVERED=PASS` only when every required project has durable remote recovery evidence.

## 2. DR V2 repository

Preferred target:

`HuyTechonologyAI/HUY-AI-DISASTER-RECOVERY-V2`

Requirements:
- PRIVATE repository only;
- verify visibility after creation and immediately before upload;
- never force-push;
- never delete or rewrite the V1.1 DR repository;
- no plaintext secrets;
- no owner Ed25519 private key;
- no DR recovery private key;
- upload only artifacts classified safe for remote custody.

If the repository cannot be created/validated because authentication or organization permission is required, stop at exactly one Human Gate. Do not weaken privacy requirements.

## 3. Recovery-key custody

Generate new V2 recovery material. Do not reuse the V1.1 embedded fallback.

Private recovery key:
- owner-controlled only;
- never GitHub;
- never DR V2 repository;
- never logs;
- never checkpoint JSON;
- never model prompt;
- never chat output.

Public recipient/key identifier may be stored where required.

Before the first authoritative encrypted DR upload, if durable private-key custody has not been proven, stop at:

```text
HUMAN_GATE — DR RECOVERY KEY CUSTODY
Required action: save the generated V2 DR private recovery key in one owner-controlled offline/password-manager location, then approve custody.
```

Until that gate is satisfied:
`DR_RECOVERY_KEY_CUSTODY!=PASS`
and
`SAFE_TO_START_NODE01_MIGRATION=NO`.

## 4. Remote-byte verification

Do not verify uploaded files using only local copies.

Required sequence:
1. produce local artifact and SHA-256;
2. upload/commit to private DR V2;
3. fetch/re-download the remote bytes into a fresh temporary location;
4. SHA-256 the downloaded bytes;
5. compare against local expected SHA-256;
6. only then set `REMOTE_BYTES_VERIFIED=PASS`.

## 5. Real restore verification

Restore in an isolated native-Linux temporary directory using DR V2 artifacts only.

Verify:
- git bundle integrity;
- all required refs;
- actual staged diff;
- actual unstaged diff;
- actual untracked bytes;
- binary files;
- symlink targets;
- file modes where supported;
- per-entry SHA-256 manifest;
- no placeholder/synthetic reconstruction;
- secret scan of restored upload set;
- recovery fails with wrong key;
- recovery fails with tampered ciphertext.

No restore PASS is allowed if any source byte cannot be proven.

## 6. Checkpoint discipline

Use append-only checkpoints with monotonic phase transitions. Every checkpoint must bind:
- migration_id;
- source fingerprint;
- directive version;
- branch/commit;
- tool version;
- artifact hashes;
- previous checkpoint hash;
- status derived from evidence.

Resume must reject:
- changed source fingerprint without explicit new run;
- altered prior evidence;
- missing predecessor;
- phase regression;
- mismatched artifact hash.

## 7. Node01 migration boundary

V1.2 may revalidate the migration toolkit and produce deterministic migration packages, but MUST NOT:
- Taildrop production project/data payload to Node01;
- promote Node01 candidate data;
- change authoritative storage;
- delete Lenovo source data;
- access /mnt/data2.

Those actions remain a later phase after this receipt says `SAFE_TO_START_NODE01_MIGRATION=YES`.

## 8. Test-first protocol

For every remediation:
1. write a failing test that proves the defect;
2. run the focused test and capture RED evidence;
3. implement the smallest safe fix;
4. run focused test until GREEN;
5. run DR test suite;
6. run typecheck/build relevant to changed packages;
7. inspect stack trace and self-repair automatically;
8. repeat until green or a true Human Gate is reached.

Do not create tests that merely assert strings or hard-coded PASS markers. Tests must exercise behavior.

Minimum required cases:

```text
R01 no embedded/default recovery secret
R02 missing recovery material fails closed
R03 wrong recovery key fails
R04 ciphertext tamper fails
R05 plaintext temp cleanup on success
R06 plaintext temp cleanup on failure
R07 real unstaged patch round-trip
R08 real staged patch round-trip
R09 real untracked text bytes round-trip
R10 real untracked binary bytes round-trip
R11 symlink target round-trip
R12 unsafe symlink rejected
R13 path traversal rejected
R14 mode metadata verified
R15 missing untracked payload fails
R16 patch apply failure fails
R17 no synthetic fallback files
R18 secret finding blocks upload
R19 owner key excluded
R20 recovery private key excluded
R21 final receipt rejects missing marker
R22 final receipt rejects contradictory marker
R23 all four known repos reconciled
R24 local-only project included
R25 remote-only repo gets recoverable bundle
R26 remote re-download SHA matches
R27 remote-byte mismatch fails
R28 checkpoint tamper fails resume
R29 source fingerprint change fails resume
R30 /mnt/data2 boundary remains protected
```

## 9. Autonomous execution

Use an isolated worktree. Preserve unrelated dirty work.

Allowed autonomous actions:
- edit code/tests/docs on `agent-task/dr-hardening-v1-2`;
- run tests/typecheck/build;
- create non-destructive temporary files;
- create/validate the new private DR V2 repository;
- commit and push this implementation branch and safe DR V2 artifacts;
- retry and self-repair.

Forbidden:
- production Node01 data cutover;
- source deletion;
- force push;
- main-branch merge;
- public DR repository;
- plaintext/private recovery secret upload;
- /mnt/data2 access.

Repair loop:
- read stack trace;
- classify root cause;
- repair;
- retest;
- checkpoint;
- continue;
- max 8 repair cycles per subproblem;
- same failure 3 times => deepen diagnosis, do not blindly repeat.

## 10. Final acceptance

V1.2 is complete only if the final receipt contains evidence-backed markers:

```text
DR_V1_1_SECURITY_STATUS=QUARANTINED
DR_V1_2_CRYPTO=PASS
DR_RECOVERY_KEY_CUSTODY=PASS
ALL_PROJECTS_COVERED=PASS
SECRET_SCAN=PASS
PROHIBITED_DATA_EXCLUDED=PASS
REMOTE_BYTES_VERIFIED=PASS
REAL_DIRTY_STATE_RESTORE=PASS
FALSE_PASS_FALLBACKS=ZERO
SOURCE_DATA_DELETED=NO
OWNER_PRIVATE_KEY_UPLOADED=NO
PLAINTEXT_SECRET_UPLOADED=NO
DATA2_MUTATED=NO
NODE01_AUTHORITATIVE_CUTOVER=NOT_EXECUTED
SAFE_TO_START_NODE01_MIGRATION=YES
```

If any marker is not proven, final result must be:

`SAFE_TO_START_NODE01_MIGRATION=NO`

## 11. Required deliverables

- implementation code;
- behavior-driven tests;
- per-project DR manifests;
- V2 crypto/key-custody design;
- remote-byte verification evidence;
- isolated restore evidence;
- checkpoint chain;
- `DR_HARDENING_V1_2_REPORT.md`;
- `DR_HARDENING_V1_2_FINAL_RECEIPT.json`;
- commit SHA(s);
- exact list of Human Gates encountered.

Do not claim PASS from plans, mocked placeholders, synthetic files, local-only hash comparisons, or hard-coded status strings.


## 12. Antigravity headless terminal protocol

The execution environment is headless and uses fine-grained permissions. To remain compatible with scoped grants:

- invoke terminal tools directly (examples: `git status`, `npm run test:...`, `npx tsx ...`, `python3 ...`);
- do NOT wrap ordinary commands in `bash -lc`, `sh -c`, command substitution, backticks, process substitution, or generated shell snippets;
- prefer simple literal command prefixes over complex shell composition;
- do NOT request `command(*)`, Turbo, or `--dangerously-skip-permissions`;
- if a command is denied, report the exact command target needed and stop fail-closed rather than claiming completion;
- file edits inside the isolated worktree should use normal workspace file operations;
- any command needing network/host access must remain within the pre-authorized scoped prefixes;
- the final receipt is authoritative; a CLI exit code of 0 alone is never proof of V1.2 completion.


## 13. Policy hook execution contract

The DR worktree may install a temporary workspace-level `PreToolUse` safety hook for `run_command`.

When present:
- obey the hook decisions;
- use direct commands only;
- keep command working directories inside the isolated DR worktree or `/tmp`;
- do not attempt to bypass a denied command with shell wrappers or alternate interpreters;
- if a command is denied by policy, choose an equivalent allowed command or stop fail-closed;
- do not modify or disable the hook;
- do not access owner secrets, `/mnt/data2`, or non-workspace system state;
- network commands are limited to GitHub/DR repository operations and required package/test tooling;
- production Node01 migration remains forbidden.
