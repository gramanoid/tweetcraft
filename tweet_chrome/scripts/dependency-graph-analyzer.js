#!/usr/bin/env node

/**
 * TweetCraft AI - Dependency Graph Analyzer
 * P0.1: Create dependency graph analysis tool to visualize import relationships across 113 modules
 * 
 * This tool analyzes all ESM files in the extension to:
 * 1. Build complete dependency graph
 * 2. Detect circular import chains
 * 3. Identify problematic modules
 * 4. Generate actionable reports
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class DependencyGraphAnalyzer {
  constructor(rootDir) {
    this.rootDir = rootDir;
    this.modules = new Map(); // moduleId -> { path, imports, exports }
    this.dependencyGraph = new Map(); // moduleId -> Set<dependsOn>
    this.reverseDependencyGraph = new Map(); // moduleId -> Set<dependedBy>
    this.circularDependencies = [];
    this.problemModules = new Set();
  }

  /**
   * Main analysis entry point
   */
  async analyze() {
    console.log('🔍 TweetCraft Dependency Graph Analysis Starting...\n');
    
    // Step 1: Discover all ESM modules
    await this.discoverModules();
    console.log(`📦 Discovered ${this.modules.size} ESM modules`);
    
    // Step 2: Parse import/export relationships
    await this.parseImportExports();
    console.log('📊 Parsed import/export relationships');
    
    // Step 3: Build dependency graphs
    this.buildDependencyGraphs();
    console.log('🕸️  Built dependency graphs');
    
    // Step 4: Detect circular dependencies
    this.detectCircularDependencies();
    console.log(`🔄 Found ${this.circularDependencies.length} circular dependency chains`);
    
    // Step 5: Identify problem modules
    this.identifyProblemModules();
    console.log(`⚠️  Identified ${this.problemModules.size} problem modules`);
    
    // Step 6: Generate reports
    await this.generateReports();
    console.log('📋 Generated analysis reports');
    
    console.log('\n✅ Dependency graph analysis complete!');
  }

  /**
   * Discover all ESM modules in the extension
   */
  async discoverModules() {
    const extensionDir = path.join(this.rootDir, 'extension');
    await this.scanDirectory(extensionDir);
  }

  /**
   * Recursively scan directory for ESM files
   */
  async scanDirectory(dir) {
    const entries = await fs.promises.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        await this.scanDirectory(fullPath);
      } else if (entry.name.endsWith('.esm.js')) {
        const moduleId = path.relative(this.rootDir, fullPath);
        this.modules.set(moduleId, {
          path: fullPath,
          imports: [],
          exports: [],
          content: null
        });
      }
    }
  }

  /**
   * Parse import and export statements from all modules
   */
  async parseImportExports() {
    for (const [moduleId, moduleInfo] of this.modules) {
      try {
        const content = await fs.promises.readFile(moduleInfo.path, 'utf8');
        moduleInfo.content = content;
        
        // Parse imports
        moduleInfo.imports = this.parseImports(content, moduleId);
        
        // Parse exports  
        moduleInfo.exports = this.parseExports(content);
        
      } catch (error) {
        console.warn(`⚠️  Failed to parse ${moduleId}: ${error.message}`);
        this.problemModules.add(moduleId);
      }
    }
  }

  /**
   * Parse import statements from module content
   */
  parseImports(content, moduleId) {
    const imports = [];
    
    // Regular expressions to match different import patterns
    const importPatterns = [
      // import { foo, bar } from './module.esm.js'
      /^import\s+{[^}]*}\s+from\s+['"]([^'"]+)['"];?\s*$/gm,
      // import foo from './module.esm.js'  
      /^import\s+\w+\s+from\s+['"]([^'"]+)['"];?\s*$/gm,
      // import './module.esm.js'
      /^import\s+['"]([^'"]+)['"];?\s*$/gm,
      // import * as foo from './module.esm.js'
      /^import\s+\*\s+as\s+\w+\s+from\s+['"]([^'"]+)['"];?\s*$/gm
    ];

    for (const pattern of importPatterns) {
      let match;
      pattern.lastIndex = 0; // Reset regex
      
      while ((match = pattern.exec(content)) !== null) {
        const importPath = match[1];
        const resolvedPath = this.resolveImportPath(importPath, moduleId);
        
        if (resolvedPath) {
          imports.push({
            original: importPath,
            resolved: resolvedPath,
            line: this.getLineNumber(content, match.index)
          });
        }
      }
    }

    return imports;
  }

  /**
   * Parse export statements from module content
   */
  parseExports(content) {
    const exports = [];
    
    // Regular expressions for export patterns
    const exportPatterns = [
      // export const/function/class
      /^export\s+(const|function|class|let|var)\s+(\w+)/gm,
      // export { foo, bar }
      /^export\s+{\s*([^}]+)\s*}/gm,
      // export default
      /^export\s+default\s+/gm
    ];

    for (const pattern of exportPatterns) {
      let match;
      pattern.lastIndex = 0;
      
      while ((match = pattern.exec(content)) !== null) {
        if (match[2]) {
          // Named export
          exports.push({
            type: 'named',
            name: match[2],
            line: this.getLineNumber(content, match.index)
          });
        } else if (match[1]) {
          // Export list
          const names = match[1].split(',').map(n => n.trim());
          names.forEach(name => {
            exports.push({
              type: 'named',
              name: name,
              line: this.getLineNumber(content, match.index)
            });
          });
        } else {
          // Default export
          exports.push({
            type: 'default',
            line: this.getLineNumber(content, match.index)
          });
        }
      }
    }

    return exports;
  }

  /**
   * Resolve relative import path to module ID
   */
  resolveImportPath(importPath, fromModuleId) {
    if (!importPath.startsWith('.')) {
      return null; // External module, ignore
    }

    const fromDir = path.dirname(fromModuleId);
    const resolvedPath = path.resolve(path.join(this.rootDir, fromDir), importPath);
    const relativeResolved = path.relative(this.rootDir, resolvedPath);
    
    // Check if this resolved path exists in our modules
    if (this.modules.has(relativeResolved)) {
      return relativeResolved;
    }
    
    // Try with .esm.js extension if not already present
    if (!relativeResolved.endsWith('.esm.js')) {
      const withExtension = relativeResolved + '.esm.js';
      if (this.modules.has(withExtension)) {
        return withExtension;
      }
    }
    
    return null;
  }

  /**
   * Get line number for a character index
   */
  getLineNumber(content, index) {
    return content.substring(0, index).split('\n').length;
  }

  /**
   * Build forward and reverse dependency graphs
   */
  buildDependencyGraphs() {
    for (const [moduleId, moduleInfo] of this.modules) {
      this.dependencyGraph.set(moduleId, new Set());
      this.reverseDependencyGraph.set(moduleId, new Set());
    }

    for (const [moduleId, moduleInfo] of this.modules) {
      for (const importInfo of moduleInfo.imports) {
        if (importInfo.resolved) {
          // Forward dependency: moduleId depends on importInfo.resolved
          this.dependencyGraph.get(moduleId).add(importInfo.resolved);
          
          // Reverse dependency: importInfo.resolved is depended on by moduleId
          this.reverseDependencyGraph.get(importInfo.resolved).add(moduleId);
        }
      }
    }
  }

  /**
   * Detect circular dependencies using DFS
   */
  detectCircularDependencies() {
    const visited = new Set();
    const recursionStack = new Set();
    const pathStack = [];

    for (const moduleId of this.modules.keys()) {
      if (!visited.has(moduleId)) {
        this.detectCircularDFS(moduleId, visited, recursionStack, pathStack);
      }
    }
  }

  /**
   * DFS helper for circular dependency detection
   */
  detectCircularDFS(moduleId, visited, recursionStack, pathStack) {
    visited.add(moduleId);
    recursionStack.add(moduleId);
    pathStack.push(moduleId);

    const dependencies = this.dependencyGraph.get(moduleId) || new Set();
    
    for (const depId of dependencies) {
      if (!visited.has(depId)) {
        this.detectCircularDFS(depId, visited, recursionStack, pathStack);
      } else if (recursionStack.has(depId)) {
        // Found circular dependency
        const cycleStart = pathStack.indexOf(depId);
        const cycle = [...pathStack.slice(cycleStart), depId];
        
        this.circularDependencies.push({
          cycle: cycle,
          length: cycle.length - 1,
          severity: this.calculateCycleSeverity(cycle)
        });
        
        // Mark all modules in cycle as problematic
        cycle.forEach(id => this.problemModules.add(id));
      }
    }

    recursionStack.delete(moduleId);
    pathStack.pop();
  }

  /**
   * Calculate severity of a circular dependency
   */
  calculateCycleSeverity(cycle) {
    let severity = 1;
    
    // Longer cycles are more severe
    severity += cycle.length * 0.5;
    
    // Critical modules make cycles more severe
    const criticalModules = ['background.esm.js', 'content.esm.js', 'state-manager.esm.js'];
    const hasCritical = cycle.some(id => criticalModules.some(critical => id.includes(critical)));
    if (hasCritical) severity += 2;
    
    return Math.min(severity, 5); // Cap at 5
  }

  /**
   * Identify problematic modules
   */
  identifyProblemModules() {
    // Modules already marked by circular dependencies
    
    // Add modules with high dependency counts
    for (const [moduleId, dependencies] of this.dependencyGraph) {
      if (dependencies.size > 10) {
        this.problemModules.add(moduleId);
      }
    }
    
    // Add modules that are heavily depended upon
    for (const [moduleId, dependents] of this.reverseDependencyGraph) {
      if (dependents.size > 15) {
        this.problemModules.add(moduleId);
      }
    }
  }

  /**
   * Generate analysis reports
   */
  async generateReports() {
    const reportsDir = path.join(this.rootDir, 'reports');
    await fs.promises.mkdir(reportsDir, { recursive: true });
    
    // Generate main report
    await this.generateMainReport(reportsDir);
    
    // Generate circular dependencies report
    await this.generateCircularDependencyReport(reportsDir);
    
    // Generate module analysis report
    await this.generateModuleAnalysisReport(reportsDir);
    
    // Generate DOT graph for visualization
    await this.generateDotGraph(reportsDir);
  }

  /**
   * Generate main analysis report
   */
  async generateMainReport(reportsDir) {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalModules: this.modules.size,
        circularDependencies: this.circularDependencies.length,
        problemModules: this.problemModules.size,
        avgDependenciesPerModule: this.calculateAverageDependencies(),
        maxDependencies: this.calculateMaxDependencies(),
        modulesWithNoDependencies: this.calculateModulesWithNoDependencies()
      },
      circularDependencies: this.circularDependencies.map(cd => ({
        cycle: cd.cycle,
        length: cd.length,
        severity: cd.severity
      })),
      problemModules: Array.from(this.problemModules),
      recommendations: this.generateRecommendations()
    };

    const reportPath = path.join(reportsDir, 'dependency-analysis-report.json');
    await fs.promises.writeFile(reportPath, JSON.stringify(report, null, 2));
    console.log(`📊 Main report: ${reportPath}`);
  }

  /**
   * Generate detailed circular dependency report
   */
  async generateCircularDependencyReport(reportsDir) {
    let markdown = '# Circular Dependencies Report\n\n';
    markdown += `**Analysis Date**: ${new Date().toISOString()}\n`;
    markdown += `**Total Circular Dependencies**: ${this.circularDependencies.length}\n\n`;

    if (this.circularDependencies.length === 0) {
      markdown += '✅ No circular dependencies found!\n';
    } else {
      markdown += '## Circular Dependency Chains\n\n';
      
      // Sort by severity
      const sortedCycles = [...this.circularDependencies].sort((a, b) => b.severity - a.severity);
      
      sortedCycles.forEach((cd, index) => {
        markdown += `### ${index + 1}. Severity ${cd.severity}/5 (Length: ${cd.length})\n\n`;
        markdown += '```\n';
        markdown += cd.cycle.join(' → ') + '\n';
        markdown += '```\n\n';
        
        markdown += '**Modules Involved**:\n';
        cd.cycle.forEach(moduleId => {
          markdown += `- \`${moduleId}\`\n`;
        });
        markdown += '\n';
      });
    }

    const reportPath = path.join(reportsDir, 'circular-dependencies-report.md');
    await fs.promises.writeFile(reportPath, markdown);
    console.log(`🔄 Circular dependencies report: ${reportPath}`);
  }

  /**
   * Generate module analysis report
   */
  async generateModuleAnalysisReport(reportsDir) {
    let markdown = '# Module Analysis Report\n\n';
    markdown += `**Analysis Date**: ${new Date().toISOString()}\n`;
    markdown += `**Total Modules**: ${this.modules.size}\n\n`;

    // Top dependencies
    const modulesByDeps = Array.from(this.dependencyGraph.entries())
      .sort((a, b) => b[1].size - a[1].size)
      .slice(0, 10);

    markdown += '## Top 10 Modules by Dependencies\n\n';
    modulesByDeps.forEach(([moduleId, deps], index) => {
      markdown += `${index + 1}. \`${moduleId}\` (${deps.size} dependencies)\n`;
    });
    markdown += '\n';

    // Most depended upon
    const modulesByReverseDeps = Array.from(this.reverseDependencyGraph.entries())
      .sort((a, b) => b[1].size - a[1].size)
      .slice(0, 10);

    markdown += '## Top 10 Most Depended Upon Modules\n\n';
    modulesByReverseDeps.forEach(([moduleId, dependents], index) => {
      markdown += `${index + 1}. \`${moduleId}\` (${dependents.size} dependents)\n`;
    });
    markdown += '\n';

    // Problem modules
    markdown += '## Problem Modules\n\n';
    if (this.problemModules.size === 0) {
      markdown += '✅ No problematic modules identified!\n';
    } else {
      Array.from(this.problemModules).forEach(moduleId => {
        const deps = this.dependencyGraph.get(moduleId)?.size || 0;
        const dependents = this.reverseDependencyGraph.get(moduleId)?.size || 0;
        markdown += `- \`${moduleId}\` (${deps} deps, ${dependents} dependents)\n`;
      });
    }

    const reportPath = path.join(reportsDir, 'module-analysis-report.md');
    await fs.promises.writeFile(reportPath, markdown);
    console.log(`📦 Module analysis report: ${reportPath}`);
  }

  /**
   * Generate DOT graph for visualization
   */
  async generateDotGraph(reportsDir) {
    let dot = 'digraph TweetCraftDependencies {\n';
    dot += '  rankdir=LR;\n';
    dot += '  node [shape=box];\n\n';

    // Add nodes with colors based on problem status
    for (const moduleId of this.modules.keys()) {
      const shortName = path.basename(moduleId, '.esm.js');
      const isProblematic = this.problemModules.has(moduleId);
      const color = isProblematic ? 'red' : 'lightblue';
      
      dot += `  "${shortName}" [fillcolor=${color}, style=filled];\n`;
    }

    dot += '\n';

    // Add edges
    for (const [moduleId, dependencies] of this.dependencyGraph) {
      const fromName = path.basename(moduleId, '.esm.js');
      
      for (const depId of dependencies) {
        const toName = path.basename(depId, '.esm.js');
        dot += `  "${fromName}" -> "${toName}";\n`;
      }
    }

    dot += '}\n';

    const dotPath = path.join(reportsDir, 'dependency-graph.dot');
    await fs.promises.writeFile(dotPath, dot);
    console.log(`🖼️  DOT graph: ${dotPath}`);
    console.log('   Use: dot -Tsvg dependency-graph.dot -o dependency-graph.svg');
  }

  /**
   * Calculate average dependencies per module
   */
  calculateAverageDependencies() {
    const totalDeps = Array.from(this.dependencyGraph.values())
      .reduce((sum, deps) => sum + deps.size, 0);
    return Math.round(totalDeps / this.modules.size * 100) / 100;
  }

  /**
   * Calculate max dependencies
   */
  calculateMaxDependencies() {
    return Math.max(...Array.from(this.dependencyGraph.values()).map(deps => deps.size));
  }

  /**
   * Calculate modules with no dependencies
   */
  calculateModulesWithNoDependencies() {
    return Array.from(this.dependencyGraph.values()).filter(deps => deps.size === 0).length;
  }

  /**
   * Generate actionable recommendations
   */
  generateRecommendations() {
    const recommendations = [];

    if (this.circularDependencies.length > 0) {
      recommendations.push({
        priority: 'P0',
        issue: 'Circular Dependencies',
        description: `Found ${this.circularDependencies.length} circular dependency chains that must be broken`,
        action: 'Implement dependency injection or extract shared interfaces'
      });
    }

    if (this.problemModules.size > 10) {
      recommendations.push({
        priority: 'P0',
        issue: 'High-Coupling Modules',
        description: `${this.problemModules.size} modules have high coupling (>10 deps or >15 dependents)`,
        action: 'Refactor large modules into smaller, focused modules'
      });
    }

    const avgDeps = this.calculateAverageDependencies();
    if (avgDeps > 5) {
      recommendations.push({
        priority: 'P1',
        issue: 'High Average Dependencies',
        description: `Average of ${avgDeps} dependencies per module indicates high coupling`,
        action: 'Implement facade pattern and reduce cross-module dependencies'
      });
    }

    return recommendations;
  }
}

// Main execution
async function main() {
  const rootDir = path.resolve(__dirname, '..');
  const analyzer = new DependencyGraphAnalyzer(rootDir);
  
  try {
    await analyzer.analyze();
  } catch (error) {
    console.error('❌ Analysis failed:', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { DependencyGraphAnalyzer };
