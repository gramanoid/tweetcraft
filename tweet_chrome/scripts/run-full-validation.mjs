#!/usr/bin/env node

/**
 * Complete E2E Validation Runner with Skeptical Audit
 * 
 * FINAL ACCEPTANCE: Complete pipeline from test execution to CI proof
 * 
 * Orchestrates the entire testing pipeline:
 * 1. Determines test mode (functional/live)
 * 2. Sets up budget guards and network isolation
 * 3. Runs comprehensive test suite with skeptical audit
 * 4. Generates normalized summary contract
 * 5. Validates against CI proof gates
 * 6. Reports final status with evidence
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

// Environment detection
const isCI = process.env.CI === '1' || process.env.CI === 'true';
const isLive = process.env.E2E_LIVE === '1';
const mode = isLive ? 'live' : 'functional';

console.log(`🚀 [FULL VALIDATION] Starting ${mode.toUpperCase()} mode validation...`);
console.log(`   Environment: ${isCI ? 'CI' : 'Local'}`);
console.log(`   Mode: ${mode}`);
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
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with exit code ${code}: ${command} ${args.join(' ')}`));
      }
    });
    
    proc.on('error', (error) => {
      reject(new Error(`Failed to execute command: ${error.message}`));
    });
  });
}

/**
 * Validate environment setup
 */
function validateEnvironment() {
  console.log(`🔍 [ENV CHECK] Validating environment for ${mode} mode...`);
  
  // Check required files exist
  const requiredFiles = [
    'package.json',
    'e2e/functional/playwright.config.js',
    'e2e/utils/summary-contract.js',
    'scripts/ci-proof.js'
  ];
  
  for (const file of requiredFiles) {
    if (!fs.existsSync(file)) {
      throw new Error(`Required file missing: ${file}`);
    }
  }
  
  // Live mode requires API keys
  if (mode === 'live') {
    const requiredKeys = [
      'OPENROUTER_API_KEY',
      'XAI_API_KEY', 
      'EXA_API_KEY',
      'PERPLEXITY_API_KEY'
    ];
    
    const missingKeys = requiredKeys.filter(key => !process.env[key]);
    if (missingKeys.length > 0) {
      throw new Error(`Live mode missing API keys: ${missingKeys.join(', ')}`);
    }
    
    console.log(`✅ [ENV CHECK] Live mode API keys verified`);
  } else {
    console.log(`✅ [ENV CHECK] Functional mode - no API keys required`);
  }
  
  console.log(`✅ [ENV CHECK] Environment validation passed`);
}

/**
 * Run the appropriate test suite
 */
async function runTestSuite() {
  console.log(`🧪 [TEST SUITE] Running ${mode} test suite...`);
  
  try {
    // Install Playwright browsers
    await exec('npx', ['playwright', 'install', 'chromium']);
    
    // Seed login for live mode
    if (mode === 'live') {
      console.log(`🌐 [TEST SUITE] Seeding login for live mode...`);
      await exec('npm', ['run', 'e2e:seed-login']);
    }
    
    // Run appropriate test configuration
    const configPath = mode === 'live' ? 'e2e/live' : 'e2e/functional';
    const testCommand = mode === 'live' ? 
      ['npx', 'playwright', 'test', '-c', configPath] :
      ['npx', 'playwright', 'test', '-c', configPath];
    
    // Set environment for live mode
    const env = { ...process.env };
    if (mode === 'live') {
      env.E2E_LIVE = '1';
    }
    
    await exec(testCommand[0], testCommand.slice(1), { env });
    
    console.log(`✅ [TEST SUITE] ${mode} tests completed successfully`);
    
  } catch (error) {
    console.error(`❌ [TEST SUITE] Tests failed: ${error.message}`);
    throw error;
  }
}

/**
 * Generate final report and contract
 */
async function generateReport() {
  console.log(`📊 [REPORT] Generating final report and summary contract...`);
  
  try {
    const reportScript = 'e2e/report/generate-report.js';
    const summaryPath = 'e2e/report/summary.json';
    const reportPath = `e2e/report/report.${mode}.md`;
    
    await exec('node', [
      reportScript,
      '--input', summaryPath,
      '--out', reportPath,
      '--max-age-mins', '60'
    ]);
    
    console.log(`✅ [REPORT] Report generation completed`);
    console.log(`   Summary: ${summaryPath}`);
    console.log(`   Report: ${reportPath}`);
    
  } catch (error) {
    console.error(`❌ [REPORT] Report generation failed: ${error.message}`);
    throw error;
  }
}

/**
 * Run CI proof validation
 */
