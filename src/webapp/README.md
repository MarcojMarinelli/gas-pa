# Web App API Gateway

Production-ready API Gateway for GAS-PA backend integration.

## Structure

```
webapp/
├── router.ts                  # Main API router with route registration
├── types/
│   └── api-types.ts          # TypeScript type definitions
├── middleware/
│   ├── auth.ts               # Authentication & session management
│   ├── rate-limit.ts         # Rate limiting per user
│   └── logging.ts            # Request logging
└── handlers/
    ├── health.ts             # Health check endpoints
    ├── auth-handler.ts       # Login/logout handlers
    ├── metrics.ts            # Dashboard metrics (Step 4)
    └── queue.ts              # Queue management (Step 5)
```

## Endpoints

### Health & System

- `GET /health` - Basic health check (no auth)
- `GET /health/detailed` - Detailed service status (no auth)
- `GET /ping` - Simple ping (no auth)

### Authentication

- `POST /api/auth/login` - Create session
- `POST /api/auth/logout` - Destroy session (requires auth)
- `POST /api/auth/refresh` - Refresh token (requires auth)
- `GET /api/auth/me` - Get current user (requires auth)

### Metrics (Coming in Step 4)

- `GET /api/metrics` - Dashboard metrics

### Queue Management (Coming in Step 5)

- `GET /api/queue` - List queue items
- `GET /api/queue/:id` - Get queue item
- `POST /api/queue` - Create queue item
- `PUT /api/queue/:id` - Update queue item
- `DELETE /api/queue/:id` - Delete queue item

## Authentication

All authenticated endpoints require Bearer token:

```
Authorization: Bearer <token>
```

Get token from `/api/auth/login` endpoint.

## Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "timestamp": "2025-11-16T23:00:00.000Z"
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Error message",
    "details": { ... }
  },
  "meta": {
    "timestamp": "2025-11-16T23:00:00.000Z"
  }
}
```

## Error Codes

- `VALIDATION_ERROR` (400) - Invalid request data
- `UNAUTHORIZED` (401) - Missing or invalid auth token
- `FORBIDDEN` (403) - Insufficient permissions
- `NOT_FOUND` (404) - Route or resource not found
- `RATE_LIMIT` (429) - Too many requests
- `INTERNAL_ERROR` (500) - Server error

## Rate Limiting

- Login: 10 requests/minute
- Metrics: 60 requests/minute
- Queue operations: 100 requests/minute

## Permissions

- `admin` - Full access to all operations
- `read` - Read-only access
- `write` - Create and update operations
- `delete` - Delete operations

Configured via Script Properties:
- `OWNER_EMAIL` - Owner gets admin permissions
- `ADMIN_EMAILS` - Comma-separated admin emails
- `ALLOWED_DOMAIN` - Domain restriction for users

## Development

### Build
```bash
npm run build
```

This compiles `src/webapp/router.ts` → `dist/webapp.js`

### Deploy
```bash
npm run push
```

### Test Endpoints

#### Health Check
```bash
curl https://script.google.com/macros/s/{SCRIPT_ID}/exec?path=/health
```

#### Login
```bash
# In GAS environment, user is auto-authenticated via Google OAuth
curl -X POST https://script.google.com/macros/s/{SCRIPT_ID}/exec?path=/api/auth/login
```

## Implementation Status

✅ **Step 1 Complete** - API Gateway Foundation
- [x] Router with middleware support
- [x] Type definitions
- [x] Authentication middleware
- [x] Rate limiting middleware
- [x] Logging middleware
- [x] Health check endpoints
- [x] Auth handlers

⏳ **Step 2** - Data Models (Next)
⏳ **Step 3** - Security enhancements
⏳ **Step 4** - Metrics API
⏳ **Step 5** - Queue Management API

## Architecture

```
Client Request
    ↓
GAS doGet/doPost
    ↓
parseRequest()
    ↓
ApiRouter.route()
    ↓
├─ Route Matching (dynamic params)
├─ Middleware Chain
│  ├─ Logging
│  ├─ Rate Limiting
│  └─ Authentication
├─ Handler Execution
└─ Error Handling
    ↓
JSON Response
```

## Next Steps

1. Implement metrics handler (Step 4)
2. Implement queue handlers (Step 5)
3. Create frontend API client (Step 6)
4. Add comprehensive tests (Step 9)
