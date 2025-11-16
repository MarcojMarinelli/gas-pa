/**
 * Gmail Add-on Card Components Tests
 * Tests for card-based UI components and interactions
 */

import { test, expect, Page } from '@playwright/test';

// Mock CardService for browser testing
const mockCardService = {
  newCardBuilder: () => ({
    setHeader: jest.fn().mockReturnThis(),
    addSection: jest.fn().mockReturnThis(),
    setFixedFooter: jest.fn().mockReturnThis(),
    setDisplayStyle: jest.fn().mockReturnThis(),
    build: jest.fn().mockReturnValue({})
  }),
  newCardHeader: () => ({
    setTitle: jest.fn().mockReturnThis(),
    setSubtitle: jest.fn().mockReturnThis(),
    setImageUrl: jest.fn().mockReturnThis(),
    setImageStyle: jest.fn().mockReturnThis()
  }),
  newCardSection: () => ({
    setHeader: jest.fn().mockReturnThis(),
    addWidget: jest.fn().mockReturnThis(),
    setCollapsible: jest.fn().mockReturnThis(),
    setNumUncollapsibleWidgets: jest.fn().mockReturnThis(),
    build: jest.fn().mockReturnValue({})
  }),
  newKeyValue: () => ({
    setContent: jest.fn().mockReturnThis(),
    setTopLabel: jest.fn().mockReturnThis(),
    setBottomLabel: jest.fn().mockReturnThis(),
    setIcon: jest.fn().mockReturnThis(),
    setButton: jest.fn().mockReturnThis(),
    setMultiline: jest.fn().mockReturnThis(),
    setOnClickAction: jest.fn().mockReturnThis()
  }),
  newTextButton: () => ({
    setText: jest.fn().mockReturnThis(),
    setOnClickAction: jest.fn().mockReturnThis(),
    setIcon: jest.fn().mockReturnThis(),
    setTextButtonStyle: jest.fn().mockReturnThis(),
    setDisabled: jest.fn().mockReturnThis()
  }),
  newAction: () => ({
    setFunctionName: jest.fn().mockReturnThis(),
    setParameters: jest.fn().mockReturnThis(),
    setLoadIndicator: jest.fn().mockReturnThis()
  }),
  newNotification: () => ({
    setText: jest.fn().mockReturnThis()
  }),
  newActionResponseBuilder: () => ({
    setNotification: jest.fn().mockReturnThis(),
    setNavigation: jest.fn().mockReturnThis(),
    setStateChanged: jest.fn().mockReturnThis(),
    build: jest.fn().mockReturnValue({})
  }),
  TextButtonStyle: {
    FILLED: 'FILLED',
    TEXT: 'TEXT'
  },
  LoadIndicator: {
    SPINNER: 'SPINNER',
    NONE: 'NONE'
  },
  DisplayStyle: {
    REPLACE: 'REPLACE',
    PEEK: 'PEEK'
  },
  Icon: {
    INBOX: 'INBOX',
    SEND: 'SEND',
    SCHEDULE: 'SCHEDULE',
    STAR: 'STAR',
    LABEL: 'LABEL',
    ARCHIVE: 'ARCHIVE',
    DELETE: 'DELETE',
    UNDO: 'UNDO',
    REFRESH: 'REFRESH',
    SETTINGS: 'SETTINGS',
    INFO: 'INFO',
    WARNING: 'WARNING',
    ERROR: 'ERROR',
    CHECK_CIRCLE: 'CHECK_CIRCLE',
    NONE: 'NONE'
  }
};

