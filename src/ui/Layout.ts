/**
 * Main Layout Component
 * Provides the application shell with navigation, sidebar, and content areas
 * Implements Material Design 3 layout principles
 * Phase 2 - Task 1.1: Dashboard Layout Structure
 */

export interface LayoutConfig {
  container: HTMLElement;
  onNavigate?: (route: string) => void;
  onMenuToggle?: (isOpen: boolean) => void;
  initialRoute?: string;
  user?: {
    name: string;
    email: string;
    avatar?: string;
  };
}

export interface NavigationItem {
  id: string;
  label: string;
  icon: string;
  route: string;
  badge?: string | number;
  active?: boolean;
}

export class Layout {
  private container: HTMLElement;
  private config: LayoutConfig;
  private sidebarOpen: boolean = true;
  private currentRoute: string;
  private navigationItems: NavigationItem[] = [];
  private contentContainer: HTMLElement | null = null;

  constructor(config: LayoutConfig) {
    this.config = config;
    this.container = config.container;
    this.currentRoute = config.initialRoute || 'dashboard';
    this.initializeNavigationItems();
    this.init();
  }

  private initializeNavigationItems(): void {
    this.navigationItems = [
      {
        id: 'dashboard',
        label: 'Dashboard',
        icon: `<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
          <path d="M3 3h6v6H3V3zm8 0h6v6h-6V3zM3 11h6v6H3v-6zm8 0h6v6h-6v-6z"/>
        </svg>`,
        route: 'dashboard',
        active: this.currentRoute === 'dashboard'
      },
      {
        id: 'queue',
        label: 'Queue',
        icon: `<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
          <path d="M3 5h14v2H3V5zm0 4h14v2H3V9zm0 4h10v2H3v-2z"/>
        </svg>`,
        route: 'queue',
        badge: 0,
        active: this.currentRoute === 'queue'
      },
      {
        id: 'analytics',
        label: 'Analytics',
        icon: `<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
          <path d="M3 3v14h14V3H3zm2 2h2v10H5V5zm4 4h2v6H9V9zm4-2h2v8h-2V7z"/>
        </svg>`,
        route: 'analytics',
        active: this.currentRoute === 'analytics'
      },
      {
        id: 'settings',
        label: 'Settings',
        icon: `<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
          <path d="M10 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"/>
          <path d="M8.59 4.1L7.5 2H12.5l-1.09 2.1a6 6 0 0 1 2.5 1.5l2.1-1.1v5l-2.1-1.1a6 6 0 0 1 0 3l2.1-1.1v5l-2.1-1.1a6 6 0 0 1-2.5 1.5L12.5 18H7.5l1.09-2.1a6 6 0 0 1-2.5-1.5L4 15.5v-5l2.1 1.1a6 6 0 0 1 0-3L4 9.5v-5l2.09 1.1a6 6 0 0 1 2.5-1.5z"/>
        </svg>`,
        route: 'settings',
        active: this.currentRoute === 'settings'
      }
    ];
  }

