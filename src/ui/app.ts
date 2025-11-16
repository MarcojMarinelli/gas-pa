/**
 * Main Application Controller
 * Coordinates Layout, Dashboard, and other page components
 * Phase 2 - Task 1.2: Navigation Implementation
 */

import { Layout, createLayout } from './Layout';
import { Dashboard, createDashboard, DashboardMetrics, QueueItem } from './pages/Dashboard';

export interface AppConfig {
  container: HTMLElement;
  apiEndpoint?: string;
  user?: {
    name: string;
    email: string;
    avatar?: string;
  };
}

interface PageComponent {
  destroy: () => void;
}

export class App {
  private config: AppConfig;
  private container: HTMLElement;
  private layout: Layout | null = null;
  private currentPage: PageComponent | null = null;
  private pages: Map<string, () => Promise<PageComponent>> = new Map();
  private refreshInterval: number | null = null;

  constructor(config: AppConfig) {
    this.config = config;
    this.container = config.container;
    this.registerPages();
    this.init();
  }

  private registerPages(): void {
    // Register page loaders
    this.pages.set('dashboard', async () => {
      const container = document.createElement('div');
      container.className = 'page-container';

      const dashboard = createDashboard({
        container,
        onRefresh: () => this.refreshDashboardData(),
        onQueueItemClick: (item) => this.handleQueueItemClick(item)
      });

      // Load initial data
      await this.refreshDashboardData();

      return dashboard;
    });

    this.pages.set('queue', async () => {
      const container = document.createElement('div');
      container.className = 'page-container';
      container.innerHTML = `
        <div class="page-header">
          <h1 class="page-title">Email Queue</h1>
          <p class="page-description">Manage and process email queue items</p>
        </div>
        <div class="queue-controls">
          <div class="queue-filters">
            <select class="filter-select">
              <option value="all">All Emails</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
            </select>
            <select class="filter-select">
              <option value="all">All Priorities</option>
              <option value="high">High Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="low">Low Priority</option>
            </select>
            <input type="date" class="filter-date" />
            <button class="btn btn-outline">Clear Filters</button>
          </div>
          <div class="queue-actions">
            <button class="btn btn-primary">Process Selected</button>
            <button class="btn btn-outline">Export</button>
          </div>
        </div>
        <div class="queue-content">
          <!-- Queue table will be loaded here -->
          <div class="placeholder-message">
            <svg width="64" height="64" viewBox="0 0 64 64" fill="currentColor" opacity="0.3">
              <path d="M8 16h48v8H8zm0 16h48v8H8zm0 16h32v8H8z"/>
            </svg>
            <p>Queue implementation coming soon</p>
          </div>
        </div>
      `;

      return {
        destroy: () => {
          container.remove();
        }
      };
    });

    this.pages.set('analytics', async () => {
      const container = document.createElement('div');
      container.className = 'page-container';
      container.innerHTML = `
        <div class="page-header">
          <h1 class="page-title">Analytics</h1>
          <p class="page-description">Email processing insights and trends</p>
        </div>
        <div class="analytics-controls">
          <div class="date-range-selector">
            <button class="range-btn active">Today</button>
            <button class="range-btn">Week</button>
            <button class="range-btn">Month</button>
            <button class="range-btn">Year</button>
            <button class="range-btn">Custom</button>
          </div>
          <button class="btn btn-outline">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M2 10h3v4H2zm4-6h3v10H6zm4-2h3v12h-3z"/>
            </svg>
            Export Report
          </button>
        </div>
        <div class="analytics-content">
          <div class="analytics-grid">
            <div class="analytics-card">
              <h3>Processing Trends</h3>
              <div class="chart-placeholder">Chart will be rendered here</div>
            </div>
            <div class="analytics-card">
              <h3>Category Distribution</h3>
              <div class="chart-placeholder">Pie chart will be rendered here</div>
            </div>
            <div class="analytics-card">
              <h3>Response Times</h3>
              <div class="chart-placeholder">Line chart will be rendered here</div>
            </div>
            <div class="analytics-card">
              <h3>Top Senders</h3>
              <div class="chart-placeholder">Bar chart will be rendered here</div>
            </div>
          </div>
        </div>
      `;

      return {
        destroy: () => {
          container.remove();
        }
      };
    });

    this.pages.set('settings', async () => {
      const container = document.createElement('div');
      container.className = 'page-container';
      container.innerHTML = `
        <div class="page-header">
          <h1 class="page-title">Settings</h1>
          <p class="page-description">Configure your email assistant</p>
        </div>
        <div class="settings-content">
          <div class="settings-section">
            <h2 class="section-title">Email Processing</h2>
            <div class="setting-item">
              <label class="setting-label">
                <span>Auto-process incoming emails</span>
                <input type="checkbox" class="setting-toggle" checked />
              </label>
              <p class="setting-description">Automatically categorize and process new emails</p>
            </div>
            <div class="setting-item">
              <label class="setting-label">
                <span>Processing interval (minutes)</span>
                <input type="number" class="setting-input" value="15" min="5" max="60" />
              </label>
              <p class="setting-description">How often to check for new emails</p>
            </div>
          </div>

          <div class="settings-section">
            <h2 class="section-title">Notifications</h2>
            <div class="setting-item">
              <label class="setting-label">
                <span>Desktop notifications</span>
                <input type="checkbox" class="setting-toggle" checked />
              </label>
              <p class="setting-description">Show desktop notifications for important emails</p>
            </div>
            <div class="setting-item">
              <label class="setting-label">
                <span>Email digest</span>
                <input type="checkbox" class="setting-toggle" />
              </label>
              <p class="setting-description">Send daily summary of processed emails</p>
            </div>
          </div>

          <div class="settings-section">
            <h2 class="section-title">API Configuration</h2>
            <div class="setting-item">
              <label class="setting-label">
                <span>API Endpoint</span>
                <input type="url" class="setting-input" value="${this.config.apiEndpoint || 'https://api.example.com'}" />
              </label>
              <p class="setting-description">Backend API URL for data synchronization</p>
            </div>
            <div class="setting-item">
              <label class="setting-label">
                <span>API Key</span>
                <input type="password" class="setting-input" placeholder="Enter your API key" />
              </label>
              <p class="setting-description">Authentication key for API access</p>
            </div>
          </div>

          <div class="settings-actions">
            <button class="btn btn-primary">Save Settings</button>
            <button class="btn btn-outline">Reset to Defaults</button>
          </div>
        </div>
      `;

      return {
        destroy: () => {
          container.remove();
        }
      };
    });
  }