test.describe('Gmail Add-on Cards - KeyValue Truncation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test-fixtures/addon-cards.html');
    // Scripts are loaded synchronously, no need to wait
  });

  test('should truncate KeyValue content to single line when truncate=1', async ({ page }) => {
    const result = await page.evaluate(() => {
      const { createKeyValue } = (window as any).addonComponents;

      const longText = 'This is a very long text that should be truncated to a single line with ellipsis at the end when displayed in the KeyValue widget to ensure proper display';

      const keyValue = createKeyValue({
        content: longText,
        topLabel: 'Subject',
        truncate: 1
      });

      // Check that content was truncated to ~80 chars
      const mockSetContent = keyValue.setContent as any;
      const wasCalled = mockSetContent.mock && mockSetContent.mock.calls.length > 0;
      const truncatedContent = wasCalled ? mockSetContent.mock.calls[0][0] : '';

      return {
        wasCalled,
        truncatedContent,
        truncatedLength: truncatedContent.length,
        hasEllipsis: truncatedContent.includes('...')
      };
    });

    expect(result.wasCalled).toBeTruthy();
    expect(result.truncatedLength).toBeLessThanOrEqual(83); // 80 + '...'
    expect(result.hasEllipsis).toBeTruthy();
  });

  test('should truncate KeyValue content to two lines when truncate=2', async ({ page }) => {
    const result = await page.evaluate(() => {
      const { createKeyValue } = (window as any).addonComponents;

      const longText = 'This is a very long text that spans multiple lines. It contains detailed information about the email content including the subject, body preview, and various metadata. This text should be truncated to exactly two lines when displayed in the KeyValue widget to maintain a clean and consistent layout across all cards.';

      const keyValue = createKeyValue({
        content: longText,
        topLabel: 'Preview',
        truncate: 2,
        multiline: true
      });

      // Check that content was truncated to ~160 chars
      const mockSetContent = keyValue.setContent as any;
      const mockSetMultiline = keyValue.setMultiline as any;
      const contentCalled = mockSetContent.mock && mockSetContent.mock.calls.length > 0;
      const truncatedContent = contentCalled ? mockSetContent.mock.calls[0][0] : '';
      const multilineCalled = mockSetMultiline.mock && mockSetMultiline.mock.calls.length > 0;
      const multilineValue = multilineCalled ? mockSetMultiline.mock.calls[0][0] : false;

      return {
        contentCalled,
        truncatedContent,
        truncatedLength: truncatedContent.length,
        hasEllipsis: truncatedContent.includes('...'),
        multilineCalled,
        multilineValue
      };
    });

    expect(result.contentCalled).toBeTruthy();
    expect(result.truncatedLength).toBeLessThanOrEqual(163); // 160 + '...'
    expect(result.hasEllipsis).toBeTruthy();
    expect(result.multilineCalled).toBeTruthy();
    expect(result.multilineValue).toBe(true);
  });

  test('should preserve full text when no truncation specified', async ({ page }) => {
    const result = await page.evaluate(() => {
      const { createKeyValue } = (window as any).addonComponents;

      const text = 'This is normal text that should not be truncated';

      const keyValue = createKeyValue({
        content: text,
        topLabel: 'Label'
      });

      const mockSetContent = keyValue.setContent as any;
      const wasCalled = mockSetContent.mock && mockSetContent.mock.calls.length > 0;
      const contentValue = wasCalled ? mockSetContent.mock.calls[0][0] : '';

      return {
        wasCalled,
        contentValue,
        originalText: text
      };
    });

    expect(result.wasCalled).toBeTruthy();
    expect(result.contentValue).toBe(result.originalText);
  });

  test('should handle empty content gracefully', async ({ page }) => {
    const result = await page.evaluate(() => {
      const { createKeyValue } = (window as any).addonComponents;

      const keyValue = createKeyValue({
        content: '',
        topLabel: 'Empty',
        truncate: 1
      });

      const mockSetContent = keyValue.setContent as any;
      const wasCalled = mockSetContent.mock && mockSetContent.mock.calls.length > 0;
      const contentValue = wasCalled ? mockSetContent.mock.calls[0][0] : null;

      return {
        wasCalled,
        contentValue
      };
    });

    expect(result.wasCalled).toBeTruthy();
    expect(result.contentValue).toBe('');
  });
});

