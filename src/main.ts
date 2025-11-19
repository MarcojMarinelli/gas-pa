import Config from './core/config';
import Logger from './core/logger';
import { processEmailsPeriodically, sendDailySummary, sendWeeklySummary, cleanupOldData } from './triggers/timeBased';
import { GmailService } from './services/gmail';
import { SheetsService } from './services/sheets';
import { EmailProcessor } from './processors/emailProcessor';

/**
 * Simple spreadsheet creation test
 */
function simpleTest(): void {
  console.log('Simple test: Creating a spreadsheet...');

  console.log('Method 1: Using SpreadsheetApp.create()...');
  try {
    const ss = SpreadsheetApp.create('Simple-Test-' + new Date().getTime());
    console.log('✓ Created! ID: ' + ss.getId());
    console.log('✓ Name: ' + ss.getName());
    console.log('✓ URL: ' + ss.getUrl());
  } catch (e) {
    console.log('✗ SpreadsheetApp.create() failed: ' + e);

    console.log('Method 2: Using Drive API...');
    try {
      const file = Drive.Files.insert({
        title: 'Simple-Test-DriveAPI-' + new Date().getTime(),
        mimeType: 'application/vnd.google-apps.spreadsheet'
      });
      console.log('✓ Created via Drive API! ID: ' + file.id);
      console.log('✓ Opening with SpreadsheetApp...');
      const ss = SpreadsheetApp.openById(file.id);
      console.log('✓ Opened successfully! Name: ' + ss.getName());
      console.log('✓ URL: ' + ss.getUrl());
    } catch (e2) {
      console.log('✗ Drive API also failed: ' + e2);
      throw e2;
    }
  }
}

/**
 * Test authorization - run this first to authorize Google Apps Script
 */
function authorizeScript(): void {
  console.log('Testing authorization...');
  console.log('Step 1: Testing user info access...');

  // Test user info first
  try {
    const email = Session.getActiveUser().getEmail();
    console.log(`✓ User info authorized. Email: ${email}`);
  } catch (error) {
    console.error('✗ User info authorization failed:', error);
    throw error;
  }

  console.log('Step 2: Testing spreadsheet listing...');

  // Try to list spreadsheets (simpler than creating)
  try {
    const files = DriveApp.getFilesByType(MimeType.GOOGLE_SHEETS);
    let count = 0;
    while (files.hasNext() && count < 3) {
      const file = files.next();
      console.log(`  Found spreadsheet: ${file.getName()}`);
      count++;
    }
    console.log(`✓ Drive access authorized (found ${count} spreadsheets)`);
  } catch (error) {
    console.error('✗ Drive authorization failed:', error);
    throw error;
  }

  console.log('Step 3: Testing spreadsheet creation...');

  // Test Spreadsheet creation with alternative method
  try {
    console.log('  Creating test spreadsheet via Spreadsheet.create()...');
    let testId: string;

    try {
      const testSheet = SpreadsheetApp.create('GAS-PA-Test-Authorization');
      testId = testSheet.getId();
      console.log(`✓ SpreadsheetApp.create() worked! ID: ${testId}`);
    } catch (createError) {
      console.log('  SpreadsheetApp.create() failed, trying alternative method...');

      // Try creating via Drive API
      const file = Drive.Files?.insert({
        title: 'GAS-PA-Test-Authorization',
        mimeType: MimeType.GOOGLE_SHEETS
      });

      if (file && file.id) {
        testId = file.id;
        console.log(`✓ Created via Drive API. ID: ${testId}`);
      } else {
        throw new Error('Both creation methods failed');
      }
    }

    // Try to open it
    console.log('  Opening test spreadsheet...');
    const openedSheet = SpreadsheetApp.openById(testId);
    console.log(`✓ Spreadsheet opened successfully: ${openedSheet.getName()}`);

    // Delete the test sheet
    console.log('  Deleting test spreadsheet...');
    DriveApp.getFileById(testId).setTrashed(true);
    console.log('✓ Test sheet deleted');
  } catch (error) {
    console.error('✗ Spreadsheet creation/access failed:', error);
    console.error('  Error details:', JSON.stringify(error));

    // Don't throw - let's continue to see if other tests work
    console.log('  Continuing with other tests...');
  }

  console.log('Step 4: Testing Gmail access...');

  // Test Gmail access
  try {
    const threads = GmailApp.getInboxThreads(0, 1);
    console.log(`✓ Gmail authorized (found ${threads.length} threads in inbox)`);
  } catch (error) {
    console.error('✗ Gmail authorization failed:', error);
    throw error;
  }

  console.log('✓✓✓ All authorizations successful! You can now run setup()');
}

/**
 * Cleanup function - run this first if you're having setup issues
 */
function cleanupProperties(): void {
  console.log('Cleaning up script properties...');
  const scriptProperties = PropertiesService.getScriptProperties();

  // Clear all spreadsheet-related properties
  const keysToClean = ['LOG_SPREADSHEET_ID', 'RESULTS_SPREADSHEET_ID', 'MAIN_SPREADSHEET_ID'];

  keysToClean.forEach(key => {
    const value = scriptProperties.getProperty(key);
    console.log(`Checking ${key}: ${value}`);
    if (value === '' || value === null || value === 'null' || (value && value.trim() === '')) {
      console.log(`Deleting ${key}`);
      scriptProperties.deleteProperty(key);
    }
  });

  console.log('Cleanup complete! Now run setup()');
}

