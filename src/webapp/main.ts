/**
 * Google Apps Script Web App Entry Point
 * This file provides the doGet and doPost functions required by GAS
 */

import { getRouter } from './router';
import './routes'; // Import to register all routes
import Logger from '../core/logger';

/**
 * Handle GET requests (required by Google Apps Script)
 */
function doGet(e: GoogleAppsScript.Events.DoGet): GoogleAppsScript.Content.TextOutput {
  try {
    Logger.info('WebApp', 'GET request received', {
      path: e.pathInfo || '/',
      parameters: e.parameter
    });

    const router = getRouter();

    // Extract path from pathInfo or parameter
    const path = e.pathInfo || e.parameter.path || '/';

    // Create API request object
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

    // Handle the request through the router
    const response = router.handle(request);

    // Convert to GAS TextOutput
    const output = ContentService.createTextOutput(
      JSON.stringify(response.body)
    ).setMimeType(ContentService.MimeType.JSON);

    // Set HTTP status if supported
    if (response.statusCode !== 200) {
      Logger.warn('WebApp', `Non-200 status: ${response.statusCode}`);
    }

    return output;

  } catch (error) {
    Logger.error('WebApp', 'Failed to handle GET request', error);

    return ContentService.createTextOutput(
      JSON.stringify({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
          details: error instanceof Error ? error.message : String(error)
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
    Logger.info('WebApp', 'POST request received', {
      path: e.pathInfo || '/',
      contentType: e.postData?.type
    });

    const router = getRouter();

    // Extract path from pathInfo or parameter
    const path = e.pathInfo || e.parameter?.path || '/';

    // Parse POST data
    let postData = {};
    if (e.postData && e.postData.contents) {
      try {
        postData = JSON.parse(e.postData.contents);
      } catch (parseError) {
        Logger.warn('WebApp', 'Failed to parse POST data', parseError);
      }
    }

    // Create API request object
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

    // Handle the request through the router
    const response = router.handle(request);

    // Convert to GAS TextOutput
    const output = ContentService.createTextOutput(
      JSON.stringify(response.body)
    ).setMimeType(ContentService.MimeType.JSON);

    // Set HTTP status if supported
    if (response.statusCode !== 200) {
      Logger.warn('WebApp', `Non-200 status: ${response.statusCode}`);
    }

    return output;

  } catch (error) {
    Logger.error('WebApp', 'Failed to handle POST request', error);

    return ContentService.createTextOutput(
      JSON.stringify({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
          details: error instanceof Error ? error.message : String(error)
        }
      })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Handle PUT requests (via doPost with method parameter)
 */
function handlePUT(path: string, data: any, params: any): GoogleAppsScript.Content.TextOutput {
  const router = getRouter();

  const request = {
    method: 'PUT' as const,
    path: path,
    parameters: params,
    queryString: '',
    postData: data,
    headers: {},
    pathParams: {},
    user: undefined
  };

  const response = router.handle(request);

  return ContentService.createTextOutput(
    JSON.stringify(response.body)
  ).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Handle DELETE requests (via doPost with method parameter)
 */
function handleDELETE(path: string, params: any): GoogleAppsScript.Content.TextOutput {
  const router = getRouter();

  const request = {
    method: 'DELETE' as const,
    path: path,
    parameters: params,
    queryString: '',
    postData: {},
    headers: {},
    pathParams: {},
    user: undefined
  };

  const response = router.handle(request);

  return ContentService.createTextOutput(
    JSON.stringify(response.body)
  ).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Initialize function - can be called manually to verify setup
 */
function initializeWebApp(): void {
  const router = getRouter();
  const routes = router.getRoutes();

  Logger.info('WebApp', `Initialized with ${routes.length} routes`, {
    routes: routes.map(r => `${r.method} ${r.path}`)
  });

  console.log(`✓ GAS-PA Web App initialized successfully`);
  console.log(`✓ ${routes.length} API routes registered`);
  console.log(`✓ Ready to handle requests`);
}

/**
 * Test function - can be called manually to test the router
 */
function testWebApp(): void {
  console.log('Testing GAS-PA Web App...');

  try {
    // Test health endpoint
    const testRequest = {
      method: 'GET' as const,
      path: '/health',
      parameters: {},
      queryString: '',
      postData: {},
      headers: {},
      pathParams: {},
      user: undefined
    };

    const router = getRouter();
    const response = router.handle(testRequest);

    console.log('Health check response:', JSON.stringify(response.body, null, 2));
    console.log('✓ Test passed!');

  } catch (error) {
    console.error('✗ Test failed:', error);
  }
}

/**
 * List all available routes - for debugging
 */
function listRoutes(): void {
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
      if (route.description) {
        console.log(`     └─ ${route.description}`);
      }
    });
  });

  console.log(`\n=== End of routes ===\n`);
}

// Make functions globally available to Google Apps Script
// @ts-ignore
globalThis.doGet = doGet;
// @ts-ignore
globalThis.doPost = doPost;
// @ts-ignore
globalThis.handlePUT = handlePUT;
// @ts-ignore
globalThis.handleDELETE = handleDELETE;
// @ts-ignore
globalThis.initializeWebApp = initializeWebApp;
// @ts-ignore
globalThis.testWebApp = testWebApp;
// @ts-ignore
globalThis.listRoutes = listRoutes;