  private init(): void {
    this.render();
    this.attachEventListeners();
    this.applyTheme();
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="layout ${this.sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}">
        ${this.renderHeader()}
        ${this.renderSidebar()}
        ${this.renderMainContent()}
      </div>
    `;

    // Get content container reference
    this.contentContainer = this.container.querySelector('.layout-content');
  }

  private renderHeader(): string {
    const user = this.config.user || { name: 'User', email: 'user@example.com' };

    return `
      <header class="layout-header">
        <div class="header-left">
          <button class="menu-toggle" aria-label="Toggle menu" aria-expanded="${this.sidebarOpen}">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 6h18v2H3V6zm0 5h18v2H3v-2zm0 5h18v2H3v-2z"/>
            </svg>
          </button>
          <div class="header-brand">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="currentColor" class="brand-logo">
              <path d="M16 2L2 10v12l14 8 14-8V10L16 2zm0 4l10 5.7v8.6L16 26l-10-5.7v-8.6L16 6z"/>
              <path d="M16 10l-6 3.4v6.8l6 3.4 6-3.4v-6.8L16 10z"/>
            </svg>
            <span class="brand-text">GAS-PA</span>
          </div>
        </div>

        <div class="header-center">
          <div class="search-bar">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" class="search-icon">
              <path d="M8 2a6 6 0 1 0 4.24 10.24l4.26 4.26 1.5-1.5-4.26-4.26A6 6 0 0 0 8 2zm0 2a4 4 0 1 1 0 8 4 4 0 0 1 0-8z"/>
            </svg>
            <input type="search" class="search-input" placeholder="Search emails, contacts, or actions..." />
            <span class="search-shortcut">Ctrl+K</span>
          </div>
        </div>

        <div class="header-right">
          <button class="header-icon-btn" aria-label="Notifications">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10 2a5 5 0 0 0-5 5v3l-2 2v1h14v-1l-2-2V7a5 5 0 0 0-5-5zm0 16a2 2 0 0 0 2-2H8a2 2 0 0 0 2 2z"/>
            </svg>
            <span class="notification-badge">3</span>
          </button>

          <button class="header-icon-btn" aria-label="Help">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16zm1 13h-2v-2h2v2zm0-4h-2V7h2v4z"/>
            </svg>
          </button>

          <button class="user-menu-btn" aria-label="User menu">
            <div class="user-avatar">
              ${user.avatar ? `<img src="${user.avatar}" alt="${user.name}" />` : this.generateAvatar(user.name)}
            </div>
            <div class="user-info">
              <span class="user-name">${user.name}</span>
              <span class="user-email">${user.email}</span>
            </div>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" class="dropdown-arrow">
              <path d="M8 11L3 6h10l-5 5z"/>
            </svg>
          </button>
        </div>
      </header>
    `;
  }

  private renderSidebar(): string {
    return `
      <aside class="layout-sidebar" role="navigation" aria-label="Main navigation">
        <nav class="sidebar-nav">
          ${this.navigationItems.map(item => this.renderNavigationItem(item)).join('')}
        </nav>

        <div class="sidebar-footer">
          <div class="storage-indicator">
            <div class="storage-header">
              <span class="storage-label">Storage</span>
              <span class="storage-value">2.4 GB / 15 GB</span>
            </div>
            <div class="storage-bar">
              <div class="storage-fill" style="width: 16%"></div>
            </div>
          </div>

          <button class="sidebar-theme-toggle" aria-label="Toggle theme">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" class="theme-icon-light">
              <path d="M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16zm0 14V4a6 6 0 1 1 0 12z"/>
            </svg>
            <span>Dark mode</span>
          </button>
        </div>
      </aside>
    `;
  }

  private renderNavigationItem(item: NavigationItem): string {
    return `
      <a href="#${item.route}"
         class="nav-item ${item.active ? 'active' : ''}"
         data-route="${item.route}"
         aria-current="${item.active ? 'page' : 'false'}">
        <span class="nav-icon">${item.icon}</span>
        <span class="nav-label">${item.label}</span>
        ${item.badge !== undefined ? `<span class="nav-badge">${item.badge}</span>` : ''}
      </a>
    `;
  }

  private renderMainContent(): string {
    return `
      <main class="layout-main" role="main">
        <div class="layout-content" id="main-content">
          <!-- Dynamic content will be loaded here -->
        </div>
      </main>
    `;
  }

  private generateAvatar(name: string): string {
    const initials = name.split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

    return `<div class="avatar-placeholder">${initials}</div>`;
  }

  private attachEventListeners(): void {
    // Menu toggle
    const menuToggle = this.container.querySelector('.menu-toggle');
    if (menuToggle) {
      menuToggle.addEventListener('click', () => {
        this.toggleSidebar();
      });
    }

    // Navigation items
    const navItems = this.container.querySelectorAll('.nav-item');
    navItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const route = (e.currentTarget as HTMLElement).dataset.route;
        if (route) {
          this.navigateTo(route);
        }
      });
    });

    // Search shortcut
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = this.container.querySelector('.search-input') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
        }
      }
    });

    // Theme toggle
    const themeToggle = this.container.querySelector('.sidebar-theme-toggle');
    if (themeToggle) {
      themeToggle.addEventListener('click', () => {
        this.toggleTheme();
      });
    }

    // Responsive sidebar
    this.handleResponsiveSidebar();
    window.addEventListener('resize', () => this.handleResponsiveSidebar());
  }

  private toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
    const layout = this.container.querySelector('.layout');
    if (layout) {
      layout.classList.toggle('sidebar-open', this.sidebarOpen);
      layout.classList.toggle('sidebar-closed', !this.sidebarOpen);
    }

    const menuToggle = this.container.querySelector('.menu-toggle');
    if (menuToggle) {
      menuToggle.setAttribute('aria-expanded', String(this.sidebarOpen));
    }

    if (this.config.onMenuToggle) {
      this.config.onMenuToggle(this.sidebarOpen);
    }
  }

  private navigateTo(route: string): void {
    // Update active state
    this.navigationItems.forEach(item => {
      item.active = item.route === route;
    });

    // Re-render navigation
    const sidebar = this.container.querySelector('.sidebar-nav');
    if (sidebar) {
      sidebar.innerHTML = this.navigationItems.map(item => this.renderNavigationItem(item)).join('');

      // Re-attach event listeners to new navigation items
      const navItems = sidebar.querySelectorAll('.nav-item');
      navItems.forEach(item => {
        item.addEventListener('click', (e) => {
          e.preventDefault();
          const route = (e.currentTarget as HTMLElement).dataset.route;
          if (route) {
            this.navigateTo(route);
          }
        });
      });
    }

    this.currentRoute = route;

    // Call navigation callback
    if (this.config.onNavigate) {
      this.config.onNavigate(route);
    }
  }

  private toggleTheme(): void {
    const currentTheme = document.documentElement.dataset.theme || 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.documentElement.dataset.theme = newTheme;
    localStorage.setItem('theme', newTheme);
  }

  private applyTheme(): void {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.dataset.theme = savedTheme;
  }

  private handleResponsiveSidebar(): void {
    const isMobile = window.innerWidth < 768;
    if (isMobile && this.sidebarOpen) {
      this.toggleSidebar();
    } else if (!isMobile && !this.sidebarOpen) {
      this.toggleSidebar();
    }
  }

  public setContent(content: HTMLElement | string): void {
    if (this.contentContainer) {
      if (typeof content === 'string') {
        this.contentContainer.innerHTML = content;
      } else {
        this.contentContainer.innerHTML = '';
        this.contentContainer.appendChild(content);
      }
    }
  }

  public updateBadge(itemId: string, value: string | number | undefined): void {
    const item = this.navigationItems.find(i => i.id === itemId);
    if (item) {
      item.badge = value;
      // Re-render just that navigation item
      const navElement = this.container.querySelector(`[data-route="${item.route}"]`);
      if (navElement && navElement.parentElement) {
        const newElement = document.createElement('div');
        newElement.innerHTML = this.renderNavigationItem(item);
        navElement.parentElement.replaceChild(newElement.firstElementChild!, navElement);
      }
    }
  }

  public destroy(): void {
    this.container.innerHTML = '';
  }
}

// Factory function
export function createLayout(config: LayoutConfig): Layout {
  return new Layout(config);
}

// Add styles
const layoutStyles = `
.layout {
  display: grid;
  grid-template-columns: 280px 1fr;
  grid-template-rows: 64px 1fr;
  grid-template-areas:
    "header header"
    "sidebar main";
  min-height: 100vh;
  background: var(--color-surface);
  transition: grid-template-columns var(--transition-base);
}

.layout.sidebar-closed {
  grid-template-columns: 64px 1fr;
}

/* Header */
.layout-header {
  grid-area: header;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--spacing-lg);
  background: var(--color-surface-container);
  border-bottom: 1px solid var(--color-border-subtle);
  z-index: var(--z-sticky);
}

.header-left,
.header-right {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.header-center {
  flex: 1;
  max-width: 600px;
  margin: 0 var(--spacing-xl);
}

.menu-toggle {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  border-radius: var(--radius-sm);
  transition: all var(--transition-fast);
}

.menu-toggle:hover {
  background: var(--color-surface-variant);
  color: var(--color-text-primary);
}

.header-brand {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-primary);
}

.brand-text {
  font-size: var(--font-size-lg);
}

.search-bar {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: var(--spacing-md);
  color: var(--color-text-secondary);
}

.search-input {
  width: 100%;
  padding: var(--spacing-sm) var(--spacing-md);
  padding-left: calc(var(--spacing-md) + 24px);
  padding-right: calc(var(--spacing-md) + 48px);
  background: var(--color-surface-variant);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  font-size: var(--font-size-sm);
  transition: all var(--transition-fast);
}

.search-input:focus {
  outline: none;
  border-color: var(--color-primary);
  background: var(--color-surface);
}

.search-shortcut {
  position: absolute;
  right: var(--spacing-md);
  padding: 2px 6px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xs);
  font-size: var(--font-size-xs);
  font-family: var(--font-mono);
  color: var(--color-text-secondary);
}

