---
title: "Phase 2: Dashboard Implementation - Main User Interface"
phase: 2
duration: "3 days (24 hours)"
priority: "Critical"
quality_target: "9/10"
dependencies: "phase-1-fix-stabilize.md (must be complete)"
next_phase: "phase-3-gmail-addon.md"
---

# Phase 2: Dashboard Implementation

## 🎯 Objectives

1. **Build complete dashboard layout** - Header, sidebar, main content area
2. **Implement statistics visualization** - KPI cards, charts, trends
3. **Create queue management UI** - List view with filters, actions, bulk operations
4. **Connect to backend APIs** - Real data integration with error handling

## 📋 Prerequisites

### Phase 1 Completion Required
- [ ] All tests passing (226/226)
- [ ] Core components complete (Button, Input, Card, Table, etc.)
- [ ] State management functional
- [ ] Quality gates met

### Verify Phase 1
```bash
npm run test           # Should show 226 passing
npm run build          # Should complete without errors
git log --oneline -1   # Should show "Phase 1 complete" commit
```

### Required Documentation
- Read `docs/UI_IMPLEMENTATION_PLAN_v2.md` - Sections 6, 7, 9
- Review `README.md` - Feature overview and architecture
- Check existing dashboard code in `src/ui/pages/Dashboard.ts`

---

## 📐 Task 1: Dashboard Layout & Navigation (5 hours)

### Subtasks

#### 1.1 Main Layout Structure
**Location**: `src/ui/core/Layout.ts` (create)

**Requirements**:
```typescript
// Layout structure (from UI_IMPLEMENTATION_PLAN_v2.md §7)
// - Header: 56px compact / 64px comfortable (sticky)
// - Sidebar: 264px expanded / 72px collapsed
// - Main content: 12-column grid, max-width 1280px, 24px padding

interface LayoutConfig {
  sidebarCollapsed?: boolean;
  showBreadcrumbs?: boolean;
  onSidebarToggle?: (collapsed: boolean) => void;
}

class Layout {
  private header: HTMLElement;
  private sidebar: HTMLElement;
  private main: HTMLElement;

  // Implement responsive layout
  // Handle sidebar toggle animation
  // Persist sidebar state to store
  // Support keyboard shortcut (⌘B to toggle sidebar)
}
```

**HTML Structure**:
```html
<div class="layout" data-sidebar-collapsed="false">
  <header class="layout__header">
    <!-- Header content -->
  </header>

  <aside class="layout__sidebar">
    <!-- Navigation items -->
  </aside>

  <main class="layout__main">
    <!-- Page content -->
  </main>
</div>
```

**CSS** (add to `src/ui/styles/layout.css`):
```css
.layout {
  display: grid;
  grid-template-areas:
    "header header"
    "sidebar main";
  grid-template-columns: 264px 1fr;
  grid-template-rows: 64px 1fr;
  height: 100vh;
}

.layout[data-sidebar-collapsed="true"] {
  grid-template-columns: 72px 1fr;
}

.layout__header {
  grid-area: header;
  position: sticky;
  top: 0;
  z-index: var(--z-header);
  background: var(--surface-0);
  border-bottom: 1px solid var(--border-subtle);
}

.layout__sidebar {
  grid-area: sidebar;
  background: var(--surface-1);
  border-right: 1px solid var(--border-subtle);
  transition: width 200ms cubic-bezier(0.2, 0, 0, 1);
}

.layout__main {
  grid-area: main;
  overflow-y: auto;
  padding: 24px;
}

@media (max-width: 768px) {
  .layout {
    grid-template-areas:
      "header"
      "main";
    grid-template-columns: 1fr;
  }

  .layout__sidebar {
    position: fixed;
    transform: translateX(-100%);
  }

  .layout[data-sidebar-expanded="true"] .layout__sidebar {
    transform: translateX(0);
  }
}
```

#### 1.2 Header Component
**Location**: `src/ui/components/Header.ts` (create)