  private async init(): Promise<void> {
    // Create layout
    this.layout = createLayout({
      container: this.container,
      onNavigate: (route) => this.navigateTo(route),
      onMenuToggle: (isOpen) => this.handleMenuToggle(isOpen),
      initialRoute: 'dashboard',
      user: this.config.user
    });

    // Load initial page
    await this.navigateTo('dashboard');

    // Set up auto-refresh for dashboard
    this.setupAutoRefresh();
  }

  private async navigateTo(route: string): Promise<void> {
    // Clean up current page
    if (this.currentPage) {
      this.currentPage.destroy();
      this.currentPage = null;
    }

    // Clear auto-refresh if leaving dashboard
    if (route !== 'dashboard' && this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }

    // Load new page
    const pageLoader = this.pages.get(route);
    if (pageLoader && this.layout) {
      try {
        // Show loading state
        this.layout.setContent(`
          <div class="page-loading">
            <div class="loading-spinner"></div>
            <p>Loading ${route}...</p>
          </div>
        `);

        // Load page component
        const page = await pageLoader();
        this.currentPage = page;

        // Set content
        if (page instanceof Dashboard) {
          this.layout.setContent((page as any).container);
        } else {
          this.layout.setContent((page as any).container || (page as any).element);
        }

        // Restart auto-refresh if returning to dashboard
        if (route === 'dashboard' && !this.refreshInterval) {
          this.setupAutoRefresh();
        }

        // Update badge for queue
        if (route === 'dashboard') {
          this.updateQueueBadge();
        }
      } catch (error) {
        console.error(`Failed to load page: ${route}`, error);
        this.layout.setContent(`
          <div class="error-message">
            <h2>Error Loading Page</h2>
            <p>Failed to load ${route}. Please try again.</p>
          </div>
        `);
      }
    }
  }

  private handleMenuToggle(isOpen: boolean): void {
    // Handle responsive layout adjustments
    if (window.innerWidth < 768) {
      document.body.style.overflow = isOpen ? 'hidden' : '';
    }
  }

