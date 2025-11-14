import { EmailData, ProcessingResult } from '../types';
import { GmailService } from '../services/gmail';
import { SheetsService } from '../services/sheets';
import Logger from '../core/logger';

export class EmailProcessor {
  private gmailService: GmailService;
  private sheetsService: SheetsService;
  private runId: string;
  
  constructor() {
    this.gmailService = new GmailService();
    this.sheetsService = new SheetsService();
    this.runId = Utilities.getUuid();
  }
  
  /**
   * Process a batch of emails
   */
  processBatch(emails: EmailData[]): ProcessingResult[] {
    const results: ProcessingResult[] = [];
    const startTime = Date.now();
    
    Logger.info('EmailProcessor', `Starting batch processing: ${emails.length} emails, Run ID: ${this.runId}`);
    
    emails.forEach(email => {
      const result = this.processEmail(email);
      results.push(result);
      
      // Log email to sheet
      this.sheetsService.logEmail(email, result);
    });
    
    const duration = Date.now() - startTime;
    
    // Log processing run
    this.sheetsService.logProcessingRun(this.runId, results, duration);
    
    // Update statistics
    this.updateStatistics(results);
    
    Logger.info('EmailProcessor', `Batch processing complete: ${results.length} emails in ${duration}ms`);
    
    return results;
  }
  
  /**
   * Process single email
   */
  private processEmail(email: EmailData): ProcessingResult {
    const actions: string[] = [];
    
    try {
      Logger.debug('EmailProcessor', `Processing email: ${email.subject} from ${email.from}`);
      
      // Priority detection
      const priority = this.detectPriority(email);
      if (priority === 'high') {
        this.gmailService.applyLabel(email.id, 'PA-Priority');
        actions.push('marked-priority');
      }
      
      // Category detection
      const category = this.categorizeEmail(email);
      if (category) {
        this.gmailService.applyLabel(email.id, `PA-${category}`);
        actions.push(`categorized-${category}`);
      }
      
      // Action items extraction
      const hasActions = this.hasActionItems(email);
      if (hasActions) {
        this.gmailService.applyLabel(email.id, 'PA-ActionRequired');
        actions.push('action-required');
        
        // Extract and log action items
        const actionItems = this.extractActionItems(email);
        if (actionItems.length > 0) {
          this.logActionItems(email, actionItems);
          actions.push(`extracted-${actionItems.length}-actions`);
        }
      }
      
      // Check for meeting requests
      if (this.isMeetingRequest(email)) {
        this.gmailService.applyLabel(email.id, 'PA-Meeting');
        actions.push('meeting-request');
      }
      
      // Check for follow-up needed
      if (this.needsFollowUp(email)) {
        this.gmailService.applyLabel(email.id, 'PA-FollowUp');
        actions.push('follow-up-needed');
      }
      
      // Mark as processed
      this.gmailService.markAsProcessed(email.id);
      actions.push('processed');
      
      return {
        success: true,
        emailId: email.id,
        actions,
        timestamp: new Date()
      };
      
    } catch (error) {
      Logger.error('EmailProcessor', `Failed to process email ${email.id}`, error);
      return {
        success: false,
        emailId: email.id,
        actions,
        error: error instanceof Error ? error.toString() : String(error),
        timestamp: new Date()
      };
    }
  }
  
  /**
   * Detect email priority
   */
  private detectPriority(email: EmailData): 'high' | 'normal' | 'low' {
    const content = `${email.subject} ${email.body}`.toLowerCase();
    
    // High priority indicators
    const highPriorityIndicators = [
      'urgent',
      'asap',
      'immediately',
      'critical',
      'important',
      'deadline today',
      'by eod',
      'by end of day'
    ];
    
    // Check sender importance (customize with your VIP list)
    const vipSenders = this.getVIPSenders();
    const isVIP = vipSenders.some(vip => email.from.toLowerCase().includes(vip.toLowerCase()));
    
    if (isVIP) {
      return 'high';
    }
    
    if (highPriorityIndicators.some(indicator => content.includes(indicator))) {
      return 'high';
    }
    
    // Low priority indicators
    const lowPriorityIndicators = [
      'newsletter',
      'unsubscribe',
      'no-reply',
      'automated',
      'notification'
    ];
    
    if (lowPriorityIndicators.some(indicator => content.includes(indicator))) {
      return 'low';
    }
    
    return 'normal';
  }
  
