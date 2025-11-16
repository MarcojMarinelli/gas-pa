/**
 * Card Component
 * Material Design 3 card with elevation and interaction
 */

export interface CardConfig {
  elevation?: 0 | 1 | 2 | 3 | 4;
  hoverable?: boolean;
  clickable?: boolean;
  selected?: boolean;
  header?: string | HTMLElement;
  headerIcon?: string;
  headerAction?: HTMLElement;
  content?: string | HTMLElement;
  footer?: string | HTMLElement;
  padding?: 'none' | 'small' | 'medium' | 'large';
  onClick?: (e: Event) => void;
  onSelect?: (selected: boolean) => void;
  className?: string;
  id?: string;
  ariaLabel?: string;
  ariaExpanded?: boolean;
}

export class Card {
  private container: HTMLElement;
  private config: CardConfig;
  private cardEl: HTMLElement | null = null;
  private selected: boolean = false;
  private clickHandler: ((e: Event) => void) | null = null;

  constructor(container: string | HTMLElement, config: CardConfig = {}) {
    this.container = typeof container === 'string'
      ? document.querySelector(container)!
      : container;

    if (!this.container) {
      throw new Error('Card container not found');
    }

    this.config = {
      elevation: config.elevation ?? 1,
      hoverable: config.hoverable ?? false,
      clickable: config.clickable ?? false,
      selected: config.selected ?? false,
      padding: config.padding ?? 'medium',
      ...config
    };

    this.selected = this.config.selected || false;
    this.render();
    this.attachEventListeners();
  }

  private render(): void {
    const {
      elevation,
      hoverable,
      clickable,
      selected,
      header,
      headerIcon,
      headerAction,
      content,
      footer,
      padding,
      className = '',
      id,
      ariaLabel,
      ariaExpanded
    } = this.config;

    // Build class names
    const cardClasses = [
      'card',
      `card--elevation-${elevation}`,
      `card--padding-${padding}`,
      hoverable && 'card--hoverable',
      clickable && 'card--clickable',
      selected && 'card--selected',
      className
    ].filter(Boolean).join(' ');

    // Determine if card should be interactive
    const isInteractive = clickable || selected !== undefined;
    const role = isInteractive ? 'button' : undefined;
    const tabIndex = isInteractive ? 0 : undefined;

    // Build header HTML
    const headerHtml = header ? `
      <div class="card__header">
        ${headerIcon ? `
          <span class="card__header-icon material-symbols-outlined" aria-hidden="true">
            ${headerIcon}
          </span>
        ` : ''}
        <div class="card__header-content">
          ${typeof header === 'string' ? header : ''}
        </div>
        ${headerAction ? `
          <div class="card__header-action">
            ${typeof headerAction === 'string' ? headerAction : ''}
          </div>
        ` : ''}
      </div>
    ` : '';

    // Build content HTML
    const contentHtml = content ? `
      <div class="card__content">
        ${typeof content === 'string' ? content : ''}
      </div>
    ` : '';

    // Build footer HTML
    const footerHtml = footer ? `
      <div class="card__footer">
        ${typeof footer === 'string' ? footer : ''}
      </div>
    ` : '';

    // Build complete card
    const cardElement = document.createElement('div');
    cardElement.className = cardClasses;
    if (id) cardElement.id = id;
    if (role) cardElement.setAttribute('role', role);
    if (tabIndex !== undefined) cardElement.setAttribute('tabindex', tabIndex.toString());
    if (ariaLabel) cardElement.setAttribute('aria-label', ariaLabel);
    if (selected !== undefined) cardElement.setAttribute('aria-selected', String(selected));
    if (ariaExpanded !== undefined) cardElement.setAttribute('aria-expanded', String(ariaExpanded));

    cardElement.innerHTML = headerHtml + contentHtml + footerHtml;

    // Handle HTMLElement content
    if (typeof header === 'object' && header instanceof HTMLElement) {
      const headerContent = cardElement.querySelector('.card__header-content');
      if (headerContent) {
        headerContent.innerHTML = '';
        headerContent.appendChild(header);
      }
    }

    if (typeof headerAction === 'object' && headerAction instanceof HTMLElement) {
      const actionEl = cardElement.querySelector('.card__header-action');
      if (actionEl) {
        actionEl.innerHTML = '';
        actionEl.appendChild(headerAction);
      }
    }

    if (typeof content === 'object' && content instanceof HTMLElement) {
      const contentEl = cardElement.querySelector('.card__content');
      if (contentEl) {
        contentEl.innerHTML = '';
        contentEl.appendChild(content);
      }
    }

    if (typeof footer === 'object' && footer instanceof HTMLElement) {
      const footerEl = cardElement.querySelector('.card__footer');
      if (footerEl) {
        footerEl.innerHTML = '';
        footerEl.appendChild(footer);
      }
    }

    // Clear container and add card
    this.container.innerHTML = '';
    this.container.appendChild(cardElement);
    this.cardEl = cardElement;
  }

