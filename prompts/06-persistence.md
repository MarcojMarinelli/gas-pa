---
title: "GAS‑PA UI Implementation — Prompt Packet"
date: 2025-11-15
target_browser: "Chrome on macOS (latest 2)"
dev_env: "Headless Linux + Claude Code (Opus 4.1) + esbuild + clasp"
spec_source: "docs/UI_IMPLEMENTATION_PLAN_v2.md"
---

> Paste the **exact excerpts** from the indicated sections of `docs/UI_IMPLEMENTATION_PLAN_v2.md` into the **Spec excerpts** block below before sending to Claude Code. Keep acceptance criteria verbatim.

# Persistence: Local UI Prefs + Optional Sync

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
- §8 Data Flow & State Management
- §3.3 Constraints

## Deliverables
1) /src/ui/core/store.ts
2) /src/ui/adapters/host.ts
3) /server/system.updateConfig.gs
4) /tests/unit/persistence.spec.ts

## Acceptance Criteria
- [ ] Prefs stored/restored from localStorage
- [ ] Optional sync via server bridge
- [ ] No direct PropertiesService in client

