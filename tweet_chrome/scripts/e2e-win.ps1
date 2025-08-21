# scripts/e2e-win.ps1
param([switch]$TraceAll = $false)
$ErrorActionPreference = 'Stop'

# ---- global single-instance lock (10 min timeout) ----
$mutex = New-Object System.Threading.Mutex($false, 'Global\TweetCraftE2EChrome')
if (-not $mutex.WaitOne([TimeSpan]::FromMinutes(10))) { throw 'Timeout acquiring Global\TweetCraftE2EChrome mutex' }
try {
  # Paths
  $ROOT = Split-Path -Parent $MyInvocation.MyCommand.Path
  $REPO = Split-Path $ROOT

  if ($TraceAll) { $env:E2E_TRACE = 'all' } else { $env:E2E_TRACE = 'on-failure' }

  # ---- hard kill any stray Chrome/Edge from prior runs ----
  Get-Process chrome, msedge -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
  Start-Sleep -Milliseconds 500

  # ---- launch Dev-channel Chrome once ----
  $startOut = & "$ROOT\start-win-chrome.ps1" 2>&1 | ForEach-Object { $_.ToString() }

  # ---- parse KEY=VALUE lines ----
  $kv = @{}
  foreach ($line in $startOut) {
    if ($line -match '^(EXT_DIR|PROFILE_DIR|REMOTE_DEBUG_PORT|E2E_REMOTE_CDP_ENDPOINT|E2E_REMOTE_CDP_HTTP|EXT_ID|BROWSER_CHANNEL|BROWSER_PATH|BROWSER_VERSION)=(.+)') {
      $kv[$Matches[1]] = $Matches[2].Trim()
    }
  }
  if (-not $kv.ContainsKey('REMOTE_DEBUG_PORT')) { throw 'Launcher did not emit REMOTE_DEBUG_PORT' }

  # Expect BROWSER_CHANNEL + BROWSER_PATH printed by start-win-chrome.ps1
  if (-not $kv.ContainsKey('BROWSER_CHANNEL')) { throw 'Launcher did not emit BROWSER_CHANNEL' }
  if ($kv['BROWSER_CHANNEL'] -notin @('dev','edge-dev')) {
    throw "Unsupported browser channel '$($kv['BROWSER_CHANNEL'])'. Dev channel is required."
  }
  if (-not $kv.ContainsKey('BROWSER_PATH') -or -not (Test-Path -LiteralPath $kv['BROWSER_PATH'])) {
    throw "Invalid BROWSER_PATH from launcher."
  }

  # EXT_ID must resolve (Stable ignores flags → EXT_ID=?)
  if (-not $kv.ContainsKey('EXT_ID') -or -not $kv['EXT_ID'] -or $kv['EXT_ID'] -eq '?') {
    throw 'Could not resolve EXT_ID (extension not loaded). Ensure Dev channel launched and flags were honored.'
  }

  if (-not $kv.ContainsKey('E2E_REMOTE_CDP_ENDPOINT')) {
    $port = $kv['REMOTE_DEBUG_PORT']
    $versionUrl = "http://127.0.0.1:$port/json/version"
    $ws = $null
    for ($i=0; $i -lt 180; $i++) {
      try {
        $ver = Invoke-RestMethod -Uri $versionUrl -TimeoutSec 2
        if ($ver.webSocketDebuggerUrl) { $ws = $ver.webSocketDebuggerUrl; break }
      } catch {}
      Start-Sleep -Milliseconds 500
    }
    if (-not $ws) { throw "CDP didn't come up on $versionUrl within 90s" }
    $kv['E2E_REMOTE_CDP_ENDPOINT'] = $ws
  }

  $env:E2E_REMOTE_CDP_ENDPOINT = $kv['E2E_REMOTE_CDP_ENDPOINT']
  Write-Host "E2E_REMOTE_CDP_ENDPOINT=$($env:E2E_REMOTE_CDP_ENDPOINT)"

  $env:E2E_EXT_ID = $kv['EXT_ID']
  Write-Host "E2E_EXT_ID=$($env:E2E_EXT_ID)"

  # ---- Playwright: FORCE SINGLE WORKER ----
  Push-Location "$REPO\e2e\functional"
  npx playwright test --workers=1 --config "$REPO\e2e\functional\playwright.config.win.mjs"
  Pop-Location

  # ---- proof ----
  node "$ROOT\ci-proof.js" "$REPO\e2e\report\summary.json"
}
finally {
  $mutex.ReleaseMutex() | Out-Null
}