**Requirements**:
```typescript
interface HeaderConfig {
  title: string;
  showSearch?: boolean;
  showThemeToggle?: boolean;
  showDensityToggle?: boolean;
  showUserMenu?: boolean;
  onSidebarToggle?: () => void;
}

class Header {
  // Elements:
  // - Logo/title
  // - Sidebar toggle button
  // - Global search (CommandPalette trigger)
  // - Theme toggle (light/dark/auto)
  // - Density toggle (compact/comfortable)
  // - User menu (name, avatar, settings, logout)

  // Features:
  // - Keyboard shortcut hints in tooltips
  // - Theme persists to store
  // - Density persists to store
  // - Sticky positioning
}
```

**Implementation**:
```typescript
render(): string {
  return `
    <div class="header">
      <button class="header__sidebar-toggle"
              aria-label="Toggle sidebar"
              title="Toggle sidebar (⌘B)">
        <span class="material-symbols-outlined">menu</span>
      </button>

      <div class="header__title">
        <h1>GAS-PA</h1>
        <span class="header__subtitle">Personal Assistant</span>
      </div>

      <div class="header__search">
        <button class="btn btn--text"
                aria-label="Search"
                title="Open command palette (⌘K)">
          <span class="material-symbols-outlined">search</span>
          <span>Search</span>
          <kbd>⌘K</kbd>
        </button>
      </div>

      <div class="header__actions">
        <!-- Theme toggle -->
        <!-- Density toggle -->
        <!-- User menu -->
      </div>
    </div>
  `;
}
```

#### 1.3 Sidebar Navigation
**Location**: `src/ui/components/Sidebar.ts` (create)

**Requirements**:
```typescript
interface NavItem {
  id: string;
  label: string;
  icon: string;
  path: string;
  badge?: number;
  children?: NavItem[];
}

class Sidebar {
  // Navigation items:
  // - Dashboard (home icon)
  // - Queue (inbox icon) - with unread badge
  // - Analytics (bar_chart icon)
  // - Settings (settings icon)
  // - Help (help icon)

  // Features:
  // - Active state (4px brand accent bar on left)
  // - Tooltips when collapsed
  // - Keyboard navigation (arrows, enter)
  // - Badge for queue count
}
```

**Styling**:
```css
.sidebar__nav-item {
  position: relative;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--on-surface-med);
  transition: background 200ms;
}

.sidebar__nav-item:hover {
  background: var(--state-hover);
}

.sidebar__nav-item[aria-current="page"] {
  background: var(--state-selected);
  color: var(--color-primary-600);
}

.sidebar__nav-item[aria-current="page"]::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  background: var(--color-primary-500);
}
```

#### 1.4 Client-Side Routing
**Location**: `src/ui/core/Router.ts` (create)

**Requirements**:
```typescript
// Simple hash-based routing
class Router {
  private routes: Map<string, () => void>;

  addRoute(path: string, handler: () => void): void;
  navigate(path: string): void;
  getCurrentRoute(): string;

  // Auto-handle browser back/forward
  // Update sidebar active state
  // Update page title
}

// Example usage:
router.addRoute('/', () => renderDashboard());
router.addRoute('/queue', () => renderQueue());
router.addRoute('/settings', () => renderSettings());
```

### Task 1 Acceptance Criteria
- [ ] Layout renders correctly in all viewport sizes
- [ ] Sidebar toggles smoothly (200ms animation)
- [ ] Header shows correct user info
- [ ] Navigation items highlight active page
- [ ] Routing works (back/forward buttons)
- [ ] Keyboard shortcuts functional (⌘B, ⌘K)
- [ ] State persists (sidebar collapse, theme, density)

---

## 📊 Task 2: Statistics Dashboard (6 hours)

### Subtasks

#### 2.1 Complete Dashboard Page
**Location**: `src/ui/pages/Dashboard.ts`

**Layout** (from UI_IMPLEMENTATION_PLAN_v2.md §6):
```
┌────────────────────────────────────────────────┐
│ Header                                          │
├───────┬────────────────────────────────────────┤
│       │ Dashboard Title                         │
│       ├────┬────┬────┬────┬──────────────────────┤
│ Side  │ S1 │ S2 │ S3 │ S4 │  (StatCards)        │
│ bar   ├────┴────┴────┴────┤                     │
│       │ Priority Chart     │  Queue Preview      │
│       │                   │                     │
│       ├───────────────────┼──────────────────────┤
│       │ Category Chart    │  Recent Activity    │
└───────┴───────────────────┴──────────────────────┘
```

