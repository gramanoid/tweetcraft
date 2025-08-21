#!/usr/bin/env bash
set -euo pipefail

echo "🎯 Running E2E tests from WSL → Windows Chrome via CDP"

# Step 1: Sync extension
echo "📦 Syncing extension to Windows..."
./scripts/wsl-sync-extension-to-win.sh

# Step 2: Kill existing Chrome and start fresh
echo "🔄 Starting Windows Chrome with CDP..."
/mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe -ExecutionPolicy Bypass -Command "taskkill /IM chrome.exe /F" 2>/dev/null || true

# Start Chrome with CDP
/mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe -ExecutionPolicy Bypass -File scripts/start-win-chrome.ps1

# Step 3: Wait for Chrome CDP to be ready
echo "⏳ Waiting for Chrome CDP to be ready..."
sleep 8

# Test CDP accessibility from Windows side first
echo "🔍 Testing CDP from Windows side..."
CDP_TEST=$(/mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe -ExecutionPolicy Bypass -Command "
try {
  \$response = Invoke-WebRequest -Uri 'http://127.0.0.1:9222/json/version' -UseBasicParsing -TimeoutSec 5
  Write-Output 'CDP_SUCCESS'
} catch {
  Write-Output 'CDP_FAILED'
}
" 2>/dev/null)

if [[ "$CDP_TEST" != *"CDP_SUCCESS"* ]]; then
  echo "❌ CDP not accessible from Windows, cannot proceed"
  exit 1
fi

echo "✅ CDP accessible from Windows"

# Step 4: Set up environment for remote CDP
export E2E_REMOTE_CDP=1  
export E2E_REMOTE_CDP_ENDPOINT="http://127.0.0.1:9222"

echo "🧪 Running tests from WSL with remote CDP..."

# Install dependencies
npm ci
npx playwright install chromium

# Run just the boot test first to verify extension discovery
echo "🔌 Testing extension discovery..."
npx playwright test -c e2e/functional/playwright.config.mjs e2e/functional/specs/01_boot_functional.spec.mjs --max-failures=1

# If boot succeeds, run all tests
if [ $? -eq 0 ]; then
  echo "✅ Extension discovery working, running full suite..."
  npx playwright test -c e2e/functional/playwright.config.mjs --max-failures=1
else
  echo "❌ Extension discovery failed, check logs above"
  exit 1
fi

# Generate reports
echo "📊 Generating reports..."
node e2e/report/generate-report.js --input e2e/report/summary.json --out e2e/report/report.functional.md --max-age-mins 60
node scripts/ci-proof.js e2e/report/summary.json

echo "🎉 Test execution complete!"