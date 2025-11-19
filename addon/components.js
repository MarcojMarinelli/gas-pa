function createCard(config) {
  const CS = typeof CardService !== "undefined" ? CardService : window.CardService;
  if (!CS) {
    throw new Error("CardService not available");
  }
  const cardBuilder = CS.newCardBuilder();
  if (config.header) {
    const headerBuilder = CS.newCardHeader().setTitle(config.header.title);
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
  const CS = typeof CardService !== "undefined" ? CardService : window.CardService;
  if (!CS) {
    throw new Error("CardService not available");
  }
  const sectionBuilder = CS.newCardSection();
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
  const CS = typeof CardService !== "undefined" ? CardService : window.CardService;
  if (!CS) {
    throw new Error("CardService not available");
  }
  const keyValue = CS.newKeyValue();
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
    keyValue.setIcon(CS.Icon[config.icon.toUpperCase()] || CS.Icon.NONE);
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
  const CS = typeof CardService !== "undefined" ? CardService : window.CardService;
  if (!CS) {
    throw new Error("CardService not available");
  }
  const button = CS.newTextButton().setText(config.text).setOnClickAction(config.onClick);
  if (config.icon) {
    button.setIcon(CS.Icon[config.icon.toUpperCase()] || CS.Icon.NONE);
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
  const CS = typeof CardService !== "undefined" ? CardService : window.CardService;
  if (!CS) {
    throw new Error("CardService not available");
  }
  const textInput = CS.newTextInput().setFieldName(config.fieldName).setTitle(config.title);
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
  const CS = typeof CardService !== "undefined" ? CardService : window.CardService;
  if (!CS) {
    throw new Error("CardService not available");
  }
  const selectionInput = CS.newSelectionInput().setFieldName(config.fieldName).setTitle(config.title).setType(config.type);
  config.items.forEach((item) => {
    selectionInput.addItem(item.text, item.value, item.selected);
  });
  if (config.onChange) {
    selectionInput.setOnChangeAction(config.onChange);
  }
  return selectionInput;
}
function createNotification(config) {
  const CS = typeof CardService !== "undefined" ? CardService : window.CardService;
  if (!CS) {
    throw new Error("CardService not available");
  }
  const notification = CS.newNotification();
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
  const CS = typeof CardService !== "undefined" ? CardService : window.CardService;
  if (!CS) {
    throw new Error("CardService not available");
  }
  const action = CS.newAction().setFunctionName(config.functionName);
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
  const CS = typeof CardService !== "undefined" ? CardService : window.CardService;
  if (!CS) {
    throw new Error("CardService not available");
  }
  const image = CS.newImage().setImageUrl(config.url).setAltText(config.altText);
  if (config.onClick) {
    image.setOnClickAction(config.onClick);
  }
  return image;
}
function createDecoratedText(config) {
  const CS = typeof CardService !== "undefined" ? CardService : window.CardService;
  if (!CS) {
    throw new Error("CardService not available");
  }
  const decoratedText = CS.newDecoratedText().setText(config.text);
  if (config.topLabel) {
    decoratedText.setTopLabel(config.topLabel);
  }
  if (config.bottomLabel) {
    decoratedText.setBottomLabel(config.bottomLabel);
  }
  if (config.icon) {
    decoratedText.setStartIcon(
      CS.newIconImage().setIcon(CS.Icon[config.icon.toUpperCase()] || CS.Icon.NONE)
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
  const CS = typeof CardService !== "undefined" ? CardService : window.CardService;
  if (!CS) {
    throw new Error("CardService not available");
  }
  const buttonSet = CS.newButtonSet();
  buttons.forEach((buttonConfig) => {
    buttonSet.addButton(createTextButton(buttonConfig));
  });
  return buttonSet;
}
function createDivider() {
  const CS = typeof CardService !== "undefined" ? CardService : window.CardService;
  if (!CS) {
    throw new Error("CardService not available");
  }
  return CS.newDivider();
}
function createDateTimePicker(config) {
  const CS = typeof CardService !== "undefined" ? CardService : window.CardService;
  if (!CS) {
    throw new Error("CardService not available");
  }
  const picker = CS.newDateTimePicker().setFieldName(config.fieldName).setTitle(config.title);
  switch (config.type) {
    case "DATE_ONLY":
      picker.setType(CS.DateTimePickerType.DATE_ONLY);
      break;
    case "TIME_ONLY":
      picker.setType(CS.DateTimePickerType.TIME_ONLY);
      break;
    case "DATE_AND_TIME":
      picker.setType(CS.DateTimePickerType.DATE_AND_TIME);
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
  const CS = typeof CardService !== "undefined" ? CardService : window.CardService;
  if (!CS) {
    throw new Error("CardService not available");
  }
  const grid = CS.newGrid();
  if (config.title) {
    grid.setTitle(config.title);
  }
  config.items.forEach((item) => {
    const gridItem = CS.newGridItem().setTitle(item.title);
    if (item.subtitle) {
      gridItem.setSubtitle(item.subtitle);
    }
    if (item.image) {
      gridItem.setImage(
        CS.newImageComponent().setImageUrl(item.image.url).setAltText(item.image.altText || "")
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
export {
  createButton,
  createButtonSet,
  createCard,
  createDateTimePicker,
  createDecoratedText,
  createDivider,
  createGrid,
  createImage,
  createKeyValue,
  createNotification,
  createSection,
  createSelectionInput,
  createTextInput,
  createUndoAction
};