.header-icon-btn {
  position: relative;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  border-radius: var(--radius-sm);
  transition: all var(--transition-fast);
}

.header-icon-btn:hover {
  background: var(--color-surface-variant);
  color: var(--color-text-primary);
}

.notification-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  background: var(--color-error);
  color: white;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
}

.user-menu-btn {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-xs) var(--spacing-sm);
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: var(--radius-sm);
  transition: all var(--transition-fast);
}

.user-menu-btn:hover {
  background: var(--color-surface-variant);
}

.user-avatar {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-full);
  overflow: hidden;
  background: var(--color-primary);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: var(--font-weight-medium);
  font-size: var(--font-size-sm);
}

.user-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.user-info {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  text-align: left;
}

.user-name {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
}

.user-email {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
}

.dropdown-arrow {
  color: var(--color-text-secondary);
}

/* Sidebar */
.layout-sidebar {
  grid-area: sidebar;
  display: flex;
  flex-direction: column;
  background: var(--color-surface-container);
  border-right: 1px solid var(--color-border-subtle);
  overflow-y: auto;
}

.sidebar-nav {
  flex: 1;
  padding: var(--spacing-md);
}

.nav-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-sm) var(--spacing-md);
  margin-bottom: var(--spacing-xs);
  color: var(--color-text-secondary);
  text-decoration: none;
  border-radius: var(--radius-sm);
  transition: all var(--transition-fast);
  position: relative;
}

