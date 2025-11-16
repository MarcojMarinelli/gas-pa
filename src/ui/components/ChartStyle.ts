/**
 * ChartStyle Component
 * Provides chart styling utilities, color palettes, and visualization tokens
 * Spec: §10.10 Charts
 */

export interface ChartColors {
  primary: string[];
  categorical: string[];
  sequential: string[];
  diverging: string[];
  semantic: {
    success: string;
    warning: string;
    error: string;
    info: string;
    neutral: string;
  };
}

export interface ChartConfig {
  colors?: ChartColors;
  gridLines?: boolean;
  legend?: {
    position: 'top' | 'bottom' | 'left' | 'right' | 'none';
    interactive?: boolean;
  };
  animations?: boolean;
  accessibility?: {
    patterns?: boolean;
    highContrast?: boolean;
    descriptions?: boolean;
  };
}

export interface LegendItem {
  label: string;
  color: string;
  value?: number | string;
  active?: boolean;
}

/**
 * Get chart colors based on current theme
 */
export function getChartColors(): ChartColors {
  const theme = document.documentElement.getAttribute('data-theme') || 'light';
  const isLight = theme === 'light';

  return {
    primary: [
      isLight ? '#1a73e8' : '#8ab4f8',
      isLight ? '#ea4335' : '#f28b82',
      isLight ? '#fbbc04' : '#fdd663',
      isLight ? '#34a853' : '#81c995',
      isLight ? '#673ab7' : '#af8ed6',
      isLight ? '#ff6d00' : '#ffab70'
    ],
    categorical: [
      isLight ? '#1a73e8' : '#8ab4f8',
      isLight ? '#d33b27' : '#f28b82',
      isLight ? '#0b8043' : '#81c995',
      isLight ? '#ea8600' : '#fdd663',
      isLight ? '#7627bb' : '#af8ed6',
      isLight ? '#12b5cb' : '#78d9ec',
      isLight ? '#e52592' : '#ff8bcb',
      isLight ? '#f538a0' : '#ffa1d4'
    ],
    sequential: [
      isLight ? '#e8f0fe' : '#1f2937',
      isLight ? '#c2dfff' : '#374151',
      isLight ? '#8ab4f8' : '#4b5563',
      isLight ? '#4285f4' : '#6b7280',
      isLight ? '#1a73e8' : '#9ca3af',
      isLight ? '#1967d2' : '#d1d5db',
      isLight ? '#174ea6' : '#e5e7eb',
      isLight ? '#0d47a1' : '#f3f4f6'
    ],
    diverging: [
      isLight ? '#b31412' : '#fca5a5',
      isLight ? '#ea4335' : '#f87171',
      isLight ? '#ff8a80' : '#ef4444',
      isLight ? '#ffcdd2' : '#dc2626',
      isLight ? '#f5f5f5' : '#4b5563',
      isLight ? '#c8e6c9' : '#065f46',
      isLight ? '#66bb6a' : '#10b981',
      isLight ? '#0b8043' : '#34d399',
      isLight ? '#004d40' : '#6ee7b7'
    ],
    semantic: {
      success: isLight ? '#1e8e3e' : '#81c995',
      warning: isLight ? '#ea8600' : '#fdd663',
      error: isLight ? '#d93025' : '#f28b82',
      info: isLight ? '#1a73e8' : '#8ab4f8',
      neutral: isLight ? '#5f6368' : '#9aa0a6'
    }
  };
}

/**
 * Create an interactive legend for charts
 */
export class ChartLegend {
  private container: HTMLElement;
  private items: LegendItem[];
  private onToggle?: (item: LegendItem, index: number) => void;
  private position: 'top' | 'bottom' | 'left' | 'right';

