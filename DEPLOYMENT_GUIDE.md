# GAS-PA Phase 2 Deployment & Testing Guide

## ✅ Current Status

The project has been successfully built and is ready for deployment. Here's what we've implemented:

### Phase 2 Components Ready:
- ✅ **ConfigManager** - Advanced configuration with validation
- ✅ **DatabaseService** - Full database operations on Google Sheets
- ✅ **LoggerService** - Structured logging with metrics
- ✅ **ErrorHandler** - Comprehensive error recovery
- ✅ **CacheManager** - Multi-layer caching system
- ✅ **OpenAIClient** - Complete OpenAI integration with rate limiting

## 🚀 Step-by-Step Deployment

### Step 1: Push to Google Apps Script

```bash
# Push the code to Google Apps Script
npm run push

# Or if you need to force push
clasp push -f
```

### Step 2: Open in Apps Script Editor

```bash
# Open the Apps Script project in your browser
npm run open

# Or
clasp open
```

### Step 3: Initial Authorization

Once in the Apps Script Editor:

1. Click on `Code.gs` to view the deployed code
2. From the function dropdown, select `authorizeScript`
3. Click "Run"
4. Authorize all requested permissions when prompted

### Step 4: Initialize Phase 2

In the Apps Script Editor:

1. Select `setupPhase2` from the function dropdown
2. Click "Run"
3. Check the execution log for success messages
4. You'll receive an email confirmation when complete

## 🔑 Setting Up OpenAI (Required for AI Features)

### Option 1: Via Apps Script Editor

1. Select `setOpenAIKey` from the function dropdown
2. Click "Run"
3. When prompted, enter your OpenAI API key (starts with `sk-`)

### Option 2: Via Console

In the Apps Script Editor console:
```javascript
setOpenAIKey('sk-your-actual-api-key-here')
```

### Option 3: Via Script Properties

1. Go to Project Settings (gear icon)
2. Scroll to "Script Properties"
3. Add property: `OPENAI_API_KEY` = `your-key-here`

## 🧪 Testing Phase 2 Components

### Test 1: Verify All Components

```javascript
// Run this to test all Phase 2 systems
testPhase2Components()
```

Expected output:
- ✅ ConfigManager: Loaded configurations
- ✅ DatabaseService: CRUD operations working
- ✅ LoggerService: Logging active
- ✅ CacheManager: Cache operations working
- ✅ ErrorHandler: Recovery mechanisms active
- ✅ OpenAIClient: Configured (if API key set)

### Test 2: AI Email Classification

**Prerequisites:** OpenAI API key must be set

```javascript
// Test email classification with AI
testClassification()
```

This will classify a sample email and show:
- Priority level (HIGH/MEDIUM/LOW)
- Category and labels
- Whether reply is needed
- Sentiment analysis
- Suggested actions
- Confidence score

### Test 3: AI Draft Generation

**Prerequisites:** OpenAI API key must be set

```javascript
// Test draft email generation
testDraftGeneration()
```

This will generate:
- Professional email reply
- Alternative response styles
- Confidence score

### Test 4: Check System Status

```javascript
// Get complete Phase 2 status
getPhase2Status()
```

Returns detailed status of:
- Configuration validity
- Database URL
- OpenAI configuration
- Cache statistics
- Recent errors
- Log statistics

## 📊 Viewing Your Database

After running `setupPhase2()`, a Google Sheets database is created. To access it:

1. Check the setup email for the database URL
2. Or run in console: `DatabaseService.getSpreadsheetUrl()`
3. Open the URL to see your database tables:
   - **Emails** - Processed emails
   - **FollowUps** - Follow-up queue
   - **Rules** - Processing rules
   - **VIPs** - Important contacts
   - **Analytics** - Usage statistics
   - **Logs** - System logs
   - **Metrics** - Performance metrics
   - **Cache** - Cached data

## 🔧 Troubleshooting

### Build Errors

```bash
# Clean build
rm -rf dist/
npm run build
```

### Deployment Errors

```bash
# Check clasp login status
clasp login --status

# Re-login if needed
clasp login

# Force push with verbose output
clasp push -f --verbose
```

### Authorization Issues

1. Run `authorizeScript()` again
2. Make sure to accept ALL permissions
3. Check that all OAuth scopes are in `appsscript.json`

### OpenAI Errors

1. Verify API key: `OpenAIClient.isConfigured()`
2. Check rate limits: `OpenAIClient.getRateLimitInfo()`
3. Test with a simple request first

### Database Errors

1. Check spreadsheet exists: `DatabaseService.getSpreadsheetUrl()`
2. Verify permissions on the spreadsheet
3. Run `DatabaseService.initialize()` to recreate tables

## 📝 Quick Reference

### Essential Functions

| Function | Purpose |
|----------|---------|
| `setupPhase2()` | Initialize all Phase 2 components |
| `setOpenAIKey(key)` | Configure OpenAI API |
| `testPhase2Components()` | Test all systems |
| `testClassification()` | Test email classification |
| `testDraftGeneration()` | Test AI drafts |
| `getPhase2Status()` | Get system status |

### Configuration Functions

| Function | Purpose |
|----------|---------|
| `exportPhase2Config()` | Export configuration JSON |
| `importPhase2Config(json)` | Import configuration |
| `updateConfiguration(key, value)` | Update a setting |
| `getConfiguration()` | View all settings |

## 📈 Monitoring

### View Logs

In your Google Sheets database:
1. Open the **Logs** sheet for system logs
2. Open the **ErrorLog** sheet for errors
3. Open the **Metrics** sheet for performance data

### Email Notifications

Critical errors automatically send email alerts to your Gmail.

## 🎯 Next Steps

Once testing is successful:

1. **Complete the Classification Engine**
   - Implement rule-based classification
   - Add learning mechanisms

2. **Build the Follow-up Queue**
   - Implement queue management
   - Add waiting-on-others detection

3. **Create the Gmail Add-on UI**
   - Build CardService interface
   - Add email context cards

4. **Develop Web Dashboard**
   - Create HTMLService app
   - Build analytics views

## 💡 Tips

1. **Start Small**: Test with a few emails first
2. **Monitor Quotas**: Check `getPhase2Status()` regularly
3. **Use Caching**: Reduces API calls and improves performance
4. **Check Logs**: Review the Logs sheet for debugging
5. **Backup Config**: Use `exportPhase2Config()` regularly

## 🆘 Need Help?

1. Check execution logs in Apps Script Editor
2. Review the ErrorLog sheet in your database
3. Run `getPhase2Status()` for system diagnostics
4. Check that all prerequisites are met
5. Verify OAuth scopes in `appsscript.json`

---

## Command Summary

```bash
# Build and deploy
npm run build     # Compile TypeScript
npm run push      # Deploy to Google Apps Script
npm run open      # Open in browser

# In Apps Script Console
authorizeScript()           # Initial authorization
setupPhase2()              # Initialize Phase 2
setOpenAIKey('sk-...')     # Set OpenAI key
testPhase2Components()     # Test all systems
testClassification()       # Test AI classification
testDraftGeneration()      # Test AI drafts
getPhase2Status()         # Check system status
```

---

**Ready to Deploy!** Follow the steps above to push your Phase 2 components to Google Apps Script and start testing.