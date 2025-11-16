import { test, expect, Page } from '@playwright/test';
import * as path from 'path';

// Configure viewport for consistent rendering
const VIEWPORT = { width: 1280, height: 800 };
const DEVICE_SCALE_FACTOR = 2;

test.describe('Overlay Components Visual Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Load the overlays demo page
    const overlaysPath = path.join(__dirname, '../../src/ui/gallery/overlays.html');
    await page.goto(`file://${overlaysPath}`);
    await page.setViewportSize(VIEWPORT);

    // Wait for fonts to load
    await page.evaluate(() => document.fonts.ready);

    // Set default theme and density
    await page.evaluate(() => {
      document.body.setAttribute('data-theme', 'light');
      document.body.setAttribute('data-density', 'comfortable');
    });
  });

  test.describe('Modal Dialogs', () => {
    test('modal backdrop blur', async ({ page }) => {
      const modalTrigger = await page.locator('[data-modal-trigger], button:has-text("Open Modal")').first();

      if (await modalTrigger.count() > 0) {
        await modalTrigger.click();
        await page.waitForTimeout(300); // Wait for animation

        const backdrop = await page.locator('.modal-backdrop, .overlay-backdrop');
        await expect(backdrop).toBeVisible();

        // Verify backdrop blur/opacity
        const backdropOpacity = await backdrop.evaluate(el =>
          window.getComputedStyle(el).opacity
        );
        expect(parseFloat(backdropOpacity)).toBeGreaterThan(0);

        await expect(page).toHaveScreenshot('modal-with-backdrop.png');

        // Close modal
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);
      }
    });

    test('modal z-index stacking', async ({ page }) => {
      const modalTrigger = await page.locator('[data-modal-trigger], button:has-text("Open Modal")').first();

      if (await modalTrigger.count() > 0) {
        await modalTrigger.click();
        await page.waitForTimeout(150);

        const modal = await page.locator('.modal, [role="dialog"]').first();
        const zIndex = await modal.evaluate(el =>
          window.getComputedStyle(el).zIndex
        );

        // Modal should have high z-index for proper stacking
        expect(parseInt(zIndex)).toBeGreaterThanOrEqual(1000);

        await expect(modal).toHaveScreenshot('modal-dialog.png');
      }
    });

    test('modal sizes', async ({ page }) => {
      // Small modal
      const smallModalTrigger = await page.locator('[data-modal-size="small"], button:has-text("Small Modal")');
      if (await smallModalTrigger.count() > 0) {
        await smallModalTrigger.click();
        await page.waitForTimeout(150);

        const smallModal = await page.locator('.modal-small, .modal[data-size="small"]');
        await expect(smallModal).toHaveScreenshot('modal-small.png');

        await page.keyboard.press('Escape');
        await page.waitForTimeout(150);
      }

      // Large modal
      const largeModalTrigger = await page.locator('[data-modal-size="large"], button:has-text("Large Modal")');
      if (await largeModalTrigger.count() > 0) {
        await largeModalTrigger.click();
        await page.waitForTimeout(150);

        const largeModal = await page.locator('.modal-large, .modal[data-size="large"]');
        await expect(largeModal).toHaveScreenshot('modal-large.png');

        await page.keyboard.press('Escape');
        await page.waitForTimeout(150);
      }

      // Full screen modal
      const fullscreenTrigger = await page.locator('[data-modal-size="fullscreen"], button:has-text("Fullscreen")');
      if (await fullscreenTrigger.count() > 0) {
        await fullscreenTrigger.click();
        await page.waitForTimeout(150);

        await expect(page).toHaveScreenshot('modal-fullscreen.png');

        await page.keyboard.press('Escape');
        await page.waitForTimeout(150);
      }
    });

    test('modal with form validation', async ({ page }) => {
      const formModalTrigger = await page.locator('button:has-text("Form Modal")');

      if (await formModalTrigger.count() > 0) {
        await formModalTrigger.click();
        await page.waitForTimeout(150);

        // Try to submit invalid form
        const submitButton = await page.locator('.modal button[type="submit"]');
        if (await submitButton.count() > 0) {
          await submitButton.click();
          await page.waitForTimeout(100);

          // Check for validation messages
          const validationMessage = await page.locator('.error-message, [aria-invalid="true"]');
          if (await validationMessage.count() > 0) {
            await expect(page.locator('.modal')).toHaveScreenshot('modal-form-validation.png');
          }
        }

        await page.keyboard.press('Escape');
      }
    });
  });

  test.describe('Drawer Components', () => {
    test('drawer slide animations', async ({ page }) => {
      // Left drawer
      const leftDrawerTrigger = await page.locator('button:has-text("Left Drawer")');
      if (await leftDrawerTrigger.count() > 0) {
        await leftDrawerTrigger.click();
        await page.waitForTimeout(300);

        const leftDrawer = await page.locator('.drawer-left, .drawer[data-position="left"]');
        await expect(leftDrawer).toHaveScreenshot('drawer-left.png');

        // Close drawer
        const closeButton = await leftDrawer.locator('.drawer-close, [aria-label*="Close"]');
        await closeButton.click();
        await page.waitForTimeout(300);
      }

      // Right drawer
      const rightDrawerTrigger = await page.locator('button:has-text("Right Drawer")');
      if (await rightDrawerTrigger.count() > 0) {
        await rightDrawerTrigger.click();
        await page.waitForTimeout(300);

        const rightDrawer = await page.locator('.drawer-right, .drawer[data-position="right"]');
        await expect(rightDrawer).toHaveScreenshot('drawer-right.png');

        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);
      }
    });

    test('drawer with persistent state', async ({ page }) => {
      const persistentDrawer = await page.locator('.drawer-persistent, [data-drawer-persistent]');

      if (await persistentDrawer.count() > 0) {
        await expect(persistentDrawer).toHaveScreenshot('drawer-persistent.png');

        // Check if drawer state persists in localStorage
        const drawerState = await page.evaluate(() =>
          localStorage.getItem('drawer-state')
        );

        if (drawerState) {
          expect(['open', 'closed']).toContain(drawerState);
        }
      }
    });
  });

  test.describe('Tooltip Components', () => {
    test('tooltip positioning', async ({ page }) => {
      // Top tooltip
      const topTooltipTrigger = await page.locator('[data-tooltip-position="top"]').first();
      if (await topTooltipTrigger.count() > 0) {
        await topTooltipTrigger.hover();
        await page.waitForTimeout(500); // Wait for tooltip delay

        const tooltip = await page.locator('.tooltip, [role="tooltip"]').first();
        if (await tooltip.count() > 0) {
          await expect(tooltip).toHaveScreenshot('tooltip-top.png');
        }
      }

      // Bottom tooltip
      const bottomTooltipTrigger = await page.locator('[data-tooltip-position="bottom"]').first();
      if (await bottomTooltipTrigger.count() > 0) {
        await bottomTooltipTrigger.hover();
        await page.waitForTimeout(500);

        const tooltip = await page.locator('.tooltip').last();
        if (await tooltip.count() > 0) {
          await expect(tooltip).toHaveScreenshot('tooltip-bottom.png');
        }
      }
    });

    test('tooltip with rich content', async ({ page }) => {
      const richTooltipTrigger = await page.locator('[data-tooltip-rich], [data-tooltip-html]').first();

      if (await richTooltipTrigger.count() > 0) {
        await richTooltipTrigger.hover();
        await page.waitForTimeout(500);

        const richTooltip = await page.locator('.tooltip-rich, .tooltip-content');
        if (await richTooltip.count() > 0) {
          await expect(richTooltip).toHaveScreenshot('tooltip-rich-content.png');
        }
      }
    });
  });

  test.describe('Popover Components', () => {
    test('popover with arrow', async ({ page }) => {
      const popoverTrigger = await page.locator('[data-popover], button:has-text("Show Popover")').first();

      if (await popoverTrigger.count() > 0) {
        await popoverTrigger.click();
        await page.waitForTimeout(150);

        const popover = await page.locator('.popover, [role="dialog"][data-popover]');
        if (await popover.count() > 0) {
          // Check for arrow element
          const arrow = await popover.locator('.popover-arrow, .arrow');
          if (await arrow.count() > 0) {
            await expect(arrow).toBeVisible();
          }

          await expect(popover).toHaveScreenshot('popover-with-arrow.png');

          // Close popover
          await page.click('body', { position: { x: 10, y: 10 } });
          await page.waitForTimeout(150);
        }
      }
    });

    test('popover auto-positioning', async ({ page }) => {
      // Trigger popover near bottom of viewport
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(100);

      const bottomPopoverTrigger = await page.locator('[data-popover]').last();
      if (await bottomPopoverTrigger.count() > 0) {
        await bottomPopoverTrigger.scrollIntoViewIfNeeded();
        await bottomPopoverTrigger.click();
        await page.waitForTimeout(150);

        const popover = await page.locator('.popover').last();
        if (await popover.count() > 0) {
          // Popover should flip to top when near bottom
          await expect(popover).toHaveScreenshot('popover-auto-position.png');
        }

        await page.keyboard.press('Escape');
      }
    });
  });

  test.describe('Toast Notifications', () => {
    test('toast stack positioning', async ({ page }) => {
      const toastTrigger = await page.locator('button:has-text("Show Toast")').first();

      if (await toastTrigger.count() > 0) {
        // Trigger multiple toasts
        await toastTrigger.click();
        await page.waitForTimeout(100);
        await toastTrigger.click();
        await page.waitForTimeout(100);
        await toastTrigger.click();
        await page.waitForTimeout(300);

        const toastContainer = await page.locator('.toast-container, .notifications-container');
        if (await toastContainer.count() > 0) {
          await expect(toastContainer).toHaveScreenshot('toast-stack.png');
        }
      }
    });

    test('toast types and icons', async ({ page }) => {
      // Success toast
      const successToastTrigger = await page.locator('button:has-text("Success Toast")');
      if (await successToastTrigger.count() > 0) {
        await successToastTrigger.click();
        await page.waitForTimeout(150);

        const successToast = await page.locator('.toast-success, .toast[data-type="success"]');
        if (await successToast.count() > 0) {
          await expect(successToast).toHaveScreenshot('toast-success.png');
        }
      }

      // Error toast
      const errorToastTrigger = await page.locator('button:has-text("Error Toast")');
      if (await errorToastTrigger.count() > 0) {
        await errorToastTrigger.click();
        await page.waitForTimeout(150);

        const errorToast = await page.locator('.toast-error, .toast[data-type="error"]');
        if (await errorToast.count() > 0) {
          await expect(errorToast).toHaveScreenshot('toast-error.png');
        }
      }

      // Warning toast
      const warningToastTrigger = await page.locator('button:has-text("Warning Toast")');
      if (await warningToastTrigger.count() > 0) {
        await warningToastTrigger.click();
        await page.waitForTimeout(150);

        const warningToast = await page.locator('.toast-warning, .toast[data-type="warning"]');
        if (await warningToast.count() > 0) {
          await expect(warningToast).toHaveScreenshot('toast-warning.png');
        }
      }
    });

    test('toast auto-dismiss animation', async ({ page }) => {
      const autoDismissToastTrigger = await page.locator('button:has-text("Auto Dismiss Toast")');

      if (await autoDismissToastTrigger.count() > 0) {
        await autoDismissToastTrigger.click();

        const toast = await page.locator('.toast').last();
        if (await toast.count() > 0) {
          // Capture toast appearing
          await page.waitForTimeout(150);
          await expect(toast).toHaveScreenshot('toast-appearing.png');

          // Wait for auto-dismiss (usually 3-5 seconds)
          await page.waitForTimeout(2500);

          // Check if toast is fading
          const opacity = await toast.evaluate(el =>
            window.getComputedStyle(el).opacity
          );

          if (parseFloat(opacity) < 1) {
            await expect(toast).toHaveScreenshot('toast-dismissing.png');
          }
        }
      }
    });
  });

  test.describe('Dialog Variations', () => {
    test('confirmation dialog', async ({ page }) => {
      const confirmTrigger = await page.locator('button:has-text("Delete"), button:has-text("Confirm")').first();

      if (await confirmTrigger.count() > 0) {
        await confirmTrigger.click();
        await page.waitForTimeout(150);

        const confirmDialog = await page.locator('.dialog-confirm, [role="alertdialog"]');
        if (await confirmDialog.count() > 0) {
          await expect(confirmDialog).toHaveScreenshot('dialog-confirmation.png');

          // Check for danger/warning styling
          const dangerButton = await confirmDialog.locator('.btn-danger, button[data-variant="danger"]');
          if (await dangerButton.count() > 0) {
            const bgColor = await dangerButton.evaluate(el =>
              window.getComputedStyle(el).backgroundColor
            );
            // Should have red/danger color
            expect(bgColor).toContain('217'); // Red component
          }
        }

        await page.keyboard.press('Escape');
      }
    });

    test('prompt dialog with input', async ({ page }) => {
      const promptTrigger = await page.locator('button:has-text("Rename"), button:has-text("Prompt")').first();

      if (await promptTrigger.count() > 0) {
        await promptTrigger.click();
        await page.waitForTimeout(150);

        const promptDialog = await page.locator('.dialog-prompt, .dialog:has(input)');
        if (await promptDialog.count() > 0) {
          // Focus should be on input
          const input = await promptDialog.locator('input[type="text"]');
          if (await input.count() > 0) {
            await expect(input).toBeFocused();
          }

          await expect(promptDialog).toHaveScreenshot('dialog-prompt.png');
        }

        await page.keyboard.press('Escape');
      }
    });
  });

  test.describe('Overlay Dark Mode', () => {
    test('all overlays in dark mode', async ({ page }) => {
      await page.evaluate(() => {
        document.body.setAttribute('data-theme', 'dark');
      });
      await page.waitForTimeout(100);

      // Open a modal in dark mode
      const modalTrigger = await page.locator('[data-modal-trigger], button:has-text("Open Modal")').first();
      if (await modalTrigger.count() > 0) {
        await modalTrigger.click();
        await page.waitForTimeout(150);

        const modal = await page.locator('.modal, [role="dialog"]');
        if (await modal.count() > 0) {
          // Check dark mode background
          const bgColor = await modal.evaluate(el =>
            window.getComputedStyle(el).backgroundColor
          );
          expect(bgColor).toContain('41'); // Dark gray component

          await expect(page).toHaveScreenshot('overlays-dark-mode.png');
        }

        await page.keyboard.press('Escape');
      }
    });
  });

  test.describe('Overlay Accessibility', () => {
    test('focus management in modal', async ({ page }) => {
      const modalTrigger = await page.locator('[data-modal-trigger], button:has-text("Open Modal")').first();

      if (await modalTrigger.count() > 0) {
        await modalTrigger.click();
        await page.waitForTimeout(150);

        // Focus should be trapped in modal
        const modal = await page.locator('.modal, [role="dialog"]');

        if (await modal.count() > 0) {
          // Check initial focus
          const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
          expect(focusedElement).toBeTruthy();

          // Tab through modal elements
          await page.keyboard.press('Tab');
          await page.keyboard.press('Tab');
          await page.keyboard.press('Tab');

          // Focus should still be within modal
          const stillInModal = await page.evaluate(() => {
            const activeEl = document.activeElement;
            const modal = document.querySelector('.modal, [role="dialog"]');
            return modal?.contains(activeEl);
          });

          expect(stillInModal).toBe(true);
        }

        await page.keyboard.press('Escape');
      }
    });

    test('aria attributes on overlays', async ({ page }) => {
      const modalTrigger = await page.locator('[data-modal-trigger]').first();

      if (await modalTrigger.count() > 0) {
        await modalTrigger.click();
        await page.waitForTimeout(150);

        const modal = await page.locator('[role="dialog"]');
        if (await modal.count() > 0) {
          // Check for required ARIA attributes
          const ariaLabelledby = await modal.getAttribute('aria-labelledby');
          const ariaDescribedby = await modal.getAttribute('aria-describedby');
          const ariaModal = await modal.getAttribute('aria-modal');

          expect(ariaModal).toBe('true');
          // At least one of these should be present
          expect(ariaLabelledby || ariaDescribedby).toBeTruthy();
        }

        await page.keyboard.press('Escape');
      }
    });
  });
});