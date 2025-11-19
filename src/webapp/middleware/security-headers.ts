/**
 * Security Headers Middleware
 * Adds security-related HTTP headers to responses
 */

import { ApiRequest, ApiResponse, ApiMiddleware } from '../types/api-types';
import Logger from '../../core/logger';

/**
 * Security headers configuration
 */
export interface SecurityHeadersConfig {
  /**
   * Content Security Policy
   * Controls which resources can be loaded
   */
  contentSecurityPolicy?: string;

  /**
   * X-Frame-Options
   * Prevents clickjacking attacks
   */
  frameOptions?: 'DENY' | 'SAMEORIGIN';

  /**
   * X-Content-Type-Options
   * Prevents MIME type sniffing
   */
  contentTypeOptions?: boolean;

  /**
   * Strict-Transport-Security
   * Enforces HTTPS
   */
  strictTransportSecurity?: {
    maxAge: number;
    includeSubDomains?: boolean;
    preload?: boolean;
  };

  /**
   * X-XSS-Protection
   * Enables browser XSS protection (legacy)
   */
  xssProtection?: boolean;

  /**
   * Referrer-Policy
   * Controls referrer information
   */
  referrerPolicy?: 'no-referrer' | 'no-referrer-when-downgrade' | 'origin' | 'origin-when-cross-origin' | 'same-origin' | 'strict-origin' | 'strict-origin-when-cross-origin' | 'unsafe-url';

  /**
   * Permissions-Policy
   * Controls browser features
   */
  permissionsPolicy?: string;

  /**
   * CORS settings
   */
  cors?: {
    origin?: string | string[];
    methods?: string[];
    allowedHeaders?: string[];
    exposedHeaders?: string[];
    credentials?: boolean;
    maxAge?: number;
  };
}

/**
 * Default security headers configuration
 */
export const DEFAULT_SECURITY_HEADERS: SecurityHeadersConfig = {
  contentSecurityPolicy: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;",
  frameOptions: 'SAMEORIGIN',
  contentTypeOptions: true,
  strictTransportSecurity: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: false
  },
  xssProtection: true,
  referrerPolicy: 'strict-origin-when-cross-origin',
  permissionsPolicy: 'geolocation=(), microphone=(), camera=()',
  cors: {
    origin: '*', // Adjust based on your needs
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
    exposedHeaders: ['X-Request-ID'],
    credentials: true,
    maxAge: 86400 // 24 hours
  }
};

/**
 * Security Headers Service
 */
export class SecurityHeadersService {
  /**
   * Generate security headers object
   */
  static generateHeaders(config: SecurityHeadersConfig = DEFAULT_SECURITY_HEADERS): Record<string, string> {
    const headers: Record<string, string> = {};

    // Content Security Policy
    if (config.contentSecurityPolicy) {
      headers['Content-Security-Policy'] = config.contentSecurityPolicy;
    }

    // X-Frame-Options
    if (config.frameOptions) {
      headers['X-Frame-Options'] = config.frameOptions;
    }

    // X-Content-Type-Options
    if (config.contentTypeOptions) {
      headers['X-Content-Type-Options'] = 'nosniff';
    }

    // Strict-Transport-Security
    if (config.strictTransportSecurity) {
      const sts = config.strictTransportSecurity;
      let value = `max-age=${sts.maxAge}`;

      if (sts.includeSubDomains) {
        value += '; includeSubDomains';
      }

      if (sts.preload) {
        value += '; preload';
      }

      headers['Strict-Transport-Security'] = value;
    }

    // X-XSS-Protection
    if (config.xssProtection) {
      headers['X-XSS-Protection'] = '1; mode=block';
    }

    // Referrer-Policy
    if (config.referrerPolicy) {
      headers['Referrer-Policy'] = config.referrerPolicy;
    }

    // Permissions-Policy
    if (config.permissionsPolicy) {
      headers['Permissions-Policy'] = config.permissionsPolicy;
    }

    return headers;
  }

