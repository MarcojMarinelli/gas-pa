// Embed ui-bundle.js, ui-bundle.css, and app-bundle.js directly into dashboard.html
const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '..', 'dist');

// Read bundle files
const uiJs = fs.readFileSync(path.join(distDir, 'ui-bundle.js'), 'utf8');
const uiCss = fs.readFileSync(path.join(distDir, 'ui-bundle.css'), 'utf8');
const appJs = fs.readFileSync(path.join(distDir, 'app-bundle.js'), 'utf8');

// Get user info from GAS - these will be replaced at runtime by GAS template
const userEmailPlaceholder = '<?= getUserEmail(); ?>';
const userNamePlaceholder = '<?= getUserName(); ?>';

// Create embedded dashboard HTML
const embeddedHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="GAS-PA - Google Apps Script Personal Assistant Dashboard">
  <title>GAS-PA Dashboard</title>
  <base target="_top">

  <style>
    /* Loading Screen */
    #app-loading {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      transition: opacity 0.5s ease, visibility 0.5s ease;
    }

    #app-loading.hidden {
      opacity: 0;
      visibility: hidden;
    }

    .loading-spinner {
      width: 48px;
      height: 48px;
      border: 4px solid rgba(255, 255, 255, 0.3);
      border-top-color: #ffffff;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    .loading-text {
      margin-top: 24px;
      color: #ffffff;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
      font-size: 16px;
      font-weight: 500;
      letter-spacing: 0.5px;
    }

    .loading-logo {
      font-size: 48px;
      font-weight: 700;
      color: #ffffff;
      margin-bottom: 32px;
      text-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* App Container */
    #app {
      width: 100%;
      height: 100vh;
      overflow: hidden;
    }

    /* Base Reset */
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
  </style>

  <!-- UI Bundle CSS -->
  <style id="ui-bundle-styles">
${uiCss}
  </style>
</head>
<body>
  <!-- Loading Screen -->
  <div id="app-loading">
    <div class="loading-logo">GAS-PA</div>
    <div class="loading-spinner"></div>
    <div class="loading-text">Loading Dashboard...</div>
  </div>

  <!-- Application Container -->
  <div id="app"></div>

  <!-- UI Bundle JS -->
  <script>
    console.log('Loading UI Bundle...');
${uiJs}
    console.log('✓ UI Bundle loaded');
  </script>

  <!-- App Bundle JS -->
  <script>
    console.log('Loading App Bundle...');
${appJs}
    console.log('✓ App Bundle loaded, App type:', typeof App);
    if (typeof App !== 'undefined') {
      console.log('App exports:', Object.keys(App));
    }
  </script>

  <!-- Initialize Application -->
  <script>
    (function() {
      'use strict';

      // Get user info from GAS template
      const user = {
        name: '${userNamePlaceholder}',
        email: '${userEmailPlaceholder}'
      };

      console.log('Initializing GAS-PA Dashboard...');
      console.log('User:', user.email);

      // Wait for DOM to be ready
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initApp);
      } else {
        initApp();
      }

      function initApp() {
        try {
          const container = document.getElementById('app');

          if (!container) {
            throw new Error('App container not found');
          }

          // Check if App global is available
          if (typeof App === 'undefined') {
            throw new Error('App bundle not loaded. Please refresh the page.');
          }

          console.log('Creating app instance...');

          // Create app instance using the global App namespace
          const app = App.createApp({
            container: container,
            user: user,
            apiEndpoint: '',  // Same origin, no prefix needed
            enableMockData: false  // Use real API data
          });

          console.log('✓ App initialized successfully');

          // Hide loading screen after a brief delay
          setTimeout(function() {
            const loading = document.getElementById('app-loading');
            if (loading) {
              loading.classList.add('hidden');
              setTimeout(function() {
                loading.remove();
              }, 500);
            }
          }, 800);

        } catch (error) {
          console.error('Failed to initialize app:', error);

          // Show error message
          const loading = document.getElementById('app-loading');
          if (loading) {
            loading.innerHTML = \`
              <div class="loading-logo">GAS-PA</div>
              <div style="color: white; max-width: 400px; text-align: center; padding: 20px;">
                <h2 style="margin-bottom: 16px; font-size: 24px;">Initialization Error</h2>
                <p style="margin-bottom: 16px; font-size: 14px; opacity: 0.9;">
                  \${error.message || 'Failed to load the dashboard. Please try refreshing the page.'}
                </p>
                <button
                  onclick="window.location.reload()"
                  style="
                    background: white;
                    color: #1976d2;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 8px;
                    font-size: 14px;
                    font-weight: 500;
                    cursor: pointer;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
                  "
                >
                  Refresh Page
                </button>
              </div>
            \`;
          }
        }
      }

      // Global error handler
      window.addEventListener('error', function(event) {
        console.error('Global error:', event.error);
      });

      // Unhandled promise rejection handler
      window.addEventListener('unhandledrejection', function(event) {
        console.error('Unhandled promise rejection:', event.reason);
      });

    })();
  </script>
</body>
</html>
`;

// Write embedded HTML
fs.writeFileSync(path.join(distDir, 'dashboard.html'), embeddedHtml);

console.log('✓ Embedded dashboard bundles into dashboard.html');
