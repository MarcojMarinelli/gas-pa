# Type Alignment Guide

This document describes the mapping between backend types and API types.

## Overview

The backend uses more detailed types with additional fields and different enum values. The API layer presents a simplified, normalized view to the frontend.

## Queue Item Type Mapping

### Priority Mapping

| Backend (FollowUpItem) | API (QueueItem) | Notes |
|------------------------|-----------------|-------|
| `CRITICAL` | `high` | CRITICAL maps to high |
| `HIGH` | `high` | |
| `MEDIUM` | `medium` | |
| `LOW` | `low` | |

**Direction:**
- Backend → API: Convert to lowercase, map CRITICAL to 'high'
- API → Backend: Convert to uppercase, default to HIGH for 'high'

### Status Mapping

| Backend (QueueItemStatus) | API (QueueItemStatus) | Notes |
|---------------------------|----------------------|-------|
| `ACTIVE` | `pending` | Active items are pending |
| `SNOOZED` | `snoozed` | Direct mapping |
| `WAITING` | `pending` | Waiting on others shown as pending |
| `COMPLETED` | `completed` | Direct mapping |
| `ARCHIVED` | `archived` | Direct mapping |
| `ESCALATED` | `processing` | Escalated shown as processing |

**Direction:**
- Backend → API: Use mapping table above
- API → Backend: Use reverse mapping, default to ACTIVE for 'pending'

### Follow-up Reason Mapping

| Backend (FollowUpReason) | API (FollowUpReason) | Status |
|--------------------------|---------------------|--------|
| `NEEDS_REPLY` | `NEEDS_REPLY` | ✅ Aligned |
| `WAITING_ON_OTHERS` | `WAITING_ON_INFO` | ⚠️ Renamed |
| `DEADLINE_APPROACHING` | `REQUIRES_ACTION` | ⚠️ Mapped |
| `VIP_REQUIRES_ATTENTION` | `REQUIRES_ACTION` | ⚠️ Mapped |
| `MANUAL_FOLLOW_UP` | `FOLLOW_UP_SCHEDULED` | ⚠️ Mapped |
| `SLA_AT_RISK` | `REQUIRES_ACTION` | ⚠️ Mapped |
| `PERIODIC_CHECK` | `FOLLOW_UP_SCHEDULED` | ⚠️ Mapped |

Note: Backend has more granular reasons. API simplifies to core categories.

### Field Mapping

| Backend Field | API Field | Type Transformation | Notes |
|--------------|-----------|---------------------|-------|
| `id` | `id` | - | Direct |
| `emailId` | `emailId` | - | Direct |
| `threadId` | `threadId` | - | Direct |
| `subject` | `subject` | - | Direct |
| `from` | `from` | - | Direct |
| `to` | `to` | - | Direct |
| `receivedDate` | `date` | Date → ISO string | **Important** |
| `priority` | `priority` | Enum mapping + lowercase | See above |
| `category` | `category` | - | Direct |
| `labels` | `labels` | - | Direct |
| `reason` | `reason` | Enum mapping | See above |
| `status` | `status` | Enum mapping + lowercase | See above |
| `addedToQueueAt` | `addedToQueueAt` | Date → ISO string | Optional |
| `snoozedUntil` | `snoozeUntil` | Date → ISO string | **Field name change** |
| `lastActionDate` | `lastActionAt` | Date → ISO string | **Field name change** |
| `slaDeadline` | `dueDate` | Date → ISO string | **Field name change** |
| `slaStatus` | `slaStatus` | - | Direct |
| `actionCount` | `actionCount` | - | Direct |
| `snoozeCount` | `snoozeCount` | - | Direct |

### Fields NOT Exposed to API

These backend fields are internal and not sent to frontend:

- `timeRemaining` - Calculated on demand
- `waitingOnEmail` - Internal tracking
- `waitingReason` - Internal tracking
- `originalSentDate` - Internal tracking
- `suggestedSnoozeTime` - Sent separately via AI endpoint
- `suggestedActions` - Sent separately via AI endpoint
- `aiReasoning` - Sent separately via AI endpoint
- `createdAt` - Internal audit
- `updatedAt` - Internal audit (use lastActionAt instead)

