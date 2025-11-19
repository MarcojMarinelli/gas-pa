/**
 * Metrics Handler
 * Provides dashboard metrics with intelligent caching
 */

import { ApiRequest } from '../types/api-types';
import { DashboardMetrics } from '../../types/shared-models';
import { MetricsTransformer, BackendEmailStats, BackendDailyStats } from '../transformers/metrics';
import { validate, dashboardMetricsSchema } from '../../types/validators';
import Logger from '../../core/logger';

/**
 * Backend Service Interface
 * Abstraction layer for backend services
 */
export interface BackendMetricsService {
  getTotalEmails(): Promise<number>;
  getProcessedToday(): Promise<number>;
  getPendingActions(): Promise<number>;
  getAvgProcessingTime(): Promise<number>;
  getDailyStats(days: number): Promise<BackendDailyStats[]>;
}

/**
 * Metrics Cache Service
 */
class MetricsCacheService {
  private static readonly CACHE_PREFIX = 'metrics:';
  private static readonly CACHE_TTL = 300; // 5 minutes in seconds
  private static cache: GoogleAppsScript.Cache.Cache;

  /**
   * Get cache instance
   */
  private static getCache(): GoogleAppsScript.Cache.Cache {
    if (!this.cache) {
      this.cache = CacheService.getScriptCache()!;
    }
    return this.cache;
  }

  /**
   * Get cached metrics for user
   */
  static get(userId: string): DashboardMetrics | null {
    const cache = this.getCache();
    const key = `${this.CACHE_PREFIX}${userId}`;
    const cached = cache.get(key);

    if (!cached) {
      Logger.debug('MetricsCache', 'Cache miss', { userId });
      return null;
    }

    try {
      const metrics = JSON.parse(cached);
      Logger.debug('MetricsCache', 'Cache hit', { userId });
      return metrics;
    } catch (error) {
      Logger.error('MetricsCache', 'Failed to parse cached metrics', error);
      return null;
    }
  }

  /**
   * Cache metrics for user
   */
  static set(userId: string, metrics: DashboardMetrics): void {
    const cache = this.getCache();
    const key = `${this.CACHE_PREFIX}${userId}`;

    try {
      cache.put(key, JSON.stringify(metrics), this.CACHE_TTL);
      Logger.debug('MetricsCache', 'Metrics cached', {
        userId,
        ttl: this.CACHE_TTL
      });
    } catch (error) {
      Logger.error('MetricsCache', 'Failed to cache metrics', error);
    }
  }

  /**
   * Clear cache for user
   */
  static clear(userId: string): void {
    const cache = this.getCache();
    const key = `${this.CACHE_PREFIX}${userId}`;
    cache.remove(key);

    Logger.info('MetricsCache', 'Cache cleared', { userId });
  }

  /**
   * Clear all metrics cache
   */
  static clearAll(): void {
    // GAS Cache doesn't support pattern-based deletion
    // This would need to track all user IDs separately
    Logger.info('MetricsCache', 'Cache clear all requested');
  }
}

/**
 * Metrics Handler Class
 */
export class MetricsHandler {
  private backendService: BackendMetricsService;

  constructor(backendService: BackendMetricsService) {
    this.backendService = backendService;
  }

  /**
   * Get dashboard metrics (with caching)
   */
  async getMetrics(request: ApiRequest): Promise<DashboardMetrics> {
    const userId = request.user || 'anonymous';

    try {
      // Check cache first
      const cached = MetricsCacheService.get(userId);
      if (cached) {
        Logger.info('Metrics', 'Returning cached metrics', { userId });
        return cached;
      }

      // Compute fresh metrics
      Logger.info('Metrics', 'Computing fresh metrics', { userId });
      const startTime = Date.now();

      const metrics = await this.computeMetrics();

      const duration = Date.now() - startTime;
      Logger.info('Metrics', 'Metrics computed', {
        userId,
        duration,
        totalEmails: metrics.totalEmails
      });

      // Cache the result
      MetricsCacheService.set(userId, metrics);

      return metrics;
    } catch (error) {
      Logger.error('Metrics', 'Failed to get metrics', error);

      // Return empty metrics on error (graceful degradation)
      return this.getEmptyMetrics(error as Error);
    }
  }

