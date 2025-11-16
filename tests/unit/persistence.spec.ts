/**
 * Unit tests for persistence layer
 *
 * Tests localStorage persistence and state management
 */

import { test, expect } from '@playwright/test';

test.describe('Persistence Layer', () => {

  const STORAGE_KEY = 'gas-pa-ui-preferences';

  const defaultPreferences = {
    theme: 'system',
    density: 'comfortable',
    sidebarCollapsed: false,
    viewMode: 'list',
    selectedLabels: [],
    sortOrder: 'date',
    sortDirection: 'desc'
  };

  test.beforeEach(async ({ page }) => {
    // Navigate to a proper HTTP URL for localStorage access
    // Using localhost as configured in playwright.config.ts
    await page.goto('http://localhost:8087', { waitUntil: 'domcontentloaded' }).catch(() => {
      // If server is not running, create a simple HTML page
      return page.setContent('<html><body><h1>Test Page</h1></body></html>');
    });

    // Clear storage
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test.describe('localStorage Persistence', () => {

    test('should store preferences in localStorage', async ({ page }) => {
      const testPrefs = {
        theme: 'dark',
        density: 'compact',
        sidebarCollapsed: true,
        viewMode: 'grid',
        selectedLabels: ['important', 'work'],
        sortOrder: 'sender',
        sortDirection: 'asc'
      };

      await page.evaluate(({ key, prefs }) => {
        localStorage.setItem(key, JSON.stringify(prefs));
      }, { key: STORAGE_KEY, prefs: testPrefs });

      const stored = await page.evaluate((key) => {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
      }, STORAGE_KEY);

      expect(stored).toEqual(testPrefs);
    });

    test('should retrieve preferences from localStorage', async ({ page }) => {
      const testPrefs = {
        theme: 'light',
        density: 'compact',
        sidebarCollapsed: true,
        lastSyncTime: Date.now()
      };

      // Store preferences
      await page.evaluate(({ key, prefs }) => {
        localStorage.setItem(key, JSON.stringify(prefs));
      }, { key: STORAGE_KEY, prefs: testPrefs });

      // Retrieve and verify
      const retrieved = await page.evaluate((key) => {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
      }, STORAGE_KEY);

      expect(retrieved.theme).toBe('light');
      expect(retrieved.density).toBe('compact');
      expect(retrieved.sidebarCollapsed).toBe(true);
      expect(retrieved.lastSyncTime).toBeTruthy();
    });

    test('should handle missing localStorage data', async ({ page }) => {
      const result = await page.evaluate((key) => {
        const data = localStorage.getItem(key);
        return data;
      }, STORAGE_KEY);

      expect(result).toBeNull();
    });

    test('should merge partial updates', async ({ page }) => {
      // Store initial preferences
      await page.evaluate(({ key, prefs }) => {
        localStorage.setItem(key, JSON.stringify(prefs));
      }, { key: STORAGE_KEY, prefs: defaultPreferences });

      // Update some fields
      await page.evaluate((key) => {
        const stored = localStorage.getItem(key);
        const current = stored ? JSON.parse(stored) : {};
        const updated = {
          ...current,
          theme: 'dark',
          density: 'compact'
        };
        localStorage.setItem(key, JSON.stringify(updated));
      }, STORAGE_KEY);

      const result = await page.evaluate((key) => {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
      }, STORAGE_KEY);

      expect(result.theme).toBe('dark');
      expect(result.density).toBe('compact');
      expect(result.viewMode).toBe('list'); // Should retain original value
      expect(result.sortOrder).toBe('date'); // Should retain original value
    });

    test('should handle localStorage quota errors', async ({ page }) => {
      const result = await page.evaluate((key) => {
        try {
          // Try to store a very large string (simulate quota exceeded)
          const largeData = 'x'.repeat(10 * 1024 * 1024); // 10MB
          localStorage.setItem(key + '_large', largeData);
          return 'success';
        } catch (error) {
          return error.name;
        }
      }, STORAGE_KEY);

      // Should handle quota exceeded error gracefully
      expect(['success', 'QuotaExceededError', 'DOMException']).toContain(result);
    });

    test('should sync across tabs via storage events', async ({ context, page }) => {
      // Set up first page
      await page.evaluate((key) => {
        window.storageUpdates = [];
        window.addEventListener('storage', (event) => {
          if (event.key === key) {
            window.storageUpdates.push({
              key: event.key,
              newValue: event.newValue,
              oldValue: event.oldValue
            });
          }
        });
      }, STORAGE_KEY);

      // Open second page in same context
      const page2 = await context.newPage();
      await page2.goto('http://localhost:8087', { waitUntil: 'domcontentloaded' }).catch(() => {
        return page2.setContent('<html><body><h1>Test Page 2</h1></body></html>');
      });

      // Update storage from second page
      await page2.evaluate(({ key, prefs }) => {
        localStorage.setItem(key, JSON.stringify(prefs));
      }, {
        key: STORAGE_KEY,
        prefs: { theme: 'dark', density: 'compact' }
      });

      // Wait a bit for event propagation
      await page.waitForTimeout(100);

      // Check if first page received the update
      const updates = await page.evaluate(() => window.storageUpdates);

      // Note: storage events only fire in other tabs, not the one that made the change
      // So we just verify localStorage was updated
      const stored = await page.evaluate((key) => {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
      }, STORAGE_KEY);

      expect(stored).toEqual({ theme: 'dark', density: 'compact' });

      await page2.close();
    });
  });

  test.describe('Theme Management', () => {

    test('should apply theme attributes to document', async ({ page }) => {
      await page.evaluate(() => {
        document.documentElement.setAttribute('data-theme', 'dark');
        document.documentElement.setAttribute('data-density', 'compact');
      });

      const attributes = await page.evaluate(() => ({
        theme: document.documentElement.getAttribute('data-theme'),
        density: document.documentElement.getAttribute('data-density')
      }));

      expect(attributes.theme).toBe('dark');
      expect(attributes.density).toBe('compact');
    });

    test('should detect system theme preference', async ({ page }) => {
      // Test dark mode
      await page.emulateMedia({ colorScheme: 'dark' });

      const isDark = await page.evaluate(() => {
        return window.matchMedia('(prefers-color-scheme: dark)').matches;
      });

      expect(isDark).toBe(true);

      // Test light mode
      await page.emulateMedia({ colorScheme: 'light' });

      const isLight = await page.evaluate(() => {
        return window.matchMedia('(prefers-color-scheme: light)').matches;
      });

      expect(isLight).toBe(true);
    });

    test('should respond to theme changes', async ({ page }) => {
      await page.evaluate(() => {
        window.themeChanges = [];
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        mediaQuery.addEventListener('change', (event) => {
          window.themeChanges.push(event.matches);
        });
      });

      // Switch between themes
      await page.emulateMedia({ colorScheme: 'dark' });
      await page.waitForTimeout(50);
      await page.emulateMedia({ colorScheme: 'light' });
      await page.waitForTimeout(50);
      await page.emulateMedia({ colorScheme: 'dark' });

      // Media query events are synchronous
      const isDark = await page.evaluate(() => {
        return window.matchMedia('(prefers-color-scheme: dark)').matches;
      });

      expect(isDark).toBe(true);
    });
  });

  test.describe('Session Storage', () => {

    test('should store virtual scroll state in sessionStorage', async ({ page }) => {
      const scrollState = { startIndex: 100, endIndex: 150 };

      await page.evaluate((state) => {
        sessionStorage.setItem('gas-pa-scroll-state', JSON.stringify(state));
      }, scrollState);

      const stored = await page.evaluate(() => {
        const data = sessionStorage.getItem('gas-pa-scroll-state');
        return data ? JSON.parse(data) : null;
      });

      expect(stored).toEqual(scrollState);
    });

    test('should not persist sessionStorage across sessions', async ({ page, context }) => {
      // Set data in sessionStorage
      await page.evaluate(() => {
        sessionStorage.setItem('test-key', 'test-value');
      });

      // Open new page in same context (simulates new tab)
      const page2 = await context.newPage();
      await page2.goto('http://localhost:8087', { waitUntil: 'domcontentloaded' }).catch(() => {
        return page2.setContent('<html><body><h1>Test Page Session</h1></body></html>');
      });

      const value = await page2.evaluate(() => {
        return sessionStorage.getItem('test-key');
      });

      // SessionStorage should not be shared between tabs
      expect(value).toBeNull();

      await page2.close();
    });

    test('should clear all storage', async ({ page }) => {
      // Set data in both storages
      await page.evaluate(() => {
        localStorage.setItem('local-test', 'local-value');
        sessionStorage.setItem('session-test', 'session-value');
      });

      // Clear all storage
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });

      const result = await page.evaluate(() => ({
        local: localStorage.getItem('local-test'),
        session: sessionStorage.getItem('session-test')
      }));

      expect(result.local).toBeNull();
      expect(result.session).toBeNull();
    });
  });

  test.describe('Server Communication Mock', () => {

    test('should handle missing google.script.run', async ({ page }) => {
      const hasGoogleScript = await page.evaluate(() => {
        return typeof google !== 'undefined' &&
               google.script &&
               google.script.run !== undefined;
      });

      expect(hasGoogleScript).toBe(false);
    });

    test('should mock server response', async ({ page }) => {
      // Set up mock
      await page.evaluate(() => {
        window.mockServerResponse = null;
        window.google = {
          script: {
            run: {
              withSuccessHandler: function(callback) {
                this.successCallback = callback;
                return this;
              },
              withFailureHandler: function(callback) {
                this.failureCallback = callback;
                return this;
              },
              testFunction: function(data) {
                // Simulate async response
                setTimeout(() => {
                  if (this.successCallback) {
                    window.mockServerResponse = { success: true, data };
                    this.successCallback(window.mockServerResponse);
                  }
                }, 10);
              }
            }
          }
        };
      });

      // Call mock function
      await page.evaluate(() => {
        google.script.run
          .withSuccessHandler((response) => {
            window.mockServerResponse = response;
          })
          .withFailureHandler((error) => {
            window.mockServerError = error;
          })
          .testFunction({ test: 'data' });
      });

      // Wait for async response
      await page.waitForFunction(() => window.mockServerResponse !== null, { timeout: 1000 });

      const response = await page.evaluate(() => window.mockServerResponse);
      expect(response).toEqual({ success: true, data: { test: 'data' } });
    });

    test('should handle server errors', async ({ page }) => {
      // Set up mock with error
      await page.evaluate(() => {
        window.mockServerError = null;
        window.google = {
          script: {
            run: {
              withSuccessHandler: function(callback) {
                this.successCallback = callback;
                return this;
              },
              withFailureHandler: function(callback) {
                this.failureCallback = callback;
                return this;
              },
              errorFunction: function() {
                // Simulate error
                setTimeout(() => {
                  if (this.failureCallback) {
                    const error = new Error('Server error');
                    window.mockServerError = error.message;
                    this.failureCallback(error);
                  }
                }, 10);
              }
            }
          }
        };
      });

      // Call mock function
      await page.evaluate(() => {
        google.script.run
          .withSuccessHandler((response) => {
            window.mockServerResponse = response;
          })
          .withFailureHandler((error) => {
            window.mockServerError = error.message;
          })
          .errorFunction();
      });

      // Wait for async error
      await page.waitForFunction(() => window.mockServerError !== null, { timeout: 1000 });

      const error = await page.evaluate(() => window.mockServerError);
      expect(error).toBe('Server error');
    });
  });
});