/**
 * Main Classification Engine
 * Combines AI, Rules, VIP handling, and Learning
 */

import OpenAIClient from '../../services/openai/client';
import { EmailClassificationRequest, EmailClassificationResponse } from '../../services/openai/types';
import RulesEngine from './rules-engine';
import VIPManager from '../vip/manager';
import LearningSystem from './learning-system';
import DatabaseService from '../../core/database-service';
import LoggerService from '../../core/logger-service';
import CacheManager from '../../core/cache-manager';
import ConfigManager from '../../core/config-manager';
import ErrorHandler, { ErrorType, GaspaError } from '../../core/error-handler';
import {
  ClassificationConfig,
  ClassificationResult,
  ClassificationAction,
  EmailContext,
  ClassificationFeedback,
  PriorityFactors
} from './types';

export class ClassificationEngine {
  private static instance: ClassificationEngine;
  private config: ClassificationConfig;
  private rulesEngine: typeof RulesEngine;
  private vipManager: typeof VIPManager;
  private learningSystem: typeof LearningSystem;

  private constructor() {
    this.config = this.loadConfig();
    this.rulesEngine = RulesEngine;
    this.vipManager = VIPManager;
    this.learningSystem = LearningSystem;
  }

  static getInstance(): ClassificationEngine {
    if (!ClassificationEngine.instance) {
      ClassificationEngine.instance = new ClassificationEngine();
    }
    return ClassificationEngine.instance;
  }

  private loadConfig(): ClassificationConfig {
    return {
      useAI: ConfigManager.getWithDefault('ENABLE_AI_CLASSIFICATION', true),
      useRules: true,
      confidenceThreshold: ConfigManager.getWithDefault('CONFIDENCE_THRESHOLD', 0.85),
      autoActionThreshold: 0.9,
      learningEnabled: ConfigManager.getWithDefault('LEARNING_ENABLED', true),
      vipOverride: true
    };
  }

  async classifyEmail(context: EmailContext): Promise<ClassificationResult> {
    const timer = LoggerService.startTimer('ClassificationEngine.classify');

    try {
      // Check cache first
      const cacheKey = `classification_${context.email.id}`;
      const cached = await CacheManager.get<ClassificationResult>(cacheKey);
      if (cached) {
        LoggerService.debug('ClassificationEngine', 'Using cached classification');
        timer();
        return cached;
      }

      // Step 1: Check VIP status
      const vip = await this.vipManager.isVIP(context.email.from);
      let result: ClassificationResult;

      if (vip && this.config.vipOverride) {
        // VIP emails get special treatment
        result = await this.classifyVIPEmail(context, vip);
        LoggerService.info('ClassificationEngine', `VIP classification for ${context.email.from}, Tier ${vip.tier}`);
      } else {
        // Step 2: Hybrid classification (AI + Rules)
        result = await this.hybridClassification(context);
      }

      // Step 3: Apply learning insights
      if (this.config.learningEnabled) {
        result = await this.applyLearningInsights(result, context);
      }

      // Step 4: Calculate final confidence
      result.confidence = this.calculateFinalConfidence(result);

      // Step 5: Determine auto-actions
      result.suggestedActions = this.determineActions(result);

      // Store classification
      await this.storeClassification(context.email.id, result);

      // Cache result
      await CacheManager.set(cacheKey, result, 3600); // Cache for 1 hour

      timer();
      LoggerService.info('ClassificationEngine', `Classified email ${context.email.id}: ${result.priority} priority, ${result.category} category, ${(result.confidence * 100).toFixed(1)}% confidence`);

      return result;
    } catch (error) {
      timer();
      throw new GaspaError(
        'Failed to classify email',
        ErrorType.UNKNOWN,
        true,
        { emailId: context.email.id },
        error as Error
      );
    }
  }

