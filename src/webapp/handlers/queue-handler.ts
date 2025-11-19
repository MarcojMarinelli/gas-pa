/**
 * Queue Handler
 * Handles all queue management operations (CRUD, filtering, bulk operations)
 */

import { ApiRequest } from '../types/api-types';
import {
  QueueItem,
  QueueListResponse,
  QueueFilter,
  QueueSort,
  SnoozeOptions
} from '../../types/shared-models';
import { QueueTransformer, BackendFollowUpItem } from '../transformers/queue';
import {
  validate,
  queueItemSchema,
  queueItemPartialSchema,
  queueItemCreateSchema,
  queueFilterSchema,
  queueSortSchema,
  snoozeOptionsSchema,
  bulkOperationRequestSchema
} from '../../types/validators';
import { ValidationError, NotFoundError } from '../types/api-types';
import Logger from '../../core/logger';

/**
 * Backend Queue Service Interface
 * Abstraction layer for queue operations
 */
export interface BackendQueueService {
  // Query operations
  query(options: {
    filter?: QueueFilter;
    sort?: QueueSort;
    page?: number;
    pageSize?: number;
  }): Promise<{
    items: BackendFollowUpItem[];
    total: number;
  }>;

  // CRUD operations
  getById(id: string): Promise<BackendFollowUpItem | null>;
  create(item: Partial<BackendFollowUpItem>): Promise<string>;
  update(id: string, updates: Partial<BackendFollowUpItem>): Promise<void>;
  delete(id: string): Promise<void>;

  // Queue operations
  snooze(id: string, options: SnoozeOptions): Promise<void>;
  complete(id: string): Promise<void>;
  archive(id: string): Promise<void>;

  // Bulk operations
  bulkUpdate(ids: string[], updates: Partial<BackendFollowUpItem>): Promise<{
    successful: string[];
    failed: Array<{ id: string; error: string }>;
  }>;
}

/**
 * Queue Handler Class
 */
export class QueueHandler {
  private backendService: BackendQueueService;

  constructor(backendService: BackendQueueService) {
    this.backendService = backendService;
  }

  /**
   * List queue items with pagination, filtering, and sorting
   * GET /api/queue
   */
  async listQueue(request: ApiRequest): Promise<QueueListResponse> {
    try {
      const params = request.parameters;

      // Parse and validate pagination
      const page = Math.max(1, parseInt(params.page || '1'));
      const pageSize = Math.min(
        Math.max(1, parseInt(params.pageSize || '20')),
        100 // Max 100 items per page
      );

      // Parse and validate filter
      const filter: QueueFilter = {};

      if (params.status) {
        filter.status = params.status.split(',') as any;
      }

      if (params.priority) {
        filter.priority = params.priority.split(',') as any;
      }

      if (params.category) {
        filter.category = params.category.split(',');
      }

      if (params.slaStatus) {
        filter.slaStatus = params.slaStatus.split(',') as any;
      }

      if (params.dateFrom) {
        filter.dateFrom = params.dateFrom;
      }

      if (params.dateTo) {
        filter.dateTo = params.dateTo;
      }

      if (params.search) {
        filter.search = params.search;
      }

      if (params.labels) {
        filter.labels = params.labels.split(',');
      }

      if (params.hasAttachments !== undefined) {
        filter.hasAttachments = params.hasAttachments === 'true';
      }

      // Validate filter
      if (Object.keys(filter).length > 0) {
        validate(queueFilterSchema, filter);
      }

      // Parse and validate sort
      const sort: QueueSort = {
        field: params.sortBy || 'date',
        direction: (params.sortDir as 'asc' | 'desc') || 'desc'
      };

      validate(queueSortSchema, sort);

      Logger.info('QueueHandler', 'Listing queue items', {
        user: request.user,
        page,
        pageSize,
        filter,
        sort
      });

      // Query backend
      const result = await this.backendService.query({
        filter,
        sort,
        page,
        pageSize
      });

      // Transform items to API format
      const items = result.items.map(item =>
        QueueTransformer.toApiModel(item)
      );

      const response: QueueListResponse = {
        items,
        total: result.total,
        page,
        pageSize,
        hasMore: result.total > page * pageSize
      };

      Logger.info('QueueHandler', 'Queue items listed', {
        user: request.user,
        count: items.length,
        total: result.total
      });

      return response;
    } catch (error) {
      Logger.error('QueueHandler', 'Failed to list queue items', error);
      throw error;
    }
  }

