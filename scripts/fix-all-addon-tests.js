const fs = require('fs');

const filePath = 'tests/unit/addon.cards.spec.ts';
let content = fs.readFileSync(filePath, 'utf-8');

// Generic function to add clearMockInstances and fix mock lookups
const fixes = [
  // Pattern for archiveMessage test
  {
    search: /test\('should handle archive with undo support', async \(\{ page \}\) => \{\s*const result = await page\.evaluate\(\(\) => \{\s*const \{ archiveMessage \} = \(window as any\)\.addonFunctions;\s*const mockEvent[\s\S]*?const response = archiveMessage\(mockEvent as any\);/,
    replacement: match => match.replace(
      'const response = archiveMessage(mockEvent as any);',
      '// Clear previous instances\n      (window as any).clearMockInstances();\n\n      const response = archiveMessage(mockEvent as any);'
    )
  },
  {
    search: /\/\/ Check success notification\s*const mockNotification = \(window as any\)\.mockCardService\.newNotification\(\);/g,
    replacement: '// Check success notification from tracked instances\n      const notifications = (window as any)._mockInstances.notifications;\n      const mockNotification = notifications[notifications.length - 1];'
  },
  {
    search: /\/\/ Check navigation pop\s*const mockResponseBuilder = \(window as any\)\.mockCardService\.newActionResponseBuilder\(\);/g,
    replacement: '// Check navigation from tracked instances\n      const responseBuilders = (window as any)._mockInstances.responseBuilders;\n      const mockResponseBuilder = responseBuilders[responseBuilders.length - 1];'
  },
  {
    search: /\/\/ Check state change for undo\s*const mockResponseBuilder = \(window as any\)\.mockCardService\.newActionResponseBuilder\(\);/g,
    replacement: '// Check state change from tracked instances\n      const responseBuilders = (window as any)._mockInstances.responseBuilders;\n      const mockResponseBuilder = responseBuilders[responseBuilders.length - 1];'
  }
];

// Apply fixes
fixes.forEach(fix => {
  if (fix.replacement instanceof Function) {
    content = content.replace(fix.search, fix.replacement);
  } else {
    content = content.replace(fix.search, fix.replacement);
  }
});

// Fix all remaining function calls that create new mocks
// Fix queueMessage test
content = content.replace(
  /test\('should handle queue message with undo', async \(\{ page \}\) => \{\s*const result = await page\.evaluate\(\(\) => \{\s*const \{ queueMessage \} = \(window as any\)\.addonFunctions;\s*const mockEvent[\s\S]*?const response = queueMessage\(mockEvent as any\);/,
  match => match.replace(
    'const response = queueMessage(mockEvent as any);',
    '// Clear previous instances\n      (window as any).clearMockInstances();\n\n      const response = queueMessage(mockEvent as any);'
  )
);

// Add null checks to all setText/setStateChanged calls
content = content.replace(
  /const setText = mockNotification\.setText as any;/g,
  'const setText = mockNotification ? mockNotification.setText as any : null;'
);

content = content.replace(
  /const setNavigation = mockResponseBuilder\.setNavigation as any;/g,
  'const setNavigation = mockResponseBuilder ? mockResponseBuilder.setNavigation as any : null;'
);

content = content.replace(
  /const setStateChanged = mockResponseBuilder\.setStateChanged as any;/g,
  'const setStateChanged = mockResponseBuilder ? mockResponseBuilder.setStateChanged as any : null;'
);

// Fix all the "Called" checks to include null checks
content = content.replace(
  /const notificationCalled = setText\.mock && setText\.mock\.calls\.length > 0;/g,
  'const notificationCalled = setText && setText.mock && setText.mock.calls.length > 0;'
);

content = content.replace(
  /const navigationCalled = setNavigation\.mock && setNavigation\.mock\.calls\.length > 0;/g,
  'const navigationCalled = setNavigation && setNavigation.mock && setNavigation.mock.calls.length > 0;'
);

content = content.replace(
  /const stateChangeCalled = setStateChanged\.mock && setStateChanged\.mock\.calls\.length > 0;/g,
  'const stateChangeCalled = setStateChanged && setStateChanged.mock && setStateChanged.mock.calls.length > 0;'
);

fs.writeFileSync(filePath, content, 'utf-8');
console.log('Fixed all addon.cards tests with tracked instances');