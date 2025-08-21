#!/usr/bin/env bash
set -euo pipefail

echo "[SIMPLE-CDP] Alternative solution: Run tests with Windows Chrome via direct connection"

# Kill any existing Chrome processes
echo "[SIMPLE-CDP] Cleaning up existing Chrome processes..."
/mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe -ExecutionPolicy Bypass -Command "taskkill /IM chrome.exe /F" 2>/dev/null || true

# Sync extension to Windows
echo "[SIMPLE-CDP] Syncing extension..."
./scripts/wsl-sync-extension-to-win.sh

# Start Chrome with a specific user data directory that we can access
echo "[SIMPLE-CDP] Starting Windows Chrome with WSL-accessible debugging..."

# Create a temporary batch file that Windows can execute
TEMP_BATCH="/mnt/c/temp_chrome_start.bat"
cat > "$TEMP_BATCH" << 'EOF'
@echo off
cd /d "C:\Program Files\Google\Chrome\Application"
if not exist chrome.exe (
    cd /d "C:\Program Files (x86)\Google\Chrome\Application"
)
start chrome.exe --remote-debugging-port=9222 --user-data-dir=C:\tweetcraft_ext\profile --disable-extensions-except=C:\tweetcraft_ext\extension --load-extension=C:\tweetcraft_ext\extension --no-first-run --no-default-browser-check --disable-gpu --use-gl=swiftshader
echo Chrome started
timeout /t 5
EOF

# Execute the batch file
cmd.exe /c "$TEMP_BATCH"

# Wait for Chrome to start
echo "[SIMPLE-CDP] Waiting for Chrome to fully start..."
sleep 8

# Test if Chrome is accessible from Windows
echo "[SIMPLE-CDP] Testing Chrome CDP from Windows..."
WIN_TEST_RESULT=$(/mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe -ExecutionPolicy Bypass -Command "
try {
  \$response = Invoke-WebRequest -Uri 'http://127.0.0.1:9222/json/version' -UseBasicParsing -TimeoutSec 5
  Write-Output 'SUCCESS'
} catch {
  Write-Output 'FAILED'
}
")

if [[ "$WIN_TEST_RESULT" == *"SUCCESS"* ]]; then
  echo "[SIMPLE-CDP] ✅ Chrome CDP is accessible from Windows"
else
  echo "[SIMPLE-CDP] ❌ Chrome CDP is not accessible from Windows"
  exit 1
fi

echo "[SIMPLE-CDP] Chrome is ready, but WSL cannot connect directly due to WSL2 networking"
echo "[SIMPLE-CDP] Alternative: Use Playwright's connectOverCDP with a Windows-side test runner"

# Clean up temp file
rm -f "$TEMP_BATCH"

echo "[SIMPLE-CDP] Solution: Run E2E tests from Windows PowerShell with Node.js"
echo "[SIMPLE-CDP] This requires Node.js to be installed on Windows"
echo "[SIMPLE-CDP] Would you like to proceed with a Windows-based test runner? (manual step)"