/**
 * Advanced Error Handling System with Recovery Strategies
 */

export enum ErrorType {
  CONFIGURATION = 'CONFIGURATION',
  API = 'API',
  NETWORK = 'NETWORK',
  VALIDATION = 'VALIDATION',
  PERMISSION = 'PERMISSION',
  QUOTA = 'QUOTA',
  TIMEOUT = 'TIMEOUT',
  DATABASE = 'DATABASE',
  UNKNOWN = 'UNKNOWN'
}

export interface ErrorContext {
  userId?: string;
  emailId?: string;
  operation?: string;
  timestamp?: Date;
  metadata?: Record<string, any>;
}

export interface RecoveryStrategy {
  type: 'RETRY' | 'FALLBACK' | 'SKIP' | 'ALERT' | 'CIRCUIT_BREAK';
  maxAttempts?: number;
  backoffMs?: number;
  fallbackValue?: any;
  alertEmail?: string;
}

export class GaspaError extends Error {
  public readonly type: ErrorType;
  public readonly recoverable: boolean;
  public readonly context: ErrorContext;
  public readonly originalError?: Error;
  public readonly timestamp: Date;
  public readonly id: string;

  constructor(
    message: string,
    type: ErrorType,
    recoverable: boolean = false,
    context: ErrorContext = {},
    originalError?: Error
  ) {
    super(message);
    this.name = 'GaspaError';
    this.type = type;
    this.recoverable = recoverable;
    this.context = { ...context, timestamp: new Date() };
    this.originalError = originalError;
    this.timestamp = new Date();
    this.id = this.generateErrorId();

    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, GaspaError);
    }
  }

  private generateErrorId(): string {
    return `${this.type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  toJSON(): object {
    return {
      id: this.id,
      name: this.name,
      message: this.message,
      type: this.type,
      recoverable: this.recoverable,
      context: this.context,
      timestamp: this.timestamp,
      stack: this.stack,
      originalError: this.originalError ? {
        name: this.originalError.name,
        message: this.originalError.message,
        stack: this.originalError.stack
      } : undefined
    };
  }

  toString(): string {
    return `[${this.id}] ${this.type}: ${this.message} (recoverable: ${this.recoverable})`;
  }
}

export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorLog: GaspaError[] = [];
  private recoveryStrategies: Map<ErrorType, RecoveryStrategy> = new Map();
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();
  private readonly MAX_ERROR_LOG = 100;

  private constructor() {
    this.initializeStrategies();
  }

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  private initializeStrategies(): void {
    // Default recovery strategies
    this.recoveryStrategies.set(ErrorType.NETWORK, {
      type: 'RETRY',
      maxAttempts: 3,
      backoffMs: 1000
    });

    this.recoveryStrategies.set(ErrorType.API, {
      type: 'RETRY',
      maxAttempts: 2,
      backoffMs: 2000
    });

    this.recoveryStrategies.set(ErrorType.QUOTA, {
      type: 'CIRCUIT_BREAK',
      backoffMs: 60000 // 1 minute
    });

    this.recoveryStrategies.set(ErrorType.TIMEOUT, {
      type: 'RETRY',
      maxAttempts: 1,
      backoffMs: 500
    });

    this.recoveryStrategies.set(ErrorType.PERMISSION, {
      type: 'ALERT',
      alertEmail: Session.getActiveUser().getEmail()
    });

    this.recoveryStrategies.set(ErrorType.VALIDATION, {
      type: 'SKIP'
    });

    this.recoveryStrategies.set(ErrorType.DATABASE, {
      type: 'FALLBACK',
      fallbackValue: null
    });
  }

  async handle<T>(
    operation: () => T | Promise<T>,
    context: ErrorContext = {},
    customStrategy?: RecoveryStrategy
  ): Promise<T | null> {
    try {
      return await operation();
    } catch (error) {
      const gaspaError = this.wrapError(error as Error, context);
      return await this.recover(gaspaError, operation, customStrategy);
    }
  }

  private wrapError(error: Error, context: ErrorContext): GaspaError {
    if (error instanceof GaspaError) {
      return error;
    }

    const type = this.detectErrorType(error);
    const recoverable = this.isRecoverable(type);

    return new GaspaError(
      error.message,
      type,
      recoverable,
      context,
      error
    );
  }

  private detectErrorType(error: Error): ErrorType {
    const message = error.message.toLowerCase();

    if (message.includes('network') || message.includes('fetch')) {
      return ErrorType.NETWORK;
    } else if (message.includes('api') || message.includes('service')) {
      return ErrorType.API;
    } else if (message.includes('quota') || message.includes('limit')) {
      return ErrorType.QUOTA;
    } else if (message.includes('timeout')) {
      return ErrorType.TIMEOUT;
    } else if (message.includes('permission') || message.includes('authorization')) {
      return ErrorType.PERMISSION;
    } else if (message.includes('validation') || message.includes('invalid')) {
      return ErrorType.VALIDATION;
    } else if (message.includes('database') || message.includes('spreadsheet')) {
      return ErrorType.DATABASE;
    } else {
      return ErrorType.UNKNOWN;
    }
  }

  private isRecoverable(type: ErrorType): boolean {
    return [
      ErrorType.NETWORK,
      ErrorType.API,
      ErrorType.TIMEOUT,
      ErrorType.DATABASE
    ].includes(type);
  }

  private async recover<T>(
    error: GaspaError,
    operation: () => T | Promise<T>,
    customStrategy?: RecoveryStrategy
  ): Promise<T | null> {
    this.logError(error);

    const strategy = customStrategy || this.recoveryStrategies.get(error.type);
    if (!strategy) {
      throw error;
    }

    switch (strategy.type) {
      case 'RETRY':
        return await this.retryWithBackoff(operation, strategy, error);

      case 'FALLBACK':
        console.warn(`Using fallback for ${error.type}: ${error.message}`);
        return strategy.fallbackValue;

      case 'SKIP':
        console.warn(`Skipping operation due to ${error.type}: ${error.message}`);
        return null;

      case 'ALERT':
        await this.sendAlert(error, strategy.alertEmail);
        throw error;

      case 'CIRCUIT_BREAK':
        return await this.handleCircuitBreaker(error, operation, strategy);

      default:
        throw error;
    }
  }

  private async retryWithBackoff<T>(
    operation: () => T | Promise<T>,
    strategy: RecoveryStrategy,
    error: GaspaError
  ): Promise<T | null> {
    const maxAttempts = strategy.maxAttempts || 3;
    const backoffMs = strategy.backoffMs || 1000;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        console.log(`Retry attempt ${attempt}/${maxAttempts} for ${error.id}`);

        // Exponential backoff
        if (attempt > 1) {
          const delay = backoffMs * Math.pow(2, attempt - 1);
          Utilities.sleep(delay);
        }

        return await operation();
      } catch (retryError) {
        if (attempt === maxAttempts) {
          console.error(`All retry attempts failed for ${error.id}`);
          throw new GaspaError(
            `Operation failed after ${maxAttempts} attempts: ${error.message}`,
            error.type,
            false,
            error.context,
            error
          );
        }
      }
    }

    return null;
  }

  private async handleCircuitBreaker<T>(
    error: GaspaError,
    operation: () => T | Promise<T>,
    strategy: RecoveryStrategy
  ): Promise<T | null> {
    const breakerKey = `${error.type}_${error.context.operation || 'default'}`;

    let breaker = this.circuitBreakers.get(breakerKey);
    if (!breaker) {
      breaker = new CircuitBreaker(breakerKey, strategy.backoffMs || 60000);
      this.circuitBreakers.set(breakerKey, breaker);
    }

    if (breaker.isOpen()) {
      throw new GaspaError(
        `Circuit breaker is open for ${breakerKey}`,
        ErrorType.QUOTA,
        false,
        error.context
      );
    }

    try {
      const result = await operation();
      breaker.onSuccess();
      return result;
    } catch (cbError) {
      breaker.onFailure();
      throw cbError;
    }
  }

  private async sendAlert(error: GaspaError, email?: string): Promise<void> {
    const recipient = email || Session.getActiveUser().getEmail();
    const subject = `[GAS-PA Alert] ${error.type} Error`;

    const body = `
An error occurred in your GAS-PA system:

Error ID: ${error.id}
Type: ${error.type}
Message: ${error.message}
Recoverable: ${error.recoverable}
Timestamp: ${error.timestamp.toISOString()}

Context:
${JSON.stringify(error.context, null, 2)}

Stack Trace:
${error.stack}

Please check the system logs for more details.
    `;

    try {
      GmailApp.sendEmail(recipient, subject, body);
      console.log(`Alert sent to ${recipient} for error ${error.id}`);
    } catch (emailError) {
      console.error('Failed to send error alert:', emailError);
    }
  }

  private logError(error: GaspaError): void {
    this.errorLog.unshift(error);

    // Keep log size manageable
    if (this.errorLog.length > this.MAX_ERROR_LOG) {
      this.errorLog = this.errorLog.slice(0, this.MAX_ERROR_LOG);
    }

    // Log to console
    console.error(error.toString());

    // Log to spreadsheet if available
    try {
      this.logToSpreadsheet(error);
    } catch (logError) {
      console.error('Failed to log error to spreadsheet:', logError);
    }
  }

  private logToSpreadsheet(error: GaspaError): void {
    try {
      const scriptProperties = PropertiesService.getScriptProperties();
      const spreadsheetId = scriptProperties.getProperty('MAIN_SPREADSHEET_ID');

      if (!spreadsheetId) return;

      const sheet = SpreadsheetApp.openById(spreadsheetId)
        .getSheetByName('ErrorLog') ||
        SpreadsheetApp.openById(spreadsheetId)
          .insertSheet('ErrorLog');

      // Add headers if needed
      if (sheet.getLastRow() === 0) {
        sheet.appendRow([
          'Timestamp', 'Error ID', 'Type', 'Message',
          'Recoverable', 'Context', 'Stack'
        ]);
      }

      // Add error row
      sheet.appendRow([
        error.timestamp.toISOString(),
        error.id,
        error.type,
        error.message,
        error.recoverable,
        JSON.stringify(error.context),
        error.stack || ''
      ]);
    } catch (e) {
      // Silently fail to avoid infinite loop
    }
  }

  getRecentErrors(limit: number = 10): GaspaError[] {
    return this.errorLog.slice(0, limit);
  }

  clearErrorLog(): void {
    this.errorLog = [];
  }

  getErrorStatistics(): Record<ErrorType, number> {
    const stats: Record<string, number> = {};

    for (const type of Object.values(ErrorType)) {
      stats[type] = 0;
    }

    this.errorLog.forEach(error => {
      stats[error.type]++;
    });

    return stats as Record<ErrorType, number>;
  }
}

class CircuitBreaker {
  private failures: number = 0;
  private lastFailureTime: number = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  constructor(
    private name: string,
    private cooldownMs: number,
    private failureThreshold: number = 3
  ) {}

  isOpen(): boolean {
    if (this.state === 'CLOSED') {
      return false;
    }

    if (this.state === 'OPEN') {
      const now = Date.now();
      if (now - this.lastFailureTime >= this.cooldownMs) {
        this.state = 'HALF_OPEN';
        return false;
      }
      return true;
    }

    return false;
  }

  onSuccess(): void {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.failureThreshold) {
      this.state = 'OPEN';
      console.warn(`Circuit breaker ${this.name} is now OPEN`);
    }
  }
}

// Export singleton instance
export default ErrorHandler.getInstance();