#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ext = (p) => path.join(__dirname, '..', 'extension', p);
const projectRoot = path.join(__dirname, '..');

function assertExists(filePath, description) {
  if (!fs.existsSync(filePath)) {
    console.error(`❌ MISSING: ${description}`);
    console.error(`   Expected: ${filePath}`);
    process.exit(1);
  }
}

function main() {
  console.log('🔍 Verifying repository layout...\n');

  try {
    // 1. Read and validate manifest.json
    const manifestPath = ext('manifest.json');
    assertExists(manifestPath, 'extension/manifest.json');
    
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    console.log('✅ Manifest.json exists and is valid JSON');

    // 2. Verify service worker and UI paths
    if (manifest.background?.service_worker) {
      assertExists(ext(manifest.background.service_worker), 'Service worker');
      console.log(`✅ Service worker: ${manifest.background.service_worker}`);
    }

    if (manifest.action?.default_popup) {
      assertExists(ext(manifest.action.default_popup), 'Action popup');
      console.log(`✅ Action popup: ${manifest.action.default_popup}`);
    }

    const optionsPage = manifest.options_page || manifest.options_ui?.page;
    if (optionsPage) {
      assertExists(ext(optionsPage), 'Options page');
      console.log(`✅ Options page: ${optionsPage}`);
    }

    // 3. Verify content scripts
    let contentScriptsCount = 0;
    (manifest.content_scripts || []).forEach((cs, index) => {
      (cs.js || []).forEach((js) => {
        assertExists(ext(js), `Content script ${index + 1}: ${js}`);
        contentScriptsCount++;
      });
    });
    if (contentScriptsCount > 0) {
      console.log(`✅ Content scripts: ${contentScriptsCount} verified`);
    }

    // 4. Verify web accessible resources
    let resourcesCount = 0;
    (manifest.web_accessible_resources || []).forEach((wr) => {
      (wr.resources || []).forEach((resource) => {
        assertExists(ext(resource), `Web accessible resource: ${resource}`);
        resourcesCount++;
      });
    });
    if (resourcesCount > 0) {
      console.log(`✅ Web accessible resources: ${resourcesCount} verified`);
    }

    // 5. Check allowed layout in /extension/
    const allowedItems = new Set([
      'manifest.json',
      'background.js', 
      'content.js',
      'content',      // content scripts directory
      'ui',           // UI files directory  
      'lib',          // library files directory
      'styles',       // CSS files directory
      'assets'        // assets directory
    ]);

    const extensionDir = ext('');
    const actualItems = fs.readdirSync(extensionDir);
    
    let hasWarnings = false;
    actualItems.forEach((item) => {
      if (!allowedItems.has(item)) {
        if (item.endsWith('.tmp') || item.endsWith('.backup') || item.startsWith('.')) {
          console.warn(`⚠️  WARN: Temporary/backup file in runtime: ${item}`);
          hasWarnings = true;
        } else {
          console.warn(`⚠️  WARN: Unexpected item in runtime: ${item}`);
          hasWarnings = true;
        }
      }
    });

    if (!hasWarnings) {
      console.log('✅ Extension directory layout is clean');
    }

    // 6. Verify critical directories exist
    const criticalDirs = ['lib', 'content', 'ui', 'styles', 'assets'];
    criticalDirs.forEach(dir => {
      const dirPath = ext(dir);
      if (fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()) {
        console.log(`✅ Critical directory: ${dir}/`);
      } else {
        console.error(`❌ MISSING: Critical directory ${dir}/`);
        process.exit(1);
      }
    });

    console.log('\n🎉 Layout verification PASSED');
    console.log('   Extension is ready to load from /extension/ directory');

  } catch (error) {
    console.error('❌ FAILED: Layout verification failed');
    console.error(`   Error: ${error.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { main };