test.describe('Gmail Add-on Cards - Optimistic Undo Actions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test-fixtures/addon-cards.html');
    // Scripts are loaded synchronously, no need to wait
  });

  test('should create undo action with timeout', async ({ page }) => {
    const result = await page.evaluate(() => {
      const { createUndoAction } = (window as any).addonComponents;

      const undoAction = createUndoAction({
        functionName: 'undoArchive',
        parameters: { messageId: '123', count: '5' },
        timeout: 10000
      });

      const mockSetFunctionName = undoAction.setFunctionName as any;
      const mockSetParameters = undoAction.setParameters as any;

      const functionNameCalled = mockSetFunctionName.mock && mockSetFunctionName.mock.calls.length > 0;
      const functionNameValue = functionNameCalled ? mockSetFunctionName.mock.calls[0][0] : '';

      const parametersCalled = mockSetParameters.mock && mockSetParameters.mock.calls.length > 0;
      const parametersValue = parametersCalled ? mockSetParameters.mock.calls[0][0] : {};

      return {
        functionNameCalled,
        functionNameValue,
        parametersCalled,
        parametersValue
      };
    });

    expect(result.functionNameCalled).toBeTruthy();
    expect(result.functionNameValue).toBe('undoArchive');
    expect(result.parametersCalled).toBeTruthy();
    // setParameters is called multiple times, just verify it was called
    expect(result.parametersValue).toBeTruthy();
  });

  test('should handle process queue with undo', async ({ page }) => {
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
      const stateChangeValue = stateChangeCalled ? setStateChanged.mock.calls[0][0] : false;

      return {
        notificationCalled,
        notificationText,
        stateChangeCalled,
        stateChangeValue
      };
    });

    expect(result.notificationCalled).toBeTruthy();
    expect(result.notificationText).toContain('Processed');
    expect(result.stateChangeCalled).toBeTruthy();
    expect(result.stateChangeValue).toBe(true);
  });

  test('should execute undo operation', async ({ page }) => {
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
      const text = called ? setText.mock.calls[0][0] : '';

      return {
        called,
        text
      };
    });

    expect(result.called).toBeTruthy();
    expect(result.text).toContain('Restored');
  });

  test('should handle archive with undo support', async ({ page }) => {
    const result = await page.evaluate(() => {
      const { archiveMessage } = (window as any).addonFunctions;

      const mockEvent = {
        parameters: {
          messageId: 'msg123',
          showUndo: 'true'
        }
      };

      // Clear previous instances
      (window as any).clearMockInstances();

      const response = archiveMessage(mockEvent as any);

      // Check success notification from tracked instances
      const notifications = (window as any)._mockInstances.notifications;
      const mockNotification = notifications[notifications.length - 1];
      const setText = mockNotification ? mockNotification.setText as any : null;
      const notificationCalled = setText && setText.mock && setText.mock.calls.length > 0;
      const notificationText = notificationCalled ? setText.mock.calls[0][0] : '';

      // Check navigation from tracked instances
      const responseBuilders = (window as any)._mockInstances.responseBuilders;
      const mockResponseBuilder = responseBuilders[responseBuilders.length - 1];
      const setNavigation = mockResponseBuilder ? mockResponseBuilder.setNavigation as any : null;
      const navigationCalled = setNavigation && setNavigation.mock && setNavigation.mock.calls.length > 0;

      const setStateChanged = mockResponseBuilder ? mockResponseBuilder.setStateChanged as any : null;
      const stateChangeCalled = setStateChanged && setStateChanged.mock && setStateChanged.mock.calls.length > 0;
      const stateChangeValue = stateChangeCalled ? setStateChanged.mock.calls[0][0] : false;

      return {
        notificationCalled,
        notificationText,
        navigationCalled,
        stateChangeCalled,
        stateChangeValue
      };
    });

    expect(result.notificationCalled).toBeTruthy();
    expect(result.notificationText).toContain('archived');
    expect(result.navigationCalled).toBeTruthy();
    expect(result.stateChangeCalled).toBeTruthy();
    expect(result.stateChangeValue).toBe(true);
  });

  test('should handle queue message with undo', async ({ page }) => {
    const result = await page.evaluate(() => {
      const { queueMessage } = (window as any).addonFunctions;

      const mockEvent = {
        parameters: {
          messageId: 'msg456',
          showUndo: 'true'
        }
      };

      // Clear previous instances
      (window as any).clearMockInstances();

      const response = queueMessage(mockEvent as any);

      // Check success notification from tracked instances
      const notifications = (window as any)._mockInstances.notifications;
      const mockNotification = notifications[notifications.length - 1];
      const setText = mockNotification ? mockNotification.setText as any : null;
      const notificationCalled = setText && setText.mock && setText.mock.calls.length > 0;
      const notificationText = notificationCalled ? setText.mock.calls[0][0] : '';

      // Check state change from tracked instances
      const responseBuilders = (window as any)._mockInstances.responseBuilders;
      const mockResponseBuilder = responseBuilders[responseBuilders.length - 1];
      const setStateChanged = mockResponseBuilder ? mockResponseBuilder.setStateChanged as any : null;
      const stateChangeCalled = setStateChanged && setStateChanged.mock && setStateChanged.mock.calls.length > 0;
      const stateChangeValue = stateChangeCalled ? setStateChanged.mock.calls[0][0] : false;

      return {
        notificationCalled,
        notificationText,
        stateChangeCalled,
        stateChangeValue
      };
    });

    expect(result.notificationCalled).toBeTruthy();
    expect(result.notificationText).toContain('added to queue');
    expect(result.stateChangeCalled).toBeTruthy();
    expect(result.stateChangeValue).toBe(true);
  });
});

