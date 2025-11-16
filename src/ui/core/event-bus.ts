/**
 * Event Bus
 * Simple pub/sub system for component communication
 */

export type EventHandler<T = any> = (data: T) => void | Promise<void>;
export type UnsubscribeFn = () => void;

interface EventSubscription {
  handler: EventHandler;
  once: boolean;
  context?: any;
}

/**
 * Common event types used throughout the application
 */
export const EventTypes = {
  // UI Events
  THEME_CHANGED: 'theme:changed',
  DENSITY_CHANGED: 'density:changed',
  SIDEBAR_TOGGLED: 'sidebar:toggled',
  ROUTE_CHANGED: 'route:changed',

  // Data Events
  DATA_LOADED: 'data:loaded',
  DATA_UPDATED: 'data:updated',
  DATA_ERROR: 'data:error',

  // Email Events
  EMAIL_PROCESSED: 'email:processed',
  EMAIL_SELECTED: 'email:selected',
  EMAIL_ARCHIVED: 'email:archived',
  EMAIL_DELETED: 'email:deleted',

  // Queue Events
  QUEUE_UPDATED: 'queue:updated',
  QUEUE_FILTERED: 'queue:filtered',
  QUEUE_SORTED: 'queue:sorted',
  QUEUE_BULK_ACTION: 'queue:bulk-action',

  // Notification Events
  TOAST_SHOW: 'toast:show',
  TOAST_HIDE: 'toast:hide',
  MODAL_OPEN: 'modal:open',
  MODAL_CLOSE: 'modal:close',
  DRAWER_OPEN: 'drawer:open',
  DRAWER_CLOSE: 'drawer:close',

  // Command Palette Events
  COMMAND_EXECUTE: 'command:execute',
  COMMAND_PALETTE_OPEN: 'command-palette:open',
  COMMAND_PALETTE_CLOSE: 'command-palette:close',

  // Error Events
  ERROR_OCCURRED: 'error:occurred',
  ERROR_CLEARED: 'error:cleared',

  // Network Events
  ONLINE: 'network:online',
  OFFLINE: 'network:offline',
  API_REQUEST_START: 'api:request:start',
  API_REQUEST_END: 'api:request:end',
  API_REQUEST_ERROR: 'api:request:error'
} as const;

export type EventType = typeof EventTypes[keyof typeof EventTypes] | string;

class EventBus {
  private static instance: EventBus;
  private events: Map<EventType, Set<EventSubscription>> = new Map();
  private eventHistory: Array<{ type: EventType; data: any; timestamp: number }> = [];
  private maxHistorySize: number = 50;
  private debug: boolean = false;

  private constructor() {
    // Listen for network status changes
    window.addEventListener('online', () => this.emit(EventTypes.ONLINE));
    window.addEventListener('offline', () => this.emit(EventTypes.OFFLINE));

    // Debug mode from localStorage
    this.debug = localStorage.getItem('gas-pa-debug-events') === 'true';
  }

  static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  /**
   * Subscribe to an event
   */
  on<T = any>(event: EventType, handler: EventHandler<T>, context?: any): UnsubscribeFn {
    this.addSubscription(event, { handler, once: false, context });

    // Return unsubscribe function
    return () => this.off(event, handler);
  }

  /**
   * Subscribe to an event only once
   */
  once<T = any>(event: EventType, handler: EventHandler<T>, context?: any): UnsubscribeFn {
    this.addSubscription(event, { handler, once: true, context });

    // Return unsubscribe function
    return () => this.off(event, handler);
  }

  /**
   * Unsubscribe from an event
   */
  off(event: EventType, handler?: EventHandler): void {
    const subscriptions = this.events.get(event);
    if (!subscriptions) return;

    if (handler) {
      // Remove specific handler
      subscriptions.forEach(sub => {
        if (sub.handler === handler) {
          subscriptions.delete(sub);
        }
      });

      // Clean up empty sets
      if (subscriptions.size === 0) {
        this.events.delete(event);
      }
    } else {
      // Remove all handlers for this event
      this.events.delete(event);
    }
  }