  /**
   * Get single queue item by ID
   * GET /api/queue/:id
   */
  async getQueueItem(request: ApiRequest): Promise<QueueItem> {
    try {
      const id = request.pathParams?.id;

      if (!id) {
        throw new ValidationError('Missing queue item ID');
      }

      Logger.info('QueueHandler', 'Getting queue item', {
        user: request.user,
        id
      });

      const item = await this.backendService.getById(id);

      if (!item) {
        throw new NotFoundError(`Queue item ${id} not found`);
      }

      const apiItem = QueueTransformer.toApiModel(item);

      Logger.debug('QueueHandler', 'Queue item retrieved', {
        id,
        subject: apiItem.subject
      });

      return apiItem;
    } catch (error) {
      Logger.error('QueueHandler', 'Failed to get queue item', error);
      throw error;
    }
  }

  /**
   * Create new queue item
   * POST /api/queue
   */
  async createQueueItem(request: ApiRequest): Promise<QueueItem> {
    try {
      const data = request.postData;

      // Validate input
      const validated = validate(queueItemCreateSchema, data);

      Logger.info('QueueHandler', 'Creating queue item', {
        user: request.user,
        emailId: validated.emailId
      });

      // Transform to backend model
      const backendItem = QueueTransformer.toBackendModel(validated);

      // Create in backend
      const id = await this.backendService.create(backendItem);

      // Retrieve created item
      const created = await this.backendService.getById(id);

      if (!created) {
        throw new Error('Failed to retrieve created item');
      }

      const apiItem = QueueTransformer.toApiModel(created);

      Logger.info('QueueHandler', 'Queue item created', {
        user: request.user,
        id,
        emailId: apiItem.emailId
      });

      return apiItem;
    } catch (error) {
      Logger.error('QueueHandler', 'Failed to create queue item', error);
      throw error;
    }
  }

  /**
   * Update existing queue item
   * PUT /api/queue/:id
   */
  async updateQueueItem(request: ApiRequest): Promise<QueueItem> {
    try {
      const id = request.pathParams?.id;

      if (!id) {
        throw new ValidationError('Missing queue item ID');
      }

      const data = request.postData;

      // Validate update data
      const validated = validate(queueItemPartialSchema, data);

      Logger.info('QueueHandler', 'Updating queue item', {
        user: request.user,
        id,
        fields: Object.keys(validated)
      });

      // Transform to backend model
      const backendUpdates = QueueTransformer.toBackendModel(validated);

      // Update in backend
      await this.backendService.update(id, backendUpdates);

      // Retrieve updated item
      const updated = await this.backendService.getById(id);

      if (!updated) {
        throw new NotFoundError(`Queue item ${id} not found after update`);
      }

      const apiItem = QueueTransformer.toApiModel(updated);

      Logger.info('QueueHandler', 'Queue item updated', {
        user: request.user,
        id
      });

      return apiItem;
    } catch (error) {
      Logger.error('QueueHandler', 'Failed to update queue item', error);
      throw error;
    }
  }

  /**
   * Delete queue item
   * DELETE /api/queue/:id
   */
  async deleteQueueItem(request: ApiRequest): Promise<{ message: string; id: string }> {
    try {
      const id = request.pathParams?.id;

      if (!id) {
        throw new ValidationError('Missing queue item ID');
      }

      Logger.info('QueueHandler', 'Deleting queue item', {
        user: request.user,
        id
      });

      // Verify item exists
      const item = await this.backendService.getById(id);
      if (!item) {
        throw new NotFoundError(`Queue item ${id} not found`);
      }

      // Delete from backend
      await this.backendService.delete(id);

      Logger.info('QueueHandler', 'Queue item deleted', {
        user: request.user,
        id
      });

      return {
        message: `Queue item ${id} deleted successfully`,
        id
      };
    } catch (error) {
      Logger.error('QueueHandler', 'Failed to delete queue item', error);
      throw error;
    }
  }

  /**
   * Snooze queue item until specified time
   * POST /api/queue/:id/snooze
   */
  async snoozeItem(request: ApiRequest): Promise<QueueItem> {
    try {
      const id = request.pathParams?.id;

      if (!id) {
        throw new ValidationError('Missing queue item ID');
      }

      const data = request.postData;

      // Validate snooze options
      const options = validate(snoozeOptionsSchema, data);

      Logger.info('QueueHandler', 'Snoozing queue item', {
        user: request.user,
        id,
        until: options.until
      });

      // Snooze in backend
      await this.backendService.snooze(id, options);

      // Retrieve updated item
      const updated = await this.backendService.getById(id);

      if (!updated) {
        throw new NotFoundError(`Queue item ${id} not found after snooze`);
      }

      const apiItem = QueueTransformer.toApiModel(updated);

      Logger.info('QueueHandler', 'Queue item snoozed', {
        user: request.user,
        id,
        until: apiItem.snoozeUntil
      });

      return apiItem;
    } catch (error) {
      Logger.error('QueueHandler', 'Failed to snooze queue item', error);
      throw error;
    }
  }