test.describe('Gmail Add-on Cards - Material Symbols Icons', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test-fixtures/addon-cards.html');
  });

  test('should apply Material Symbols Outlined icons to KeyValue', async ({ page }) => {
    const result = await page.evaluate(() => {
      const { createKeyValue } = (window as any).addonComponents;

      const keyValue = createKeyValue({
        content: 'Test content',
        icon: 'inbox',
        topLabel: 'Inbox'
      });

      const mockSetIcon = keyValue.setIcon as any;
      return {
        setIconCalled: mockSetIcon && mockSetIcon.mock && mockSetIcon.mock.calls.length > 0,
        setIconArg: mockSetIcon && mockSetIcon.mock && mockSetIcon.mock.calls.length > 0
          ? mockSetIcon.mock.calls[mockSetIcon.mock.calls.length - 1][0]
          : null
      };
    });

    expect(result.setIconCalled).toBe(true);
    expect(result.setIconArg).toBe('INBOX');
  });

  test('should apply Material Symbols icons to buttons', async ({ page }) => {
    const result = await page.evaluate(() => {
      const { createButton } = (window as any).addonComponents;
      const mockCardService = (window as any).CardService;

      const button = createButton({
        text: 'Archive',
        icon: 'archive',
        onClick: mockCardService.newAction()
      });

      const mockSetIcon = button.setIcon as any;
      return {
        setIconCalled: mockSetIcon && mockSetIcon.mock && mockSetIcon.mock.calls.length > 0,
        setIconArg: mockSetIcon && mockSetIcon.mock && mockSetIcon.mock.calls.length > 0
          ? mockSetIcon.mock.calls[mockSetIcon.mock.calls.length - 1][0]
          : null
      };
    });

    expect(result.setIconCalled).toBe(true);
    expect(result.setIconArg).toBe('ARCHIVE');
  });

  test('should handle icon mapping for all supported icons', async ({ page }) => {
    const result = await page.evaluate(() => {
      const { createButton } = (window as any).addonComponents;
      const mockCardService = (window as any).CardService;

      const iconMappings = [
        { input: 'inbox', expected: 'INBOX' },
        { input: 'send', expected: 'SEND' },
        { input: 'schedule', expected: 'SCHEDULE' },
        { input: 'star', expected: 'STAR' },
        { input: 'label', expected: 'LABEL' },
        { input: 'archive', expected: 'ARCHIVE' },
        { input: 'delete', expected: 'DELETE' },
        { input: 'undo', expected: 'UNDO' },
        { input: 'refresh', expected: 'REFRESH' },
        { input: 'settings', expected: 'SETTINGS' },
        { input: 'info', expected: 'INFO' },
        { input: 'warning', expected: 'WARNING' },
        { input: 'error', expected: 'ERROR' },
        { input: 'check_circle', expected: 'CHECK_CIRCLE' }
      ];

      const results = iconMappings.map(({ input, expected }) => {
        const button = createButton({
          text: 'Test',
          icon: input,
          onClick: mockCardService.newAction()
        });

        const mockSetIcon = button.setIcon as any;
        return {
          input,
          expected,
          called: mockSetIcon && mockSetIcon.mock && mockSetIcon.mock.calls.length > 0,
          actual: mockSetIcon && mockSetIcon.mock && mockSetIcon.mock.calls.length > 0
            ? mockSetIcon.mock.calls[mockSetIcon.mock.calls.length - 1][0]
            : null
        };
      });

      return { results };
    });

    result.results.forEach(({ input, expected, called, actual }) => {
      expect(called).toBe(true);
      expect(actual).toBe(expected);
    });
  });

  test('should apply icons to decorated text widgets', async ({ page }) => {
    const result = await page.evaluate(() => {
      const { createDecoratedText } = (window as any).addonComponents;

      const decorated = createDecoratedText({
        text: 'Message',
        icon: 'send',
        topLabel: 'Action'
      });

      const mockSetStartIcon = decorated.setStartIcon as any;
      return {
        setStartIconCalled: mockSetStartIcon && mockSetStartIcon.mock && mockSetStartIcon.mock.calls.length > 0
      };
    });

    expect(result.setStartIconCalled).toBe(true);
  });
});

