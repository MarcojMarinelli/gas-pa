/**
 * API Routes Registration
 * Registers all API endpoints with the router
 */

import { getRouter } from './router';
import { authMiddleware, optionalAuthMiddleware, requirePermission } from './middleware/auth';
import { rateLimitMiddleware } from './middleware/rate-limit';
import { loggingMiddleware } from './middleware/logging';
import { auditMiddleware } from './middleware/audit';
import { sanitizationMiddleware } from './middleware/sanitization';
import { createRequestValidationMiddleware } from './middleware/request-validation';
import { createSecurityHeadersMiddleware, corsMiddleware } from './middleware/security-headers';

// Handlers
import { healthCheck, detailedHealthCheck, ping } from './handlers/health';
import { login, logout, refreshToken, getCurrentUser } from './handlers/auth-handler';
import { metricsHandler } from './handlers/metrics-handler';
import { queueHandler } from './handlers/queue-handler';
import { processingHandler } from './handlers/processing-handler';
import { settingsHandler } from './handlers/settings-handler';
import { activityHandler } from './handlers/activity-handler';

/**
 * Initialize and register all routes
 */
export function registerRoutes(): void {
  const router = getRouter();

  // Common middleware stack for all routes
  const commonMiddleware = [
    corsMiddleware,
    createSecurityHeadersMiddleware(),
    loggingMiddleware
  ];

  // Authenticated routes middleware
  const authenticatedMiddleware = [
    ...commonMiddleware,
    createRequestValidationMiddleware(),
    sanitizationMiddleware,
    rateLimitMiddleware(100, 3600), // 100 requests per hour
    auditMiddleware,
    authMiddleware
  ];

  // Public routes middleware (no auth required)
  const publicMiddleware = [
    ...commonMiddleware,
    rateLimitMiddleware(20, 60) // 20 requests per minute for public
  ];

  /**
   * Health Check Routes
   * Public endpoints for monitoring
   */
  router.register({
    method: 'GET',
    path: '/health',
    handler: healthCheck,
    middleware: publicMiddleware,
    requireAuth: false,
    description: 'Basic health check'
  });

  router.register({
    method: 'GET',
    path: '/health/detailed',
    handler: detailedHealthCheck,
    middleware: [...publicMiddleware, optionalAuthMiddleware],
    requireAuth: false,
    description: 'Detailed health check with service status'
  });

  router.register({
    method: 'GET',
    path: '/ping',
    handler: ping,
    middleware: publicMiddleware,
    requireAuth: false,
    description: 'Simple ping endpoint'
  });

  /**
   * Authentication Routes
   * Login, logout, token management
   */
  router.register({
    method: 'POST',
    path: '/api/auth/login',
    handler: login,
    middleware: [
      ...commonMiddleware,
      rateLimitMiddleware(10, 60), // 10 login attempts per minute
      auditMiddleware
    ],
    requireAuth: false,
    description: 'User login'
  });

  router.register({
    method: 'POST',
    path: '/api/auth/logout',
    handler: logout,
    middleware: authenticatedMiddleware,
    requireAuth: true,
    description: 'User logout'
  });

  router.register({
    method: 'POST',
    path: '/api/auth/refresh',
    handler: refreshToken,
    middleware: authenticatedMiddleware,
    requireAuth: true,
    description: 'Refresh authentication token'
  });

  router.register({
    method: 'GET',
    path: '/api/auth/me',
    handler: getCurrentUser,
    middleware: authenticatedMiddleware,
    requireAuth: true,
    description: 'Get current user information'
  });

  /**
   * Metrics Routes
   * Dashboard metrics endpoints
   */
  router.register({
    method: 'GET',
    path: '/api/metrics',
    handler: async (request) => {
      return await metricsHandler.getMetrics(request);
    },
    middleware: [
      ...authenticatedMiddleware,
      requirePermission('read')
    ],
    requireAuth: true,
    description: 'Get dashboard metrics'
  });

  router.register({
    method: 'POST',
    path: '/api/metrics/refresh',
    handler: async (request) => {
      return await metricsHandler.refreshMetrics(request);
    },
    middleware: [
      ...authenticatedMiddleware,
      requirePermission('write')
    ],
    requireAuth: true,
    description: 'Force refresh metrics (clear cache)'
  });

  router.register({
    method: 'GET',
    path: '/api/metrics/status',
    handler: async (request) => {
      return await metricsHandler.getStatus(request);
    },
    middleware: [
      ...authenticatedMiddleware,
      requirePermission('read')
    ],
    requireAuth: true,
    description: 'Get metrics cache status'
  });

  /**
   * Queue Management Routes
   * CRUD operations for queue items
   */
  router.register({
    method: 'GET',
    path: '/api/queue',
    handler: async (request) => {
      return await queueHandler.listQueue(request);
    },
    middleware: [
      ...authenticatedMiddleware,
      requirePermission('read')
    ],
    requireAuth: true,
    description: 'List queue items (with pagination, filtering, sorting)'
  });

  router.register({
    method: 'GET',
    path: '/api/queue/:id',
    handler: async (request) => {
      return await queueHandler.getQueueItem(request);
    },
    middleware: [
      ...authenticatedMiddleware,
      requirePermission('read')
    ],
    requireAuth: true,
    description: 'Get single queue item by ID'
  });

  router.register({
    method: 'POST',
    path: '/api/queue',
    handler: async (request) => {
      return await queueHandler.createQueueItem(request);
    },
    middleware: [
      ...authenticatedMiddleware,
      requirePermission('write')
    ],
    requireAuth: true,
    description: 'Create new queue item'
  });

  router.register({
    method: 'PUT',
    path: '/api/queue/:id',
    handler: async (request) => {
      return await queueHandler.updateQueueItem(request);
    },
    middleware: [
      ...authenticatedMiddleware,
      requirePermission('write')
    ],
    requireAuth: true,
    description: 'Update queue item'
  });

  router.register({
    method: 'DELETE',
    path: '/api/queue/:id',
    handler: async (request) => {
      return await queueHandler.deleteQueueItem(request);
    },
    middleware: [
      ...authenticatedMiddleware,
      requirePermission('delete')
    ],
    requireAuth: true,
    description: 'Delete queue item'
  });

  /**
   * Queue Operations Routes
   * Snooze, complete, archive operations
   */
  router.register({
    method: 'POST',
    path: '/api/queue/:id/snooze',
    handler: async (request) => {
      return await queueHandler.snoozeItem(request);
    },
    middleware: [
      ...authenticatedMiddleware,
      requirePermission('write')
    ],
    requireAuth: true,
    description: 'Snooze queue item until specified time'
  });

  router.register({
    method: 'POST',
    path: '/api/queue/:id/complete',
    handler: async (request) => {
      return await queueHandler.completeItem(request);
    },
    middleware: [
      ...authenticatedMiddleware,
      requirePermission('write')
    ],
    requireAuth: true,
    description: 'Mark queue item as completed'
  });

  router.register({
    method: 'POST',
    path: '/api/queue/:id/archive',
    handler: async (request) => {
      return await queueHandler.archiveItem(request);
    },
    middleware: [
      ...authenticatedMiddleware,
      requirePermission('write')
    ],
    requireAuth: true,
    description: 'Archive queue item'
  });

  /**
   * Bulk Operations Route
   * Perform operations on multiple items
   */
  router.register({
    method: 'POST',
    path: '/api/queue/bulk',
    handler: async (request) => {
      return await queueHandler.bulkOperation(request);
    },
    middleware: [
      ...authenticatedMiddleware,
      requirePermission('write')
    ],
    requireAuth: true,
    description: 'Bulk operations on multiple queue items'
  });

  /**
   * Email Processing Routes
   * Email processing operations (single, batch, retry, analysis)
   */
  router.register({
    method: 'POST',
    path: '/api/process/email/:id',
    handler: async (request) => {
      return await processingHandler.processEmail(request);
    },
    middleware: [
      ...authenticatedMiddleware,
      requirePermission('write')
    ],
    requireAuth: true,
    description: 'Process single email'
  });

  router.register({
    method: 'POST',
    path: '/api/process/batch',
    handler: async (request) => {
      return await processingHandler.batchProcess(request);
    },
    middleware: [
      ...authenticatedMiddleware,
      requirePermission('write')
    ],
    requireAuth: true,
    description: 'Batch process multiple emails'
  });

  router.register({
    method: 'GET',
    path: '/api/process/status/:jobId',
    handler: async (request) => {
      return await processingHandler.getJobStatus(request);
    },
    middleware: [
      ...authenticatedMiddleware,
      requirePermission('read')
    ],
    requireAuth: true,
    description: 'Get processing job status'
  });

  router.register({
    method: 'POST',
    path: '/api/process/cancel/:jobId',
    handler: async (request) => {
      return await processingHandler.cancelJob(request);
    },
    middleware: [
      ...authenticatedMiddleware,
      requirePermission('write')
    ],
    requireAuth: true,
    description: 'Cancel processing job'
  });

  router.register({
    method: 'POST',
    path: '/api/process/retry/email/:id',
    handler: async (request) => {
      return await processingHandler.retryEmail(request);
    },
    middleware: [
      ...authenticatedMiddleware,
      requirePermission('write')
    ],
    requireAuth: true,
    description: 'Retry failed email processing'
  });

  router.register({
    method: 'POST',
    path: '/api/process/retry/job/:jobId',
    handler: async (request) => {
      return await processingHandler.retryJob(request);
    },
    middleware: [
      ...authenticatedMiddleware,
      requirePermission('write')
    ],
    requireAuth: true,
    description: 'Retry failed batch job'
  });

  router.register({
    method: 'POST',
    path: '/api/process/analyze/:id',
    handler: async (request) => {
      return await processingHandler.analyzeEmail(request);
    },
    middleware: [
      ...authenticatedMiddleware,
      requirePermission('read')
    ],
    requireAuth: true,
    description: 'Analyze email (extract all information)'
  });

  router.register({
    method: 'POST',
    path: '/api/process/extract-actions/:id',
    handler: async (request) => {
      return await processingHandler.extractActionItems(request);
    },
    middleware: [
      ...authenticatedMiddleware,
      requirePermission('read')
    ],
    requireAuth: true,
    description: 'Extract action items from email'
  });

  router.register({
    method: 'POST',
    path: '/api/process/categorize/:id',
    handler: async (request) => {
      return await processingHandler.categorizeEmail(request);
    },
    middleware: [
      ...authenticatedMiddleware,
      requirePermission('read')
    ],
    requireAuth: true,
    description: 'Categorize email'
  });

  router.register({
    method: 'POST',
    path: '/api/process/prioritize/:id',
    handler: async (request) => {
      return await processingHandler.determinePriority(request);
    },
    middleware: [
      ...authenticatedMiddleware,
      requirePermission('read')
    ],
    requireAuth: true,
    description: 'Determine email priority'
  });

  /**
   * Settings & Configuration Routes
   * User preferences and system configuration
   */
  router.register({
    method: 'GET',
    path: '/api/settings/user',
    handler: async (request) => {
      return await settingsHandler.getUserPreferences(request);
    },
    middleware: [
      ...authenticatedMiddleware,
      requirePermission('read')
    ],
    requireAuth: true,
    description: 'Get user preferences'
  });

  router.register({
    method: 'PUT',
    path: '/api/settings/user',
    handler: async (request) => {
      return await settingsHandler.updateUserPreferences(request);
    },
    middleware: [
      ...authenticatedMiddleware,
      requirePermission('write')
    ],
    requireAuth: true,
    description: 'Update user preferences'
  });

  router.register({
    method: 'POST',
    path: '/api/settings/user/reset',
    handler: async (request) => {
      return await settingsHandler.resetUserPreferences(request);
    },
    middleware: [
      ...authenticatedMiddleware,
      requirePermission('write')
    ],
    requireAuth: true,
    description: 'Reset user preferences to defaults'
  });

  router.register({
    method: 'GET',
    path: '/api/settings/user/defaults',
    handler: async (request) => {
      return await settingsHandler.getDefaultPreferences(request);
    },
    middleware: publicMiddleware,
    requireAuth: false,
    description: 'Get default user preferences'
  });

  router.register({
    method: 'GET',
    path: '/api/settings/system',
    handler: async (request) => {
      return await settingsHandler.getSystemConfiguration(request);
    },
    middleware: [
      ...authenticatedMiddleware,
      requirePermission('admin')
    ],
    requireAuth: true,
    description: 'Get system configuration (admin only)'
  });

  router.register({
    method: 'PUT',
    path: '/api/settings/system',
    handler: async (request) => {
      return await settingsHandler.updateSystemConfiguration(request);
    },
    middleware: [
      ...authenticatedMiddleware,
      requirePermission('admin')
    ],
    requireAuth: true,
    description: 'Update system configuration (admin only)'
  });

  router.register({
    method: 'GET',
    path: '/api/settings/system/defaults',
    handler: async (request) => {
      return await settingsHandler.getDefaultConfiguration(request);
    },
    middleware: [
      ...authenticatedMiddleware,
      requirePermission('admin')
    ],
    requireAuth: true,
    description: 'Get default system configuration (admin only)'
  });

  /**
   * Activity & Audit Log Routes
   * Activity logs, audit trail, and monitoring
   */
  router.register({
    method: 'GET',
    path: '/api/activity',
    handler: async (request) => {
      return await activityHandler.getActivityLogs(request);
    },
    middleware: [
      ...authenticatedMiddleware,
      requirePermission('read')
    ],
    requireAuth: true,
    description: 'Get activity logs with filtering and pagination'
  });

  router.register({
    method: 'GET',
    path: '/api/activity/item/:id',
    handler: async (request) => {
      return await activityHandler.getLogsForItem(request);
    },
    middleware: [
      ...authenticatedMiddleware,
      requirePermission('read')
    ],
    requireAuth: true,
    description: 'Get activity logs for specific queue item'
  });

  router.register({
    method: 'GET',
    path: '/api/activity/user',
    handler: async (request) => {
      return await activityHandler.getLogsForUser(request);
    },
    middleware: [
      ...authenticatedMiddleware,
      requirePermission('read')
    ],
    requireAuth: true,
    description: 'Get activity logs for current user'
  });

  router.register({
    method: 'GET',
    path: '/api/activity/system',
    handler: async (request) => {
      return await activityHandler.getSystemActivity(request);
    },
    middleware: [
      ...authenticatedMiddleware,
      requirePermission('admin')
    ],
    requireAuth: true,
    description: 'Get recent system activity (admin only)'
  });

  router.register({
    method: 'GET',
    path: '/api/activity/failed',
    handler: async (request) => {
      return await activityHandler.getFailedRequests(request);
    },
    middleware: [
      ...authenticatedMiddleware,
      requirePermission('admin')
    ],
    requireAuth: true,
    description: 'Get failed requests (admin only)'
  });

  /**
   * API Info Route
   * Returns list of available endpoints
   */
  router.register({
    method: 'GET',
    path: '/api',
    handler: async () => {
      return {
        name: 'GAS-PA API',
        version: '1.0.0',
        endpoints: router.getRoutes().map(route => ({
          method: route.method,
          path: route.path,
          requireAuth: route.requireAuth,
          description: route.description
        }))
      };
    },
    middleware: publicMiddleware,
    requireAuth: false,
    description: 'API information and endpoint list'
  });

  // Log registered routes
  const routes = router.getRoutes();
  Logger.info('Routes', `Registered ${routes.length} routes`, {
    count: routes.length
  });
}

/**
 * Auto-register routes on module load
 */
registerRoutes();

/**
 * Export router for testing
 */
export { getRouter };
