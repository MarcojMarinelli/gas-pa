/**
 * Dashboard Page Component
 * Displays metrics overview with stat cards and queue preview
 * Spec: §6 Dashboard Design (6.1–6.3)
 */

import { StatCard, StatCardConfig } from '../components/StatCard';
import { Table } from '../components/Table';
import { applyChartStyles } from '../components/ChartStyle';

export interface DashboardConfig {
  container: HTMLElement;
  onRefresh?: () => void;
  onQueueItemClick?: (item: any) => void;
}

export interface DashboardMetrics {
  totalEmails: number;
  processedToday: number;
  pendingActions: number;
  avgProcessingTime: number;
  emailTrends: number[];
  processingTrends: number[];
  pendingTrends: number[];
  timeTrends: number[];
}

export interface QueueItem {
  id: string;
  subject: string;
  from: string;
  date: Date;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'processing' | 'completed';
}

export class Dashboard {
  private container: HTMLElement;
  private config: DashboardConfig;
  private metrics: DashboardMetrics | null = null;
  private queueItems: QueueItem[] = [];
  private statCards: StatCard[] = [];
  private queueTable: any = null;

  constructor(config: DashboardConfig) {
    this.config = config;
    this.container = config.container;
    this.init();
  }

  private init(): void {
    this.render();
    this.attachEventListeners();
    applyChartStyles();
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="dashboard">
        ${this.renderHeader()}
        <div class="container">
          ${this.renderStatCards()}
          ${this.renderQueuePreview()}
        </div>
      </div>
    `;

    this.initializeStatCards();
    this.initializeQueueTable();
  }

  private renderHeader(): string {
    return `
      <header class="dashboard-header">
        <div class="container">
          <div class="row col-center">
            <div class="col">
              <h1 class="dashboard-title">Email Processing Dashboard</h1>
              <p class="dashboard-subtitle">Real-time metrics and queue status</p>
            </div>
            <div class="col-auto">
              <button class="btn btn-primary" id="refresh-dashboard">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M13.65 2.35a8 8 0 1 0 1.41 1.41l-1.41-1.41zM8 14A6 6 0 1 1 8 2a6 6 0 0 1 0 12z"/>
                  <path d="M8 3v5l3.5 2.1-.7 1.2L7 9V3h1z"/>
                </svg>
                <span>Refresh</span>
              </button>
            </div>
          </div>
        </div>
      </header>
    `;
  }

  private renderStatCards(): string {
    return `
      <section class="dashboard-stats" aria-label="Email metrics">
        <div class="row gap-md">
          <div class="col-12 col-sm-6 col-lg-3">
            <div id="stat-total-emails"></div>
          </div>
          <div class="col-12 col-sm-6 col-lg-3">
            <div id="stat-processed-today"></div>
          </div>
          <div class="col-12 col-sm-6 col-lg-3">
            <div id="stat-pending-actions"></div>
          </div>
          <div class="col-12 col-sm-6 col-lg-3">
            <div id="stat-avg-time"></div>
          </div>
        </div>
      </section>
    `;
  }

  private renderQueuePreview(): string {
    return `
      <section class="dashboard-queue" aria-label="Queue preview">
        <div class="section-header">
          <h2 class="section-title">Queue Preview</h2>
          <span class="section-badge" id="queue-count">0 items</span>
        </div>
        <div id="queue-table-container"></div>
      </section>
    `;
  }

  private initializeStatCards(): void {
    const configs: StatCardConfig[] = [
      {
        container: document.getElementById('stat-total-emails')!,
        title: 'Total Emails',
        value: '0',
        change: 0,
        trend: [],
        color: 'primary',
        icon: `<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
          <path d="M2 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4zm2 0v1.5l6 4.5 6-4.5V4H4zm0 3v9h12V7l-6 4.5L4 7z"/>
        </svg>`
      },
      {
        container: document.getElementById('stat-processed-today')!,
        title: 'Processed Today',
        value: '0',
        change: 0,
        trend: [],
        color: 'success',
        icon: `<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
          <path d="M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16zm-1 11.59L5.41 10 6.83 8.59 9 10.76l4.17-4.17L14.59 8 9 13.59z"/>
        </svg>`
      },
      {
        container: document.getElementById('stat-pending-actions')!,
        title: 'Pending Actions',
        value: '0',
        change: 0,
        trend: [],
        color: 'warning',
        icon: `<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
          <path d="M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16zm1 11h-2v-2h2v2zm0-4h-2V5h2v4z"/>
        </svg>`
      },
      {
        container: document.getElementById('stat-avg-time')!,
        title: 'Avg Processing',
        value: '0s',
        change: 0,
        trend: [],
        color: 'info',
        suffix: 's',
        icon: `<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
          <path d="M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16zm0 14a6 6 0 1 1 0-12 6 6 0 0 1 0 12z"/>
          <path d="M10 5v5l3.5 2.1-.7 1.2L9 11V5h1z"/>
        </svg>`
      }
    ];

    this.statCards = configs.map(config => new StatCard(config));
  }

  private initializeQueueTable(): void {
    const container = document.getElementById('queue-table-container');
    if (!container) return;

    // Create table using the existing Table component
    this.queueTable = new (window as any).Table({
      container,
      columns: [
        {
          id: 'priority',
          label: '',
          width: '40px',
          render: (value: string) => {
            const colors = {
              high: 'var(--color-error)',
              medium: 'var(--color-warning)',
              low: 'var(--color-success)'
            };
            return `<span class="priority-indicator" style="background: ${colors[value as keyof typeof colors]}" title="${value} priority"></span>`;
          }
        },
        { id: 'subject', label: 'Subject', sortable: true },
        { id: 'from', label: 'From', sortable: true },
        {
          id: 'date',
          label: 'Date',
          sortable: true,
          render: (value: Date) => {
            const date = new Date(value);
            const now = new Date();
            const diff = now.getTime() - date.getTime();
            const hours = Math.floor(diff / (1000 * 60 * 60));

            if (hours < 1) {
              const mins = Math.floor(diff / (1000 * 60));
              return `${mins}m ago`;
            } else if (hours < 24) {
              return `${hours}h ago`;
            } else {
              const days = Math.floor(hours / 24);
              return `${days}d ago`;
            }
          }
        },
        {
          id: 'actions',
          label: 'Actions',
          width: '100px',
          render: (_, row: QueueItem) => {
            return `
              <button class="btn-icon" data-action="view" data-id="${row.id}" title="View details">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 3C4.5 3 1.5 6 0 8c1.5 2 4.5 5 8 5s6.5-3 8-5c-1.5-2-4.5-5-8-5zm0 8a3 3 0 1 1 0-6 3 3 0 0 1 0 6z"/>
                  <circle cx="8" cy="8" r="1.5"/>
                </svg>
              </button>
            `;
          }
        }
      ],
      rows: [],
      pageSize: 10,
      sticky: true
    });
  }

  private attachEventListeners(): void {
    // Refresh button
    const refreshBtn = document.getElementById('refresh-dashboard');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        this.refresh();
      });
    }

    // Queue table actions
    this.container.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const actionBtn = target.closest('[data-action="view"]');
      if (actionBtn) {
        const id = actionBtn.getAttribute('data-id');
        const item = this.queueItems.find(i => i.id === id);
        if (item && this.config.onQueueItemClick) {
          this.config.onQueueItemClick(item);
        }
      }
    });

    // Keyboard navigation
    this.container.addEventListener('keydown', (e) => {
      if (e.key === 'F5' || (e.ctrlKey && e.key === 'r')) {
        e.preventDefault();
        this.refresh();
      }
    });
  }

  public updateMetrics(metrics: DashboardMetrics): void {
    this.metrics = metrics;

    // Update stat cards
    if (this.statCards.length === 4) {
      this.statCards[0].update({
        value: metrics.totalEmails.toLocaleString(),
        change: this.calculateChange(metrics.emailTrends),
        trend: metrics.emailTrends
      });

      this.statCards[1].update({
        value: metrics.processedToday.toLocaleString(),
        change: this.calculateChange(metrics.processingTrends),
        trend: metrics.processingTrends
      });

      this.statCards[2].update({
        value: metrics.pendingActions.toLocaleString(),
        change: this.calculateChange(metrics.pendingTrends),
        trend: metrics.pendingTrends
      });

      this.statCards[3].update({
        value: metrics.avgProcessingTime.toFixed(1),
        change: this.calculateChange(metrics.timeTrends),
        trend: metrics.timeTrends
      });
    }
  }

  public updateQueue(items: QueueItem[]): void {
    this.queueItems = items;

    // Update queue count
    const countBadge = document.getElementById('queue-count');
    if (countBadge) {
      countBadge.textContent = `${items.length} items`;
    }

    // Update table
    if (this.queueTable) {
      this.queueTable.update({ rows: items });
    }
  }

  private calculateChange(trend: number[]): number {
    if (trend.length < 2) return 0;
    const current = trend[trend.length - 1];
    const previous = trend[trend.length - 2];
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  }

  public refresh(): void {
    // Add loading state
    const refreshBtn = document.querySelector('#refresh-dashboard');
    if (refreshBtn) {
      refreshBtn.classList.add('loading');
      refreshBtn.setAttribute('aria-busy', 'true');
    }

    // Call refresh callback
    if (this.config.onRefresh) {
      this.config.onRefresh();
    }

    // Remove loading state after animation
    setTimeout(() => {
      if (refreshBtn) {
        refreshBtn.classList.remove('loading');
        refreshBtn.setAttribute('aria-busy', 'false');
      }
    }, 500);
  }

  public destroy(): void {
    // Clean up event listeners and components
    this.statCards.forEach(card => card.destroy());
    this.container.innerHTML = '';
  }
}

// Factory function for easy instantiation
export function createDashboard(config: DashboardConfig): Dashboard {
  return new Dashboard(config);
}

// Add styles
const styles = `
.dashboard {
  min-height: 100vh;
  background: var(--color-surface);
}

.dashboard-header {
  background: var(--color-surface-variant);
  border-bottom: 1px solid var(--color-border-subtle);
  padding: var(--spacing-lg) 0;
  position: sticky;
  top: 0;
  z-index: var(--z-sticky);
}

.dashboard-title {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
  margin: 0;
}

.dashboard-subtitle {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin: var(--spacing-xs) 0 0;
}

.dashboard-stats {
  padding: var(--spacing-xl) 0;
}

.dashboard-queue {
  padding: var(--spacing-xl) 0;
}

.section-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-lg);
}

