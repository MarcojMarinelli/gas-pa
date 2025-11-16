import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import * as path from 'path';

// Configure viewport for consistent testing
const VIEWPORT = { width: 1280, height: 800 };

test.describe('Simple Accessibility Tests - WCAG 2.1 AA Compliance', () => {
  test('gallery page accessibility', async ({ page }) => {
    const galleryPath = path.join(__dirname, '../../src/ui/gallery/index.html');
    await page.goto(`file://${galleryPath}`);
    await page.setViewportSize(VIEWPORT);

    // Wait for any dynamic content
    await page.evaluate(() => {
      if (document.fonts && document.fonts.ready) {
        return document.fonts.ready;
      }
    });

    // Run axe accessibility scan
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    // Check for violations
    const criticalViolations = accessibilityScanResults.violations.filter(
      v => v.impact === 'critical' || v.impact === 'serious'
    );

    // Log any violations found
    if (criticalViolations.length > 0) {
      console.log('Critical violations found:');
      criticalViolations.forEach(violation => {
        console.log(`- ${violation.id}: ${violation.description}`);
        console.log(`  Impact: ${violation.impact}`);
        console.log(`  Elements: ${violation.nodes.length}`);
      });
    }

    // No critical or serious violations allowed
    expect(criticalViolations).toHaveLength(0);

    // Log moderate violations for awareness
    const moderateViolations = accessibilityScanResults.violations.filter(
      v => v.impact === 'moderate'
    );

    if (moderateViolations.length > 0) {
      console.log('\nModerate violations to review:');
      moderateViolations.forEach(violation => {
        console.log(`- ${violation.id}: ${violation.description}`);
      });
    }
  });

  test('dashboard demo accessibility', async ({ page }) => {
    const dashboardPath = path.join(__dirname, '../../src/ui/gallery/dashboard-demo.html');
    await page.goto(`file://${dashboardPath}`);
    await page.setViewportSize(VIEWPORT);

    await page.evaluate(() => {
      if (document.fonts && document.fonts.ready) {
        return document.fonts.ready;
      }
    });

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    const criticalViolations = accessibilityScanResults.violations.filter(
      v => v.impact === 'critical' || v.impact === 'serious'
    );

    expect(criticalViolations).toHaveLength(0);
  });

  test('keyboard navigation basic test', async ({ page }) => {
    const galleryPath = path.join(__dirname, '../../src/ui/gallery/index.html');
    await page.goto(`file://${galleryPath}`);
    await page.setViewportSize(VIEWPORT);

    // Tab through interactive elements
    const focusedElements = [];
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab');

      const focusedElement = await page.evaluate(() => {
        const el = document.activeElement;
        return {
          tagName: el?.tagName,
          text: el?.textContent?.trim().substring(0, 20),
          isInteractive: el ? (
            el.tagName === 'BUTTON' ||
            el.tagName === 'INPUT' ||
            el.tagName === 'A' ||
            el.hasAttribute('tabindex')
          ) : false
        };
      });

      if (focusedElement.tagName) {
        focusedElements.push(focusedElement);
      }
    }

    // Should have navigated through interactive elements
    const interactiveCount = focusedElements.filter(el => el.isInteractive).length;
    expect(interactiveCount).toBeGreaterThan(0);

    // All focused elements should be interactive
    focusedElements.forEach(el => {
      if (el.tagName) {
        expect(el.isInteractive).toBe(true);
      }
    });
  });

  test('theme switching maintains accessibility', async ({ page }) => {
    const galleryPath = path.join(__dirname, '../../src/ui/gallery/index.html');
    await page.goto(`file://${galleryPath}`);
    await page.setViewportSize(VIEWPORT);

    // Test light theme
    await page.click('#light');
    await page.waitForTimeout(100);

    const lightThemeResults = await new AxeBuilder({ page })
      .withRules(['color-contrast'])
      .analyze();

    const lightContrastViolations = lightThemeResults.violations.filter(
      v => v.id === 'color-contrast' && (v.impact === 'serious' || v.impact === 'critical')
    );

    expect(lightContrastViolations).toHaveLength(0);

    // Test dark theme
    await page.click('#dark');
    await page.waitForTimeout(100);

    const darkThemeResults = await new AxeBuilder({ page })
      .withRules(['color-contrast'])
      .analyze();

    const darkContrastViolations = darkThemeResults.violations.filter(
      v => v.id === 'color-contrast' && (v.impact === 'serious' || v.impact === 'critical')
    );

    expect(darkContrastViolations).toHaveLength(0);
  });

  test('interactive elements have accessible names', async ({ page }) => {
    const galleryPath = path.join(__dirname, '../../src/ui/gallery/index.html');
    await page.goto(`file://${galleryPath}`);
    await page.setViewportSize(VIEWPORT);

    // Check buttons have text content
    const buttons = await page.locator('button');
    const buttonCount = await buttons.count();

    for (let i = 0; i < buttonCount; i++) {
      const button = buttons.nth(i);
      const text = await button.textContent();
      const ariaLabel = await button.getAttribute('aria-label');

      // Button should have accessible name (text or aria-label)
      expect(text?.trim() || ariaLabel).toBeTruthy();
    }

    // Check inputs have labels or placeholders
    const inputs = await page.locator('input:not([type="hidden"])');
    const inputCount = await inputs.count();

    for (let i = 0; i < inputCount; i++) {
      const input = inputs.nth(i);
      const placeholder = await input.getAttribute('placeholder');
      const ariaLabel = await input.getAttribute('aria-label');
      const id = await input.getAttribute('id');

      // Input should have some form of label
      if (id) {
        const label = await page.locator(`label[for="${id}"]`);
        const hasLabel = await label.count() > 0;
        expect(hasLabel || placeholder || ariaLabel).toBeTruthy();
      } else {
        expect(placeholder || ariaLabel).toBeTruthy();
      }
    }
  });

  test('focus indicators are visible', async ({ page }) => {
    const galleryPath = path.join(__dirname, '../../src/ui/gallery/index.html');
    await page.goto(`file://${galleryPath}`);
    await page.setViewportSize(VIEWPORT);

    const button = await page.locator('button').first();
    await button.focus();

    // Check if focused element has visible focus indicator
    const hasFocusIndicator = await button.evaluate(el => {
      const styles = window.getComputedStyle(el);
      const hasOutline = styles.outline !== 'none' && styles.outline !== '';
      const hasBoxShadow = styles.boxShadow !== 'none' && styles.boxShadow !== '';
      const hasBorderChange = styles.borderWidth !== '0px';

      return hasOutline || hasBoxShadow || hasBorderChange;
    });

    // Should have some form of focus indicator
    expect(hasFocusIndicator).toBe(true);
  });

  test('page has proper structure and landmarks', async ({ page }) => {
    const galleryPath = path.join(__dirname, '../../src/ui/gallery/index.html');
    await page.goto(`file://${galleryPath}`);
    await page.setViewportSize(VIEWPORT);

    // Check for proper heading structure
    const h1Elements = await page.locator('h1');
    const h1Count = await h1Elements.count();

    // Should have exactly one h1
    expect(h1Count).toBe(1);

    // Check for semantic HTML usage
    const hasSemanticStructure = await page.evaluate(() => {
      const hasContainer = !!document.querySelector('.container, main, article, section');
      const hasButtons = !!document.querySelector('button');
      const hasProperNesting = !document.querySelector('button button'); // No nested buttons

      return hasContainer && hasButtons && hasProperNesting;
    });

    expect(hasSemanticStructure).toBe(true);
  });

  test('images have alt text', async ({ page }) => {
    const galleryPath = path.join(__dirname, '../../src/ui/gallery/index.html');
    await page.goto(`file://${galleryPath}`);
    await page.setViewportSize(VIEWPORT);

    const images = await page.locator('img');
    const imageCount = await images.count();

    // If there are images, they should have alt text
    for (let i = 0; i < imageCount; i++) {
      const image = images.nth(i);
      const alt = await image.getAttribute('alt');
      const role = await image.getAttribute('role');

      // Image should have alt attribute (can be empty for decorative) or presentation role
      expect(alt !== null || role === 'presentation').toBe(true);
    }
  });
});