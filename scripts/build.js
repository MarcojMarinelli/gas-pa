// scripts/build.js (CommonJS, safe on Node 24.x)
const { execSync } = require('node:child_process');
const { mkdirSync, cpSync, existsSync } = require('node:fs');
const { join } = require('node:path');

function run(cmd) {
  execSync(cmd, { stdio: 'inherit', shell: true });
}

console.log('Building UI components bundle (for demo.html)…');
// UI.js is browser-side code - it will be embedded in HTML files
run('esbuild src/ui/main.ts --bundle --format=iife --outfile=dist/UI.js --platform=browser --target=es2020');

console.log('Embedding UI into demo.html…');
run('node scripts/embed-ui.js');

console.log('Building UI bundle for dashboard (standalone)…');
// ui-bundle.js - UI components for GAS dashboard deployment
run('esbuild src/ui/main.ts --bundle --format=iife --global-name=UI --outfile=dist/ui-bundle.js --platform=browser --target=es2015 --minify');

console.log('Building App bundle for dashboard…');
// app-bundle.js - Application controller for GAS dashboard deployment
run('esbuild src/ui/app.ts --bundle --format=iife --global-name=App --outfile=dist/app-bundle.js --platform=browser --target=es2015 --minify');

console.log('Creating bundle HTML files for GAS include()…');
// Base64 encode bundles to prevent template processing issues
const { writeFileSync: writeFile, readFileSync: readFile } = require('node:fs');
const uiJs = readFile('dist/ui-bundle.js', 'utf8');
const uiCss = readFile('dist/ui-bundle.css', 'utf8');
const appJs = readFile('dist/app-bundle.js', 'utf8');

// Encode JavaScript as base64 to prevent GAS template system from processing it
const uiJsB64 = Buffer.from(uiJs).toString('base64');
const appJsB64 = Buffer.from(appJs).toString('base64');

// Create script tags that decode and execute the base64 content
writeFile('dist/ui-bundle.html', `<script>(function(){var s=document.createElement('script');s.textContent=atob('${uiJsB64}');document.head.appendChild(s);})()</script>`);
writeFile('dist/ui-bundle-css.html', uiCss);  // CSS doesn't need encoding
writeFile('dist/app-bundle.html', `<script>(function(){var s=document.createElement('script');s.textContent=atob('${appJsB64}');document.head.appendChild(s);})()</script>`);

// Copy dashboard.html and dashboard-init.html from source (they use include() pattern)
cpSync('src/webapp/dashboard.html', 'dist/dashboard.html');
cpSync('src/webapp/dashboard-init.html', 'dist/dashboard-init.html');
console.log('✓ Created bundle HTML files and copied dashboard files');

console.log('Building webapp entry point…');
// Build gas-entry.ts which includes API routing and dashboard serving
// No format wrapper - output plain JavaScript with globalThis exports for GAS
run('esbuild src/webapp/gas-entry.ts --bundle --outfile=dist/webapp.js --platform=neutral --target=es2020 --external:googleapis');

console.log('Cleaning up temporary embedded files…');
// Remove temporary UI.js and UI.css since they're now embedded in demo.html
// Keep ui-bundle.css and ui-bundle.js for dashboard
if (existsSync('dist/UI.js')) run('rm dist/UI.js');
if (existsSync('dist/UI.css')) run('rm dist/UI.css');

console.log('Copying backend functions…');
// Copy plain JS backend functions (no bundling needed - plain GAS functions)
if (existsSync('src/gas-backend.js')) cpSync('src/gas-backend.js', 'dist/backend.js');

console.log('Copying appsscript.json…');
if (existsSync('appsscript.json')) cpSync('appsscript.json', 'dist/appsscript.json');

console.log('✓ Build complete');

