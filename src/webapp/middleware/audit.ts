/**
 * Audit Logging Middleware
 * Comprehensive request/response logging for compliance and security
 */

import { ApiRequest, ApiResponse, ApiMiddleware } from '../types/api-types';
import { SessionData } from './auth';
import Logger from '../../core/logger';

/**
 * Audit Log Entry
 */
export interface AuditLogEntry {
  timestamp: string;
  requestId: string;
  user: string;
  method: string;
  path: string;
  queryParams?: Record<string, string>;
  statusCode?: number;
  duration?: number;
  success: boolean;
  error?: string;
  ipAddress?: string;
  userAgent?: string;
  permissions?: string[];
}

/**
 * Audit Service
 * Manages audit logs for compliance and security monitoring
 */
export class AuditService {
  private static readonly LOG_PREFIX = 'AUDIT';
  private static logCache: GoogleAppsScript.Cache.Cache;

  /**
   * Initialize cache for audit logs
   */
  private static getCache(): GoogleAppsScript.Cache.Cache {
    if (!this.logCache) {
      this.logCache = CacheService.getScriptCache()!;
    }
    return this.logCache;
  }

  /**
   * Log API request/response
   */
  static log(entry: AuditLogEntry): void {
    const logEntry = {
      ...entry,
      timestamp: entry.timestamp || new Date().toISOString()
    };

    // Log to console
    Logger.info(this.LOG_PREFIX, 'API Request', logEntry);

    // Store in cache for recent access (optional)
    const cache = this.getCache();
    const cacheKey = `audit:${entry.requestId}`;

    try {
      cache.put(cacheKey, JSON.stringify(logEntry), 600); // 10 minutes
    } catch (error) {
      // Cache failure shouldn't break the request
      Logger.warn(this.LOG_PREFIX, 'Failed to cache audit log', error);
    }

    // Optionally: Write to Sheets for long-term storage
    this.writeToSheet(logEntry);
  }

  /**
   * Write audit log to Google Sheets
   * For long-term compliance records
   */
  private static writeToSheet(entry: AuditLogEntry): void {
    try {
      const sheetName = 'Audit_Logs';
      const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

      if (!spreadsheet) {
        Logger.debug(this.LOG_PREFIX, 'No active spreadsheet for audit logs');
        return;
      }

      let sheet = spreadsheet.getSheetByName(sheetName);

      // Create sheet if it doesn't exist
      if (!sheet) {
        sheet = spreadsheet.insertSheet(sheetName);

        // Add headers
        sheet.appendRow([
          'Timestamp',
          'Request ID',
          'User',
          'Method',
          'Path',
          'Status Code',
          'Duration (ms)',
          'Success',
          'Error',
          'Permissions'
        ]);

        // Format headers
        sheet.getRange(1, 1, 1, 10).setFontWeight('bold');
      }

      // Append log entry
      sheet.appendRow([
        entry.timestamp,
        entry.requestId,
        entry.user,
        entry.method,
        entry.path,
        entry.statusCode || '',
        entry.duration || '',
        entry.success ? 'Yes' : 'No',
        entry.error || '',
        entry.permissions?.join(', ') || ''
      ]);

      // Keep only last 10,000 rows (+ header)
      const maxRows = 10001;
      if (sheet.getLastRow() > maxRows) {
        sheet.deleteRows(2, sheet.getLastRow() - maxRows);
      }
    } catch (error) {
      // Sheet logging failure shouldn't break the request
      Logger.warn(this.LOG_PREFIX, 'Failed to write audit log to sheet', error);
    }
  }

  /**
   * Get recent audit logs
   */
  static getRecentLogs(limit: number = 100): AuditLogEntry[] {
    try {
      const sheetName = 'Audit_Logs';
      const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

      if (!spreadsheet) return [];

      const sheet = spreadsheet.getSheetByName(sheetName);
      if (!sheet) return [];

      const lastRow = sheet.getLastRow();
      if (lastRow <= 1) return []; // Only header

      const startRow = Math.max(2, lastRow - limit + 1);
      const numRows = lastRow - startRow + 1;

      const data = sheet.getRange(startRow, 1, numRows, 10).getValues();

      return data.map(row => ({
        timestamp: row[0],
        requestId: row[1],
        user: row[2],
        method: row[3],
        path: row[4],
        statusCode: row[5] || undefined,
        duration: row[6] || undefined,
        success: row[7] === 'Yes',
        error: row[8] || undefined,
        permissions: row[9] ? row[9].split(', ') : []
      }));
    } catch (error) {
      Logger.error(this.LOG_PREFIX, 'Failed to get recent logs', error);
      return [];
    }
  }