.nav-item:hover {
  background: var(--color-surface-variant);
  color: var(--color-text-primary);
}

.nav-item.active {
  background: var(--color-primary-container);
  color: var(--color-primary);
}

.nav-item.active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 24px;
  background: var(--color-primary);
  border-radius: 0 var(--radius-xs) var(--radius-xs) 0;
}

.nav-icon {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.nav-label {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  transition: opacity var(--transition-base);
}

.nav-badge {
  margin-left: auto;
  padding: 2px 6px;
  background: var(--color-primary);
  color: white;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  border-radius: var(--radius-full);
}

.sidebar-closed .nav-label,
.sidebar-closed .nav-badge {
  opacity: 0;
  pointer-events: none;
}

.sidebar-footer {
  padding: var(--spacing-md);
  border-top: 1px solid var(--color-border-subtle);
}

.storage-indicator {
  margin-bottom: var(--spacing-md);
  padding: var(--spacing-sm);
  background: var(--color-surface-variant);
  border-radius: var(--radius-sm);
}

.storage-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: var(--spacing-xs);
}

.storage-label {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
}

.storage-value {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
}

.storage-bar {
  height: 4px;
  background: var(--color-surface);
  border-radius: var(--radius-xs);
  overflow: hidden;
}

.storage-fill {
  height: 100%;
  background: var(--color-primary);
  transition: width var(--transition-base);
}

.sidebar-theme-toggle {
  width: 100%;
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm);
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  cursor: pointer;
  border-radius: var(--radius-sm);
  transition: all var(--transition-fast);
}

.sidebar-theme-toggle:hover {
  background: var(--color-surface-variant);
  color: var(--color-text-primary);
}

.sidebar-closed .storage-indicator,
.sidebar-closed .sidebar-theme-toggle span {
  display: none;
}

/* Main Content */
.layout-main {
  grid-area: main;
  overflow-y: auto;
  background: var(--color-surface);
}

.layout-content {
  padding: var(--spacing-lg);
  max-width: 1400px;
  margin: 0 auto;
}

/* Responsive */
@media (max-width: 768px) {
  .layout {
    grid-template-columns: 1fr;
    grid-template-areas:
      "header"
      "main";
  }

  .layout-sidebar {
    position: fixed;
    top: 64px;
    left: -280px;
    width: 280px;
    height: calc(100vh - 64px);
    z-index: var(--z-modal);
    transition: left var(--transition-base);
  }

  .layout.sidebar-open .layout-sidebar {
    left: 0;
  }

  .layout.sidebar-open::after {
    content: '';
    position: fixed;
    inset: 64px 0 0 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: calc(var(--z-modal) - 1);
  }

  .header-center {
    display: none;
  }

  .user-info {
    display: none;
  }
}

/* Dark mode adjustments */
[data-theme="dark"] .layout-header {
  background: var(--color-surface-container);
  border-bottom-color: var(--color-border-subtle);
}

[data-theme="dark"] .layout-sidebar {
  background: var(--color-surface-container);
  border-right-color: var(--color-border-subtle);
}

[data-theme="dark"] .search-input {
  background: var(--color-surface-variant);
  border-color: var(--color-border);
  color: var(--color-text-primary);
}

[data-theme="dark"] .search-input:focus {
  background: var(--color-surface);
  border-color: var(--color-primary);
}

/* Accessibility */
@media (prefers-reduced-motion: reduce) {
  .layout,
  .nav-item,
  .menu-toggle,
  .header-icon-btn,
  .search-input,
  .storage-fill {
    transition: none;
  }
}

/* Focus styles */
.menu-toggle:focus-visible,
.header-icon-btn:focus-visible,
.user-menu-btn:focus-visible,
.nav-item:focus-visible,
.sidebar-theme-toggle:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}
`;

// Inject styles if not already present
if (!document.getElementById('layout-styles')) {
  const styleSheet = document.createElement('style');
  styleSheet.id = 'layout-styles';
  styleSheet.textContent = layoutStyles;
  document.head.appendChild(styleSheet);
}