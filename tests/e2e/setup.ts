/**
 * E2E Test Setup for TweetCraft Extension
 * Using Playwright for automated testing
 */

import { chromium, Browser, BrowserContext, Page } from 'playwright';
import path from 'path';

export interface TestContext {
  browser: Browser;
  context: BrowserContext;
  extensionId?: string;
}

/**
 * Setup test browser with extension loaded
 */
export async function setupTestBrowser(): Promise<TestContext> {
  const pathToExtension = path.join(process.cwd(), 'dist');
  
  const browser = await chromium.launchPersistentContext('', {
    headless: false, // Extensions don't work in headless mode
    args: [
      `--disable-extensions-except=${pathToExtension}`,
      `--load-extension=${pathToExtension}`,
      '--no-sandbox',
      '--disable-setuid-sandbox'
    ],
    viewport: { width: 1280, height: 720 }
  });

  // Get extension ID
  const serviceWorkerTarget = browser.serviceWorkers()[0];
  const extensionId = serviceWorkerTarget?.url().split('/')[2];

  return {
    browser,
    context: browser,
    extensionId
  };
}

/**
 * Open extension popup
 */
export async function openExtensionPopup(context: TestContext): Promise<Page> {
  if (!context.extensionId) {
    throw new Error('Extension ID not found');
  }
  
  const popupPage = await context.context.newPage();
  await popupPage.goto(`chrome-extension://${context.extensionId}/popup.html`);
  await popupPage.waitForLoadState('networkidle');
  
  return popupPage;
}

/**
 * Open extension config page
 */
export async function openConfigPage(context: TestContext): Promise<Page> {
  if (!context.extensionId) {
    throw new Error('Extension ID not found');
  }
  
  const configPage = await context.context.newPage();
  await configPage.goto(`chrome-extension://${context.extensionId}/config.html`);
  await configPage.waitForLoadState('networkidle');
  
  return configPage;
}

/**
 * Navigate to Twitter/X
 */
export async function openTwitter(context: TestContext): Promise<Page> {
  const page = await context.context.newPage();
  await page.goto('https://x.com');
  await page.waitForLoadState('networkidle');
  
  return page;
}

/**
 * Clean up test browser
 */
export async function teardownTestBrowser(context: TestContext): Promise<void> {
  await context.browser.close();
}

/**
 * Wait for extension to inject content script
 */
export async function waitForContentScript(page: Page): Promise<void> {
  await page.waitForFunction(() => {
    return document.querySelector('.smart-reply-container') !== null;
  }, { timeout: 10000 });
}

/**
 * Mock API responses for testing
 */
export async function mockAPIResponses(page: Page): Promise<void> {
  await page.route('**/api.openrouter.ai/**', route => {
    if (route.request().url().includes('/chat/completions')) {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          choices: [{
            message: {
              content: 'This is a mocked AI response for testing purposes.'
            }
          }]
        })
      });
    } else {
      route.continue();
    }
  });
}