/**
 * Initial setup function - run once to initialize the project
 */
function setup(): void {
  try {
    // Set up script properties
    const scriptProperties = PropertiesService.getScriptProperties();

    // Clear any empty/invalid spreadsheet IDs from previous runs
    const spreadsheetKeys = ['LOG_SPREADSHEET_ID', 'RESULTS_SPREADSHEET_ID', 'MAIN_SPREADSHEET_ID'];
    spreadsheetKeys.forEach(key => {
      const value = scriptProperties.getProperty(key);
      if (value === '' || value === null || value === 'null' || (value && value.trim() === '')) {
        scriptProperties.deleteProperty(key);
      }
    });

    console.log('Starting GAS-PA setup');

    // Set default properties if not exists
    const defaults = {
      'LOG_LEVEL': 'INFO',
      'OPENAI_API_KEY': '', // Add when ready for AI
      'PROCESS_WEEKENDS': 'false',
      'MAX_EMAILS_PER_RUN': '50'
    };

    Object.entries(defaults).forEach(([key, value]) => {
      if (!scriptProperties.getProperty(key)) {
        scriptProperties.setProperty(key, value);
      }
    });

    // Initialize sheets service (creates spreadsheet if needed)
    const sheetsService = new SheetsService();
    Logger.info('Setup', 'Spreadsheet initialized');
    
    // Create Gmail labels
    createGmailLabels();
    
    // Set up triggers
    setupTriggers();
    
    // Send setup confirmation
    const gmailService = new GmailService();
    const userEmail = Session.getActiveUser().getEmail();
    gmailService.sendEmail(
      userEmail,
      'GAS-PA Setup Complete',
      `Your Google Apps Script Personal Assistant has been set up successfully!

Configuration:
- Email Processing: Every 10 minutes
- Daily Summary: 8:00 AM
- Weekly Summary: Mondays at 9:00 AM
- Cleanup: Daily at 2:00 AM

Gmail Labels Created:
- PA-Processed
- PA-Priority
- PA-ActionRequired
- PA-Meeting
- PA-FollowUp
- PA-Work, PA-Personal, PA-Finance, etc.

To modify settings, visit the script editor or configuration spreadsheet.

Best regards,
GAS-PA`,
      {
        htmlBody: generateSetupEmail()
      }
    );
    
    Logger.info('Setup', 'Setup complete - confirmation email sent');
    
  } catch (error) {
    Logger.error('Setup', 'Setup failed', error);
    throw error;
  }
}

/**
 * Create Gmail labels
 */
function createGmailLabels(): void {
  const labels = [
    'PA-Processed',
    'PA-Priority',
    'PA-ActionRequired',
    'PA-Meeting',
    'PA-FollowUp',
    'PA-Work',
    'PA-Personal',
    'PA-Finance',
    'PA-Newsletter',
    'PA-Shopping',
    'PA-Travel',
    'PA-Support'
  ];
  
  labels.forEach(labelName => {
    try {
      if (!GmailApp.getUserLabelByName(labelName)) {
        GmailApp.createLabel(labelName);
        Logger.info('Setup', `Created label: ${labelName}`);
      }
    } catch (error) {
      Logger.error('Setup', `Failed to create label: ${labelName}`, error);
    }
  });
}

/**
 * Set up time-based triggers
 */
function setupTriggers(): void {
  // Clear existing triggers
  ScriptApp.getProjectTriggers().forEach(trigger => {
    ScriptApp.deleteTrigger(trigger);
  });
  
  // Email processing - every 10 minutes
  ScriptApp.newTrigger('processEmailsPeriodically')
    .timeBased()
    .everyMinutes(10)
    .create();
    
  // Daily summary - 8 AM
  ScriptApp.newTrigger('sendDailySummary')
    .timeBased()
    .atHour(8)
    .everyDays(1)
    .create();
    
  // Weekly summary - Mondays at 9 AM
  ScriptApp.newTrigger('sendWeeklySummary')
    .timeBased()
    .onWeekDay(ScriptApp.WeekDay.MONDAY)
    .atHour(9)
    .create();
    
  // Cleanup - Daily at 2 AM
  ScriptApp.newTrigger('cleanupOldData')
    .timeBased()
    .atHour(2)
    .everyDays(1)
    .create();
    
  Logger.info('Setup', 'Triggers created successfully');
}

/**
 * Generate setup confirmation email HTML
 */
