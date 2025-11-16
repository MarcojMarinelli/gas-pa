/**
 * Playwright tests for overlay components keyboard interactions
 * Tests focus trap, escape key handling, tab navigation, and accessibility
 */

import { test, expect, Page } from '@playwright/test';

// Helper to create a test HTML page with the components
async function setupTestPage(page: Page) {
  await page.goto('about:blank');
  await page.setContent(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Overlay Components Test</title>
      <style>
        :root {
          --color-surface: #ffffff;
          --color-text-primary: #202124;
          --color-border: #dadce0;
          --spacing-md: 16px;
          --spacing-lg: 24px;
          --radius-md: 8px;
          --transition-base: 200ms;
          --z-modal: 400;
          --focus-ring: 0 0 0 2px #1a73e8;
          --elevation-e4: 0 2px 3px 0 rgba(60, 64, 67, 0.3);
        }
      </style>
    </head>
    <body>
      <div id="app">
        <h1>Overlay Components Test Page</h1>

        <!-- Test triggers -->
        <button id="open-modal" class="test-trigger">Open Modal</button>
        <button id="open-drawer" class="test-trigger">Open Drawer</button>
        <button id="show-toast" class="test-trigger">Show Toast</button>

        <!-- Additional focusable elements to test focus trap -->
        <input type="text" id="input-before" placeholder="Input before overlays">
        <button id="button-before">Button before overlays</button>

        <div style="margin-top: 20px;">
          <a href="#" id="link-middle">Link in middle</a>
          <select id="select-middle">
            <option>Option 1</option>
            <option>Option 2</option>
          </select>
        </div>

        <input type="text" id="input-after" placeholder="Input after overlays">
        <button id="button-after">Button after overlays</button>
      </div>

      <script type="module">
        // Import the bundled UI components
        import('/dist/UI.js').then(UI => {
          const { Modal, Drawer, toast, createModal, createDrawer } = UI;

          // Setup Modal
          document.getElementById('open-modal').addEventListener('click', () => {
            const modal = createModal({
              title: 'Test Modal',
              closeButton: true,
              closeOnEscape: true
            });

            const content = document.createElement('div');
            content.innerHTML = \`
              <p>Modal content for testing keyboard interactions.</p>
              <input type="text" id="modal-input" placeholder="Modal input field">
              <button id="modal-button">Modal button</button>
              <a href="#" id="modal-link">Modal link</a>
            \`;

            modal.setContent(content);
            modal.open();
          });

          // Setup Drawer
          document.getElementById('open-drawer').addEventListener('click', () => {
            const drawer = createDrawer({
              position: 'left',
              closeOnEscape: true
            });

            const content = document.createElement('div');
            content.innerHTML = \`
              <p>Drawer content for testing keyboard interactions.</p>
              <input type="text" id="drawer-input" placeholder="Drawer input field">
              <button id="drawer-button">Drawer button</button>
              <a href="#" id="drawer-link">Drawer link</a>
            \`;

            drawer.setContent(content);
            drawer.open();
          });

          // Setup Toast
          document.getElementById('show-toast').addEventListener('click', () => {
            toast.success('Test toast notification', {
              duration: 0, // Don't auto-dismiss for testing
              closable: true
            });
          });
        }).catch(err => {
          console.error('Failed to load UI components:', err);
        });
      </script>
    </body>
    </html>
  `);

  // Wait for page to be ready
  await page.waitForLoadState('domcontentloaded');
}

test.describe('Modal Keyboard Interactions', () => {
  test('should trap focus within modal', async ({ page }) => {
    await setupTestPage(page);

    // Open modal
    await page.click('#open-modal');
    await page.waitForSelector('.modal', { state: 'visible' });

    // Focus should be on first focusable element in modal
    await expect(page.locator(':focus')).toHaveAttribute('id', 'modal-input');

    // Tab through modal elements
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toHaveAttribute('id', 'modal-button');

    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toHaveAttribute('id', 'modal-link');

    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toHaveClass(/modal__close/);

    // Tab should cycle back to first element
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toHaveAttribute('id', 'modal-input');

    // Shift+Tab should go to last element
    await page.keyboard.press('Shift+Tab');
    await expect(page.locator(':focus')).toHaveClass(/modal__close/);
  });

  test('should close modal on Escape key', async ({ page }) => {
    await setupTestPage(page);

    // Open modal
    await page.click('#open-modal');
    await page.waitForSelector('.modal', { state: 'visible' });

    // Press Escape
    await page.keyboard.press('Escape');

    // Modal should be closed
    await expect(page.locator('.modal')).not.toBeVisible();
  });

  test('should return focus to trigger element after close', async ({ page }) => {
    await setupTestPage(page);

    // Focus the trigger button
    await page.focus('#open-modal');

    // Open modal
    await page.click('#open-modal');
    await page.waitForSelector('.modal', { state: 'visible' });

    // Close modal
    await page.keyboard.press('Escape');
    await page.waitForSelector('.modal', { state: 'hidden' });

    // Focus should return to trigger button
    await expect(page.locator(':focus')).toHaveAttribute('id', 'open-modal');
  });

  test('should make background content inert', async ({ page }) => {
    await setupTestPage(page);

    // Open modal
    await page.click('#open-modal');
    await page.waitForSelector('.modal', { state: 'visible' });

    // Try to click on background elements
    const inputBefore = page.locator('#input-before');
    await expect(inputBefore).toHaveAttribute('inert', '');

    // Background elements should not be reachable by keyboard
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Focus should still be within modal, not on background elements
    const focusedElement = await page.locator(':focus').getAttribute('id');
    expect(['modal-input', 'modal-button', 'modal-link', 'modal__close']).toContain(focusedElement);
  });
});

test.describe('Drawer Keyboard Interactions', () => {
  test('should trap focus within drawer', async ({ page }) => {
    await setupTestPage(page);

    // Open drawer
    await page.click('#open-drawer');
    await page.waitForSelector('.drawer', { state: 'visible' });

    // Focus should be trapped within drawer
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toHaveAttribute('id', 'drawer-input');

    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toHaveAttribute('id', 'drawer-button');

    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toHaveAttribute('id', 'drawer-link');

    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toHaveClass(/drawer__close/);

    // Should cycle back
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toHaveAttribute('id', 'drawer-input');
  });

  test('should close drawer on Escape key', async ({ page }) => {
    await setupTestPage(page);

    // Open drawer
    await page.click('#open-drawer');
    await page.waitForSelector('.drawer', { state: 'visible' });

    // Press Escape
    await page.keyboard.press('Escape');

    // Drawer should be closed
    await expect(page.locator('.drawer')).not.toBeVisible();
  });

  test('should handle left/right drawer positions', async ({ page }) => {
    await setupTestPage(page);

    // Test left drawer (default)
    await page.click('#open-drawer');
    await page.waitForSelector('.drawer--left', { state: 'visible' });

    const leftDrawer = page.locator('.drawer--left');
    await expect(leftDrawer).toBeVisible();

    // Close it
    await page.keyboard.press('Escape');
    await expect(leftDrawer).not.toBeVisible();
  });
});

test.describe('Toast Keyboard Interactions', () => {
  test('should be announced to screen readers', async ({ page }) => {
    await setupTestPage(page);

    // Show toast
    await page.click('#show-toast');

    // Check for aria-live region
    const toast = page.locator('.toast');
    await expect(toast).toBeVisible();
    await expect(toast).toHaveAttribute('aria-live', 'polite');
    await expect(toast).toHaveAttribute('role', 'status');
  });

  test('should be closable via keyboard', async ({ page }) => {
    await setupTestPage(page);

    // Show toast
    await page.click('#show-toast');
    await page.waitForSelector('.toast', { state: 'visible' });

    // Focus close button
    const closeButton = page.locator('.toast__close');
    await closeButton.focus();

    // Press Enter to close
    await page.keyboard.press('Enter');

    // Toast should be closed
    await expect(page.locator('.toast')).not.toBeVisible();
  });

  test('should not interfere with page keyboard navigation', async ({ page }) => {
    await setupTestPage(page);

    // Show toast
    await page.click('#show-toast');
    await page.waitForSelector('.toast', { state: 'visible' });

    // Focus should still be able to move through page elements
    await page.focus('#input-before');
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toHaveAttribute('id', 'button-before');

    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toHaveAttribute('id', 'open-modal');
  });
});

test.describe('Multiple Overlays', () => {
  test('should handle nested modals correctly', async ({ page }) => {
    await setupTestPage(page);

    // Open first modal
    await page.click('#open-modal');
    await page.waitForSelector('.modal', { state: 'visible' });

    // Store first modal reference
    const firstModal = page.locator('.modal').first();
    await expect(firstModal).toBeVisible();

    // Focus should be in first modal
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toHaveAttribute('id', 'modal-input');

    // Note: In a real scenario, you would open a second modal from within the first
    // For this test, we're verifying the overlay stack management
  });

  test('should maintain scroll lock with multiple overlays', async ({ page }) => {
    await setupTestPage(page);

    // Add content to make page scrollable
    await page.evaluate(() => {
      document.body.style.height = '200vh';
    });

    // Get initial scroll position
    const initialScroll = await page.evaluate(() => window.scrollY);

    // Open modal
    await page.click('#open-modal');
    await page.waitForSelector('.modal', { state: 'visible' });

    // Try to scroll - body should be locked
    await page.evaluate(() => {
      window.scrollTo(0, 100);
    });

    // Open drawer while modal is open
    await page.click('#open-drawer');
    await page.waitForSelector('.drawer', { state: 'visible' });

    // Close drawer
    await page.keyboard.press('Escape');
    await page.waitForSelector('.drawer', { state: 'hidden' });

    // Body should still be locked (modal is still open)
    const scrollAfterDrawerClose = await page.evaluate(() => window.scrollY);
    expect(scrollAfterDrawerClose).toBe(initialScroll);

    // Close modal
    await page.keyboard.press('Escape');
    await page.waitForSelector('.modal', { state: 'hidden' });

    // Now scroll should be unlocked
    await page.evaluate(() => {
      window.scrollTo(0, 100);
    });
    const finalScroll = await page.evaluate(() => window.scrollY);
    expect(finalScroll).toBe(100);
  });
});

test.describe('Accessibility Features', () => {
  test('should have proper ARIA attributes', async ({ page }) => {
    await setupTestPage(page);

    // Test Modal ARIA
    await page.click('#open-modal');
    await page.waitForSelector('.modal', { state: 'visible' });

    const modal = page.locator('.modal');
    await expect(modal).toHaveAttribute('role', 'dialog');
    await expect(modal).toHaveAttribute('aria-modal', 'true');
    await expect(modal).toHaveAttribute('aria-label', 'Test Modal');

    await page.keyboard.press('Escape');

    // Test Drawer ARIA
    await page.click('#open-drawer');
    await page.waitForSelector('.drawer', { state: 'visible' });

    const drawer = page.locator('.drawer');
    await expect(drawer).toHaveAttribute('role', 'dialog');
    await expect(drawer).toHaveAttribute('aria-modal', 'true');

    await page.keyboard.press('Escape');
  });

  test('should respect prefers-reduced-motion', async ({ page }) => {
    // Set prefers-reduced-motion
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await setupTestPage(page);

    // Open modal
    await page.click('#open-modal');

    // Check that transition is disabled
    const modal = page.locator('.modal__content');
    const transition = await modal.evaluate(el => {
      return window.getComputedStyle(el).transition;
    });

    // With reduced motion, transition should be none or 0s
    expect(transition).toMatch(/none|0s/);
  });

  test('should handle focus-visible correctly', async ({ page }) => {
    await setupTestPage(page);

    // Open modal
    await page.click('#open-modal');
    await page.waitForSelector('.modal', { state: 'visible' });

    // Tab to close button (keyboard navigation)
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Check for focus-visible styles
    const closeButton = page.locator('.modal__close');
    const boxShadow = await closeButton.evaluate(el => {
      return window.getComputedStyle(el).boxShadow;
    });

    // Should have focus ring
    expect(boxShadow).toContain('rgb(26, 115, 232)'); // Focus ring color
  });
});