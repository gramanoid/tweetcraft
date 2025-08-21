param(
  [string]$ExtDir = "C:\tweetcraft_ext\extension",
  [string]$ProfileDir = "C:\tweetcraft_ext\profile",
  [int]$DebugPort = 9222
)

$ErrorActionPreference = "Continue"  # Don't stop on non-critical errors

Write-Host "[WIN-E2E] Starting simple Windows-native E2E test execution"

# Step 1: Kill existing Chrome processes
Write-Host "[WIN-E2E] Cleaning up existing Chrome processes..."
try { & taskkill /IM chrome.exe /F | Out-Null } catch {}

# Step 2: Ensure extension directory exists
Write-Host "[WIN-E2E] Verifying extension directory..."
if (-not (Test-Path "$ExtDir\manifest.json")) {
  Write-Host "[WIN-E2E] Extension not found at $ExtDir"
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
  "--disable-session-crashed-bubble",
  "--disable-infobars",
  "--disable-default-apps",
  "--disable-popup-blocking",
  "--disable-background-mode",
  "--disable-gpu",
  "--use-gl=swiftshader",
  "--new-window"
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

# Step 5: Test extension discovery via CDP
Write-Host "[WIN-E2E] Testing extension discovery via CDP..."
try {
  # Wait a bit longer for service worker to wake up
  Start-Sleep -Seconds 3
  
  $targets = Invoke-WebRequest -Uri "http://127.0.0.1:$DebugPort/json" -UseBasicParsing | ConvertFrom-Json
  $extensionTargets = $targets | Where-Object { $_.url -like "chrome-extension://*" }
  
  if ($extensionTargets.Count -gt 0) {
    Write-Host "[WIN-E2E] ✅ Extension detected via CDP:"
    foreach ($target in $extensionTargets) {
      $url = [System.Uri]$target.url
      Write-Host "[WIN-E2E]   Extension ID: $($url.Host)"
      Write-Host "[WIN-E2E]   Type: $($target.type)"
      Write-Host "[WIN-E2E]   URL: $($target.url)"
    }
  } else {
    Write-Host "[WIN-E2E] ❌ No extension targets found via CDP"
    Write-Host "[WIN-E2E] Found $($targets.Count) total targets:"
    foreach ($target in $targets) {
      Write-Host "[WIN-E2E]   Type: $($target.type), URL: $($target.url)"
    }
    
    # Try to trigger service worker by opening chrome://extensions/
    Write-Host "[WIN-E2E] Attempting to trigger service worker..."
    
    # Create a new tab to check extensions
    $newTabUrl = "chrome://extensions/"
    $createTab = @{
      "method" = "Target.createTarget"
      "params" = @{
        "url" = $newTabUrl
      }
    } | ConvertTo-Json -Depth 10
    
    try {
      # This is a simplified attempt - in practice we'd need WebSocket CDP
      Write-Host "[WIN-E2E] Would attempt to open chrome://extensions/ to check extension status"
      
      # Wait and rescan after potential trigger
      Start-Sleep -Seconds 3
      $targets2 = Invoke-WebRequest -Uri "http://127.0.0.1:$DebugPort/json" -UseBasicParsing | ConvertFrom-Json
      $extensionTargets2 = $targets2 | Where-Object { $_.url -like "chrome-extension://*" }
      
      if ($extensionTargets2.Count -gt 0) {
        Write-Host "[WIN-E2E] ✅ Extension detected after trigger:"
        foreach ($target in $extensionTargets2) {
          $url = [System.Uri]$target.url
          Write-Host "[WIN-E2E]   Extension ID: $($url.Host)"
          Write-Host "[WIN-E2E]   Type: $($target.type)"
          Write-Host "[WIN-E2E]   URL: $($target.url)"
        }
        $extensionTargets = $extensionTargets2
      } else {
        Write-Host "[WIN-E2E] ❌ Still no extension targets after trigger"
      }
    } catch {
      Write-Host "[WIN-E2E] ⚠️ Could not trigger service worker: $($_.Exception.Message)"
    }
  }
  
  # Create simple summary with discovered info
  $extensionId = if ($extensionTargets.Count -gt 0) { ([System.Uri]$extensionTargets[0].url).Host } else { "n/a" }
  
  $summary = @{
    mode = "functional"
    timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
    runId = "win-simple-$(Get-Date -Format 'yyyyMMddHHmmss')"
    extensionId = $extensionId
    cdpTargets = $targets.Count
    extensionTargets = $extensionTargets.Count
    chromeReady = $cdpReady
    testResult = if ($extensionTargets.Count -gt 0) { "SUCCESS" } else { "FAILED" }
  } | ConvertTo-Json -Depth 10
  
  # Write to Windows temp directory
  $tempSummary = "$env:TEMP\tweetcraft-summary.json"
  $summary | Out-File -FilePath $tempSummary -Encoding UTF8
  Write-Host "[WIN-E2E] ✅ Summary written to: $tempSummary"
  
  # Show the results
  Write-Host "[WIN-E2E] === RESULTS ==="
  Write-Host "[WIN-E2E] Extension ID: $extensionId"
  Write-Host "[WIN-E2E] CDP Targets: $($targets.Count)"
  Write-Host "[WIN-E2E] Extension Targets: $($extensionTargets.Count)"
  Write-Host "[WIN-E2E] Status: $(if ($extensionTargets.Count -gt 0) { 'SUCCESS' } else { 'FAILED' })"
  
} catch {
  Write-Host "[WIN-E2E] ❌ CDP test failed: $($_.Exception.Message)"
}

Write-Host "[WIN-E2E] Cleaning up Chrome process..."
try { & taskkill /IM chrome.exe /F | Out-Null } catch {}
Write-Host "[WIN-E2E] Complete!"