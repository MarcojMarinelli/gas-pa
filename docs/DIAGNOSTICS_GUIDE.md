# Dashboard Diagnostics Guide

## Current Status

The dashboard is loading successfully but shows **0 for all metrics**. This could be correct if there are no emails with PA labels, or could indicate a data fetching issue.

## What Has Been Updated

### Enhanced Logging (Just Deployed)

Added comprehensive console logging to help diagnose the zero values issue:

1. **Client-side logging** (`src/webapp/client-api.ts`):
   - Logs when metrics are fetched
   - Shows the actual metric values received
   - Displays fetch duration
   - Reports any errors

2. **Backend logging** (`src/webapp/handlers/metrics-handler.ts`):
   - Logs each Gmail query being executed
   - Shows label existence checks
   - Reports thread counts found
   - Captures any errors

3. **Diagnostic function** (`runDiagnostics()`):
   - Can be run from GAS editor
   - Checks all PA labels
   - Tests Gmail queries
   - Shows actual counts

## How to Diagnose the Issue

### Method 1: Check Browser Console (Easiest)

1. **Open the dashboard** in your web browser
2. **Open browser console**: Press `F12` or right-click → Inspect → Console tab
3. **Look for log messages** like:
   ```
   === GAS-PA: Fetching Dashboard Metrics ===
   User email: your@email.com
   === Metrics Retrieved ===
   Duration: 1234 ms
   Metrics: {
     totalEmails: 0,
     processedToday: 0,
     pendingActions: 0,
     avgProcessingTime: 3.5,
     ...
   }
   ```

4. **Check for errors or warnings**:
   - Look for any red error messages
   - Check if labels are being found
   - Verify queries are running

### Method 2: Run testMetrics() in GAS Editor

1. **Open GAS editor**: `npx clasp open`
2. **Select file**: `backend.js`
3. **Select function**: `testMetrics` from dropdown
4. **Click Run** button
5. **Check execution log** for output like:
   ```
   Inbox threads: 150
   PA-Processed: 0 threads (0 unread)
   PA-ActionRequired: 0 threads (0 unread)
   ...
   ```

### Method 3: Run runDiagnostics() Function

In the **GAS editor**:

1. Open the script editor
2. Select `webapp.js`
3. Run the `runDiagnostics` function
4. Check the execution log for detailed diagnostics

## Understanding the Results

### If All Counts Are Zero

This means:
- ✓ The dashboard is working correctly
- ✓ Gmail API access is working
- ✗ **No emails have PA labels applied**

**Next Step**: Apply PA labels to some emails:
1. Go to Gmail
2. Select some emails
3. Apply labels: `PA-Processed`, `PA-ActionRequired`, etc.
4. Refresh the dashboard

### If Labels Are "NOT FOUND"

This means the PA labels haven't been created yet.

**Next Step**: Run the setup function:
1. In GAS editor: Select `backend.js`
2. Run `setup()` function
3. This creates all PA labels
4. Apply labels to emails
5. Refresh dashboard

### If You See Errors

Check the error messages in either:
- Browser console (for client-side errors)
- GAS execution log (for server-side errors)

Common errors:
- **Authorization error**: Need to re-authorize the script
- **Quota exceeded**: Too many Gmail API calls
- **Label not found**: Run `setup()` function

## Expected Console Output (When Working)

### Browser Console (when dashboard loads):
```
=== GAS-PA: Fetching Dashboard Metrics ===
User email: marco@example.com
[GASBackend] Getting total emails...
[GASBackend] PA-Processed label found, searching threads...
[GASBackend] Total emails counted: 0
[GASBackend] Getting processed today with query: label:PA-Processed after:2025/11/18
[GASBackend] Processed today counted: 0
[GASBackend] Getting pending actions...
[GASBackend] PA-ActionRequired label found, searching threads...
[GASBackend] Pending actions counted: 0
=== Metrics Retrieved ===
Duration: 2456 ms
Metrics: {
  totalEmails: 0,
  processedToday: 0,
  pendingActions: 0,
  avgProcessingTime: 3.5,
  trendingUp: true,
  lastUpdated: "2025-11-18T19:38:51.234Z"
}
Activity data points: 7
========================
```

## Next Steps

1. **Check browser console** (F12) when loading dashboard
2. **If zeros are confirmed correct**: Apply PA labels to emails in Gmail
3. **If errors appear**: Share the error messages for help
4. **If labels not found**: Run `setup()` function in GAS editor

## Quick Commands

```bash
# Rebuild and deploy changes
npm run build && npx clasp push

# Open GAS editor
npx clasp open

# Check deployment URL
npx clasp open --webapp
```

## Test Email Setup

To get non-zero metrics, you need emails with PA labels:

1. **Create labels** (if not done): Run `setup()` in GAS editor
2. **Apply labels to emails**:
   - Select 10-20 emails in Gmail
   - Apply `PA-Processed` label
   - Mark 2-3 emails with `PA-ActionRequired` and keep them unread
3. **Refresh dashboard**
4. **Check metrics update**

## Files Modified

- `src/webapp/client-api.ts`: Added detailed console logging
- `src/webapp/handlers/metrics-handler.ts`: Added backend query logging
- `src/gas-backend.js`: Added `testMetrics()` function (already existed)

## Support

If you see unexpected errors or behavior, check:
1. Browser console (F12)
2. GAS execution log (in script editor)
3. Gmail labels exist and have emails
