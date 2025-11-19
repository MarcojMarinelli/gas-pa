/**
 * Metrics Data Transformer
 * Transforms backend statistics to API DashboardMetrics format
 * Handles data aggregation and normalization
 */

import { DashboardMetrics } from '../../types/shared-models';
import { validate, dashboardMetricsSchema } from '../../types/validators';

/**
 * Backend Statistics interfaces
 */
export interface BackendEmailStats {
  totalEmails: number;
  totalProcessed: number;
  pendingActions: number;
  avgProcessingTime: number;
}

export interface BackendDailyStats {
  date: Date;
  emailCount: number;
  processedCount: number;
  pendingCount: number;
  avgTime: number;
}

/**
 * Metrics Transformer Class
 * Transforms backend stats to API metrics format
 */
export class MetricsTransformer {
  /**
   * Transform backend statistics to DashboardMetrics
   * @param currentStats - Current statistics
   * @param dailyStats - Array of daily statistics (last 7 days)
   */
  static toApiModel(
    currentStats: BackendEmailStats,
    dailyStats: BackendDailyStats[]
  ): DashboardMetrics {
    // Ensure we have exactly 7 days of data
    const normalizedDaily = this.normalizeDailyStats(dailyStats);

    const metrics: DashboardMetrics = {
      totalEmails: currentStats.totalEmails,
      processedToday: currentStats.totalProcessed,
      pendingActions: currentStats.pendingActions,
      avgProcessingTime: currentStats.avgProcessingTime,

      // Extract trend arrays from daily stats
      emailTrends: normalizedDaily.map(day => day.emailCount),
      processingTrends: normalizedDaily.map(day => day.processedCount),
      pendingTrends: normalizedDaily.map(day => day.pendingCount),
      timeTrends: normalizedDaily.map(day => day.avgTime),

      lastUpdated: new Date().toISOString()
    };

    // Validate transformed data
    return validate(dashboardMetricsSchema, metrics);
  }

  /**
   * Create DashboardMetrics from raw data
   * Helper for building metrics from individual components
   */
  static create(params: {
    totalEmails: number;
    processedToday: number;
    pendingActions: number;
    avgProcessingTime: number;
    emailTrends: number[];
    processingTrends: number[];
    pendingTrends: number[];
    timeTrends: number[];
  }): DashboardMetrics {
    const metrics: DashboardMetrics = {
      ...params,
      lastUpdated: new Date().toISOString()
    };

    return validate(dashboardMetricsSchema, metrics);
  }

  /**
   * Normalize daily stats to exactly 7 days
   * Fills missing days with zeros
   */
  private static normalizeDailyStats(
    stats: BackendDailyStats[]
  ): Array<{
    date: Date;
    emailCount: number;
    processedCount: number;
    pendingCount: number;
    avgTime: number;
  }> {
    const normalized = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Generate last 7 days
    for (let i = 6; i >= 0; i--) {
      const targetDate = new Date(today);
      targetDate.setDate(targetDate.getDate() - i);

      // Find stats for this date
      const dayStats = stats.find(s => {
        const statDate = new Date(s.date);
        statDate.setHours(0, 0, 0, 0);
        return statDate.getTime() === targetDate.getTime();
      });

      normalized.push({
        date: targetDate,
        emailCount: dayStats?.emailCount || 0,
        processedCount: dayStats?.processedCount || 0,
        pendingCount: dayStats?.pendingCount || 0,
        avgTime: dayStats?.avgTime || 0
      });
    }

    return normalized;
  }

