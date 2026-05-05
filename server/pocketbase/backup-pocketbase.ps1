$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$pbData = Join-Path $root "pb_data"
$backupRoot = Join-Path $root "backups"

if (!(Test-Path $pbData)) {
  Write-Error "pb_data not found. Start PocketBase once to create it."
  exit 1
}

if (Get-Process -Name "pocketbase" -ErrorAction SilentlyContinue) {
  Write-Warning "PocketBase is running. Stop it for a consistent backup."
}

New-Item -ItemType Directory -Force $backupRoot | Out-Null
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$dest = Join-Path $backupRoot "pb_data-$timestamp.zip"

Compress-Archive -Path $pbData -DestinationPath $dest -Force
Write-Host "Backup created: $dest"
