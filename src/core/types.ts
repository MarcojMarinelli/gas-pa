/**
 * Core type definitions for GAS-PA Phase 2
 */

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export type ConfigChangeCallback = (key: string, oldValue: any, newValue: any) => void;

export interface ConfigValue {
  value: any;
  type: 'string' | 'number' | 'boolean' | 'object';
  required: boolean;
  validator?: (value: any) => boolean;
  description?: string;
}

export interface ErrorCode {
  code: string;
  message: string;
  httpStatus?: number;
}

export interface CacheEntry<T> {
  value: T;
  timestamp: number;
  ttl?: number;
  hits: number;
}

export interface LogLevel {
  value: number;
  name: string;
}

export interface EmailClassification {
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  category: string;
  labels: string[];
  confidence: number;
  needsReply: boolean;
  waitingOnOthers: boolean;
  suggestedSnoozeTime?: Date;
  suggestedDraft?: string;
}

export interface FollowUpItem {
  id: string;
  emailId: string;
  threadId: string;
  subject: string;
  from: string;
  priority: string;
  dueDate: Date;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'SNOOZED';
  slaDeadline?: Date;
  notes?: string;
}

export interface VIPContact {
  email: string;
  name: string;
  tier: 1 | 2 | 3; // 1 = highest priority
  autoDraft: boolean;
  customRules?: string[];
  slaHours: number;
}

export interface ProcessingRule {
  id: string;
  name: string;
  precedence: number;
  conditions: RuleCondition[];
  actions: RuleAction[];
  enabled: boolean;
  confidence?: number;
  lastUsed?: Date;
}

export interface RuleCondition {
  field: 'from' | 'to' | 'subject' | 'body' | 'label' | 'attachment';
  operator: 'contains' | 'equals' | 'regex' | 'startsWith' | 'endsWith';
  value: string;
  caseSensitive?: boolean;
}

export interface RuleAction {
  type: 'label' | 'archive' | 'star' | 'forward' | 'draft' | 'snooze';
  value?: string;
  parameters?: Record<string, any>;
}

export interface MetricData {
  timestamp: Date;
  metric: string;
  value: number;
  tags?: Record<string, string>;
}

export interface UserFeedback {
  emailId: string;
  feedbackType: 'CORRECT' | 'WRONG_CATEGORY' | 'WRONG_PRIORITY' | 'MISSING_ACTION';
  correctValue?: string;
  timestamp: Date;
}

export interface OpenAIConfig {
  apiKey: string;
  model: string;
  maxTokens: number;
  temperature: number;
  timeout: number;
}

export interface EmailContext {
  email: GoogleAppsScript.Gmail.GmailMessage;
  thread: GoogleAppsScript.Gmail.GmailThread;
  previousEmails?: GoogleAppsScript.Gmail.GmailMessage[];
  vipStatus?: VIPContact;
  classification?: EmailClassification;
}

export interface DraftReply {
  subject: string;
  body: string;
  htmlBody?: string;
  confidence: number;
  suggestedSendTime?: Date;
}

export interface SLAConfig {
  highPriorityHours: number;
  mediumPriorityHours: number;
  lowPriorityHours: number;
  vipTier1Hours: number;
  vipTier2Hours: number;
  vipTier3Hours: number;
}

export interface QueueStatistics {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  overdue: number;
  avgResponseTime: number;
}

export interface LearningMetrics {
  totalClassifications: number;
  correctClassifications: number;
  accuracy: number;
  lastTrainingDate: Date;
  modelVersion: string;
}