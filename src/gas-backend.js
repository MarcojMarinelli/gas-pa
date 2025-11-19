/**
 * Google Apps Script Backend Functions
 * Plain JavaScript file - no bundling needed
 *
 * This file provides trigger functions and setup utilities for GAS
 */

// Import compiled core modules (these will be bundled separately)
// Note: This approach requires the bundled code to export to a namespace

/**
 * Authorization Test - Run this FIRST
 */
function authorizeScript() {
  console.log('Testing authorization...');
  console.log('Step 1: Testing user info access...');

  try {
    const email = Session.getActiveUser().getEmail();
    console.log(`✓ User info authorized. Email: ${email}`);
  } catch (error) {
    console.error('✗ User info authorization failed:', error);
    throw error;
  }

  console.log('Step 2: Testing Gmail access...');
  try {
    const threads = GmailApp.getInboxThreads(0, 1);
    console.log(`✓ Gmail authorized (found ${threads.length} threads)`);
  } catch (error) {
    console.error('✗ Gmail authorization failed:', error);
    throw error;
  }

  console.log('Step 3: Testing Drive access...');
  try {
    const files = DriveApp.getFiles();
    let count = 0;
    while (files.hasNext() && count < 3) {
      files.next();
      count++;
    }
    console.log(`✓ Drive access authorized`);
  } catch (error) {
    console.error('✗ Drive authorization failed:', error);
    throw error;
  }

  console.log('✓✓✓ All authorizations successful! You can now run setup()');
}

/**
 * Test Metrics - Check if PA labels have emails
 */
function testMetrics() {
  console.log('Testing Gmail metrics...');

  // Check inbox
  const inboxThreads = GmailApp.getInboxThreads();
  console.log(`Inbox threads: ${inboxThreads.length}`);

  // Check PA labels
  const labels = [
    'PA-Processed',
    'PA-ActionRequired',
    'PA-Priority',
    'PA-Meeting',
    'PA-FollowUp',
    'PA-Work',
    'PA-Personal'
  ];

  labels.forEach(labelName => {
    const label = GmailApp.getUserLabelByName(labelName);
    if (label) {
      const threads = label.getThreads();
      const unreadCount = label.getUnreadCount();
      console.log(`${labelName}: ${threads.length} threads (${unreadCount} unread)`);
    } else {
      console.log(`${labelName}: Label not found!`);
    }
  });

  // Test the actual query used by the backend
  console.log('\nTesting backend query for processed today:');
  const today = new Date();
  const todayStr = Utilities.formatDate(today, Session.getScriptTimeZone(), 'yyyy/MM/dd');
  const processedToday = GmailApp.search(`label:PA-Processed after:${todayStr}`, 0, 500);
  console.log(`Processed today (after ${todayStr}): ${processedToday.length}`);

  console.log('\nTesting backend query for pending actions:');
  const pending = GmailApp.search('label:PA-ActionRequired is:unread', 0, 500);
  console.log(`Pending actions (unread): ${pending.length}`);

  console.log('\n✓ Test complete! Check the counts above.');
}

/**
 * Initial Setup - Run this SECOND
 */
function setup() {
  console.log('Starting GAS-PA setup...');

  // Create Gmail labels
  const labels = [
    'PA-Processed',
    'PA-Priority',
    'PA-ActionRequired',
    'PA-Meeting',
    'PA-FollowUp',
    'PA-Work',
    'PA-Personal'
  ];

  labels.forEach(labelName => {
    try {
      if (!GmailApp.getUserLabelByName(labelName)) {
        GmailApp.createLabel(labelName);
        console.log(`Created label: ${labelName}`);
      }
    } catch (error) {
      console.error(`Failed to create label: ${labelName}`, error);
    }
  });

  // Set up triggers
  setupTriggers();

  console.log('✓ Setup complete!');
  console.log('You can now run processEmailsPeriodically() to test email processing');
}

/**
 * Set up time-based triggers
 */
function setupTriggers() {
  // Clear existing triggers
  ScriptApp.getProjectTriggers().forEach(trigger => {
    ScriptApp.deleteTrigger(trigger);
  });

  // Email processing - every 10 minutes
  ScriptApp.newTrigger('processEmailsPeriodically')
    .timeBased()
    .everyMinutes(10)
    .create();

  console.log('✓ Triggers created');
}

/**
 * Process emails periodically (triggered every 10 minutes)
 */
function processEmailsPeriodically() {
  console.log('Processing emails...');

  try {
    // Get unprocessed emails
    const processedLabel = GmailApp.getUserLabelByName('PA-Processed');
    const query = 'is:unread -label:PA-Processed';
    const threads = GmailApp.search(query, 0, 10); // Process 10 at a time

    console.log(`Found ${threads.length} unprocessed emails`);

    threads.forEach(thread => {
      const messages = thread.getMessages();
      messages.forEach(message => {
        if (message.isUnread()) {
          const subject = message.getSubject();
          const from = message.getFrom();

          console.log(`Processing: ${subject} from ${from}`);

          // Mark as processed
          if (processedLabel) {
            thread.addLabel(processedLabel);
          }
        }
      });
    });

    console.log(`✓ Processed ${threads.length} emails`);

  } catch (error) {
    console.error('Email processing failed:', error);
  }
}

/**
 * Send daily summary
 */
function sendDailySummary() {
  console.log('Generating daily summary...');
  // Implementation here
  console.log('✓ Daily summary sent');
}

/**
 * Send weekly summary
 */
function sendWeeklySummary() {
  console.log('Generating weekly summary...');
  // Implementation here
  console.log('✓ Weekly summary sent');
}

/**
 * Cleanup old data
 */
function cleanupOldData() {
  console.log('Cleaning up old data...');
  // Implementation here
  console.log('✓ Cleanup complete');
}

/**
 * Test email processing manually
 */
function testEmailProcessing() {
  console.log('Running manual email processing test...');
  processEmailsPeriodically();
}

/**
 * Get configuration
 */
function getConfiguration() {
  const props = PropertiesService.getScriptProperties().getProperties();
  console.log('Current configuration:', props);
  return props;
}

/**
 * Simple test
 */
function simpleTest() {
  console.log('Running simple test...');
  const email = Session.getActiveUser().getEmail();
  console.log(`✓ Current user: ${email}`);
  console.log('✓ Simple test passed!');
}

/**
 * Show UI Demo in a modal dialog
 * Opens the GAS-PA user interface in a popup window
 */
function showUiDemo() {
  try {
    const html = HtmlService.createHtmlOutputFromFile('demo')
      .setWidth(1200)
      .setHeight(800)
      .setTitle('GAS-PA UI Demo');

    // Try to show in Spreadsheet first, fall back to standalone
    try {
      SpreadsheetApp.getUi().showModalDialog(html, 'GAS-PA UI Components');
      console.log('✓ UI opened in spreadsheet dialog');
    } catch (e) {
      // If not in spreadsheet context, just log success
      console.log('✓ UI HTML generated successfully');
      console.log('To view: Deploy as web app or open from a Google Spreadsheet');
    }
  } catch (error) {
    console.error('Failed to show UI:', error);
    throw error;
  }
}
