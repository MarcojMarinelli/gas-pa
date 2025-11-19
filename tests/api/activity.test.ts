/**
 * Activity & Audit Log Endpoint Tests
 * Tests for activity handler, filtering, and audit retrieval
 *
 * These are template tests - adapt for your testing framework
 */

import {
  ActivityHandler,
  MockBackendActivityService,
  createActivityHandler,
  ActivityFilter
} from '../../src/webapp/handlers/activity-handler';
import { ApiRequest } from '../../src/webapp/types/api-types';
import { ActivityLogEntry } from '../../src/types/shared-models';

/**
 * Mock API Request
 */
function createMockRequest(
  user: string = 'test@example.com',
  pathParams: Record<string, string> = {},
  parameters: Record<string, string> = {}
): ApiRequest {
  return {
    method: 'GET',
    path: '/api/activity',
    parameters,
    pathParams,
    queryString: '',
    postData: {},
    headers: {},
    user
  };
}

/**
 * Activity Handler Tests
 */
describe('ActivityHandler', () => {
  describe('getActivityLogs', () => {
    it('should get activity logs with default pagination', async () => {
      const handler = createActivityHandler(true); // Use mock
      const request = createMockRequest();

      const response = await handler.getActivityLogs(request);

      // Validate structure
      expect(response).toBeDefined();
      expect(Array.isArray(response.logs)).toBe(true);
      expect(typeof response.total).toBe('number');
      expect(response.page).toBe(1);
      expect(response.pageSize).toBe(50); // Default page size
      expect(typeof response.hasMore).toBe('boolean');

      // Validate logs
      response.logs.forEach(log => {
        expect(log.id).toBeDefined();
        expect(log.queueItemId).toBeDefined();
        expect(log.action).toBeDefined();
        expect(log.performedBy).toBeDefined();
        expect(log.timestamp).toBeDefined();
        expect(new Date(log.timestamp)).toBeInstanceOf(Date);
      });
    });

    it('should support custom pagination', async () => {
      const handler = createActivityHandler(true);
      const request = createMockRequest('user@example.com', {}, {
        page: '2',
        pageSize: '10'
      });

      const response = await handler.getActivityLogs(request);

      expect(response.page).toBe(2);
      expect(response.pageSize).toBe(10);
      expect(response.logs.length).toBeLessThanOrEqual(10);
    });

    it('should enforce max page size limit (200)', async () => {
      const handler = createActivityHandler(true);
      const request = createMockRequest('user@example.com', {}, {
        pageSize: '500' // Try to exceed max
      });

      const response = await handler.getActivityLogs(request);

      expect(response.pageSize).toBe(200); // Capped at max
    });

    it('should filter by queue item ID', async () => {
      const handler = createActivityHandler(true);
      const request = createMockRequest('user@example.com', {}, {
        queueItemId: 'queue-1'
      });

      const response = await handler.getActivityLogs(request);

      // All logs should be for queue-1
      response.logs.forEach(log => {
        expect(log.queueItemId).toBe('queue-1');
      });
    });

    it('should filter by user', async () => {
      const handler = createActivityHandler(true);
      const request = createMockRequest('user@example.com', {}, {
        user: 'user1@example.com'
      });

      const response = await handler.getActivityLogs(request);

      // All logs should be by user1
      response.logs.forEach(log => {
        expect(log.performedBy).toBe('user1@example.com');
      });
    });

    it('should filter by action types', async () => {
      const handler = createActivityHandler(true);
      const request = createMockRequest('user@example.com', {}, {
        action: 'created,updated'
      });

      const response = await handler.getActivityLogs(request);

      // All logs should be created or updated actions
      response.logs.forEach(log => {
        expect(['created', 'updated']).toContain(log.action);
      });
    });

    it('should filter by date range', async () => {
      const handler = createActivityHandler(true);

      const now = new Date();
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const request = createMockRequest('user@example.com', {}, {
        dateFrom: yesterday.toISOString().split('T')[0],
        dateTo: tomorrow.toISOString().split('T')[0]
      });

      const response = await handler.getActivityLogs(request);

      // All logs should be within date range
      response.logs.forEach(log => {
        const logDate = new Date(log.timestamp);
        expect(logDate >= yesterday && logDate <= tomorrow).toBe(true);
      });
    });

    it('should filter by success status', async () => {
      const handler = createActivityHandler(true);
      const request = createMockRequest('user@example.com', {}, {
        success: 'false' // Only failed requests
      });

      const response = await handler.getActivityLogs(request);

      // All logs should have errors/failures
      response.logs.forEach(log => {
        expect(log.comment).toBeDefined();
        expect(log.comment).toContain('failed');
      });
    });

    it('should combine multiple filters', async () => {
      const handler = createActivityHandler(true);
      const request = createMockRequest('user@example.com', {}, {
        queueItemId: 'queue-1',
        action: 'updated,snoozed',
        user: 'user1@example.com'
      });

      const response = await handler.getActivityLogs(request);

      // All logs should match all filters
      response.logs.forEach(log => {
        expect(log.queueItemId).toBe('queue-1');
        expect(['updated', 'snoozed']).toContain(log.action);
        expect(log.performedBy).toBe('user1@example.com');
      });
    });

    it('should calculate hasMore flag correctly', async () => {
      const handler = createActivityHandler(true);

      // Request with small page size
      const request = createMockRequest('user@example.com', {}, {
        pageSize: '5'
      });

      const response = await handler.getActivityLogs(request);

      // If total > pageSize, hasMore should be true
      if (response.total > 5) {
        expect(response.hasMore).toBe(true);
      } else {
        expect(response.hasMore).toBe(false);
      }
    });
  });

  describe('getLogsForItem', () => {
    it('should get logs for specific queue item', async () => {
      const handler = createActivityHandler(true);
      const request = createMockRequest('user@example.com', { id: 'queue-1' });

      const response = await handler.getLogsForItem(request);

      expect(response).toBeDefined();
      expect(Array.isArray(response.logs)).toBe(true);

      // All logs should be for queue-1
      response.logs.forEach(log => {
        expect(log.queueItemId).toBe('queue-1');
      });
    });

    it('should support custom limit', async () => {
      const handler = createActivityHandler(true);
      const request = createMockRequest(
        'user@example.com',
        { id: 'queue-1' },
        { limit: '5' }
      );

      const response = await handler.getLogsForItem(request);

      expect(response.logs.length).toBeLessThanOrEqual(5);
    });

    it('should throw error for missing item ID', async () => {
      const handler = createActivityHandler(true);
      const request = createMockRequest('user@example.com', {}); // No id

      await expect(handler.getLogsForItem(request)).rejects.toThrow('Missing queue item ID');
    });

    it('should return empty array for non-existent item', async () => {
      const handler = createActivityHandler(true);
      const request = createMockRequest('user@example.com', { id: 'non-existent-queue' });

      const response = await handler.getLogsForItem(request);

      expect(response.logs).toEqual([]);
    });
  });

  describe('getLogsForUser', () => {
    it('should get logs for current user', async () => {
      const handler = createActivityHandler(true);
      const request = createMockRequest('user1@example.com');

      const response = await handler.getLogsForUser(request);

      expect(response).toBeDefined();
      expect(Array.isArray(response.logs)).toBe(true);

      // All logs should be by user1@example.com
      response.logs.forEach(log => {
        expect(log.performedBy).toBe('user1@example.com');
      });
    });

    it('should support custom limit', async () => {
      const handler = createActivityHandler(true);
      const request = createMockRequest('user1@example.com', {}, { limit: '10' });

      const response = await handler.getLogsForUser(request);

      expect(response.logs.length).toBeLessThanOrEqual(10);
    });

    it('should throw error for missing user', async () => {
      const handler = createActivityHandler(true);
      const request = createMockRequest(''); // Empty user

      await expect(handler.getLogsForUser(request)).rejects.toThrow('User required');
    });
  });

  describe('getSystemActivity', () => {
    it('should get recent system activity', async () => {
      const handler = createActivityHandler(true);
      const request = createMockRequest('admin@example.com');

      const response = await handler.getSystemActivity(request);

      expect(response).toBeDefined();
      expect(Array.isArray(response.logs)).toBe(true);

      // Logs should be sorted by timestamp (newest first)
      for (let i = 1; i < response.logs.length; i++) {
        const prev = new Date(response.logs[i - 1].timestamp);
        const curr = new Date(response.logs[i].timestamp);
        expect(prev >= curr).toBe(true);
      }
    });

    it('should support custom limit', async () => {
      const handler = createActivityHandler(true);
      const request = createMockRequest('admin@example.com', {}, { limit: '20' });

      const response = await handler.getSystemActivity(request);

      expect(response.logs.length).toBeLessThanOrEqual(20);
    });
  });

  describe('getFailedRequests', () => {
    it('should get only failed requests', async () => {
      const handler = createActivityHandler(true);
      const request = createMockRequest('admin@example.com');

      const response = await handler.getFailedRequests(request);

      expect(response).toBeDefined();
      expect(Array.isArray(response.logs)).toBe(true);

      // All logs should have error comments
      response.logs.forEach(log => {
        expect(log.comment).toBeDefined();
        expect(
          log.comment!.includes('failed') ||
          log.comment!.includes('error')
        ).toBe(true);
      });
    });

    it('should support custom limit', async () => {
      const handler = createActivityHandler(true);
      const request = createMockRequest('admin@example.com', {}, { limit: '5' });

      const response = await handler.getFailedRequests(request);

      expect(response.logs.length).toBeLessThanOrEqual(5);
    });
  });
});

