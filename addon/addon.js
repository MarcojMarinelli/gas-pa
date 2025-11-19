import {
  createCard,
  createSection,
  createKeyValue,
  createButton,
  createTextInput,
  createSelectionInput,
  createNotification,
  createUndoAction
} from "./components";
const CS = typeof CardService !== "undefined" ? CardService : window?.CardService;
const PS = typeof PropertiesService !== "undefined" ? PropertiesService : window?.PropertiesService;
const ICONS = {
  inbox: "inbox",
  send: "send",
  schedule: "schedule",
  draft: "drafts",
  star: "star",
  label: "label",
  archive: "archive",
  delete: "delete",
  undo: "undo",
  refresh: "refresh",
  settings: "settings",
  info: "info",
  warning: "warning",
  error: "error",
  success: "check_circle"
};
function onHomepage(e) {
  const card = createCard({
    header: {
      title: "GAS-PA Assistant",
      subtitle: "Gmail Management Tools",
      imageUrl: "",
      imageStyle: CS.ImageStyle.CIRCLE
    },
    displayStyle: CS.DisplayStyle.REPLACE
  });
  const summarySection = createSection({
    header: "Email Summary",
    collapsible: true,
    uncollapsibleWidgetsCount: 2
  });
  summarySection.addWidget(
    createKeyValue({
      content: "Total Messages",
      topLabel: "Inbox",
      bottomLabel: "Last updated: Just now",
      icon: ICONS.inbox,
      button: createButton({
        text: "Refresh",
        icon: ICONS.refresh,
        onClick: CS.newAction().setFunctionName("refreshInboxStats").setLoadIndicator(CS.LoadIndicator.SPINNER)
      }),
      truncate: 1
      // Single line truncation
    })
  );
  summarySection.addWidget(
    createKeyValue({
      content: "Unread: 12 | Starred: 5",
      topLabel: "Quick Stats",
      icon: ICONS.star,
      multiline: false,
      truncate: 2
      // Two line truncation for longer content
    })
  );
  card.addSection(summarySection);
  const actionSection = createSection({
    header: "Quick Actions"
  });
  actionSection.addWidget(
    createButton({
      text: "Process Queue",
      icon: ICONS.schedule,
      color: CS.TextButtonStyle.FILLED,
      onClick: CS.newAction().setFunctionName("processEmailQueue").setLoadIndicator(CS.LoadIndicator.SPINNER).setParameters({
        showUndo: "true"
      })
    })
  );
  actionSection.addWidget(
    createButton({
      text: "Archive Old Emails",
      icon: ICONS.archive,
      onClick: CS.newAction().setFunctionName("archiveOldEmails").setLoadIndicator(CS.LoadIndicator.SPINNER).setParameters({
        showUndo: "true"
      })
    })
  );
  card.addSection(actionSection);
  const settingsSection = createSection({
    header: "Settings",
    collapsible: true
  });
  settingsSection.addWidget(
    createSelectionInput({
      fieldName: "autoProcessInterval",
      title: "Auto-Process Interval",
      type: CS.SelectionInputType.RADIO_BUTTON,
      items: [
        { text: "Every hour", value: "1h", selected: false },
        { text: "Every 6 hours", value: "6h", selected: true },
        { text: "Daily", value: "24h", selected: false },
        { text: "Disabled", value: "disabled", selected: false }
      ],
      onChange: CS.newAction().setFunctionName("updateAutoProcessInterval")
    })
  );
  settingsSection.addWidget(
    createTextInput({
      fieldName: "archiveAfterDays",
      title: "Archive after (days)",
      value: "30",
      hint: "Emails older than this will be archived",
      suggestions: CS.newSuggestions().addSuggestion("7").addSuggestion("14").addSuggestion("30").addSuggestion("60").addSuggestion("90"),
      onChange: CS.newAction().setFunctionName("updateArchiveDays")
    })
  );
  card.addSection(settingsSection);
  return card.build();
}
function onGmailMessage(e) {
  const messageId = e.gmail?.messageId || "";
  const accessToken = e.gmail?.accessToken || "";
  const card = createCard({
    header: {
      title: "Message Actions",
      subtitle: "Process this email"
    }
  });
  const messageSection = createSection({});
  const message = getMessageDetails(messageId, accessToken);
  messageSection.addWidget(
    createKeyValue({
      content: message.subject || "No subject",
      topLabel: "Subject",
      bottomLabel: `From: ${message.from}`,
      truncate: 2,
      // Two-line truncation for subject
      multiline: true
    })
  );
  messageSection.addWidget(
    createKeyValue({
      content: message.snippet || "",
      topLabel: "Preview",
      truncate: 2,
      // Two-line truncation for preview
      multiline: true
    })
  );
  card.addSection(messageSection);
  const actionsSection = createSection({
    header: "Actions"
  });
  actionsSection.addWidget(
    createButton({
      text: "Queue for Later",
      icon: ICONS.schedule,
      color: CS.TextButtonStyle.FILLED,
      onClick: CS.newAction().setFunctionName("queueMessage").setParameters({ messageId, showUndo: "true" }).setLoadIndicator(CS.LoadIndicator.SPINNER)
    })
  );
  actionsSection.addWidget(
    createButton({
      text: "Apply Labels",
      icon: ICONS.label,
      onClick: CS.newAction().setFunctionName("showLabelSelector").setParameters({ messageId })
    })
  );
  actionsSection.addWidget(
    createButton({
      text: "Archive",
      icon: ICONS.archive,
      onClick: CS.newAction().setFunctionName("archiveMessage").setParameters({ messageId, showUndo: "true" }).setLoadIndicator(CS.LoadIndicator.SPINNER)
    })
  );
  card.addSection(actionsSection);
  return card.build();
}
function processEmailQueue(e) {
  try {
    const processedCount = processQueuedEmails();
    const notification = createNotification({
      text: `Processed ${processedCount} emails`,
      type: "SUCCESS"
    });
    const response = CS.newActionResponseBuilder().setNotification(notification);
    if (e.parameters?.showUndo === "true") {
      const undoAction = createUndoAction({
        functionName: "undoProcessQueue",
        parameters: {
          processedCount: processedCount.toString(),
          timestamp: (/* @__PURE__ */ new Date()).getTime().toString()
        },
        timeout: 1e4
        // 10 second undo window
      });
      response.setStateChanged(true);
    }
    return response.build();
  } catch (error) {
    const notification = createNotification({
      text: `Error: ${error.message}`,
      type: "ERROR"
    });
    return CS.newActionResponseBuilder().setNotification(notification).build();
  }
}
function undoProcessQueue(e) {
  const processedCount = parseInt(e.parameters?.processedCount || "0");
  const timestamp = parseInt(e.parameters?.timestamp || "0");
  const restored = restoreProcessedEmails(timestamp);
  const notification = createNotification({
    text: `Restored ${restored} of ${processedCount} emails`,
    type: "INFO"
  });
  return CS.newActionResponseBuilder().setNotification(notification).setStateChanged(true).build();
}
function archiveOldEmails(e) {
  const daysOld = parseInt(PS.getUserProperties().getProperty("archiveAfterDays") || "30");
  try {
    const archivedCount = archiveEmailsOlderThan(daysOld);
    const notification = createNotification({
      text: `Archived ${archivedCount} emails older than ${daysOld} days`,
      type: "SUCCESS"
    });
    const response = CS.newActionResponseBuilder().setNotification(notification);
    if (e.parameters?.showUndo === "true" && archivedCount > 0) {
      const undoAction = createUndoAction({
        functionName: "undoArchive",
        parameters: {
          count: archivedCount.toString(),
          timestamp: (/* @__PURE__ */ new Date()).getTime().toString()
        },
        timeout: 15e3
        // 15 second undo window
      });
      response.setStateChanged(true);
    }
    return response.build();
  } catch (error) {
    const notification = createNotification({
      text: `Error archiving: ${error.message}`,
      type: "ERROR"
    });
    return CS.newActionResponseBuilder().setNotification(notification).build();
  }
}
function queueMessage(e) {
  const messageId = e.parameters?.messageId || "";
  try {
    addToQueue(messageId);
    const notification = createNotification({
      text: "Message added to queue",
      type: "SUCCESS"
    });
    const response = CS.newActionResponseBuilder().setNotification(notification);
    if (e.parameters?.showUndo === "true") {
      const undoAction = createUndoAction({
        functionName: "removeFromQueue",
        parameters: { messageId },
        timeout: 8e3
      });
      response.setStateChanged(true);
    }
    return response.build();
  } catch (error) {
    const notification = createNotification({
      text: `Failed to queue: ${error.message}`,
      type: "ERROR"
    });
    return CS.newActionResponseBuilder().setNotification(notification).build();
  }
}
function archiveMessage(e) {
  const messageId = e.parameters?.messageId || "";
  try {
    archiveSingleMessage(messageId);
    const notification = createNotification({
      text: "Message archived",
      type: "SUCCESS"
    });
    const response = CS.newActionResponseBuilder().setNotification(notification).setNavigation(CS.newNavigation().popCard());
    if (e.parameters?.showUndo === "true") {
      const undoAction = createUndoAction({
        functionName: "unarchiveMessage",
        parameters: { messageId },
        timeout: 1e4
      });
      response.setStateChanged(true);
    }
    return response.build();
  } catch (error) {
    const notification = createNotification({
      text: `Archive failed: ${error.message}`,
      type: "ERROR"
    });
    return CS.newActionResponseBuilder().setNotification(notification).build();
  }
}
function getMessageDetails(messageId, accessToken) {
  return {
    subject: "Re: Project Update",
    from: "john.doe@example.com",
    snippet: "Thanks for the update. I have reviewed the latest changes and everything looks good. We can proceed with the deployment..."
  };
}
function processQueuedEmails() {
  return 5;
}
function restoreProcessedEmails(timestamp) {
  return 5;
}
function archiveEmailsOlderThan(days) {
  return 23;
}
function addToQueue(messageId) {
}
function archiveSingleMessage(messageId) {
}
function removeFromQueue(messageId) {
}
function unarchiveMessage(messageId) {
}
function updateAutoProcessInterval(e) {
  const interval = e.formInput?.autoProcessInterval || "disabled";
  PS.getUserProperties().setProperty("autoProcessInterval", interval);
  const notification = createNotification({
    text: `Auto-process interval updated to ${interval}`,
    type: "INFO"
  });
  return CS.newActionResponseBuilder().setNotification(notification).build();
}
function updateArchiveDays(e) {
  const days = e.formInput?.archiveAfterDays || "30";
  PS.getUserProperties().setProperty("archiveAfterDays", days);
  const notification = createNotification({
    text: `Archive threshold updated to ${days} days`,
    type: "INFO"
  });
  return CS.newActionResponseBuilder().setNotification(notification).build();
}
function refreshInboxStats(e) {
  const notification = createNotification({
    text: "Stats refreshed",
    type: "INFO"
  });
  return CS.newActionResponseBuilder().setNotification(notification).setNavigation(CS.newNavigation().updateCard(onHomepage(e))).build();
}
export {
  archiveMessage,
  archiveOldEmails,
  onGmailMessage,
  onHomepage,
  processEmailQueue,
  queueMessage,
  refreshInboxStats,
  undoProcessQueue,
  updateArchiveDays,
  updateAutoProcessInterval
};
