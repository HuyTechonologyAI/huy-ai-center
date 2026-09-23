#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Pre-flight check for the AI-DEV-BRIDGE-A automation bridge.

.DESCRIPTION
    Verifies all required and optional tools are installed and accessible.
    Reports: git, node, npm (required) | agy, codex, gh (optional).
    NEVER installs missing tools - reports HUMAN_SETUP_REQUIRED.
#>

Set-StrictMode -Version Latest
$ErrorActionPreference = "Continue"

Write-Host "`n============================================================" -ForegroundColor Cyan
Write-Host " AI-DEV-BRIDGE-A: PRE-FLIGHT CHECK" -ForegroundColor Cyan
Write-Host "============================================================`n" -ForegroundColor Cyan

$allRequired = $true
$report = @{}

function Test-Tool {
    param(
        [string]$Name,
        [string[]]$ToolArgs = @("--version"),
        [bool]$Required = $false
    )

    $cmd = Get-Command $Name -ErrorAction SilentlyContinue
    if ($cmd) {
        try {
            $output = & $Name $ToolArgs 2>&1
            $version = ($output | Select-Object -First 1).ToString().Trim()
            Write-Host "  [OK] $Name : $version" -ForegroundColor Green
            return @{ installed = $true; version = $version; status = "READY" }
        }
        catch {
            Write-Host "  [OK] $Name : installed (version check error)" -ForegroundColor Green
            return @{ installed = $true; version = "UNKNOWN"; status = "READY" }
        }
    }
    else {
        if ($Required) {
            Write-Host "  [MISSING] $Name : NOT FOUND (REQUIRED)" -ForegroundColor Red
            Write-Host "            => HUMAN_SETUP_REQUIRED: Install $Name" -ForegroundColor Yellow
            $st = "REQUIRED_MISSING"
        }
        else {
            Write-Host "  [SKIP] $Name : NOT FOUND (optional - bridge degrades gracefully)" -ForegroundColor DarkYellow
            $st = "UNAVAILABLE"
        }
        return @{ installed = $false; version = "NOT_FOUND"; status = $st }
    }
}

Write-Host "Required tools:" -ForegroundColor White
$report["git"]  = Test-Tool -Name "git"  -ToolArgs @("--version") -Required $true
$report["node"] = Test-Tool -Name "node" -ToolArgs @("--version") -Required $true
$report["npm"]  = Test-Tool -Name "npm"  -ToolArgs @("--version") -Required $true

Write-Host "`nOptional tools (bridge degrades gracefully if missing):" -ForegroundColor White
$report["agy"]   = Test-Tool -Name "agy"   -ToolArgs @("--version")
$report["codex"] = Test-Tool -Name "codex" -ToolArgs @("--version")
$report["gh"]    = Test-Tool -Name "gh"    -ToolArgs @("--version")

# Check required
foreach ($key in @("git", "node", "npm")) {
    if (-not $report[$key].installed) {
        $allRequired = $false
    }
}

Write-Host "`n------------------------------------------------------------" -ForegroundColor DarkGray

if ($allRequired) {
    Write-Host " PREFLIGHT: PASS - all required tools available" -ForegroundColor Green

    # Report optional CLI status
    if (-not $report["agy"].installed) {
        Write-Host " WARNING: Antigravity CLI (agy) not found - ANTIGRAVITY_UNAVAILABLE" -ForegroundColor Yellow
        Write-Host "          Planning and audit steps will be skipped." -ForegroundColor Yellow
    }
    if (-not $report["codex"].installed) {
        Write-Host " WARNING: Codex CLI not found - CODEX_UNAVAILABLE" -ForegroundColor Yellow
        Write-Host "          Implementation step requires: HUMAN_SETUP_REQUIRED" -ForegroundColor Yellow
    }
    if (-not $report["gh"].installed) {
        Write-Host " INFO: GitHub CLI (gh) not found - PR creation via CLI unavailable." -ForegroundColor DarkYellow
        Write-Host "       PRs may be created via GitHub web UI or MCP integration." -ForegroundColor DarkYellow
    }
}
else {
    Write-Host " PREFLIGHT: FAIL - required tools missing" -ForegroundColor Red
    Write-Host " ACTION REQUIRED: Install missing tools before running the bridge." -ForegroundColor Red
    exit 1
}

Write-Host "============================================================`n" -ForegroundColor Cyan
