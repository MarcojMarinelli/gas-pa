/**
 * StatCard Component
 * Displays a metric with value, change indicator, and micro-trend chart
 * Spec: §6 Dashboard Design (6.1–6.3), §10.10 Charts
 */

export interface StatCardConfig {
  container: HTMLElement;
  title: string;
  value: string | number;
  change?: number;
  trend?: number[];
  color?: 'primary' | 'success' | 'warning' | 'error' | 'info';
  prefix?: string;
  suffix?: string;
  icon?: string;
  onClick?: () => void;
}

export interface StatCardUpdateData {
  value?: string | number;
  change?: number;
  trend?: number[];
}

export class StatCard {
  private container: HTMLElement;
  private config: StatCardConfig;
  private trendCanvas: SVGSVGElement | null = null;
  private animationFrame: number | null = null;

  constructor(config: StatCardConfig) {
    this.config = {
      color: 'primary',
      change: 0,
      trend: [],
      ...config
    };
    this.container = config.container;
    this.init();
  }

  private init(): void {
    this.render();
    this.attachEventListeners();
    if (this.config.trend && this.config.trend.length > 0) {
      this.renderMicroTrend(this.config.trend);
    }
  }

  private render(): void {
    const changeIndicator = this.renderChangeIndicator();
    const trendChart = this.config.trend && this.config.trend.length > 1
      ? `<div class="stat-card-trend" aria-label="Trend chart">
          <svg class="micro-trend" viewBox="0 0 100 32" preserveAspectRatio="none">
            <defs>
              <linearGradient id="trend-gradient-${this.config.title.replace(/\s+/g, '-')}" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style="stop-color:var(--color-${this.config.color});stop-opacity:0.3" />
                <stop offset="100%" style="stop-color:var(--color-${this.config.color});stop-opacity:0" />
              </linearGradient>
            </defs>
          </svg>
        </div>`
      : '';

    this.container.innerHTML = `
      <div class="stat-card stat-card--${this.config.color}"
           role="article"
           aria-label="${this.config.title} statistic"
           ${this.config.onClick ? 'tabindex="0"' : ''}>
        <div class="stat-card-header">
          ${this.config.icon ? `<div class="stat-card-icon">${this.config.icon}</div>` : ''}
          <div class="stat-card-title">${this.config.title}</div>
        </div>
        <div class="stat-card-body">
          <div class="stat-card-value">
            ${this.config.prefix || ''}
            <span class="stat-card-number">${this.formatValue(this.config.value)}</span>
            ${this.config.suffix || ''}
          </div>
          ${changeIndicator}
        </div>
        ${trendChart}
      </div>
    `;

    // Get reference to the SVG element for trend rendering
    if (this.config.trend && this.config.trend.length > 1) {
      this.trendCanvas = this.container.querySelector('.micro-trend');
    }
  }

  private renderChangeIndicator(): string {
    if (this.config.change === undefined || this.config.change === null) {
      return '';
    }

    const change = this.config.change;
    const isPositive = change > 0;
    const isNegative = change < 0;
    const changeClass = isPositive ? 'positive' : isNegative ? 'negative' : 'neutral';
    const arrow = isPositive ? '↑' : isNegative ? '↓' : '→';
    const formattedChange = Math.abs(change).toFixed(1);

    return `
      <div class="stat-card-change stat-card-change--${changeClass}">
        <span class="stat-card-arrow" aria-hidden="true">${arrow}</span>
        <span class="stat-card-change-value">${formattedChange}%</span>
        <span class="sr-only">${isPositive ? 'increased' : isNegative ? 'decreased' : 'unchanged'} by ${formattedChange} percent</span>
      </div>
    `;
  }

