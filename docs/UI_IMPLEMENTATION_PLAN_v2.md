# GAS-PA UI/GUI Implementation Plan — Visual & Local Layout (v2)
**Version:** 2.0  
**Date:** 2025-11-15  
**Status:** Planning Phase (Revised)  
**Quality Target:** ≥ 9.5/10  
**Primary Browser Target:** **Chrome on macOS (latest 2 versions)**

> This revision incorporates the outcomes of the expert visual/layout review and supersedes v1.0 (2025‑11‑12). It preserves the original structure while tightening visuals, density, hierarchy, and macOS/Workspace fit.

---

## Table of Contents
1. [Executive Summary](#1-executive-summary)  
2. [System Analysis](#2-system-analysis)  
3. [Architecture & Technology Stack](#3-architecture--technology-stack)  
4. [UI Framework Design](#4-ui-framework-design)  
5. [Component Library](#5-component-library)  
6. [Dashboard Design](#6-dashboard-design)  
7. [Page Structure & Routing](#7-page-structure--routing)  
8. [Data Flow & State Management](#8-data-flow--state-management)  
9. [API Layer](#9-api-layer)  
10. [Styling System](#10-styling-system)  
11. [Gmail Add-on Integration](#11-gmail-add-on-integration)  
12. [Extensibility Framework](#12-extensibility-framework)  
13. [Security & Authentication](#13-security--authentication)  
14. [Performance Optimization](#14-performance-optimization)  
15. [Testing Strategy](#15-testing-strategy)  
16. [Implementation Phases](#16-implementation-phases)  
17. [Quality Checklist](#17-quality-checklist)  
Appendix A–D (File Structure, Technology Decisions, Browser Support, Performance Targets)

---

## 1. Executive Summary

### 1.1 Vision
Deliver a Workspace‑native UI that feels at home inside Google Workspace while running in Chrome on a MacBook: **clean hierarchy, compact density for data views, best‑in‑class keyboard flow (⌘), and low‑noise visuals**.

### 1.2 Objectives (delta from v1.0)
- Strengthen **semantic tokens** (surfaces, elevation, focus, state layers).  
- Formalize a **12‑column grid** with explicit gutters, paddings, and **density modes**.  
- Replace gradient primary button with **solid tonal** design + hover/pressed/focus states.  
- Specify **table density + sticky header/first column**, inline filters, and bulk action bar.  
- Prefer **right‑side drawer** for details; keep modals for confirms.  
- Finalize **dark mode mapping** and consistent chart palette.  
- Mac‑first **keyboard**: switch to ⌘ variants and expose hints.  
- Correct persistence: **localStorage for UI prefs** (web app) + **PropertiesService** sync (optional).  

### 1.3 Success Metrics (unchanged + visual KPIs)
- **Page load:** < 1.5s; **TTI:** < 2s; **Bundle:** < 300KB.  
- **Usability:** Task completion > 90%; **A11y:** WCAG 2.1 AA.  
- **Visual KPIs:** First meaningful paint shows readable dashboard header + 4 estat cards; **No layout shift** on table interactions; **Focus never lost** on inline updates.

### 1.4 Visual & Layout Scores (now → target)
- Tokens 8.5 → **9.5**, Type 8.0 → **9.2**, Grid/Layout 8.0 → **9.3**, Nav 8.0 → **9.1**, Cards 8.0 → **9.2**, Buttons 7.5 → **9.3**, Inputs 8.0 → **9.2**, Tables 7.5 → **9.2**, Charts 8.0 → **9.0**, Empty/Error 8.0 → **9.1**, Toasts 8.0 → **9.1**, Modals 8.0 → **9.1**, Dark Mode 8.5 → **9.2**, Workspace Fit 7.5 → **9.2**, macOS Details 7.5 → **9.1**, UI Persistence 6.5 → **9.0**, A11y 8.0 → **9.3**, Visual QA 7.5 → **9.1**.

---

## 2. System Analysis (unchanged, summarized)
Phase 1–2 capabilities, data sources, and services remain as in v1.0. This revision **does not** change domain logic—only **visuals, layout, and interaction polish**.\
See Appendix A for structure parity with v1.0.

---

## 3. Architecture & Technology Stack

### 3.1 Platform Architecture
Unchanged. Web app (full dashboard) + Gmail Add‑on (contextual).

### 3.2 Technology Stack
**Frontend:** TypeScript + vanilla JS; CSS variables; dark/light themes; density toggles.\
**Target runtime:** Chrome on macOS (latest 2).

### 3.3 Constraints & Considerations (revised)
- **Bundle Size:** target < 300KB, hard max 500KB.  
- **GAS/Apps Script:** no WebSockets; polling; limited npm.  
- **Persistence (corrected):** **Use `localStorage` for UI preferences** (web app). For **cross‑device sync**, mirror via server endpoint → `PropertiesService`.  
- **Keyboard:** Prefer ⌘ shortcuts on macOS; expose in tooltips/menus.

---

## 4. UI Framework Design

### 4.1 Component Architecture
Same base class pattern; focus on **non‑destructive rerender** to preserve focus and SR continuity. Provide a `patchDOM(el, html)` util that updates child nodes without replacing the root.

### 4.2 Registration & Composition
Unchanged; document component contracts and events.

### 4.3 Rerender Hygiene (new)
- Remember `document.activeElement`; attempt to restore focus by `data-focus-id`.  
- Announce major state changes via `aria-live="polite"` node.  
- Defer heavy updates behind `requestAnimationFrame` or microtasks.

---

## 5. Component Library

### 5.1 Core
Add **Drawer** (right side, 320–440px) and **CommandPalette**; refine **Table** (sticky header/first col).

### 5.2 Feature
Queue: `QueueList`, `QueueItem`, `QueueFilters`, `BulkActions`, **QueueDrawer** for details.\
Dashboard: `StatCard` with micro‑trend (inline SVG), consistent chart legends.

### 5.3 States & Density
Each component exposes density: `comfortable | compact | cozy` (Gmail Add‑on uses `cozy`).

---

## 6. Dashboard Design

### 6.1 Grid & Composition
- **12‑column grid**, 24px gutters, page padding 24px, max width 1280px.  
- Widgets: `small=4`, `medium=6`, `large=12` columns; reorder via CSS Grid areas.

### 6.2 Above‑the‑fold (MacBook 13–16")
Header + 4 StatCards + Priority chart + Queue preview visible without scroll.

### 6.3 Interactions
- Click KPI → filtered queue.  
- Chart legend toggles series (keyboardable).  
- Queue preview rows show inline actions on hover and on selection.

---

## 7. Page Structure & Routing

### 7.1 Routes
Same as v1.0.

### 7.2 Navigation
- **Header:** 56px (compact) / 64px (comfortable), sticky with divider.  
- **Sidebar:** 264px expanded / 72px collapsed; active item uses 4px brand accent bar.  
- **Breadcrumbs** shown under header for deep pages.

---

## 8. Data Flow & State Management

### 8.1 UI Preferences
```ts
// Local (device) UI prefs
const saveUIPrefs = (prefs) => localStorage.setItem('ui_preferences', JSON.stringify(prefs));
const loadUIPrefs = () => JSON.parse(localStorage.getItem('ui_preferences') || '{}');

// Optional cross‑device sync via server → PropertiesService
const syncUIPrefs = async (prefs) => api.system.updateConfig({ ui: prefs });
```
`ui.sidebarCollapsed`, `ui.theme`, `ui.density` persist locally; users can toggle “Sync across devices”.

### 8.2 Store & Middleware
Add middleware to debounce writes to `localStorage` and to call `syncUIPrefs` only when enabled.

---

## 9. API Layer
Unchanged. Add `system.updateConfig({ ui })` endpoint for optional UI sync.

---

## 10. Styling System

### 10.1 Design Tokens (extensions)
```css
:root{
  /* Surfaces & text */
  --surface-0:#fff; --surface-1:#fafafa; --surface-2:#f5f7ff;
  --on-surface-high:rgba(17,24,39,.9); --on-surface-med:rgba(17,24,39,.7); --on-surface-low:rgba(17,24,39,.55);

  /* State layers */
  --state-hover:rgba(0,0,0,.04); --state-pressed:rgba(0,0,0,.08); --state-selected:rgba(102,126,234,.14);

  /* Elevation */
  --elev-0:none; --elev-1:0 1px 2px rgba(0,0,0,.06); --elev-2:0 4px 8px rgba(0,0,0,.08);
  --elev-3:0 8px 16px rgba(0,0,0,.10); --elev-4:0 12px 24px rgba(0,0,0,.12);

  /* Focus */
  --focus-ring-color:#3b82f6; --focus-ring-width:2px; --focus-ring-offset:2px;

  /* Disabled opacity */
  --opacity-disabled:.45;

  /* Data viz palette (colorblind-friendly) */
  --viz-1:#4e79a7; --viz-2:#59a14f; --viz-3:#f28e2b; --viz-4:#e15759;
  --viz-5:#76b7b2; --viz-6:#edc948; --viz-7:#b07aa1; --viz-8:#ff9da7;
}
[data-theme="dark"]{
  --surface-0:#111827; --surface-1:#0b1220; --surface-2:#0f1b33;
  --on-surface-high:rgba(249,250,251,.95); --on-surface-med:rgba(249,250,251,.75); --on-surface-low:rgba(249,250,251,.6);
  --state-hover:rgba(255,255,255,.06); --state-pressed:rgba(255,255,255,.12); --state-selected:rgba(102,126,234,.25);
}
*:focus-visible{ outline:var(--focus-ring-width) solid var(--focus-ring-color); outline-offset:var(--focus-ring-offset); }
```

### 10.2 Type Scale & Rhythm
- Scale: 12/14/16/18/20/24/32/48.  
- Body line‑length: **60–72ch**; card text max **80ch**.  
- Numerals: `font-variant-numeric: tabular-nums;` on tables/KPIs.

### 10.3 Grid, Containers & Density
```css
.container{ max-width:1280px; margin:0 auto; padding:24px; }
.grid-12{ display:grid; grid-template-columns:repeat(12,1fr); gap:24px; }
[data-density="compact"] .cell{ padding:8px 12px; } /* tables/lists */
[data-density="comfortable"] .cell{ padding:12px 16px; }
```

### 10.4 Buttons (solid tonal, no gradients)
```css
.btn{ display:inline-flex; gap:8px; align-items:center; justify-content:center; border:1px solid transparent;
      border-radius:10px; padding:8px 16px; font-weight:600; transition:background .2s, box-shadow .2s, transform .2s; }
.btn--primary{ background:var(--color-primary-500); color:#fff; box-shadow:var(--elev-1); }
.btn--primary:hover{ background:var(--color-primary-600); }
.btn--primary:active{ background:var(--color-primary-700); }
.btn--tonal{ background:color-mix(in oklab, var(--color-primary-500) 12%, transparent); color:var(--color-primary-700); }
.btn--danger{ background:var(--color-error); color:#fff; }
.btn[aria-busy="true"]{ pointer-events:none; }
```

### 10.5 Inputs
- Heights: 40px default / 36px compact; helper text (12px) + error with icon.  
- Use `accent-color: var(--color-primary-500);` (Chrome/macOS supported).

### 10.6 Tables & Lists
```css
.table{ width:100%; border-collapse:separate; border-spacing:0; }
.table thead th{ position:sticky; top:0; background:var(--surface-0); z-index:var(--z-sticky); }
.table td,.table th{ padding:12px 16px; }
[data-density="compact"] .table td{ padding:8px 12px; }
.table .col--sticky{ position:sticky; left:0; background:inherit; }
.table tr:hover{ background:var(--state-hover); }
.bulkbar{ position:sticky; bottom:0; background:var(--surface-1); box-shadow:var(--elev-2); padding:12px 16px; }
```

### 10.7 Cards & Surfaces
- Default card: `background: var(--surface-0); box-shadow: var(--elev-1); padding: 24px`.  
- Hover lift: +1 elevation, translateY(-1px).  
- Use subtle dividers: `1px` neutral line, not heavy borders.

### 10.8 Motion
- Durations: 120ms (fast), 200ms (base), 280ms (slow).  
- Easing: `(0.2,0,0,1)` standard; respect `prefers-reduced-motion`.  
- Apply to button hover, drawer slide (16px), row select fade.

### 10.9 Dark Mode
Map every component to `--surface-*` and `--on-surface-*`. Patterns/fills for charts in low contrast. Add `color-scheme: light dark` for native form controls.

### 10.10 Charts
- Use the `--viz-*` palette; legend is keyboard toggle (`aria-pressed`).  
- Tooltip becomes focusable popover on Tab; show **count + percentage**.

### 10.11 Chrome on macOS Notes
- Trackpad: ensure hover affordances and **no layout shift** on action reveal.  
- `accent-color` supported; use for checkboxes/radios.  
- Validate Back/Forward hash routing; avoid `preventDefault` on meta‑click.  

---

## 11. Gmail Add‑on Integration

### 11.1 Layout
- Single‑column, **cozy** density; 16px internal padding; 1–2 line truncation.  
- Material Symbols Outlined for iconography; avoid heavy imagery.

### 11.2 Interaction
- Inline spinner inside action buttons; optimistic toast with Undo when safe.  
- Sections: Classification → Follow‑up → VIP (conditional) → Footer (Open Dashboard).

---

## 12. Extensibility Framework
Unchanged. Add visual contracts (density, tokens) to plugin docs.

---

## 13. Security & Authentication
Unchanged. UI sync endpoint validates user and sanitizes `ui` shape.

---

## 14. Performance Optimization

- UI images policy: responsive sources, `loading="lazy"`, max width 1280px.  
- Long lists: `content-visibility:auto` (progressive enhance).  
- Debounce filters/search (300ms); throttle scroll handlers (100ms).  
- Avoid `backdrop-filter` fallbacks that cause repaint storms.

---

## 15. Testing Strategy

- **Visual regression:** static “component gallery” page + screenshot diffs in CI.  
- **Accessibility:** axe‑core checks; keyboard E2E for Queue and Drawer.  
- **Interaction tests:** ensure focus retention after rerender and after bulk ops.

---

## 16. Implementation Phases (revised)

**Phase V‑0 — Foundations (tokens, grid, density)**  
Define semantic tokens, grid, density, type roles; wire focus ring.

**Phase V‑1 — Core components pass**  
Buttons (tonal/destructive/loading), Inputs (helper/error), Cards (elevation/dividers), Toasts.

**Phase V‑2 — Tables & lists**  
Sticky header + first column, density modes, inline filters, bulk bar.

**Phase V‑3 — Drawer pattern & modals**  
Right drawer for details; modals for confirms; trap focus; background `inert`.

**Phase V‑4 — Charts & metrics**  
Palette, legends, focusable tooltips, micro‑trends in StatCards.

**Phase V‑5 — Dark mode & high contrast**  
Map surfaces; pattern fills for charts; `color-scheme` hints.

**Phase V‑6 — macOS keyboard & Workspace fit**  
⌘ shortcuts + hints; Gmail Add‑on compact rules and optimistic flows.

**Phase V‑7 — Perceived performance & rerender hygiene**  
Preserve focus; skeletons; optimistic updates.

**Phase V‑8 — Visual/a11y regression & docs**  
Gallery page; CI screenshot diffs; expand docs with examples.

---

## 17. Quality Checklist (additions)

### 17.1 Visual & Layout
- [ ] 12‑col grid enforced across pages; gutters/paddings match spec.  
- [ ] Buttons use **solid tonal** (no gradients); hover/pressed/focus states present.  
- [ ] Tables: sticky header + first column; density modes wired.  
- [ ] Drawer used for details; modals only for confirms.

### 17.2 Accessibility & Keyboard
- [ ] ⌘ shortcuts active in Chrome/macOS; hints appear in menus/tooltips.  
- [ ] Focus preserved on rerender; live announcements for selection/filters.  
- [ ] AA contrast in light/dark; pattern fills applied where needed.

### 17.3 Performance
- [ ] `content-visibility:auto` on long lists; images lazy‑loaded.  
- [ ] Zero unexpected layout shift on inline actions.

---

## Appendix A: File Structure (delta)
Add docs: `COMPONENT_VISUAL_SPEC.md` and `DENSITY_GUIDE.md`. Otherwise unchanged from v1.0.

## Appendix B: Technology Decisions (delta)
- **Local UI persistence:** `localStorage` (web) + optional server sync → `PropertiesService`.\
- **No gradients:** adopt tonal solids to align with Workspace visual language.

## Appendix C: Browser Support (revised)
| Browser | Version | Status |
|--------|---------|--------|
| **Chrome (macOS)** | Latest 2 | ✅ Primary target |
| Safari (macOS) | Latest 2 | ✅ Supported |
| Firefox / Edge | Latest 2 | ✅ Supported |
| Mobile | Latest 2 | ✅ Supported |

## Appendix D: Performance Targets (unchanged)
Bundle < 300KB; Page load < 1.5s; TTI < 2s; API < 300ms; Render < 50ms.

---

**Document Version:** 2.0  
**Last Updated:** 2025‑11‑15  
**Status:** Ready for Implementation
