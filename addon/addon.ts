/**
 * Gmail Add-on Integration
 * Entry point for Gmail Add-on with card-based UI
 */

import {
  AddonCard,
  AddonSection,
  AddonAction,
  AddonKeyValue,
  AddonButton,
  AddonTextInput,
  AddonSelectionInput,
  AddonNotification,
  createCard,
  createSection,
  createKeyValue,
  createButton,
  createTextInput,
  createSelectionInput,
  createNotification,
  createUndoAction
} from './components';

// Environment detection for browser testing
const CS = typeof CardService !== 'undefined' ? CardService : (window as any)?.CardService;
const PS = typeof PropertiesService !== 'undefined' ? PropertiesService : (window as any)?.PropertiesService;

// Material Symbols Outlined icon mapping
const ICONS = {
  inbox: 'inbox',
  send: 'send',
  schedule: 'schedule',
  draft: 'drafts',
  star: 'star',
  label: 'label',
  archive: 'archive',
  delete: 'delete',
  undo: 'undo',
  refresh: 'refresh',
  settings: 'settings',
  info: 'info',
  warning: 'warning',
  error: 'error',
  success: 'check_circle'
} as const;

/**
 * Gmail Add-on Homepage
 * Triggered when the add-on is opened
 */
export function onHomepage(e?: GoogleAppsScript.Addons.EventObject): GoogleAppsScript.Card_Service.Card {
  const card = createCard({
    header: {
      title: 'GAS-PA Assistant',
      subtitle: 'Gmail Management Tools',
      imageUrl: '',
      imageStyle: CS.ImageStyle.CIRCLE
    },
    displayStyle: CS.DisplayStyle.REPLACE
  });

  // Summary Section
  const summarySection = createSection({
    header: 'Email Summary',
    collapsible: true,
    uncollapsibleWidgetsCount: 2
  });

  summarySection.addWidget(
    createKeyValue({
      content: 'Total Messages',
      topLabel: 'Inbox',
      bottomLabel: 'Last updated: Just now',
      icon: ICONS.inbox,
      button: createButton({
        text: 'Refresh',
        icon: ICONS.refresh,
        onClick: CS.newAction()
          .setFunctionName('refreshInboxStats')
          .setLoadIndicator(CS.LoadIndicator.SPINNER)
      }),
      truncate: 1 // Single line truncation
    })
  );

  summarySection.addWidget(
    createKeyValue({
      content: 'Unread: 12 | Starred: 5',
      topLabel: 'Quick Stats',
      icon: ICONS.star,
      multiline: false,
      truncate: 2 // Two line truncation for longer content
    })
  );

  card.addSection(summarySection);

  // Actions Section
  const actionSection = createSection({
    header: 'Quick Actions'
  });

  actionSection.addWidget(
    createButton({
      text: 'Process Queue',
      icon: ICONS.schedule,
      color: CS.TextButtonStyle.FILLED,
      onClick: CS.newAction()
        .setFunctionName('processEmailQueue')
        .setLoadIndicator(CS.LoadIndicator.SPINNER)
        .setParameters({
          showUndo: 'true'
        })
    })
  );

  actionSection.addWidget(
    createButton({
      text: 'Archive Old Emails',
      icon: ICONS.archive,
      onClick: CS.newAction()
        .setFunctionName('archiveOldEmails')
        .setLoadIndicator(CS.LoadIndicator.SPINNER)
        .setParameters({
          showUndo: 'true'
        })
    })
  );

  card.addSection(actionSection);

  // Settings Section
  const settingsSection = createSection({
    header: 'Settings',
    collapsible: true
  });

  settingsSection.addWidget(
    createSelectionInput({
      fieldName: 'autoProcessInterval',
      title: 'Auto-Process Interval',
      type: CS.SelectionInputType.RADIO_BUTTON,
      items: [
        { text: 'Every hour', value: '1h', selected: false },
        { text: 'Every 6 hours', value: '6h', selected: true },
        { text: 'Daily', value: '24h', selected: false },
        { text: 'Disabled', value: 'disabled', selected: false }
      ],
      onChange: CS.newAction()
        .setFunctionName('updateAutoProcessInterval')
    })
  );

  settingsSection.addWidget(
    createTextInput({
      fieldName: 'archiveAfterDays',
      title: 'Archive after (days)',
      value: '30',
      hint: 'Emails older than this will be archived',
      suggestions: CS.newSuggestions()
        .addSuggestion('7')
        .addSuggestion('14')
        .addSuggestion('30')
        .addSuggestion('60')
        .addSuggestion('90'),
      onChange: CS.newAction()
        .setFunctionName('updateArchiveDays')
    })
  );

  card.addSection(settingsSection);

  return card.build();
}

