/**
 * Input Sanitization Middleware
 * Sanitizes user input to prevent XSS, injection attacks, and other security issues
 */

import { ApiRequest, ApiResponse, ApiMiddleware, ValidationError } from '../types/api-types';
import Logger from '../../core/logger';

/**
 * Sanitization Service
 * Provides utilities for sanitizing user input
 */
export class SanitizationService {
  /**
   * HTML-encode a string to prevent XSS
   */
  static htmlEncode(str: string): string {
    if (typeof str !== 'string') return str;

    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  /**
   * Remove potentially dangerous characters from input
   */
  static sanitizeString(str: string, options: {
    allowHtml?: boolean;
    maxLength?: number;
    trim?: boolean;
  } = {}): string {
    if (typeof str !== 'string') return '';

    let sanitized = str;

    // Trim whitespace
    if (options.trim !== false) {
      sanitized = sanitized.trim();
    }

    // Remove null bytes
    sanitized = sanitized.replace(/\0/g, '');

    // HTML encode if not allowing HTML
    if (!options.allowHtml) {
      sanitized = this.htmlEncode(sanitized);
    }

    // Enforce max length
    if (options.maxLength && sanitized.length > options.maxLength) {
      sanitized = sanitized.substring(0, options.maxLength);
    }

    return sanitized;
  }

  /**
   * Sanitize email address
   */
  static sanitizeEmail(email: string): string {
    if (typeof email !== 'string') return '';

    // Basic email validation and sanitization
    const trimmed = email.trim().toLowerCase();

    // Remove any characters that aren't valid in email addresses
    const sanitized = trimmed.replace(/[^a-z0-9@._+-]/gi, '');

    // Validate basic email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitized)) {
      throw new ValidationError('Invalid email format');
    }

    return sanitized;
  }

  /**
   * Sanitize URL
   */
  static sanitizeUrl(url: string): string {
    if (typeof url !== 'string') return '';

    const trimmed = url.trim();

    // Only allow http:// and https:// URLs
    if (!/^https?:\/\//i.test(trimmed)) {
      throw new ValidationError('Invalid URL protocol. Only http:// and https:// are allowed');
    }

    // Remove any javascript: or data: URIs
    if (/^(javascript|data|vbscript|file):/i.test(trimmed)) {
      throw new ValidationError('Invalid URL protocol');
    }

    return trimmed;
  }

  /**
   * Sanitize object recursively
   */
  static sanitizeObject(
    obj: any,
    options: {
      allowHtml?: boolean;
      maxStringLength?: number;
      maxDepth?: number;
      currentDepth?: number;
    } = {}
  ): any {
    const currentDepth = options.currentDepth || 0;
    const maxDepth = options.maxDepth || 10;

    // Prevent infinite recursion
    if (currentDepth > maxDepth) {
      Logger.warn('Sanitization', 'Max depth exceeded', { depth: currentDepth });
      return '[MAX_DEPTH_EXCEEDED]';
    }

    // Handle null and undefined
    if (obj === null || obj === undefined) {
      return obj;
    }

    // Handle arrays
    if (Array.isArray(obj)) {
      return obj.map(item =>
        this.sanitizeObject(item, {
          ...options,
          currentDepth: currentDepth + 1
        })
      );
    }

    // Handle objects
    if (typeof obj === 'object') {
      const sanitized: any = {};

      for (const [key, value] of Object.entries(obj)) {
        // Sanitize key
        const sanitizedKey = this.sanitizeString(key, {
          allowHtml: false,
          maxLength: 100,
          trim: true
        });

        // Sanitize value based on type
        if (typeof value === 'string') {
          sanitized[sanitizedKey] = this.sanitizeString(value, {
            allowHtml: options.allowHtml,
            maxLength: options.maxStringLength,
            trim: true
          });
        } else if (typeof value === 'object') {
          sanitized[sanitizedKey] = this.sanitizeObject(value, {
            ...options,
            currentDepth: currentDepth + 1
          });
        } else {
          sanitized[sanitizedKey] = value;
        }
      }

      return sanitized;
    }

    // Handle strings
    if (typeof obj === 'string') {
      return this.sanitizeString(obj, {
        allowHtml: options.allowHtml,
        maxLength: options.maxStringLength,
        trim: true
      });
    }

    // Return other types as-is (numbers, booleans, etc.)
    return obj;
  }

