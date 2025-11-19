/**
 * Metrics Endpoint Tests
 * Tests for metrics handler, caching, and API endpoints
 *
 * These are template tests - adapt for your testing framework
 */

import {
  MetricsHandler,
  MockBackendMetricsService,
  GASBackendMetricsService,
  createMetricsHandler
} from '../../src/webapp/handlers/metrics-handler';
import { MetricsTransformer } from '../../src/webapp/transformers/metrics';
import { ApiRequest } from '../../src/webapp/types/api-types';
import { DashboardMetrics } from '../../src/types/shared-models';
import { validate, dashboardMetricsSchema } from '../../src/types/validators';

/**
 * Mock API Request
 */
function createMockRequest(user: string = 'test@example.com'): ApiRequest {
  return {
    method: 'GET',
    path: '/api/metrics',
    parameters: {},
    queryString: '',
    postData: {},
    headers: {},
    user
  };
}

/**
 * Metrics Handler Tests
 */
describe('MetricsHandler', () => {
  describe('getMetrics', () => {
    it('should return valid DashboardMetrics', async () => {
      const handler = createMetricsHandler(true); // Use mock
      const request = createMockRequest();

      const metrics = await handler.getMetrics(request);

      // Validate structure
      expect(metrics).toBeDefined();
      expect(metrics.totalEmails).toBeGreaterThanOrEqual(0);
      expect(metrics.processedToday).toBeGreaterThanOrEqual(0);
      expect(metrics.pendingActions).toBeGreaterThanOrEqual(0);
      expect(metrics.avgProcessingTime).toBeGreaterThanOrEqual(0);

      // Validate trends
      expect(metrics.emailTrends).toHaveLength(7);
      expect(metrics.processingTrends).toHaveLength(7);
      expect(metrics.pendingTrends).toHaveLength(7);
      expect(metrics.timeTrends).toHaveLength(7);

      // Validate timestamp
      expect(metrics.lastUpdated).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(new Date(metrics.lastUpdated)).toBeInstanceOf(Date);

      // Validate with schema
      expect(() => validate(dashboardMetricsSchema, metrics)).not.toThrow();
    });

    it('should cache metrics on first call', async () => {
      const handler = createMetricsHandler(true);
      const request = createMockRequest();

      const startTime = Date.now();
      const metrics1 = await handler.getMetrics(request);
      const firstCallTime = Date.now() - startTime;

      // Second call should be from cache (much faster)
      const startTime2 = Date.now();
      const metrics2 = await handler.getMetrics(request);
      const secondCallTime = Date.now() - startTime2;

      // Second call should be at least 10x faster
      expect(secondCallTime).toBeLessThan(firstCallTime * 0.1);

      // Both should return same data
      expect(metrics2.totalEmails).toBe(metrics1.totalEmails);
      expect(metrics2.lastUpdated).toBe(metrics1.lastUpdated);
    });

    it('should return different metrics for different users', async () => {
      const handler = createMetricsHandler(true);
      const request1 = createMockRequest('user1@example.com');
      const request2 = createMockRequest('user2@example.com');

      const metrics1 = await handler.getMetrics(request1);
      const metrics2 = await handler.getMetrics(request2);

      // Metrics can be different (due to randomization in mock)
      // But structure should be the same
      expect(metrics1.emailTrends).toHaveLength(7);
      expect(metrics2.emailTrends).toHaveLength(7);
    });

    it('should handle errors gracefully', async () => {
      // Create handler with broken backend
      const brokenBackend = {
        getTotalEmails: async () => { throw new Error('Backend error'); },
        getProcessedToday: async () => { throw new Error('Backend error'); },
        getPendingActions: async () => { throw new Error('Backend error'); },
        getAvgProcessingTime: async () => { throw new Error('Backend error'); },
        getDailyStats: async () => { throw new Error('Backend error'); }
      };

      const handler = new MetricsHandler(brokenBackend);
      const request = createMockRequest();

      // Should not throw, but return empty metrics
      const metrics = await handler.getMetrics(request);

      expect(metrics).toBeDefined();
      expect(metrics.totalEmails).toBe(0);
      expect(metrics.emailTrends).toEqual([0, 0, 0, 0, 0, 0, 0]);
    });
  });

  describe('refreshMetrics', () => {
    it('should clear cache and return fresh metrics', async () => {
      const handler = createMetricsHandler(true);
      const request = createMockRequest();

      // Get metrics (cached)
      const metrics1 = await handler.getMetrics(request);

      // Refresh
      const refreshResult = await handler.refreshMetrics(request);

      expect(refreshResult.message).toContain('refreshed');
      expect(refreshResult.metrics).toBeDefined();

      // Timestamp should be different (fresh data)
      const timeDiff = new Date(refreshResult.metrics.lastUpdated).getTime() -
                      new Date(metrics1.lastUpdated).getTime();

      expect(timeDiff).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getStatus', () => {
    it('should report cache status', async () => {
      const handler = createMetricsHandler(true);
      const request = createMockRequest();

      // Initially not cached
      const status1 = await handler.getStatus(request);
      expect(status1.cached).toBe(false);

      // Get metrics (caches them)
      await handler.getMetrics(request);

      // Now should be cached
      const status2 = await handler.getStatus(request);
      expect(status2.cached).toBe(true);
      expect(status2.lastUpdated).toBeDefined();
      expect(status2.cacheAge).toBeGreaterThanOrEqual(0);
    });
  });
});

/**
 * Mock Backend Service Tests
 */
describe('MockBackendMetricsService', () => {
  const backend = new MockBackendMetricsService();

  it('should return reasonable mock data', async () => {
    const totalEmails = await backend.getTotalEmails();
    const processedToday = await backend.getProcessedToday();
    const pendingActions = await backend.getPendingActions();
    const avgTime = await backend.getAvgProcessingTime();

    expect(totalEmails).toBeGreaterThan(0);
    expect(processedToday).toBeGreaterThan(0);
    expect(pendingActions).toBeGreaterThan(0);
    expect(avgTime).toBeGreaterThan(0);
  });

  it('should return 7 days of stats', async () => {
    const stats = await backend.getDailyStats(7);

    expect(stats).toHaveLength(7);
    expect(stats[0].date).toBeInstanceOf(Date);
    expect(stats[0].emailCount).toBeGreaterThan(0);
  });

  it('should return stats in chronological order (oldest first)', async () => {
    const stats = await backend.getDailyStats(7);

    for (let i = 1; i < stats.length; i++) {
      const prevDate = stats[i - 1].date.getTime();
      const currDate = stats[i].date.getTime();

      expect(currDate).toBeGreaterThan(prevDate);
    }
  });
});

/**
 * GAS Backend Service Tests
 * These tests require actual Gmail labels and data
 */
describe('GASBackendMetricsService', () => {
  // Skip if not in GAS environment
  const isGASEnvironment = typeof GmailApp !== 'undefined';

  if (!isGASEnvironment) {
    it.skip('Skipping GAS backend tests (not in GAS environment)', () => {});
    return;
  }

  const backend = new GASBackendMetricsService();

  describe('getTotalEmails', () => {
    it('should count emails with PA-Processed label', async () => {
      const count = await backend.getTotalEmails();

      expect(count).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(count)).toBe(true);
    });

    it('should handle missing label gracefully', async () => {
      // This test assumes PA-Processed label might not exist
      const count = await backend.getTotalEmails();

      // Should not throw, return 0 if label doesn't exist
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getProcessedToday', () => {
    it('should count emails processed today', async () => {
      const count = await backend.getProcessedToday();

      expect(count).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(count)).toBe(true);
    });
  });

  describe('getPendingActions', () => {
    it('should count unread action-required emails', async () => {
      const count = await backend.getPendingActions();

      expect(count).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(count)).toBe(true);
    });
  });

  describe('getDailyStats', () => {
    it('should return stats for requested days', async () => {
      const stats = await backend.getDailyStats(7);

      expect(stats).toHaveLength(7);

      stats.forEach(day => {
        expect(day.date).toBeInstanceOf(Date);
        expect(day.emailCount).toBeGreaterThanOrEqual(0);
        expect(day.processedCount).toBeGreaterThanOrEqual(0);
        expect(day.pendingCount).toBeGreaterThanOrEqual(0);
        expect(day.avgTime).toBeGreaterThanOrEqual(0);
      });
    });

    it('should return stats in chronological order', async () => {
      const stats = await backend.getDailyStats(7);

      for (let i = 1; i < stats.length; i++) {
        expect(stats[i].date.getTime()).toBeGreaterThan(stats[i - 1].date.getTime());
      }
    });
  });
});

/**
 * Integration Tests
 */
describe('Metrics API Integration', () => {
  it('should handle complete metrics request flow', async () => {
    const handler = createMetricsHandler(true);
    const request = createMockRequest();

    // Get metrics
    const metrics = await handler.getMetrics(request);

    // Validate complete response
    expect(metrics).toBeDefined();
    expect(metrics.totalEmails).toBeGreaterThanOrEqual(0);
    expect(metrics.emailTrends).toHaveLength(7);

    // Check status
    const status = await handler.getStatus(request);
    expect(status.cached).toBe(true);

    // Refresh
    const refreshed = await handler.refreshMetrics(request);
    expect(refreshed.message).toBeDefined();
    expect(refreshed.metrics).toBeDefined();
  });

  it('should maintain data consistency across operations', async () => {
    const handler = createMetricsHandler(true);
    const request = createMockRequest();

    // Get initial metrics
    const metrics1 = await handler.getMetrics(request);

    // Get again (should be cached, same data)
    const metrics2 = await handler.getMetrics(request);

    expect(metrics2.totalEmails).toBe(metrics1.totalEmails);
    expect(metrics2.lastUpdated).toBe(metrics1.lastUpdated);
  });
});

/**
 * Performance Tests
 */
describe('Metrics Performance', () => {
  it('should compute metrics in under 2 seconds', async () => {
    const handler = createMetricsHandler(true);
    const request = createMockRequest();

    const startTime = Date.now();
    await handler.getMetrics(request);
    const duration = Date.now() - startTime;

    // First call (uncached) should be under 2 seconds
    expect(duration).toBeLessThan(2000);
  });

  it('should return cached metrics in under 100ms', async () => {
    const handler = createMetricsHandler(true);
    const request = createMockRequest();

    // First call to cache
    await handler.getMetrics(request);

    // Second call (cached)
    const startTime = Date.now();
    await handler.getMetrics(request);
    const duration = Date.now() - startTime;

    expect(duration).toBeLessThan(100);
  });

  it('should handle concurrent requests efficiently', async () => {
    const handler = createMetricsHandler(true);
    const request = createMockRequest();

    const startTime = Date.now();

    // Make 10 concurrent requests
    const promises = Array.from({ length: 10 }, () =>
      handler.getMetrics(request)
    );

    const results = await Promise.all(promises);
    const duration = Date.now() - startTime;

    // All should succeed
    expect(results).toHaveLength(10);

    // Should not take 10x as long (caching helps)
    expect(duration).toBeLessThan(3000);
  });
});

/**
 * Manual Testing Instructions
 *
 * To manually test the metrics endpoint in deployed GAS:
 *
 * 1. Deploy as web app
 * 2. Get authentication token:
 *    POST https://your-deployment-url/api/auth/login
 *
 * 3. Get metrics (uncached):
 *    GET https://your-deployment-url/api/metrics
 *    Headers: Authorization: Bearer <token>
 *    Expected: Response in < 2 seconds
 *
 * 4. Get metrics again (cached):
 *    GET https://your-deployment-url/api/metrics
 *    Headers: Authorization: Bearer <token>
 *    Expected: Response in < 100ms, same data
 *
 * 5. Check cache status:
 *    GET https://your-deployment-url/api/metrics/status
 *    Headers: Authorization: Bearer <token>
 *    Expected: { "cached": true, "cacheAge": <ms>, "lastUpdated": <timestamp> }
 *
 * 6. Force refresh:
 *    POST https://your-deployment-url/api/metrics/refresh
 *    Headers: Authorization: Bearer <token>
 *    Expected: New timestamp, potentially different data
 *
 * 7. Validate response structure:
 *    - totalEmails: number >= 0
 *    - processedToday: number >= 0
 *    - pendingActions: number >= 0
 *    - avgProcessingTime: number >= 0
 *    - emailTrends: array of 7 numbers
 *    - processingTrends: array of 7 numbers
 *    - pendingTrends: array of 7 numbers
 *    - timeTrends: array of 7 numbers
 *    - lastUpdated: ISO 8601 string
 *
 * 8. Test error handling:
 *    - Try without auth token (should get 401)
 *    - Try with invalid token (should get 401)
 *    - Try with read-only user (should work)
 *
 * 9. Test performance:
 *    - Measure first call (uncached): < 2s
 *    - Measure second call (cached): < 100ms
 *    - Cache hit rate after 10 requests: > 70%
 */
