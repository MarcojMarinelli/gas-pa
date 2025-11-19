// Embed UI.js and UI.css directly into demo.html
const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '..', 'dist');

// Read files
const uiJs = fs.readFileSync(path.join(distDir, 'UI.js'), 'utf8');
const uiCss = fs.readFileSync(path.join(distDir, 'UI.css'), 'utf8');

// Create embedded HTML
const embeddedHtml = `<!DOCTYPE html>
<html>
<head>
  <base target="_top">
  <style>
${uiCss}
  </style>
</head>
<body>
  <div class="container">
    <h1>GAS-PA UI Components Demo</h1>

    <h2>Email Classification Dashboard</h2>
    <div id="dashboard"></div>

    <h2>Email Table</h2>
    <div id="email-table"></div>

    <h2>Quick Actions</h2>
    <div id="actions"></div>
  </div>

  <script>
${uiJs}
  </script>

  <script>
    // Initialize UI components once loaded
    document.addEventListener('DOMContentLoaded', function() {
      console.log('GAS-PA UI Demo loaded');

      // Example: Initialize table with sample data
      if (typeof window.GasPA !== 'undefined') {
        console.log('UI components available:', window.GasPA);
        // Initialize your components here
      }
    });
  </script>
</body>
</html>
`;

// Write embedded HTML
fs.writeFileSync(path.join(distDir, 'demo.html'), embeddedHtml);

console.log('✓ Embedded UI code into demo.html');
