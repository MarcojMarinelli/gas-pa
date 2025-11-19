const fs = require('fs');

const filePath = 'tests/unit/addon.cards.spec.ts';
let content = fs.readFileSync(filePath, 'utf-8');

// Pattern 1: Fix "should handle process queue with undo" (lines 256-290)
content = content.replace(
  /test\('should handle process queue with undo', async \(\{ page \}\) => \{[\s\S]*?const result = await page\.evaluate\(\(\) => \{[\s\S]*?const response = processEmailQueue\(mockEvent as any\);[\s\S]*?\/\/ Check notification was created\n      const mockNotification = \(window as any\)\.mockCardService\.newNotification\(\);\n      const setText = mockNotification\.setText as any;\n      const notificationCalled = setText\.mock && setText\.mock\.calls\.length > 0;\n      const notificationText = notificationCalled \? setText\.mock\.calls\[0\]\[0\] : '';\n\n      \/\/ Check state change for undo\n      const mockResponseBuilder = \(window as any\)\.mockCardService\.newActionResponseBuilder\(\);\n      const setStateChanged = mockResponseBuilder\.setStateChanged as any;\n      const stateChangeCalled = setStateChanged\.mock && setStateChanged\.mock\.calls\.length > 0;\n      const stateChangeValue = stateChangeCalled \? setStateChanged\.mock\.calls\[0\]\[0\] : false;/,
  `test('should handle process queue with undo', async ({ page }) => {
    const result = await page.evaluate(() => {
      const { processEmailQueue } = (window as any).addonFunctions;

      const mockEvent = {
        parameters: { showUndo: 'true' }
      };

      // Clear previous instances
      (window as any).clearMockInstances();

      const response = processEmailQueue(mockEvent as any);

      // Check notification was created from tracked instances
      const notifications = (window as any)._mockInstances.notifications;
      const mockNotification = notifications[notifications.length - 1];
      const setText = mockNotification ? mockNotification.setText as any : null;
      const notificationCalled = setText && setText.mock && setText.mock.calls.length > 0;
      const notificationText = notificationCalled ? setText.mock.calls[0][0] : '';

      // Check state change for undo from tracked instances
      const responseBuilders = (window as any)._mockInstances.responseBuilders;
      const mockResponseBuilder = responseBuilders[responseBuilders.length - 1];
      const setStateChanged = mockResponseBuilder ? mockResponseBuilder.setStateChanged as any : null;
      const stateChangeCalled = setStateChanged && setStateChanged.mock && setStateChanged.mock.calls.length > 0;
      const stateChangeValue = stateChangeCalled ? setStateChanged.mock.calls[0][0] : false;`
);

// Pattern 2: Fix "should execute undo operation" (lines 292-319)
content = content.replace(
  /test\('should execute undo operation', async \(\{ page \}\) => \{[\s\S]*?const result = await page\.evaluate\(\(\) => \{[\s\S]*?const response = undoProcessQueue\(mockEvent as any\);[\s\S]*?\/\/ Check restoration notification\n      const mockNotification = \(window as any\)\.mockCardService\.newNotification\(\);\n      const setText = mockNotification\.setText as any;\n      const called = setText\.mock && setText\.mock\.calls\.length > 0;\n      const text = called \? setText\.mock\.calls\[0\]\[0\] : '';/,
  `test('should execute undo operation', async ({ page }) => {
    const result = await page.evaluate(() => {
      const { undoProcessQueue } = (window as any).addonFunctions;

      const mockEvent = {
        parameters: {
          processedCount: '5',
          timestamp: Date.now().toString()
        }
      };

      // Clear previous instances
      (window as any).clearMockInstances();

      const response = undoProcessQueue(mockEvent as any);

      // Check restoration notification from tracked instances
      const notifications = (window as any)._mockInstances.notifications;
      const mockNotification = notifications[notifications.length - 1];
      const setText = mockNotification ? mockNotification.setText as any : null;
      const called = setText && setText.mock && setText.mock.calls.length > 0;
      const text = called ? setText.mock.calls[0][0] : '';`
);

fs.writeFileSync(filePath, content, 'utf-8');
console.log('Fixed addon.cards tests batch 1 (processEmailQueue, undoProcessQueue)');