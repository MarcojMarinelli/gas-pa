/**
 * Google Apps Script Web App Entry Point - Plain JavaScript
 * Minimal version without dependencies to avoid initialization errors
 */

/**
 * Handle GET requests
 */
function doGet(e) {
  try {
    const path = e.pathInfo || '/';
    const params = e.parameter || {};

    // API endpoint - health check
    if (path === '/health' || path === '/api/health' || params.endpoint === 'health') {
      return ContentService.createTextOutput(
        JSON.stringify({
          success: true,
          data: {
            status: 'healthy',
            version: '1.0.0',
            timestamp: new Date().toISOString()
          }
        })
      ).setMimeType(ContentService.MimeType.JSON);
    }

    // API endpoint - JSON response
    if (path.startsWith('/api/') || params.format === 'json') {
      return ContentService.createTextOutput(
        JSON.stringify({
          success: true,
          data: {
            message: 'GAS-PA API',
            version: '1.0.0',
            endpoints: ['/api/health']
          }
        })
      ).setMimeType(ContentService.MimeType.JSON);
    }

    // Default - serve HTML UI
    return HtmlService.createHtmlOutputFromFile('demo')
      .setTitle('GAS-PA Dashboard')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);

  } catch (error) {
    return ContentService.createTextOutput(
      JSON.stringify({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message || 'Unknown error'
        }
      })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Handle POST requests
 */
function doPost(e) {
  try {
    return ContentService.createTextOutput(
      JSON.stringify({
        success: true,
        data: {
          message: 'POST request received',
          path: e.pathInfo || '/'
        }
      })
    ).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(
      JSON.stringify({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message || 'Unknown error'
        }
      })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Initialize web app
 */
function initializeWebApp() {
  console.log('✓ GAS-PA Web App initialized (minimal version)');
  console.log('✓ Health endpoint available at /api/health');
}

/**
 * Test web app
 */
function testWebApp() {
  console.log('Testing GAS-PA Web App...');

  const testRequest = {
    pathInfo: '/health',
    parameter: {},
    queryString: ''
  };

  const response = doGet(testRequest);
  console.log('Response:', response.getContent());
  console.log('✓ Test passed!');
}
