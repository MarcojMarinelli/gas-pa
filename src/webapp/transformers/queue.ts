/**
 * Queue Data Transformer
 * Transforms between backend FollowUpItem and API QueueItem
 * Handles Date ↔ ISO string conversion
 */

import { QueueItem } from '../../types/shared-models';
import { validate, queueItemSchema } from '../../types/validators';

/**
 * Backend FollowUpItem interface (from features/queue/types.ts)
 * This is what the backend uses internally
 */
export interface BackendFollowUpItem {
  // Identifiers
  id: string;
  emailId: string;
  threadId: string;

  // Email metadata
  subject: string;
  from: string;
  to: string;
  receivedDate: Date;

  // Classification
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  category: string;
  labels: string[];

  // Follow-up tracking
  reason: 'NEEDS_REPLY' | 'WAITING_ON_OTHERS' | 'DEADLINE_APPROACHING' | 'VIP_REQUIRES_ATTENTION' | 'MANUAL_FOLLOW_UP' | 'SLA_AT_RISK' | 'PERIODIC_CHECK';
  status: 'ACTIVE' | 'SNOOZED' | 'WAITING' | 'COMPLETED' | 'ARCHIVED' | 'ESCALATED';
  addedToQueueAt: Date;
  snoozedUntil?: Date;
  lastActionDate?: Date;

  // SLA tracking
  slaDeadline?: Date;
  slaStatus: 'ON_TIME' | 'AT_RISK' | 'OVERDUE';

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  actionCount: number;
  snoozeCount: number;

  // Additional fields not in base type but useful for API
  snippet?: string;
  hasAttachments?: boolean;
  attachmentCount?: number;
}

/**
 * Queue Transformer Class
 * Bidirectional transformation with validation
 */
export class QueueTransformer {
  /**
   * Transform backend FollowUpItem to API QueueItem
   * Converts Date objects to ISO 8601 strings
   * Normalizes enum values to lowercase
   */
  static toApiModel(item: BackendFollowUpItem): QueueItem {
    const apiItem: QueueItem = {
      id: item.id,
      emailId: item.emailId,
      threadId: item.threadId,
      subject: item.subject,
      from: item.from,
      to: item.to,
      date: item.receivedDate.toISOString(),

      // Normalize priority (CRITICAL/HIGH -> high)
      priority: this.normalizePriority(item.priority),

      // Normalize status (ACTIVE/WAITING -> pending)
      status: this.normalizeStatus(item.status),

      category: item.category,
      labels: item.labels || [],
      reason: this.normalizeReason(item.reason),
      slaStatus: item.slaStatus,

      // Convert optional dates (note field name changes)
      dueDate: item.slaDeadline?.toISOString(),
      snoozeUntil: item.snoozedUntil?.toISOString(),
      addedToQueueAt: item.addedToQueueAt?.toISOString(),
      lastActionAt: item.lastActionDate?.toISOString(),

      actionCount: item.actionCount,
      snoozeCount: item.snoozeCount,
      snippet: item.snippet,
      hasAttachments: item.hasAttachments,
      attachmentCount: item.attachmentCount
    };

    // Validate transformed data
    return validate(queueItemSchema, apiItem);
  }

