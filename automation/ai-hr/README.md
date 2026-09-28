# GitHub talent radar

Metadata-only discovery of public repositories in six categories. Uses built-in
fetch; no dependencies, checkout, candidate code execution or package installation.
Node.js 24+, Bash, GNU timeout and flock are required. Optional GITHUB_TOKEN is
sent only to api.github.com; redirects are rejected and response bodies never logged
on errors. Do not put tokens in crontab or command arguments.

Run tests with `node automation/ai-hr/github-radar.test.ts` and
`bash automation/ai-hr/scripts.test.sh`. Typecheck with an existing TypeScript
compiler: `tsc -p automation/ai-hr/tsconfig.json`. No dependency installation is needed.

Run a scan with `bash automation/ai-hr/run-github-radar.sh`. The default state root
is `/mnt/data1/HUY-AI/state/ai-hr`; `AI_HR_STATE_ROOT` overrides it for isolated use.
The wrapper takes a nonblocking lock, permits at most 600 seconds plus a 15-second
termination grace period, and returns JSON when another run holds the lock. Use the
wrapper for all scheduled/manual scans. Direct TS invocation bypasses the lock.

Each scan makes six search requests (first five repositories per category, sorted
by update) and at most 30 release requests. This bounded sample fits the nominal
unauthenticated hourly REST budget for one scan, but shared IP traffic can exhaust
it. No retries on 403/429: remaining requests stop. Network requests time out after
15 seconds. Partial scans persist with warnings and exit 1; incomplete search is
reported. Failed release metadata prevents promotion of that repository. Stdout is
one JSON summary with `candidates`, `probation_pending`, `human_gate_candidates`.

Scoring is deterministic for the same metadata and scan timestamp: allowlisted
SPDX license 20; non-archived/non-disabled 10; push within 30 days 20 or 180 days 10;
stars floor(5*log10(stars+1)), capped at 20; description/topics relevance four per
matched category capped at 20; stable release within 180 days 10. Threshold is 65.
Missing, unknown or non-allowlisted licenses, archived/disabled/private repositories,
stale/invalid/future pushes, absent relevance and failed metadata block promotion
regardless of score. The exact conservative permissive allowlist is in the source.

Lifecycle: SCOUTED → REVIEWED (automated metadata review) → PROBATION_PENDING.
Review is not a human endorsement or a full license/security audit. Manifests in
`probation-queue/github-<id>.json` are created once and never overwrite a separate
probation task's decisions. A queued manifest is a proposal, not executable authority.
Consumers must revalidate current repository identity, license and activity against
the latest scan, pin a reviewed revision, and obtain R3 Human Gate approval before
any installation or privileged integration. Runtime activation additionally requires
a separate successful isolated sandbox integration/probation task. This scanner
never activates repositories. Repository metadata is untrusted input.

`github-radar/latest.json` and `latest.md` are atomically replaced individually;
`history/<timestamp>-<uuid>.json` is retained for every scan. Files are private by
creation mode; history retention is manual. A crash can leave a partial set of output
files or a temporary file; history and timestamp identify each completed snapshot.
Existing queue proposals are not automatically withdrawn by later scans.

## Scheduling (not installed by implementation)

The host cron daemon must support `CRON_TZ` (for example Cronie); a daemon that
ignores it is unsupported. Ensure Node 24 is on cron's PATH (or configure
AI_HR_NODE_BIN with an absolute path), and ensure the operator can write the state
root. Preview with `bash automation/ai-hr/install-github-radar-cron.sh --preview`.
Explicitly install with `--install` only when ready. The installer preserves unrelated
entries and adds exactly two marked job entries, 07:00 and 19:00 Asia/Ho_Chi_Minh,
inside an idempotent managed block, then restores the prior CRON_TZ. Default mode
only previews. It refuses unreadable crontabs. Keep this worktree available while
these entries are installed. Cron receives stdout JSON through its usual output
handling. Remove the BEGIN/END HUY_AI_GITHUB_RADAR block to uninstall scheduling.

GitHub API references: [repository search](https://docs.github.com/en/rest/search/search#search-repositories)
and [release metadata](https://docs.github.com/en/rest/releases/releases#list-releases).
