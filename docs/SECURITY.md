# GAS-PA Security Documentation

## Overview

This document describes the security architecture, features, and best practices implemented in GAS-PA.

---

## Table of Contents

1. [Authentication & Authorization](#authentication--authorization)
2. [Audit Logging](#audit-logging)
3. [Input Sanitization](#input-sanitization)
4. [Security Headers](#security-headers)
5. [Request Validation](#request-validation)
6. [Security Utilities](#security-utilities)
7. [Security Best Practices](#security-best-practices)
8. [Configuration](#configuration)
9. [Monitoring](#monitoring)

---

## Authentication & Authorization

### Session-Based Authentication

GAS-PA uses token-based authentication with server-side session management:

```typescript
// Login
const token = AuthService.authenticateFromGoogleSession();

// Use token in requests
headers: {
  'Authorization': `Bearer ${token}`
}
```

**Features:**
- ✅ 1-hour session duration
- ✅ Automatic token expiration
- ✅ Session refresh without re-login
- ✅ Google OAuth integration
- ✅ Domain restriction support

### Permission System

Three-tier permission model:

| Permission | Access Level | Capabilities |
|-----------|--------------|--------------|
| **admin** | Full access | All operations + user management |
| **write** | Read/Write | Create, update, snooze queue items |
| **read** | Read-only | View queue and metrics only |
| **delete** | Delete | Remove items (requires admin or explicit grant) |

**Permission Assignment:**
1. **Owner** (OWNER_EMAIL): All permissions
2. **Admins** (ADMIN_EMAILS): All permissions
3. **Domain Users** (ALLOWED_DOMAIN): read + write
4. **Others**: read only

### Usage Examples

```typescript
// Protect route with authentication
router.register({
  method: 'GET',
  path: '/api/queue',
  handler: getQueue,
  middleware: [authMiddleware]
});

// Require specific permission
router.register({
  method: 'DELETE',
  path: '/api/queue/:id',
  handler: deleteItem,
  middleware: [authMiddleware, requirePermission('delete')]
});

// Optional authentication
router.register({
  method: 'GET',
  path: '/api/health',
  handler: healthCheck,
  middleware: [optionalAuthMiddleware]
});
```

### Session Management

```typescript
// Create session
const token = AuthService.createSession(email, name);

// Validate token
const session = AuthService.validateToken(token);

// Refresh session
const newToken = AuthService.refreshSession(oldToken);

// Destroy session
AuthService.destroySession(token);

// Check permission
const canDelete = AuthService.hasPermission(session, 'delete');
```

---

## Audit Logging

### Overview

Comprehensive audit logging for compliance and security monitoring.

**What's Logged:**
- ✅ All API requests
- ✅ User email
- ✅ Request method and path
- ✅ Response status code
- ✅ Request duration
- ✅ Success/failure
- ✅ Error messages
- ✅ User permissions

### Storage

Logs are stored in two locations:

1. **Cache** - Last 10 minutes (for recent access)
2. **Google Sheets** - Long-term storage in `Audit_Logs` sheet

### Usage

```typescript
// Automatic logging via middleware
router.register({
  method: 'POST',
  path: '/api/queue',
  handler: createItem,
  middleware: [authMiddleware, auditMiddleware]
});

// Manual logging
AuditService.log({
  timestamp: new Date().toISOString(),
  requestId: 'req-123',
  user: 'user@example.com',
  method: 'POST',
  path: '/api/queue',
  statusCode: 201,
  duration: 150,
  success: true
});

// Retrieve logs
const recentLogs = AuditService.getRecentLogs(100);
const userLogs = AuditService.getLogsByUser('user@example.com', 50);
const failedRequests = AuditService.getFailedRequests(50);

// Clean old logs
const deleted = AuditService.clearOldLogs(90); // Keep last 90 days
```

### Audit Log Schema

```typescript
interface AuditLogEntry {
  timestamp: string;        // ISO 8601
  requestId: string;        // UUID
  user: string;            // Email
  method: string;          // HTTP method
  path: string;            // Request path
  queryParams?: object;    // Query parameters
  statusCode?: number;     // HTTP status
  duration?: number;       // Milliseconds
  success: boolean;        // Request succeeded
  error?: string;          // Error message
  ipAddress?: string;      // Client IP (if available)
  userAgent?: string;      // Client user agent
  permissions?: string[];  // User permissions
}
```

---

## Input Sanitization

### Overview

Multi-layer input sanitization prevents XSS, injection, and other attacks.

### Features

**Automatic Sanitization:**
- ✅ HTML encoding
- ✅ SQL injection prevention
- ✅ Path traversal blocking
- ✅ Null byte removal
- ✅ Attack pattern detection
- ✅ Prototype pollution prevention

### Usage

```typescript
// Automatic via middleware
router.register({
  method: 'POST',
  path: '/api/queue',
  handler: createItem,
  middleware: [sanitizationMiddleware]
});

// Manual sanitization
const clean = SanitizationService.sanitizeString(userInput, {
  allowHtml: false,
  maxLength: 1000,
  trim: true
});

// Email sanitization
const email = SanitizationService.sanitizeEmail(userEmail);

// URL sanitization
const url = SanitizationService.sanitizeUrl(userUrl);

// Object sanitization
const cleanObj = SanitizationService.sanitizeObject(requestBody, {
  allowHtml: false,
  maxStringLength: 10000,
  maxDepth: 10
});

// File name sanitization
const fileName = SanitizationService.sanitizeFileName(userFileName);

// Check for attacks
if (SanitizationService.containsAttackPatterns(input)) {
  throw new ValidationError('Malicious content detected');
}
```

### Attack Pattern Detection

Detects common attack patterns:
- `<script>` tags
- `javascript:` protocol
- Event handlers (`onclick`, `onerror`, etc.)
- `data:` URIs
- `<iframe>`, `<object>`, `<embed>` tags
- `eval()` function
- CSS expressions
- VBScript protocol

### Custom Sanitization

```typescript
// Create custom sanitization middleware
const customSanitization = createSanitizationMiddleware({
  allowHtml: true,        // Allow HTML in specific fields
  maxStringLength: 5000,  // Shorter max length
  maxDepth: 5,           // Shallower object depth
  skipPaths: ['/api/webhook'] // Skip sanitization for webhooks
});
```

---

## Security Headers

### Overview

Adds comprehensive security headers to all responses.

### Headers Applied

| Header | Value | Purpose |
|--------|-------|---------|
| **Content-Security-Policy** | Custom CSP | Prevents XSS, injection |
| **X-Frame-Options** | SAMEORIGIN | Prevents clickjacking |
| **X-Content-Type-Options** | nosniff | Prevents MIME sniffing |
| **Strict-Transport-Security** | max-age=31536000 | Enforces HTTPS |
| **X-XSS-Protection** | 1; mode=block | Browser XSS filter |
| **Referrer-Policy** | strict-origin-when-cross-origin | Controls referrer |
| **Permissions-Policy** | Custom policy | Disables features |
| **Access-Control-Allow-Origin** | Configured | CORS support |

### Default CSP

```
default-src 'self';
script-src 'self' 'unsafe-inline';
style-src 'self' 'unsafe-inline';
img-src 'self' data: https:;
font-src 'self' data:;
```

### Usage

```typescript
// Automatic via middleware
const securityMiddleware = createSecurityHeadersMiddleware();

router.register({
  method: 'GET',
  path: '/api/data',
  handler: getData,
  middleware: [securityMiddleware]
});

// Apply to response
applySecurityHeaders(response, request);

// Custom configuration
const customHeaders = createSecurityHeadersMiddleware({
  contentSecurityPolicy: "default-src 'self'",
  frameOptions: 'DENY',
  strictTransportSecurity: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  cors: {
    origin: ['https://app.example.com'],
    methods: ['GET', 'POST'],
    credentials: true
  }
});
```

### CORS Configuration

```typescript
// Handle CORS preflight
const response = handleCorsPreflightRequest(request, config);

// Check origin
if (SecurityHeadersService.isOriginAllowed(origin, config.cors)) {
  // Allow request
}

// Generate CORS headers
const corsHeaders = SecurityHeadersService.generateCorsHeaders(
  origin,
  config.cors
);
```

---

## Request Validation

### Overview

Validates request structure, size, and content before processing.

### Validation Rules

**Default Configuration:**
- Max body size: 1MB
- Max URL length: 2048 characters
- Max query parameters: 50
- Allowed methods: GET, POST, PUT, DELETE, OPTIONS
- Allowed content types: `application/json`, `application/x-www-form-urlencoded`

### Features

- ✅ HTTP method validation
- ✅ Content-Type validation
- ✅ Body size limits
- ✅ URL length limits
- ✅ Query parameter limits
- ✅ Required headers check
- ✅ Request ID validation/generation
- ✅ JSON structure validation
- ✅ Prototype pollution detection
- ✅ Path traversal detection

### Usage

```typescript
// Default validation
router.register({
  method: 'POST',
  path: '/api/queue',
  handler: createItem,
  middleware: [requestValidationMiddleware]
});

// Strict validation
router.register({
  method: 'PUT',
  path: '/api/admin/settings',
  handler: updateSettings,
  middleware: [strictValidationMiddleware] // More restrictive
});

// Custom validation
const customValidation = createRequestValidationMiddleware({
  maxBodySize: 512 * 1024,  // 512KB
  maxUrlLength: 1024,
  maxQueryParams: 20,
  allowedMethods: ['GET', 'POST'],
  allowedContentTypes: ['application/json'],
  requiredHeaders: ['Authorization', 'Content-Type'],
  requireRequestId: true
});

// Manual validation
RequestValidationService.validateMethod(method, allowedMethods);
RequestValidationService.validateBodySize(body, maxSize);
RequestValidationService.validateJsonStructure(data);
```

### Validation Errors

All validation errors throw `ValidationError` with descriptive messages:

```typescript
try {
  RequestValidationService.validateBodySize(body, 1024);
} catch (error) {
  if (error instanceof ValidationError) {
    console.log(error.message);
    // "Request body too large. Max size: 1024 bytes, actual: 2048 bytes"
  }
}
```

---

## Security Utilities

### CSRF Protection

```typescript
// Generate CSRF token
const token = Security.Csrf.generateToken(userId);

// Validate token
const isValid = Security.Csrf.validateToken(userId, token);

// Refresh token
const newToken = Security.Csrf.refreshToken(userId, oldToken);

// Clear token
Security.Csrf.clearToken(userId);
```

### Rate Limiting Enhancements

```typescript
// Adaptive rate limits
const limit = Security.RateLimit.getAdaptiveLimit(session);

// IP blacklist
if (Security.RateLimit.isBlacklisted(ipAddress)) {
  throw new ForbiddenError('IP blacklisted');
}

Security.RateLimit.addToBlacklist(ipAddress, 'Too many failed attempts');
Security.RateLimit.removeFromBlacklist(ipAddress);
```

### Session Security

```typescript
// Validate session integrity
const isValid = Security.Session.validateSessionIntegrity(request, session);

// Detect hijacking
const isHijacked = Security.Session.detectHijacking(request, session);

// Generate fingerprint
const fingerprint = Security.Session.generateFingerprint(request);
```

### Secret Management

```typescript
// Get secret
const apiKey = Security.Secrets.getSecret('OPENAI_API_KEY');

// Set secret
Security.Secrets.setSecret('API_KEY', 'secret-value');

// Check existence
if (Security.Secrets.hasSecret('API_KEY')) {
  // Secret exists
}

// Rotate secret
Security.Secrets.rotateSecret('API_KEY', 'new-secret-value');

// Delete secret
Security.Secrets.deleteSecret('OLD_API_KEY');
```

### Encryption

```typescript
// Base64 encoding
const encoded = Security.Encryption.base64Encode(data);
const decoded = Security.Encryption.base64Decode(encoded);

// Random generation
const randomBytes = Security.Encryption.generateRandomBytes(32);
const randomString = Security.Encryption.generateRandomString(64);
const secureToken = Security.Encryption.generateSecureToken(128);

// Simple hashing (non-cryptographic)
const hash = Security.Encryption.simpleHash(input);
```

### Security Monitoring

```typescript
// Log security event
Security.Monitoring.logEvent({
  type: 'auth_failure',
  user: 'attacker@example.com',
  ipAddress: '1.2.3.4',
  details: { reason: 'Invalid credentials' }
});

// Event types:
// - 'auth_failure'
// - 'rate_limit'
// - 'invalid_token'
// - 'suspicious_activity'
// - 'access_denied'

// Get recent events
const events = Security.Monitoring.getRecentEvents(50);
```

---

## Security Best Practices

### 1. Always Validate Input

```typescript
// ❌ BAD: No validation
const item = request.postData;
await saveToDatabase(item);

// ✅ GOOD: Validate and sanitize
const validated = validate(queueItemSchema, request.postData);
const sanitized = SanitizationService.sanitizeObject(validated);
await saveToDatabase(sanitized);
```

### 2. Use Appropriate Middleware Stack

```typescript
// ✅ GOOD: Comprehensive security stack
router.register({
  method: 'POST',
  path: '/api/queue',
  handler: createItem,
  middleware: [
    corsMiddleware,                    // CORS support
    requestValidationMiddleware,       // Validate request
    sanitizationMiddleware,           // Sanitize input
    rateLimitMiddleware(100, 3600),   // Rate limiting
    authMiddleware,                    // Authentication
    requirePermission('write'),        // Authorization
    auditMiddleware                    // Audit logging
  ]
});
```

### 3. Never Log Sensitive Data

```typescript
// ❌ BAD: Logging sensitive data
Logger.info('User login', { email, password });

// ✅ GOOD: Log only safe data
Logger.info('User login', { email, success: true });
```

### 4. Use HTTPS Only

```typescript
// Configure Strict-Transport-Security
const config = {
  strictTransportSecurity: {
    maxAge: 31536000,      // 1 year
    includeSubDomains: true,
    preload: true
  }
};
```

### 5. Implement Defense in Depth

Multiple layers of security:
1. **Input validation** - Reject invalid data early
2. **Sanitization** - Clean user input
3. **Authentication** - Verify user identity
4. **Authorization** - Check permissions
5. **Audit logging** - Track all actions
6. **Rate limiting** - Prevent abuse
7. **Security headers** - Browser protection

### 6. Keep Sessions Short

```typescript
// Admin sessions: 1 hour max
// Regular users: Consider longer sessions
// Sensitive operations: Require re-authentication
```

### 7. Monitor for Anomalies

```typescript
// Check audit logs regularly
const failedRequests = AuditService.getFailedRequests(100);

// Look for patterns:
// - Multiple auth failures
// - Unusual request patterns
// - High error rates
// - Suspicious paths/parameters
```

---

## Configuration

### Script Properties

Set these in Script Properties for security configuration:

```javascript
// Required
OWNER_EMAIL = "owner@example.com"

// Optional
ADMIN_EMAILS = "admin1@example.com,admin2@example.com"
ALLOWED_DOMAIN = "company.com"
IP_BLACKLIST = "1.2.3.4,5.6.7.8"
OPENAI_API_KEY = "sk-..."
```

### Environment Variables

Configure in `appsscript.json`:

```json
{
  "oauthScopes": [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/script.external_request"
  ],
  "webapp": {
    "access": "DOMAIN",
    "executeAs": "USER_DEPLOYING"
  }
}
```

---

## Monitoring

### Metrics to Track

1. **Authentication:**
   - Login success/failure rate
   - Session creation/destruction
   - Token expiration events
   - Permission denials

2. **Requests:**
   - Total request count
   - Requests by endpoint
   - Requests by user
   - Response time percentiles

3. **Security Events:**
   - Failed authentications
   - Rate limit hits
   - Validation errors
   - Attack pattern detections

4. **Errors:**
   - 4xx error rate
   - 5xx error rate
   - Specific error types
   - Error patterns

### Audit Log Analysis

```typescript
// Get failed authentication attempts
const failedAuth = AuditService.getFailedRequests(100)
  .filter(log => log.path.includes('/auth/login'));

// Get high-permission actions
const adminActions = AuditService.getRecentLogs(1000)
  .filter(log => log.permissions?.includes('admin'));

// Get slow requests
const slowRequests = AuditService.getRecentLogs(1000)
  .filter(log => log.duration && log.duration > 1000);
```

### Alerts

Set up alerts for:
- ✅ Multiple auth failures from same user
- ✅ Unusual request patterns
- ✅ High error rates
- ✅ Security events
- ✅ Performance degradation

---

## Security Checklist

### Deployment

- [ ] HTTPS only (enforced via HSTS)
- [ ] Secure Script Properties set
- [ ] Domain restrictions configured
- [ ] Rate limits tuned
- [ ] Audit logging enabled
- [ ] Security headers configured
- [ ] CORS properly configured
- [ ] Sensitive data not in code

### Runtime

- [ ] All endpoints authenticated (except public)
- [ ] Permissions checked
- [ ] Input validated
- [ ] Input sanitized
- [ ] Responses logged
- [ ] Errors handled gracefully
- [ ] Secrets never logged

### Monitoring

- [ ] Audit logs reviewed regularly
- [ ] Failed requests monitored
- [ ] Security events tracked
- [ ] Performance monitored
- [ ] Alerts configured

---

## Incident Response

### Security Incident Checklist

1. **Identify:**
   - Check audit logs
   - Identify affected users
   - Determine scope

2. **Contain:**
   - Revoke compromised sessions
   - Block malicious IPs
   - Disable affected accounts

3. **Investigate:**
   - Review audit trail
   - Analyze attack pattern
   - Identify vulnerabilities

4. **Remediate:**
   - Fix vulnerabilities
   - Update security measures
   - Rotate secrets if needed

5. **Document:**
   - Record incident details
   - Document response actions
   - Update security procedures

---

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Google Apps Script Security Best Practices](https://developers.google.com/apps-script/guides/security)
- [Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [OAuth 2.0 Security](https://oauth.net/2/oauth-best-practice/)

---

**Last Updated:** 2025-11-16
**Version:** 1.0.0
