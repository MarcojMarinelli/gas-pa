# GAS-PA Testing Suite

## Overview
Comprehensive visual and accessibility testing for the GAS-PA UI components using Playwright.

## Test Structure

### Visual Tests (`/tests/visual/`)
- `foundation.spec.ts` - Core UI foundation elements, themes, and density modes
- `dashboard.spec.ts` - Dashboard layout and widget components
- `overlays.spec.ts` - Modal, drawer, tooltip, and popover components
- `table.spec.ts` - Table component with sorting, filtering, and pagination

### Accessibility Tests (`/tests/a11y/`)
- `accessibility.spec.ts` - WCAG 2.1 AA compliance testing with axe-core
- `keyboard-navigation.spec.ts` - Complete keyboard navigation and focus management

## Running Tests Locally

### Prerequisites
```bash
# Install dependencies
npm install

# Install Playwright browsers (first time only)
npx playwright install chromium
```

### Run All Tests
```bash
npm test
```

### Run Specific Test Suites
```bash
# Visual tests only
npm run test:visual

# Accessibility tests only
npm run test:a11y

# CI test suite (both visual and a11y)
npm run test:ci
```

### Update Visual Snapshots
```bash
# Update all visual snapshots
npm run snapshots:update

# Update specific test snapshots
npx playwright test tests/visual/foundation.spec.ts --update-snapshots
```

### Debug Tests
```bash
# Run tests in headed mode
npx playwright test --headed

# Run specific test file
npx playwright test tests/visual/table.spec.ts

# Run tests with debugging
npx playwright test --debug
```

## CI/CD Pipeline

The GitHub Actions workflow (`.github/workflows/ci.yml`) runs automatically on:
- Push to main, develop, or feature branches
- Pull requests to main or develop

### CI Jobs

1. **visual-and-a11y-tests**
   - Runs all visual regression tests
   - Runs all accessibility tests
   - Uploads test results as artifacts
   - Comments on PRs with test status

2. **update-snapshots**
   - Triggered manually or with `[update snapshots]` in commit message
   - Updates visual baseline snapshots
   - Auto-commits updated snapshots

3. **lighthouse-performance**
   - Runs on pull requests
   - Checks performance metrics
   - Validates bundle size (≤300KB limit)

4. **code-quality**
   - TypeScript type checking
   - Bundle size verification
   - Code quality metrics

## Test Configuration

### Viewport Settings
- Default: 1280x800 @ 2x device scale factor
- Mobile: 375x667
- Tablet: 768x1024

### Browser Configuration
- Chromium with consistent font rendering
- Headless mode in CI
- Fonts: Inter, Liberation, DejaVu

### Accessibility Standards
- WCAG 2.1 Level AA compliance
- No critical or serious violations allowed
- Keyboard navigation fully supported
- Focus management and ARIA attributes

## Troubleshooting

### Common Issues

1. **Missing HTML files**
   - Ensure gallery HTML files exist in `src/ui/gallery/`
   - Run `npm run build` to generate UI assets

2. **Font rendering differences**
   - Install system fonts: `sudo apt-get install fonts-inter fonts-liberation fonts-dejavu-core`
   - Use `--update-snapshots` to regenerate baselines

3. **Test timeouts**
   - Increase timeout in test: `test.setTimeout(30000)`
   - Check if static server is running: `npm run serve:headless`

4. **Snapshot mismatches**
   - Review differences in `test-results/` directory
   - Update snapshots if changes are intentional
   - Ensure consistent viewport and DPI settings

## Best Practices

1. **Writing Visual Tests**
   - Always wait for fonts to load: `await page.evaluate(() => document.fonts.ready)`
   - Use consistent viewport settings
   - Disable animations for snapshots
   - Take focused snapshots of components, not just full pages

2. **Writing Accessibility Tests**
   - Test keyboard navigation thoroughly
   - Verify ARIA attributes and roles
   - Check color contrast ratios
   - Test with screen reader announcements

3. **Maintaining Tests**
   - Update snapshots when UI intentionally changes
   - Keep test data minimal and focused
   - Use data-testid attributes for reliable selectors
   - Document expected failures or known issues

## Acceptance Criteria Checklist

- [ ] Playwright snapshots are stable across runs
- [ ] axe-core reports 0 serious accessibility issues
- [ ] CI pipeline fails appropriately on visual diffs
- [ ] CI pipeline fails on accessibility regressions
- [ ] Test reports are generated and uploaded as artifacts
- [ ] PR comments show test status summary
- [ ] Bundle size stays under 300KB limit
- [ ] All tests pass in headless Linux CI environment