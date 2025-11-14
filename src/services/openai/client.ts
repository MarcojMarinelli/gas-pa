/**
 * OpenAI Client Service with Rate Limiting and Circuit Breaker
 */

import ConfigManager from '../../core/config-manager';
import LoggerService from '../../core/logger-service';
import ErrorHandler, { GaspaError, ErrorType } from '../../core/error-handler';
import CacheManager from '../../core/cache-manager';
import { PromptTemplates, PromptOptimizer } from './prompts';
import {
  OpenAIRequest,
  OpenAIResponse,
  EmailClassificationRequest,
  EmailClassificationResponse,
  DraftGenerationRequest,
  DraftGenerationResponse,
  SnoozeSuggestionRequest,
  SnoozeSuggestionResponse,
  SummarizationRequest,
  SummarizationResponse,
  RateLimitInfo
} from './types';

class RateLimiter {
  private requests: number[] = [];
  private tokens: number[] = [];
  private readonly MINUTE = 60 * 1000;
  private readonly DAY = 24 * 60 * 60 * 1000;

  constructor(
    private requestsPerMinute: number,
    private requestsPerDay: number,
    private tokensPerMinute: number,
    private tokensPerDay: number
  ) {}

  canMakeRequest(estimatedTokens: number = 0): boolean {
    const now = Date.now();

    // Clean old entries
    this.requests = this.requests.filter(t => now - t < this.DAY);
    this.tokens = this.tokens.filter(t => now - t < this.DAY);

    // Check rate limits
    const recentRequests = this.requests.filter(t => now - t < this.MINUTE);
    const recentTokens = this.tokens.filter(t => now - t < this.MINUTE);

    if (recentRequests.length >= this.requestsPerMinute) {
      return false;
    }

    if (recentTokens.length + estimatedTokens > this.tokensPerMinute) {
      return false;
    }

    const dailyRequests = this.requests.length;
    const dailyTokens = this.tokens.length;

    if (dailyRequests >= this.requestsPerDay) {
      return false;
    }

    if (dailyTokens + estimatedTokens > this.tokensPerDay) {
      return false;
    }

    return true;
  }

  recordRequest(tokens: number): void {
    const now = Date.now();
    this.requests.push(now);
    for (let i = 0; i < tokens; i++) {
      this.tokens.push(now);
    }
  }

  getInfo(): RateLimitInfo {
    const now = Date.now();
    const recentRequests = this.requests.filter(t => now - t < this.MINUTE);
    const recentTokens = this.tokens.filter(t => now - t < this.MINUTE);

    return {
      requestsPerMinute: this.requestsPerMinute,
      requestsPerDay: this.requestsPerDay,
      tokensPerMinute: this.tokensPerMinute,
      tokensPerDay: this.tokensPerDay,
      currentRequests: recentRequests.length,
      currentTokens: recentTokens.length,
      resetTime: new Date(now + this.MINUTE)
    };
  }

  async waitForAvailability(estimatedTokens: number = 0): Promise<void> {
    let attempts = 0;
    const maxAttempts = 10;

    while (!this.canMakeRequest(estimatedTokens) && attempts < maxAttempts) {
      const waitTime = Math.min(2000 * Math.pow(2, attempts), 30000);
      LoggerService.debug('OpenAI', `Rate limited, waiting ${waitTime}ms`);
      Utilities.sleep(waitTime);
      attempts++;
    }

    if (attempts >= maxAttempts) {
      throw new GaspaError(
        'Rate limit exceeded after maximum wait',
        ErrorType.QUOTA,
        false
      );
    }
  }
}

export class OpenAIClient {
  private static instance: OpenAIClient;
  private apiKey: string | null;
  private baseUrl = 'https://api.openai.com/v1';
  private rateLimiter: RateLimiter;
  private model: string;
  private maxRetries = 3;
  private timeout = 30000;

  private constructor() {
    this.apiKey = ConfigManager.get<string>('OPENAI_API_KEY');
    this.model = ConfigManager.getWithDefault<string>('OPENAI_MODEL', 'gpt-4-turbo-preview');

    // Initialize rate limiter with default limits
    this.rateLimiter = new RateLimiter(
      60,      // requests per minute
      10000,   // requests per day
      150000,  // tokens per minute
      2000000  // tokens per day
    );

    // Subscribe to config changes
    ConfigManager.subscribe((key, oldValue, newValue) => {
      if (key === 'OPENAI_API_KEY') {
        this.apiKey = newValue;
      } else if (key === 'OPENAI_MODEL') {
        this.model = newValue;
      }
    });
  }

  static getInstance(): OpenAIClient {
    if (!OpenAIClient.instance) {
      OpenAIClient.instance = new OpenAIClient();
    }
    return OpenAIClient.instance;
  }

