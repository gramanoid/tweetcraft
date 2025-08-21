param([string]$ExtDir = "")
$ErrorActionPreference = 'Stop'

$ROOT = Split-Path -Parent $MyInvocation.MyCommand.Path
$REPO = Split-Path $ROOT
if (-not $ExtDir) { $ExtDir = Join-Path $REPO "extension" }
$EXT_DIR = (Resolve-Path $ExtDir).Path

$stamp = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
$PROFILE_DIR = "C:\tweetcraft_ext\profile\$stamp"
New-Item -ItemType Directory -Force -Path $PROFILE_DIR | Out-Null

$port = Get-Random -Minimum 35000 -Maximum 45000

# --- STRICT DEV-ONLY BROWSER RESOLUTION ---
function Get-FirstExistingPath([string[]]$paths) {
  foreach ($p in $paths) { if (Test-Path -LiteralPath $p) { return $p } }
  return $null
}

$devCandidates = @(
  "$Env:ProgramFiles\Google\Chrome Dev\Application\chrome.exe",
  "$Env:ProgramFiles(x86)\Google\Chrome Dev\Application\chrome.exe",
  "$Env:LocalAppData\Google\Chrome Dev\Application\chrome.exe"
)
$edgeDevCandidates = @(
  "$Env:ProgramFiles\Microsoft\Edge Dev\Application\msedge.exe",
  "$Env:ProgramFiles(x86)\Microsoft\Edge Dev\Application\msedge.exe",
  "$Env:LocalAppData\Microsoft\Edge Dev\Application\msedge.exe"
)

$chromeExe = Get-FirstExistingPath $devCandidates
$channel = "dev"
if (-not $chromeExe) { $chromeExe = Get-FirstExistingPath $edgeDevCandidates; $channel = "edge-dev" }

if (-not $chromeExe) {
  Write-Output "BROWSER_CHANNEL=missing"
  Write-Output "BROWSER_PATH=?"
  # Silent auto-install of Chrome Dev; if unavailable (policy), we'll hard-fail later.
  try {
    winget install -e --id Google.Chrome.Dev --accept-package-agreements --accept-source-agreements --silent | Out-Null
  } catch { }
  $chromeExe = Get-FirstExistingPath $devCandidates
  if (-not $chromeExe) { throw "Dev-channel browser not found. Install Chrome Dev (preferred) or Edge Dev." }
  $channel = "dev"
}

Write-Output "BROWSER_PATH=$chromeExe"
Write-Output "BROWSER_CHANNEL=$channel"
$verOut = & $chromeExe --version 2>$null
if ($verOut) { Write-Output "BROWSER_VERSION=$verOut" }

$chromeArgs = @(
  "--remote-debugging-port=$port",
  "--user-data-dir=$PROFILE_DIR",
  "--disable-extensions-except=$EXT_DIR",
  "--load-extension=$EXT_DIR",
  "--enable-extension-unpacked",
  "--disable-session-crashed-bubble",
  "--disable-infobars","--no-first-run","--no-default-browser-check","--test-type",
  "--silent-launch","--no-startup-window","--disable-default-apps",
  "--disable-background-timer-throttling","--disable-renderer-backgrounding",
  "--disable-backgrounding-occluded-windows"
)

Start-Process -FilePath $chromeExe -ArgumentList $chromeArgs -WindowStyle Minimized | Out-Null

$versionUrl = "http://127.0.0.1:$port/json/version"
$ws = $null
for ($i=0; $i -lt 180; $i++) {
  try {
    $ver = Invoke-RestMethod -Uri $versionUrl -TimeoutSec 2
    if ($ver.webSocketDebuggerUrl) { $ws = $ver.webSocketDebuggerUrl; break }
  } catch {}
  Start-Sleep -Milliseconds 500
}

# Machine-readable lines (capturable)
Write-Output "EXT_DIR=$EXT_DIR"
Write-Output "PROFILE_DIR=$PROFILE_DIR"
Write-Output "REMOTE_DEBUG_PORT=$port"
if ($ws) {
  Write-Output "E2E_REMOTE_CDP_HTTP=http://127.0.0.1:$port"
  Write-Output "E2E_REMOTE_CDP_ENDPOINT=$ws"
}

# --- Poll for extension ID in Preferences (up to 90s) ---
$prefPath = Join-Path $PROFILE_DIR "Default\Preferences"
$EXT_ID = $null
for ($i=0; $i -lt 180; $i++) {
  try {
    if (Test-Path -LiteralPath $prefPath) {
      $json = Get-Content -Raw -LiteralPath $prefPath | ConvertFrom-Json
      $exts = $json.extensions.settings.PSObject.Properties
      foreach ($p in $exts) {
        $item = $p.Value
        if ($item.path -and ($item.path.Trim().ToLower() -eq $EXT_DIR.Trim().ToLower())) { $EXT_ID = $p.Name; break }
      }
      if ($EXT_ID) { break }
    }
  } catch { }
  Start-Sleep -Milliseconds 500
}
Write-Output ("EXT_ID=" + ($(if ($EXT_ID) { $EXT_ID } else { "?" })))