  /**
   * Generate CORS headers
   */
  static generateCorsHeaders(
    origin: string | undefined,
    config: SecurityHeadersConfig['cors'] = DEFAULT_SECURITY_HEADERS.cors
  ): Record<string, string> {
    if (!config) return {};

    const headers: Record<string, string> = {};

    // Access-Control-Allow-Origin
    if (config.origin) {
      if (Array.isArray(config.origin)) {
        // If origin is in allowed list, use it; otherwise use first allowed origin
        const allowed = config.origin.includes(origin || '') ? origin : config.origin[0];
        headers['Access-Control-Allow-Origin'] = allowed || '*';
      } else {
        headers['Access-Control-Allow-Origin'] = config.origin;
      }
    }

    // Access-Control-Allow-Methods
    if (config.methods) {
      headers['Access-Control-Allow-Methods'] = config.methods.join(', ');
    }

    // Access-Control-Allow-Headers
    if (config.allowedHeaders) {
      headers['Access-Control-Allow-Headers'] = config.allowedHeaders.join(', ');
    }

    // Access-Control-Expose-Headers
    if (config.exposedHeaders) {
      headers['Access-Control-Expose-Headers'] = config.exposedHeaders.join(', ');
    }

    // Access-Control-Allow-Credentials
    if (config.credentials) {
      headers['Access-Control-Allow-Credentials'] = 'true';
    }

    // Access-Control-Max-Age
    if (config.maxAge) {
      headers['Access-Control-Max-Age'] = config.maxAge.toString();
    }

    return headers;
  }

  /**
   * Check if origin is allowed
   */
  static isOriginAllowed(
    origin: string | undefined,
    config: SecurityHeadersConfig['cors'] = DEFAULT_SECURITY_HEADERS.cors
  ): boolean {
    if (!config || !config.origin) return false;

    // Allow all origins
    if (config.origin === '*') return true;

    // Check against allowed origins list
    if (Array.isArray(config.origin)) {
      return config.origin.includes(origin || '');
    }

    // Check against single allowed origin
    return config.origin === origin;
  }
}

/**
 * Security headers middleware
 * Adds security headers to all responses
 */
export function createSecurityHeadersMiddleware(
  config: SecurityHeadersConfig = DEFAULT_SECURITY_HEADERS
): ApiMiddleware {
  return (request: ApiRequest): ApiResponse | undefined => {
    // Store config in request for response phase
    (request as any).securityHeadersConfig = config;

    Logger.debug('SecurityHeaders', 'Security headers configured', {
      csp: !!config.contentSecurityPolicy,
      cors: !!config.cors
    });

    return undefined; // Allow request to proceed
  };
}

/**
 * Apply security headers to response
 * Call this when building the response
 */
export function applySecurityHeaders(
  response: ApiResponse,
  request?: ApiRequest,
  config: SecurityHeadersConfig = DEFAULT_SECURITY_HEADERS
): ApiResponse {
  // Get config from request if available
  const requestConfig = request ? (request as any).securityHeadersConfig : undefined;
  const finalConfig = requestConfig || config;

  // Initialize headers if not present
  if (!response.headers) {
    response.headers = {};
  }

  // Add security headers
  const securityHeaders = SecurityHeadersService.generateHeaders(finalConfig);
  Object.assign(response.headers, securityHeaders);

  // Add CORS headers
  const origin = request?.headers['Origin'] || request?.headers['origin'];
  const corsHeaders = SecurityHeadersService.generateCorsHeaders(origin, finalConfig.cors);
  Object.assign(response.headers, corsHeaders);

  // Always add Content-Type if not present
  if (!response.headers['Content-Type']) {
    response.headers['Content-Type'] = 'application/json';
  }

  Logger.debug('SecurityHeaders', 'Security headers applied', {
    headerCount: Object.keys(response.headers).length
  });

  return response;
}

/**
 * CORS preflight handler
 * Handles OPTIONS requests for CORS
 */
export function handleCorsPreflightRequest(
  request: ApiRequest,
  config: SecurityHeadersConfig = DEFAULT_SECURITY_HEADERS
): ApiResponse | undefined {
  // Only handle OPTIONS requests
  if (request.method !== 'OPTIONS') {
    return undefined;
  }

  const origin = request.headers['Origin'] || request.headers['origin'];

  // Check if origin is allowed
  if (!SecurityHeadersService.isOriginAllowed(origin, config.cors)) {
    Logger.warn('SecurityHeaders', 'CORS preflight from disallowed origin', { origin });

    return {
      status: 403,
      body: { error: 'CORS request from disallowed origin' },
      headers: {
        'Content-Type': 'application/json'
      }
    };
  }

  // Return CORS headers
  const corsHeaders = SecurityHeadersService.generateCorsHeaders(origin, config.cors);

  Logger.debug('SecurityHeaders', 'CORS preflight handled', { origin });

  return {
    status: 204, // No Content
    body: null,
    headers: corsHeaders
  };
}

/**
 * CORS middleware
 * Handles CORS preflight and adds CORS headers
 */
export const corsMiddleware: ApiMiddleware = (request: ApiRequest): ApiResponse | undefined => {
  // Handle preflight request
  if (request.method === 'OPTIONS') {
    return handleCorsPreflightRequest(request);
  }

  return undefined; // Allow request to proceed
};
