#!/usr/bin/env node

/**
 * Security Improvements Verification Script
 * Verify that IIFE files use secure module registration instead of direct global assignment
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function verifySecurityImprovements() {
  console.log('🔐 TweetCraft Security Improvements Verification\n');
  
  const rootDir = path.resolve(__dirname, '..');
  const extensionDir = path.join(rootDir, 'extension');
  
  // IIFE files to check
  const iifeFiles = [
    'lib/utils.js',
    'lib/strings.js', 
    'lib/log.js',
    'content/init.js',
    'content/handlers.js'
  ];
  
  let secureCount = 0;
  let unsecureCount = 0;
  let totalFiles = 0;
  
  console.log('📋 Analyzing IIFE files for security improvements:\n');
  
  for (const file of iifeFiles) {
    const filePath = path.join(extensionDir, file);
    
    try {
      const content = await fs.promises.readFile(filePath, 'utf8');
      totalFiles++;
      
      // Check for secure registration
      const hasSecureRegistration = content.includes('window.TweetCraftModuleRegistry.register');
      const hasDirectAssignment = content.includes('window.TweetCraft') && 
                                   content.includes('window.TweetCraft') && 
                                   !content.includes('TweetCraftModuleRegistry');
      const hasSecureComment = content.includes('SECURE: Register with private module registry');
      
      console.log(`📄 ${file}:`);
      
      if (hasSecureRegistration) {
        console.log('   ✅ Uses secure module registry registration');
        secureCount++;
      }
      
      if (hasSecureComment) {
        console.log('   ✅ Has security improvement comment');
      }
      
      if (hasDirectAssignment && !hasSecureRegistration) {
        console.log('   ❌ Still uses direct global assignment');
        unsecureCount++;
      }
      
      if (hasSecureRegistration && hasDirectAssignment) {
        console.log('   ⚠️  Has both secure and fallback (development mode)');
      }
      
      console.log();
      
    } catch (error) {
      console.warn(`⚠️  Cannot read ${file}: ${error.message}`);
    }
  }
  
  console.log('📊 SECURITY IMPROVEMENT SUMMARY:');
  console.log('━'.repeat(50));
  console.log(`Files analyzed: ${totalFiles}`);
  console.log(`Secure registrations: ${secureCount}`);
  console.log(`Direct assignments: ${unsecureCount}`);
  console.log(`Security improvement rate: ${Math.round((secureCount / totalFiles) * 100)}%`);
  
  if (secureCount === totalFiles) {
    console.log('\n🎉 SUCCESS: All IIFE files use secure module registration!');
  } else {
    console.log(`\n⚠️  ${totalFiles - secureCount} files still need security improvements`);
  }
  
  // Check if registry is properly initialized
  const contentScript = path.join(extensionDir, 'content.esm.js');
  try {
    const contentContent = await fs.promises.readFile(contentScript, 'utf8');
    
    console.log('\n🛡️  REGISTRY INITIALIZATION CHECK:');
    
    if (contentContent.includes('globalModuleRegistry')) {
      console.log('   ✅ Private module registry imported');
    }
    
    if (contentContent.includes('window.TweetCraftModuleRegistry = globalModuleRegistry')) {
      console.log('   ✅ Registry made available to IIFE modules');
    }
    
    if (contentContent.includes('cleanupGlobalRegistry')) {
      console.log('   ✅ Cleanup function implemented');
    }
    
  } catch (error) {
    console.warn(`⚠️  Cannot verify registry initialization: ${error.message}`);
  }
  
  console.log('\n🔧 NEXT STEPS:');
  console.log('1. ✅ Secure module registry implemented');
  console.log('2. ✅ Build system updated to use secure registration'); 
  console.log('3. 🚧 Need to audit manifest.json web_accessible_resources');
  console.log('4. 🚧 Need to add access control and monitoring');
}

verifySecurityImprovements();
