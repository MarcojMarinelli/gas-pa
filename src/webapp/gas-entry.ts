/**
 * Google Apps Script Web App Entry Point - Minimal Version
 * This file provides doGet/doPost without loading heavy dependencies at initialization
 * Updated to serve dashboard HTML for root path, API for /api/* paths
 */

// Import client API functions (exposes them globally for google.script.run)
import './client-api';

// Lazy-load router to avoid initialization errors
let routerModule: any = null;

function getRouterModule() {
  if (!routerModule) {
    // Load router and routes only when first needed
    routerModule = require('./router');
    require('./routes'); // Register all routes
  }
  return routerModule;
}

/**
 * Main entry point - shows the dashboard
 * Called by doGet() when no path or root path is requested
 * Dashboard bundles are now embedded directly in dashboard.html
 */
function showDashboard(): GoogleAppsScript.HTML.HtmlOutput {
  try {
    // Create template from dashboard.html which has all bundles embedded
    const template = HtmlService.createTemplateFromFile('dashboard');

    // Evaluate the template (replaces <?= ?> placeholders)
    const html = template
      .evaluate()
      .setTitle('GAS-PA Dashboard')
      .setFaviconUrl('https://www.gstatic.com/images/branding/product/1x/apps_script_48dp.png')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');

    return html;
  } catch (error) {
    console.error('Failed to create dashboard:', error);

    // Return error page
    const errorHtml = HtmlService.createHtmlOutput(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Dashboard Error</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          }
          .error-container {
            background: white;
            padding: 48px;
            border-radius: 12px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            max-width: 500px;
            text-align: center;
          }
          h1 {
            color: #d32f2f;
            margin-bottom: 16px;
            font-size: 24px;
          }
          p {
            color: rgba(0,0,0,0.7);
            line-height: 1.6;
            margin-bottom: 24px;
          }
          code {
            background: #f5f5f5;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 13px;
          }
          button {
            background: #1976d2;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
          }
          button:hover {
            background: #1565c0;
          }
        </style>
      </head>
      <body>
        <div class="error-container">
          <h1>⚠️ Dashboard Error</h1>
          <p>Failed to load the dashboard. This may be due to missing files or a deployment issue.</p>
          <p><strong>Error:</strong> <code>${error}</code></p>
          <p>Please ensure the project is properly built and deployed.</p>
          <button onclick="window.location.reload()">Retry</button>
        </div>
      </body>
      </html>
    `)
      .setTitle('Dashboard Error')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);

    return errorHtml;
  }
}

/**
 * Get current user's name
 * Used in dashboard.html template
 */
function getUserName(): string {
  try {
    const email = Session.getActiveUser().getEmail();
    // Extract name from email (before @)
    const name = email.split('@')[0];
    // Capitalize first letter of each word
    return name
      .split('.')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  } catch (error) {
    console.error('Failed to get user name:', error);
    return 'User';
  }
}

/**
 * Get current user's email
 * Used in dashboard.html template
 */
function getUserEmail(): string {
  try {
    return Session.getActiveUser().getEmail();
  } catch (error) {
    console.error('Failed to get user email:', error);
    return '';
  }
}

/**
 * Include file content (for script/style includes)
 * Used in dashboard.html template
 */
function include(filename: string): string {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * Get UI Bundle JavaScript
 * Returns empty string since bundles are in separate files now
 */
function getUiBundleJs(): string {
  return include('ui-bundle');
}

/**
 * Get UI Bundle CSS
 */
function getUiBundleCss(): string {
  return include('ui-bundle-css');
}

/**
 * Get App Bundle JavaScript
 */
function getAppBundleJs(): string {
  return include('app-bundle');
}

/**
 * Handle GET requests (required by Google Apps Script)
 * Updated to serve dashboard HTML for root path, API for /api/* paths
 */
function doGet(e: GoogleAppsScript.Events.DoGet): GoogleAppsScript.HTML.HtmlOutput | GoogleAppsScript.Content.TextOutput {
  try {
    const path = e.pathInfo || e.parameter?.path || '/';

    // If no path or root path, show dashboard
    if (!path || path === '/' || path === '') {
      return showDashboard();
    }

    // Otherwise, handle API requests
    const { getRouter } = getRouterModule();
    const router = getRouter();

    const request = {
      method: 'GET' as const,
      path: path,
      parameters: e.parameter || {},
      queryString: e.queryString || '',
      postData: {},
      headers: {},
      pathParams: {},
      user: undefined
    };

    const response = router.handle(request);

    return ContentService.createTextOutput(
      JSON.stringify(response.body)
    ).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(
      JSON.stringify({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Handle POST requests (required by Google Apps Script)
 */
function doPost(e: GoogleAppsScript.Events.DoPost): GoogleAppsScript.Content.TextOutput {
  try {
    const { getRouter } = getRouterModule();
    const router = getRouter();

    const path = e.pathInfo || e.parameter?.path || '/';

    let postData: any = {};
    if (e.postData && e.postData.contents) {
      try {
        postData = JSON.parse(e.postData.contents);
      } catch {
        postData = { raw: e.postData.contents };
      }
    }

    const request = {
      method: 'POST' as const,
      path: path,
      parameters: e.parameter || {},
      queryString: e.queryString || '',
      postData: postData,
      headers: {},
      pathParams: {},
      user: undefined
    };

    const response = router.handle(request);

    return ContentService.createTextOutput(
      JSON.stringify(response.body)
    ).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(
      JSON.stringify({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Initialize the web app (loads all routes)
 */
function initializeWebApp(): void {
  console.log('Initializing GAS-PA Web App...');
  getRouterModule(); // Force load
  const { getRouter } = routerModule;
  const router = getRouter();
  const routes = router.getRoutes();
  console.log(`✓ Initialized with ${routes.length} routes`);
}

/**
 * Test the web app
 */
function testWebApp(): void {
  console.log('Testing GAS-PA Web App...');
  initializeWebApp();

  const testRequest = {
    pathInfo: '/health',
    parameter: {},
    queryString: '',
    postData: null
  } as GoogleAppsScript.Events.DoGet;

  const response = doGet(testRequest);
  console.log('Response:', response.getContent());
  console.log('✓ Test passed!');
}

/**
 * List all routes
 */
function listRoutes(): void {
  initializeWebApp();
  const { getRouter } = routerModule;
  const router = getRouter();
  const routes = router.getRoutes();

  console.log(`\n=== GAS-PA API Routes (${routes.length} total) ===\n`);

  const grouped: { [key: string]: typeof routes } = {};
  routes.forEach(route => {
    const category = route.path.split('/')[2] || 'root';
    if (!grouped[category]) grouped[category] = [];
    grouped[category].push(route);
  });

  Object.keys(grouped).sort().forEach(category => {
    console.log(`\n${category.toUpperCase()}:`);
    grouped[category].forEach(route => {
      const auth = route.requireAuth ? '🔒' : '🌐';
      console.log(`  ${auth} ${route.method.padEnd(6)} ${route.path}`);
    });
  });

  console.log(`\n=== End of routes ===\n`);
}

// Export to global scope
// @ts-ignore
globalThis.doGet = doGet;
// @ts-ignore
globalThis.doPost = doPost;
// @ts-ignore
globalThis.initializeWebApp = initializeWebApp;
// @ts-ignore
globalThis.testWebApp = testWebApp;
// @ts-ignore
globalThis.listRoutes = listRoutes;
// @ts-ignore
globalThis.showDashboard = showDashboard;
// @ts-ignore
globalThis.getUserName = getUserName;
// @ts-ignore
globalThis.getUserEmail = getUserEmail;
// @ts-ignore
globalThis.include = include;
// @ts-ignore
globalThis.getUiBundleJs = getUiBundleJs;
// @ts-ignore
globalThis.getUiBundleCss = getUiBundleCss;
// @ts-ignore
globalThis.getAppBundleJs = getAppBundleJs;
