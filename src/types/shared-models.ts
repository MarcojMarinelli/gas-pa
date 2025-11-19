/**
 * Shared Data Models
 * Type definitions shared between frontend and backend
 *
 * IMPORTANT: All dates are ISO 8601 strings (not Date objects)
 * This ensures proper JSON serialization across GAS boundary
 */

/**
 * Dashboard Metrics
 * Real-time statistics for the dashboard
 */
export interface DashboardMetrics {
  // Current counts
  totalEmails: number;
  processedToday: number;
  pendingActions: number;
  avgProcessingTime: number; // in seconds

  // 7-day trends (arrays of 7 numbers, oldest to newest)
  emailTrends: number[];
  processingTrends: number[];
  pendingTrends: number[];
  timeTrends: number[];

  // Metadata
  lastUpdated: string; // ISO 8601 datetime
}

/**
 * Queue Item
 * Represents an email in the follow-up queue
 */
export interface QueueItem {
  // Identifiers
  id: string;
  emailId: string;
  threadId: string;

  // Email metadata
  subject: string;
  from: string;
  to: string;
  date: string; // ISO 8601 datetime

  // Classification
  priority: QueuePriority;
  status: QueueItemStatus;
  category?: string;
  labels: string[];

  // Follow-up details
  reason?: FollowUpReason;
  slaStatus?: SLAStatus;
  dueDate?: string; // ISO 8601 datetime
  snoozeUntil?: string; // ISO 8601 datetime

  // Metadata
  addedToQueueAt?: string; // ISO 8601 datetime
  lastActionAt?: string; // ISO 8601 datetime
  actionCount?: number;
  snoozeCount?: number;

  // Optional enrichment
  snippet?: string; // Email preview
  hasAttachments?: boolean;
  attachmentCount?: number;
}

/**
 * Queue Item Priority Levels
 */
export type QueuePriority = 'high' | 'medium' | 'low';

/**
 * Queue Item Status
 */
export type QueueItemStatus = 'pending' | 'processing' | 'completed' | 'snoozed' | 'archived';

/**
 * Follow-up Reason Codes
 */
export type FollowUpReason =
  | 'NEEDS_REPLY'
  | 'WAITING_ON_INFO'
  | 'REQUIRES_ACTION'
  | 'FOLLOW_UP_SCHEDULED'
  | 'DELEGATED'
  | 'CUSTOM';

/**
 * SLA Status
 */
export type SLAStatus = 'ON_TIME' | 'AT_RISK' | 'OVERDUE';

/**
 * Queue List Response
 * Paginated list of queue items
 */
