/**
 * Database Service for Google Sheets operations
 */

import ConfigManager from './config-manager';
import LoggerService from './logger-service';
import ErrorHandler, { GaspaError, ErrorType } from './error-handler';
import CacheManager from './cache-manager';

export interface DatabaseTable {
  name: string;
  columns: string[];
  primaryKey?: string;
  indexes?: string[];
}

export interface QueryOptions {
  where?: Record<string, any>;
  orderBy?: { column: string; direction: 'ASC' | 'DESC' };
  limit?: number;
  offset?: number;
  cache?: boolean;
  cacheTtl?: number;
}

export interface BatchOperation {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  data: any[];
}

export class DatabaseService {
  private static instance: DatabaseService;
  private spreadsheetId: string | null;
  private spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet | null = null;
  private tables: Map<string, DatabaseTable>;
  private readonly BATCH_SIZE = 500;

  private constructor() {
    this.spreadsheetId = ConfigManager.get<string>('MAIN_SPREADSHEET_ID');
    this.tables = new Map();
    this.initializeTables();
  }

  static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  private initializeTables(): void {
    // Define database schema
    this.defineTable({
      name: 'Emails',
      columns: [
        'id', 'threadId', 'subject', 'from', 'to', 'date',
        'body', 'classification', 'priority', 'labels',
        'status', 'processedAt', 'confidence', 'needsReply',
        'waitingOnOthers', 'snoozedUntil'
      ],
      primaryKey: 'id',
      indexes: ['threadId', 'from', 'date', 'status']
    });

    this.defineTable({
      name: 'FollowUps',
      columns: [
        'id', 'emailId', 'threadId', 'subject', 'from',
        'priority', 'dueDate', 'status', 'slaDeadline',
        'notes', 'createdAt', 'completedAt'
      ],
      primaryKey: 'id',
      indexes: ['emailId', 'status', 'dueDate']
    });

    this.defineTable({
      name: 'Rules',
      columns: [
        'id', 'name', 'precedence', 'conditions', 'actions',
        'enabled', 'confidence', 'lastUsed', 'createdAt',
        'updatedAt', 'hitCount'
      ],
      primaryKey: 'id',
      indexes: ['precedence', 'enabled']
    });

    this.defineTable({
      name: 'VIPs',
      columns: [
        'email', 'name', 'tier', 'autoDraft', 'customRules',
        'slaHours', 'addedAt', 'lastContact', 'totalEmails'
      ],
      primaryKey: 'email',
      indexes: ['tier']
    });

    this.defineTable({
      name: 'Learning',
      columns: [
        'id', 'emailId', 'originalClassification', 'userFeedback',
        'correctClassification', 'timestamp', 'applied'
      ],
      primaryKey: 'id',
      indexes: ['emailId', 'timestamp']
    });

    this.defineTable({
      name: 'Drafts',
      columns: [
        'id', 'emailId', 'threadId', 'subject', 'body',
        'htmlBody', 'confidence', 'createdAt', 'sent',
        'sentAt', 'edits'
      ],
      primaryKey: 'id',
      indexes: ['emailId', 'sent']
    });

    this.defineTable({
      name: 'Analytics',
      columns: [
        'date', 'emailsProcessed', 'emailsClassified',
        'draftsGenerated', 'draftsSent', 'avgResponseTime',
        'accuracyRate', 'automationRate'
      ],
      primaryKey: 'date'
    });

    this.defineTable({
      name: 'ErrorLog',
      columns: [
        'timestamp', 'errorId', 'type', 'message',
        'recoverable', 'context', 'stack'
      ]
    });

    this.defineTable({
      name: 'Logs',
      columns: [
        'timestamp', 'level', 'module', 'message',
        'data', 'userId', 'correlationId', 'duration'
      ]
    });

    this.defineTable({
      name: 'Metrics',
      columns: ['timestamp', 'metric', 'value', 'tags']
    });

    this.defineTable({
      name: 'Cache',
      columns: ['key', 'timestamp', 'ttl', 'value']
    });

    // Follow-up Queue tables
    this.defineTable({
      name: 'FollowUpQueue',
      columns: [
        'id', 'emailId', 'threadId', 'subject', 'from', 'to',
        'receivedDate', 'priority', 'category', 'labels',
        'reason', 'status', 'addedToQueueAt', 'snoozedUntil',
        'lastActionDate', 'slaDeadline', 'slaStatus', 'timeRemaining',
        'waitingOnEmail', 'waitingReason', 'originalSentDate',
        'suggestedSnoozeTime', 'suggestedActions', 'aiReasoning',
        'createdAt', 'updatedAt', 'actionCount', 'snoozeCount'
      ],
      primaryKey: 'id',
      indexes: ['emailId', 'status', 'priority', 'slaDeadline', 'snoozedUntil']
    });

    this.defineTable({
      name: 'QueueHistory',
      columns: [
        'id', 'queueItemId', 'action', 'oldStatus', 'newStatus',
        'oldPriority', 'newPriority', 'userId', 'timestamp', 'metadata'
      ],
      primaryKey: 'id',
      indexes: ['queueItemId', 'timestamp']
    });

    this.defineTable({
      name: 'QueueStats',
      columns: [
        'id', 'date', 'totalActive', 'totalSnoozed', 'totalWaiting',
        'criticalCount', 'highCount', 'mediumCount', 'lowCount',
        'onTimeCount', 'atRiskCount', 'overdueCount',
        'completedToday', 'averageResponseTime', 'averageTimeInQueue',
        'createdAt', 'updatedAt'
      ],
      primaryKey: 'id',
      indexes: ['date']
    });
  }