/**
 * Mock Backend Service Tests
 */
describe('MockBackendActivityService', () => {
  const backend = new MockBackendActivityService();

  it('should have seeded mock logs', async () => {
    const result = await backend.getLogs({});

    expect(result.logs.length).toBeGreaterThan(0);
    expect(result.total).toBeGreaterThan(0);
  });

  it('should support pagination', async () => {
    const page1 = await backend.getLogs({ page: 1, pageSize: 10 });
    const page2 = await backend.getLogs({ page: 2, pageSize: 10 });

    expect(page1.logs.length).toBeLessThanOrEqual(10);
    expect(page2.logs.length).toBeLessThanOrEqual(10);

    // Pages should be different
    if (page1.logs.length > 0 && page2.logs.length > 0) {
      expect(page1.logs[0].id).not.toBe(page2.logs[0].id);
    }
  });

  it('should filter by queue item ID', async () => {
    // First, find a queue item that has logs
    const allLogs = await backend.getLogs({});
    if (allLogs.logs.length > 0) {
      const queueItemId = allLogs.logs[0].queueItemId;

      const filtered = await backend.getLogs({
        filter: { queueItemId }
      });

      filtered.logs.forEach(log => {
        expect(log.queueItemId).toBe(queueItemId);
      });
    }
  });

  it('should filter by user', async () => {
    // Find a user that has logs
    const allLogs = await backend.getLogs({});
    if (allLogs.logs.length > 0) {
      const user = allLogs.logs[0].performedBy;

      const filtered = await backend.getLogs({
        filter: { user }
      });

      filtered.logs.forEach(log => {
        expect(log.performedBy).toBe(user);
      });
    }
  });

  it('should filter by action', async () => {
    const filtered = await backend.getLogs({
      filter: { action: ['created', 'updated'] }
    });

    filtered.logs.forEach(log => {
      expect(['created', 'updated']).toContain(log.action);
    });
  });

  it('should filter by success/failure', async () => {
    const failed = await backend.getLogs({
      filter: { success: false }
    });

    failed.logs.forEach(log => {
      expect(log.comment).toBeDefined();
    });
  });

  it('should get logs for specific item', async () => {
    const logs = await backend.getLogsForItem('queue-1', 10);

    expect(Array.isArray(logs)).toBe(true);
    logs.forEach(log => {
      expect(log.queueItemId).toBe('queue-1');
    });
  });

  it('should get logs for specific user', async () => {
    const logs = await backend.getLogsForUser('user1@example.com', 10);

    expect(Array.isArray(logs)).toBe(true);
    logs.forEach(log => {
      expect(log.performedBy).toBe('user1@example.com');
    });
  });

  it('should get recent activity', async () => {
    const logs = await backend.getRecentActivity(20);

    expect(Array.isArray(logs)).toBe(true);
    expect(logs.length).toBeLessThanOrEqual(20);

    // Should be sorted by timestamp (newest first)
    for (let i = 1; i < logs.length; i++) {
      const prev = new Date(logs[i - 1].timestamp);
      const curr = new Date(logs[i].timestamp);
      expect(prev >= curr).toBe(true);
    }
  });

  it('should get failed requests only', async () => {
    const logs = await backend.getFailedRequests(10);

    expect(Array.isArray(logs)).toBe(true);
    logs.forEach(log => {
      expect(log.comment).toBeDefined();
    });
  });
});

