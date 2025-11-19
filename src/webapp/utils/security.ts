/**
 * Security Utilities
 * Helpful security functions and utilities
 */

import { SessionData } from '../middleware/auth';
import { ApiRequest } from '../types/api-types';
import Logger from '../../core/logger';

/**
 * CSRF Token Service
 * Generates and validates CSRF tokens
 */
export class CsrfService {
  private static readonly TOKEN_CACHE_PREFIX = 'csrf:';
  private static readonly TOKEN_DURATION = 3600; // 1 hour in seconds

  /**
   * Generate CSRF token for user
   */
  static generateToken(userId: string): string {
    const token = Utilities.getUuid();
    const cache = CacheService.getUserCache();

    if (!cache) {
      throw new Error('Cache service not available');
    }

    // Store token in cache
    cache.put(
      `${this.TOKEN_CACHE_PREFIX}${userId}`,
      token,
      this.TOKEN_DURATION
    );

    Logger.debug('CSRF', 'Token generated', { userId });

    return token;
  }

  /**
   * Validate CSRF token
   */
  static validateToken(userId: string, token: string): boolean {
    const cache = CacheService.getUserCache();

    if (!cache) {
      throw new Error('Cache service not available');
    }

    const storedToken = cache.get(`${this.TOKEN_CACHE_PREFIX}${userId}`);

    if (!storedToken) {
      Logger.warn('CSRF', 'Token not found', { userId });
      return false;
    }

    const isValid = storedToken === token;

    if (!isValid) {
      Logger.warn('CSRF', 'Token mismatch', { userId });
    }

    return isValid;
  }

  /**
   * Refresh CSRF token
   */
  static refreshToken(userId: string, oldToken: string): string | null {
    if (!this.validateToken(userId, oldToken)) {
      return null;
    }

    return this.generateToken(userId);
  }

  /**
   * Clear CSRF token
   */
  static clearToken(userId: string): void {
    const cache = CacheService.getUserCache();

    if (!cache) return;

    cache.remove(`${this.TOKEN_CACHE_PREFIX}${userId}`);

    Logger.debug('CSRF', 'Token cleared', { userId });
  }
}

/**
 * Rate Limit Enhancement Service
 * Additional rate limiting utilities
 */
export class RateLimitEnhancementService {
  /**
   * Calculate adaptive rate limit based on user trust level
   */
  static getAdaptiveLimit(session: SessionData): number {
    // Admin users get higher limits
    if (session.permissions.includes('admin')) {
      return 1000; // 1000 requests per hour
    }

    // Regular authenticated users
    if (session.permissions.includes('write')) {
      return 100; // 100 requests per hour
    }

    // Read-only users
    return 50; // 50 requests per hour
  }

  /**
   * Check if IP is in blacklist
   */
  static isBlacklisted(ipAddress: string): boolean {
    const scriptProperties = PropertiesService.getScriptProperties();
    const blacklist = scriptProperties.getProperty('IP_BLACKLIST');

    if (!blacklist) return false;

    const blacklistedIps = blacklist.split(',').map(ip => ip.trim());
    return blacklistedIps.includes(ipAddress);
  }

  /**
   * Add IP to blacklist
   */
  static addToBlacklist(ipAddress: string, reason: string): void {
    const scriptProperties = PropertiesService.getScriptProperties();
    const blacklist = scriptProperties.getProperty('IP_BLACKLIST') || '';

    const blacklistedIps = blacklist ? blacklist.split(',') : [];

    if (!blacklistedIps.includes(ipAddress)) {
      blacklistedIps.push(ipAddress);
      scriptProperties.setProperty('IP_BLACKLIST', blacklistedIps.join(','));

      Logger.warn('RateLimit', 'IP added to blacklist', { ipAddress, reason });
    }
  }

