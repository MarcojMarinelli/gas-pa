/**
 * Enhanced Logger Service with structured logging
 */

import ConfigManager from './config-manager';
import { MetricData } from './types';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  CRITICAL = 4
}

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  module: string;
  message: string;
  data?: any;
  userId?: string;
  correlationId?: string;
  duration?: number;
  error?: Error;
}

export interface LogFilter {
  level?: LogLevel;
  module?: string;
  startTime?: Date;
  endTime?: Date;
  userId?: string;
  correlationId?: string;
}

export class LoggerService {
  private static instance: LoggerService;
  private logBuffer: LogEntry[] = [];
  private readonly MAX_BUFFER_SIZE = 100;
  private currentLevel: LogLevel;
  private spreadsheetId?: string;
  private metricsBuffer: MetricData[] = [];
  private correlationId?: string;

  private constructor() {
    this.currentLevel = this.getLogLevelFromConfig();
    this.spreadsheetId = ConfigManager.get<string>('MAIN_SPREADSHEET_ID') || undefined;

    // Auto-flush logs periodically
    this.scheduleFlush();
  }

  static getInstance(): LoggerService {
    if (!LoggerService.instance) {
      LoggerService.instance = new LoggerService();
    }
    return LoggerService.instance;
  }

  private getLogLevelFromConfig(): LogLevel {
    const levelString = ConfigManager.getWithDefault<string>('LOG_LEVEL', 'INFO');
    return LogLevel[levelString as keyof typeof LogLevel] || LogLevel.INFO;
  }

  setCorrelationId(id: string): void {
    this.correlationId = id;
  }

  clearCorrelationId(): void {
    this.correlationId = undefined;
  }

  debug(module: string, message: string, data?: any): void {
    this.log(LogLevel.DEBUG, module, message, data);
  }

  info(module: string, message: string, data?: any): void {
    this.log(LogLevel.INFO, module, message, data);
  }

  warn(module: string, message: string, data?: any): void {
    this.log(LogLevel.WARN, module, message, data);
  }

  error(module: string, message: string, error?: Error | any, data?: any): void {
    const errorData = {
      ...data,
      errorMessage: error?.message,
      errorStack: error?.stack,
      errorName: error?.name
    };
    this.log(LogLevel.ERROR, module, message, errorData, error);
  }

  critical(module: string, message: string, error?: Error | any, data?: any): void {
    const errorData = {
      ...data,
      errorMessage: error?.message,
      errorStack: error?.stack,
      errorName: error?.name
    };
    this.log(LogLevel.CRITICAL, module, message, errorData, error);

    // Critical errors trigger immediate flush and notification
    this.flush();
    this.sendCriticalAlert(module, message, error);
  }

  private log(
    level: LogLevel,
    module: string,
    message: string,
    data?: any,
    error?: Error
  ): void {
    // Check if should log based on level
    if (level < this.currentLevel) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      module,
      message,
      data,
      userId: Session.getActiveUser()?.getEmail(),
      correlationId: this.correlationId,
      error
    };

    // Add to buffer
    this.logBuffer.push(entry);

    // Console output
    this.consoleOutput(entry);

