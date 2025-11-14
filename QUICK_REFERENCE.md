# GAS-PA Quick Reference

## 🚀 Initial Setup (One Time)
```bash
cd ~/projects/gas-pa
./setup.sh
clasp login
clasp create --type webapp --title "GAS-PA"
```

## 🔨 Development Commands
```bash
npm run build        # Compile TypeScript
npm run push         # Deploy to Google
npm run logs         # View live logs
npm run test         # Test processing
npm run open         # Open in browser
```

## 📋 Common Functions
```javascript
setup()                    // Initialize project
testEmailProcessing()      // Test email processing
testDailySummary()        // Test summary
getConfiguration()        // View config
getStatistics()          // View stats
reprocessEmails()        // Reprocess emails
```

## 🏷️ Gmail Labels Created
- PA-Processed
- PA-Priority  
- PA-ActionRequired
- PA-Meeting
- PA-FollowUp
- PA-Work/Personal/Finance/etc

## ⏰ Default Schedule
- Email Processing: Every 10 minutes
- Daily Summary: 8:00 AM
- Weekly Report: Monday 9:00 AM
- Cleanup: Daily 2:00 AM

## 🔧 Configuration Properties
```javascript
LOG_LEVEL = 'INFO'
PROCESS_WEEKENDS = 'false'
MAX_EMAILS_PER_RUN = '50'
OPENAI_API_KEY = ''
```

## 📦 Create Release Bundle
```bash
npm run build
./scripts/deploy.sh
# Bundle in: releases/[timestamp]/
```

## 🔄 Work Account Migration
1. Build: `npm run build`
2. Create bundle: `./scripts/deploy.sh`
3. Copy files from `releases/[timestamp]/`
4. Paste to script.google.com in work account
5. Run `setup()` in work account

## 🐛 Troubleshooting
```bash
# View logs
npm run logs

# Check triggers
clasp run listTriggers

# Reset everything
clasp run resetAll
clasp run setup

# Force reprocess
clasp run reprocessEmails
```

## 📝 File Structure
```
src/
├── main.ts           # Entry point
├── core/
│   ├── config.ts    # Configuration
│   └── logger.ts    # Logging
├── services/
│   ├── gmail.ts     # Gmail ops
│   └── sheets.ts    # Database
├── processors/
│   └── emailProcessor.ts
└── triggers/
    └── timeBased.ts
```

## 🔍 Testing in GAS Editor
1. Open function dropdown
2. Select test function
3. Click Run
4. View → Logs

## 💡 Tips
- Always `npm run build` before `push`
- Check logs after deployment
- Test with small batches first
- Keep backups of working versions
- Document configuration changes

---
Version 1.0.0 | Updated: Nov 2024
