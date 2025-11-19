/**
 * Queue Endpoint Tests
 * Tests for queue management CRUD operations, filtering, sorting, and bulk operations
 *
 * These are template tests - adapt for your testing framework
 */

import {
  QueueHandler,
  MockBackendQueueService,
  createQueueHandler
} from '../../src/webapp/handlers/queue-handler';
import { QueueTransformer } from '../../src/webapp/transformers/queue';
import { ApiRequest } from '../../src/webapp/types/api-types';
import { QueueItem, QueueListResponse } from '../../src/types/shared-models';
import { validate, queueItemSchema } from '../../src/types/validators';

/**
 * Mock API Request
 */
function createMockRequest(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  params: Record<string, string> = {},
  postData: any = {},
  pathParams?: Record<string, string>
): ApiRequest {
  return {
    method,
    path: '/api/queue',
    parameters: params,
    queryString: '',
    postData,
    headers: {},
    user: 'test@example.com',
    pathParams
  };
}

/**
 * Queue List Tests
 */
describe('QueueHandler - List', () => {
  describe('listQueue', () => {
    it('should return paginated queue items', async () => {
      const handler = createQueueHandler(true);
      const request = createMockRequest('GET', {
        page: '1',
        pageSize: '10'
      });

      const response = await handler.listQueue(request);

      expect(response).toBeDefined();
      expect(response.items).toBeInstanceOf(Array);
      expect(response.items.length).toBeLessThanOrEqual(10);
      expect(response.page).toBe(1);
      expect(response.pageSize).toBe(10);
      expect(response.total).toBeGreaterThanOrEqual(0);
      expect(typeof response.hasMore).toBe('boolean');
    });

    it('should validate all items with schema', async () => {
      const handler = createQueueHandler(true);
      const request = createMockRequest('GET', { pageSize: '5' });

      const response = await handler.listQueue(request);

      response.items.forEach(item => {
        expect(() => validate(queueItemSchema, item)).not.toThrow();
      });
    });

    it('should handle second page correctly', async () => {
      const handler = createQueueHandler(true);
      const request = createMockRequest('GET', {
        page: '2',
        pageSize: '10'
      });

      const response = await handler.listQueue(request);

      expect(response.page).toBe(2);
      expect(response.pageSize).toBe(10);
    });

    it('should enforce max page size of 100', async () => {
      const handler = createQueueHandler(true);
      const request = createMockRequest('GET', {
        pageSize: '500' // Try to request 500
      });

      const response = await handler.listQueue(request);

      expect(response.pageSize).toBe(100); // Should be capped at 100
    });

    it('should default to page 1, size 20', async () => {
      const handler = createQueueHandler(true);
      const request = createMockRequest('GET');

      const response = await handler.listQueue(request);

      expect(response.page).toBe(1);
      expect(response.pageSize).toBe(20);
    });
  });

  describe('listQueue - Filtering', () => {
    it('should filter by status', async () => {
      const handler = createQueueHandler(true);
      const request = createMockRequest('GET', {
        status: 'pending,completed'
      });

      const response = await handler.listQueue(request);

      response.items.forEach(item => {
        expect(['pending', 'completed']).toContain(item.status);
      });
    });

    it('should filter by priority', async () => {
      const handler = createQueueHandler(true);
      const request = createMockRequest('GET', {
        priority: 'high'
      });

      const response = await handler.listQueue(request);

      response.items.forEach(item => {
        expect(item.priority).toBe('high');
      });
    });

    it('should filter by category', async () => {
      const handler = createQueueHandler(true);
      const request = createMockRequest('GET', {
        category: 'work,personal'
      });

      const response = await handler.listQueue(request);

      response.items.forEach(item => {
        expect(['work', 'personal']).toContain(item.category);
      });
    });

    it('should filter by search term', async () => {
      const handler = createQueueHandler(true);
      const request = createMockRequest('GET', {
        search: 'test'
      });

      const response = await handler.listQueue(request);

      response.items.forEach(item => {
        const searchTerm = 'test'.toLowerCase();
        const matches =
          item.subject.toLowerCase().includes(searchTerm) ||
          item.from.toLowerCase().includes(searchTerm);

        expect(matches).toBe(true);
      });
    });

    it('should combine multiple filters', async () => {
      const handler = createQueueHandler(true);
      const request = createMockRequest('GET', {
        status: 'pending',
        priority: 'high',
        category: 'work'
      });

      const response = await handler.listQueue(request);

      response.items.forEach(item => {
        expect(item.status).toBe('pending');
        expect(item.priority).toBe('high');
        expect(item.category).toBe('work');
      });
    });
  });

  describe('listQueue - Sorting', () => {
    it('should sort by date descending by default', async () => {
      const handler = createQueueHandler(true);
      const request = createMockRequest('GET', { pageSize: '10' });

      const response = await handler.listQueue(request);

      for (let i = 1; i < response.items.length; i++) {
        const prevDate = new Date(response.items[i - 1].date);
        const currDate = new Date(response.items[i].date);

        expect(currDate.getTime()).toBeLessThanOrEqual(prevDate.getTime());
      }
    });

    it('should sort by date ascending', async () => {
      const handler = createQueueHandler(true);
      const request = createMockRequest('GET', {
        sortBy: 'date',
        sortDir: 'asc',
        pageSize: '10'
      });

      const response = await handler.listQueue(request);

      for (let i = 1; i < response.items.length; i++) {
        const prevDate = new Date(response.items[i - 1].date);
        const currDate = new Date(response.items[i].date);

        expect(currDate.getTime()).toBeGreaterThanOrEqual(prevDate.getTime());
      }
    });

    it('should sort by subject', async () => {
      const handler = createQueueHandler(true);
      const request = createMockRequest('GET', {
        sortBy: 'subject',
        sortDir: 'asc'
      });

      const response = await handler.listQueue(request);

      for (let i = 1; i < response.items.length; i++) {
        expect(response.items[i].subject.localeCompare(response.items[i - 1].subject))
          .toBeGreaterThanOrEqual(0);
      }
    });
  });
});