  /**
   * Transform API QueueItem to backend FollowUpItem
   * Converts ISO 8601 strings to Date objects
   * Normalizes enum values to uppercase
   */
  static toBackendModel(item: Partial<QueueItem>): Partial<BackendFollowUpItem> {
    const backendItem: Partial<BackendFollowUpItem> = {
      id: item.id,
      emailId: item.emailId,
      threadId: item.threadId,
      subject: item.subject,
      from: item.from,
      to: item.to,

      // Convert date string to Date
      receivedDate: item.date ? new Date(item.date) : undefined,

      // Denormalize priority (high -> HIGH)
      priority: item.priority ? this.denormalizePriority(item.priority) : undefined,

      // Denormalize status (pending -> ACTIVE)
      status: item.status ? this.denormalizeStatus(item.status) : undefined,

      category: item.category,
      labels: item.labels,
      reason: this.denormalizeReason(item.reason),
      slaStatus: item.slaStatus,

      // Convert optional date strings to Date
      slaDeadline: item.dueDate ? new Date(item.dueDate) : undefined,
      snoozedUntil: item.snoozeUntil ? new Date(item.snoozeUntil) : undefined,
      addedToQueueAt: item.addedToQueueAt ? new Date(item.addedToQueueAt) : undefined,
      lastActionDate: item.lastActionAt ? new Date(item.lastActionAt) : undefined,

      actionCount: item.actionCount,
      snoozeCount: item.snoozeCount,
      snippet: item.snippet,
      hasAttachments: item.hasAttachments,
      attachmentCount: item.attachmentCount
    };

    // Remove undefined values
    return this.cleanUndefined(backendItem);
  }

  /**
   * Transform array of backend items to API items
   */
  static toApiModels(items: BackendFollowUpItem[]): QueueItem[] {
    return items.map(item => this.toApiModel(item));
  }

  /**
   * Transform array of API items to backend items
   */
  static toBackendModels(items: QueueItem[]): BackendFollowUpItem[] {
    return items.map(item => this.toBackendModel(item) as BackendFollowUpItem);
  }

  /**
   * Normalize backend priority to API priority
   * CRITICAL -> high, HIGH -> high, etc.
   */
  private static normalizePriority(
    priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  ): 'high' | 'medium' | 'low' {
    const mapping: Record<string, 'high' | 'medium' | 'low'> = {
      'CRITICAL': 'high',
      'HIGH': 'high',
      'MEDIUM': 'medium',
      'LOW': 'low'
    };
    return mapping[priority] || 'medium';
  }

