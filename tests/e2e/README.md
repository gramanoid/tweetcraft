# TweetCraft E2E Tests

This directory contains end-to-end tests for the TweetCraft extension using Playwright.

## Setup

1. Install dependencies:
```bash
npm install
npm run test:install
```

2. Build the extension:
```bash
npm run build
```

## Running Tests

### Run all tests:
```bash
npm run test:e2e
```

### Run tests with UI mode (recommended for development):
```bash
npm run test:e2e:ui
```

### Debug tests:
```bash
npm run test:e2e:debug
```

## Test Structure

- `setup.ts` - Common test utilities and browser setup
- `popup.test.ts` - Tests for the extension popup UI
- `content-script.test.ts` - Tests for content script interactions on Twitter/X

## Test Coverage

### Popup Tests
- ✅ Settings management
- ✅ Feature toggles
- ✅ Custom tone management
- ✅ Quick actions
- ✅ Keyboard shortcuts modal
- ✅ Mobile responsiveness

### Content Script Tests
- ✅ Button injection
- ✅ Unified selector (5-step system)
- ✅ Quick presets
- ✅ Arsenal Mode
- ✅ Image understanding
- ✅ Loading states
- ✅ Error handling
- ✅ Keyboard shortcuts

## Writing New Tests

1. Create a new test file in `tests/e2e/`
2. Import necessary utilities from `setup.ts`
3. Use the test structure:

```typescript
import { test, expect } from '@playwright/test';
import { setupTestBrowser, teardownTestBrowser } from './setup';

let testContext: TestContext;

test.beforeAll(async () => {
  testContext = await setupTestBrowser();
});

test.afterAll(async () => {
  await teardownTestBrowser(testContext);
});

test.describe('Feature Name', () => {
  test('should do something', async () => {
    // Your test here
  });
});
```

## CI/CD Integration

The tests are configured to run in CI environments with:
- Retries on failure
- Screenshot capture on failure
- Video recording on failure
- HTML report generation

## Troubleshooting

### Extension not loading
- Ensure the extension is built (`npm run build`)
- Check that the `dist` folder exists

### Tests timing out
- Increase timeout in specific tests: `test.setTimeout(30000)`
- Check network conditions for external API calls

### Flaky tests
- Use `await page.waitForLoadState('networkidle')`
- Add explicit waits for dynamic content
- Mock external API calls for consistency
