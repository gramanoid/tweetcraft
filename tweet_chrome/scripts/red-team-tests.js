#!/usr/bin/env node

/**
 * Red-Team Tests - Prove the skeptical audit gates actually catch violations
 * 
 * FINAL ACCEPTANCE: Deliberate gate violations to validate harness integrity
 * 
 * Intentionally creates violations for each of the 7 audit requirements
 * to prove the CI gates will catch real regressions. Each test should
 * FAIL when run, proving the gates work.
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const RED_TEAM_MODE = process.env.E2E_RED_TEAM || '1';

console.log(`🔴 [RED-TEAM] Starting deliberate gate violation tests...`);
console.log(`   Mode: Prove gates catch cheating`);
console.log(`   Expected result: ALL TESTS SHOULD FAIL`);
console.log(`   Timestamp: ${new Date().toISOString()}`);

/**
 * Execute command with promise interface
 */
function exec(command, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    console.log(`▶️ [EXEC] ${command} ${args.join(' ')}`);
    
    const proc = spawn(command, args, {
      stdio: 'inherit',
      ...options
    });
    
    proc.on('close', (code) => {
      resolve(code); // Return code instead of rejecting on non-zero
    });
    
    proc.on('error', (error) => {
      reject(new Error(`Failed to execute command: ${error.message}`));
    });
  });
}

/**
 * Red-team test results tracking
 */
const testResults = {
  totalTests: 0,
  expectedFailures: 0, // Tests that correctly failed (good)
  unexpectedPasses: 0, // Tests that should have failed but passed (bad)
  executionErrors: 0,  // Tests that couldn't execute
  tests: []
};

/**
 * Run a single red-team test that should fail
 */
async function runRedTeamTest(testName, violationDescription, testFn) {
  testResults.totalTests++;
  console.log(`\n🔴 [RED-TEAM] Test ${testResults.totalTests}: ${testName}`);
  console.log(`   Violation: ${violationDescription}`);
  console.log(`   Expected: FAIL (gate should catch this)`);
  
  const testResult = {
    name: testName,
    violation: violationDescription,
    expectedToFail: true,
    actuallyFailed: false,
    executionError: false,
    error: null,
    exitCode: null,
    timestamp: new Date().toISOString()
  };
  
  try {
    const exitCode = await testFn();
    testResult.exitCode = exitCode;
    testResult.actuallyFailed = (exitCode !== 0);
    
    if (testResult.actuallyFailed) {
      // Good: Test failed as expected (gate caught the violation)
      testResults.expectedFailures++;
      console.log(`✅ [RED-TEAM] ${testName} - CORRECTLY FAILED (gate working)`);
    } else {
      // Bad: Test passed when it should have failed (gate missed violation)
      testResults.unexpectedPasses++;
      console.log(`❌ [RED-TEAM] ${testName} - INCORRECTLY PASSED (gate broken!)`);
    }
    
  } catch (error) {
    testResult.executionError = true;
    testResult.error = error.message;
    testResults.executionErrors++;
    console.log(`🔥 [RED-TEAM] ${testName} - EXECUTION ERROR: ${error.message}`);
  }
  
  testResults.tests.push(testResult);
}

/**
 * RED-TEAM TEST 1: Registry drift
 * Change a control name to create missing registry entry
 */
async function testRegistryDrift() {
  // Temporarily modify a control's accessible name to break registry matching
  const controlsRegistryPath = 'e2e/functional/controls.registry.json';
  
  if (!fs.existsSync(controlsRegistryPath)) {
    throw new Error(`Controls registry not found: ${controlsRegistryPath}`);
  }
  
  // Backup original registry
  const originalRegistry = fs.readFileSync(controlsRegistryPath, 'utf8');
  const registryData = JSON.parse(originalRegistry);
  
  // Modify a control name to break matching
  if (registryData.popup && registryData.popup.length > 0) {
    const firstControl = registryData.popup[0];
    const originalName = firstControl.accessibleName;
    firstControl.accessibleName = `${originalName}!`; // Add exclamation to break match
    
    console.log(`   Modified control: "${originalName}" → "${firstControl.accessibleName}"`);
    
    try {
      // Write modified registry
      fs.writeFileSync(controlsRegistryPath, JSON.stringify(registryData, null, 2));
      
      // Run functional tests - should fail with registry missing
      const exitCode = await exec('npm', ['run', 'e2e:all:functional'], {
        env: { ...process.env, E2E_RED_TEAM: '1' }
      });
      
      return exitCode;
      
    } finally {
      // Restore original registry
      fs.writeFileSync(controlsRegistryPath, originalRegistry);
    }
  } else {
    throw new Error('No popup controls found in registry to modify');
  }
}

