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
$BridgeSrc = Join-Path $RepoRoot "automation/agent-bridge/src"

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

# ── 2. Task contract ────────────────────────────────────────────
if (-not $TaskFile) {
    Write-Host "[orchestrator] ERROR: -TaskFile is required when not in DryRun-only mode." -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $TaskFile)) {
    Write-Host "[orchestrator] ERROR: Task file not found: $TaskFile" -ForegroundColor Red
    exit 1
}

Write-Host "[orchestrator] Loading task contract: $TaskFile" -ForegroundColor Yellow
$contractJson = Get-Content $TaskFile -Raw

# ── 3. Execute via Node.js bridge ──────────────────────────────
$runnerScript = @"
import { validateContract, runTask, preflight } from '$($BridgeSrc -replace '\\','/')/index.js';
import { writeFileSync } from 'node:fs';

const reportPath = '.artifacts/bridge-run-report.json';

const contract = JSON.parse(process.argv[2]);
const validation = validateContract(contract);

if (!validation.valid) {
  console.error('[bridge] Contract invalid:', validation.errors.join('; '));
  process.exit(2);
}

console.log('[bridge] Contract valid. Starting task:', contract.taskId);

const state = await runTask(validation.contract, process.cwd());

console.log('[bridge] Task complete. Status:', state.status);
writeFileSync(reportPath, JSON.stringify(state, null, 2));
process.exit(state.status === 'COMPLETE' ? 0 : 1);
"@

if ($DryRun) {
    Write-Host "[orchestrator] DRY-RUN: Would execute task contract validation and risk gate." -ForegroundColor Green
    Write-Host "[orchestrator] Contract JSON preview:" -ForegroundColor DarkGray
    Write-Host $contractJson -ForegroundColor DarkGray
    exit 0
}

Push-Location $RepoRoot
try {
    $escapedJson = $contractJson -replace '"', '\"'
    node --input-type=module --loader tsx/esm "$BridgeSrc/index.ts" $escapedJson 2>&1
    $exitCode = $LASTEXITCODE
}
finally {
    Pop-Location
}

if ($exitCode -eq 0) {
    Write-Host "`n[orchestrator] TASK COMPLETE: PASS" -ForegroundColor Green
}
elseif ($exitCode -eq 2) {
    Write-Host "`n[orchestrator] TASK FAILED: Contract invalid" -ForegroundColor Red
}
else {
    Write-Host "`n[orchestrator] TASK STATUS: See .artifacts/ for details" -ForegroundColor Yellow
}

Write-Host "============================================================`n" -ForegroundColor Cyan
exit $exitCode