  constructor(
    container: HTMLElement,
    items: LegendItem[],
    options?: {
      position?: 'top' | 'bottom' | 'left' | 'right';
      interactive?: boolean;
      onToggle?: (item: LegendItem, index: number) => void;
    }
  ) {
    this.container = container;
    this.items = items;
    this.position = options?.position || 'bottom';
    this.onToggle = options?.onToggle;

    this.render(options?.interactive !== false);
  }

  private render(interactive: boolean): void {
    const legendClass = `chart-legend chart-legend--${this.position}`;
    const itemsHtml = this.items
      .map((item, index) => {
        const activeClass = item.active === false ? 'chart-legend-item--inactive' : '';
        const tabIndex = interactive ? '0' : '-1';
        const role = interactive ? 'checkbox' : 'presentation';
        const ariaChecked = interactive ? (item.active !== false).toString() : undefined;

        return `
          <div class="chart-legend-item ${activeClass}"
               data-index="${index}"
               tabindex="${tabIndex}"
               role="${role}"
               ${ariaChecked ? `aria-checked="${ariaChecked}"` : ''}
               aria-label="${item.label}${item.value ? `: ${item.value}` : ''}">
            <span class="chart-legend-color" style="background: ${item.color}"></span>
            <span class="chart-legend-label">${item.label}</span>
            ${item.value !== undefined ? `<span class="chart-legend-value">${item.value}</span>` : ''}
          </div>
        `;
      })
      .join('');

    this.container.innerHTML = `
      <div class="${legendClass}" role="group" aria-label="Chart legend">
        ${itemsHtml}
      </div>
    `;

    if (interactive) {
      this.attachEventListeners();
    }
  }

  private attachEventListeners(): void {
    const legend = this.container.querySelector('.chart-legend');
    if (!legend) return;

    legend.addEventListener('click', (e) => {
      const item = (e.target as HTMLElement).closest('.chart-legend-item') as HTMLElement;
      if (item) {
        const index = parseInt(item.dataset.index || '0', 10);
        this.toggleItem(index);
      }
    });

    legend.addEventListener('keydown', (e) => {
      const item = (e.target as HTMLElement).closest('.chart-legend-item') as HTMLElement;
      if (!item) return;

      const index = parseInt(item.dataset.index || '0', 10);

      switch (e.key) {
        case 'Enter':
        case ' ':
          e.preventDefault();
          this.toggleItem(index);
          break;
        case 'ArrowRight':
        case 'ArrowDown':
          e.preventDefault();
          this.focusItem((index + 1) % this.items.length);
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          e.preventDefault();
          this.focusItem(index === 0 ? this.items.length - 1 : index - 1);
          break;
      }
    });
  }

  private toggleItem(index: number): void {
    const item = this.items[index];
    if (!item) return;

    item.active = item.active === false;

    // Update visual state
    const itemEl = this.container.querySelector(`[data-index="${index}"]`);
    if (itemEl) {
      itemEl.classList.toggle('chart-legend-item--inactive');
      itemEl.setAttribute('aria-checked', item.active.toString());
    }

    // Call callback
    if (this.onToggle) {
      this.onToggle(item, index);
    }
  }

  private focusItem(index: number): void {
    const item = this.container.querySelector(`[data-index="${index}"]`) as HTMLElement;
    if (item) {
      item.focus();
    }
  }

  public update(items: LegendItem[]): void {
    this.items = items;
    this.render(true);
  }

  public destroy(): void {
    this.container.innerHTML = '';
  }
}

/**
 * Generate accessible patterns for charts (for color-blind users)
 */
