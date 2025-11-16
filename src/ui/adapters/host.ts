/**
 * Host adapter for client-server communication
 *
 * Provides a bridge between the client-side UI and Google Apps Script
 * server functions. Handles all communication with PropertiesService
 * through server-side functions.
 */

interface ServerResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp?: number;
}

interface ServerPreferences {
  theme?: 'light' | 'dark' | 'system';
  density?: 'compact' | 'comfortable';
  sidebarCollapsed?: boolean;
  viewMode?: 'list' | 'grid' | 'timeline';
  selectedLabels?: string[];
  sortOrder?: 'date' | 'sender' | 'subject';
  sortDirection?: 'asc' | 'desc';
  lastSyncTime?: number;
}

/**
 * Google Apps Script server communication wrapper
 * Uses google.script.run for server calls
 */
class HostAdapter {
  private static instance: HostAdapter;
  private serverAvailable: boolean = false;
  private pendingCalls: Map<string, (value: any) => void> = new Map();
  private callTimeout = 30000; // 30 seconds

  private constructor() {
    // Check if we're running in Google Apps Script environment
    this.serverAvailable = this.checkServerAvailable();
  }

  static getInstance(): HostAdapter {
    if (!HostAdapter.instance) {
      HostAdapter.instance = new HostAdapter();
    }
    return HostAdapter.instance;
  }

  private checkServerAvailable(): boolean {
    return typeof google !== 'undefined' &&
           google.script &&
           google.script.run !== undefined;
  }

  /**
   * Call a server function with automatic error handling
   */
  private callServer<T>(functionName: string, ...args: any[]): Promise<T> {
    if (!this.serverAvailable) {
      // Fallback for local development / testing
      console.warn(`Server function ${functionName} not available, using mock response`);
      return Promise.resolve({} as T);
    }

    return new Promise((resolve, reject) => {
      const callId = `${functionName}_${Date.now()}_${Math.random()}`;
      let timeoutId: number;

      // Set up timeout
      timeoutId = window.setTimeout(() => {
        this.pendingCalls.delete(callId);
        reject(new Error(`Server call ${functionName} timed out after ${this.callTimeout}ms`));
      }, this.callTimeout);

      // Store pending call
      this.pendingCalls.set(callId, (result) => {
        clearTimeout(timeoutId);
        this.pendingCalls.delete(callId);
        resolve(result);
      });

      // Make the server call
      try {
        google.script.run
          .withSuccessHandler((result) => {
            const handler = this.pendingCalls.get(callId);
            if (handler) handler(result);
          })
          .withFailureHandler((error) => {
            clearTimeout(timeoutId);
            this.pendingCalls.delete(callId);
            reject(error);
          })[functionName](...args);
      } catch (error) {
        clearTimeout(timeoutId);
        this.pendingCalls.delete(callId);
        reject(error);
      }
    });
  }

  /**
   * Sync preferences to server PropertiesService
   */
  async syncPreferences(preferences: ServerPreferences): Promise<boolean> {
    try {
      const response = await this.callServer<ServerResponse>(
        'updateConfig',
        'ui_preferences',
        preferences
      );

      return response.success === true;
    } catch (error) {
      console.error('Failed to sync preferences to server:', error);
      return false;
    }
  }

  /**
   * Fetch preferences from server PropertiesService
   */
  async fetchPreferences(): Promise<ServerPreferences | null> {
    try {
      const response = await this.callServer<ServerResponse<ServerPreferences>>(
        'getConfig',
        'ui_preferences'
      );

      if (response.success && response.data) {
        return response.data;
      }

      return null;
    } catch (error) {
      console.error('Failed to fetch preferences from server:', error);
      return null;
    }
  }

  /**
   * Execute server-side actions
   */
  async executeAction(action: string, params?: any): Promise<any> {
    try {
      const response = await this.callServer<ServerResponse>(
        'executeAction',
        action,
        params
      );

      if (!response.success) {
        throw new Error(response.error || 'Action failed');
      }

      return response.data;
    } catch (error) {
      console.error(`Failed to execute action ${action}:`, error);
      throw error;
    }
  }

  /**
   * Get server configuration
   */
  async getServerConfig(): Promise<any> {
    try {
      const response = await this.callServer<ServerResponse>(
        'getSystemConfig'
      );

      return response.data || {};
    } catch (error) {
      console.error('Failed to get server config:', error);
      return {};
    }
  }

  /**
   * Upload data to server
   */
  async uploadData(dataType: string, data: any): Promise<boolean> {
    try {
      const response = await this.callServer<ServerResponse>(
        'uploadData',
        dataType,
        data
      );

      return response.success === true;
    } catch (error) {
      console.error(`Failed to upload ${dataType} data:`, error);
      return false;
    }
  }

  /**
   * Download data from server
   */
  async downloadData(dataType: string, params?: any): Promise<any> {
    try {
      const response = await this.callServer<ServerResponse>(
        'downloadData',
        dataType,
        params
      );

      if (!response.success) {
        throw new Error(response.error || 'Download failed');
      }

      return response.data;
    } catch (error) {
      console.error(`Failed to download ${dataType} data:`, error);
      throw error;
    }
  }

  /**
   * Check server availability
   */
  isServerAvailable(): boolean {
    return this.serverAvailable;
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.callServer<ServerResponse>(
        'ping'
      );

      return response.success === true;
    } catch {
      return false;
    }
  }
}

// Export singleton instance
const hostAdapter = HostAdapter.getInstance();

// Export methods for direct use
export const syncPreferences = hostAdapter.syncPreferences.bind(hostAdapter);
export const fetchPreferences = hostAdapter.fetchPreferences.bind(hostAdapter);
export const executeAction = hostAdapter.executeAction.bind(hostAdapter);
export const getServerConfig = hostAdapter.getServerConfig.bind(hostAdapter);
export const uploadData = hostAdapter.uploadData.bind(hostAdapter);
export const downloadData = hostAdapter.downloadData.bind(hostAdapter);
export const isServerAvailable = hostAdapter.isServerAvailable.bind(hostAdapter);
export const healthCheck = hostAdapter.healthCheck.bind(hostAdapter);

// Export the adapter instance for advanced usage
export default hostAdapter;