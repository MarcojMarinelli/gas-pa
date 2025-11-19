const fs = require('fs');

// Read the test file
const content = fs.readFileSync('tests/unit/addon.cards.spec.ts', 'utf-8');

// Fix patterns that use expect inside page.evaluate
let fixed = content;

// Pattern 1: Simple expect calls with no return
fixed = fixed.replace(
  /await page\.evaluate\(\(\) => \{([^}]+)expect\(([^}]+)\}[^}]*\}\);/g,
  (match) => {
    // If it's already fixed (has return statement), skip it
    if (match.includes('return {')) {
      return match;
    }

    // For now, just mark these for manual fixing
    console.log('Found test that needs manual fixing');
    return match;
  }
);

// Write a helper to identify tests that still need fixing
const lines = fixed.split('\n');
const testsNeedingFix = [];
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('test(') && lines[i].includes('async ({ page })')) {
    // Check if the next few lines have expect inside evaluate
    for (let j = i + 1; j < Math.min(i + 30, lines.length); j++) {
      if (lines[j].includes('expect(') && !lines[j-1].includes('});')) {
        // This is likely an expect inside page.evaluate
        const testName = lines[i].match(/test\('([^']+)'/)?.[1];
        if (testName) {
          testsNeedingFix.push({ line: i + 1, name: testName });
          break;
        }
      }
    }
  }
}

console.log(`Found ${testsNeedingFix.length} tests that still need fixing:`);
testsNeedingFix.forEach(test => {
  console.log(`  Line ${test.line}: ${test.name}`);
});