    // Flush if buffer is full
    if (this.logBuffer.length >= this.MAX_BUFFER_SIZE) {
      this.flush();
    }
  }

  private consoleOutput(entry: LogEntry): void {
    const levelName = LogLevel[entry.level];
    const timestamp = entry.timestamp.toISOString();
    const correlation = entry.correlationId ? ` [${entry.correlationId}]` : '';
    const prefix = `[${timestamp}] [${levelName}] [${entry.module}]${correlation}`;

    const message = `${prefix} ${entry.message}`;

    switch (entry.level) {
      case LogLevel.DEBUG:
        console.log(message, entry.data || '');
        break;
      case LogLevel.INFO:
        console.info(message, entry.data || '');
        break;
      case LogLevel.WARN:
        console.warn(message, entry.data || '');
        break;
      case LogLevel.ERROR:
      case LogLevel.CRITICAL:
        console.error(message, entry.data || '', entry.error || '');
        break;
    }
  }

  flush(): void {
    if (this.logBuffer.length === 0) {
      return;
    }

    try {
      this.writeToSpreadsheet();
      this.logBuffer = [];
    } catch (error) {
      console.error('Failed to flush logs:', error);
      // Keep buffer for next attempt
    }

    // Also flush metrics
    if (this.metricsBuffer.length > 0) {
      this.flushMetrics();
    }
  }

  private writeToSpreadsheet(): void {
    if (!this.spreadsheetId) {
      return;
    }

    try {
      const spreadsheet = SpreadsheetApp.openById(this.spreadsheetId);
      let sheet = spreadsheet.getSheetByName('Logs');

      if (!sheet) {
        sheet = spreadsheet.insertSheet('Logs');
        // Add headers
        sheet.appendRow([
          'Timestamp',
          'Level',
          'Module',
          'Message',
          'Data',
          'User',
          'Correlation ID',
          'Duration (ms)'
        ]);

        // Format header row
        const headerRange = sheet.getRange(1, 1, 1, 8);
        headerRange.setFontWeight('bold');
        headerRange.setBackground('#f0f0f0');
      }

      // Convert log entries to rows
      const rows = this.logBuffer.map(entry => [
        entry.timestamp.toISOString(),
        LogLevel[entry.level],
        entry.module,
        entry.message,
        JSON.stringify(entry.data || {}),
        entry.userId || '',
        entry.correlationId || '',
        entry.duration || ''
      ]);

      // Append rows
      if (rows.length > 0) {
        const lastRow = sheet.getLastRow();
        sheet.getRange(lastRow + 1, 1, rows.length, 8).setValues(rows);
      }

      // Auto-cleanup old logs (keep last 10,000 entries)
      const totalRows = sheet.getLastRow();
      if (totalRows > 10000) {
        const rowsToDelete = totalRows - 10000;
        sheet.deleteRows(2, rowsToDelete); // Keep header
      }
    } catch (error) {
      console.error('Failed to write logs to spreadsheet:', error);
    }
  }

  private scheduleFlush(): void {
    // GAS doesn't have setInterval, so we use triggers
    // This would be set up during initialization
    try {
      // Check if trigger already exists
      const triggers = ScriptApp.getProjectTriggers();
      const existingTrigger = triggers.find(
        t => t.getHandlerFunction() === 'flushLogs'
      );

      if (!existingTrigger) {
        ScriptApp.newTrigger('flushLogs')
          .timeBased()
          .everyMinutes(5)
          .create();
      }
    } catch (error) {
      console.error('Failed to schedule log flush:', error);
    }
  }

  private sendCriticalAlert(module: string, message: string, error?: Error): void {
    try {
      const recipient = Session.getActiveUser().getEmail();
      const subject = '[GAS-PA CRITICAL] System Alert';

      const body = `
A critical error occurred in your GAS-PA system:

Module: ${module}
Message: ${message}
Timestamp: ${new Date().toISOString()}

${error ? `
Error Details:
Name: ${error.name}
Message: ${error.message}
Stack: ${error.stack}
` : ''}

Please check the system immediately.
      `;

      GmailApp.sendEmail(recipient, subject, body);
    } catch (emailError) {
      console.error('Failed to send critical alert:', emailError);
    }
  }

  // Performance tracking
  startTimer(operation: string): () => void {
    const startTime = Date.now();

    return () => {
      const duration = Date.now() - startTime;
      this.trackPerformance(operation, duration);
    };
  }

  trackPerformance(operation: string, durationMs: number): void {
    const entry: LogEntry = {
      timestamp: new Date(),
      level: LogLevel.DEBUG,
      module: 'Performance',
      message: `Operation completed: ${operation}`,
      data: { operation },
      duration: durationMs,
      correlationId: this.correlationId
    };

    this.logBuffer.push(entry);

    // Also track as metric
    this.trackMetric(`performance.${operation}`, durationMs, {
      operation
    });

    // Warn if operation is slow
    const slowThreshold = 5000; // 5 seconds
    if (durationMs > slowThreshold) {
      this.warn('Performance', `Slow operation detected: ${operation} took ${durationMs}ms`);
    }
  }

  // Metrics tracking
  trackMetric(name: string, value: number, tags?: Record<string, string>): void {
    const metric: MetricData = {
      timestamp: new Date(),
      metric: name,
      value,
      tags
    };

    this.metricsBuffer.push(metric);

    // Flush if buffer is large
    if (this.metricsBuffer.length >= 50) {
      this.flushMetrics();
    }
  }

  private flushMetrics(): void {
    if (!this.spreadsheetId || this.metricsBuffer.length === 0) {
      return;
    }

    try {
      const spreadsheet = SpreadsheetApp.openById(this.spreadsheetId);
      let sheet = spreadsheet.getSheetByName('Metrics');

      if (!sheet) {
        sheet = spreadsheet.insertSheet('Metrics');
        // Add headers
        sheet.appendRow(['Timestamp', 'Metric', 'Value', 'Tags']);

        // Format header row
        const headerRange = sheet.getRange(1, 1, 1, 4);
        headerRange.setFontWeight('bold');
        headerRange.setBackground('#f0f0f0');
      }

      // Convert metrics to rows
      const rows = this.metricsBuffer.map(metric => [
        metric.timestamp.toISOString(),
        metric.metric,
        metric.value,
        JSON.stringify(metric.tags || {})
      ]);

      // Append rows
      if (rows.length > 0) {
        const lastRow = sheet.getLastRow();
        sheet.getRange(lastRow + 1, 1, rows.length, 4).setValues(rows);
      }

      this.metricsBuffer = [];
    } catch (error) {
      console.error('Failed to flush metrics:', error);
    }
  }

  // Log querying
  async getLogs(filter?: LogFilter, limit: number = 100): Promise<LogEntry[]> {
    if (!this.spreadsheetId) {
      return this.logBuffer.slice(-limit);
    }

    try {
      const spreadsheet = SpreadsheetApp.openById(this.spreadsheetId);
      const sheet = spreadsheet.getSheetByName('Logs');

      if (!sheet) {
        return [];
      }

      const data = sheet.getDataRange().getValues();
      const logs: LogEntry[] = [];

      // Skip header row
      for (let i = 1; i < data.length && logs.length < limit; i++) {
        const row = data[i];
        const entry: LogEntry = {
          timestamp: new Date(row[0]),
          level: LogLevel[row[1] as keyof typeof LogLevel],
          module: row[2],
          message: row[3],
          data: row[4] ? JSON.parse(row[4]) : undefined,
          userId: row[5] || undefined,
          correlationId: row[6] || undefined,
          duration: row[7] || undefined
        };

        // Apply filters
        if (filter) {
          if (filter.level !== undefined && entry.level < filter.level) continue;
          if (filter.module && !entry.module.includes(filter.module)) continue;
          if (filter.startTime && entry.timestamp < filter.startTime) continue;
          if (filter.endTime && entry.timestamp > filter.endTime) continue;
          if (filter.userId && entry.userId !== filter.userId) continue;
          if (filter.correlationId && entry.correlationId !== filter.correlationId) continue;
        }

        logs.push(entry);
      }

      return logs.reverse(); // Return newest first
    } catch (error) {
      console.error('Failed to query logs:', error);
      return [];
    }
  }

  // Statistics
  async getLogStatistics(): Promise<{
    totalLogs: number;
    byLevel: Record<string, number>;
    byModule: Record<string, number>;
    recentErrors: LogEntry[];
  }> {
    const logs = await this.getLogs(undefined, 1000);

    const stats = {
      totalLogs: logs.length,
      byLevel: {} as Record<string, number>,
      byModule: {} as Record<string, number>,
      recentErrors: [] as LogEntry[]
    };

    // Initialize level counts
    for (const level in LogLevel) {
      if (isNaN(Number(level))) {
        stats.byLevel[level] = 0;
      }
    }

    logs.forEach(log => {
      // Count by level
      const levelName = LogLevel[log.level];
      stats.byLevel[levelName] = (stats.byLevel[levelName] || 0) + 1;

      // Count by module
      stats.byModule[log.module] = (stats.byModule[log.module] || 0) + 1;

      // Collect recent errors
      if (log.level >= LogLevel.ERROR && stats.recentErrors.length < 10) {
        stats.recentErrors.push(log);
      }
    });

    return stats;
  }
}

// Global flush function for trigger
function flushLogs(): void {
  LoggerService.getInstance().flush();
}

// Export singleton instance
export default LoggerService.getInstance();