  private validateApiKey(): void {
    if (!this.apiKey || this.apiKey.trim() === '') {
      throw new GaspaError(
        'OpenAI API key not configured',
        ErrorType.CONFIGURATION,
        false,
        { setting: 'OPENAI_API_KEY' }
      );
    }
  }

  private async makeRequest(request: OpenAIRequest): Promise<OpenAIResponse> {
    this.validateApiKey();

    const timer = LoggerService.startTimer('OpenAI.request');

    // Estimate tokens (rough approximation)
    const estimatedTokens = JSON.stringify(request).length / 4;

    // Check rate limit
    await this.rateLimiter.waitForAvailability(estimatedTokens);

    try {
      const response = UrlFetchApp.fetch(`${this.baseUrl}/chat/completions`, {
        method: 'post',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        payload: JSON.stringify(request),
        muteHttpExceptions: true
      });

      const responseCode = response.getResponseCode();
      const responseText = response.getContentText();

      if (responseCode !== 200) {
        LoggerService.error('OpenAI', `API error: ${responseCode}`, null, {
          response: responseText
        });

        if (responseCode === 429) {
          throw new GaspaError('OpenAI rate limit exceeded', ErrorType.QUOTA, true);
        } else if (responseCode === 401) {
          throw new GaspaError('Invalid OpenAI API key', ErrorType.PERMISSION, false);
        } else if (responseCode >= 500) {
          throw new GaspaError('OpenAI service error', ErrorType.API, true);
        } else {
          throw new GaspaError(`OpenAI API error: ${responseCode}`, ErrorType.API, false);
        }
      }

      const result: OpenAIResponse = JSON.parse(responseText);

      // Record usage
      if (result.usage) {
        this.rateLimiter.recordRequest(result.usage.total_tokens);
        LoggerService.trackMetric('openai.tokens.used', result.usage.total_tokens);
      }

      timer();
      return result;

    } catch (error) {
      timer();
      throw new GaspaError(
        'Failed to call OpenAI API',
        ErrorType.API,
        true,
        { model: this.model },
        error as Error
      );
    }
  }

  async classifyEmail(request: EmailClassificationRequest): Promise<EmailClassificationResponse> {
    const cacheKey = `email_classification_${this.hashRequest(request)}`;

    // Check cache
    const cached = await CacheManager.get<EmailClassificationResponse>(cacheKey);
    if (cached) {
      LoggerService.debug('OpenAI', 'Using cached classification');
      return cached;
    }

    const prompt = PromptTemplates.getClassificationPrompt(request);
    const optimizedPrompt = PromptOptimizer.optimizeForModel(prompt, this.model);

    const apiRequest: OpenAIRequest = {
      model: this.model,
      messages: [
        { role: 'system', content: PromptTemplates.getSystemPrompt() },
        { role: 'user', content: optimizedPrompt }
      ],
      temperature: 0.3,
      max_tokens: 500,
      response_format: { type: 'json_object' }
    };

    const response = await ErrorHandler.handle(
      () => this.makeRequest(apiRequest),
      { operation: 'classifyEmail' },
      { type: 'RETRY', maxAttempts: 2, backoffMs: 2000 }
    );

    if (!response || !response.choices[0]) {
      throw new GaspaError('Invalid OpenAI response', ErrorType.API, false);
    }

    const result = JSON.parse(response.choices[0].message.content) as EmailClassificationResponse;

    // Validate and ensure all required fields
    const validatedResult: EmailClassificationResponse = {
      priority: result.priority || 'MEDIUM',
      category: result.category || 'other',
      labels: result.labels || [],
      needsReply: result.needsReply || false,
      waitingOnOthers: result.waitingOnOthers || false,
      sentiment: result.sentiment || 'NEUTRAL',
      keyTopics: result.keyTopics || [],
      suggestedActions: result.suggestedActions || [],
      confidence: result.confidence || 0.5,
      reasoning: result.reasoning || ''
    };

    // Cache for 1 hour
    await CacheManager.set(cacheKey, validatedResult, 3600);

    LoggerService.info('OpenAI', 'Email classified', {
      priority: validatedResult.priority,
      confidence: validatedResult.confidence
    });

    return validatedResult;
  }

  async generateDraft(request: DraftGenerationRequest): Promise<DraftGenerationResponse> {
    const prompt = PromptTemplates.getDraftGenerationPrompt(request);
    const optimizedPrompt = PromptOptimizer.optimizeForModel(prompt, this.model);

    const apiRequest: OpenAIRequest = {
      model: this.model,
      messages: [
        { role: 'system', content: PromptTemplates.getSystemPrompt() },
        { role: 'user', content: optimizedPrompt }
      ],
      temperature: 0.7,
      max_tokens: 1000,
      response_format: { type: 'json_object' }
    };

    const response = await ErrorHandler.handle(
      () => this.makeRequest(apiRequest),
      { operation: 'generateDraft' },
      { type: 'RETRY', maxAttempts: 2, backoffMs: 2000 }
    );

    if (!response || !response.choices[0]) {
      throw new GaspaError('Invalid OpenAI response', ErrorType.API, false);
    }

    const result = JSON.parse(response.choices[0].message.content) as DraftGenerationResponse;

    // Generate HTML body if not provided
    if (!result.htmlBody && result.body) {
      result.htmlBody = this.plainTextToHtml(result.body);
    }

    LoggerService.info('OpenAI', 'Draft generated', {
      confidence: result.confidence,
      hasAlternatives: (result.alternativeResponses?.length || 0) > 0
    });

    return result;
  }

