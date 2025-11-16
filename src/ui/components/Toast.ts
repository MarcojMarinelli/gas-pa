/**
 * Toast component - Non-blocking notification messages with aria-live support
 * Supports different types and positions
 */

import { generateOverlayId, prefersReducedMotion } from '../core/overlay-utils';

export type ToastType = 'info' | 'success' | 'warning' | 'error';
export type ToastPosition = 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';

export interface ToastConfig {
  type?: ToastType;
  position?: ToastPosition;
  duration?: number; // in milliseconds, 0 for no auto-dismiss
  closable?: boolean;
  animate?: boolean;
  icon?: boolean;
  ariaLive?: 'polite' | 'assertive';
  onClose?: () => void;
  className?: string;
}

export interface ToastMessage {
  id: string;
  message: string;
  config: Required<ToastConfig>;
  element?: HTMLElement;
  timer?: number;
}

class ToastManager {
  private static instance: ToastManager;
  private container: HTMLElement | null = null;
  private toasts: Map<string, ToastMessage> = new Map();
  private position: ToastPosition = 'bottom-right';
  private ariaLiveRegion: HTMLElement | null = null;

  private constructor() {
    this.createContainer();
    this.createAriaLiveRegion();
    this.injectStyles();
  }

  static getInstance(): ToastManager {
    if (!ToastManager.instance) {
      ToastManager.instance = new ToastManager();
    }
    return ToastManager.instance;
  }

  show(message: string, config: ToastConfig = {}): string {
    const id = generateOverlayId('toast');
    const fullConfig: Required<ToastConfig> = {
      type: config.type || 'info',
      position: config.position || this.position,
      duration: config.duration !== undefined ? config.duration : 4000,
      closable: config.closable !== false,
      animate: config.animate !== false && !prefersReducedMotion(),
      icon: config.icon !== false,
      ariaLive: config.ariaLive || 'polite',
      onClose: config.onClose || (() => {}),
      className: config.className || ''
    };

    // Update container position if different
    if (fullConfig.position !== this.position) {
      this.updateContainerPosition(fullConfig.position);
    }

    // Create toast message
    const toast: ToastMessage = {
      id,
      message,
      config: fullConfig
    };

    // Create toast element
    const element = this.createElement(toast);
    toast.element = element;

    // Add to container
    if (fullConfig.position.startsWith('bottom')) {
      this.container?.prepend(element);
    } else {
      this.container?.appendChild(element);
    }

    // Store toast
    this.toasts.set(id, toast);

    // Announce to screen readers
    this.announceToScreenReader(message, fullConfig.ariaLive);

    // Trigger animation
    requestAnimationFrame(() => {
      element.classList.add('toast--visible');
    });

    // Set auto-dismiss timer
    if (fullConfig.duration > 0) {
      toast.timer = window.setTimeout(() => {
        this.close(id);
      }, fullConfig.duration);
    }

    return id;
  }

  close(id: string): void {
    const toast = this.toasts.get(id);
    if (!toast || !toast.element) return;

    // Clear timer if exists
    if (toast.timer) {
      clearTimeout(toast.timer);
    }

    // Animate out
    toast.element.classList.remove('toast--visible');

    // Remove after animation
    setTimeout(() => {
      if (toast.element?.parentNode) {
        toast.element.parentNode.removeChild(toast.element);
      }
      this.toasts.delete(id);
      toast.config.onClose();
    }, toast.config.animate ? 300 : 0);
  }

  closeAll(): void {
    this.toasts.forEach((_, id) => this.close(id));
  }