  /**
   * Remove IP from blacklist
   */
  static removeFromBlacklist(ipAddress: string): void {
    const scriptProperties = PropertiesService.getScriptProperties();
    const blacklist = scriptProperties.getProperty('IP_BLACKLIST') || '';

    const blacklistedIps = blacklist.split(',').filter(ip => ip.trim() !== ipAddress);
    scriptProperties.setProperty('IP_BLACKLIST', blacklistedIps.join(','));

    Logger.info('RateLimit', 'IP removed from blacklist', { ipAddress });
  }
}

/**
 * Session Security Service
 * Additional session security functions
 */
export class SessionSecurityService {
  /**
   * Validate session integrity
   * Checks for session hijacking indicators
   */
  static validateSessionIntegrity(
    request: ApiRequest,
    session: SessionData
  ): boolean {
    // Check session age
    const sessionAge = Date.now() - session.createdAt;
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    if (sessionAge > maxAge) {
      Logger.warn('SessionSecurity', 'Session too old', {
        user: session.email,
        age: sessionAge
      });
      return false;
    }

    // Additional checks could include:
    // - User-Agent consistency (if stored)
    // - IP address consistency (if available and stored)
    // - Geolocation consistency

    return true;
  }

  /**
   * Detect potential session hijacking
   */
  static detectHijacking(
    request: ApiRequest,
    session: SessionData
  ): boolean {
    // This is a simplified check
    // In production, you might want to store and compare:
    // - User-Agent
    // - IP address
    // - Geolocation
    // - Browser fingerprint

    // For now, just check if session is too old for the current permissions
    if (session.permissions.includes('admin')) {
      const sessionAge = Date.now() - session.createdAt;
      const maxAdminSessionAge = 60 * 60 * 1000; // 1 hour for admin

      if (sessionAge > maxAdminSessionAge) {
        Logger.warn('SessionSecurity', 'Admin session too old', {
          user: session.email,
          age: sessionAge
        });
        return true;
      }
    }

    return false;
  }

  /**
   * Generate session fingerprint
   * Used to detect session changes
   */
  static generateFingerprint(request: ApiRequest): string {
    const components = [
      request.headers['User-Agent'] || '',
      request.headers['Accept-Language'] || '',
      request.headers['Accept-Encoding'] || ''
    ];

    const fingerprintData = components.join('|');

    // Simple hash function (in production, use better hashing)
    let hash = 0;
    for (let i = 0; i < fingerprintData.length; i++) {
      const char = fingerprintData.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }

    return hash.toString(16);
  }
}

/**
 * Secret Management Service
 * Secure handling of secrets and API keys
 */
export class SecretManagementService {
  /**
   * Get secret from Script Properties
   * Never log the secret value
   */
  static getSecret(key: string): string | null {
    const scriptProperties = PropertiesService.getScriptProperties();
    const secret = scriptProperties.getProperty(key);

    if (!secret) {
      Logger.warn('SecretManagement', 'Secret not found', { key });
      return null;
    }

    Logger.debug('SecretManagement', 'Secret retrieved', {
      key,
      length: secret.length,
      // Never log the actual secret
      preview: secret.substring(0, 4) + '...'
    });

    return secret;
  }

  /**
   * Set secret in Script Properties
   */
  static setSecret(key: string, value: string): void {
    const scriptProperties = PropertiesService.getScriptProperties();
    scriptProperties.setProperty(key, value);

    Logger.info('SecretManagement', 'Secret set', {
      key,
      length: value.length
    });
  }

  /**
   * Delete secret from Script Properties
   */
  static deleteSecret(key: string): void {
    const scriptProperties = PropertiesService.getScriptProperties();
    scriptProperties.deleteProperty(key);

    Logger.info('SecretManagement', 'Secret deleted', { key });
  }

  /**
   * Check if secret exists
   */
  static hasSecret(key: string): boolean {
    const scriptProperties = PropertiesService.getScriptProperties();
    return scriptProperties.getProperty(key) !== null;
  }