**Implementation**:
```typescript
class Dashboard {
  async render(): Promise<string> {
    const stats = await this.fetchStats();
    const recentEmails = await this.fetchRecentEmails();

    return `
      <div class="dashboard">
        <div class="dashboard__header">
          <h1>Dashboard</h1>
          <div class="dashboard__actions">
            <button class="btn btn--tonal">
              <span class="material-symbols-outlined">refresh</span>
              Refresh
            </button>
          </div>
        </div>

        <div class="dashboard__grid grid-12">
          <!-- Row 1: KPI Cards -->
          <div class="grid-span-3">${this.renderStatCard('unread', stats.unread)}</div>
          <div class="grid-span-3">${this.renderStatCard('priority', stats.priority)}</div>
          <div class="grid-span-3">${this.renderStatCard('processed', stats.processed)}</div>
          <div class="grid-span-3">${this.renderStatCard('actionRequired', stats.actionRequired)}</div>

          <!-- Row 2: Charts -->
          <div class="grid-span-6">${this.renderPriorityChart(stats.byPriority)}</div>
          <div class="grid-span-6">${this.renderQueuePreview(recentEmails)}</div>

          <!-- Row 3: More charts -->
          <div class="grid-span-6">${this.renderCategoryChart(stats.byCategory)}</div>
          <div class="grid-span-6">${this.renderRecentActivity(recentEmails)}</div>
        </div>
      </div>
    `;
  }
}
```

#### 2.2 Wire Up StatCard Component
**Location**: `src/ui/components/StatCard.ts` (already exists, enhance)

**Enhancements needed**:
```typescript
// Add micro-trend visualization (small inline SVG chart)
// Add click handler to navigate to filtered queue
// Add loading skeleton state
// Add error state
// Connect to store for real-time updates

interface StatCardData {
  value: number;
  label: string;
  icon: string;
  trend?: {
    direction: 'up' | 'down' | 'stable';
    percentage: number;
    data: number[];  // Last 7 days for micro-chart
  };
  color?: string;
  onClick?: () => void;
}
```

**Micro-trend chart**:
```typescript
private renderMicroTrend(data: number[]): string {
  const max = Math.max(...data);
  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = 100 - ((val / max) * 100);
    return `${x},${y}`;
  }).join(' ');

  return `
    <svg class="stat-card__trend" viewBox="0 0 100 30" aria-hidden="true">
      <polyline points="${points}"
                fill="none"
                stroke="currentColor"
                stroke-width="2"/>
    </svg>
  `;
}
```

#### 2.3 Chart Components
**Location**: `src/ui/components/Chart.ts` (create)

Use existing `ChartStyle.ts` and enhance with Chart.js or custom SVG implementation.

**Priority Chart** (Donut/Pie):
```typescript
interface ChartData {
  labels: string[];
  values: number[];
  colors?: string[];
}

class DonutChart {
  // Render donut chart with legend
  // Interactive legend (click to toggle series)
  // Keyboard accessible
  // Tooltip on hover/focus
  // Use --viz-1 through --viz-8 color palette
}
```

**Category Chart** (Bar):
```typescript
class BarChart {
  // Horizontal bar chart for categories
  // Sorted by value (descending)
  // Click bar to filter queue
  // Keyboard navigation
  // Accessible data table alternative
}
```

#### 2.4 Connect to Backend API
**Location**: `src/ui/adapters/api.ts` (create wrapper around webapp/api.ts)

**API Methods needed**:
```typescript
class API {
  // Dashboard endpoints
  async getStats(): Promise<EmailStats>;
  async getRecentEmails(limit?: number): Promise<Email[]>;
  async getQueueItems(filters?: QueueFilters): Promise<QueueItem[]>;

  // Error handling
  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      throw new APIError(response.status, await response.text());
    }
    return response.json();
  }

  // Retry logic with exponential backoff
  private async withRetry<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
    // Implementation
  }
}
```

**Store integration**:
```typescript
// In Dashboard component
async loadData() {
  store.dispatch({ type: 'dashboard/loading', payload: true });

  try {
    const [stats, emails] = await Promise.all([
      api.getStats(),
      api.getRecentEmails(10)
    ]);

    store.dispatch({ type: 'dashboard/loaded', payload: { stats, emails } });
  } catch (error) {
    store.dispatch({ type: 'dashboard/error', payload: error.message });
    // Show error toast
  }
}
```