/**
 * Queue CRUD Tests
 */
describe('QueueHandler - CRUD', () => {
  describe('getQueueItem', () => {
    it('should get queue item by ID', async () => {
      const handler = createQueueHandler(true);

      // First, get a list to find a valid ID
      const listRequest = createMockRequest('GET', { pageSize: '1' });
      const list = await handler.listQueue(listRequest);

      if (list.items.length > 0) {
        const id = list.items[0].id;

        const getRequest = createMockRequest('GET', {}, {}, { id });
        const item = await handler.getQueueItem(getRequest);

        expect(item).toBeDefined();
        expect(item.id).toBe(id);
        expect(() => validate(queueItemSchema, item)).not.toThrow();
      }
    });

    it('should throw NotFoundError for invalid ID', async () => {
      const handler = createQueueHandler(true);
      const request = createMockRequest('GET', {}, {}, { id: 'invalid-id' });

      await expect(handler.getQueueItem(request)).rejects.toThrow('not found');
    });

    it('should throw ValidationError for missing ID', async () => {
      const handler = createQueueHandler(true);
      const request = createMockRequest('GET');

      await expect(handler.getQueueItem(request)).rejects.toThrow();
    });
  });

  describe('createQueueItem', () => {
    it('should create new queue item', async () => {
      const handler = createQueueHandler(true);
      const request = createMockRequest('POST', {}, {
        emailId: 'test-email-123',
        threadId: 'test-thread-123',
        subject: 'Test Email',
        from: 'sender@example.com',
        to: 'recipient@example.com',
        priority: 'high',
        category: 'work'
      });

      const created = await handler.createQueueItem(request);

      expect(created).toBeDefined();
      expect(created.id).toBeDefined();
      expect(created.emailId).toBe('test-email-123');
      expect(created.subject).toBe('Test Email');
      expect(created.priority).toBe('high');
    });

    it('should validate created item with schema', async () => {
      const handler = createQueueHandler(true);
      const request = createMockRequest('POST', {}, {
        emailId: 'test',
        threadId: 'thread',
        subject: 'Test',
        from: 'test@example.com',
        to: 'to@example.com'
      });

      const created = await handler.createQueueItem(request);

      expect(() => validate(queueItemSchema, created)).not.toThrow();
    });

    it('should throw ValidationError for invalid data', async () => {
      const handler = createQueueHandler(true);
      const request = createMockRequest('POST', {}, {
        // Missing required fields
        subject: 'Test'
      });

      await expect(handler.createQueueItem(request)).rejects.toThrow();
    });
  });

  describe('updateQueueItem', () => {
    it('should update queue item', async () => {
      const handler = createQueueHandler(true);

      // Create an item first
      const createRequest = createMockRequest('POST', {}, {
        emailId: 'test',
        threadId: 'thread',
        subject: 'Original Subject',
        from: 'test@example.com',
        to: 'to@example.com'
      });

      const created = await handler.createQueueItem(createRequest);

      // Update it
      const updateRequest = createMockRequest('PUT', {}, {
        subject: 'Updated Subject',
        priority: 'high'
      }, { id: created.id });

      const updated = await handler.updateQueueItem(updateRequest);

      expect(updated.id).toBe(created.id);
      expect(updated.subject).toBe('Updated Subject');
      expect(updated.priority).toBe('high');
    });

    it('should throw NotFoundError for invalid ID', async () => {
      const handler = createQueueHandler(true);
      const request = createMockRequest('PUT', {}, {
        subject: 'Test'
      }, { id: 'invalid-id' });

      await expect(handler.updateQueueItem(request)).rejects.toThrow();
    });
  });

  describe('deleteQueueItem', () => {
    it('should delete queue item', async () => {
      const handler = createQueueHandler(true);

      // Create an item first
      const createRequest = createMockRequest('POST', {}, {
        emailId: 'test',
        threadId: 'thread',
        subject: 'To Delete',
        from: 'test@example.com',
        to: 'to@example.com'
      });

      const created = await handler.createQueueItem(createRequest);

      // Delete it
      const deleteRequest = createMockRequest('DELETE', {}, {}, { id: created.id });
      const result = await handler.deleteQueueItem(deleteRequest);

      expect(result.message).toContain('deleted');
      expect(result.id).toBe(created.id);

      // Verify it's gone
      const getRequest = createMockRequest('GET', {}, {}, { id: created.id });
      await expect(handler.getQueueItem(getRequest)).rejects.toThrow('not found');
    });

    it('should throw NotFoundError for invalid ID', async () => {
      const handler = createQueueHandler(true);
      const request = createMockRequest('DELETE', {}, {}, { id: 'invalid-id' });

      await expect(handler.deleteQueueItem(request)).rejects.toThrow('not found');
    });
  });
});

