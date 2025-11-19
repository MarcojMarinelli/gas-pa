/**
 * Request Validation Middleware
 * Validates request structure, content type, and payload size
 */

import { ApiRequest, ApiResponse, ApiMiddleware, ValidationError } from '../types/api-types';
import Logger from '../../core/logger';

/**
 * Request validation configuration
 */
export interface RequestValidationConfig {
  /**
   * Maximum request body size in bytes
   */
  maxBodySize?: number;

  /**
   * Allowed content types for POST/PUT requests
   */
  allowedContentTypes?: string[];

  /**
   * Required headers
   */
  requiredHeaders?: string[];

  /**
   * Validate request ID presence
   */
  requireRequestId?: boolean;

  /**
   * Maximum URL length
   */
  maxUrlLength?: number;

  /**
   * Maximum number of query parameters
   */
  maxQueryParams?: number;

  /**
   * Allowed HTTP methods
   */
  allowedMethods?: Array<'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS'>;
}

/**
 * Default validation configuration
 */
export const DEFAULT_VALIDATION_CONFIG: RequestValidationConfig = {
  maxBodySize: 1024 * 1024, // 1MB
  allowedContentTypes: ['application/json', 'application/x-www-form-urlencoded', 'multipart/form-data'],
  requiredHeaders: [],
  requireRequestId: false,
  maxUrlLength: 2048,
  maxQueryParams: 50,
  allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
};

/**
 * Request Validation Service
 */
export class RequestValidationService {
  /**
   * Validate request method
   */
  static validateMethod(
    method: string,
    allowedMethods: string[]
  ): void {
    if (!allowedMethods.includes(method)) {
      throw new ValidationError(
        `HTTP method '${method}' is not allowed. Allowed methods: ${allowedMethods.join(', ')}`
      );
    }
  }

  /**
   * Validate content type
   */
  static validateContentType(
    contentType: string | undefined,
    allowedTypes: string[]
  ): void {
    if (!contentType) return; // No content type for GET requests

    // Extract base content type (remove charset, etc.)
    const baseType = contentType.split(';')[0].trim().toLowerCase();

    const isAllowed = allowedTypes.some(allowed =>
      baseType === allowed.toLowerCase() || baseType.startsWith(allowed.toLowerCase())
    );

    if (!isAllowed) {
      throw new ValidationError(
        `Content-Type '${baseType}' is not allowed. Allowed types: ${allowedTypes.join(', ')}`
      );
    }
  }

  /**
   * Validate request body size
   */
  static validateBodySize(
    body: any,
    maxSize: number
  ): void {
    if (!body) return;

    const bodySize = JSON.stringify(body).length;

    if (bodySize > maxSize) {
      throw new ValidationError(
        `Request body too large. Max size: ${maxSize} bytes, actual: ${bodySize} bytes`
      );
    }
  }

  /**
   * Validate URL length
   */
  static validateUrlLength(
    url: string,
    maxLength: number
  ): void {
    if (url.length > maxLength) {
      throw new ValidationError(
        `URL too long. Max length: ${maxLength} characters, actual: ${url.length} characters`
      );
    }
  }

  /**
   * Validate query parameters count
   */
  static validateQueryParamsCount(
    params: Record<string, string>,
    maxCount: number
  ): void {
    const count = Object.keys(params).length;

    if (count > maxCount) {
      throw new ValidationError(
        `Too many query parameters. Max: ${maxCount}, actual: ${count}`
      );
    }
  }

  /**
   * Validate required headers
   */
  static validateRequiredHeaders(
    headers: Record<string, string>,
    required: string[]
  ): void {
    const missing = required.filter(header => {
      const headerLower = header.toLowerCase();
      return !Object.keys(headers).some(h => h.toLowerCase() === headerLower);
    });

    if (missing.length > 0) {
      throw new ValidationError(
        `Missing required headers: ${missing.join(', ')}`
      );
    }
  }

  /**
   * Validate request ID
   */
  static validateRequestId(
    headers: Record<string, string>
  ): string {
    const requestId = headers['X-Request-ID'] || headers['x-request-id'];

    if (!requestId) {
      // Generate one if missing
      return Utilities.getUuid();
    }

    // Validate format (should be UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (!uuidRegex.test(requestId)) {
      Logger.warn('RequestValidation', 'Invalid request ID format', { requestId });
      // Generate new one
      return Utilities.getUuid();
    }

