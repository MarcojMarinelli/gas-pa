/**
 * Client-side state management with localStorage persistence
 *
 * Provides a centralized store for UI state with automatic persistence
 * to localStorage. Supports optional server sync via host adapter.
 */

export type Theme = 'light' | 'dark' | 'system';
export type Density = 'compact' | 'comfortable';
export type ViewMode = 'list' | 'grid' | 'timeline';

interface UIPreferences {
  theme: Theme;
  density: Density;
  sidebarCollapsed: boolean;
  viewMode: ViewMode;
  selectedLabels: string[];
  sortOrder: 'date' | 'sender' | 'subject';
  sortDirection: 'asc' | 'desc';
  lastSyncTime?: number;
}

interface StoreState {
  preferences: UIPreferences;
  ephemeral: {
    loading: boolean;
    error: string | null;
    selectedEmails: string[];
    searchQuery: string;
    currentPage: number;
    itemsPerPage: number;
  };
}

type StateListener = (state: StoreState) => void;
type PreferenceListener = (preferences: UIPreferences) => void;

class Store {
  private static instance: Store;
  private state: StoreState;
  private listeners: Set<StateListener> = new Set();
  private preferenceListeners: Set<PreferenceListener> = new Set();
  private storageKey = 'gas-pa-ui-preferences';
  private syncPending = false;
  private syncTimeout?: number;

  private constructor() {
    // Initialize with defaults
    this.state = {
      preferences: this.loadPreferences(),
      ephemeral: {
        loading: false,
        error: null,
        selectedEmails: [],
        searchQuery: '',
        currentPage: 1,
        itemsPerPage: 50
      }
    };

    // Listen for storage changes from other tabs/windows
    window.addEventListener('storage', this.handleStorageChange.bind(this));

    // Listen for system theme changes
    if (window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      mediaQuery.addEventListener('change', () => {
        if (this.state.preferences.theme === 'system') {
          this.notifyListeners();
        }
      });
    }
  }

  static getInstance(): Store {
    if (!Store.instance) {
      Store.instance = new Store();
    }
    return Store.instance;
  }

  // State getters
  getState(): Readonly<StoreState> {
    return { ...this.state };
  }

  getPreferences(): Readonly<UIPreferences> {
    return { ...this.state.preferences };
  }

  getEphemeral() {
    return { ...this.state.ephemeral };
  }

  // State setters with automatic persistence
  updatePreferences(updates: Partial<UIPreferences>): void {
    this.state.preferences = {
      ...this.state.preferences,
      ...updates
    };

    this.savePreferences();
    this.notifyPreferenceListeners();
    this.notifyListeners();

    // Schedule server sync if enabled
    this.scheduleSyncToServer();
  }

  updateEphemeral(updates: Partial<StoreState['ephemeral']>): void {
    this.state.ephemeral = {
      ...this.state.ephemeral,
      ...updates
    };

    this.notifyListeners();
  }

  // Theme helpers
  getActiveTheme(): 'light' | 'dark' {
    const { theme } = this.state.preferences;

    if (theme === 'system') {
      return window.matchMedia?.('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
    }

    return theme;
  }

  applyTheme(): void {
    const activeTheme = this.getActiveTheme();
    document.documentElement.setAttribute('data-theme', activeTheme);

    // Apply density class
    document.documentElement.setAttribute('data-density', this.state.preferences.density);
  }

  // Persistence methods
  private loadPreferences(): UIPreferences {
    const defaults: UIPreferences = {
      theme: 'system',
      density: 'comfortable',
      sidebarCollapsed: false,
      viewMode: 'list',
      selectedLabels: [],
      sortOrder: 'date',
      sortDirection: 'desc'
    };

    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...defaults, ...parsed };
      }
    } catch (error) {
      console.warn('Failed to load preferences from localStorage:', error);
    }

    return defaults;
  }

  private savePreferences(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.state.preferences));
    } catch (error) {
      console.error('Failed to save preferences to localStorage:', error);
      // Could fall back to sessionStorage or in-memory only
    }
  }

  private handleStorageChange(event: StorageEvent): void {
    if (event.key === this.storageKey && event.newValue) {
      try {
        const newPreferences = JSON.parse(event.newValue);
        this.state.preferences = newPreferences;
        this.applyTheme();
        this.notifyPreferenceListeners();
        this.notifyListeners();
      } catch (error) {
        console.error('Failed to sync preferences from storage event:', error);
      }
    }
  }

  // Server sync methods (optional, requires host adapter)
  private scheduleSyncToServer(): void {
    if (this.syncPending) return;

    this.syncPending = true;

    // Debounce sync requests (5 seconds)
    if (this.syncTimeout) {
      clearTimeout(this.syncTimeout);
    }

    this.syncTimeout = window.setTimeout(() => {
      this.syncToServer();
    }, 5000);
  }

  private async syncToServer(): Promise<void> {
    this.syncPending = false;

    // This will be implemented via the host adapter
    // The store itself doesn't directly call PropertiesService
    try {
      const host = await import('../adapters/host');
      await host.syncPreferences(this.state.preferences);

      this.state.preferences.lastSyncTime = Date.now();
      this.savePreferences();
    } catch (error) {
      console.warn('Server sync failed, will retry later:', error);
      // Could implement retry logic here
    }
  }

  async loadFromServer(): Promise<void> {
    try {
      const host = await import('../adapters/host');
      const serverPrefs = await host.fetchPreferences();

      if (serverPrefs && (!this.state.preferences.lastSyncTime ||
          (serverPrefs.lastSyncTime && serverPrefs.lastSyncTime > this.state.preferences.lastSyncTime))) {
        this.state.preferences = { ...this.state.preferences, ...serverPrefs };
        this.savePreferences();
        this.applyTheme();
        this.notifyPreferenceListeners();
        this.notifyListeners();
      }
    } catch (error) {
      console.warn('Failed to load preferences from server:', error);
    }
  }

  // Observer pattern
  subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  subscribeToPreferences(listener: PreferenceListener): () => void {
    this.preferenceListeners.add(listener);
    return () => this.preferenceListeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.getState()));
  }

  private notifyPreferenceListeners(): void {
    this.preferenceListeners.forEach(listener => listener(this.getPreferences()));
  }

  // Utility methods
  reset(): void {
    localStorage.removeItem(this.storageKey);
    this.state.preferences = this.loadPreferences();
    this.state.ephemeral = {
      loading: false,
      error: null,
      selectedEmails: [],
      searchQuery: '',
      currentPage: 1,
      itemsPerPage: 50
    };
    this.applyTheme();
    this.notifyPreferenceListeners();
    this.notifyListeners();
  }

  // Performance optimization for table virtualization
  setVirtualScrollState(startIndex: number, endIndex: number): void {
    // Store virtual scroll position for restoration
    const scrollState = { startIndex, endIndex };
    sessionStorage.setItem('gas-pa-scroll-state', JSON.stringify(scrollState));
  }

  getVirtualScrollState(): { startIndex: number; endIndex: number } | null {
    try {
      const stored = sessionStorage.getItem('gas-pa-scroll-state');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }
}

// Export singleton instance
export const store = Store.getInstance();

// Export helper hooks for components
export function useStore() {
  return store;
}

export function usePreferences() {
  return store.getPreferences();
}

// Auto-apply theme on load
if (typeof window !== 'undefined') {
  store.applyTheme();
}