export function generateChartPatterns(): string {
  return `
    <defs>
      <!-- Diagonal stripes -->
      <pattern id="chart-pattern-stripes" patternUnits="userSpaceOnUse" width="4" height="4">
        <path d="M 0,4 l 4,-4 M -1,1 l 2,-2 M 3,5 l 2,-2" stroke="currentColor" stroke-width="1" opacity="0.5"/>
      </pattern>

      <!-- Dots -->
      <pattern id="chart-pattern-dots" patternUnits="userSpaceOnUse" width="6" height="6">
        <circle cx="3" cy="3" r="1" fill="currentColor" opacity="0.5"/>
      </pattern>

      <!-- Horizontal lines -->
      <pattern id="chart-pattern-lines-h" patternUnits="userSpaceOnUse" width="4" height="4">
        <line x1="0" y1="2" x2="4" y2="2" stroke="currentColor" stroke-width="1" opacity="0.5"/>
      </pattern>

      <!-- Vertical lines -->
      <pattern id="chart-pattern-lines-v" patternUnits="userSpaceOnUse" width="4" height="4">
        <line x1="2" y1="0" x2="2" y2="4" stroke="currentColor" stroke-width="1" opacity="0.5"/>
      </pattern>

      <!-- Grid -->
      <pattern id="chart-pattern-grid" patternUnits="userSpaceOnUse" width="6" height="6">
        <path d="M 6,0 L 0,0 L 0,6" fill="none" stroke="currentColor" stroke-width="1" opacity="0.5"/>
      </pattern>

      <!-- Crosshatch -->
      <pattern id="chart-pattern-cross" patternUnits="userSpaceOnUse" width="6" height="6">
        <path d="M 0,0 L 6,6 M 6,0 L 0,6" stroke="currentColor" stroke-width="1" opacity="0.5"/>
      </pattern>
    </defs>
  `;
}

/**
 * Format values for chart display
 */
export function formatChartValue(
  value: number,
  type: 'number' | 'percentage' | 'currency' | 'duration' = 'number',
  options?: {
    decimals?: number;
    compact?: boolean;
    currency?: string;
  }
): string {
  const decimals = options?.decimals ?? 0;
  const compact = options?.compact ?? true;

  switch (type) {
    case 'percentage':
      return `${(value * 100).toFixed(decimals)}%`;

    case 'currency':
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: options?.currency || 'USD',
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      }).format(value);

    case 'duration':
      if (value < 60) return `${value}s`;
      if (value < 3600) return `${Math.floor(value / 60)}m`;
      return `${Math.floor(value / 3600)}h`;

    case 'number':
    default:
      if (compact && value >= 1000) {
        if (value >= 1e9) return `${(value / 1e9).toFixed(decimals)}B`;
        if (value >= 1e6) return `${(value / 1e6).toFixed(decimals)}M`;
        if (value >= 1e3) return `${(value / 1e3).toFixed(decimals)}K`;
      }
      return value.toFixed(decimals);
  }
}

/**
 * Apply chart-specific CSS variables and styles
 */
