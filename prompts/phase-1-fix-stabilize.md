---
title: "Phase 1: Fix & Stabilize - Foundation Quality"
phase: 1
duration: "2 days (16 hours)"
priority: "Critical"
quality_target: "9.5/10"
dependencies: "None - Starting Phase"
next_phase: "phase-2-dashboard-implementation.md"
---

# Phase 1: Fix & Stabilize

## 🎯 Objectives

1. **Fix all failing tests** - Achieve 100% test pass rate (226/226 tests)
2. **Complete missing core components** - Fill gaps in component library
3. **Wire up state management** - Enable reactive UI updates and persistence
4. **Establish quality baseline** - Set standards for remaining phases

## 📋 Prerequisites

### Environment Check
```bash
# Verify environment is ready
npm run build          # Should complete without errors
npm run test           # Will show failing tests to fix
git status             # Should show clean working directory
```

### Required Documentation
- Read `docs/UI_IMPLEMENTATION_PLAN_v2.md` - Sections 4, 5, 8, 10
- Review `CLAUDE.md` - Project constraints and standards
- Check `tests/README.md` - Testing strategy

## 🔧 Task 1: Fix Failing Tests (3 hours)

### Current Status
- **Total Tests**: 226 configured
- **Passing**: ~219 tests
- **Failing**: ~7 tests (addon.cards, keyboard navigation)

### Subtasks

#### 1.1 Fix Gmail Add-on Card Tests
**Location**: `tests/unit/addon.cards.spec.ts`

**Failing Tests**:
- KeyValue truncation (truncate=1, truncate=2)
- Empty content handling
- Full text preservation

**Action Steps**:
```typescript
// 1. Read the test file to understand expectations
// tests/unit/addon.cards.spec.ts:100-165

// 2. Review Gmail Add-on card implementation
// src/ui/addon/* (check for truncation logic)

// 3. Fix truncation implementation to match Gmail Add-on specs:
//    - truncate=1: Single line with ellipsis
//    - truncate=2: Two lines with ellipsis
//    - no truncate: Full text
//    - empty: Graceful handling with placeholder

// 4. Ensure CSS supports line clamping:
//    -webkit-line-clamp, text-overflow, overflow: hidden
```

**Validation**:
```bash
npm run test -- tests/unit/addon.cards.spec.ts
# All tests should pass
```

#### 1.2 Fix Keyboard Navigation Tests
**Location**: `tests/a11y/keyboard-navigation.spec.ts`

**Issues**:
- Focus order not following visual layout
- Some buttons not keyboard accessible
- Tab traps not properly implemented

**Action Steps**:
```typescript
// 1. Review failing tests
// tests/a11y/keyboard-navigation.spec.ts:35, 114

// 2. Check component tab index management
// Ensure: tabindex="0" for interactive elements
//         tabindex="-1" for programmatically focusable
//         no positive tabindex values

// 3. Verify focus order matches DOM order
// Use semantic HTML: button > div with role="button"

// 4. Add keyboard event handlers where missing
// onClick → also handle onKeyDown (Enter, Space)

// 5. Test focus trap in modals/drawers
// Focus should cycle within overlay when open
```

**Validation**:
```bash
npm run test -- tests/a11y/keyboard-navigation.spec.ts
# All keyboard tests should pass
```

#### 1.3 Simple Accessibility Test Fixes
**Location**: `tests/a11y/simple-accessibility.spec.ts:79`

**Action Steps**:
```typescript
// Fix basic keyboard navigation test
// Ensure all interactive elements are reachable via Tab
// Verify focus visible throughout navigation
```

**Validation**:
```bash
npm run test:a11y
# Zero failures in accessibility tests
```

### Task 1 Acceptance Criteria
- [ ] All 226 tests passing
- [ ] Zero console errors during test runs
- [ ] Test coverage report shows no regressions
- [ ] CI/CD pipeline green

---

## 🧩 Task 2: Complete Missing Core Components (4 hours)

### Current Component Status
**Completed** ✅: Table, Modal, Toast, Drawer, StatCard, ChartStyle
**Missing** ❌: Button, Input, Card, CommandPalette

### Subtasks

#### 2.1 Button Component
**Location**: `src/ui/components/Button.ts` (create)

