Write-Host "=== Force Extension Sync ==="

$sourceDir = "\\wsl.localhost\Ubuntu\home\alexgrama\githome\personal\tweet_chrome\extension"
$targetDir = "C:\tweetcraft_ext\extension"

Write-Host "Source: $sourceDir"
Write-Host "Target: $targetDir"

# Create target directory
Write-Host "Creating target directory..."
New-Item -ItemType Directory -Force -Path $targetDir | Out-Null

# Copy all files with PowerShell (this should handle WSL filesystem properly)
Write-Host "Copying extension files..."
try {
    Copy-Item -Path "$sourceDir\*" -Destination $targetDir -Recurse -Force
    Write-Host "✅ Files copied successfully"
    
    # Verify critical files
    $manifest = "$targetDir\manifest.json"
    $background = "$targetDir\background.js"
    
    Write-Host ""
    Write-Host "Verification:"
    Write-Host "  manifest.json: $(Test-Path $manifest)"
    Write-Host "  background.js: $(Test-Path $background)"
    
    if (Test-Path $manifest) {
        $manifestContent = Get-Content $manifest -Raw | ConvertFrom-Json
        Write-Host "  Extension name: $($manifestContent.name)"
        Write-Host "  Version: $($manifestContent.version)"
    }
    
    # List all files for verification
    Write-Host ""
    Write-Host "Files in extension directory:"
    Get-ChildItem $targetDir -Recurse | ForEach-Object {
        Write-Host "  $($_.FullName.Replace($targetDir, '.'))"
    }
    
} catch {
    Write-Host "❌ Copy failed: $($_.Exception.Message)"
    exit 1
}

Write-Host ""
Write-Host "Now testing Chrome with properly synced extension..."

# Launch Chrome with the extension
$chromeStable = "$Env:ProgramFiles\Google\Chrome\Application\chrome.exe"
if (Test-Path $chromeStable) {
    try {
        # Kill existing Chrome
        try { & taskkill /IM chrome.exe /F | Out-Null } catch {}
        
        Start-Process -FilePath $chromeStable -ArgumentList @(
            "--load-extension=$targetDir",
            "--disable-extensions-except=$targetDir",
            "--no-first-run",
            "--no-default-browser-check",
            "--disable-session-crashed-bubble",
            "--disable-infobars",
            "--disable-default-apps",
            "--disable-popup-blocking",
            "--disable-background-mode",
            "--new-window",
            "chrome://extensions/"
        )
        
        Write-Host "✅ Chrome launched with extension"
        Write-Host "Check the extensions page - TweetCraft AI should now be visible!"
        
    } catch {
        Write-Host "❌ Chrome launch failed: $($_.Exception.Message)"
    }
} else {
    Write-Host "❌ Chrome not found"
}