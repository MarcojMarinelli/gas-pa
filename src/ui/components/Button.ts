/**
 * Button Component
 * Implements Material Design 3 button patterns with accessibility
 */

export interface ButtonConfig {
  variant?: 'primary' | 'tonal' | 'outlined' | 'text' | 'danger';
  size?: 'small' | 'medium' | 'large';
  icon?: string; // Material Symbol icon name
  iconPosition?: 'leading' | 'trailing';
  loading?: boolean;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  ariaLabel?: string;
  ariaPressed?: boolean;
  ariaExpanded?: boolean;
  onClick?: (e: Event) => void;
  className?: string;
  id?: string;
}

export class Button {
  private container: HTMLElement;
  private config: Required<ButtonConfig>;
  private buttonEl: HTMLButtonElement | null = null;
  private clickHandler: ((e: Event) => void) | null = null;

  constructor(container: string | HTMLElement, config: ButtonConfig = {}) {
    this.container = typeof container === 'string'
      ? document.querySelector(container)!
      : container;

    if (!this.container) {
      throw new Error('Button container not found');
    }

    // Set defaults
    this.config = {
      variant: config.variant || 'primary',
      size: config.size || 'medium',
      icon: config.icon || '',
      iconPosition: config.iconPosition || 'leading',
      loading: config.loading || false,
      disabled: config.disabled || false,
      type: config.type || 'button',
      ariaLabel: config.ariaLabel || '',
      ariaPressed: config.ariaPressed ?? undefined,
      ariaExpanded: config.ariaExpanded ?? undefined,
      onClick: config.onClick || (() => {}),
      className: config.className || '',
      id: config.id || ''
    } as Required<ButtonConfig>;

    this.render();
    this.attachEventListeners();
  }

  private render(): void {
    const {
      variant,
      size,
      icon,
      iconPosition,
      loading,
      disabled,
      type,
      ariaLabel,
      ariaPressed,
      ariaExpanded,
      className,
      id
    } = this.config;

    const buttonClasses = [
      'btn',
      `btn--${variant}`,
      `btn--${size}`,
      loading && 'btn--loading',
      disabled && 'btn--disabled',
      icon && !this.container.textContent?.trim() && 'btn--icon-only',
      className
    ].filter(Boolean).join(' ');

    const iconHtml = icon ? `
      <span class="material-symbols-outlined" aria-hidden="true">
        ${loading ? 'progress_activity' : icon}
      </span>
    ` : '';

    const contentHtml = this.container.innerHTML || this.container.textContent || '';

    const buttonContent = iconPosition === 'trailing'
      ? `${contentHtml}${iconHtml}`
      : `${iconHtml}${contentHtml}`;

    const button = document.createElement('button');
    button.type = type as 'button' | 'submit' | 'reset';
    button.className = buttonClasses;
    button.innerHTML = buttonContent;
    button.disabled = disabled || loading;

    if (id) button.id = id;
    if (ariaLabel) button.setAttribute('aria-label', ariaLabel);
    if (loading) button.setAttribute('aria-busy', 'true');
    if (typeof ariaPressed === 'boolean') {
      button.setAttribute('aria-pressed', String(ariaPressed));
    }
    if (typeof ariaExpanded === 'boolean') {
      button.setAttribute('aria-expanded', String(ariaExpanded));
    }

    // Clear container and add button
    this.container.innerHTML = '';
    this.container.appendChild(button);
    this.buttonEl = button;
  }

  private attachEventListeners(): void {
    if (!this.buttonEl) return;

    // Remove old listener if exists
    if (this.clickHandler) {
      this.buttonEl.removeEventListener('click', this.clickHandler);
    }

    // Add click handler
    this.clickHandler = (e: Event) => {
      if (!this.config.disabled && !this.config.loading) {
        this.config.onClick(e);
      }
    };
    this.buttonEl.addEventListener('click', this.clickHandler);

    // Add keyboard support for space key (Enter is automatic)
    this.buttonEl.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === ' ' && !this.config.disabled && !this.config.loading) {
        e.preventDefault();
        this.buttonEl?.click();
      }
    });
  }

  // Public methods

  public setLoading(loading: boolean): void {
    this.config.loading = loading;
    this.render();
    this.attachEventListeners();
  }

  public setDisabled(disabled: boolean): void {
    this.config.disabled = disabled;
    if (this.buttonEl) {
      this.buttonEl.disabled = disabled;
    }
  }

  public setPressed(pressed: boolean): void {
    this.config.ariaPressed = pressed;
    if (this.buttonEl) {
      this.buttonEl.setAttribute('aria-pressed', String(pressed));
    }
  }

  public setExpanded(expanded: boolean): void {
    this.config.ariaExpanded = expanded;
    if (this.buttonEl) {
      this.buttonEl.setAttribute('aria-expanded', String(expanded));
    }
  }

  public focus(): void {
    this.buttonEl?.focus();
  }

  public blur(): void {
    this.buttonEl?.blur();
  }

  public destroy(): void {
    if (this.buttonEl && this.clickHandler) {
      this.buttonEl.removeEventListener('click', this.clickHandler);
    }
    this.container.innerHTML = '';
  }
}