.section-title {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
  margin: 0;
}

.section-badge {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  background: var(--color-surface-container);
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--radius-full);
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-medium);
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all var(--transition-base);
}

.btn-primary {
  background: var(--color-primary);
  color: var(--color-text-on-primary);
}

.btn-primary:hover {
  background: var(--color-primary-hover);
}

.btn-primary:active {
  background: var(--color-primary-active);
}

.btn-primary:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}

.btn-primary.loading {
  position: relative;
  pointer-events: none;
  opacity: 0.8;
}

.btn-primary.loading::after {
  content: '';
  position: absolute;
  inset: -2px;
  border: 2px solid transparent;
  border-top-color: currentColor;
  border-radius: inherit;
  animation: spin 1s linear infinite;
}

.btn-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  border-radius: var(--radius-sm);
  transition: all var(--transition-fast);
}

.btn-icon:hover {
  background: var(--color-surface-container);
  color: var(--color-text-primary);
}

.btn-icon:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}

.priority-indicator {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Responsive adjustments for 1440x900 */
@media (min-width: 1400px) and (max-height: 900px) {
  .dashboard-header {
    padding: var(--spacing-md) 0;
  }

  .dashboard-stats {
    padding: var(--spacing-lg) 0;
  }

  .dashboard-queue {
    padding: var(--spacing-lg) 0 var(--spacing-xl);
  }
}

/* Dark mode adjustments */
[data-theme="dark"] .dashboard {
  background: var(--color-surface);
}

[data-theme="dark"] .btn-primary.loading::after {
  border-top-color: var(--color-text-primary);
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .btn-primary.loading::after {
    animation: none;
  }
}
`;

// Inject styles if not already present
if (!document.getElementById('dashboard-styles')) {
  const styleSheet = document.createElement('style');
  styleSheet.id = 'dashboard-styles';
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}