  private defineTable(table: DatabaseTable): void {
    this.tables.set(table.name, table);
  }

  async initialize(): Promise<boolean> {
    const timer = LoggerService.startTimer('DatabaseInitialization');

    try {
      // Create or get spreadsheet
      if (!this.spreadsheetId) {
        this.spreadsheet = await this.createSpreadsheet();
        this.spreadsheetId = this.spreadsheet.getId();

        // Save spreadsheet ID
        ConfigManager.set('MAIN_SPREADSHEET_ID', this.spreadsheetId);
        LoggerService.info('Database', `Created new spreadsheet: ${this.spreadsheetId}`);
      } else {
        try {
          this.spreadsheet = SpreadsheetApp.openById(this.spreadsheetId);
          LoggerService.info('Database', `Opened existing spreadsheet: ${this.spreadsheetId}`);
        } catch (error) {
          // Spreadsheet ID invalid, create new one
          LoggerService.warn('Database', `Invalid spreadsheet ID, creating new one`);
          this.spreadsheet = await this.createSpreadsheet();
          this.spreadsheetId = this.spreadsheet.getId();
          ConfigManager.set('MAIN_SPREADSHEET_ID', this.spreadsheetId);
          LoggerService.info('Database', `Created new spreadsheet: ${this.spreadsheetId}`);
        }
      }

      // Create sheets for each table
      for (const [name, table] of this.tables) {
        await this.createTableIfNotExists(table);
      }

      timer();
      return true;
    } catch (error) {
      timer();
      throw new GaspaError(
        'Failed to initialize database',
        ErrorType.DATABASE,
        false,
        { spreadsheetId: this.spreadsheetId },
        error as Error
      );
    }
  }

  private async createSpreadsheet(): Promise<GoogleAppsScript.Spreadsheet.Spreadsheet> {
    return await ErrorHandler.handle(
      () => {
        const name = `GAS-PA Database ${new Date().toISOString()}`;
        return SpreadsheetApp.create(name);
      },
      { operation: 'createSpreadsheet' }
    ) as GoogleAppsScript.Spreadsheet.Spreadsheet;
  }

