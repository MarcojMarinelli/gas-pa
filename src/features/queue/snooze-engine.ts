/**
 * Snooze Engine - AI-Powered Smart Snooze Suggestions
 *
 * Provides intelligent snooze time suggestions based on:
 * - Email context and priority
 * - User working hours and preferences
 * - Historical snooze patterns
 * - Business hours and weekends
 */

import {
  SmartSnoozeRequest,
  SmartSnoozeResponse,
  QuickSnoozeOption,
  QueuePriority
} from './types';
import OpenAIClient from '../../services/openai/client';
import LoggerService from '../../core/logger-service';
import ErrorHandler from '../../core/error-handler';
import CacheManager from '../../core/cache-manager';
import ConfigManager from '../../core/config-manager';

export class SnoozeEngine {
  private static instance: SnoozeEngine;
  private logger: LoggerService;
  private openai: OpenAIClient;
  private cache: CacheManager;
  private config: ConfigManager;

  private constructor() {
    this.logger = LoggerService; // Already a singleton instance
    this.openai = OpenAIClient; // Already a singleton instance
    this.cache = CacheManager; // Already a singleton instance
    this.config = ConfigManager; // Already a singleton instance
  }

  static getInstance(): SnoozeEngine {
    if (!SnoozeEngine.instance) {
      SnoozeEngine.instance = new SnoozeEngine();
    }
    return SnoozeEngine.instance;
  }

  /**
   * Generate AI-powered smart snooze suggestion
   */
  async suggestSnoozeTime(request: SmartSnoozeRequest): Promise<SmartSnoozeResponse> {
    const timer = this.logger.startTimer('generateSmartSnooze');

    try {
      // Check cache for similar requests
      const cacheKey = `snooze:suggestion:${this.hashRequest(request)}`;
      const cached = await this.cache.get<SmartSnoozeResponse>(
        cacheKey,
        undefined,
        { ttl: 1800, layer: 'memory' } // 30 min cache
      );

      if (cached) {
        this.logger.info('Returning cached snooze suggestion');
        timer();
        return cached;
      }

      // Map request to OpenAI format
      const openAIRequest = {
        email: {
          subject: request.emailContext.subject,
          from: request.emailContext.from,
          body: request.emailContext.body,
          receivedDate: new Date()
        },
        userTimezone: request.userPreferences?.timezone || 'America/New_York',
        workingHours: request.userPreferences?.workingHours
          ? {
              start: `${request.userPreferences.workingHours.start}:00`,
              end: `${request.userPreferences.workingHours.end}:00`
            }
          : undefined
      };

      // Call OpenAI with error handling and fallback
      const aiResponse = await ErrorHandler.handle(
        () => this.openai.suggestSnoozeTime(openAIRequest),
        { operation: 'smartSnooze', context: { request } },
        {
          type: 'FALLBACK',
          fallbackValue: this.getDefaultSnoozeResponse(request.emailContext.priority)
        }
      );

      // Map response to our format
      const parsedResponse: SmartSnoozeResponse = {
        suggestedTime: aiResponse.suggestedTime,
        reasoning: aiResponse.reasoning || 'AI-suggested snooze time',
        alternatives: (aiResponse.alternativeTimes || []).map((time: Date) => ({
          time,
          reason: 'Alternative suggestion'
        })),
        confidence: aiResponse.confidence || 0.7
      };

      // Validate suggested times
      this.validateSnoozeTimes(parsedResponse);

      // Cache the response
      await this.cache.set(cacheKey, parsedResponse, { ttl: 1800, layer: 'memory' });

      this.logger.info('Generated smart snooze suggestion', {
        suggestedTime: parsedResponse.suggestedTime,
        confidence: parsedResponse.confidence
      });

      this.logger.trackMetric('snooze.smart.generated', 1, {
        priority: request.emailContext.priority,
        confidence: parsedResponse.confidence.toString()
      });

      timer();
      return parsedResponse;

    } catch (error) {
      timer();
      this.logger.error('Failed to generate smart snooze', { error, request });

      // Return default as final fallback
      return this.getDefaultSnoozeResponse(request.emailContext.priority);
    }
  }

