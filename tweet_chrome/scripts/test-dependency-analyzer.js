#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testAnalyzer() {
  console.log('🔍 Testing dependency analyzer...');
  
  const rootDir = path.resolve(__dirname, '..');
  const extensionDir = path.join(rootDir, 'extension');
  
  console.log('Root dir:', rootDir);
  console.log('Extension dir:', extensionDir);
  
  // Check if extension directory exists
  try {
    const stats = await fs.promises.stat(extensionDir);
    console.log('Extension directory exists:', stats.isDirectory());
  } catch (error) {
    console.error('Extension directory error:', error.message);
    return;
  }
  
  // Find ESM files
  let esmFiles = [];
  
  async function scanDir(dir) {
    try {
      const entries = await fs.promises.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          await scanDir(fullPath);
        } else if (entry.name.endsWith('.esm.js')) {
          const moduleId = path.relative(rootDir, fullPath);
          esmFiles.push(moduleId);
        }
      }
    } catch (error) {
      console.warn(`Skipping directory ${dir}: ${error.message}`);
    }
  }
  
  await scanDir(extensionDir);
  
  console.log(`📦 Found ${esmFiles.length} ESM files:`);
  esmFiles.forEach(file => console.log(`  - ${file}`));
  
  if (esmFiles.length > 0) {
    console.log('\n🔍 Analyzing first file...');
    const firstFile = path.join(rootDir, esmFiles[0]);
    
    try {
      const content = await fs.promises.readFile(firstFile, 'utf8');
      
      // Simple import pattern matching
      const importRegex = /^import\s+.*from\s+['"]([^'"]+)['"];?\s*$/gm;
      const imports = [];
      let match;
      
      while ((match = importRegex.exec(content)) !== null) {
        imports.push(match[1]);
      }
      
      console.log(`Found ${imports.length} imports in ${esmFiles[0]}:`);
      imports.forEach(imp => console.log(`  - ${imp}`));
      
    } catch (error) {
      console.error(`Error reading ${firstFile}:`, error.message);
    }
  }
  
  console.log('\n✅ Test complete');
}

testAnalyzer().catch(console.error);