  /**
   * Compute fresh metrics
   */
  private async computeMetrics(): Promise<DashboardMetrics> {
    try {
      // Get all data in parallel for performance
      const [
        totalEmails,
        processedToday,
        pendingActions,
        avgProcessingTime,
        dailyStats
      ] = await Promise.all([
        this.backendService.getTotalEmails().catch(err => {
          Logger.warn('Metrics', 'Failed to get total emails', err);
          return 0;
        }),
        this.backendService.getProcessedToday().catch(err => {
          Logger.warn('Metrics', 'Failed to get processed today', err);
          return 0;
        }),
        this.backendService.getPendingActions().catch(err => {
          Logger.warn('Metrics', 'Failed to get pending actions', err);
          return 0;
        }),
        this.backendService.getAvgProcessingTime().catch(err => {
          Logger.warn('Metrics', 'Failed to get avg processing time', err);
          return 0;
        }),
        this.backendService.getDailyStats(7).catch(err => {
          Logger.warn('Metrics', 'Failed to get daily stats', err);
          return [];
        })
      ]);

      // Build current stats
      const currentStats: BackendEmailStats = {
        totalEmails,
        totalProcessed: processedToday,
        pendingActions,
        avgProcessingTime
      };

      // Transform to API format
      const metrics = MetricsTransformer.toApiModel(currentStats, dailyStats);

      // Validate before returning
      validate(dashboardMetricsSchema, metrics);

      return metrics;
    } catch (error) {
      Logger.error('Metrics', 'Failed to compute metrics', error);
      throw error;
    }
  }

  /**
   * Get empty metrics (fallback)
   */
  private getEmptyMetrics(error?: Error): DashboardMetrics {
    Logger.warn('Metrics', 'Returning empty metrics', {
      error: error?.message
    });

    return MetricsTransformer.createEmpty();
  }

  /**
   * Refresh metrics (clear cache and recompute)
   */
  async refreshMetrics(request: ApiRequest): Promise<{
    message: string;
    metrics: DashboardMetrics;
  }> {
    const userId = request.user || 'anonymous';

    Logger.info('Metrics', 'Refresh requested', { userId });

    // Clear cache
    MetricsCacheService.clear(userId);

    // Compute fresh metrics
    const metrics = await this.getMetrics(request);

    return {
      message: 'Metrics refreshed successfully',
      metrics
    };
  }

  /**
   * Get metrics status
   */
  async getStatus(request: ApiRequest): Promise<{
    cached: boolean;
    cacheAge?: number;
    lastUpdated?: string;
  }> {
    const userId = request.user || 'anonymous';
    const cached = MetricsCacheService.get(userId);

    if (cached) {
      const cacheAge = cached.lastUpdated
        ? Date.now() - new Date(cached.lastUpdated).getTime()
        : undefined;

      return {
        cached: true,
        cacheAge,
        lastUpdated: cached.lastUpdated
      };
    }

    return {
      cached: false
    };
  }
}

/**
 * Mock Backend Service
 * For testing and development before backend integration
 */
export class MockBackendMetricsService implements BackendMetricsService {
  async getTotalEmails(): Promise<number> {
    // Simulate API call delay
    Utilities.sleep(100);

    // Return mock data
    return Math.floor(Math.random() * 10000) + 1000;
  }

  async getProcessedToday(): Promise<number> {
    Utilities.sleep(100);
    return Math.floor(Math.random() * 500) + 50;
  }

  async getPendingActions(): Promise<number> {
    Utilities.sleep(100);
    return Math.floor(Math.random() * 100) + 10;
  }

  async getAvgProcessingTime(): Promise<number> {
    Utilities.sleep(100);
    return Math.random() * 10 + 2;
  }

  async getDailyStats(days: number): Promise<BackendDailyStats[]> {
    Utilities.sleep(150);

    const stats: BackendDailyStats[] = [];
    const today = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      stats.push({
        date,
        emailCount: Math.floor(Math.random() * 100) + 50,
        processedCount: Math.floor(Math.random() * 50) + 10,
        pendingCount: Math.floor(Math.random() * 20) + 5,
        avgTime: Math.random() * 15 + 2
      });
    }

    return stats;
  }
}

/**
 * GAS Backend Service
 * Real integration with Google Apps Script services
 */
export class GASBackendMetricsService implements BackendMetricsService {
  /**
   * Get total emails with PA-Processed label
   */
  async getTotalEmails(): Promise<number> {
    try {
      console.log('[GASBackend] Getting total emails...');
      const label = GmailApp.getUserLabelByName('PA-Processed');
      if (!label) {
        console.warn('[GASBackend] PA-Processed label not found!');
        Logger.warn('GASBackend', 'PA-Processed label not found');
        return 0;
      }

      console.log('[GASBackend] PA-Processed label found, searching threads...');

      // Get thread count (approximation using search)
      let count = 0;
      let start = 0;
      const batchSize = 500;
      const maxIterations = 20; // Limit to 10,000 threads to avoid quota

      while (start < batchSize * maxIterations) {
        const threads = GmailApp.search('label:PA-Processed', start, batchSize);

        if (threads.length === 0) break;

        count += threads.length;

        if (threads.length < batchSize) break;

        start += batchSize;
      }

      console.log('[GASBackend] Total emails counted:', count);
      Logger.debug('GASBackend', 'Total emails counted', { count });
      return count;
    } catch (error) {
      console.error('[GASBackend] Failed to get total emails:', error);
      Logger.error('GASBackend', 'Failed to get total emails', error);
      return 0;
    }
  }

