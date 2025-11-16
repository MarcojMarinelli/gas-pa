/**
 * Overlay utilities for focus management, scroll locking, and inert content
 * Used by Modal, Drawer, and other overlay components
 */

/**
 * Focus trap manager - ensures focus stays within the overlay
 */
export class FocusTrap {
  private element: HTMLElement;
  private previousFocus: HTMLElement | null = null;
  private handleKeyDown: (e: KeyboardEvent) => void;
  private handleFocusIn: (e: FocusEvent) => void;

  constructor(element: HTMLElement) {
    this.element = element;
    this.handleKeyDown = this.onKeyDown.bind(this);
    this.handleFocusIn = this.onFocusIn.bind(this);
  }

  activate(): void {
    // Store current focus to restore later
    this.previousFocus = document.activeElement as HTMLElement;

    // Add event listeners
    document.addEventListener('keydown', this.handleKeyDown);
    document.addEventListener('focusin', this.handleFocusIn);

    // Focus first focusable element
    const firstFocusable = this.getFocusableElements()[0];
    if (firstFocusable) {
      requestAnimationFrame(() => firstFocusable.focus());
    }
  }

  deactivate(): void {
    // Remove event listeners
    document.removeEventListener('keydown', this.handleKeyDown);
    document.removeEventListener('focusin', this.handleFocusIn);

    // Restore previous focus
    if (this.previousFocus && this.previousFocus.focus) {
      this.previousFocus.focus();
    }
  }

  private getFocusableElements(): HTMLElement[] {
    const selector = [
      'a[href]:not([disabled])',
      'button:not([disabled])',
      'textarea:not([disabled])',
      'input[type="text"]:not([disabled])',
      'input[type="radio"]:not([disabled])',
      'input[type="checkbox"]:not([disabled])',
      'select:not([disabled])',
      '[contenteditable]:not([contenteditable="false"])',
      '[tabindex]:not([tabindex="-1"])'
    ].join(',');

    return Array.from(this.element.querySelectorAll(selector)) as HTMLElement[];
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (e.key !== 'Tab') return;

    const focusables = this.getFocusableElements();
    if (focusables.length === 0) {
      e.preventDefault();
      return;
    }

    const firstFocusable = focusables[0];
    const lastFocusable = focusables[focusables.length - 1];

    // Shift+Tab from first element -> focus last
    if (e.shiftKey && document.activeElement === firstFocusable) {
      e.preventDefault();
      lastFocusable.focus();
    }
    // Tab from last element -> focus first
    else if (!e.shiftKey && document.activeElement === lastFocusable) {
      e.preventDefault();
      firstFocusable.focus();
    }
  }

  private onFocusIn(e: FocusEvent): void {
    // If focus moves outside the trap, bring it back
    if (!this.element.contains(e.target as Node)) {
      e.preventDefault();
      e.stopPropagation();
      const focusables = this.getFocusableElements();
      if (focusables.length > 0) {
        focusables[0].focus();
      }
    }
  }
}

/**
 * Scroll lock manager - prevents body scroll when overlay is open
 */
export class ScrollLock {
  private scrollY = 0;
  private isLocked = false;

  lock(): void {
    if (this.isLocked) return;

    // Store current scroll position
    this.scrollY = window.scrollY;

    // Apply scroll lock styles
    document.body.style.position = 'fixed';
    document.body.style.top = `-${this.scrollY}px`;
    document.body.style.width = '100%';
    document.body.style.overflow = 'hidden';

    this.isLocked = true;
  }

  unlock(): void {
    if (!this.isLocked) return;

    // Remove scroll lock styles
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
    document.body.style.overflow = '';

    // Restore scroll position
    window.scrollTo(0, this.scrollY);

    this.isLocked = false;
  }
}

/**
 * Inert manager - makes background content non-interactive
 */
export class InertManager {
  private inertElements: Set<Element> = new Set();
  private observer: MutationObserver | null = null;

  makeInert(excludeElement: HTMLElement): void {
    // Get all sibling elements and their ancestors
    const root = document.body;
    const children = Array.from(root.children);

    children.forEach(child => {
      if (!excludeElement.contains(child) && child !== excludeElement) {
        // Store original state
        const originalInert = child.getAttribute('inert');
        const originalAriaHidden = child.getAttribute('aria-hidden');

        if (originalInert === null) {
          child.setAttribute('inert', '');
          this.inertElements.add(child);
        }

        if (originalAriaHidden === null) {
          child.setAttribute('aria-hidden', 'true');
        }
      }
    });

    // Watch for new elements being added
    this.observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE &&
              !excludeElement.contains(node) &&
              node !== excludeElement) {
            const element = node as Element;
            element.setAttribute('inert', '');
            element.setAttribute('aria-hidden', 'true');
            this.inertElements.add(element);
          }
        });
      });
    });

    this.observer.observe(root, { childList: true });
  }

  restoreInert(): void {
    // Restore original states
    this.inertElements.forEach(element => {
      element.removeAttribute('inert');
      element.removeAttribute('aria-hidden');
    });
    this.inertElements.clear();

    // Stop observing
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }
}

/**
 * Overlay stack manager - handles multiple overlays
 */
class OverlayStack {
  private stack: Set<string> = new Set();
  private scrollLock = new ScrollLock();

  push(id: string): void {
    const wasEmpty = this.stack.size === 0;
    this.stack.add(id);

    // Lock scroll on first overlay
    if (wasEmpty) {
      this.scrollLock.lock();
    }
  }

  pop(id: string): void {
    this.stack.delete(id);

    // Unlock scroll when no overlays remain
    if (this.stack.size === 0) {
      this.scrollLock.unlock();
    }
  }

  has(id: string): boolean {
    return this.stack.has(id);
  }

  get size(): number {
    return this.stack.size;
  }
}

// Global overlay stack instance
export const overlayStack = new OverlayStack();

/**
 * Generate unique ID for overlays
 */
export function generateOverlayId(prefix: string = 'overlay'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Announce to screen readers
 */
export function announceToScreenReader(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
  const announcement = document.createElement('div');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.style.position = 'absolute';
  announcement.style.left = '-10000px';
  announcement.style.width = '1px';
  announcement.style.height = '1px';
  announcement.style.overflow = 'hidden';

  document.body.appendChild(announcement);
  announcement.textContent = message;

  // Remove after announcement
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}

/**
 * Handle escape key for overlay dismissal
 */
export function handleEscapeKey(callback: () => void): (e: KeyboardEvent) => void {
  return (e: KeyboardEvent) => {
    if (e.key === 'Escape' || e.key === 'Esc') {
      e.preventDefault();
      e.stopPropagation();
      callback();
    }
  };
}

/**
 * Check if user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}