export interface QueueListResponse {
  items: QueueItem[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

/**
 * Queue Filter Options
 * For filtering queue items
 */
export interface QueueFilter {
  status?: QueueItemStatus[];
  priority?: QueuePriority[];
  category?: string[];
  slaStatus?: SLAStatus[];
  dateFrom?: string; // ISO 8601 date
  dateTo?: string; // ISO 8601 date
  search?: string; // Text search in subject/from
  labels?: string[]; // Filter by labels
  hasAttachments?: boolean;
}

/**
 * Queue Sort Options
 */
export interface QueueSort {
  field: keyof QueueItem;
  direction: 'asc' | 'desc';
}

/**
 * Queue Statistics
 * Aggregate statistics for the queue
 */
export interface QueueStatistics {
  totalItems: number;
  byStatus: Record<QueueItemStatus, number>;
  byPriority: Record<QueuePriority, number>;
  bySLA: Record<SLAStatus, number>;
  avgResponseTime: number; // in hours
  oldestItem?: string; // ISO 8601 datetime
  newestItem?: string; // ISO 8601 datetime
}

/**
 * Snooze Options
 */
export interface SnoozeOptions {
  until: string; // ISO 8601 datetime
  reason?: string;
  notifyBefore?: number; // minutes before snooze expires
}

/**
 * Bulk Operation Request
 */
export interface BulkOperationRequest {
  action: 'complete' | 'archive' | 'delete' | 'snooze' | 'change_priority' | 'change_status';
  itemIds: string[];
  params?: {
    priority?: QueuePriority;
    status?: QueueItemStatus;
    snoozeUntil?: string; // ISO 8601 datetime
  };
}

/**
 * Bulk Operation Response
 */
export interface BulkOperationResponse {
  success: number;
  failed: number;
  errors: Array<{
    id: string;
    error: string;
  }>;
}

/**
 * Email Category
 * Predefined email categories
 */
export type EmailCategory =
  | 'work'
  | 'personal'
  | 'finance'
  | 'newsletter'
  | 'shopping'
  | 'travel'
  | 'support'
  | 'social'
  | 'general';

/**
 * User Preferences
 */
export interface UserPreferences {
  email: string;
  timezone?: string;

  // Notification preferences
  notifyOnHighPriority?: boolean;
  notifyOnSLABreach?: boolean;
  dailySummaryEnabled?: boolean;
  dailySummaryTime?: string; // HH:MM format

  // Display preferences
  defaultPageSize?: number;
  defaultSort?: QueueSort;
  compactView?: boolean;

  // Processing preferences
  autoArchiveCompleted?: boolean;
  autoArchiveAfterDays?: number;
  slaHours?: Record<QueuePriority, number>;
}

/**
 * Processing Result
 * Result of processing an email
 */
export interface ProcessingResult {
  emailId: string;
  success: boolean;
  category?: string;
  priority?: QueuePriority;
  actionItems?: string[];
  addedToQueue?: boolean;
  queueItemId?: string;
  error?: string;
  processingTime?: number; // milliseconds
  timestamp: string; // ISO 8601 datetime
}

/**
 * Batch Processing Result
 * Result of batch processing multiple emails
 */
export interface BatchProcessingResult {
  jobId: string;
  message: string;
  emailCount: number;
}

/**
 * Processing Job Status
 * Status of a batch processing job
 */
export interface ProcessingJobStatus {
  jobId: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  total: number;
  processed: number;
  successful: number;
  failed: number;
  errors?: Array<{
    emailId: string;
    error: string;
  }>;
  startTime: string; // ISO 8601 datetime
  endTime?: string; // ISO 8601 datetime
  progress: number; // 0-100
}

/**
 * Email Analysis
 * Detailed analysis of an email
 */
export interface EmailAnalysis {
  emailId: string;
  category: string;
  priority: QueuePriority;
  actionItems: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
  entities: Array<{
    type: string; // 'person', 'organization', 'date', 'location', 'amount', etc.
    value: string;
  }>;
  requiresResponse: boolean;
  isUrgent: boolean;
  confidence: number; // 0-1
  timestamp: string; // ISO 8601 datetime
}

/**
 * Dashboard Filter Options
 * For filtering dashboard data
 */
export interface DashboardFilter {
  dateRange?: {
    from: string; // ISO 8601 date
    to: string; // ISO 8601 date
  };
  categories?: EmailCategory[];
  includeArchived?: boolean;
}

/**
 * Activity Log Entry
 * Audit trail for queue item actions
 */
export interface ActivityLogEntry {
  id: string;
  queueItemId: string;
  action: 'created' | 'updated' | 'snoozed' | 'completed' | 'archived' | 'deleted';
  performedBy: string; // user email
  timestamp: string; // ISO 8601 datetime
  changes?: Record<string, { before: any; after: any }>;
  comment?: string;
}

/**
 * System Configuration
 * System-wide settings
 */
export interface SystemConfiguration {
  version: string;
  environment: 'development' | 'staging' | 'production';

  // Feature flags
  features: {
    queueManagement: boolean;
    autoProcessing: boolean;
    slaTracking: boolean;
    aiClassification: boolean;
  };

  // Limits
  limits: {
    maxEmailsPerRun: number;
    maxQueueSize: number;
    apiRateLimit: number;
    sessionTimeout: number; // seconds
  };

  // Integration
  integrations: {
    openaiEnabled: boolean;
    openaiModel?: string;
  };
}

/**
 * Health Check Response
 * System health status
 */
export interface HealthCheckResponse {
  status: 'ok' | 'degraded' | 'error';
  timestamp: string; // ISO 8601 datetime
  version: string;
  uptime?: number; // milliseconds
  services?: {
    gmail: 'ok' | 'error';
    sheets: 'ok' | 'error';
    cache: 'ok' | 'error';
    openai?: 'ok' | 'error';
  };
}

/**
 * Type Guards
 * Runtime type checking helpers
 */

export function isQueueItem(obj: any): obj is QueueItem {
  return (
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    typeof obj.emailId === 'string' &&
    typeof obj.threadId === 'string' &&
    typeof obj.subject === 'string' &&
    typeof obj.from === 'string' &&
    typeof obj.to === 'string' &&
    typeof obj.date === 'string' &&
    ['high', 'medium', 'low'].includes(obj.priority) &&
    ['pending', 'processing', 'completed', 'snoozed', 'archived'].includes(obj.status) &&
    Array.isArray(obj.labels)
  );
}

export function isDashboardMetrics(obj: any): obj is DashboardMetrics {
  return (
    typeof obj === 'object' &&
    typeof obj.totalEmails === 'number' &&
    typeof obj.processedToday === 'number' &&
    typeof obj.pendingActions === 'number' &&
    typeof obj.avgProcessingTime === 'number' &&
    Array.isArray(obj.emailTrends) &&
    obj.emailTrends.length === 7 &&
    Array.isArray(obj.processingTrends) &&
    obj.processingTrends.length === 7 &&
    Array.isArray(obj.pendingTrends) &&
    obj.pendingTrends.length === 7 &&
    Array.isArray(obj.timeTrends) &&
    obj.timeTrends.length === 7 &&
    typeof obj.lastUpdated === 'string'
  );
}

/**
 * Constants
 */

export const QUEUE_PRIORITIES: QueuePriority[] = ['high', 'medium', 'low'];
export const QUEUE_STATUSES: QueueItemStatus[] = ['pending', 'processing', 'completed', 'snoozed', 'archived'];
export const SLA_STATUSES: SLAStatus[] = ['ON_TIME', 'AT_RISK', 'OVERDUE'];
export const FOLLOW_UP_REASONS: FollowUpReason[] = [
  'NEEDS_REPLY',
  'WAITING_ON_INFO',
  'REQUIRES_ACTION',
  'FOLLOW_UP_SCHEDULED',
  'DELEGATED',
  'CUSTOM'
];
export const EMAIL_CATEGORIES: EmailCategory[] = [
  'work',
  'personal',
  'finance',
  'newsletter',
  'shopping',
  'travel',
  'support',
  'social',
  'general'
];

/**
 * Default Values
 */

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
export const DEFAULT_QUEUE_SORT: QueueSort = {
  field: 'date',
  direction: 'desc'
};
export const DEFAULT_SLA_HOURS: Record<QueuePriority, number> = {
  high: 4,
  medium: 24,
  low: 72
};