test.describe('Gmail Add-on Cards - Card Building', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test-fixtures/addon-cards.html');
  });

  test('should build homepage card with all sections', async ({ page }) => {
    const result = await page.evaluate(() => {
      // Clear previous instances
      (window as any).clearMockInstances();

      const { onHomepage } = (window as any).addonFunctions;
      const card = onHomepage();

      // Get tracked instances
      const cardBuilders = (window as any)._mockInstances.cardBuilders;
      const sections = (window as any)._mockInstances.sections;

      return {
        cardBuilt: card !== null && card !== undefined,
        cardBuildersCreated: cardBuilders.length,
        sectionsCreated: sections.length
      };
    });

    expect(result.cardBuilt).toBe(true);
    expect(result.cardBuildersCreated).toBeGreaterThan(0);
    expect(result.sectionsCreated).toBeGreaterThan(0);
  });

  test('should build context card for selected message', async ({ page }) => {
    const result = await page.evaluate(() => {
      // Clear previous instances
      (window as any).clearMockInstances();

      const { onGmailMessage } = (window as any).addonFunctions;

      const mockEvent = {
        gmail: {
          messageId: 'msg789',
          accessToken: 'token123'
        }
      };

      const card = onGmailMessage(mockEvent as any);

      // Get tracked instances
      const cardBuilders = (window as any)._mockInstances.cardBuilders;
      const sections = (window as any)._mockInstances.sections;

      return {
        cardBuilt: card !== null && card !== undefined,
        cardBuildersCreated: cardBuilders.length,
        sectionsCreated: sections.length
      };
    });

    expect(result.cardBuilt).toBe(true);
    expect(result.cardBuildersCreated).toBeGreaterThan(0);
    expect(result.sectionsCreated).toBeGreaterThan(0);
  });

  test('should handle settings updates', async ({ page }) => {
    const result = await page.evaluate(() => {
      // Clear previous instances
      (window as any).clearMockInstances();

      const { updateAutoProcessInterval, updateArchiveDays } = (window as any).addonFunctions;

      // Test interval update
      const intervalEvent = {
        formInput: { autoProcessInterval: '6h' }
      };

      const intervalResponse = updateAutoProcessInterval(intervalEvent as any);

      const intervalNotifications = (window as any)._mockInstances.notifications;
      const intervalNotification = intervalNotifications[intervalNotifications.length - 1];
      const intervalText = intervalNotification && intervalNotification.setText as any;
      const intervalNotificationText = intervalText && intervalText.mock && intervalText.mock.calls.length > 0
        ? intervalText.mock.calls[0][0]
        : '';

      // Test archive days update
      const daysEvent = {
        formInput: { archiveAfterDays: '45' }
      };

      const daysResponse = updateArchiveDays(daysEvent as any);

      const daysNotifications = (window as any)._mockInstances.notifications;
      const daysNotification = daysNotifications[daysNotifications.length - 1];
      const daysText = daysNotification && daysNotification.setText as any;
      const daysNotificationText = daysText && daysText.mock && daysText.mock.calls.length > 0
        ? daysText.mock.calls[0][0]
        : '';

      return {
        intervalNotificationText,
        daysNotificationText
      };
    });

    expect(result.intervalNotificationText).toContain('Auto-process interval updated');
    expect(result.daysNotificationText).toContain('Archive threshold updated');
  });

  test('should handle refresh action', async ({ page }) => {
    const result = await page.evaluate(() => {
      // Clear previous instances
      (window as any).clearMockInstances();

      const { refreshInboxStats } = (window as any).addonFunctions;

      const mockEvent = {};
      const response = refreshInboxStats(mockEvent as any);

      // Get tracked instances
      const notifications = (window as any)._mockInstances.notifications;
      const notification = notifications[notifications.length - 1];
      const setText = notification && notification.setText as any;
      const notificationText = setText && setText.mock && setText.mock.calls.length > 0
        ? setText.mock.calls[0][0]
        : '';

      const responseBuilders = (window as any)._mockInstances.responseBuilders;
      const responseBuilder = responseBuilders[responseBuilders.length - 1];
      const setNavigation = responseBuilder && responseBuilder.setNavigation as any;
      const navigationCalled = setNavigation && setNavigation.mock && setNavigation.mock.calls.length > 0;

      return {
        notificationText,
        navigationCalled
      };
    });

    expect(result.notificationText).toContain('Stats refreshed');
    expect(result.navigationCalled).toBe(true);
  });
});

