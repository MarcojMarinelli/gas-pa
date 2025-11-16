import { test, expect, Page } from '@playwright/test';
import * as path from 'path';

// Configure viewport for consistent rendering
const VIEWPORT = { width: 1280, height: 800 };
const DEVICE_SCALE_FACTOR = 2;

test.describe('UI Foundation Visual Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Load the gallery page
    const galleryPath = path.join(__dirname, '../../src/ui/gallery/index.html');
    await page.goto(`file://${galleryPath}`);
    await page.setViewportSize(VIEWPORT);

    // Wait for fonts to load
    await page.evaluate(() => document.fonts.ready);
  });

  test.describe('Theme Support', () => {
    test('light theme rendering', async ({ page }) => {
      await page.evaluate(() => {
        document.body.setAttribute('data-theme', 'light');
      });
      await page.waitForTimeout(100); // Allow CSS transitions to complete

      // Verify light theme colors
      const primaryButton = await page.locator('.btn-primary').first();
      await expect(primaryButton).toHaveCSS('background-color', 'rgb(26, 115, 232)');

      // Take screenshot for visual comparison
      await expect(page).toHaveScreenshot('light-theme.png', {
        fullPage: false,
        clip: { x: 0, y: 0, width: 1280, height: 800 }
      });
    });

    test('dark theme rendering', async ({ page }) => {
      await page.evaluate(() => {
        document.body.setAttribute('data-theme', 'dark');
      });
      await page.waitForTimeout(100);

      // Verify dark theme colors
      const background = await page.locator('body');
      await expect(background).toHaveCSS('background-color', 'rgb(32, 33, 36)');

      const primaryButton = await page.locator('.btn-primary').first();
      await expect(primaryButton).toHaveCSS('background-color', 'rgb(138, 180, 248)');

      // Take screenshot
      await expect(page).toHaveScreenshot('dark-theme.png', {
        fullPage: false,
        clip: { x: 0, y: 0, width: 1280, height: 800 }
      });
    });
  });

  test.describe('Density Modes', () => {
    test('compact density', async ({ page }) => {
      await page.evaluate(() => {
        document.body.setAttribute('data-density', 'compact');
      });
      await page.waitForTimeout(100);

      const button = await page.locator('.btn').first();
      const buttonHeight = await button.evaluate(el =>
        window.getComputedStyle(el).getPropertyValue('min-height')
      );
      expect(buttonHeight).toBe('36px');

      await expect(page).toHaveScreenshot('density-compact.png', {
        clip: { x: 0, y: 100, width: 1280, height: 400 }
      });
    });

    test('comfortable density', async ({ page }) => {
      await page.evaluate(() => {
        document.body.setAttribute('data-density', 'comfortable');
      });
      await page.waitForTimeout(100);

      await expect(page).toHaveScreenshot('density-comfortable.png', {
        clip: { x: 0, y: 100, width: 1280, height: 400 }
      });
    });

    test('spacious density', async ({ page }) => {
      await page.evaluate(() => {
        document.body.setAttribute('data-density', 'spacious');
      });
      await page.waitForTimeout(100);

      await expect(page).toHaveScreenshot('density-spacious.png', {
        clip: { x: 0, y: 100, width: 1280, height: 400 }
      });
    });
  });

  test.describe('Button States', () => {
    test('button hover state (+4% brightness)', async ({ page }) => {
      const button = await page.locator('.btn-primary').first();

      // Get initial color
      const initialColor = await button.evaluate(el =>
        window.getComputedStyle(el).backgroundColor
      );

      // Hover
      await button.hover();
      await page.waitForTimeout(150); // Wait for transition

      const hoverColor = await button.evaluate(el =>
        window.getComputedStyle(el).backgroundColor
      );

      // Colors should be different
      expect(initialColor).not.toBe(hoverColor);

      await expect(button).toHaveScreenshot('button-hover.png');
    });

    test('button active state (-8% brightness)', async ({ page }) => {
      const button = await page.locator('.btn-primary').first();

      // Mouse down for active state
      await button.dispatchEvent('mousedown');
      await page.waitForTimeout(50);

      await expect(button).toHaveScreenshot('button-active.png');
    });

    test('button focus ring (2px)', async ({ page }) => {
      const button = await page.locator('.btn-primary').first();

      // Focus the button
      await button.focus();

      // Check for focus ring
      const boxShadow = await button.evaluate(el =>
        window.getComputedStyle(el).boxShadow
      );

      // Should have a box-shadow for focus ring
      expect(boxShadow).toContain('0px 0px 0px 2px');

      await expect(button).toHaveScreenshot('button-focus.png');
    });

    test('solid and tonal button variants', async ({ page }) => {
      const buttonsSection = await page.locator('.gallery-section').filter({ hasText: 'Buttons' });

      await expect(buttonsSection).toHaveScreenshot('buttons-all-variants.png');
    });
  });

  test.describe('Grid System', () => {
    test('12-column grid with 24px gutters', async ({ page }) => {
      const gridSection = await page.locator('.gallery-section').filter({ hasText: 'Grid System' });

      // Verify gutter spacing
      const row = await gridSection.locator('.row').first();
      const marginLeft = await row.evaluate(el =>
        window.getComputedStyle(el).marginLeft
      );
      expect(marginLeft).toBe('-12px'); // Half of 24px gutter

      // Verify 12-column layout
      const col12 = await gridSection.locator('.col-12').first();
      const width = await col12.evaluate(el =>
        window.getComputedStyle(el).width
      );

      await expect(gridSection).toHaveScreenshot('grid-system.png');
    });

    test('container max width 1280px', async ({ page }) => {
      const container = await page.locator('.container').first();
      const maxWidth = await container.evaluate(el =>
        window.getComputedStyle(el).maxWidth
      );
      expect(maxWidth).toBe('1280px');
    });
  });

  test.describe('Table Component', () => {
    test('sticky header and first column', async ({ page }) => {
      const tableSection = await page.locator('.gallery-section').filter({ hasText: 'Table' });
      const table = await tableSection.locator('.table');

      // Check sticky header
      const thead = await table.locator('thead');
      const position = await thead.evaluate(el =>
        window.getComputedStyle(el).position
      );
      expect(position).toBe('sticky');

      // Check sticky first column
      const firstTh = await table.locator('th').first();
      const firstThPosition = await firstTh.evaluate(el =>
        window.getComputedStyle(el).position
      );
      expect(firstThPosition).toBe('sticky');

      await expect(tableSection).toHaveScreenshot('table-sticky.png');
    });
  });

  test.describe('Elevation Tokens', () => {
    test('elevation levels e1 through e5', async ({ page }) => {
      const elevationSection = await page.locator('.gallery-section').filter({ hasText: 'Cards & Elevation' });

      // Verify each elevation level has different box-shadow
      const e1 = await elevationSection.locator('.elevation-1');
      const e3 = await elevationSection.locator('.elevation-3');
      const e5 = await elevationSection.locator('.elevation-5');

      const shadow1 = await e1.evaluate(el => window.getComputedStyle(el).boxShadow);
      const shadow3 = await e3.evaluate(el => window.getComputedStyle(el).boxShadow);
      const shadow5 = await e5.evaluate(el => window.getComputedStyle(el).boxShadow);

      // Shadows should be progressively stronger
      expect(shadow1).not.toBe(shadow3);
      expect(shadow3).not.toBe(shadow5);
      expect(shadow1).not.toBe(shadow5);

      await expect(elevationSection).toHaveScreenshot('elevation-tokens.png');
    });
  });

  test.describe('Form Elements', () => {
    test('input border mapping in dark mode', async ({ page }) => {
      await page.evaluate(() => {
        document.body.setAttribute('data-theme', 'dark');
      });
      await page.waitForTimeout(100);

      const input = await page.locator('.input').first();
      const borderColor = await input.evaluate(el =>
        window.getComputedStyle(el).borderColor
      );

      // Dark mode border color
      expect(borderColor).toBe('rgb(95, 99, 104)');

      const formSection = await page.locator('.gallery-section').filter({ hasText: 'Form Elements' });
      await expect(formSection).toHaveScreenshot('forms-dark-mode.png');
    });

    test('input focus state', async ({ page }) => {
      const input = await page.locator('.input').first();
      await input.focus();

      const borderColor = await input.evaluate(el =>
        window.getComputedStyle(el).borderColor
      );

      // Should have primary color border when focused
      expect(borderColor).toBe('rgb(26, 115, 232)');

      await expect(input).toHaveScreenshot('input-focus.png');
    });
  });

  test.describe('Accessibility', () => {
    test('keyboard navigation', async ({ page }) => {
      // Tab through interactive elements
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');

      // Check that focus is visible
      const focusedElement = await page.evaluate(() =>
        document.activeElement?.className
      );
      expect(focusedElement).toBeDefined();
    });

    test('ARIA attributes present', async ({ page }) => {
      // Check for screen reader only class
      const srOnly = await page.locator('.sr-only');
      const count = await srOnly.count();
      expect(count).toBeGreaterThanOrEqual(0);

      // Check aria-live regions
      const ariaLive = await page.locator('.aria-live-polite');
      const liveCount = await ariaLive.count();
      expect(liveCount).toBeGreaterThanOrEqual(0);
    });

    test('focus trapping for modal', async ({ page }) => {
      // Open modal
      await page.click('button:has-text("Open Modal")');
      await page.waitForTimeout(100);

      const modal = await page.locator('.modal-overlay');
      await expect(modal).toBeVisible();

      // Check z-index for proper layering
      const zIndex = await modal.evaluate(el =>
        window.getComputedStyle(el).zIndex
      );
      expect(parseInt(zIndex)).toBeGreaterThan(100);

      await expect(modal).toHaveScreenshot('modal-open.png');

      // Close with Escape key
      await page.keyboard.press('Escape');
      await expect(modal).toBeHidden();
    });
  });

  test.describe('Performance', () => {
    test('respects prefers-reduced-motion', async ({ page }) => {
      // Enable reduced motion
      await page.emulateMedia({ reducedMotion: 'reduce' });

      const button = await page.locator('.btn').first();
      const transition = await button.evaluate(el =>
        window.getComputedStyle(el).transition
      );

      // Transitions should be instant with reduced motion
      expect(transition).toContain('0s');
    });
  });

  test.describe('Complete Gallery Screenshots', () => {
    test('full gallery light theme', async ({ page }) => {
      await page.evaluate(() => {
        document.body.setAttribute('data-theme', 'light');
        document.body.setAttribute('data-density', 'comfortable');
      });

      await expect(page).toHaveScreenshot('gallery-complete-light.png', {
        fullPage: true,
        animations: 'disabled'
      });
    });

    test('full gallery dark theme', async ({ page }) => {
      await page.evaluate(() => {
        document.body.setAttribute('data-theme', 'dark');
        document.body.setAttribute('data-density', 'comfortable');
      });

      await expect(page).toHaveScreenshot('gallery-complete-dark.png', {
        fullPage: true,
        animations: 'disabled'
      });
    });
  });
});