  private async classifyVIPEmail(
    context: EmailContext,
    vip: any
  ): Promise<ClassificationResult> {
    // VIP emails always get high priority
    const basePriority = vip.tier === 1 ? 'CRITICAL' :
      vip.tier === 2 ? 'HIGH' : 'MEDIUM';

    // Use AI if available for better classification
    let aiResult: EmailClassificationResponse | null = null;

    if (this.config.useAI && OpenAIClient.isConfigured()) {
      try {
        aiResult = await OpenAIClient.classifyEmail({
          subject: context.email.subject,
          from: context.email.from,
          to: context.email.to.join(', '),
          body: context.email.body
        });
      } catch (error) {
        LoggerService.error('ClassificationEngine', 'AI classification failed for VIP', error as Error);
      }
    }

    const result: ClassificationResult = {
      priority: basePriority as any,
      category: aiResult?.category || 'vip',
      labels: ['PA-VIP', `PA-Tier${vip.tier}`, ...(aiResult?.labels || [])],
      needsReply: aiResult?.needsReply || true,
      waitingOnOthers: aiResult?.waitingOnOthers || false,
      isRecurring: false,
      isNewsletter: false,
      isAutomated: false,
      sentiment: aiResult?.sentiment || 'NEUTRAL',
      importance: vip.tier === 1 ? 100 : vip.tier === 2 ? 90 : 80,
      urgency: vip.tier === 1 ? 90 : vip.tier === 2 ? 70 : 50,
      suggestedActions: [],
      confidence: 0.95, // High confidence for VIP
      method: 'VIP',
      reasoning: `VIP Tier ${vip.tier} contact: ${vip.name}`,
      appliedRules: [],
      isVIP: true,
      vipTier: vip.tier,
      vipSLA: this.vipManager.getSLADeadline(vip, context.email.date),
      feedbackRequired: false,
      learningOpportunity: true
    };

    // Generate draft if configured
    if (vip.autoDraft && OpenAIClient.isConfigured()) {
      try {
        const draft = await OpenAIClient.generateDraft({
          originalEmail: {
            subject: context.email.subject,
            from: context.email.from,
            body: context.email.body
          },
          context: {
            relationship: 'CLIENT',
            tone: 'PROFESSIONAL'
          }
        });

        result.suggestedDraft = draft.body;
      } catch (error) {
        LoggerService.error('ClassificationEngine', 'Draft generation failed for VIP', error as Error);
      }
    }

    return result;
  }

  private async hybridClassification(context: EmailContext): Promise<ClassificationResult> {
    const [aiResult, rulesResult] = await Promise.all([
      this.aiClassification(context),
      this.rulesClassification(context)
    ]);

    // Merge results with weighted average
    const aiWeight = aiResult ? 0.6 : 0;
    const rulesWeight = rulesResult ? 0.4 : 0;
    const totalWeight = aiWeight + rulesWeight;

    if (totalWeight === 0) {
      // Fallback classification
      return this.fallbackClassification(context);
    }

    // Determine priority
    const priority = this.mergePriority(
      aiResult?.priority,
      rulesResult?.priority,
      aiWeight,
      rulesWeight
    );

    // Determine category
    const category = aiResult?.category || rulesResult?.category || 'other';

    // Merge labels
    const labels = new Set<string>();
    aiResult?.labels?.forEach(l => labels.add(l));
    rulesResult?.labels?.forEach(l => labels.add(l));

    // Calculate confidence
    const confidence = (
      (aiResult?.confidence || 0) * aiWeight +
      (rulesResult?.confidence || 0) * rulesWeight
    ) / totalWeight;

    const result: ClassificationResult = {
      priority,
      category,
      labels: Array.from(labels),
      needsReply: aiResult?.needsReply || rulesResult?.needsReply || false,
      waitingOnOthers: aiResult?.waitingOnOthers || rulesResult?.waitingOnOthers || false,
      isRecurring: this.detectRecurring(context),
      isNewsletter: this.detectNewsletter(context),
      isAutomated: this.detectAutomated(context),
      sentiment: aiResult?.sentiment || 'NEUTRAL',
      importance: this.calculateImportance(context, aiResult, rulesResult),
      urgency: this.calculateUrgency(context, aiResult, rulesResult),
      suggestedActions: [],
      suggestedSnoozeTime: aiResult?.suggestedSnoozeTime,
      suggestedDraft: aiResult?.suggestedDraft,
      confidence,
      method: 'HYBRID',
      reasoning: this.generateReasoning(aiResult, rulesResult),
      appliedRules: rulesResult?.appliedRules || [],
      isVIP: false,
      feedbackRequired: confidence < this.config.confidenceThreshold,
      learningOpportunity: true
    };

    return result;
  }

