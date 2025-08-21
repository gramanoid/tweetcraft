Write-Host "=== Chrome Launch Diagnostics ==="
Write-Host ""

# Check Chrome locations
$chromeStable = "$Env:ProgramFiles\Google\Chrome\Application\chrome.exe"
$chromeAlt = "$Env:ProgramFiles(x86)\Google\Chrome\Application\chrome.exe"

Write-Host "Checking Chrome installation locations:"
Write-Host "1. Standard location: $chromeStable"
Write-Host "   Exists: $(Test-Path $chromeStable)"

Write-Host "2. Alternative location: $chromeAlt"  
Write-Host "   Exists: $(Test-Path $chromeAlt)"

# Check if extension directory exists
$extDir = "C:\tweetcraft_ext\extension"
Write-Host "3. Extension directory: $extDir"
Write-Host "   Exists: $(Test-Path $extDir)"
Write-Host "   Manifest: $(Test-Path '$extDir\manifest.json')"

Write-Host ""

# Try to find Chrome in PATH
Write-Host "Checking if Chrome is in PATH:"
try {
    $chromeVersion = & chrome --version 2>$null
    if ($chromeVersion) {
        Write-Host "   Found in PATH: $chromeVersion"
        $chromeInPath = "chrome"
    } else {
        Write-Host "   Not found in PATH"
        $chromeInPath = $null
    }
} catch {
    Write-Host "   Not found in PATH"
    $chromeInPath = $null
}

Write-Host ""

# Determine which Chrome to use
if (Test-Path $chromeStable) {
    $browser = $chromeStable
    Write-Host "Using: $browser"
} elseif (Test-Path $chromeAlt) {
    $browser = $chromeAlt
    Write-Host "Using: $browser"
} elseif ($chromeInPath) {
    $browser = $chromeInPath
    Write-Host "Using: $browser (from PATH)"
} else {
    Write-Host "❌ Chrome not found anywhere!"
    Write-Host "Please install Google Chrome or specify the correct path."
    exit 1
}

Write-Host ""
Write-Host "Testing basic Chrome launch..."

try {
    # Kill any existing Chrome first
    Write-Host "Killing existing Chrome processes..."
    try { & taskkill /IM chrome.exe /F | Out-Null } catch {}
    
    # Simple test launch
    Write-Host "Launching Chrome with minimal arguments..."
    $process = Start-Process -FilePath $browser -ArgumentList "--version" -NoNewWindow -Wait -PassThru
    Write-Host "Chrome launch test exit code: $($process.ExitCode)"
    
    if ($process.ExitCode -eq 0) {
        Write-Host "✅ Chrome launches successfully"
        
        Write-Host ""
        Write-Host "Now testing with extension loading..."
        
        # Test with extension
        Start-Process -FilePath $browser -ArgumentList @(
            "--load-extension=$extDir",
            "--no-first-run",
            "chrome://extensions/"
        )
        
        Write-Host "✅ Chrome launched with extension"
        Write-Host "Chrome should now be open with extensions page"
        
    } else {
        Write-Host "❌ Chrome failed to launch (exit code: $($process.ExitCode))"
    }
    
} catch {
    Write-Host "❌ Error launching Chrome: $($_.Exception.Message)"
}

Write-Host ""
Write-Host "Done. Check if Chrome window opened."