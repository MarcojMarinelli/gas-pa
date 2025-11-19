/**
 * API Client for GAS-PA Dashboard
 * Provides type-safe access to all 42 backend API endpoints
 * Phase 3.1 - Frontend API Integration
 */

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface ApiError {
  code: string;
  message: string;
  details?: any;
}

export interface ApiResponse<T> {
  data?: T;
  error?: ApiError;
  statusCode?: number;
}

// Metrics Types
export interface MetricsOverview {
  totalEmails: number;
  processedToday: number;
  pendingActions: number;
  avgProcessingTime: number;
  emailTrends: number[];
  processingTrends: number[];
  pendingTrends: number[];
  timeTrends: number[];
}

export interface AnalyticsData {
  timeline: Array<{
    date: string;
    processed: number;
    pending: number;
    failed: number;
  }>;
  categoryBreakdown: Array<{
    category: string;
    count: number;
    percentage: number;
  }>;
  priorityDistribution: Array<{
    priority: string;
    count: number;
  }>;
  responseTimeMetrics: {
    avg: number;
    p50: number;
    p95: number;
    p99: number;
  };
}

// Queue Types
export interface QueueItem {
  id: string;
  subject: string;
  from: string;
  date: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  category?: string;
  labels?: string[];
  snoozedUntil?: string;
}

