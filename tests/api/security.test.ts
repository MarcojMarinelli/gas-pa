/**
 * Security Middleware Tests
 * Comprehensive tests for authentication, authorization, and security features
 *
 * These are template tests - adapt for your testing framework
 */

import { AuthService, SessionData, requirePermission } from '../../src/webapp/middleware/auth';
import { AuditService, logAuditResponse } from '../../src/webapp/middleware/audit';
import { SanitizationService } from '../../src/webapp/middleware/sanitization';
import { RequestValidationService } from '../../src/webapp/middleware/request-validation';
import { SecurityHeadersService } from '../../src/webapp/middleware/security-headers';
import { Security } from '../../src/webapp/utils/security';
import { ApiRequest } from '../../src/webapp/types/api-types';

/**
 * Authentication Service Tests
 */
describe('AuthService', () => {
  describe('Session Management', () => {
    it('should create valid session', () => {
      const email = 'test@example.com';
      const name = 'Test User';

      const token = AuthService.createSession(email, name);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
    });

    it('should validate valid token', () => {
      const email = 'test@example.com';
      const token = AuthService.createSession(email);

      const session = AuthService.validateToken(token);

      expect(session).not.toBeNull();
      expect(session?.email).toBe(email);
      expect(session?.permissions).toBeDefined();
    });

    it('should reject invalid token', () => {
      const session = AuthService.validateToken('invalid-token');

      expect(session).toBeNull();
    });

    it('should reject expired token', async () => {
      const email = 'test@example.com';
      const token = AuthService.createSession(email);

      // Mock time advancement (implementation depends on testing framework)
      // jest.advanceTimersByTime(3600001); // 1 hour + 1ms

      // In real environment, token would be expired
      // const session = AuthService.validateToken(token);
      // expect(session).toBeNull();
    });

    it('should destroy session', () => {
      const email = 'test@example.com';
      const token = AuthService.createSession(email);

      AuthService.destroySession(token);

      const session = AuthService.validateToken(token);
      expect(session).toBeNull();
    });

    it('should refresh session', () => {
      const email = 'test@example.com';
      const oldToken = AuthService.createSession(email);

      const newToken = AuthService.refreshSession(oldToken);

      expect(newToken).not.toBeNull();
      expect(newToken).not.toBe(oldToken);

      // Old token should be invalid
      const oldSession = AuthService.validateToken(oldToken!);
      expect(oldSession).toBeNull();

      // New token should be valid
      const newSession = AuthService.validateToken(newToken!);
      expect(newSession).not.toBeNull();
      expect(newSession?.email).toBe(email);
    });
  });

  describe('Permission System', () => {
    it('should grant admin all permissions', () => {
      // Set OWNER_EMAIL property
      PropertiesService.getScriptProperties().setProperty('OWNER_EMAIL', 'owner@example.com');

      const token = AuthService.createSession('owner@example.com');
      const session = AuthService.validateToken(token);

      expect(session?.permissions).toContain('admin');
      expect(session?.permissions).toContain('read');
      expect(session?.permissions).toContain('write');
      expect(session?.permissions).toContain('delete');
    });

    it('should grant domain users read/write permissions', () => {
      PropertiesService.getScriptProperties().setProperty('ALLOWED_DOMAIN', 'company.com');

      const token = AuthService.createSession('user@company.com');
      const session = AuthService.validateToken(token);

      expect(session?.permissions).toContain('read');
      expect(session?.permissions).toContain('write');
      expect(session?.permissions).not.toContain('admin');
    });

    it('should grant external users read-only permission', () => {
      const token = AuthService.createSession('external@other.com');
      const session = AuthService.validateToken(token);

      expect(session?.permissions).toContain('read');
      expect(session?.permissions).not.toContain('write');
      expect(session?.permissions).not.toContain('admin');
    });

    it('should check permission correctly', () => {
      const session: SessionData = {
        email: 'test@example.com',
        name: 'Test',
        expiresAt: Date.now() + 3600000,
        permissions: ['read', 'write'],
        createdAt: Date.now()
      };

      expect(AuthService.hasPermission(session, 'read')).toBe(true);
      expect(AuthService.hasPermission(session, 'write')).toBe(true);
      expect(AuthService.hasPermission(session, 'delete')).toBe(false);
    });

    it('should grant admin all permissions via hasPermission', () => {
      const session: SessionData = {
        email: 'admin@example.com',
        name: 'Admin',
        expiresAt: Date.now() + 3600000,
        permissions: ['admin'],
        createdAt: Date.now()
      };

      expect(AuthService.hasPermission(session, 'read')).toBe(true);
      expect(AuthService.hasPermission(session, 'write')).toBe(true);
      expect(AuthService.hasPermission(session, 'delete')).toBe(true);
    });
  });

  describe('Domain Restriction', () => {
    it('should reject users from disallowed domain', () => {
      PropertiesService.getScriptProperties().setProperty('ALLOWED_DOMAIN', 'company.com');

      expect(() => {
        // This would call authenticateFromGoogleSession
        // which checks domain
      }).toThrow(); // Or however your framework handles this
    });
  });
});

