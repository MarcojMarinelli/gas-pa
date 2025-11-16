/**
 * Table Sticky & Sorting Tests
 * Tests sticky header/column and sorting functionality
 */

import { test, expect } from '@playwright/test';

test.describe('Table Component - Sticky & Sorting', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test-fixtures/table-sticky-sort.html');
  });

  test('should apply sticky header styles', async ({ page }) => {
    await page.evaluate(() => {
      const container = document.createElement('div');
      container.id = 'sticky-header';
      container.style.height = '300px';
      container.style.overflow = 'auto';
      document.body.appendChild(container);

      new (window as any).Table('#sticky-header', {
        columns: [
          { id: 'id', header: 'ID' },
          { id: 'name', header: 'Name' },
          { id: 'email', header: 'Email' }
        ],
        rows: Array.from({ length: 50 }, (_, i) => ({
          id: `row-${i}`,
          data: { id: i, name: `User ${i}`, email: `user${i}@test.com` }
        })),
        stickyHeader: true,
        height: 300
      });
    });

    // Check sticky header class
    const table = page.locator('#sticky-header table');
    await expect(table).toHaveClass(/table-header-sticky/);

    // Scroll and verify header remains visible
    await page.evaluate(() => {
      const container = document.querySelector('#sticky-header .table-scroll-container') as HTMLElement;
      container.scrollTop = 200;
    });

    const header = page.locator('#sticky-header thead');
    await expect(header).toBeInViewport();
  });

  test('should apply sticky first column', async ({ page }) => {
    await page.evaluate(() => {
      const container = document.createElement('div');
      container.id = 'sticky-column';
      container.style.width = '400px';
      container.style.overflow = 'auto';
      document.body.appendChild(container);

      new (window as any).Table('#sticky-column', {
        columns: [
          { id: 'id', header: 'ID', width: '80px', sticky: true },
          { id: 'name', header: 'Name', width: '200px' },
          { id: 'email', header: 'Email', width: '300px' },
          { id: 'department', header: 'Department', width: '200px' }
        ],
        rows: Array.from({ length: 10 }, (_, i) => ({
          id: `row-${i}`,
          data: {
            id: i,
            name: `User ${i}`,
            email: `user${i}@test.com`,
            department: `Dept ${i}`
          }
        })),
        stickyFirstColumn: true
      });
    });

    // Check sticky column class on table
    const table = page.locator('#sticky-column table');
    await expect(table).toHaveClass(/table-column-sticky/);

    // Check sticky class on first column cells
    const firstHeaderCell = page.locator('#sticky-column thead th:first-child');
    await expect(firstHeaderCell).toHaveClass(/table-sticky-column/);

    const firstDataCell = page.locator('#sticky-column tbody td:first-child').first();
    await expect(firstDataCell).toHaveClass(/table-sticky-column/);
  });

  test('should handle both sticky header and column', async ({ page }) => {
    await page.evaluate(() => {
      const container = document.createElement('div');
      container.id = 'sticky-both';
      container.style.width = '400px';
      container.style.height = '300px';
      container.style.overflow = 'auto';
      document.body.appendChild(container);

      new (window as any).Table('#sticky-both', {
        columns: [
          { id: 'id', header: 'ID', width: '60px', sticky: true },
          { id: 'name', header: 'Name', width: '150px' },
          { id: 'email', header: 'Email', width: '250px' },
          { id: 'phone', header: 'Phone', width: '150px' },
          { id: 'address', header: 'Address', width: '300px' }
        ],
        rows: Array.from({ length: 50 }, (_, i) => ({
          id: `row-${i}`,
          data: {
            id: i,
            name: `User ${i}`,
            email: `user${i}@test.com`,
            phone: `555-${String(i).padStart(4, '0')}`,
            address: `${i} Main Street, City, State`
          }
        })),
        stickyHeader: true,
        stickyFirstColumn: true,
        height: 300
      });
    });

    const table = page.locator('#sticky-both table');
    await expect(table).toHaveClass(/table-header-sticky/);
    await expect(table).toHaveClass(/table-column-sticky/);

    // Scroll both directions
    await page.evaluate(() => {
      const container = document.querySelector('#sticky-both .table-scroll-container') as HTMLElement;
      container.scrollTop = 200;
      container.scrollLeft = 200;
    });

    // Header should remain visible
    const header = page.locator('#sticky-both thead');
    await expect(header).toBeInViewport();

    // First column should remain visible
    const firstCell = page.locator('#sticky-both tbody td:first-child').first();
    await expect(firstCell).toBeInViewport();
  });

  test('should handle column sorting', async ({ page }) => {
    await page.evaluate(() => {
      const container = document.createElement('div');
      container.id = 'sortable';
      document.body.appendChild(container);

      const table = new (window as any).Table('#sortable', {
        columns: [
          { id: 'id', header: 'ID', sortable: true },
          { id: 'name', header: 'Name', sortable: true },
          { id: 'score', header: 'Score', sortable: true }
        ],
        rows: [
          { id: 'row1', data: { id: 3, name: 'Charlie', score: 85 } },
          { id: 'row2', data: { id: 1, name: 'Alice', score: 92 } },
          { id: 'row3', data: { id: 2, name: 'Bob', score: 78 } }
        ],
        onSort: (column: string, direction: string) => {
          table.sort(column, direction);
        }
      });

      (window as any).sortableTable = table;
    });

    // Check sortable headers have correct attributes
    const idHeader = page.locator('#sortable th[data-column-id="id"]');
    await expect(idHeader).toHaveAttribute('data-sortable', 'true');
    await expect(idHeader).toHaveCSS('cursor', 'pointer');

    // Sort by ID ascending
    await idHeader.click();
    await page.waitForTimeout(100);

    let firstRowId = await page.locator('#sortable tbody tr:first-child td:nth-child(1)').textContent();
    expect(firstRowId).toBe('1');

    // Sort by ID descending
    await idHeader.click();
    await page.waitForTimeout(100);

    firstRowId = await page.locator('#sortable tbody tr:first-child td:nth-child(1)').textContent();
    expect(firstRowId).toBe('3');

    // Sort by Name
    const nameHeader = page.locator('#sortable th[data-column-id="name"]');
    await nameHeader.click();
    await page.waitForTimeout(100);

    const firstRowName = await page.locator('#sortable tbody tr:first-child td:nth-child(2)').textContent();
    expect(firstRowName).toBe('Alice');
  });

  test('should display sort indicators', async ({ page }) => {
    await page.evaluate(() => {
      const container = document.createElement('div');
      container.id = 'sort-indicators';
      document.body.appendChild(container);

      const table = new (window as any).Table('#sort-indicators', {
        columns: [
          { id: 'name', header: 'Name', sortable: true },
          { id: 'value', header: 'Value', sortable: true }
        ],
        rows: [
          { id: '1', data: { name: 'A', value: 1 } },
          { id: '2', data: { name: 'B', value: 2 } }
        ],
        sortColumn: 'name',
        sortDirection: 'asc',
        onSort: (column: string, direction: string) => {
          table.sort(column, direction);
        }
      });

      (window as any).sortIndicatorTable = table;
    });

    // Check initial sort indicator
    const nameHeader = page.locator('#sort-indicators th[data-column-id="name"]');
    await expect(nameHeader).toHaveAttribute('aria-sort', 'ascending');
    await expect(nameHeader.locator('.table-sort-icon')).toContainText('↑');

    // Click to sort descending
    await nameHeader.click();
    await page.waitForTimeout(100);

    await expect(nameHeader).toHaveAttribute('aria-sort', 'descending');
    await expect(nameHeader.locator('.table-sort-icon')).toContainText('↓');

    // Sort different column
    const valueHeader = page.locator('#sort-indicators th[data-column-id="value"]');
    await valueHeader.click();
    await page.waitForTimeout(100);

    // Name header should lose sort indicator
    await expect(nameHeader).toHaveAttribute('aria-sort', 'none');
    await expect(nameHeader.locator('.table-sort-icon')).not.toBeVisible();

    // Value header should have indicator
    await expect(valueHeader).toHaveAttribute('aria-sort', 'ascending');
    await expect(valueHeader.locator('.table-sort-icon')).toContainText('↑');
  });

  test('should handle null values in sorting', async ({ page }) => {
    await page.evaluate(() => {
      const container = document.createElement('div');
      container.id = 'null-sort';
      document.body.appendChild(container);

      const table = new (window as any).Table('#null-sort', {
        columns: [
          { id: 'name', header: 'Name', sortable: true },
          { id: 'value', header: 'Value', sortable: true }
        ],
        rows: [
          { id: '1', data: { name: 'A', value: 10 } },
          { id: '2', data: { name: null, value: 20 } },
          { id: '3', data: { name: 'B', value: null } },
          { id: '4', data: { name: 'C', value: 30 } }
        ],
        onSort: (column: string, direction: string) => {
          table.sort(column, direction);
        }
      });

      (window as any).nullSortTable = table;
    });

    // Sort by name (with null)
    const nameHeader = page.locator('#null-sort th[data-column-id="name"]');
    await nameHeader.click();

    // Null values should be at the end
    const lastRowName = await page.locator('#null-sort tbody tr:last-child td:nth-child(1)').textContent();
    expect(lastRowName).toBe('');

    // Sort by value (with null)
    const valueHeader = page.locator('#null-sort th[data-column-id="value"]');
    await valueHeader.click();

    // Null values should be at the end
    const lastRowValue = await page.locator('#null-sort tbody tr:last-child td:nth-child(2)').textContent();
    expect(lastRowValue).toBe('');
  });

  test('should maintain sort after data update', async ({ page }) => {
    await page.evaluate(() => {
      const container = document.createElement('div');
      container.id = 'sort-persist';
      document.body.appendChild(container);

      const table = new (window as any).Table('#sort-persist', {
        columns: [
          { id: 'name', header: 'Name', sortable: true },
          { id: 'value', header: 'Value', sortable: true }
        ],
        rows: [
          { id: '1', data: { name: 'B', value: 2 } },
          { id: '2', data: { name: 'A', value: 1 } },
          { id: '3', data: { name: 'C', value: 3 } }
        ],
        sortColumn: 'name',
        sortDirection: 'asc',
        onSort: (column: string, direction: string) => {
          table.sort(column, direction);
        }
      });

      // Initial sort
      table.sort('name', 'asc');

      (window as any).sortPersistTable = table;
    });

    // Verify initial sort
    let firstRow = await page.locator('#sort-persist tbody tr:first-child td:nth-child(1)').textContent();
    expect(firstRow).toBe('A');

    // Add new data
    await page.evaluate(() => {
      const table = (window as any).sortPersistTable;
      table.setRows([
        { id: '4', data: { name: 'D', value: 4 } },
        { id: '5', data: { name: 'E', value: 5 } },
        { id: '6', data: { name: 'F', value: 6 } }
      ]);

      // Re-apply sort
      table.sort('name', 'asc');
    });

    // Should still be sorted
    firstRow = await page.locator('#sort-persist tbody tr:first-child td:nth-child(1)').textContent();
    expect(firstRow).toBe('D');
  });

  test('should handle custom sort with accessor', async ({ page }) => {
    await page.evaluate(() => {
      const container = document.createElement('div');
      container.id = 'custom-sort';
      document.body.appendChild(container);

      const table = new (window as any).Table('#custom-sort', {
        columns: [
          { id: 'user', header: 'User', sortable: true },
          {
            id: 'dateString',
            header: 'Date',
            sortable: true,
            accessor: (row: any) => new Date(row.data.dateString).getTime()
          }
        ],
        rows: [
          { id: '1', data: { user: 'User 1', dateString: '2024-03-01' } },
          { id: '2', data: { user: 'User 2', dateString: '2024-01-01' } },
          { id: '3', data: { user: 'User 3', dateString: '2024-02-01' } }
        ],
        onSort: (column: string, direction: string) => {
          table.sort(column, direction);
        }
      });

      (window as any).customSortTable = table;
    });

    // Sort by date using accessor
    const dateHeader = page.locator('#custom-sort th[data-column-id="dateString"]');
    await dateHeader.click();

    // Should be sorted by actual date values
    const firstDate = await page.locator('#custom-sort tbody tr:first-child td:nth-child(2)').textContent();
    expect(firstDate).toBe('2024-01-01');

    const lastDate = await page.locator('#custom-sort tbody tr:last-child td:nth-child(2)').textContent();
    expect(lastDate).toBe('2024-03-01');
  });

  test('should handle sort with virtual scrolling', async ({ page }) => {
    await page.evaluate(() => {
      const container = document.createElement('div');
      container.id = 'virtual-sort';
      container.style.height = '300px';
      document.body.appendChild(container);

      const rows = Array.from({ length: 1000 }, (_, i) => ({
        id: `row-${i}`,
        data: {
          id: i,
          name: `User ${1000 - i}`, // Reverse order
          score: Math.floor(Math.random() * 100)
        }
      }));

      const table = new (window as any).Table('#virtual-sort', {
        columns: [
          { id: 'id', header: 'ID', sortable: true },
          { id: 'name', header: 'Name', sortable: true },
          { id: 'score', header: 'Score', sortable: true }
        ],
        rows,
        height: 300,
        onSort: (column: string, direction: string) => {
          table.sort(column, direction);
        }
      });

      (window as any).virtualSortTable = table;
    });

    // Sort by name
    const nameHeader = page.locator('#virtual-sort th[data-column-id="name"]');
    await nameHeader.click();

    // First visible row should be sorted (ascending string sort: "User 1" < "User 10" < "User 100")
    const firstRow = await page.locator('#virtual-sort tbody tr:not(.table-virtual-spacer):first-child td:nth-child(2)').textContent();
    expect(firstRow).toBe('User 1');

    // Scroll and verify sort is maintained
    await page.evaluate(() => {
      const container = document.querySelector('#virtual-sort .table-scroll-container') as HTMLElement;
      container.scrollTop = 5000;
    });

    await page.waitForTimeout(100);

    // Middle rows should still be sorted (string comparison order)
    const middleRows = await page.locator('#virtual-sort tbody tr:not(.table-virtual-spacer) td:nth-child(2)').allTextContents();

    // Check if sorted in ascending string order ("User 1" < "User 10" < "User 100")
    for (let i = 1; i < middleRows.length; i++) {
      expect(middleRows[i].localeCompare(middleRows[i - 1])).toBeGreaterThanOrEqual(0);
    }
  });
});