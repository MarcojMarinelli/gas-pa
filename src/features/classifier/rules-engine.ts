/**
 * Rules Engine for Email Classification
 */

import { ProcessingRule, RuleCondition, RuleAction } from '../../core/types';
import DatabaseService from '../../core/database-service';
import LoggerService from '../../core/logger-service';
import CacheManager from '../../core/cache-manager';
import { EmailContext, RuleMatch, ClassificationAction } from './types';

export class RulesEngine {
  private static instance: RulesEngine;
  private rules: ProcessingRule[] = [];
  private lastReload: number = 0;
  private readonly RELOAD_INTERVAL = 300000; // 5 minutes

  private constructor() {
    // Don't load rules here - load lazily when first accessed
    // This prevents "Spreadsheet not initialized" errors on module load
  }

  static getInstance(): RulesEngine {
    if (!RulesEngine.instance) {
      RulesEngine.instance = new RulesEngine();
    }
    return RulesEngine.instance;
  }

  private async loadRules(): Promise<void> {
    try {
      // Check cache first
      const cached = await CacheManager.get<ProcessingRule[]>('classification_rules');
      if (cached) {
        this.rules = cached;
        LoggerService.info('RulesEngine', `Loaded ${this.rules.length} rules from cache`);
        return;
      }

      // Load from database
      const rules = await DatabaseService.find('Rules', {
        where: { enabled: true },
        orderBy: { column: 'precedence', direction: 'DESC' }
      });

      this.rules = rules.map(this.deserializeRule);

      // Cache for 5 minutes
      await CacheManager.set('classification_rules', this.rules, 300);

      LoggerService.info('RulesEngine', `Loaded ${this.rules.length} active rules`);
    } catch (error) {
      LoggerService.error('RulesEngine', 'Failed to load rules', error as Error);
      this.rules = this.getDefaultRules();
    }
  }

  private deserializeRule(data: any): ProcessingRule {
    return {
      id: data.id,
      name: data.name,
      precedence: data.precedence,
      conditions: typeof data.conditions === 'string'
        ? JSON.parse(data.conditions)
        : data.conditions,
      actions: typeof data.actions === 'string'
        ? JSON.parse(data.actions)
        : data.actions,
      enabled: data.enabled,
      confidence: data.confidence,
      lastUsed: data.lastUsed ? new Date(data.lastUsed) : undefined
    };
  }

  async evaluateRules(context: EmailContext): Promise<RuleMatch[]> {
    // Load on first access or reload if needed
    if (this.rules.length === 0 || Date.now() - this.lastReload > this.RELOAD_INTERVAL) {
      await this.loadRules();
      this.lastReload = Date.now();
    }

    const matches: RuleMatch[] = [];

    for (const rule of this.rules) {
      const match = this.evaluateRule(rule, context);
      if (match.matches) {
        matches.push(match);

        // Update rule usage statistics
        this.updateRuleStats(rule.id);
      }
    }

    LoggerService.debug('RulesEngine', `Evaluated ${this.rules.length} rules, ${matches.length} matched`);

    return matches;
  }

  private evaluateRule(rule: ProcessingRule, context: EmailContext): RuleMatch {
    const matchedConditions: string[] = [];
    let allConditionsMet = true;
    let confidence = rule.confidence || 0.8;

    for (const condition of rule.conditions) {
      if (this.evaluateCondition(condition, context)) {
        matchedConditions.push(this.conditionToString(condition));
      } else {
        allConditionsMet = false;
        break;
      }
    }

    // Adjust confidence based on match quality
    if (allConditionsMet) {
      confidence = this.calculateConfidence(rule, context, matchedConditions);
    }

    return {
      rule,
      matches: allConditionsMet,
      confidence,
      matchedConditions
    };
  }

