/**
 * OpenAI Service Type Definitions
 */

export interface OpenAIRequest {
  model: string;
  messages: OpenAIMessage[];
  temperature?: number;
  max_tokens?: number;
  response_format?: { type: 'json_object' | 'text' };
  functions?: OpenAIFunction[];
  function_call?: 'auto' | 'none' | { name: string };
}

export interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant' | 'function';
  content: string;
  name?: string;
  function_call?: {
    name: string;
    arguments: string;
  };
}

export interface OpenAIFunction {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface OpenAIResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: OpenAIChoice[];
  usage: OpenAIUsage;
}

export interface OpenAIChoice {
  index: number;
  message: OpenAIMessage;
  finish_reason: string;
}

export interface OpenAIUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface EmailClassificationRequest {
  subject: string;
  from: string;
  to: string;
  body: string;
  previousEmails?: string[];
  customRules?: string[];
}

export interface EmailClassificationResponse {
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  category: string;
  labels: string[];
  needsReply: boolean;
  waitingOnOthers: boolean;
  sentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' | 'URGENT';
  keyTopics: string[];
  suggestedActions: string[];
  confidence: number;
  reasoning: string;
}

export interface DraftGenerationRequest {
  originalEmail: {
    subject: string;
    from: string;
    body: string;
  };
  context?: {
    previousEmails?: string[];
    relationship?: 'COLLEAGUE' | 'CLIENT' | 'VENDOR' | 'PERSONAL' | 'UNKNOWN';
    tone?: 'FORMAL' | 'CASUAL' | 'FRIENDLY' | 'PROFESSIONAL';
  };
  instructions?: string;
}

export interface DraftGenerationResponse {
  subject: string;
  body: string;
  htmlBody?: string;
  confidence: number;
  alternativeResponses?: Array<{
    type: 'SHORT' | 'DETAILED' | 'APOLOGETIC' | 'ASSERTIVE';
    body: string;
  }>;
  suggestedSendTime?: string;
}

export interface SnoozeSuggestionRequest {
  email: {
    subject: string;
    from: string;
    body: string;
    receivedDate: Date;
  };
  userTimezone: string;
  workingHours?: {
    start: string;
    end: string;
    daysOfWeek: number[];
  };
}

export interface SnoozeSuggestionResponse {
  suggestedTime: Date;
  reasoning: string;
  alternativeTimes?: Date[];
  urgencyLevel: 'IMMEDIATE' | 'TODAY' | 'THIS_WEEK' | 'NEXT_WEEK' | 'LATER';
}

export interface SummarizationRequest {
  emails: Array<{
    subject: string;
    from: string;
    body: string;
    date: Date;
  }>;
  maxLength?: number;
  focusAreas?: string[];
}

export interface SummarizationResponse {
  summary: string;
  keyPoints: string[];
  actionItems: string[];
  decisions: string[];
  nextSteps: string[];
}

export interface RateLimitInfo {
  requestsPerMinute: number;
  requestsPerDay: number;
  tokensPerMinute: number;
  tokensPerDay: number;
  currentRequests: number;
  currentTokens: number;
  resetTime: Date;
}