  private setupAutoRefresh(): void {
    // Refresh dashboard data every 30 seconds
    this.refreshInterval = window.setInterval(() => {
      if (this.currentPage instanceof Dashboard) {
        this.refreshDashboardData();
      }
    }, 30000);
  }

  private async refreshDashboardData(): Promise<void> {
    try {
      // Simulate API call - replace with actual API integration
      const metrics = await this.fetchMetrics();
      const queueItems = await this.fetchQueueItems();

      if (this.currentPage instanceof Dashboard) {
        this.currentPage.updateMetrics(metrics);
        this.currentPage.updateQueue(queueItems);
        this.updateQueueBadge(queueItems.length);
      }
    } catch (error) {
      console.error('Failed to refresh dashboard data:', error);
    }
  }

  private async fetchMetrics(): Promise<DashboardMetrics> {
    // Simulate API call - replace with actual implementation
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          totalEmails: Math.floor(Math.random() * 10000) + 5000,
          processedToday: Math.floor(Math.random() * 500) + 100,
          pendingActions: Math.floor(Math.random() * 50) + 10,
          avgProcessingTime: Math.random() * 10 + 2,
          emailTrends: Array.from({ length: 7 }, () => Math.random() * 100),
          processingTrends: Array.from({ length: 7 }, () => Math.random() * 50),
          pendingTrends: Array.from({ length: 7 }, () => Math.random() * 20),
          timeTrends: Array.from({ length: 7 }, () => Math.random() * 15)
        });
      }, 500);
    });
  }

  private async fetchQueueItems(): Promise<QueueItem[]> {
    // Simulate API call - replace with actual implementation
    return new Promise((resolve) => {
      setTimeout(() => {
        const items: QueueItem[] = Array.from({ length: 15 }, (_, i) => ({
          id: `item-${i}`,
          subject: `Email Subject ${i + 1}`,
          from: `sender${i + 1}@example.com`,
          date: new Date(Date.now() - Math.random() * 86400000 * 7),
          priority: ['high', 'medium', 'low'][Math.floor(Math.random() * 3)] as any,
          status: ['pending', 'processing', 'completed'][Math.floor(Math.random() * 3)] as any
        }));
        resolve(items);
      }, 300);
    });
  }

  private updateQueueBadge(count?: number): void {
    if (this.layout) {
      const queueCount = count ?? Math.floor(Math.random() * 20);
      this.layout.updateBadge('queue', queueCount > 0 ? queueCount : undefined);
    }
  }

  private handleQueueItemClick(item: QueueItem): void {
    console.log('Queue item clicked:', item);
    // Navigate to queue page with item selected
    this.navigateTo('queue');
    // TODO: Implement item selection in queue page
  }

  public destroy(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
    if (this.currentPage) {
      this.currentPage.destroy();
    }
    if (this.layout) {
      this.layout.destroy();
    }
  }
}

// Factory function
export function createApp(config: AppConfig): App {
  return new App(config);
}