  /**
   * Get audit logs for specific user
   */
  static getLogsByUser(email: string, limit: number = 50): AuditLogEntry[] {
    const allLogs = this.getRecentLogs(1000);
    return allLogs
      .filter(log => log.user === email)
      .slice(0, limit);
  }

  /**
   * Get failed requests
   */
  static getFailedRequests(limit: number = 50): AuditLogEntry[] {
    const allLogs = this.getRecentLogs(1000);
    return allLogs
      .filter(log => !log.success)
      .slice(0, limit);
  }

  /**
   * Clear old audit logs
   */
  static clearOldLogs(daysToKeep: number = 90): number {
    try {
      const sheetName = 'Audit_Logs';
      const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

      if (!spreadsheet) return 0;

      const sheet = spreadsheet.getSheetByName(sheetName);
      if (!sheet) return 0;

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const lastRow = sheet.getLastRow();
      if (lastRow <= 1) return 0;

      const timestamps = sheet.getRange(2, 1, lastRow - 1, 1).getValues();

      let rowsToDelete = 0;
      for (let i = 0; i < timestamps.length; i++) {
        const timestamp = new Date(timestamps[i][0]);
        if (timestamp < cutoffDate) {
          rowsToDelete++;
        } else {
          break;
        }
      }

      if (rowsToDelete > 0) {
        sheet.deleteRows(2, rowsToDelete);
        Logger.info(this.LOG_PREFIX, `Cleared ${rowsToDelete} old audit logs`);
      }

      return rowsToDelete;
    } catch (error) {
      Logger.error(this.LOG_PREFIX, 'Failed to clear old logs', error);
      return 0;
    }
  }
}

/**
 * Audit logging middleware
 * Logs all API requests and responses
 */
export const auditMiddleware: ApiMiddleware = (request: ApiRequest): ApiResponse | undefined => {
  const startTime = Date.now();
  const requestId = request.headers['X-Request-ID'] || Utilities.getUuid();

  // Store start time and request ID for response logging
  (request as any).auditStartTime = startTime;
  (request as any).auditRequestId = requestId;

  // Log request
  const session = (request as any).session as SessionData | undefined;

  Logger.info('AUDIT', 'Request started', {
    requestId,
    user: request.user || 'anonymous',
    method: request.method,
    path: request.path
  });

  return undefined; // Allow request to proceed
};

/**
 * Audit response logger
 * Call this after request handling to log the response
 */
export function logAuditResponse(
  request: ApiRequest,
  response: ApiResponse,
  error?: Error
): void {
  const startTime = (request as any).auditStartTime || Date.now();
  const requestId = (request as any).auditRequestId || 'unknown';
  const duration = Date.now() - startTime;
  const session = (request as any).session as SessionData | undefined;

  const entry: AuditLogEntry = {
    timestamp: new Date().toISOString(),
    requestId,
    user: request.user || 'anonymous',
    method: request.method,
    path: request.path,
    queryParams: request.parameters,
    statusCode: response.status,
    duration,
    success: !error && response.status >= 200 && response.status < 400,
    error: error?.message,
    permissions: session?.permissions
  };

  AuditService.log(entry);
}

/**
 * Create audit middleware that wraps a handler
 * Automatically logs request and response
 */
export function withAudit(
  handler: (request: ApiRequest) => Promise<any> | any
): (request: ApiRequest) => Promise<ApiResponse> {
  return async (request: ApiRequest): Promise<ApiResponse> => {
    const startTime = Date.now();
    const requestId = Utilities.getUuid();

    (request as any).auditStartTime = startTime;
    (request as any).auditRequestId = requestId;

    let response: ApiResponse;
    let error: Error | undefined;

    try {
      const result = await handler(request);

      response = {
        status: 200,
        body: result,
        headers: {
          'Content-Type': 'application/json'
        }
      };
    } catch (err) {
      error = err as Error;

      response = {
        status: err instanceof Error && 'status' in err ? (err as any).status : 500,
        body: {
          error: error.message
        },
        headers: {
          'Content-Type': 'application/json'
        }
      };
    }

    // Log audit entry
    logAuditResponse(request, response, error);

    return response;
  };
}
