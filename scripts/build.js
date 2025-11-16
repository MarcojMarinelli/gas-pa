// scripts/build.js (CommonJS, safe on Node 24.x)
const { execSync } = require('node:child_process');
const { mkdirSync, cpSync, existsSync } = require('node:fs');
const { join } = require('node:path');

function run(cmd) {
  execSync(cmd, { stdio: 'inherit', shell: true });
}

console.log('Building UI bundle…');
run('esbuild src/ui/main.ts --bundle --format=iife --outfile=dist/UI.js --platform=browser --target=es2020');

console.log('Building addon components for tests…');
// Bundle addon code for browser tests (IIFE format for direct script loading)
run('esbuild addon/index.ts --bundle --outfile=dist/addon-bundle.js --format=iife --global-name=AddonBundle --platform=browser --target=es2020');
// Also copy test fixtures to dist
mkdirSync('dist/test-fixtures', { recursive: true });
if (existsSync('test-fixtures')) run('cp -r test-fixtures/* dist/test-fixtures/ || true');

console.log('Copying gallery…');
mkdirSync('dist/gallery', { recursive: true });
if (existsSync('src/ui/gallery')) run('cp -r src/ui/gallery/* dist/gallery/ || true');

console.log('Copying appsscript.json…');
if (existsSync('appsscript.json')) cpSync('appsscript.json', 'dist/appsscript.json');

console.log('✓ Build complete');

