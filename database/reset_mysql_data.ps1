# Replaces XAMPP's damaged MySQL data folder with the clean factory copy.
# The old folder is only RENAMED (data_broken_<date>), never deleted.
# MedAsset is rebuilt afterwards with install_database.ps1 + create_admin + load_demo_data.ps1.
#   1) In XAMPP, click Stop on MySQL (and Apache). Close the backend/frontend windows.
#   2) powershell -ExecutionPolicy Bypass -File .\reset_mysql_data.ps1
$ErrorActionPreference = 'Stop'
$base = 'C:\xampp\mysql'
if (-not (Test-Path "$base\backup")) { throw "Clean copy not found: $base\backup" }
Get-Process mysqld -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2
if (Get-NetTCPConnection -LocalPort 3306 -State Listen -ErrorAction SilentlyContinue) {
  throw 'Port 3306 is still in use by another program. Stop it first (Windows MySQL service?).'
}
$stamp = Get-Date -Format 'yyyyMMdd_HHmm'
Rename-Item "$base\data" "data_broken_$stamp"
Copy-Item "$base\backup" "$base\data" -Recurse
Write-Host "Done. Old data kept as $base\data_broken_$stamp" -ForegroundColor Green
Write-Host 'Next: click Start on MySQL in XAMPP, then run:'
Write-Host '  cd C:\Projects\medasset\database'
Write-Host '  powershell -ExecutionPolicy Bypass -File .\install_database.ps1'
Write-Host '  cd ..\backend ; python manage.py create_admin'
Write-Host '  cd ..\database ; powershell -ExecutionPolicy Bypass -File .\load_demo_data.ps1'