  private createElement(toast: ToastMessage): HTMLElement {
    const element = document.createElement('div');
    element.id = toast.id;
    element.className = `toast toast--${toast.config.type} ${toast.config.className}`.trim();
    element.setAttribute('role', 'status');
    element.setAttribute('aria-live', toast.config.ariaLive);
    element.setAttribute('aria-atomic', 'true');

    // Get icon based on type
    let iconSvg = '';
    if (toast.config.icon) {
      switch (toast.config.type) {
        case 'success':
          iconSvg = `
            <svg class="toast__icon" width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="10" cy="10" r="8"/>
              <path d="M7 10l2 2 4-4"/>
            </svg>
          `;
          break;
        case 'error':
          iconSvg = `
            <svg class="toast__icon" width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="10" cy="10" r="8"/>
              <path d="M12 8l-4 4m0-4l4 4"/>
            </svg>
          `;
          break;
        case 'warning':
          iconSvg = `
            <svg class="toast__icon" width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M10 2L2 18h16L10 2z"/>
              <path d="M10 8v4m0 2h.01"/>
            </svg>
          `;
          break;
        case 'info':
        default:
          iconSvg = `
            <svg class="toast__icon" width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="10" cy="10" r="8"/>
              <path d="M10 14v-4m0-2h.01"/>
            </svg>
          `;
          break;
      }
    }

    element.innerHTML = `
      ${iconSvg}
      <div class="toast__message">${toast.message}</div>
      ${toast.config.closable ? `
        <button
          class="toast__close"
          type="button"
          aria-label="Close notification"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 4L4 12M4 4l8 8"/>
          </svg>
        </button>
      ` : ''}
    `;

    // Add close handler
    if (toast.config.closable) {
      const closeBtn = element.querySelector('.toast__close') as HTMLButtonElement;
      closeBtn?.addEventListener('click', () => this.close(toast.id));
    }

    return element;
  }

  private createContainer(): void {
    if (this.container) return;

    this.container = document.createElement('div');
    this.container.className = 'toast-container';
    this.updateContainerPosition(this.position);
    document.body.appendChild(this.container);
  }

  private updateContainerPosition(position: ToastPosition): void {
    if (!this.container) return;

    this.position = position;
    this.container.className = `toast-container toast-container--${position}`;
  }

  private createAriaLiveRegion(): void {
    if (this.ariaLiveRegion) return;

    // Create a dedicated aria-live region for screen readers
    this.ariaLiveRegion = document.createElement('div');
    this.ariaLiveRegion.className = 'sr-only';
    this.ariaLiveRegion.setAttribute('aria-live', 'polite');
    this.ariaLiveRegion.setAttribute('aria-atomic', 'true');
    this.ariaLiveRegion.style.position = 'absolute';
    this.ariaLiveRegion.style.left = '-10000px';
    this.ariaLiveRegion.style.width = '1px';
    this.ariaLiveRegion.style.height = '1px';
    this.ariaLiveRegion.style.overflow = 'hidden';
    document.body.appendChild(this.ariaLiveRegion);
  }

  private announceToScreenReader(message: string, priority: 'polite' | 'assertive'): void {
    if (!this.ariaLiveRegion) return;

    // Update aria-live priority if needed
    if (this.ariaLiveRegion.getAttribute('aria-live') !== priority) {
      this.ariaLiveRegion.setAttribute('aria-live', priority);
    }

    // Clear and set message
    this.ariaLiveRegion.textContent = '';
    setTimeout(() => {
      if (this.ariaLiveRegion) {
        this.ariaLiveRegion.textContent = message;
      }
    }, 100);
  }

