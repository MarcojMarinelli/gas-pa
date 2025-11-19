# Addon Cards Test Fix Pattern

## Problem
The addon.cards tests are failing because they use `expect()` assertions inside `page.evaluate()` blocks. The `expect` function from Playwright is not available in the browser context.

## Solution Pattern
Transform tests from using `expect` inside `page.evaluate()` to returning data and asserting outside.

### Before (Broken):
```typescript
test('example test', async ({ page }) => {
  await page.evaluate(() => {
    const { someFunction } = (window as any).addonComponents;
    const result = someFunction({ param: 'value' });

    const mockMethod = result.someMethod as jest.Mock;
    expect(mockMethod).toHaveBeenCalled();
    expect(mockMethod).toHaveBeenCalledWith('expectedValue');
  });
});
```

### After (Fixed):
```typescript
test('example test', async ({ page }) => {
  const result = await page.evaluate(() => {
    const { someFunction } = (window as any).addonComponents;
    const result = someFunction({ param: 'value' });

    const mockMethod = result.someMethod as any;
    const wasCalled = mockMethod.mock && mockMethod.mock.calls.length > 0;
    const callValue = wasCalled ? mockMethod.mock.calls[0][0] : null;

    return {
      wasCalled,
      callValue
    };
  });

  expect(result.wasCalled).toBeTruthy();
  expect(result.callValue).toBe('expectedValue');
});
```

## Key Changes
1. **Return data from page.evaluate()** instead of asserting inside
2. **Check for mock existence** with `mockMethod.mock && mockMethod.mock.calls.length > 0`
3. **Extract values safely** with conditional access
4. **Use expect() outside** the page.evaluate() block

## Tests Fixed (5/21)
✅ should truncate KeyValue content to single line when truncate=1
✅ should truncate KeyValue content to two lines when truncate=2
✅ should preserve full text when no truncation specified
✅ should handle empty content gracefully
✅ should create undo action with timeout

## Tests Remaining (16/21)
- should handle process queue with undo
- should execute undo operation
- should handle archive with undo support
- should handle queue message with undo
- should apply Material Symbols Outlined icons to KeyValue
- should apply Material Symbols icons to buttons
- should handle icon mapping for all supported icons
- should apply icons to decorated text widgets
- should build homepage card with all sections
- should build context card for selected message
- should handle settings updates
- should handle refresh action
- should create button sets
- should create date time picker
- should create grid with items
- should handle text input validation setup

## Automation Script
A helper script `fix-addon-tests.js` was created to identify tests needing fixes.