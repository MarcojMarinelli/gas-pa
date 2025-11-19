# Available Functions in Google Apps Script Editor

After the deployment, you should now see these functions in the Apps Script Editor dropdown:

## ✅ Web App Entry Points (from webapp.js)

### `doGet(e)`
- **Description**: Handles HTTP GET requests to the web app
- **Usage**: Automatically called by Google Apps Script when someone accesses your web app URL
- **Returns**: JSON responses from the API router

### `doPost(e)`
- **Description**: Handles HTTP POST requests to the web app
- **Usage**: Automatically called for POST requests to your web app
- **Returns**: JSON responses from the API router

### `initializeWebApp()`
- **Description**: Manual initialization function to verify setup
- **Usage**: Run this to check that all 42 API routes are registered
- **Run**: Click "Run" > "initializeWebApp" to test
- **Output**: Logs number of routes and initialization status

### `testWebApp()`
- **Description**: Test function to verify the router is working
- **Usage**: Run this to test the /health endpoint
- **Run**: Click "Run" > "testWebApp"
- **Output**: Shows health check response

### `listRoutes()`
- **Description**: Lists all 42 API endpoints with descriptions
- **Usage**: Run this to see all available API routes
- **Run**: Click "Run" > "listRoutes"
- **Output**: Formatted list of all endpoints grouped by category

---

## 🔧 Backend Functions (from backend.js)

### Setup & Configuration

#### `authorizeScript()`
- **Description**: Test and authorize all required permissions
- **Usage**: Run FIRST before setup to grant permissions
- **Tests**: Gmail, Drive, Sheets, User info
- **Run**: Click "Run" > "authorizeScript"
- **Important**: Run this before anything else!

#### `setup()`
- **Description**: Initial setup - creates spreadsheets, labels, and triggers
- **Usage**: Run ONCE after authorizeScript to set up the system
- **Creates**:
  - Gmail labels (PA-Processed, PA-Priority, etc.)
  - Time-based triggers
  - Configuration spreadsheet
- **Run**: Click "Run" > "setup"
- **Sends**: Confirmation email when complete

#### `cleanupProperties()`
- **Description**: Clean up script properties (troubleshooting)
- **Usage**: Run if you're having setup issues
- **Run**: Click "Run" > "cleanupProperties"

---

### Email Processing Triggers

#### `processEmailsPeriodically()`
- **Description**: Main email processing function
- **Usage**: Automatically runs every 10 minutes (set up by setup())
- **Processes**: Unread emails, classifies them, adds to queue
- **Manual Run**: Click "Run" > "processEmailsPeriodically"
- **Trigger**: Auto (every 10 minutes)

#### `sendDailySummary()`
- **Description**: Sends daily email summary
- **Usage**: Automatically runs at 8:00 AM daily
- **Manual Run**: Click "Run" > "sendDailySummary"
- **Trigger**: Auto (8:00 AM daily)

#### `sendWeeklySummary()`
- **Description**: Sends weekly report
- **Usage**: Automatically runs Mondays at 9:00 AM
- **Manual Run**: Click "Run" > "sendWeeklySummary"
- **Trigger**: Auto (Mondays 9:00 AM)

#### `cleanupOldData()`
- **Description**: Cleans up old logs and data
- **Usage**: Automatically runs daily at 2:00 AM
- **Manual Run**: Click "Run" > "cleanupOldData"
- **Trigger**: Auto (2:00 AM daily)

---

### Testing & Debug Functions

#### `testEmailProcessing()`
- **Description**: Manual test of email processing
- **Usage**: Test the email processor without waiting for triggers
- **Run**: Click "Run" > "testEmailProcessing"
- **Output**: Logs processing results

#### `testDailySummary()`
- **Description**: Test daily summary generation
- **Usage**: Test summary email without waiting for schedule
- **Run**: Click "Run" > "testDailySummary"
- **Output**: Sends test summary email

#### `simpleTest()`
- **Description**: Simple spreadsheet creation test
- **Usage**: Test basic Google Sheets access
- **Run**: Click "Run" > "simpleTest"
- **Output**: Creates and deletes test spreadsheet

---

### Configuration Functions

#### `getConfiguration()`
- **Description**: Get current configuration
- **Usage**: View all script properties and settings
- **Run**: Click "Run" > "getConfiguration"
- **Returns**: Configuration object

