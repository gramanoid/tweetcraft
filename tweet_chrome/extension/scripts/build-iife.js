#!/usr/bin/env node

/**
 * TweetCraft AI - ESM to IIFE Build Script
 * Automatically converts ES6 modules to IIFE format for Chrome extension compatibility
 * 
 * This script eliminates the need to manually maintain both ESM and IIFE versions
 * by generating IIFE versions from ESM source files.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ES6 module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration for files that need IIFE versions
const ESM_TO_IIFE_MAPPINGS = [
  { esm: 'content/init.esm.js', iife: 'content/init.js', namespace: 'TweetCraftInit' },
  { esm: 'content/handlers.esm.js', iife: 'content/handlers.js', namespace: 'TweetCraftHandlers' },
  { esm: 'content/modal-ui.esm.js', iife: 'content/modal-ui.js', namespace: 'TweetCraftModalUI' },
  { esm: 'content/dom-utils.esm.js', iife: 'content/dom-utils.js', namespace: 'TweetCraftDOMUtils' },
  { esm: 'content/clipboard.esm.js', iife: 'content/clipboard.js', namespace: 'TweetCraftClipboard' },
  { esm: 'content/selector-canary.esm.js', iife: 'content/selector-canary.js', namespace: 'TweetCraftSelectorCanary' },
  { esm: 'lib/utils.esm.js', iife: 'lib/utils.js', namespace: 'TweetCraftStorage' },
  { esm: 'lib/enhancement-engine.esm.js', iife: 'lib/enhancement-engine.js', namespace: 'TweetCraftContentEnhancer' },
  { esm: 'lib/strings.esm.js', iife: 'lib/strings.js', namespace: 'TweetCraftStrings' },
  { esm: 'lib/log.esm.js', iife: 'lib/log.js', namespace: 'TweetCraftLog' },
  { esm: 'lib/llm-client.esm.js', iife: 'lib/llm-client.js', namespace: 'TweetCraftLLMClient' },
  { esm: 'lib/config-cache.esm.js', iife: 'lib/config-cache.js', namespace: 'ConfigCache' },
  { esm: 'lib/message-handlers.esm.js', iife: 'lib/message-handlers.js', namespace: 'messageHandlers' },
  { esm: 'lib/personalization-engine.esm.js', iife: 'lib/personalization-engine.js', namespace: 'PersonalizationEngine' },
  { esm: 'lib/personalization-schema.esm.js', iife: 'lib/personalization-schema.js', namespace: 'PersonalizationSchema' },
  { esm: 'lib/strategic-engagement-hub.esm.js', iife: 'lib/strategic-engagement-hub.js', namespace: 'StrategicEngagementHub' },
  { esm: 'lib/private-module-registry.esm.js', iife: 'lib/private-module-registry.js', namespace: 'PrivateModuleRegistry' }
];

/**
 * Convert import statements to global dependency checks
 */
function convertImports(content, esmFile) {
  console.log(`[BUILD] Converting imports for ${esmFile}`);
  
  // Extract all import statements
  const importRegex = /^import\s+(?:{[^}]+}|\w+|[^;]+)\s+from\s+['"]([^'"]+)['"];?\s*$/gm;
  const imports = [];
  let match;
  
  while ((match = importRegex.exec(content)) !== null) {
    imports.push({
      statement: match[0],
      source: match[1],
      line: match.index
    });
  }
  
  // Generate dependency check comments
  let dependencyComments = [
    '// NOTE: This file is auto-generated from the ESM version.',
    '// Edit the .esm.js file and run `npm run build:iife` to update.',
    '// ',
    '// Dependencies loaded via global namespace:'
  ];
  
  // Remove import statements and add dependency comments
  let convertedContent = content.replace(importRegex, '');
  
  // Add IIFE wrapper
  convertedContent = `${dependencyComments.join('\n')}

(function() {
  'use strict';
  
  // Wait for dependencies to be available
  if (typeof window === 'undefined') {
    console.error('TweetCraft: Window object not available');
    return;
  }

${convertedContent}

})();`;

  return convertedContent;
}

/**
 * Convert export statements to global assignments
 */
function convertExports(content, namespace) {
  console.log(`[BUILD] Converting exports for namespace: ${namespace}`);
  
  // Handle named exports
  content = content.replace(/^export\s+const\s+(\w+)/gm, 'const $1');
  content = content.replace(/^export\s+function\s+(\w+)/gm, 'function $1');
  content = content.replace(/^export\s+class\s+(\w+)/gm, 'class $1');
  
  // Handle export statements at end of file
  const exportDefaultRegex = /^export\s+default\s+(.+);?$/gm;
  content = content.replace(exportDefaultRegex, '');
  
  // Handle export { ... } statements
  const namedExportRegex = /^export\s+{\s*([^}]+)\s*};?$/gm;
  let exportedItems = [];
  
  content = content.replace(namedExportRegex, (match, exports) => {
    const items = exports.split(',').map(item => item.trim());
    exportedItems.push(...items);
    return '';
  });
  
  // Add private module registry assignment at the end (SECURE)
  if (exportedItems.length > 0 || namespace) {
    content += `

  // SECURE: Register with private module registry instead of global window
  if (typeof window !== 'undefined' && window.TweetCraftModuleRegistry) {
    try {
      window.TweetCraftModuleRegistry.register('${namespace}', ${namespace}, {
        source: 'build-system',
        buildDate: '${new Date().toISOString()}',
        secure: true
      });
    } catch (error) {
      console.warn('TweetCraft: Failed to register module ${namespace}:', error.message);
      // Fallback for development only
      if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
        window.${namespace} = ${namespace};
      }
    }
  }`;
  }
  
  return content;
}

/**
 * Main build function
 */
function buildIIFE() {
  console.log('[BUILD] Starting ESM to IIFE conversion...');
  
  const extensionDir = path.resolve(__dirname, '..');
  let successCount = 0;
  let errorCount = 0;
  
  for (const mapping of ESM_TO_IIFE_MAPPINGS) {
    const esmPath = path.join(extensionDir, mapping.esm);
    const iifePath = path.join(extensionDir, mapping.iife);
    
    try {
      // Check if ESM file exists
      if (!fs.existsSync(esmPath)) {
        console.warn(`[BUILD] ESM file not found: ${mapping.esm}`);
        continue;
      }
      
      // Read ESM content
      console.log(`[BUILD] Processing: ${mapping.esm} -> ${mapping.iife}`);
      const esmContent = fs.readFileSync(esmPath, 'utf8');
      
      // Convert to IIFE
      let iifeContent = convertImports(esmContent, mapping.esm);
      iifeContent = convertExports(iifeContent, mapping.namespace);
      
      // Add generation timestamp
      const timestamp = new Date().toISOString();
      const header = `// Auto-generated from ${mapping.esm} on ${timestamp}
// DO NOT EDIT THIS FILE DIRECTLY - Edit the .esm.js version instead

`;
      iifeContent = header + iifeContent;
      
      // Write IIFE file
      fs.writeFileSync(iifePath, iifeContent, 'utf8');
      console.log(`[BUILD] ✅ Generated: ${mapping.iife}`);
      successCount++;
      
    } catch (error) {
      console.error(`[BUILD] ❌ Error processing ${mapping.esm}:`, error.message);
      errorCount++;
    }
  }
  
  console.log(`[BUILD] Conversion complete: ${successCount} successful, ${errorCount} errors`);
  
  if (errorCount > 0) {
    process.exit(1);
  }
}

// Run if called directly - always run since this is a build script
buildIIFE();

export { buildIIFE };