// Add application styles
const appStyles = `
.page-container {
  animation: fadeIn var(--transition-base);
}

.page-header {
  margin-bottom: var(--spacing-xl);
}

.page-title {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
  margin: 0;
}

.page-description {
  font-size: var(--font-size-base);
  color: var(--color-text-secondary);
  margin: var(--spacing-xs) 0 0;
}

.page-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  color: var(--color-text-secondary);
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.error-message {
  text-align: center;
  padding: var(--spacing-xl);
  color: var(--color-error);
}

/* Queue Page Styles */
.queue-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-lg);
  flex-wrap: wrap;
  gap: var(--spacing-md);
}

.queue-filters {
  display: flex;
  gap: var(--spacing-sm);
  flex-wrap: wrap;
}

.filter-select,
.filter-date {
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-surface-container);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
}

.filter-select:focus,
.filter-date:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: var(--focus-ring);
}

.queue-actions {
  display: flex;
  gap: var(--spacing-sm);
}

.queue-content {
  background: var(--color-surface-container);
  border-radius: var(--radius-md);
  padding: var(--spacing-lg);
  min-height: 400px;
}

.placeholder-message {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 300px;
  color: var(--color-text-secondary);
}

/* Analytics Page Styles */
.analytics-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-lg);
  flex-wrap: wrap;
  gap: var(--spacing-md);
}

.date-range-selector {
  display: flex;
  gap: var(--spacing-xs);
  padding: var(--spacing-xs);
  background: var(--color-surface-container);
  border-radius: var(--radius-sm);
}

.range-btn {
  padding: var(--spacing-sm) var(--spacing-md);
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  cursor: pointer;
  border-radius: var(--radius-xs);
  transition: all var(--transition-fast);
}

.range-btn:hover {
  background: var(--color-surface-variant);
  color: var(--color-text-primary);
}

.range-btn.active {
  background: var(--color-primary);
  color: var(--color-text-on-primary);
}

.analytics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: var(--spacing-lg);
}

.analytics-card {
  background: var(--color-surface-container);
  border-radius: var(--radius-md);
  padding: var(--spacing-lg);
}

.analytics-card h3 {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
  margin: 0 0 var(--spacing-md);
}

.chart-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
  background: var(--color-surface-variant);
  border-radius: var(--radius-sm);
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}

/* Settings Page Styles */
.settings-content {
  max-width: 800px;
}

.settings-section {
  background: var(--color-surface-container);
  border-radius: var(--radius-md);
  padding: var(--spacing-lg);
  margin-bottom: var(--spacing-lg);
}

.section-title {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
  margin: 0 0 var(--spacing-lg);
}

.setting-item {
  margin-bottom: var(--spacing-lg);
}

.setting-item:last-child {
  margin-bottom: 0;
}

.setting-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
  margin-bottom: var(--spacing-xs);
  cursor: pointer;
}

.setting-description {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin: var(--spacing-xs) 0 0;
}

.setting-toggle {
  width: 44px;
  height: 24px;
  -webkit-appearance: none;
  appearance: none;
  background: var(--color-surface-variant);
  border-radius: var(--radius-full);
  position: relative;
  cursor: pointer;
  transition: background var(--transition-fast);
}

.setting-toggle:checked {
  background: var(--color-primary);
}

.setting-toggle::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 20px;
  height: 20px;
  background: white;
  border-radius: 50%;
  transition: transform var(--transition-fast);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.setting-toggle:checked::after {
  transform: translateX(20px);
}

.setting-input {
  flex: 1;
  max-width: 300px;
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-surface-variant);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
}

.setting-input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: var(--focus-ring);
}

.settings-actions {
  display: flex;
  gap: var(--spacing-md);
}

/* Button Styles */
.btn {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-lg);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-medium);
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.btn-primary {
  background: var(--color-primary);
  color: var(--color-text-on-primary);
}

.btn-primary:hover {
  background: var(--color-primary-hover);
}

.btn-outline {
  background: transparent;
  color: var(--color-text-primary);
  border: 1px solid var(--color-border);
}

.btn-outline:hover {
  background: var(--color-surface-variant);
  border-color: var(--color-border-strong);
}

.btn:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}

/* Animations */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Dark mode adjustments */
[data-theme="dark"] .filter-select,
[data-theme="dark"] .filter-date,
[data-theme="dark"] .setting-input {
  background: var(--color-surface-variant);
  border-color: var(--color-border);
  color: var(--color-text-primary);
}

[data-theme="dark"] .btn-outline {
  border-color: var(--color-border);
  color: var(--color-text-primary);
}

[data-theme="dark"] .btn-outline:hover {
  background: var(--color-surface-variant);
  border-color: var(--color-border-strong);
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .analytics-grid {
    grid-template-columns: 1fr;
  }

  .queue-controls {
    flex-direction: column;
    align-items: stretch;
  }

  .queue-filters,
  .queue-actions {
    width: 100%;
  }

  .settings-actions {
    flex-direction: column;
  }

  .settings-actions .btn {
    width: 100%;
  }
}

/* Accessibility */
@media (prefers-reduced-motion: reduce) {
  .page-container {
    animation: none;
  }

  .loading-spinner {
    animation: none;
    border-top-color: var(--color-border);
  }

  .setting-toggle::after {
    transition: none;
  }
}
`;

// Inject styles if not already present
if (!document.getElementById('app-styles')) {
  const styleSheet = document.createElement('style');
  styleSheet.id = 'app-styles';
  styleSheet.textContent = appStyles;
  document.head.appendChild(styleSheet);
}