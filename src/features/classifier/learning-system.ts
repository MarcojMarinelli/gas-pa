/**
 * Learning System for Classification Improvement
 */

import DatabaseService from '../../core/database-service';
import LoggerService from '../../core/logger-service';
import CacheManager from '../../core/cache-manager';
import ConfigManager from '../../core/config-manager';
import {
  ClassificationResult,
  ClassificationFeedback,
  LearningData,
  CategoryHints,
  PriorityFactors
} from './types';

export class LearningSystem {
  private static instance: LearningSystem;
  private learningRate: number;
  private categoryPatterns: Map<string, CategoryHints> = new Map();
  private priorityWeights: PriorityFactors = {
    senderImportance: 0.25,
    keywordUrgency: 0.20,
    deadlineProximity: 0.15,
    vipStatus: 0.15,
    historicalResponse: 0.10,
    sentimentUrgency: 0.10,
    contextualClues: 0.05
  };
  private accuracy: number = 0.75; // Starting accuracy
  private dataLoaded: boolean = false;

  private constructor() {
    this.learningRate = ConfigManager.getWithDefault('LEARNING_RATE', 0.1);
    // Don't load learning data here - load lazily when first accessed
    // This prevents "Spreadsheet not initialized" errors on module load
  }

  static getInstance(): LearningSystem {
    if (!LearningSystem.instance) {
      LearningSystem.instance = new LearningSystem();
    }
    return LearningSystem.instance;
  }

  /**
   * Ensure learning data is loaded (lazy loading)
   */
  private async ensureDataLoaded(): Promise<void> {
    if (!this.dataLoaded) {
      await this.loadLearningData();
      this.dataLoaded = true;
    }
  }

  private async loadLearningData(): Promise<void> {
    try {
      // Load cached learning model
      const cachedModel = await CacheManager.get<{
        patterns: Array<[string, CategoryHints]>;
        weights: PriorityFactors;
        accuracy: number;
      }>('learning_model');

      if (cachedModel) {
        this.categoryPatterns = new Map(cachedModel.patterns);
        this.priorityWeights = cachedModel.weights;
        this.accuracy = cachedModel.accuracy;
        return;
      }

      // Load from database and rebuild model
      await this.rebuildModel();
    } catch (error) {
      LoggerService.error('LearningSystem', 'Failed to load learning data', error as Error);
      this.initializeDefaultPatterns();
    }
  }

  private async rebuildModel(): Promise<void> {
    const learningData = await DatabaseService.find('Learning', {
      limit: 1000,
      orderBy: { column: 'timestamp', direction: 'DESC' }
    });

    // Analyze patterns from feedback
    const categoryCorrections = new Map<string, { correct: number; total: number }>();
    const priorityCorrections = new Map<string, { correct: number; total: number }>();

    learningData.forEach(data => {
      const learning = this.deserializeLearningData(data);

      // Track category accuracy
      const category = learning.originalClassification.category;
      if (!categoryCorrections.has(category)) {
        categoryCorrections.set(category, { correct: 0, total: 0 });
      }

      const catStats = categoryCorrections.get(category)!;
      catStats.total++;

      if (!learning.userFeedback || learning.userFeedback.feedbackType === 'CORRECT') {
        catStats.correct++;
      }

      // Track priority accuracy
      const priority = learning.originalClassification.priority;
      if (!priorityCorrections.has(priority)) {
        priorityCorrections.set(priority, { correct: 0, total: 0 });
      }

      const priStats = priorityCorrections.get(priority)!;
      priStats.total++;

      if (!learning.userFeedback ||
        (learning.userFeedback.feedbackType !== 'WRONG_PRIORITY')) {
        priStats.correct++;
      }
    });

    // Calculate overall accuracy
    let totalCorrect = 0;
    let totalCount = 0;

    categoryCorrections.forEach(stats => {
      totalCorrect += stats.correct;
      totalCount += stats.total;
    });

    this.accuracy = totalCount > 0 ? totalCorrect / totalCount : 0.75;

    // Update patterns based on corrections
    this.updatePatterns(learningData);

    // Cache the model
    await this.saveModel();

    LoggerService.info('LearningSystem', `Model rebuilt with ${learningData.length} examples, accuracy: ${(this.accuracy * 100).toFixed(1)}%`);
  }