  private async createTableIfNotExists(table: DatabaseTable): Promise<void> {
    if (!this.spreadsheet) {
      throw new GaspaError('Spreadsheet not initialized', ErrorType.DATABASE, false);
    }

    let sheet = this.spreadsheet.getSheetByName(table.name);

    if (!sheet) {
      sheet = this.spreadsheet.insertSheet(table.name);

      // Add headers
      const headers = table.columns;
      sheet.appendRow(headers);

      // Format headers
      const headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#4285f4');
      headerRange.setFontColor('#ffffff');

      // Freeze header row
      sheet.setFrozenRows(1);

      LoggerService.info('Database', `Created table: ${table.name}`);
    }
  }

  async insert(tableName: string, data: Record<string, any>): Promise<string> {
    const timer = LoggerService.startTimer(`Database.insert.${tableName}`);

    try {
      const table = this.tables.get(tableName);
      if (!table) {
        throw new GaspaError(`Table ${tableName} not found`, ErrorType.VALIDATION, false);
      }

      const sheet = this.getSheet(tableName);

      // Generate ID if needed
      if (table.primaryKey && !data[table.primaryKey]) {
        data[table.primaryKey] = this.generateId();
      }

      // Add timestamp fields
      if (table.columns.includes('createdAt') && !data.createdAt) {
        data.createdAt = new Date().toISOString();
      }

      // Convert data to row
      const row = table.columns.map(col => {
        const value = data[col];
        return this.serializeValue(value);
      });

      // Append row
      sheet.appendRow(row);

      // Invalidate cache
      await CacheManager.invalidate(new RegExp(`^${tableName}`));

      timer();
      LoggerService.debug('Database', `Inserted record into ${tableName}`, data);

      return data[table.primaryKey || 'id'];
    } catch (error) {
      timer();
      throw new GaspaError(
        `Failed to insert into ${tableName}`,
        ErrorType.DATABASE,
        true,
        { tableName, data },
        error as Error
      );
    }
  }

  async bulkInsert(tableName: string, records: Record<string, any>[]): Promise<string[]> {
    const timer = LoggerService.startTimer(`Database.bulkInsert.${tableName}`);

    try {
      const table = this.tables.get(tableName);
      if (!table) {
        throw new GaspaError(`Table ${tableName} not found`, ErrorType.VALIDATION, false);
      }

      const sheet = this.getSheet(tableName);
      const ids: string[] = [];

      // Process in batches
      for (let i = 0; i < records.length; i += this.BATCH_SIZE) {
        const batch = records.slice(i, i + this.BATCH_SIZE);

        const rows = batch.map(record => {
          // Generate ID if needed
          if (table.primaryKey && !record[table.primaryKey]) {
            record[table.primaryKey] = this.generateId();
          }
          ids.push(record[table.primaryKey || 'id']);

          // Add timestamp
          if (table.columns.includes('createdAt') && !record.createdAt) {
            record.createdAt = new Date().toISOString();
          }

          return table.columns.map(col => this.serializeValue(record[col]));
        });

        // Batch append
        if (rows.length > 0) {
          const lastRow = sheet.getLastRow();
          const range = sheet.getRange(lastRow + 1, 1, rows.length, table.columns.length);
          range.setValues(rows);
        }
      }

      // Invalidate cache
      await CacheManager.invalidate(new RegExp(`^${tableName}`));

      timer();
      LoggerService.info('Database', `Bulk inserted ${records.length} records into ${tableName}`);

      return ids;
    } catch (error) {
      timer();
      throw new GaspaError(
        `Failed to bulk insert into ${tableName}`,
        ErrorType.DATABASE,
        true,
        { tableName, count: records.length },
        error as Error
      );
    }
  }

