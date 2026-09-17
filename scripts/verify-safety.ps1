# ==============================================================================
# HUY TECHNOLOGY AI CENTER — SAFETY & INTEGRITY VERIFICATION SCRIPT
# ==============================================================================

Write-Host ">>> [1/4] Checking Git and Ignored Secret Files..." -ForegroundColor Cyan
$trackedEnv = git ls-files | Select-String -Pattern "^\.env" | Where-Object { $_ -notmatch "\.env\.example" }
if ($trackedEnv) {
    Write-Host "CRITICAL ERROR: A .env file is tracked in git! $trackedEnv" -ForegroundColor Red
    exit 1
} else {
    Write-Host "PASS: Zero .env files tracked in Git." -ForegroundColor Green
}

Write-Host ">>> [2/4] Scanning for hardcoded API keys or service role secrets..." -ForegroundColor Cyan
$forbiddenPatterns = @(
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[a-zA-Z0-9_\-]{20,}",
    "sk-[a-zA-Z0-9]{32,}"
)

$secretViolations = @()
foreach ($pattern in $forbiddenPatterns) {
    $matches = git grep -E $pattern -- ":(exclude).env.example" 2>$null
    if ($matches) {
        $secretViolations += $matches
    }
}

if ($secretViolations.Count -gt 0) {
    Write-Host "CRITICAL ERROR: Hardcoded secrets found:" -ForegroundColor Red
    $secretViolations | ForEach-Object { Write-Host $_ -ForegroundColor Red }
    exit 1
} else {
    Write-Host "PASS: Zero hardcoded secrets detected." -ForegroundColor Green
}

Write-Host ">>> [3/4] Running Typecheck across all packages & apps..." -ForegroundColor Cyan
npm run typecheck
if ($LASTEXITCODE -ne 0) {
    Write-Host "FAILED: Typecheck reported errors." -ForegroundColor Red
    exit 1
} else {
    Write-Host "PASS: TypeScript compile check succeeded." -ForegroundColor Green
}

Write-Host ">>> [4/4] Running Unit Tests..." -ForegroundColor Cyan
npm run test
if ($LASTEXITCODE -ne 0) {
    Write-Host "FAILED: Unit tests failed." -ForegroundColor Red
    exit 1
} else {
    Write-Host "PASS: All unit tests succeeded." -ForegroundColor Green
}

Write-Host "`n>>> ALL SAFETY AND CODE INTEGRITY CHECKS PASSED!" -ForegroundColor Green
exit 0