  private updatePatterns(learningData: LearningData[]): void {
    const categoryKeywords = new Map<string, Map<string, number>>();

    learningData.forEach(data => {
      if (data.outcome === 'SUCCESS' || data.outcome === 'CORRECTED') {
        const category = data.userFeedback?.correctValue?.category ||
          data.originalClassification.category;

        if (!categoryKeywords.has(category)) {
          categoryKeywords.set(category, new Map());
        }

        // Extract keywords from successful classifications
        const keywords = this.extractKeywords(data.emailId);
        const catKeywords = categoryKeywords.get(category)!;

        keywords.forEach(keyword => {
          catKeywords.set(keyword, (catKeywords.get(keyword) || 0) + 1);
        });
      }
    });

    // Convert to CategoryHints
    categoryKeywords.forEach((keywords, category) => {
      const topKeywords = Array.from(keywords.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .map(([keyword]) => keyword);

      this.categoryPatterns.set(category, {
        keywords: topKeywords,
        senderPatterns: [],
        subjectPatterns: [],
        bodyPatterns: [],
        weight: 0.8
      });
    });
  }

  private extractKeywords(emailId: string): string[] {
    // This would extract keywords from the email
    // For now, return empty array as we don't have email content here
    return [];
  }

  async recordFeedback(
    emailId: string,
    classification: ClassificationResult,
    feedback: ClassificationFeedback
  ): Promise<void> {
    await this.ensureDataLoaded();

    try {
      // Store feedback
      const learningData: LearningData = {
        emailId,
        originalClassification: classification,
        userFeedback: feedback,
        userActions: [],
        outcome: feedback.feedbackType === 'CORRECT' ? 'SUCCESS' : 'CORRECTED',
        timestamp: new Date()
      };

      await DatabaseService.insert('Learning', {
        emailId: learningData.emailId,
        originalClassification: JSON.stringify(learningData.originalClassification),
        userFeedback: JSON.stringify(learningData.userFeedback),
        correctClassification: feedback.correctValue
          ? JSON.stringify(feedback.correctValue)
          : null,
        timestamp: learningData.timestamp.toISOString(),
        applied: false
      });

      // Update model online (immediate learning)
      await this.applyFeedback(learningData);

      LoggerService.info('LearningSystem', `Recorded feedback for email ${emailId}: ${feedback.feedbackType}`);
    } catch (error) {
      LoggerService.error('LearningSystem', 'Failed to record feedback', error as Error);
    }
  }

  private async applyFeedback(learning: LearningData): Promise<void> {
    const feedback = learning.userFeedback;
    if (!feedback) return;

    // Adjust weights based on feedback type
    switch (feedback.feedbackType) {
      case 'WRONG_PRIORITY':
        await this.adjustPriorityWeights(learning);
        break;

      case 'WRONG_CATEGORY':
        await this.adjustCategoryPatterns(learning);
        break;

      case 'MISSING_ACTION':
        await this.learnNewAction(learning);
        break;

      case 'CORRECT':
        await this.reinforcePattern(learning);
        break;
    }

    // Update accuracy metric
    await this.updateAccuracy(feedback.feedbackType === 'CORRECT');

    // Save updated model
    await this.saveModel();
  }

  private async adjustPriorityWeights(learning: LearningData): Promise<void> {
    // Implement gradient descent-like weight adjustment
    const error = this.calculatePriorityError(
      learning.originalClassification.priority,
      learning.userFeedback?.correctValue?.priority
    );

    // Adjust weights proportionally to error
    const adjustment = error * this.learningRate;

    // Simple heuristic: increase weight of factors that were undervalued
    if (learning.originalClassification.isVIP && error > 0) {
      this.priorityWeights.vipStatus += adjustment;
    }

    // Normalize weights to sum to 1
    this.normalizePriorityWeights();
  }

  private calculatePriorityError(predicted: string, actual: string): number {
    const priorityValues = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
    const predictedValue = priorityValues[predicted as keyof typeof priorityValues] || 2;
    const actualValue = priorityValues[actual as keyof typeof priorityValues] || 2;
    return (actualValue - predictedValue) / 4; // Normalize to -1 to 1
  }

  private normalizePriorityWeights(): void {
    const sum = Object.values(this.priorityWeights).reduce((a, b) => a + b, 0);

    Object.keys(this.priorityWeights).forEach(key => {
      (this.priorityWeights as any)[key] /= sum;
    });
  }

  private async adjustCategoryPatterns(learning: LearningData): Promise<void> {
    const correctCategory = learning.userFeedback?.correctValue?.category;
    if (!correctCategory) return;

    // Add or update pattern for correct category
    const hints = this.categoryPatterns.get(correctCategory) || {
      keywords: [],
      senderPatterns: [],
      subjectPatterns: [],
      bodyPatterns: [],
      weight: 0.5
    };

    // Increase weight for correct category
    hints.weight = Math.min(hints.weight + this.learningRate, 1.0);

    this.categoryPatterns.set(correctCategory, hints);
  }

  private async learnNewAction(learning: LearningData): Promise<void> {
    // Record that certain types of emails need specific actions
    const action = learning.userFeedback?.userAction;
    if (action) {
      // This would update action patterns
      LoggerService.debug('LearningSystem', `Learned new action pattern: ${action}`);
    }
  }

  private async reinforcePattern(learning: LearningData): Promise<void> {
    // Strengthen the patterns that led to correct classification
    const category = learning.originalClassification.category;
    const hints = this.categoryPatterns.get(category);

    if (hints) {
      hints.weight = Math.min(hints.weight + this.learningRate * 0.5, 1.0);
      this.categoryPatterns.set(category, hints);
    }
  }

  private async updateAccuracy(wasCorrect: boolean): Promise<void> {
    // Exponential moving average
    const alpha = 0.1; // Smoothing factor
    this.accuracy = alpha * (wasCorrect ? 1 : 0) + (1 - alpha) * this.accuracy;
  }

  async saveModel(): Promise<void> {
    const model = {
      patterns: Array.from(this.categoryPatterns.entries()),
      weights: this.priorityWeights,
      accuracy: this.accuracy
    };

    await CacheManager.set('learning_model', model, 3600); // Cache for 1 hour
  }

  getCategoryHints(category: string): CategoryHints | null {
    return this.categoryPatterns.get(category) || null;
  }

  getPriorityWeights(): PriorityFactors {
    return { ...this.priorityWeights };
  }

  getAccuracy(): number {
    return this.accuracy;
  }

  calculatePriorityScore(factors: Partial<PriorityFactors>): number {
    let score = 0;

    Object.entries(factors).forEach(([key, value]) => {
      const weight = (this.priorityWeights as any)[key] || 0;
      score += weight * (value || 0);
    });

    return Math.min(Math.max(score, 0), 100);
  }

  async getStatistics(): Promise<{
    totalExamples: number;
    accuracy: number;
    categoriesLearned: number;
    feedbackByType: Record<string, number>;
    learningTrend: Array<{ date: string; accuracy: number }>;
  }> {
    await this.ensureDataLoaded();

    const allLearning = await DatabaseService.find('Learning', {
      orderBy: { column: 'timestamp', direction: 'DESC' },
      limit: 500
    });

    const feedbackByType: Record<string, number> = {
      CORRECT: 0,
      WRONG_PRIORITY: 0,
      WRONG_CATEGORY: 0,
      WRONG_LABELS: 0,
      MISSING_ACTION: 0
    };

    const dailyAccuracy = new Map<string, { correct: number; total: number }>();

    allLearning.forEach(data => {
      const learning = this.deserializeLearningData(data);

      // Count feedback types
      if (learning.userFeedback) {
        feedbackByType[learning.userFeedback.feedbackType]++;
      } else {
        feedbackByType.CORRECT++;
      }

      // Track daily accuracy
      const date = learning.timestamp.toISOString().split('T')[0];
      if (!dailyAccuracy.has(date)) {
        dailyAccuracy.set(date, { correct: 0, total: 0 });
      }

      const dayStats = dailyAccuracy.get(date)!;
      dayStats.total++;

      if (!learning.userFeedback || learning.userFeedback.feedbackType === 'CORRECT') {
        dayStats.correct++;
      }
    });

    // Calculate trend
    const learningTrend = Array.from(dailyAccuracy.entries())
      .map(([date, stats]) => ({
        date,
        accuracy: stats.total > 0 ? (stats.correct / stats.total) * 100 : 0
      }))
      .slice(-30); // Last 30 days

    return {
      totalExamples: allLearning.length,
      accuracy: this.accuracy * 100,
      categoriesLearned: this.categoryPatterns.size,
      feedbackByType,
      learningTrend
    };
  }

  private deserializeLearningData(data: any): LearningData {
    return {
      emailId: data.emailId,
      originalClassification: JSON.parse(data.originalClassification),
      userFeedback: data.userFeedback ? JSON.parse(data.userFeedback) : undefined,
      userActions: [],
      outcome: data.applied ? 'SUCCESS' : 'CORRECTED',
      timestamp: new Date(data.timestamp)
    };
  }

  private initializeDefaultPatterns(): void {
    // Default category patterns
    const defaults = new Map<string, CategoryHints>([
      ['work', {
        keywords: ['project', 'meeting', 'deadline', 'report', 'task', 'team'],
        senderPatterns: ['@company.com', '@client.com'],
        subjectPatterns: [],
        bodyPatterns: [],
        weight: 0.8
      }],
      ['personal', {
        keywords: ['family', 'friend', 'weekend', 'dinner', 'birthday'],
        senderPatterns: ['@gmail.com', '@yahoo.com'],
        subjectPatterns: [],
        bodyPatterns: [],
        weight: 0.7
      }],
      ['finance', {
        keywords: ['invoice', 'payment', 'bill', 'receipt', 'transaction', 'account'],
        senderPatterns: ['@bank.com', '@paypal.com'],
        subjectPatterns: [],
        bodyPatterns: [],
        weight: 0.85
      }],
      ['newsletter', {
        keywords: ['unsubscribe', 'newsletter', 'update', 'digest', 'weekly'],
        senderPatterns: ['noreply@', 'newsletter@', 'notifications@'],
        subjectPatterns: [],
        bodyPatterns: [],
        weight: 0.9
      }]
    ]);

    this.categoryPatterns = defaults;
  }

  async suggestCategoryForEmail(
    subject: string,
    from: string,
    body: string
  ): Promise<{ category: string; confidence: number } | null> {
    await this.ensureDataLoaded();

    let bestMatch = { category: '', confidence: 0 };

    this.categoryPatterns.forEach((hints, category) => {
      let score = 0;
      let matches = 0;

      // Check keywords
      const emailText = `${subject} ${body}`.toLowerCase();
      hints.keywords.forEach(keyword => {
        if (emailText.includes(keyword.toLowerCase())) {
          score += 0.1;
          matches++;
        }
      });

      // Check sender patterns
      hints.senderPatterns.forEach(pattern => {
        if (from.toLowerCase().includes(pattern.toLowerCase())) {
          score += 0.2;
          matches++;
        }
      });

      // Apply pattern weight
      score *= hints.weight;

      if (score > bestMatch.confidence) {
        bestMatch = { category, confidence: Math.min(score, 0.95) };
      }
    });

    return bestMatch.confidence > 0.3 ? bestMatch : null;
  }
}

// Export singleton instance
export default LearningSystem.getInstance();