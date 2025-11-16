/**
 * Table Selection & Keyboard Navigation Tests
 * Tests row selection, bulk actions, and keyboard interactions
 */

import { test, expect } from '@playwright/test';

test.describe('Table Component - Selection & Keyboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test-fixtures/table-selection.html');
  });

  test('should handle single row selection', async ({ page }) => {
    await page.evaluate(() => {
      const container = document.createElement('div');
      container.id = 'single-select';
      document.body.appendChild(container);

      const table = new (window as any).Table('#single-select', {
        columns: [
          { id: 'name', header: 'Name' }
        ],
        rows: [
          { id: '1', data: { name: 'Row 1' } },
          { id: '2', data: { name: 'Row 2' } },
          { id: '3', data: { name: 'Row 3' } }
        ],
        selectable: true,
        multiSelect: false
      });

      (window as any).singleSelectTable = table;
    });

    // Select first row
    await page.click('#single-select tbody tr:nth-child(1) input[type="checkbox"]');
    let selected = await page.evaluate(() => (window as any).singleSelectTable.getSelectedRows());
    expect(selected).toHaveLength(1);
    expect(selected[0].id).toBe('1');

    // Select second row (should deselect first)
    await page.click('#single-select tbody tr:nth-child(2) input[type="checkbox"]');
    selected = await page.evaluate(() => (window as any).singleSelectTable.getSelectedRows());
    expect(selected).toHaveLength(1);
    expect(selected[0].id).toBe('2');
  });

  test('should handle multi-row selection', async ({ page }) => {
    await page.evaluate(() => {
      const container = document.createElement('div');
      container.id = 'multi-select';
      document.body.appendChild(container);

      const table = new (window as any).Table('#multi-select', {
        columns: [
          { id: 'name', header: 'Name' }
        ],
        rows: [
          { id: '1', data: { name: 'Row 1' } },
          { id: '2', data: { name: 'Row 2' } },
          { id: '3', data: { name: 'Row 3' } }
        ],
        selectable: true,
        multiSelect: true
      });

      (window as any).multiSelectTable = table;
    });

    // Select multiple rows
    await page.click('#multi-select tbody tr:nth-child(1) input[type="checkbox"]');
    await page.click('#multi-select tbody tr:nth-child(3) input[type="checkbox"]');

    const selected = await page.evaluate(() => (window as any).multiSelectTable.getSelectedRows());
    expect(selected).toHaveLength(2);
    expect(selected.map(r => r.id)).toContain('1');
    expect(selected.map(r => r.id)).toContain('3');
  });

  test('should handle select all functionality', async ({ page }) => {
    await page.evaluate(() => {
      const container = document.createElement('div');
      container.id = 'select-all';
      document.body.appendChild(container);

      const table = new (window as any).Table('#select-all', {
        columns: [
          { id: 'name', header: 'Name' }
        ],
        rows: [
          { id: '1', data: { name: 'Row 1' } },
          { id: '2', data: { name: 'Row 2' } },
          { id: '3', data: { name: 'Row 3' } }
        ],
        selectable: true,
        multiSelect: true
      });

      (window as any).selectAllTable = table;
    });

    // Click select all checkbox
    await page.click('#select-all thead input[type="checkbox"]');

    const selected = await page.evaluate(() => (window as any).selectAllTable.getSelectedRows());
    expect(selected).toHaveLength(3);

    // Unselect all
    await page.click('#select-all thead input[type="checkbox"]');
    const afterUnselect = await page.evaluate(() => (window as any).selectAllTable.getSelectedRows());
    expect(afterUnselect).toHaveLength(0);
  });

  test('should handle shift-click range selection', async ({ page }) => {
    await page.evaluate(() => {
      const container = document.createElement('div');
      container.id = 'range-select';
      document.body.appendChild(container);

      const table = new (window as any).Table('#range-select', {
        columns: [
          { id: 'name', header: 'Name' }
        ],
        rows: Array.from({ length: 10 }, (_, i) => ({
          id: `row-${i}`,
          data: { name: `Row ${i}` }
        })),
        selectable: true,
        multiSelect: true
      });

      (window as any).rangeSelectTable = table;
    });

    // Select first row
    await page.click('#range-select tbody tr:nth-child(2) input[type="checkbox"]');

    // Shift-click fifth row
    await page.click('#range-select tbody tr:nth-child(6) input[type="checkbox"]', {
      modifiers: ['Shift']
    });

    const selected = await page.evaluate(() => (window as any).rangeSelectTable.getSelectedRows());
    expect(selected).toHaveLength(5); // Rows 1-5
    expect(selected.map(r => r.id)).toEqual(['row-1', 'row-2', 'row-3', 'row-4', 'row-5']);
  });

  test('should show/hide bulk action bar', async ({ page }) => {
    await page.evaluate(() => {
      const container = document.createElement('div');
      container.id = 'bulk-actions';
      document.body.appendChild(container);

      new (window as any).Table('#bulk-actions', {
        columns: [
          { id: 'name', header: 'Name' }
        ],
        rows: [
          { id: '1', data: { name: 'Row 1' } },
          { id: '2', data: { name: 'Row 2' } }
        ],
        selectable: true,
        multiSelect: true,
        bulkActions: [
          {
            id: 'delete',
            label: 'Delete',
            handler: () => {}
          }
        ]
      });
    });

    // Bulk bar should be hidden initially
    await expect(page.locator('#bulk-actions .bulk-action-bar')).toHaveCSS('display', 'none');

    // Select a row
    await page.click('#bulk-actions tbody tr:nth-child(1) input[type="checkbox"]');

    // Bulk bar should be visible
    await expect(page.locator('#bulk-actions .bulk-action-bar')).toHaveCSS('display', 'flex');
    await expect(page.locator('#bulk-actions .bulk-action-count')).toContainText('1 item selected');

    // Select another row
    await page.click('#bulk-actions tbody tr:nth-child(2) input[type="checkbox"]');
    await expect(page.locator('#bulk-actions .bulk-action-count')).toContainText('2 items selected');

    // Clear selection
    await page.click('#bulk-actions .bulk-action-bar button:has-text("Clear selection")');
    await expect(page.locator('#bulk-actions .bulk-action-bar')).toHaveCSS('display', 'none');
  });

  test('should handle bulk actions', async ({ page }) => {
    let bulkActionCalled = false;
    let selectedRows: any[] = [];

    await page.exposeFunction('handleBulkAction', (rows: any[]) => {
      bulkActionCalled = true;
      selectedRows = rows;
    });

    await page.evaluate(() => {
      const container = document.createElement('div');
      container.id = 'bulk-handler';
      document.body.appendChild(container);

      new (window as any).Table('#bulk-handler', {
        columns: [
          { id: 'name', header: 'Name' }
        ],
        rows: [
          { id: '1', data: { name: 'Row 1' } },
          { id: '2', data: { name: 'Row 2' } }
        ],
        selectable: true,
        multiSelect: true,
        bulkActions: [
          {
            id: 'export',
            label: 'Export',
            handler: (rows: any[]) => (window as any).handleBulkAction(rows)
          }
        ]
      });
    });

    // Select rows
    await page.click('#bulk-handler tbody tr:nth-child(1) input[type="checkbox"]');
    await page.click('#bulk-handler tbody tr:nth-child(2) input[type="checkbox"]');

    // Click bulk action
    await page.click('#bulk-handler .bulk-action-buttons button:has-text("Export")');
    await page.waitForTimeout(100);

    expect(bulkActionCalled).toBe(true);
    expect(selectedRows).toHaveLength(2);
  });

  test('should handle keyboard navigation', async ({ page }) => {
    await page.evaluate(() => {
      const container = document.createElement('div');
      container.id = 'keyboard-nav';
      document.body.appendChild(container);

      new (window as any).Table('#keyboard-nav', {
        columns: [
          { id: 'id', header: 'ID' },
          { id: 'name', header: 'Name' },
          { id: 'email', header: 'Email' }
        ],
        rows: [
          { id: '1', data: { id: 1, name: 'Row 1', email: 'row1@test.com' } },
          { id: '2', data: { id: 2, name: 'Row 2', email: 'row2@test.com' } },
          { id: '3', data: { id: 3, name: 'Row 3', email: 'row3@test.com' } }
        ],
        keyboardNavigation: true,
        selectable: true,
        multiSelect: true
      });
    });

    // Focus table
    await page.focus('#keyboard-nav table');

    // Navigate down
    await page.keyboard.press('ArrowDown');
    await expect(page.locator('#keyboard-nav tbody tr:nth-child(1)')).toBeFocused();

    // Navigate down again
    await page.keyboard.press('ArrowDown');
    await expect(page.locator('#keyboard-nav tbody tr:nth-child(2)')).toBeFocused();

    // Navigate up
    await page.keyboard.press('ArrowUp');
    await expect(page.locator('#keyboard-nav tbody tr:nth-child(1)')).toBeFocused();

    // Select with Space
    await page.keyboard.press('Space');
    const checked = await page.isChecked('#keyboard-nav tbody tr:nth-child(1) input[type="checkbox"]');
    expect(checked).toBe(true);

    // Navigate to last row with End
    await page.keyboard.press('End');
    await expect(page.locator('#keyboard-nav tbody tr:nth-child(3)')).toBeFocused();

    // Navigate to first row with Home
    await page.keyboard.press('Home');
    await expect(page.locator('#keyboard-nav tbody tr:nth-child(1)')).toBeFocused();
  });

  test('should handle cell navigation with arrow keys', async ({ page }) => {
    await page.evaluate(() => {
      const container = document.createElement('div');
      container.id = 'cell-nav';
      document.body.appendChild(container);

      new (window as any).Table('#cell-nav', {
        columns: [
          { id: 'col1', header: 'Column 1' },
          { id: 'col2', header: 'Column 2' },
          { id: 'col3', header: 'Column 3' }
        ],
        rows: [
          { id: '1', data: { col1: 'A1', col2: 'B1', col3: 'C1' } },
          { id: '2', data: { col1: 'A2', col2: 'B2', col3: 'C2' } }
        ],
        keyboardNavigation: true
      });
    });

    await page.focus('#cell-nav table');
    await page.keyboard.press('ArrowDown'); // Focus first row

    // Navigate right through cells
    await page.keyboard.press('ArrowRight');
    const focusedCell1 = await page.evaluate(() => document.activeElement?.textContent);
    expect(focusedCell1).toContain('A1');

    await page.keyboard.press('ArrowRight');
    const focusedCell2 = await page.evaluate(() => document.activeElement?.textContent);
    expect(focusedCell2).toContain('B1');

    // Navigate left
    await page.keyboard.press('ArrowLeft');
    const focusedCell3 = await page.evaluate(() => document.activeElement?.textContent);
    expect(focusedCell3).toContain('A1');
  });

  test('should respect disabled rows', async ({ page }) => {
    await page.evaluate(() => {
      const container = document.createElement('div');
      container.id = 'disabled-rows';
      document.body.appendChild(container);

      new (window as any).Table('#disabled-rows', {
        columns: [
          { id: 'name', header: 'Name' }
        ],
        rows: [
          { id: '1', data: { name: 'Enabled Row' } },
          { id: '2', data: { name: 'Disabled Row' }, disabled: true },
          { id: '3', data: { name: 'Another Enabled' } }
        ],
        selectable: true,
        multiSelect: true
      });
    });

    // Check disabled row has correct attributes
    const disabledRow = page.locator('#disabled-rows tbody tr:nth-child(2)');
    await expect(disabledRow).toHaveClass(/table-row-disabled/);
    await expect(disabledRow).toHaveAttribute('aria-disabled', 'true');

    // Checkbox should be disabled
    const disabledCheckbox = disabledRow.locator('input[type="checkbox"]');
    await expect(disabledCheckbox).toBeDisabled();

    // Select all should skip disabled rows
    await page.click('#disabled-rows thead input[type="checkbox"]');

    const enabledCheckbox1 = page.locator('#disabled-rows tbody tr:nth-child(1) input[type="checkbox"]');
    const enabledCheckbox3 = page.locator('#disabled-rows tbody tr:nth-child(3) input[type="checkbox"]');

    await expect(enabledCheckbox1).toBeChecked();
    await expect(disabledCheckbox).not.toBeChecked();
    await expect(enabledCheckbox3).toBeChecked();
  });

  test('should trigger selection change events', async ({ page }) => {
    let selectionChanges: any[] = [];

    await page.exposeFunction('onSelectionChange', (selected: any[]) => {
      selectionChanges.push(selected);
    });

    await page.evaluate(() => {
      const container = document.createElement('div');
      container.id = 'selection-events';
      document.body.appendChild(container);

      new (window as any).Table('#selection-events', {
        columns: [
          { id: 'name', header: 'Name' }
        ],
        rows: [
          { id: '1', data: { name: 'Row 1' } },
          { id: '2', data: { name: 'Row 2' } }
        ],
        selectable: true,
        multiSelect: true,
        onSelectionChange: (selected: any[]) => (window as any).onSelectionChange(selected)
      });
    });

    // Select first row
    await page.click('#selection-events tbody tr:nth-child(1) input[type="checkbox"]');
    await page.waitForTimeout(100);

    expect(selectionChanges).toHaveLength(1);
    expect(selectionChanges[0]).toHaveLength(1);
    expect(selectionChanges[0][0].id).toBe('1');

    // Select second row
    await page.click('#selection-events tbody tr:nth-child(2) input[type="checkbox"]');
    await page.waitForTimeout(100);

    expect(selectionChanges).toHaveLength(2);
    expect(selectionChanges[1]).toHaveLength(2);

    // Deselect all
    await page.click('#selection-events thead input[type="checkbox"]');
    await page.waitForTimeout(100);

    expect(selectionChanges).toHaveLength(3);
    expect(selectionChanges[2]).toHaveLength(0);
  });

  test('should handle programmatic selection', async ({ page }) => {
    await page.evaluate(() => {
      const container = document.createElement('div');
      container.id = 'prog-select';
      document.body.appendChild(container);

      const table = new (window as any).Table('#prog-select', {
        columns: [
          { id: 'name', header: 'Name' }
        ],
        rows: [
          { id: 'row1', data: { name: 'Row 1' } },
          { id: 'row2', data: { name: 'Row 2' } },
          { id: 'row3', data: { name: 'Row 3' } }
        ],
        selectable: true,
        multiSelect: true
      });

      (window as any).progSelectTable = table;
    });

    // Programmatically select rows
    await page.evaluate(() => {
      (window as any).progSelectTable.selectRows(['row1', 'row3']);
    });

    const checkbox1 = page.locator('#prog-select tbody tr:nth-child(1) input[type="checkbox"]');
    const checkbox2 = page.locator('#prog-select tbody tr:nth-child(2) input[type="checkbox"]');
    const checkbox3 = page.locator('#prog-select tbody tr:nth-child(3) input[type="checkbox"]');

    await expect(checkbox1).toBeChecked();
    await expect(checkbox2).not.toBeChecked();
    await expect(checkbox3).toBeChecked();

    // Verify selected rows
    const selected = await page.evaluate(() => (window as any).progSelectTable.getSelectedRows());
    expect(selected.map(r => r.id)).toEqual(['row1', 'row3']);
  });
});