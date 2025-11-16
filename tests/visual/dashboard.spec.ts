import { test, expect, Page } from '@playwright/test';
import * as path from 'path';

// Configure viewport for consistent rendering
const VIEWPORT = { width: 1280, height: 800 };
const DEVICE_SCALE_FACTOR = 2;

test.describe('Dashboard Visual Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Load the dashboard demo page
    const dashboardPath = path.join(__dirname, '../../src/ui/gallery/dashboard-demo.html');
    await page.goto(`file://${dashboardPath}`);
    await page.setViewportSize(VIEWPORT);

    // Wait for fonts to load
    await page.evaluate(() => document.fonts.ready);

    // Set default theme and density
    await page.evaluate(() => {
      document.body.setAttribute('data-theme', 'light');
      document.body.setAttribute('data-density', 'comfortable');
    });
  });

  test.describe('Dashboard Layout', () => {
    test('dashboard grid layout', async ({ page }) => {
      // Verify 12-column grid layout
      const dashboard = await page.locator('.dashboard-container');
      await expect(dashboard).toBeVisible();

      await expect(page).toHaveScreenshot('dashboard-layout.png', {
        fullPage: true,
        animations: 'disabled'
      });
    });

    test('dashboard widgets alignment', async ({ page }) => {
      // Check widget cards alignment
      const widgets = await page.locator('.dashboard-widget');
      const widgetCount = await widgets.count();
      expect(widgetCount).toBeGreaterThan(0);

      // Verify consistent spacing
      for (let i = 0; i < widgetCount; i++) {
        const widget = widgets.nth(i);
        const padding = await widget.evaluate(el =>
          window.getComputedStyle(el).padding
        );
        expect(padding).toBeTruthy();
      }

      await expect(page).toHaveScreenshot('dashboard-widgets.png');
    });

    test('sidebar navigation states', async ({ page }) => {
      const sidebar = await page.locator('.sidebar');

      if (await sidebar.count() > 0) {
        // Collapsed state
        await page.click('[aria-label="Toggle sidebar"]');
        await page.waitForTimeout(300); // Wait for transition
        await expect(sidebar).toHaveScreenshot('sidebar-collapsed.png');

        // Expanded state
        await page.click('[aria-label="Toggle sidebar"]');
        await page.waitForTimeout(300);
        await expect(sidebar).toHaveScreenshot('sidebar-expanded.png');
      }
    });
  });

  test.describe('Dashboard Data Visualization', () => {
    test('chart components rendering', async ({ page }) => {
      const charts = await page.locator('.chart-container, .visualization');

      if (await charts.count() > 0) {
        await expect(charts.first()).toHaveScreenshot('chart-component.png');
      }
    });

    test('data table sorting indicators', async ({ page }) => {
      const dataTable = await page.locator('.data-table, .table-sortable');

      if (await dataTable.count() > 0) {
        // Click a sortable header
        const sortableHeader = await dataTable.locator('th[aria-sort]').first();

        if (await sortableHeader.count() > 0) {
          await sortableHeader.click();
          await page.waitForTimeout(150);

          const sortState = await sortableHeader.getAttribute('aria-sort');
          expect(['ascending', 'descending', 'none']).toContain(sortState);

          await expect(dataTable).toHaveScreenshot('table-sorted.png');
        }
      }
    });
  });

  test.describe('Dashboard Responsiveness', () => {
    test('tablet viewport', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.waitForTimeout(100);

      await expect(page).toHaveScreenshot('dashboard-tablet.png', {
        fullPage: true,
        animations: 'disabled'
      });
    });

    test('mobile viewport with hamburger menu', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.waitForTimeout(100);

      // Check for hamburger menu visibility
      const hamburger = await page.locator('[aria-label*="menu"], .hamburger-menu, .mobile-menu-toggle');

      if (await hamburger.count() > 0) {
        await expect(hamburger).toBeVisible();

        // Open mobile menu
        await hamburger.click();
        await page.waitForTimeout(300);

        await expect(page).toHaveScreenshot('dashboard-mobile-menu-open.png');

        // Close mobile menu
        await hamburger.click();
        await page.waitForTimeout(300);
      }

      await expect(page).toHaveScreenshot('dashboard-mobile.png', {
        fullPage: true,
        animations: 'disabled'
      });
    });
  });

  test.describe('Dashboard Interactions', () => {
    test('filter panel expansion', async ({ page }) => {
      const filterPanel = await page.locator('.filter-panel, .filters-container');

      if (await filterPanel.count() > 0) {
        const toggleButton = await page.locator('[aria-controls*="filter"], .filter-toggle');

        if (await toggleButton.count() > 0) {
          // Collapsed state
          await expect(filterPanel).toHaveScreenshot('filters-collapsed.png');

          // Expanded state
          await toggleButton.click();
          await page.waitForTimeout(300);
          await expect(filterPanel).toHaveScreenshot('filters-expanded.png');
        }
      }
    });

    test('notification badge states', async ({ page }) => {
      const notificationBadge = await page.locator('.notification-badge, .badge');

      if (await notificationBadge.count() > 0) {
        await expect(notificationBadge.first()).toHaveScreenshot('notification-badge.png');
      }
    });

    test('action menu dropdown', async ({ page }) => {
      const actionMenu = await page.locator('[aria-haspopup="menu"], .action-menu');

      if (await actionMenu.count() > 0) {
        const firstMenu = actionMenu.first();
        await firstMenu.click();
        await page.waitForTimeout(150);

        const dropdown = await page.locator('[role="menu"], .dropdown-menu');
        await expect(dropdown).toBeVisible();
        await expect(dropdown).toHaveScreenshot('action-menu-open.png');

        // Close by clicking outside
        await page.click('body', { position: { x: 10, y: 10 } });
        await page.waitForTimeout(150);
        await expect(dropdown).toBeHidden();
      }
    });
  });

  test.describe('Dashboard Dark Mode', () => {
    test('complete dashboard in dark mode', async ({ page }) => {
      await page.evaluate(() => {
        document.body.setAttribute('data-theme', 'dark');
      });
      await page.waitForTimeout(100);

      // Verify dark mode colors
      const backgroundColor = await page.evaluate(() =>
        window.getComputedStyle(document.body).backgroundColor
      );
      expect(backgroundColor).toBe('rgb(32, 33, 36)');

      await expect(page).toHaveScreenshot('dashboard-dark-complete.png', {
        fullPage: true,
        animations: 'disabled'
      });
    });

    test('dark mode data visualization', async ({ page }) => {
      await page.evaluate(() => {
        document.body.setAttribute('data-theme', 'dark');
      });
      await page.waitForTimeout(100);

      const charts = await page.locator('.chart-container, .visualization');
      if (await charts.count() > 0) {
        await expect(charts.first()).toHaveScreenshot('chart-dark-mode.png');
      }
    });
  });

  test.describe('Dashboard Performance', () => {
    test('lazy loading indicators', async ({ page }) => {
      // Check for loading states
      const loadingIndicators = await page.locator('.loading, .skeleton, [aria-busy="true"]');

      if (await loadingIndicators.count() > 0) {
        await expect(loadingIndicators.first()).toHaveScreenshot('loading-state.png');
      }
    });

    test('virtual scrolling for large datasets', async ({ page }) => {
      const virtualList = await page.locator('.virtual-scroll, [data-virtual-scroll]');

      if (await virtualList.count() > 0) {
        // Scroll to trigger virtual scrolling
        await virtualList.evaluate(el => el.scrollTop = 1000);
        await page.waitForTimeout(100);

        await expect(virtualList).toHaveScreenshot('virtual-scroll-middle.png');

        // Scroll to bottom
        await virtualList.evaluate(el => el.scrollTop = el.scrollHeight);
        await page.waitForTimeout(100);

        await expect(virtualList).toHaveScreenshot('virtual-scroll-bottom.png');
      }
    });
  });

  test.describe('Dashboard Density Modes', () => {
    test('compact density dashboard', async ({ page }) => {
      await page.evaluate(() => {
        document.body.setAttribute('data-density', 'compact');
      });
      await page.waitForTimeout(100);

      await expect(page).toHaveScreenshot('dashboard-density-compact.png', {
        fullPage: false,
        clip: { x: 0, y: 0, width: 1280, height: 800 }
      });
    });

    test('spacious density dashboard', async ({ page }) => {
      await page.evaluate(() => {
        document.body.setAttribute('data-density', 'spacious');
      });
      await page.waitForTimeout(100);

      await expect(page).toHaveScreenshot('dashboard-density-spacious.png', {
        fullPage: false,
        clip: { x: 0, y: 0, width: 1280, height: 800 }
      });
    });
  });
});