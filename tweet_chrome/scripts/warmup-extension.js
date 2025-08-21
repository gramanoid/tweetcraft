const { chromium } = require('playwright');
const path = require('path'); const fs = require('fs');

(async () => {
  // Connect to remote Chrome via CDP - local launches are banned per P0 directive
  const endpoint = process.env.E2E_REMOTE_CDP_ENDPOINT || 'http://127.0.0.1:9222';
  
  if (!process.env.E2E_REMOTE_CDP_ENDPOINT) {
    console.error('[warmup] E2E_REMOTE_CDP_ENDPOINT must be set - local Chrome launches are disabled per P0 directive');
    process.exit(1);
  }
  
  const browser = await chromium.connectOverCDP(endpoint, { timeout: 60000 });
  const contexts = browser.contexts();
  if (!contexts.length) {
    console.error('[warmup] No contexts available in remote Chrome');
    process.exit(1);
  }
  const context = contexts[0];
  
  // Wait a couple seconds for SW registration
  await new Promise(r => setTimeout(r, 3000));
  // Don't close the context - it's the persistent profile
  console.log('[warmup] profile ready');
})().catch(err => { console.error('[warmup] failed:', err); process.exit(2); });