async function runCIProof() {
  console.log(`🎯 [CI PROOF] Running hard gate validation...`);
  
  try {
    const summaryPath = 'e2e/report/summary.json';
    
    if (!fs.existsSync(summaryPath)) {
      throw new Error(`Summary file not found: ${summaryPath}`);
    }
    
    await exec('node', ['scripts/ci-proof.js', summaryPath]);
    
    console.log(`✅ [CI PROOF] All gates passed - validation successful`);
    
  } catch (error) {
    console.error(`❌ [CI PROOF] Gate validation failed: ${error.message}`);
    throw error;
  }
}

/**
 * Display final summary
 */
function displaySummary() {
  console.log(`\n🏆 [SUMMARY] ${mode.toUpperCase()} Mode Validation Complete`);
  
  try {
    const summaryPath = 'e2e/report/summary.json';
    if (fs.existsSync(summaryPath)) {
      const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
      
      console.log(`   Run ID: ${summary.runId}`);
      console.log(`   Console Errors: ${summary.consoleErrors}`);
      console.log(`   UI Coverage: ${summary.uiCoverage?.coveragePercent || 0}%`);
      console.log(`   Registry Missing: ${summary.registry?.missingInRegistry || 0}`);
      
      if (summary.gatesFunctional) {
        const gates = summary.gatesFunctional;
        console.log(`   Functional Gates: Controls=${gates.allControlsInteracted}, Keyboard=${gates.keyboardParityAll}, Focus=${gates.focusTrapsPassed}, Clipboard=${gates.clipboardTruth}`);
      }
      
      if (summary.gatesLive) {
        const gates = summary.gatesLive;
        console.log(`   Live Gates: Boot=${gates.bootNoProviderCalls}, Research=${gates.researchOrderCorrect}, Generation=${gates.generationOpenRouterOnly}, Budget=${gates.budgetWithinLimits}`);
      }
    }
  } catch (error) {
    console.warn(`⚠️ [SUMMARY] Could not read summary: ${error.message}`);
  }
  
  console.log(`\n✅ ${mode.toUpperCase()} MODE VALIDATION PASSED`);
  console.log(`   All skeptical audit requirements verified`);
  console.log(`   CI gates passed with objective proof`);
  console.log(`   Test automation integrity confirmed`);
}

/**
 * Main execution pipeline
 */
async function main() {
  const startTime = Date.now();
  
  try {
    // 1. Environment validation
    validateEnvironment();
    
    // 2. Run test suite
    await runTestSuite();
    
    // 3. Generate reports
    await generateReport();
    
    // 4. CI proof validation
    await runCIProof();
    
    // 5. Display summary
    displaySummary();
    
    const duration = Math.round((Date.now() - startTime) / 1000);
    console.log(`\n⏱️ Total validation time: ${duration}s`);
    
    process.exit(0);
    
  } catch (error) {
    console.error(`\n💥 [VALIDATION FAILED] ${error.message}`);
    
    // Try to generate failure report
    try {
      const failureContract = {
        mode,
        timestamp: new Date().toISOString(),
        runId: `failed-${Date.now()}`,
        consoleErrors: 999,
        error: error.message,
        ringBuffer: { count: 0, rawTextLeak: 0 },
        uiCoverage: { totalControls: 0, interactedControls: 0, coveragePercent: 0, keyboard: { totalTested: 0, parityScore: 0, allPassed: false } },
        registry: { missingInRegistry: 999, totalRegistered: 0 },
        antiCheat: { preventedClicks: 0, totalInteractions: 0 },
        budget: { totalCalls: 0, bootCalls: 0 },
        providerChronology: { research: [], generation: 'unknown' }
      };
      
      // Add failure gates
      if (mode === 'functional') {
        failureContract.gatesFunctional = {
          allControlsInteracted: false,
          keyboardParityAll: false,
          focusTrapsPassed: false,
          clipboardTruth: false
        };
      } else {
        failureContract.gatesLive = {
          bootNoProviderCalls: false,
          researchOrderCorrect: false,
          generationOpenRouterOnly: false,
          budgetWithinLimits: false,
          privacyOk: false,
          resilienceOk: false
        };
      }
      
      const summaryPath = 'e2e/report/summary.json';
      fs.mkdirSync(path.dirname(summaryPath), { recursive: true });
      fs.writeFileSync(summaryPath, JSON.stringify(failureContract, null, 2));
      
      console.log(`📝 [FAILURE] Generated failure summary: ${summaryPath}`);
      
    } catch (reportError) {
      console.error(`Failed to generate failure report: ${reportError.message}`);
    }
    
    const duration = Math.round((Date.now() - startTime) / 1000);
    console.log(`\n⏱️ Failed after: ${duration}s`);
    
    process.exit(1);
  }
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error(`💥 [UNCAUGHT EXCEPTION] ${error.message}`);
  console.error(error.stack);
  process.exit(2);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error(`💥 [UNHANDLED REJECTION] ${reason}`);
  console.error(promise);
  process.exit(2);
});

// Run main pipeline
main();