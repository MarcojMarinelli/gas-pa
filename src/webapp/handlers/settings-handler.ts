/**
 * Settings Handler
 * Handles user preferences and system configuration
 */

import { ApiRequest } from '../types/api-types';
import {
  UserPreferences,
  SystemConfiguration,
  QueueSort,
  QueuePriority
} from '../../types/shared-models';
import {
  validate,
  userPreferencesSchema,
  systemConfigurationSchema
} from '../../types/validators';
import { ValidationError, ForbiddenError } from '../types/api-types';
import Logger from '../../core/logger';

/**
 * Backend Settings Service Interface
 * Abstraction layer for settings operations
 */
export interface BackendSettingsService {
  // User preferences
  getUserPreferences(email: string): Promise<UserPreferences>;
  updateUserPreferences(email: string, preferences: Partial<UserPreferences>): Promise<UserPreferences>;
  resetUserPreferences(email: string): Promise<UserPreferences>;

  // System configuration
  getSystemConfiguration(): Promise<SystemConfiguration>;
  updateSystemConfiguration(config: Partial<SystemConfiguration>): Promise<SystemConfiguration>;

  // Default values
  getDefaultPreferences(): UserPreferences;
  getDefaultConfiguration(): SystemConfiguration;
}

/**
 * Settings Handler Class
 */
export class SettingsHandler {
  private backendService: BackendSettingsService;

  constructor(backendService: BackendSettingsService) {
    this.backendService = backendService;
  }

  /**
   * Get user preferences
   * GET /api/settings/user
   */
  async getUserPreferences(request: ApiRequest): Promise<UserPreferences> {
    try {
      const email = request.user;

      if (!email) {
        throw new ValidationError('User email required');
      }

      Logger.info('SettingsHandler', 'Getting user preferences', {
        user: email
      });

      const preferences = await this.backendService.getUserPreferences(email);

      Logger.debug('SettingsHandler', 'User preferences retrieved', {
        user: email,
        hasCustomSettings: preferences.timezone !== undefined
      });

      return preferences;
    } catch (error) {
      Logger.error('SettingsHandler', 'Failed to get user preferences', error);
      throw error;
    }
  }

  /**
   * Update user preferences
   * PUT /api/settings/user
   */
  async updateUserPreferences(request: ApiRequest): Promise<UserPreferences> {
    try {
      const email = request.user;
      const updates = request.postData;

      if (!email) {
        throw new ValidationError('User email required');
      }

      // Validate updates (partial schema)
      const validated = validate(userPreferencesSchema.partial(), updates);

      Logger.info('SettingsHandler', 'Updating user preferences', {
        user: email,
        fields: Object.keys(validated)
      });

      const updated = await this.backendService.updateUserPreferences(email, validated);

      Logger.info('SettingsHandler', 'User preferences updated', {
        user: email
      });

      return updated;
    } catch (error) {
      Logger.error('SettingsHandler', 'Failed to update user preferences', error);
      throw error;
    }
  }

  /**
   * Reset user preferences to defaults
   * POST /api/settings/user/reset
   */
  async resetUserPreferences(request: ApiRequest): Promise<UserPreferences> {
    try {
      const email = request.user;

      if (!email) {
        throw new ValidationError('User email required');
      }

      Logger.info('SettingsHandler', 'Resetting user preferences', {
        user: email
      });

      const defaults = await this.backendService.resetUserPreferences(email);

      Logger.info('SettingsHandler', 'User preferences reset to defaults', {
        user: email
      });

      return defaults;
    } catch (error) {
      Logger.error('SettingsHandler', 'Failed to reset user preferences', error);
      throw error;
    }
  }

  /**
   * Get default user preferences
   * GET /api/settings/user/defaults
   */
  async getDefaultPreferences(request: ApiRequest): Promise<UserPreferences> {
    try {
      Logger.debug('SettingsHandler', 'Getting default preferences');

      const defaults = this.backendService.getDefaultPreferences();

      return defaults;
    } catch (error) {
      Logger.error('SettingsHandler', 'Failed to get default preferences', error);
      throw error;
    }
  }

  /**
   * Get system configuration
   * GET /api/settings/system
   */
  async getSystemConfiguration(request: ApiRequest): Promise<SystemConfiguration> {
    try {
      // Verify admin permission (will be checked by requirePermission middleware)
      Logger.info('SettingsHandler', 'Getting system configuration', {
        user: request.user
      });

      const config = await this.backendService.getSystemConfiguration();

      Logger.debug('SettingsHandler', 'System configuration retrieved', {
        version: config.version,
        environment: config.environment
      });

      return config;
    } catch (error) {
      Logger.error('SettingsHandler', 'Failed to get system configuration', error);
      throw error;
    }
  }

