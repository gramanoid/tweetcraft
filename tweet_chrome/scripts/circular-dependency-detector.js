#!/usr/bin/env node

/**
 * TweetCraft AI - Focused Circular Dependency Detector
 * P0.1b: Detect circular import chains in 127 ESM modules
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class CircularDependencyDetector {
  constructor(rootDir) {
    this.rootDir = rootDir;
    this.modules = new Map(); // moduleId -> { path, imports }
    this.dependencyGraph = new Map(); // moduleId -> Set<dependsOn>
    this.circularChains = [];
  }

  async detectCircularDependencies() {
    console.log('🔍 TweetCraft Circular Dependency Detection Starting...\n');
    
    // Step 1: Discover all ESM modules
    await this.discoverModules();
    console.log(`📦 Discovered ${this.modules.size} ESM modules`);
    
    // Step 2: Parse imports
    await this.parseImports();
    console.log('📊 Parsed imports');
    
    // Step 3: Build dependency graph
    this.buildDependencyGraph();
    console.log('🕸️  Built dependency graph');
    
    // Step 4: Detect circular dependencies
    this.findCircularChains();
    console.log(`🔄 Found ${this.circularChains.length} circular dependency chains\n`);
    
    // Step 5: Report findings
    this.reportFindings();
    
    return {
      totalModules: this.modules.size,
      circularChains: this.circularChains
    };
  }

  async discoverModules() {
    const extensionDir = path.join(this.rootDir, 'extension');
    await this.scanDirectory(extensionDir);
  }

  async scanDirectory(dir) {
    try {
      const entries = await fs.promises.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          await this.scanDirectory(fullPath);
        } else if (entry.name.endsWith('.esm.js')) {
          const moduleId = path.relative(this.rootDir, fullPath).replace(/\\/g, '/');
          this.modules.set(moduleId, {
            path: fullPath,
            imports: []
          });
        }
      }
    } catch (error) {
      console.warn(`⚠️  Cannot scan ${dir}: ${error.message}`);
    }
  }

  async parseImports() {
    let parseErrors = 0;
    
    for (const [moduleId, moduleInfo] of this.modules) {
      try {
        const content = await fs.promises.readFile(moduleInfo.path, 'utf8');
        moduleInfo.imports = this.extractImports(content, moduleId);
      } catch (error) {
        parseErrors++;
        console.warn(`⚠️  Failed to parse ${moduleId}: ${error.message}`);
      }
    }
    
    if (parseErrors > 0) {
      console.warn(`⚠️  ${parseErrors} modules had parse errors`);
    }
  }

  extractImports(content, fromModuleId) {
    const imports = [];
    
    // Simple but robust import pattern
    const importLines = content.split('\n').filter(line => 
      line.trim().startsWith('import ') && 
      line.includes('from ') &&
      (line.includes('.esm.js') || line.includes('./') || line.includes('../'))
    );
    
    for (const line of importLines) {
      const match = line.match(/from\s+['"]([^'"]+)['"]/);
      if (match) {
        const importPath = match[1];
        const resolvedPath = this.resolveImportPath(importPath, fromModuleId);
        
        if (resolvedPath && this.modules.has(resolvedPath)) {
          imports.push(resolvedPath);
        }
      }
    }
    
    return imports;
  }

  resolveImportPath(importPath, fromModuleId) {
    if (!importPath.startsWith('.')) {
      return null; // External module
    }

    // Get directory of the importing module
    const fromDir = path.dirname(fromModuleId);
    
    // Resolve the relative path
    let resolvedPath = path.join(fromDir, importPath).replace(/\\/g, '/');
    
    // Add .esm.js if not present
    if (!resolvedPath.endsWith('.esm.js')) {
      resolvedPath += '.esm.js';
    }
    
    return resolvedPath;
  }

  buildDependencyGraph() {
    // Initialize graph
    for (const moduleId of this.modules.keys()) {
      this.dependencyGraph.set(moduleId, new Set());
    }

    // Populate dependencies
    for (const [moduleId, moduleInfo] of this.modules) {
      for (const importPath of moduleInfo.imports) {
        this.dependencyGraph.get(moduleId).add(importPath);
      }
    }
  }

  findCircularChains() {
    const visited = new Set();
    const recursionStack = new Set();
    const pathStack = [];

    for (const moduleId of this.modules.keys()) {
      if (!visited.has(moduleId)) {
        this.dfsCircularDetection(moduleId, visited, recursionStack, pathStack);
      }
    }

    // Remove duplicates and sort by length
    this.circularChains = this.deduplicateChains(this.circularChains);
    this.circularChains.sort((a, b) => b.length - a.length);
  }

  dfsCircularDetection(moduleId, visited, recursionStack, pathStack) {
    visited.add(moduleId);
    recursionStack.add(moduleId);
    pathStack.push(moduleId);

    const dependencies = this.dependencyGraph.get(moduleId) || new Set();
    
    for (const depId of dependencies) {
      if (!this.modules.has(depId)) continue;
      
      if (recursionStack.has(depId)) {
        // Found circular dependency
        const cycleStart = pathStack.indexOf(depId);
        const cycle = [...pathStack.slice(cycleStart), depId];
        
        this.circularChains.push({
          chain: cycle,
          length: cycle.length - 1,
          severity: this.calculateSeverity(cycle)
        });
      } else if (!visited.has(depId)) {
        this.dfsCircularDetection(depId, visited, recursionStack, pathStack);
      }
    }

    recursionStack.delete(moduleId);
    pathStack.pop();
  }

  calculateSeverity(cycle) {
    let severity = 1;
    
    // Longer cycles are worse
    severity += Math.min(cycle.length * 0.5, 3);
    
    // Critical modules make it worse
    const criticalModules = [
      'extension/background.esm.js',
      'extension/content.esm.js', 
      'extension/lib/state-manager.esm.js',
      'extension/lib/utils.esm.js',
      'extension/lib/log.esm.js'
    ];
    
    const criticalInCycle = cycle.some(id => criticalModules.includes(id));
    if (criticalInCycle) severity += 2;
    
    return Math.min(severity, 5);
  }

  deduplicateChains(chains) {
    const seen = new Set();
    const unique = [];
    
    for (const chain of chains) {
      const normalized = [...chain.chain].sort().join('|');
      if (!seen.has(normalized)) {
        seen.add(normalized);
        unique.push(chain);
      }
    }
    
    return unique;
  }

  reportFindings() {
    console.log('🔄 CIRCULAR DEPENDENCY ANALYSIS RESULTS');
    console.log('=' .repeat(50));
    
    if (this.circularChains.length === 0) {
      console.log('✅ No circular dependencies found!');
      return;
    }

    console.log(`❌ Found ${this.circularChains.length} circular dependency chains:\n`);

    this.circularChains.forEach((chain, index) => {
      console.log(`${index + 1}. Severity ${chain.severity}/5 (Length: ${chain.length})`);
      console.log('   Chain:', chain.chain.map(id => path.basename(id, '.esm.js')).join(' → '));
      console.log();
    });

    // Identify most problematic modules
    const moduleCount = new Map();
    for (const chain of this.circularChains) {
      for (const moduleId of chain.chain) {
        moduleCount.set(moduleId, (moduleCount.get(moduleId) || 0) + 1);
      }
    }

    const sortedProblematic = Array.from(moduleCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    console.log('🎯 TOP 10 MOST PROBLEMATIC MODULES (in most cycles):');
    console.log('-'.repeat(50));
    sortedProblematic.forEach(([moduleId, count], index) => {
      console.log(`${index + 1}. ${path.basename(moduleId, '.esm.js')} (${count} cycles)`);
    });

    console.log('\n🔧 IMMEDIATE ACTIONS REQUIRED:');
    console.log('1. Focus on modules appearing in most cycles');
    console.log('2. Break cycles by extracting shared interfaces');
    console.log('3. Implement dependency injection for critical modules');
    console.log('4. Consider facade pattern for complex dependencies');
  }
}

// Main execution
async function main() {
  const rootDir = path.resolve(__dirname, '..');
  const detector = new CircularDependencyDetector(rootDir);
  
  try {
    await detector.detectCircularDependencies();
  } catch (error) {
    console.error('❌ Detection failed:', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
