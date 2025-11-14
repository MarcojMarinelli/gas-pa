/**
 * VIP Contact Manager
 */

import { VIPContact } from '../../core/types';
import DatabaseService from '../../core/database-service';
import LoggerService from '../../core/logger-service';
import CacheManager from '../../core/cache-manager';
import ConfigManager from '../../core/config-manager';

export class VIPManager {
  private static instance: VIPManager;
  private vips: Map<string, VIPContact> = new Map();
  private lastReload: number = 0;
  private readonly RELOAD_INTERVAL = 600000; // 10 minutes

  private constructor() {
    // Don't load VIPs here - load lazily when first accessed
    // This prevents "Spreadsheet not initialized" errors on module load
  }

  static getInstance(): VIPManager {
    if (!VIPManager.instance) {
      VIPManager.instance = new VIPManager();
    }
    return VIPManager.instance;
  }

  private async loadVIPs(): Promise<void> {
    try {
      // Check cache first
      const cached = await CacheManager.get<VIPContact[]>('vip_contacts');
      if (cached) {
        this.vips.clear();
        cached.forEach(vip => this.vips.set(vip.email.toLowerCase(), vip));
        LoggerService.info('VIPManager', `Loaded ${this.vips.size} VIP contacts from cache`);
        return;
      }

      // Load from database
      const vipData = await DatabaseService.find('VIPs', {
        orderBy: { column: 'tier', direction: 'ASC' }
      });

      this.vips.clear();
      vipData.forEach(data => {
        const vip = this.deserializeVIP(data);
        this.vips.set(vip.email.toLowerCase(), vip);
      });

      // Cache for 10 minutes
      await CacheManager.set('vip_contacts', Array.from(this.vips.values()), 600);

      LoggerService.info('VIPManager', `Loaded ${this.vips.size} VIP contacts`);
    } catch (error) {
      LoggerService.error('VIPManager', 'Failed to load VIPs', error as Error);
      this.loadDefaultVIPs();
    }
  }

  private deserializeVIP(data: any): VIPContact {
    return {
      email: data.email,
      name: data.name,
      tier: data.tier,
      autoDraft: data.autoDraft,
      customRules: data.customRules ? JSON.parse(data.customRules) : undefined,
      slaHours: data.slaHours
    };
  }

  async isVIP(email: string): Promise<VIPContact | null> {
    // Load on first access or reload if needed
    if (this.vips.size === 0 || Date.now() - this.lastReload > this.RELOAD_INTERVAL) {
      await this.loadVIPs();
      this.lastReload = Date.now();
    }

    // Normalize email
    const normalizedEmail = this.normalizeEmail(email);

    // Check exact match
    const vip = this.vips.get(normalizedEmail);
    if (vip) {
      return vip;
    }

    // Check domain-level VIP (e.g., *@company.com)
    const domain = normalizedEmail.split('@')[1];
    const domainVIP = this.vips.get(`*@${domain}`);
    if (domainVIP) {
      return domainVIP;
    }

    return null;
  }

  private normalizeEmail(email: string): string {
    // Handle null/undefined
    if (!email) {
      return '';
    }

    // Extract email from "Name <email@domain.com>" format
    const match = email.match(/<(.+?)>/);
    const cleanEmail = match ? match[1] : email;
    return cleanEmail.toLowerCase().trim();
  }

  async addVIP(vip: VIPContact): Promise<string> {
    const normalizedEmail = this.normalizeEmail(vip.email);

    // Check if already exists
    const existing = await DatabaseService.findOne('VIPs', {
      where: { email: normalizedEmail }
    });

    if (existing) {
      throw new Error(`VIP already exists: ${normalizedEmail}`);
    }

    // Add to database
    const id = await DatabaseService.insert('VIPs', {
      email: normalizedEmail,
      name: vip.name,
      tier: vip.tier,
      autoDraft: vip.autoDraft,
      customRules: vip.customRules ? JSON.stringify(vip.customRules) : null,
      slaHours: vip.slaHours,
      addedAt: new Date().toISOString(),
      totalEmails: 0
    });

    // Update cache
    this.vips.set(normalizedEmail, vip);
    await this.invalidateCache();

    LoggerService.info('VIPManager', `Added VIP: ${vip.name} (${normalizedEmail}), Tier ${vip.tier}`);

    return id;
  }

  async updateVIP(email: string, updates: Partial<VIPContact>): Promise<boolean> {
    const normalizedEmail = this.normalizeEmail(email);

    const data: any = {};
    if (updates.name !== undefined) data.name = updates.name;
    if (updates.tier !== undefined) data.tier = updates.tier;
    if (updates.autoDraft !== undefined) data.autoDraft = updates.autoDraft;
    if (updates.customRules !== undefined) {
      data.customRules = JSON.stringify(updates.customRules);
    }
    if (updates.slaHours !== undefined) data.slaHours = updates.slaHours;

    const success = await DatabaseService.update('VIPs', normalizedEmail, data);

    if (success) {
      await this.loadVIPs();
    }

    return success;
  }

  async removeVIP(email: string): Promise<boolean> {
    const normalizedEmail = this.normalizeEmail(email);

    const success = await DatabaseService.delete('VIPs', normalizedEmail);

    if (success) {
      this.vips.delete(normalizedEmail);
      await this.invalidateCache();
      LoggerService.info('VIPManager', `Removed VIP: ${normalizedEmail}`);
    }

    return success;
  }