  async suggestSnoozeTime(request: SnoozeSuggestionRequest): Promise<SnoozeSuggestionResponse> {
    const prompt = PromptTemplates.getSnoozeSuggestionPrompt(request);

    const apiRequest: OpenAIRequest = {
      model: this.model,
      messages: [
        { role: 'system', content: PromptTemplates.getSystemPrompt() },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 300,
      response_format: { type: 'json_object' }
    };

    const response = await ErrorHandler.handle(
      () => this.makeRequest(apiRequest),
      { operation: 'suggestSnoozeTime' }
    );

    if (!response || !response.choices[0]) {
      throw new GaspaError('Invalid OpenAI response', ErrorType.API, false);
    }

    const result = JSON.parse(response.choices[0].message.content);

    // Parse dates
    result.suggestedTime = new Date(result.suggestedTime);
    if (result.alternativeTimes) {
      result.alternativeTimes = result.alternativeTimes.map((t: string) => new Date(t));
    }

    return result as SnoozeSuggestionResponse;
  }

  async summarizeThread(request: SummarizationRequest): Promise<SummarizationResponse> {
    const cacheKey = `thread_summary_${this.hashRequest(request)}`;

    // Check cache
    const cached = await CacheManager.get<SummarizationResponse>(cacheKey);
    if (cached) {
      return cached;
    }

    const prompt = PromptTemplates.getSummarizationPrompt(request);

    const apiRequest: OpenAIRequest = {
      model: this.model,
      messages: [
        { role: 'system', content: PromptTemplates.getSystemPrompt() },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 800,
      response_format: { type: 'json_object' }
    };

    const response = await ErrorHandler.handle(
      () => this.makeRequest(apiRequest),
      { operation: 'summarizeThread' }
    );

    if (!response || !response.choices[0]) {
      throw new GaspaError('Invalid OpenAI response', ErrorType.API, false);
    }

    const result = JSON.parse(response.choices[0].message.content) as SummarizationResponse;

    // Cache for 24 hours
    await CacheManager.set(cacheKey, result, 86400);

    return result;
  }

  async detectMeeting(emailBody: string): Promise<any> {
    const prompt = PromptTemplates.getMeetingDetectionPrompt(emailBody);

    const apiRequest: OpenAIRequest = {
      model: this.model,
      messages: [
        { role: 'system', content: PromptTemplates.getSystemPrompt() },
        { role: 'user', content: prompt }
      ],
      temperature: 0.2,
      max_tokens: 300,
      response_format: { type: 'json_object' }
    };

    const response = await this.makeRequest(apiRequest);
    return JSON.parse(response.choices[0].message.content);
  }

  async analyzeSentiment(emailBody: string): Promise<any> {
    const prompt = PromptTemplates.getSentimentAnalysisPrompt(emailBody);

    const apiRequest: OpenAIRequest = {
      model: this.model,
      messages: [
        { role: 'system', content: PromptTemplates.getSystemPrompt() },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 300,
      response_format: { type: 'json_object' }
    };

    const response = await this.makeRequest(apiRequest);
    return JSON.parse(response.choices[0].message.content);
  }

  async extractActions(emailBody: string): Promise<any> {
    const prompt = PromptTemplates.getActionExtractionPrompt(emailBody);

    const apiRequest: OpenAIRequest = {
      model: this.model,
      messages: [
        { role: 'system', content: PromptTemplates.getSystemPrompt() },
        { role: 'user', content: prompt }
      ],
      temperature: 0.2,
      max_tokens: 500,
      response_format: { type: 'json_object' }
    };

    const response = await this.makeRequest(apiRequest);
    return JSON.parse(response.choices[0].message.content);
  }

  getRateLimitInfo(): RateLimitInfo {
    return this.rateLimiter.getInfo();
  }

  isConfigured(): boolean {
    return this.apiKey !== null && this.apiKey !== '';
  }

  private hashRequest(request: any): string {
    const str = JSON.stringify(request);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(36);
  }

  private plainTextToHtml(text: string): string {
    // Convert plain text to basic HTML
    const escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

    // Convert newlines to <br> and paragraphs
    const paragraphs = escaped.split('\n\n');
    const html = paragraphs
      .map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`)
      .join('\n');

    return `<div style="font-family: Arial, sans-serif;">${html}</div>`;
  }
}

// Export singleton instance
export default OpenAIClient.getInstance();