/**
 * Queue Operations Tests
 */
describe('QueueHandler - Operations', () => {
  describe('snoozeItem', () => {
    it('should snooze queue item', async () => {
      const handler = createQueueHandler(true);

      // Create an item
      const createRequest = createMockRequest('POST', {}, {
        emailId: 'test',
        threadId: 'thread',
        subject: 'To Snooze',
        from: 'test@example.com',
        to: 'to@example.com'
      });

      const created = await handler.createQueueItem(createRequest);

      // Snooze it
      const snoozeDate = new Date();
      snoozeDate.setHours(snoozeDate.getHours() + 2); // Snooze for 2 hours

      const snoozeRequest = createMockRequest('POST', {}, {
        until: snoozeDate.toISOString(),
        reason: 'Testing snooze'
      }, { id: created.id });

      const snoozed = await handler.snoozeItem(snoozeRequest);

      expect(snoozed.id).toBe(created.id);
      expect(snoozed.status).toBe('snoozed');
      expect(snoozed.snoozeUntil).toBeDefined();
    });
  });

  describe('completeItem', () => {
    it('should mark item as completed', async () => {
      const handler = createQueueHandler(true);

      // Create an item
      const createRequest = createMockRequest('POST', {}, {
        emailId: 'test',
        threadId: 'thread',
        subject: 'To Complete',
        from: 'test@example.com',
        to: 'to@example.com'
      });

      const created = await handler.createQueueItem(createRequest);

      // Complete it
      const completeRequest = createMockRequest('POST', {}, {}, { id: created.id });
      const completed = await handler.completeItem(completeRequest);

      expect(completed.id).toBe(created.id);
      expect(completed.status).toBe('completed');
    });
  });

  describe('archiveItem', () => {
    it('should archive queue item', async () => {
      const handler = createQueueHandler(true);

      // Create an item
      const createRequest = createMockRequest('POST', {}, {
        emailId: 'test',
        threadId: 'thread',
        subject: 'To Archive',
        from: 'test@example.com',
        to: 'to@example.com'
      });

      const created = await handler.createQueueItem(createRequest);

      // Archive it
      const archiveRequest = createMockRequest('POST', {}, {}, { id: created.id });
      const archived = await handler.archiveItem(archiveRequest);

      expect(archived.id).toBe(created.id);
      expect(archived.status).toBe('archived');
    });
  });
});