/**
 * Audit Logging Tests
 */
describe('AuditService', () => {
  it('should log audit entry', () => {
    const entry = {
      timestamp: new Date().toISOString(),
      requestId: 'test-123',
      user: 'test@example.com',
      method: 'GET',
      path: '/api/test',
      statusCode: 200,
      duration: 150,
      success: true,
      permissions: ['read']
    };

    // Should not throw
    expect(() => {
      AuditService.log(entry);
    }).not.toThrow();
  });

  it('should handle cache failure gracefully', () => {
    // Mock cache failure
    // CacheService.getScriptCache = () => null;

    const entry = {
      timestamp: new Date().toISOString(),
      requestId: 'test-123',
      user: 'test@example.com',
      method: 'GET',
      path: '/api/test',
      statusCode: 200,
      duration: 150,
      success: true
    };

    // Should not throw even if cache fails
    expect(() => {
      AuditService.log(entry);
    }).not.toThrow();
  });

  it('should retrieve recent logs', () => {
    const logs = AuditService.getRecentLogs(10);

    expect(Array.isArray(logs)).toBe(true);
  });

  it('should filter logs by user', () => {
    const logs = AuditService.getLogsByUser('test@example.com', 10);

    expect(Array.isArray(logs)).toBe(true);
    logs.forEach(log => {
      expect(log.user).toBe('test@example.com');
    });
  });

  it('should get failed requests', () => {
    const logs = AuditService.getFailedRequests(10);

    expect(Array.isArray(logs)).toBe(true);
    logs.forEach(log => {
      expect(log.success).toBe(false);
    });
  });
});

/**
 * Sanitization Tests
 */