  /**
   * Get emails processed today
   */
  async getProcessedToday(): Promise<number> {
    try {
      // Search for emails processed today
      const today = new Date();
      const todayStr = Utilities.formatDate(today, Session.getScriptTimeZone(), 'yyyy/MM/dd');

      console.log('[GASBackend] Getting processed today with query:', `label:PA-Processed after:${todayStr}`);
      const threads = GmailApp.search(`label:PA-Processed after:${todayStr}`, 0, 500);

      console.log('[GASBackend] Processed today counted:', threads.length);
      Logger.debug('GASBackend', 'Processed today counted', {
        count: threads.length
      });

      return threads.length;
    } catch (error) {
      console.error('[GASBackend] Failed to get processed today:', error);
      Logger.error('GASBackend', 'Failed to get processed today', error);
      return 0;
    }
  }

  /**
   * Get pending action items
   */
  async getPendingActions(): Promise<number> {
    try {
      console.log('[GASBackend] Getting pending actions...');
      const actionLabel = GmailApp.getUserLabelByName('PA-ActionRequired');
      if (!actionLabel) {
        console.warn('[GASBackend] PA-ActionRequired label not found!');
        Logger.warn('GASBackend', 'PA-ActionRequired label not found');
        return 0;
      }

      console.log('[GASBackend] PA-ActionRequired label found, searching threads...');
      const threads = GmailApp.search('label:PA-ActionRequired is:unread', 0, 500);

      console.log('[GASBackend] Pending actions counted:', threads.length);
      Logger.debug('GASBackend', 'Pending actions counted', {
        count: threads.length
      });

      return threads.length;
    } catch (error) {
      console.error('[GASBackend] Failed to get pending actions:', error);
      Logger.error('GASBackend', 'Failed to get pending actions', error);
      return 0;
    }
  }

  /**
   * Get average processing time
   * Note: This requires storing processing times somewhere (e.g., Sheets)
   * For now, returning a placeholder
   */
  async getAvgProcessingTime(): Promise<number> {
    try {
      // This would need to be implemented based on your data storage
      // For now, return a reasonable default
      Logger.debug('GASBackend', 'Avg processing time placeholder');
      return 3.5; // Placeholder: 3.5 seconds
    } catch (error) {
      Logger.error('GASBackend', 'Failed to get avg processing time', error);
      return 0;
    }
  }

  /**
   * Get daily statistics for last N days
   * Note: This requires a statistics sheet or similar storage
   */
  async getDailyStats(days: number): Promise<BackendDailyStats[]> {
    try {
      const stats: BackendDailyStats[] = [];
      const today = new Date();

      // For now, generate placeholder data
      // In production, this would read from a statistics sheet
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);

        const nextDay = new Date(date);
        nextDay.setDate(nextDay.getDate() + 1);

        // Get emails for this day
        const dateStr = Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy/MM/dd');
        const nextDateStr = Utilities.formatDate(nextDay, Session.getScriptTimeZone(), 'yyyy/MM/dd');

        const dayThreads = GmailApp.search(
          `label:PA-Processed after:${dateStr} before:${nextDateStr}`,
          0,
          100
        );

        stats.push({
          date,
          emailCount: dayThreads.length,
          processedCount: dayThreads.length, // Simplified
          pendingCount: 0, // Would need separate tracking
          avgTime: 3.5 // Placeholder
        });
      }

      Logger.debug('GASBackend', 'Daily stats computed', {
        days,
        statsCount: stats.length
      });

      return stats;
    } catch (error) {
      Logger.error('GASBackend', 'Failed to get daily stats', error);
      return [];
    }
  }
}

/**
 * Factory function to create metrics handler
 */
export function createMetricsHandler(useMock: boolean = false): MetricsHandler {
  const backendService = useMock
    ? new MockBackendMetricsService()
    : new GASBackendMetricsService();

  return new MetricsHandler(backendService);
}

/**
 * Default handler instance (using real Gmail data)
 * Set to true for mock data during development
 */
export const metricsHandler = createMetricsHandler(false); // Now using real Gmail data!
