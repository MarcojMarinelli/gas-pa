---
title: "GAS‑PA UI Implementation — Prompt Packet"
date: 2025-11-15
target_browser: "Chrome on macOS (latest 2)"
dev_env: "Headless Linux + Claude Code (Opus 4.1) + esbuild + clasp"
spec_source: "docs/UI_IMPLEMENTATION_PLAN_v2.md"
---

> Paste the **exact excerpts** from the indicated sections of `docs/UI_IMPLEMENTATION_PLAN_v2.md` into the **Spec excerpts** block below before sending to Claude Code. Keep acceptance criteria verbatim.

# Foundations: Tokens, Grid, Density, Dark Mode, Gallery, Playwright

### System / Standing Instructions
You are a Staff UI Engineer specialized in Google Workspace front‑ends (Apps Script HtmlService + Gmail Add‑ons).

Constraints:
- Vanilla TypeScript + CSS variables; bundle via esbuild to a single IIFE (no dynamic import at runtime).
- Visual language MUST follow the spec excerpts: 12‑column grid, compact/comfortable density, solid (non‑gradient) buttons, sticky table header/first column, elevation tokens e1–e5, 2px focus ring, dark‑mode mapping, Chrome on macOS target.
- Headless Linux CI: deterministic rendering via Playwright Chromium; fonts Inter/Liberation/DejaVu; deviceScaleFactor=2.
- Persistence: localStorage for UI prefs (theme, density, sidebar). Cross‑device sync only via server bridge → PropertiesService (client must not call PropertiesService directly).
- Performance: table virtualization ≥200 rows; UI bundle ≤300KB; avoid backdrop‑filter; respect prefers‑reduced‑motion.
- Accessibility: WCAG 2.1 AA; keyboard‑only flows; aria‑live updates; focus trapping for overlays.


## Spec excerpts
- §10 Styling System (10.1–10.11)
- §6 Dashboard Design (6.1 Grid & Composition)
- §10.11 Chrome on macOS Notes
- §14 Performance Optimization

## Deliverables
1) /src/ui/styles/tokens.css
2) /src/ui/styles/components.css
3) /src/ui/styles/grid.css
4) /src/ui/gallery/index.html
5) /tests/visual/foundation.spec.ts

## Acceptance Criteria
- [ ] Buttons solid/tonal; hover +4%, active −8%, focus ring 2px
- [ ] 12‑col grid; gutters 24px; 1280px container
- [ ] Density toggles work app‑wide
- [ ] Dark mode maps borders/inputs
- [ ] Gallery passes Playwright snapshots

