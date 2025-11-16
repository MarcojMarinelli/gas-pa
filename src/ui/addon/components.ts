/**
 * Gmail Add-on Components
 * These components use the CardService API for Gmail Add-ons
 */

interface KeyValueConfig {
  content: string;
  topLabel: string;
  truncate?: number;  // Number of lines to truncate (1 or 2)
  multiline?: boolean;
  bottomLabel?: string;
  icon?: string;
  button?: {
    text: string;
    onClick: () => void;
  };
}

interface UndoActionConfig {
  functionName: string;
  parameters: Record<string, string>;
  timeout?: number;
}

/**
 * Truncate text to specified number of lines
 * Single line: ~80 characters
 * Two lines: ~160 characters
 */
function truncateText(text: string, lines: number): string {
  if (!text) return text;

  const maxLength = lines === 1 ? 80 : 160;

  if (text.length <= maxLength) {
    return text;
  }

  return text.substring(0, maxLength) + '...';
}

/**
 * Create a KeyValue widget for Gmail Add-on
 * Uses mock CardService for testing, real CardService in production
 */
export function createKeyValue(config: KeyValueConfig): any {
  const { content, topLabel, truncate, multiline, bottomLabel, icon, button } = config;

  // Handle content truncation
  let processedContent = content || '';
  if (truncate) {
    processedContent = truncateText(content, truncate);
  }

  // In test environment, use mocked CardService
  if (typeof window !== 'undefined' && (window as any).CardService) {
    const CardService = (window as any).CardService;
    const keyValue = CardService.newKeyValue();

    keyValue.setContent(processedContent);
    keyValue.setTopLabel(topLabel);

    if (multiline) {
      keyValue.setMultiline(true);
    }

    if (bottomLabel) {
      keyValue.setBottomLabel(bottomLabel);
    }

    if (icon) {
      keyValue.setIconUrl(icon);
    }

    if (button) {
      const textButton = CardService.newTextButton()
        .setText(button.text)
        .setOnClickAction(
          CardService.newAction()
            .setFunctionName(button.onClick.name)
        );
      keyValue.setButton(textButton);
    }

    return keyValue;
  }

  // In production Google Apps Script environment
  if (typeof CardService !== 'undefined') {
    const keyValue = CardService.newKeyValue();

    keyValue.setContent(processedContent);
    keyValue.setTopLabel(topLabel);

    if (multiline) {
      keyValue.setMultiline(true);
    }

    if (bottomLabel) {
      keyValue.setBottomLabel(bottomLabel);
    }

    if (icon) {
      keyValue.setIconUrl(icon);
    }

    if (button) {
      const textButton = CardService.newTextButton()
        .setText(button.text)
        .setOnClickAction(
          CardService.newAction()
            .setFunctionName(button.onClick.name)
        );
      keyValue.setButton(textButton);
    }

    return keyValue;
  }

  // Fallback for development
  return {
    content: processedContent,
    topLabel,
    multiline,
    bottomLabel,
    icon,
    button
  };
}

/**
 * Create an undo action with timeout
 * For optimistic updates in Gmail Add-on
 */
export function createUndoAction(config: UndoActionConfig): any {
  const { functionName, parameters, timeout = 10000 } = config;

  // Add timeout to parameters
  const enhancedParams = {
    ...parameters,
    timeout: timeout.toString()
  };

  // In test environment
  if (typeof window !== 'undefined' && (window as any).CardService) {
    const CardService = (window as any).CardService;
    const action = CardService.newAction();

    action.setFunctionName(functionName);
    action.setParameters(enhancedParams);

    // Set up timeout cancellation
    if (timeout) {
      setTimeout(() => {
        // In real implementation, this would cancel the undo option
        console.log(`Undo option expired after ${timeout}ms`);
      }, timeout);
    }

    return action;
  }

  // In production Google Apps Script environment
  if (typeof CardService !== 'undefined') {
    const action = CardService.newAction();

    action.setFunctionName(functionName);
    action.setParameters(enhancedParams);

    // Set up timeout cancellation in GAS
    if (timeout) {
      // In GAS, we'd use Utilities.sleep or a trigger
      // This is a simplified version
      const timeoutId = Utilities.newTrigger('cancelUndo')
        .timeBased()
        .after(timeout)
        .create();

      enhancedParams.timeoutTriggerId = timeoutId.getUniqueId();
    }

    return action;
  }

  // Fallback
  return {
    functionName,
    parameters: enhancedParams,
    timeout
  };
}

/**
 * Create a notification for Gmail Add-on
 */
export function createNotification(message: string, type: 'INFO' | 'ERROR' = 'INFO'): any {
  if (typeof window !== 'undefined' && (window as any).CardService) {
    const CardService = (window as any).CardService;
    const notification = CardService.newNotification().setText(message);

    if (type === 'ERROR') {
      notification.setType(CardService.NotificationType.ERROR);
    }

    return notification;
  }

  if (typeof CardService !== 'undefined') {
    const notification = CardService.newNotification().setText(message);

    if (type === 'ERROR' && CardService.NotificationType) {
      notification.setType(CardService.NotificationType.ERROR);
    }

    return notification;
  }

  return { message, type };
}

/**
 * Create a card section for Gmail Add-on
 */
export function createCardSection(header?: string): any {
  if (typeof window !== 'undefined' && (window as any).CardService) {
    const CardService = (window as any).CardService;
    const section = CardService.newCardSection();

    if (header) {
      section.setHeader(header);
    }

    return section;
  }

  if (typeof CardService !== 'undefined') {
    const section = CardService.newCardSection();

    if (header) {
      section.setHeader(header);
    }

    return section;
  }

  return { header, widgets: [] };
}

/**
 * Create action response with notification
 */
export function createActionResponse(notification: any, navigation?: any): any {
  if (typeof window !== 'undefined' && (window as any).CardService) {
    const CardService = (window as any).CardService;
    const response = CardService.newActionResponseBuilder();

    if (notification) {
      response.setNotification(notification);
    }

    if (navigation) {
      response.setNavigation(navigation);
    }

    return response.build();
  }

  if (typeof CardService !== 'undefined') {
    const response = CardService.newActionResponseBuilder();

    if (notification) {
      response.setNotification(notification);
    }

    if (navigation) {
      response.setNavigation(navigation);
    }

    return response.build();
  }

  return { notification, navigation };
}