  private renderMicroTrend(data: number[]): void {
    if (!this.trendCanvas || data.length < 2) return;

    // Clear existing content
    const existingPath = this.trendCanvas.querySelector('.trend-line');
    const existingArea = this.trendCanvas.querySelector('.trend-area');
    if (existingPath) existingPath.remove();
    if (existingArea) existingArea.remove();

    // Calculate points
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const points: Array<[number, number]> = [];

    data.forEach((value, index) => {
      const x = (index / (data.length - 1)) * 100;
      const y = 32 - ((value - min) / range) * 28; // Leave 2px padding top and bottom
      points.push([x, y]);
    });

    // Create path string
    const pathData = points
      .map((point, index) => {
        const command = index === 0 ? 'M' : 'L';
        return `${command} ${point[0].toFixed(2)} ${point[1].toFixed(2)}`;
      })
      .join(' ');

    // Create area path (filled area under the line)
    const areaData = pathData + ` L 100 32 L 0 32 Z`;

    // Create SVG elements
    const area = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    area.setAttribute('class', 'trend-area');
    area.setAttribute('d', areaData);
    area.setAttribute('fill', `url(#trend-gradient-${this.config.title.replace(/\s+/g, '-')})`);

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('class', 'trend-line');
    path.setAttribute('d', pathData);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', `var(--color-${this.config.color})`);
    path.setAttribute('stroke-width', '2');
    path.setAttribute('vector-effect', 'non-scaling-stroke');

    // Add animated drawing effect
    const pathLength = path.getTotalLength();
    path.style.strokeDasharray = `${pathLength}`;
    path.style.strokeDashoffset = `${pathLength}`;

    // Append elements
    this.trendCanvas.appendChild(area);
    this.trendCanvas.appendChild(path);

    // Trigger animation
    requestAnimationFrame(() => {
      path.style.transition = 'stroke-dashoffset 500ms ease-in-out';
      path.style.strokeDashoffset = '0';
    });

    // Add dots for data points if there are fewer than 10 points
    if (data.length <= 10) {
      points.forEach((point, index) => {
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', point[0].toString());
        circle.setAttribute('cy', point[1].toString());
        circle.setAttribute('r', '2');
        circle.setAttribute('fill', `var(--color-${this.config.color})`);
        circle.setAttribute('class', 'trend-dot');
        circle.style.opacity = '0';
        circle.style.transition = `opacity 200ms ease-in-out ${500 + index * 50}ms`;
        this.trendCanvas!.appendChild(circle);

        requestAnimationFrame(() => {
          circle.style.opacity = '1';
        });
      });
    }
  }

  private formatValue(value: string | number): string {
    if (typeof value === 'number') {
      // Format large numbers with K/M/B suffixes
      if (value >= 1e9) {
        return (value / 1e9).toFixed(1) + 'B';
      } else if (value >= 1e6) {
        return (value / 1e6).toFixed(1) + 'M';
      } else if (value >= 1e3) {
        return (value / 1e3).toFixed(1) + 'K';
      }
      return value.toLocaleString();
    }
    return value.toString();
  }

  private attachEventListeners(): void {
    if (this.config.onClick) {
      const card = this.container.querySelector('.stat-card') as HTMLElement;
      if (card) {
        card.style.cursor = 'pointer';
        card.addEventListener('click', () => {
          this.config.onClick!();
        });

        // Keyboard support
        card.addEventListener('keydown', (e: KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            this.config.onClick!();
          }
        });
      }
    }
  }

  public update(data: StatCardUpdateData): void {
    // Update value
    if (data.value !== undefined) {
      const numberEl = this.container.querySelector('.stat-card-number');
      if (numberEl) {
        const oldValue = numberEl.textContent;
        const newValue = this.formatValue(data.value);

        if (oldValue !== newValue) {
          // Animate the value change
          numberEl.classList.add('updating');
          setTimeout(() => {
            numberEl.textContent = newValue;
            numberEl.classList.remove('updating');
          }, 150);
        }
      }
    }

    // Update change indicator
    if (data.change !== undefined) {
      this.config.change = data.change;
      const changeContainer = this.container.querySelector('.stat-card-body');
      if (changeContainer) {
        const existingChange = changeContainer.querySelector('.stat-card-change');
        if (existingChange) {
          existingChange.remove();
        }
        changeContainer.insertAdjacentHTML('beforeend', this.renderChangeIndicator());
      }
    }

    // Update trend
    if (data.trend && data.trend.length > 1) {
      this.config.trend = data.trend;
      this.renderMicroTrend(data.trend);
    }
  }

  public destroy(): void {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
    this.container.innerHTML = '';
  }
}