/**
 * Context-aware card when a message is selected
 */
export function onGmailMessage(e: GoogleAppsScript.Addons.EventObject): GoogleAppsScript.Card_Service.Card {
  const messageId = e.gmail?.messageId || '';
  const accessToken = e.gmail?.accessToken || '';

  const card = createCard({
    header: {
      title: 'Message Actions',
      subtitle: 'Process this email'
    }
  });

  const messageSection = createSection({});

  // Get message details (truncated display)
  const message = getMessageDetails(messageId, accessToken);

  messageSection.addWidget(
    createKeyValue({
      content: message.subject || 'No subject',
      topLabel: 'Subject',
      bottomLabel: `From: ${message.from}`,
      truncate: 2, // Two-line truncation for subject
      multiline: true
    })
  );

  messageSection.addWidget(
    createKeyValue({
      content: message.snippet || '',
      topLabel: 'Preview',
      truncate: 2, // Two-line truncation for preview
      multiline: true
    })
  );

  card.addSection(messageSection);

  // Action buttons
  const actionsSection = createSection({
    header: 'Actions'
  });

  actionsSection.addWidget(
    createButton({
      text: 'Queue for Later',
      icon: ICONS.schedule,
      color: CS.TextButtonStyle.FILLED,
      onClick: CS.newAction()
        .setFunctionName('queueMessage')
        .setParameters({ messageId, showUndo: 'true' })
        .setLoadIndicator(CS.LoadIndicator.SPINNER)
    })
  );

  actionsSection.addWidget(
    createButton({
      text: 'Apply Labels',
      icon: ICONS.label,
      onClick: CS.newAction()
        .setFunctionName('showLabelSelector')
        .setParameters({ messageId })
    })
  );

  actionsSection.addWidget(
    createButton({
      text: 'Archive',
      icon: ICONS.archive,
      onClick: CS.newAction()
        .setFunctionName('archiveMessage')
        .setParameters({ messageId, showUndo: 'true' })
        .setLoadIndicator(CS.LoadIndicator.SPINNER)
    })
  );

  card.addSection(actionsSection);

  return card.build();
}

/**
 * Process email queue with optimistic undo
 */
export function processEmailQueue(e: GoogleAppsScript.Addons.EventObject): GoogleAppsScript.Card_Service.ActionResponse {
  try {
    // Simulate processing
    const processedCount = processQueuedEmails();

    const notification = createNotification({
      text: `Processed ${processedCount} emails`,
      type: 'SUCCESS'
    });

    const response = CS.newActionResponseBuilder()
      .setNotification(notification);

    // Add undo action if requested
    if (e.parameters?.showUndo === 'true') {
      const undoAction = createUndoAction({
        functionName: 'undoProcessQueue',
        parameters: {
          processedCount: processedCount.toString(),
          timestamp: new Date().getTime().toString()
        },
        timeout: 10000 // 10 second undo window
      });
      response.setStateChanged(true);
    }

    return response.build();
  } catch (error) {
    const notification = createNotification({
      text: `Error: ${error.message}`,
      type: 'ERROR'
    });

    return CS.newActionResponseBuilder()
      .setNotification(notification)
      .build();
  }
}

/**
 * Undo queue processing
 */
export function undoProcessQueue(e: GoogleAppsScript.Addons.EventObject): GoogleAppsScript.Card_Service.ActionResponse {
  const processedCount = parseInt(e.parameters?.processedCount || '0');
  const timestamp = parseInt(e.parameters?.timestamp || '0');

  // Implement undo logic
  const restored = restoreProcessedEmails(timestamp);

  const notification = createNotification({
    text: `Restored ${restored} of ${processedCount} emails`,
    type: 'INFO'
  });

  return CS.newActionResponseBuilder()
    .setNotification(notification)
    .setStateChanged(true)
    .build();
}

/**
 * Archive old emails with undo support
 */
export function archiveOldEmails(e: GoogleAppsScript.Addons.EventObject): GoogleAppsScript.Card_Service.ActionResponse {
  const daysOld = parseInt(PS.getUserProperties().getProperty('archiveAfterDays') || '30');

  try {
    const archivedCount = archiveEmailsOlderThan(daysOld);

    const notification = createNotification({
      text: `Archived ${archivedCount} emails older than ${daysOld} days`,
      type: 'SUCCESS'
    });

    const response = CS.newActionResponseBuilder()
      .setNotification(notification);

    if (e.parameters?.showUndo === 'true' && archivedCount > 0) {
      const undoAction = createUndoAction({
        functionName: 'undoArchive',
        parameters: {
          count: archivedCount.toString(),
          timestamp: new Date().getTime().toString()
        },
        timeout: 15000 // 15 second undo window
      });
      response.setStateChanged(true);
    }

    return response.build();
  } catch (error) {
    const notification = createNotification({
      text: `Error archiving: ${error.message}`,
      type: 'ERROR'
    });

    return CS.newActionResponseBuilder()
      .setNotification(notification)
      .build();
  }
}

