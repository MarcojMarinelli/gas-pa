/**
 * Follow-up Queue Manager
 *
 * Central service for managing the follow-up queue system.
 * Handles queue operations, snooze management, and statistics.
 */

import {
  FollowUpItem,
  FollowUpReason,
  QueueItemStatus,
  QueuePriority,
  SLAStatus,
  SnoozeOptions,
  QueueStatistics,
  QueueQueryOptions,
  QueueHistoryEntry,
  QueueAction,
  BulkOperationResult,
  AutoAddOptions,
  AutoAddResult
} from './types';
import { ClassificationResult } from '../classifier/types';
import DatabaseService from '../../core/database-service';
import CacheManager from '../../core/cache-manager';
import LoggerService from '../../core/logger-service';
import ErrorHandler, { GaspaError } from '../../core/error-handler';

export class FollowUpQueue {
  private static instance: FollowUpQueue;
  private logger: LoggerService;
  private db: DatabaseService;
  private cache: CacheManager;

  private constructor() {
    this.logger = LoggerService; // Already a singleton instance
    this.db = DatabaseService; // Already a singleton instance
    this.cache = CacheManager; // Already a singleton instance
  }

  static getInstance(): FollowUpQueue {
    if (!FollowUpQueue.instance) {
      FollowUpQueue.instance = new FollowUpQueue();
    }
    return FollowUpQueue.instance;
  }

  /**
   * Add a new item to the follow-up queue
   */
  async addItem(item: Partial<FollowUpItem>): Promise<string> {
    const timer = this.logger.startTimer('addQueueItem');

    try {
      // Validate required fields
      if (!item.emailId || !item.threadId) {
        throw new GaspaError(
          'Missing required fields: emailId and threadId',
          'VALIDATION_ERROR',
          false,
          { item }
        );
      }

      // Check if item already exists
      const existing = await this.db.find('FollowUpQueue', {
        where: { emailId: item.emailId },
        limit: 1
      });

      if (existing && existing.length > 0) {
        this.logger.warn('Queue item already exists for emailId', { emailId: item.emailId });
        return existing[0].id;
      }

      // Create full item with defaults
      const now = new Date();
      const queueItem: FollowUpItem = {
        id: this.generateId(),
        emailId: item.emailId!,
        threadId: item.threadId!,
        subject: item.subject || '',
        from: item.from || '',
        to: item.to || '',
        receivedDate: item.receivedDate || now,
        priority: item.priority || 'MEDIUM',
        category: item.category || 'general',
        labels: item.labels || [],
        reason: item.reason || FollowUpReason.NEEDS_REPLY,
        status: item.status || QueueItemStatus.ACTIVE,
        addedToQueueAt: now,
        slaStatus: item.slaStatus || 'ON_TIME',
        createdAt: now,
        updatedAt: now,
        actionCount: 0,
        snoozeCount: 0,
        ...item
      };

      // Validate item
      this.validateQueueItem(queueItem);

      // Insert into database
      const id = await ErrorHandler.handle(
        () => this.db.insert('FollowUpQueue', this.serializeItem(queueItem)),
        { operation: 'addQueueItem', context: { emailId: item.emailId } },
        { type: 'RETRY', maxAttempts: 3, backoffMs: 1000 }
      );

      // Record history
      await this.recordHistory({
        id: this.generateId(),
        queueItemId: id,
        action: QueueAction.ADDED,
        newStatus: queueItem.status,
        timestamp: now,
        metadata: { reason: queueItem.reason }
      });

      // Invalidate caches
      await this.invalidateQueueCaches();

      this.logger.info('Added item to follow-up queue', {
        id,
        emailId: item.emailId,
        priority: queueItem.priority,
        reason: queueItem.reason
      });

      this.logger.trackMetric('queue.items.added', 1, {
        priority: queueItem.priority,
        reason: queueItem.reason
      });

      timer();
      return id;

    } catch (error) {
      timer();
      this.logger.error('Failed to add queue item', { error, item });
      throw error;
    }
  }