// Factory function for easy instantiation
export function createStatCard(config: StatCardConfig): StatCard {
  return new StatCard(config);
}

// Add component styles
const styles = `
.stat-card {
  position: relative;
  background: var(--color-surface);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-md);
  padding: var(--spacing-lg);
  transition: all var(--transition-base);
  height: 100%;
  display: flex;
  flex-direction: column;
}

.stat-card:hover {
  box-shadow: var(--elevation-e1);
}

.stat-card[tabindex="0"]:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
  border-color: var(--color-primary);
}

.stat-card-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-md);
}

.stat-card-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: var(--radius-sm);
  background: var(--color-surface-container);
  color: var(--color-text-secondary);
  flex-shrink: 0;
}

.stat-card--primary .stat-card-icon {
  background: var(--color-primary);
  color: var(--color-text-on-primary);
  opacity: 0.9;
}

.stat-card--success .stat-card-icon {
  background: var(--color-success);
  color: var(--color-text-on-primary);
  opacity: 0.9;
}

.stat-card--warning .stat-card-icon {
  background: var(--color-warning);
  color: var(--color-text-on-primary);
  opacity: 0.9;
}

.stat-card--error .stat-card-icon {
  background: var(--color-error);
  color: var(--color-text-on-primary);
  opacity: 0.9;
}

.stat-card--info .stat-card-icon {
  background: var(--color-info);
  color: var(--color-text-on-primary);
  opacity: 0.9;
}

.stat-card-title {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.025em;
}

.stat-card-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.stat-card-value {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
  line-height: 1.2;
}

.stat-card-number {
  transition: all var(--transition-base);
}

.stat-card-number.updating {
  opacity: 0.5;
  transform: scale(0.95);
}

.stat-card-change {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-xs);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  padding: 2px 6px;
  border-radius: var(--radius-sm);
}

.stat-card-change--positive {
  color: var(--color-success);
  background: var(--color-success);
  background-opacity: 0.1;
}

.stat-card-change--negative {
  color: var(--color-error);
  background: var(--color-error);
  background-opacity: 0.1;
}

.stat-card-change--neutral {
  color: var(--color-text-secondary);
}

.stat-card-arrow {
  font-size: var(--font-size-base);
}

.stat-card-trend {
  margin-top: var(--spacing-md);
  height: 32px;
  width: 100%;
}

.micro-trend {
  width: 100%;
  height: 100%;
  display: block;
}

.trend-line {
  stroke-linecap: round;
  stroke-linejoin: round;
}

.trend-area {
  opacity: 0.3;
}

.trend-dot {
  transition: opacity var(--transition-base);
}

/* Screen reader only text */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* Dark mode adjustments */
[data-theme="dark"] .stat-card {
  background: var(--color-surface-variant);
}

[data-theme="dark"] .stat-card-icon {
  background: var(--color-surface-container);
}

[data-theme="dark"] .stat-card--primary .stat-card-icon,
[data-theme="dark"] .stat-card--success .stat-card-icon,
[data-theme="dark"] .stat-card--warning .stat-card-icon,
[data-theme="dark"] .stat-card--error .stat-card-icon,
[data-theme="dark"] .stat-card--info .stat-card-icon {
  opacity: 0.8;
}

/* Density adjustments */
[data-density="compact"] .stat-card {
  padding: var(--spacing-md);
}

[data-density="compact"] .stat-card-value {
  font-size: var(--font-size-xl);
}

[data-density="compact"] .stat-card-trend {
  height: 24px;
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .stat-card,
  .stat-card-number,
  .trend-line,
  .trend-dot {
    transition: none !important;
  }
}
`;

// Inject styles if not already present
if (!document.getElementById('stat-card-styles')) {
  const styleSheet = document.createElement('style');
  styleSheet.id = 'stat-card-styles';
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}