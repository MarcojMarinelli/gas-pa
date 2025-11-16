/**
 * Drawer component - Side panel overlay with focus trap and accessibility
 * Supports left, right, top, and bottom positions
 */

import {
  FocusTrap,
  InertManager,
  overlayStack,
  generateOverlayId,
  handleEscapeKey,
  prefersReducedMotion,
  announceToScreenReader
} from '../core/overlay-utils';

export interface DrawerConfig {
  position?: 'left' | 'right' | 'top' | 'bottom';
  width?: string; // For left/right drawers
  height?: string; // For top/bottom drawers
  closeOnEscape?: boolean;
  closeOnBackdropClick?: boolean;
  showBackdrop?: boolean;
  animate?: boolean;
  ariaLabel?: string;
  ariaDescribedBy?: string;
  onOpen?: () => void;
  onClose?: () => void;
  onBeforeOpen?: () => boolean | Promise<boolean>; // Return false to cancel
  onBeforeClose?: () => boolean | Promise<boolean>; // Return false to cancel
}

export class Drawer {
  private id: string;
  private config: Required<DrawerConfig>;
  private element: HTMLElement | null = null;
  private backdrop: HTMLElement | null = null;
  private focusTrap: FocusTrap | null = null;
  private inertManager: InertManager | null = null;
  private isOpen = false;
  private isTransitioning = false;
  private escapeHandler: ((e: KeyboardEvent) => void) | null = null;

  constructor(config: DrawerConfig = {}) {
    this.id = generateOverlayId('drawer');
    this.config = {
      position: config.position || 'left',
      width: config.width || '320px',
      height: config.height || '50vh',
      closeOnEscape: config.closeOnEscape !== false,
      closeOnBackdropClick: config.closeOnBackdropClick !== false,
      showBackdrop: config.showBackdrop !== false,
      animate: config.animate !== false && !prefersReducedMotion(),
      ariaLabel: config.ariaLabel || 'Drawer',
      ariaDescribedBy: config.ariaDescribedBy || '',
      onOpen: config.onOpen || (() => {}),
      onClose: config.onClose || (() => {}),
      onBeforeOpen: config.onBeforeOpen || (() => true),
      onBeforeClose: config.onBeforeClose || (() => true)
    };
  }

  async open(content?: string | HTMLElement): Promise<void> {
    if (this.isOpen || this.isTransitioning) return;

    // Call before open hook
    const shouldOpen = await this.config.onBeforeOpen();
    if (!shouldOpen) return;

    this.isTransitioning = true;

    // Create drawer structure
    this.createElement();

    // Set content if provided
    if (content) {
      this.setContent(content);
    }

    // Add to DOM
    document.body.appendChild(this.element!);
    if (this.backdrop) {
      document.body.appendChild(this.backdrop);
    }

    // Register with overlay stack
    overlayStack.push(this.id);

    // Setup focus trap and inert
    this.focusTrap = new FocusTrap(this.element!);
    this.inertManager = new InertManager();
    this.inertManager.makeInert(this.element!);

    // Add escape handler
    if (this.config.closeOnEscape) {
      this.escapeHandler = handleEscapeKey(() => this.close());
      document.addEventListener('keydown', this.escapeHandler);
    }

    // Force reflow before animation
    this.element!.offsetHeight;

    // Animate in
    requestAnimationFrame(() => {
      if (this.element) {
        this.element.classList.add('drawer--open');
        this.element.setAttribute('aria-hidden', 'false');
      }
      if (this.backdrop) {
        this.backdrop.classList.add('drawer-backdrop--visible');
      }
    });

    // Activate focus trap after animation
    setTimeout(() => {
      this.focusTrap?.activate();
      this.isOpen = true;
      this.isTransitioning = false;
      this.config.onOpen();
      announceToScreenReader(`${this.config.ariaLabel} opened`);
    }, this.config.animate ? 300 : 0);
  }

  async close(): Promise<void> {
    if (!this.isOpen || this.isTransitioning) return;

    // Call before close hook
    const shouldClose = await this.config.onBeforeClose();
    if (!shouldClose) return;

    this.isTransitioning = true;

    // Deactivate focus trap
    this.focusTrap?.deactivate();
    this.focusTrap = null;

    // Restore inert
    this.inertManager?.restoreInert();
    this.inertManager = null;

    // Remove escape handler
    if (this.escapeHandler) {
      document.removeEventListener('keydown', this.escapeHandler);
      this.escapeHandler = null;
    }

    // Animate out
    if (this.element) {
      this.element.classList.remove('drawer--open');
      this.element.setAttribute('aria-hidden', 'true');
    }
    if (this.backdrop) {
      this.backdrop.classList.remove('drawer-backdrop--visible');
    }

    // Remove from DOM after animation
    setTimeout(() => {
      if (this.element?.parentNode) {
        this.element.parentNode.removeChild(this.element);
      }
      if (this.backdrop?.parentNode) {
        this.backdrop.parentNode.removeChild(this.backdrop);
      }
      this.element = null;
      this.backdrop = null;

      // Unregister from overlay stack
      overlayStack.pop(this.id);

      this.isOpen = false;
      this.isTransitioning = false;
      this.config.onClose();
      announceToScreenReader(`${this.config.ariaLabel} closed`);
    }, this.config.animate ? 300 : 0);
  }

