import { EmailData, Attachment } from '../types';
import Logger from '../core/logger';
import Config from '../core/config';

export class GmailService {
  private maxEmailsPerRun: number;
  
  constructor() {
    this.maxEmailsPerRun = Config.get('limits').maxEmailsPerRun;
  }
  
  /**
   * Fetch unprocessed emails from inbox
   */
  getUnprocessedEmails(query: string = 'is:unread'): EmailData[] {
    try {
      const threads = GmailApp.search(query, 0, this.maxEmailsPerRun);
      const emails: EmailData[] = [];
      
      threads.forEach(thread => {
        const messages = thread.getMessages();
        messages.forEach(message => {
          if (!this.isProcessed(message)) {
            emails.push(this.parseMessage(message));
          }
        });
      });
      
      Logger.info('GmailService', `Fetched ${emails.length} unprocessed emails`);
      return emails;
      
    } catch (error) {
      Logger.error('GmailService', 'Failed to fetch emails', error);
      throw error;
    }
  }
  
  /**
   * Parse Gmail message into EmailData
   */
  private parseMessage(message: GoogleAppsScript.Gmail.GmailMessage): EmailData {
    return {
      id: message.getId(),
      threadId: message.getThread().getId(),
      from: message.getFrom(),
      to: message.getTo().split(',').map(e => e.trim()),
      subject: message.getSubject(),
      body: message.getPlainBody(),
      date: new Date(message.getDate().getTime()),
      labels: message.getThread().getLabels().map(l => l.getName()),
      attachments: this.parseAttachments(message),
      processed: false
    };
  }
  
  /**
   * Check if message has been processed
   */
  private isProcessed(message: GoogleAppsScript.Gmail.GmailMessage): boolean {
    const processedLabel = GmailApp.getUserLabelByName('PA-Processed');
    if (!processedLabel) return false;
    
    const threadLabels = message.getThread().getLabels();
    return threadLabels.some(label => label.getName() === 'PA-Processed');
  }
  
  /**
   * Parse message attachments
   */
  private parseAttachments(message: GoogleAppsScript.Gmail.GmailMessage): Attachment[] {
    const attachments = message.getAttachments();
    return attachments.map(att => ({
      name: att.getName(),
      mimeType: att.getContentType(),
      size: att.getSize(),
      data: att.copyBlob()
    }));
  }
  
  /**
   * Mark email as processed
   */
  markAsProcessed(emailId: string): void {
    try {
      const message = GmailApp.getMessageById(emailId);
      const label = this.getOrCreateLabel('PA-Processed');
      message.getThread().addLabel(label);
      Logger.debug('GmailService', `Marked email ${emailId} as processed`);
    } catch (error) {
      Logger.error('GmailService', `Failed to mark email ${emailId} as processed`, error);
    }
  }
  
  /**
   * Apply label to email
   */
  applyLabel(emailId: string, labelName: string): void {
    try {
      const message = GmailApp.getMessageById(emailId);
      const label = this.getOrCreateLabel(labelName);
      message.getThread().addLabel(label);
      Logger.debug('GmailService', `Applied label ${labelName} to email ${emailId}`);
    } catch (error) {
      Logger.error('GmailService', `Failed to apply label to email ${emailId}`, error);
    }
  }
  
  /**
   * Get or create Gmail label
   */
  private getOrCreateLabel(name: string): GoogleAppsScript.Gmail.GmailLabel {
    let label = GmailApp.getUserLabelByName(name);
    if (!label) {
      label = GmailApp.createLabel(name);
      Logger.info('GmailService', `Created new label: ${name}`);
    }
    return label;
  }
  
  /**
   * Send email
   */
  sendEmail(to: string, subject: string, body: string, options?: GoogleAppsScript.Gmail.GmailAdvancedOptions): void {
    try {
      if (options) {
        GmailApp.sendEmail(to, subject, body, options);
      } else {
        GmailApp.sendEmail(to, subject, body);
      }
      Logger.info('GmailService', `Email sent to ${to}: ${subject}`);
    } catch (error) {
      Logger.error('GmailService', `Failed to send email to ${to}`, error);
      throw error;
    }
  }
  
  /**
   * Create draft email
   */
  createDraft(to: string, subject: string, body: string, options?: GoogleAppsScript.Gmail.GmailAdvancedOptions): GoogleAppsScript.Gmail.GmailDraft {
    try {
      const draft = options 
        ? GmailApp.createDraft(to, subject, body, options)
        : GmailApp.createDraft(to, subject, body);
      Logger.info('GmailService', `Draft created for ${to}: ${subject}`);
      return draft;
    } catch (error) {
      Logger.error('GmailService', `Failed to create draft for ${to}`, error);
      throw error;
    }
  }
  
  /**
   * Get email statistics
   */
  getStatistics(): any {
    try {
      const totalThreads = GmailApp.getInboxThreads().length;
      const unreadCount = GmailApp.getInboxUnreadCount();
      const importantCount = GmailApp.search('is:important').length;
      const starredCount = GmailApp.getStarredThreads().length;
      
      return {
        totalThreads,
        unreadCount,
        importantCount,
        starredCount,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      Logger.error('GmailService', 'Failed to get statistics', error);
      throw error;
    }
  }
}