  private async aiClassification(
    context: EmailContext
  ): Promise<Partial<ClassificationResult> | null> {
    if (!this.config.useAI || !OpenAIClient.isConfigured()) {
      return null;
    }

    try {
      const request: EmailClassificationRequest = {
        subject: context.email.subject,
        from: context.email.from,
        to: context.email.to.join(', '),
        body: context.email.body,
        previousEmails: context.thread
          ? [`Thread has ${context.thread.messageCount} messages`]
          : undefined
      };

      const aiResponse = await OpenAIClient.classifyEmail(request);

      return {
        priority: this.mapAIPriority(aiResponse.priority, aiResponse.sentiment),
        category: aiResponse.category,
        labels: this.mapAILabels(aiResponse.labels, aiResponse.category),
        needsReply: aiResponse.needsReply,
        waitingOnOthers: aiResponse.waitingOnOthers,
        sentiment: aiResponse.sentiment,
        confidence: aiResponse.confidence,
        reasoning: aiResponse.reasoning,
        suggestedActions: aiResponse.suggestedActions.map(action => ({
          type: 'LABEL',
          value: action,
          parameters: {},
          confidence: aiResponse.confidence,
          autoExecute: false
        }))
      };
    } catch (error) {
      LoggerService.error('ClassificationEngine', 'AI classification failed', error as Error);
      return null;
    }
  }

  private async rulesClassification(
    context: EmailContext
  ): Promise<Partial<ClassificationResult> | null> {
    if (!this.config.useRules) {
      return null;
    }

    try {
      const ruleMatches = await this.rulesEngine.evaluateRules(context);

      if (ruleMatches.length === 0) {
        return null;
      }

      // Use highest precedence rule
      const primaryMatch = ruleMatches[0];
      const actions = this.rulesEngine.convertRuleActionsToClassificationActions(
        primaryMatch.rule.actions,
        primaryMatch.confidence
      );

      // Extract labels from actions
      const labels = actions
        .filter(a => a.type === 'LABEL')
        .map(a => a.value as string);

      // Determine priority from rules
      const priority = this.determinePriorityFromRules(primaryMatch.rule, labels);

      return {
        priority,
        category: this.determineCategoryFromLabels(labels),
        labels,
        confidence: primaryMatch.confidence,
        appliedRules: ruleMatches.map(m => m.rule.name),
        suggestedActions: actions
      };
    } catch (error) {
      LoggerService.error('ClassificationEngine', 'Rules classification failed', error as Error);
      return null;
    }
  }

  private async applyLearningInsights(
    result: ClassificationResult,
    context: EmailContext
  ): Promise<ClassificationResult> {
    // Get category suggestion from learning system
    const suggestion = await this.learningSystem.suggestCategoryForEmail(
      context.email.subject,
      context.email.from,
      context.email.body
    );

    if (suggestion && suggestion.confidence > result.confidence) {
      result.category = suggestion.category;
      result.confidence = (result.confidence + suggestion.confidence) / 2;
      result.reasoning += `; Learning system suggests: ${suggestion.category}`;
    }

    // Adjust priority based on learned weights
    const priorityFactors: Partial<PriorityFactors> = {
      senderImportance: this.calculateSenderImportance(context.email.from),
      keywordUrgency: this.calculateKeywordUrgency(context.email.subject + ' ' + context.email.body),
      vipStatus: result.isVIP ? 1 : 0,
      sentimentUrgency: result.sentiment === 'URGENT' ? 1 : result.sentiment === 'NEGATIVE' ? 0.5 : 0
    };

    const priorityScore = this.learningSystem.calculatePriorityScore(priorityFactors);
    result.importance = priorityScore;

    // Adjust priority if score is very different
    if (priorityScore > 80 && result.priority === 'LOW') {
      result.priority = 'MEDIUM';
      result.reasoning += '; Priority upgraded based on learned patterns';
    } else if (priorityScore < 20 && result.priority === 'HIGH') {
      result.priority = 'MEDIUM';
      result.reasoning += '; Priority downgraded based on learned patterns';
    }

    return result;
  }