/**
 * RED-TEAM TEST 2: No-op click (disabled element)
 * Create a test that clicks a disabled element
 */
async function testNoOpClick() {
  // Create a temporary test spec that clicks a disabled element
  const tempTestPath = 'e2e/functional/tests/red-team-no-op.spec.js';
  const tempTestContent = `
import { test, expect } from '@playwright/test';

test('RED-TEAM: No-op click on disabled element', async ({ page, context }) => {
  // This test should FAIL because clicking disabled elements violates postconditions
  
  await page.goto('chrome-extension://test-extension-id/popup.html');
  
  // Create a disabled button and try to interact with it
  await page.evaluate(() => {
    const disabledBtn = document.createElement('button');
    disabledBtn.id = 'red-team-disabled-btn';
    disabledBtn.textContent = 'Disabled Button';
    disabledBtn.disabled = true;
    document.body.appendChild(disabledBtn);
  });
  
  // This click should be caught by anti-cheat detection
  await page.click('#red-team-disabled-btn', { force: true });
  
  // If we reach here, the gate failed to catch the violation
});
`;
  
  try {
    fs.writeFileSync(tempTestPath, tempTestContent);
    
    const exitCode = await exec('npx', ['playwright', 'test', '-c', 'e2e/functional', tempTestPath], {
      env: { ...process.env, E2E_RED_TEAM: '1' }
    });
    
    return exitCode;
    
  } finally {
    // Clean up temp test
    if (fs.existsSync(tempTestPath)) {
      fs.unlinkSync(tempTestPath);
    }
  }
}

/**
 * RED-TEAM TEST 3: Keyboard parity violation
 * Remove keyboard handler from a button
 */
async function testKeyboardParityViolation() {
  // Create a temporary test that validates keyboard parity on a broken button
  const tempTestPath = 'e2e/functional/tests/red-team-keyboard.spec.js';
  const tempTestContent = `
import { test, expect } from '@playwright/test';
import { assertKeyboardParityGate } from '../../utils/functional-gates.js';

test('RED-TEAM: Keyboard parity violation', async ({ page, context }) => {
  // This test should FAIL because the button lacks proper keyboard handlers
  
  await page.goto('chrome-extension://test-extension-id/popup.html');
  
  // Create a button that only responds to clicks, not keyboard
  await page.evaluate(() => {
    const brokenBtn = document.createElement('button');
    brokenBtn.id = 'red-team-broken-keyboard';
    brokenBtn.textContent = 'Click Only Button';
    brokenBtn.onclick = () => console.log('Clicked');
    // Intentionally missing: onkeydown for Enter/Space
    document.body.appendChild(brokenBtn);
  });
  
  // This keyboard parity test should fail
  await assertKeyboardParityGate(page, {
    minimumScore: 100,
    allowFailures: 0
  });
});
`;
  
  try {
    fs.writeFileSync(tempTestPath, tempTestContent);
    
    const exitCode = await exec('npx', ['playwright', 'test', '-c', 'e2e/functional', tempTestPath], {
      env: { ...process.env, E2E_RED_TEAM: '1' }
    });
    
    return exitCode;
    
  } finally {
    if (fs.existsSync(tempTestPath)) {
      fs.unlinkSync(tempTestPath);
    }
  }
}

/**
 * RED-TEAM TEST 4: Modal focus trap violation
 * Create modal without focus trap
 */
async function testModalFocusTrapViolation() {
  const tempTestPath = 'e2e/functional/tests/red-team-modal.spec.js';
  const tempTestContent = `
import { test, expect } from '@playwright/test';
import { assertFocusTrap } from '../../utils/keyboard-modal.js';

test('RED-TEAM: Modal focus trap violation', async ({ page, context }) => {
  // This test should FAIL because the modal lacks proper focus trap
  
  await page.goto('chrome-extension://test-extension-id/popup.html');
  
  // Create a modal without focus trap implementation
  await page.evaluate(() => {
    const brokenModal = document.createElement('div');
    brokenModal.id = 'red-team-broken-modal';
    brokenModal.setAttribute('role', 'dialog');
    brokenModal.innerHTML = \`
      <button>Button 1</button>
      <button>Button 2</button>
      <button>Close</button>
    \`;
    brokenModal.style.position = 'fixed';
    brokenModal.style.top = '50px';
    brokenModal.style.left = '50px';
    brokenModal.style.background = 'white';
    brokenModal.style.border = '1px solid black';
    brokenModal.style.padding = '20px';
    brokenModal.style.zIndex = '1000';
    
    // Intentionally broken - no focus trap implementation
    document.body.appendChild(brokenModal);
  });
  
  // This focus trap test should fail
  await assertFocusTrap(page, '#red-team-broken-modal');
});
`;
  
  try {
    fs.writeFileSync(tempTestPath, tempTestContent);
    
    const exitCode = await exec('npx', ['playwright', 'test', '-c', 'e2e/functional', tempTestPath], {
      env: { ...process.env, E2E_RED_TEAM: '1' }
    });
    
    return exitCode;
    
  } finally {
    if (fs.existsSync(tempTestPath)) {
      fs.unlinkSync(tempTestPath);
    }
  }
}

