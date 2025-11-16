import { test, expect, Page } from '@playwright/test';
import * as path from 'path';

// Configure viewport for consistent rendering
const VIEWPORT = { width: 1280, height: 800 };
const DEVICE_SCALE_FACTOR = 2;

test.describe('UI Foundation Simple Visual Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Load the gallery page
    const galleryPath = path.join(__dirname, '../../src/ui/gallery/index.html');
    await page.goto(`file://${galleryPath}`);
    await page.setViewportSize(VIEWPORT);

    // Wait for any fonts to load
    await page.evaluate(() => {
      if (document.fonts && document.fonts.ready) {
        return document.fonts.ready;
      }
    });
  });

  test.describe('Theme Support', () => {
    test('light theme rendering', async ({ page }) => {
      // Set light theme
      await page.click('#light');
      await page.waitForTimeout(100);

      // Verify light theme is set
      const theme = await page.evaluate(() =>
        document.documentElement.getAttribute('data-theme')
      );
      expect(theme).toBe('light');

      // Take screenshot for visual comparison
      await expect(page).toHaveScreenshot('simple-light-theme.png', {
        fullPage: false,
        clip: { x: 0, y: 0, width: 1280, height: 800 }
      });
    });

    test('dark theme rendering', async ({ page }) => {
      // Set dark theme
      await page.click('#dark');
      await page.waitForTimeout(100);

      // Verify dark theme is set
      const theme = await page.evaluate(() =>
        document.documentElement.getAttribute('data-theme')
      );
      expect(theme).toBe('dark');

      // Verify dark theme background color
      const bgColor = await page.evaluate(() =>
        window.getComputedStyle(document.body).backgroundColor
      );

      // Dark theme should have dark background
      expect(bgColor).toMatch(/rgb\(17, 24, 39\)|rgb\(17, 17, 17\)/); // Matches #111827 or #111

      // Take screenshot
      await expect(page).toHaveScreenshot('simple-dark-theme.png', {
        fullPage: false,
        clip: { x: 0, y: 0, width: 1280, height: 800 }
      });
    });
  });

  test.describe('Density Modes', () => {
    test('compact density', async ({ page }) => {
      await page.click('#compact');
      await page.waitForTimeout(100);

      // Check compact class is applied
      const hasCompactClass = await page.evaluate(() =>
        document.getElementById('grid')?.classList.contains('row-compact')
      );
      expect(hasCompactClass).toBe(true);

      await expect(page).toHaveScreenshot('simple-density-compact.png', {
        clip: { x: 0, y: 100, width: 1280, height: 400 }
      });
    });

    test('comfortable density', async ({ page }) => {
      await page.click('#comfortable');
      await page.waitForTimeout(100);

      // Check comfortable class is applied
      const hasComfortableClass = await page.evaluate(() =>
        document.getElementById('grid')?.classList.contains('row-comfortable')
      );
      expect(hasComfortableClass).toBe(true);

      await expect(page).toHaveScreenshot('simple-density-comfortable.png', {
        clip: { x: 0, y: 100, width: 1280, height: 400 }
      });
    });
  });

  test.describe('Basic Elements', () => {
    test('buttons states', async ({ page }) => {
      const button = await page.locator('button:has-text("Primary")');

      // Normal state
      await expect(button).toHaveScreenshot('simple-button-normal.png');

      // Hover state
      await button.hover();
      await page.waitForTimeout(50);
      await expect(button).toHaveScreenshot('simple-button-hover.png');

      // Focus state
      await button.focus();
      await expect(button).toHaveScreenshot('simple-button-focus.png');
    });

    test('disabled button', async ({ page }) => {
      const disabledButton = await page.locator('button[disabled]');
      await expect(disabledButton).toBeDisabled();
      await expect(disabledButton).toHaveScreenshot('simple-button-disabled.png');
    });

    test('input field', async ({ page }) => {
      const input = await page.locator('input[placeholder="Type here"]');

      // Normal state
      await expect(input).toHaveScreenshot('simple-input-normal.png');

      // Focus state
      await input.focus();
      await expect(input).toHaveScreenshot('simple-input-focus.png');

      // With value
      await input.fill('Test value');
      await expect(input).toHaveScreenshot('simple-input-filled.png');
    });
  });

  test.describe('Grid Layout', () => {
    test('grid system with cards', async ({ page }) => {
      const grid = await page.locator('#grid');

      // Verify grid exists
      await expect(grid).toBeVisible();

      // Check cards are displayed
      const cards = await grid.locator('.card');
      const cardCount = await cards.count();
      expect(cardCount).toBeGreaterThan(0);

      // Take screenshot of grid
      await expect(grid).toHaveScreenshot('simple-grid-layout.png');
    });

    test('responsive container', async ({ page }) => {
      const container = await page.locator('.container');

      // Check max-width
      const maxWidth = await container.evaluate(el =>
        window.getComputedStyle(el).maxWidth
      );
      expect(maxWidth).toBe('960px');

      await expect(container).toHaveScreenshot('simple-container.png');
    });
  });

  test.describe('Complete Gallery', () => {
    test('full page light theme', async ({ page }) => {
      await page.click('#light');
      await page.click('#comfortable');
      await page.waitForTimeout(100);

      await expect(page).toHaveScreenshot('simple-gallery-light.png', {
        fullPage: true,
        animations: 'disabled'
      });
    });

    test('full page dark theme', async ({ page }) => {
      await page.click('#dark');
      await page.click('#comfortable');
      await page.waitForTimeout(100);

      await expect(page).toHaveScreenshot('simple-gallery-dark.png', {
        fullPage: true,
        animations: 'disabled'
      });
    });
  });
});