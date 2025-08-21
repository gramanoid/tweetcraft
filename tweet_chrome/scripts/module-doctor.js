const fs = require('fs'); const path = require('path');

const ROOT = path.resolve(__dirname, '..', 'e2e');
let bad = [];

function scan(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { scan(p); continue; }
    if (p.endsWith('.mjs')) {
      const txt = fs.readFileSync(p,'utf8');
      if (/^module\.exports\s*=|^\s*module\.exports\s*=|require\s*\(/.test(txt)) bad.push(`[ESM uses CJS] ${p}`);
      if (/from\s+['"]\.[^']*['"]/.test(txt) && !/from\s+['"][^']*\.(mjs|js|cjs)['"]/.test(txt)) bad.push(`[ESM missing extension?] ${p}`);
      if (/[^.\w]eval\s*\(/.test(txt)) bad.push(`[ESM uses eval] ${p}`);
      if (/\bnew\s+Function\s*\(/.test(txt) || /\bFunction\s*\(/.test(txt)) bad.push(`[ESM uses Function()] ${p}`);
    }
    if (p.endsWith('.cjs')) {
      const txt = fs.readFileSync(p,'utf8');
      if (/\bimport\s+|\bexport\s+/.test(txt)) bad.push(`[CJS uses ESM] ${p}`);
    }
  }
}
scan(ROOT);
if (bad.length) { console.error(bad.join('\n')); process.exit(2); }
console.log('[module-doctor] OK');