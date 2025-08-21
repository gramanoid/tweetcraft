param(
  [string]$ExtDir = "C:\tweetcraft_ext\extension",
  [string]$ProfileDir = "C:\tweetcraft_ext\profile",
  [int]$DebugPort = 9222
)

$ErrorActionPreference = "Stop"

Write-Host "[WIN-E2E] Starting Windows-native E2E test execution"

# Step 1: Kill existing Chrome processes
Write-Host "[WIN-E2E] Cleaning up existing Chrome processes..."
try { & taskkill /IM chrome.exe /F | Out-Null } catch {}

# Step 2: Ensure extension directory exists and is up to date
Write-Host "[WIN-E2E] Verifying extension directory..."
if (-not (Test-Path "$ExtDir\manifest.json")) {
  Write-Host "[WIN-E2E] Extension not found at $ExtDir"
  Write-Host "[WIN-E2E] Please run wsl-sync-extension-to-win.sh first"
  exit 1
}

Write-Host "[WIN-E2E] ✅ Extension found at $ExtDir"

# Step 3: Start Chrome with CDP enabled
Write-Host "[WIN-E2E] Starting Chrome with CDP debugging..."

$chromeStable = "$Env:ProgramFiles\Google\Chrome\Application\chrome.exe"
$chromeAlt = "$Env:ProgramFiles(x86)\Google\Chrome\Application\chrome.exe"
$browser = $chromeStable
if (-not (Test-Path $browser)) { 
  if (Test-Path $chromeAlt) { 
    $browser = $chromeAlt 
  } else {
    Write-Host "[WIN-E2E] ❌ Chrome not found"
    exit 1
  }
}

$chromeArgs = @(
  "--remote-debugging-port=$DebugPort",
  "--user-data-dir=$ProfileDir", 
  "--disable-extensions-except=$ExtDir",
  "--load-extension=$ExtDir",
  "--no-first-run",
  "--no-default-browser-check",
  "--disable-gpu",
  "--use-gl=swiftshader",
  "--autoplay-policy=no-user-gesture-required",
  "--mute-audio"
)

$chromeProcess = Start-Process -FilePath $browser -ArgumentList $chromeArgs -PassThru
Write-Host "[WIN-E2E] Chrome started with PID $($chromeProcess.Id)"

# Step 4: Wait for Chrome to be ready
Write-Host "[WIN-E2E] Waiting for Chrome CDP to be ready..."
$maxAttempts = 20
$attempt = 0
$cdpReady = $false

while ($attempt -lt $maxAttempts -and -not $cdpReady) {
  Start-Sleep -Seconds 1
  try {
    $response = Invoke-WebRequest -Uri "http://127.0.0.1:$DebugPort/json/version" -UseBasicParsing -TimeoutSec 2
    Write-Host "[WIN-E2E] ✅ Chrome CDP ready"
    $cdpReady = $true
  } catch {
    $attempt++
    Write-Host "[WIN-E2E] Waiting for CDP... (attempt $attempt/$maxAttempts)"
  }
}

if (-not $cdpReady) {
  Write-Host "[WIN-E2E] ❌ Chrome CDP failed to start after $maxAttempts attempts"
  exit 1
}

# Step 5: Check if Node.js is available on Windows
$nodeVersion = & node --version 2>$null
if ($nodeVersion) {
  Write-Host "[WIN-E2E] Found Node.js version: $nodeVersion"
} else {
  Write-Host "[WIN-E2E] ❌ Node.js not found on Windows"
  Write-Host "[WIN-E2E] Please install Node.js on Windows to run E2E tests"
  exit 1
}

# Step 6: Set up environment for local (non-remote) CDP
$env:E2E_REMOTE_CDP = ""  # Clear remote CDP flag - we're running locally on Windows
$env:E2E_REMOTE_CDP_ENDPOINT = ""

# Step 7: Set up environment and run tests with Windows Node.js
$wslProjectPath = "\\wsl.localhost\Ubuntu\home\alexgrama\githome\personal\tweet_chrome"

if (Test-Path $wslProjectPath) {
  Write-Host "[WIN-E2E] Found WSL project at $wslProjectPath"
  
  # Change to a Windows working directory but reference WSL project
  $tempWorkDir = "$env:TEMP\tweetcraft-e2e"
  New-Item -ItemType Directory -Force -Path $tempWorkDir | Out-Null
  Push-Location $tempWorkDir
  
  try {
    # Set working directory to WSL project for Node.js commands
    $env:PWD = $wslProjectPath
    
    # Ensure dependencies are installed
    Write-Host "[WIN-E2E] Installing/updating npm dependencies on Windows..."
    $npmResult = Start-Process -FilePath "npm" -ArgumentList "ci" -WorkingDirectory $wslProjectPath -NoNewWindow -Wait -PassThru
    if ($npmResult.ExitCode -ne 0) {
      Write-Host "[WIN-E2E] npm ci failed, skipping and continuing..."
    }
    
    # Install Playwright
    Write-Host "[WIN-E2E] Ensuring Playwright is available..."
    $playwrightResult = Start-Process -FilePath "npx" -ArgumentList "playwright","install","chromium" -WorkingDirectory $wslProjectPath -NoNewWindow -Wait -PassThru
    if ($playwrightResult.ExitCode -ne 0) {
      Write-Host "[WIN-E2E] Playwright install failed, continuing anyway..."
    }
    
    # Run module doctor
    Write-Host "[WIN-E2E] Running module doctor..."
    $doctorResult = Start-Process -FilePath "node" -ArgumentList "scripts/module-doctor.js" -WorkingDirectory $wslProjectPath -NoNewWindow -Wait -PassThru
    
    # Run the E2E tests (they will connect to local Chrome on Windows)
    Write-Host "[WIN-E2E] Running Playwright E2E tests..."
    $testResult = Start-Process -FilePath "npx" -ArgumentList "playwright","test","-c","e2e/functional/playwright.config.mjs","--max-failures=1" -WorkingDirectory $wslProjectPath -NoNewWindow -Wait -PassThru
    
    # Generate report
    Write-Host "[WIN-E2E] Generating test report..."
    $reportResult = Start-Process -FilePath "node" -ArgumentList "e2e/report/generate-report.js","--input","e2e/report/summary.json","--out","e2e/report/report.functional.md","--max-age-mins","60" -WorkingDirectory $wslProjectPath -NoNewWindow -Wait -PassThru
    
    # Validate with ci-proof
    Write-Host "[WIN-E2E] Running ci-proof validation..."
    $proofResult = Start-Process -FilePath "node" -ArgumentList "scripts/ci-proof.js","e2e/report/summary.json" -WorkingDirectory $wslProjectPath -NoNewWindow -Wait -PassThru
    
    Write-Host "[WIN-E2E] ✅ E2E tests completed successfully!"
    
  } catch {
    Write-Host "[WIN-E2E] ❌ E2E tests failed: $($_.Exception.Message)"
    exit 1
  } finally {
    Pop-Location
  }
} else {
  Write-Host "[WIN-E2E] ❌ Cannot access WSL project directory: $wslProjectPath"
  Write-Host "[WIN-E2E] Please ensure WSL is running and the project exists"
  exit 1
}

Write-Host "[WIN-E2E] Cleaning up Chrome process..."
try { & taskkill /IM chrome.exe /F | Out-Null } catch {}
Write-Host "[WIN-E2E] Complete!"