/**
 * Classification Engine Type Definitions
 */

import { EmailClassificationResponse } from '../../services/openai/types';
import { ProcessingRule, VIPContact } from '../../core/types';

export interface ClassificationConfig {
  useAI: boolean;
  useRules: boolean;
  confidenceThreshold: number;
  autoActionThreshold: number;
  learningEnabled: boolean;
  vipOverride: boolean;
}

export interface ClassificationResult {
  // Core classification
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  category: string;
  labels: string[];

  // Status indicators
  needsReply: boolean;
  waitingOnOthers: boolean;
  isRecurring: boolean;
  isNewsletter: boolean;
  isAutomated: boolean;

  // Advanced classification
  sentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' | 'URGENT' | 'ANGRY';
  importance: number; // 0-100
  urgency: number; // 0-100

  // Actions and suggestions
  suggestedActions: ClassificationAction[];
  suggestedSnoozeTime?: Date;
  suggestedDraft?: string;

  // Metadata
  confidence: number;
  method: 'AI' | 'RULES' | 'HYBRID' | 'VIP' | 'MANUAL';
  reasoning: string;
  appliedRules: string[];

  // VIP handling
  isVIP: boolean;
  vipTier?: 1 | 2 | 3;
  vipSLA?: Date;

  // Learning data
  feedbackRequired: boolean;
  learningOpportunity: boolean;
}

export interface ClassificationAction {
  type: 'LABEL' | 'ARCHIVE' | 'STAR' | 'FORWARD' | 'DRAFT' | 'SNOOZE' | 'DELETE' | 'TASK';
  value?: string;
  parameters?: Record<string, any>;
  confidence: number;
  autoExecute: boolean;
}

export interface EmailContext {
  email: {
    id: string;
    threadId: string;
    subject: string;
    from: string;
    to: string[];
    cc?: string[];
    date: Date;
    body: string;
    hasAttachments: boolean;
    attachmentTypes?: string[];
  };
  thread?: {
    messageCount: number;
    participants: string[];
    lastReplyFrom: string;
    hasUserReplied: boolean;
  };
  previousClassifications?: ClassificationResult[];
  userFeedback?: ClassificationFeedback[];
}

export interface ClassificationFeedback {
  emailId: string;
  timestamp: Date;
  feedbackType: 'CORRECT' | 'WRONG_PRIORITY' | 'WRONG_CATEGORY' | 'WRONG_LABELS' | 'MISSING_ACTION';
  correctValue?: any;
  userAction?: string;
}

export interface RuleMatch {
  rule: ProcessingRule;
  matches: boolean;
  confidence: number;
  matchedConditions: string[];
}

export interface LearningData {
  emailId: string;
  originalClassification: ClassificationResult;
  userFeedback?: ClassificationFeedback;
  userActions: string[];
  outcome: 'SUCCESS' | 'CORRECTED' | 'IGNORED';
  timestamp: Date;
}

export interface ClassificationStats {
  totalClassified: number;
  byPriority: Record<string, number>;
  byCategory: Record<string, number>;
  byMethod: Record<string, number>;
  accuracy: number;
  avgConfidence: number;
  topRules: Array<{ ruleId: string; hitCount: number }>;
}

export interface PriorityFactors {
  senderImportance: number;
  keywordUrgency: number;
  deadlineProximity: number;
  vipStatus: number;
  historicalResponse: number;
  sentimentUrgency: number;
  contextualClues: number;
}

export interface CategoryHints {
  keywords: string[];
  senderPatterns: string[];
  subjectPatterns: RegExp[];
  bodyPatterns: RegExp[];
  weight: number;
}

export interface ClassificationModel {
  version: string;
  created: Date;
  updated: Date;
  rules: ProcessingRule[];
  categoryHints: Map<string, CategoryHints>;
  priorityWeights: PriorityFactors;
  accuracy: number;
  totalTrainingExamples: number;
}