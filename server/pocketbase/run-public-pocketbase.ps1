$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

$pbScript = Join-Path $root "run-pocketbase.ps1"
$cloudflaredExe = "C:\Program Files (x86)\cloudflared\cloudflared.exe"
$cloudflaredLog = Join-Path $root "cloudflared.log"
$cloudflaredErr = Join-Path $root "cloudflared.err.log"

if (!(Test-Path $pbScript)) {
  Write-Error "run-pocketbase.ps1 not found in $root"
  exit 1
}

if (!(Test-Path $cloudflaredExe)) {
  Write-Error "cloudflared.exe not found at $cloudflaredExe"
  exit 1
}

$pbListening = Get-NetTCPConnection -LocalPort 8090 -State Listen -ErrorAction SilentlyContinue
if (-not $pbListening) {
  Start-Process -FilePath "powershell.exe" `
    -ArgumentList "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", "`"$pbScript`"" `
    -WorkingDirectory $root `
    -WindowStyle Hidden | Out-Null

  Start-Sleep -Seconds 3
}

if (!(Get-NetTCPConnection -LocalPort 8090 -State Listen -ErrorAction SilentlyContinue)) {
  Write-Error "PocketBase is not listening on port 8090."
  exit 1
}

$existingTunnel = Get-Process cloudflared -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $existingTunnel) {
  if (Test-Path $cloudflaredLog) {
    Remove-Item -LiteralPath $cloudflaredLog -Force
  }
  if (Test-Path $cloudflaredErr) {
    Remove-Item -LiteralPath $cloudflaredErr -Force
  }

  Start-Process -FilePath $cloudflaredExe `
    -ArgumentList "tunnel", "--url", "http://127.0.0.1:8090", "--no-autoupdate", "--logfile", $cloudflaredLog `
    -RedirectStandardOutput $cloudflaredLog `
    -RedirectStandardError $cloudflaredErr `
    -WindowStyle Hidden | Out-Null
}

$publicUrl = ""
for ($i = 0; $i -lt 20; $i++) {
  Start-Sleep -Seconds 1
  if (Test-Path $cloudflaredLog) {
    $match = Select-String -Path $cloudflaredLog -Pattern "https://[-a-z0-9]+\.trycloudflare\.com" | Select-Object -First 1
    if ($match) {
      $publicUrl = $match.Matches[0].Value
      break
    }
  }
}

if ([string]::IsNullOrWhiteSpace($publicUrl)) {
  Write-Error "Cloudflare Tunnel did not return a public URL. Check $cloudflaredLog"
  exit 1
}

Write-Output "PocketBase local API:  http://127.0.0.1:8090/api/health"
Write-Output "PocketBase public URL: $publicUrl"
Write-Output "Keep this machine, PocketBase, and cloudflared running. Quick Tunnel URLs are temporary."
