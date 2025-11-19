/**
 * Authentication Middleware
 * Handles Google OAuth authentication and session management
 */

import { ApiRequest, ApiResponse, ApiMiddleware, UnauthorizedError, ForbiddenError } from '../types/api-types';
import Logger from '../../core/logger';

export interface SessionData {
  email: string;
  name: string;
  expiresAt: number;
  permissions: string[];
  createdAt: number;
}

/**
 * Authentication Service
 * Manages user sessions and permissions
 */
export class AuthService {
  private static readonly SESSION_DURATION = 3600000; // 1 hour in milliseconds
  private static sessionCache: GoogleAppsScript.Cache.Cache;

  /**
   * Initialize cache
   */
  private static getCache(): GoogleAppsScript.Cache.Cache {
    if (!this.sessionCache) {
      this.sessionCache = CacheService.getUserCache()!;
    }
    return this.sessionCache;
  }

  /**
   * Validate session token
   * Returns session data if valid, null if invalid/expired
   */
  static validateToken(token: string): SessionData | null {
    if (!token) return null;

    const cache = this.getCache();
    const session = cache.get(`session:${token}`);

    if (!session) {
      Logger.debug('Auth', 'Session not found in cache');
      return null;
    }

    try {
      const data: SessionData = JSON.parse(session);

      // Check expiration
      if (data.expiresAt < Date.now()) {
        Logger.info('Auth', 'Session expired', { email: data.email });
        cache.remove(`session:${token}`);
        return null;
      }

      return data;
    } catch (error) {
      Logger.error('Auth', 'Failed to parse session data', error);
      return null;
    }
  }

  /**
   * Create new session
   * Returns session token
   */
  static createSession(email: string, name?: string): string {
    const token = Utilities.getUuid();
    const now = Date.now();
    const expiresAt = now + this.SESSION_DURATION;

    const sessionData: SessionData = {
      email,
      name: name || email,
      expiresAt,
      permissions: this.getUserPermissions(email),
      createdAt: now
    };

    const cache = this.getCache();
    const ttlSeconds = Math.ceil(this.SESSION_DURATION / 1000);

    cache.put(
      `session:${token}`,
      JSON.stringify(sessionData),
      ttlSeconds
    );

    Logger.info('Auth', 'Session created', {
      email,
      expiresAt: new Date(expiresAt).toISOString()
    });

    return token;
  }

  /**
   * Destroy session
   */
  static destroySession(token: string): void {
    if (!token) return;

    const cache = this.getCache();
    cache.remove(`session:${token}`);

    Logger.info('Auth', 'Session destroyed');
  }

  /**
   * Refresh session (extend expiration)
   * Returns new token
   */
  static refreshSession(oldToken: string): string | null {
    const session = this.validateToken(oldToken);
    if (!session) return null;

    // Destroy old session
    this.destroySession(oldToken);

    // Create new session
    return this.createSession(session.email, session.name);
  }

  /**
   * Get user permissions based on email
   */
  static getUserPermissions(email: string): string[] {
    const scriptProperties = PropertiesService.getScriptProperties();

    // Check if user is owner/admin
    const ownerEmail = scriptProperties.getProperty('OWNER_EMAIL');
    const adminEmails = scriptProperties.getProperty('ADMIN_EMAILS');

    if (email === ownerEmail) {
      return ['admin', 'read', 'write', 'delete'];
    }

    if (adminEmails && adminEmails.split(',').includes(email)) {
      return ['admin', 'read', 'write', 'delete'];
    }

    // Check allowed domain
    const allowedDomain = scriptProperties.getProperty('ALLOWED_DOMAIN');
    if (allowedDomain && email.endsWith(`@${allowedDomain}`)) {
      return ['read', 'write'];
    }

    // Default: read-only access
    return ['read'];
  }

