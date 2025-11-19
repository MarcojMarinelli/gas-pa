/**
 * Transformer Tests
 * Tests for data transformation between backend and API models
 *
 * These are template tests - fill in with actual test framework
 */

import { QueueTransformer, BackendFollowUpItem } from '../../webapp/transformers/queue';
import { MetricsTransformer } from '../../webapp/transformers/metrics';
import { QueueItem, DashboardMetrics } from '../shared-models';

/**
 * Queue Transformer Tests
 */

describe('QueueTransformer', () => {
  describe('toApiModel', () => {
    it('should transform backend item to API item', () => {
      const backendItem: BackendFollowUpItem = {
        id: 'test-123',
        emailId: 'email-456',
        threadId: 'thread-789',
        subject: 'Test Email',
        from: 'sender@example.com',
        to: 'recipient@example.com',
        receivedDate: new Date('2025-11-16T10:30:00Z'),
        priority: 'HIGH',
        category: 'work',
        labels: ['important', 'urgent'],
        reason: 'NEEDS_REPLY',
        status: 'ACTIVE',
        addedToQueueAt: new Date('2025-11-16T10:35:00Z'),
        slaStatus: 'ON_TIME',
        createdAt: new Date('2025-11-16T10:35:00Z'),
        updatedAt: new Date('2025-11-16T10:35:00Z'),
        actionCount: 0,
        snoozeCount: 0
      };

      const apiItem = QueueTransformer.toApiModel(backendItem);

      // Test basic fields
      expect(apiItem.id).toBe('test-123');
      expect(apiItem.emailId).toBe('email-456');
      expect(apiItem.subject).toBe('Test Email');

      // Test date conversion
      expect(apiItem.date).toBe('2025-11-16T10:30:00.000Z');
      expect(typeof apiItem.date).toBe('string');

      // Test priority normalization
      expect(apiItem.priority).toBe('high');

      // Test status normalization
      expect(apiItem.status).toBe('pending');

      // Test arrays
      expect(apiItem.labels).toEqual(['important', 'urgent']);
    });

    it('should handle CRITICAL priority', () => {
      const backendItem: BackendFollowUpItem = {
        id: 'test',
        emailId: 'email',
        threadId: 'thread',
        subject: 'Critical',
        from: 'test@example.com',
        to: 'to@example.com',
        receivedDate: new Date(),
        priority: 'CRITICAL', // CRITICAL should map to 'high'
        category: 'work',
        labels: [],
        reason: 'VIP_REQUIRES_ATTENTION',
        status: 'ACTIVE',
        addedToQueueAt: new Date(),
        slaStatus: 'AT_RISK',
        createdAt: new Date(),
        updatedAt: new Date(),
        actionCount: 0,
        snoozeCount: 0
      };

      const apiItem = QueueTransformer.toApiModel(backendItem);
      expect(apiItem.priority).toBe('high');
    });

    it('should handle WAITING status', () => {
      const backendItem: BackendFollowUpItem = {
        id: 'test',
        emailId: 'email',
        threadId: 'thread',
        subject: 'Waiting',
        from: 'test@example.com',
        to: 'to@example.com',
        receivedDate: new Date(),
        priority: 'MEDIUM',
        category: 'work',
        labels: [],
        reason: 'WAITING_ON_OTHERS',
        status: 'WAITING', // WAITING should map to 'pending'
        addedToQueueAt: new Date(),
        slaStatus: 'ON_TIME',
        createdAt: new Date(),
        updatedAt: new Date(),
        actionCount: 0,
        snoozeCount: 0
      };

      const apiItem = QueueTransformer.toApiModel(backendItem);
      expect(apiItem.status).toBe('pending');
      expect(apiItem.reason).toBe('WAITING_ON_INFO');
    });
  });

  describe('toBackendModel', () => {
    it('should transform API item to backend item', () => {
      const apiItem: Partial<QueueItem> = {
        id: 'test-123',
        emailId: 'email-456',
        threadId: 'thread-789',
        subject: 'Test Email',
        from: 'sender@example.com',
        to: 'recipient@example.com',
        date: '2025-11-16T10:30:00.000Z',
        priority: 'high',
        status: 'pending',
        category: 'work',
        labels: ['test'],
        reason: 'NEEDS_REPLY'
      };

      const backendItem = QueueTransformer.toBackendModel(apiItem);

      // Test basic fields
      expect(backendItem.id).toBe('test-123');
      expect(backendItem.emailId).toBe('email-456');

      // Test date conversion
      expect(backendItem.receivedDate).toBeInstanceOf(Date);
      expect(backendItem.receivedDate?.toISOString()).toBe('2025-11-16T10:30:00.000Z');

      // Test priority denormalization
      expect(backendItem.priority).toBe('HIGH');

      // Test status denormalization
      expect(backendItem.status).toBe('ACTIVE');
    });
  });

  describe('Round-trip transformation', () => {
    it('should preserve data through round-trip', () => {
      const backendItem: BackendFollowUpItem = {
        id: 'roundtrip-test',
        emailId: 'email-rt',
        threadId: 'thread-rt',
        subject: 'Round Trip Test',
        from: 'test@example.com',
        to: 'to@example.com',
        receivedDate: new Date('2025-11-16T12:00:00.000Z'),
        priority: 'MEDIUM',
        category: 'work',
        labels: ['test', 'roundtrip'],
        reason: 'MANUAL_FOLLOW_UP',
        status: 'ACTIVE',
        addedToQueueAt: new Date('2025-11-16T12:05:00.000Z'),
        slaStatus: 'ON_TIME',
        createdAt: new Date(),
        updatedAt: new Date(),
        actionCount: 3,
        snoozeCount: 1
      };

      // Backend → API → Backend
      const apiItem = QueueTransformer.toApiModel(backendItem);
      const backendAgain = QueueTransformer.toBackendModel(apiItem);

      // Key fields should match
      expect(backendAgain.id).toBe(backendItem.id);
      expect(backendAgain.emailId).toBe(backendItem.emailId);
      expect(backendAgain.priority).toBe(backendItem.priority);
      expect(backendAgain.receivedDate?.toISOString()).toBe(backendItem.receivedDate.toISOString());
    });
  });
});

