# GAS-PA Deployment Guide

## Overview
Complete deployment guide for the Google Apps Script Personal Assistant (GAS-PA) email management system with backend API integration.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Pre-Deployment Checklist](#pre-deployment-checklist)
3. [Configuration](#configuration)
4. [Deployment Steps](#deployment-steps)
5. [Post-Deployment Verification](#post-deployment-verification)
6. [Monitoring](#monitoring)
7. [Troubleshooting](#troubleshooting)
8. [Rollback Procedures](#rollback-procedures)

---

## Prerequisites

### Required Tools
- **Node.js**: v18 or higher
- **npm**: v8 or higher
- **Google Account**: With access to Google Apps Script
- **clasp**: Google Apps Script command-line tool
  ```bash
  npm install -g @google/clasp
  ```

### Required Access
- Google Apps Script project ownership
- Gmail API enabled
- Google Sheets API enabled
- Appropriate OAuth scopes configured

### Development Environment
```bash
# Clone repository
git clone <repository-url>
cd gas-pa

# Install dependencies
npm install

# Login to clasp (one-time)
clasp login
```

---

## Pre-Deployment Checklist

### Code Quality
- [ ] All TypeScript compilation errors resolved
- [ ] Build completes successfully (`npm run build`)
- [ ] No console errors or warnings
- [ ] Code reviewed and approved

### Testing
- [ ] Unit tests pass (if applicable)
- [ ] Integration tests documented in `tests/api/`
- [ ] Manual testing of critical paths completed
- [ ] UI components render correctly

### Configuration
- [ ] API endpoints configured correctly
- [ ] Mock vs Production backend services configured
- [ ] Rate limits set appropriately
- [ ] Security headers configured
- [ ] CORS settings verified

### Documentation
- [ ] API documentation complete
- [ ] README updated
- [ ] Deployment notes documented
- [ ] Known issues documented

---

## Configuration

### 1. Backend Service Mode

**Production Mode** (Real GAS Backend):
```typescript
// src/webapp/handlers/metrics-handler.ts
export const metricsHandler = createMetricsHandler(false); // false = production

// src/webapp/handlers/queue-handler.ts
export const queueHandler = createQueueHandler(false);

// src/webapp/handlers/processing-handler.ts
export const processingHandler = createProcessingHandler(false);

// src/webapp/handlers/settings-handler.ts
export const settingsHandler = createSettingsHandler(false);

// src/webapp/handlers/activity-handler.ts
export const activityHandler = createActivityHandler(false);
```

**Development/Testing Mode** (Mock Backend):
```typescript
// Use true for mock backends during development
export const metricsHandler = createMetricsHandler(true);
```

### 2. Rate Limiting Configuration

Edit `src/webapp/routes.ts`:
```typescript
// Authenticated routes
rateLimitMiddleware(100, 3600) // 100 requests per hour

// Public routes
rateLimitMiddleware(20, 60) // 20 requests per minute

// Login attempts
rateLimitMiddleware(10, 60) // 10 attempts per minute
```

### 3. Google Apps Script Project

**appsscript.json Configuration**:
```json
{
  "timeZone": "America/New_York",
  "dependencies": {
    "enabledAdvancedServices": [
      {
        "userSymbol": "Gmail",
        "serviceId": "gmail",
        "version": "v1"
      },
      {
        "userSymbol": "Sheets",
        "serviceId": "sheets",
        "version": "v4"
      }
    ]
  },
  "webapp": {
    "access": "MYSELF",
    "executeAs": "USER_DEPLOYING"
  },
  "oauthScopes": [
    "https://www.googleapis.com/auth/gmail.modify",
    "https://www.googleapis.com/auth/gmail.metadata",
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/script.external_request"
  ]
}
```

### 4. Environment-Specific Settings

Create `.clasp.json` (gitignored):
```json
{
  "scriptId": "YOUR_SCRIPT_ID_HERE",
  "rootDir": "./dist"
}
```

---

## Deployment Steps

### Step 1: Build the Project

```bash
# Clean and build
npm run build
```

**Expected Output**:
```
Building UI bundle…
Building addon components for tests…
Building API Gateway (webapp)…
Copying gallery…
Copying appsscript.json…
✓ Build complete

  dist/UI.js   104.0kb
  dist/UI.css   28.0kb
  dist/addon-bundle.js  24.0kb
  dist/webapp.js  635.6kb
```

### Step 2: Verify Build Output

```bash
# Check dist directory
ls -lh dist/

# Should contain:
# - UI.js
# - UI.css
# - addon-bundle.js
# - webapp.js
# - appsscript.json
# - gallery/ (HTML files)
```

### Step 3: Configure clasp

```bash
# First time setup - create new project
clasp create --type webapp --title "GAS-PA" --rootDir ./dist

# OR link to existing project
# Update .clasp.json with your scriptId
```

### Step 4: Push to Google Apps Script

```bash
# Push files
npm run push

# Alternative: build and push in one command
npm run deploy
```

**Expected Output**:
```
└─ appsscript.json
└─ UI.js
└─ UI.css
└─ addon-bundle.js
└─ webapp.js
└─ gallery/...
Pushed X files.
```

### Step 5: Create Deployment

```bash
# Open Apps Script editor
npm run open

# In Apps Script editor:
# 1. Click "Deploy" > "New deployment"
# 2. Select type: "Web app"
# 3. Description: "Production v1.0.0"
# 4. Execute as: "Me"
# 5. Who has access: "Only myself" (or as needed)
# 6. Click "Deploy"
```

### Step 6: Authorize Permissions

On first deployment:
1. Click the deployment URL
2. Review permissions
3. Click "Advanced" > "Go to GAS-PA (unsafe)"
4. Click "Allow"

---

## Post-Deployment Verification

### 1. Health Check Endpoints

```bash
# Get deployment URL from Apps Script
DEPLOY_URL="https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec"

# Test health endpoint
curl "$DEPLOY_URL/health"

# Expected response:
# {"status":"ok","timestamp":"2025-11-17T...","version":"1.0.0"}

# Test detailed health
curl "$DEPLOY_URL/health/detailed"
```

### 2. Test Authentication

```bash
# Test login
curl -X POST "$DEPLOY_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"test@example.com","password":"password"}'

# Should return token
```

### 3. Test API Endpoints

```bash
# Get API info
curl "$DEPLOY_URL/api"

# Should return list of all 42 endpoints
```

### 4. Verify Logs

```bash
# Watch logs in real-time
npm run logs

# Check for:
# - "Routes registered: 42"
# - No errors or warnings
# - Successful initialization messages
```

### 5. Test Critical Flows

**Metrics Endpoint**:
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "$DEPLOY_URL/api/metrics"
```

**Queue Management**:
```bash
# List queue
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "$DEPLOY_URL/api/queue"

# Get specific item
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "$DEPLOY_URL/api/queue/ITEM_ID"
```

**Activity Logs**:
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "$DEPLOY_URL/api/activity?page=1&pageSize=10"
```

---

## Monitoring

### Key Metrics to Monitor

1. **Request Rate**
   - Total requests/hour
   - Failed requests
   - Rate limit hits

2. **Response Times**
   - Average response time
   - P95/P99 latency
   - Slow endpoints (>1s)

3. **Error Rates**
   - 4xx errors (client errors)
   - 5xx errors (server errors)
   - Authentication failures

4. **Resource Usage**
   - Script execution time
   - Memory usage
   - Quota consumption

### Accessing Logs

```bash
# Real-time logs
npm run logs

# Apps Script Console
# https://script.google.com > Executions
```

### Setting Up Alerts

Configure alerts in Google Cloud Console:
1. Navigate to your Apps Script project
2. Set up Cloud Monitoring
3. Create alert policies for:
   - High error rate (>5%)
   - Slow response times (>2s)
   - Quota nearing limit (>80%)

---

## Troubleshooting

### Build Failures

**Symptom**: `npm run build` fails

**Solutions**:
```bash
# Check TypeScript errors
npx tsc --noEmit

# Clean and rebuild
rm -rf dist/ node_modules/
npm install
npm run build

# Check Node.js version
node --version  # Should be v18+
```

### Push Failures

**Symptom**: `clasp push` fails

**Solutions**:
```bash
# Re-authenticate
clasp logout
clasp login

# Check .clasp.json exists and has valid scriptId
cat .clasp.json

# Verify dist/ directory has files
ls -la dist/
```

### Runtime Errors

**Symptom**: API returns 500 errors

**Solutions**:
1. Check Apps Script logs: `npm run logs`
2. Verify OAuth scopes are authorized
3. Check quota limits in Apps Script dashboard
4. Verify backend services are in correct mode (mock vs production)

### CORS Errors

**Symptom**: Browser shows CORS errors

**Solutions**:
```typescript
// Verify CORS middleware in src/webapp/middleware/security-headers.ts
export const corsMiddleware: MiddlewareFunction = async (request, next) => {
  const response = await next(request);
  response.headers = response.headers || {};
  response.headers['Access-Control-Allow-Origin'] = '*';  // Update as needed
  return response;
};
```

### Authentication Issues

**Symptom**: All requests return 401 Unauthorized

**Solutions**:
1. Verify token generation in auth handler
2. Check authMiddleware is applied correctly
3. Verify user permissions
4. Check token expiration settings

### Performance Issues

**Symptom**: Slow response times

**Solutions**:
1. Check cache status: `GET /api/metrics/status`
2. Verify rate limiting not too aggressive
3. Optimize database queries
4. Enable caching for frequently accessed data
5. Consider pagination for large datasets

---

## Rollback Procedures

### Quick Rollback

```bash
# In Apps Script Editor:
# 1. Click "Deploy" > "Manage deployments"
# 2. Find previous working version
# 3. Click ⋮ > "Activate"
```

### Full Rollback with Code

```bash
# Checkout previous version
git checkout tags/v1.0.0  # or specific commit

# Build and deploy
npm run build
npm run push

# Create new deployment with previous code
clasp deploy
```

### Emergency Procedures

If deployment causes critical issues:

1. **Immediate**: Switch to previous deployment (see Quick Rollback)
2. **Short-term**: Disable affected endpoints by commenting out routes
3. **Long-term**: Fix issues, test, and redeploy

---

## Deployment Checklist

Use this checklist for each deployment:

### Pre-Deployment
- [ ] Code changes reviewed
- [ ] Build successful (`npm run build`)
- [ ] Backend mode configured (mock vs production)
- [ ] Rate limits verified
- [ ] Documentation updated

### Deployment
- [ ] Push to Google Apps Script (`npm run push`)
- [ ] Create new deployment version
- [ ] Note deployment ID
- [ ] Verify authorization

### Post-Deployment
- [ ] Health check passes
- [ ] Authentication works
- [ ] Critical endpoints tested
- [ ] No errors in logs
- [ ] Performance acceptable
- [ ] Monitoring configured

### Communication
- [ ] Stakeholders notified
- [ ] Deployment notes published
- [ ] Known issues documented
- [ ] Support team briefed

---

## Production Recommendations

### Security
1. **Switch to production backends**: Set all handlers to `false` (production mode)
2. **Restrict CORS**: Update `corsMiddleware` to allow only specific origins
3. **Enable audit logging**: All enabled by default in production
4. **Use strong rate limits**: Configure based on expected load
5. **Regular security audits**: Review logs for suspicious activity

### Performance
1. **Enable caching**: Metrics cache enabled by default
2. **Set appropriate TTLs**: Adjust based on data freshness needs
3. **Monitor quotas**: Set alerts at 80% usage
4. **Optimize database access**: Use batch operations where possible
5. **Enable compression**: For large responses

### Reliability
1. **Set up monitoring**: Cloud Monitoring with alerts
2. **Configure backups**: Regular Google Sheets backups
3. **Document procedures**: Keep this guide updated
4. **Test rollback**: Verify rollback procedures work
5. **Have on-call rotation**: 24/7 support if needed

---

## Support

### Getting Help
- **Documentation**: `/docs` directory
- **API Reference**: `/docs/API_DOCUMENTATION.md`
- **Completion Reports**: `/docs/STEP*_COMPLETION_REPORT.md`
- **GitHub Issues**: [Repository issues]

### Contact
- **Technical Lead**: marco@example.com
- **Emergency**: [On-call rotation]

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0.0 | 2025-11-17 | Initial production deployment | Marco |

---

## Appendix

### A. Required OAuth Scopes

```
https://www.googleapis.com/auth/gmail.modify
https://www.googleapis.com/auth/gmail.metadata
https://www.googleapis.com/auth/spreadsheets
https://www.googleapis.com/auth/script.external_request
```

### B. API Endpoint Summary

**Total Endpoints**: 42
- Health/Ping: 3
- Authentication: 4
- Metrics: 3
- Queue Management: 11
- Email Processing: 10
- Settings: 7
- Activity: 5

### C. Bundle Sizes

- UI.js: 104.0kb
- UI.css: 28.0kb
- addon-bundle.js: 24.0kb
- webapp.js: 635.6kb
- **Total**: ~791kb

### D. Performance Targets

- Health check: <100ms
- Authentication: <200ms
- Metrics (cached): <100ms
- Metrics (uncached): <500ms
- Queue list (paginated): <300ms
- Activity logs: <300ms
- Processing (single): <1s
- Processing (batch): Background (async)

---

**Document Version**: 1.0.0
**Last Updated**: 2025-11-17
**Next Review**: 2025-12-17
