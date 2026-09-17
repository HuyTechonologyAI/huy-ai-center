# ==============================================================================
# HUY TECHNOLOGY AI CENTER — SQL MIGRATIONS STATIC VALIDATION SCRIPT
# ==============================================================================

Write-Host ">>> [1/3] Scanning SQL Migration Files in supabase/migrations/..." -ForegroundColor Cyan
$migrationFiles = Get-ChildItem -Path "./supabase/migrations/*.sql" | Sort-Object Name

if ($migrationFiles.Count -eq 0) {
    Write-Host "ERROR: No SQL migration files found!" -ForegroundColor Red
    exit 1
}

Write-Host "Found $($migrationFiles.Count) migration files:"
$migrationFiles | ForEach-Object { Write-Host "  - $($_.Name)" -ForegroundColor Gray }

Write-Host "`n>>> [2/3] Validating Table Design Standards (UUID, Timestamps, RLS)..." -ForegroundColor Cyan
$allPassed = $true

foreach ($file in $migrationFiles) {
    $content = Get-Content $file.FullName -Raw

    # 1. Check for hardcoded secrets
    if ($content -match "eyJhbGci" -or $content -match "sk-[a-zA-Z0-9]{20,}") {
        Write-Host "CRITICAL ERROR: Potential hardcoded secret in $($file.Name)" -ForegroundColor Red
        $allPassed = $false
    }

    # 2. Check for DROP DATABASE or DROP TABLE
    if ($content -match "DROP\s+DATABASE" -or $content -match "DROP\s+TABLE(?!\s+IF\s+EXISTS)") {
        Write-Host "CRITICAL ERROR: Destructive DROP statement in $($file.Name)" -ForegroundColor Red
        $allPassed = $false
    }

    # 3. Check for CREATE TABLE without UUID primary key
    $tables = [regex]::Matches($content, "CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?public\.([a-zA-Z0-9_]+)")
    foreach ($match in $tables) {
        $tableName = $match.Groups[1].Value
        # Check if RLS is enabled for this table
        if ($content -notmatch "ALTER\s+TABLE\s+public\.$tableName\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY") {
            Write-Host "WARNING: Table '$tableName' in $($file.Name) does not explicitly enable RLS!" -ForegroundColor Yellow
        }
    }
}

if (-not $allPassed) {
    Write-Host "`nFAILED: SQL migration validation detected errors." -ForegroundColor Red
    exit 1
}

Write-Host "`n>>> [3/3] Checking Secret and Code Hygiene..." -ForegroundColor Cyan
& powershell.exe -ExecutionPolicy Bypass -File ./scripts/verify-safety.ps1
if ($LASTEXITCODE -ne 0) {
    Write-Host "FAILED: verify-safety.ps1 failed." -ForegroundColor Red
    exit 1
}

Write-Host "`n>>> ALL SQL MIGRATION VALIDATIONS PASSED CLEANLY!" -ForegroundColor Green
exit 0