  async update(
    tableName: string,
    id: string,
    data: Record<string, any>
  ): Promise<boolean> {
    const timer = LoggerService.startTimer(`Database.update.${tableName}`);

    try {
      const table = this.tables.get(tableName);
      if (!table) {
        throw new GaspaError(`Table ${tableName} not found`, ErrorType.VALIDATION, false);
      }

      const sheet = this.getSheet(tableName);

      // Add updated timestamp
      if (table.columns.includes('updatedAt')) {
        data.updatedAt = new Date().toISOString();
      }

      // Find row by primary key
      const primaryKeyCol = table.columns.indexOf(table.primaryKey || 'id');
      if (primaryKeyCol === -1) {
        throw new GaspaError('Table has no primary key', ErrorType.DATABASE, false);
      }

      const dataRange = sheet.getDataRange();
      const values = dataRange.getValues();

      let rowIndex = -1;
      for (let i = 1; i < values.length; i++) {
        if (String(values[i][primaryKeyCol]) === String(id)) {
          rowIndex = i + 1; // Sheet rows are 1-indexed
          break;
        }
      }

      if (rowIndex === -1) {
        return false;
      }

      // Update only specified columns
      Object.entries(data).forEach(([key, value]) => {
        const colIndex = table.columns.indexOf(key);
        if (colIndex !== -1) {
          sheet.getRange(rowIndex, colIndex + 1).setValue(this.serializeValue(value));
        }
      });

      // Invalidate cache
      await CacheManager.invalidate(new RegExp(`^${tableName}`));

      timer();
      LoggerService.debug('Database', `Updated record in ${tableName}`, { id, data });

      return true;
    } catch (error) {
      timer();
      throw new GaspaError(
        `Failed to update ${tableName}`,
        ErrorType.DATABASE,
        true,
        { tableName, id, data },
        error as Error
      );
    }
  }

  async delete(tableName: string, id: string): Promise<boolean> {
    const timer = LoggerService.startTimer(`Database.delete.${tableName}`);

    try {
      const table = this.tables.get(tableName);
      if (!table) {
        throw new GaspaError(`Table ${tableName} not found`, ErrorType.VALIDATION, false);
      }

      const sheet = this.getSheet(tableName);

      // Find row by primary key
      const primaryKeyCol = table.columns.indexOf(table.primaryKey || 'id');
      const dataRange = sheet.getDataRange();
      const values = dataRange.getValues();

      let rowIndex = -1;
      for (let i = 1; i < values.length; i++) {
        if (String(values[i][primaryKeyCol]) === String(id)) {
          rowIndex = i + 1;
          break;
        }
      }

      if (rowIndex === -1) {
        return false;
      }

      // Delete row
      sheet.deleteRow(rowIndex);

      // Invalidate cache
      await CacheManager.invalidate(new RegExp(`^${tableName}`));

      timer();
      LoggerService.debug('Database', `Deleted record from ${tableName}`, { id });

      return true;
    } catch (error) {
      timer();
      throw new GaspaError(
        `Failed to delete from ${tableName}`,
        ErrorType.DATABASE,
        true,
        { tableName, id },
        error as Error
      );
    }
  }

  async find(tableName: string, options: QueryOptions = {}): Promise<any[]> {
    const timer = LoggerService.startTimer(`Database.find.${tableName}`);

    // Check cache if enabled
    if (options.cache !== false) {
      const cacheKey = `${tableName}_find_${JSON.stringify(options)}`;
      const cached = await CacheManager.get(cacheKey);
      if (cached) {
        timer();
        return cached;
      }
    }

    try {
      const table = this.tables.get(tableName);
      if (!table) {
        throw new GaspaError(`Table ${tableName} not found`, ErrorType.VALIDATION, false);
      }

      const sheet = this.getSheet(tableName);
      const dataRange = sheet.getDataRange();
      const values = dataRange.getValues();

      if (values.length <= 1) {
        return [];
      }

      // Skip header row
      const headers = values[0];
      let results = [];

      for (let i = 1; i < values.length; i++) {
        const row = values[i];
        const record: any = {};

        headers.forEach((header, index) => {
          record[header] = this.deserializeValue(row[index]);
        });

        // Apply WHERE conditions
        if (options.where) {
          let match = true;
          for (const [key, value] of Object.entries(options.where)) {
            if (record[key] !== value) {
              match = false;
              break;
            }
          }
          if (!match) continue;
        }

        results.push(record);
      }

      // Apply ORDER BY
      if (options.orderBy) {
        const { column, direction } = options.orderBy;
        results.sort((a, b) => {
          const aVal = a[column];
          const bVal = b[column];
          const comparison = aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
          return direction === 'DESC' ? -comparison : comparison;
        });
      }

      // Apply OFFSET and LIMIT
      if (options.offset) {
        results = results.slice(options.offset);
      }

      if (options.limit) {
        results = results.slice(0, options.limit);
      }

      // Cache results
      if (options.cache !== false) {
        const cacheKey = `${tableName}_find_${JSON.stringify(options)}`;
        const ttl = options.cacheTtl || 300;
        await CacheManager.set(cacheKey, results, ttl);
      }

      timer();
      LoggerService.debug('Database', `Found ${results.length} records in ${tableName}`);

      return results;
    } catch (error) {
      timer();
      throw new GaspaError(
        `Failed to query ${tableName}`,
        ErrorType.DATABASE,
        true,
        { tableName, options },
        error as Error
      );
    }
  }

