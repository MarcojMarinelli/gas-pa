"use strict";
var AddonBundle = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // addon/index.ts
  var index_exports = {};
  __export(index_exports, {
    archiveMessage: () => archiveMessage,
    archiveOldEmails: () => archiveOldEmails,
    createButton: () => createButton,
    createButtonSet: () => createButtonSet,
    createCard: () => createCard,
    createDateTimePicker: () => createDateTimePicker,
    createDecoratedText: () => createDecoratedText,
    createDivider: () => createDivider,
    createGrid: () => createGrid,
    createImage: () => createImage,
    createKeyValue: () => createKeyValue,
    createNotification: () => createNotification,
    createSection: () => createSection,
    createSelectionInput: () => createSelectionInput,
    createTextInput: () => createTextInput,
    createUndoAction: () => createUndoAction,
    onGmailMessage: () => onGmailMessage,
    onHomepage: () => onHomepage,
    processEmailQueue: () => processEmailQueue,
    queueMessage: () => queueMessage,
    refreshInboxStats: () => refreshInboxStats,
    undoProcessQueue: () => undoProcessQueue,
    updateArchiveDays: () => updateArchiveDays,
    updateAutoProcessInterval: () => updateAutoProcessInterval
  });

  // addon/components.ts
  function createCard(config) {
    const CS2 = typeof CardService !== "undefined" ? CardService : window.CardService;
    if (!CS2) {
      throw new Error("CardService not available");
    }
    const cardBuilder = CS2.newCardBuilder();
    if (config.header) {
      const headerBuilder = CS2.newCardHeader().setTitle(config.header.title);
      if (config.header.subtitle) {
        headerBuilder.setSubtitle(config.header.subtitle);
      }
      if (config.header.imageUrl) {
        headerBuilder.setImageUrl(config.header.imageUrl);
      }
      if (config.header.imageStyle) {
        headerBuilder.setImageStyle(config.header.imageStyle);
      }
      cardBuilder.setHeader(headerBuilder);
    }
    if (config.displayStyle) {
      cardBuilder.setDisplayStyle(config.displayStyle);
    }
    const sections = [];
    const card = {
      header: config.header,
      sections: [],
      displayStyle: config.displayStyle,
      fixedFooter: config.fixedFooter,
      addSection(section) {
        sections.push(section.build());
        this.sections.push(section);
        return this;
      },
      build() {
        sections.forEach((section) => cardBuilder.addSection(section));
        if (config.fixedFooter) {
          cardBuilder.setFixedFooter(config.fixedFooter.build());
        }
        return cardBuilder.build();
      }
    };
    return card;
  }
  function createSection(config) {
    const CS2 = typeof CardService !== "undefined" ? CardService : window.CardService;
    if (!CS2) {
      throw new Error("CardService not available");
    }
    const sectionBuilder = CS2.newCardSection();
    if (config.header) {
      sectionBuilder.setHeader(config.header);
    }
    if (config.collapsible) {
      sectionBuilder.setCollapsible(config.collapsible);
    }
    if (config.uncollapsibleWidgetsCount !== void 0) {
      sectionBuilder.setNumUncollapsibleWidgets(config.uncollapsibleWidgetsCount);
    }
    const widgets = [];
    const section = {
      header: config.header,
      widgets: [],
      collapsible: config.collapsible,
      uncollapsibleWidgetsCount: config.uncollapsibleWidgetsCount,
      addWidget(widget) {
        widgets.push(widget);
        this.widgets.push(widget);
        return this;
      },
      build() {
        widgets.forEach((widget) => sectionBuilder.addWidget(widget));
        return sectionBuilder.build();
      }
    };
    return section;
  }
  function createKeyValue(config) {
    const CS2 = typeof CardService !== "undefined" ? CardService : window.CardService;
    if (!CS2) {
      throw new Error("CardService not available");
    }
    const keyValue = CS2.newKeyValue();
    let content = config.content || "";
    if (config.truncate === 1) {
      keyValue.setContent(truncateText(content, 80));
    } else if (config.truncate === 2) {
      keyValue.setContent(truncateText(content, 160));
    } else {
      keyValue.setContent(content);
    }
    if (config.topLabel) {
      keyValue.setTopLabel(config.topLabel);
    }
    if (config.bottomLabel) {
      keyValue.setBottomLabel(config.bottomLabel);
    }
    if (config.icon) {
      keyValue.setIcon(CS2.Icon[config.icon.toUpperCase()] || CS2.Icon.NONE);
    }
    if (config.button) {
      const button = createTextButton(config.button);
      keyValue.setButton(button);
    }
    if (config.multiline) {
      keyValue.setMultiline(config.multiline);
    }
    if (config.onClick) {
      keyValue.setOnClickAction(config.onClick);
    }
    return keyValue;
  }
  function createButton(config) {
    return createTextButton(config);
  }
  function createTextButton(config) {
    const CS2 = typeof CardService !== "undefined" ? CardService : window.CardService;
    if (!CS2) {
      throw new Error("CardService not available");
    }
    const button = CS2.newTextButton().setText(config.text).setOnClickAction(config.onClick);
    if (config.icon) {
      button.setIcon(CS2.Icon[config.icon.toUpperCase()] || CS2.Icon.NONE);
    }
    if (config.color) {
      button.setTextButtonStyle(config.color);
    }
    if (config.disabled) {
      button.setDisabled(config.disabled);
    }
    return button;
  }
  function createTextInput(config) {
    const CS2 = typeof CardService !== "undefined" ? CardService : window.CardService;
    if (!CS2) {
      throw new Error("CardService not available");
    }
    const textInput = CS2.newTextInput().setFieldName(config.fieldName).setTitle(config.title);
    if (config.value !== void 0) {
      textInput.setValue(config.value);
    }
    if (config.hint) {
      textInput.setHint(config.hint);
    }
    if (config.multiline) {
      textInput.setMultiline(config.multiline);
    }
    if (config.suggestions) {
      textInput.setSuggestions(config.suggestions);
    }
    if (config.onChange) {
      textInput.setOnChangeAction(config.onChange);
    }
    if (config.validation) {
      if (config.validation.required) {
      }
      if (config.validation.characterLimit) {
      }
      if (config.validation.regex) {
      }
    }
    return textInput;
  }
  function createSelectionInput(config) {
    const CS2 = typeof CardService !== "undefined" ? CardService : window.CardService;
    if (!CS2) {
      throw new Error("CardService not available");
    }
    const selectionInput = CS2.newSelectionInput().setFieldName(config.fieldName).setTitle(config.title).setType(config.type);
    config.items.forEach((item) => {
      selectionInput.addItem(item.text, item.value, item.selected);
    });
    if (config.onChange) {
      selectionInput.setOnChangeAction(config.onChange);
    }
    return selectionInput;
  }
  function createNotification(config) {
    const CS2 = typeof CardService !== "undefined" ? CardService : window.CardService;
    if (!CS2) {
      throw new Error("CardService not available");
    }
    const notification = CS2.newNotification();
    let text = config.text;
    switch (config.type) {
      case "SUCCESS":
        text = "\u2713 " + text;
        break;
      case "ERROR":
        text = "\u2715 " + text;
        break;
      case "WARNING":
        text = "\u26A0 " + text;
        break;
      case "INFO":
      default:
        text = "\u2139 " + text;
        break;
    }
    notification.setText(text);
    return notification;
  }
  function createUndoAction(config) {
    const CS2 = typeof CardService !== "undefined" ? CardService : window.CardService;
    if (!CS2) {
      throw new Error("CardService not available");
    }
    const action = CS2.newAction().setFunctionName(config.functionName);
    if (config.parameters) {
      Object.entries(config.parameters).forEach(([key, value]) => {
        action.setParameters({ [key]: value });
      });
    }
    if (config.timeout) {
      action.setParameters({
        ...config.parameters,
        _undoTimeout: config.timeout.toString()
      });
    }
    return action;
  }
  function truncateText(text, maxLength) {
    if (!text || text.length <= maxLength) {
      return text;
    }
    const truncated = text.substring(0, maxLength);
    const lastSpace = truncated.lastIndexOf(" ");
    if (lastSpace > 0 && lastSpace > maxLength - 20) {
      return truncated.substring(0, lastSpace) + "...";
    }
    return truncated + "...";
  }
  function createImage(config) {
    const CS2 = typeof CardService !== "undefined" ? CardService : window.CardService;
    if (!CS2) {
      throw new Error("CardService not available");
    }
    const image = CS2.newImage().setImageUrl(config.url).setAltText(config.altText);
    if (config.onClick) {
      image.setOnClickAction(config.onClick);
    }
    return image;
  }
  function createDecoratedText(config) {
    const CS2 = typeof CardService !== "undefined" ? CardService : window.CardService;
    if (!CS2) {
      throw new Error("CardService not available");
    }
    const decoratedText = CS2.newDecoratedText().setText(config.text);
    if (config.topLabel) {
      decoratedText.setTopLabel(config.topLabel);
    }
    if (config.bottomLabel) {
      decoratedText.setBottomLabel(config.bottomLabel);
    }
    if (config.icon) {
      decoratedText.setStartIcon(
        CS2.newIconImage().setIcon(CS2.Icon[config.icon.toUpperCase()] || CS2.Icon.NONE)
      );
    }
    if (config.button) {
      decoratedText.setButton(createTextButton(config.button));
    }
    if (config.onClick) {
      decoratedText.setOnClickAction(config.onClick);
    }
    return decoratedText;
  }
  function createButtonSet(buttons) {
    const CS2 = typeof CardService !== "undefined" ? CardService : window.CardService;
    if (!CS2) {
      throw new Error("CardService not available");
    }
    const buttonSet = CS2.newButtonSet();
    buttons.forEach((buttonConfig) => {
      buttonSet.addButton(createTextButton(buttonConfig));
    });
    return buttonSet;
  }
  function createDivider() {
    const CS2 = typeof CardService !== "undefined" ? CardService : window.CardService;
    if (!CS2) {
      throw new Error("CardService not available");
    }
    return CS2.newDivider();
  }
  function createDateTimePicker(config) {
    const CS2 = typeof CardService !== "undefined" ? CardService : window.CardService;
    if (!CS2) {
      throw new Error("CardService not available");
    }
    const picker = CS2.newDateTimePicker().setFieldName(config.fieldName).setTitle(config.title);
    switch (config.type) {
      case "DATE_ONLY":
        picker.setType(CS2.DateTimePickerType.DATE_ONLY);
        break;
      case "TIME_ONLY":
        picker.setType(CS2.DateTimePickerType.TIME_ONLY);
        break;
      case "DATE_AND_TIME":
        picker.setType(CS2.DateTimePickerType.DATE_AND_TIME);
        break;
    }
    if (config.valueMsEpoch !== void 0) {
      picker.setValueInMsSinceEpoch(config.valueMsEpoch);
    }
    if (config.onChange) {
      picker.setOnChangeAction(config.onChange);
    }
    return picker;
  }
  function createGrid(config) {
    const CS2 = typeof CardService !== "undefined" ? CardService : window.CardService;
    if (!CS2) {
      throw new Error("CardService not available");
    }
    const grid = CS2.newGrid();
    if (config.title) {
      grid.setTitle(config.title);
    }
    config.items.forEach((item) => {
      const gridItem = CS2.newGridItem().setTitle(item.title);
      if (item.subtitle) {
        gridItem.setSubtitle(item.subtitle);
      }
      if (item.image) {
        gridItem.setImage(
          CS2.newImageComponent().setImageUrl(item.image.url).setAltText(item.image.altText || "")
        );
      }
      if (item.id) {
        gridItem.setIdentifier(item.id);
      }
      grid.addItem(gridItem);
    });
    if (config.columns) {
      grid.setNumColumns(config.columns);
    }
    if (config.borderStyle) {
      grid.setBorderStyle(config.borderStyle);
    }
    if (config.onClick) {
      grid.setOnClickAction(config.onClick);
    }
    return grid;
  }

  // addon/addon.ts
  var CS = typeof CardService !== "undefined" ? CardService : window?.CardService;
  var PS = typeof PropertiesService !== "undefined" ? PropertiesService : window?.PropertiesService;
  var ICONS = {
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
  return __toCommonJS(index_exports);
})();
