import { test, expect } from '@playwright/test';

test('Debug AddonBundle loading', async ({ page }) => {
  // Listen for console messages
  page.on('console', msg => {
    console.log('Console:', msg.type(), msg.text());
  });

  page.on('pageerror', error => {
    console.log('Page error:', error);
  });

  page.on('requestfailed', request => {
    console.log('Request failed:', request.url(), request.failure()?.errorText);
  });

  await page.goto('/test-fixtures/addon-cards.html');

  const result = await page.evaluate(() => {
    const bundle = (window as any).AddonBundle;
    const components = (window as any).addonComponents;
    return {
      hasAddonBundle: typeof bundle !== 'undefined',
      addonBundleType: typeof bundle,
      addonBundleKeys: bundle ? Object.keys(bundle).slice(0, 10) : [],
      hasAddonComponents: typeof components !== 'undefined',
      addonComponentsType: typeof components,
      addonComponentsKeys: components ? Object.keys(components).slice(0, 10) : [],
      hasCreateKeyValue: components?.createKeyValue !== undefined,
      createKeyValueType: typeof components?.createKeyValue,
      sampleFunction: bundle ? String(bundle.createKeyValue).substring(0, 100) : 'N/A'
    };
  });

  console.log('Debug result:', result);

  expect(result.hasAddonBundle).toBeTruthy();
  expect(result.hasAddonComponents).toBeTruthy();
  expect(result.hasCreateKeyValue).toBeTruthy();
});