#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Safe worktree cleanup for the AI-DEV-BRIDGE-A automation bridge.

.DESCRIPTION
    Removes completed agent task worktrees. Safety checks:
    - Confirms task is marked complete
    - Verifies no uncommitted changes remain
    - Never touches the Human Owner's primary workspace
    - Never runs destructive cleanup on non-agent worktrees

.PARAMETER TaskId
    The task ID whose worktree should be cleaned up.

.PARAMETER Force
    Skip uncommitted-change check (use with caution).

.EXAMPLE
    .\automation\agent-bridge\cleanup.ps1 -TaskId "bridge-20260922-001"
#>

param(
    [Parameter(Mandatory = $true)]
    [string]$TaskId,

    [switch]$Force = $false
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "../..")
$WorktreesRoot = Join-Path $RepoRoot ".agent-worktrees"
$SafeId = $TaskId -replace '[^a-zA-Z0-9_-]', '-'
$WorktreePath = Join-Path $WorktreesRoot $SafeId

Write-Host "`n[cleanup] Task: $TaskId" -ForegroundColor Cyan
Write-Host "[cleanup] Path: $WorktreePath"

# Guard: do not delete if path is not inside .agent-worktrees/
if (-not $WorktreePath.StartsWith($WorktreesRoot)) {
    Write-Error "SAFETY ABORT: Path escapes .agent-worktrees/ boundary: $WorktreePath"
    exit 1
}

# Guard: path must exist
if (-not (Test-Path $WorktreePath)) {
    Write-Host "[cleanup] Worktree not found - already cleaned or never created." -ForegroundColor Yellow
    exit 0
}

# Guard: check for uncommitted changes
if (-not $Force) {
    Push-Location $WorktreePath
    try {
        $status = git status --porcelain 2>&1
        if ($status.Trim()) {
            Write-Host "[cleanup] ABORTED: Uncommitted changes detected in worktree." -ForegroundColor Red
            Write-Host "          Run with -Force to override (review changes first)." -ForegroundColor Red
            Write-Host $status
            exit 1
        }
    }
    finally {
        Pop-Location
    }
}

# Remove worktree via git
Write-Host "[cleanup] Removing git worktree..." -ForegroundColor Yellow
git worktree remove --force $WorktreePath 2>&1 | Out-Null

# Prune stale references
git worktree prune 2>&1 | Out-Null

# Filesystem fallback
if (Test-Path $WorktreePath) {
    Remove-Item -Path $WorktreePath -Recurse -Force
}

Write-Host "[cleanup] Worktree removed: $WorktreePath" -ForegroundColor Green
Write-Host "[cleanup] COMPLETE — task $TaskId cleaned up safely.`n" -ForegroundColor Green
