# SECURITY BOUNDARIES & HARDENING
## AI-DEV-BRIDGE-A | HUY AI CENTER

---

## 1. Core Threat Model

The Codex × Antigravity Bridge executes autonomous agent instructions locally. The security architecture addresses three primary risk vectors:
1. **Unintended Production Mutation:** Accidental DDL, writes to production Supabase, or queue pollution.
2. **Secrets Leakage:** Accidental retention or dissemination of tokens, private keys, or API credentials into logs or git history.
3. **Repository Corruption:** Force pushing, unauthorized merges to `main`, or accidental branch deletion.

---

## 2. Sandbox Configuration

All Codex implementation commands are restricted to a mandatory workspace sandbox:
```bash
codex exec --sandbox workspace-write --ephemeral "<prompt>"
```

### Sandbox Restrictions:
- **`workspace-write`:** File modifications are strictly contained within the active worktree directory (`.agent-worktrees/<task-id>/`).
- **`--ephemeral`:** No persistent daemon state is maintained between task iterations.
- **FORBIDDEN: `danger-full-access`:** This flag is permanently prohibited in Phase A. Any request invoking full access is intercepted and rejected by `command-guard.ts`.

---

## 3. Command Guard Enforcement

`command-guard.ts` intercepts all sub-processes before shell execution.

### Automatically Prohibited Patterns:
- `git push --force`, `git push -f`
- `git push origin main`
- `git reset --hard` (outside disposable task worktree)
- `git clean -fdx` (outside disposable task worktree)
- `vercel --prod`
- `supabase db push`, `supabase migration up` (against linked production)
- `DROP DATABASE`, `DROP TABLE`, `TRUNCATE`, unscoped `DELETE`
- `env`, `printenv` (raw shell environment dumping)
- `gh pr merge`

---

## 4. Secrets Scrubbing & Log Redaction

All stdout, stderr, diff statistics, and JSON audit artifacts pass through `log-redactor.ts` before serialization or console display.

### Scrubber Rules:
- Keys ending in `_KEY`, `_TOKEN`, `_SECRET`, `_PASSWORD` have values replaced with `[REDACTED]`.
- Specific infrastructure patterns (`SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `GOOGLE_API_KEY`, `GITHUB_TOKEN`, `DATABASE_URL`, `CLOUDFLARE_*`) are scrubbed.
- Regex heuristics catch raw JWTs (`eyJ...`), GitHub PATs (`ghp_...`), and Bearer auth headers.
- `.artifacts/` and `.agent-worktrees/` are added to `.gitignore`.

---

## 5. Worktree Concurrency & Branch Isolation

- Antigravity and Codex never operate concurrently on the primary working directory.
- Every task receives its own branch (`agent-task/<task-id>`) created from the specified base ref.
- Even if an agent fails catastrophically or enters an infinite loop, changes remain isolated to its dedicated worktree.
- Worktrees are scrubbed safely post-verification.
