#!/usr/bin/env node

/**
 * CDP Proxy for WSL→Windows Chrome Bridge
 * 
 * This proxy runs in WSL and bridges CDP connections to Windows Chrome.
 * It works around WSL2 networking limitations by using HTTP tunneling.
 */

const http = require('http');
const httpProxy = require('http-proxy');
const { spawn } = require('child_process');
const path = require('path');

const WSL_PORT = 9223;
const WIN_CHROME_PORT = 9222;
const WIN_HOST = '127.0.0.1';

console.log(`[CDP-PROXY] Starting CDP proxy: WSL:${WSL_PORT} -> Windows Chrome:${WIN_HOST}:${WIN_CHROME_PORT}`);

// First, sync extension and start Windows Chrome
console.log('[CDP-PROXY] Syncing extension to Windows...');
const syncScript = path.join(__dirname, 'wsl-sync-extension-to-win.sh');
const sync = spawn('bash', [syncScript], { stdio: 'inherit' });

sync.on('close', (code) => {
  if (code !== 0) {
    console.error('[CDP-PROXY] ❌ Extension sync failed');
    process.exit(1);
  }
  
  console.log('[CDP-PROXY] ✅ Extension synced, starting Windows Chrome...');
  
  // Start Windows Chrome
  const chromeScript = path.join(__dirname, 'start-win-chrome.ps1');
  const chrome = spawn('/mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe', [
    '-ExecutionPolicy', 'Bypass', 
    '-File', chromeScript
  ], { stdio: 'inherit' });
  
  chrome.on('close', (code) => {
    console.log(`[CDP-PROXY] Chrome launcher finished with code ${code} (Chrome browser continues running)`);
  });
  
  // Wait for Chrome to start
  setTimeout(() => {
    // Test if Chrome CDP is accessible from Windows PowerShell
    console.log('[CDP-PROXY] Testing Chrome CDP from Windows side...');
    
    const testChrome = spawn('/mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe', [
      '-ExecutionPolicy', 'Bypass',
      '-Command', `
        try {
          $response = Invoke-WebRequest -Uri 'http://${WIN_HOST}:${WIN_CHROME_PORT}/json/version' -UseBasicParsing -TimeoutSec 10
          Write-Host "[CDP-PROXY] ✅ Chrome CDP accessible from Windows"
          Write-Host $response.Content
        } catch {
          Write-Host "[CDP-PROXY] ❌ Chrome CDP failed: $($_.Exception.Message)"
          exit 1
        }
      `
    ], { stdio: 'inherit' });
    
    testChrome.on('close', (testCode) => {
      if (testCode === 0) {
        console.log('[CDP-PROXY] Starting HTTP proxy server...');
        startProxy();
      } else {
        console.error('[CDP-PROXY] ❌ Chrome CDP not accessible, cannot start proxy');
        process.exit(1);
      }
    });
    
  }, 8000); // Wait 8 seconds for Chrome to fully start
});

function startProxy() {
  console.log('[CDP-PROXY] Creating HTTP proxy server...');
  
  // Create HTTP proxy that forwards requests to Windows Chrome
  const proxy = httpProxy.createProxyServer({
    target: `http://${WIN_HOST}:${WIN_CHROME_PORT}`,
    changeOrigin: true,
    timeout: 60000,
    proxyTimeout: 60000
  });
  
  // Handle WebSocket connections for CDP
  const server = http.createServer((req, res) => {
    // Forward HTTP requests to Chrome
    proxy.web(req, res, {}, (err) => {
      console.error('[CDP-PROXY] HTTP proxy error:', err.message);
      res.writeHead(502, { 'Content-Type': 'text/plain' });
      res.end('CDP Proxy Error: ' + err.message);
    });
  });
  
  // Handle WebSocket upgrades for CDP debugging
  server.on('upgrade', (req, socket, head) => {
    proxy.ws(req, socket, head, {}, (err) => {
      console.error('[CDP-PROXY] WebSocket proxy error:', err.message);
      socket.end();
    });
  });
  
  // Handle proxy errors
  proxy.on('error', (err, req, res) => {
    console.error('[CDP-PROXY] Proxy error:', err.message);
    if (res) {
      res.writeHead(502, { 'Content-Type': 'text/plain' });
      res.end('CDP Proxy Error: ' + err.message);
    }
  });
  
  // Start listening
  server.listen(WSL_PORT, '0.0.0.0', () => {
    console.log(`[CDP-PROXY] ✅ HTTP proxy listening on 0.0.0.0:${WSL_PORT}`);
    console.log(`[CDP-PROXY] ✅ WSL tests can now connect to: http://127.0.0.1:${WSL_PORT}`);
    console.log('[CDP-PROXY] Press Ctrl+C to stop');
  });
  
  // Test the proxy
  setTimeout(() => {
    testProxy();
  }, 2000);
}

function testProxy() {
  console.log('[CDP-PROXY] Testing proxy connection...');
  
  const testReq = http.get(`http://127.0.0.1:${WSL_PORT}/json/version`, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
      console.log('[CDP-PROXY] ✅ Proxy test successful!');
      console.log('[CDP-PROXY] Response:', JSON.parse(data).Browser);
    });
  });
  
  testReq.on('error', (err) => {
    console.error('[CDP-PROXY] ❌ Proxy test failed:', err.message);
  });
  
  testReq.setTimeout(5000, () => {
    console.error('[CDP-PROXY] ❌ Proxy test timeout');
    testReq.destroy();
  });
}

// Error handling for uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('[CDP-PROXY] Uncaught exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[CDP-PROXY] Unhandled rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[CDP-PROXY] Shutting down...');
  
  // Kill Chrome processes
  const killChrome = spawn('/mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe', [
    '-ExecutionPolicy', 'Bypass',
    '-Command', 'taskkill /IM chrome.exe /F'
  ], { stdio: 'inherit' });
  
  killChrome.on('close', () => {
    console.log('[CDP-PROXY] Cleanup complete');
    process.exit(0);
  });
});