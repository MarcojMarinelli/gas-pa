/**
 * Health Check Handler
 * Provides system status and health information
 */

import { ApiRequest } from '../types/api-types';
import Logger from '../../core/logger';

export interface HealthCheckResponse {
  status: 'ok' | 'degraded' | 'error';
  timestamp: string;
  version: string;
  uptime?: number;
  services?: {
    gmail: 'ok' | 'error';
    sheets: 'ok' | 'error';
    cache: 'ok' | 'error';
  };
}

/**
 * Basic health check
 * Returns simple status
 */
export async function healthCheck(request: ApiRequest): Promise<HealthCheckResponse> {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  };
}

/**
 * Detailed health check
 * Checks all service dependencies
 */
export async function detailedHealthCheck(request: ApiRequest): Promise<HealthCheckResponse> {
  const startTime = Date.now();

  const services = {
    gmail: 'ok' as 'ok' | 'error',
    sheets: 'ok' as 'ok' | 'error',
    cache: 'ok' as 'ok' | 'error'
  };

  let overallStatus: 'ok' | 'degraded' | 'error' = 'ok';

  // Check Gmail service
  try {
    GmailApp.getInboxThreads(0, 1);
  } catch (error) {
    Logger.error('Health', 'Gmail service check failed', error);
    services.gmail = 'error';
    overallStatus = 'degraded';
  }

  // Check Sheets service
  try {
    const scriptProperties = PropertiesService.getScriptProperties();
    const ssId = scriptProperties.getProperty('MAIN_SPREADSHEET_ID');
    if (ssId) {
      SpreadsheetApp.openById(ssId);
    }
  } catch (error) {
    Logger.error('Health', 'Sheets service check failed', error);
    services.sheets = 'error';
    overallStatus = 'degraded';
  }

  // Check Cache service
  try {
    const cache = CacheService.getScriptCache();
    cache?.put('health_check', 'ok', 10);
    const result = cache?.get('health_check');
    if (result !== 'ok') {
      services.cache = 'error';
      overallStatus = 'degraded';
    }
  } catch (error) {
    Logger.error('Health', 'Cache service check failed', error);
    services.cache = 'error';
    overallStatus = 'degraded';
  }

  // If any critical service is down, mark as error
  if (services.gmail === 'error' && services.sheets === 'error') {
    overallStatus = 'error';
  }

  return {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    uptime: Date.now() - startTime,
    services
  };
}

/**
 * Ping endpoint
 * Simple liveness check
 */
export function ping(request: ApiRequest): { message: string; timestamp: string } {
  return {
    message: 'pong',
    timestamp: new Date().toISOString()
  };
}

export const healthHandler = {
  healthCheck,
  detailedHealthCheck,
  ping
};