### Additional API Fields

These fields exist in API but may not have backend equivalents:

- `snippet` - Email preview (calculated from email body)
- `hasAttachments` - Boolean flag (calculated from email)
- `attachmentCount` - Number of attachments (calculated from email)

## Metrics Type Mapping

### Backend Sources

Multiple backend sources contribute to DashboardMetrics:

1. **GmailService.getStatistics()** → Email counts
2. **SheetsService.getStatistics()** → Processing stats
3. **FollowUpQueue.getStatistics()** → Queue metrics

### Metrics Transformation

```typescript
// Backend provides:
{
  totalEmails: number (from Gmail)
  totalProcessed: number (from Sheets)
  pendingActions: number (from Queue)
  avgProcessingTime: number (from Sheets)
}

// Plus array of daily stats:
[
  {
    date: Date,
    emailCount: number,
    processedCount: number,
    pendingCount: number,
    avgTime: number
  }
] // Last 7 days

// API transforms to:
{
  totalEmails: number,
  processedToday: number,
  pendingActions: number,
  avgProcessingTime: number,
  emailTrends: number[7],      // [oldest ... newest]
  processingTrends: number[7],
  pendingTrends: number[7],
  timeTrends: number[7],
  lastUpdated: string (ISO)
}
```

## Date Handling

**Critical Rule:** Never send `Date` objects across API boundary.

### Serialization

```typescript
// Backend (internal)
const item = {
  receivedDate: new Date('2025-11-16T10:30:00Z')
};

// API (external)
const apiItem = {
  date: '2025-11-16T10:30:00.000Z' // ISO 8601
};
```

### Why ISO 8601 Strings?

1. **JSON Compatibility** - Date objects don't serialize properly
2. **Timezone Safety** - ISO includes timezone info
3. **Cross-platform** - Works in browser and GAS
4. **Validation** - Easy to validate with regex/Zod

## Validation Strategy

### At API Boundaries

```typescript
// Incoming (API → Backend)
const queueItem = validate(queueItemSchema, request.postData);
const backendItem = QueueTransformer.toBackendModel(queueItem);

// Outgoing (Backend → API)
const backendItem = await queueManager.getById(id);
const queueItem = QueueTransformer.toApiModel(backendItem);
// Already validated during transformation
```

### Schema Validation Points

1. **Request Input** - Validate all POST/PUT data
2. **Before Transformation** - Ensure correct structure
3. **After Transformation** - Validate output matches schema
4. **Response** - Final check before sending

## Type Safety Checklist

- [x] All Date fields use ISO 8601 strings in API
- [x] Enum mappings documented
- [x] Field name changes documented
- [x] Transformation functions bidirectional
- [x] Validation at all boundaries
- [x] No `any` types in transformers
- [x] TypeScript strict mode enabled
- [x] Runtime validation with Zod

## Migration Path

When backend types change:

1. Update `src/features/queue/types.ts` (backend types)
2. Review impact on `src/types/shared-models.ts` (API types)
3. Update transformers (`src/webapp/transformers/*`)
4. Update Zod schemas (`src/types/validators.ts`)
5. Run type checking: `npx tsc --noEmit`
6. Update this alignment document
7. Run tests to verify transformations

## Common Pitfalls

### ❌ Don't Do This

```typescript
// Sending Date object in response
return {
  date: new Date() // Will serialize incorrectly
};

// Using 'any' type
const item: any = transformItem(data);

// Skipping validation
const item = request.postData; // No validation!
```

### ✅ Do This

```typescript
// Use ISO strings
return {
  date: new Date().toISOString()
};

// Proper typing
const item: QueueItem = QueueTransformer.toApiModel(backendItem);

// Always validate
const item = validate(queueItemSchema, request.postData);
```

## Testing Type Alignment

See `src/types/__tests__/transformers.test.ts` for transformation tests.

Key test scenarios:
- Round-trip transformation (API → Backend → API)
- Date conversion accuracy
- Enum mapping correctness
- Field name changes preserved
- Validation catches invalid data
- Edge cases (null, undefined, empty arrays)
