/**
 * Runtime Validation Schemas
 * Zod schemas for validating data at API boundaries
 */

import { z } from 'zod';
import {
  QueuePriority,
  QueueItemStatus,
  FollowUpReason,
  SLAStatus,
  EmailCategory
} from './shared-models';

/**
 * Primitive Validators
 */

// ISO 8601 datetime string
export const iso8601DateTimeSchema = z.string().datetime();

// ISO 8601 date string
export const iso8601DateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

// Email address
export const emailSchema = z.string().email();

// Non-empty string
export const nonEmptyStringSchema = z.string().min(1);

/**
 * Enum Validators
 */

export const queuePrioritySchema = z.enum(['high', 'medium', 'low']);

export const queueItemStatusSchema = z.enum(['pending', 'processing', 'completed', 'snoozed', 'archived']);

export const followUpReasonSchema = z.enum([
  'NEEDS_REPLY',
  'WAITING_ON_INFO',
  'REQUIRES_ACTION',
  'FOLLOW_UP_SCHEDULED',
  'DELEGATED',
  'CUSTOM'
]);

export const slaStatusSchema = z.enum(['ON_TIME', 'AT_RISK', 'OVERDUE']);

export const emailCategorySchema = z.enum([
  'work',
  'personal',
  'finance',
  'newsletter',
  'shopping',
  'travel',
  'support',
  'social',
  'general'
]);

/**
 * Dashboard Metrics Schema
 */
export const dashboardMetricsSchema = z.object({
  totalEmails: z.number().int().nonnegative(),
  processedToday: z.number().int().nonnegative(),
  pendingActions: z.number().int().nonnegative(),
  avgProcessingTime: z.number().nonnegative(),
  emailTrends: z.array(z.number()).length(7),
  processingTrends: z.array(z.number()).length(7),
  pendingTrends: z.array(z.number()).length(7),
  timeTrends: z.array(z.number()).length(7),
  lastUpdated: iso8601DateTimeSchema
});

/**
 * Queue Item Schema
 */
export const queueItemSchema = z.object({
  // Required fields
  id: nonEmptyStringSchema,
  emailId: nonEmptyStringSchema,
  threadId: nonEmptyStringSchema,
  subject: z.string(),
  from: emailSchema,
  to: z.string(),
  date: iso8601DateTimeSchema,
  priority: queuePrioritySchema,
  status: queueItemStatusSchema,
  labels: z.array(z.string()),

  // Optional fields
  category: z.string().optional(),
  reason: followUpReasonSchema.optional(),
  slaStatus: slaStatusSchema.optional(),
  dueDate: iso8601DateTimeSchema.optional(),
  snoozeUntil: iso8601DateTimeSchema.optional(),
  addedToQueueAt: iso8601DateTimeSchema.optional(),
  lastActionAt: iso8601DateTimeSchema.optional(),
  actionCount: z.number().int().nonnegative().optional(),
  snoozeCount: z.number().int().nonnegative().optional(),
  snippet: z.string().optional(),
  hasAttachments: z.boolean().optional(),
  attachmentCount: z.number().int().nonnegative().optional()
});

/**
 * Queue Item Create/Update Schema
 * Less strict for partial updates
 */
export const queueItemPartialSchema = queueItemSchema.partial();

export const queueItemCreateSchema = z.object({
  emailId: nonEmptyStringSchema,
  threadId: nonEmptyStringSchema,
  subject: z.string(),
  from: emailSchema,
  to: z.string(),
  date: iso8601DateTimeSchema.optional(),
  priority: queuePrioritySchema.optional(),
  status: queueItemStatusSchema.optional(),
  category: z.string().optional(),
  labels: z.array(z.string()).optional(),
  reason: followUpReasonSchema.optional()
});

/**
 * Queue List Response Schema
 */
