import { EmailProcessor } from '../processors/emailProcessor';
import { GmailService } from '../services/gmail';
import { SheetsService } from '../services/sheets';
import Logger from '../core/logger';
import Config from '../core/config';

/**
 * Main trigger function - runs every N minutes
 */
export function processEmailsPeriodically(): void {
  Logger.info('Trigger', 'Starting periodic email processing');
  
  try {
    // Check if feature is enabled
    if (!Config.isFeatureEnabled('emailProcessing')) {
      Logger.info('Trigger', 'Email processing is disabled');
      return;
    }
    
    // Check if we should run based on time constraints
    if (!shouldRunNow()) {
      Logger.info('Trigger', 'Outside of processing hours');
      return;
    }
    
    // Fetch unprocessed emails
    const gmailService = new GmailService();
    const emails = gmailService.getUnprocessedEmails();
    
    if (emails.length === 0) {
      Logger.info('Trigger', 'No new emails to process');
      return;
    }
    
    // Process emails
    const processor = new EmailProcessor();
    const results = processor.processBatch(emails);
    
    // Log summary
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    Logger.info('Trigger', `Processing complete: ${successful} successful, ${failed} failed`);
    
    // Send notification if there were failures
    if (failed > 0) {
      sendFailureNotification(results.filter(r => !r.success));
    }
    
  } catch (error) {
    Logger.error('Trigger', 'Failed to process emails', error);
    sendErrorNotification(error);
  }
}

/**
 * Daily summary trigger
 */
export function sendDailySummary(): void {
  Logger.info('Trigger', 'Generating daily summary');
  
  try {
    const sheetsService = new SheetsService();
    const gmailService = new GmailService();
    
    // Get today's statistics
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const stats = sheetsService.getStatistics(today, tomorrow);
    
    // Get current inbox status
    const inboxStatus = gmailService.getStatistics();
    
    // Generate summary content
    const summary = generateDailySummary(stats[0] || {}, inboxStatus);
    
    // Send summary email
    const userEmail = Session.getActiveUser().getEmail();
    gmailService.sendEmail(
      userEmail,
      `GAS-PA Daily Summary - ${today.toDateString()}`,
      summary,
      {
        htmlBody: generateHtmlSummary(stats[0] || {}, inboxStatus)
      }
    );
    
    Logger.info('Trigger', 'Daily summary sent');
    
  } catch (error) {
    Logger.error('Trigger', 'Failed to send daily summary', error);
  }
}

/**
 * Weekly summary trigger
 */
export function sendWeeklySummary(): void {
  Logger.info('Trigger', 'Generating weekly summary');
  
  try {
    const sheetsService = new SheetsService();
    const gmailService = new GmailService();
    
    // Get last 7 days of statistics
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    
    const weekStats = sheetsService.getStatistics(startDate, endDate);
    
    // Calculate weekly totals
    const totals = calculateWeeklyTotals(weekStats);
    
    // Generate insights
    const insights = generateWeeklyInsights(weekStats);
    
    // Generate and send report
    const report = generateWeeklyReport(totals, insights);
    
    const userEmail = Session.getActiveUser().getEmail();
    gmailService.sendEmail(
      userEmail,
      `GAS-PA Weekly Report - Week of ${startDate.toDateString()}`,
      report.text,
      {
        htmlBody: report.html
      }
    );
    
    Logger.info('Trigger', 'Weekly summary sent');
    
  } catch (error) {
    Logger.error('Trigger', 'Failed to send weekly summary', error);
  }
}

/**
 * Clean up old data trigger
 */
export function cleanupOldData(): void {
  Logger.info('Trigger', 'Starting cleanup of old data');
  
  try {
    // Clean up old processed emails (older than 30 days)
    const gmailService = new GmailService();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30);
    
    const oldProcessedThreads = GmailApp.search(
      `label:PA-Processed older_than:30d`
    );
    
    Logger.info('Trigger', `Found ${oldProcessedThreads.length} old processed threads to archive`);
    
    oldProcessedThreads.forEach(thread => {
      thread.moveToArchive();
    });
    
    Logger.info('Trigger', 'Cleanup complete');
    
  } catch (error) {
    Logger.error('Trigger', 'Failed to cleanup old data', error);
  }
}

/**
 * Check if we should run based on time constraints
 */