    return requestId;
  }

  /**
   * Validate JSON structure
   */
  static validateJsonStructure(body: any): void {
    if (!body) return;

    // Check for circular references
    try {
      JSON.stringify(body);
    } catch (error) {
      throw new ValidationError('Invalid JSON structure: circular reference detected');
    }

    // Check for prototype pollution
    if (this.hasPrototypePollution(body)) {
      throw new ValidationError('Invalid JSON structure: prototype pollution detected');
    }
  }

  /**
   * Check for prototype pollution attempts
   */
  private static hasPrototypePollution(obj: any): boolean {
    if (!obj || typeof obj !== 'object') return false;

    const dangerous = ['__proto__', 'constructor', 'prototype'];

    for (const key in obj) {
      if (dangerous.includes(key)) {
        return true;
      }

      if (typeof obj[key] === 'object') {
        if (this.hasPrototypePollution(obj[key])) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Validate path parameters
   */
  static validatePathParams(
    pathParams: Record<string, string> | undefined
  ): void {
    if (!pathParams) return;

    for (const [key, value] of Object.entries(pathParams)) {
      // Check for path traversal
      if (value.includes('..') || value.includes('./') || value.includes('\\')) {
        throw new ValidationError(`Invalid path parameter '${key}': path traversal detected`);
      }

      // Check for null bytes
      if (value.includes('\0')) {
        throw new ValidationError(`Invalid path parameter '${key}': null byte detected`);
      }

      // Limit length
      if (value.length > 200) {
        throw new ValidationError(`Path parameter '${key}' too long (max 200 characters)`);
      }
    }
  }
}

/**
 * Request validation middleware
 */
export function createRequestValidationMiddleware(
  config: RequestValidationConfig = DEFAULT_VALIDATION_CONFIG
): ApiMiddleware {
  return (request: ApiRequest): ApiResponse | undefined => {
    try {
      // Merge with defaults
      const finalConfig = { ...DEFAULT_VALIDATION_CONFIG, ...config };

      // Validate HTTP method
      if (finalConfig.allowedMethods) {
        RequestValidationService.validateMethod(
          request.method,
          finalConfig.allowedMethods
        );
      }

      // Validate URL length
      if (finalConfig.maxUrlLength) {
        RequestValidationService.validateUrlLength(
          request.path,
          finalConfig.maxUrlLength
        );
      }

      // Validate query parameters count
      if (finalConfig.maxQueryParams && request.parameters) {
        RequestValidationService.validateQueryParamsCount(
          request.parameters,
          finalConfig.maxQueryParams
        );
      }

      // Validate required headers
      if (finalConfig.requiredHeaders && finalConfig.requiredHeaders.length > 0) {
        RequestValidationService.validateRequiredHeaders(
          request.headers,
          finalConfig.requiredHeaders
        );
      }

      // Validate/generate request ID
      if (finalConfig.requireRequestId) {
        const requestId = RequestValidationService.validateRequestId(request.headers);
        request.headers['X-Request-ID'] = requestId;
      }

      // Validate content type for POST/PUT requests
      if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
        const contentType = request.headers['Content-Type'] || request.headers['content-type'];

        if (finalConfig.allowedContentTypes) {
          RequestValidationService.validateContentType(
            contentType,
            finalConfig.allowedContentTypes
          );
        }

        // Validate body size
        if (finalConfig.maxBodySize && request.postData) {
          RequestValidationService.validateBodySize(
            request.postData,
            finalConfig.maxBodySize
          );
        }

        // Validate JSON structure
        if (request.postData) {
          RequestValidationService.validateJsonStructure(request.postData);
        }
      }

      // Validate path parameters
      if (request.pathParams) {
        RequestValidationService.validatePathParams(request.pathParams);
      }

      Logger.debug('RequestValidation', 'Request validation passed', {
        method: request.method,
        path: request.path
      });

      return undefined; // Allow request to proceed
    } catch (error) {
      Logger.warn('RequestValidation', 'Request validation failed', {
        error: error instanceof Error ? error.message : String(error),
        method: request.method,
        path: request.path
      });

      if (error instanceof ValidationError) {
        throw error;
      }

      throw new ValidationError('Request validation failed');
    }
  };
}

/**
 * Default request validation middleware
 */
export const requestValidationMiddleware = createRequestValidationMiddleware(DEFAULT_VALIDATION_CONFIG);

/**
 * Strict validation middleware (more restrictive)
 */
export const strictValidationMiddleware = createRequestValidationMiddleware({
  ...DEFAULT_VALIDATION_CONFIG,
  maxBodySize: 512 * 1024, // 512KB
  requireRequestId: true,
  maxQueryParams: 20,
  requiredHeaders: ['Content-Type', 'Authorization']
});