  /**
   * Denormalize API priority to backend priority
   * high -> HIGH, medium -> MEDIUM, etc.
   */
  private static denormalizePriority(
    priority: 'high' | 'medium' | 'low'
  ): 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' {
    // Default to HIGH for 'high' (vs CRITICAL)
    const mapping: Record<string, 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'> = {
      'high': 'HIGH',
      'medium': 'MEDIUM',
      'low': 'LOW'
    };
    return mapping[priority] || 'MEDIUM';
  }

  /**
   * Normalize backend status to API status
   * ACTIVE -> pending, WAITING -> pending, SNOOZED -> snoozed, etc.
   */
  private static normalizeStatus(
    status: 'ACTIVE' | 'SNOOZED' | 'WAITING' | 'COMPLETED' | 'ARCHIVED' | 'ESCALATED'
  ): 'pending' | 'processing' | 'completed' | 'snoozed' | 'archived' {
    const mapping: Record<string, 'pending' | 'processing' | 'completed' | 'snoozed' | 'archived'> = {
      'ACTIVE': 'pending',
      'WAITING': 'pending',
      'SNOOZED': 'snoozed',
      'ESCALATED': 'processing',
      'COMPLETED': 'completed',
      'ARCHIVED': 'archived'
    };
    return mapping[status] || 'pending';
  }

  /**
   * Denormalize API status to backend status
   * pending -> ACTIVE, snoozed -> SNOOZED, etc.
   */
  private static denormalizeStatus(
    status: 'pending' | 'processing' | 'completed' | 'snoozed' | 'archived'
  ): 'ACTIVE' | 'SNOOZED' | 'WAITING' | 'COMPLETED' | 'ARCHIVED' | 'ESCALATED' {
    const mapping: Record<string, 'ACTIVE' | 'SNOOZED' | 'WAITING' | 'COMPLETED' | 'ARCHIVED' | 'ESCALATED'> = {
      'pending': 'ACTIVE',
      'processing': 'ACTIVE', // Could be ESCALATED but default to ACTIVE
      'completed': 'COMPLETED',
      'snoozed': 'SNOOZED',
      'archived': 'ARCHIVED'
    };
    return mapping[status] || 'ACTIVE';
  }

  /**
   * Normalize backend reason to API reason
   * Maps granular backend reasons to simpler API categories
   */
  private static normalizeReason(
    reason?: 'NEEDS_REPLY' | 'WAITING_ON_OTHERS' | 'DEADLINE_APPROACHING' | 'VIP_REQUIRES_ATTENTION' | 'MANUAL_FOLLOW_UP' | 'SLA_AT_RISK' | 'PERIODIC_CHECK'
  ): 'NEEDS_REPLY' | 'WAITING_ON_INFO' | 'REQUIRES_ACTION' | 'FOLLOW_UP_SCHEDULED' | 'DELEGATED' | 'CUSTOM' | undefined {
    if (!reason) return undefined;

    const mapping: Record<string, any> = {
      'NEEDS_REPLY': 'NEEDS_REPLY',
      'WAITING_ON_OTHERS': 'WAITING_ON_INFO',
      'DEADLINE_APPROACHING': 'REQUIRES_ACTION',
      'VIP_REQUIRES_ATTENTION': 'REQUIRES_ACTION',
      'MANUAL_FOLLOW_UP': 'FOLLOW_UP_SCHEDULED',
      'SLA_AT_RISK': 'REQUIRES_ACTION',
      'PERIODIC_CHECK': 'FOLLOW_UP_SCHEDULED'
    };
    return mapping[reason] || 'CUSTOM';
  }

  /**
   * Denormalize API reason to backend reason
   * Maps simple API categories to backend reasons (defaults to most common)
   */
  private static denormalizeReason(
    reason?: 'NEEDS_REPLY' | 'WAITING_ON_INFO' | 'REQUIRES_ACTION' | 'FOLLOW_UP_SCHEDULED' | 'DELEGATED' | 'CUSTOM'
  ): 'NEEDS_REPLY' | 'WAITING_ON_OTHERS' | 'DEADLINE_APPROACHING' | 'VIP_REQUIRES_ATTENTION' | 'MANUAL_FOLLOW_UP' | 'SLA_AT_RISK' | 'PERIODIC_CHECK' | undefined {
    if (!reason) return undefined;

    const mapping: Record<string, any> = {
      'NEEDS_REPLY': 'NEEDS_REPLY',
      'WAITING_ON_INFO': 'WAITING_ON_OTHERS',
      'REQUIRES_ACTION': 'DEADLINE_APPROACHING',
      'FOLLOW_UP_SCHEDULED': 'MANUAL_FOLLOW_UP',
      'DELEGATED': 'WAITING_ON_OTHERS',
      'CUSTOM': 'MANUAL_FOLLOW_UP'
    };
    return mapping[reason] || 'MANUAL_FOLLOW_UP';
  }

  /**
   * Remove undefined values from object
   */
  private static cleanUndefined<T extends object>(obj: T): T {
    const cleaned: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = value;
      }
    }
    return cleaned;
  }

  /**
   * Validate queue item without transformation
   */
  static validateQueueItem(item: unknown): QueueItem {
    return validate(queueItemSchema, item);
  }

  /**
   * Check if object is a valid backend FollowUpItem
   */
  static isBackendFollowUpItem(obj: any): obj is BackendFollowUpItem {
    return (
      typeof obj === 'object' &&
      typeof obj.id === 'string' &&
      typeof obj.emailId === 'string' &&
      typeof obj.threadId === 'string' &&
      typeof obj.subject === 'string' &&
      typeof obj.from === 'string' &&
      typeof obj.to === 'string' &&
      obj.receivedDate instanceof Date &&
      ['HIGH', 'MEDIUM', 'LOW'].includes(obj.priority) &&
      ['ACTIVE', 'SNOOZED', 'COMPLETED', 'ARCHIVED'].includes(obj.status)
    );
  }
}

/**
 * Convenience export
 */
export const queueTransformer = QueueTransformer;
