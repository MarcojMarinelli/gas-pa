/**
 * SLA Tracker - Service Level Agreement Deadline Management
 *
 * Calculates and tracks SLA deadlines for:
 * - VIP contacts with custom SLA hours
 * - Priority-based deadlines
 * - Business hours adjustments
 * - Weekend handling
 */

import { FollowUpItem, QueuePriority, SLAStatus, SLAConfig } from './types';
import { VIPContact } from '../vip/manager';
import LoggerService from '../../core/logger-service';
import ConfigManager from '../../core/config-manager';
import { FollowUpQueue } from './queue-manager';

export class SLATracker {
  private static instance: SLATracker;
  private logger: LoggerService;
  private config: ConfigManager;
  private queue: FollowUpQueue;

  private slaConfig: SLAConfig;

  private constructor() {
    this.logger = LoggerService; // Already a singleton instance
    this.config = ConfigManager; // Already a singleton instance
    this.queue = FollowUpQueue.getInstance();

    // Initialize SLA configuration
    this.slaConfig = {
      critical: this.config.get<number>('SLA_HIGH_PRIORITY_HOURS') || 4,
      high: this.config.get<number>('SLA_HIGH_PRIORITY_HOURS') || 4,
      medium: this.config.get<number>('SLA_MEDIUM_PRIORITY_HOURS') || 24,
      low: this.config.get<number>('SLA_LOW_PRIORITY_HOURS') || 72,
      adjustForWeekends: !this.config.get<boolean>('PROCESS_WEEKENDS'),
      workingHours: {
        start: 9,
        end: 17
      }
    };
  }

  static getInstance(): SLATracker {
    if (!SLATracker.instance) {
      SLATracker.instance = new SLATracker();
    }
    return SLATracker.instance;
  }

  /**
   * Calculate SLA deadline for a queue item
   * Considers VIP status, priority, and business hours
   */
  calculateDeadline(item: FollowUpItem, vip?: VIPContact): Date {
    const startTime = item.receivedDate || new Date();
    let slaHours: number;

    // VIP takes precedence
    if (vip && vip.slaHours) {
      slaHours = vip.slaHours;
      this.logger.info('Using VIP SLA hours', {
        email: vip.email,
        slaHours: vip.slaHours
      });
    } else {
      // Use priority-based SLA
      slaHours = this.getSLAHoursByPriority(item.priority);
    }

    // Calculate deadline
    const deadline = this.addBusinessHours(startTime, slaHours);

    this.logger.info('Calculated SLA deadline', {
      itemId: item.id,
      priority: item.priority,
      slaHours,
      deadline: deadline.toISOString(),
      isVIP: !!vip
    });

    return deadline;
  }

  /**
   * Get time remaining until deadline in hours
   */
  getTimeRemaining(deadline: Date): number {
    const now = new Date();
    const remaining = deadline.getTime() - now.getTime();
    return remaining / (1000 * 60 * 60); // Convert to hours
  }

  /**
   * Get SLA status based on deadline and time remaining
   */
  getSLAStatus(deadline: Date, priority?: QueuePriority): SLAStatus {
    const hoursRemaining = this.getTimeRemaining(deadline);

    if (hoursRemaining < 0) {
      return 'OVERDUE';
    }

    // Calculate at-risk threshold based on priority
    let atRiskThreshold = 2; // Default 2 hours
    if (priority === 'CRITICAL') {
      atRiskThreshold = 1;
    } else if (priority === 'HIGH') {
      atRiskThreshold = 2;
    } else if (priority === 'MEDIUM') {
      atRiskThreshold = 4;
    } else if (priority === 'LOW') {
      atRiskThreshold = 8;
    }

    if (hoursRemaining <= atRiskThreshold) {
      return 'AT_RISK';
    }

    return 'ON_TIME';
  }

  /**
   * Check all queue items and alert on overdue
   * Returns list of overdue items
   */
  async checkAndAlertOverdue(): Promise<FollowUpItem[]> {
    const timer = this.logger.startTimer('checkOverdueItems');

    try {
      const overdueItems = await this.queue.getOverdueItems();

      if (overdueItems.length > 0) {
        this.logger.warn('Found overdue queue items', {
          count: overdueItems.length,
          items: overdueItems.map(item => ({
            id: item.id,
            subject: item.subject,
            from: item.from,
            deadline: item.slaDeadline,
            priority: item.priority
          }))
        });

        // Track metric
        this.logger.trackMetric('sla.overdue', overdueItems.length);

        // TODO: Send alert email or notification
        // This could be implemented to notify the user of overdue items

        // Log individual overdue items
        for (const item of overdueItems) {
          this.logger.error('SLA overdue', {
            itemId: item.id,
            emailId: item.emailId,
            subject: item.subject,
            from: item.from,
            deadline: item.slaDeadline,
            hoursOverdue: -this.getTimeRemaining(item.slaDeadline!)
          });
        }
      }

      timer();
      return overdueItems;

    } catch (error) {
      timer();
      this.logger.error('Failed to check overdue items', { error });
      return [];
    }
  }