  setContent(content: string | HTMLElement): void {
    if (!this.element) return;

    const contentEl = this.element.querySelector('.drawer__content');
    if (!contentEl) return;

    if (typeof content === 'string') {
      contentEl.innerHTML = content;
    } else {
      contentEl.innerHTML = '';
      contentEl.appendChild(content);
    }
  }

  isVisible(): boolean {
    return this.isOpen;
  }

  destroy(): void {
    if (this.isOpen) {
      this.close();
    }
  }

  private createElement(): void {
    // Create drawer element
    this.element = document.createElement('div');
    this.element.id = this.id;
    this.element.className = `drawer drawer--${this.config.position}`;
    this.element.setAttribute('role', 'dialog');
    this.element.setAttribute('aria-modal', 'true');
    this.element.setAttribute('aria-label', this.config.ariaLabel);
    this.element.setAttribute('aria-hidden', 'true');

    if (this.config.ariaDescribedBy) {
      this.element.setAttribute('aria-describedby', this.config.ariaDescribedBy);
    }

    // Set size based on position
    if (this.config.position === 'left' || this.config.position === 'right') {
      this.element.style.width = this.config.width;
    } else {
      this.element.style.height = this.config.height;
    }

    // Create drawer structure
    this.element.innerHTML = `
      <div class="drawer__header">
        <h2 class="drawer__title">${this.config.ariaLabel}</h2>
        <button
          class="drawer__close"
          type="button"
          aria-label="Close drawer"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>
      <div class="drawer__content"></div>
    `;

    // Add close button handler
    const closeBtn = this.element.querySelector('.drawer__close') as HTMLButtonElement;
    closeBtn.addEventListener('click', () => this.close());

    // Create backdrop if needed
    if (this.config.showBackdrop) {
      this.backdrop = document.createElement('div');
      this.backdrop.className = 'drawer-backdrop';
      this.backdrop.setAttribute('aria-hidden', 'true');

      if (this.config.closeOnBackdropClick) {
        this.backdrop.addEventListener('click', () => this.close());
      }
    }

    // Add styles if not already present
    this.injectStyles();
  }

  private injectStyles(): void {
    if (document.getElementById('drawer-styles')) return;

    const style = document.createElement('style');
    style.id = 'drawer-styles';
    style.textContent = `
      .drawer {
        position: fixed;
        background: var(--color-surface);
        box-shadow: var(--elevation-e4);
        display: flex;
        flex-direction: column;
        z-index: var(--z-modal);
        transition: transform var(--transition-slow);
        transform-origin: center;
        overflow: hidden;
      }

      .drawer--left {
        top: 0;
        left: 0;
        bottom: 0;
        transform: translateX(-100%);
        border-right: 1px solid var(--color-border);
      }

      .drawer--right {
        top: 0;
        right: 0;
        bottom: 0;
        transform: translateX(100%);
        border-left: 1px solid var(--color-border);
      }

      .drawer--top {
        top: 0;
        left: 0;
        right: 0;
        transform: translateY(-100%);
        border-bottom: 1px solid var(--color-border);
      }

      .drawer--bottom {
        bottom: 0;
        left: 0;
        right: 0;
        transform: translateY(100%);
        border-top: 1px solid var(--color-border);
      }

      .drawer--open {
        transform: translate(0, 0);
      }

      .drawer__header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: var(--spacing-md);
        border-bottom: 1px solid var(--color-border);
        flex-shrink: 0;
      }

      .drawer__title {
        margin: 0;
        font-size: var(--font-size-lg);
        font-weight: var(--font-weight-medium);
        color: var(--color-text-primary);
      }

      .drawer__close {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        padding: 0;
        background: transparent;
        border: none;
        border-radius: var(--radius-sm);
        color: var(--color-text-secondary);
        cursor: pointer;
        transition: background-color var(--transition-fast);
      }

      .drawer__close:hover {
        background-color: var(--color-surface-container);
      }

      .drawer__close:focus-visible {
        outline: none;
        box-shadow: var(--focus-ring);
      }

      .drawer__content {
        flex: 1;
        overflow-y: auto;
        padding: var(--spacing-md);
      }

      .drawer-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        z-index: calc(var(--z-modal) - 1);
        opacity: 0;
        transition: opacity var(--transition-base);
      }

      .drawer-backdrop--visible {
        opacity: 1;
      }

      @media (prefers-reduced-motion: reduce) {
        .drawer,
        .drawer-backdrop {
          transition: none;
        }
      }
    `;
    document.head.appendChild(style);
  }
}

/**
 * Factory function for quick drawer creation
 */
export function createDrawer(config?: DrawerConfig): Drawer {
  return new Drawer(config);
}