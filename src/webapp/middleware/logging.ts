/**
 * Logging Middleware
 * Logs all API requests with timing information
 */

import { ApiRequest, ApiResponse, ApiMiddleware } from '../types/api-types';
import Logger from '../../core/logger';

/**
 * Request logging middleware
 * Logs method, path, user, and timing for each request
 */
export const loggingMiddleware: ApiMiddleware = (request: ApiRequest): undefined => {
  const startTime = Date.now();

  // Log request
  Logger.info('API', `${request.method} ${request.path}`, {
    user: request.user,
    queryString: request.queryString,
    hasBody: !!request.postData
  });

  // We can't easily log response time in middleware without async context
  // So we just log the request start
  // Response timing will be handled in the router

  return undefined; // Allow request to proceed
};

/**
 * Create a logging context for a request
 */
export function createRequestLogger(request: ApiRequest) {
  const startTime = Date.now();
  const requestId = Utilities.getUuid().substring(0, 8);

  return {
    requestId,
    log: (message: string, data?: any) => {
      Logger.info('API', `[${requestId}] ${message}`, data);
    },
    warn: (message: string, data?: any) => {
      Logger.warn('API', `[${requestId}] ${message}`, data);
    },
    error: (message: string, error?: any) => {
      Logger.error('API', `[${requestId}] ${message}`, error);
    },
    complete: (status: number, bodySize?: number) => {
      const duration = Date.now() - startTime;
      Logger.info('API', `[${requestId}] ${request.method} ${request.path} ${status} ${duration}ms`, {
        user: request.user,
        status,
        duration,
        bodySize
      });
    }
  };
}