function shouldRunNow(): boolean {
  const now = new Date();
  const hour = now.getHours();
  
  // Don't run between midnight and 6 AM
  if (hour >= 0 && hour < 6) {
    return false;
  }
  
  // Check for weekend processing preference
  const dayOfWeek = now.getDay();
  const processWeekends = PropertiesService.getScriptProperties().getProperty('PROCESS_WEEKENDS') === 'true';
  
  if (!processWeekends && (dayOfWeek === 0 || dayOfWeek === 6)) {
    return false;
  }
  
  return true;
}

/**
 * Generate daily summary text
 */
function generateDailySummary(stats: any, inboxStatus: any): string {
  return `
GAS-PA Daily Summary
====================

Today's Processing:
- Emails Processed: ${stats.processed || 0}
- High Priority: ${stats.highPriority || 0}
- Action Required: ${stats.actionRequired || 0}
- Categorized: ${stats.categorized || 0}

Current Inbox Status:
- Total Threads: ${inboxStatus.totalThreads}
- Unread: ${inboxStatus.unreadCount}
- Important: ${inboxStatus.importantCount}
- Starred: ${inboxStatus.starredCount}

--
Generated by GAS-PA on ${new Date().toLocaleString()}
  `.trim();
}

/**
 * Generate HTML daily summary
 */
