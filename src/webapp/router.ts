/**
 * API Router
 * Central routing system for all API endpoints
 * Handles middleware execution, route matching, and error handling
 */

import {
  ApiRequest,
  ApiResponse,
  ApiRoute,
  ApiError,
  createSuccessResponse,
  createErrorResponse,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  RateLimitError
} from './types/api-types';
import { loggingMiddleware, createRequestLogger } from './middleware/logging';
import { rateLimitMiddleware } from './middleware/rate-limit';
import { authMiddleware, optionalAuthMiddleware } from './middleware/auth';
import { healthHandler } from './handlers/health';
import { authHandler } from './handlers/auth-handler';
import Logger from '../core/logger';

/**
 * API Router Class
 * Manages routes and request handling
 */
export class ApiRouter {
  private routes: Map<string, ApiRoute> = new Map();

  constructor() {
    this.registerRoutes();
  }

  /**
   * Register all API routes
   */
  private registerRoutes(): void {
    // Health check endpoints (no auth required)
    this.routes.set('GET:/health', {
      handler: healthHandler.healthCheck,
      middleware: [],
      requireAuth: false,
      description: 'Basic health check'
    });

    this.routes.set('GET:/health/detailed', {
      handler: healthHandler.detailedHealthCheck,
      middleware: [],
      requireAuth: false,
      description: 'Detailed health check with service status'
    });

    this.routes.set('GET:/ping', {
      handler: healthHandler.ping,
      middleware: [],
      requireAuth: false,
      description: 'Simple ping endpoint'
    });

    // Auth endpoints
    this.routes.set('POST:/api/auth/login', {
      handler: authHandler.login,
      middleware: [rateLimitMiddleware(10, 60)], // 10 logins per minute
      requireAuth: false,
      description: 'User login'
    });

    this.routes.set('POST:/api/auth/logout', {
      handler: authHandler.logout,
      middleware: [authMiddleware],
      requireAuth: true,
      description: 'User logout'
    });

    this.routes.set('POST:/api/auth/refresh', {
      handler: authHandler.refreshToken,
      middleware: [authMiddleware],
      requireAuth: true,
      description: 'Refresh authentication token'
    });

    this.routes.set('GET:/api/auth/me', {
      handler: authHandler.getCurrentUser,
      middleware: [authMiddleware],
      requireAuth: true,
      description: 'Get current user info'
    });

    // Metrics endpoint (will be implemented in Step 4)
    // this.routes.set('GET:/api/metrics', {
    //   handler: metricsHandler.getMetrics,
    //   middleware: [authMiddleware, rateLimitMiddleware(60, 60)],
    //   requireAuth: true,
    //   description: 'Get dashboard metrics'
    // });

    // Queue endpoints (will be implemented in Step 5)
    // this.routes.set('GET:/api/queue', {
    //   handler: queueHandler.listQueue,
    //   middleware: [authMiddleware, rateLimitMiddleware(100, 60)],
    //   requireAuth: true,
    //   description: 'List queue items'
    // });

    Logger.info('Router', `Registered ${this.routes.size} routes`);
  }

  /**
   * Route incoming request
   * Main entry point for request handling
   */
  async route(request: ApiRequest): Promise<ApiResponse> {
    const requestLogger = createRequestLogger(request);

    try {
      // Find matching route
      const routeKey = `${request.method}:${request.path}`;
      let route = this.routes.get(routeKey);
      let pathParams: Record<string, string> = {};

      // If exact match not found, try dynamic route matching
      if (!route) {
        const matchResult = this.findDynamicRoute(routeKey);
        if (matchResult) {
          route = matchResult.route;
          pathParams = matchResult.params;
          request.pathParams = pathParams;
        }
      }

      if (!route) {
        requestLogger.warn(`Route not found: ${routeKey}`);
        throw new NotFoundError(`Route not found: ${request.method} ${request.path}`);
      }

      requestLogger.log(`Routing to: ${routeKey}`);

      // Execute middleware chain
      for (const middleware of route.middleware) {
        const middlewareResult = await Promise.resolve(middleware(request));
        if (middlewareResult) {
          // Middleware blocked the request
          requestLogger.warn('Request blocked by middleware', {
            status: middlewareResult.status
          });
          return middlewareResult;
        }
      }

      // Execute handler
      const startTime = Date.now();
      const result = await Promise.resolve(route.handler(request));
      const duration = Date.now() - startTime;

      requestLogger.log(`Handler completed in ${duration}ms`);

      // Wrap in success response
      const response: ApiResponse = {
        status: 200,
        body: createSuccessResponse(result),
        headers: {
          'Content-Type': 'application/json',
          'X-Response-Time': `${duration}ms`
        }
      };

      requestLogger.complete(200, JSON.stringify(response.body).length);

      return response;

    } catch (error) {
      return this.handleError(error, request, requestLogger);
    }
  }

