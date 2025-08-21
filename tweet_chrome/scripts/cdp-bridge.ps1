param(
  [int]$LocalPort = 9222,
  [int]$BridgePort = 9223,
  [string]$LocalHost = "127.0.0.1"
)

$ErrorActionPreference = "Stop"

# Simple TCP proxy to bridge WSL to Windows localhost
# This listens on 0.0.0.0:9223 and forwards to 127.0.0.1:9222

Write-Host "[CDP-BRIDGE] Creating TCP proxy: 0.0.0.0:$BridgePort -> ${LocalHost}:${LocalPort}"

# Kill existing Chrome with debugging enabled
try { & taskkill /IM chrome.exe /F | Out-Null } catch {}
Start-Sleep -Seconds 2

# Start Chrome normally (listening on localhost only)
$chromeStable = "$Env:ProgramFiles\Google\Chrome\Application\chrome.exe"
$chromeAlt = "$Env:ProgramFiles(x86)\Google\Chrome\Application\chrome.exe" 
$browser = $chromeStable
if (-not (Test-Path $browser)) { $browser = $chromeAlt }
if (-not (Test-Path $browser)) { throw "Chrome not found" }

$chromeArgs = @(
  "--remote-debugging-port=$LocalPort",
  "--user-data-dir=C:\tweetcraft_ext\profile",
  "--disable-extensions-except=C:\tweetcraft_ext\extension", 
  "--load-extension=C:\tweetcraft_ext\extension",
  "--no-first-run",
  "--no-default-browser-check",
  "--disable-gpu",
  "--use-gl=swiftshader"
)

$chromeProc = Start-Process -FilePath $browser -ArgumentList $chromeArgs -PassThru
Write-Host "[CDP-BRIDGE] Chrome started with PID $($chromeProc.Id)"

# Wait for Chrome to start
Start-Sleep -Seconds 5

# Test local connection
try {
  $response = Invoke-WebRequest -Uri "http://${LocalHost}:${LocalPort}/json/version" -UseBasicParsing -TimeoutSec 5
  Write-Host "[CDP-BRIDGE] ✅ Chrome CDP ready on ${LocalHost}:${LocalPort}" 
} catch {
  Write-Host "[CDP-BRIDGE] ❌ Chrome CDP failed: $($_.Exception.Message)"
  exit 1
}

# Use netsh to create port forwarding (requires admin but we'll try)
Write-Host "[CDP-BRIDGE] Setting up port forwarding..."
try {
  # Delete existing rule if it exists
  & netsh interface portproxy delete v4tov4 listenport=$BridgePort listenaddress=0.0.0.0 2>$null
  
  # Add new forwarding rule
  & netsh interface portproxy add v4tov4 listenport=$BridgePort listenaddress=0.0.0.0 connectport=$LocalPort connectaddress=$LocalHost
  
  Write-Host "[CDP-BRIDGE] ✅ Port forwarding active: 0.0.0.0:$BridgePort -> ${LocalHost}:${LocalPort}"
  Write-Host "[CDP-BRIDGE] WSL can now connect to: 172.18.224.1:$BridgePort"
  
  # Keep the script running to maintain the proxy
  Write-Host "[CDP-BRIDGE] Press Ctrl+C to stop the bridge"
  
  while ($true) {
    Start-Sleep -Seconds 10
    # Check if Chrome is still running
    if (-not (Get-Process -Id $chromeProc.Id -ErrorAction SilentlyContinue)) {
      Write-Host "[CDP-BRIDGE] Chrome process ended, exiting bridge"
      break
    }
  }
  
} catch {
  Write-Host "[CDP-BRIDGE] ❌ Port forwarding failed (requires admin): $($_.Exception.Message)"
  Write-Host "[CDP-BRIDGE] Chrome is running on ${LocalHost}:${LocalPort} but not accessible from WSL"
  exit 1
} finally {
  # Cleanup
  Write-Host "[CDP-BRIDGE] Cleaning up port forwarding..."
  & netsh interface portproxy delete v4tov4 listenport=$BridgePort listenaddress=0.0.0.0 2>$null
}