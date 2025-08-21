const fs = require('fs');
const path = require('path');

function isWSL() {
  try {
    if (process.env.WSL_INTEROP) return true;
    const v = fs.readFileSync('/proc/sys/kernel/osrelease', 'utf8');
    return /microsoft/i.test(v);
  } catch { return false; }
}
if (isWSL()) {
  console.error('[E2E-INFRA] You are inside WSL. Do not run MV3 E2E here. Use Windows PowerShell on the host.');
  process.exit(42);
}
if (process.platform !== 'win32') {
  console.error('[E2E-INFRA] Windows run requested but process.platform != win32. Use Linux configs instead.');
  process.exit(43);
}

// Basic path sanity — ensure extension dir is accessible
const extDir = path.resolve(process.cwd(), 'extension');
if (!fs.existsSync(extDir)) {
  console.error(`[E2E-INFRA] extension/ not found at ${extDir}. Run from repo root on Windows (e.g., C:\\dev\\tweetcraft).`);
  process.exit(44);
}
console.log('[E2E-INFRA] Windows host detected — proceeding with Windows-native E2E.');