  /**
   * Get quick snooze options (preset times)
   */
  async getQuickSnoozeOptions(userTimezone?: string): Promise<QuickSnoozeOption[]> {
    const now = new Date();
    const options: QuickSnoozeOption[] = [];

    // Get user preferences
    const workingHours = {
      start: 9,
      end: 17
    };
    const processWeekends = this.config.get<boolean>('PROCESS_WEEKENDS') || false;

    // 1 hour
    options.push({
      label: 'In 1 hour',
      time: new Date(now.getTime() + 60 * 60 * 1000),
      reason: 'Quick follow-up in one hour'
    });

    // 3 hours
    options.push({
      label: 'In 3 hours',
      time: new Date(now.getTime() + 3 * 60 * 60 * 1000),
      reason: 'Follow-up later today'
    });

    // Tomorrow morning
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(workingHours.start, 0, 0, 0);

    // Skip weekends if configured
    if (!processWeekends) {
      while (tomorrow.getDay() === 0 || tomorrow.getDay() === 6) {
        tomorrow.setDate(tomorrow.getDate() + 1);
      }
    }

    options.push({
      label: 'Tomorrow morning',
      time: tomorrow,
      reason: `Follow-up tomorrow at ${workingHours.start}:00 AM`
    });

    // Next week
    const nextWeek = new Date(now);
    nextWeek.setDate(nextWeek.getDate() + 7);
    nextWeek.setHours(workingHours.start, 0, 0, 0);

    // Adjust to Monday if weekend
    if (!processWeekends) {
      while (nextWeek.getDay() === 0 || nextWeek.getDay() === 6) {
        nextWeek.setDate(nextWeek.getDate() + 1);
      }
    }

    options.push({
      label: 'Next week',
      time: nextWeek,
      reason: 'Follow-up next week'
    });

    // End of week (Friday)
    const endOfWeek = new Date(now);
    const daysUntilFriday = (5 - now.getDay() + 7) % 7;
    endOfWeek.setDate(endOfWeek.getDate() + daysUntilFriday);
    endOfWeek.setHours(workingHours.start, 0, 0, 0);

    if (daysUntilFriday > 0) {
      options.push({
        label: 'End of week',
        time: endOfWeek,
        reason: 'Follow-up at end of week'
      });
    }

    this.logger.info('Generated quick snooze options', { count: options.length });

    return options;
  }

