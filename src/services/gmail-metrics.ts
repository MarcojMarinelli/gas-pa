/**
 * Gmail Metrics Service
 * Provides real email metrics from Gmail API
 */

import { BackendMetricsService, BackendDailyStats } from '../webapp/handlers/metrics-handler';
import Logger from '../core/logger';

export class GmailMetricsService implements BackendMetricsService {
  /**
   * Get total emails across all labels
   */
  async getTotalEmails(): Promise<number> {
    try {
      const labels = this.getTrackingLabels();
      let total = 0;

      for (const labelName of labels) {
        const label = GmailApp.getUserLabelByName(labelName);
        if (label) {
          total += label.getThreads().length;
        }
      }

      // Also count inbox
      total += GmailApp.getInboxThreads().length;

      Logger.info('GmailMetrics', 'Total emails counted', { total });
      return total;
    } catch (error) {
      Logger.error('GmailMetrics', 'Failed to get total emails', error);
      return 0;
    }
  }

  /**
   * Get emails processed today
   */
  async getProcessedToday(): Promise<number> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const label = GmailApp.getUserLabelByName('PA-Processed');
      if (!label) {
        Logger.warn('GmailMetrics', 'PA-Processed label not found');
        return 0;
      }

      const threads = label.getThreads();
      let processedToday = 0;

      // Count threads processed today
      for (const thread of threads) {
        const lastMessageDate = thread.getLastMessageDate();
        if (lastMessageDate >= today) {
          processedToday++;
        }
      }

      Logger.info('GmailMetrics', 'Processed today counted', { count: processedToday });
      return processedToday;
    } catch (error) {
      Logger.error('GmailMetrics', 'Failed to get processed today', error);
      return 0;
    }
  }

  /**
   * Get pending action items
   */
  async getPendingActions(): Promise<number> {
    try {
      const label = GmailApp.getUserLabelByName('PA-ActionRequired');
      if (!label) {
        Logger.warn('GmailMetrics', 'PA-ActionRequired label not found');
        return 0;
      }

      const unreadCount = label.getUnreadCount();
      Logger.info('GmailMetrics', 'Pending actions counted', { count: unreadCount });
      return unreadCount;
    } catch (error) {
      Logger.error('GmailMetrics', 'Failed to get pending actions', error);
      return 0;
    }
  }

  /**
   * Get average processing time (mock for now - would need stored timestamps)
   */
  async getAvgProcessingTime(): Promise<number> {
    try {
      // This would need to calculate based on stored processing timestamps
      // For now, return a mock value
      const avgTime = 120; // 2 minutes in seconds
      Logger.info('GmailMetrics', 'Avg processing time', { avgTime });
      return avgTime;
    } catch (error) {
      Logger.error('GmailMetrics', 'Failed to get avg processing time', error);
      return 0;
    }
  }

  /**
   * Get daily stats for the last N days
   */
  async getDailyStats(days: number): Promise<BackendDailyStats[]> {
    try {
      const stats: BackendDailyStats[] = [];
      const today = new Date();

      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);

        const nextDate = new Date(date);
        nextDate.setDate(nextDate.getDate() + 1);

        // Query Gmail for emails on this date
        const query = `after:${this.formatDateForQuery(date)} before:${this.formatDateForQuery(nextDate)}`;
        const threads = GmailApp.search(query, 0, 100);

        stats.push({
          date: date.toISOString().split('T')[0],
          emailsReceived: threads.length,
          emailsProcessed: this.countProcessed(threads),
          pendingActions: this.countPending(threads),
          avgProcessingTime: 120 // Mock value
        });
      }

      Logger.info('GmailMetrics', 'Daily stats computed', {
        days,
        statsCount: stats.length
      });
      return stats;
    } catch (error) {
      Logger.error('GmailMetrics', 'Failed to get daily stats', error);
      return [];
    }
  }

  /**
   * Helper: Get PA tracking labels
   */
  private getTrackingLabels(): string[] {
    return [
      'PA-Processed',
      'PA-Priority',
      'PA-ActionRequired',
      'PA-Meeting',
      'PA-FollowUp',
      'PA-Work',
      'PA-Personal'
    ];
  }

  /**
   * Helper: Format date for Gmail query
   */
  private formatDateForQuery(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}/${month}/${day}`;
  }

  /**
   * Helper: Count processed threads
   */
  private countProcessed(threads: GoogleAppsScript.Gmail.GmailThread[]): number {
    let count = 0;
    for (const thread of threads) {
      const labels = thread.getLabels();
      if (labels.some(label => label.getName() === 'PA-Processed')) {
        count++;
      }
    }
    return count;
  }

  /**
   * Helper: Count pending threads
   */
  private countPending(threads: GoogleAppsScript.Gmail.GmailThread[]): number {
    let count = 0;
    for (const thread of threads) {
      const labels = thread.getLabels();
      if (labels.some(label => label.getName() === 'PA-ActionRequired')) {
        count++;
      }
    }
    return count;
  }
}

/**
 * Create metrics service instance
 */
export function createGmailMetricsService(): BackendMetricsService {
  return new GmailMetricsService();
}
