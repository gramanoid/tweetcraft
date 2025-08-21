#!/usr/bin/env bash
set -euo pipefail

WIN_EXT_DIR="${WIN_EXT_DIR:-/mnt/c/tweetcraft_ext/extension}"
WIN_PROFILE_ROOT="${WIN_PROFILE_ROOT:-/mnt/c/tweetcraft_ext/profile}"

# 1) Sync extension
mkdir -p "$WIN_EXT_DIR"
rsync -a --delete ./extension/ "$WIN_EXT_DIR"/
echo "[WSL-SYNC] Extension → $WIN_EXT_DIR"

# 2) Launch Windows Chrome (PowerShell) and capture outputs
echo "[WSL-E2E] Launching Windows Dev-channel browser with extension..."
OUT=$(/mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe -ExecutionPolicy Bypass -File scripts\\start-win-chrome.ps1 -ExtDir "$(wslpath -w "$WIN_EXT_DIR")" -ProfileDir "$(wslpath -w "$WIN_PROFILE_ROOT")")
echo "$OUT"

# Parse outputs - now using REMOTE_DEBUG_PORT instead of parsing command line
PORT=$(echo "$OUT" | tr -d '\r' | grep 'REMOTE_DEBUG_PORT=' | sed 's/.*REMOTE_DEBUG_PORT=//')
WIN_PROFILE_DIR_WIN=$(echo "$OUT" | tr -d '\r' | grep 'PROFILE_DIR=' | sed 's/.*PROFILE_DIR=//')
WIN_EXT_DIR_WIN=$(echo "$OUT" | tr -d '\r' | grep 'EXT_DIR=' | sed 's/.*EXT_DIR=//')

if [ -z "${PORT:-}" ] || [ -z "${WIN_PROFILE_DIR_WIN:-}" ] || [ -z "${WIN_EXT_DIR_WIN:-}" ]; then
  echo "[E2E] Failed to parse Chrome launch output. Expected REMOTE_DEBUG_PORT, PROFILE_DIR, and EXT_DIR."
  echo "[E2E] Actual output: $OUT"
  exit 2
fi

echo "[WSL-E2E] Parsed: PORT=$PORT, PROFILE=$WIN_PROFILE_DIR_WIN, EXT=$WIN_EXT_DIR_WIN"

export E2E_REMOTE_CDP=1
export E2E_REMOTE_CDP_ENDPOINT="http://127.0.0.1:${PORT}"
export E2E_WIN_PROFILE_DIR="$WIN_PROFILE_DIR_WIN"
export E2E_WIN_EXT_DIR="$WIN_EXT_DIR_WIN"

# 3) Verify Preferences registers the unpacked extension; print ID
node - <<'NODE'
import fs from 'fs';
import path from 'path';

const prof = process.env.E2E_WIN_PROFILE_DIR;
const extdir = (process.env.E2E_WIN_EXT_DIR || '').toLowerCase();
if (!prof || !extdir) { console.error('Missing E2E_WIN_PROFILE_DIR/E2E_WIN_EXT_DIR'); process.exit(2); }

const prefs = path.join(prof, 'Default', 'Preferences');
const deadline = Date.now() + 60000;
let lastErr = '';

function tryRead() {
  try {
    const j = JSON.parse(fs.readFileSync(prefs, 'utf8'));
    const settings = j?.extensions?.settings;
    if (settings) {
      for (const [id, meta] of Object.entries(settings)) {
        const pth = (meta?.path || '').toLowerCase();
        const enabled = meta?.state === 1 || meta?.enabled === true;
        const dev = meta?.install_type === 'development';
        if (dev && enabled && pth === extdir) return id;
      }
    }
  } catch(e) { lastErr = String(e); }
  return null;
}

async function waitId() {
  while (Date.now() < deadline) {
    const id = tryRead();
    if (id) return id;
    await new Promise(r => setTimeout(r, 500));
  }
  return null;
}

const run = await waitId();
if (!run) {
  console.error('[E2E] Extension not registered in Preferences within 60s.');
  const log = path.join(prof, 'chrome.log');
  if (fs.existsSync(log)) {
    console.error('--- chrome.log (tail) ---');
    const buf = fs.readFileSync(log, 'utf8').split('\n').slice(-200).join('\n');
    console.error(buf);
  }
  process.exit(3);
}
console.log('[E2E] Extension ID (from Preferences):', run);
NODE

# 4) Proceed with tests
npm ci
npx playwright install chromium
node scripts/module-doctor.js

npx playwright test -c e2e/functional --max-failures=1
node e2e/report/generate-report.js --input e2e/report/summary.json --out e2e/report/report.functional.md --max-age-mins 60
node scripts/ci-proof.js e2e/report/summary.json