function generateSetupEmail(): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Google Sans', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f8f9fa; }
    .container { background: white; border-radius: 8px; padding: 30px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    h1 { color: #1a73e8; margin-bottom: 20px; }
    h2 { color: #5f6368; margin-top: 25px; margin-bottom: 15px; font-size: 18px; }
    .label { display: inline-block; padding: 4px 8px; margin: 4px; background: #e8f0fe; color: #1a73e8; border-radius: 4px; font-size: 14px; }
    .schedule { background: #f8f9fa; padding: 15px; border-radius: 6px; margin: 10px 0; }
    .schedule-item { padding: 5px 0; }
    .button { display: inline-block; padding: 10px 20px; background: #1a73e8; color: white; text-decoration: none; border-radius: 4px; margin-top: 20px; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #dadce0; color: #5f6368; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>✅ GAS-PA Setup Complete!</h1>
    
    <p>Your Google Apps Script Personal Assistant has been successfully configured and is now monitoring your inbox.</p>
    
    <h2>📅 Processing Schedule</h2>
    <div class="schedule">
      <div class="schedule-item">📧 <strong>Email Processing:</strong> Every 10 minutes</div>
      <div class="schedule-item">📊 <strong>Daily Summary:</strong> 8:00 AM</div>
      <div class="schedule-item">📈 <strong>Weekly Report:</strong> Mondays at 9:00 AM</div>
      <div class="schedule-item">🧹 <strong>Cleanup:</strong> Daily at 2:00 AM</div>
    </div>
    
    <h2>🏷️ Gmail Labels Created</h2>
    <div>
      <span class="label">PA-Processed</span>
      <span class="label">PA-Priority</span>
      <span class="label">PA-ActionRequired</span>
      <span class="label">PA-Meeting</span>
      <span class="label">PA-FollowUp</span>
      <span class="label">PA-Work</span>
      <span class="label">PA-Personal</span>
      <span class="label">PA-Finance</span>
      <span class="label">PA-Newsletter</span>
      <span class="label">PA-Shopping</span>
      <span class="label">PA-Travel</span>
      <span class="label">PA-Support</span>
    </div>
    
    <h2>🚀 Next Steps</h2>
    <ol>
      <li>Check your Gmail to see the new labels</li>
      <li>Review the configuration spreadsheet to customize settings</li>
      <li>Run a manual test using the <code>testEmailProcessing()</code> function</li>
      <li>Add your OpenAI API key for AI-powered features (optional)</li>
    </ol>
    
    <a href="https://script.google.com" class="button">Open Script Editor</a>
    
    <div class="footer">
      <p>GAS-PA v1.0.0 | Powered by Google Apps Script</p>
      <p>For support or customization, refer to the documentation.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Manual test function - process emails now
 */
function testEmailProcessing(): void {
  Logger.info('Test', 'Running manual email processing test');
  processEmailsPeriodically();
}

/**
 * Test daily summary
 */
function testDailySummary(): void {
  Logger.info('Test', 'Running daily summary test');
  sendDailySummary();
}

/**
 * Get current configuration
 */
function getConfiguration(): any {
  return {
    config: Config.get('features'),
    properties: PropertiesService.getScriptProperties().getProperties()
  };
}

/**
 * Update configuration
 */
function updateConfiguration(key: string, value: any): void {
  const scriptProperties = PropertiesService.getScriptProperties();
  scriptProperties.setProperty(key, String(value));
  Logger.info('Configuration', `Updated ${key} to ${value}`);
}

/**
 * Get processing statistics
 */
function getStatistics(): any {
  const gmailService = new GmailService();
  const sheetsService = new SheetsService();
  
  const inboxStats = gmailService.getStatistics();
  const last7Days = new Date();
  last7Days.setDate(last7Days.getDate() - 7);
  const processingStats = sheetsService.getStatistics(last7Days, new Date());
  
  return {
    inbox: inboxStats,
    processing: processingStats
  };
}

/**
 * Force reprocess emails
 */
function reprocessEmails(query: string = 'label:PA-Processed'): void {
  Logger.info('Reprocess', `Starting reprocessing with query: ${query}`);
  
  try {
    // Remove processed label from matching emails
    const threads = GmailApp.search(query, 0, 50);
    const processedLabel = GmailApp.getUserLabelByName('PA-Processed');
    
    if (processedLabel) {
      threads.forEach(thread => {
        thread.removeLabel(processedLabel);
      });
    }
    
    // Run processing
    processEmailsPeriodically();
    
    Logger.info('Reprocess', 'Reprocessing complete');
    
  } catch (error) {
    Logger.error('Reprocess', 'Reprocessing failed', error);
    throw error;
  }
}

/**
 * Export configuration for backup
 */
function exportConfiguration(): any {
  const config = {
    version: '1.0.0',
    exportDate: new Date().toISOString(),
    scriptProperties: PropertiesService.getScriptProperties().getProperties(),
    userProperties: PropertiesService.getUserProperties().getProperties(),
    triggers: ScriptApp.getProjectTriggers().map(trigger => ({
      function: trigger.getHandlerFunction(),
      type: trigger.getTriggerSource(),
      eventType: trigger.getEventType()
    }))
  };
  
  Logger.info('Export', 'Configuration exported');
  return config;
}

// Export for TypeScript
export {
  simpleTest,
  authorizeScript,
  cleanupProperties,
  setup,
  testEmailProcessing,
  testDailySummary,
  getConfiguration,
  updateConfiguration,
  getStatistics,
  reprocessEmails,
  exportConfiguration
};