export const queueListResponseSchema = z.object({
  items: z.array(queueItemSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive().max(100),
  hasMore: z.boolean()
});

/**
 * Queue Filter Schema
 */
export const queueFilterSchema = z.object({
  status: z.array(queueItemStatusSchema).optional(),
  priority: z.array(queuePrioritySchema).optional(),
  category: z.array(z.string()).optional(),
  slaStatus: z.array(slaStatusSchema).optional(),
  dateFrom: iso8601DateSchema.optional(),
  dateTo: iso8601DateSchema.optional(),
  search: z.string().optional(),
  labels: z.array(z.string()).optional(),
  hasAttachments: z.boolean().optional()
});

/**
 * Queue Sort Schema
 */
export const queueSortSchema = z.object({
  field: z.string(),
  direction: z.enum(['asc', 'desc'])
});

/**
 * Snooze Options Schema
 */
export const snoozeOptionsSchema = z.object({
  until: iso8601DateTimeSchema,
  reason: z.string().optional(),
  notifyBefore: z.number().int().positive().optional()
});

/**
 * Bulk Operation Request Schema
 */
export const bulkOperationRequestSchema = z.object({
  action: z.enum(['complete', 'archive', 'delete', 'snooze', 'change_priority', 'change_status']),
  itemIds: z.array(nonEmptyStringSchema).min(1),
  params: z.object({
    priority: queuePrioritySchema.optional(),
    status: queueItemStatusSchema.optional(),
    snoozeUntil: iso8601DateTimeSchema.optional()
  }).optional()
});

/**
 * Bulk Operation Response Schema
 */
export const bulkOperationResponseSchema = z.object({
  success: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
  errors: z.array(z.object({
    id: z.string(),
    error: z.string()
  }))
});

/**
 * Queue Statistics Schema
 */
export const queueStatisticsSchema = z.object({
  totalItems: z.number().int().nonnegative(),
  byStatus: z.record(z.number().int().nonnegative()),
  byPriority: z.record(z.number().int().nonnegative()),
  bySLA: z.record(z.number().int().nonnegative()),
  avgResponseTime: z.number().nonnegative(),
  oldestItem: iso8601DateTimeSchema.optional(),
  newestItem: iso8601DateTimeSchema.optional()
});

/**
 * User Preferences Schema
 */
export const userPreferencesSchema = z.object({
  email: emailSchema,
  timezone: z.string().optional(),
  notifyOnHighPriority: z.boolean().optional(),
  notifyOnSLABreach: z.boolean().optional(),
  dailySummaryEnabled: z.boolean().optional(),
  dailySummaryTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/).optional(), // HH:MM
  defaultPageSize: z.number().int().positive().max(100).optional(),
  defaultSort: queueSortSchema.optional(),
  compactView: z.boolean().optional(),
  autoArchiveCompleted: z.boolean().optional(),
  autoArchiveAfterDays: z.number().int().positive().optional(),
  slaHours: z.record(z.number().int().positive()).optional()
});

/**
 * System Configuration Schema
 */
export const systemConfigurationSchema = z.object({
  version: z.string(),
  environment: z.enum(['development', 'staging', 'production']),
  features: z.object({
    queueManagement: z.boolean(),
    autoProcessing: z.boolean(),
    slaTracking: z.boolean(),
    aiClassification: z.boolean()
  }),
  limits: z.object({
    maxEmailsPerRun: z.number().int().positive(),
    maxQueueSize: z.number().int().positive(),
    apiRateLimit: z.number().int().positive(),
    sessionTimeout: z.number().int().positive()
  }),
  integrations: z.object({
    openaiEnabled: z.boolean(),
    openaiModel: z.string().optional()
  })
});

/**
 * Processing Result Schema
 */
export const processingResultSchema = z.object({
  emailId: nonEmptyStringSchema,
  success: z.boolean(),
  category: z.string().optional(),
  priority: queuePrioritySchema.optional(),
  actionItems: z.array(z.string()).optional(),
  addedToQueue: z.boolean().optional(),
  queueItemId: z.string().optional(),
  error: z.string().optional(),
  processingTime: z.number().int().nonnegative().optional(),
  timestamp: iso8601DateTimeSchema
});

/**
 * Processing Request Schema
 */
export const processingRequestSchema = z.object({
  emailId: nonEmptyStringSchema,
  skipIfProcessed: z.boolean().optional(),
  forceReprocess: z.boolean().optional(),
  addToQueue: z.boolean().optional(),
  notifyOnComplete: z.boolean().optional()
});

/**
 * Batch Processing Request Schema
 */