function generateHtmlSummary(stats: any, inboxStatus: any): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
    h1 { color: #1a73e8; border-bottom: 2px solid #1a73e8; padding-bottom: 10px; }
    .section { margin: 20px 0; padding: 15px; background: #f8f9fa; border-radius: 8px; }
    .stat { display: flex; justify-content: space-between; padding: 8px 0; }
    .stat-label { font-weight: bold; }
    .stat-value { color: #5f6368; }
    .highlight { color: #ea4335; font-weight: bold; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #dadce0; color: #5f6368; font-size: 12px; }
  </style>
</head>
<body>
  <h1>📧 GAS-PA Daily Summary</h1>
  
  <div class="section">
    <h2>Today's Processing</h2>
    <div class="stat">
      <span class="stat-label">Emails Processed:</span>
      <span class="stat-value">${stats.processed || 0}</span>
    </div>
    <div class="stat">
      <span class="stat-label">High Priority:</span>
      <span class="stat-value ${stats.highPriority > 0 ? 'highlight' : ''}">${stats.highPriority || 0}</span>
    </div>
    <div class="stat">
      <span class="stat-label">Action Required:</span>
      <span class="stat-value ${stats.actionRequired > 0 ? 'highlight' : ''}">${stats.actionRequired || 0}</span>
    </div>
    <div class="stat">
      <span class="stat-label">Categorized:</span>
      <span class="stat-value">${stats.categorized || 0}</span>
    </div>
  </div>
  
  <div class="section">
    <h2>Current Inbox Status</h2>
    <div class="stat">
      <span class="stat-label">Total Threads:</span>
      <span class="stat-value">${inboxStatus.totalThreads}</span>
    </div>
    <div class="stat">
      <span class="stat-label">Unread:</span>
      <span class="stat-value ${inboxStatus.unreadCount > 10 ? 'highlight' : ''}">${inboxStatus.unreadCount}</span>
    </div>
    <div class="stat">
      <span class="stat-label">Important:</span>
      <span class="stat-value">${inboxStatus.importantCount}</span>
    </div>
    <div class="stat">
      <span class="stat-label">Starred:</span>
      <span class="stat-value">${inboxStatus.starredCount}</span>
    </div>
  </div>
  
  <div class="footer">
    Generated by GAS-PA on ${new Date().toLocaleString()}<br>
    <a href="https://script.google.com">Manage Settings</a>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Calculate weekly totals
 */
function calculateWeeklyTotals(weekStats: any[]): any {
  const totals = {
    totalEmails: 0,
    processed: 0,
    categorized: 0,
    highPriority: 0,
    actionRequired: 0
  };
  
  weekStats.forEach(day => {
    if (day) {
      totals.totalEmails += day[1] || 0;
      totals.processed += day[2] || 0;
      totals.categorized += day[3] || 0;
      totals.highPriority += day[4] || 0;
      totals.actionRequired += day[5] || 0;
    }
  });
  
  return totals;
}

/**
 * Generate weekly insights
 */
function generateWeeklyInsights(weekStats: any[]): any {
  const insights = {
    busiestDay: null as string | null,
    averageDaily: 0,
    trend: 'stable'
  };
  
  // Find busiest day
  let maxEmails = 0;
  weekStats.forEach(day => {
    if (day && day[1] > maxEmails) {
      maxEmails = day[1];
      insights.busiestDay = new Date(day[0]).toLocaleDateString('en-US', { weekday: 'long' });
    }
  });
  
  // Calculate average
  insights.averageDaily = Math.round(calculateWeeklyTotals(weekStats).totalEmails / 7);
  
  // Determine trend (simplified)
  if (weekStats.length >= 2) {
    const firstHalf = weekStats.slice(0, 3).reduce((sum, day) => sum + (day ? day[1] : 0), 0);
    const secondHalf = weekStats.slice(4).reduce((sum, day) => sum + (day ? day[1] : 0), 0);
    
    if (secondHalf > firstHalf * 1.2) {
      insights.trend = 'increasing';
    } else if (secondHalf < firstHalf * 0.8) {
      insights.trend = 'decreasing';
    }
  }
  
  return insights;
}

/**
 * Generate weekly report
 */
function generateWeeklyReport(totals: any, insights: any): any {
  const text = `
GAS-PA Weekly Report
====================

Weekly Totals:
- Total Emails: ${totals.totalEmails}
- Processed: ${totals.processed}
- High Priority: ${totals.highPriority}
- Action Required: ${totals.actionRequired}

Insights:
- Busiest Day: ${insights.busiestDay || 'N/A'}
- Daily Average: ${insights.averageDaily} emails
- Trend: ${insights.trend}

--
Generated by GAS-PA on ${new Date().toLocaleString()}
  `.trim();
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
    h1 { color: #1a73e8; border-bottom: 2px solid #1a73e8; padding-bottom: 10px; }
    .section { margin: 20px 0; padding: 15px; background: #f8f9fa; border-radius: 8px; }
    .stat { display: flex; justify-content: space-between; padding: 8px 0; }
    .stat-label { font-weight: bold; }
    .stat-value { color: #5f6368; }
    .highlight { color: #ea4335; font-weight: bold; }
    .trend-increasing { color: #34a853; }
    .trend-decreasing { color: #fbbc04; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #dadce0; color: #5f6368; font-size: 12px; }
  </style>
</head>
<body>
  <h1>📊 GAS-PA Weekly Report</h1>
  
  <div class="section">
    <h2>Weekly Totals</h2>
    <div class="stat">
      <span class="stat-label">Total Emails:</span>
      <span class="stat-value">${totals.totalEmails}</span>
    </div>
    <div class="stat">
      <span class="stat-label">Processed:</span>
      <span class="stat-value">${totals.processed}</span>
    </div>
    <div class="stat">
      <span class="stat-label">High Priority:</span>
      <span class="stat-value ${totals.highPriority > 5 ? 'highlight' : ''}">${totals.highPriority}</span>
    </div>
    <div class="stat">
      <span class="stat-label">Action Required:</span>
      <span class="stat-value ${totals.actionRequired > 10 ? 'highlight' : ''}">${totals.actionRequired}</span>
    </div>
  </div>
  
  <div class="section">
    <h2>Insights</h2>
    <div class="stat">
      <span class="stat-label">Busiest Day:</span>
      <span class="stat-value">${insights.busiestDay || 'N/A'}</span>
    </div>
    <div class="stat">
      <span class="stat-label">Daily Average:</span>
      <span class="stat-value">${insights.averageDaily} emails</span>
    </div>
    <div class="stat">
      <span class="stat-label">Trend:</span>
      <span class="stat-value trend-${insights.trend}">${insights.trend}</span>
    </div>
  </div>
  
  <div class="footer">
    Generated by GAS-PA on ${new Date().toLocaleString()}<br>
    <a href="https://script.google.com">Manage Settings</a>
  </div>
</body>
</html>
  `.trim();
  
  return { text, html };
}

/**
 * Send failure notification
 */
function sendFailureNotification(failures: any[]): void {
  // Implementation for failure notifications
  Logger.warn('Trigger', `${failures.length} emails failed processing`);
}

/**
 * Send error notification
 */
function sendErrorNotification(error: any): void {
  // Implementation for error notifications
  Logger.error('Trigger', 'Critical error in processing', error);
}