### Task 2 Acceptance Criteria
- [ ] Dashboard renders with 12-column grid
- [ ] All 4 KPI cards show real data
- [ ] Charts visualize email statistics correctly
- [ ] Micro-trends display 7-day history
- [ ] Click KPI card → navigate to filtered queue
- [ ] Click chart legend → toggle series
- [ ] Loading states display during API calls
- [ ] Error states handle API failures gracefully
- [ ] Data refreshes every 60 seconds (configurable)
- [ ] Above-the-fold content visible on MacBook 13-16" without scroll

---

## 📥 Task 3: Queue Management UI (8 hours)

### Subtasks

#### 3.1 Queue Page Layout
**Location**: `src/ui/pages/Queue.ts` (create)

**Layout**:
```
┌────────────────────────────────────────────────┐
│ Queue Header | Filters | Bulk Actions          │
├────────────────────────────────────────────────┤
│ [Search]  [Category ▾] [Priority ▾] [Date ▾]  │
├────────────────────────────────────────────────┤
│ ☐ │ From       │ Subject         │ Date │ Act  │
│ ☐ │ sender@... │ Email subject.. │ 2m   │ [⋮] │
│ ☐ │ other@...  │ Another email.. │ 5m   │ [⋮] │
│   ...                                          │
├────────────────────────────────────────────────┤
│ [Bulk Actions Bar - shown when items selected] │
└────────────────────────────────────────────────┘
```

**Implementation**:
```typescript
class Queue {
  private table: Table;
  private filters: QueueFilters;
  private drawer: Drawer;

  async render(): Promise<void> {
    const items = await this.fetchQueueItems();

    // Create table with queue items
    this.table = new Table(this.container, {
      columns: this.getColumns(),
      data: items,
      selectable: true,
      multiSelect: true,
      stickyHeader: true,
      stickyFirstColumn: false,
      onRowClick: (item) => this.showDetails(item),
      onSelectionChange: (selected) => this.updateBulkActions(selected)
    });

    // Wire up filter controls
    // Wire up search
    // Wire up bulk actions
  }

  private getColumns(): TableColumn[] {
    return [
      { id: 'from', label: 'From', sortable: true, width: '200px' },
      { id: 'subject', label: 'Subject', sortable: true, width: 'auto' },
      { id: 'category', label: 'Category', sortable: true, width: '120px' },
      { id: 'priority', label: 'Priority', sortable: true, width: '100px' },
      { id: 'date', label: 'Date', sortable: true, width: '120px' },
      { id: 'actions', label: '', sortable: false, width: '60px' }
    ];
  }
}
```

#### 3.2 Filter Controls
**Location**: `src/ui/components/QueueFilters.ts` (create)

**Filters needed**:
```typescript
interface QueueFilters {
  search?: string;
  category?: string[];
  priority?: string[];
  dateRange?: { start: Date; end: Date };
  vipOnly?: boolean;
  unreadOnly?: boolean;
  hasActionItems?: boolean;
}

class QueueFilters {
  // Search input (debounced 300ms)
  // Category multi-select dropdown
  // Priority multi-select dropdown
  // Date range picker
  // Toggle switches for flags

  // Persist to URL query params
  // Show active filter count badge
  // Clear all button
}
```

**URL persistence**:
```typescript
// Update URL when filters change
private updateURL() {
  const params = new URLSearchParams();
  if (this.filters.search) params.set('q', this.filters.search);
  if (this.filters.category) params.set('cat', this.filters.category.join(','));
  // ... more filters

  history.replaceState(null, '', `#/queue?${params.toString()}`);
}

// Restore filters from URL on load
private restoreFiltersFromURL() {
  const params = new URLSearchParams(location.hash.split('?')[1]);
  this.filters = {
    search: params.get('q') || '',
    category: params.get('cat')?.split(',') || []
    // ... more filters
  };
}
```

#### 3.3 Inline Actions & Row Context Menu
**Location**: Enhance Table component

**Actions per row**:
```typescript
const rowActions = [
  { id: 'open', label: 'Open in Gmail', icon: 'open_in_new' },
  { id: 'process', label: 'Process Now', icon: 'check_circle' },
  { id: 'priority', label: 'Toggle Priority', icon: 'flag' },
  { id: 'category', label: 'Change Category', icon: 'label' },
  { id: 'archive', label: 'Archive', icon: 'archive' },
  { id: 'delete', label: 'Delete', icon: 'delete' }
];

