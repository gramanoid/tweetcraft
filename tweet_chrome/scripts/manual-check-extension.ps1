param(
  [string]$ExtDir = "C:\tweetcraft_ext\extension"
)

Write-Host "=== TweetCraft Extension Manual Check ==="
Write-Host ""

# Kill existing Chrome
try { & taskkill /IM chrome.exe /F | Out-Null } catch {}

# Start Chrome with extension and debugging
$chromeStable = "$Env:ProgramFiles\Google\Chrome\Application\chrome.exe"
$chromeAlt = "$Env:ProgramFiles(x86)\Google\Chrome\Application\chrome.exe"
$browser = $chromeStable
if (-not (Test-Path $browser)) { 
  if (Test-Path $chromeAlt) { 
    $browser = $chromeAlt 
  } else {
    Write-Host "❌ Chrome not found"
    exit 1
  }
}

Write-Host "🚀 Starting Chrome with extension loaded..."
Write-Host "   Extension directory: $ExtDir"
Write-Host ""

$chromeArgs = @(
  "--load-extension=$ExtDir",
  "--remote-debugging-port=9222",
  "--no-first-run",
  "--disable-extensions-except=$ExtDir",
  "chrome://extensions/"
)

Start-Process -FilePath $browser -ArgumentList $chromeArgs

Write-Host "✅ Chrome launched with extensions page"
Write-Host ""
Write-Host "MANUAL VERIFICATION STEPS:"
Write-Host "=========================="
Write-Host "1. Look at the Chrome extensions page that just opened"
Write-Host "2. Check if 'TweetCraft AI' extension is listed"
Write-Host "3. If listed, check if it shows any errors (red text)"
Write-Host "4. Toggle Developer mode (top right) to see more details"
Write-Host "5. Click on 'service worker' link if available"
Write-Host "6. Check the console for any errors"
Write-Host ""
Write-Host "Expected result: TweetCraft AI should be listed and enabled"
Write-Host ""
Write-Host "Press Enter when done checking..."
Read-Host

Write-Host "Cleaning up..."
try { & taskkill /IM chrome.exe /F | Out-Null } catch {}
Write-Host "Done!"