  /**
   * Emit an event
   */
  async emit<T = any>(event: EventType, data?: T): Promise<void> {
    // Log to history
    this.addToHistory(event, data);

    // Debug logging
    if (this.debug) {
      console.log(`[EventBus] ${event}`, data);
    }

    const subscriptions = this.events.get(event);
    if (!subscriptions || subscriptions.size === 0) return;

    // Create a copy to avoid issues with handlers modifying the set
    const handlers = Array.from(subscriptions);

    // Execute handlers
    const promises = handlers.map(async (sub) => {
      try {
        // Bind context if provided
        const boundHandler = sub.context
          ? sub.handler.bind(sub.context)
          : sub.handler;

        await boundHandler(data);

        // Remove if it was a one-time subscription
        if (sub.once) {
          subscriptions.delete(sub);
        }
      } catch (error) {
        console.error(`[EventBus] Error in handler for ${event}:`, error);
        // Emit error event (but avoid infinite loop)
        if (event !== EventTypes.ERROR_OCCURRED) {
          this.emit(EventTypes.ERROR_OCCURRED, {
            originalEvent: event,
            error,
            data
          });
        }
      }
    });

    await Promise.all(promises);

    // Clean up empty sets
    if (subscriptions.size === 0) {
      this.events.delete(event);
    }
  }

  /**
   * Remove all event listeners
   */
  clear(): void {
    this.events.clear();
    this.eventHistory = [];
  }

  /**
   * Get all registered events
   */
  getRegisteredEvents(): EventType[] {
    return Array.from(this.events.keys());
  }

  /**
   * Get subscriber count for an event
   */
  getSubscriberCount(event: EventType): number {
    return this.events.get(event)?.size || 0;
  }

  /**
   * Get event history (for debugging)
   */
  getHistory(): ReadonlyArray<{ type: EventType; data: any; timestamp: number }> {
    return [...this.eventHistory];
  }

  /**
   * Enable/disable debug mode
   */
  setDebug(enabled: boolean): void {
    this.debug = enabled;
    localStorage.setItem('gas-pa-debug-events', String(enabled));
  }

  /**
   * Wait for an event to occur (promise-based)
   */
  waitFor<T = any>(event: EventType, timeout?: number): Promise<T> {
    return new Promise((resolve, reject) => {
      let timeoutId: number | undefined;

      const unsubscribe = this.once<T>(event, (data) => {
        if (timeoutId) clearTimeout(timeoutId);
        resolve(data);
      });

      if (timeout) {
        timeoutId = window.setTimeout(() => {
          unsubscribe();
          reject(new Error(`Timeout waiting for event: ${event}`));
        }, timeout);
      }
    });
  }

  /**
   * Create a typed event emitter for a specific event
   */
  createEmitter<T = any>(event: EventType): (data?: T) => Promise<void> {
    return (data?: T) => this.emit(event, data);
  }

  /**
   * Create a typed event listener for a specific event
   */
  createListener<T = any>(event: EventType): {
    on: (handler: EventHandler<T>, context?: any) => UnsubscribeFn;
    once: (handler: EventHandler<T>, context?: any) => UnsubscribeFn;
  } {
    return {
      on: (handler, context) => this.on(event, handler, context),
      once: (handler, context) => this.once(event, handler, context)
    };
  }

  // Private methods

  private addSubscription(event: EventType, subscription: EventSubscription): void {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }

    this.events.get(event)!.add(subscription);
  }

  private addToHistory(event: EventType, data: any): void {
    this.eventHistory.push({
      type: event,
      data,
      timestamp: Date.now()
    });

    // Trim history if it exceeds max size
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory = this.eventHistory.slice(-this.maxHistorySize);
    }
  }
}

// Export singleton instance
export const eventBus = EventBus.getInstance();

// Export convenient shortcuts
export const on = eventBus.on.bind(eventBus);
export const once = eventBus.once.bind(eventBus);
export const off = eventBus.off.bind(eventBus);
export const emit = eventBus.emit.bind(eventBus);
export const waitFor = eventBus.waitFor.bind(eventBus);

// Example usage in components:
/*

import { eventBus, EventTypes } from './event-bus';

// Subscribe to an event
const unsubscribe = eventBus.on(EventTypes.THEME_CHANGED, (theme) => {
  console.log('Theme changed to:', theme);
});

// Emit an event
eventBus.emit(EventTypes.THEME_CHANGED, 'dark');

// Wait for an event
const data = await eventBus.waitFor(EventTypes.DATA_LOADED, 5000);

// Clean up
unsubscribe();

*/