**Requirements** (from UI_IMPLEMENTATION_PLAN_v2.md §10.4):
```typescript
// Button variants:
// - primary: Solid primary color with elevation
// - tonal: Primary color at 12% opacity
// - outlined: Border with transparent background
// - text: No background, text only
// - danger: Error color for destructive actions

// States: default, hover, pressed, focus, disabled, loading

// Features:
// - Icon support (leading/trailing)
// - Loading spinner state
// - Keyboard accessible (Enter/Space)
// - ARIA attributes
// - Size variants (small, medium, large)
```

**Implementation Template**:
```typescript
interface ButtonConfig {
  variant?: 'primary' | 'tonal' | 'outlined' | 'text' | 'danger';
  size?: 'small' | 'medium' | 'large';
  icon?: string; // Material Symbol name
  iconPosition?: 'leading' | 'trailing';
  loading?: boolean;
  disabled?: boolean;
  ariaLabel?: string;
  onClick?: (e: Event) => void;
}

class Button {
  // Implement per §10.4 specs
  // Solid tonal design (no gradients)
  // Focus ring: 2px, primary color, 2px offset
  // Transitions: 200ms ease
  // Touch target: min 44x44px
}
```

**Validation**:
```bash
# Create component
# Add to gallery: src/ui/gallery/index.html
# Visual test: tests/visual/button.spec.ts
npm run test:visual -- button
```

#### 2.2 Input Component
**Location**: `src/ui/components/Input.ts` (create)

**Requirements** (from UI_IMPLEMENTATION_PLAN_v2.md §10.5):
```typescript
// Input types: text, email, password, number, search, tel, url
// Features:
// - Label (floating or static)
// - Helper text
// - Error state with message
// - Success state
// - Icons (leading/trailing)
// - Character counter
// - Clear button
// - Validation states

interface InputConfig {
  type?: string;
  label?: string;
  placeholder?: string;
  value?: string;
  helperText?: string;
  errorText?: string;
  leadingIcon?: string;
  trailingIcon?: string;
  maxLength?: number;
  showCharCount?: boolean;
  required?: boolean;
  disabled?: boolean;
  onChange?: (value: string) => void;
  onValidate?: (value: string) => boolean;
}
```

**Validation**:
```bash
# Test all input types
# Verify error states and helper text
# Check keyboard navigation (Tab, arrow keys for selects)
npm run test -- input
```

#### 2.3 Card Component
**Location**: `src/ui/components/Card.ts` (create)

**Requirements** (from UI_IMPLEMENTATION_PLAN_v2.md §10.7):
```typescript
// Card features:
// - Elevation levels (0-4)
// - Hover lift effect
// - Optional header, body, footer sections
// - Action area
// - Dividers
// - Clickable variants

interface CardConfig {
  elevation?: 0 | 1 | 2 | 3 | 4;
  hoverable?: boolean;
  clickable?: boolean;
  header?: string | HTMLElement;
  footer?: string | HTMLElement;
  onClick?: (e: Event) => void;
}
```

#### 2.4 CommandPalette Component
**Location**: `src/ui/components/CommandPalette.ts` (create)

**Requirements**:
```typescript
// Keyboard-driven command interface
// Features:
// - Fuzzy search
// - Keyboard shortcuts (⌘K to open)
// - Recent commands
// - Categories
// - Icons
// - Keyboard navigation (arrows, enter, esc)

interface Command {
  id: string;
  label: string;
  category?: string;
  icon?: string;
  shortcut?: string;
  action: () => void;
}

class CommandPalette {
  // Implement keyboard-first interface
  // Focus trap when open
  // Backdrop with inert attribute on background
  // Fuzzy search implementation
}
```

**Validation**:
```bash
# Test keyboard shortcuts
# Verify search functionality
# Test with 100+ commands (performance)
npm run test -- command-palette
```

### Task 2 Acceptance Criteria
- [ ] Button component with all variants working
- [ ] Input component with validation and states
- [ ] Card component with elevation system
- [ ] CommandPalette with keyboard navigation
- [ ] All components have TypeScript interfaces
- [ ] All components added to gallery
- [ ] Visual regression tests passing
- [ ] Accessibility tests passing (keyboard, screen reader)

---

## 🔄 Task 3: Wire Up State Management (2 hours)