  private attachEventListeners(): void {
    if (!this.cardEl) return;

    const { clickable, onClick, onSelect } = this.config;

    // Remove old listener if exists
    if (this.clickHandler) {
      this.cardEl.removeEventListener('click', this.clickHandler);
    }

    // Add click handler
    if (clickable || onSelect) {
      this.clickHandler = (e: Event) => {
        // If clicking on an internal button or link, don't trigger card click
        const target = e.target as HTMLElement;
        if (target.tagName === 'BUTTON' || target.tagName === 'A' || target.closest('button, a')) {
          return;
        }

        if (onSelect) {
          this.setSelected(!this.selected);
          onSelect(this.selected);
        }

        if (onClick) {
          onClick(e);
        }
      };

      this.cardEl.addEventListener('click', this.clickHandler);
    }

    // Add keyboard support
    if (clickable || onSelect) {
      this.cardEl.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.cardEl?.click();
        }
      });
    }

    // Prevent card click when clicking on header action
    const headerAction = this.cardEl.querySelector('.card__header-action');
    if (headerAction) {
      headerAction.addEventListener('click', (e) => {
        e.stopPropagation();
      });
    }
  }

  // Public methods

  public setElevation(elevation: 0 | 1 | 2 | 3 | 4): void {
    if (this.cardEl) {
      // Remove old elevation class
      for (let i = 0; i <= 4; i++) {
        this.cardEl.classList.remove(`card--elevation-${i}`);
      }
      // Add new elevation class
      this.cardEl.classList.add(`card--elevation-${elevation}`);
    }
  }

  public setSelected(selected: boolean): void {
    this.selected = selected;
    if (this.cardEl) {
      if (selected) {
        this.cardEl.classList.add('card--selected');
        this.cardEl.setAttribute('aria-selected', 'true');
      } else {
        this.cardEl.classList.remove('card--selected');
        this.cardEl.setAttribute('aria-selected', 'false');
      }
    }
  }

  public setExpanded(expanded: boolean): void {
    if (this.cardEl) {
      this.cardEl.setAttribute('aria-expanded', String(expanded));
    }
  }

  public isSelected(): boolean {
    return this.selected;
  }

  public focus(): void {
    this.cardEl?.focus();
  }

  public blur(): void {
    this.cardEl?.blur();
  }

  public destroy(): void {
    if (this.cardEl && this.clickHandler) {
      this.cardEl.removeEventListener('click', this.clickHandler);
    }
    this.container.innerHTML = '';
  }
}