  /**
   * Check if session has required permission
   */
  static hasPermission(session: SessionData, permission: string): boolean {
    if (!session || !session.permissions) return false;

    // Admin has all permissions
    if (session.permissions.includes('admin')) return true;

    return session.permissions.includes(permission);
  }

  /**
   * Authenticate using Google session (for GAS environment)
   * Creates session from active user
   */
  static authenticateFromGoogleSession(): string | null {
    try {
      const user = Session.getActiveUser();
      const email = user.getEmail();

      if (!email) {
        Logger.warn('Auth', 'No active user in session');
        return null;
      }

      // Verify user has access
      const scriptProperties = PropertiesService.getScriptProperties();
      const allowedDomain = scriptProperties.getProperty('ALLOWED_DOMAIN');

      if (allowedDomain && !email.endsWith(`@${allowedDomain}`)) {
        Logger.warn('Auth', 'User domain not allowed', { email, allowedDomain });
        throw new ForbiddenError('User domain not allowed');
      }

      // Create session
      const token = this.createSession(email, user.getEmail());

      return token;
    } catch (error) {
      Logger.error('Auth', 'Failed to authenticate from Google session', error);
      throw error;
    }
  }
}

/**
 * Authentication middleware
 * Validates Bearer token and attaches session to request
 */
export const authMiddleware: ApiMiddleware = (request: ApiRequest): ApiResponse | undefined => {
  // Extract token from Authorization header
  const authHeader = request.headers['Authorization'] || request.headers['authorization'];

  let session: SessionData | null = null;

  if (authHeader) {
    // Parse Bearer token
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      throw new UnauthorizedError('Invalid authorization header format. Use: Bearer <token>');
    }

    const token = parts[1];

    // Validate token
    session = AuthService.validateToken(token);

    if (!session) {
      throw new UnauthorizedError('Invalid or expired token');
    }
  } else {
    // No token provided - try to authenticate from Google session (GAS context)
    try {
      const user = Session.getActiveUser();
      const email = user.getEmail();

      if (!email) {
        throw new UnauthorizedError('No active session. Please sign in.');
      }

      // Create ephemeral session data without storing token
      // This allows authenticated API calls within the GAS webapp
      session = {
        email,
        name: email,
        expiresAt: Date.now() + 3600000, // 1 hour
        permissions: AuthService.getUserPermissions(email),
        createdAt: Date.now()
      };

      Logger.debug('Auth', 'Authenticated from Google session', { user: email });
    } catch (error) {
      Logger.error('Auth', 'Failed to authenticate from Google session', error);
      throw new UnauthorizedError('Authentication required');
    }
  }

  if (!session) {
    throw new UnauthorizedError('Authentication failed');
  }

  // Attach session to request
  (request as any).session = session;

  // Update user in request
  request.user = session.email;

  Logger.debug('Auth', 'Request authenticated', { user: session.email });

  return undefined; // Allow request to proceed
};

/**
 * Permission check middleware factory
 * Creates middleware that requires specific permission
 */
export function requirePermission(permission: string): ApiMiddleware {
  return (request: ApiRequest): ApiResponse | undefined => {
    const session = (request as any).session as SessionData | undefined;

    if (!session) {
      throw new UnauthorizedError('No active session');
    }

    if (!AuthService.hasPermission(session, permission)) {
      throw new ForbiddenError(`Insufficient permissions. Required: ${permission}`);
    }

    Logger.debug('Auth', `Permission check passed: ${permission}`, { user: session.email });

    return undefined; // Allow request
  };
}

/**
 * Optional authentication middleware
 * Attaches session if present, but doesn't require it
 */
export const optionalAuthMiddleware: ApiMiddleware = (request: ApiRequest): undefined => {
  const authHeader = request.headers['Authorization'] || request.headers['authorization'];

  if (authHeader) {
    const parts = authHeader.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      const token = parts[1];
      const session = AuthService.validateToken(token);

      if (session) {
        (request as any).session = session;
        request.user = session.email;
      }
    }
  }

  return undefined; // Always allow
};