  /**
   * Update an existing queue item
   */
  async updateItem(id: string, updates: Partial<FollowUpItem>): Promise<void> {
    const timer = this.logger.startTimer('updateQueueItem');

    try {
      const existing = await this.getItem(id);
      if (!existing) {
        throw new GaspaError(
          `Queue item not found: ${id}`,
          'NOT_FOUND',
          false,
          { id }
        );
      }

      const updatedItem = {
        ...existing,
        ...updates,
        updatedAt: new Date(),
        actionCount: existing.actionCount + 1
      };

      // Validate updated item
      this.validateQueueItem(updatedItem);

      // Update in database
      await ErrorHandler.handle(
        () => this.db.update('FollowUpQueue', id, this.serializeItem(updatedItem)),
        { operation: 'updateQueueItem', context: { id } },
        { type: 'RETRY', maxAttempts: 3, backoffMs: 1000 }
      );

      // Record history
      await this.recordHistory({
        id: this.generateId(),
        queueItemId: id,
        action: QueueAction.UPDATED,
        oldStatus: existing.status,
        newStatus: updatedItem.status,
        oldPriority: existing.priority,
        newPriority: updatedItem.priority,
        timestamp: new Date(),
        metadata: updates
      });

      // Invalidate caches
      await this.invalidateQueueCaches();
      await this.cache.invalidate(`queue:item:${id}`);

      this.logger.info('Updated queue item', { id, updates });
      timer();

    } catch (error) {
      timer();
      this.logger.error('Failed to update queue item', { error, id, updates });
      throw error;
    }
  }

  /**
   * Remove an item from the queue
   */
  async removeItem(id: string): Promise<void> {
    const timer = this.logger.startTimer('removeQueueItem');

    try {
      const item = await this.getItem(id);
      if (!item) {
        this.logger.warn('Cannot remove: queue item not found', { id });
        return;
      }

      await ErrorHandler.handle(
        () => this.db.delete('FollowUpQueue', id),
        { operation: 'removeQueueItem', context: { id } },
        { type: 'RETRY', maxAttempts: 3, backoffMs: 1000 }
      );

      // Record history
      await this.recordHistory({
        id: this.generateId(),
        queueItemId: id,
        action: QueueAction.ARCHIVED,
        oldStatus: item.status,
        timestamp: new Date()
      });

      // Invalidate caches
      await this.invalidateQueueCaches();
      await this.cache.invalidate(`queue:item:${id}`);

      this.logger.info('Removed queue item', { id });
      timer();

    } catch (error) {
      timer();
      this.logger.error('Failed to remove queue item', { error, id });
      throw error;
    }
  }

  /**
   * Get a specific queue item by ID
   */
  async getItem(id: string): Promise<FollowUpItem | null> {
    try {
      this.logger.info('getItem called', { id });

      // Fetch from database
      this.logger.info('Calling db.find', { table: 'FollowUpQueue', id });

      const items = await this.db.find('FollowUpQueue', {
        where: { id },
        limit: 1
      });

      this.logger.info('db.find returned', { itemsLength: items?.length, hasItems: !!items });

      if (!items || items.length === 0) {
        this.logger.warn('Queue item not found in database', { id, items });
        return null;
      }

      this.logger.info('Deserializing item', { rawItem: items[0] });

      let item: FollowUpItem;
      try {
        item = this.deserializeItem(items[0]);
      } catch (deserializeError: any) {
        // Log with explicit error details
        console.error('DESERIALIZATION ERROR:', {
          message: deserializeError?.message,
          name: deserializeError?.name,
          toString: String(deserializeError),
          stack: deserializeError?.stack,
          rawData: JSON.stringify(items[0])
        });

        this.logger.error('Deserialization failed', {
          errorMessage: deserializeError?.message,
          errorName: deserializeError?.name,
          errorString: String(deserializeError),
          rawDataKeys: Object.keys(items[0] || {}),
          hasLabels: !!items[0]?.labels,
          hasReceivedDate: !!items[0]?.receivedDate
        });
        throw deserializeError;
      }

      this.logger.info('Item deserialized successfully', {
        id: item.id,
        subject: item.subject
      });

      return item;

    } catch (error: any) {
      this.logger.error('Failed to get queue item', {
        error: error?.message || String(error),
        stack: error?.stack,
        name: error?.name,
        type: error?.type,
        id
      });
      return null;
    }
  }

