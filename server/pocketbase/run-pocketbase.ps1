$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

$exe = Join-Path $root "pocketbase.exe"
if (!(Test-Path $exe)) {
  Write-Error "pocketbase.exe not found in $root"
  exit 1
}

# Use 0.0.0.0:8090 to allow LAN/Cloudflare tunnel access.
# Override with: $env:PB_BIND="127.0.0.1:8090"
$bind = $env:PB_BIND
if ([string]::IsNullOrWhiteSpace($bind)) {
  $bind = "0.0.0.0:8090"
}

& $exe serve --http $bind
