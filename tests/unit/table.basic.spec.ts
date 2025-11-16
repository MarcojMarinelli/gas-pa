/**
 * Basic Table Component Tests
 * Tests fundamental table rendering and structure
 */

import { test, expect } from '@playwright/test';
import { Table, TableColumn, TableRow, createTable } from '../../src/ui/components/Table';

test.describe('Table Component - Basic Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test-fixtures/table-basic.html');
  });

  test('should render table with correct structure', async ({ page }) => {
    await page.evaluate(() => {
      const container = document.createElement('div');
      container.id = 'test-table';
      document.body.appendChild(container);

      const table = new (window as any).Table('#test-table', {
        columns: [
          { id: 'name', header: 'Name' },
          { id: 'email', header: 'Email' }
        ],
        rows: [
          { id: '1', data: { name: 'John Doe', email: 'john@example.com' } },
          { id: '2', data: { name: 'Jane Smith', email: 'jane@example.com' } }
        ]
      });
    });

    // Check table structure
    await expect(page.locator('#test-table table')).toBeVisible();
    await expect(page.locator('#test-table thead')).toBeVisible();
    await expect(page.locator('#test-table tbody')).toBeVisible();

    // Check headers
    const headers = page.locator('#test-table thead th');
    await expect(headers).toHaveCount(2);
    await expect(headers.nth(0)).toContainText('Name');
    await expect(headers.nth(1)).toContainText('Email');

    // Check rows
    const rows = page.locator('#test-table tbody tr');
    await expect(rows).toHaveCount(2);
  });

  test('should display empty state when no data', async ({ page }) => {
    await page.evaluate(() => {
      const container = document.createElement('div');
      container.id = 'empty-table';
      document.body.appendChild(container);

      new (window as any).Table('#empty-table', {
        columns: [
          { id: 'name', header: 'Name' }
        ],
        rows: [],
        emptyMessage: 'No data available'
      });
    });

    await expect(page.locator('#empty-table .table-state-cell')).toBeVisible();
    await expect(page.locator('#empty-table .table-state-cell')).toContainText('No data available');
  });

  test('should display loading state', async ({ page }) => {
    await page.evaluate(() => {
      const container = document.createElement('div');
      container.id = 'loading-table';
      document.body.appendChild(container);

      new (window as any).Table('#loading-table', {
        columns: [
          { id: 'name', header: 'Name' }
        ],
        rows: [],
        loading: true
      });
    });

    await expect(page.locator('#loading-table .spinner')).toBeVisible();
    await expect(page.locator('#loading-table .spinner')).toHaveAttribute('role', 'status');
  });

  test('should apply column widths correctly', async ({ page }) => {
    await page.evaluate(() => {
      const container = document.createElement('div');
      container.id = 'width-table';
      document.body.appendChild(container);

      new (window as any).Table('#width-table', {
        columns: [
          { id: 'id', header: 'ID', width: '80px' },
          { id: 'name', header: 'Name', width: '200px' },
          { id: 'email', header: 'Email' }
        ],
        rows: [
          { id: '1', data: { id: 1, name: 'Test', email: 'test@example.com' } }
        ]
      });
    });

    const firstHeader = page.locator('#width-table thead th').nth(0);
    await expect(firstHeader).toHaveCSS('width', '80px');

    const secondHeader = page.locator('#width-table thead th').nth(1);
    await expect(secondHeader).toHaveCSS('width', '200px');
  });

  test('should align columns correctly', async ({ page }) => {
    await page.evaluate(() => {
      const container = document.createElement('div');
      container.id = 'align-table';
      document.body.appendChild(container);

      new (window as any).Table('#align-table', {
        columns: [
          { id: 'name', header: 'Name', align: 'left' },
          { id: 'amount', header: 'Amount', align: 'right' },
          { id: 'status', header: 'Status', align: 'center' }
        ],
        rows: [
          { id: '1', data: { name: 'Test', amount: 100, status: 'Active' } }
        ]
      });
    });

    const cells = page.locator('#align-table tbody td');
    await expect(cells.nth(0)).toHaveCSS('text-align', 'left');
    await expect(cells.nth(1)).toHaveCSS('text-align', 'right');
    await expect(cells.nth(2)).toHaveCSS('text-align', 'center');
  });

  test('should handle custom renderers', async ({ page }) => {
    await page.evaluate(() => {
      const container = document.createElement('div');
      container.id = 'custom-table';
      document.body.appendChild(container);

      new (window as any).Table('#custom-table', {
        columns: [
          { id: 'name', header: 'Name' },
          {
            id: 'status',
            header: 'Status',
            render: (value: string) => {
              const span = document.createElement('span');
              span.className = 'custom-badge';
              span.textContent = value.toUpperCase();
              return span;
            }
          }
        ],
        rows: [
          { id: '1', data: { name: 'Test', status: 'active' } }
        ]
      });
    });

    const customCell = page.locator('#custom-table .custom-badge');
    await expect(customCell).toBeVisible();
    await expect(customCell).toHaveText('ACTIVE');
  });

  test('should handle row click events', async ({ page }) => {
    let clickedRow: any = null;

    await page.exposeFunction('handleRowClick', (row: any) => {
      clickedRow = row;
    });

    await page.evaluate(() => {
      const container = document.createElement('div');
      container.id = 'clickable-table';
      document.body.appendChild(container);

      new (window as any).Table('#clickable-table', {
        columns: [
          { id: 'name', header: 'Name' }
        ],
        rows: [
          { id: '1', data: { name: 'Click Me' } }
        ],
        onRowClick: (row: any) => (window as any).handleRowClick(row)
      });
    });

    await page.click('#clickable-table tbody tr');
    await page.waitForTimeout(100);

    expect(clickedRow).toBeTruthy();
    expect(clickedRow.id).toBe('1');
    expect(clickedRow.data.name).toBe('Click Me');
  });

  test('should update rows dynamically', async ({ page }) => {
    await page.evaluate(() => {
      const container = document.createElement('div');
      container.id = 'dynamic-table';
      document.body.appendChild(container);

      const table = new (window as any).Table('#dynamic-table', {
        columns: [
          { id: 'name', header: 'Name' }
        ],
        rows: [
          { id: '1', data: { name: 'Initial' } }
        ]
      });

      (window as any).dynamicTable = table;
    });

    // Initial state
    await expect(page.locator('#dynamic-table tbody tr')).toHaveCount(1);
    await expect(page.locator('#dynamic-table tbody tr')).toContainText('Initial');

    // Update rows
    await page.evaluate(() => {
      (window as any).dynamicTable.setRows([
        { id: '2', data: { name: 'Updated 1' } },
        { id: '3', data: { name: 'Updated 2' } }
      ]);
    });

    await expect(page.locator('#dynamic-table tbody tr')).toHaveCount(2);
    await expect(page.locator('#dynamic-table tbody tr').first()).toContainText('Updated 1');
    await expect(page.locator('#dynamic-table tbody tr').last()).toContainText('Updated 2');
  });

  test('should respect ARIA attributes', async ({ page }) => {
    await page.evaluate(() => {
      const container = document.createElement('div');
      container.id = 'aria-table';
      document.body.appendChild(container);

      new (window as any).Table('#aria-table', {
        columns: [
          { id: 'name', header: 'Name' }
        ],
        rows: [
          { id: '1', data: { name: 'Test' } }
        ],
        ariaLabel: 'Test data table'
      });
    });

    const table = page.locator('#aria-table table');
    await expect(table).toHaveAttribute('role', 'table');
    await expect(table).toHaveAttribute('aria-label', 'Test data table');
  });

  test('should clean up on destroy', async ({ page }) => {
    await page.evaluate(() => {
      const container = document.createElement('div');
      container.id = 'destroy-table';
      document.body.appendChild(container);

      const table = new (window as any).Table('#destroy-table', {
        columns: [
          { id: 'name', header: 'Name' }
        ],
        rows: [
          { id: '1', data: { name: 'Test' } }
        ]
      });

      (window as any).destroyableTable = table;
    });

    // Table should exist
    await expect(page.locator('#destroy-table table')).toBeVisible();

    // Destroy table
    await page.evaluate(() => {
      (window as any).destroyableTable.destroy();
    });

    // Container should be empty
    const containerContent = await page.locator('#destroy-table').innerHTML();
    expect(containerContent).toBe('');
  });
});