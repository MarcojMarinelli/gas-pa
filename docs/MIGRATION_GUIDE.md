# Migration Guide: Personal to Work Account

This guide explains how to develop GAS-PA in your personal Google account and migrate it to your restricted LogicMonitor work account.

## Development Workflow

### Phase 1: Personal Account Development

#### Setup Development Environment
```bash
# On your Ubuntu server
cd ~/projects/gas-pa
./setup.sh

# Authenticate with personal account
clasp login

# Create project in personal account
clasp create --type webapp --title "GAS-PA Dev"
```

#### Development Cycle
```bash
# 1. Make changes in src/
# 2. Build TypeScript
npm run build

# 3. Push to personal account
npm run push

# 4. Test in personal account
npm run test
npm run logs
```

### Phase 2: Create Release Bundle

#### Generate Migration Bundle
```bash
# Build final version
npm run build

# Create timestamped release
./scripts/deploy.sh

# Bundle location: releases/[YYYYMMDD_HHMMSS]/
```

#### Bundle Contents
```
releases/20241108_143022/
├── bundle.gs         # Complete concatenated code
├── config.js         # Individual compiled files
├── logger.js
├── gmail.js
├── sheets.js
├── emailProcessor.js
├── timeBased.js
├── main.js
└── appsscript.json   # Manifest
```

### Phase 3: Work Account Deployment

#### Manual Deployment Steps

1. **Access Work Account**
   - Open browser in work environment
   - Navigate to script.google.com
   - Sign in with LogicMonitor account

2. **Create New Project**
   ```
   Click: New Project
   Name: "GAS-PA Production"
   ```

3. **Configure Manifest**
   - Click: Project Settings → Show "appsscript.json"
   - Copy content from `bundle/appsscript.json`
   - Save

4. **Add Code Files**
   - Delete default `Code.gs`
   - Create new files in this order:
     ```
     File → New → Script
     ```
   - Files to create:
     1. `Config.gs`
     2. `Logger.gs`
     3. `Gmail.gs`
     4. `Sheets.gs`
     5. `EmailProcessor.gs`
     6. `TimeBased.gs`
     7. `Main.gs`

5. **Copy Code**
   - For each file, copy corresponding section from `bundle.gs`
   - Or copy individual `.js` files from release folder
   - Save each file

6. **Set Script Properties**
   ```
   Project Settings → Script Properties → Add Property
   ```
   - Add each property:
     ```
     LOG_LEVEL = INFO
     PROCESS_WEEKENDS = false
     MAX_EMAILS_PER_RUN = 50
     ```

7. **Enable Gmail API**
   ```
   Services → Add Service → Gmail API → Add
   ```

8. **Run Initial Setup**
   - Open `Main.gs`
   - Select function: `setup`
   - Click: Run
   - Grant permissions when prompted

9. **Verify Deployment**
   - Check Gmail for setup confirmation email
   - Verify labels created in Gmail
   - Run: `testEmailProcessing()`
   - Check logs: View → Logs

## Version Control Strategy

### Personal Account (Full Git)
```bash
# Development branch
git checkout -b feature/new-feature
# Make changes
git add .
git commit -m "Add new feature"
git push origin feature/new-feature

# Create release
git checkout main
git merge feature/new-feature
git tag -a v1.0.1 -m "Release version 1.0.1"
git push origin main --tags
```

### Work Account (Version Tracking)
Create version comment in Main.gs:
```javascript
/**
 * GAS-PA Production
 * Version: 1.0.1
 * Deployed: 2024-11-08
 * Changes: Added priority detection
 */
```

## Troubleshooting Migration Issues

### Issue: Code Too Large
**Solution:** Split into multiple files
```javascript
// Instead of one bundle.gs, use multiple files:
// Core.gs, Services.gs, Processors.gs, etc.
```

### Issue: Permissions Error
**Solution:** Re-run setup and grant permissions
```javascript
function resetPermissions() {
  // Run this in work account
  setup();
}
```

### Issue: Trigger Creation Failed
**Solution:** Create triggers manually
```
Edit → Current project's triggers → Add Trigger
```

### Issue: Can't Access Logs
**Solution:** Use custom logging to sheet
```javascript
function debugToSheet(message) {
  const sheet = SpreadsheetApp.create('Debug Log').getActiveSheet();
  sheet.appendRow([new Date(), message]);
}
```

## Quick Migration Checklist

### Personal Account
- [ ] Complete development and testing
- [ ] Run full test suite
- [ ] Generate release bundle
- [ ] Document any configuration changes
- [ ] Create migration notes

### Work Account
- [ ] Create new Apps Script project
- [ ] Configure appsscript.json
- [ ] Copy all code files
- [ ] Set script properties
- [ ] Enable Gmail API
- [ ] Run setup() function
- [ ] Verify triggers created
- [ ] Test email processing
- [ ] Check daily summary
- [ ] Monitor for 24 hours

## Rollback Procedure

If issues occur in work account:

1. **Disable Triggers**
   ```
   Edit → Current project's triggers → Delete all
   ```

2. **Remove Labels** (Optional)
   ```javascript
   function removeLabels() {
     const labels = GmailApp.getUserLabels();
     labels.forEach(label => {
       if (label.getName().startsWith('PA-')) {
         label.deleteLabel();
       }
     });
   }
   ```

3. **Restore Previous Version**
   - File → See version history
   - Restore to previous working version

## Best Practices

### Development (Personal)
- Test thoroughly with real emails
- Use version control religiously
- Document all changes
- Create test data sets

### Production (Work)
- Deploy during low-activity periods
- Keep previous version accessible
- Monitor closely after deployment
- Have rollback plan ready

### Code Organization
- Keep functions under 100 lines
- Use clear, descriptive names
- Add comments for work account
- Include error handling

### Security
- Never hardcode sensitive data
- Use Script Properties for config
- Validate all inputs
- Log security events

## Support Contacts

### During Migration
1. Test each component individually
2. Document any errors completely
3. Keep backup of working version
4. Have fallback communication plan

### Post-Migration
- Monitor daily summaries
- Check processing statistics
- Review error logs weekly
- Update documentation

---

**Last Updated:** November 2024  
**Version:** 1.0.0