  /**
   * Get active queue items with optional filters
   */
  async getActiveItems(options: QueueQueryOptions = {}): Promise<FollowUpItem[]> {
    const timer = this.logger.startTimer('getActiveItems');

    try {
      const cacheKey = `queue:active:${JSON.stringify(options)}`;
      const cached = await this.cache.get<FollowUpItem[]>(
        cacheKey,
        undefined,
        { ttl: 300, layer: 'memory' }
      );

      if (cached) {
        timer();
        return cached;
      }

      const queryOptions = this.buildQueryOptions(options);
      queryOptions.where = queryOptions.where || {};
      queryOptions.where.status = QueueItemStatus.ACTIVE;

      const items = await this.db.find('FollowUpQueue', queryOptions);
      const deserialized = items.map(item => this.deserializeItem(item));

      // Cache results
      await this.cache.set(cacheKey, deserialized, { ttl: 300, layer: 'memory' });

      timer();
      return deserialized;

    } catch (error) {
      timer();
      this.logger.error('Failed to get active items', { error, options });
      return [];
    }
  }

  /**
   * Get snoozed items that are ready to resurface
   */
  async checkSnoozedItems(): Promise<FollowUpItem[]> {
    const timer = this.logger.startTimer('checkSnoozedItems');

    try {
      const now = new Date();
      const items = await this.db.find('FollowUpQueue', {
        where: {
          status: QueueItemStatus.SNOOZED,
          snoozedUntilBefore: now
        }
      });

      const resurfaced: FollowUpItem[] = [];

      for (const item of items) {
        const queueItem = this.deserializeItem(item);

        // Resurface the item
        await this.updateItem(queueItem.id, {
          status: QueueItemStatus.ACTIVE,
          snoozedUntil: undefined
        });

        resurfaced.push(queueItem);

        // Record history
        await this.recordHistory({
          id: this.generateId(),
          queueItemId: queueItem.id,
          action: QueueAction.RESURFACED,
          oldStatus: QueueItemStatus.SNOOZED,
          newStatus: QueueItemStatus.ACTIVE,
          timestamp: now
        });

        this.logger.info('Resurfaced snoozed item', {
          id: queueItem.id,
          emailId: queueItem.emailId
        });
      }

      this.logger.trackMetric('queue.items.resurfaced', resurfaced.length);

      timer();
      return resurfaced;

    } catch (error) {
      timer();
      this.logger.error('Failed to check snoozed items', { error });
      return [];
    }
  }

  /**
   * Get items waiting on others
   */
  async getWaitingItems(): Promise<FollowUpItem[]> {
    return this.getActiveItems({
      status: QueueItemStatus.WAITING
    });
  }

  /**
   * Get overdue items (past SLA deadline)
   */
  async getOverdueItems(): Promise<FollowUpItem[]> {
    return this.getActiveItems({
      slaStatus: 'OVERDUE'
    });
  }

  /**
   * Get items by priority
   */
  async getItemsByPriority(priority: QueuePriority): Promise<FollowUpItem[]> {
    return this.getActiveItems({
      priority
    });
  }

  /**
   * Snooze a queue item
   */
  async snoozeItem(id: string, options: SnoozeOptions): Promise<void> {
    const timer = this.logger.startTimer('snoozeItem');

    try {
      if (options.until < new Date()) {
        throw new GaspaError(
          'Snooze time cannot be in the past',
          'VALIDATION_ERROR',
          false,
          { id, snoozeTime: options.until }
        );
      }

      const item = await this.getItem(id);
      if (!item) {
        throw new GaspaError(
          `Queue item not found: ${id}`,
          'NOT_FOUND',
          false,
          { id }
        );
      }

      await this.updateItem(id, {
        status: QueueItemStatus.SNOOZED,
        snoozedUntil: options.until,
        snoozeCount: item.snoozeCount + 1,
        aiReasoning: options.smart ? options.aiReasoning : undefined
      });

      // Record history
      await this.recordHistory({
        id: this.generateId(),
        queueItemId: id,
        action: QueueAction.SNOOZED,
        oldStatus: item.status,
        newStatus: QueueItemStatus.SNOOZED,
        timestamp: new Date(),
        metadata: {
          snoozedUntil: options.until,
          reason: options.reason,
          smart: options.smart
        }
      });

      this.logger.info('Snoozed queue item', {
        id,
        until: options.until,
        smart: options.smart
      });

      this.logger.trackMetric('queue.items.snoozed', 1, {
        smart: options.smart ? 'true' : 'false'
      });

      timer();

    } catch (error) {
      timer();
      this.logger.error('Failed to snooze item', { error, id, options });
      throw error;
    }
  }

