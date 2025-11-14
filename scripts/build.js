#!/usr/bin/env node

const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

// Clean dist directory
const distDir = path.join(__dirname, '..', 'dist');
if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true });
}
fs.mkdirSync(distDir, { recursive: true });

// Bundle the TypeScript code
esbuild.build({
  entryPoints: ['src/main-phase2.ts'],
  bundle: true,
  outfile: 'dist/Code.js',
  platform: 'neutral', // Don't assume node or browser
  format: 'iife',      // Immediately Invoked Function Expression
  target: 'es2019',
  logLevel: 'info',
  banner: {
    js: '// Google Apps Script Bundle\n// Auto-generated - do not edit directly\nvar global = this;\n',
  },
  footer: {
    js: `
// Export Phase 1 functions to global scope
function simpleTest() { return global.simpleTest(); }
function authorizeScript() { return global.authorizeScript(); }
function cleanupProperties() { return global.cleanupProperties(); }
function setup() { return global.setup(); }
function testEmailProcessing() { return global.testEmailProcessing(); }
function testDailySummary() { return global.testDailySummary(); }
function processEmailsPeriodically() { return global.processEmailsPeriodically(); }
function sendDailySummary() { return global.sendDailySummary(); }
function sendWeeklySummary() { return global.sendWeeklySummary(); }
function cleanupOldData() { return global.cleanupOldData(); }
function getConfiguration() { return global.getConfiguration(); }
function updateConfiguration(key, value) { return global.updateConfiguration(key, value); }
function getStatistics() { return global.getStatistics(); }
function reprocessEmails(query) { return global.reprocessEmails(query); }
function exportConfiguration() { return global.exportConfiguration(); }

// Export Phase 2 functions to global scope
function setupPhase2() { return global.setupPhase2(); }
function setOpenAIKey(apiKey) { return global.setOpenAIKey(apiKey); }
function testPhase2Components() { return global.testPhase2Components(); }
function testClassification() { return global.testClassification(); }
function testDraftGeneration() { return global.testDraftGeneration(); }
function getPhase2Status() { return global.getPhase2Status(); }
function exportPhase2Config() { return global.exportPhase2Config(); }
function importPhase2Config(jsonString) { return global.importPhase2Config(jsonString); }

// Export Classification Engine test functions
function testClassificationEngine() { return global.testClassificationEngine(); }
function testVIPManagement() { return global.testVIPManagement(); }
function testRulesEngine() { return global.testRulesEngine(); }
function testLearningSystem() { return global.testLearningSystem(); }
function testClassificationFeedback() { return global.testClassificationFeedback(); }
function runAllClassificationTests() { return global.runAllClassificationTests(); }

// Export Follow-up Queue test functions
function testQueueManagement() { return global.testQueueManagement(); }
function testSnoozeOperations() { return global.testSnoozeOperations(); }
function testSLATracking() { return global.testSLATracking(); }
function testClassificationIntegration() { return global.testClassificationIntegration(); }
function testQueueStatistics() { return global.testQueueStatistics(); }
function runAllQueueTests() { return global.runAllQueueTests(); }
function debugQueueDatabase() { return global.debugQueueDatabase(); }

// Flush logs function for trigger
function flushLogs() { return global.LoggerService.flush(); }
`,
  },
}).then(() => {
  console.log('✓ Build complete: dist/Code.js');

  // Copy appsscript.json to dist if it exists
  const appsScriptPath = path.join(__dirname, '..', 'appsscript.json');
  if (fs.existsSync(appsScriptPath)) {
    fs.copyFileSync(appsScriptPath, path.join(distDir, 'appsscript.json'));
    console.log('✓ Copied: appsscript.json');
  }
}).catch((error) => {
  console.error('Build failed:', error);
  process.exit(1);
});