  /**
   * Mark queue item as completed
   * POST /api/queue/:id/complete
   */
  async completeItem(request: ApiRequest): Promise<QueueItem> {
    try {
      const id = request.pathParams?.id;

      if (!id) {
        throw new ValidationError('Missing queue item ID');
      }

      Logger.info('QueueHandler', 'Completing queue item', {
        user: request.user,
        id
      });

      // Complete in backend
      await this.backendService.complete(id);

      // Retrieve updated item
      const updated = await this.backendService.getById(id);

      if (!updated) {
        throw new NotFoundError(`Queue item ${id} not found after completion`);
      }

      const apiItem = QueueTransformer.toApiModel(updated);

      Logger.info('QueueHandler', 'Queue item completed', {
        user: request.user,
        id,
        status: apiItem.status
      });

      return apiItem;
    } catch (error) {
      Logger.error('QueueHandler', 'Failed to complete queue item', error);
      throw error;
    }
  }

  /**
   * Archive queue item
   * POST /api/queue/:id/archive
   */
  async archiveItem(request: ApiRequest): Promise<QueueItem> {
    try {
      const id = request.pathParams?.id;

      if (!id) {
        throw new ValidationError('Missing queue item ID');
      }

      Logger.info('QueueHandler', 'Archiving queue item', {
        user: request.user,
        id
      });

      // Archive in backend
      await this.backendService.archive(id);

      // Retrieve updated item
      const updated = await this.backendService.getById(id);

      if (!updated) {
        throw new NotFoundError(`Queue item ${id} not found after archive`);
      }

      const apiItem = QueueTransformer.toApiModel(updated);

      Logger.info('QueueHandler', 'Queue item archived', {
        user: request.user,
        id,
        status: apiItem.status
      });

      return apiItem;
    } catch (error) {
      Logger.error('QueueHandler', 'Failed to archive queue item', error);
      throw error;
    }
  }

  /**
   * Bulk operations on multiple queue items
   * POST /api/queue/bulk
   */
  async bulkOperation(request: ApiRequest): Promise<{
    success: number;
    failed: number;
    errors: Array<{ id: string; error: string }>;
  }> {
    try {
      const data = request.postData;

      // Validate bulk operation request
      const validated = validate(bulkOperationRequestSchema, data);

      const { action, itemIds, params } = validated;

      Logger.info('QueueHandler', 'Bulk operation', {
        user: request.user,
        action,
        count: itemIds.length
      });

      let result: {
        successful: string[];
        failed: Array<{ id: string; error: string }>;
      };

      // Handle different bulk actions
      switch (action) {
        case 'complete':
          result = await this.bulkComplete(itemIds);
          break;

        case 'archive':
          result = await this.bulkArchive(itemIds);
          break;

        case 'delete':
          result = await this.bulkDelete(itemIds);
          break;

        case 'change_priority':
          if (!params?.priority) {
            throw new ValidationError('Missing priority for change_priority action');
          }
          result = await this.bulkChangePriority(itemIds, params.priority);
          break;

        case 'change_status':
          if (!params?.status) {
            throw new ValidationError('Missing status for change_status action');
          }
          result = await this.bulkChangeStatus(itemIds, params.status);
          break;

        case 'snooze':
          if (!params?.snoozeUntil) {
            throw new ValidationError('Missing snoozeUntil for snooze action');
          }
          result = await this.bulkSnooze(itemIds, params.snoozeUntil);
          break;

        default:
          throw new ValidationError(`Unknown bulk action: ${action}`);
      }

      Logger.info('QueueHandler', 'Bulk operation completed', {
        user: request.user,
        action,
        successful: result.successful.length,
        failed: result.failed.length
      });

      return {
        success: result.successful.length,
        failed: result.failed.length,
        errors: result.failed
      };
    } catch (error) {
      Logger.error('QueueHandler', 'Failed bulk operation', error);
      throw error;
    }
  }