  /**
   * Find dynamic route with parameter extraction
   * Handles routes like /api/queue/:id
   */
  private findDynamicRoute(requestKey: string): {
    route: ApiRoute;
    params: Record<string, string>;
  } | undefined {
    for (const [pattern, route] of this.routes) {
      const paramNames: string[] = [];

      // Convert route pattern to regex
      // /api/queue/:id -> /api/queue/([^/]+)
      const regexPattern = pattern.replace(/:([^/]+)/g, (_, paramName) => {
        paramNames.push(paramName);
        return '([^/]+)';
      });

      const regex = new RegExp(`^${regexPattern}$`);
      const match = requestKey.match(regex);

      if (match) {
        // Extract parameters
        const params: Record<string, string> = {};
        paramNames.forEach((name, index) => {
          params[name] = match[index + 1];
        });

        return { route, params };
      }
    }

    return undefined;
  }

  /**
   * Error handling
   */
  private handleError(
    error: any,
    request: ApiRequest,
    requestLogger: ReturnType<typeof createRequestLogger>
  ): ApiResponse {
    requestLogger.error('Request failed', error);

    // Handle known API errors
    if (error instanceof ApiError) {
      return {
        status: error.statusCode,
        body: createErrorResponse(error),
        headers: { 'Content-Type': 'application/json' }
      };
    }

    // Handle unknown errors
    Logger.error('Router', 'Unhandled error', {
      error: error.message || error,
      stack: error.stack,
      request: {
        method: request.method,
        path: request.path,
        user: request.user
      }
    });

    return {
      status: 500,
      body: createErrorResponse(new Error('Internal server error')),
      headers: { 'Content-Type': 'application/json' }
    };
  }

  /**
   * Get list of registered routes (for debugging)
   */
  getRoutes(): Array<{ method: string; path: string; requireAuth: boolean; description?: string }> {
    const routes: Array<{ method: string; path: string; requireAuth: boolean; description?: string }> = [];

    this.routes.forEach((route, key) => {
      const [method, path] = key.split(':');
      routes.push({
        method,
        path,
        requireAuth: route.requireAuth,
        description: route.description
      });
    });

    return routes;
  }
}

// Create singleton router instance
const router = new ApiRouter();

/**
 * Parse Google Apps Script request into ApiRequest
 */
function parseRequest(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  e: GoogleAppsScript.Events.DoGet | GoogleAppsScript.Events.DoPost
): ApiRequest {
  // Extract path from pathInfo or parameter
  const pathInfo = (e as any).pathInfo || e.parameter?.path || '/';
  const path = pathInfo.startsWith('/') ? pathInfo : `/${pathInfo}`;

  // Extract user (will be overridden by auth middleware if token provided)
  let user = 'anonymous';
  try {
    user = Session.getActiveUser().getEmail() || 'anonymous';
  } catch (error) {
    // No active user
  }

  // Parse POST data
  let postData = {};
  if (method === 'POST' || method === 'PUT') {
    const doPostEvent = e as GoogleAppsScript.Events.DoPost;
    if (doPostEvent.postData?.contents) {
      try {
        postData = JSON.parse(doPostEvent.postData.contents);
      } catch (error) {
        Logger.error('Router', 'Failed to parse POST data', error);
      }
    }
  }

  // Build request object
  const request: ApiRequest = {
    method,
    path,
    parameters: e.parameter || {},
    queryString: (e as any).queryString || '',
    postData,
    headers: (e as any).headers || {},
    user
  };

  return request;
}

/**
 * Handle incoming request and return GAS response
 */
async function handleRequest(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  e: any
): Promise<GoogleAppsScript.Content.TextOutput> {
  const request = parseRequest(method, e);
  const response = await router.route(request);

  // Set CORS headers
  const output = ContentService.createTextOutput(JSON.stringify(response.body))
    .setMimeType(ContentService.MimeType.JSON);

  // Note: Can't set custom headers in GAS ContentService
  // CORS must be handled differently or client must be same-origin

  return output;
}

// Global functions are exported in main.ts instead
// (Removed old global assignments that caused "window is not defined" error)

// PUT and DELETE via POST with _method parameter
// Example: POST /api/queue/123?_method=DELETE
// This is a workaround since GAS only supports GET and POST

/**
 * Get router instance (for testing)
 */
export function getRouter(): ApiRouter {
  return router;
}

// Import routes to trigger registration
// This must come after router is created
import './routes';