  private fallbackClassification(context: EmailContext): ClassificationResult {
    // Basic classification when other methods fail
    const hasUrgentKeywords = /urgent|asap|important|critical/i.test(
      context.email.subject + ' ' + context.email.body
    );

    return {
      priority: hasUrgentKeywords ? 'HIGH' : 'MEDIUM',
      category: 'other',
      labels: ['PA-Unclassified'],
      needsReply: context.email.body.includes('?'),
      waitingOnOthers: false,
      isRecurring: false,
      isNewsletter: this.detectNewsletter(context),
      isAutomated: this.detectAutomated(context),
      sentiment: 'NEUTRAL',
      importance: 50,
      urgency: hasUrgentKeywords ? 70 : 30,
      suggestedActions: [],
      confidence: 0.3,
      method: 'MANUAL',
      reasoning: 'Fallback classification - manual review recommended',
      appliedRules: [],
      isVIP: false,
      feedbackRequired: true,
      learningOpportunity: true
    };
  }

  private mapAIPriority(aiPriority: string, sentiment?: string): ClassificationResult['priority'] {
    if (sentiment === 'URGENT') {
      return 'CRITICAL';
    }

    switch (aiPriority) {
      case 'HIGH':
        return 'HIGH';
      case 'LOW':
        return 'LOW';
      default:
        return 'MEDIUM';
    }
  }

  private mapAILabels(labels: string[], category: string): string[] {
    const mapped = labels.map(label => {
      if (!label.startsWith('PA-')) {
        return `PA-${label}`;
      }
      return label;
    });

    // Add category label
    if (category && category !== 'other') {
      mapped.push(`PA-${category.charAt(0).toUpperCase() + category.slice(1)}`);
    }

    return mapped;
  }

  private mergePriority(
    aiPriority?: ClassificationResult['priority'],
    rulesPriority?: ClassificationResult['priority'],
    aiWeight: number = 0.5,
    rulesWeight: number = 0.5
  ): ClassificationResult['priority'] {
    const priorityValues = {
      CRITICAL: 4,
      HIGH: 3,
      MEDIUM: 2,
      LOW: 1
    };

    const aiValue = aiPriority ? priorityValues[aiPriority] : 2;
    const rulesValue = rulesPriority ? priorityValues[rulesPriority] : 2;

    const weighted = (aiValue * aiWeight + rulesValue * rulesWeight) / (aiWeight + rulesWeight);

    if (weighted >= 3.5) return 'CRITICAL';
    if (weighted >= 2.5) return 'HIGH';
    if (weighted >= 1.5) return 'MEDIUM';
    return 'LOW';
  }

  private calculateImportance(
    context: EmailContext,
    aiResult: any,
    rulesResult: any
  ): number {
    let importance = 50;

    // Thread context
    if (context.thread) {
      if (context.thread.messageCount > 5) importance += 10;
      if (context.thread.hasUserReplied) importance += 15;
    }

    // From important domains
    if (/@(company|client|partner)\.com$/i.test(context.email.from)) {
      importance += 20;
    }

    // Has attachments
    if (context.email.hasAttachments) {
      importance += 10;
    }

    // AI confidence
    if (aiResult?.confidence > 0.8) {
      importance += 10;
    }

    return Math.min(importance, 100);
  }

  private calculateUrgency(
    context: EmailContext,
    aiResult: any,
    rulesResult: any
  ): number {
    let urgency = 30;

    // Check for deadlines
    const deadlinePattern = /by\s+(monday|tuesday|wednesday|thursday|friday|today|tomorrow|eod|end of day|close of business|cob)/i;
    if (deadlinePattern.test(context.email.body)) {
      urgency += 40;
    }

    // Urgent keywords
    const urgentPattern = /urgent|asap|immediately|critical|emergency/i;
    if (urgentPattern.test(context.email.subject)) {
      urgency += 30;
    }

    // Sentiment
    if (aiResult?.sentiment === 'URGENT') {
      urgency += 20;
    }

    return Math.min(urgency, 100);
  }