  /**
   * Rotate secret
   * Stores old secret as backup before rotating
   */
  static rotateSecret(key: string, newValue: string): void {
    const scriptProperties = PropertiesService.getScriptProperties();
    const oldValue = scriptProperties.getProperty(key);

    if (oldValue) {
      // Store old secret as backup with timestamp
      const backupKey = `${key}_backup_${Date.now()}`;
      scriptProperties.setProperty(backupKey, oldValue);

      Logger.info('SecretManagement', 'Old secret backed up', { backupKey });
    }

    scriptProperties.setProperty(key, newValue);

    Logger.info('SecretManagement', 'Secret rotated', { key });
  }
}

/**
 * Encryption Utilities
 * Basic encryption/decryption (uses GAS Utilities)
 */
export class EncryptionService {
  /**
   * Encode data to Base64
   */
  static base64Encode(data: string): string {
    return Utilities.base64Encode(data);
  }

  /**
   * Decode data from Base64
   */
  static base64Decode(encoded: string): string {
    return Utilities.base64Decode(encoded);
  }

  /**
   * Generate random bytes
   */
  static generateRandomBytes(length: number): number[] {
    const bytes: number[] = [];
    for (let i = 0; i < length; i++) {
      bytes.push(Math.floor(Math.random() * 256));
    }
    return bytes;
  }

  /**
   * Generate random string
   */
  static generateRandomString(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';

    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return result;
  }

  /**
   * Generate secure token
   */
  static generateSecureToken(length: number = 32): string {
    // Use UUID as base for better randomness
    const uuid = Utilities.getUuid().replace(/-/g, '');

    if (length <= uuid.length) {
      return uuid.substring(0, length);
    }

    // If need more length, append random string
    const additional = this.generateRandomString(length - uuid.length);
    return uuid + additional;
  }

  /**
   * Hash string (simple, not cryptographic)
   */
  static simpleHash(str: string): string {
    let hash = 0;

    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }

    return hash.toString(16);
  }
}

/**
 * Security Monitoring Service
 * Tracks security events and anomalies
 */
export class SecurityMonitoringService {
  private static readonly EVENT_CACHE_PREFIX = 'security_event:';

  /**
   * Log security event
   */
  static logEvent(event: {
    type: 'auth_failure' | 'rate_limit' | 'invalid_token' | 'suspicious_activity' | 'access_denied';
    user?: string;
    ipAddress?: string;
    details?: any;
  }): void {
    const timestamp = new Date().toISOString();

    const eventData = {
      ...event,
      timestamp
    };

    Logger.warn('SecurityMonitoring', `Security event: ${event.type}`, eventData);

    // Store in cache for recent events
    const cache = CacheService.getScriptCache();
    if (cache) {
      const eventId = Utilities.getUuid();
      cache.put(
        `${this.EVENT_CACHE_PREFIX}${eventId}`,
        JSON.stringify(eventData),
        3600 // 1 hour
      );
    }

    // Check for anomalies
    this.checkForAnomalies(event);
  }

  /**
   * Check for security anomalies
   */
  private static checkForAnomalies(event: any): void {
    // Example: Too many auth failures
    if (event.type === 'auth_failure' && event.user) {
      const cache = CacheService.getUserCache();
      if (!cache) return;

      const key = `auth_failures:${event.user}`;
      const failures = parseInt(cache.get(key) || '0');
      const newFailures = failures + 1;

      cache.put(key, newFailures.toString(), 3600);

      // Alert if too many failures
      if (newFailures >= 5) {
        Logger.error('SecurityMonitoring', 'Multiple auth failures detected', {
          user: event.user,
          count: newFailures
        });

        // Could trigger additional actions:
        // - Send alert email
        // - Temporarily block user
        // - Require additional verification
      }
    }
  }

  /**
   * Get recent security events
   */
  static getRecentEvents(limit: number = 50): any[] {
    // This is simplified - in production, you'd want proper event storage
    Logger.info('SecurityMonitoring', 'Recent events requested', { limit });
    return [];
  }
}

/**
 * Export all services
 */
export const Security = {
  Csrf: CsrfService,
  RateLimit: RateLimitEnhancementService,
  Session: SessionSecurityService,
  Secrets: SecretManagementService,
  Encryption: EncryptionService,
  Monitoring: SecurityMonitoringService
};