  async findOne(tableName: string, options: QueryOptions = {}): Promise<any | null> {
    const results = await this.find(tableName, { ...options, limit: 1 });
    return results.length > 0 ? results[0] : null;
  }

  async findById(tableName: string, id: string): Promise<any | null> {
    const table = this.tables.get(tableName);
    if (!table) {
      throw new GaspaError(`Table ${tableName} not found`, ErrorType.VALIDATION, false);
    }

    const primaryKey = table.primaryKey || 'id';
    return await this.findOne(tableName, {
      where: { [primaryKey]: id }
    });
  }

  async count(tableName: string, where?: Record<string, any>): Promise<number> {
    const results = await this.find(tableName, { where });
    return results.length;
  }

  async executeBatch(operations: BatchOperation[]): Promise<void> {
    const timer = LoggerService.startTimer('Database.executeBatch');

    try {
      for (const operation of operations) {
        switch (operation.type) {
          case 'INSERT':
            await this.bulkInsert(operation.table, operation.data);
            break;
          case 'UPDATE':
            for (const record of operation.data) {
              await this.update(operation.table, record.id, record);
            }
            break;
          case 'DELETE':
            for (const record of operation.data) {
              await this.delete(operation.table, record.id);
            }
            break;
        }
      }

      timer();
      LoggerService.info('Database', `Executed batch of ${operations.length} operations`);
    } catch (error) {
      timer();
      throw new GaspaError(
        'Failed to execute batch operations',
        ErrorType.DATABASE,
        true,
        { operationCount: operations.length },
        error as Error
      );
    }
  }

  private getSheet(tableName: string): GoogleAppsScript.Spreadsheet.Sheet {
    if (!this.spreadsheet) {
      throw new GaspaError('Spreadsheet not initialized', ErrorType.DATABASE, false);
    }

    const sheet = this.spreadsheet.getSheetByName(tableName);
    if (!sheet) {
      throw new GaspaError(`Sheet ${tableName} not found`, ErrorType.DATABASE, false);
    }

    return sheet;
  }

  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private serializeValue(value: any): any {
    if (value === null || value === undefined) {
      return '';
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    if (typeof value === 'object') {
      return JSON.stringify(value);
    }

    return value;
  }

  private deserializeValue(value: any): any {
    if (value === '') {
      return null;
    }

    // Try to parse JSON
    if (typeof value === 'string' && (value.startsWith('{') || value.startsWith('['))) {
      try {
        return JSON.parse(value);
      } catch {
        // Not JSON, return as-is
      }
    }

    // Try to parse date
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
      return new Date(value);
    }

    return value;
  }

  getSpreadsheetUrl(): string | null {
    if (!this.spreadsheet) {
      return null;
    }
    return this.spreadsheet.getUrl();
  }

  async exportTable(tableName: string): Promise<any[]> {
    return await this.find(tableName);
  }

  async importTable(tableName: string, data: any[]): Promise<void> {
    // Clear existing data (except headers)
    const sheet = this.getSheet(tableName);
    const lastRow = sheet.getLastRow();

    if (lastRow > 1) {
      sheet.deleteRows(2, lastRow - 1);
    }

    // Import new data
    await this.bulkInsert(tableName, data);
  }
}

// Export singleton instance
export default DatabaseService.getInstance();