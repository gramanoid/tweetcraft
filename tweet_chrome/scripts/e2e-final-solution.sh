#!/usr/bin/env bash
set -euo pipefail

echo "🚀 TweetCraft AI E2E Test Suite - Final Solution"
echo "================================================"

echo "📋 This solution works around WSL2 networking limitations by:"
echo "   1. Syncing extension from WSL to Windows filesystem"  
echo "   2. Running tests from Windows PowerShell with Node.js"
echo "   3. Using native Windows Chrome with local CDP connection"
echo ""

# Step 1: Sync extension to Windows
echo "🔄 Step 1: Syncing extension to Windows filesystem..."
./scripts/wsl-sync-extension-to-win.sh

# Step 2: Check if we can run PowerShell
echo "🔍 Step 2: Testing PowerShell access..."
if ! /mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe -ExecutionPolicy Bypass -Command "Write-Host 'PowerShell accessible'" 2>/dev/null; then
  echo "❌ Cannot access Windows PowerShell from WSL"
  echo "   Please ensure you're running WSL2 with Windows integration enabled"
  exit 1
fi

echo "✅ PowerShell access confirmed"

# Step 3: Check if Node.js is available on Windows
echo "🔍 Step 3: Checking Windows Node.js availability..."
NODE_CHECK=$(/mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe -ExecutionPolicy Bypass -Command "
try {
  \$version = & node --version 2>\$null
  Write-Output \"AVAILABLE:\$version\"
} catch {
  Write-Output 'NOT_AVAILABLE'
}
" 2>/dev/null || echo "NOT_AVAILABLE")

if [[ "$NODE_CHECK" == "AVAILABLE:"* ]]; then
  NODE_VERSION=${NODE_CHECK#"AVAILABLE:"}
  echo "✅ Node.js found on Windows: $NODE_VERSION"
else
  echo "❌ Node.js not found on Windows"
  echo ""
  echo "📥 Please install Node.js on Windows:"
  echo "   1. Download from: https://nodejs.org/"
  echo "   2. Install the Windows version"
  echo "   3. Restart your terminal and try again"
  echo ""
  echo "💡 Alternatively, you can run the tests manually:"
  echo "   1. Open Windows PowerShell as Administrator"
  echo "   2. Run: scripts\\run-e2e-windows-native.ps1"
  exit 1
fi

# Step 4: Run the Windows-native E2E tests
echo "🎯 Step 4: Running E2E tests via Windows PowerShell..."
echo "      This will start Chrome on Windows and run all functional tests"
echo ""

/mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe -ExecutionPolicy Bypass -File scripts/run-e2e-windows-native.ps1

# Check the result
if [ $? -eq 0 ]; then
  echo ""
  echo "🎉 SUCCESS! E2E tests completed successfully"
  echo ""
  echo "📊 Results should show:"
  echo "   ✅ All UI controls interacted with (unclicked=0)"
  echo "   ✅ Zero provider calls (budget enforced)"  
  echo "   ✅ No console errors from extension"
  echo "   ✅ [PROOF] OK — mode=functional"
  echo ""
  echo "🔍 Check the reports in:"
  echo "   - e2e/report/report.functional.md"
  echo "   - e2e/report/summary.json"
else
  echo ""
  echo "❌ E2E tests failed"
  echo ""
  echo "🔧 Troubleshooting steps:"
  echo "   1. Ensure Chrome is not already running"
  echo "   2. Check Windows Defender/antivirus isn't blocking Chrome"
  echo "   3. Try running manually: scripts\\run-e2e-windows-native.ps1"
  echo "   4. Check Chrome can start with: chrome --remote-debugging-port=9222"
  exit 1
fi