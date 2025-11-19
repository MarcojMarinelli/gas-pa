/**
 * API Type Definitions
 * Shared types for API Gateway, handlers, and middleware
 */

/**
 * API Request object
 * Normalized representation of incoming HTTP request
 */
export interface ApiRequest {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  parameters: Record<string, string>;
  queryString: string;
  postData: any;
  headers: Record<string, string>;
  user: string;
  pathParams?: Record<string, string>; // For dynamic routes like /api/queue/:id
}

/**
 * API Response object
 * Standardized response format
 */
export interface ApiResponse {
  status: number;
  body: any;
  headers?: Record<string, string>;
}

/**
 * API Handler function type
 * Processes request and returns response data
 */
export type ApiHandler = (request: ApiRequest) => Promise<any> | any;

/**
 * API Middleware function type
 * Can intercept/modify requests or block them
 * Returns ApiResponse to block, undefined to allow
 */
export type ApiMiddleware = (request: ApiRequest) => Promise<ApiResponse | undefined> | ApiResponse | undefined;

/**
 * API Route configuration
 */
export interface ApiRoute {
  handler: ApiHandler;
  middleware: ApiMiddleware[];
  requireAuth: boolean;
  description?: string;
}

/**
 * API Error types
 */
export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class ValidationError extends ApiError {
  constructor(message: string, details?: any) {
    super('VALIDATION_ERROR', message, 400, details);
    this.name = 'ValidationError';
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message: string = 'Unauthorized') {
    super('UNAUTHORIZED', message, 401);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends ApiError {
  constructor(message: string = 'Forbidden') {
    super('FORBIDDEN', message, 403);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends ApiError {
  constructor(message: string = 'Not found') {
    super('NOT_FOUND', message, 404);
    this.name = 'NotFoundError';
  }
}

export class RateLimitError extends ApiError {
  constructor(message: string = 'Rate limit exceeded') {
    super('RATE_LIMIT', message, 429);
    this.name = 'RateLimitError';
  }
}

/**
 * Standard API response format
 */
export interface ApiSuccessResponse<T = any> {
  success: true;
  data: T;
  meta?: {
    timestamp: string;
    requestId?: string;
  };
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    timestamp: string;
    requestId?: string;
  };
}

/**
 * Helper to create success response
 */
export function createSuccessResponse<T>(data: T): ApiSuccessResponse<T> {
  return {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString()
    }
  };
}

/**
 * Helper to create error response
 */
export function createErrorResponse(error: ApiError | Error): ApiErrorResponse {
  if (error instanceof ApiError) {
    return {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details
      },
      meta: {
        timestamp: new Date().toISOString()
      }
    };
  }

  return {
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: error.message || 'Internal server error'
    },
    meta: {
      timestamp: new Date().toISOString()
    }
  };
}