/**
 * RED-TEAM TEST 5: Clipboard truth violation
 * Mock clipboard with wrong content
 */
async function testClipboardTruthViolation() {
  const tempTestPath = 'e2e/functional/tests/red-team-clipboard.spec.js';
  const tempTestContent = `
import { test, expect } from '@playwright/test';
import { assertClipboardContent } from '../../utils/clipboard-test.js';

test('RED-TEAM: Clipboard truth violation', async ({ page, context }) => {
  // This test should FAIL because clipboard content doesn't match expected
  
  await page.goto('chrome-extension://test-extension-id/popup.html');
  
  // Mock clipboard with wrong content
  await page.evaluate(() => {
    window.__tcClipboard = 'Wrong content';
    window.__lastCopy = 'Wrong content';
  });
  
  // This clipboard assertion should fail
  await assertClipboardContent(page, 'Expected content', {
    allowEmpty: false,
    checkEncoding: true
  });
});
`;
  
  try {
    fs.writeFileSync(tempTestPath, tempTestContent);
    
    const exitCode = await exec('npx', ['playwright', 'test', '-c', 'e2e/functional', tempTestPath], {
      env: { ...process.env, E2E_RED_TEAM: '1' }
    });
    
    return exitCode;
    
  } finally {
    if (fs.existsSync(tempTestPath)) {
      fs.unlinkSync(tempTestPath);
    }
  }
}

/**
 * RED-TEAM TEST 6: Network isolation violation
 * Remove a required stub to break determinism
 */
async function testNetworkIsolationViolation() {
  // This test simulates missing a required stub in functional mode
  const tempTestPath = 'e2e/functional/tests/red-team-network.spec.js';
  const tempTestContent = `
import { test, expect } from '@playwright/test';

test('RED-TEAM: Network isolation violation', async ({ page, context }) => {
  // This test should FAIL because it tries to make a real network request
  
  await page.goto('chrome-extension://test-extension-id/popup.html');
  
  // Try to make a real API call that should be blocked/stubbed
  const result = await page.evaluate(async () => {
    try {
      const response = await fetch('https://api.openai.com/v1/models');
      return { success: true, status: response.status };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  
  // If the request succeeded, network isolation failed
  if (result.success) {
    throw new Error('Network isolation failed - real API call succeeded');
  }
});
`;
  
  try {
    fs.writeFileSync(tempTestPath, tempTestContent);
    
    const exitCode = await exec('npx', ['playwright', 'test', '-c', 'e2e/functional', tempTestPath], {
      env: { ...process.env, E2E_RED_TEAM: '1' }
    });
    
    return exitCode;
    
  } finally {
    if (fs.existsSync(tempTestPath)) {
      fs.unlinkSync(tempTestPath);
    }
  }
}

/**
 * RED-TEAM TEST 7: Budget enforcement violation
 * Loop API calls beyond limit in live mode
 */
async function testBudgetEnforcementViolation() {
  if (!process.env.E2E_LIVE) {
    console.log(`   Skipping budget test (requires E2E_LIVE=1)`);
    return 0; // Pass - not applicable for functional mode
  }
  
  const tempTestPath = 'e2e/live/tests/red-team-budget.spec.js';
  const tempTestContent = `
import { test, expect } from '@playwright/test';
import { createBudgetGuardStaging, BudgetGuardPresets } from '../../utils/summary-contract.js';

test('RED-TEAM: Budget enforcement violation', async ({ page, context }) => {
  // This test should FAIL because it exceeds budget limits
  
  await page.goto('chrome-extension://test-extension-id/popup.html');
  
  // Create budget guard with tight limits
  const budgetGuard = createBudgetGuardStaging(BudgetGuardPresets.liveProviderSpecs);
  
  // Simulate excessive API calls
  for (let i = 0; i < 40; i++) {
    const allowed = budgetGuard.recordCall('OpenRouter', false);
    if (!allowed) {
      throw new Error(\`Budget guard correctly blocked call \${i}\`);
    }
  }
  
  // If we got here, budget enforcement failed
  const status = budgetGuard.getStatus();
  if (status.withinLimits) {
    throw new Error('Budget guard failed to enforce limits after 40 calls');
  }
});
`;
  
  try {
    fs.mkdirSync(path.dirname(tempTestPath), { recursive: true });
    fs.writeFileSync(tempTestPath, tempTestContent);
    
    const exitCode = await exec('npx', ['playwright', 'test', '-c', 'e2e/live', tempTestPath], {
      env: { ...process.env, E2E_LIVE: '1', E2E_RED_TEAM: '1' }
    });
    
    return exitCode;
    
  } finally {
    if (fs.existsSync(tempTestPath)) {
      fs.unlinkSync(tempTestPath);
    }
  }
}

