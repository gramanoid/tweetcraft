/**
 * E2E Tests for Extension Popup
 */

import { test, expect } from '@playwright/test';
import { setupTestBrowser, openExtensionPopup, teardownTestBrowser, TestContext } from './setup';

let testContext: TestContext;

test.beforeAll(async () => {
  testContext = await setupTestBrowser();
});

test.afterAll(async () => {
  await teardownTestBrowser(testContext);
});

test.describe('Extension Popup UI', () => {
  test('should load popup successfully', async () => {
    const popup = await openExtensionPopup(testContext);
    
    // Check if popup loads
    await expect(popup.locator('h1')).toContainText('TweetCraft');
    await expect(popup.locator('.popup-header')).toBeVisible();
    await expect(popup.locator('#save-settings')).toBeVisible();
  });

  test('should display all main settings', async () => {
    const popup = await openExtensionPopup(testContext);
    
    // Check model selection
    await expect(popup.locator('#model-select')).toBeVisible();
    
    // Check system prompt
    await expect(popup.locator('#system-prompt')).toBeVisible();
    
    // Check custom style prompt
    await expect(popup.locator('#custom-style-prompt')).toBeVisible();
    
    // Check temperature slider
    await expect(popup.locator('#temperature')).toBeVisible();
    await expect(popup.locator('#temperature-value')).toBeVisible();
    
    // Check context mode
    await expect(popup.locator('#context-mode')).toBeVisible();
    
    // Check reply length
    await expect(popup.locator('#reply-length')).toBeVisible();
  });

  test('should display all feature toggles', async () => {
    const popup = await openExtensionPopup(testContext);
    
    // Check Arsenal Mode toggle
    await expect(popup.locator('#arsenal-mode')).toBeVisible();
    await expect(popup.locator('text=Arsenal Mode')).toBeVisible();
    
    // Check Smart Suggestions toggle
    await expect(popup.locator('#smart-suggestions')).toBeVisible();
    await expect(popup.locator('text=Smart Suggestions')).toBeVisible();
    
    // Check Reply Carousel toggle
    await expect(popup.locator('#reply-carousel')).toBeVisible();
    await expect(popup.locator('text=Multiple Reply Options')).toBeVisible();
    
    // Check Image Understanding toggle
    await expect(popup.locator('#image-understanding')).toBeVisible();
    await expect(popup.locator('text=Image Understanding')).toBeVisible();
  });

  test('should toggle image understanding settings', async () => {
    const popup = await openExtensionPopup(testContext);
    
    // Initially hidden
    await expect(popup.locator('#vision-settings')).toBeHidden();
    
    // Click toggle
    await popup.locator('#image-understanding').click();
    
    // Should show settings
    await expect(popup.locator('#vision-settings')).toBeVisible();
    await expect(popup.locator('#vision-model')).toBeVisible();
    
    // Click toggle again
    await popup.locator('#image-understanding').click();
    
    // Should hide settings
    await expect(popup.locator('#vision-settings')).toBeHidden();
  });

  test('should display quick action buttons', async () => {
    const popup = await openExtensionPopup(testContext);
    
    await expect(popup.locator('#manage-arsenal')).toBeVisible();
    await expect(popup.locator('#view-history')).toBeVisible();
    await expect(popup.locator('#keyboard-shortcuts')).toBeVisible();
  });

  test('should show keyboard shortcuts modal', async () => {
    const popup = await openExtensionPopup(testContext);
    
    // Click shortcuts button
    await popup.locator('#keyboard-shortcuts').click();
    
    // Check modal appears
    await expect(popup.locator('text=Keyboard Shortcuts')).toBeVisible();
    await expect(popup.locator('text=Ctrl+Shift+T')).toBeVisible();
    await expect(popup.locator('text=Ctrl+Shift+A')).toBeVisible();
    
    // Close modal
    await popup.locator('#close-shortcuts').click();
    await expect(popup.locator('text=Keyboard Shortcuts')).toBeHidden();
  });

  test('should add and delete custom tone', async () => {
    const popup = await openExtensionPopup(testContext);
    
    // Add custom tone
    await popup.locator('#custom-tone-name').fill('Test Tone');
    await popup.locator('#custom-tone-emoji').fill('🎭');
    await popup.locator('#custom-tone-prompt').fill('Test prompt for custom tone');
    await popup.locator('#add-custom-tone').click();
    
    // Check success message
    await expect(popup.locator('#status-message')).toContainText('Custom tone added!');
    
    // Check tone appears in list
    await expect(popup.locator('text=🎭 Test Tone')).toBeVisible();
    
    // Delete tone
    await popup.locator('button[title="Delete tone"]').first().click();
    
    // Confirm deletion in dialog
    popup.on('dialog', dialog => dialog.accept());
    
    // Check tone is removed
    await expect(popup.locator('text=🎭 Test Tone')).toBeHidden();
  });

  test('should save settings', async () => {
    const popup = await openExtensionPopup(testContext);
    
    // Fill in some settings
    await popup.locator('#system-prompt').fill('Test system prompt');
    await popup.locator('#custom-style-prompt').fill('Test style prompt');
    
    // Save settings
    await popup.locator('#save-settings').click();
    
    // Check success message
    await expect(popup.locator('#status-message')).toContainText('Settings saved!');
  });

  test('should update temperature value display', async () => {
    const popup = await openExtensionPopup(testContext);
    
    // Get initial value
    const initialValue = await popup.locator('#temperature-value').textContent();
    
    // Change temperature
    await popup.locator('#temperature').fill('0.9');
    
    // Check value updated
    await expect(popup.locator('#temperature-value')).toContainText('0.9');
  });

  test('should be responsive on mobile viewport', async () => {
    const popup = await openExtensionPopup(testContext);
    
    // Set mobile viewport
    await popup.setViewportSize({ width: 375, height: 667 });
    
    // Check elements are still visible
    await expect(popup.locator('h1')).toBeVisible();
    await expect(popup.locator('#save-settings')).toBeVisible();
    
    // Check quick actions are stacked vertically
    const quickActions = popup.locator('.quick-actions');
    await expect(quickActions).toHaveCSS('grid-template-columns', '1fr');
  });
});
