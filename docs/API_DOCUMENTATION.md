# GAS-PA API Documentation

## Overview
Complete API reference for the Google Apps Script Personal Assistant (GAS-PA) backend integration.

**Base URL**: `https://script.google.com/macros/s/{DEPLOYMENT_ID}/exec`
**API Version**: 1.0.0
**Total Endpoints**: 42

---

## Table of Contents

1. [Authentication](#authentication)
2. [Health & Monitoring](#health--monitoring)
3. [Metrics API](#metrics-api)
4. [Queue Management API](#queue-management-api)
5. [Email Processing API](#email-processing-api)
6. [Settings & Configuration API](#settings--configuration-api)
7. [Activity & Audit Log API](#activity--audit-log-api)
8. [Error Handling](#error-handling)
9. [Rate Limiting](#rate-limiting)
10. [Examples](#examples)

---

## Authentication

All authenticated endpoints require an `Authorization` header with a bearer token.

### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "user@example.com",
  "password": "password"
}
```

**Response**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 3600,
  "user": {
    "email": "user@example.com",
    "permissions": ["read", "write", "delete"]
  }
}
```

### Logout
```http
POST /api/auth/logout
Authorization: Bearer {token}
```

**Response**:
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### Refresh Token
```http
POST /api/auth/refresh
Authorization: Bearer {token}
```

**Response**:
```json
{
  "token": "new_token_here",
  "expiresIn": 3600
}
```

### Get Current User
```http
GET /api/auth/me
Authorization: Bearer {token}
```

**Response**:
```json
{
  "email": "user@example.com",
  "permissions": ["read", "write", "delete"],
  "role": "user"
}
```

---

## Health & Monitoring

### Basic Health Check
```http
GET /health
```

**Response**:
```json
{
  "status": "ok",
  "timestamp": "2025-11-17T01:00:00.000Z",
  "version": "1.0.0"
}
```

### Detailed Health Check
```http
GET /health/detailed
```

**Response**:
```json
{
  "status": "ok",
  "timestamp": "2025-11-17T01:00:00.000Z",
  "version": "1.0.0",
  "services": {
    "database": "ok",
    "gmail": "ok",
    "sheets": "ok"
  },
  "uptime": 3600,
  "memory": {
    "used": 45.2,
    "limit": 100
  }
}
```

### Ping
```http
GET /ping
```

**Response**:
```json
{
  "pong": true,
  "timestamp": "2025-11-17T01:00:00.000Z"
}
```

---

## Metrics API

### Get Dashboard Metrics
```http
GET /api/metrics
Authorization: Bearer {token}
```

**Query Parameters**:
- `forceRefresh` (optional): boolean - Bypass cache

**Response**:
```json
{
  "totalEmails": 1543,
  "processedToday": 42,
  "pendingActions": 15,
  "avgProcessingTime": 2.3,
  "successRate": 95.5,
  "priorityBreakdown": {
    "high": 5,
    "medium": 8,
    "low": 2
  },
  "categoryBreakdown": {
    "urgent": 3,
    "followup": 6,
    "review": 4,
    "general": 2
  },
  "slaCompliance": 92.0,
  "trendData": {
    "processedPerDay": [40, 38, 42, 45, 42],
    "avgProcessingTime": [2.5, 2.4, 2.3, 2.2, 2.3]
  },
  "lastUpdated": "2025-11-17T01:00:00.000Z",
  "cacheHit": true
}
```

### Refresh Metrics
```http
POST /api/metrics/refresh
Authorization: Bearer {token}
```

**Response**:
```json
{
  "success": true,
  "message": "Cache cleared, metrics refreshed",
  "metrics": { /* same as GET /api/metrics */ }
}
```

### Get Metrics Status
```http
GET /api/metrics/status
Authorization: Bearer {token}
```

**Response**:
```json
{
  "cacheEnabled": true,
  "cacheTTL": 300,
  "lastCacheUpdate": "2025-11-17T00:55:00.000Z",
  "cacheHitRate": 85.5,
  "totalRequests": 1234
}
```

---

## Queue Management API

### List Queue Items
```http
GET /api/queue
Authorization: Bearer {token}
```

**Query Parameters**:
- `page` (default: 1): Page number
- `pageSize` (default: 20, max: 100): Items per page
- `status`: Filter by status (pending|snoozed|completed|archived)
- `priority`: Filter by priority (high|medium|low)
- `category`: Filter by category
- `search`: Search in subject/sender
- `sortBy` (default: createdAt): Field to sort by
- `sortOrder` (default: desc): asc|desc

**Response**:
```json
{
  "items": [
    {
      "id": "item-123",
      "emailId": "msg_abc123",
      "subject": "Important: Q4 Report",
      "sender": "boss@company.com",
      "priority": "high",
      "category": "urgent",
      "status": "pending",
      "sla": {
        "deadline": "2025-11-18T17:00:00.000Z",
        "hoursRemaining": 16,
        "isOverdue": false
      },
      "actionItems": [
        "Review Q4 numbers",
        "Prepare presentation"
      ],
      "createdAt": "2025-11-17T01:00:00.000Z",
      "updatedAt": "2025-11-17T01:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "totalItems": 45,
    "totalPages": 3,
    "hasMore": true
  }
}
```

### Get Queue Item
```http
GET /api/queue/{id}
Authorization: Bearer {token}
```

**Response**:
```json
{
  "id": "item-123",
  "emailId": "msg_abc123",
  "subject": "Important: Q4 Report",
  "sender": "boss@company.com",
  "priority": "high",
  "category": "urgent",
  "status": "pending",
  "sla": {
    "deadline": "2025-11-18T17:00:00.000Z",
    "hoursRemaining": 16,
    "isOverdue": false
  },
  "actionItems": [
    "Review Q4 numbers",
    "Prepare presentation"
  ],
  "metadata": {
    "labels": ["important", "follow-up"],
    "attachments": 2
  },
  "createdAt": "2025-11-17T01:00:00.000Z",
  "updatedAt": "2025-11-17T01:00:00.000Z"
}
```

### Create Queue Item
```http
POST /api/queue
Authorization: Bearer {token}
Content-Type: application/json

{
  "emailId": "msg_xyz789",
  "subject": "New Task",
  "sender": "colleague@company.com",
  "priority": "medium",
  "category": "followup",
  "dueDate": "2025-11-20T17:00:00.000Z",
  "actionItems": ["Schedule meeting", "Send documents"]
}
```

**Response**:
```json
{
  "success": true,
  "item": { /* full queue item */ },
  "message": "Queue item created successfully"
}
```

### Update Queue Item
```http
PUT /api/queue/{id}
Authorization: Bearer {token}
Content-Type: application/json

{
  "priority": "high",
  "status": "pending",
  "actionItems": ["Updated action item"]
}
```

**Response**:
```json
{
  "success": true,
  "item": { /* updated queue item */ },
  "message": "Queue item updated successfully"
}
```

### Delete Queue Item
```http
DELETE /api/queue/{id}
Authorization: Bearer {token}
```

**Response**:
```json
{
  "success": true,
  "message": "Queue item deleted successfully"
}
```

### Snooze Item
```http
POST /api/queue/{id}/snooze
Authorization: Bearer {token}
Content-Type: application/json

{
  "until": "2025-11-18T09:00:00.000Z",
  "reason": "Waiting for more information"
}
```

**Response**:
```json
{
  "success": true,
  "item": { /* snoozed item */ },
  "message": "Item snoozed until 2025-11-18T09:00:00.000Z"
}
```

### Complete Item
```http
POST /api/queue/{id}/complete
Authorization: Bearer {token}
Content-Type: application/json

{
  "completionNotes": "Report reviewed and approved"
}
```

**Response**:
```json
{
  "success": true,
  "item": { /* completed item */ },
  "message": "Item marked as completed"
}
```

### Archive Item
```http
POST /api/queue/{id}/archive
Authorization: Bearer {token}
```

**Response**:
```json
{
  "success": true,
  "item": { /* archived item */ },
  "message": "Item archived successfully"
}
```

### Bulk Operations
```http
POST /api/queue/bulk
Authorization: Bearer {token}
Content-Type: application/json

{
  "operation": "complete",
  "itemIds": ["item-1", "item-2", "item-3"],
  "data": {
    "completionNotes": "Batch completed"
  }
}
```

**Operations**: `complete`, `archive`, `delete`, `updatePriority`, `updateCategory`

**Response**:
```json
{
  "success": true,
  "results": {
    "successful": 3,
    "failed": 0,
    "errors": []
  },
  "message": "Bulk operation completed"
}
```

---

## Email Processing API

### Process Single Email
```http
POST /api/process/email/{id}
Authorization: Bearer {token}
Content-Type: application/json

{
  "options": {
    "addToQueue": true,
    "autoLabel": true
  }
}
```

**Response**:
```json
{
  "emailId": "msg_123",
  "success": true,
  "category": "urgent",
  "priority": "high",
  "actionItems": ["Review contract", "Schedule call"],
  "addedToQueue": true,
  "queueItemId": "item-456",
  "processingTime": 234,
  "timestamp": "2025-11-17T01:00:00.000Z"
}
```

### Batch Process Emails
```http
POST /api/process/batch
Authorization: Bearer {token}
Content-Type: application/json

{
  "emailIds": ["msg_1", "msg_2", "msg_3"],
  "options": {
    "addToQueue": true,
    "autoLabel": true
  }
}
```

**Response**:
```json
{
  "jobId": "job_abc123",
  "status": "queued",
  "total": 3,
  "message": "Batch job queued for processing"
}
```

### Get Job Status
```http
GET /api/process/status/{jobId}
Authorization: Bearer {token}
```

**Response**:
```json
{
  "jobId": "job_abc123",
  "status": "running",
  "total": 3,
  "processed": 2,
  "successful": 2,
  "failed": 0,
  "errors": [],
  "startTime": "2025-11-17T01:00:00.000Z",
  "progress": 66
}
```

**Status values**: `queued`, `running`, `completed`, `failed`, `cancelled`

### Cancel Job
```http
POST /api/process/cancel/{jobId}
Authorization: Bearer {token}
```

**Response**:
```json
{
  "success": true,
  "jobId": "job_abc123",
  "message": "Job cancelled successfully"
}
```

### Retry Failed Email
```http
POST /api/process/retry/email/{id}
Authorization: Bearer {token}
```

**Response**:
```json
{
  "emailId": "msg_123",
  "success": true,
  "message": "Email processing retried successfully",
  "result": { /* processing result */ }
}
```

### Retry Failed Job
```http
POST /api/process/retry/job/{jobId}
Authorization: Bearer {token}
```

**Response**:
```json
{
  "newJobId": "job_xyz789",
  "status": "queued",
  "retriedCount": 2,
  "message": "Job retry queued"
}
```

### Analyze Email
```http
POST /api/process/analyze/{id}
Authorization: Bearer {token}
```

**Response**:
```json
{
  "emailId": "msg_123",
  "category": "urgent",
  "priority": "high",
  "actionItems": ["Review contract", "Schedule call"],
  "sentiment": "neutral",
  "entities": [
    { "type": "person", "value": "John Smith" },
    { "type": "date", "value": "2025-11-20" }
  ],
  "requiresResponse": true,
  "isUrgent": true,
  "confidence": 0.92,
  "timestamp": "2025-11-17T01:00:00.000Z"
}
```

### Extract Action Items
```http
POST /api/process/extract-actions/{id}
Authorization: Bearer {token}
```

**Response**:
```json
{
  "emailId": "msg_123",
  "actionItems": [
    "Review Q4 report",
    "Prepare presentation for Monday",
    "Send updated numbers to team"
  ],
  "count": 3
}
```

### Categorize Email
```http
POST /api/process/categorize/{id}
Authorization: Bearer {token}
```

**Response**:
```json
{
  "emailId": "msg_123",
  "category": "urgent",
  "confidence": 0.95,
  "alternativeCategories": [
    { "category": "followup", "confidence": 0.75 }
  ]
}
```

### Determine Priority
```http
POST /api/process/prioritize/{id}
Authorization: Bearer {token}
```

**Response**:
```json
{
  "emailId": "msg_123",
  "priority": "high",
  "confidence": 0.88,
  "factors": [
    "Urgent keyword detected",
    "From direct manager",
    "Due date within 24 hours"
  ]
}
```

---

## Settings & Configuration API

### Get User Preferences
```http
GET /api/settings/user
Authorization: Bearer {token}
```

**Response**:
```json
{
  "email": "user@example.com",
  "timezone": "America/New_York",
  "notifications": {
    "email": true,
    "desktop": false,
    "frequency": "realtime"
  },
  "display": {
    "theme": "light",
    "density": "comfortable",
    "dateFormat": "MM/DD/YYYY"
  },
  "processing": {
    "autoProcess": true,
    "autoLabel": true,
    "confidenceThreshold": 0.8
  },
  "lastUpdated": "2025-11-17T01:00:00.000Z"
}
```

### Update User Preferences
```http
PUT /api/settings/user
Authorization: Bearer {token}
Content-Type: application/json

{
  "notifications": {
    "email": false,
    "desktop": true
  },
  "display": {
    "theme": "dark"
  }
}
```

**Response**:
```json
{
  "success": true,
  "preferences": { /* updated preferences */ },
  "message": "Preferences updated successfully"
}
```

### Reset User Preferences
```http
POST /api/settings/user/reset
Authorization: Bearer {token}
```

**Response**:
```json
{
  "success": true,
  "preferences": { /* default preferences */ },
  "message": "Preferences reset to defaults"
}
```

### Get Default Preferences
```http
GET /api/settings/user/defaults
```

**Response**:
```json
{
  "timezone": "UTC",
  "notifications": {
    "email": true,
    "desktop": false,
    "frequency": "daily"
  },
  /* ... other defaults */
}
```

### Get System Configuration (Admin Only)
```http
GET /api/settings/system
Authorization: Bearer {admin_token}
```

**Response**:
```json
{
  "version": "1.0.0",
  "environment": "production",
  "features": {
    "queueManagement": true,
    "autoProcessing": true,
    "slaTracking": true,
    "aiClassification": true
  },
  "limits": {
    "maxEmailsPerRun": 100,
    "maxQueueSize": 1000,
    "apiRateLimit": 100,
    "sessionTimeout": 3600
  },
  "integrations": {
    "openaiEnabled": false,
    "openaiModel": "gpt-4"
  }
}
```

### Update System Configuration (Admin Only)
```http
PUT /api/settings/system
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "features": {
    "aiClassification": true
  },
  "limits": {
    "maxEmailsPerRun": 150
  }
}
```

**Response**:
```json
{
  "success": true,
  "configuration": { /* updated config */ },
  "message": "System configuration updated"
}
```

### Get Default System Configuration (Admin Only)
```http
GET /api/settings/system/defaults
Authorization: Bearer {admin_token}
```

---

## Activity & Audit Log API

### Get Activity Logs
```http
GET /api/activity
Authorization: Bearer {token}
```

**Query Parameters**:
- `page` (default: 1): Page number
- `pageSize` (default: 50, max: 200): Logs per page
- `queueItemId`: Filter by queue item
- `user`: Filter by user email
- `action`: Filter by action (comma-separated)
- `dateFrom`: ISO 8601 date
- `dateTo`: ISO 8601 date
- `success`: Filter by success status (true|false)

**Response**:
```json
{
  "logs": [
    {
      "id": "log-123",
      "queueItemId": "item-456",
      "action": "updated",
      "performedBy": "user@example.com",
      "timestamp": "2025-11-17T01:00:00.000Z",
      "changes": {
        "priority": { "before": "medium", "after": "high" }
      }
    }
  ],
  "total": 245,
  "page": 1,
  "pageSize": 50,
  "hasMore": true
}
```

### Get Logs for Item
```http
GET /api/activity/item/{id}
Authorization: Bearer {token}
```

**Query Parameters**:
- `limit` (default: 100): Maximum logs to return

**Response**:
```json
{
  "logs": [ /* activity logs for this item */ ]
}
```

### Get Logs for Current User
```http
GET /api/activity/user
Authorization: Bearer {token}
```

**Query Parameters**:
- `limit` (default: 100): Maximum logs to return

**Response**:
```json
{
  "logs": [ /* activity logs for current user */ ]
}
```

### Get System Activity (Admin Only)
```http
GET /api/activity/system
Authorization: Bearer {admin_token}
```

**Query Parameters**:
- `limit` (default: 100): Maximum logs to return

**Response**:
```json
{
  "logs": [ /* recent system activity */ ]
}
```

### Get Failed Requests (Admin Only)
```http
GET /api/activity/failed
Authorization: Bearer {admin_token}
```

**Query Parameters**:
- `limit` (default: 100): Maximum logs to return

**Response**:
```json
{
  "logs": [
    {
      "id": "log-789",
      "action": "created",
      "performedBy": "user@example.com",
      "timestamp": "2025-11-17T01:00:00.000Z",
      "comment": "Operation failed: timeout"
    }
  ]
}
```

---

## Error Handling

All API errors follow a consistent format:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters",
    "details": {
      "field": "email",
      "issue": "Invalid email format"
    },
    "timestamp": "2025-11-17T01:00:00.000Z",
    "requestId": "req_abc123"
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid request data |
| `AUTHENTICATION_ERROR` | 401 | Invalid or missing token |
| `AUTHORIZATION_ERROR` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |
| `SERVICE_UNAVAILABLE` | 503 | Service temporarily unavailable |

---

## Rate Limiting

Rate limits are applied per user/IP address:

- **Authenticated routes**: 100 requests per hour
- **Public routes**: 20 requests per minute
- **Login attempts**: 10 requests per minute

### Rate Limit Headers

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1700179200
```

### Rate Limit Exceeded Response

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded",
    "details": {
      "limit": 100,
      "resetAt": "2025-11-17T02:00:00.000Z"
    }
  }
}
```

---

## Examples

### Complete Workflow Example

```bash
# 1. Login
TOKEN=$(curl -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"user@example.com","password":"pass"}' \
  | jq -r '.token')

# 2. Get dashboard metrics
curl -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/api/metrics"

# 3. List pending queue items
curl -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/api/queue?status=pending&priority=high"

# 4. Process a new email
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"options":{"addToQueue":true}}' \
  "$BASE_URL/api/process/email/msg_123"

# 5. Update queue item priority
curl -X PUT -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"priority":"high"}' \
  "$BASE_URL/api/queue/item-456"

# 6. Complete the item
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"completionNotes":"Task completed"}' \
  "$BASE_URL/api/queue/item-456/complete"

# 7. Get activity logs
curl -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/api/activity?queueItemId=item-456"

# 8. Logout
curl -X POST -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/api/auth/logout"
```

---

## Postman Collection

A Postman collection with all endpoints is available at:
`/docs/GAS-PA-API.postman_collection.json`

Import this collection to test all API endpoints interactively.

---

## Versioning

This API uses URL-based versioning. The current version is v1.

Future versions will be available at:
- v2: `/v2/api/...`
- v3: `/v3/api/...`

The unversioned `/api/...` routes will always point to the latest stable version.

---

## Support

For API support:
- **Documentation**: This file
- **Issues**: GitHub repository
- **Email**: support@example.com

---

**API Version**: 1.0.0
**Document Version**: 1.0.0
**Last Updated**: 2025-11-17