/**
 * Main red-team execution pipeline
 */
async function main() {
  const startTime = Date.now();
  
  console.log(`\n🔴 [RED-TEAM] Running 7 deliberate gate violation tests...`);
  console.log(`   These tests should ALL FAIL to prove gates work\n`);
  
  // Define red-team tests
  const redTeamTests = [
    {
      name: 'Registry Drift',
      description: 'Change control name to create missing registry entry',
      testFn: testRegistryDrift
    },
    {
      name: 'No-op Click',
      description: 'Click disabled element to trigger anti-cheat',
      testFn: testNoOpClick
    },
    {
      name: 'Keyboard Parity',
      description: 'Button without Enter/Space handlers',
      testFn: testKeyboardParityViolation
    },
    {
      name: 'Modal Focus Trap',
      description: 'Modal without focus trap implementation',
      testFn: testModalFocusTrapViolation
    },
    {
      name: 'Clipboard Truth',
      description: 'Clipboard content mismatch',
      testFn: testClipboardTruthViolation
    },
    {
      name: 'Network Isolation',
      description: 'Attempt real API call without stub',
      testFn: testNetworkIsolationViolation
    },
    {
      name: 'Budget Enforcement',
      description: 'Exceed API call limits in live mode',
      testFn: testBudgetEnforcementViolation
    }
  ];
  
  // Run each red-team test
  for (const test of redTeamTests) {
    await runRedTeamTest(test.name, test.description, test.testFn);
  }
  
  // Generate final report
  const duration = Math.round((Date.now() - startTime) / 1000);
  
  console.log(`\n🎯 [RED-TEAM] Final Results:`);
  console.log(`   Total Tests: ${testResults.totalTests}`);
  console.log(`   Expected Failures: ${testResults.expectedFailures} (good - gates working)`);
  console.log(`   Unexpected Passes: ${testResults.unexpectedPasses} (bad - gates broken)`);
  console.log(`   Execution Errors: ${testResults.executionErrors}`);
  console.log(`   Duration: ${duration}s`);
  
  // Write detailed results
  const resultPath = 'e2e/report/red-team-results.json';
  fs.mkdirSync(path.dirname(resultPath), { recursive: true });
  fs.writeFileSync(resultPath, JSON.stringify({
    ...testResults,
    summary: {
      allGatesWorking: testResults.unexpectedPasses === 0,
      gateIntegrity: Math.round((testResults.expectedFailures / testResults.totalTests) * 100),
      timestamp: new Date().toISOString(),
      duration
    }
  }, null, 2));
  
  console.log(`   Results saved: ${resultPath}`);
  
  // Final assessment
  if (testResults.unexpectedPasses === 0) {
    console.log(`\n✅ [RED-TEAM] PERFECT GATE INTEGRITY`);
    console.log(`   All ${testResults.expectedFailures} violations were correctly caught`);
    console.log(`   The skeptical audit system has no blind spots`);
    process.exit(0);
  } else {
    console.log(`\n❌ [RED-TEAM] GATE INTEGRITY COMPROMISED`);
    console.log(`   ${testResults.unexpectedPasses} violations went undetected`);
    console.log(`   The skeptical audit system has blind spots and cannot reliably detect cheating`);
    
    // Show which gates failed
    const failedTests = testResults.tests.filter(t => t.expectedToFail && !t.actuallyFailed);
    failedTests.forEach(test => {
      console.log(`     - ${test.name}: ${test.violation}`);
    });
    
    process.exit(1);
  }
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error(`💥 [RED-TEAM UNCAUGHT] ${error.message}`);
  console.error(error.stack);
  process.exit(2);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error(`💥 [RED-TEAM UNHANDLED] ${reason}`);
  process.exit(2);
});

// Run red-team tests
main();