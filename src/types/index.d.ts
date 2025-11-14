// Type definitions for GAS-PA
export interface Config {
  version: string;
  environment: 'development' | 'production';
  features: {
    emailProcessing: boolean;
    aiIntegration: boolean;
    calendarSync: boolean;
  };
  limits: {
    maxEmailsPerRun: number;
    maxApiCallsPerDay: number;
  };
}

export interface EmailData {
  id: string;
  threadId: string;
  from: string;
  to: string[];
  subject: string;
  body: string;
  date: Date;
  labels: string[];
  attachments?: Attachment[];
  processed?: boolean;
  metadata?: Record<string, any>;
}

export interface Attachment {
  name: string;
  mimeType: string;
  size: number;
  data?: GoogleAppsScript.Base.Blob;
}

export interface ProcessingResult {
  success: boolean;
  emailId: string;
  actions: string[];
  error?: string;
  timestamp: Date;
}

export interface UserPreferences {
  emailFilters: EmailFilter[];
  autoResponses: boolean;
  summaryFrequency: 'daily' | 'weekly' | 'never';
  priorityKeywords: string[];
}

export interface EmailFilter {
  name: string;
  condition: FilterCondition;
  action: FilterAction;
  enabled: boolean;
}

export type FilterCondition = {
  field: 'from' | 'to' | 'subject' | 'body';
  operator: 'contains' | 'equals' | 'startsWith' | 'endsWith';
  value: string;
};

export type FilterAction = {
  type: 'label' | 'forward' | 'archive' | 'star' | 'markImportant';
  value?: string;
};
