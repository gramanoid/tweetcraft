#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function debugCircular() {
  console.log('Starting debug...');
  
  try {
    const rootDir = path.resolve(__dirname, '..');
    console.log('Root directory:', rootDir);
    
    const extensionDir = path.join(rootDir, 'extension');
    console.log('Extension directory:', extensionDir);
    
    // Test if we can read the directory
    const stats = await fs.promises.stat(extensionDir);
    console.log('Extension dir is directory:', stats.isDirectory());
    
    console.log('Debug complete');
    
  } catch (error) {
    console.error('Error in debug:', error);
  }
}

debugCircular();
