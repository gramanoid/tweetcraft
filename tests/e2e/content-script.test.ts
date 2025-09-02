/**
 * E2E Tests for Content Script UI Interactions
 */

import { test, expect } from '@playwright/test';
import { setupTestBrowser, openTwitter, teardownTestBrowser, waitForContentScript, mockAPIResponses, TestContext } from './setup';

let testContext: TestContext;

test.beforeAll(async () => {
  testContext = await setupTestBrowser();
});

test.afterAll(async () => {
  await teardownTestBrowser(testContext);
});

test.describe('Content Script UI on Twitter/X', () => {
  test('should inject Smart Reply button in reply toolbar', async () => {
    const page = await openTwitter(testContext);
    
    // Navigate to a tweet page (using a test account or public tweet)
    await page.goto('https://x.com/Twitter/status/1234567890');
    
    // Wait for content script injection
    await waitForContentScript(page);
    
    // Find reply button area
    await page.click('[data-testid="reply"]');
    
    // Check if TweetCraft button is injected
    await expect(page.locator('.smart-reply-container')).toBeVisible();
    await expect(page.locator('.smart-reply-btn')).toBeVisible();
    await expect(page.locator('.smart-reply-btn')).toContainText('Craft');
  });

  test('should open unified selector on button click', async () => {
    const page = await openTwitter(testContext);
    await mockAPIResponses(page);
    
    // Navigate to a tweet and open reply
    await page.goto('https://x.com/Twitter/status/1234567890');
    await waitForContentScript(page);
    await page.click('[data-testid="reply"]');
    
    // Click TweetCraft button
    await page.click('.smart-reply-btn');
    
    // Check unified selector appears
    await expect(page.locator('.unified-selector-enhanced')).toBeVisible();
    await expect(page.locator('text=Choose Your Reply Style')).toBeVisible();
    
    // Check all 5 steps are present
    await expect(page.locator('text=Persona & Framing')).toBeVisible();
    await expect(page.locator('text=Attitude')).toBeVisible();
    await expect(page.locator('text=Rhetoric')).toBeVisible();
    await expect(page.locator('text=Vocabulary')).toBeVisible();
    await expect(page.locator('text=Format & Pacing')).toBeVisible();
  });

  test('should navigate through selector steps', async () => {
    const page = await openTwitter(testContext);
    await mockAPIResponses(page);
    
    await page.goto('https://x.com/Twitter/status/1234567890');
    await waitForContentScript(page);
    await page.click('[data-testid="reply"]');
    await page.click('.smart-reply-btn');
    
    // Step 1: Select persona
    await page.click('text=Expert Persona');
    
    // Should advance to step 2
    await expect(page.locator('.unified-selector-progress')).toContainText('2 / 5');
    
    // Select attitude
    await page.click('text=Professional');
    
    // Should advance to step 3
    await expect(page.locator('.unified-selector-progress')).toContainText('3 / 5');
    
    // Continue through all steps
    await page.click('text=Agree & Add');
    await page.click('text=Academic');
    await page.click('text=Single Sentence');
    
    // Should show generating state
    await expect(page.locator('text=Generating your reply...')).toBeVisible();
  });

  test('should use quick presets', async () => {
    const page = await openTwitter(testContext);
    await mockAPIResponses(page);
    
    await page.goto('https://x.com/Twitter/status/1234567890');
    await waitForContentScript(page);
    await page.click('[data-testid="reply"]');
    await page.click('.smart-reply-btn');
    
    // Click quick preset
    await page.click('text=💼 Professional');
    
    // Should skip to generation
    await expect(page.locator('text=Generating your reply...')).toBeVisible();
  });

  test('should open Arsenal Mode with keyboard shortcut', async () => {
    const page = await openTwitter(testContext);
    
    await page.goto('https://x.com/Twitter/status/1234567890');
    await waitForContentScript(page);
    await page.click('[data-testid="reply"]');
    
    // Trigger keyboard shortcut
    await page.keyboard.press('Control+Shift+A');
    
    // Check Arsenal Mode popup appears
    await expect(page.locator('.arsenal-mode-popup')).toBeVisible();
    await expect(page.locator('text=Arsenal Mode')).toBeVisible();
  });

  test('should handle image understanding', async () => {
    const page = await openTwitter(testContext);
    await mockAPIResponses(page);
    
    // Navigate to a tweet with an image
    await page.goto('https://x.com/Twitter/status/1234567890');
    await waitForContentScript(page);
    
    // Assume the tweet has an image
    const hasImage = await page.locator('img[alt*="Image"]').count() > 0;
    
    if (hasImage) {
      await page.click('[data-testid="reply"]');
      await page.click('.smart-reply-btn');
      
      // Should show image analysis indicator
      await expect(page.locator('text=Analyzing image context...')).toBeVisible();
    }
  });

  test('should close selector on escape key', async () => {
    const page = await openTwitter(testContext);
    await mockAPIResponses(page);
    
    await page.goto('https://x.com/Twitter/status/1234567890');
    await waitForContentScript(page);
    await page.click('[data-testid="reply"]');
    await page.click('.smart-reply-btn');
    
    // Selector should be visible
    await expect(page.locator('.unified-selector-enhanced')).toBeVisible();
    
    // Press escape
    await page.keyboard.press('Escape');
    
    // Selector should be hidden
    await expect(page.locator('.unified-selector-enhanced')).toBeHidden();
  });

  test('should handle loading states', async () => {
    const page = await openTwitter(testContext);
    
    // Delay API response to test loading state
    await page.route('**/api.openrouter.ai/**', async route => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          choices: [{
            message: {
              content: 'Delayed response for testing'
            }
          }]
        })
      });
    });
    
    await page.goto('https://x.com/Twitter/status/1234567890');
    await waitForContentScript(page);
    await page.click('[data-testid="reply"]');
    await page.click('.smart-reply-btn');
    
    // Quick select a preset
    await page.click('text=😄 Witty Response');
    
    // Should show loading state
    await expect(page.locator('.loading-progress-bar')).toBeVisible();
    await expect(page.locator('text=Crafting witty response')).toBeVisible();
  });

  test('should handle errors gracefully', async () => {
    const page = await openTwitter(testContext);
    
    // Mock error response
    await page.route('**/api.openrouter.ai/**', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Internal server error'
        })
      });
    });
    
    await page.goto('https://x.com/Twitter/status/1234567890');
    await waitForContentScript(page);
    await page.click('[data-testid="reply"]');
    await page.click('.smart-reply-btn');
    
    // Select options
    await page.click('text=💼 Professional');
    
    // Should show error state
    await expect(page.locator('text=Failed to generate reply')).toBeVisible();
    await expect(page.locator('.smart-reply-btn.error')).toBeVisible();
  });
});