  /**
   * Update system configuration
   * PUT /api/settings/system
   */
  async updateSystemConfiguration(request: ApiRequest): Promise<SystemConfiguration> {
    try {
      const updates = request.postData;

      // Validate updates (partial schema)
      const validated = validate(systemConfigurationSchema.partial(), updates);

      Logger.info('SettingsHandler', 'Updating system configuration', {
        user: request.user,
        fields: Object.keys(validated)
      });

      const updated = await this.backendService.updateSystemConfiguration(validated);

      Logger.info('SettingsHandler', 'System configuration updated', {
        user: request.user,
        version: updated.version
      });

      return updated;
    } catch (error) {
      Logger.error('SettingsHandler', 'Failed to update system configuration', error);
      throw error;
    }
  }

  /**
   * Get default system configuration
   * GET /api/settings/system/defaults
   */
  async getDefaultConfiguration(request: ApiRequest): Promise<SystemConfiguration> {
    try {
      Logger.debug('SettingsHandler', 'Getting default system configuration');

      const defaults = this.backendService.getDefaultConfiguration();

      return defaults;
    } catch (error) {
      Logger.error('SettingsHandler', 'Failed to get default configuration', error);
      throw error;
    }
  }
}

/**
 * Mock Backend Settings Service
 * For testing and development
 */
export class MockBackendSettingsService implements BackendSettingsService {
  private userPreferences: Map<string, UserPreferences> = new Map();
  private systemConfig: SystemConfiguration;

  constructor() {
    // Initialize with default system config
    this.systemConfig = this.getDefaultConfiguration();
  }

  /**
   * Get user preferences
   */
  async getUserPreferences(email: string): Promise<UserPreferences> {
    // Return stored preferences or defaults
    let preferences = this.userPreferences.get(email);

    if (!preferences) {
      preferences = this.getDefaultPreferences();
      preferences.email = email;
      this.userPreferences.set(email, preferences);
    }

    return { ...preferences };
  }

  /**
   * Update user preferences
   */
  async updateUserPreferences(
    email: string,
    updates: Partial<UserPreferences>
  ): Promise<UserPreferences> {
    let preferences = this.userPreferences.get(email);

    if (!preferences) {
      preferences = this.getDefaultPreferences();
      preferences.email = email;
    }

    // Merge updates
    const updated = { ...preferences, ...updates, email };

    this.userPreferences.set(email, updated);

    return { ...updated };
  }

  /**
   * Reset user preferences to defaults
   */
  async resetUserPreferences(email: string): Promise<UserPreferences> {
    const defaults = this.getDefaultPreferences();
    defaults.email = email;

    this.userPreferences.set(email, defaults);

    return { ...defaults };
  }

  /**
   * Get system configuration
   */
  async getSystemConfiguration(): Promise<SystemConfiguration> {
    return { ...this.systemConfig };
  }

  /**
   * Update system configuration
   */
  async updateSystemConfiguration(
    updates: Partial<SystemConfiguration>
  ): Promise<SystemConfiguration> {
    this.systemConfig = { ...this.systemConfig, ...updates };

    return { ...this.systemConfig };
  }

  /**
   * Get default user preferences
   */
  getDefaultPreferences(): UserPreferences {
    return {
      email: '',
      timezone: 'America/New_York',
      notifyOnHighPriority: true,
      notifyOnSLABreach: true,
      dailySummaryEnabled: true,
      dailySummaryTime: '09:00',
      defaultPageSize: 20,
      defaultSort: {
        field: 'date',
        direction: 'desc'
      } as QueueSort,
      compactView: false,
      autoArchiveCompleted: true,
      autoArchiveAfterDays: 30,
      slaHours: {
        high: 4,
        medium: 24,
        low: 72
      }
    };
  }

  /**
   * Get default system configuration
   */
  getDefaultConfiguration(): SystemConfiguration {
    return {
      version: '1.0.0',
      environment: 'development',
      features: {
        queueManagement: true,
        autoProcessing: true,
        slaTracking: true,
        aiClassification: false
      },
      limits: {
        maxEmailsPerRun: 100,
        maxQueueSize: 1000,
        apiRateLimit: 100,
        sessionTimeout: 3600
      },
      integrations: {
        openaiEnabled: false,
        openaiModel: 'gpt-4'
      }
    };
  }
}

