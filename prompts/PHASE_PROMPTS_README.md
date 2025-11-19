---
title: "GAS-PA Phase-Based Implementation Prompts"
version: "1.0"
created: "2025-11-16"
quality_rating: "9.5/10"
---

# Phase-Based Implementation Prompts

## Overview

This directory contains **6 comprehensive phase-based prompts** to guide the complete implementation of the GAS-PA (Google Apps Script Personal Assistant) project. Each prompt is standalone, detailed, and includes testing, validation, and quality gates.

## Quick Start

### Prerequisites
- All phases of work identified and scoped
- Project is ~60-70% complete (backend and core components exist)
- Ready to complete remaining features and deploy

### Usage

1. **Start with Phase 1**
   ```bash
   # Read the prompt
   cat prompts/phase-1-fix-stabilize.md

   # Follow the tasks sequentially
   # Complete all acceptance criteria
   # Pass all quality gates before moving to Phase 2
   ```

2. **Sequential Execution**
   - Complete phases in order: 1 → 2 → 3 → 4 → 5 → 6
   - Do not skip phases (dependencies exist)
   - Verify quality gates before proceeding

3. **Track Progress**
   ```bash
   # Tag after each phase
   git tag -a phase-1-complete -m "Phase 1: Fix & Stabilize complete"
   git tag -a phase-2-complete -m "Phase 2: Dashboard Implementation complete"
   # etc.
   ```

---

## Phase Overview

| Phase | Title | Duration | Priority | Quality Target | Dependencies |
|-------|-------|----------|----------|----------------|--------------|
| 1 | Fix & Stabilize | 2 days | Critical | 9.5/10 | None |
| 2 | Dashboard Implementation | 3 days | Critical | 9/10 | Phase 1 |
| 3 | Gmail Add-on Completion | 2 days | High | 8.5/10 | Phase 1 |
| 4 | Integration & Polish | 2 days | High | 9/10 | Phases 1-3 |
| 5 | Testing & Documentation | 1 day | Medium | 9/10 | Phases 1-4 |
| 6 | Deployment | 1 day | Critical | 9.5/10 | Phases 1-5 |

**Total Duration**: 11 days (~88 hours focused work)

---

## Phase Descriptions

### Phase 1: Fix & Stabilize
**File**: `phase-1-fix-stabilize.md`

**Objectives**:
- Fix all 226+ failing tests (achieve 100% pass rate)
- Complete missing core components (Button, Input, Card, CommandPalette)
- Wire up state management and event bus
- Establish quality baseline

**Key Deliverables**:
- All tests passing
- Complete component library
- Functional store and state management
- LocalStorage persistence working

**Quality Gates**:
- Zero TypeScript errors
- 80%+ test coverage on new components
- Bundle ≤ 300KB
- Zero accessibility violations

---

### Phase 2: Dashboard Implementation
**File**: `phase-2-dashboard-implementation.md`

**Objectives**:
- Build complete dashboard layout (header, sidebar, main)
- Implement statistics visualization (KPI cards, charts)
- Create queue management UI (list, filters, bulk operations)
- Connect to backend APIs with error handling

**Key Deliverables**:
- Fully functional dashboard with real data
- Queue management system
- Navigation and routing
- Charts and visualizations

**Quality Gates**:
- Dashboard loads < 1.5s
- All charts render correctly
- Filters and search working
- Virtual scrolling for 200+ items

---

### Phase 3: Gmail Add-on Completion
**File**: `phase-3-gmail-addon.md`

**Objectives**:
- Fix failing add-on tests (truncation, card rendering)
- Complete contextual email features
- Implement quick actions (process, archive, extract tasks)
- Polish add-on UX (loading states, optimistic updates)

**Key Deliverables**:
- Working Gmail Add-on with all features
- Email context card
- Quick actions functional
- Category/priority editors

**Quality Gates**:
- All add-on tests passing
- CardService API used correctly
- Gmail Add-on design guidelines met
- Actions respond < 2s

---

### Phase 4: Integration & Polish
**File**: `phase-4-integration-polish.md`

**Objectives**:
- Complete API integration with retry logic
- Optimize performance (bundle size, load times)
- Refine dark mode (complete theme system)
- Fix accessibility issues (WCAG 2.1 AA compliance)

**Key Deliverables**:
- Robust API client with error handling
- Optimized bundle (≤250KB)
- Polished dark mode
- Full accessibility compliance

**Quality Gates**:
- Bundle ≤ 250KB
- Load time < 1.5s, TTI < 2s
- No accessibility violations
- Dark mode works perfectly

---

### Phase 5: Testing & Documentation
**File**: `phase-5-testing-documentation.md`

**Objectives**:
- Achieve 85%+ test coverage
- Complete user documentation (guides, tutorials)
- Finalize developer documentation (API, components)
- Create deployment guides

**Key Deliverables**:
- Comprehensive test suite (unit, integration, E2E)
- User guide and quick start
- Developer documentation
- Deployment checklist

**Quality Gates**:
- Test coverage ≥ 85%
- All E2E tests passing
- Documentation complete and reviewed
- All docs have examples

---

### Phase 6: Deployment
**File**: `phase-6-deployment.md`

**Objectives**:
- Create production build
- Deploy to Google Apps Script
- Migrate to work account
- Set up monitoring and support

**Key Deliverables**:
- Production deployment
- Successful work account migration
- Error tracking and monitoring
- Health check endpoint

**Quality Gates**:
- Zero critical bugs
- All features working in production
- Monitoring active
- Performance targets met