/**
 * Queue individual message with undo
 */
export function queueMessage(e: GoogleAppsScript.Addons.EventObject): GoogleAppsScript.Card_Service.ActionResponse {
  const messageId = e.parameters?.messageId || '';

  try {
    addToQueue(messageId);

    const notification = createNotification({
      text: 'Message added to queue',
      type: 'SUCCESS'
    });

    const response = CS.newActionResponseBuilder()
      .setNotification(notification);

    if (e.parameters?.showUndo === 'true') {
      const undoAction = createUndoAction({
        functionName: 'removeFromQueue',
        parameters: { messageId },
        timeout: 8000
      });
      response.setStateChanged(true);
    }

    return response.build();
  } catch (error) {
    const notification = createNotification({
      text: `Failed to queue: ${error.message}`,
      type: 'ERROR'
    });

    return CS.newActionResponseBuilder()
      .setNotification(notification)
      .build();
  }
}

/**
 * Archive single message with undo
 */
export function archiveMessage(e: GoogleAppsScript.Addons.EventObject): GoogleAppsScript.Card_Service.ActionResponse {
  const messageId = e.parameters?.messageId || '';

  try {
    archiveSingleMessage(messageId);

    const notification = createNotification({
      text: 'Message archived',
      type: 'SUCCESS'
    });

    const response = CS.newActionResponseBuilder()
      .setNotification(notification)
      .setNavigation(CS.newNavigation().popCard()); // Go back to inbox

    if (e.parameters?.showUndo === 'true') {
      const undoAction = createUndoAction({
        functionName: 'unarchiveMessage',
        parameters: { messageId },
        timeout: 10000
      });
      response.setStateChanged(true);
    }

    return response.build();
  } catch (error) {
    const notification = createNotification({
      text: `Archive failed: ${error.message}`,
      type: 'ERROR'
    });

    return CS.newActionResponseBuilder()
      .setNotification(notification)
      .build();
  }
}

// Helper functions (implement actual Gmail API calls)
function getMessageDetails(messageId: string, accessToken: string): any {
  // Implementation would use Gmail API
  return {
    subject: 'Re: Project Update',
    from: 'john.doe@example.com',
    snippet: 'Thanks for the update. I have reviewed the latest changes and everything looks good. We can proceed with the deployment...'
  };
}

function processQueuedEmails(): number {
  // Process queued emails
  return 5; // Mock processed count
}

function restoreProcessedEmails(timestamp: number): number {
  // Restore emails processed after timestamp
  return 5; // Mock restored count
}

function archiveEmailsOlderThan(days: number): number {
  // Archive old emails
  return 23; // Mock archived count
}

function addToQueue(messageId: string): void {
  // Add message to processing queue
}

function archiveSingleMessage(messageId: string): void {
  // Archive single message
}

function removeFromQueue(messageId: string): void {
  // Remove from queue (undo action)
}

function unarchiveMessage(messageId: string): void {
  // Unarchive message (undo action)
}

/**
 * Update settings
 */
export function updateAutoProcessInterval(e: GoogleAppsScript.Addons.EventObject): GoogleAppsScript.Card_Service.ActionResponse {
  const interval = e.formInput?.autoProcessInterval || 'disabled';
  PS.getUserProperties().setProperty('autoProcessInterval', interval);

  const notification = createNotification({
    text: `Auto-process interval updated to ${interval}`,
    type: 'INFO'
  });

  return CS.newActionResponseBuilder()
    .setNotification(notification)
    .build();
}

export function updateArchiveDays(e: GoogleAppsScript.Addons.EventObject): GoogleAppsScript.Card_Service.ActionResponse {
  const days = e.formInput?.archiveAfterDays || '30';
  PS.getUserProperties().setProperty('archiveAfterDays', days);

  const notification = createNotification({
    text: `Archive threshold updated to ${days} days`,
    type: 'INFO'
  });

  return CS.newActionResponseBuilder()
    .setNotification(notification)
    .build();
}

/**
 * Refresh inbox statistics
 */
export function refreshInboxStats(e: GoogleAppsScript.Addons.EventObject): GoogleAppsScript.Card_Service.ActionResponse {
  // Refresh stats and update card
  const notification = createNotification({
    text: 'Stats refreshed',
    type: 'INFO'
  });

  return CS.newActionResponseBuilder()
    .setNotification(notification)
    .setNavigation(CS.newNavigation().updateCard(onHomepage(e)))
    .build();
}