  /**
   * Mark item as completed
   */
  async markCompleted(id: string): Promise<void> {
    const timer = this.logger.startTimer('markCompleted');

    try {
      const item = await this.getItem(id);
      if (!item) {
        throw new GaspaError(
          `Queue item not found: ${id}`,
          'NOT_FOUND',
          false,
          { id }
        );
      }

      await this.updateItem(id, {
        status: QueueItemStatus.COMPLETED,
        lastActionDate: new Date()
      });

      // Record history
      await this.recordHistory({
        id: this.generateId(),
        queueItemId: id,
        action: QueueAction.COMPLETED,
        oldStatus: item.status,
        newStatus: QueueItemStatus.COMPLETED,
        timestamp: new Date()
      });

      this.logger.info('Marked queue item as completed', { id });
      this.logger.trackMetric('queue.items.completed', 1, {
        priority: item.priority
      });

      timer();

    } catch (error) {
      timer();
      this.logger.error('Failed to mark item as completed', { error, id });
      throw error;
    }
  }

  /**
   * Mark item as waiting on others
   */
  async markWaiting(id: string, waitingOn: string, reason: string): Promise<void> {
    const timer = this.logger.startTimer('markWaiting');

    try {
      const item = await this.getItem(id);
      if (!item) {
        throw new GaspaError(
          `Queue item not found: ${id}`,
          'NOT_FOUND',
          false,
          { id }
        );
      }

      await this.updateItem(id, {
        status: QueueItemStatus.WAITING,
        waitingOnEmail: waitingOn,
        waitingReason: reason,
        lastActionDate: new Date()
      });

      // Record history
      await this.recordHistory({
        id: this.generateId(),
        queueItemId: id,
        action: QueueAction.MARKED_WAITING,
        oldStatus: item.status,
        newStatus: QueueItemStatus.WAITING,
        timestamp: new Date(),
        metadata: { waitingOn, reason }
      });

      this.logger.info('Marked queue item as waiting', { id, waitingOn });
      this.logger.trackMetric('queue.items.waiting', 1);

      timer();

    } catch (error) {
      timer();
      this.logger.error('Failed to mark item as waiting', { error, id });
      throw error;
    }
  }

  /**
   * Escalate item to higher priority
   */
  async escalate(id: string, newPriority: QueuePriority): Promise<void> {
    const timer = this.logger.startTimer('escalateItem');

    try {
      const item = await this.getItem(id);
      if (!item) {
        throw new GaspaError(
          `Queue item not found: ${id}`,
          'NOT_FOUND',
          false,
          { id }
        );
      }

      await this.updateItem(id, {
        priority: newPriority,
        status: QueueItemStatus.ESCALATED
      });

      // Record history
      await this.recordHistory({
        id: this.generateId(),
        queueItemId: id,
        action: QueueAction.ESCALATED,
        oldPriority: item.priority,
        newPriority,
        timestamp: new Date()
      });

      this.logger.info('Escalated queue item', {
        id,
        from: item.priority,
        to: newPriority
      });

      this.logger.trackMetric('queue.items.escalated', 1, {
        from: item.priority,
        to: newPriority
      });

      timer();

    } catch (error) {
      timer();
      this.logger.error('Failed to escalate item', { error, id, newPriority });
      throw error;
    }
  }

  /**
   * Bulk snooze multiple items
   */
  async bulkSnooze(ids: string[], options: SnoozeOptions): Promise<BulkOperationResult> {
    const timer = this.logger.startTimer('bulkSnooze');
    const result: BulkOperationResult = {
      successful: [],
      failed: [],
      totalProcessed: ids.length
    };

    try {
      for (const id of ids) {
        try {
          await this.snoozeItem(id, options);
          result.successful.push(id);
        } catch (error: any) {
          result.failed.push({ id, error: error.message });
        }
      }

      this.logger.info('Bulk snooze completed', {
        total: ids.length,
        successful: result.successful.length,
        failed: result.failed.length
      });

      timer();
      return result;

    } catch (error) {
      timer();
      this.logger.error('Bulk snooze failed', { error, ids });
      throw error;
    }
  }