  /**
   * Escalate at-risk items to higher priority
   */
  async escalateAtRisk(): Promise<void> {
    const timer = this.logger.startTimer('escalateAtRisk');

    try {
      const activeItems = await this.queue.getActiveItems({
        slaStatus: 'AT_RISK'
      });

      let escalated = 0;

      for (const item of activeItems) {
        // Escalate one level if possible
        const newPriority = this.escalatePriority(item.priority);

        if (newPriority !== item.priority) {
          await this.queue.escalate(item.id, newPriority);
          escalated++;

          this.logger.warn('Escalated at-risk item', {
            itemId: item.id,
            subject: item.subject,
            oldPriority: item.priority,
            newPriority,
            deadline: item.slaDeadline,
            hoursRemaining: this.getTimeRemaining(item.slaDeadline!)
          });
        }
      }

      if (escalated > 0) {
        this.logger.info('Escalated at-risk items', { count: escalated });
        this.logger.trackMetric('sla.escalated', escalated);
      }

      timer();

    } catch (error) {
      timer();
      this.logger.error('Failed to escalate at-risk items', { error });
    }
  }

  /**
   * Update SLA status for a queue item
   */
  async updateItemSLAStatus(item: FollowUpItem): Promise<void> {
    if (!item.slaDeadline) {
      return;
    }

    const newStatus = this.getSLAStatus(item.slaDeadline, item.priority);
    const timeRemaining = this.getTimeRemaining(item.slaDeadline);

    if (newStatus !== item.slaStatus || Math.abs(timeRemaining - (item.timeRemaining || 0)) > 1) {
      await this.queue.updateItem(item.id, {
        slaStatus: newStatus,
        timeRemaining
      });

      this.logger.info('Updated SLA status', {
        itemId: item.id,
        oldStatus: item.slaStatus,
        newStatus,
        timeRemaining
      });
    }
  }

  /**
   * Batch update SLA status for all active items
   */
  async updateAllSLAStatuses(): Promise<void> {
    const timer = this.logger.startTimer('updateAllSLAStatuses');

    try {
      const activeItems = await this.queue.getActiveItems({
        limit: 1000 // Process up to 1000 items
      });

      let updated = 0;

      for (const item of activeItems) {
        if (item.slaDeadline) {
          await this.updateItemSLAStatus(item);
          updated++;
        }
      }

      this.logger.info('Updated SLA statuses', {
        total: activeItems.length,
        updated
      });

      timer();

    } catch (error) {
      timer();
      this.logger.error('Failed to update SLA statuses', { error });
    }
  }

  /**
   * Get SLA configuration
   */
  getSLAConfig(): SLAConfig {
    return { ...this.slaConfig };
  }

  /**
   * Update SLA configuration
   */
  updateSLAConfig(config: Partial<SLAConfig>): void {
    this.slaConfig = {
      ...this.slaConfig,
      ...config
    };

    this.logger.info('Updated SLA configuration', { config: this.slaConfig });
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Get SLA hours by priority level
   */
  private getSLAHoursByPriority(priority: QueuePriority): number {
    switch (priority) {
      case 'CRITICAL':
        return this.slaConfig.critical;
      case 'HIGH':
        return this.slaConfig.high;
      case 'MEDIUM':
        return this.slaConfig.medium;
      case 'LOW':
        return this.slaConfig.low;
      default:
        return this.slaConfig.medium;
    }
  }

  /**
   * Add business hours to a date
   * Skips weekends and non-working hours if configured
   */
  private addBusinessHours(startDate: Date, hours: number): Date {
    let date = new Date(startDate);
    let remainingHours = hours;

    const workingHours = this.slaConfig.workingHours!;
    const hoursPerDay = workingHours.end - workingHours.start;

    while (remainingHours > 0) {
      // Skip weekends if configured
      if (this.slaConfig.adjustForWeekends) {
        while (date.getDay() === 0 || date.getDay() === 6) {
          date.setDate(date.getDate() + 1);
          date.setHours(workingHours.start, 0, 0, 0);
        }
      }

      // Get current hour
      let currentHour = date.getHours();

      // If before working hours, move to start of working day
      if (currentHour < workingHours.start) {
        date.setHours(workingHours.start, 0, 0, 0);
        currentHour = workingHours.start;
      }

      // If after working hours, move to next working day
      if (currentHour >= workingHours.end) {
        date.setDate(date.getDate() + 1);
        date.setHours(workingHours.start, 0, 0, 0);
        continue;
      }

      // Calculate hours remaining in current working day
      const hoursRemainingToday = workingHours.end - currentHour;

      if (remainingHours <= hoursRemainingToday) {
        // Can fit remaining hours in today
        date.setHours(currentHour + remainingHours, 0, 0, 0);
        remainingHours = 0;
      } else {
        // Need to continue to next day
        remainingHours -= hoursRemainingToday;
        date.setDate(date.getDate() + 1);
        date.setHours(workingHours.start, 0, 0, 0);
      }
    }

    return date;
  }

  /**
   * Escalate priority one level higher
   */
  private escalatePriority(current: QueuePriority): QueuePriority {
    switch (current) {
      case 'LOW':
        return 'MEDIUM';
      case 'MEDIUM':
        return 'HIGH';
      case 'HIGH':
        return 'CRITICAL';
      case 'CRITICAL':
        return 'CRITICAL'; // Already at highest
      default:
        return current;
    }
  }

  /**
   * Send SLA alert (placeholder for future implementation)
   */
  private async sendSLAAlert(items: FollowUpItem[], alertType: 'OVERDUE' | 'AT_RISK'): Promise<void> {
    try {
      // TODO: Implement email alert
      // This could send an email digest of overdue/at-risk items
      // using GmailApp.sendEmail() or a formatted HTML template

      this.logger.info('Would send SLA alert', {
        type: alertType,
        count: items.length
      });

    } catch (error) {
      this.logger.error('Failed to send SLA alert', { error, alertType });
    }
  }
}

// Export singleton instance
export default SLATracker.getInstance();