/**
 * Bulk Operations Tests
 */
describe('QueueHandler - Bulk Operations', () => {
  describe('bulkOperation', () => {
    it('should bulk complete multiple items', async () => {
      const handler = createQueueHandler(true);

      // Create multiple items
      const ids: string[] = [];
      for (let i = 0; i < 3; i++) {
        const createRequest = createMockRequest('POST', {}, {
          emailId: `test-${i}`,
          threadId: `thread-${i}`,
          subject: `Test ${i}`,
          from: 'test@example.com',
          to: 'to@example.com'
        });

        const created = await handler.createQueueItem(createRequest);
        ids.push(created.id);
      }

      // Bulk complete
      const bulkRequest = createMockRequest('POST', {}, {
        action: 'complete',
        itemIds: ids
      });

      const result = await handler.bulkOperation(bulkRequest);

      expect(result.success).toBe(3);
      expect(result.failed).toBe(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle partial failures gracefully', async () => {
      const handler = createQueueHandler(true);

      // Create one valid item
      const createRequest = createMockRequest('POST', {}, {
        emailId: 'test',
        threadId: 'thread',
        subject: 'Test',
        from: 'test@example.com',
        to: 'to@example.com'
      });

      const created = await handler.createQueueItem(createRequest);

      // Bulk operation with one valid and one invalid ID
      const bulkRequest = createMockRequest('POST', {}, {
        action: 'complete',
        itemIds: [created.id, 'invalid-id']
      });

      const result = await handler.bulkOperation(bulkRequest);

      expect(result.success).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].id).toBe('invalid-id');
    });

    it('should bulk change priority', async () => {
      const handler = createQueueHandler(true);

      // Create items
      const ids: string[] = [];
      for (let i = 0; i < 2; i++) {
        const createRequest = createMockRequest('POST', {}, {
          emailId: `test-${i}`,
          threadId: `thread-${i}`,
          subject: `Test ${i}`,
          from: 'test@example.com',
          to: 'to@example.com',
          priority: 'low'
        });

        const created = await handler.createQueueItem(createRequest);
        ids.push(created.id);
      }

      // Bulk change priority
      const bulkRequest = createMockRequest('POST', {}, {
        action: 'change_priority',
        itemIds: ids,
        params: {
          priority: 'high'
        }
      });

      const result = await handler.bulkOperation(bulkRequest);

      expect(result.success).toBe(2);
      expect(result.failed).toBe(0);

      // Verify change
      const getRequest = createMockRequest('GET', {}, {}, { id: ids[0] });
      const item = await handler.getQueueItem(getRequest);
      expect(item.priority).toBe('high');
    });
  });
});

