#!/usr/bin/env pwsh
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "../..")
$FeatureBranch = "feature/ai-dev-bridge-b-autonomous-backlog"
$TaskBranch = "agent-task/bridge-b-autonomous-backlog"
$TaskId = "bridge-b-autonomous-backlog"
$TaskFile = Join-Path $RepoRoot "automation/tasks/ai-dev-bridge-b-autonomous-backlog.json"
$Orchestrator = Join-Path $RepoRoot "automation/agent-bridge/orchestrator.ps1"
$Worktree = Join-Path $RepoRoot ".agent-worktrees/$TaskId"

Push-Location $RepoRoot
try {
    $current = (git branch --show-current).Trim()
    if ($current -ne $FeatureBranch) {
        throw "BOOTSTRAP_BRANCH_REQUIRED: checkout $FeatureBranch before running."
    }

    $dirty = git status --porcelain
    if ($dirty) {
        throw "PRIMARY_WORKTREE_NOT_CLEAN: commit/stash local changes before Bridge-B bootstrap."
    }

    git fetch origin
    if ($LASTEXITCODE -ne 0) { throw "git fetch failed" }

    git merge --ff-only "origin/$FeatureBranch"
    if ($LASTEXITCODE -ne 0) { throw "Feature branch is not fast-forwardable to origin." }

    Write-Host "[Bridge-B bootstrap] Starting guarded Antigravity -> Codex -> Antigravity task..." -ForegroundColor Cyan
    & $Orchestrator -TaskFile $TaskFile
    $bridgeExit = $LASTEXITCODE
    if ($bridgeExit -ne 0) {
        throw "Bridge task did not complete successfully. Exit code: $bridgeExit"
    }

    if (-not (Test-Path $Worktree)) {
        throw "Expected isolated worktree not found: $Worktree"
    }

    $taskCurrent = (git -C $Worktree branch --show-current).Trim()
    if ($taskCurrent -ne $TaskBranch) {
        throw "Unexpected task branch '$taskCurrent' (expected '$TaskBranch')."
    }

    $taskDirty = git -C $Worktree status --porcelain
    if ($taskDirty) {
        throw "TASK_WORKTREE_DIRTY_AFTER_PASS: refusing integration."
    }

    Write-Host "[Bridge-B bootstrap] Pushing audited task branch..." -ForegroundColor Cyan
    git -C $Worktree push -u origin $TaskBranch
    if ($LASTEXITCODE -ne 0) { throw "Task branch push failed." }

    Write-Host "[Bridge-B bootstrap] Fast-forwarding feature integration branch..." -ForegroundColor Cyan
    git merge --ff-only $TaskBranch
    if ($LASTEXITCODE -ne 0) {
        throw "FEATURE_INTEGRATION_NOT_FAST_FORWARD: manual audit required; no merge performed."
    }

    git push origin $FeatureBranch
    if ($LASTEXITCODE -ne 0) { throw "Feature branch push failed." }

    Write-Host ""
    Write-Host "BRIDGE_B_BOOTSTRAP: PASS" -ForegroundColor Green
    Write-Host "Feature branch: $FeatureBranch" -ForegroundColor Green
    Write-Host "Task branch:    $TaskBranch" -ForegroundColor Green
    Write-Host "Production:     UNTOUCHED" -ForegroundColor Green
    Write-Host "Main merge:     NOT PERFORMED (Human Gate)" -ForegroundColor Yellow
}
finally {
    Pop-Location
}