  /**
   * Remove SQL injection patterns
   */
  static sanitizeSql(str: string): string {
    if (typeof str !== 'string') return '';

    // Remove common SQL injection patterns
    const dangerous = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/gi,
      /(--|\;|\/\*|\*\/)/g,
      /(\bOR\b.*=.*)/gi,
      /(\bAND\b.*=.*)/gi
    ];

    let sanitized = str;
    for (const pattern of dangerous) {
      sanitized = sanitized.replace(pattern, '');
    }

    return sanitized.trim();
  }

  /**
   * Validate and sanitize file name
   */
  static sanitizeFileName(fileName: string): string {
    if (typeof fileName !== 'string') return '';

    // Remove path traversal attempts
    let sanitized = fileName.replace(/\.\./g, '');

    // Remove directory separators
    sanitized = sanitized.replace(/[\/\\]/g, '');

    // Remove null bytes
    sanitized = sanitized.replace(/\0/g, '');

    // Only allow safe characters
    sanitized = sanitized.replace(/[^a-zA-Z0-9._-]/g, '_');

    // Limit length
    if (sanitized.length > 255) {
      sanitized = sanitized.substring(0, 255);
    }

    if (!sanitized) {
      throw new ValidationError('Invalid file name');
    }

    return sanitized;
  }

  /**
   * Check for common attack patterns
   */
  static containsAttackPatterns(str: string): boolean {
    if (typeof str !== 'string') return false;

    const attackPatterns = [
      /<script[^>]*>.*?<\/script>/gi, // Script tags
      /javascript:/gi, // JavaScript protocol
      /on\w+\s*=/gi, // Event handlers (onclick, onerror, etc.)
      /data:text\/html/gi, // Data URIs
      /<iframe/gi, // iframes
      /<object/gi, // Object tags
      /<embed/gi, // Embed tags
      /eval\s*\(/gi, // eval()
      /expression\s*\(/gi, // CSS expressions
      /vbscript:/gi, // VBScript
      /file:\/\//gi // File protocol
    ];

    return attackPatterns.some(pattern => pattern.test(str));
  }
}

/**
 * Sanitization middleware
 * Automatically sanitizes request body and query parameters
 */
export const sanitizationMiddleware: ApiMiddleware = (request: ApiRequest): ApiResponse | undefined => {
  try {
    // Sanitize query parameters
    if (request.parameters) {
      request.parameters = SanitizationService.sanitizeObject(request.parameters, {
        allowHtml: false,
        maxStringLength: 1000
      });
    }

    // Sanitize POST data
    if (request.postData) {
      // Check for attack patterns
      const postDataStr = JSON.stringify(request.postData);
      if (SanitizationService.containsAttackPatterns(postDataStr)) {
        Logger.warn('Sanitization', 'Attack pattern detected in request', {
          user: request.user,
          path: request.path
        });
        throw new ValidationError('Request contains potentially malicious content');
      }

      // Sanitize the object
      request.postData = SanitizationService.sanitizeObject(request.postData, {
        allowHtml: false, // Change to true if you need to allow HTML in specific fields
        maxStringLength: 10000, // Adjust based on your needs
        maxDepth: 10
      });
    }

    Logger.debug('Sanitization', 'Request sanitized', {
      path: request.path,
      hasPostData: !!request.postData
    });

    return undefined; // Allow request to proceed
  } catch (error) {
    Logger.error('Sanitization', 'Sanitization failed', error);

    if (error instanceof ValidationError) {
      throw error;
    }

    throw new ValidationError('Failed to sanitize request');
  }
};

/**
 * Create sanitization middleware with custom options
 */
export function createSanitizationMiddleware(options: {
  allowHtml?: boolean;
  maxStringLength?: number;
  maxDepth?: number;
  skipPaths?: string[];
}): ApiMiddleware {
  return (request: ApiRequest): ApiResponse | undefined => {
    // Skip sanitization for specific paths
    if (options.skipPaths?.some(path => request.path.startsWith(path))) {
      return undefined;
    }

    // Sanitize with custom options
    if (request.postData) {
      const postDataStr = JSON.stringify(request.postData);
      if (SanitizationService.containsAttackPatterns(postDataStr)) {
        throw new ValidationError('Request contains potentially malicious content');
      }

      request.postData = SanitizationService.sanitizeObject(request.postData, {
        allowHtml: options.allowHtml,
        maxStringLength: options.maxStringLength,
        maxDepth: options.maxDepth
      });
    }

    if (request.parameters) {
      request.parameters = SanitizationService.sanitizeObject(request.parameters, {
        allowHtml: false,
        maxStringLength: options.maxStringLength
      });
    }

    return undefined;
  };
}
