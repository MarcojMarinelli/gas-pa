/**
 * Table Virtual Scrolling Tests
 * Tests performance and functionality for large datasets
 */

import { test, expect } from '@playwright/test';

test.describe('Table Component - Virtual Scrolling', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test-fixtures/table-virtual.html');
  });

  test('should handle large datasets efficiently', async ({ page }) => {
    const renderTime = await page.evaluate(() => {
      const container = document.createElement('div');
      container.id = 'virtual-table';
      container.style.height = '400px';
      document.body.appendChild(container);

      // Generate large dataset
      const rows = Array.from({ length: 10000 }, (_, i) => ({
        id: `row-${i}`,
        data: {
          id: i,
          name: `User ${i}`,
          email: `user${i}@example.com`,
          score: Math.floor(Math.random() * 100)
        }
      }));

      const startTime = performance.now();

      new (window as any).Table('#virtual-table', {
        columns: [
          { id: 'id', header: 'ID' },
          { id: 'name', header: 'Name' },
          { id: 'email', header: 'Email' },
          { id: 'score', header: 'Score' }
        ],
        rows,
        height: 400,
        virtualScrollBuffer: 5
      });

      return performance.now() - startTime;
    });

    // Should render quickly even with 10k rows
    expect(renderTime).toBeLessThan(500);

    // Should only render visible rows plus buffer
    const visibleRows = await page.locator('#virtual-table tbody tr:not(.table-virtual-spacer)').count();
    expect(visibleRows).toBeLessThan(30); // ~10 visible + 10 buffer
  });

  test('should maintain scroll position on re-render', async ({ page }) => {
    await page.evaluate(() => {
      const container = document.createElement('div');
      container.id = 'scroll-table';
      container.style.height = '300px';
      document.body.appendChild(container);

      const rows = Array.from({ length: 1000 }, (_, i) => ({
        id: `row-${i}`,
        data: { id: i, name: `User ${i}` }
      }));

      const table = new (window as any).Table('#scroll-table', {
        columns: [
          { id: 'id', header: 'ID' },
          { id: 'name', header: 'Name' }
        ],
        rows,
        height: 300
      });

      (window as any).scrollTable = table;
    });

    // Scroll to middle
    await page.evaluate(() => {
      const container = document.querySelector('#scroll-table .table-scroll-container') as HTMLElement;
      container.scrollTop = 2000;
      return container.scrollTop;
    });

    const initialScrollTop = await page.evaluate(() => {
      return (document.querySelector('#scroll-table .table-scroll-container') as HTMLElement).scrollTop;
    });

    // Update table config
    await page.evaluate(() => {
      (window as any).scrollTable.update({ emptyMessage: 'Updated' });
    });

    const afterScrollTop = await page.evaluate(() => {
      return (document.querySelector('#scroll-table .table-scroll-container') as HTMLElement).scrollTop;
    });

    expect(Math.abs(afterScrollTop - initialScrollTop)).toBeLessThan(10);
  });

  test('should handle scroll to specific row', async ({ page }) => {
    await page.evaluate(() => {
      const container = document.createElement('div');
      container.id = 'jump-table';
      container.style.height = '300px';
      document.body.appendChild(container);

      const rows = Array.from({ length: 500 }, (_, i) => ({
        id: `row-${i}`,
        data: { id: i, name: `User ${i}` }
      }));

      const table = new (window as any).Table('#jump-table', {
        columns: [
          { id: 'id', header: 'ID' },
          { id: 'name', header: 'Name' }
        ],
        rows,
        height: 300,
        rowHeight: 48
      });

      (window as any).jumpTable = table;
    });

    // Scroll to row 250
    await page.evaluate(() => {
      (window as any).jumpTable.scrollToRow('row-250');
    });

    await page.waitForTimeout(300); // Wait for scroll animation

    const scrollTop = await page.evaluate(() => {
      return (document.querySelector('#jump-table .table-scroll-container') as HTMLElement).scrollTop;
    });

    // Row 250 * 48px height = 12000px
    expect(scrollTop).toBeGreaterThan(11000);
    expect(scrollTop).toBeLessThan(13000);
  });

  test('should calculate visible range correctly', async ({ page }) => {
    const visibleIndices = await page.evaluate(() => {
      const container = document.createElement('div');
      container.id = 'range-table';
      container.style.height = '240px'; // Exactly 5 rows at 48px
      document.body.appendChild(container);

      const rows = Array.from({ length: 100 }, (_, i) => ({
        id: `row-${i}`,
        data: { id: i, name: `User ${i}` }
      }));

      const table = new (window as any).Table('#range-table', {
        columns: [
          { id: 'id', header: 'ID' },
          { id: 'name', header: 'Name' }
        ],
        rows,
        height: 240,
        rowHeight: 48,
        virtualScrollBuffer: 2
      });

      // Get rendered row indices
      const renderedRows = Array.from(
        document.querySelectorAll('#range-table tbody tr:not(.table-virtual-spacer)')
      );

      return renderedRows.map(row => {
        const text = row.querySelector('td')?.textContent || '';
        return parseInt(text, 10);
      });
    });

    // Should render 0-8 (5 visible + 2 buffer before + 2 after)
    expect(visibleIndices[0]).toBe(0);
    expect(visibleIndices.length).toBeLessThanOrEqual(9);
  });

  test('should handle dynamic row height changes', async ({ page }) => {
    await page.evaluate(() => {
      const container = document.createElement('div');
      container.id = 'density-table';
      container.style.height = '400px';
      document.body.appendChild(container);

      const rows = Array.from({ length: 100 }, (_, i) => ({
        id: `row-${i}`,
        data: { id: i, name: `User ${i}` }
      }));

      const table = new (window as any).Table('#density-table', {
        columns: [
          { id: 'id', header: 'ID' },
          { id: 'name', header: 'Name' }
        ],
        rows,
        height: 400
      });

      (window as any).densityTable = table;
    });

    // Set compact density
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-density', 'compact');
      (window as any).densityTable.update({});
    });

    const compactRowHeight = await page.evaluate(() => {
      const row = document.querySelector('#density-table tbody tr:not(.table-virtual-spacer)') as HTMLElement;
      return row?.offsetHeight || 0;
    });

    expect(compactRowHeight).toBe(40);

    // Set comfortable density
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-density', 'comfortable');
      (window as any).densityTable.update({});
    });

    const comfortableRowHeight = await page.evaluate(() => {
      const row = document.querySelector('#density-table tbody tr:not(.table-virtual-spacer)') as HTMLElement;
      return row?.offsetHeight || 0;
    });

    expect(comfortableRowHeight).toBe(48);
  });

  test('should handle resize events', async ({ page }) => {
    await page.evaluate(() => {
      const container = document.createElement('div');
      container.id = 'resize-table';
      container.style.height = '300px';
      document.body.appendChild(container);

      const rows = Array.from({ length: 100 }, (_, i) => ({
        id: `row-${i}`,
        data: { id: i, name: `User ${i}` }
      }));

      new (window as any).Table('#resize-table', {
        columns: [
          { id: 'id', header: 'ID' },
          { id: 'name', header: 'Name' }
        ],
        rows,
        height: 300
      });
    });

    const initialRowCount = await page.locator('#resize-table tbody tr:not(.table-virtual-spacer)').count();

    // Resize container
    await page.evaluate(() => {
      const container = document.querySelector('#resize-table .table-scroll-container') as HTMLElement;
      container.style.height = '500px';
      // Trigger resize observer
      window.dispatchEvent(new Event('resize'));
    });

    await page.waitForTimeout(100);

    const afterRowCount = await page.locator('#resize-table tbody tr:not(.table-virtual-spacer)').count();

    // Should render more rows after resize
    expect(afterRowCount).toBeGreaterThan(initialRowCount);
  });

  test('should use virtual spacers correctly', async ({ page }) => {
    await page.evaluate(() => {
      const container = document.createElement('div');
      container.id = 'spacer-table';
      container.style.height = '200px';
      document.body.appendChild(container);

      const rows = Array.from({ length: 1000 }, (_, i) => ({
        id: `row-${i}`,
        data: { id: i }
      }));

      new (window as any).Table('#spacer-table', {
        columns: [{ id: 'id', header: 'ID' }],
        rows,
        height: 200,
        rowHeight: 40
      });

      // Scroll to middle
      const scrollContainer = document.querySelector('#spacer-table .table-scroll-container') as HTMLElement;
      scrollContainer.scrollTop = 20000; // Row 500 * 40px
    });

    await page.waitForTimeout(100);

    // Should have spacers
    const spacers = await page.locator('#spacer-table .table-virtual-spacer').count();
    expect(spacers).toBeGreaterThan(0);

    // Get spacer heights
    const spacerHeights = await page.evaluate(() => {
      const spacers = Array.from(document.querySelectorAll('#spacer-table .table-virtual-spacer'));
      return spacers.map(s => (s as HTMLElement).style.height);
    });

    // Spacers should have height
    spacerHeights.forEach(height => {
      expect(parseInt(height, 10)).toBeGreaterThan(0);
    });
  });

  test('should handle empty dataset in virtual mode', async ({ page }) => {
    await page.evaluate(() => {
      const container = document.createElement('div');
      container.id = 'empty-virtual';
      container.style.height = '400px';
      document.body.appendChild(container);

      new (window as any).Table('#empty-virtual', {
        columns: [{ id: 'id', header: 'ID' }],
        rows: [],
        height: 400,
        emptyMessage: 'No virtual data'
      });
    });

    await expect(page.locator('#empty-virtual .table-state-cell')).toBeVisible();
    await expect(page.locator('#empty-virtual .table-state-cell')).toContainText('No virtual data');
  });

  test('should maintain performance with rapid scrolling', async ({ page }) => {
    await page.evaluate(() => {
      const container = document.createElement('div');
      container.id = 'perf-table';
      container.style.height = '400px';
      document.body.appendChild(container);

      const rows = Array.from({ length: 5000 }, (_, i) => ({
        id: `row-${i}`,
        data: {
          id: i,
          name: `User ${i}`,
          email: `user${i}@example.com`,
          department: `Dept ${i % 10}`,
          score: Math.floor(Math.random() * 100)
        }
      }));

      new (window as any).Table('#perf-table', {
        columns: [
          { id: 'id', header: 'ID' },
          { id: 'name', header: 'Name' },
          { id: 'email', header: 'Email' },
          { id: 'department', header: 'Department' },
          { id: 'score', header: 'Score' }
        ],
        rows,
        height: 400,
        virtualScrollBuffer: 3
      });
    });

    // Perform rapid scrolling
    const scrollTimes = await page.evaluate(async () => {
      const container = document.querySelector('#perf-table .table-scroll-container') as HTMLElement;
      const times: number[] = [];

      for (let i = 0; i < 10; i++) {
        const start = performance.now();
        container.scrollTop = i * 1000;
        await new Promise(resolve => requestAnimationFrame(resolve));
        times.push(performance.now() - start);
      }

      return times;
    });

    // Each scroll update should be fast
    scrollTimes.forEach(time => {
      expect(time).toBeLessThan(100); // Should update within 100ms
    });

    // Average should be very fast
    const avgTime = scrollTimes.reduce((a, b) => a + b, 0) / scrollTimes.length;
    expect(avgTime).toBeLessThan(50);
  });
});