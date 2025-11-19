---
title: "GAS‑PA UI Implementation — Prompt Packet"
date: 2025-11-15
target_browser: "Chrome on macOS (latest 2)"
dev_env: "Headless Linux + Claude Code (Opus 4.1) + esbuild + clasp"
spec_source: "docs/UI_IMPLEMENTATION_PLAN_v2.md"
---

> Paste the **exact excerpts** from the indicated sections of `docs/UI_IMPLEMENTATION_PLAN_v2.md` into the **Spec excerpts** block below before sending to Claude Code. Keep acceptance criteria verbatim.

# Prompt Packet Usage Guide

Use these Markdown prompts with Claude Code (Opus 4.1) to implement the full UI design documented in `docs/UI_IMPLEMENTATION_PLAN_v2.md`.

**Workflow:**
1. Paste the *System / Standing Instructions* once per Claude session.
2. Open one packet (e.g., 00‑foundations.md).
3. Copy the relevant spec excerpts from `docs/UI_IMPLEMENTATION_PLAN_v2.md` into the Spec section.
4. Send the Task + Deliverables to Claude.
5. Apply the generated files, run Playwright tests headlessly, and commit.
6. Repeat sequentially (00 → 07).

Environment: Headless Linux, deployed via `clasp` to Google Workspace, target Chrome (macOS).

Updated: 2025-11-15