  /**
   * Bulk complete multiple items
   */
  async bulkComplete(ids: string[]): Promise<BulkOperationResult> {
    const timer = this.logger.startTimer('bulkComplete');
    const result: BulkOperationResult = {
      successful: [],
      failed: [],
      totalProcessed: ids.length
    };

    try {
      for (const id of ids) {
        try {
          await this.markCompleted(id);
          result.successful.push(id);
        } catch (error: any) {
          result.failed.push({ id, error: error.message });
        }
      }

      this.logger.info('Bulk complete finished', {
        total: ids.length,
        successful: result.successful.length,
        failed: result.failed.length
      });

      timer();
      return result;

    } catch (error) {
      timer();
      this.logger.error('Bulk complete failed', { error, ids });
      throw error;
    }
  }

  /**
   * Process new classification and add to queue if needed
   */
  async processNewClassification(
    classification: ClassificationResult,
    emailData: {
      emailId: string;
      threadId: string;
      subject: string;
      from: string;
      to: string;
      receivedDate: Date;
    }
  ): Promise<string | null> {
    const timer = this.logger.startTimer('processNewClassification');

    try {
      // Determine if email needs follow-up
      const needsFollowUp =
        classification.needsReply ||
        classification.waitingOnOthers ||
        classification.priority === 'CRITICAL' ||
        classification.priority === 'HIGH' ||
        classification.isVIP;

      if (!needsFollowUp) {
        timer();
        return null;
      }

      // Determine reason
      let reason: FollowUpReason;
      if (classification.waitingOnOthers) {
        reason = FollowUpReason.WAITING_ON_OTHERS;
      } else if (classification.isVIP) {
        reason = FollowUpReason.VIP_REQUIRES_ATTENTION;
      } else if (classification.needsReply) {
        reason = FollowUpReason.NEEDS_REPLY;
      } else {
        reason = FollowUpReason.NEEDS_REPLY;
      }

      // Create queue item
      const item: Partial<FollowUpItem> = {
        emailId: emailData.emailId,
        threadId: emailData.threadId,
        subject: emailData.subject,
        from: emailData.from,
        to: emailData.to,
        receivedDate: emailData.receivedDate,
        priority: classification.priority as QueuePriority,
        category: classification.category,
        labels: classification.labels,
        reason,
        status: classification.waitingOnOthers ? QueueItemStatus.WAITING : QueueItemStatus.ACTIVE,
        suggestedSnoozeTime: classification.suggestedSnoozeTime,
        aiReasoning: classification.reasoning
      };

      const id = await this.addItem(item);

      this.logger.info('Added classification to queue', {
        id,
        emailId: emailData.emailId,
        priority: classification.priority,
        reason
      });

      timer();
      return id;

    } catch (error) {
      timer();
      this.logger.error('Failed to process classification', { error, emailData });
      return null;
    }
  }

