import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: ['**/*.spec.ts'],
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:8087',
    headless: true,
    browserName: 'chromium',
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 2,        // High DPI for deterministic rendering
    colorScheme: 'light',
    locale: 'en-US',
    // Ensure consistent rendering on headless Linux CI
    launchOptions: {
      args: [
        '--disable-dev-shm-usage',
        '--disable-blink-features=AutomationControlled',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--font-render-hinting=none',
        '--disable-lcd-text'
      ],
    },
    // Screenshot options for visual regression
    screenshot: {
      mode: 'only-on-failure',
      fullPage: false,
    },
  },
  projects: [
    {
      name: 'chrome-macos',
      use: {
        viewport: { width: 1280, height: 800 },
        deviceScaleFactor: 2,
      }
    },
  ],
  // Visual regression testing configuration
  expect: {
    toHaveScreenshot: {
      maxDiffPixels: 100,
      threshold: 0.2,
      animations: 'disabled',
    },
  },
});
