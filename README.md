# GAS-PA (Google Apps Script Personal Assistant)

A sophisticated email management system built with TypeScript for Google Apps Script that automatically processes, categorizes, and manages your Gmail inbox.

## 🎯 Features

### Core Functionality
- **Automatic Email Processing**: Scans and processes unread emails every 10 minutes
- **Smart Categorization**: Automatically categorizes emails (Work, Personal, Finance, etc.)
- **Priority Detection**: Identifies high-priority emails based on keywords and sender importance
- **Action Item Extraction**: Extracts tasks and action items from email content
- **Meeting Detection**: Identifies meeting requests and calendar invitations
- **Follow-up Tracking**: Flags emails that need follow-up

### Reporting
- **Daily Summary**: Receive a daily email summary at 8 AM
- **Weekly Reports**: Comprehensive weekly analysis every Monday
- **Statistics Tracking**: Monitor email processing metrics in Google Sheets

### Gmail Integration
- **Automatic Labeling**: Creates and applies Gmail labels for organization
- **Archive Management**: Automatically archives old processed emails
- **VIP Sender Support**: Prioritizes emails from important contacts

## 📋 Prerequisites

- Google Account (personal for development, work for production)
- Node.js and npm installed
- Clasp CLI tool (`npm install -g @google/clasp`)
- Basic familiarity with Google Apps Script

## 🚀 Quick Start

### 1. Clone and Setup

```bash
# Clone to your Ubuntu server
cd ~/projects
git clone [repository-url] gas-pa
cd gas-pa

# Install dependencies
npm install

# Login to Google with clasp
clasp login

# Create a new Apps Script project
clasp create --type webapp --title "GAS-PA"
```

### 2. Configure

Edit `src/main.ts` to customize:
- VIP sender list
- Processing schedule
- Category keywords
- Priority indicators

### 3. Build and Deploy

```bash
# Build TypeScript files
npm run build

# Push to Google Apps Script
npm run push

# Open in browser
npm run open
```

### 4. Initialize

Run the setup function in the Apps Script editor:
```javascript
setup()
```

Or via command line:
```bash
npm run setup
```

## 📁 Project Structure

```
gas-pa/
├── src/
│   ├── core/           # Core utilities
│   │   ├── config.ts   # Configuration management
│   │   ├── logger.ts   # Logging system
│   │   └── errors.ts   # Error handling
│   ├── services/       # External services
│   │   ├── gmail.ts    # Gmail operations
│   │   └── sheets.ts   # Google Sheets database
│   ├── processors/     # Business logic
│   │   └── emailProcessor.ts # Email processing engine
│   ├── triggers/       # Scheduled functions
│   │   └── timeBased.ts # Time-based triggers
│   ├── types/          # TypeScript definitions
│   │   └── index.d.ts  # Type interfaces
│   ├── main.ts         # Entry point
│   └── appsscript.json # Manifest file
├── dist/               # Compiled JavaScript
├── releases/           # Deployment bundles
├── scripts/            # Build scripts
├── package.json        # NPM configuration
└── tsconfig.json       # TypeScript configuration
```

## 🛠️ Development

### Available Commands

```bash
npm run build    # Compile TypeScript
npm run watch    # Watch mode
npm run push     # Push to GAS
npm run deploy   # Full deployment
npm run logs     # View live logs
npm run test     # Test processing
```

### Testing

Test individual functions:
```bash
# Test email processing
clasp run testEmailProcessing

# Test daily summary
clasp run testDailySummary
```

### Debugging

View logs in real-time:
```bash
npm run logs
```

Check configuration:
```bash
clasp run getConfiguration
```

## 📊 Configuration

### Script Properties

Set these in the Apps Script editor (File → Project Settings → Script Properties):

| Property | Description | Default |
|----------|-------------|---------|
| `LOG_LEVEL` | Logging level (DEBUG/INFO/WARN/ERROR) | INFO |
| `PROCESS_WEEKENDS` | Process emails on weekends | false |
| `MAX_EMAILS_PER_RUN` | Maximum emails per processing run | 50 |
| `OPENAI_API_KEY` | OpenAI API key for AI features | (empty) |

### Gmail Labels

The system creates these labels automatically:
- `PA-Processed` - Marks processed emails
- `PA-Priority` - High priority emails
- `PA-ActionRequired` - Emails with action items
- `PA-Meeting` - Meeting requests
- `PA-FollowUp` - Needs follow-up
- `PA-[Category]` - Category labels (Work, Personal, etc.)

### Triggers Schedule

| Trigger | Frequency | Time |
|---------|-----------|------|
| Email Processing | Every 10 minutes | - |
| Daily Summary | Daily | 8:00 AM |
| Weekly Report | Weekly | Monday 9:00 AM |
| Cleanup | Daily | 2:00 AM |

## 🔄 Migration to Work Account

### 1. Create Bundle

```bash
# Build and create deployment bundle
npm run build
./scripts/deploy.sh

# Bundle will be in releases/[timestamp]/
```

### 2. Manual Deployment

1. Open script.google.com in work account
2. Create new project
3. Copy each file from bundle
4. Set script properties
5. Run `setup()` function

### 3. Verify

```javascript
// Run in work account
testEmailProcessing()
getConfiguration()
```

## 🎨 Customization

### Add Custom Categories

Edit `src/processors/emailProcessor.ts`:
```typescript
const categories = {
  'CustomCategory': ['keyword1', 'keyword2'],
  // Add more categories
};
```

### Modify Priority Rules

Edit priority detection in `emailProcessor.ts`:
```typescript
const highPriorityIndicators = [
  'urgent',
  'asap',
  // Add more indicators
];
```

### Change Processing Schedule

Edit `src/main.ts`:
```typescript
ScriptApp.newTrigger('processEmailsPeriodically')
  .timeBased()
  .everyMinutes(15) // Change frequency
  .create();
```

## 🔐 Security

- All data stays within your Google account
- No external servers (except optional OpenAI)
- Uses Google's built-in authentication
- Script properties for sensitive data

## 🐛 Troubleshooting

### Common Issues

**Emails not processing:**
- Check triggers are set up: `clasp run getConfiguration`
- Verify Gmail API is enabled
- Check logs: `npm run logs`

**Labels not created:**
- Run setup again: `clasp run setup`
- Check Gmail permissions

**Deployment fails:**
- Ensure clasp is logged in: `clasp login`
- Check `.clasp.json` has correct script ID

### Reset Everything

```bash
# Clear all labels and triggers
clasp run resetAll

# Run setup again
clasp run setup
```

## 📈 Future Enhancements

- [ ] OpenAI integration for smart categorization
- [ ] Calendar event creation from emails
- [ ] Automatic response drafting
- [ ] Slack/Teams integration
- [ ] Advanced filtering rules UI
- [ ] Machine learning for priority detection
- [ ] Email sentiment analysis
- [ ] Custom webhook notifications

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Open pull request

## 📄 License

MIT License - feel free to use and modify

## 💬 Support

For issues or questions:
1. Check the logs first
2. Review configuration
3. Refer to [Google Apps Script documentation](https://developers.google.com/apps-script)

---

**Version:** 1.0.0  
**Author:** Marco  
**Last Updated:** November 2024
