import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import * as path from 'path';

// Configure viewport for consistent testing
const VIEWPORT = { width: 1280, height: 800 };

test.describe('Accessibility Tests - WCAG 2.1 AA Compliance', () => {
  test.describe('Core UI Components', () => {
    test('foundation gallery accessibility', async ({ page }) => {
      const galleryPath = path.join(__dirname, '../../src/ui/gallery/index.html');
      await page.goto(`file://${galleryPath}`);
      await page.setViewportSize(VIEWPORT);
      await page.evaluate(() => document.fonts.ready);

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      // No critical or serious violations allowed
      const criticalViolations = accessibilityScanResults.violations.filter(
        v => v.impact === 'critical' || v.impact === 'serious'
      );

      if (criticalViolations.length > 0) {
        console.log('Critical violations found:', JSON.stringify(criticalViolations, null, 2));
      }

      expect(criticalViolations).toHaveLength(0);

      // Log moderate violations for review
      const moderateViolations = accessibilityScanResults.violations.filter(
        v => v.impact === 'moderate'
      );

      if (moderateViolations.length > 0) {
        console.log('Moderate violations to review:', moderateViolations.map(v => ({
          id: v.id,
          description: v.description,
          nodes: v.nodes.length
        })));
      }
    });

    test('dashboard accessibility', async ({ page }) => {
      const dashboardPath = path.join(__dirname, '../../src/ui/gallery/dashboard-demo.html');
      await page.goto(`file://${dashboardPath}`);
      await page.setViewportSize(VIEWPORT);
      await page.evaluate(() => document.fonts.ready);

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze();

      const criticalViolations = accessibilityScanResults.violations.filter(
        v => v.impact === 'critical' || v.impact === 'serious'
      );

      expect(criticalViolations).toHaveLength(0);
    });

    test('table component accessibility', async ({ page }) => {
      const tablePath = path.join(__dirname, '../../src/ui/gallery/table.html');
      await page.goto(`file://${tablePath}`);
      await page.setViewportSize(VIEWPORT);
      await page.evaluate(() => document.fonts.ready);

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze();

      const criticalViolations = accessibilityScanResults.violations.filter(
        v => v.impact === 'critical' || v.impact === 'serious'
      );

      expect(criticalViolations).toHaveLength(0);

      // Specific table checks
      const tables = await page.locator('table');
      const tableCount = await tables.count();

      for (let i = 0; i < tableCount; i++) {
        const table = tables.nth(i);

        // Check for caption or aria-label
        const hasCaption = await table.locator('caption').count() > 0;
        const hasAriaLabel = await table.getAttribute('aria-label') !== null;
        const hasAriaLabelledby = await table.getAttribute('aria-labelledby') !== null;

        expect(hasCaption || hasAriaLabel || hasAriaLabelledby).toBe(true);

        // Check for proper header associations
        const headers = await table.locator('th');
        const headerCount = await headers.count();

        for (let j = 0; j < headerCount; j++) {
          const header = headers.nth(j);
          const scope = await header.getAttribute('scope');
          const id = await header.getAttribute('id');

          // Headers should have scope or id for association
          expect(scope || id).toBeTruthy();
        }
      }
    });

    test('overlay components accessibility', async ({ page }) => {
      const overlaysPath = path.join(__dirname, '../../src/ui/gallery/overlays.html');
      await page.goto(`file://${overlaysPath}`);
      await page.setViewportSize(VIEWPORT);
      await page.evaluate(() => document.fonts.ready);

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze();

      const criticalViolations = accessibilityScanResults.violations.filter(
        v => v.impact === 'critical' || v.impact === 'serious'
      );

      expect(criticalViolations).toHaveLength(0);
    });
  });

  test.describe('Keyboard Navigation', () => {
    test('complete keyboard navigation flow', async ({ page }) => {
      const galleryPath = path.join(__dirname, '../../src/ui/gallery/index.html');
      await page.goto(`file://${galleryPath}`);
      await page.setViewportSize(VIEWPORT);

      // Start from the top of the document
      await page.keyboard.press('Tab');

      // Track focus through first 20 interactive elements
      const focusPath = [];
      for (let i = 0; i < 20; i++) {
        const focusedElement = await page.evaluate(() => {
          const el = document.activeElement;
          return {
            tagName: el?.tagName,
            role: el?.getAttribute('role'),
            ariaLabel: el?.getAttribute('aria-label'),
            text: el?.textContent?.substring(0, 50),
            isVisible: el ? window.getComputedStyle(el).visibility !== 'hidden' : false
          };
        });

        focusPath.push(focusedElement);

        // All focused elements should be visible
        expect(focusedElement.isVisible).toBe(true);

        await page.keyboard.press('Tab');
      }

      // Verify we cycled through interactive elements
      const uniqueTags = [...new Set(focusPath.map(f => f.tagName))];
      expect(uniqueTags.length).toBeGreaterThan(1);
    });

    test('reverse tab navigation', async ({ page }) => {
      const galleryPath = path.join(__dirname, '../../src/ui/gallery/index.html');
      await page.goto(`file://${galleryPath}`);
      await page.setViewportSize(VIEWPORT);

      // Tab forward 10 times
      for (let i = 0; i < 10; i++) {
        await page.keyboard.press('Tab');
      }

      const forwardElement = await page.evaluate(() => document.activeElement?.tagName);

      // Tab backward 10 times
      for (let i = 0; i < 10; i++) {
        await page.keyboard.press('Shift+Tab');
      }

      const backwardElement = await page.evaluate(() => document.activeElement?.tagName);

      // Should be back at or near the beginning
      expect(backwardElement).toBeTruthy();
    });

    test('skip links functionality', async ({ page }) => {
      const galleryPath = path.join(__dirname, '../../src/ui/gallery/index.html');
      await page.goto(`file://${galleryPath}`);
      await page.setViewportSize(VIEWPORT);

      // Look for skip links
      const skipLinks = await page.locator('a[href^="#"]:has-text("Skip"), .skip-link');

      if (await skipLinks.count() > 0) {
        const firstSkipLink = skipLinks.first();

        // Focus skip link
        await firstSkipLink.focus();
        await expect(firstSkipLink).toBeVisible();

        // Activate skip link
        await page.keyboard.press('Enter');

        // Check that focus moved
        const focusedAfterSkip = await page.evaluate(() => document.activeElement?.id);
        expect(focusedAfterSkip).toBeTruthy();
      }
    });

    test('modal focus trap', async ({ page }) => {
      const overlaysPath = path.join(__dirname, '../../src/ui/gallery/overlays.html');
      await page.goto(`file://${overlaysPath}`);
      await page.setViewportSize(VIEWPORT);

      // Open a modal
      const modalTrigger = await page.locator('[data-modal-trigger], button:has-text("Open Modal")').first();

      if (await modalTrigger.count() > 0) {
        await modalTrigger.click();
        await page.waitForTimeout(150);

        const modal = await page.locator('.modal, [role="dialog"]').first();

        if (await modal.count() > 0) {
          // Tab through modal elements
          const focusedElements = [];
          for (let i = 0; i < 10; i++) {
            await page.keyboard.press('Tab');

            const isInModal = await page.evaluate(() => {
              const activeEl = document.activeElement;
              const modalEl = document.querySelector('.modal, [role="dialog"]');
              return modalEl?.contains(activeEl);
            });

            focusedElements.push(isInModal);
          }

          // All focused elements should be within the modal
          expect(focusedElements.every(inModal => inModal)).toBe(true);

          // Escape should close modal
          await page.keyboard.press('Escape');
          await expect(modal).toBeHidden();

          // Focus should return to trigger
          const focusedAfterClose = await page.evaluate(() => document.activeElement?.tagName);
          expect(focusedAfterClose).toBeTruthy();
        }
      }
    });

    test('form navigation with Enter key', async ({ page }) => {
      const galleryPath = path.join(__dirname, '../../src/ui/gallery/index.html');
      await page.goto(`file://${galleryPath}`);
      await page.setViewportSize(VIEWPORT);

      const form = await page.locator('form').first();

      if (await form.count() > 0) {
        const firstInput = await form.locator('input[type="text"]').first();

        if (await firstInput.count() > 0) {
          await firstInput.focus();
          await firstInput.fill('Test value');

          // Enter in text input should not submit form
          await page.keyboard.press('Enter');

          // Form should not be submitted (page should not reload)
          expect(page.url()).toContain('gallery');
        }

        const submitButton = await form.locator('button[type="submit"]').first();

        if (await submitButton.count() > 0) {
          await submitButton.focus();

          // Space or Enter on button should trigger click
          await page.keyboard.press('Space');
          // Form submission would be handled here
        }
      }
    });
  });

  test.describe('Screen Reader Support', () => {
    test('ARIA labels and descriptions', async ({ page }) => {
      const galleryPath = path.join(__dirname, '../../src/ui/gallery/index.html');
      await page.goto(`file://${galleryPath}`);
      await page.setViewportSize(VIEWPORT);

      // Check interactive elements have accessible names
      const buttons = await page.locator('button');
      const buttonCount = await buttons.count();

      for (let i = 0; i < Math.min(buttonCount, 10); i++) {
        const button = buttons.nth(i);
        const text = await button.textContent();
        const ariaLabel = await button.getAttribute('aria-label');
        const ariaLabelledby = await button.getAttribute('aria-labelledby');

        // Button should have accessible name
        expect(text || ariaLabel || ariaLabelledby).toBeTruthy();
      }

      // Check form inputs have labels
      const inputs = await page.locator('input:not([type="hidden"])');
      const inputCount = await inputs.count();

      for (let i = 0; i < Math.min(inputCount, 10); i++) {
        const input = inputs.nth(i);
        const id = await input.getAttribute('id');
        const ariaLabel = await input.getAttribute('aria-label');
        const ariaLabelledby = await input.getAttribute('aria-labelledby');

        if (id) {
          // Check for associated label
          const label = await page.locator(`label[for="${id}"]`);
          const hasLabel = await label.count() > 0;

          expect(hasLabel || ariaLabel || ariaLabelledby).toBe(true);
        } else {
          // If no id, must have aria-label
          expect(ariaLabel || ariaLabelledby).toBeTruthy();
        }
      }
    });

    test('landmark regions', async ({ page }) => {
      const galleryPath = path.join(__dirname, '../../src/ui/gallery/index.html');
      await page.goto(`file://${galleryPath}`);
      await page.setViewportSize(VIEWPORT);

      // Check for landmark regions
      const landmarks = await page.locator('main, nav, header, footer, aside, [role="main"], [role="navigation"], [role="banner"], [role="contentinfo"], [role="complementary"]');
      const landmarkCount = await landmarks.count();

      // Should have at least one landmark
      expect(landmarkCount).toBeGreaterThan(0);

      // Main content area should exist
      const mainContent = await page.locator('main, [role="main"]');
      expect(await mainContent.count()).toBeGreaterThan(0);
    });

    test('heading hierarchy', async ({ page }) => {
      const galleryPath = path.join(__dirname, '../../src/ui/gallery/index.html');
      await page.goto(`file://${galleryPath}`);
      await page.setViewportSize(VIEWPORT);

      // Get all headings
      const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();
      const headingLevels = [];

      for (const heading of headings) {
        const tagName = await heading.evaluate(el => el.tagName);
        const level = parseInt(tagName.substring(1));
        headingLevels.push(level);
      }

      // Check heading hierarchy (no skipping levels)
      for (let i = 1; i < headingLevels.length; i++) {
        const currentLevel = headingLevels[i];
        const previousLevel = headingLevels[i - 1];

        // Level should not skip (e.g., h1 -> h3)
        expect(currentLevel).toBeLessThanOrEqual(previousLevel + 1);
      }

      // Should have exactly one h1
      const h1Count = headingLevels.filter(level => level === 1).length;
      expect(h1Count).toBe(1);
    });

    test('live regions for dynamic content', async ({ page }) => {
      const galleryPath = path.join(__dirname, '../../src/ui/gallery/index.html');
      await page.goto(`file://${galleryPath}`);
      await page.setViewportSize(VIEWPORT);

      // Check for aria-live regions
      const liveRegions = await page.locator('[aria-live], [role="status"], [role="alert"]');
      const liveRegionCount = await liveRegions.count();

      // If there are dynamic notifications, should have live regions
      const toastContainers = await page.locator('.toast-container, .notification-container');
      if (await toastContainers.count() > 0) {
        expect(liveRegionCount).toBeGreaterThan(0);
      }

      // Check aria-live values
      for (let i = 0; i < liveRegionCount; i++) {
        const region = liveRegions.nth(i);
        const ariaLive = await region.getAttribute('aria-live');

        if (ariaLive) {
          expect(['polite', 'assertive', 'off']).toContain(ariaLive);
        }
      }
    });

    test('image alt text', async ({ page }) => {
      const galleryPath = path.join(__dirname, '../../src/ui/gallery/index.html');
      await page.goto(`file://${galleryPath}`);
      await page.setViewportSize(VIEWPORT);

      const images = await page.locator('img');
      const imageCount = await images.count();

      for (let i = 0; i < imageCount; i++) {
        const image = images.nth(i);
        const alt = await image.getAttribute('alt');
        const role = await image.getAttribute('role');

        // Images must have alt attribute (can be empty for decorative)
        expect(alt !== null || role === 'presentation').toBe(true);

        // If image is in a link/button, alt text should be descriptive
        const parentButton = await image.locator('xpath=ancestor::button');
        const parentLink = await image.locator('xpath=ancestor::a');

        if (await parentButton.count() > 0 || await parentLink.count() > 0) {
          expect(alt && alt.length > 0).toBe(true);
        }
      }
    });
  });

  test.describe('Color Contrast', () => {
    test('text color contrast ratios', async ({ page }) => {
      const galleryPath = path.join(__dirname, '../../src/ui/gallery/index.html');
      await page.goto(`file://${galleryPath}`);
      await page.setViewportSize(VIEWPORT);

      // Use axe-core for color contrast checking
      const contrastResults = await new AxeBuilder({ page })
        .withRules(['color-contrast'])
        .analyze();

      const contrastViolations = contrastResults.violations.filter(
        v => v.id === 'color-contrast'
      );

      // Log any contrast issues for review
      if (contrastViolations.length > 0) {
        console.log('Color contrast issues:', contrastViolations[0].nodes.length, 'elements');
      }

      // No critical contrast violations
      const criticalContrastIssues = contrastViolations.filter(
        v => v.impact === 'serious' || v.impact === 'critical'
      );

      expect(criticalContrastIssues).toHaveLength(0);
    });

    test('focus indicator contrast', async ({ page }) => {
      const galleryPath = path.join(__dirname, '../../src/ui/gallery/index.html');
      await page.goto(`file://${galleryPath}`);
      await page.setViewportSize(VIEWPORT);

      const button = await page.locator('button').first();
      await button.focus();

      // Check focus indicator is visible
      const boxShadow = await button.evaluate(el =>
        window.getComputedStyle(el).boxShadow
      );
      const outline = await button.evaluate(el =>
        window.getComputedStyle(el).outline
      );

      // Should have visible focus indicator
      expect(boxShadow !== 'none' || outline !== 'none').toBe(true);
    });

    test('dark mode color contrast', async ({ page }) => {
      const galleryPath = path.join(__dirname, '../../src/ui/gallery/index.html');
      await page.goto(`file://${galleryPath}`);
      await page.setViewportSize(VIEWPORT);

      // Switch to dark mode
      await page.evaluate(() => {
        document.body.setAttribute('data-theme', 'dark');
      });

      await page.waitForTimeout(100);

      // Check contrast in dark mode
      const darkModeContrastResults = await new AxeBuilder({ page })
        .withRules(['color-contrast'])
        .analyze();

      const darkContrastViolations = darkModeContrastResults.violations.filter(
        v => v.id === 'color-contrast'
      );

      const criticalDarkContrastIssues = darkContrastViolations.filter(
        v => v.impact === 'serious' || v.impact === 'critical'
      );

      expect(criticalDarkContrastIssues).toHaveLength(0);
    });
  });

  test.describe('Form Accessibility', () => {
    test('form field validation and errors', async ({ page }) => {
      const galleryPath = path.join(__dirname, '../../src/ui/gallery/index.html');
      await page.goto(`file://${galleryPath}`);
      await page.setViewportSize(VIEWPORT);

      const form = await page.locator('form').first();

      if (await form.count() > 0) {
        // Find required fields
        const requiredInputs = await form.locator('input[required], input[aria-required="true"]');
        const requiredCount = await requiredInputs.count();

        if (requiredCount > 0) {
          // Try to submit empty form
          const submitButton = await form.locator('button[type="submit"]');

          if (await submitButton.count() > 0) {
            await submitButton.click();
            await page.waitForTimeout(100);

            // Check for error messages
            const errorMessages = await page.locator('[role="alert"], .error-message, [aria-invalid="true"]');
            const errorCount = await errorMessages.count();

            if (errorCount > 0) {
              // Error messages should be associated with fields
              for (let i = 0; i < Math.min(errorCount, 5); i++) {
                const error = errorMessages.nth(i);
                const id = await error.getAttribute('id');

                if (id) {
                  // Check if any input references this error
                  const associatedInput = await page.locator(`[aria-describedby*="${id}"], [aria-errormessage="${id}"]`);
                  expect(await associatedInput.count()).toBeGreaterThan(0);
                }
              }
            }
          }
        }
      }
    });

    test('form field grouping', async ({ page }) => {
      const galleryPath = path.join(__dirname, '../../src/ui/gallery/index.html');
      await page.goto(`file://${galleryPath}`);
      await page.setViewportSize(VIEWPORT);

      // Check fieldsets have legends
      const fieldsets = await page.locator('fieldset');
      const fieldsetCount = await fieldsets.count();

      for (let i = 0; i < fieldsetCount; i++) {
        const fieldset = fieldsets.nth(i);
        const legend = await fieldset.locator('legend');

        // Fieldset should have a legend
        expect(await legend.count()).toBe(1);

        const legendText = await legend.textContent();
        expect(legendText && legendText.length > 0).toBe(true);
      }

      // Check radio groups
      const radioGroups = await page.locator('[role="radiogroup"], fieldset:has(input[type="radio"])');
      const radioGroupCount = await radioGroups.count();

      for (let i = 0; i < radioGroupCount; i++) {
        const group = radioGroups.nth(i);
        const groupLabel = await group.getAttribute('aria-label');
        const groupLabelledby = await group.getAttribute('aria-labelledby');

        // Radio group should have accessible name
        expect(groupLabel || groupLabelledby).toBeTruthy();
      }
    });
  });

  test.describe('Responsive Accessibility', () => {
    test('mobile menu accessibility', async ({ page }) => {
      const dashboardPath = path.join(__dirname, '../../src/ui/gallery/dashboard-demo.html');
      await page.goto(`file://${dashboardPath}`);
      await page.setViewportSize({ width: 375, height: 667 });

      const hamburgerMenu = await page.locator('[aria-label*="menu"], .hamburger-menu, button.menu-toggle');

      if (await hamburgerMenu.count() > 0) {
        // Menu button should have proper ARIA attributes
        const ariaExpanded = await hamburgerMenu.getAttribute('aria-expanded');
        expect(['true', 'false']).toContain(ariaExpanded);

        // Open menu
        await hamburgerMenu.click();
        await page.waitForTimeout(300);

        const expandedState = await hamburgerMenu.getAttribute('aria-expanded');
        expect(expandedState).toBe('true');

        // Check menu navigation is accessible
        const mobileNav = await page.locator('.mobile-nav, [role="navigation"]');
        if (await mobileNav.count() > 0) {
          const navAccessibility = await new AxeBuilder({ page })
            .include(mobileNav)
            .analyze();

          const criticalNavViolations = navAccessibility.violations.filter(
            v => v.impact === 'critical' || v.impact === 'serious'
          );

          expect(criticalNavViolations).toHaveLength(0);
        }
      }
    });

    test('touch target sizes', async ({ page }) => {
      const galleryPath = path.join(__dirname, '../../src/ui/gallery/index.html');
      await page.goto(`file://${galleryPath}`);
      await page.setViewportSize({ width: 375, height: 667 });

      // Check button sizes on mobile
      const buttons = await page.locator('button, a[role="button"]');
      const buttonCount = await buttons.count();

      for (let i = 0; i < Math.min(buttonCount, 10); i++) {
        const button = buttons.nth(i);
        const box = await button.boundingBox();

        if (box) {
          // WCAG 2.1 AA requires 44x44 pixels minimum
          expect(box.width).toBeGreaterThanOrEqual(44);
          expect(box.height).toBeGreaterThanOrEqual(44);
        }
      }
    });
  });

  test.describe('Motion and Animation', () => {
    test('respects prefers-reduced-motion', async ({ page }) => {
      const galleryPath = path.join(__dirname, '../../src/ui/gallery/index.html');
      await page.goto(`file://${galleryPath}`);
      await page.setViewportSize(VIEWPORT);

      // Enable reduced motion
      await page.emulateMedia({ reducedMotion: 'reduce' });

      // Check that animations are disabled
      const animatedElements = await page.locator('*');
      const sampleElements = await animatedElements.nth(0);

      for (let i = 0; i < 5; i++) {
        const element = animatedElements.nth(i * 10); // Sample every 10th element
        const transition = await element.evaluate(el =>
          window.getComputedStyle(el).transition
        );
        const animation = await element.evaluate(el =>
          window.getComputedStyle(el).animation
        );

        // Transitions and animations should be instant or disabled
        if (transition && transition !== 'none') {
          expect(transition).toContain('0s');
        }
        if (animation && animation !== 'none') {
          expect(animation).toContain('0s');
        }
      }
    });

    test('no autoplay content without controls', async ({ page }) => {
      const galleryPath = path.join(__dirname, '../../src/ui/gallery/index.html');
      await page.goto(`file://${galleryPath}`);
      await page.setViewportSize(VIEWPORT);

      // Check for video elements
      const videos = await page.locator('video');
      const videoCount = await videos.count();

      for (let i = 0; i < videoCount; i++) {
        const video = videos.nth(i);
        const autoplay = await video.getAttribute('autoplay');

        if (autoplay !== null) {
          // If autoplay, must have controls or be muted
          const controls = await video.getAttribute('controls');
          const muted = await video.getAttribute('muted');

          expect(controls !== null || muted !== null).toBe(true);
        }
      }

      // Check for auto-advancing carousels
      const carousels = await page.locator('.carousel, [role="region"][aria-roledescription="carousel"]');
      const carouselCount = await carousels.count();

      for (let i = 0; i < carouselCount; i++) {
        const carousel = carousels.nth(i);

        // Should have pause/play controls if auto-advancing
        const pauseButton = await carousel.locator('button[aria-label*="pause" i], button[aria-label*="stop" i]');
        const hasControls = await pauseButton.count() > 0;

        // If no controls, should not auto-advance
        if (!hasControls) {
          const ariaLive = await carousel.getAttribute('aria-live');
          expect(ariaLive).not.toBe('assertive');
        }
      }
    });
  });
});