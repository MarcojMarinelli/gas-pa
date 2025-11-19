/**
 * Rate Limiting Middleware
 * Prevents abuse by limiting requests per user/IP
 */

import { ApiRequest, ApiResponse, ApiMiddleware, RateLimitError } from '../types/api-types';
import Logger from '../../core/logger';

interface RateLimitConfig {
  maxRequests: number;
  windowSeconds: number;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

/**
 * Simple in-memory rate limiter
 * Uses CacheService for persistence across executions
 */
class RateLimiter {
  private cache: GoogleAppsScript.Cache.Cache;

  constructor() {
    this.cache = CacheService.getScriptCache()!;
  }

  /**
   * Check if request is allowed
   * Returns true if allowed, false if rate limited
   */
  check(key: string, config: RateLimitConfig): boolean {
    const cacheKey = `ratelimit:${key}`;
    const cached = this.cache.get(cacheKey);

    const now = Date.now();
    let entry: RateLimitEntry;

    if (cached) {
      entry = JSON.parse(cached);

      // Check if window has expired
      if (now > entry.resetAt) {
        // Reset counter
        entry = {
          count: 1,
          resetAt: now + (config.windowSeconds * 1000)
        };
      } else {
        // Increment counter
        entry.count++;
      }
    } else {
      // First request in window
      entry = {
        count: 1,
        resetAt: now + (config.windowSeconds * 1000)
      };
    }

    // Save updated entry
    const ttl = Math.ceil((entry.resetAt - now) / 1000);
    this.cache.put(cacheKey, JSON.stringify(entry), ttl);

    // Check if limit exceeded
    if (entry.count > config.maxRequests) {
      Logger.warn('RateLimit', `Rate limit exceeded for ${key}`, {
        count: entry.count,
        limit: config.maxRequests,
        resetAt: new Date(entry.resetAt).toISOString()
      });
      return false;
    }

    return true;
  }

  /**
   * Get current rate limit status
   */
  getStatus(key: string): { count: number; resetAt: number } | null {
    const cacheKey = `ratelimit:${key}`;
    const cached = this.cache.get(cacheKey);

    if (!cached) return null;

    return JSON.parse(cached);
  }
}

// Singleton instance
const rateLimiter = new RateLimiter();

/**
 * Rate limiting middleware factory
 * @param maxRequests - Maximum requests allowed
 * @param windowSeconds - Time window in seconds
 */
export function rateLimitMiddleware(
  maxRequests: number,
  windowSeconds: number
): ApiMiddleware {
  return (request: ApiRequest): ApiResponse | undefined => {
    // Use user email as rate limit key
    const key = request.user || 'anonymous';

    const allowed = rateLimiter.check(key, { maxRequests, windowSeconds });

    if (!allowed) {
      const status = rateLimiter.getStatus(key);
      const resetAt = status ? new Date(status.resetAt).toISOString() : 'unknown';

      throw new RateLimitError(
        `Rate limit exceeded. Try again after ${resetAt}`
      );
    }

    return undefined; // Allow request
  };
}

/**
 * Get rate limit status for a user
 */
export function getRateLimitStatus(user: string): {
  count: number;
  resetAt: string;
} | null {
  const status = rateLimiter.getStatus(user);
  if (!status) return null;

  return {
    count: status.count,
    resetAt: new Date(status.resetAt).toISOString()
  };
}