  /**
   * Bulk complete items
   */
  private async bulkComplete(ids: string[]): Promise<{
    successful: string[];
    failed: Array<{ id: string; error: string }>;
  }> {
    const successful: string[] = [];
    const failed: Array<{ id: string; error: string }> = [];

    for (const id of ids) {
      try {
        await this.backendService.complete(id);
        successful.push(id);
      } catch (error) {
        failed.push({
          id,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    return { successful, failed };
  }

  /**
   * Bulk archive items
   */
  private async bulkArchive(ids: string[]): Promise<{
    successful: string[];
    failed: Array<{ id: string; error: string }>;
  }> {
    const successful: string[] = [];
    const failed: Array<{ id: string; error: string }> = [];

    for (const id of ids) {
      try {
        await this.backendService.archive(id);
        successful.push(id);
      } catch (error) {
        failed.push({
          id,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    return { successful, failed };
  }

  /**
   * Bulk delete items
   */
  private async bulkDelete(ids: string[]): Promise<{
    successful: string[];
    failed: Array<{ id: string; error: string }>;
  }> {
    const successful: string[] = [];
    const failed: Array<{ id: string; error: string }> = [];

    for (const id of ids) {
      try {
        await this.backendService.delete(id);
        successful.push(id);
      } catch (error) {
        failed.push({
          id,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    return { successful, failed };
  }

  /**
   * Bulk change priority
   */
  private async bulkChangePriority(
    ids: string[],
    priority: 'high' | 'medium' | 'low'
  ): Promise<{
    successful: string[];
    failed: Array<{ id: string; error: string }>;
  }> {
    const backendPriority = QueueTransformer.toBackendModel({ priority }).priority!;

    return await this.backendService.bulkUpdate(ids, {
      priority: backendPriority
    });
  }

  /**
   * Bulk change status
   */
  private async bulkChangeStatus(
    ids: string[],
    status: 'pending' | 'processing' | 'completed' | 'snoozed' | 'archived'
  ): Promise<{
    successful: string[];
    failed: Array<{ id: string; error: string }>;
  }> {
    const backendStatus = QueueTransformer.toBackendModel({ status }).status!;

    return await this.backendService.bulkUpdate(ids, {
      status: backendStatus
    });
  }

  /**
   * Bulk snooze items
   */
  private async bulkSnooze(ids: string[], until: string): Promise<{
    successful: string[];
    failed: Array<{ id: string; error: string }>;
  }> {
    const successful: string[] = [];
    const failed: Array<{ id: string; error: string }> = [];

    for (const id of ids) {
      try {
        await this.backendService.snooze(id, { until });
        successful.push(id);
      } catch (error) {
        failed.push({
          id,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    return { successful, failed };
  }
}

/**
 * Mock Backend Queue Service
 * For testing and development
 */
export class MockBackendQueueService implements BackendQueueService {
  private items: Map<string, BackendFollowUpItem> = new Map();
  private nextId = 1;

  constructor() {
    // Initialize with some mock data
    this.seedMockData();
  }

  /**
   * Seed with mock queue items
   */
  private seedMockData(): void {
    const priorities: Array<'HIGH' | 'MEDIUM' | 'LOW'> = ['HIGH', 'MEDIUM', 'LOW'];
    const statuses: Array<'ACTIVE' | 'SNOOZED' | 'COMPLETED'> = ['ACTIVE', 'SNOOZED', 'COMPLETED'];
    const categories = ['work', 'personal', 'finance'];

    for (let i = 0; i < 25; i++) {
      const id = `mock-${this.nextId++}`;
      const date = new Date();
      date.setDate(date.getDate() - Math.floor(Math.random() * 7));

      this.items.set(id, {
        id,
        emailId: `email-${i}`,
        threadId: `thread-${i}`,
        subject: `Test Email ${i + 1}`,
        from: `sender${i}@example.com`,
        to: 'recipient@example.com',
        receivedDate: date,
        priority: priorities[Math.floor(Math.random() * priorities.length)],
        category: categories[Math.floor(Math.random() * categories.length)],
        labels: ['important'],
        reason: 'NEEDS_REPLY',
        status: statuses[Math.floor(Math.random() * statuses.length)],
        addedToQueueAt: date,
        slaStatus: 'ON_TIME',
        createdAt: date,
        updatedAt: date,
        actionCount: 0,
        snoozeCount: 0
      });
    }
  }

  async query(options: {
    filter?: QueueFilter;
    sort?: QueueSort;
    page?: number;
    pageSize?: number;
  }): Promise<{ items: BackendFollowUpItem[]; total: number }> {
    let items = Array.from(this.items.values());

    // Apply filters
    if (options.filter) {
      const filter = options.filter;

      if (filter.status && filter.status.length > 0) {
        const backendStatuses = filter.status.map(s =>
          QueueTransformer.toBackendModel({ status: s as any }).status!
        );
        items = items.filter(item => backendStatuses.includes(item.status));
      }

      if (filter.priority && filter.priority.length > 0) {
        const backendPriorities = filter.priority.map(p =>
          QueueTransformer.toBackendModel({ priority: p as any }).priority!
        );
        items = items.filter(item => backendPriorities.includes(item.priority));
      }

      if (filter.category && filter.category.length > 0) {
        items = items.filter(item =>
          filter.category!.includes(item.category)
        );
      }

      if (filter.search) {
        const search = filter.search.toLowerCase();
        items = items.filter(item =>
          item.subject.toLowerCase().includes(search) ||
          item.from.toLowerCase().includes(search)
        );
      }
    }

    const total = items.length;

    // Apply sorting
    if (options.sort) {
      const { field, direction } = options.sort;
      items.sort((a, b) => {
        let aVal: any = (a as any)[field];
        let bVal: any = (b as any)[field];

        // Handle API field names vs backend field names
        if (field === 'date') {
          aVal = a.receivedDate;
          bVal = b.receivedDate;
        }

        if (aVal instanceof Date && bVal instanceof Date) {
          return direction === 'asc'
            ? aVal.getTime() - bVal.getTime()
            : bVal.getTime() - aVal.getTime();
        }

        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return direction === 'asc'
            ? aVal.localeCompare(bVal)
            : bVal.localeCompare(aVal);
        }

        return 0;
      });
    }

    // Apply pagination
    const page = options.page || 1;
    const pageSize = options.pageSize || 20;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;

    items = items.slice(start, end);

    return { items, total };
  }

  async getById(id: string): Promise<BackendFollowUpItem | null> {
    return this.items.get(id) || null;
  }

  async create(item: Partial<BackendFollowUpItem>): Promise<string> {
    const id = `mock-${this.nextId++}`;
    const now = new Date();

    const newItem: BackendFollowUpItem = {
      id,
      emailId: item.emailId || `email-${id}`,
      threadId: item.threadId || `thread-${id}`,
      subject: item.subject || 'New Item',
      from: item.from || 'sender@example.com',
      to: item.to || 'recipient@example.com',
      receivedDate: item.receivedDate || now,
      priority: item.priority || 'MEDIUM',
      category: item.category || 'work',
      labels: item.labels || [],
      reason: item.reason || 'MANUAL_FOLLOW_UP',
      status: item.status || 'ACTIVE',
      addedToQueueAt: now,
      slaStatus: 'ON_TIME',
      createdAt: now,
      updatedAt: now,
      actionCount: 0,
      snoozeCount: 0
    };

    this.items.set(id, newItem);
    return id;
  }

  async update(id: string, updates: Partial<BackendFollowUpItem>): Promise<void> {
    const item = this.items.get(id);
    if (!item) {
      throw new Error(`Item ${id} not found`);
    }

    Object.assign(item, updates, { updatedAt: new Date() });
  }

  async delete(id: string): Promise<void> {
    if (!this.items.has(id)) {
      throw new Error(`Item ${id} not found`);
    }

    this.items.delete(id);
  }

  async snooze(id: string, options: SnoozeOptions): Promise<void> {
    const item = this.items.get(id);
    if (!item) {
      throw new Error(`Item ${id} not found`);
    }

    item.status = 'SNOOZED';
    item.snoozedUntil = new Date(options.until);
    item.snoozeCount++;
    item.updatedAt = new Date();
  }

  async complete(id: string): Promise<void> {
    const item = this.items.get(id);
    if (!item) {
      throw new Error(`Item ${id} not found`);
    }

    item.status = 'COMPLETED';
    item.updatedAt = new Date();
  }

  async archive(id: string): Promise<void> {
    const item = this.items.get(id);
    if (!item) {
      throw new Error(`Item ${id} not found`);
    }

    item.status = 'ARCHIVED';
    item.updatedAt = new Date();
  }

  async bulkUpdate(ids: string[], updates: Partial<BackendFollowUpItem>): Promise<{
    successful: string[];
    failed: Array<{ id: string; error: string }>;
  }> {
    const successful: string[] = [];
    const failed: Array<{ id: string; error: string }> = [];

    for (const id of ids) {
      try {
        await this.update(id, updates);
        successful.push(id);
      } catch (error) {
        failed.push({
          id,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    return { successful, failed };
  }
}

/**
 * Factory function to create queue handler
 */
export function createQueueHandler(useMock: boolean = false): QueueHandler {
  const backendService = useMock
    ? new MockBackendQueueService()
    : new MockBackendQueueService(); // TODO: Replace with real backend

  return new QueueHandler(backendService);
}

/**
 * Default handler instance
 */
export const queueHandler = createQueueHandler(true); // Set to false for production