export const batchProcessingRequestSchema = z.object({
  emailIds: z.array(nonEmptyStringSchema).min(1).max(100),
  options: z.object({
    skipIfProcessed: z.boolean().optional(),
    forceReprocess: z.boolean().optional(),
    addToQueue: z.boolean().optional(),
    notifyOnComplete: z.boolean().optional()
  }).optional()
});

/**
 * Processing Job Status Schema
 */
export const processingJobStatusSchema = z.object({
  jobId: nonEmptyStringSchema,
  status: z.enum(['queued', 'running', 'completed', 'failed', 'cancelled']),
  total: z.number().int().nonnegative(),
  processed: z.number().int().nonnegative(),
  successful: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
  errors: z.array(z.object({
    emailId: nonEmptyStringSchema,
    error: z.string()
  })).optional(),
  startTime: iso8601DateTimeSchema,
  endTime: iso8601DateTimeSchema.optional(),
  progress: z.number().int().min(0).max(100)
});

/**
 * Email Analysis Schema
 */
export const emailAnalysisSchema = z.object({
  emailId: nonEmptyStringSchema,
  category: z.string(),
  priority: queuePrioritySchema,
  actionItems: z.array(z.string()),
  sentiment: z.enum(['positive', 'neutral', 'negative']),
  entities: z.array(z.object({
    type: z.string(),
    value: z.string()
  })),
  requiresResponse: z.boolean(),
  isUrgent: z.boolean(),
  confidence: z.number().min(0).max(1),
  timestamp: iso8601DateTimeSchema
});

/**
 * Activity Log Entry Schema
 */
export const activityLogEntrySchema = z.object({
  id: nonEmptyStringSchema,
  queueItemId: nonEmptyStringSchema,
  action: z.enum(['created', 'updated', 'snoozed', 'completed', 'archived', 'deleted']),
  performedBy: emailSchema,
  timestamp: iso8601DateTimeSchema,
  changes: z.record(z.object({
    before: z.any(),
    after: z.any()
  })).optional(),
  comment: z.string().optional()
});

/**
 * Health Check Response Schema
 */
export const healthCheckResponseSchema = z.object({
  status: z.enum(['ok', 'degraded', 'error']),
  timestamp: iso8601DateTimeSchema,
  version: z.string(),
  uptime: z.number().int().nonnegative().optional(),
  services: z.object({
    gmail: z.enum(['ok', 'error']),
    sheets: z.enum(['ok', 'error']),
    cache: z.enum(['ok', 'error']),
    openai: z.enum(['ok', 'error']).optional()
  }).optional()
});

/**
 * Validation Helper Functions
 */

/**
 * Validate data against schema
 * Throws ValidationError if invalid
 */
export function validate<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);

  if (!result.success) {
    const errors = result.error.errors.map(err => ({
      path: err.path.join('.'),
      message: err.message,
      code: err.code
    }));

    throw new ValidationError(
      'Data validation failed',
      errors
    );
  }

  return result.data;
}

/**
 * Validate data and return result without throwing
 */
export function validateSafe<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: any[] } {
  const result = schema.safeParse(data);

  if (!result.success) {
    const errors = result.error.errors.map(err => ({
      path: err.path.join('.'),
      message: err.message,
      code: err.code
    }));

    return { success: false, errors };
  }

  return { success: true, data: result.data };
}

/**
 * Partial validation (allows undefined fields)
 */
export function validatePartial<T>(schema: z.ZodSchema<T>, data: unknown): Partial<T> {
  const partialSchema = schema.partial();
  return validate(partialSchema, data);
}

/**
 * Custom ValidationError class
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public errors?: any[]
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Coercion helpers for common transformations
 */

/**
 * Coerce Date to ISO string
 */
export function coerceDateToISO(date: Date | string): string {
  if (typeof date === 'string') {
    // Validate it's a valid ISO string
    return validate(iso8601DateTimeSchema, date);
  }
  return date.toISOString();
}

/**
 * Coerce ISO string to Date
 */
export function coerceISOToDate(iso: string): Date {
  const validated = validate(iso8601DateTimeSchema, iso);
  return new Date(validated);
}

/**
 * Clean undefined values from object
 */
export function cleanUndefined<T extends object>(obj: T): T {
  const cleaned: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      cleaned[key] = value;
    }
  }
  return cleaned;
}