  /**
   * Learn from user snooze behavior
   * Records user's chosen snooze time to improve future suggestions
   */
  async learnFromUserSnooze(itemId: string, userChosenTime: Date): Promise<void> {
    try {
      // TODO: Implement learning from user patterns
      // This could track:
      // - Average snooze duration by priority
      // - Preferred times of day
      // - Preferred days of week
      // - Pattern by category/sender

      this.logger.info('Recording user snooze choice', {
        itemId,
        chosenTime: userChosenTime
      });

      this.logger.trackMetric('snooze.user.choice', 1, {
        hour: userChosenTime.getHours().toString(),
        dayOfWeek: userChosenTime.getDay().toString()
      });

      // For now, just log the choice
      // Future: Use this data to adjust AI suggestions

    } catch (error) {
      this.logger.error('Failed to record snooze learning', { error, itemId });
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Build AI prompt for snooze suggestion
   */
  private buildSnoozePrompt(request: SmartSnoozeRequest): string {
    const now = new Date();
    const workingHours = request.userPreferences?.workingHours || { start: 9, end: 17 };
    const timezone = request.userPreferences?.timezone || 'America/New_York';
    const processWeekends = this.config.get<boolean>('PROCESS_WEEKENDS') || false;

    return `You are an email management expert. Suggest an optimal snooze time for this email.

EMAIL CONTEXT:
- Subject: ${request.emailContext.subject}
- From: ${request.emailContext.from}
- Priority: ${request.emailContext.priority}
- Category: ${request.emailContext.category}
- Body preview: ${request.emailContext.body.substring(0, 200)}

CURRENT TIME: ${now.toISOString()}
USER PREFERENCES:
- Working hours: ${workingHours.start}:00 - ${workingHours.end}:00
- Timezone: ${timezone}
- Process weekends: ${processWeekends}

TASK:
Suggest an optimal time to resurface this email for follow-up. Consider:
1. Email priority and urgency
2. User's working hours
3. Appropriate delay based on content
4. Business hours (avoid suggesting times outside working hours)
${!processWeekends ? '5. Avoid weekends' : ''}

Provide your response in this EXACT JSON format:
{
  "suggestedTime": "ISO 8601 date string",
  "reasoning": "Brief explanation of why this time is optimal",
  "alternatives": [
    {
      "time": "ISO 8601 date string",
      "reason": "Brief reason"
    },
    {
      "time": "ISO 8601 date string",
      "reason": "Brief reason"
    }
  ],
  "confidence": 0.0 to 1.0
}

Guidelines:
- CRITICAL/HIGH priority: Suggest within a few hours to 1 day
- MEDIUM priority: Suggest 1-3 days
- LOW priority: Suggest 3-7 days
- Always suggest times during working hours
- Provide 2-3 alternative options
- Be specific about reasoning`;
  }

  /**
   * Get default snooze response based on priority
   */
  private getDefaultSnoozeResponse(priority: string): SmartSnoozeResponse {
    const now = new Date();
    const workingHours = { start: 9, end: 17 };
    let hoursToAdd = 24; // Default 1 day

    switch (priority) {
      case 'CRITICAL':
        hoursToAdd = 2;
        break;
      case 'HIGH':
        hoursToAdd = 4;
        break;
      case 'MEDIUM':
        hoursToAdd = 24;
        break;
      case 'LOW':
        hoursToAdd = 72;
        break;
    }

    const suggestedTime = this.adjustToWorkingHours(
      new Date(now.getTime() + hoursToAdd * 60 * 60 * 1000),
      workingHours
    );

    const alternatives = [
      {
        time: this.adjustToWorkingHours(
          new Date(suggestedTime.getTime() + 3 * 60 * 60 * 1000),
          workingHours
        ),
        reason: 'A bit later if you need more time'
      },
      {
        time: this.adjustToWorkingHours(
          new Date(suggestedTime.getTime() + 24 * 60 * 60 * 1000),
          workingHours
        ),
        reason: 'Tomorrow at the same time'
      }
    ];

    return {
      suggestedTime,
      reasoning: `Default snooze for ${priority} priority: ${hoursToAdd} hours`,
      alternatives,
      confidence: 0.5
    };
  }

  /**
   * Adjust time to working hours
   */
  private adjustToWorkingHours(
    time: Date,
    workingHours: { start: number; end: number }
  ): Date {
    const adjusted = new Date(time);
    const processWeekends = this.config.get<boolean>('PROCESS_WEEKENDS') || false;

    // Skip weekends if configured
    if (!processWeekends) {
      while (adjusted.getDay() === 0 || adjusted.getDay() === 6) {
        adjusted.setDate(adjusted.getDate() + 1);
      }
    }

    // Adjust to working hours
    const hour = adjusted.getHours();
    if (hour < workingHours.start) {
      adjusted.setHours(workingHours.start, 0, 0, 0);
    } else if (hour >= workingHours.end) {
      // Move to next working day
      adjusted.setDate(adjusted.getDate() + 1);
      adjusted.setHours(workingHours.start, 0, 0, 0);

      // Check if next day is weekend
      if (!processWeekends) {
        while (adjusted.getDay() === 0 || adjusted.getDay() === 6) {
          adjusted.setDate(adjusted.getDate() + 1);
        }
      }
    }

    return adjusted;
  }

  /**
   * Validate snooze times are in the future
   */
  private validateSnoozeTimes(response: SmartSnoozeResponse): void {
    const now = new Date();

    if (response.suggestedTime <= now) {
      response.suggestedTime = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now
    }

    response.alternatives = response.alternatives.filter(alt => alt.time > now);

    // Ensure we have at least 2 alternatives
    while (response.alternatives.length < 2) {
      const lastTime = response.alternatives.length > 0
        ? response.alternatives[response.alternatives.length - 1].time
        : response.suggestedTime;

      response.alternatives.push({
        time: new Date(lastTime.getTime() + 3 * 60 * 60 * 1000),
        reason: 'Additional option'
      });
    }
  }

  /**
   * Hash request for caching
   */
  private hashRequest(request: SmartSnoozeRequest): string {
    const key = `${request.emailContext.subject}:${request.emailContext.priority}:${request.emailContext.category}`;
    return key.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
  }
}

// Export singleton instance
export default SnoozeEngine.getInstance();