// Show on hover or keyboard focus
// Use dropdown menu (Material Design style)
// Keyboard accessible (arrows, enter, esc)
```

#### 3.4 Bulk Actions Bar
**Location**: `src/ui/components/BulkActionsBar.ts` (create)

**Features**:
```typescript
class BulkActionsBar {
  // Sticky to bottom when items selected
  // Show selected count
  // Bulk actions:
  // - Process selected
  // - Archive selected
  // - Change category (bulk)
  // - Change priority (bulk)
  // - Delete selected (with confirmation)

  // Features:
  // - Optimistic updates
  // - Progress indicator for bulk operations
  // - Undo toast on completion
  // - Error handling (partial success)
}
```

**Implementation**:
```typescript
render(selectedCount: number): string {
  return `
    <div class="bulk-actions-bar" role="toolbar" aria-label="Bulk actions">
      <div class="bulk-actions-bar__info">
        <span>${selectedCount} selected</span>
        <button class="btn btn--text" onclick="clearSelection()">
          Clear selection
        </button>
      </div>

      <div class="bulk-actions-bar__actions">
        <button class="btn btn--tonal">
          <span class="material-symbols-outlined">check_circle</span>
          Process
        </button>
        <button class="btn btn--tonal">
          <span class="material-symbols-outlined">archive</span>
          Archive
        </button>
        <button class="btn btn--danger">
          <span class="material-symbols-outlined">delete</span>
          Delete
        </button>
      </div>
    </div>
  `;
}
```

#### 3.5 Email Detail Drawer
**Location**: Use existing Drawer component

**Content**:
```typescript
class EmailDetailDrawer {
  // Right-side drawer (320-440px width)
  // Sections:
  // - Email metadata (from, to, date)
  // - Preview (first 200 chars)
  // - Classification (category, priority)
  // - Action items (extracted)
  // - VIP status
  // - Follow-up date
  // - Full email link (open in Gmail)

  // Actions in drawer:
  // - Edit category/priority
  // - Add to VIP
  // - Schedule follow-up
  // - Process now
  // - Archive
}
```

### Task 3 Acceptance Criteria
- [ ] Queue displays all emails with correct data
- [ ] Table supports sorting by all columns
- [ ] Filters work correctly (search, category, priority, date)
- [ ] Filters persist to URL
- [ ] Multi-select with keyboard (Shift+click, Ctrl+click)
- [ ] Bulk actions work on multiple items
- [ ] Detail drawer shows full email info
- [ ] Inline actions functional on each row
- [ ] Loading states during operations
- [ ] Error handling for failed operations
- [ ] Optimistic updates with undo
- [ ] Virtual scrolling for 200+ emails

---

## ✅ Phase 2 Quality Gates

### Functional Requirements
- [ ] Dashboard displays real-time data
- [ ] All charts render correctly
- [ ] Queue shows all emails
- [ ] Filters work as expected
- [ ] Bulk operations successful
- [ ] Navigation between pages works
- [ ] Routing handles browser back/forward

### Performance
- [ ] Dashboard loads in < 1.5s
- [ ] Queue renders 200+ items smoothly
- [ ] Virtual scrolling no lag
- [ ] Charts animate smoothly (60fps)
- [ ] Filter/search response < 300ms
- [ ] No memory leaks (check DevTools)

### Accessibility
- [ ] Keyboard navigation works throughout
- [ ] Screen reader announces actions
- [ ] Focus management correct
- [ ] ARIA labels present
- [ ] Color contrast sufficient
- [ ] No keyboard traps

### Testing
- [ ] E2E test for dashboard load
- [ ] E2E test for queue filtering
- [ ] E2E test for bulk operations
- [ ] Visual regression tests pass
- [ ] No accessibility violations

### Code Quality
- [ ] TypeScript compiles without errors
- [ ] No console errors
- [ ] Code reviewed
- [ ] Components documented
- [ ] Tests written for new code

---

## 🧪 Testing & Validation

### Test Files to Create
```bash
# E2E tests
tests/e2e/dashboard.spec.ts
tests/e2e/queue.spec.ts
tests/e2e/navigation.spec.ts

