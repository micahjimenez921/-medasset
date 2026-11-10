# Re-applies the restricted app account (EXECUTE only) using the password in backend\.env.
# Use when the backend shows: Access denied for user 'medasset_app' (error 1044). No data is touched.
#   cd C:\Projects\medasset\database
#   powershell -ExecutionPolicy Bypass -File .\fix_app_account.ps1
$ErrorActionPreference = 'Stop'
$mysql = 'C:\xampp\mysql\bin\mysql.exe'
$envFile = Join-Path (Split-Path $PSScriptRoot -Parent) 'backend\.env'
$line = Select-String -Path $envFile -Pattern '^MEDASSET_DB_PASSWORD=(.+)$' | Select-Object -First 1
if (-not $line) { throw "MEDASSET_DB_PASSWORD not found in $envFile" }
$pw = $line.Matches[0].Groups[1].Value.Trim()
$tmp = Join-Path $env:TEMP 'medasset_app_account.sql'
(Get-Content (Join-Path $PSScriptRoot '10_app_account.sql') -Raw).Replace('CHANGE_ME_STRONG_PASSWORD', $pw) | Set-Content -Path $tmp -Encoding ascii
try {
  cmd /c "`"$mysql`" -u root < `"$tmp`""
  if ($LASTEXITCODE -ne 0) { throw 'Grant failed - the MySQL system tables may be damaged (see Aria/checksum error above).' }
} finally { Remove-Item $tmp -ErrorAction SilentlyContinue }
cmd /c "`"$mysql`" -u root -e ""SHOW GRANTS FOR 'medasset_app'@'localhost'"""
Write-Host 'Done. Now restart: python manage.py runserver' -ForegroundColor Green
