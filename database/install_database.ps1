# =====================================================================
# MedAsset database installer (XAMPP). Run from the project folder:
#     cd C:\Projects\medasset\database
#     powershell -ExecutionPolicy Bypass -File .\install_database.ps1
# WARNING: this DROPS and recreates medasset_db (all data is lost).
# It then creates the restricted application account and writes its
# random password to ..\backend\.env
# =====================================================================
$ErrorActionPreference = 'Stop'
$mysql = 'C:\xampp\mysql\bin\mysql.exe'
if (-not (Test-Path $mysql)) { throw "mysql.exe not found at $mysql" }
$here = $PSScriptRoot
$envFile = Join-Path (Split-Path $here -Parent) 'backend\.env'

function Run-Sql([string]$file) {
  Write-Host "  running $(Split-Path $file -Leaf) ..."
  cmd /c "`"$mysql`" -u root --default-character-set=utf8mb4 < `"$file`""
  if ($LASTEXITCODE -ne 0) { throw "FAILED: $file" }
}

Write-Host 'Installing MedAsset database' -ForegroundColor Cyan
foreach ($f in '01_schema','02_triggers','03_functions_views','04_procedures_write','05_procedures_read','06_events','08_security_schema','09_security_procedures') {
  Run-Sql (Join-Path $here "$f.sql")
}

# Application account: reuse the password in .env, or generate a new one
$password = $null
if (Test-Path $envFile) {
  $line = Select-String -Path $envFile -Pattern '^MEDASSET_DB_PASSWORD=(.+)$' | Select-Object -First 1
  if ($line) { $password = $line.Matches[0].Groups[1].Value.Trim() }
}
if (-not $password) {
  $chars = (48..57) + (65..90) + (97..122)
  $password = -join ($chars | Get-Random -Count 28 | ForEach-Object { [char]$_ })
  $content = "MEDASSET_DB_USER=medasset_app`r`nMEDASSET_DB_PASSWORD=$password`r`n"
  Set-Content -Path $envFile -Value $content -Encoding ascii
  Write-Host "  wrote $envFile (keep it out of Git)"
}
$tmp = Join-Path $env:TEMP 'medasset_app_account.sql'
(Get-Content (Join-Path $here '10_app_account.sql') -Raw).Replace('CHANGE_ME_STRONG_PASSWORD', $password) | Set-Content -Path $tmp -Encoding ascii
try { Run-Sql $tmp } finally { Remove-Item $tmp -ErrorAction SilentlyContinue }

Write-Host ''
Write-Host 'Database ready.' -ForegroundColor Green
Write-Host 'Next: cd ..\backend ; python manage.py create_admin'
Write-Host 'Optional demo data (after the admin exists): .\load_demo_data.ps1'