  private evaluateCondition(condition: RuleCondition, context: EmailContext): boolean {
    const email = context.email;
    let fieldValue: string | string[] | undefined;

    // Get the field value to test
    switch (condition.field) {
      case 'from':
        fieldValue = email.from;
        break;
      case 'to':
        fieldValue = email.to;
        break;
      case 'subject':
        fieldValue = email.subject;
        break;
      case 'body':
        fieldValue = email.body;
        break;
      case 'attachment':
        return condition.value === 'true'
          ? email.hasAttachments
          : !email.hasAttachments;
      default:
        return false;
    }

    // Handle array fields (like 'to')
    if (Array.isArray(fieldValue)) {
      return fieldValue.some(val =>
        this.matchValue(val, condition.operator, condition.value, condition.caseSensitive)
      );
    }

    return this.matchValue(
      fieldValue || '',
      condition.operator,
      condition.value,
      condition.caseSensitive
    );
  }

  private matchValue(
    fieldValue: string,
    operator: string,
    conditionValue: string,
    caseSensitive?: boolean
  ): boolean {
    const value = caseSensitive ? fieldValue : fieldValue.toLowerCase();
    const pattern = caseSensitive ? conditionValue : conditionValue.toLowerCase();

    switch (operator) {
      case 'equals':
        return value === pattern;

      case 'contains':
        return value.includes(pattern);

      case 'startsWith':
        return value.startsWith(pattern);

      case 'endsWith':
        return value.endsWith(pattern);

      case 'regex':
        try {
          const regex = new RegExp(conditionValue, caseSensitive ? 'g' : 'gi');
          return regex.test(fieldValue);
        } catch {
          return false;
        }

      default:
        return false;
    }
  }

  private calculateConfidence(
    rule: ProcessingRule,
    context: EmailContext,
    matchedConditions: string[]
  ): number {
    let confidence = rule.confidence || 0.8;

    // Increase confidence for more specific rules
    confidence += matchedConditions.length * 0.05;

    // Increase confidence if rule has been successful before
    if (rule.lastUsed && rule.confidence && rule.confidence > 0.85) {
      confidence += 0.1;
    }

    // Consider thread context
    if (context.thread) {
      // Higher confidence for ongoing conversations
      if (context.thread.messageCount > 2) {
        confidence += 0.05;
      }
    }

    // Cap at 0.95 for rules (reserve higher for AI/VIP)
    return Math.min(confidence, 0.95);
  }

  private conditionToString(condition: RuleCondition): string {
    return `${condition.field} ${condition.operator} "${condition.value}"`;
  }

  private async updateRuleStats(ruleId: string): Promise<void> {
    try {
      const rule = await DatabaseService.findById('Rules', ruleId);
      if (rule) {
        await DatabaseService.update('Rules', ruleId, {
          hitCount: (rule.hitCount || 0) + 1,
          lastUsed: new Date().toISOString()
        });
      }
    } catch (error) {
      LoggerService.error('RulesEngine', `Failed to update rule stats for ${ruleId}`, error as Error);
    }
  }

  convertRuleActionsToClassificationActions(
    ruleActions: RuleAction[],
    confidence: number
  ): ClassificationAction[] {
    return ruleActions.map(action => ({
      type: action.type.toUpperCase() as ClassificationAction['type'],
      value: action.value,
      parameters: action.parameters,
      confidence,
      autoExecute: confidence >= 0.85 // Only auto-execute high confidence actions
    }));
  }

  async createRule(rule: Omit<ProcessingRule, 'id'>): Promise<string> {
    const id = await DatabaseService.insert('Rules', {
      name: rule.name,
      precedence: rule.precedence,
      conditions: JSON.stringify(rule.conditions),
      actions: JSON.stringify(rule.actions),
      enabled: rule.enabled,
      confidence: rule.confidence || 0.8,
      createdAt: new Date().toISOString(),
      hitCount: 0
    });

    // Clear cache to reload rules
    await CacheManager.invalidate('classification_rules');
    await this.loadRules();

    return id;
  }

  async updateRule(id: string, updates: Partial<ProcessingRule>): Promise<boolean> {
    const data: any = {};

    if (updates.name) data.name = updates.name;
    if (updates.precedence !== undefined) data.precedence = updates.precedence;
    if (updates.conditions) data.conditions = JSON.stringify(updates.conditions);
    if (updates.actions) data.actions = JSON.stringify(updates.actions);
    if (updates.enabled !== undefined) data.enabled = updates.enabled;
    if (updates.confidence !== undefined) data.confidence = updates.confidence;

    data.updatedAt = new Date().toISOString();

    const success = await DatabaseService.update('Rules', id, data);

    if (success) {
      await CacheManager.invalidate('classification_rules');
      await this.loadRules();
    }

    return success;
  }