// CSS for cards (to be added to styles/components.css)
export const cardStyles = `
.card {
  position: relative;
  background: var(--surface-0, #ffffff);
  border-radius: 12px;
  transition: box-shadow 200ms cubic-bezier(0.2, 0, 0, 1),
              transform 200ms cubic-bezier(0.2, 0, 0, 1);
}

/* Elevation levels */
.card--elevation-0 {
  box-shadow: none;
  border: 1px solid var(--border-subtle, rgba(0, 0, 0, 0.08));
}

.card--elevation-1 {
  box-shadow: var(--elev-1, 0 1px 2px rgba(0, 0, 0, 0.06));
}

.card--elevation-2 {
  box-shadow: var(--elev-2, 0 4px 8px rgba(0, 0, 0, 0.08));
}

.card--elevation-3 {
  box-shadow: var(--elev-3, 0 8px 16px rgba(0, 0, 0, 0.10));
}

.card--elevation-4 {
  box-shadow: var(--elev-4, 0 12px 24px rgba(0, 0, 0, 0.12));
}

/* Padding variants */
.card--padding-none {
  padding: 0;
}

.card--padding-small {
  padding: 12px;
}

.card--padding-medium {
  padding: 16px;
}

.card--padding-large {
  padding: 24px;
}

/* Interactive states */
.card--hoverable:hover {
  box-shadow: var(--elev-2, 0 4px 8px rgba(0, 0, 0, 0.08));
  transform: translateY(-1px);
}

.card--clickable {
  cursor: pointer;
  user-select: none;
}

.card--clickable:active {
  transform: scale(0.99);
}

.card--clickable:focus-visible {
  outline: 2px solid var(--focus-ring-color, #3b82f6);
  outline-offset: 2px;
}

/* Selected state */
.card--selected {
  background: var(--state-selected, rgba(102, 126, 234, 0.14));
  border: 2px solid var(--color-primary-500, #3b82f6);
  padding: calc(var(--card-padding, 16px) - 1px); /* Adjust for border */
}

/* Header */
.card__header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.card--padding-none .card__header {
  padding: 16px;
  margin-bottom: 0;
}

.card__header-icon {
  flex-shrink: 0;
  font-size: 24px;
  color: var(--on-surface-med, rgba(17, 24, 39, 0.7));
}

.card__header-content {
  flex: 1;
  font-size: 16px;
  font-weight: 600;
  color: var(--on-surface-high, #111827);
}

.card__header-action {
  flex-shrink: 0;
}

/* Content */
.card__content {
  color: var(--on-surface-high, #111827);
  font-size: 14px;
  line-height: 1.5;
}

.card--padding-none .card__content {
  padding: 0 16px 16px;
}

.card__header + .card__content {
  margin-top: 0;
}

/* Footer */
.card__footer {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid var(--border-subtle, rgba(0, 0, 0, 0.08));
}

.card--padding-none .card__footer {
  margin-top: 0;
  padding: 16px;
  border-top: 1px solid var(--border-subtle, rgba(0, 0, 0, 0.08));
}

/* Dark mode adjustments */
[data-theme="dark"] .card {
  background: var(--surface-1, #0b1220);
}

[data-theme="dark"] .card--elevation-0 {
  border-color: var(--border-subtle, rgba(255, 255, 255, 0.08));
}

[data-theme="dark"] .card--elevation-1 {
  box-shadow: var(--elev-1, 0 1px 3px rgba(0, 0, 0, 0.4));
}

[data-theme="dark"] .card--elevation-2 {
  box-shadow: var(--elev-2, 0 4px 8px rgba(0, 0, 0, 0.5));
}

[data-theme="dark"] .card--elevation-3 {
  box-shadow: var(--elev-3, 0 8px 16px rgba(0, 0, 0, 0.6));
}

[data-theme="dark"] .card--elevation-4 {
  box-shadow: var(--elev-4, 0 12px 24px rgba(0, 0, 0, 0.7));
}

[data-theme="dark"] .card--selected {
  background: var(--state-selected, rgba(102, 126, 234, 0.25));
  border-color: var(--color-primary-400, #60a5fa);
}

[data-theme="dark"] .card__footer {
  border-top-color: var(--border-subtle, rgba(255, 255, 255, 0.08));
}

/* Density adjustments */
[data-density="compact"] .card--padding-small {
  padding: 8px;
}

[data-density="compact"] .card--padding-medium {
  padding: 12px;
}

[data-density="compact"] .card--padding-large {
  padding: 16px;
}

[data-density="comfortable"] .card--padding-small {
  padding: 16px;
}

[data-density="comfortable"] .card--padding-medium {
  padding: 20px;
}

[data-density="comfortable"] .card--padding-large {
  padding: 28px;
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .card {
    transition: none;
  }
}

/* Responsive */
@media (max-width: 640px) {
  .card--padding-large {
    padding: 16px;
  }

  .card__header {
    flex-wrap: wrap;
  }

  .card__header-action {
    width: 100%;
    margin-top: 8px;
  }
}
`;