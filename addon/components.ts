/**
 * Gmail Add-on UI Components
 * Type-safe builders for Card Service components
 */

// Component type definitions
export interface AddonCard {
  header?: CardHeader;
  sections: AddonSection[];
  displayStyle?: GoogleAppsScript.Card_Service.DisplayStyle;
  fixedFooter?: AddonSection;
  build(): GoogleAppsScript.Card_Service.Card;
  addSection(section: AddonSection): AddonCard;
}

export interface CardHeader {
  title: string;
  subtitle?: string;
  imageUrl?: string;
  imageStyle?: GoogleAppsScript.Card_Service.ImageStyle;
}

export interface AddonSection {
  header?: string;
  widgets: any[];
  collapsible?: boolean;
  uncollapsibleWidgetsCount?: number;
  addWidget(widget: any): AddonSection;
  build(): GoogleAppsScript.Card_Service.CardSection;
}

export interface AddonAction {
  functionName: string;
  parameters?: Record<string, string>;
  loadIndicator?: GoogleAppsScript.Card_Service.LoadIndicator;
}

export interface AddonKeyValue {
  content: string;
  topLabel?: string;
  bottomLabel?: string;
  icon?: string;
  button?: AddonButton;
  multiline?: boolean;
  truncate?: 1 | 2; // 1 or 2 line truncation
  onClick?: GoogleAppsScript.Card_Service.Action;
}

export interface AddonButton {
  text: string;
  icon?: string;
  color?: GoogleAppsScript.Card_Service.TextButtonStyle;
  onClick: GoogleAppsScript.Card_Service.Action;
  disabled?: boolean;
}

export interface AddonTextInput {
  fieldName: string;
  title: string;
  value?: string;
  hint?: string;
  multiline?: boolean;
  suggestions?: GoogleAppsScript.Card_Service.Suggestions;
  onChange?: GoogleAppsScript.Card_Service.Action;
  validation?: TextInputValidation;
}

export interface TextInputValidation {
  required?: boolean;
  characterLimit?: number;
  regex?: string;
  errorText?: string;
}

export interface AddonSelectionInput {
  fieldName: string;
  title: string;
  type: GoogleAppsScript.Card_Service.SelectionInputType;
  items: SelectionItem[];
  onChange?: GoogleAppsScript.Card_Service.Action;
}

export interface SelectionItem {
  text: string;
  value: string;
  selected: boolean;
}

export interface AddonNotification {
  text: string;
  type: 'SUCCESS' | 'INFO' | 'WARNING' | 'ERROR';
}

export interface UndoAction {
  functionName: string;
  parameters?: Record<string, string>;
  timeout?: number;
}

/**
 * Create a new card
 */
