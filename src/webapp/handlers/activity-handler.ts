/**
 * Activity Log Handler
 * Handles retrieval and filtering of activity/audit logs
 */

import { ApiRequest } from '../types/api-types';
import { ActivityLogEntry } from '../../types/shared-models';
import { AuditService } from '../middleware/audit';
import { ValidationError } from '../types/api-types';
import Logger from '../../core/logger';

/**
 * Activity filter options
 */
export interface ActivityFilter {
  queueItemId?: string;
  user?: string;
  action?: string[];
  dateFrom?: string; // ISO 8601 date
  dateTo?: string; // ISO 8601 date
  success?: boolean;
}

/**
 * Activity list response
 */
export interface ActivityListResponse {
  logs: ActivityLogEntry[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

/**
 * Backend Activity Service Interface
 */
export interface BackendActivityService {
  // Get logs with filtering and pagination
  getLogs(options: {
    filter?: ActivityFilter;
    page?: number;
    pageSize?: number;
  }): Promise<{ logs: ActivityLogEntry[]; total: number }>;

  // Get logs for specific queue item
  getLogsForItem(queueItemId: string, limit?: number): Promise<ActivityLogEntry[]>;

  // Get logs for specific user
  getLogsForUser(user: string, limit?: number): Promise<ActivityLogEntry[]>;

  // Get recent system activity
  getRecentActivity(limit?: number): Promise<ActivityLogEntry[]>;

  // Get failed requests (audit logs with errors)
  getFailedRequests(limit?: number): Promise<ActivityLogEntry[]>;
}

/**
 * Activity Handler Class
 */
export class ActivityHandler {
  private backendService: BackendActivityService;

  constructor(backendService: BackendActivityService) {
    this.backendService = backendService;
  }

  /**
   * Get activity logs with filtering and pagination
   * GET /api/activity
   */
  async getActivityLogs(request: ApiRequest): Promise<ActivityListResponse> {
    try {
      const params = request.parameters;

      // Parse pagination
      const page = Math.max(1, parseInt(params.page || '1'));
      const pageSize = Math.min(
        Math.max(1, parseInt(params.pageSize || '50')),
        200 // Max 200 logs per page
      );

      // Parse filter
      const filter: ActivityFilter = {};

      if (params.queueItemId) {
        filter.queueItemId = params.queueItemId;
      }

      if (params.user) {
        filter.user = params.user;
      }

      if (params.action) {
        filter.action = params.action.split(',');
      }

      if (params.dateFrom) {
        filter.dateFrom = params.dateFrom;
      }

      if (params.dateTo) {
        filter.dateTo = params.dateTo;
      }

      if (params.success !== undefined) {
        filter.success = params.success === 'true';
      }

      Logger.info('ActivityHandler', 'Getting activity logs', {
        user: request.user,
        page,
        pageSize,
        filter
      });

      // Query backend
      const result = await this.backendService.getLogs({
        filter,
        page,
        pageSize
      });

      const response: ActivityListResponse = {
        logs: result.logs,
        total: result.total,
        page,
        pageSize,
        hasMore: result.total > page * pageSize
      };

      Logger.debug('ActivityHandler', 'Activity logs retrieved', {
        user: request.user,
        count: result.logs.length,
        total: result.total
      });

      return response;
    } catch (error) {
      Logger.error('ActivityHandler', 'Failed to get activity logs', error);
      throw error;
    }
  }

  /**
   * Get activity logs for specific queue item
   * GET /api/activity/item/:id
   */
  async getLogsForItem(request: ApiRequest): Promise<{ logs: ActivityLogEntry[] }> {
    try {
      const queueItemId = request.pathParams?.id;

      if (!queueItemId) {
        throw new ValidationError('Missing queue item ID');
      }

      const limit = parseInt(request.parameters.limit || '100');

      Logger.info('ActivityHandler', 'Getting logs for queue item', {
        user: request.user,
        queueItemId,
        limit
      });

      const logs = await this.backendService.getLogsForItem(queueItemId, limit);

      Logger.debug('ActivityHandler', 'Item logs retrieved', {
        queueItemId,
        count: logs.length
      });

      return { logs };
    } catch (error) {
      Logger.error('ActivityHandler', 'Failed to get logs for item', error);
      throw error;
    }
  }

  /**
   * Get activity logs for current user
   * GET /api/activity/user
   */
  async getLogsForUser(request: ApiRequest): Promise<{ logs: ActivityLogEntry[] }> {
    try {
      const user = request.user;

      if (!user) {
        throw new ValidationError('User required');
      }

      const limit = parseInt(request.parameters.limit || '100');

      Logger.info('ActivityHandler', 'Getting logs for user', {
        user,
        limit
      });

      const logs = await this.backendService.getLogsForUser(user, limit);

      Logger.debug('ActivityHandler', 'User logs retrieved', {
        user,
        count: logs.length
      });

      return { logs };
    } catch (error) {
      Logger.error('ActivityHandler', 'Failed to get logs for user', error);
      throw error;
    }
  }

  /**
   * Get recent system activity
   * GET /api/activity/system
   */
  async getSystemActivity(request: ApiRequest): Promise<{ logs: ActivityLogEntry[] }> {
    try {
      const limit = parseInt(request.parameters.limit || '100');

      Logger.info('ActivityHandler', 'Getting system activity', {
        user: request.user,
        limit
      });

      const logs = await this.backendService.getRecentActivity(limit);

      Logger.debug('ActivityHandler', 'System activity retrieved', {
        count: logs.length
      });

      return { logs };
    } catch (error) {
      Logger.error('ActivityHandler', 'Failed to get system activity', error);
      throw error;
    }
  }

  /**
   * Get failed requests
   * GET /api/activity/failed
   */
  async getFailedRequests(request: ApiRequest): Promise<{ logs: ActivityLogEntry[] }> {
    try {
      const limit = parseInt(request.parameters.limit || '100');

      Logger.info('ActivityHandler', 'Getting failed requests', {
        user: request.user,
        limit
      });

      const logs = await this.backendService.getFailedRequests(limit);

      Logger.debug('ActivityHandler', 'Failed requests retrieved', {
        count: logs.length
      });

      return { logs };
    } catch (error) {
      Logger.error('ActivityHandler', 'Failed to get failed requests', error);
      throw error;
    }
  }
}

/**
 * Mock Backend Activity Service
 * For testing and development
 */
export class MockBackendActivityService implements BackendActivityService {
  private logs: ActivityLogEntry[] = [];

  constructor() {
    // Seed with mock activity logs
    this.seedMockLogs();
  }

  /**
   * Seed mock activity logs
   */
  private seedMockLogs(): void {
    const actions = ['created', 'updated', 'snoozed', 'completed', 'archived', 'deleted'];
    const users = ['user1@example.com', 'user2@example.com', 'admin@example.com'];
    const queueItems = ['queue-1', 'queue-2', 'queue-3', 'queue-4', 'queue-5'];

    // Generate 50 mock logs
    for (let i = 0; i < 50; i++) {
      const timestamp = new Date();
      timestamp.setHours(timestamp.getHours() - Math.floor(Math.random() * 72)); // Last 3 days

      const success = Math.random() > 0.1; // 90% success rate
      const action = actions[Math.floor(Math.random() * actions.length)];

      this.logs.push({
        id: `log-${i + 1}`,
        queueItemId: queueItems[Math.floor(Math.random() * queueItems.length)],
        action: action as any,
        performedBy: users[Math.floor(Math.random() * users.length)],
        timestamp: timestamp.toISOString(),
        changes: action === 'updated' ? {
          priority: { before: 'medium', after: 'high' }
        } : undefined,
        comment: success ? undefined : 'Operation failed: timeout'
      });
    }

    // Sort by timestamp (newest first)
    this.logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  /**
   * Get logs with filtering and pagination
   */
  async getLogs(options: {
    filter?: ActivityFilter;
    page?: number;
    pageSize?: number;
  }): Promise<{ logs: ActivityLogEntry[]; total: number }> {
    let filtered = [...this.logs];

    // Apply filters
    if (options.filter) {
      const filter = options.filter;

      if (filter.queueItemId) {
        filtered = filtered.filter(log => log.queueItemId === filter.queueItemId);
      }

      if (filter.user) {
        filtered = filtered.filter(log => log.performedBy === filter.user);
      }

      if (filter.action && filter.action.length > 0) {
        filtered = filtered.filter(log => filter.action!.includes(log.action));
      }

      if (filter.dateFrom) {
        const fromDate = new Date(filter.dateFrom);
        filtered = filtered.filter(log => new Date(log.timestamp) >= fromDate);
      }

      if (filter.dateTo) {
        const toDate = new Date(filter.dateTo);
        filtered = filtered.filter(log => new Date(log.timestamp) <= toDate);
      }

      if (filter.success !== undefined) {
        filtered = filtered.filter(log => {
          const hasError = log.comment?.includes('failed') || log.comment?.includes('error');
          return filter.success ? !hasError : hasError;
        });
      }
    }

    const total = filtered.length;

    // Apply pagination
    const page = options.page || 1;
    const pageSize = options.pageSize || 50;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;

    const logs = filtered.slice(start, end);

    return { logs, total };
  }

  /**
   * Get logs for specific queue item
   */
  async getLogsForItem(queueItemId: string, limit: number = 100): Promise<ActivityLogEntry[]> {
    return this.logs
      .filter(log => log.queueItemId === queueItemId)
      .slice(0, limit);
  }

  /**
   * Get logs for specific user
   */
  async getLogsForUser(user: string, limit: number = 100): Promise<ActivityLogEntry[]> {
    return this.logs
      .filter(log => log.performedBy === user)
      .slice(0, limit);
  }

  /**
   * Get recent system activity
   */
  async getRecentActivity(limit: number = 100): Promise<ActivityLogEntry[]> {
    return this.logs.slice(0, limit);
  }

  /**
   * Get failed requests
   */
  async getFailedRequests(limit: number = 100): Promise<ActivityLogEntry[]> {
    return this.logs
      .filter(log => log.comment?.includes('failed') || log.comment?.includes('error'))
      .slice(0, limit);
  }
}

/**
 * GAS Backend Activity Service
 * Uses AuditService to retrieve logs from cache and sheets
 */
export class GASBackendActivityService implements BackendActivityService {
  private auditService: AuditService;

  constructor() {
    this.auditService = new AuditService();
  }

  /**
   * Get logs with filtering and pagination
   */
  async getLogs(options: {
    filter?: ActivityFilter;
    page?: number;
    pageSize?: number;
  }): Promise<{ logs: ActivityLogEntry[]; total: number }> {
    try {
      // Get recent logs from audit service
      const recentLogs = await this.auditService.getRecentLogs(1000); // Get up to 1000 recent

      // Convert audit logs to activity logs
      let logs = recentLogs.map(log => this.auditLogToActivityLog(log));

      // Apply filters
      if (options.filter) {
        logs = this.applyFilters(logs, options.filter);
      }

      const total = logs.length;

      // Apply pagination
      const page = options.page || 1;
      const pageSize = options.pageSize || 50;
      const start = (page - 1) * pageSize;
      const end = start + pageSize;

      const paginatedLogs = logs.slice(start, end);

      return { logs: paginatedLogs, total };
    } catch (error) {
      Logger.error('GASBackendActivityService', 'Failed to get logs', error);
      return { logs: [], total: 0 };
    }
  }

  /**
   * Get logs for specific queue item
   */
  async getLogsForItem(queueItemId: string, limit: number = 100): Promise<ActivityLogEntry[]> {
    try {
      const allLogs = await this.auditService.getRecentLogs(1000);
      const logs = allLogs
        .map(log => this.auditLogToActivityLog(log))
        .filter(log => log.queueItemId === queueItemId)
        .slice(0, limit);

      return logs;
    } catch (error) {
      Logger.error('GASBackendActivityService', 'Failed to get logs for item', error);
      return [];
    }
  }

  /**
   * Get logs for specific user
   */
  async getLogsForUser(user: string, limit: number = 100): Promise<ActivityLogEntry[]> {
    try {
      const logs = await this.auditService.getLogsByUser(user);
      return logs.map(log => this.auditLogToActivityLog(log)).slice(0, limit);
    } catch (error) {
      Logger.error('GASBackendActivityService', 'Failed to get logs for user', error);
      return [];
    }
  }

  /**
   * Get recent system activity
   */
  async getRecentActivity(limit: number = 100): Promise<ActivityLogEntry[]> {
    try {
      const logs = await this.auditService.getRecentLogs(limit);
      return logs.map(log => this.auditLogToActivityLog(log));
    } catch (error) {
      Logger.error('GASBackendActivityService', 'Failed to get recent activity', error);
      return [];
    }
  }

  /**
   * Get failed requests
   */
  async getFailedRequests(limit: number = 100): Promise<ActivityLogEntry[]> {
    try {
      const failedLogs = await this.auditService.getFailedRequests();
      return failedLogs
        .map(log => this.auditLogToActivityLog(log))
        .slice(0, limit);
    } catch (error) {
      Logger.error('GASBackendActivityService', 'Failed to get failed requests', error);
      return [];
    }
  }

  /**
   * Convert audit log to activity log
   */
  private auditLogToActivityLog(auditLog: any): ActivityLogEntry {
    // Extract queue item ID from path if available
    const queueItemId = this.extractQueueItemId(auditLog.path);

    // Determine action from path and method
    const action = this.determineAction(auditLog.path, auditLog.method);

    return {
      id: auditLog.requestId,
      queueItemId: queueItemId || 'unknown',
      action: action as any,
      performedBy: auditLog.user,
      timestamp: auditLog.timestamp,
      comment: auditLog.error || undefined
    };
  }

  /**
   * Extract queue item ID from path
   */
  private extractQueueItemId(path: string): string | null {
    // Match patterns like /api/queue/:id
    const match = path.match(/\/api\/queue\/([^\/]+)/);
    return match ? match[1] : null;
  }

  /**
   * Determine action from path and method
   */
  private determineAction(path: string, method: string): string {
    if (path.includes('/snooze')) return 'snoozed';
    if (path.includes('/complete')) return 'completed';
    if (path.includes('/archive')) return 'archived';

    if (method === 'POST' && path.includes('/queue') && !path.includes('/')) return 'created';
    if (method === 'PUT') return 'updated';
    if (method === 'DELETE') return 'deleted';

    return 'accessed';
  }

  /**
   * Apply filters to logs
   */
  private applyFilters(logs: ActivityLogEntry[], filter: ActivityFilter): ActivityLogEntry[] {
    let filtered = logs;

    if (filter.queueItemId) {
      filtered = filtered.filter(log => log.queueItemId === filter.queueItemId);
    }

    if (filter.user) {
      filtered = filtered.filter(log => log.performedBy === filter.user);
    }

    if (filter.action && filter.action.length > 0) {
      filtered = filtered.filter(log => filter.action!.includes(log.action));
    }

    if (filter.dateFrom) {
      const fromDate = new Date(filter.dateFrom);
      filtered = filtered.filter(log => new Date(log.timestamp) >= fromDate);
    }

    if (filter.dateTo) {
      const toDate = new Date(filter.dateTo);
      filtered = filtered.filter(log => new Date(log.timestamp) <= toDate);
    }

    if (filter.success !== undefined) {
      filtered = filtered.filter(log => {
        const hasError = !!log.comment;
        return filter.success ? !hasError : hasError;
      });
    }

    return filtered;
  }
}

/**
 * Factory function to create activity handler
 */
export function createActivityHandler(useMock: boolean = false): ActivityHandler {
  const backendService = useMock
    ? new MockBackendActivityService()
    : new GASBackendActivityService();

  return new ActivityHandler(backendService);
}

/**
 * Default handler instance
 */
export const activityHandler = createActivityHandler(true); // Set to false for production
