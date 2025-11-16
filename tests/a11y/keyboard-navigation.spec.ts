import { test, expect } from '@playwright/test';
import * as path from 'path';

// Configure viewport for consistent testing
const VIEWPORT = { width: 1280, height: 800 };

test.describe('Keyboard Navigation Tests', () => {
  test.describe('Focus Management', () => {
    test('visible focus indicators throughout navigation', async ({ page }) => {
      const galleryPath = path.join(__dirname, '../../src/ui/gallery/index.html');
      await page.goto(`file://${galleryPath}`);
      await page.setViewportSize(VIEWPORT);

      // Tab through first 20 elements
      for (let i = 0; i < 20; i++) {
        await page.keyboard.press('Tab');

        // Check if focused element has visible focus indicator
        const hasFocusIndicator = await page.evaluate(() => {
          const el = document.activeElement;
          if (!el) return false;

          const styles = window.getComputedStyle(el);
          const hasOutline = styles.outline !== 'none' && styles.outline !== '';
          const hasBoxShadow = styles.boxShadow !== 'none' && styles.boxShadow !== '';
          const hasBorder = styles.borderColor !== window.getComputedStyle(el, ':not(:focus)').borderColor;

          return hasOutline || hasBoxShadow || hasBorder;
        });

        expect(hasFocusIndicator).toBe(true);
      }
    });

    test('focus order follows visual layout', async ({ page }) => {
      const galleryPath = path.join(__dirname, '../../src/ui/gallery/index.html');
      await page.goto(`file://${galleryPath}`);
      await page.setViewportSize(VIEWPORT);

      const focusPositions = [];

      // Tab through elements and record their positions
      for (let i = 0; i < 10; i++) {
        await page.keyboard.press('Tab');

        const position = await page.evaluate(() => {
          const el = document.activeElement;
          if (!el) return null;

          const rect = el.getBoundingClientRect();
          return {
            top: rect.top,
            left: rect.left,
            tabIndex: el.tabIndex
          };
        });

        if (position) {
          focusPositions.push(position);
        }
      }

      // Verify focus moves in a logical order (generally left-to-right, top-to-bottom)
      for (let i = 1; i < focusPositions.length; i++) {
        const current = focusPositions[i];
        const previous = focusPositions[i - 1];

        // Focus should generally move down or to the right
        // (allowing for some layout variations)
        const movesLogically =
          current.top > previous.top ||
          (Math.abs(current.top - previous.top) < 10 && current.left > previous.left);

        // Or it could wrap to next row
        const wrapsToNextRow =
          current.top > previous.top && current.left < previous.left;

        expect(movesLogically || wrapsToNextRow).toBe(true);
      }
    });

    test('no keyboard traps except modals', async ({ page }) => {
      const galleryPath = path.join(__dirname, '../../src/ui/gallery/index.html');
      await page.goto(`file://${galleryPath}`);
      await page.setViewportSize(VIEWPORT);

      let previousElement = null;
      let sameElementCount = 0;

      // Tab through many elements to ensure no traps
      for (let i = 0; i < 30; i++) {
        await page.keyboard.press('Tab');

        const currentElement = await page.evaluate(() => {
          const el = document.activeElement;
          return el ? el.outerHTML.substring(0, 100) : null;
        });

        if (currentElement === previousElement) {
          sameElementCount++;
        } else {
          sameElementCount = 0;
        }

        // If we're stuck on the same element, there might be a trap
        expect(sameElementCount).toBeLessThan(3);

        previousElement = currentElement;
      }
    });
  });

  test.describe('Interactive Elements', () => {
    test('all buttons keyboard accessible', async ({ page }) => {
      const galleryPath = path.join(__dirname, '../../src/ui/gallery/index.html');
      await page.goto(`file://${galleryPath}`);
      await page.setViewportSize(VIEWPORT);

      const buttons = await page.locator('button:visible');
      const buttonCount = await buttons.count();

      for (let i = 0; i < Math.min(buttonCount, 10); i++) {
        const button = buttons.nth(i);

        // Focus button
        await button.focus();

        // Verify it's focused
        const isFocused = await button.evaluate(el => el === document.activeElement);
        expect(isFocused).toBe(true);

        // Check if button can be activated with keyboard
        const canActivate = await button.evaluate(el => {
          return !el.disabled && el.tabIndex !== -1;
        });

        if (canActivate) {
          // Space and Enter should work on buttons
          await page.keyboard.press('Space');
          // Button clicked (would trigger action)
        }
      }
    });

    test('links keyboard accessible', async ({ page }) => {
      const galleryPath = path.join(__dirname, '../../src/ui/gallery/index.html');
      await page.goto(`file://${galleryPath}`);
      await page.setViewportSize(VIEWPORT);

      const links = await page.locator('a[href]:visible');
      const linkCount = await links.count();

      for (let i = 0; i < Math.min(linkCount, 10); i++) {
        const link = links.nth(i);

        // Focus link
        await link.focus();

        // Verify it's focused
        const isFocused = await link.evaluate(el => el === document.activeElement);
        expect(isFocused).toBe(true);

        // Check if link has href
        const href = await link.getAttribute('href');
        expect(href).toBeTruthy();

        // Enter should work on links
        // (Not actually pressing to avoid navigation)
      }
    });

    test('form inputs keyboard accessible', async ({ page }) => {
      const galleryPath = path.join(__dirname, '../../src/ui/gallery/index.html');
      await page.goto(`file://${galleryPath}`);
      await page.setViewportSize(VIEWPORT);

      // Text inputs
      const textInputs = await page.locator('input[type="text"]:visible, input[type="email"]:visible, input[type="password"]:visible');
      const textInputCount = await textInputs.count();

      for (let i = 0; i < Math.min(textInputCount, 5); i++) {
        const input = textInputs.nth(i);

        await input.focus();
        await input.type('test');

        const value = await input.inputValue();
        expect(value).toContain('test');

        await input.clear();
      }

      // Checkboxes
      const checkboxes = await page.locator('input[type="checkbox"]:visible');
      const checkboxCount = await checkboxes.count();

      for (let i = 0; i < Math.min(checkboxCount, 5); i++) {
        const checkbox = checkboxes.nth(i);

        await checkbox.focus();
        const initialChecked = await checkbox.isChecked();

        await page.keyboard.press('Space');
        const afterSpaceChecked = await checkbox.isChecked();

        expect(afterSpaceChecked).toBe(!initialChecked);
      }

      // Radio buttons
      const radioGroups = await page.locator('[role="radiogroup"], fieldset:has(input[type="radio"])');
      const radioGroupCount = await radioGroups.count();

      for (let i = 0; i < Math.min(radioGroupCount, 2); i++) {
        const group = radioGroups.nth(i);
        const radios = await group.locator('input[type="radio"]');
        const radioCount = await radios.count();

        if (radioCount > 1) {
          await radios.first().focus();

          // Arrow keys should navigate between radio buttons
          await page.keyboard.press('ArrowDown');

          const secondRadio = radios.nth(1);
          const isSecondFocused = await secondRadio.evaluate(el => el === document.activeElement);
          expect(isSecondFocused).toBe(true);
        }
      }
    });

    test('select dropdowns keyboard accessible', async ({ page }) => {
      const galleryPath = path.join(__dirname, '../../src/ui/gallery/index.html');
      await page.goto(`file://${galleryPath}`);
      await page.setViewportSize(VIEWPORT);

      const selects = await page.locator('select:visible');
      const selectCount = await selects.count();

      for (let i = 0; i < Math.min(selectCount, 5); i++) {
        const select = selects.nth(i);

        await select.focus();

        // Open dropdown with Space or Enter
        await page.keyboard.press('Space');

        // Navigate options with arrow keys
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('ArrowDown');

        // Select option with Enter
        await page.keyboard.press('Enter');

        const value = await select.inputValue();
        expect(value).toBeTruthy();
      }
    });
  });

  test.describe('Custom Components', () => {
    test('custom dropdown keyboard navigation', async ({ page }) => {
      const galleryPath = path.join(__dirname, '../../src/ui/gallery/index.html');
      await page.goto(`file://${galleryPath}`);
      await page.setViewportSize(VIEWPORT);

      const customDropdowns = await page.locator('[role="combobox"], [aria-haspopup="listbox"]');
      const dropdownCount = await customDropdowns.count();

      for (let i = 0; i < Math.min(dropdownCount, 3); i++) {
        const dropdown = customDropdowns.nth(i);

        await dropdown.focus();

        // Open with Enter or Space
        await page.keyboard.press('Enter');

        // Look for dropdown options
        const options = await page.locator('[role="option"]:visible');
        if (await options.count() > 0) {
          // Navigate with arrow keys
          await page.keyboard.press('ArrowDown');
          await page.keyboard.press('ArrowDown');

          // Select with Enter
          await page.keyboard.press('Enter');

          // Dropdown should close
          const optionsAfter = await page.locator('[role="option"]:visible');
          expect(await optionsAfter.count()).toBe(0);
        }

        // Close with Escape if still open
        await page.keyboard.press('Escape');
      }
    });

    test('tabs keyboard navigation', async ({ page }) => {
      const galleryPath = path.join(__dirname, '../../src/ui/gallery/index.html');
      await page.goto(`file://${galleryPath}`);
      await page.setViewportSize(VIEWPORT);

      const tabLists = await page.locator('[role="tablist"]');
      const tabListCount = await tabLists.count();

      for (let i = 0; i < Math.min(tabListCount, 2); i++) {
        const tabList = tabLists.nth(i);
        const tabs = await tabList.locator('[role="tab"]');
        const tabCount = await tabs.count();

        if (tabCount > 1) {
          await tabs.first().focus();

          // Arrow keys should navigate between tabs
          await page.keyboard.press('ArrowRight');

          const secondTab = tabs.nth(1);
          const isSecondFocused = await secondTab.evaluate(el => el === document.activeElement);
          expect(isSecondFocused).toBe(true);

          // Check aria-selected updates
          const isSelected = await secondTab.getAttribute('aria-selected');
          expect(isSelected).toBe('true');

          // Tab panel should be visible
          const panelId = await secondTab.getAttribute('aria-controls');
          if (panelId) {
            const panel = await page.locator(`#${panelId}`);
            await expect(panel).toBeVisible();
          }
        }
      }
    });

    test('accordion keyboard navigation', async ({ page }) => {
      const galleryPath = path.join(__dirname, '../../src/ui/gallery/index.html');
      await page.goto(`file://${galleryPath}`);
      await page.setViewportSize(VIEWPORT);

      const accordions = await page.locator('[role="region"][aria-labelledby], .accordion');
      const accordionButtons = await page.locator('[aria-expanded]');
      const buttonCount = await accordionButtons.count();

      for (let i = 0; i < Math.min(buttonCount, 3); i++) {
        const button = accordionButtons.nth(i);

        await button.focus();

        const initialExpanded = await button.getAttribute('aria-expanded');

        // Toggle with Space or Enter
        await page.keyboard.press('Enter');

        const afterExpanded = await button.getAttribute('aria-expanded');
        expect(afterExpanded).not.toBe(initialExpanded);

        // Content should be visible/hidden based on state
        const contentId = await button.getAttribute('aria-controls');
        if (contentId) {
          const content = await page.locator(`#${contentId}`);

          if (afterExpanded === 'true') {
            await expect(content).toBeVisible();
          } else {
            await expect(content).toBeHidden();
          }
        }
      }
    });

    test('slider keyboard navigation', async ({ page }) => {
      const galleryPath = path.join(__dirname, '../../src/ui/gallery/index.html');
      await page.goto(`file://${galleryPath}`);
      await page.setViewportSize(VIEWPORT);

      const sliders = await page.locator('[role="slider"], input[type="range"]');
      const sliderCount = await sliders.count();

      for (let i = 0; i < Math.min(sliderCount, 3); i++) {
        const slider = sliders.nth(i);

        await slider.focus();

        const initialValue = await slider.evaluate(el =>
          el.getAttribute('aria-valuenow') || el.value
        );

        // Increase with arrow keys
        await page.keyboard.press('ArrowRight');
        await page.keyboard.press('ArrowRight');

        const increasedValue = await slider.evaluate(el =>
          el.getAttribute('aria-valuenow') || el.value
        );

        expect(Number(increasedValue)).toBeGreaterThan(Number(initialValue));

        // Decrease with arrow keys
        await page.keyboard.press('ArrowLeft');

        const decreasedValue = await slider.evaluate(el =>
          el.getAttribute('aria-valuenow') || el.value
        );

        expect(Number(decreasedValue)).toBeLessThan(Number(increasedValue));

        // Home/End keys for min/max
        await page.keyboard.press('Home');
        const minValue = await slider.evaluate(el =>
          el.getAttribute('aria-valuenow') || el.value
        );

        await page.keyboard.press('End');
        const maxValue = await slider.evaluate(el =>
          el.getAttribute('aria-valuenow') || el.value
        );

        expect(Number(maxValue)).toBeGreaterThan(Number(minValue));
      }
    });
  });

  test.describe('Modal and Overlay Navigation', () => {
    test('modal focus trap and escape', async ({ page }) => {
      const overlaysPath = path.join(__dirname, '../../src/ui/gallery/overlays.html');
      await page.goto(`file://${overlaysPath}`);
      await page.setViewportSize(VIEWPORT);

      const modalTrigger = await page.locator('[data-modal-trigger], button:has-text("Open Modal")').first();

      if (await modalTrigger.count() > 0) {
        await modalTrigger.click();
        await page.waitForTimeout(150);

        const modal = await page.locator('.modal, [role="dialog"]').first();

        if (await modal.count() > 0) {
          // First focusable element should be focused
          const firstFocusable = await modal.locator('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])').first();
          const isFirstFocused = await firstFocusable.evaluate(el => el === document.activeElement);
          expect(isFirstFocused).toBe(true);

          // Tab through modal
          const focusableElements = await modal.locator('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
          const elementCount = await focusableElements.count();

          for (let i = 0; i < elementCount + 1; i++) {
            await page.keyboard.press('Tab');
          }

          // Should cycle back to first element
          const isCycled = await firstFocusable.evaluate(el => el === document.activeElement);
          expect(isCycled).toBe(true);

          // Escape closes modal
          await page.keyboard.press('Escape');
          await expect(modal).toBeHidden();

          // Focus returns to trigger
          const isTriggerFocused = await modalTrigger.evaluate(el => el === document.activeElement);
          expect(isTriggerFocused).toBe(true);
        }
      }
    });

    test('drawer keyboard navigation', async ({ page }) => {
      const overlaysPath = path.join(__dirname, '../../src/ui/gallery/overlays.html');
      await page.goto(`file://${overlaysPath}`);
      await page.setViewportSize(VIEWPORT);

      const drawerTrigger = await page.locator('button:has-text("Drawer"), button:has-text("Menu")').first();

      if (await drawerTrigger.count() > 0) {
        await drawerTrigger.click();
        await page.waitForTimeout(300);

        const drawer = await page.locator('.drawer, [role="navigation"]:visible');

        if (await drawer.count() > 0) {
          // Navigate drawer items
          await page.keyboard.press('Tab');
          await page.keyboard.press('Tab');

          // Escape closes drawer
          await page.keyboard.press('Escape');
          await expect(drawer).toBeHidden();
        }
      }
    });

    test('tooltip keyboard trigger', async ({ page }) => {
      const overlaysPath = path.join(__dirname, '../../src/ui/gallery/overlays.html');
      await page.goto(`file://${overlaysPath}`);
      await page.setViewportSize(VIEWPORT);

      const tooltipTriggers = await page.locator('[data-tooltip], [aria-describedby]');
      const triggerCount = await tooltipTriggers.count();

      for (let i = 0; i < Math.min(triggerCount, 3); i++) {
        const trigger = tooltipTriggers.nth(i);

        // Focus should show tooltip
        await trigger.focus();
        await page.waitForTimeout(500); // Wait for tooltip delay

        const tooltip = await page.locator('.tooltip, [role="tooltip"]:visible');
        if (await tooltip.count() > 0) {
          await expect(tooltip.first()).toBeVisible();

          // Blur should hide tooltip
          await page.keyboard.press('Tab');
          await page.waitForTimeout(500);
          await expect(tooltip.first()).toBeHidden();
        }
      }
    });
  });

  test.describe('Table Navigation', () => {
    test('table keyboard navigation', async ({ page }) => {
      const tablePath = path.join(__dirname, '../../src/ui/gallery/table.html');
      await page.goto(`file://${tablePath}`);
      await page.setViewportSize(VIEWPORT);

      const table = await page.locator('table').first();

      // Focus first cell
      const firstCell = await table.locator('td').first();
      await firstCell.focus();

      // Arrow keys should navigate cells (if implemented)
      const hasGridNavigation = await table.evaluate(el =>
        el.getAttribute('role') === 'grid' || el.querySelector('[role="grid"]')
      );

      if (hasGridNavigation) {
        await page.keyboard.press('ArrowRight');
        await page.keyboard.press('ArrowDown');

        // Check focus moved
        const focusedCell = await page.evaluate(() => {
          const el = document.activeElement;
          return el?.tagName === 'TD' || el?.tagName === 'TH';
        });

        expect(focusedCell).toBe(true);
      }

      // Check sortable columns
      const sortableHeaders = await table.locator('th[aria-sort], th.sortable');
      const sortableCount = await sortableHeaders.count();

      for (let i = 0; i < Math.min(sortableCount, 3); i++) {
        const header = sortableHeaders.nth(i);

        await header.focus();
        await page.keyboard.press('Enter');

        const sortState = await header.getAttribute('aria-sort');
        expect(['ascending', 'descending', 'none']).toContain(sortState);
      }
    });
  });

  test.describe('Skip Navigation', () => {
    test('skip to main content', async ({ page }) => {
      const galleryPath = path.join(__dirname, '../../src/ui/gallery/index.html');
      await page.goto(`file://${galleryPath}`);
      await page.setViewportSize(VIEWPORT);

      // First tab should focus skip link if present
      await page.keyboard.press('Tab');

      const activeElement = await page.evaluate(() => {
        const el = document.activeElement;
        return {
          text: el?.textContent,
          href: el?.getAttribute('href')
        };
      });

      if (activeElement.text?.toLowerCase().includes('skip')) {
        // Activate skip link
        await page.keyboard.press('Enter');

        // Focus should move to main content
        const mainFocused = await page.evaluate(() => {
          const el = document.activeElement;
          const main = document.querySelector('main, [role="main"]');
          return main?.contains(el) || el === main;
        });

        expect(mainFocused).toBe(true);
      }
    });

    test('skip repetitive navigation', async ({ page }) => {
      const dashboardPath = path.join(__dirname, '../../src/ui/gallery/dashboard-demo.html');
      await page.goto(`file://${dashboardPath}`);
      await page.setViewportSize(VIEWPORT);

      // Look for skip navigation links
      const skipLinks = await page.locator('a[href^="#"]:has-text("Skip"), .skip-navigation');

      if (await skipLinks.count() > 0) {
        for (let i = 0; i < await skipLinks.count(); i++) {
          const link = skipLinks.nth(i);
          const target = await link.getAttribute('href');

          if (target?.startsWith('#')) {
            await link.focus();
            await page.keyboard.press('Enter');

            // Check focus moved to target
            const targetElement = await page.locator(target);
            if (await targetElement.count() > 0) {
              const isFocused = await targetElement.evaluate(el =>
                el === document.activeElement || el.contains(document.activeElement)
              );

              expect(isFocused).toBe(true);
            }
          }
        }
      }
    });
  });
});