  private detectRecurring(context: EmailContext): boolean {
    const recurringPatterns = [
      /weekly\s+(update|report|digest)/i,
      /monthly\s+(statement|newsletter|summary)/i,
      /daily\s+(digest|briefing|report)/i
    ];

    return recurringPatterns.some(pattern =>
      pattern.test(context.email.subject)
    );
  }

  private detectNewsletter(context: EmailContext): boolean {
    return (
      context.email.body.toLowerCase().includes('unsubscribe') ||
      context.email.from.toLowerCase().includes('newsletter') ||
      context.email.from.toLowerCase().includes('noreply')
    );
  }

  private detectAutomated(context: EmailContext): boolean {
    const automatedPatterns = [
      /^(noreply|no-reply|donotreply|notifications?)@/i,
      /^(system|automated|bot|service)@/i
    ];

    return automatedPatterns.some(pattern =>
      pattern.test(context.email.from)
    );
  }

  private calculateFinalConfidence(result: ClassificationResult): number {
    let confidence = result.confidence;

    // Boost confidence for VIP
    if (result.isVIP) {
      confidence = Math.min(confidence + 0.1, 0.99);
    }

    // Reduce confidence if multiple methods disagree
    if (result.method === 'HYBRID' && result.appliedRules.length === 0) {
      confidence *= 0.9;
    }

    // Reduce confidence for low importance emails
    if (result.importance < 30) {
      confidence *= 0.95;
    }

    return confidence;
  }

  private determineActions(result: ClassificationResult): ClassificationAction[] {
    const actions: ClassificationAction[] = [];

    // Add labels
    result.labels.forEach(label => {
      actions.push({
        type: 'LABEL',
        value: label,
        confidence: result.confidence,
        autoExecute: result.confidence >= this.config.autoActionThreshold
      });
    });

    // Star high priority
    if (result.priority === 'CRITICAL' || result.priority === 'HIGH') {
      actions.push({
        type: 'STAR',
        confidence: result.confidence,
        autoExecute: result.confidence >= 0.8
      });
    }

    // Archive newsletters
    if (result.isNewsletter && result.confidence >= 0.8) {
      actions.push({
        type: 'ARCHIVE',
        confidence: result.confidence,
        autoExecute: true
      });
    }

    // Draft for VIP
    if (result.isVIP && result.needsReply && result.suggestedDraft) {
      actions.push({
        type: 'DRAFT',
        value: result.suggestedDraft,
        confidence: result.confidence,
        autoExecute: false
      });
    }

    // Snooze if suggested
    if (result.suggestedSnoozeTime) {
      actions.push({
        type: 'SNOOZE',
        value: result.suggestedSnoozeTime.toISOString(),
        confidence: result.confidence,
        autoExecute: false
      });
    }

    return actions;
  }

  private generateReasoning(aiResult: any, rulesResult: any): string {
    const parts: string[] = [];

    if (aiResult?.reasoning) {
      parts.push(`AI: ${aiResult.reasoning}`);
    }

    if (rulesResult?.appliedRules?.length > 0) {
      parts.push(`Rules: ${rulesResult.appliedRules.join(', ')}`);
    }

    return parts.join('; ') || 'Classification based on default patterns';
  }

  private determinePriorityFromRules(rule: any, labels: string[]): ClassificationResult['priority'] {
    if (labels.includes('PA-Priority') || labels.includes('PA-Urgent')) {
      return 'HIGH';
    }

    if (labels.includes('PA-Newsletter') || labels.includes('PA-FYI')) {
      return 'LOW';
    }

    // Based on rule precedence
    if (rule.precedence >= 90) return 'HIGH';
    if (rule.precedence >= 60) return 'MEDIUM';
    return 'LOW';
  }

  private determineCategoryFromLabels(labels: string[]): string {
    const categoryMap: Record<string, string> = {
      'PA-Work': 'work',
      'PA-Personal': 'personal',
      'PA-Finance': 'finance',
      'PA-Newsletter': 'newsletter',
      'PA-Shopping': 'shopping',
      'PA-Travel': 'travel',
      'PA-Support': 'support',
      'PA-Meeting': 'work'
    };

    for (const label of labels) {
      if (categoryMap[label]) {
        return categoryMap[label];
      }
    }

    return 'other';
  }

