/**
 * Google Apps Script Environment Shim
 * Prevents "window is not defined" errors by providing minimal browser globals
 */

// Define browser globals that libraries might check for
if (typeof window === 'undefined') {
  // @ts-ignore
  global.window = undefined;
}

if (typeof navigator === 'undefined') {
  // @ts-ignore
  global.navigator = undefined;
}

if (typeof document === 'undefined') {
  // @ts-ignore
  global.document = undefined;
}

// Export empty object to allow import
export {};