### Current Status
- Store skeleton exists at `src/ui/core/store.ts`
- LocalStorage persistence not fully implemented
- Event bus needs completion

### Subtasks

#### 3.1 Complete Store Implementation
**Location**: `src/ui/core/store.ts`

**Requirements**:
```typescript
// State structure
interface AppState {
  // UI preferences (persisted)
  ui: {
    theme: 'light' | 'dark' | 'auto';
    density: 'compact' | 'comfortable' | 'cozy';
    sidebarCollapsed: boolean;
    locale: string;
  };

  // Application data (volatile)
  dashboard: {
    stats: EmailStats;
    recentEmails: Email[];
    loading: boolean;
  };

  queue: {
    items: QueueItem[];
    filters: FilterState;
    selection: Set<string>;
  };

  // User session
  user: {
    email: string;
    name: string;
    vipSenders: string[];
  };
}

class Store {
  // Singleton pattern
  // Observable state with subscriptions
  // Middleware support (logging, persistence)
  // Action dispatching
  // Computed values
}
```

**Action Steps**:
```typescript
// 1. Implement reactive state updates
subscribe(path: string, callback: (value: any) => void): () => void

// 2. Add localStorage middleware
const persistenceMiddleware = (state: AppState) => {
  localStorage.setItem('ui_preferences', JSON.stringify(state.ui));
}

// 3. Restore state on load
const loadPersistedState = (): Partial<AppState> => {
  const saved = localStorage.getItem('ui_preferences');
  return saved ? { ui: JSON.parse(saved) } : {};
}

// 4. Add action creators
dispatch(action: Action): void
```

#### 3.2 Event Bus Implementation
**Location**: `src/ui/core/event-bus.ts` (create)

**Requirements**:
```typescript
// Simple pub/sub for component communication
class EventBus {
  on(event: string, handler: Function): () => void;
  emit(event: string, data?: any): void;
  once(event: string, handler: Function): void;
}

// Common events:
// - theme:changed
// - density:changed
// - queue:updated
// - email:processed
// - error:occurred
```

#### 3.3 Connect Components to Store
**Action Steps**:
```typescript
// Example: Connect StatCard to store
class StatCard {
  constructor(container, config) {
    // ...
    this.unsubscribe = store.subscribe('dashboard.stats', (stats) => {
      this.updateStats(stats);
    });
  }

  destroy() {
    this.unsubscribe();
  }
}
```

### Task 3 Acceptance Criteria
- [ ] Store manages all application state
- [ ] UI preferences persist to localStorage
- [ ] State changes trigger component updates
- [ ] Event bus enables component communication
- [ ] No memory leaks (subscriptions cleaned up)
- [ ] State devtools helper implemented (console.log friendly)

---

## ✅ Phase 1 Quality Gates

### Code Quality
- [ ] All TypeScript compiles without errors or warnings
- [ ] ESLint rules passing (if configured)
- [ ] No `any` types in new code
- [ ] All functions have JSDoc comments
- [ ] No console.log statements (use proper logging)

### Testing
- [ ] All 226 tests passing (100% pass rate)
- [ ] Test coverage ≥ 80% on new components
- [ ] Zero accessibility violations in axe-core tests
- [ ] Visual regression tests baseline captured
- [ ] E2E tests for critical paths

### Performance
- [ ] Bundle size ≤ 300KB (check with `npm run build`)
- [ ] Component render time < 50ms (measured)
- [ ] No layout shift during component initialization
- [ ] LocalStorage reads/writes debounced

### Accessibility
- [ ] All new components keyboard accessible
- [ ] Focus visible on all interactive elements
- [ ] ARIA labels present and correct
- [ ] Screen reader tested (NVDA/VoiceOver)
- [ ] Color contrast ≥ 4.5:1 (WCAG AA)

### Documentation
- [ ] Component interfaces documented
- [ ] Usage examples in gallery
- [ ] README updated if needed
- [ ] Breaking changes noted

---

## 🧪 Testing & Validation

### Test Commands
```bash
# Run all tests
npm run test

# Run specific test suites
npm run test:visual          # Visual regression
npm run test:a11y            # Accessibility
npm run test -- unit         # Unit tests

# Update snapshots (if intentional changes)
npm run snapshots:update

# Run tests in watch mode (during development)
npm run test -- --watch
```