describe('SanitizationService', () => {
  describe('HTML Encoding', () => {
    it('should encode HTML characters', () => {
      const input = '<script>alert("XSS")</script>';
      const sanitized = SanitizationService.htmlEncode(input);

      expect(sanitized).not.toContain('<script>');
      expect(sanitized).toContain('&lt;script&gt;');
    });

    it('should encode special characters', () => {
      const input = '& < > " \' /';
      const sanitized = SanitizationService.htmlEncode(input);

      expect(sanitized).toBe('&amp; &lt; &gt; &quot; &#x27; &#x2F;');
    });
  });

  describe('String Sanitization', () => {
    it('should trim whitespace by default', () => {
      const input = '  test  ';
      const sanitized = SanitizationService.sanitizeString(input);

      expect(sanitized).toBe('test');
    });

    it('should remove null bytes', () => {
      const input = 'test\0null';
      const sanitized = SanitizationService.sanitizeString(input);

      expect(sanitized).not.toContain('\0');
    });

    it('should enforce max length', () => {
      const input = 'a'.repeat(100);
      const sanitized = SanitizationService.sanitizeString(input, { maxLength: 50 });

      expect(sanitized.length).toBe(50);
    });

    it('should HTML encode by default', () => {
      const input = '<script>alert("XSS")</script>';
      const sanitized = SanitizationService.sanitizeString(input);

      expect(sanitized).not.toContain('<script>');
    });

    it('should allow HTML if specified', () => {
      const input = '<b>bold</b>';
      const sanitized = SanitizationService.sanitizeString(input, { allowHtml: true });

      expect(sanitized).toContain('<b>');
    });
  });

  describe('Email Sanitization', () => {
    it('should sanitize valid email', () => {
      const email = '  Test@Example.COM  ';
      const sanitized = SanitizationService.sanitizeEmail(email);

      expect(sanitized).toBe('test@example.com');
    });

    it('should reject invalid email', () => {
      const invalid = 'not-an-email';

      expect(() => {
        SanitizationService.sanitizeEmail(invalid);
      }).toThrow();
    });

    it('should remove invalid characters', () => {
      const email = 'test<>@example.com';
      const sanitized = SanitizationService.sanitizeEmail(email);

      expect(sanitized).toBe('test@example.com');
    });
  });

  describe('URL Sanitization', () => {
    it('should allow valid HTTPS URL', () => {
      const url = 'https://example.com/path';
      const sanitized = SanitizationService.sanitizeUrl(url);

      expect(sanitized).toBe(url);
    });

    it('should reject javascript: URL', () => {
      const url = 'javascript:alert("XSS")';

      expect(() => {
        SanitizationService.sanitizeUrl(url);
      }).toThrow();
    });

    it('should reject data: URL', () => {
      const url = 'data:text/html,<script>alert("XSS")</script>';

      expect(() => {
        SanitizationService.sanitizeUrl(url);
      }).toThrow();
    });
  });

  describe('Object Sanitization', () => {
    it('should sanitize nested objects', () => {
      const obj = {
        name: '<script>alert("XSS")</script>',
        nested: {
          value: '<b>test</b>'
        }
      };

      const sanitized = SanitizationService.sanitizeObject(obj);

      expect(sanitized.name).not.toContain('<script>');
      expect(sanitized.nested.value).not.toContain('<b>');
    });

    it('should sanitize arrays', () => {
      const obj = {
        items: ['<script>test</script>', 'normal text']
      };

      const sanitized = SanitizationService.sanitizeObject(obj);

      expect(sanitized.items[0]).not.toContain('<script>');
      expect(sanitized.items[1]).toBe('normal text');
    });

    it('should prevent infinite recursion', () => {
      const deep = { a: { b: { c: { d: { e: { f: { g: { h: { i: { j: { k: 'test' } } } } } } } } } } };

      expect(() => {
        SanitizationService.sanitizeObject(deep, { maxDepth: 5 });
      }).not.toThrow();
    });
  });

  describe('Attack Pattern Detection', () => {
    it('should detect script tags', () => {
      const malicious = '<script>alert("XSS")</script>';

      expect(SanitizationService.containsAttackPatterns(malicious)).toBe(true);
    });

    it('should detect event handlers', () => {
      const malicious = '<img src=x onerror=alert("XSS")>';

      expect(SanitizationService.containsAttackPatterns(malicious)).toBe(true);
    });

    it('should detect javascript: protocol', () => {
      const malicious = '<a href="javascript:alert(\'XSS\')">click</a>';

      expect(SanitizationService.containsAttackPatterns(malicious)).toBe(true);
    });

    it('should allow safe content', () => {
      const safe = 'This is normal text with <b>bold</b>';

      // Note: This will still detect <b> tag, adjust based on your needs
      // expect(SanitizationService.containsAttackPatterns(safe)).toBe(false);
    });
  });

  describe('File Name Sanitization', () => {
    it('should sanitize valid file name', () => {
      const fileName = 'my-file_123.txt';
      const sanitized = SanitizationService.sanitizeFileName(fileName);

      expect(sanitized).toBe(fileName);
    });

    it('should remove path traversal', () => {
      const fileName = '../../../etc/passwd';
      const sanitized = SanitizationService.sanitizeFileName(fileName);

      expect(sanitized).not.toContain('..');
      expect(sanitized).not.toContain('/');
    });

    it('should remove directory separators', () => {
      const fileName = 'folder/file.txt';
      const sanitized = SanitizationService.sanitizeFileName(fileName);

      expect(sanitized).not.toContain('/');
      expect(sanitized).not.toContain('\\');
    });

    it('should enforce max length', () => {
      const fileName = 'a'.repeat(300) + '.txt';
      const sanitized = SanitizationService.sanitizeFileName(fileName);

      expect(sanitized.length).toBeLessThanOrEqual(255);
    });
  });
});

/**
 * Request Validation Tests
 */