  /**
   * Categorize email
   */
  private categorizeEmail(email: EmailData): string | null {
    const content = `${email.subject} ${email.body}`.toLowerCase();
    
    // Category definitions with keywords
    const categories = {
      'Work': ['meeting', 'project', 'deadline', 'report', 'presentation', 'task', 'assignment'],
      'Personal': ['family', 'friend', 'weekend', 'dinner', 'birthday', 'vacation'],
      'Finance': ['invoice', 'payment', 'budget', 'expense', 'salary', 'tax', 'receipt'],
      'Newsletter': ['unsubscribe', 'newsletter', 'update from', 'weekly digest', 'monthly summary'],
      'Shopping': ['order', 'delivery', 'package', 'shipped', 'tracking', 'cart'],
      'Travel': ['flight', 'hotel', 'booking', 'reservation', 'itinerary', 'passport'],
      'Support': ['ticket', 'support', 'help', 'issue', 'problem', 'bug', 'error']
    };
    
    // Check each category
    for (const [category, keywords] of Object.entries(categories)) {
      const matchCount = keywords.filter(keyword => content.includes(keyword)).length;
      // Require at least 2 keyword matches for better accuracy
      if (matchCount >= 2) {
        return category;
      }
    }
    
    // Single keyword match for strong indicators
    if (content.includes('invoice') || content.includes('receipt')) {
      return 'Finance';
    }
    
    if (content.includes('unsubscribe')) {
      return 'Newsletter';
    }
    
    return null;
  }
  
  /**
   * Check if email contains action items
   */
  private hasActionItems(email: EmailData): boolean {
    const actionIndicators = [
      'please review',
      'please confirm',
      'action required',
      'need your',
      'could you',
      'can you',
      'will you',
      'please send',
      'please provide',
      'let me know',
      'your approval',
      'your feedback',
      'your thoughts',
      'by when',
      'deadline',
      '?'  // Questions often require action
    ];
    
    const content = email.body.toLowerCase();
    return actionIndicators.some(indicator => content.includes(indicator));
  }
  
  /**
   * Extract action items from email
   */
  private extractActionItems(email: EmailData): string[] {
    const actionItems: string[] = [];
    const lines = email.body.split('\n');
    
    const actionPatterns = [
      /please\s+(.+)/i,
      /could\s+you\s+(.+)/i,
      /can\s+you\s+(.+)/i,
      /need\s+(?:you\s+to|your)\s+(.+)/i,
      /action:\s*(.+)/i,
      /todo:\s*(.+)/i,
      /task:\s*(.+)/i,
      /-\s*\[\s*\]\s*(.+)/  // Checkbox format
    ];
    
    lines.forEach(line => {
      actionPatterns.forEach(pattern => {
        const match = line.match(pattern);
        if (match && match[1]) {
          // Clean up the action item
          let action = match[1].trim();
          // Remove trailing punctuation except question marks
          action = action.replace(/[.!,;]$/, '');
          // Limit length
          if (action.length > 10 && action.length < 200) {
            actionItems.push(action);
          }
        }
      });
    });
    
    // Remove duplicates
    return [...new Set(actionItems)];
  }
  
  /**
   * Check if email is a meeting request
   */
  private isMeetingRequest(email: EmailData): boolean {
    const meetingIndicators = [
      'meeting',
      'calendar',
      'schedule',
      'appointment',
      'call',
      'zoom',
      'teams',
      'google meet',
      'invite',
      'when are you available',
      'what time works',
      'let\'s meet'
    ];
    
    const content = `${email.subject} ${email.body}`.toLowerCase();
    
    // Check for calendar attachments
    const hasCalendarAttachment = email.attachments?.some(att => 
      att.mimeType.includes('calendar') || att.name.endsWith('.ics')
    ) || false;
    
    if (hasCalendarAttachment) {
      return true;
    }
    
    // Count meeting indicators
    const matchCount = meetingIndicators.filter(indicator => content.includes(indicator)).length;
    return matchCount >= 2;
  }
  
  /**
   * Check if email needs follow-up
   */
  private needsFollowUp(email: EmailData): boolean {
    const followUpIndicators = [
      'follow up',
      'follow-up',
      'checking in',
      'touching base',
      'any update',
      'any progress',
      'haven\'t heard',
      'reminder',
      'gentle reminder',
      'wanted to check',
      'circling back'
    ];
    
    const content = email.body.toLowerCase();
    return followUpIndicators.some(indicator => content.includes(indicator));
  }
  
  /**
   * Get VIP senders list
   */
  private getVIPSenders(): string[] {
    // This could be loaded from configuration
    const configVIPs = this.sheetsService.getConfig('vip_senders');
    if (configVIPs) {
      return configVIPs.split(',').map(s => s.trim());
    }
    
    // Default VIP list (customize these)
    return [
      'boss@company.com',
      'ceo@company.com',
      'important.client@example.com'
    ];
  }
  
  /**
   * Log action items to sheet
   */
  private logActionItems(email: EmailData, actionItems: string[]): void {
    // This could be enhanced to create tasks in a task management system
    Logger.info('EmailProcessor', `Extracted ${actionItems.length} action items from ${email.subject}`, actionItems);
  }
  
  /**
   * Update statistics
   */
  private updateStatistics(results: ProcessingResult[]): void {
    const stats = {
      totalEmails: results.length,
      processed: results.filter(r => r.success).length,
      categorized: results.filter(r => r.actions.some(a => a.startsWith('categorized'))).length,
      highPriority: results.filter(r => r.actions.includes('marked-priority')).length,
      actionRequired: results.filter(r => r.actions.includes('action-required')).length,
      autoReplied: 0  // Will be implemented when AI is added
    };
    
    this.sheetsService.updateDailyStats(stats);
  }
}
