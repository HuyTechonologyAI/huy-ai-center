#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Main orchestrator for the AI-DEV-BRIDGE-A automation bridge.

.DESCRIPTION
    Accepts a task contract JSON file and drives the full automation flow:
    Task Contract -> Risk Classification -> Approval Gate -> Antigravity Plan
    -> Codex Implementation -> Verification -> Antigravity Audit -> Commit

.PARAMETER TaskFile
    Path to a task contract JSON file (validated against automation-task.schema.json).

.PARAMETER DryRun
    Run pre-flight and contract validation only - do not execute the task.

.EXAMPLE
    .\automation\agent-bridge\orchestrator.ps1 -TaskFile task.json
    .\automation\agent-bridge\orchestrator.ps1 -DryRun
#>

param(
    [string]$TaskFile = "",
    [switch]$DryRun = $false
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Continue"

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "../..")
$BridgeCli = Join-Path $RepoRoot "automation/agent-bridge/src/cli.ts"

Write-Host "`n============================================================" -ForegroundColor Cyan
Write-Host " AI-DEV-BRIDGE-A ORCHESTRATOR" -ForegroundColor Cyan
Write-Host " HUY TECHNOLOGY AI GROUP - HAIP CONTROL PLANE" -ForegroundColor Cyan
Write-Host "============================================================`n" -ForegroundColor Cyan

# -- 1. Pre-flight ------------------------------------------------
Write-Host "[orchestrator] Running pre-flight..." -ForegroundColor Yellow
& "$PSScriptRoot\preflight.ps1"
if ($LASTEXITCODE -ne 0) {
    Write-Host "[orchestrator] ABORT: Pre-flight failed." -ForegroundColor Red
    exit 1
}

if ($DryRun -and -not $TaskFile) {
    Write-Host "[orchestrator] DRY-RUN mode: pre-flight passed. No task file provided - exiting." -ForegroundColor Green
    exit 0
}

# -- 2. Task contract --------------------------------------------
if (-not $TaskFile) {
    Write-Host "[orchestrator] ERROR: -TaskFile is required when not in DryRun-only mode." -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $TaskFile)) {
    Write-Host "[orchestrator] ERROR: Task file not found: $TaskFile" -ForegroundColor Red
    exit 1
}

Write-Host "[orchestrator] Loading task contract: $TaskFile" -ForegroundColor Yellow
$resolvedTaskFile = Resolve-Path $TaskFile

if ($DryRun) {
    Write-Host "[orchestrator] DRY-RUN mode: Validating task contract via CLI..." -ForegroundColor Yellow
    Push-Location $RepoRoot
    try {
        npx tsx $BridgeCli --task "$resolvedTaskFile" --preflight
        $exitCode = $LASTEXITCODE
    }
    finally {
        Pop-Location
    }
    Write-Host "[orchestrator] DRY-RUN validation complete." -ForegroundColor Green
    exit $exitCode
}

# -- 3. Execute via CLI entrypoint ------------------------------
Write-Host "[orchestrator] Invoking bridge CLI: $BridgeCli" -ForegroundColor Cyan

Push-Location $RepoRoot
try {
    npx tsx $BridgeCli --task "$resolvedTaskFile"
    $exitCode = $LASTEXITCODE
}
finally {
    Pop-Location
}

if ($exitCode -eq 0) {
    Write-Host "`n[orchestrator] TASK COMPLETE: PASS" -ForegroundColor Green
}
elseif ($exitCode -eq 2) {
    Write-Host "`n[orchestrator] TASK FAILED: Contract schema invalid" -ForegroundColor Red
}
elseif ($exitCode -eq 3) {
    Write-Host "`n[orchestrator] TASK PAUSED: HUMAN_GATE required (R3/R4 action)" -ForegroundColor Yellow
}
elseif ($exitCode -eq 4) {
    Write-Host "`n[orchestrator] TASK BLOCKED: Automation limit reached or CLI unavailable" -ForegroundColor DarkYellow
}
elseif ($exitCode -eq 5) {
    Write-Host "`n[orchestrator] TASK FAILED: Agent plan or audit invalid" -ForegroundColor Red
}
else {
    Write-Host "`n[orchestrator] TASK STATUS: Non-zero exit code $exitCode. See .artifacts/ for details." -ForegroundColor Yellow
}

Write-Host "============================================================`n" -ForegroundColor Cyan
exit $exitCode