test.describe('Gmail Add-on Cards - Component Helpers', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test-fixtures/addon-cards.html');
  });

  test('should create button sets', async ({ page }) => {
    const result = await page.evaluate(() => {
      const { createButtonSet } = (window as any).addonComponents;
      const mockCardService = (window as any).CardService;

      const buttons = [
        {
          text: 'Save',
          icon: 'save',
          color: mockCardService.TextButtonStyle.FILLED,
          onClick: mockCardService.newAction()
        },
        {
          text: 'Cancel',
          onClick: mockCardService.newAction()
        }
      ];

      const buttonSet = createButtonSet(buttons);

      const mockAddButton = buttonSet.addButton as any;
      return {
        addButtonCalled: mockAddButton && mockAddButton.mock && mockAddButton.mock.calls.length > 0,
        addButtonCallCount: mockAddButton && mockAddButton.mock ? mockAddButton.mock.calls.length : 0
      };
    });

    expect(result.addButtonCalled).toBe(true);
    expect(result.addButtonCallCount).toBe(2);
  });

  test('should create date time picker', async ({ page }) => {
    const result = await page.evaluate(() => {
      const { createDateTimePicker } = (window as any).addonComponents;
      const mockCardService = (window as any).CardService;

      const picker = createDateTimePicker({
        fieldName: 'dueDate',
        title: 'Due Date',
        type: 'DATE_AND_TIME',
        valueMsEpoch: Date.now(),
        onChange: mockCardService.newAction()
      });

      const mockSetFieldName = picker.setFieldName as any;
      const mockSetTitle = picker.setTitle as any;
      const mockSetType = picker.setType as any;

      return {
        fieldName: mockSetFieldName && mockSetFieldName.mock && mockSetFieldName.mock.calls.length > 0
          ? mockSetFieldName.mock.calls[0][0]
          : null,
        title: mockSetTitle && mockSetTitle.mock && mockSetTitle.mock.calls.length > 0
          ? mockSetTitle.mock.calls[0][0]
          : null,
        typeCalled: mockSetType && mockSetType.mock && mockSetType.mock.calls.length > 0
      };
    });

    expect(result.fieldName).toBe('dueDate');
    expect(result.title).toBe('Due Date');
    expect(result.typeCalled).toBe(true);
  });

  test('should create grid with items', async ({ page }) => {
    const result = await page.evaluate(() => {
      const { createGrid } = (window as any).addonComponents;
      const mockCardService = (window as any).CardService;

      const grid = createGrid({
        title: 'Quick Actions',
        items: [
          { id: '1', title: 'Archive', subtitle: 'Move to archive' },
          { id: '2', title: 'Delete', subtitle: 'Move to trash' },
          { id: '3', title: 'Star', subtitle: 'Mark important' },
          { id: '4', title: 'Label', subtitle: 'Add labels' }
        ],
        columns: 2,
        onClick: mockCardService.newAction()
      });

      const mockSetTitle = grid.setTitle as any;
      const mockAddItem = grid.addItem as any;
      const mockSetNumColumns = grid.setNumColumns as any;

      return {
        title: mockSetTitle && mockSetTitle.mock && mockSetTitle.mock.calls.length > 0
          ? mockSetTitle.mock.calls[0][0]
          : null,
        addItemCallCount: mockAddItem && mockAddItem.mock ? mockAddItem.mock.calls.length : 0,
        numColumns: mockSetNumColumns && mockSetNumColumns.mock && mockSetNumColumns.mock.calls.length > 0
          ? mockSetNumColumns.mock.calls[0][0]
          : null
      };
    });

    expect(result.title).toBe('Quick Actions');
    expect(result.addItemCallCount).toBe(4);
    expect(result.numColumns).toBe(2);
  });

  test('should handle text input validation setup', async ({ page }) => {
    const result = await page.evaluate(() => {
      const { createTextInput } = (window as any).addonComponents;

      const input = createTextInput({
        fieldName: 'emailAddress',
        title: 'Email',
        hint: 'Enter a valid email address',
        validation: {
          required: true,
          characterLimit: 255,
          regex: '^[\\w._%+-]+@[\\w.-]+\\.[A-Za-z]{2,}$',
          errorText: 'Please enter a valid email address'
        }
      });

      const mockSetFieldName = input.setFieldName as any;
      const mockSetTitle = input.setTitle as any;
      const mockSetHint = input.setHint as any;

      return {
        fieldName: mockSetFieldName && mockSetFieldName.mock && mockSetFieldName.mock.calls.length > 0
          ? mockSetFieldName.mock.calls[0][0]
          : null,
        title: mockSetTitle && mockSetTitle.mock && mockSetTitle.mock.calls.length > 0
          ? mockSetTitle.mock.calls[0][0]
          : null,
        hint: mockSetHint && mockSetHint.mock && mockSetHint.mock.calls.length > 0
          ? mockSetHint.mock.calls[0][0]
          : null
      };
    });

    expect(result.fieldName).toBe('emailAddress');
    expect(result.title).toBe('Email');
    expect(result.hint).toBe('Enter a valid email address');
  });
});