### Manual Testing Checklist
- [ ] Open gallery in Chrome (macOS)
- [ ] Test all button variants (click, keyboard, states)
- [ ] Test all input types (validation, error states)
- [ ] Verify theme switching (light/dark)
- [ ] Verify density switching (compact/comfortable)
- [ ] Test keyboard navigation throughout
- [ ] Test with screen reader
- [ ] Test in dark mode
- [ ] Verify localStorage persistence (refresh page)

### Performance Validation
```bash
# Build and check bundle size
npm run build
ls -lh dist/UI.js  # Should be < 300KB

# Run headless server for performance testing
npm run serve:headless

# Lighthouse CLI (if available)
lighthouse http://localhost:8080/gallery --only-categories=performance,accessibility
```

---

## 🐛 Common Issues & Solutions

### Issue: Tests failing in CI but passing locally
**Solution**: Ensure headless rendering is deterministic
```typescript
// Use fixed viewport in playwright.config.ts
viewport: { width: 1280, height: 720 }
deviceScaleFactor: 2
```

### Issue: LocalStorage not persisting
**Solution**: Check browser privacy settings, use try/catch
```typescript
try {
  localStorage.setItem(key, value);
} catch (e) {
  console.warn('LocalStorage unavailable', e);
  // Fallback to in-memory storage
}
```

### Issue: Focus ring not visible
**Solution**: Ensure CSS doesn't override
```css
*:focus-visible {
  outline: var(--focus-ring-width) solid var(--focus-ring-color);
  outline-offset: var(--focus-ring-offset);
}

/* Never do this: */
*:focus { outline: none; } /* ❌ */
```

### Issue: Component not updating when state changes
**Solution**: Verify subscription and cleanup
```typescript
// Subscribe in constructor
this.unsubscribe = store.subscribe(path, callback);

// Unsubscribe in destroy
destroy() {
  this.unsubscribe?.();
}
```

---

## 📚 Reference Documentation

### Required Reading
- `docs/UI_IMPLEMENTATION_PLAN_v2.md` - Complete UI specification
- `CLAUDE.md` - Project constraints and guidelines
- `tests/README.md` - Testing strategy and conventions

### Component Examples
- Existing components in `src/ui/components/` - Table, Modal, Toast, Drawer
- Gallery page: `src/ui/gallery/index.html`
- Test examples: `tests/visual/*.spec.ts`

### Best Practices
- **TypeScript**: Use strict mode, define interfaces, avoid `any`
- **CSS**: Use design tokens (CSS variables), avoid magic numbers
- **Accessibility**: Semantic HTML first, ARIA as enhancement
- **Testing**: Test behavior, not implementation
- **Performance**: Lazy load, debounce, virtual scroll for lists

---

## 🎯 Phase 1 Completion Checklist

### Must Complete
- [x] All 226 tests passing
- [x] Button component implemented and tested
- [x] Input component implemented and tested
- [x] Card component implemented and tested
- [x] CommandPalette implemented and tested
- [x] Store state management working
- [x] LocalStorage persistence working
- [x] Event bus implemented

### Quality Validation
- [x] No TypeScript errors
- [x] No accessibility violations
- [x] Bundle size ≤ 300KB
- [x] All visual regression tests passing
- [x] Code review completed
- [x] Documentation updated

### Ready for Phase 2
- [x] Foundation stable and tested
- [x] Component library complete
- [x] State management functional
- [x] Quality gates passed

---

## 🚀 Next Steps

Once Phase 1 is complete:

1. **Commit changes**:
```bash
git add .
git commit -m "Phase 1 complete: Fix & Stabilize

- Fixed all 226 tests
- Implemented Button, Input, Card, CommandPalette components
- Completed store and state management
- Established quality baseline

Quality: 9.5/10
Test Coverage: 80%+
Bundle Size: <300KB"
```

2. **Tag release**:
```bash
git tag -a phase-1-complete -m "Phase 1: Foundation stable"
git push origin feature/ui-implementation --tags
```

3. **Move to Phase 2**:
   - Open `prompts/phase-2-dashboard-implementation.md`
   - Review prerequisites
   - Begin dashboard implementation

---

**Phase 1 Quality Rating: 9.5/10**

This phase establishes the foundation for all subsequent work. Do not proceed to Phase 2 until all quality gates are met.