#### `updateConfiguration(key, value)`
- **Description**: Update a configuration value
- **Usage**: Programmatically update settings
- **Parameters**:
  - `key`: Property name (e.g., 'MAX_EMAILS_PER_RUN')
  - `value`: New value
- **Example**: `updateConfiguration('MAX_EMAILS_PER_RUN', '100')`

#### `getStatistics()`
- **Description**: Get processing statistics
- **Usage**: View inbox and processing stats
- **Run**: Click "Run" > "getStatistics"
- **Returns**: Inbox stats and processing stats

#### `exportConfiguration()`
- **Description**: Export configuration for backup
- **Usage**: Backup your current settings
- **Run**: Click "Run" > "exportConfiguration"
- **Returns**: Configuration object with all settings

---

### Advanced Functions

#### `reprocessEmails(query)`
- **Description**: Force reprocess emails matching query
- **Usage**: Reprocess specific emails
- **Parameters**:
  - `query`: Gmail search query (default: 'label:PA-Processed')
- **Example**: `reprocessEmails('from:boss@company.com')`

---

## 🚀 Quick Start Workflow

1. **First Time Setup**:
   ```
   1. Run: authorizeScript() - Grant permissions
   2. Run: setup() - Initialize system
   3. Check your email for confirmation
   ```

2. **Test the Web App API**:
   ```
   1. Run: initializeWebApp() - Verify 42 routes
   2. Run: listRoutes() - See all API endpoints
   3. Run: testWebApp() - Test health endpoint
   ```

3. **Test Email Processing**:
   ```
   1. Run: testEmailProcessing() - Process emails now
   2. Check logs in "Executions" tab
   3. Check Gmail for PA-* labels
   ```

4. **Test Summaries**:
   ```
   1. Run: testDailySummary() - Test summary email
   2. Check your inbox for summary
   ```

---

## 📊 Viewing Function Output

After running a function:

1. **Check Execution Log**:
   - Bottom panel in Apps Script Editor
   - Shows console.log() output
   - Shows errors if any

2. **Check Execution History**:
   - Left sidebar > "Executions"
   - See all recent runs
   - View detailed logs
   - Check execution time

3. **Check Script Properties**:
   - Project Settings > Script Properties
   - See stored configuration

---

## 🔍 Expected Functions in Dropdown

When you click the dropdown next to "Run" in Apps Script Editor, you should see:

### From webapp.js (API Functions):
- doGet
- doPost
- handleDELETE
- handlePUT
- initializeWebApp ⭐ Run this first
- listRoutes ⭐ Run this to see all API routes
- testWebApp ⭐ Run this to test

### From backend.js (Backend Functions):
- authorizeScript ⭐ Run this FIRST
- setup ⭐ Run this SECOND
- cleanupProperties
- cleanupOldData
- exportConfiguration
- getConfiguration
- getStatistics
- processEmailsPeriodically ⭐ Main processing
- reprocessEmails
- sendDailySummary
- sendWeeklySummary
- simpleTest
- testDailySummary
- testEmailProcessing ⭐ Test processing
- updateConfiguration

---

## ⚠️ Common Issues

### "No functions available"
- **Cause**: Build or deployment issue
- **Fix**: Run `npm run build && clasp push`

### "Function not found"
- **Cause**: Function not exported globally
- **Fix**: Check that function uses `global.functionName = functionName`

### "Authorization required"
- **Cause**: Haven't granted permissions
- **Fix**: Run `authorizeScript()` first

### "ReferenceError: X is not defined"
- **Cause**: Missing dependency in bundle
- **Fix**: Check esbuild bundling includes all imports

---

## 📝 Notes

- **⭐ Starred functions** are recommended to run first/frequently
- Functions run in the context of your Google account
- Triggers run automatically once set up
- Manual runs count toward quota limits
- Check "Executions" tab to see trigger history

---

## 🆘 Need Help?

1. Run `listRoutes()` to see all API endpoints
2. Run `getConfiguration()` to see current settings
3. Run `getStatistics()` to see processing stats
4. Check "Executions" tab for detailed logs
5. Check project documentation in `/docs` folder

---

**Last Updated**: November 17, 2025
**Version**: 1.0.0