  /**
   * Create empty metrics (all zeros)
   * Useful for initialization or error states
   */
  static createEmpty(): DashboardMetrics {
    return {
      totalEmails: 0,
      processedToday: 0,
      pendingActions: 0,
      avgProcessingTime: 0,
      emailTrends: [0, 0, 0, 0, 0, 0, 0],
      processingTrends: [0, 0, 0, 0, 0, 0, 0],
      pendingTrends: [0, 0, 0, 0, 0, 0, 0],
      timeTrends: [0, 0, 0, 0, 0, 0, 0],
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Calculate percentage change between two values
   * Used for metric cards
   */
  static calculateChange(current: number, previous: number): number {
    if (previous === 0) {
      return current > 0 ? 100 : 0;
    }
    return ((current - previous) / previous) * 100;
  }

  /**
   * Calculate trend direction from array
   * Returns 'up', 'down', or 'stable'
   */
  static calculateTrendDirection(
    trend: number[]
  ): 'up' | 'down' | 'stable' {
    if (trend.length < 2) return 'stable';

    const current = trend[trend.length - 1];
    const previous = trend[trend.length - 2];

    const change = this.calculateChange(current, previous);

    if (Math.abs(change) < 5) return 'stable'; // Less than 5% change
    return change > 0 ? 'up' : 'down';
  }

  /**
   * Get summary statistics from trends
   */
  static getTrendSummary(trend: number[]): {
    min: number;
    max: number;
    avg: number;
    latest: number;
    change: number;
    direction: 'up' | 'down' | 'stable';
  } {
    if (trend.length === 0) {
      return {
        min: 0,
        max: 0,
        avg: 0,
        latest: 0,
        change: 0,
        direction: 'stable'
      };
    }

    const min = Math.min(...trend);
    const max = Math.max(...trend);
    const avg = trend.reduce((sum, val) => sum + val, 0) / trend.length;
    const latest = trend[trend.length - 1];
    const previous = trend.length > 1 ? trend[trend.length - 2] : latest;
    const change = this.calculateChange(latest, previous);
    const direction = this.calculateTrendDirection(trend);

    return { min, max, avg, latest, change, direction };
  }

  /**
   * Validate metrics without transformation
   */
  static validateMetrics(metrics: unknown): DashboardMetrics {
    return validate(dashboardMetricsSchema, metrics);
  }

  /**
   * Merge multiple metrics (useful for combining different sources)
   */
  static merge(
    metrics1: DashboardMetrics,
    metrics2: DashboardMetrics
  ): DashboardMetrics {
    return {
      totalEmails: metrics1.totalEmails + metrics2.totalEmails,
      processedToday: metrics1.processedToday + metrics2.processedToday,
      pendingActions: metrics1.pendingActions + metrics2.pendingActions,
      avgProcessingTime: (metrics1.avgProcessingTime + metrics2.avgProcessingTime) / 2,

      emailTrends: metrics1.emailTrends.map((val, i) => val + metrics2.emailTrends[i]),
      processingTrends: metrics1.processingTrends.map((val, i) => val + metrics2.processingTrends[i]),
      pendingTrends: metrics1.pendingTrends.map((val, i) => val + metrics2.pendingTrends[i]),
      timeTrends: metrics1.timeTrends.map((val, i) => (val + metrics2.timeTrends[i]) / 2),

      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Create mock metrics for testing
   */
  static createMock(overrides?: Partial<DashboardMetrics>): DashboardMetrics {
    const base: DashboardMetrics = {
      totalEmails: Math.floor(Math.random() * 10000) + 1000,
      processedToday: Math.floor(Math.random() * 500) + 50,
      pendingActions: Math.floor(Math.random() * 100) + 10,
      avgProcessingTime: Math.random() * 10 + 2,

      emailTrends: Array.from({ length: 7 }, () => Math.random() * 100),
      processingTrends: Array.from({ length: 7 }, () => Math.random() * 50),
      pendingTrends: Array.from({ length: 7 }, () => Math.random() * 20),
      timeTrends: Array.from({ length: 7 }, () => Math.random() * 15),

      lastUpdated: new Date().toISOString()
    };

    return { ...base, ...overrides };
  }
}

/**
 * Convenience export
 */
export const metricsTransformer = MetricsTransformer;