// CSS for buttons (to be added to styles/components.css)
export const buttonStyles = `
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 1px solid transparent;
  border-radius: 10px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: background-color 200ms cubic-bezier(0.2, 0, 0, 1),
              box-shadow 200ms cubic-bezier(0.2, 0, 0, 1),
              transform 200ms cubic-bezier(0.2, 0, 0, 1);
  position: relative;
  overflow: hidden;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}

/* Focus states */
.btn:focus-visible {
  outline: 2px solid var(--focus-ring-color, #3b82f6);
  outline-offset: 2px;
}

/* Size variants */
.btn--small {
  padding: 6px 12px;
  font-size: 13px;
  min-height: 32px;
}

.btn--medium {
  padding: 8px 16px;
  font-size: 14px;
  min-height: 40px;
}

.btn--large {
  padding: 12px 24px;
  font-size: 16px;
  min-height: 48px;
}

/* Primary variant */
.btn--primary {
  background-color: var(--color-primary-500, #3b82f6);
  color: white;
  box-shadow: var(--elev-1, 0 1px 2px rgba(0, 0, 0, 0.06));
}

.btn--primary:hover:not(:disabled) {
  background-color: var(--color-primary-600, #2563eb);
  box-shadow: var(--elev-2, 0 4px 8px rgba(0, 0, 0, 0.08));
  transform: translateY(-1px);
}

.btn--primary:active:not(:disabled) {
  background-color: var(--color-primary-700, #1d4ed8);
  transform: translateY(0);
}

/* Tonal variant */
.btn--tonal {
  background-color: color-mix(in oklab, var(--color-primary-500, #3b82f6) 12%, transparent);
  color: var(--color-primary-700, #1d4ed8);
}

.btn--tonal:hover:not(:disabled) {
  background-color: color-mix(in oklab, var(--color-primary-500, #3b82f6) 16%, transparent);
}

.btn--tonal:active:not(:disabled) {
  background-color: color-mix(in oklab, var(--color-primary-500, #3b82f6) 20%, transparent);
}

/* Outlined variant */
.btn--outlined {
  background-color: transparent;
  color: var(--color-primary-600, #2563eb);
  border-color: var(--border-subtle, rgba(0, 0, 0, 0.12));
}

.btn--outlined:hover:not(:disabled) {
  background-color: color-mix(in oklab, var(--color-primary-500, #3b82f6) 8%, transparent);
  border-color: var(--color-primary-500, #3b82f6);
}

/* Text variant */
.btn--text {
  background-color: transparent;
  color: var(--color-primary-600, #2563eb);
  padding: 8px 12px;
}

.btn--text:hover:not(:disabled) {
  background-color: color-mix(in oklab, var(--color-primary-500, #3b82f6) 8%, transparent);
}

/* Danger variant */
.btn--danger {
  background-color: var(--color-error, #dc2626);
  color: white;
}

.btn--danger:hover:not(:disabled) {
  background-color: var(--color-error-dark, #b91c1c);
}

/* Disabled state */
.btn:disabled,
.btn--disabled {
  opacity: var(--opacity-disabled, 0.45);
  cursor: not-allowed;
  pointer-events: none;
}

/* Loading state */
.btn--loading {
  pointer-events: none;
  color: transparent;
}

.btn--loading .material-symbols-outlined {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  animation: spin 1s linear infinite;
  color: currentColor;
}

/* Icon-only button */
.btn--icon-only {
  padding: 8px;
  min-width: 40px;
}

/* Animations */
@keyframes spin {
  from { transform: translate(-50%, -50%) rotate(0deg); }
  to { transform: translate(-50%, -50%) rotate(360deg); }
}

/* Dark mode adjustments */
[data-theme="dark"] .btn--tonal {
  background-color: color-mix(in oklab, var(--color-primary-400, #60a5fa) 20%, transparent);
  color: var(--color-primary-300, #93bbfc);
}

[data-theme="dark"] .btn--outlined {
  border-color: var(--border-subtle, rgba(255, 255, 255, 0.12));
  color: var(--color-primary-400, #60a5fa);
}

[data-theme="dark"] .btn--text {
  color: var(--color-primary-400, #60a5fa);
}

/* Touch targets (minimum 44x44px for accessibility) */
@media (pointer: coarse) {
  .btn {
    min-width: 44px;
    min-height: 44px;
  }
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .btn {
    transition: none;
  }

  .btn--loading .material-symbols-outlined {
    animation: none;
  }
}
`;