# Visual regression
tests/visual/dashboard.spec.ts
tests/visual/queue.spec.ts
tests/visual/charts.spec.ts
```

### Example E2E Test
```typescript
// tests/e2e/dashboard.spec.ts
test('dashboard loads and displays stats', async ({ page }) => {
  await page.goto('/#/');

  // Wait for data to load
  await page.waitForSelector('.stat-card', { timeout: 3000 });

  // Verify KPI cards present
  const cards = await page.locator('.stat-card').count();
  expect(cards).toBe(4);

  // Verify chart renders
  await expect(page.locator('.chart--donut')).toBeVisible();

  // Click KPI card navigates to queue
  await page.locator('.stat-card').first().click();
  expect(page.url()).toContain('queue');
});
```

### Manual Testing
```bash
# Start dev server
npm run serve:headless

# Open in browser
# Test all features manually:
- [ ] Dashboard loads correctly
- [ ] KPI cards show numbers
- [ ] Charts are interactive
- [ ] Click chart legend toggles series
- [ ] Navigate to queue page
- [ ] Filter queue by category
- [ ] Search queue
- [ ] Select multiple emails
- [ ] Bulk archive
- [ ] Open detail drawer
- [ ] Edit email category
- [ ] Theme toggle works
- [ ] Density toggle works
- [ ] Sidebar collapse works
```

---

## 🐛 Common Issues & Solutions

### Issue: Charts not rendering
**Solution**: Ensure data is loaded before rendering
```typescript
async mounted() {
  await this.loadData();
  await this.$nextTick(); // Wait for DOM update
  this.renderChart();
}
```

### Issue: Virtual scrolling jumpy
**Solution**: Fix row height calculation
```typescript
// Use consistent row height
--row-height: 48px;

// Measure actual heights after render
this.actualRowHeight = this.rows[0].offsetHeight;
```

### Issue: Filters not updating table
**Solution**: Ensure store subscription
```typescript
store.subscribe('queue.filters', (filters) => {
  this.applyFilters(filters);
  this.table.setData(this.filteredData);
});
```

### Issue: Memory leak in polling
**Solution**: Clear interval on unmount
```typescript
mounted() {
  this.pollInterval = setInterval(() => this.refresh(), 60000);
}

unmounted() {
  clearInterval(this.pollInterval);
}
```

---

## 📚 Reference Documentation

- `docs/UI_IMPLEMENTATION_PLAN_v2.md` §6-7 (Dashboard & Pages)
- `README.md` - Features and architecture
- Existing components in `src/ui/components/`
- Backend API in `src/webapp/api.ts`

---

## 🎯 Phase 2 Completion Checklist

### Dashboard
- [ ] Layout complete (header, sidebar, main)
- [ ] Navigation working
- [ ] All 4 KPI cards with real data
- [ ] Priority chart rendered
- [ ] Category chart rendered
- [ ] Queue preview shown
- [ ] Real-time updates (60s polling)

### Queue
- [ ] Table with all emails
- [ ] Filters working (search, category, priority, date)
- [ ] Sorting functional
- [ ] Multi-select working
- [ ] Bulk actions implemented
- [ ] Detail drawer functional
- [ ] Virtual scrolling for 200+ items

### Quality
- [ ] All tests passing
- [ ] No accessibility violations
- [ ] Performance targets met
- [ ] Code reviewed
- [ ] Documentation updated

---

## 🚀 Next Steps

```bash
# Commit Phase 2
git add .
git commit -m "Phase 2 complete: Dashboard Implementation

- Complete dashboard with real-time stats
- Queue management with filters and bulk operations
- Navigation and routing
- Charts and visualizations

Quality: 9/10
Performance: <1.5s load time
Accessibility: WCAG 2.1 AA"

git tag -a phase-2-complete -m "Phase 2: Dashboard complete"
```

**Move to Phase 3**: `prompts/phase-3-gmail-addon.md`

---

**Phase 2 Quality Rating: 9/10**