/**
 * GAS Backend Settings Service
 * Real implementation using Google Sheets for storage
 */
export class GASBackendSettingsService implements BackendSettingsService {
  private readonly SETTINGS_SHEET_NAME = 'Settings';
  private readonly USER_PREFS_SHEET_NAME = 'UserPreferences';

  /**
   * Get user preferences
   */
  async getUserPreferences(email: string): Promise<UserPreferences> {
    try {
      const sheet = this.getUserPrefsSheet();
      const data = sheet.getDataRange().getValues();

      // Find user row (first row is headers)
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === email) {
          return this.parseUserPrefsRow(data[i]);
        }
      }

      // User not found, return defaults
      const defaults = this.getDefaultPreferences();
      defaults.email = email;

      // Save defaults for this user
      await this.updateUserPreferences(email, defaults);

      return defaults;
    } catch (error) {
      Logger.error('GASBackendSettingsService', 'Failed to get user preferences', error);
      // Return defaults on error
      const defaults = this.getDefaultPreferences();
      defaults.email = email;
      return defaults;
    }
  }

  /**
   * Update user preferences
   */
  async updateUserPreferences(
    email: string,
    updates: Partial<UserPreferences>
  ): Promise<UserPreferences> {
    try {
      const sheet = this.getUserPrefsSheet();
      const data = sheet.getDataRange().getValues();

      // Find existing row
      let rowIndex = -1;
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === email) {
          rowIndex = i;
          break;
        }
      }

      // Get current preferences or defaults
      let current: UserPreferences;
      if (rowIndex >= 0) {
        current = this.parseUserPrefsRow(data[rowIndex]);
      } else {
        current = this.getDefaultPreferences();
        current.email = email;
      }

      // Merge updates
      const updated = { ...current, ...updates, email };

      // Convert to row
      const row = this.userPrefsToRow(updated);

      // Update or append
      if (rowIndex >= 0) {
        sheet.getRange(rowIndex + 1, 1, 1, row.length).setValues([row]);
      } else {
        sheet.appendRow(row);
      }

      return updated;
    } catch (error) {
      Logger.error('GASBackendSettingsService', 'Failed to update user preferences', error);
      throw error;
    }
  }

  /**
   * Reset user preferences
   */
  async resetUserPreferences(email: string): Promise<UserPreferences> {
    const defaults = this.getDefaultPreferences();
    defaults.email = email;

    return await this.updateUserPreferences(email, defaults);
  }

  /**
   * Get system configuration
   */
  async getSystemConfiguration(): Promise<SystemConfiguration> {
    try {
      const sheet = this.getSettingsSheet();
      const data = sheet.getDataRange().getValues();

      // Parse key-value pairs (skip header row)
      const config: any = {};

      for (let i = 1; i < data.length; i++) {
        const key = data[i][0];
        const value = data[i][1];

        if (key && value !== undefined) {
          // Parse JSON values
          try {
            config[key] = JSON.parse(value);
          } catch {
            config[key] = value;
          }
        }
      }

      // Merge with defaults to ensure all fields exist
      const defaults = this.getDefaultConfiguration();
      return { ...defaults, ...config };
    } catch (error) {
      Logger.error('GASBackendSettingsService', 'Failed to get system configuration', error);
      return this.getDefaultConfiguration();
    }
  }

  /**
   * Update system configuration
   */
  async updateSystemConfiguration(
    updates: Partial<SystemConfiguration>
  ): Promise<SystemConfiguration> {
    try {
      const sheet = this.getSettingsSheet();
      const current = await this.getSystemConfiguration();

      // Merge updates
      const updated = { ...current, ...updates };

      // Clear existing data (keep headers)
      const lastRow = sheet.getLastRow();
      if (lastRow > 1) {
        sheet.getRange(2, 1, lastRow - 1, 2).clear();
      }

      // Write updated config
      const rows: any[][] = [];
      for (const [key, value] of Object.entries(updated)) {
        rows.push([key, JSON.stringify(value)]);
      }

      if (rows.length > 0) {
        sheet.getRange(2, 1, rows.length, 2).setValues(rows);
      }

      return updated;
    } catch (error) {
      Logger.error('GASBackendSettingsService', 'Failed to update system configuration', error);
      throw error;
    }
  }

  /**
   * Get default preferences
   */
  getDefaultPreferences(): UserPreferences {
    return {
      email: '',
      timezone: 'America/New_York',
      notifyOnHighPriority: true,
      notifyOnSLABreach: true,
      dailySummaryEnabled: true,
      dailySummaryTime: '09:00',
      defaultPageSize: 20,
      defaultSort: {
        field: 'date',
        direction: 'desc'
      } as QueueSort,
      compactView: false,
      autoArchiveCompleted: true,
      autoArchiveAfterDays: 30,
      slaHours: {
        high: 4,
        medium: 24,
        low: 72
      }
    };
  }

  /**
   * Get default configuration
   */
  getDefaultConfiguration(): SystemConfiguration {
    return {
      version: '1.0.0',
      environment: 'production',
      features: {
        queueManagement: true,
        autoProcessing: true,
        slaTracking: true,
        aiClassification: false
      },
      limits: {
        maxEmailsPerRun: 100,
        maxQueueSize: 1000,
        apiRateLimit: 100,
        sessionTimeout: 3600
      },
      integrations: {
        openaiEnabled: false,
        openaiModel: 'gpt-4'
      }
    };
  }

  /**
   * Get or create settings sheet
   */
  private getSettingsSheet(): GoogleAppsScript.Spreadsheet.Sheet {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(this.SETTINGS_SHEET_NAME);

    if (!sheet) {
      sheet = ss.insertSheet(this.SETTINGS_SHEET_NAME);
      // Add headers
      sheet.appendRow(['Key', 'Value']);
    }

    return sheet;
  }

  /**
   * Get or create user preferences sheet
   */
  private getUserPrefsSheet(): GoogleAppsScript.Spreadsheet.Sheet {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(this.USER_PREFS_SHEET_NAME);

    if (!sheet) {
      sheet = ss.insertSheet(this.USER_PREFS_SHEET_NAME);
      // Add headers
      sheet.appendRow([
        'Email',
        'Timezone',
        'NotifyOnHighPriority',
        'NotifyOnSLABreach',
        'DailySummaryEnabled',
        'DailySummaryTime',
        'DefaultPageSize',
        'DefaultSort',
        'CompactView',
        'AutoArchiveCompleted',
        'AutoArchiveAfterDays',
        'SLAHours'
      ]);
    }

    return sheet;
  }

  /**
   * Parse user preferences row from sheet
   */
  private parseUserPrefsRow(row: any[]): UserPreferences {
    return {
      email: row[0] || '',
      timezone: row[1] || 'America/New_York',
      notifyOnHighPriority: row[2] !== false,
      notifyOnSLABreach: row[3] !== false,
      dailySummaryEnabled: row[4] !== false,
      dailySummaryTime: row[5] || '09:00',
      defaultPageSize: Number(row[6]) || 20,
      defaultSort: this.parseJSON(row[7], { field: 'date', direction: 'desc' }),
      compactView: row[8] === true,
      autoArchiveCompleted: row[9] !== false,
      autoArchiveAfterDays: Number(row[10]) || 30,
      slaHours: this.parseJSON(row[11], { high: 4, medium: 24, low: 72 })
    };
  }

  /**
   * Convert user preferences to sheet row
   */
  private userPrefsToRow(prefs: UserPreferences): any[] {
    return [
      prefs.email,
      prefs.timezone || 'America/New_York',
      prefs.notifyOnHighPriority !== false,
      prefs.notifyOnSLABreach !== false,
      prefs.dailySummaryEnabled !== false,
      prefs.dailySummaryTime || '09:00',
      prefs.defaultPageSize || 20,
      JSON.stringify(prefs.defaultSort || { field: 'date', direction: 'desc' }),
      prefs.compactView === true,
      prefs.autoArchiveCompleted !== false,
      prefs.autoArchiveAfterDays || 30,
      JSON.stringify(prefs.slaHours || { high: 4, medium: 24, low: 72 })
    ];
  }

  /**
   * Parse JSON with fallback
   */
  private parseJSON(value: any, defaultValue: any): any {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return defaultValue;
      }
    }
    return value || defaultValue;
  }
}

/**
 * Factory function to create settings handler
 */
export function createSettingsHandler(useMock: boolean = false): SettingsHandler {
  const backendService = useMock
    ? new MockBackendSettingsService()
    : new GASBackendSettingsService();

  return new SettingsHandler(backendService);
}

/**
 * Default handler instance
 */
export const settingsHandler = createSettingsHandler(true); // Set to false for production
