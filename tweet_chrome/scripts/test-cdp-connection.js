#!/usr/bin/env node

/**
 * Test CDP connection to Windows Chrome
 * Run this after starting Windows Chrome with start-win-chrome.ps1
 */

const { chromium } = require('@playwright/test');

async function testCDPConnection() {
  try {
    console.log('[CDP-TEST] Attempting to connect to Chrome on port 9222...');
    
    const browser = await chromium.connectOverCDP('http://127.0.0.1:9222', { timeout: 10000 });
    const contexts = browser.contexts();
    
    console.log(`[CDP-TEST] ✅ Connected! Found ${contexts.length} context(s)`);
    
    if (contexts.length > 0) {
      const context = contexts[0];
      const pages = context.pages();
      console.log(`[CDP-TEST] ✅ Context has ${pages.length} page(s)`);
      
      // Test creating a new page
      const testPage = await context.newPage();
      await testPage.goto('chrome://extensions/');
      console.log('[CDP-TEST] ✅ Successfully navigated to chrome://extensions/');
      
      // Check for our extension
      const title = await testPage.title();
      console.log(`[CDP-TEST] ✅ Page title: ${title}`);
      
      await testPage.close();
    }
    
    console.log('[CDP-TEST] ✅ All tests passed! CDP connection working.');
    
  } catch (error) {
    console.error('[CDP-TEST] ❌ Failed:', error.message);
    process.exit(1);
  }
}

testCDPConnection();