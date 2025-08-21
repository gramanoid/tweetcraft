#!/usr/bin/env node

/**
 * TweetCraft AI - Global Namespace Auditor
 * P0.6: Audit all window.* assignments (16+ globals: TweetCraftStrings, TweetCraftModalUI, etc)
 * 
 * This tool identifies all global namespace pollution sources:
 * 1. IIFE build process window assignments
 * 2. Direct global assignments in source code
 * 3. Chrome extension context pollution
 * 4. Security vulnerabilities through global exposure
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class GlobalNamespaceAuditor {
  constructor(rootDir) {
    this.rootDir = rootDir;
    this.globalAssignments = new Map(); // global name -> { sources, files, risk }
    this.buildSystemGlobals = new Set(); // From build-iife.js
    this.directGlobals = new Map(); // Direct window/globalThis assignments
    this.chromeContextGlobals = new Set(); // Chrome extension specific globals
    this.securityRisks = [];
  }

  /**
   * Main audit entry point
   */
  async audit() {
    console.log('🔍 TweetCraft Global Namespace Pollution Audit Starting...\n');
    
    // Step 1: Audit build system globals
    await this.auditBuildSystemGlobals();
    console.log(`🏭 Build system creates ${this.buildSystemGlobals.size} globals`);
    
    // Step 2: Audit direct global assignments
    await this.auditDirectGlobalAssignments();
    console.log(`📝 Found ${this.directGlobals.size} direct global assignments`);
    
    // Step 3: Audit Chrome context globals
    await this.auditChromeContextGlobals();
    console.log(`🌐 Found ${this.chromeContextGlobals.size} Chrome context globals`);
    
    // Step 4: Assess security risks
    this.assessSecurityRisks();
    console.log(`⚠️  Identified ${this.securityRisks.length} security risks`);
    
    // Step 5: Generate comprehensive report
    await this.generateAuditReport();
    console.log('📋 Generated comprehensive audit report');
    
    console.log('\n✅ Global namespace audit complete!');
  }

  /**
   * Audit globals created by the build system
   */
  async auditBuildSystemGlobals() {
    const buildScript = path.join(this.rootDir, 'extension/scripts/build-iife.js');
    
    try {
      const content = await fs.promises.readFile(buildScript, 'utf8');
      
      // Extract namespace mappings from build script
      const mappingRegex = /{\s*esm:\s*['"]([^'"]+)['"],\s*iife:\s*['"]([^'"]+)['"],\s*namespace:\s*['"]([^'"]+)['"]/g;
      let match;
      
      while ((match = mappingRegex.exec(content)) !== null) {
        const namespace = match[3];
        this.buildSystemGlobals.add(namespace);
        
        this.globalAssignments.set(namespace, {
          source: 'build-system',
          file: buildScript,
          esmFile: match[1],
          iifeFile: match[2],
          risk: this.calculateRisk(namespace, 'build-system')
        });
      }
      
    } catch (error) {
      console.warn(`⚠️  Cannot read build script: ${error.message}`);
    }
  }

  /**
   * Audit direct window/globalThis assignments
   */
  async auditDirectGlobalAssignments() {
    const extensionDir = path.join(this.rootDir, 'extension');
    await this.scanDirectoryForGlobals(extensionDir);
  }

  /**
   * Recursively scan directory for global assignments
   */
  async scanDirectoryForGlobals(dir) {
    try {
      const entries = await fs.promises.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          await this.scanDirectoryForGlobals(fullPath);
        } else if (entry.name.endsWith('.js') || entry.name.endsWith('.esm.js')) {
          await this.analyzeFileForGlobals(fullPath);
        }
      }
    } catch (error) {
      console.warn(`⚠️  Cannot scan ${dir}: ${error.message}`);
    }
  }

  /**
   * Analyze individual file for global assignments
   */
  async analyzeFileForGlobals(filePath) {
    try {
      const content = await fs.promises.readFile(filePath, 'utf8');
      const relativePath = path.relative(this.rootDir, filePath);
      
      // Pattern to match global assignments
      const globalPatterns = [
        /window\.(\w+)\s*=/g,
        /globalThis\.(\w+)\s*=/g,
        /self\.(\w+)\s*=/g,
        // Look for indirect global assignments
        /window\[['"](\w+)['"]\]\s*=/g,
        /globalThis\[['"](\w+)['"]\]\s*=/g
      ];
      
      for (const pattern of globalPatterns) {
        let match;
        pattern.lastIndex = 0;
        
        while ((match = pattern.exec(content)) !== null) {
          const globalName = match[1];
          const lineNumber = this.getLineNumber(content, match.index);
          
          if (!this.directGlobals.has(globalName)) {
            this.directGlobals.set(globalName, []);
          }
          
          this.directGlobals.get(globalName).push({
            file: relativePath,
            line: lineNumber,
            context: this.getContextAroundMatch(content, match.index, 50)
          });
          
          // Update main global assignments registry
          this.globalAssignments.set(globalName, {
            source: 'direct-assignment',
            files: this.directGlobals.get(globalName),
            risk: this.calculateRisk(globalName, 'direct-assignment')
          });
        }
      }
      
    } catch (error) {
      console.warn(`⚠️  Cannot analyze ${filePath}: ${error.message}`);
    }
  }

  /**
   * Audit Chrome extension specific global pollution
   */
  async auditChromeContextGlobals() {
    // Check background scripts for chrome.* exposures
    const backgroundFiles = [
      path.join(this.rootDir, 'extension/background.js'),
      path.join(this.rootDir, 'extension/background.esm.js')
    ];
    
    for (const bgFile of backgroundFiles) {
      if (await this.fileExists(bgFile)) {
        await this.analyzeChromeContextFile(bgFile);
      }
    }
    
    // Check content scripts for chrome.* and page context pollution
    const contentDir = path.join(this.rootDir, 'extension/content');
    await this.scanChromeContextDirectory(contentDir);
  }

  /**
   * Analyze file for Chrome context globals
   */
  async analyzeChromeContextFile(filePath) {
    try {
      const content = await fs.promises.readFile(filePath, 'utf8');
      const relativePath = path.relative(this.rootDir, filePath);
      
      // Look for patterns that might leak Chrome APIs globally
      const chromePatterns = [
        // Direct chrome object assignments
        /(?:window|globalThis|self)\.chrome\s*=/g,
        // Chrome API wrapping patterns
        /(?:window|globalThis|self)\.(\w*Chrome\w*)\s*=/g,
        // Extension ID or runtime exposure
        /(?:window|globalThis|self)\.(\w*Extension\w*)\s*=/g,
        // TweetCraft globals that might expose Chrome APIs
        /(?:window|globalThis|self)\.(TweetCraft\w*)\s*=.*chrome/gi
      ];
      
      for (const pattern of chromePatterns) {
        let match;
        pattern.lastIndex = 0;
        
        while ((match = pattern.exec(content)) !== null) {
          const globalName = match[1] || 'chrome';
          this.chromeContextGlobals.add(globalName);
          
          this.globalAssignments.set(globalName, {
            source: 'chrome-context',
            file: relativePath,
            line: this.getLineNumber(content, match.index),
            risk: this.calculateRisk(globalName, 'chrome-context')
          });
        }
      }
      
    } catch (error) {
      console.warn(`⚠️  Cannot analyze Chrome context in ${filePath}: ${error.message}`);
    }
  }

  /**
   * Scan directory for Chrome context pollution
   */
  async scanChromeContextDirectory(dir) {
    try {
      if (!(await this.fileExists(dir))) return;
      
      const entries = await fs.promises.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isFile() && (entry.name.endsWith('.js') || entry.name.endsWith('.esm.js'))) {
          await this.analyzeChromeContextFile(fullPath);
        }
      }
    } catch (error) {
      console.warn(`⚠️  Cannot scan Chrome context directory ${dir}: ${error.message}`);
    }
  }

  /**
   * Assess security risks of global exposures
   */
  assessSecurityRisks() {
    for (const [globalName, info] of this.globalAssignments) {
      const risk = info.risk;
      
      if (risk >= 4) {
        this.securityRisks.push({
          global: globalName,
          risk: risk,
          source: info.source,
          issues: this.identifySecurityIssues(globalName, info)
        });
      }
    }
    
    // Sort by risk level (highest first)
    this.securityRisks.sort((a, b) => b.risk - a.risk);
  }

  /**
   * Calculate risk level for a global (1-5 scale)
   */
  calculateRisk(globalName, source) {
    let risk = 1;
    
    // Base risk by source type
    if (source === 'chrome-context') risk += 2;
    if (source === 'direct-assignment') risk += 1.5;
    if (source === 'build-system') risk += 1;
    
    // Risk by naming patterns
    if (globalName.toLowerCase().includes('chrome')) risk += 2;
    if (globalName.toLowerCase().includes('extension')) risk += 1.5;
    if (globalName.includes('API') || globalName.includes('Client')) risk += 1;
    if (globalName.startsWith('TweetCraft')) risk += 0.5; // Our namespace, slightly safer
    
    // Risk by functionality implied
    if (globalName.toLowerCase().includes('storage')) risk += 1;
    if (globalName.toLowerCase().includes('message')) risk += 1;
    if (globalName.toLowerCase().includes('log')) risk += 0.5;
    
    return Math.min(risk, 5);
  }

  /**
   * Identify specific security issues
   */
  identifySecurityIssues(globalName, info) {
    const issues = [];
    
    if (globalName.toLowerCase().includes('chrome')) {
      issues.push('Exposes Chrome extension APIs to page context');
    }
    
    if (info.source === 'direct-assignment') {
      issues.push('Direct global assignment bypasses module encapsulation');
    }
    
    if (globalName.includes('Storage') || globalName.includes('storage')) {
      issues.push('Potential data exposure through global storage access');
    }
    
    if (globalName.includes('Message') || globalName.includes('message')) {
      issues.push('Message passing system exposed globally');
    }
    
    if (info.source === 'build-system') {
      issues.push('Automatically exposed by build process to all pages');
    }
    
    return issues;
  }

  /**
   * Generate comprehensive audit report
   */
  async generateAuditReport() {
    const reportsDir = path.join(this.rootDir, 'reports');
    await fs.promises.mkdir(reportsDir, { recursive: true });
    
    // Generate main report
    await this.generateMainReport(reportsDir);
    
    // Generate security report
    await this.generateSecurityReport(reportsDir);
    
    // Generate remediation plan
    await this.generateRemediationPlan(reportsDir);
  }

  /**
   * Generate main audit report
   */
  async generateMainReport(reportsDir) {
    let report = '# Global Namespace Pollution Audit Report\n\n';
    report += `**Date**: ${new Date().toISOString()}\n`;
    report += `**Total Global Objects**: ${this.globalAssignments.size}\n\n`;

    // Summary statistics
    report += '## Summary\n\n';
    report += `- **Build System Globals**: ${this.buildSystemGlobals.size}\n`;
    report += `- **Direct Assignments**: ${this.directGlobals.size}\n`;
    report += `- **Chrome Context Globals**: ${this.chromeContextGlobals.size}\n`;
    report += `- **High Risk Globals**: ${this.securityRisks.length}\n\n`;

    // Build system globals
    report += '## Build System Globals\n\n';
    if (this.buildSystemGlobals.size === 0) {
      report += '✅ No build system globals found!\n\n';
    } else {
      report += 'These globals are automatically created by `build-iife.js`:\n\n';
      for (const globalName of this.buildSystemGlobals) {
        const info = this.globalAssignments.get(globalName);
        report += `- **${globalName}** (Risk: ${info.risk}/5)\n`;
        report += `  - ESM: \`${info.esmFile}\`\n`;
        report += `  - IIFE: \`${info.iifeFile}\`\n`;
      }
      report += '\n';
    }

    // Direct assignments
    report += '## Direct Global Assignments\n\n';
    if (this.directGlobals.size === 0) {
      report += '✅ No direct global assignments found!\n\n';
    } else {
      for (const [globalName, locations] of this.directGlobals) {
        report += `### ${globalName}\n`;
        locations.forEach(loc => {
          report += `- **${loc.file}:${loc.line}**\n`;
          report += `  \`\`\`javascript\n  ${loc.context}\n  \`\`\`\n`;
        });
        report += '\n';
      }
    }

    // Chrome context pollution
    report += '## Chrome Context Pollution\n\n';
    if (this.chromeContextGlobals.size === 0) {
      report += '✅ No Chrome context pollution detected!\n\n';
    } else {
      for (const globalName of this.chromeContextGlobals) {
        const info = this.globalAssignments.get(globalName);
        report += `- **${globalName}** in \`${info.file}:${info.line}\` (Risk: ${info.risk}/5)\n`;
      }
      report += '\n';
    }

    const reportPath = path.join(reportsDir, 'global-namespace-audit.md');
    await fs.promises.writeFile(reportPath, report);
    console.log(`📊 Main audit report: ${reportPath}`);
  }

  /**
   * Generate security-focused report
   */
  async generateSecurityReport(reportsDir) {
    let report = '# Global Namespace Security Risk Report\n\n';
    report += `**Date**: ${new Date().toISOString()}\n`;
    report += `**High Risk Globals**: ${this.securityRisks.length}\n\n`;

    if (this.securityRisks.length === 0) {
      report += '✅ No high-risk global namespace pollution detected!\n';
    } else {
      report += '## High Risk Global Objects\n\n';
      
      this.securityRisks.forEach((risk, index) => {
        report += `### ${index + 1}. ${risk.global} (Risk: ${risk.risk}/5)\n\n`;
        report += `**Source**: ${risk.source}\n\n`;
        report += '**Security Issues**:\n';
        risk.issues.forEach(issue => {
          report += `- ${issue}\n`;
        });
        report += '\n**Recommended Action**: ';
        
        if (risk.risk >= 4.5) {
          report += '🔴 **IMMEDIATE** - Remove or isolate this global exposure\n';
        } else if (risk.risk >= 3.5) {
          report += '🟡 **HIGH** - Implement access controls or move to private registry\n';
        } else {
          report += '🟢 **MEDIUM** - Monitor and consider for future cleanup\n';
        }
        report += '\n';
      });
    }

    const reportPath = path.join(reportsDir, 'global-namespace-security.md');
    await fs.promises.writeFile(reportPath, report);
    console.log(`🔐 Security report: ${reportPath}`);
  }

  /**
   * Generate remediation plan
   */
  async generateRemediationPlan(reportsDir) {
    let plan = '# Global Namespace Remediation Plan\n\n';
    plan += `**Total globals to remediate**: ${this.globalAssignments.size}\n`;
    plan += `**High priority**: ${this.securityRisks.filter(r => r.risk >= 4).length}\n\n`;

    plan += '## Phase 1: Immediate Security Fixes (P0)\n\n';
    const immediateRisks = this.securityRisks.filter(r => r.risk >= 4.5);
    if (immediateRisks.length === 0) {
      plan += '✅ No immediate security fixes required!\n\n';
    } else {
      immediateRisks.forEach(risk => {
        plan += `### Remove ${risk.global}\n`;
        plan += `- **Risk Level**: ${risk.risk}/5\n`;
        plan += `- **Action**: Replace global access with module imports\n`;
        plan += `- **Timeline**: Immediate\n\n`;
      });
    }

    plan += '## Phase 2: Build System Refactoring (P0)\n\n';
    plan += 'Replace automatic global exposure with private module registry:\n\n';
    plan += '```javascript\n';
    plan += '// Instead of: window.TweetCraftStrings = TweetCraftStrings\n';
    plan += '// Use: ModuleRegistry.register("strings", TweetCraftStrings)\n';
    plan += '```\n\n';

    plan += '## Phase 3: Access Control Implementation (P1)\n\n';
    plan += 'For remaining necessary globals, implement access controls:\n\n';
    plan += '1. Namespace isolation with Symbol keys\n';
    plan += '2. Access logging and monitoring\n';
    plan += '3. Runtime permission checks\n';
    plan += '4. Automatic cleanup on extension unload\n\n';

    const planPath = path.join(reportsDir, 'global-namespace-remediation-plan.md');
    await fs.promises.writeFile(planPath, plan);
    console.log(`🔧 Remediation plan: ${planPath}`);
  }

  /**
   * Utility methods
   */
  
  getLineNumber(content, index) {
    return content.substring(0, index).split('\n').length;
  }

  getContextAroundMatch(content, index, radius) {
    const start = Math.max(0, index - radius);
    const end = Math.min(content.length, index + radius);
    return content.substring(start, end).trim();
  }

  async fileExists(filePath) {
    try {
      await fs.promises.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}

// Main execution
async function main() {
  const rootDir = path.resolve(__dirname, '..');
  const auditor = new GlobalNamespaceAuditor(rootDir);
  
  try {
    await auditor.audit();
  } catch (error) {
    console.error('❌ Audit failed:', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { GlobalNamespaceAuditor };