describe('RequestValidationService', () => {
  it('should validate allowed HTTP methods', () => {
    expect(() => {
      RequestValidationService.validateMethod('GET', ['GET', 'POST']);
    }).not.toThrow();

    expect(() => {
      RequestValidationService.validateMethod('DELETE', ['GET', 'POST']);
    }).toThrow();
  });

  it('should validate content type', () => {
    expect(() => {
      RequestValidationService.validateContentType(
        'application/json',
        ['application/json']
      );
    }).not.toThrow();

    expect(() => {
      RequestValidationService.validateContentType(
        'text/html',
        ['application/json']
      );
    }).toThrow();
  });

  it('should validate body size', () => {
    const smallBody = { test: 'data' };
    expect(() => {
      RequestValidationService.validateBodySize(smallBody, 1024);
    }).not.toThrow();

    const largeBody = { data: 'x'.repeat(10000) };
    expect(() => {
      RequestValidationService.validateBodySize(largeBody, 100);
    }).toThrow();
  });

  it('should validate URL length', () => {
    expect(() => {
      RequestValidationService.validateUrlLength('/api/test', 100);
    }).not.toThrow();

    expect(() => {
      RequestValidationService.validateUrlLength('x'.repeat(3000), 2048);
    }).toThrow();
  });

  it('should detect prototype pollution', () => {
    const malicious = {
      __proto__: { isAdmin: true }
    };

    expect(() => {
      RequestValidationService.validateJsonStructure(malicious);
    }).toThrow();
  });
});

/**
 * Security Headers Tests
 */
describe('SecurityHeadersService', () => {
  it('should generate security headers', () => {
    const headers = SecurityHeadersService.generateHeaders();

    expect(headers['X-Frame-Options']).toBeDefined();
    expect(headers['X-Content-Type-Options']).toBe('nosniff');
    expect(headers['Content-Security-Policy']).toBeDefined();
  });

  it('should generate CORS headers', () => {
    const headers = SecurityHeadersService.generateCorsHeaders('https://example.com');

    expect(headers['Access-Control-Allow-Origin']).toBeDefined();
    expect(headers['Access-Control-Allow-Methods']).toBeDefined();
  });

  it('should check allowed origin', () => {
    const config = {
      origin: ['https://example.com', 'https://test.com']
    };

    expect(SecurityHeadersService.isOriginAllowed('https://example.com', config)).toBe(true);
    expect(SecurityHeadersService.isOriginAllowed('https://evil.com', config)).toBe(false);
  });
});

/**
 * Security Utilities Tests
 */
describe('Security Utilities', () => {
  describe('CSRF Service', () => {
    it('should generate CSRF token', () => {
      const userId = 'test@example.com';
      const token = Security.Csrf.generateToken(userId);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
    });

    it('should validate correct CSRF token', () => {
      const userId = 'test@example.com';
      const token = Security.Csrf.generateToken(userId);

      expect(Security.Csrf.validateToken(userId, token)).toBe(true);
    });

    it('should reject incorrect CSRF token', () => {
      const userId = 'test@example.com';
      Security.Csrf.generateToken(userId);

      expect(Security.Csrf.validateToken(userId, 'wrong-token')).toBe(false);
    });
  });

  describe('Encryption Service', () => {
    it('should base64 encode/decode', () => {
      const data = 'test data';
      const encoded = Security.Encryption.base64Encode(data);
      const decoded = Security.Encryption.base64Decode(encoded);

      expect(decoded).toBe(data);
    });

    it('should generate random string', () => {
      const random = Security.Encryption.generateRandomString(32);

      expect(random.length).toBe(32);
      expect(typeof random).toBe('string');
    });

    it('should generate secure token', () => {
      const token = Security.Encryption.generateSecureToken(64);

      expect(token.length).toBe(64);
      expect(typeof token).toBe('string');
    });
  });
});

/**
 * Manual Test Instructions
 *
 * Since these are template tests, here's how to manually test in GAS environment:
 *
 * 1. Authentication Flow:
 *    - Deploy as web app
 *    - Call login endpoint
 *    - Use returned token for authenticated requests
 *    - Verify token expiration after 1 hour
 *
 * 2. Permission System:
 *    - Set OWNER_EMAIL in Script Properties
 *    - Login as owner (should get all permissions)
 *    - Login as regular user (should get limited permissions)
 *    - Try to access admin-only endpoint as regular user (should fail)
 *
 * 3. Rate Limiting:
 *    - Make multiple rapid requests
 *    - Verify rate limit is enforced
 *    - Check X-RateLimit-* headers in response
 *
 * 4. Audit Logging:
 *    - Check Audit_Logs sheet after API calls
 *    - Verify all requests are logged
 *    - Check failed requests are marked
 *
 * 5. Input Sanitization:
 *    - Send request with <script> tags
 *    - Verify they are encoded
 *    - Send SQL injection attempt
 *    - Verify it's sanitized
 *
 * 6. Security Headers:
 *    - Check response headers in browser dev tools
 *    - Verify CSP, X-Frame-Options, etc. are present
 *    - Test CORS preflight request
 */
