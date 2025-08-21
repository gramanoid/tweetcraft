param(
  [string]$ExtDir = "C:\tweetcraft_ext\extension",
  [string]$ProfileDir = "C:\tweetcraft_ext\profile",
  [int]$DebugPort = 9222
)

$ErrorActionPreference = "Stop"

# Kill existing Chrome
try { & taskkill /IM chrome.exe /F | Out-Null } catch {}

# Launch Chrome with CDP
$chromeStable = "$Env:ProgramFiles\Google\Chrome\Application\chrome.exe"
$chromeAlt = "$Env:ProgramFiles(x86)\Google\Chrome\Application\chrome.exe"
$browser = $chromeStable
if (-not (Test-Path $browser)) { if (Test-Path $chromeAlt) { $browser = $chromeAlt } }
if (-not (Test-Path $browser)) { throw "Chrome not found." }

$proc = Start-Process -FilePath $browser -ArgumentList @(
  "--remote-debugging-port=$DebugPort",
  "--user-data-dir=$ProfileDir",
  "--disable-extensions-except=$ExtDir",
  "--load-extension=$ExtDir",
  "--no-first-run",
  "--no-default-browser-check",
  "--disable-gpu",
  "--use-gl=swiftshader"
) -PassThru

Write-Host "[WIN-CHROME] Launched Chrome PID $($proc.Id) with debugging on port $DebugPort"

# Wait for Chrome to start
Start-Sleep -Seconds 5

# Test CDP connection
try {
  $response = Invoke-WebRequest -Uri "http://127.0.0.1:$DebugPort/json/version" -UseBasicParsing
  Write-Host "[WIN-CHROME] ✅ CDP endpoint ready"
} catch {
  Write-Host "[WIN-CHROME] ❌ CDP endpoint failed: $($_.Exception.Message)"
  exit 1
}

# Now we need to run the Playwright tests from Windows
# This requires Node.js to be installed on Windows
$nodeVersion = & node --version 2>$null
if ($nodeVersion) {
  Write-Host "[WIN-NODE] Found Node.js version: $nodeVersion"
  
  # Set environment variables for remote CDP
  $env:E2E_REMOTE_CDP = "1"
  $env:E2E_REMOTE_CDP_ENDPOINT = "http://127.0.0.1:$DebugPort"
  
  # Run the tests (this assumes npm packages are installed on Windows)
  Write-Host "[WIN-TESTS] Running E2E tests via Windows Node.js..."
  
  # We need to run these from the WSL project directory mounted in Windows
  $wslProjectPath = "\\wsl$\Ubuntu\home\alexgrama\githome\personal\tweet_chrome"
  
  if (Test-Path $wslProjectPath) {
    Push-Location $wslProjectPath
    try {
      # Install dependencies if needed
      if (-not (Test-Path "node_modules")) {
        Write-Host "[WIN-TESTS] Installing npm dependencies on Windows..."
        & npm ci
      }
      
      # Run the tests
      Write-Host "[WIN-TESTS] Running Playwright tests..."
      & npx playwright test -c e2e/functional/playwright.config.mjs --max-failures=1
      
      # Generate report and proof
      & node e2e/report/generate-report.js --input e2e/report/summary.json --out e2e/report/report.functional.md --max-age-mins 60
      & node scripts/ci-proof.js e2e/report/summary.json
      
    } finally {
      Pop-Location
    }
  } else {
    Write-Host "[WIN-TESTS] ❌ Cannot access WSL project path: $wslProjectPath"
    Write-Host "[WIN-TESTS] Tests cannot run from Windows - Node.js environment needs WSL"
    exit 1
  }
} else {
  Write-Host "[WIN-NODE] ❌ Node.js not found on Windows"
  Write-Host "[WIN-NODE] Cannot run tests from Windows - Node.js required"
  exit 1
}