/**
 * Modal component - Centered overlay dialog with focus trap and accessibility
 * Supports different sizes and content types
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

export interface ModalConfig {
  size?: 'small' | 'medium' | 'large' | 'fullscreen';
  title?: string;
  closeButton?: boolean;
  closeOnEscape?: boolean;
  closeOnBackdropClick?: boolean;
  showBackdrop?: boolean;
  animate?: boolean;
  ariaLabel?: string;
  ariaDescribedBy?: string;
  footer?: string | HTMLElement;
  maxWidth?: string;
  maxHeight?: string;
  onOpen?: () => void;
  onClose?: () => void;
  onBeforeOpen?: () => boolean | Promise<boolean>;
  onBeforeClose?: () => boolean | Promise<boolean>;
}

export class Modal {
  private id: string;
  private config: Required<Omit<ModalConfig, 'footer' | 'maxWidth' | 'maxHeight'>> & Pick<ModalConfig, 'footer' | 'maxWidth' | 'maxHeight'>;
  private element: HTMLElement | null = null;
  private backdrop: HTMLElement | null = null;
  private focusTrap: FocusTrap | null = null;
  private inertManager: InertManager | null = null;
  private isOpen = false;
  private isTransitioning = false;
  private escapeHandler: ((e: KeyboardEvent) => void) | null = null;

  constructor(config: ModalConfig = {}) {
    this.id = generateOverlayId('modal');
    this.config = {
      size: config.size || 'medium',
      title: config.title || '',
      closeButton: config.closeButton !== false,
      closeOnEscape: config.closeOnEscape !== false,
      closeOnBackdropClick: config.closeOnBackdropClick !== false,
      showBackdrop: config.showBackdrop !== false,
      animate: config.animate !== false && !prefersReducedMotion(),
      ariaLabel: config.ariaLabel || config.title || 'Modal dialog',
      ariaDescribedBy: config.ariaDescribedBy || '',
      footer: config.footer,
      maxWidth: config.maxWidth,
      maxHeight: config.maxHeight,
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

    // Create modal structure
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
        this.element.classList.add('modal--open');
        this.element.setAttribute('aria-hidden', 'false');
      }
      if (this.backdrop) {
        this.backdrop.classList.add('modal-backdrop--visible');
      }
    });

    // Activate focus trap after animation
    setTimeout(() => {
      this.focusTrap?.activate();
      this.isOpen = true;
      this.isTransitioning = false;
      this.config.onOpen();
      announceToScreenReader(`${this.config.ariaLabel} opened`);
    }, this.config.animate ? 200 : 0);
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
      this.element.classList.remove('modal--open');
      this.element.setAttribute('aria-hidden', 'true');
    }
    if (this.backdrop) {
      this.backdrop.classList.remove('modal-backdrop--visible');
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
    }, this.config.animate ? 200 : 0);
  }

  setContent(content: string | HTMLElement): void {
    if (!this.element) return;

    const contentEl = this.element.querySelector('.modal__body');
    if (!contentEl) return;

    if (typeof content === 'string') {
      contentEl.innerHTML = content;
    } else {
      contentEl.innerHTML = '';
      contentEl.appendChild(content);
    }
  }

  setFooter(footer: string | HTMLElement): void {
    if (!this.element) return;

    let footerEl = this.element.querySelector('.modal__footer');

    if (!footerEl && footer) {
      // Create footer if it doesn't exist
      footerEl = document.createElement('div');
      footerEl.className = 'modal__footer';
      const content = this.element.querySelector('.modal__content');
      content?.appendChild(footerEl);
    }

    if (footerEl) {
      if (!footer) {
        // Remove footer if no content
        footerEl.remove();
      } else if (typeof footer === 'string') {
        footerEl.innerHTML = footer;
      } else {
        footerEl.innerHTML = '';
        footerEl.appendChild(footer);
      }
    }
  }

  setTitle(title: string): void {
    if (!this.element) return;

    const titleEl = this.element.querySelector('.modal__title');
    if (titleEl) {
      titleEl.textContent = title;
    }

    this.config.title = title;
    this.element.setAttribute('aria-label', title || this.config.ariaLabel);
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
    // Create modal element
    this.element = document.createElement('div');
    this.element.id = this.id;
    this.element.className = `modal modal--${this.config.size}`;
    this.element.setAttribute('role', 'dialog');
    this.element.setAttribute('aria-modal', 'true');
    this.element.setAttribute('aria-label', this.config.ariaLabel);
    this.element.setAttribute('aria-hidden', 'true');

    if (this.config.ariaDescribedBy) {
      this.element.setAttribute('aria-describedby', this.config.ariaDescribedBy);
    }

    // Build modal HTML
    const headerHTML = this.config.title || this.config.closeButton ? `
      <div class="modal__header">
        ${this.config.title ? `<h2 class="modal__title">${this.config.title}</h2>` : ''}
        ${this.config.closeButton ? `
          <button
            class="modal__close"
            type="button"
            aria-label="Close modal"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        ` : ''}
      </div>
    ` : '';

    const footerHTML = this.config.footer ? `
      <div class="modal__footer">
        ${typeof this.config.footer === 'string' ? this.config.footer : ''}
      </div>
    ` : '';

    this.element.innerHTML = `
      <div class="modal__content" ${this.config.maxWidth ? `style="max-width: ${this.config.maxWidth}"` : ''}>
        ${headerHTML}
        <div class="modal__body" ${this.config.maxHeight ? `style="max-height: ${this.config.maxHeight}; overflow-y: auto;"` : ''}></div>
        ${footerHTML}
      </div>
    `;

    // Add close button handler
    if (this.config.closeButton) {
      const closeBtn = this.element.querySelector('.modal__close') as HTMLButtonElement;
      closeBtn?.addEventListener('click', () => this.close());
    }

    // Handle footer element if provided
    if (this.config.footer && typeof this.config.footer !== 'string') {
      const footerEl = this.element.querySelector('.modal__footer');
      if (footerEl) {
        footerEl.innerHTML = '';
        footerEl.appendChild(this.config.footer);
      }
    }

    // Create backdrop if needed
    if (this.config.showBackdrop) {
      this.backdrop = document.createElement('div');
      this.backdrop.className = 'modal-backdrop';
      this.backdrop.setAttribute('aria-hidden', 'true');

      if (this.config.closeOnBackdropClick) {
        this.backdrop.addEventListener('click', () => this.close());
      }
    }

    // Add styles if not already present
    this.injectStyles();
  }

  private injectStyles(): void {
    if (document.getElementById('modal-styles')) return;

    const style = document.createElement('style');
    style.id = 'modal-styles';
    style.textContent = `
      .modal {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: var(--z-modal);
        padding: var(--spacing-lg);
        pointer-events: none;
      }

      .modal__content {
        position: relative;
        background: var(--color-surface);
        border-radius: var(--radius-md);
        box-shadow: var(--elevation-e5);
        display: flex;
        flex-direction: column;
        max-height: calc(100vh - var(--spacing-2xl));
        max-width: 100%;
        opacity: 0;
        transform: scale(0.9) translateY(20px);
        transition: opacity var(--transition-base), transform var(--transition-base);
        pointer-events: auto;
      }

      .modal--open .modal__content {
        opacity: 1;
        transform: scale(1) translateY(0);
      }

      /* Size variants */
      .modal--small .modal__content {
        width: 400px;
      }

      .modal--medium .modal__content {
        width: 560px;
      }

      .modal--large .modal__content {
        width: 720px;
      }

      .modal--fullscreen .modal__content {
        width: calc(100vw - var(--spacing-2xl));
        height: calc(100vh - var(--spacing-2xl));
        max-height: none;
      }

      .modal__header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: var(--spacing-lg);
        border-bottom: 1px solid var(--color-border);
        flex-shrink: 0;
      }

      .modal__title {
        margin: 0;
        font-size: var(--font-size-xl);
        font-weight: var(--font-weight-medium);
        color: var(--color-text-primary);
        line-height: var(--line-height-tight);
      }

      .modal__close {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        padding: 0;
        margin-left: var(--spacing-md);
        background: transparent;
        border: none;
        border-radius: var(--radius-sm);
        color: var(--color-text-secondary);
        cursor: pointer;
        transition: background-color var(--transition-fast);
      }

      .modal__close:hover {
        background-color: var(--color-surface-container);
      }

      .modal__close:focus-visible {
        outline: none;
        box-shadow: var(--focus-ring);
      }

      .modal__body {
        flex: 1;
        padding: var(--spacing-lg);
        overflow-y: auto;
      }

      .modal__footer {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: var(--spacing-sm);
        padding: var(--spacing-md) var(--spacing-lg);
        border-top: 1px solid var(--color-border);
        flex-shrink: 0;
      }

      .modal-backdrop {
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

      .modal-backdrop--visible {
        opacity: 1;
      }

      /* Responsive */
      @media (max-width: 640px) {
        .modal {
          padding: var(--spacing-md);
        }

        .modal__content {
          width: 100%;
        }

        .modal--fullscreen .modal__content {
          width: 100vw;
          height: 100vh;
          max-width: none;
          border-radius: 0;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .modal__content,
        .modal-backdrop {
          transition: none;
        }
      }
    `;
    document.head.appendChild(style);
  }
}

/**
 * Factory function for quick modal creation
 */
export function createModal(config?: ModalConfig): Modal {
  return new Modal(config);
}

/**
 * Confirm dialog helper
 */
export async function confirm(options: {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmButtonClass?: string;
  size?: ModalConfig['size'];
}): Promise<boolean> {
  return new Promise(resolve => {
    const modal = new Modal({
      title: options.title || 'Confirm',
      size: options.size || 'small',
      closeOnEscape: false,
      closeOnBackdropClick: false
    });

    const footer = document.createElement('div');
    footer.style.display = 'flex';
    footer.style.gap = 'var(--spacing-sm)';
    footer.innerHTML = `
      <button class="btn btn--secondary" data-action="cancel">
        ${options.cancelText || 'Cancel'}
      </button>
      <button class="btn btn--primary ${options.confirmButtonClass || ''}" data-action="confirm">
        ${options.confirmText || 'Confirm'}
      </button>
    `;

    footer.querySelector('[data-action="cancel"]')?.addEventListener('click', () => {
      modal.close();
      resolve(false);
    });

    footer.querySelector('[data-action="confirm"]')?.addEventListener('click', () => {
      modal.close();
      resolve(true);
    });

    modal.setContent(options.message);
    modal.setFooter(footer);
    modal.open();
  });
}

/**
 * Alert dialog helper
 */
export async function alert(options: {
  title?: string;
  message: string;
  buttonText?: string;
  size?: ModalConfig['size'];
}): Promise<void> {
  return new Promise(resolve => {
    const modal = new Modal({
      title: options.title || 'Alert',
      size: options.size || 'small',
      closeOnEscape: true,
      closeOnBackdropClick: false
    });

    const footer = document.createElement('div');
    footer.innerHTML = `
      <button class="btn btn--primary" data-action="ok">
        ${options.buttonText || 'OK'}
      </button>
    `;

    footer.querySelector('[data-action="ok"]')?.addEventListener('click', () => {
      modal.close();
      resolve();
    });

    modal.setContent(options.message);
    modal.setFooter(footer);
    modal.open();
  });
}