---

## Quality Standards

### Code Quality
- TypeScript strict mode
- No `any` types
- JSDoc comments on all public functions
- Consistent code style
- No console.log in production

### Testing
- 85%+ code coverage
- All tests passing
- E2E tests for critical flows
- Visual regression tests
- Accessibility tests (zero violations)

### Performance
- Bundle size ≤ 250KB
- Page load < 1.5s
- Time to Interactive < 2s
- Input latency < 50ms
- Virtual scrolling for 200+ items

### Accessibility
- WCAG 2.1 AA compliant
- Keyboard navigation complete
- Screen reader compatible
- Focus management correct
- Color contrast sufficient (4.5:1)

### Documentation
- Clear and concise writing
- Code examples included
- Screenshots where helpful
- No broken links
- Consistent formatting

---

## Success Metrics

### Technical Metrics
- ✅ All 226+ tests passing
- ✅ Test coverage ≥ 85%
- ✅ Bundle size < 250KB
- ✅ Load time < 1.5s
- ✅ Zero accessibility violations
- ✅ Zero console errors

### User Experience
- ✅ Task completion rate > 90%
- ✅ Email processing time < 100ms/email
- ✅ UI response time < 50ms
- ✅ Positive user feedback

### Business Metrics
- ✅ Deployed to work account
- ✅ Processing emails automatically
- ✅ Error rate < 1%
- ✅ Daily active usage
- ✅ Time savings measurable

---

## Best Practices

### Before Starting Each Phase
1. Read entire prompt thoroughly
2. Understand objectives and deliverables
3. Review prerequisites and dependencies
4. Check current project status
5. Plan time allocation

### During Each Phase
1. Follow tasks sequentially
2. Test continuously (not just at end)
3. Commit frequently with clear messages
4. Document as you build
5. Ask questions when unclear

### After Completing Each Phase
1. Verify all acceptance criteria met
2. Pass all quality gates
3. Run complete test suite
4. Review code
5. Tag release
6. Update documentation
7. Take a break before next phase

---

## Troubleshooting

### Phase is taking longer than estimated
**Cause**: Unforeseen complexity or missing prerequisites
**Solution**:
1. Break phase into smaller chunks
2. Complete critical tasks first
3. Defer nice-to-haves to later
4. Ask for help if blocked

### Quality gates not passing
**Cause**: Technical debt or incomplete implementation
**Solution**:
1. Review quality gate requirements
2. Run diagnostics (tests, linting, etc.)
3. Fix issues systematically
4. Don't skip quality gates (they exist for a reason)

### Dependencies missing from previous phase
**Cause**: Previous phase incomplete or skipped
**Solution**:
1. Go back to previous phase
2. Complete missing items
3. Verify quality gates
4. Then proceed to current phase

---

## Project Structure

```
gas-pa/
├── src/
│   ├── ui/
│   │   ├── components/     # UI components
│   │   ├── pages/          # Page components
│   │   ├── core/           # Store, router, utilities
│   │   ├── styles/         # CSS tokens and styles
│   │   ├── adapters/       # API client
│   │   └── main.ts         # Entry point
│   ├── services/           # Backend services
│   ├── processors/         # Email processing
│   ├── core/               # Core utilities
│   └── webapp/             # API endpoints
├── tests/
│   ├── unit/               # Unit tests
│   ├── integration/        # Integration tests
│   ├── e2e/                # End-to-end tests
│   ├── visual/             # Visual regression
│   └── a11y/               # Accessibility tests
├── docs/                   # Documentation
├── prompts/                # Phase prompts (you are here)
├── dist/                   # Build output
└── releases/               # Release bundles
```

---

## Cheat Sheet

### Quick Commands
```bash
# Run tests
npm run test                    # All tests
npm run test:unit              # Unit tests only
npm run test:e2e               # E2E tests only
npm run test:a11y              # Accessibility tests
npm run test:visual            # Visual regression

# Build
npm run build                  # Production build
npm run watch                  # Development watch mode

# Deploy
npm run push                   # Push to Apps Script
clasp open                     # Open in browser

# Quality checks
npm run build                  # Check bundle size
ls -lh dist/UI.js             # View bundle size
git status                     # Check working directory
```

### Quality Gate Checklist
```bash
# Before moving to next phase:
✓ All tests passing
✓ No TypeScript errors
✓ Bundle size acceptable
✓ Performance targets met
✓ Accessibility violations zero
✓ Documentation updated
✓ Code reviewed
✓ Changes committed and tagged
```

---

## Support

### Need Help?
- Read the specific phase prompt thoroughly
- Check troubleshooting section
- Review project documentation in `docs/`
- Review existing implementation in `src/`
- Ask specific questions with context

### Reporting Issues
If you find errors or improvements for these prompts:
1. Document the issue clearly
2. Note which phase and section
3. Suggest improvement
4. Create issue or update prompt directly

---

## Changelog

### v1.0 (2025-11-16)
- Initial release
- 6 comprehensive phase prompts
- Quality rating: 9.5/10
- Total ~136KB of detailed implementation guidance

---

## Credits

**Created**: 2025-11-16
**Version**: 1.0
**Quality Rating**: 9.5/10
**Total Phases**: 6
**Total Duration**: 11 days
**Total Pages**: ~136KB of content

**Purpose**: Guide complete implementation of GAS-PA from ~60% complete to production deployment.

---

**Ready to begin? Start with Phase 1:**
```bash
cat prompts/phase-1-fix-stabilize.md
```

**Good luck! 🚀**