export function createCard(config: {
  header?: CardHeader;
  displayStyle?: GoogleAppsScript.Card_Service.DisplayStyle;
  fixedFooter?: AddonSection;
}): AddonCard {
  const CS = typeof CardService !== 'undefined' ? CardService : (window as any).CardService;

  if (!CS) {
    throw new Error('CardService not available');
  }

  const cardBuilder = CS.newCardBuilder();

  if (config.header) {
    const headerBuilder = CS.newCardHeader()
      .setTitle(config.header.title);

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

  const sections: GoogleAppsScript.Card_Service.CardSection[] = [];

  const card: AddonCard = {
    header: config.header,
    sections: [],
    displayStyle: config.displayStyle,
    fixedFooter: config.fixedFooter,
    addSection(section: AddonSection): AddonCard {
      sections.push(section.build());
      this.sections.push(section);
      return this;
    },
    build(): GoogleAppsScript.Card_Service.Card {
      sections.forEach(section => cardBuilder.addSection(section));
      if (config.fixedFooter) {
        cardBuilder.setFixedFooter(config.fixedFooter.build());
      }
      return cardBuilder.build();
    }
  };

  return card;
}

/**
 * Create a new section
 */
export function createSection(config: {
  header?: string;
  collapsible?: boolean;
  uncollapsibleWidgetsCount?: number;
}): AddonSection {
  const CS = typeof CardService !== 'undefined' ? CardService : (window as any).CardService;

  if (!CS) {
    throw new Error('CardService not available');
  }

  const sectionBuilder = CS.newCardSection();

  if (config.header) {
    sectionBuilder.setHeader(config.header);
  }

  if (config.collapsible) {
    sectionBuilder.setCollapsible(config.collapsible);
  }

  if (config.uncollapsibleWidgetsCount !== undefined) {
    sectionBuilder.setNumUncollapsibleWidgets(config.uncollapsibleWidgetsCount);
  }

  const widgets: any[] = [];

  const section: AddonSection = {
    header: config.header,
    widgets: [],
    collapsible: config.collapsible,
    uncollapsibleWidgetsCount: config.uncollapsibleWidgetsCount,
    addWidget(widget: any): AddonSection {
      widgets.push(widget);
      this.widgets.push(widget);
      return this;
    },
    build(): GoogleAppsScript.Card_Service.CardSection {
      widgets.forEach(widget => sectionBuilder.addWidget(widget));
      return sectionBuilder.build();
    }
  };

  return section;
}

/**
 * Create a KeyValue widget with truncation support
 */
export function createKeyValue(config: AddonKeyValue): any {
  // Use global CardService if available (GAS environment), otherwise use window.CardService (test environment)
  const CS = typeof CardService !== 'undefined' ? CardService : (window as any).CardService;

  if (!CS) {
    throw new Error('CardService not available');
  }

  const keyValue = CS.newKeyValue();

  // Apply content with truncation
  let content = config.content || '';

  // Handle truncation based on line count
  if (config.truncate === 1) {
    // CSS-based truncation for single line
    keyValue.setContent(truncateText(content, 80)); // ~80 chars for single line
  } else if (config.truncate === 2) {
    // Two-line truncation
    keyValue.setContent(truncateText(content, 160)); // ~160 chars for two lines
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
    // Material Symbols Outlined icon
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

/**
 * Create a button
 */
export function createButton(config: AddonButton): any {
  return createTextButton(config);
}

function createTextButton(config: AddonButton): any {
  // Use global CardService if available (GAS environment), otherwise use window.CardService (test environment)
  const CS = typeof CardService !== 'undefined' ? CardService : (window as any).CardService;

  if (!CS) {
    throw new Error('CardService not available');
  }

  const button = CS.newTextButton()
    .setText(config.text)
    .setOnClickAction(config.onClick);

  if (config.icon) {
    // Material Symbols Outlined icon support
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

/**
 * Create a text input
 */
export function createTextInput(config: AddonTextInput): any {
  const CS = typeof CardService !== 'undefined' ? CardService : (window as any).CardService;

  if (!CS) {
    throw new Error('CardService not available');
  }

  const textInput = CS.newTextInput()
    .setFieldName(config.fieldName)
    .setTitle(config.title);

  if (config.value !== undefined) {
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

  // Apply validation if provided
  if (config.validation) {
    if (config.validation.required) {
      // Note: Card Service doesn't have direct required validation
      // This would be handled in the action function
    }

    if (config.validation.characterLimit) {
      // Character limit validation would be in the action
    }

    if (config.validation.regex) {
      // Regex validation would be in the action
    }
  }

  return textInput;
}

/**
 * Create a selection input
 */
export function createSelectionInput(config: AddonSelectionInput): any {
  const CS = typeof CardService !== 'undefined' ? CardService : (window as any).CardService;

  if (!CS) {
    throw new Error('CardService not available');
  }

  const selectionInput = CS.newSelectionInput()
    .setFieldName(config.fieldName)
    .setTitle(config.title)
    .setType(config.type);

  config.items.forEach(item => {
    selectionInput.addItem(item.text, item.value, item.selected);
  });

  if (config.onChange) {
    selectionInput.setOnChangeAction(config.onChange);
  }

  return selectionInput;
}

/**
 * Create a notification
 */
export function createNotification(config: AddonNotification): any {
  const CS = typeof CardService !== 'undefined' ? CardService : (window as any).CardService;

  if (!CS) {
    throw new Error('CardService not available');
  }

  const notification = CS.newNotification();

  // Add icon based on type
  let text = config.text;
  switch (config.type) {
    case 'SUCCESS':
      text = '✓ ' + text;
      break;
    case 'ERROR':
      text = '✕ ' + text;
      break;
    case 'WARNING':
      text = '⚠ ' + text;
      break;
    case 'INFO':
    default:
      text = 'ℹ ' + text;
      break;
  }

  notification.setText(text);
  return notification;
}

/**
 * Create an optimistic undo action
 * This creates a delayed action that can be cancelled
 */
export function createUndoAction(config: UndoAction): any {
  // Use global CardService if available (GAS environment), otherwise use window.CardService (test environment)
  const CS = typeof CardService !== 'undefined' ? CardService : (window as any).CardService;

  if (!CS) {
    throw new Error('CardService not available');
  }

  const action = CS.newAction()
    .setFunctionName(config.functionName);

  if (config.parameters) {
    Object.entries(config.parameters).forEach(([key, value]) => {
      action.setParameters({ [key]: value });
    });
  }

  // Note: Actual undo timeout would be implemented in the function
  // storing the timeout in parameters for reference
  if (config.timeout) {
    action.setParameters({
      ...config.parameters,
      _undoTimeout: config.timeout.toString()
    });
  }

  return action;
}

/**
 * Helper function to truncate text with ellipsis
 */
function truncateText(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) {
    return text;
  }

  // Find last word boundary before max length
  const truncated = text.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');

  if (lastSpace > 0 && lastSpace > maxLength - 20) {
    return truncated.substring(0, lastSpace) + '...';
  }

  return truncated + '...';
}

/**
 * Create an image widget
 */
export function createImage(config: {
  url: string;
  altText: string;
  onClick?: any;
}): any {
  const CS = typeof CardService !== 'undefined' ? CardService : (window as any).CardService;

  if (!CS) {
    throw new Error('CardService not available');
  }

  const image = CS.newImage()
    .setImageUrl(config.url)
    .setAltText(config.altText);

  if (config.onClick) {
    image.setOnClickAction(config.onClick);
  }

  return image;
}

/**
 * Create a decorated text widget
 */
export function createDecoratedText(config: {
  text: string;
  topLabel?: string;
  bottomLabel?: string;
  icon?: string;
  button?: AddonButton;
  onClick?: any;
}): any {
  const CS = typeof CardService !== 'undefined' ? CardService : (window as any).CardService;

  if (!CS) {
    throw new Error('CardService not available');
  }

  const decoratedText = CS.newDecoratedText()
    .setText(config.text);

  if (config.topLabel) {
    decoratedText.setTopLabel(config.topLabel);
  }

  if (config.bottomLabel) {
    decoratedText.setBottomLabel(config.bottomLabel);
  }

  if (config.icon) {
    decoratedText.setStartIcon(
      CS.newIconImage()
        .setIcon(CS.Icon[config.icon.toUpperCase()] || CS.Icon.NONE)
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

/**
 * Create a button set
 */
export function createButtonSet(buttons: AddonButton[]): any {
  const CS = typeof CardService !== 'undefined' ? CardService : (window as any).CardService;

  if (!CS) {
    throw new Error('CardService not available');
  }

  const buttonSet = CS.newButtonSet();

  buttons.forEach(buttonConfig => {
    buttonSet.addButton(createTextButton(buttonConfig));
  });

  return buttonSet;
}

/**
 * Create a divider
 */
export function createDivider(): any {
  const CS = typeof CardService !== 'undefined' ? CardService : (window as any).CardService;

  if (!CS) {
    throw new Error('CardService not available');
  }

  return CS.newDivider();
}

/**
 * Create a date/time picker
 */
export function createDateTimePicker(config: {
  fieldName: string;
  title: string;
  type: 'DATE_ONLY' | 'TIME_ONLY' | 'DATE_AND_TIME';
  valueMsEpoch?: number;
  onChange?: any;
}): any {
  const CS = typeof CardService !== 'undefined' ? CardService : (window as any).CardService;

  if (!CS) {
    throw new Error('CardService not available');
  }

  const picker = CS.newDateTimePicker()
    .setFieldName(config.fieldName)
    .setTitle(config.title);

  switch (config.type) {
    case 'DATE_ONLY':
      picker.setType(CS.DateTimePickerType.DATE_ONLY);
      break;
    case 'TIME_ONLY':
      picker.setType(CS.DateTimePickerType.TIME_ONLY);
      break;
    case 'DATE_AND_TIME':
      picker.setType(CS.DateTimePickerType.DATE_AND_TIME);
      break;
  }

  if (config.valueMsEpoch !== undefined) {
    picker.setValueInMsSinceEpoch(config.valueMsEpoch);
  }

  if (config.onChange) {
    picker.setOnChangeAction(config.onChange);
  }

  return picker;
}

/**
 * Create a grid with items
 */
export function createGrid(config: {
  title?: string;
  items: GridItem[];
  columns?: number;
  borderStyle?: any;
  onClick?: any;
}): any {
  const CS = typeof CardService !== 'undefined' ? CardService : (window as any).CardService;

  if (!CS) {
    throw new Error('CardService not available');
  }

  const grid = CS.newGrid();

  if (config.title) {
    grid.setTitle(config.title);
  }

  config.items.forEach(item => {
    const gridItem = CS.newGridItem()
      .setTitle(item.title);

    if (item.subtitle) {
      gridItem.setSubtitle(item.subtitle);
    }

    if (item.image) {
      gridItem.setImage(
        CS.newImageComponent()
          .setImageUrl(item.image.url)
          .setAltText(item.image.altText || '')
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

export interface GridItem {
  id?: string;
  title: string;
  subtitle?: string;
  image?: {
    url: string;
    altText?: string;
  };
}