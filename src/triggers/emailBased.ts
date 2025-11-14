import Logger from '../core/logger';
import { GmailService } from '../services/gmail';
import { EmailProcessor } from '../processors/emailProcessor';
import { EmailData } from '../types';

// Define the MessageEvent interface since it doesn't exist in the GoogleAppsScript namespace
interface MessageEvent {
  message: GoogleAppsScript.Gmail.GmailMessage;
}

/**
 * Handle incoming email trigger (if using Gmail addon)
 */
export async function onEmailReceived(e: MessageEvent): Promise<void> {
  Logger.info('EmailTrigger', 'New email received');
  
  try {
    const message = e.message;
    const thread = message.getThread();
    
    // Convert to EmailData format
    const emailData: EmailData = {
      id: message.getId(),
      threadId: thread.getId(),
      from: message.getFrom(),
      to: message.getTo().split(',').map((t: string) => t.trim()),
      subject: message.getSubject(),
      body: message.getPlainBody(),
      date: new Date(message.getDate().getTime()),
      labels: thread.getLabels().map((l: GoogleAppsScript.Gmail.GmailLabel) => l.getName()),
      attachments: message.getAttachments().map((att: GoogleAppsScript.Gmail.GmailAttachment) => ({
        name: att.getName(),
        mimeType: att.getContentType(),
        size: att.getSize(),
        data: att.copyBlob()
      }))
    };
    
    // Process immediately if high priority
    if (isHighPriorityEmail(emailData)) {
      Logger.info('EmailTrigger', 'Processing high priority email immediately');
      const processor = new EmailProcessor();
      await processor.processBatch([emailData]);
    }
    
  } catch (error) {
    Logger.error('EmailTrigger', 'Failed to handle incoming email', error);
  }
}

/**
 * Handle email label change
 */
export function onLabelChange(e: any): void {
  Logger.info('EmailTrigger', 'Label change detected');
  
  try {
    // Check if PA label was added or removed
    const addedLabels = e.addedLabels || [];
    const removedLabels = e.removedLabels || [];
    
    // Handle label-based automation
    if (addedLabels.includes('PA-Urgent')) {
      handleUrgentEmail(e.messageId);
    }
    
    if (removedLabels.includes('PA-Processed')) {
      // Email was marked for reprocessing
      reprocessEmail(e.messageId);
    }
    
  } catch (error) {
    Logger.error('EmailTrigger', 'Failed to handle label change', error);
  }
}

/**
 * Check if email is high priority
 */
function isHighPriorityEmail(email: EmailData): boolean {
  const prioritySenders = PropertiesService.getScriptProperties()
    .getProperty('PRIORITY_SENDERS')?.split(',') || [];
  
  const priorityKeywords = ['urgent', 'asap', 'critical', 'emergency'];
  
  // Check sender
  if (prioritySenders.some(sender => email.from.includes(sender))) {
    return true;
  }
  
  // Check subject and body
  const content = `${email.subject} ${email.body}`.toLowerCase();
  return priorityKeywords.some(keyword => content.includes(keyword));
}

/**
 * Handle urgent email
 */
async function handleUrgentEmail(messageId: string): Promise<void> {
  Logger.info('EmailTrigger', `Handling urgent email: ${messageId}`);
  
  try {
    const gmailService = new GmailService();
    
    // Send notification
    gmailService.sendEmail(
      Session.getActiveUser().getEmail(),
      '🚨 Urgent Email Alert',
      `An urgent email has been received and requires your immediate attention.\\n\\nMessage ID: ${messageId}`,
      { htmlBody: `<p style="color: red; font-weight: bold;">🚨 Urgent Email Alert</p><p>An urgent email requires your immediate attention.</p><p>Message ID: ${messageId}</p>` }
    );
    
    // Could also send SMS, create calendar event, etc.
    
  } catch (error) {
    Logger.error('EmailTrigger', `Failed to handle urgent email ${messageId}`, error);
  }
}

/**
 * Reprocess an email
 */
async function reprocessEmail(messageId: string): Promise<void> {
  Logger.info('EmailTrigger', `Reprocessing email: ${messageId}`);
  
  try {
    const message = GmailApp.getMessageById(messageId);
    
    const emailData: EmailData = {
      id: message.getId(),
      threadId: message.getThread().getId(),
      from: message.getFrom(),
      to: message.getTo().split(',').map((t: string) => t.trim()),
      subject: message.getSubject(),
      body: message.getPlainBody(),
      date: new Date(message.getDate().getTime()),
      labels: message.getThread().getLabels().map((l: GoogleAppsScript.Gmail.GmailLabel) => l.getName()),
      processed: false
    };
    
    const processor = new EmailProcessor();
    await processor.processBatch([emailData]);
    
  } catch (error) {
    Logger.error('EmailTrigger', `Failed to reprocess email ${messageId}`, error);
  }
}

/**
 * Handle email response composed
 */
export function onResponseComposed(e: any): void {
  Logger.info('EmailTrigger', 'Email response composed');
  
  try {
    // Track response patterns for learning
    const responseData = {
      originalSubject: e.originalSubject,
      responseTime: new Date(),
      responseLength: e.responseBody?.length || 0
    };
    
    // Store for analysis
    storeResponsePattern(responseData);
    
  } catch (error) {
    Logger.error('EmailTrigger', 'Failed to track response', error);
  }
}

/**
 * Store response patterns for learning
 */
function storeResponsePattern(data: any): void {
  try {
    const props = PropertiesService.getScriptProperties();
    const patterns = JSON.parse(props.getProperty('RESPONSE_PATTERNS') || '[]');
    
    patterns.push(data);
    
    // Keep only last 100 patterns
    if (patterns.length > 100) {
      patterns.shift();
    }
    
    props.setProperty('RESPONSE_PATTERNS', JSON.stringify(patterns));
    
  } catch (error) {
    Logger.error('EmailTrigger', 'Failed to store response pattern', error);
  }
}
