import Logger from '../core/logger';
import { EmailData, ProcessingResult } from '../types';

export class SheetsService {
  private spreadsheetId: string;
  private spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet;
  
  constructor(spreadsheetId?: string) {
    console.log(`SheetsService constructor: spreadsheetId parameter = '${spreadsheetId}'`);
    this.spreadsheetId = spreadsheetId || this.getOrCreateSpreadsheet();
    console.log(`SheetsService constructor: this.spreadsheetId = '${this.spreadsheetId}'`);
    console.log(`SheetsService constructor: Attempting to open spreadsheet...`);
    this.spreadsheet = SpreadsheetApp.openById(this.spreadsheetId);
    console.log(`SheetsService constructor: Spreadsheet opened successfully`);
    this.initializeSheets();
  }
  
  private getOrCreateSpreadsheet(): string {
    const scriptProperties = PropertiesService.getScriptProperties();
    let ssId = scriptProperties.getProperty('MAIN_SPREADSHEET_ID');

    console.log(`getOrCreateSpreadsheet: Current MAIN_SPREADSHEET_ID = '${ssId}'`);

    // Check if ssId is empty or null
    if (!ssId || ssId.trim() === '') {
      console.log('getOrCreateSpreadsheet: Creating new spreadsheet...');

      // Try SpreadsheetApp.create() first
      try {
        const ss = SpreadsheetApp.create('GAS-PA Database');
        ssId = ss.getId();
        console.log(`getOrCreateSpreadsheet: Spreadsheet created with SpreadsheetApp. ID: ${ssId}`);
      } catch (error) {
        console.log('getOrCreateSpreadsheet: SpreadsheetApp.create() failed, trying Drive API...');

        // Fallback to Drive API
        const file = Drive.Files.insert({
          title: 'GAS-PA Database',
          mimeType: 'application/vnd.google-apps.spreadsheet'
        });

        if (file && file.id) {
          ssId = file.id;
          console.log(`getOrCreateSpreadsheet: Spreadsheet created via Drive API. ID: ${ssId}`);
        } else {
          throw new Error('Failed to create spreadsheet with both methods');
        }
      }

      scriptProperties.setProperty('MAIN_SPREADSHEET_ID', ssId);
      console.log('getOrCreateSpreadsheet: Spreadsheet ID saved to properties');
    } else {
      console.log(`getOrCreateSpreadsheet: Using existing spreadsheet ID: ${ssId}`);
    }

    console.log(`getOrCreateSpreadsheet: Returning ssId = '${ssId}'`);
    return ssId;
  }
  
  private initializeSheets(): void {
    this.initializeEmailsSheet();
    this.initializeProcessingSheet();
    this.initializeConfigSheet();
    this.initializeStatsSheet();
  }
  
  private initializeEmailsSheet(): void {
    let sheet = this.spreadsheet.getSheetByName('Emails');
    if (!sheet) {
      sheet = this.spreadsheet.insertSheet('Emails');
      sheet.appendRow([
        'Email ID',
        'Thread ID',
        'From',
        'To',
        'Subject',
        'Date',
        'Labels',
        'Has Attachments',
        'Processed',
        'Processing Date',
        'Actions',
        'Category',
        'Priority',
        'Notes'
      ]);
      
      // Format header row
      const headerRange = sheet.getRange(1, 1, 1, 14);
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#f3f3f3');
      
      // Set column widths
      sheet.setColumnWidth(1, 150); // Email ID
      sheet.setColumnWidth(3, 200); // From
      sheet.setColumnWidth(5, 300); // Subject
      
      Logger.info('SheetsService', 'Initialized Emails sheet');
    }
  }
  
  private initializeProcessingSheet(): void {
    let sheet = this.spreadsheet.getSheetByName('Processing Log');
    if (!sheet) {
      sheet = this.spreadsheet.insertSheet('Processing Log');
      sheet.appendRow([
        'Timestamp',
        'Run ID',
        'Emails Processed',
        'Successful',
        'Failed',
        'Duration (ms)',
        'Errors'
      ]);
      
      // Format header row
      const headerRange = sheet.getRange(1, 1, 1, 7);
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#f3f3f3');
      
      Logger.info('SheetsService', 'Initialized Processing Log sheet');
    }
  }
  
  private initializeConfigSheet(): void {
    let sheet = this.spreadsheet.getSheetByName('Configuration');
    if (!sheet) {
      sheet = this.spreadsheet.insertSheet('Configuration');
      sheet.appendRow(['Setting', 'Value', 'Description', 'Last Updated']);
      
      // Add default configurations
      const defaultConfigs = [
        ['max_emails_per_run', '50', 'Maximum number of emails to process in one run', new Date()],
        ['processing_enabled', 'true', 'Enable/disable email processing', new Date()],
        ['ai_categorization', 'false', 'Enable AI-powered categorization', new Date()],
        ['auto_reply', 'false', 'Enable automatic reply drafts', new Date()],
        ['summary_frequency', 'daily', 'Frequency of summary reports', new Date()]
      ];
      
      defaultConfigs.forEach(config => sheet!.appendRow(config));
      
      // Format header row
      const headerRange = sheet!.getRange(1, 1, 1, 4);
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#f3f3f3');
      
      Logger.info('SheetsService', 'Initialized Configuration sheet');
    }
  }
  