/**
 * Performance Tests
 */
describe('QueueHandler - Performance', () => {
  it('should list 100 items in under 1 second', async () => {
    const handler = createQueueHandler(true);
    const request = createMockRequest('GET', { pageSize: '100' });

    const startTime = Date.now();
    await handler.listQueue(request);
    const duration = Date.now() - startTime;

    expect(duration).toBeLessThan(1000);
  });

  it('should handle concurrent list requests', async () => {
    const handler = createQueueHandler(true);

    const requests = Array.from({ length: 10 }, (_, i) =>
      handler.listQueue(createMockRequest('GET', {
        page: String(i + 1),
        pageSize: '10'
      }))
    );

    const results = await Promise.all(requests);

    expect(results).toHaveLength(10);
    results.forEach((result, i) => {
      expect(result.page).toBe(i + 1);
    });
  });
});

/**
 * Manual Testing Instructions
 *
 * To manually test the queue endpoints in deployed GAS:
 *
 * 1. Get authentication token:
 *    POST https://your-deployment-url/api/auth/login
 *
 * 2. List queue items:
 *    GET https://your-deployment-url/api/queue?page=1&pageSize=20
 *    Headers: Authorization: Bearer <token>
 *
 * 3. Filter queue:
 *    GET https://your-deployment-url/api/queue?status=pending&priority=high
 *    Headers: Authorization: Bearer <token>
 *
 * 4. Sort queue:
 *    GET https://your-deployment-url/api/queue?sortBy=date&sortDir=asc
 *    Headers: Authorization: Bearer <token>
 *
 * 5. Get single item:
 *    GET https://your-deployment-url/api/queue/<id>
 *    Headers: Authorization: Bearer <token>
 *
 * 6. Create item:
 *    POST https://your-deployment-url/api/queue
 *    Headers: Authorization: Bearer <token>, Content-Type: application/json
 *    Body: {
 *      "emailId": "test123",
 *      "threadId": "thread123",
 *      "subject": "Test Email",
 *      "from": "test@example.com",
 *      "to": "me@example.com",
 *      "priority": "high"
 *    }
 *
 * 7. Update item:
 *    PUT https://your-deployment-url/api/queue/<id>
 *    Headers: Authorization: Bearer <token>, Content-Type: application/json
 *    Body: { "priority": "low", "status": "completed" }
 *
 * 8. Snooze item:
 *    POST https://your-deployment-url/api/queue/<id>/snooze
 *    Headers: Authorization: Bearer <token>, Content-Type: application/json
 *    Body: { "until": "2025-11-17T10:00:00.000Z" }
 *
 * 9. Complete item:
 *    POST https://your-deployment-url/api/queue/<id>/complete
 *    Headers: Authorization: Bearer <token>
 *
 * 10. Bulk operation:
 *     POST https://your-deployment-url/api/queue/bulk
 *     Headers: Authorization: Bearer <token>, Content-Type: application/json
 *     Body: {
 *       "action": "complete",
 *       "itemIds": ["id1", "id2", "id3"]
 *     }
 *
 * 11. Delete item:
 *     DELETE https://your-deployment-url/api/queue/<id>
 *     Headers: Authorization: Bearer <token>
 *
 * Expected behaviors:
 * - List: Returns paginated response with hasMore flag
 * - Filters: Only returns items matching criteria
 * - Sort: Items in correct order
 * - Create: Returns created item with generated ID
 * - Update: Returns updated item
 * - Delete: Returns confirmation message
 * - Bulk: Returns success/failed counts with error details
 */