  /**
   * Get queue statistics
   */
  async getStatistics(): Promise<QueueStatistics> {
    const timer = this.logger.startTimer('getQueueStatistics');

    try {
      // Check cache
      const cached = await this.cache.get<QueueStatistics>(
        'queue:stats',
        undefined,
        { ttl: 900, layer: 'property' }
      );

      if (cached) {
        timer();
        return cached;
      }

      // Calculate statistics
      const allItems = await this.db.find('FollowUpQueue', {});
      const now = new Date();

      const stats: QueueStatistics = {
        totalActive: 0,
        totalSnoozed: 0,
        totalWaiting: 0,
        totalCompleted: 0,
        criticalCount: 0,
        highCount: 0,
        mediumCount: 0,
        lowCount: 0,
        onTimeCount: 0,
        atRiskCount: 0,
        overdueCount: 0,
        averageResponseTime: 0,
        completedToday: 0,
        completedThisWeek: 0,
        averageTimeInQueue: 0,
        waitingOnOthersCount: 0,
        averageWaitTime: 0,
        snoozedCount: 0,
        averageSnoozeTime: 0,
        lastUpdated: now
      };

      let totalTimeInQueue = 0;
      let totalWaitTime = 0;
      let totalSnoozeTime = 0;
      let responseTimeSum = 0;
      let responseTimeCount = 0;

      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      for (const item of allItems) {
        const queueItem = this.deserializeItem(item);

        // Status counts
        if (queueItem.status === QueueItemStatus.ACTIVE) stats.totalActive++;
        if (queueItem.status === QueueItemStatus.SNOOZED) stats.totalSnoozed++;
        if (queueItem.status === QueueItemStatus.WAITING) stats.totalWaiting++;
        if (queueItem.status === QueueItemStatus.COMPLETED) stats.totalCompleted++;

        // Priority counts
        if (queueItem.priority === 'CRITICAL') stats.criticalCount++;
        if (queueItem.priority === 'HIGH') stats.highCount++;
        if (queueItem.priority === 'MEDIUM') stats.mediumCount++;
        if (queueItem.priority === 'LOW') stats.lowCount++;

        // SLA counts
        if (queueItem.slaStatus === 'ON_TIME') stats.onTimeCount++;
        if (queueItem.slaStatus === 'AT_RISK') stats.atRiskCount++;
        if (queueItem.slaStatus === 'OVERDUE') stats.overdueCount++;

        // Completed counts
        if (queueItem.status === QueueItemStatus.COMPLETED) {
          if (queueItem.updatedAt >= todayStart) stats.completedToday++;
          if (queueItem.updatedAt >= weekStart) stats.completedThisWeek++;

          // Response time
          if (queueItem.lastActionDate) {
            const responseTime = queueItem.lastActionDate.getTime() - queueItem.addedToQueueAt.getTime();
            responseTimeSum += responseTime;
            responseTimeCount++;
          }
        }

        // Time in queue
        const endTime = queueItem.status === QueueItemStatus.COMPLETED
          ? queueItem.updatedAt
          : now;
        const timeInQueue = endTime.getTime() - queueItem.addedToQueueAt.getTime();
        totalTimeInQueue += timeInQueue;

        // Waiting metrics
        if (queueItem.status === QueueItemStatus.WAITING && queueItem.originalSentDate) {
          stats.waitingOnOthersCount++;
          const waitTime = now.getTime() - queueItem.originalSentDate.getTime();
          totalWaitTime += waitTime;
        }

        // Snooze metrics
        if (queueItem.snoozeCount > 0 && queueItem.snoozedUntil) {
          stats.snoozedCount++;
          const snoozeTime = queueItem.snoozedUntil.getTime() - queueItem.addedToQueueAt.getTime();
          totalSnoozeTime += snoozeTime;
        }
      }

      // Calculate averages
      if (allItems.length > 0) {
        stats.averageTimeInQueue = (totalTimeInQueue / allItems.length) / (1000 * 60 * 60); // hours
      }

      if (stats.waitingOnOthersCount > 0) {
        stats.averageWaitTime = (totalWaitTime / stats.waitingOnOthersCount) / (1000 * 60 * 60); // hours
      }

      if (stats.snoozedCount > 0) {
        stats.averageSnoozeTime = (totalSnoozeTime / stats.snoozedCount) / (1000 * 60 * 60); // hours
      }

      if (responseTimeCount > 0) {
        stats.averageResponseTime = (responseTimeSum / responseTimeCount) / (1000 * 60 * 60); // hours
      }

      // Cache statistics
      await this.cache.set('queue:stats', stats, { ttl: 900, layer: 'property' });

      this.logger.info('Calculated queue statistics', stats);

      timer();
      return stats;

    } catch (error) {
      timer();
      this.logger.error('Failed to get queue statistics', { error });
      throw error;
    }
  }