/**
 * Integration Tests
 */
describe('Activity API Integration', () => {
  it('should handle complete activity retrieval flow', async () => {
    const handler = createActivityHandler(true);

    // 1. Get general activity logs
    const request1 = createMockRequest('user@example.com');
    const logs = await handler.getActivityLogs(request1);
    expect(logs.logs.length).toBeGreaterThan(0);

    // 2. Get logs for specific item
    const queueItemId = logs.logs[0].queueItemId;
    const request2 = createMockRequest('user@example.com', { id: queueItemId });
    const itemLogs = await handler.getLogsForItem(request2);
    expect(itemLogs.logs.length).toBeGreaterThan(0);

    // 3. Get logs for user
    const request3 = createMockRequest('user1@example.com');
    const userLogs = await handler.getLogsForUser(request3);
    expect(Array.isArray(userLogs.logs)).toBe(true);

    // 4. Get system activity (admin)
    const request4 = createMockRequest('admin@example.com');
    const systemLogs = await handler.getSystemActivity(request4);
    expect(Array.isArray(systemLogs.logs)).toBe(true);

    // 5. Get failed requests
    const request5 = createMockRequest('admin@example.com');
    const failedLogs = await handler.getFailedRequests(request5);
    expect(Array.isArray(failedLogs.logs)).toBe(true);
  });

  it('should handle pagination across pages', async () => {
    const handler = createActivityHandler(true);

    // Get first page
    const request1 = createMockRequest('user@example.com', {}, {
      page: '1',
      pageSize: '10'
    });
    const page1 = await handler.getActivityLogs(request1);

    // Get second page
    const request2 = createMockRequest('user@example.com', {}, {
      page: '2',
      pageSize: '10'
    });
    const page2 = await handler.getActivityLogs(request2);

    // Pages should be different
    if (page1.logs.length > 0 && page2.logs.length > 0) {
      expect(page1.logs[0].id).not.toBe(page2.logs[0].id);
    }

    // Total should be consistent
    expect(page1.total).toBe(page2.total);
  });
});

