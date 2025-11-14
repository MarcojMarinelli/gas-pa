enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

class Logger {
  private static instance: Logger;
  private logSheet: GoogleAppsScript.Spreadsheet.Sheet | null = null;
  private logLevel: LogLevel;
  
  private constructor() {
    this.logLevel = this.getLogLevel();
    this.initializeLogSheet();
  }
  
  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }
  
  private getLogLevel(): LogLevel {
    const level = PropertiesService.getScriptProperties().getProperty('LOG_LEVEL');
    return LogLevel[level as keyof typeof LogLevel] || LogLevel.INFO;
  }
  
  private initializeLogSheet(): void {
    try {
      const ssId = PropertiesService.getScriptProperties().getProperty('LOG_SPREADSHEET_ID');
      if (ssId && ssId.trim() !== '') {
        const ss = SpreadsheetApp.openById(ssId);
        this.logSheet = ss.getSheetByName('Logs') || ss.insertSheet('Logs');

        // Initialize headers if empty
        if (this.logSheet.getLastRow() === 0) {
          this.logSheet.appendRow(['Timestamp', 'Level', 'Category', 'Message', 'Details']);
        }
      }
    } catch (error) {
      console.error('Failed to initialize log sheet:', error);
    }
  }
  
  private log(level: LogLevel, category: string, message: string, details?: any): void {
    if (level < this.logLevel) return;
    
    const timestamp = new Date().toISOString();
    const levelName = LogLevel[level];
    
    // Console logging
    console.log(`[${timestamp}] [${levelName}] [${category}] ${message}`, details || '');
    
    // Sheet logging
    if (this.logSheet) {
      try {
        this.logSheet.appendRow([
          timestamp,
          levelName,
          category,
          message,
          details ? JSON.stringify(details) : ''
        ]);
      } catch (error) {
        console.error('Failed to write to log sheet:', error);
      }
    }
    
    // Stackdriver logging for errors
    if (level === LogLevel.ERROR) {
      console.error(`${category}: ${message}`, details);
    }
  }
  
  debug(category: string, message: string, details?: any): void {
    this.log(LogLevel.DEBUG, category, message, details);
  }
  
  info(category: string, message: string, details?: any): void {
    this.log(LogLevel.INFO, category, message, details);
  }
  
  warn(category: string, message: string, details?: any): void {
    this.log(LogLevel.WARN, category, message, details);
  }
  
  error(category: string, message: string, details?: any): void {
    this.log(LogLevel.ERROR, category, message, details);
  }
}

export default Logger.getInstance();