  private calculateSenderImportance(from: string): number {
    // Domain-based importance
    if (/@(ceo|president|director|manager)/i.test(from)) {
      return 0.9;
    }

    if (/@(company|client|partner)\.com$/i.test(from)) {
      return 0.7;
    }

    return 0.3;
  }

  private calculateKeywordUrgency(text: string): number {
    const urgentKeywords = [
      'urgent', 'asap', 'immediately', 'critical',
      'deadline', 'by today', 'by tomorrow', 'eod'
    ];

    const matches = urgentKeywords.filter(keyword =>
      text.toLowerCase().includes(keyword)
    );

    return Math.min(matches.length * 0.2, 1);
  }

  private async storeClassification(
    emailId: string,
    result: ClassificationResult
  ): Promise<void> {
    try {
      await DatabaseService.insert('Emails', {
        id: emailId,
        classification: result.category,
        priority: result.priority,
        labels: JSON.stringify(result.labels),
        status: result.needsReply ? 'NEEDS_REPLY' : 'PROCESSED',
        processedAt: new Date().toISOString(),
        confidence: result.confidence,
        needsReply: result.needsReply,
        waitingOnOthers: result.waitingOnOthers
      });
    } catch (error) {
      LoggerService.error('ClassificationEngine', 'Failed to store classification', error as Error);
    }
  }

  async recordFeedback(
    emailId: string,
    feedback: ClassificationFeedback
  ): Promise<void> {
    // Get original classification
    const email = await DatabaseService.findById('Emails', emailId);
    if (!email) {
      throw new Error(`Email ${emailId} not found`);
    }

    const originalClassification: ClassificationResult = {
      priority: email.priority,
      category: email.classification,
      labels: JSON.parse(email.labels),
      needsReply: email.needsReply,
      waitingOnOthers: email.waitingOnOthers,
      confidence: email.confidence,
      method: 'UNKNOWN',
      reasoning: '',
      appliedRules: [],
      isVIP: false,
      isRecurring: false,
      isNewsletter: false,
      isAutomated: false,
      sentiment: 'NEUTRAL',
      importance: 50,
      urgency: 50,
      suggestedActions: [],
      feedbackRequired: false,
      learningOpportunity: true
    };

    // Record in learning system
    await this.learningSystem.recordFeedback(emailId, originalClassification, feedback);

    LoggerService.info('ClassificationEngine', `Recorded feedback for ${emailId}: ${feedback.feedbackType}`);
  }

  async getStatistics(): Promise<any> {
    const [ruleStats, vipStats, learningStats] = await Promise.all([
      this.rulesEngine.getRuleStatistics(),
      this.vipManager.getVIPStatistics(),
      this.learningSystem.getStatistics()
    ]);

    const emailStats = await DatabaseService.find('Emails', {
      limit: 1000,
      orderBy: { column: 'processedAt', direction: 'DESC' }
    });

    const stats = {
      totalClassified: emailStats.length,
      byPriority: {
        CRITICAL: 0,
        HIGH: 0,
        MEDIUM: 0,
        LOW: 0
      },
      byCategory: {},
      avgConfidence: 0,
      needsReply: 0,
      waitingOnOthers: 0
    };

    let totalConfidence = 0;

    emailStats.forEach((email: any) => {
      stats.byPriority[email.priority as keyof typeof stats.byPriority]++;

      const category = email.classification;
      stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;

      if (email.needsReply) stats.needsReply++;
      if (email.waitingOnOthers) stats.waitingOnOthers++;

      totalConfidence += email.confidence || 0;
    });

    stats.avgConfidence = emailStats.length > 0
      ? (totalConfidence / emailStats.length) * 100
      : 0;

    return {
      classification: stats,
      rules: ruleStats,
      vips: vipStats,
      learning: learningStats
    };
  }
}

// Export singleton instance
export default ClassificationEngine.getInstance();