/**
 * Performance Tests
 */
describe('Activity Performance', () => {
  it('should retrieve logs in under 500ms', async () => {
    const handler = createActivityHandler(true);
    const request = createMockRequest('user@example.com');

    const startTime = Date.now();
    await handler.getActivityLogs(request);
    const duration = Date.now() - startTime;

    expect(duration).toBeLessThan(500);
  });

  it('should handle large page sizes efficiently', async () => {
    const handler = createActivityHandler(true);
    const request = createMockRequest('user@example.com', {}, {
      pageSize: '200' // Max page size
    });

    const startTime = Date.now();
    await handler.getActivityLogs(request);
    const duration = Date.now() - startTime;

    expect(duration).toBeLessThan(1000);
  });
});

/**
 * Manual Testing Instructions
 *
 * To manually test the activity endpoints in deployed GAS:
 *
 * 1. Deploy as web app
 * 2. Get authentication token:
 *    POST https://your-deployment-url/api/auth/login
 *
 * 3. Get activity logs with filtering:
 *    GET https://your-deployment-url/api/activity?page=1&pageSize=20
 *    Headers: Authorization: Bearer <token>
 *    Expected: ActivityListResponse with logs array
 *
 * 4. Filter by queue item:
 *    GET https://your-deployment-url/api/activity?queueItemId=queue-123
 *    Headers: Authorization: Bearer <token>
 *    Expected: Only logs for queue-123
 *
 * 5. Filter by action:
 *    GET https://your-deployment-url/api/activity?action=created,updated
 *    Headers: Authorization: Bearer <token>
 *    Expected: Only created and updated actions
 *
 * 6. Filter by date range:
 *    GET https://your-deployment-url/api/activity?dateFrom=2025-11-01&dateTo=2025-11-30
 *    Headers: Authorization: Bearer <token>
 *    Expected: Logs within date range
 *
 * 7. Get logs for specific item:
 *    GET https://your-deployment-url/api/activity/item/queue-123
 *    Headers: Authorization: Bearer <token>
 *    Expected: All logs for queue-123
 *
 * 8. Get logs for current user:
 *    GET https://your-deployment-url/api/activity/user
 *    Headers: Authorization: Bearer <token>
 *    Expected: All logs by current user
 *
 * 9. Get system activity (admin):
 *    GET https://your-deployment-url/api/activity/system?limit=50
 *    Headers: Authorization: Bearer <admin-token>
 *    Expected: Recent system activity
 *
 * 10. Get failed requests (admin):
 *     GET https://your-deployment-url/api/activity/failed
 *     Headers: Authorization: Bearer <admin-token>
 *     Expected: Only failed requests
 *
 * 11. Test pagination:
 *     GET https://your-deployment-url/api/activity?page=2&pageSize=10
 *     Headers: Authorization: Bearer <token>
 *     Expected: Page 2 of results
 *
 * 12. Test error handling:
 *     - Try system/failed endpoints without admin (should get 403)
 *     - Try with invalid filters (should handle gracefully)
 *     - Try with missing authentication (should get 401)
 */