  async deleteRule(id: string): Promise<boolean> {
    const success = await DatabaseService.delete('Rules', id);

    if (success) {
      await CacheManager.invalidate('classification_rules');
      await this.loadRules();
    }

    return success;
  }

  private getDefaultRules(): ProcessingRule[] {
    return [
      {
        id: 'default_1',
        name: 'High Priority - Urgent Keywords',
        precedence: 100,
        conditions: [
          {
            field: 'subject',
            operator: 'regex',
            value: '(urgent|asap|emergency|critical|immediate)',
            caseSensitive: false
          }
        ],
        actions: [
          { type: 'label', value: 'PA-Priority' },
          { type: 'star', value: 'true' }
        ],
        enabled: true,
        confidence: 0.9
      },
      {
        id: 'default_2',
        name: 'Newsletter Detection',
        precedence: 50,
        conditions: [
          {
            field: 'body',
            operator: 'contains',
            value: 'unsubscribe',
            caseSensitive: false
          },
          {
            field: 'from',
            operator: 'contains',
            value: 'newsletter',
            caseSensitive: false
          }
        ],
        actions: [
          { type: 'label', value: 'PA-Newsletter' }
        ],
        enabled: true,
        confidence: 0.85
      },
      {
        id: 'default_3',
        name: 'Meeting Request',
        precedence: 80,
        conditions: [
          {
            field: 'subject',
            operator: 'regex',
            value: '(meeting|schedule|calendar|invite|call)',
            caseSensitive: false
          }
        ],
        actions: [
          { type: 'label', value: 'PA-Meeting' }
        ],
        enabled: true,
        confidence: 0.8
      },
      {
        id: 'default_4',
        name: 'Financial Documents',
        precedence: 90,
        conditions: [
          {
            field: 'subject',
            operator: 'regex',
            value: '(invoice|payment|receipt|statement|bill)',
            caseSensitive: false
          }
        ],
        actions: [
          { type: 'label', value: 'PA-Finance' },
          { type: 'star', value: 'true' }
        ],
        enabled: true,
        confidence: 0.85
      },
      {
        id: 'default_5',
        name: 'Support Tickets',
        precedence: 70,
        conditions: [
          {
            field: 'subject',
            operator: 'regex',
            value: '(ticket|case|support|help)',
            caseSensitive: false
          }
        ],
        actions: [
          { type: 'label', value: 'PA-Support' }
        ],
        enabled: true,
        confidence: 0.8
      },
      {
        id: 'default_6',
        name: 'Auto-Archive Old Newsletters',
        precedence: 30,
        conditions: [
          {
            field: 'from',
            operator: 'regex',
            value: '(noreply|no-reply|newsletter|marketing)',
            caseSensitive: false
          }
        ],
        actions: [
          { type: 'label', value: 'PA-Newsletter' },
          { type: 'archive', value: 'true' }
        ],
        enabled: true,
        confidence: 0.75
      }
    ];
  }

  async getRuleStatistics(): Promise<{
    totalRules: number;
    activeRules: number;
    topRules: Array<{ id: string; name: string; hitCount: number }>;
    averageConfidence: number;
  }> {
    const allRules = await DatabaseService.find('Rules');
    const activeRules = allRules.filter(r => r.enabled);

    const topRules = allRules
      .sort((a, b) => (b.hitCount || 0) - (a.hitCount || 0))
      .slice(0, 5)
      .map(r => ({
        id: r.id,
        name: r.name,
        hitCount: r.hitCount || 0
      }));

    const avgConfidence = activeRules.reduce((sum, r) => sum + (r.confidence || 0), 0) /
      (activeRules.length || 1);

    return {
      totalRules: allRules.length,
      activeRules: activeRules.length,
      topRules,
      averageConfidence: avgConfidence
    };
  }
}

// Export singleton instance
export default RulesEngine.getInstance();