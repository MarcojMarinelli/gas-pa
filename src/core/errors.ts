import Logger from './logger';

export class GASPAError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: any
  ) {
    super(message);
    this.name = 'GASPAError';
  }
}

export class EmailProcessingError extends GASPAError {
  constructor(message: string, details?: any) {
    super(message, 'EMAIL_PROCESSING_ERROR', details);
    this.name = 'EmailProcessingError';
  }
}

export class ConfigurationError extends GASPAError {
  constructor(message: string, details?: any) {
    super(message, 'CONFIGURATION_ERROR', details);
    this.name = 'ConfigurationError';
  }
}

export class APIError extends GASPAError {
  constructor(message: string, public readonly statusCode?: number, details?: any) {
    super(message, 'API_ERROR', details);
    this.name = 'APIError';
  }
}

export function handleError(error: any, context: string): void {
  if (error instanceof GASPAError) {
    Logger.error(context, error.message, {
      code: error.code,
      details: error.details
    });
  } else if (error instanceof Error) {
    Logger.error(context, error.message, {
      stack: error.stack
    });
  } else {
    Logger.error(context, 'Unknown error', error);
  }
}

export function wrapAsync<T extends (...args: any[]) => any>(
  fn: T,
  context: string
): T {
  return ((...args: Parameters<T>) => {
    try {
      const result = fn(...args);
      if (result instanceof Promise) {
        return result.catch((error) => {
          handleError(error, context);
          throw error;
        });
      }
      return result;
    } catch (error) {
      handleError(error, context);
      throw error;
    }
  }) as T;
}
