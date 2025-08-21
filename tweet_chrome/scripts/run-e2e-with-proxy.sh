#!/usr/bin/env bash
set -euo pipefail

echo "[E2E-PROXY] Starting E2E tests with CDP proxy..."

# Start the CDP proxy in the background
echo "[E2E-PROXY] Starting CDP proxy..."
node scripts/cdp-proxy.js &
PROXY_PID=$!

# Function to cleanup on exit
cleanup() {
  echo "[E2E-PROXY] Cleaning up..."
  if kill -0 $PROXY_PID 2>/dev/null; then
    kill $PROXY_PID
    wait $PROXY_PID 2>/dev/null || true
  fi
  
  # Kill Chrome processes
  /mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe -ExecutionPolicy Bypass -Command "taskkill /IM chrome.exe /F" 2>/dev/null || true
}

# Set trap for cleanup
trap cleanup EXIT INT TERM

# Wait for proxy to be ready
echo "[E2E-PROXY] Waiting for CDP proxy to be ready..."
sleep 15

# Test proxy connection
echo "[E2E-PROXY] Testing proxy connection..."
if curl -s http://127.0.0.1:9223/json/version > /dev/null; then
  echo "[E2E-PROXY] ✅ Proxy connection successful"
else
  echo "[E2E-PROXY] ❌ Proxy connection failed"
  exit 1
fi

# Set environment variables for E2E tests
export E2E_REMOTE_CDP=1
export E2E_REMOTE_CDP_ENDPOINT="http://127.0.0.1:9223"

echo "[E2E-PROXY] Running E2E tests..."

# Run the tests
npm ci
npx playwright install chromium
node scripts/module-doctor.js

# Use the functional test config
npx playwright test -c e2e/functional/playwright.config.mjs --max-failures=1

# Generate report and proof
node e2e/report/generate-report.js --input e2e/report/summary.json --out e2e/report/report.functional.md --max-age-mins 60
node scripts/ci-proof.js e2e/report/summary.json

echo "[E2E-PROXY] ✅ E2E tests completed successfully!"