  private injectStyles(): void {
    if (document.getElementById('toast-styles')) return;

    const style = document.createElement('style');
    style.id = 'toast-styles';
    style.textContent = `
      .toast-container {
        position: fixed;
        z-index: var(--z-notification);
        pointer-events: none;
        display: flex;
        flex-direction: column;
        gap: var(--spacing-sm);
        padding: var(--spacing-lg);
      }

      /* Position variants */
      .toast-container--top-left {
        top: 0;
        left: 0;
        align-items: flex-start;
      }

      .toast-container--top-center {
        top: 0;
        left: 50%;
        transform: translateX(-50%);
        align-items: center;
      }

      .toast-container--top-right {
        top: 0;
        right: 0;
        align-items: flex-end;
      }

      .toast-container--bottom-left {
        bottom: 0;
        left: 0;
        align-items: flex-start;
      }

      .toast-container--bottom-center {
        bottom: 0;
        left: 50%;
        transform: translateX(-50%);
        align-items: center;
      }

      .toast-container--bottom-right {
        bottom: 0;
        right: 0;
        align-items: flex-end;
      }

      .toast {
        display: flex;
        align-items: center;
        gap: var(--spacing-sm);
        min-width: 280px;
        max-width: 420px;
        padding: var(--spacing-md);
        background: var(--color-surface);
        border-radius: var(--radius-md);
        box-shadow: var(--elevation-e3);
        border-left: 4px solid;
        opacity: 0;
        transform: translateY(10px);
        transition: opacity var(--transition-base), transform var(--transition-base);
        pointer-events: auto;
      }

      .toast--visible {
        opacity: 1;
        transform: translateY(0);
      }

      /* Type variants */
      .toast--info {
        border-left-color: var(--color-info);
      }

      .toast--success {
        border-left-color: var(--color-success);
      }

      .toast--warning {
        border-left-color: var(--color-warning);
      }

      .toast--error {
        border-left-color: var(--color-error);
      }

      .toast__icon {
        flex-shrink: 0;
        width: 20px;
        height: 20px;
      }

      .toast--info .toast__icon {
        color: var(--color-info);
      }

      .toast--success .toast__icon {
        color: var(--color-success);
      }

      .toast--warning .toast__icon {
        color: var(--color-warning);
      }

      .toast--error .toast__icon {
        color: var(--color-error);
      }

      .toast__message {
        flex: 1;
        font-size: var(--font-size-base);
        line-height: var(--line-height-normal);
        color: var(--color-text-primary);
        word-wrap: break-word;
      }

      .toast__close {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 24px;
        padding: 0;
        background: transparent;
        border: none;
        border-radius: var(--radius-sm);
        color: var(--color-text-secondary);
        cursor: pointer;
        transition: background-color var(--transition-fast);
        flex-shrink: 0;
      }

      .toast__close:hover {
        background-color: var(--color-surface-container);
      }

      .toast__close:focus-visible {
        outline: none;
        box-shadow: var(--focus-ring);
      }

      @media (max-width: 640px) {
        .toast-container {
          padding: var(--spacing-md);
        }

        .toast {
          min-width: auto;
          max-width: calc(100vw - var(--spacing-xl));
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .toast {
          transition: none;
        }
      }

      /* Screen reader only class */
      .sr-only {
        position: absolute;
        left: -10000px;
        width: 1px;
        height: 1px;
        overflow: hidden;
      }
    `;
    document.head.appendChild(style);
  }
}

// Export singleton instance methods
const toastManager = ToastManager.getInstance();

/**
 * Show a toast notification
 */
export function showToast(message: string, config?: ToastConfig): string {
  return toastManager.show(message, config);
}

/**
 * Close a specific toast
 */
export function closeToast(id: string): void {
  toastManager.close(id);
}

/**
 * Close all toasts
 */
export function closeAllToasts(): void {
  toastManager.closeAll();
}

/**
 * Helper functions for common toast types
 */
export const toast = {
  info(message: string, config?: Omit<ToastConfig, 'type'>): string {
    return showToast(message, { ...config, type: 'info' });
  },

  success(message: string, config?: Omit<ToastConfig, 'type'>): string {
    return showToast(message, { ...config, type: 'success' });
  },

  warning(message: string, config?: Omit<ToastConfig, 'type'>): string {
    return showToast(message, { ...config, type: 'warning' });
  },

  error(message: string, config?: Omit<ToastConfig, 'type'>): string {
    return showToast(message, { ...config, type: 'error', ariaLive: 'assertive' });
  },

  /**
   * Show a promise-based toast with loading, success, and error states
   */
  async promise<T>(
    promise: Promise<T>,
    messages: {
      loading?: string;
      success?: string | ((data: T) => string);
      error?: string | ((error: any) => string);
    },
    config?: Omit<ToastConfig, 'type'>
  ): Promise<T> {
    const loadingId = showToast(messages.loading || 'Loading...', {
      ...config,
      type: 'info',
      duration: 0, // Don't auto-dismiss
      closable: false
    });

    try {
      const result = await promise;
      closeToast(loadingId);

      const successMsg = typeof messages.success === 'function'
        ? messages.success(result)
        : messages.success || 'Success!';

      showToast(successMsg, { ...config, type: 'success' });
      return result;
    } catch (error) {
      closeToast(loadingId);

      const errorMsg = typeof messages.error === 'function'
        ? messages.error(error)
        : messages.error || 'An error occurred';

      showToast(errorMsg, { ...config, type: 'error' });
      throw error;
    }
  }
};