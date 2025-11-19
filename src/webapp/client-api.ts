/**
 * Client-side API for GAS Web App
 * Provides functions that can be called from the dashboard using google.script.run
 */

import { metricsHandler } from './handlers/metrics-handler';
import { queueHandler } from './handlers/queue-handler';
import { DashboardMetrics } from '../types/shared-models';
import Logger from '../core/logger';

/**
 * Get dashboard metrics
 * Called from dashboard using google.script.run.getDashboardMetrics()
 */
export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  try {
    console.log('=== GAS-PA: Fetching Dashboard Metrics ===');
    Logger.info('ClientAPI', 'getDashboardMetrics called');

    const email = Session.getActiveUser().getEmail();
    console.log('User email:', email);

    const startTime = Date.now();
    const metrics = await metricsHandler.getMetrics({
      method: 'GET',
      path: '/api/metrics',
      parameters: {},
      queryString: '',
      postData: {},
      headers: {},
      pathParams: {},
      user: email
    });
    const duration = Date.now() - startTime;

    // Log detailed metrics to console for debugging
    console.log('=== Metrics Retrieved ===');
    console.log('Duration:', duration, 'ms');
    console.log('Metrics:', {
      totalEmails: metrics.totalEmails,
      processedToday: metrics.processedToday,
      pendingActions: metrics.pendingActions,
      avgProcessingTime: metrics.avgProcessingTime,
      trendingUp: metrics.trendingUp,
      lastUpdated: metrics.lastUpdated
    });
    console.log('Activity data points:', metrics.activityData?.length || 0);
    console.log('========================');

    Logger.info('ClientAPI', 'Metrics retrieved', { totalEmails: metrics.totalEmails });
    return metrics;
  } catch (error) {
    console.error('=== GAS-PA: Metrics Fetch Failed ===');
    console.error('Error:', error);
    console.error('===================================');
    Logger.error('ClientAPI', 'Failed to get dashboard metrics', error);
    throw new Error(`Failed to get metrics: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get queue items
 * Called from dashboard using google.script.run.getQueueItems()
 */
export async function getQueueItems(options?: {
  page?: number;
  pageSize?: number;
  status?: string;
}): Promise<any> {
  try {
    Logger.info('ClientAPI', 'getQueueItems called', options);

    const email = Session.getActiveUser().getEmail();

    const result = await queueHandler.listQueue({
      method: 'GET',
      path: '/api/queue',
      parameters: options || {},
      queryString: '',
      postData: {},
      headers: {},
      pathParams: {},
      user: email
    });

    Logger.info('ClientAPI', 'Queue items retrieved', { count: result.items?.length || 0 });
    return result;
  } catch (error) {
    Logger.error('ClientAPI', 'Failed to get queue items', error);
    throw new Error(`Failed to get queue: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Refresh dashboard metrics (clear cache)
 */
export async function refreshDashboardMetrics(): Promise<DashboardMetrics> {
  try {
    Logger.info('ClientAPI', 'refreshDashboardMetrics called');

    const email = Session.getActiveUser().getEmail();

    const result = await metricsHandler.refreshMetrics({
      method: 'POST',
      path: '/api/metrics/refresh',
      parameters: {},
      queryString: '',
      postData: {},
      headers: {},
      pathParams: {},
      user: email
    });

    return result.metrics;
  } catch (error) {
    Logger.error('ClientAPI', 'Failed to refresh metrics', error);
    throw new Error(`Failed to refresh metrics: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Diagnostic function - Run Gmail label checks
 * Can be called from browser console or GAS editor
 */
export async function runDiagnostics(): Promise<void> {
  console.log('=== GAS-PA Diagnostics ===');
  console.log('Starting diagnostic checks...\n');

  try {
    // Check user
    const email = Session.getActiveUser().getEmail();
    console.log('✓ User authenticated:', email);

    // Check inbox access
    const inboxThreads = GmailApp.getInboxThreads(0, 1);
    console.log('✓ Inbox access:', inboxThreads.length > 0 ? 'Working' : 'No threads found');

    // Check PA labels
    console.log('\n--- PA Labels Check ---');
    const labels = [
      'PA-Processed',
      'PA-ActionRequired',
      'PA-Priority',
      'PA-Meeting',
      'PA-FollowUp',
      'PA-Work',
      'PA-Personal'
    ];

    for (const labelName of labels) {
      const label = GmailApp.getUserLabelByName(labelName);
      if (label) {
        const threads = label.getThreads(0, 10);
        const unreadCount = label.getUnreadCount();
        console.log(`✓ ${labelName}: ${threads.length} threads (${unreadCount} unread)`);
      } else {
        console.warn(`✗ ${labelName}: NOT FOUND`);
      }
    }

    // Test specific queries used by backend
    console.log('\n--- Backend Query Tests ---');

    const today = new Date();
    const todayStr = Utilities.formatDate(today, Session.getScriptTimeZone(), 'yyyy/MM/dd');

    const processedAll = GmailApp.search('label:PA-Processed', 0, 10);
    console.log(`Total PA-Processed: ${processedAll.length} (showing first 10)`);

    const processedToday = GmailApp.search(`label:PA-Processed after:${todayStr}`, 0, 10);
    console.log(`Processed today (after ${todayStr}): ${processedToday.length}`);

    const pending = GmailApp.search('label:PA-ActionRequired is:unread', 0, 10);
    console.log(`Pending actions (unread): ${pending.length}`);

    console.log('\n✓ Diagnostics complete!');
    console.log('========================\n');

  } catch (error) {
    console.error('✗ Diagnostic failed:', error);
    console.log('========================\n');
    throw error;
  }
}

// Export functions to global scope for google.script.run
declare global {
  function getDashboardMetrics(): Promise<DashboardMetrics>;
  function getQueueItems(options?: any): Promise<any>;
  function refreshDashboardMetrics(): Promise<DashboardMetrics>;
  function runDiagnostics(): Promise<void>;
}

globalThis.getDashboardMetrics = getDashboardMetrics;
globalThis.getQueueItems = getQueueItems;
globalThis.refreshDashboardMetrics = refreshDashboardMetrics;
globalThis.runDiagnostics = runDiagnostics;
