/**
 * Follow-up Queue System - Type Definitions
 *
 * Comprehensive types for queue management, snooze operations,
 * SLA tracking, and "waiting on others" detection.
 */

/**
 * Reason why an item is in the follow-up queue
 */
export enum FollowUpReason {
  NEEDS_REPLY = 'NEEDS_REPLY',                     // Requires user response
  WAITING_ON_OTHERS = 'WAITING_ON_OTHERS',         // Waiting for someone else
  DEADLINE_APPROACHING = 'DEADLINE_APPROACHING',    // Has upcoming deadline
  VIP_REQUIRES_ATTENTION = 'VIP_REQUIRES_ATTENTION', // VIP email
  MANUAL_FOLLOW_UP = 'MANUAL_FOLLOW_UP',           // User manually added
  SLA_AT_RISK = 'SLA_AT_RISK',                     // SLA deadline approaching
  PERIODIC_CHECK = 'PERIODIC_CHECK'                 // Needs periodic review
}

/**
 * Current status of a queue item
 */
export enum QueueItemStatus {
  ACTIVE = 'ACTIVE',           // In queue, ready for action
  SNOOZED = 'SNOOZED',        // Temporarily hidden until snooze time
  WAITING = 'WAITING',         // Waiting on others
  COMPLETED = 'COMPLETED',     // User marked as done
  ARCHIVED = 'ARCHIVED',       // Auto-archived after completion
  ESCALATED = 'ESCALATED'      // Escalated to higher priority
}

/**
 * SLA compliance status
 */
export type SLAStatus = 'ON_TIME' | 'AT_RISK' | 'OVERDUE';

/**
 * Priority level for queue items
 */
export type QueuePriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

/**
 * Core follow-up queue item
 * Represents an email that requires follow-up action
 */
export interface FollowUpItem {
  // Identifiers
  id: string;                    // Unique identifier
  emailId: string;               // Gmail message ID
  threadId: string;              // Gmail thread ID

  // Email metadata
  subject: string;
  from: string;
  to: string;
  receivedDate: Date;

  // Classification data
  priority: QueuePriority;
  category: string;
  labels: string[];

  // Follow-up tracking
  reason: FollowUpReason;        // Why it's in the queue
  status: QueueItemStatus;       // Current state
  addedToQueueAt: Date;          // When added
  snoozedUntil?: Date;          // When to resurface
  lastActionDate?: Date;         // Last user action

  // SLA tracking (for VIPs and critical items)
  slaDeadline?: Date;           // When response is due
  slaStatus: SLAStatus;         // Compliance status
  timeRemaining?: number;        // Hours until deadline

  // Waiting tracking
  waitingOnEmail?: string;       // Email we're waiting on
  waitingReason?: string;        // Why we're waiting
  originalSentDate?: Date;       // When we sent original email

  // AI suggestions
  suggestedSnoozeTime?: Date;    // AI-recommended follow-up time
  suggestedActions?: string[];   // AI-recommended next steps
  aiReasoning?: string;          // Why AI suggests these actions

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  actionCount: number;           // Number of user interactions
  snoozeCount: number;           // Times user snoozed
}

/**
 * Options for snoozing a queue item
 */
export interface SnoozeOptions {
  until: Date;                   // When to resurface
  reason?: string;               // User-provided reason
  smart?: boolean;               // Whether AI suggested this time
  aiReasoning?: string;          // AI explanation
}

/**
 * Request for AI-powered smart snooze suggestion
 */
export interface SmartSnoozeRequest {
  emailContext: {
    subject: string;
    body: string;
    from: string;
    priority: string;
    category: string;
  };
  userPreferences?: {
    workingHours?: { start: number; end: number };
    timezone?: string;
    preferredDays?: string[];
  };
}

/**
 * AI-generated smart snooze suggestion
 */
export interface SmartSnoozeResponse {
  suggestedTime: Date;
  reasoning: string;
  alternatives: Array<{
    time: Date;
    reason: string;
  }>;
  confidence: number;
}