/**
 * Metrics Transformer Tests
 */

describe('MetricsTransformer', () => {
  describe('toApiModel', () => {
    it('should create valid DashboardMetrics', () => {
      const currentStats = {
        totalEmails: 5000,
        totalProcessed: 150,
        pendingActions: 25,
        avgProcessingTime: 3.5
      };

      const dailyStats = Array.from({ length: 7 }, (_, i) => ({
        date: new Date(Date.now() - (6 - i) * 86400000),
        emailCount: 500 + i * 10,
        processedCount: 100 + i * 5,
        pendingCount: 20 - i * 2,
        avgTime: 3 + Math.random()
      }));

      const metrics = MetricsTransformer.toApiModel(currentStats, dailyStats);

      // Test structure
      expect(metrics.totalEmails).toBe(5000);
      expect(metrics.processedToday).toBe(150);
      expect(metrics.pendingActions).toBe(25);
      expect(metrics.avgProcessingTime).toBeCloseTo(3.5);

      // Test trends
      expect(metrics.emailTrends).toHaveLength(7);
      expect(metrics.processingTrends).toHaveLength(7);
      expect(metrics.pendingTrends).toHaveLength(7);
      expect(metrics.timeTrends).toHaveLength(7);

      // Test metadata
      expect(typeof metrics.lastUpdated).toBe('string');
      expect(new Date(metrics.lastUpdated)).toBeInstanceOf(Date);
    });
  });

  describe('normalizeDailyStats', () => {
    it('should always return exactly 7 days', () => {
      const stats = [
        {
          date: new Date(),
          emailCount: 100,
          processedCount: 50,
          pendingCount: 10,
          avgTime: 5
        }
      ];

      const metrics = MetricsTransformer.create({
        totalEmails: 1000,
        processedToday: 100,
        pendingActions: 10,
        avgProcessingTime: 5,
        emailTrends: [0, 0, 0, 0, 0, 0, 100],
        processingTrends: [0, 0, 0, 0, 0, 0, 50],
        pendingTrends: [0, 0, 0, 0, 0, 0, 10],
        timeTrends: [0, 0, 0, 0, 0, 0, 5]
      });

      expect(metrics.emailTrends).toHaveLength(7);
      expect(metrics.processingTrends).toHaveLength(7);
    });
  });

  describe('calculateChange', () => {
    it('should calculate percentage change correctly', () => {
      expect(MetricsTransformer.calculateChange(110, 100)).toBeCloseTo(10);
      expect(MetricsTransformer.calculateChange(90, 100)).toBeCloseTo(-10);
      expect(MetricsTransformer.calculateChange(50, 0)).toBe(100);
    });
  });

  describe('createEmpty', () => {
    it('should create valid empty metrics', () => {
      const empty = MetricsTransformer.createEmpty();

      expect(empty.totalEmails).toBe(0);
      expect(empty.emailTrends).toEqual([0, 0, 0, 0, 0, 0, 0]);
      expect(typeof empty.lastUpdated).toBe('string');
    });
  });
});

/**
 * Manual Test Instructions
 *
 * Since these are template tests, here's how to manually test:
 *
 * 1. Backend → API transformation:
 *    ```typescript
 *    const backendItem = {
 *      // ... create test backend item
 *    };
 *    const apiItem = QueueTransformer.toApiModel(backendItem);
 *    console.log(apiItem);
 *    // Verify all dates are ISO strings
 *    // Verify priority/status normalized
 *    ```
 *
 * 2. API → Backend transformation:
 *    ```typescript
 *    const apiItem = {
 *      date: '2025-11-16T10:00:00.000Z',
 *      priority: 'high',
 *      // ...
 *    };
 *    const backendItem = QueueTransformer.toBackendModel(apiItem);
 *    console.log(backendItem);
 *    // Verify dates are Date objects
 *    // Verify enums uppercase
 *    ```
 *
 * 3. Validation:
 *    ```typescript
 *    const item = {
 *      // ... potentially invalid data
 *    };
 *    try {
 *      QueueTransformer.validateQueueItem(item);
 *    } catch (error) {
 *      console.log('Validation failed:', error);
 *    }
 *    ```
 */
