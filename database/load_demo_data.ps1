# Loads the demo hospital data. Requires an administrator (python manage.py create_admin).
# All demo changes are attributed to the first Administrator in the audit log.
$ErrorActionPreference = 'Stop'
$mysql = 'C:\xampp\mysql\bin\mysql.exe'
$file = Join-Path $PSScriptRoot '07_seed_data.sql'
cmd /c "`"$mysql`" -u root --default-character-set=utf8mb4 < `"$file`""
if ($LASTEXITCODE -ne 0) { throw 'Demo data load failed (did you run create_admin first?)' }
Write-Host 'Demo data loaded.' -ForegroundColor Green
