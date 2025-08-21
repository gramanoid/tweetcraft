#!/usr/bin/env node

/**
 * Debug script to test extension detection in isolation
 */

import { chromium } from '@playwright/test';
import path from 'path';

async function debugExtensionDetection() {
  console.log('🔍 Debug: Testing extension detection...');
  
  try {
    // Launch Chrome with extension
    const profileDir = path.resolve(process.cwd(), 'e2e/.profile-debug');
    const extensionDir = path.resolve(process.cwd(), 'extension');
    
    console.log(`📁 Extension dir: ${extensionDir}`);
    console.log(`📁 Profile dir: ${profileDir}`);
    
    const args = [
      `--disable-extensions-except=${extensionDir}`,
      `--load-extension=${extensionDir}`,
      '--no-first-run',
      '--no-default-browser-check'
    ];
    
    // Connect to remote Chrome via CDP - local launches are banned per P0 directive
    const endpoint = process.env.E2E_REMOTE_CDP_ENDPOINT || 'http://127.0.0.1:9222';
    
    if (!process.env.E2E_REMOTE_CDP_ENDPOINT) {
      console.error('E2E_REMOTE_CDP_ENDPOINT must be set - local Chrome launches are disabled per P0 directive');
      process.exit(1);
    }
    
    console.log('🚀 Connecting to remote Chrome...');
    const browser = await chromium.connectOverCDP(endpoint, { timeout: 30000 });
    const contexts = browser.contexts();
    if (!contexts.length) {
      console.error('No contexts available in remote Chrome');
      process.exit(1);
    }
    const context = contexts[0];
    
    console.log('✅ Connected to remote Chrome');
    
    // Test extension detection
    const page = context.pages()[0] || await context.newPage();
    const cdp = await context.newCDPSession(page);
    
    await cdp.send('Target.setDiscoverTargets', { discover: true });
    
    console.log('🔍 Scanning for extension targets...');
    const { targetInfos } = await cdp.send('Target.getTargets');
    
    console.log(`📊 Found ${targetInfos.length} targets:`);
    targetInfos.forEach((target, i) => {
      console.log(`  ${i+1}. Type: ${target.type}, URL: ${target.url}`);
    });
    
    // Look for extension service worker
    const extensionTargets = targetInfos.filter(t => 
      t.type === 'service_worker' && t.url.startsWith('chrome-extension://')
    );
    
    if (extensionTargets.length > 0) {
      console.log(`✅ Found ${extensionTargets.length} extension service worker(s):`);
      extensionTargets.forEach(target => {
        const url = new URL(target.url);
        console.log(`  Extension ID: ${url.host}`);
        console.log(`  Full URL: ${target.url}`);
      });
    } else {
      console.log('❌ No extension service workers found');
      
      // Check for any extension-related targets
      const anyExtension = targetInfos.filter(t => t.url.startsWith('chrome-extension://'));
      if (anyExtension.length > 0) {
        console.log(`ℹ️ Found ${anyExtension.length} other extension target(s):`);
        anyExtension.forEach(target => {
          console.log(`  Type: ${target.type}, URL: ${target.url}`);
        });
      }
    }
    
    // Check if extension manifest is accessible
    console.log('🔍 Testing extension manifest accessibility...');
    try {
      await page.goto('chrome://extensions/', { waitUntil: 'domcontentloaded', timeout: 5000 });
      await page.waitForTimeout(2000);
      
      const extensions = await page.evaluate(() => {
        const items = document.querySelectorAll('extensions-item');
        return Array.from(items).map(item => ({
          name: item.shadowRoot?.querySelector('#name')?.textContent?.trim(),
          id: item.getAttribute('id')
        }));
      });
      
      console.log(`📋 Extensions page shows ${extensions.length} extension(s):`);
      extensions.forEach(ext => {
        console.log(`  ${ext.name} (ID: ${ext.id})`);
      });
      
    } catch (error) {
      console.log(`⚠️ Could not access chrome://extensions/: ${error.message}`);
    }
    
    // Don't close the context - it's the persistent profile
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
    console.error(error.stack);
  }
}

debugExtensionDetection().catch(console.error);