/**
 * Quick snooze preset option
 */
export interface QuickSnoozeOption {
  label: string;                 // Display label (e.g., "Later today")
  time: Date;                    // Calculated time
  reason: string;                // Description
}

/**
 * Statistics for the follow-up queue
 */
export interface QueueStatistics {
  // Queue metrics
  totalActive: number;
  totalSnoozed: number;
  totalWaiting: number;
  totalCompleted: number;

  // Priority breakdown
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;

  // SLA metrics
  onTimeCount: number;
  atRiskCount: number;
  overdueCount: number;
  averageResponseTime: number;   // hours

  // Performance metrics
  completedToday: number;
  completedThisWeek: number;
  averageTimeInQueue: number;    // hours

  // Waiting metrics
  waitingOnOthersCount: number;
  averageWaitTime: number;       // hours

  // Snooze metrics
  snoozedCount: number;
  averageSnoozeTime: number;     // hours

  // Timestamp
  lastUpdated: Date;
}

/**
 * Query options for retrieving queue items
 */
export interface QueueQueryOptions {
  // Filtering
  status?: QueueItemStatus | QueueItemStatus[];
  priority?: QueuePriority | QueuePriority[];
  reason?: FollowUpReason | FollowUpReason[];
  slaStatus?: SLAStatus | SLAStatus[];
  category?: string;

  // Date filters
  addedAfter?: Date;
  addedBefore?: Date;
  slaDeadlineBefore?: Date;
  snoozedUntilBefore?: Date;

  // Sorting
  sortBy?: keyof FollowUpItem;
  sortOrder?: 'asc' | 'desc';

  // Pagination
  limit?: number;
  offset?: number;

  // Include completed/archived
  includeCompleted?: boolean;
  includeArchived?: boolean;
}

/**
 * History entry for queue item changes
 */
export interface QueueHistoryEntry {
  id: string;
  queueItemId: string;
  action: QueueAction;
  oldStatus?: QueueItemStatus;
  newStatus?: QueueItemStatus;
  oldPriority?: QueuePriority;
  newPriority?: QueuePriority;
  userId?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

/**
 * Actions that can be performed on queue items
 */
export enum QueueAction {
  ADDED = 'ADDED',
  UPDATED = 'UPDATED',
  SNOOZED = 'SNOOZED',
  RESURFACED = 'RESURFACED',
  COMPLETED = 'COMPLETED',
  ARCHIVED = 'ARCHIVED',
  ESCALATED = 'ESCALATED',
  MARKED_WAITING = 'MARKED_WAITING',
  REPLY_RECEIVED = 'REPLY_RECEIVED',
  PRIORITY_CHANGED = 'PRIORITY_CHANGED',
  MANUALLY_EDITED = 'MANUALLY_EDITED'
}

/**
 * Bulk operation result
 */
export interface BulkOperationResult {
  successful: string[];          // IDs that succeeded
  failed: Array<{
    id: string;
    error: string;
  }>;
  totalProcessed: number;
}

/**
 * SLA configuration for different priority levels
 */
export interface SLAConfig {
  critical: number;              // Hours for CRITICAL priority
  high: number;                  // Hours for HIGH priority
  medium: number;                // Hours for MEDIUM priority
  low: number;                   // Hours for LOW priority
  adjustForWeekends: boolean;    // Whether to adjust deadlines for weekends
  workingHours?: {
    start: number;               // Start hour (0-23)
    end: number;                 // End hour (0-23)
  };
}

/**
 * Options for auto-adding items from inbox
 */
export interface AutoAddOptions {
  query?: string;                // Gmail search query
  maxResults?: number;           // Max emails to process
  onlyUnprocessed?: boolean;     // Skip already processed emails
  minPriority?: QueuePriority;   // Minimum priority to add
}

/**
 * Result of auto-add operation
 */
export interface AutoAddResult {
  added: number;
  skipped: number;
  errors: number;
  items: FollowUpItem[];
}
