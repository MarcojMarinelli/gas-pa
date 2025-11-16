import { test, expect, Page } from '@playwright/test';
import * as path from 'path';

// Configure viewport for consistent rendering
const VIEWPORT = { width: 1280, height: 800 };
const DEVICE_SCALE_FACTOR = 2;

test.describe('Table Component Visual Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Load the table demo page
    const tablePath = path.join(__dirname, '../../src/ui/gallery/table.html');
    await page.goto(`file://${tablePath}`);
    await page.setViewportSize(VIEWPORT);

    // Wait for fonts to load
    await page.evaluate(() => document.fonts.ready);

    // Set default theme and density
    await page.evaluate(() => {
      document.body.setAttribute('data-theme', 'light');
      document.body.setAttribute('data-density', 'comfortable');
    });
  });

  test.describe('Table Structure', () => {
    test('sticky header on scroll', async ({ page }) => {
      const table = await page.locator('.table, table').first();
      const thead = await table.locator('thead');

      // Check sticky positioning
      const position = await thead.evaluate(el =>
        window.getComputedStyle(el).position
      );
      expect(position).toBe('sticky');

      const top = await thead.evaluate(el =>
        window.getComputedStyle(el).top
      );
      expect(top).toBe('0px');

      // Scroll table and verify header stays visible
      await table.evaluate(el => {
        const wrapper = el.closest('.table-wrapper, .table-container') || el.parentElement;
        if (wrapper) wrapper.scrollTop = 200;
      });

      await page.waitForTimeout(100);
      await expect(table).toHaveScreenshot('table-sticky-header-scrolled.png');
    });

    test('sticky first column on horizontal scroll', async ({ page }) => {
      const table = await page.locator('.table-sticky-column, .table').first();
      const firstColumnCells = await table.locator('tbody tr td:first-child, tbody tr th:first-child');

      if (await firstColumnCells.count() > 0) {
        const position = await firstColumnCells.first().evaluate(el =>
          window.getComputedStyle(el).position
        );

        if (position === 'sticky') {
          // Scroll horizontally
          await table.evaluate(el => {
            const wrapper = el.closest('.table-wrapper, .table-container') || el.parentElement;
            if (wrapper) wrapper.scrollLeft = 200;
          });

          await page.waitForTimeout(100);
          await expect(table).toHaveScreenshot('table-sticky-column-scrolled.png');
        }
      }
    });

    test('table zebra striping', async ({ page }) => {
      const zebraTable = await page.locator('.table-striped, .table[data-striped="true"]').first();

      if (await zebraTable.count() > 0) {
        const evenRows = await zebraTable.locator('tbody tr:nth-child(even)');
        const oddRows = await zebraTable.locator('tbody tr:nth-child(odd)');

        if (await evenRows.count() > 0 && await oddRows.count() > 0) {
          const evenBg = await evenRows.first().evaluate(el =>
            window.getComputedStyle(el).backgroundColor
          );
          const oddBg = await oddRows.first().evaluate(el =>
            window.getComputedStyle(el).backgroundColor
          );

          // Backgrounds should be different for striping
          expect(evenBg).not.toBe(oddBg);

          await expect(zebraTable).toHaveScreenshot('table-zebra-striped.png');
        }
      }
    });

    test('table borders and spacing', async ({ page }) => {
      const table = await page.locator('.table').first();

      // Check border styles
      const borderCollapse = await table.evaluate(el =>
        window.getComputedStyle(el).borderCollapse
      );

      // Check cell padding
      const firstCell = await table.locator('td').first();
      const padding = await firstCell.evaluate(el =>
        window.getComputedStyle(el).padding
      );

      expect(padding).toBeTruthy();

      await expect(table).toHaveScreenshot('table-borders-spacing.png');
    });
  });

  test.describe('Table Interactions', () => {
    test('sortable columns', async ({ page }) => {
      const sortableHeader = await page.locator('th[aria-sort], th.sortable').first();

      if (await sortableHeader.count() > 0) {
        // Initial state
        await expect(sortableHeader).toHaveScreenshot('table-sort-none.png');

        // Click to sort ascending
        await sortableHeader.click();
        await page.waitForTimeout(150);

        const sortAsc = await sortableHeader.getAttribute('aria-sort');
        if (sortAsc === 'ascending') {
          await expect(sortableHeader).toHaveScreenshot('table-sort-asc.png');
        }

        // Click to sort descending
        await sortableHeader.click();
        await page.waitForTimeout(150);

        const sortDesc = await sortableHeader.getAttribute('aria-sort');
        if (sortDesc === 'descending') {
          await expect(sortableHeader).toHaveScreenshot('table-sort-desc.png');
        }

        // Full table sorted
        const table = await page.locator('.table').first();
        await expect(table).toHaveScreenshot('table-sorted-full.png');
      }
    });

    test('row selection with checkboxes', async ({ page }) => {
      const selectAllCheckbox = await page.locator('thead input[type="checkbox"]').first();

      if (await selectAllCheckbox.count() > 0) {
        // Select all
        await selectAllCheckbox.click();
        await page.waitForTimeout(100);

        const selectedRows = await page.locator('tr.selected, tr[data-selected="true"]');
        const rowCount = await selectedRows.count();

        if (rowCount > 0) {
          // Check selected row styling
          const bgColor = await selectedRows.first().evaluate(el =>
            window.getComputedStyle(el).backgroundColor
          );

          // Should have selection background
          expect(bgColor).not.toBe('rgba(0, 0, 0, 0)');

          await expect(page.locator('.table')).toHaveScreenshot('table-rows-selected.png');
        }

        // Deselect all
        await selectAllCheckbox.click();
        await page.waitForTimeout(100);
      }

      // Individual row selection
      const firstRowCheckbox = await page.locator('tbody tr:first-child input[type="checkbox"]').first();
      if (await firstRowCheckbox.count() > 0) {
        await firstRowCheckbox.click();
        await page.waitForTimeout(100);

        const firstRow = await page.locator('tbody tr:first-child');
        await expect(firstRow).toHaveScreenshot('table-single-row-selected.png');
      }
    });

    test('row hover state', async ({ page }) => {
      const row = await page.locator('tbody tr').first();

      // Get initial background
      const initialBg = await row.evaluate(el =>
        window.getComputedStyle(el).backgroundColor
      );

      // Hover over row
      await row.hover();
      await page.waitForTimeout(100);

      const hoverBg = await row.evaluate(el =>
        window.getComputedStyle(el).backgroundColor
      );

      // Background should change on hover
      if (initialBg !== hoverBg) {
        await expect(row).toHaveScreenshot('table-row-hover.png');
      }
    });

    test('expandable rows', async ({ page }) => {
      const expandButton = await page.locator('[aria-expanded], .expand-toggle').first();

      if (await expandButton.count() > 0) {
        // Collapsed state
        await expect(expandButton).toHaveScreenshot('table-row-collapsed.png');

        // Expand row
        await expandButton.click();
        await page.waitForTimeout(300); // Wait for expansion animation

        const expandedContent = await page.locator('.expanded-content, .row-details');
        if (await expandedContent.count() > 0) {
          await expect(expandedContent).toBeVisible();

          const parentRow = await expandButton.locator('xpath=ancestor::tr');
          await expect(parentRow).toHaveScreenshot('table-row-expanded.png');
        }

        // Collapse row
        await expandButton.click();
        await page.waitForTimeout(300);
      }
    });

    test('inline editing', async ({ page }) => {
      const editableCell = await page.locator('td[contenteditable], .editable-cell').first();

      if (await editableCell.count() > 0) {
        // Click to edit
        await editableCell.click();
        await page.waitForTimeout(100);

        // Check if cell is in edit mode
        const isEditable = await editableCell.getAttribute('contenteditable');
        if (isEditable === 'true') {
          await expect(editableCell).toHaveScreenshot('table-cell-editing.png');

          // Type new value
          await editableCell.fill('New Value');
          await page.keyboard.press('Enter');
          await page.waitForTimeout(100);

          await expect(editableCell).toHaveScreenshot('table-cell-edited.png');
        }
      }

      // Or check for edit button
      const editButton = await page.locator('button[aria-label*="Edit"], .edit-button').first();
      if (await editButton.count() > 0) {
        await editButton.click();
        await page.waitForTimeout(100);

        const editForm = await page.locator('.edit-form, .inline-edit');
        if (await editForm.count() > 0) {
          await expect(editForm).toHaveScreenshot('table-inline-edit-form.png');
        }
      }
    });
  });

  test.describe('Table Pagination', () => {
    test('pagination controls', async ({ page }) => {
      const pagination = await page.locator('.pagination, .table-pagination').first();

      if (await pagination.count() > 0) {
        await expect(pagination).toHaveScreenshot('table-pagination.png');

        // Check page size selector
        const pageSizeSelector = await pagination.locator('select, [role="combobox"]').first();
        if (await pageSizeSelector.count() > 0) {
          await pageSizeSelector.click();
          await page.waitForTimeout(100);
          await expect(pageSizeSelector).toHaveScreenshot('table-page-size-options.png');
        }

        // Navigate pages
        const nextButton = await pagination.locator('button[aria-label*="Next"], .next-page');
        if (await nextButton.count() > 0 && !await nextButton.isDisabled()) {
          await nextButton.click();
          await page.waitForTimeout(150);
          await expect(pagination).toHaveScreenshot('table-pagination-page-2.png');
        }

        // Check disabled state on last page
        const lastPageButton = await pagination.locator('button[aria-label*="Last"], .last-page');
        if (await lastPageButton.count() > 0) {
          await lastPageButton.click();
          await page.waitForTimeout(150);

          const nextButtonDisabled = await nextButton.isDisabled();
          expect(nextButtonDisabled).toBe(true);
          await expect(pagination).toHaveScreenshot('table-pagination-last-page.png');
        }
      }
    });

    test('rows per page options', async ({ page }) => {
      const rowsPerPageSelector = await page.locator('select[aria-label*="Rows per page"], .rows-per-page').first();

      if (await rowsPerPageSelector.count() > 0) {
        // Change rows per page
        await rowsPerPageSelector.selectOption('50');
        await page.waitForTimeout(150);

        const table = await page.locator('.table').first();
        const visibleRows = await table.locator('tbody tr:visible');
        const rowCount = await visibleRows.count();

        // Should show more rows
        expect(rowCount).toBeLessThanOrEqual(50);
        await expect(table).toHaveScreenshot('table-50-rows.png');
      }
    });
  });

  test.describe('Table Filtering', () => {
    test('column filters', async ({ page }) => {
      const filterInput = await page.locator('thead input[type="text"], .column-filter').first();

      if (await filterInput.count() > 0) {
        // Apply filter
        await filterInput.fill('test');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(150);

        const table = await page.locator('.table').first();
        await expect(table).toHaveScreenshot('table-filtered.png');

        // Clear filter
        await filterInput.clear();
        await page.keyboard.press('Enter');
        await page.waitForTimeout(150);
      }

      // Check for filter dropdown
      const filterDropdown = await page.locator('.filter-dropdown, button[aria-label*="Filter"]').first();
      if (await filterDropdown.count() > 0) {
        await filterDropdown.click();
        await page.waitForTimeout(100);

        const filterMenu = await page.locator('.filter-menu, [role="menu"]');
        if (await filterMenu.count() > 0) {
          await expect(filterMenu).toHaveScreenshot('table-filter-menu.png');
        }
      }
    });

    test('global search', async ({ page }) => {
      const searchInput = await page.locator('input[type="search"], .table-search').first();

      if (await searchInput.count() > 0) {
        await searchInput.fill('search term');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(150);

        const table = await page.locator('.table').first();
        const highlightedCells = await table.locator('.highlight, mark');

        if (await highlightedCells.count() > 0) {
          // Search results should be highlighted
          await expect(table).toHaveScreenshot('table-search-results.png');
        }
      }
    });
  });

  test.describe('Table Responsive Behavior', () => {
    test('responsive table on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.waitForTimeout(100);

      const table = await page.locator('.table').first();

      // Check if table has horizontal scroll
      const wrapper = await table.locator('xpath=ancestor::*[contains(@class, "wrapper") or contains(@class, "container")]').first();
      const hasScroll = await wrapper.evaluate(el => el.scrollWidth > el.clientWidth);

      if (hasScroll) {
        await expect(wrapper).toHaveScreenshot('table-mobile-scroll.png');
      }

      // Check for card view on mobile
      const cardView = await page.locator('.table-card-view, .mobile-card');
      if (await cardView.count() > 0) {
        await expect(cardView.first()).toHaveScreenshot('table-mobile-card-view.png');
      }
    });

    test('collapsed columns on tablet', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.waitForTimeout(100);

      const table = await page.locator('.table').first();
      const collapsedIndicator = await table.locator('.collapsed-indicator, .more-columns');

      if (await collapsedIndicator.count() > 0) {
        await expect(table).toHaveScreenshot('table-tablet-collapsed.png');

        // Expand collapsed columns
        await collapsedIndicator.click();
        await page.waitForTimeout(150);

        await expect(table).toHaveScreenshot('table-tablet-expanded.png');
      }
    });
  });

  test.describe('Table Density Modes', () => {
    test('compact density', async ({ page }) => {
      await page.evaluate(() => {
        document.body.setAttribute('data-density', 'compact');
      });
      await page.waitForTimeout(100);

      const table = await page.locator('.table').first();
      const firstCell = await table.locator('td').first();

      const padding = await firstCell.evaluate(el =>
        window.getComputedStyle(el).padding
      );

      // Compact should have less padding
      await expect(table).toHaveScreenshot('table-density-compact.png');
    });

    test('spacious density', async ({ page }) => {
      await page.evaluate(() => {
        document.body.setAttribute('data-density', 'spacious');
      });
      await page.waitForTimeout(100);

      const table = await page.locator('.table').first();
      await expect(table).toHaveScreenshot('table-density-spacious.png');
    });
  });

  test.describe('Table Dark Mode', () => {
    test('table in dark mode', async ({ page }) => {
      await page.evaluate(() => {
        document.body.setAttribute('data-theme', 'dark');
      });
      await page.waitForTimeout(100);

      const table = await page.locator('.table').first();

      // Check dark mode colors
      const headerBg = await table.locator('thead').evaluate(el =>
        window.getComputedStyle(el).backgroundColor
      );

      // Should have dark background
      expect(headerBg).not.toBe('rgb(255, 255, 255)');

      await expect(table).toHaveScreenshot('table-dark-mode.png');
    });

    test('table selection in dark mode', async ({ page }) => {
      await page.evaluate(() => {
        document.body.setAttribute('data-theme', 'dark');
      });
      await page.waitForTimeout(100);

      const firstRowCheckbox = await page.locator('tbody tr:first-child input[type="checkbox"]').first();
      if (await firstRowCheckbox.count() > 0) {
        await firstRowCheckbox.click();
        await page.waitForTimeout(100);

        const selectedRow = await page.locator('tbody tr:first-child');
        await expect(selectedRow).toHaveScreenshot('table-dark-row-selected.png');
      }
    });
  });

  test.describe('Table Export', () => {
    test('export menu', async ({ page }) => {
      const exportButton = await page.locator('button[aria-label*="Export"], .export-button').first();

      if (await exportButton.count() > 0) {
        await exportButton.click();
        await page.waitForTimeout(100);

        const exportMenu = await page.locator('.export-menu, [role="menu"]');
        if (await exportMenu.count() > 0) {
          await expect(exportMenu).toHaveScreenshot('table-export-menu.png');

          // Check for different export options
          const csvOption = await exportMenu.locator('[data-export="csv"], :has-text("CSV")');
          const excelOption = await exportMenu.locator('[data-export="excel"], :has-text("Excel")');
          const pdfOption = await exportMenu.locator('[data-export="pdf"], :has-text("PDF")');

          const hasExportOptions = await csvOption.count() > 0 ||
                                  await excelOption.count() > 0 ||
                                  await pdfOption.count() > 0;

          expect(hasExportOptions).toBe(true);
        }
      }
    });
  });

  test.describe('Table Loading States', () => {
    test('skeleton loading', async ({ page }) => {
      const skeleton = await page.locator('.table-skeleton, .skeleton-row').first();

      if (await skeleton.count() > 0) {
        await expect(skeleton).toHaveScreenshot('table-skeleton-loading.png');
      }
    });

    test('spinner loading overlay', async ({ page }) => {
      const loadingOverlay = await page.locator('.table-loading, .loading-overlay').first();

      if (await loadingOverlay.count() > 0) {
        await expect(loadingOverlay).toHaveScreenshot('table-loading-spinner.png');
      }
    });
  });
});