export interface QueueListResponse {
  items: QueueItem[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface QueueFilters {
  status?: string;
  priority?: string;
  category?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

// Activity Types
export interface ActivityLogEntry {
  id: string;
  queueItemId?: string;
  action: string;
  performedBy: string;
  timestamp: string;
  changes?: any;
  comment?: string;
}

export interface ActivityListResponse {
  logs: ActivityLogEntry[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// Settings Types
export interface UserSettings {
  emailNotifications: boolean;
  dailySummary: boolean;
  weeklySummary: boolean;
  autoClassify: boolean;
  theme: 'light' | 'dark' | 'auto';
  density: 'comfortable' | 'compact' | 'spacious';
}

// Auth Types
export interface AuthResponse {
  user: {
    email: string;
    name: string;
    permissions: string[];
  };
  token?: string;
}

// ============================================================================
// API Client Configuration
// ============================================================================

export interface ApiClientConfig {
  baseUrl?: string;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  onError?: (error: ApiError) => void;
  onRequest?: (url: string, options: RequestInit) => void;
  onResponse?: (response: Response) => void;
}

// ============================================================================
// API Client Class
// ============================================================================

export class ApiClient {
  private baseUrl: string;
  private timeout: number;
  private retries: number;
  private retryDelay: number;
  private config: ApiClientConfig;

  constructor(config: ApiClientConfig = {}) {
    this.baseUrl = config.baseUrl || '';
    this.timeout = config.timeout || 30000; // 30 seconds
    this.retries = config.retries || 3;
    this.retryDelay = config.retryDelay || 1000; // 1 second
    this.config = config;
  }

  // ============================================================================
  // Core HTTP Methods
  // ============================================================================

  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    const requestOptions: RequestInit = {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    try {
      // Call request hook
      this.config.onRequest?.(url, requestOptions);

      let lastError: Error | null = null;

      // Retry logic
      for (let attempt = 0; attempt <= this.retries; attempt++) {
        try {
          const response = await fetch(url, requestOptions);
          clearTimeout(timeoutId);

          // Call response hook
          this.config.onResponse?.(response);

          // Handle HTTP errors
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const apiError: ApiError = {
              code: errorData.error?.code || `HTTP_${response.status}`,
              message: errorData.error?.message || response.statusText,
              details: errorData.error?.details,
            };

            this.config.onError?.(apiError);
            throw new Error(apiError.message);
          }

          // Parse response
          const data = await response.json();
          return data as T;

        } catch (error) {
          lastError = error as Error;

          // Don't retry on client errors (4xx)
          if (error instanceof Error && error.message.includes('HTTP_4')) {
            throw error;
          }

          // Retry on network errors or 5xx
          if (attempt < this.retries) {
            await this.delay(this.retryDelay * (attempt + 1));
            continue;
          }
        }
      }

      throw lastError;

    } catch (error) {
      clearTimeout(timeoutId);

      const apiError: ApiError = {
        code: 'NETWORK_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
        details: error,
      };

      this.config.onError?.(apiError);
      throw error;
    }
  }

  private async get<T>(path: string, params?: Record<string, any>): Promise<T> {
    const query = params ? '?' + new URLSearchParams(this.cleanParams(params)).toString() : '';
    return this.request<T>(path + query, { method: 'GET' });
  }

  private async post<T>(path: string, body?: any): Promise<T> {
    return this.request<T>(path, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  private async put<T>(path: string, body?: any): Promise<T> {
    return this.request<T>(path, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  private async delete<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: 'DELETE' });
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private cleanParams(params: Record<string, any>): Record<string, string> {
    const cleaned: Record<string, string> = {};
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') {
        cleaned[key] = String(value);
      }
    }
    return cleaned;
  }

  // ============================================================================
  // Health & System APIs
  // ============================================================================

  health = {
    check: () => this.get<{ status: string; timestamp: string }>('/api/health'),
  };

  // ============================================================================
  // Authentication APIs
  // ============================================================================

  auth = {
    getCurrentUser: () => this.get<AuthResponse>('/api/auth/me'),
    validateToken: (token: string) => this.post<{ valid: boolean }>('/api/auth/validate', { token }),
  };

  // ============================================================================
  // Metrics APIs
  // ============================================================================

  metrics = {
    /**
     * Get dashboard metrics overview
     * GET /api/metrics
     */
    getOverview: () => this.get<MetricsOverview>('/api/metrics'),

    /**
     * Get queue statistics
     * GET /api/metrics/queue
     */
    getQueueStats: () => this.get<{
      total: number;
      byStatus: Record<string, number>;
      byPriority: Record<string, number>;
    }>('/api/metrics/queue'),

    /**
     * Get processing statistics
     * GET /api/metrics/processing
     */
    getProcessingStats: () => this.get<{
      totalProcessed: number;
      avgTime: number;
      successRate: number;
      todayCount: number;
    }>('/api/metrics/processing'),
  };

  // ============================================================================
  // Queue Management APIs
  // ============================================================================

  queue = {
    /**
     * Get queue items with filters
     * GET /api/queue
     */
    getAll: (filters?: QueueFilters) =>
      this.get<QueueListResponse>('/api/queue', filters),

    /**
     * Get single queue item by ID
     * GET /api/queue/:id
     */
    getById: (id: string) =>
      this.get<QueueItem>(`/api/queue/${id}`),

    /**
     * Create new queue item
     * POST /api/queue
     */
    create: (item: Partial<QueueItem>) =>
      this.post<QueueItem>('/api/queue', item),

    /**
     * Update queue item
     * PUT /api/queue/:id
     */
    update: (id: string, updates: Partial<QueueItem>) =>
      this.put<QueueItem>(`/api/queue/${id}`, updates),

    /**
     * Delete queue item
     * DELETE /api/queue/:id
     */
    delete: (id: string) =>
      this.delete<{ success: boolean }>(`/api/queue/${id}`),

    /**
     * Bulk update queue items
     * POST /api/queue/bulk
     */
    bulkUpdate: (ids: string[], updates: Partial<QueueItem>) =>
      this.post<{ updated: number }>('/api/queue/bulk', { ids, updates }),

    /**
     * Bulk delete queue items
     * POST /api/queue/bulk/delete
     */
    bulkDelete: (ids: string[]) =>
      this.post<{ deleted: number }>('/api/queue/bulk/delete', { ids }),

    /**
     * Snooze queue item
     * POST /api/queue/:id/snooze
     */
    snooze: (id: string, until: string) =>
      this.post<QueueItem>(`/api/queue/${id}/snooze`, { until }),

    /**
     * Complete queue item
     * POST /api/queue/:id/complete
     */
    complete: (id: string, comment?: string) =>
      this.post<QueueItem>(`/api/queue/${id}/complete`, { comment }),

    /**
     * Archive queue item
     * POST /api/queue/:id/archive
     */
    archive: (id: string) =>
      this.post<QueueItem>(`/api/queue/${id}/archive`),
  };

  // ============================================================================
  // Analytics APIs
  // ============================================================================

  analytics = {
    /**
     * Get analytics data
     * GET /api/analytics
     */
    getData: (params?: {
      dateFrom?: string;
      dateTo?: string;
      groupBy?: 'day' | 'week' | 'month';
    }) => this.get<AnalyticsData>('/api/analytics', params),

    /**
     * Get category breakdown
     * GET /api/analytics/categories
     */
    getCategories: () => this.get<Array<{
      category: string;
      count: number;
      percentage: number;
    }>>('/api/analytics/categories'),

    /**
     * Get priority distribution
     * GET /api/analytics/priorities
     */
    getPriorities: () => this.get<Array<{
      priority: string;
      count: number;
    }>>('/api/analytics/priorities'),

    /**
     * Get timeline data
     * GET /api/analytics/timeline
     */
    getTimeline: (params?: {
      dateFrom?: string;
      dateTo?: string;
      interval?: 'hour' | 'day' | 'week';
    }) => this.get<Array<{
      timestamp: string;
      processed: number;
      pending: number;
      failed: number;
    }>>('/api/analytics/timeline', params),

    /**
     * Export analytics data
     * GET /api/analytics/export
     */
    export: (format: 'csv' | 'json') =>
      this.get<{ url: string }>('/api/analytics/export', { format }),
  };

  // ============================================================================
  // Activity Log APIs
  // ============================================================================

  activity = {
    /**
     * Get activity logs with filters
     * GET /api/activity
     */
    getLogs: (params?: {
      queueItemId?: string;
      user?: string;
      action?: string[];
      dateFrom?: string;
      dateTo?: string;
      success?: boolean;
      page?: number;
      pageSize?: number;
    }) => this.get<ActivityListResponse>('/api/activity', params),

    /**
     * Get logs for specific queue item
     * GET /api/activity/item/:id
     */
    getLogsForItem: (id: string, limit?: number) =>
      this.get<{ logs: ActivityLogEntry[] }>(`/api/activity/item/${id}`, { limit }),

    /**
     * Get logs for current user
     * GET /api/activity/user
     */
    getLogsForUser: (limit?: number) =>
      this.get<{ logs: ActivityLogEntry[] }>('/api/activity/user', { limit }),

    /**
     * Get system activity (admin only)
     * GET /api/activity/system
     */
    getSystemActivity: (limit?: number) =>
      this.get<{ logs: ActivityLogEntry[] }>('/api/activity/system', { limit }),

    /**
     * Get failed requests (admin only)
     * GET /api/activity/failed
     */
    getFailedRequests: (limit?: number) =>
      this.get<{ logs: ActivityLogEntry[] }>('/api/activity/failed', { limit }),
  };

  // ============================================================================
  // Processing APIs
  // ============================================================================

  processing = {
    /**
     * Trigger manual processing
     * POST /api/processing/trigger
     */
    trigger: () =>
      this.post<{ queued: number }>('/api/processing/trigger'),

    /**
     * Get processing status
     * GET /api/processing/status
     */
    getStatus: () => this.get<{
      running: boolean;
      lastRun: string;
      nextRun: string;
      progress?: number;
    }>('/api/processing/status'),

    /**
     * Pause processing
     * POST /api/processing/pause
     */
    pause: () =>
      this.post<{ paused: boolean }>('/api/processing/pause'),

    /**
     * Resume processing
     * POST /api/processing/resume
     */
    resume: () =>
      this.post<{ resumed: boolean }>('/api/processing/resume'),
  };

  // ============================================================================
  // Settings APIs
  // ============================================================================

  settings = {
    /**
     * Get user settings
     * GET /api/settings
     */
    get: () => this.get<UserSettings>('/api/settings'),

    /**
     * Update user settings
     * PUT /api/settings
     */
    update: (settings: Partial<UserSettings>) =>
      this.put<UserSettings>('/api/settings', settings),

    /**
     * Reset to defaults
     * POST /api/settings/reset
     */
    reset: () =>
      this.post<UserSettings>('/api/settings/reset'),

    /**
     * Get notification settings
     * GET /api/settings/notifications
     */
    getNotifications: () => this.get<{
      email: boolean;
      daily: boolean;
      weekly: boolean;
    }>('/api/settings/notifications'),

    /**
     * Update notification settings
     * PUT /api/settings/notifications
     */
    updateNotifications: (settings: {
      email?: boolean;
      daily?: boolean;
      weekly?: boolean;
    }) => this.put<{ updated: boolean }>('/api/settings/notifications', settings),
  };

  // ============================================================================
  // System APIs (Admin Only)
  // ============================================================================

  system = {
    /**
     * Get system configuration
     * GET /api/system/config
     */
    getConfig: () => this.get<Record<string, any>>('/api/system/config'),

    /**
     * Update system configuration
     * PUT /api/system/config
     */
    updateConfig: (config: Record<string, any>) =>
      this.put<{ updated: boolean }>('/api/system/config', config),

    /**
     * Get system health
     * GET /api/system/health
     */
    getHealth: () => this.get<{
      status: 'healthy' | 'degraded' | 'down';
      uptime: number;
      checks: Record<string, boolean>;
    }>('/api/system/health'),
  };
}

// ============================================================================
// Factory Function
// ============================================================================

export function createApiClient(config?: ApiClientConfig): ApiClient {
  return new ApiClient(config);
}

// ============================================================================
// Singleton Instance (optional)
// ============================================================================

let defaultClient: ApiClient | null = null;

export function getApiClient(config?: ApiClientConfig): ApiClient {
  if (!defaultClient) {
    defaultClient = new ApiClient(config);
  }
  return defaultClient;
}

export function setApiClient(client: ApiClient): void {
  defaultClient = client;
}