  /**
   * Get item history
   */
  async getItemHistory(emailId: string): Promise<QueueHistoryEntry[]> {
    try {
      const history = await this.db.find('QueueHistory', {
        where: { emailId },
        orderBy: 'timestamp',
        order: 'desc'
      });

      return history.map(entry => ({
        ...entry,
        timestamp: new Date(entry.timestamp)
      }));

    } catch (error) {
      this.logger.error('Failed to get item history', { error, emailId });
      return [];
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Generate unique ID for queue items
   */
  private generateId(): string {
    return `queue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Validate queue item
   */
  private validateQueueItem(item: FollowUpItem): void {
    const errors: string[] = [];

    if (!item.emailId || !item.threadId) {
      errors.push('Missing required email identifiers');
    }

    if (!['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].includes(item.priority)) {
      errors.push(`Invalid priority: ${item.priority}`);
    }

    if (!Object.values(QueueItemStatus).includes(item.status)) {
      errors.push(`Invalid status: ${item.status}`);
    }

    if (item.snoozedUntil && item.snoozedUntil < new Date()) {
      errors.push('Snooze time cannot be in the past');
    }

    if (errors.length > 0) {
      throw new GaspaError(
        'Queue item validation failed',
        'VALIDATION_ERROR',
        false,
        { errors, item }
      );
    }
  }

  /**
   * Serialize item for database storage
   */
  private serializeItem(item: FollowUpItem): Record<string, any> {
    return {
      ...item,
      labels: JSON.stringify(item.labels),
      suggestedActions: item.suggestedActions ? JSON.stringify(item.suggestedActions) : undefined,
      receivedDate: item.receivedDate.toISOString(),
      addedToQueueAt: item.addedToQueueAt.toISOString(),
      snoozedUntil: item.snoozedUntil?.toISOString(),
      lastActionDate: item.lastActionDate?.toISOString(),
      slaDeadline: item.slaDeadline?.toISOString(),
      originalSentDate: item.originalSentDate?.toISOString(),
      suggestedSnoozeTime: item.suggestedSnoozeTime?.toISOString(),
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString()
    };
  }

  /**
   * Deserialize item from database
   */
  private deserializeItem(data: any): FollowUpItem {
    return {
      ...data,
      // Handle labels - might already be an array or a JSON string
      labels: Array.isArray(data.labels)
        ? data.labels
        : (data.labels ? JSON.parse(data.labels) : []),

      // Handle suggestedActions - might already be an array or a JSON string
      suggestedActions: Array.isArray(data.suggestedActions)
        ? data.suggestedActions
        : (data.suggestedActions ? JSON.parse(data.suggestedActions) : undefined),

      // Parse dates - handle null/undefined
      receivedDate: data.receivedDate ? new Date(data.receivedDate) : new Date(),
      addedToQueueAt: data.addedToQueueAt ? new Date(data.addedToQueueAt) : new Date(),
      snoozedUntil: data.snoozedUntil ? new Date(data.snoozedUntil) : undefined,
      lastActionDate: data.lastActionDate ? new Date(data.lastActionDate) : undefined,
      slaDeadline: data.slaDeadline ? new Date(data.slaDeadline) : undefined,
      originalSentDate: data.originalSentDate ? new Date(data.originalSentDate) : undefined,
      suggestedSnoozeTime: data.suggestedSnoozeTime ? new Date(data.suggestedSnoozeTime) : undefined,
      createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
      updatedAt: data.updatedAt ? new Date(data.updatedAt) : new Date()
    };
  }

  /**
   * Build database query options from queue query options
   */
  private buildQueryOptions(options: QueueQueryOptions): any {
    const queryOptions: any = {
      where: {},
      orderBy: options.sortBy || 'priority',
      order: options.sortOrder || 'desc',
      limit: options.limit || 50,
      offset: options.offset || 0
    };

    // Status filter
    if (options.status) {
      queryOptions.where.status = options.status;
    }

    // Priority filter
    if (options.priority) {
      queryOptions.where.priority = options.priority;
    }

    // Reason filter
    if (options.reason) {
      queryOptions.where.reason = options.reason;
    }

    // SLA status filter
    if (options.slaStatus) {
      queryOptions.where.slaStatus = options.slaStatus;
    }

    // Category filter
    if (options.category) {
      queryOptions.where.category = options.category;
    }

    // Date filters
    if (options.addedAfter) {
      queryOptions.where.addedAfter = options.addedAfter;
    }

    if (options.addedBefore) {
      queryOptions.where.addedBefore = options.addedBefore;
    }

    if (options.slaDeadlineBefore) {
      queryOptions.where.slaDeadlineBefore = options.slaDeadlineBefore;
    }

    if (options.snoozedUntilBefore) {
      queryOptions.where.snoozedUntilBefore = options.snoozedUntilBefore;
    }

    return queryOptions;
  }

  /**
   * Record history entry
   */
  private async recordHistory(entry: QueueHistoryEntry): Promise<void> {
    try {
      await this.db.insert('QueueHistory', {
        ...entry,
        timestamp: entry.timestamp.toISOString(),
        metadata: entry.metadata ? JSON.stringify(entry.metadata) : undefined
      });
    } catch (error) {
      // Don't fail operation if history recording fails
      this.logger.warn('Failed to record queue history', { error, entry });
    }
  }

  /**
   * Invalidate queue-related caches
   */
  private async invalidateQueueCaches(): Promise<void> {
    try {
      await this.cache.invalidate('queue:active');
      await this.cache.invalidate('queue:stats');
      // Don't await - fire and forget for performance
      this.cache.invalidate('queue:active:').catch(() => { });
    } catch (error) {
      this.logger.warn('Failed to invalidate queue caches', { error });
    }
  }
}

// Export singleton instance
export default FollowUpQueue.getInstance();