  async recordInteraction(email: string): Promise<void> {
    const normalizedEmail = this.normalizeEmail(email);

    try {
      await DatabaseService.update('VIPs', normalizedEmail, {
        lastContact: new Date().toISOString(),
        totalEmails: DatabaseService.findOne('VIPs', {
          where: { email: normalizedEmail }
        }).then(vip => (vip?.totalEmails || 0) + 1)
      });
    } catch (error) {
      LoggerService.error('VIPManager', `Failed to record VIP interaction for ${email}`, error as Error);
    }
  }

  getSLADeadline(vip: VIPContact, receivedDate: Date): Date {
    const deadline = new Date(receivedDate);
    deadline.setHours(deadline.getHours() + vip.slaHours);

    // Adjust for weekends if configured
    if (!ConfigManager.getWithDefault('PROCESS_WEEKENDS', false)) {
      const day = deadline.getDay();
      if (day === 0) { // Sunday
        deadline.setDate(deadline.getDate() + 1);
      } else if (day === 6) { // Saturday
        deadline.setDate(deadline.getDate() + 2);
      }
    }

    return deadline;
  }

  async getVIPStatistics(): Promise<{
    totalVIPs: number;
    byTier: Record<number, number>;
    withAutoDraft: number;
    averageSLA: number;
  }> {
    const allVIPs = Array.from(this.vips.values());

    const stats = {
      totalVIPs: allVIPs.length,
      byTier: { 1: 0, 2: 0, 3: 0 },
      withAutoDraft: 0,
      averageSLA: 0
    };

    let totalSLA = 0;

    allVIPs.forEach(vip => {
      stats.byTier[vip.tier]++;
      if (vip.autoDraft) stats.withAutoDraft++;
      totalSLA += vip.slaHours;
    });

    stats.averageSLA = allVIPs.length > 0 ? totalSLA / allVIPs.length : 0;

    return stats;
  }

  async getAllVIPs(): Promise<VIPContact[]> {
    // Reload if needed
    if (Date.now() - this.lastReload > this.RELOAD_INTERVAL) {
      await this.loadVIPs();
      this.lastReload = Date.now();
    }

    return Array.from(this.vips.values());
  }

  private async invalidateCache(): Promise<void> {
    await CacheManager.invalidate('vip_contacts');
  }

  private loadDefaultVIPs(): void {
    // Load some default VIP patterns for common scenarios
    const defaults: VIPContact[] = [
      {
        email: Session.getActiveUser().getEmail(),
        name: 'Self',
        tier: 1,
        autoDraft: false,
        slaHours: 1
      }
    ];

    defaults.forEach(vip => {
      this.vips.set(vip.email.toLowerCase(), vip);
    });
  }

  async importVIPsFromContacts(tier: 1 | 2 | 3 = 2): Promise<number> {
    try {
      // This would integrate with Google Contacts API
      // For now, we'll import from frequently contacted addresses
      const threads = GmailApp.search('is:sent', 0, 50);
      const emailCounts = new Map<string, number>();

      threads.forEach(thread => {
        const messages = thread.getMessages();
        messages.forEach(message => {
          if (message.getFrom().includes(Session.getActiveUser().getEmail())) {
            const to = message.getTo();
            const email = this.normalizeEmail(to);
            emailCounts.set(email, (emailCounts.get(email) || 0) + 1);
          }
        });
      });

      // Import top contacts as VIPs
      const topContacts = Array.from(emailCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

      let imported = 0;
      for (const [email, count] of topContacts) {
        if (count >= 3 && !this.vips.has(email)) {
          await this.addVIP({
            email,
            name: email.split('@')[0],
            tier,
            autoDraft: tier === 1,
            slaHours: tier === 1 ? 4 : tier === 2 ? 24 : 48
          });
          imported++;
        }
      }

      LoggerService.info('VIPManager', `Imported ${imported} VIPs from frequent contacts`);
      return imported;
    } catch (error) {
      LoggerService.error('VIPManager', 'Failed to import VIPs', error as Error);
      return 0;
    }
  }

  suggestVIPs(): Array<{ email: string; reason: string; suggestedTier: 1 | 2 | 3 }> {
    // Analyze recent email patterns to suggest potential VIPs
    const suggestions: Array<{ email: string; reason: string; suggestedTier: 1 | 2 | 3 }> = [];

    try {
      // Check for C-level executives
      const executiveSearch = GmailApp.search('from:(ceo OR cto OR cfo OR president OR vp)', 0, 10);
      executiveSearch.forEach(thread => {
        const from = thread.getMessages()[0].getFrom();
        const email = this.normalizeEmail(from);
        if (!this.vips.has(email)) {
          suggestions.push({
            email,
            reason: 'Executive-level contact',
            suggestedTier: 1
          });
        }
      });

      // Check for frequent important senders
      const importantSearch = GmailApp.search('is:important -label:PA-Processed', 0, 20);
      const importantSenders = new Map<string, number>();

      importantSearch.forEach(thread => {
        const from = thread.getMessages()[0].getFrom();
        const email = this.normalizeEmail(from);
        importantSenders.set(email, (importantSenders.get(email) || 0) + 1);
      });

      importantSenders.forEach((count, email) => {
        if (count >= 3 && !this.vips.has(email)) {
          suggestions.push({
            email,
            reason: `Frequent important sender (${count} important emails)`,
            suggestedTier: 2
          });
        }
      });

    } catch (error) {
      LoggerService.error('VIPManager', 'Failed to generate VIP suggestions', error as Error);
    }

    return suggestions.slice(0, 5); // Return top 5 suggestions
  }
}

// Export singleton instance
export default VIPManager.getInstance();