export function applyChartStyles(): void {
  if (!document.getElementById('chart-styles')) {
    const styles = `
      /* Chart Visualization Tokens */
      :root {
        --chart-grid-color: var(--color-border-subtle);
        --chart-axis-color: var(--color-text-secondary);
        --chart-label-size: var(--font-size-xs);
        --chart-tooltip-bg: var(--color-surface-container-highest);
        --chart-tooltip-shadow: var(--elevation-e3);
      }

      /* Chart Legend Styles */
      .chart-legend {
        display: flex;
        flex-wrap: wrap;
        gap: var(--spacing-md);
        padding: var(--spacing-md) 0;
      }

      .chart-legend--top {
        padding-bottom: var(--spacing-lg);
      }

      .chart-legend--bottom {
        padding-top: var(--spacing-lg);
      }

      .chart-legend--left,
      .chart-legend--right {
        flex-direction: column;
        gap: var(--spacing-sm);
      }

      .chart-legend-item {
        display: inline-flex;
        align-items: center;
        gap: var(--spacing-sm);
        cursor: pointer;
        user-select: none;
        padding: var(--spacing-xs) var(--spacing-sm);
        border-radius: var(--radius-sm);
        transition: all var(--transition-fast);
      }

      .chart-legend-item:hover {
        background: var(--color-surface-container);
      }

      .chart-legend-item:focus-visible {
        outline: none;
        box-shadow: var(--focus-ring);
      }

      .chart-legend-item--inactive {
        opacity: 0.4;
      }

      .chart-legend-color {
        width: 16px;
        height: 16px;
        border-radius: var(--radius-sm);
        border: 1px solid var(--color-border-subtle);
        flex-shrink: 0;
      }

      .chart-legend-label {
        font-size: var(--font-size-sm);
        color: var(--color-text-primary);
        font-weight: var(--font-weight-medium);
      }

      .chart-legend-value {
        font-size: var(--font-size-sm);
        color: var(--color-text-secondary);
        margin-left: var(--spacing-xs);
      }

      /* Chart Grid Styles */
      .chart-grid-line {
        stroke: var(--chart-grid-color);
        stroke-width: 1;
        stroke-dasharray: 2 2;
      }

      .chart-axis-line {
        stroke: var(--chart-axis-color);
        stroke-width: 2;
      }

      .chart-axis-label {
        fill: var(--chart-axis-color);
        font-size: var(--chart-label-size);
        font-family: var(--font-family);
      }

      /* Chart Tooltip */
      .chart-tooltip {
        position: absolute;
        background: var(--chart-tooltip-bg);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-sm);
        padding: var(--spacing-sm) var(--spacing-md);
        box-shadow: var(--chart-tooltip-shadow);
        pointer-events: none;
        z-index: var(--z-tooltip);
        font-size: var(--font-size-sm);
        color: var(--color-text-primary);
        white-space: nowrap;
      }

      .chart-tooltip-title {
        font-weight: var(--font-weight-medium);
        margin-bottom: var(--spacing-xs);
        color: var(--color-text-secondary);
      }

      .chart-tooltip-value {
        display: flex;
        align-items: center;
        gap: var(--spacing-sm);
      }

      .chart-tooltip-color {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        flex-shrink: 0;
      }

      /* Dark mode adjustments */
      [data-theme="dark"] .chart-tooltip {
        background: var(--color-surface-container);
      }

      /* High contrast mode */
      @media (prefers-contrast: high) {
        .chart-legend-color {
          border-width: 2px;
        }

        .chart-grid-line {
          stroke-width: 2;
        }
      }

      /* Reduced motion */
      @media (prefers-reduced-motion: reduce) {
        .chart-legend-item {
          transition: none;
        }
      }
    `;

    const styleSheet = document.createElement('style');
    styleSheet.id = 'chart-styles';
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);
  }
}

/**
 * Create a tooltip element for charts
 */
export function createChartTooltip(
  content: {
    title?: string;
    values: Array<{
      label: string;
      value: string;
      color?: string;
    }>;
  },
  position: { x: number; y: number }
): HTMLElement {
  const tooltip = document.createElement('div');
  tooltip.className = 'chart-tooltip';
  tooltip.style.left = `${position.x}px`;
  tooltip.style.top = `${position.y}px`;

  const titleHtml = content.title
    ? `<div class="chart-tooltip-title">${content.title}</div>`
    : '';

  const valuesHtml = content.values
    .map(item => `
      <div class="chart-tooltip-value">
        ${item.color ? `<span class="chart-tooltip-color" style="background: ${item.color}"></span>` : ''}
        <span>${item.label}: <strong>${item.value}</strong></span>
      </div>
    `)
    .join('');

  tooltip.innerHTML = titleHtml + valuesHtml;
  return tooltip;
}

/**
 * Generate a unique chart ID
 */
export function generateChartId(prefix = 'chart'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Export default configuration
export const defaultChartConfig: ChartConfig = {
  colors: getChartColors(),
  gridLines: true,
  legend: {
    position: 'bottom',
    interactive: true
  },
  animations: !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  accessibility: {
    patterns: false,
    highContrast: window.matchMedia('(prefers-contrast: high)').matches,
    descriptions: true
  }
};