  private initializeStatsSheet(): void {
    let sheet = this.spreadsheet.getSheetByName('Statistics');
    if (!sheet) {
      sheet = this.spreadsheet.insertSheet('Statistics');
      sheet.appendRow([
        'Date',
        'Total Emails',
        'Processed',
        'Categorized',
        'High Priority',
        'Action Required',
        'Auto Replied'
      ]);
      
      // Format header row
      const headerRange = sheet.getRange(1, 1, 1, 7);
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#f3f3f3');
      
      Logger.info('SheetsService', 'Initialized Statistics sheet');
    }
  }
  
  /**
   * Log email to sheet
   */
  logEmail(email: EmailData, processingResult?: ProcessingResult): void {
    try {
      const sheet = this.spreadsheet.getSheetByName('Emails');
      if (!sheet) {
        Logger.error('SheetsService', 'Emails sheet not found');
        return;
      }
      
      const row = [
        email.id,
        email.threadId,
        email.from,
        email.to.join(', '),
        email.subject,
        email.date,
        email.labels.join(', '),
        email.attachments && email.attachments.length > 0 ? 'Yes' : 'No',
        processingResult ? 'Yes' : 'No',
        processingResult ? new Date() : '',
        processingResult ? processingResult.actions.join(', ') : '',
        '', // Category - to be filled by processor
        '', // Priority - to be filled by processor
        '' // Notes
      ];
      
      sheet.appendRow(row);
      
    } catch (error) {
      Logger.error('SheetsService', 'Failed to log email', error);
    }
  }
  
  /**
   * Log processing run
   */
  logProcessingRun(runId: string, results: ProcessingResult[], duration: number): void {
    try {
      const sheet = this.spreadsheet.getSheetByName('Processing Log');
      if (!sheet) return;
      
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;
      const errors = results
        .filter(r => r.error)
        .map(r => r.error)
        .join('; ');
      
      sheet.appendRow([
        new Date(),
        runId,
        results.length,
        successful,
        failed,
        duration,
        errors
      ]);
      
    } catch (error) {
      Logger.error('SheetsService', 'Failed to log processing run', error);
    }
  }
  
  /**
   * Get configuration value
   */
  getConfig(setting: string): string | null {
    try {
      const sheet = this.spreadsheet.getSheetByName('Configuration');
      if (!sheet) return null;
      
      const data = sheet.getDataRange().getValues();
      const configRow = data.find(row => row[0] === setting);
      
      return configRow ? configRow[1].toString() : null;
      
    } catch (error) {
      Logger.error('SheetsService', `Failed to get config: ${setting}`, error);
      return null;
    }
  }
  
  /**
   * Update configuration value
   */
  updateConfig(setting: string, value: string): void {
    try {
      const sheet = this.spreadsheet.getSheetByName('Configuration');
      if (!sheet) return;
      
      const data = sheet.getDataRange().getValues();
      const rowIndex = data.findIndex(row => row[0] === setting);
      
      if (rowIndex > -1) {
        sheet.getRange(rowIndex + 1, 2).setValue(value);
        sheet.getRange(rowIndex + 1, 4).setValue(new Date());
        Logger.info('SheetsService', `Updated config: ${setting} = ${value}`);
      }
      
    } catch (error) {
      Logger.error('SheetsService', `Failed to update config: ${setting}`, error);
    }
  }
  
  /**
   * Get statistics for date range
   */
  getStatistics(startDate?: Date, endDate?: Date): any[] {
    try {
      const sheet = this.spreadsheet.getSheetByName('Statistics');
      if (!sheet) return [];
      
      const data = sheet.getDataRange().getValues();
      
      if (startDate && endDate) {
        return data.filter(row => {
          const rowDate = new Date(row[0]);
          return rowDate >= startDate && rowDate <= endDate;
        });
      }
      
      return data;
      
    } catch (error) {
      Logger.error('SheetsService', 'Failed to get statistics', error);
      return [];
    }
  }
  
  /**
   * Update daily statistics
   */
  updateDailyStats(stats: any): void {
    try {
      const sheet = this.spreadsheet.getSheetByName('Statistics');
      if (!sheet) return;
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Check if row for today exists
      const data = sheet.getDataRange().getValues();
      const todayRowIndex = data.findIndex(row => {
        const rowDate = new Date(row[0]);
        rowDate.setHours(0, 0, 0, 0);
        return rowDate.getTime() === today.getTime();
      });
      
      const statsRow = [
        today,
        stats.totalEmails || 0,
        stats.processed || 0,
        stats.categorized || 0,
        stats.highPriority || 0,
        stats.actionRequired || 0,
        stats.autoReplied || 0
      ];
      
      if (todayRowIndex > -1) {
        // Update existing row
        sheet.getRange(todayRowIndex + 1, 1, 1, 7).setValues([statsRow]);
      } else {
        // Add new row
        sheet.appendRow(statsRow);
      }
      
      Logger.info('SheetsService', 'Updated daily statistics');
      
    } catch (error) {
      Logger.error('SheetsService', 'Failed to update daily statistics', error);
    }
  }
}
