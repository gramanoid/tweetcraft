#!/usr/bin/env node

/**
 * Simple Global Namespace Audit
 * Identify window.* assignments from build-iife.js and other sources
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function simpleGlobalAudit() {
  console.log('🔍 Simple Global Namespace Audit\n');
  
  const rootDir = path.resolve(__dirname, '..');
  const buildScript = path.join(rootDir, 'extension/scripts/build-iife.js');
  
  try {
    console.log('📋 Reading build script...');
    const buildContent = await fs.promises.readFile(buildScript, 'utf8');
    
    // Find ESM_TO_IIFE_MAPPINGS
    const mappingMatch = buildContent.match(/const ESM_TO_IIFE_MAPPINGS = \[(.*?)\];/s);
    if (mappingMatch) {
      const mappingSection = mappingMatch[1];
      
      // Extract namespace names
      const namespaceRegex = /namespace:\s*['"]([^'"]+)['"]/g;
      const namespaces = [];
      let match;
      
      while ((match = namespaceRegex.exec(mappingSection)) !== null) {
        namespaces.push(match[1]);
      }
      
      console.log(`🏭 BUILD SYSTEM CREATES ${namespaces.length} GLOBALS:`);
      namespaces.forEach((ns, index) => {
        console.log(`${index + 1}. window.${ns}`);
      });
      
      console.log('\n🚨 SECURITY RISK ANALYSIS:');
      console.log(`- ${namespaces.length} objects exposed to ALL web pages`);
      console.log('- Any malicious website can access these globals');
      console.log('- No authentication or permission checks');
      console.log('- Potential for function hijacking attacks');
    }
    
    // Look for window assignments in the build template
    const windowAssignRegex = /window\.(\w+)\s*=/g;
    const windowAssignments = [];
    let assignMatch;
    
    while ((assignMatch = windowAssignRegex.exec(buildContent)) !== null) {
      windowAssignments.push(assignMatch[1]);
    }
    
    if (windowAssignments.length > 0) {
      console.log(`\n📝 DIRECT WINDOW ASSIGNMENTS IN BUILD SCRIPT: ${windowAssignments.length}`);
      windowAssignments.forEach(assignment => {
        console.log(`- window.${assignment}`);
      });
    }
    
    console.log('\n🔧 IMMEDIATE ACTIONS REQUIRED:');
    console.log('1. Replace window.* assignments with private module registry');
    console.log('2. Implement access control for necessary globals');
    console.log('3. Add cleanup on extension unload');
    console.log('4. Audit manifest.json web_accessible_resources');
    
  } catch (error) {
    console.error('❌ Audit failed:', error.message);
  }
}

simpleGlobalAudit();
