import Logger from '../core/logger';

interface ScheduledJob {
  id: string;
  name: string;
  type: 'recurring' | 'oneTime';
  frequency?: 'hourly' | 'daily' | 'weekly' | 'monthly';
  nextRun?: Date;
  lastRun?: Date;
  enabled: boolean;
  action: string;
  config?: Record<string, any>;
  status: 'active' | 'paused' | 'failed';
  errorCount: number;
  lastError?: string;
}

/**
 * Manages scheduled jobs and automation triggers
 */
export class Scheduler {
  private jobs: ScheduledJob[] = [];

  constructor() {
    this.loadJobs();
    this.initializeDefaultJobs();
  }

  /**
   * Initialize default scheduled jobs
   */
  private initializeDefaultJobs(): void {
    const defaultJobs: ScheduledJob[] = [
      {
        id: 'email-processing',
        name: 'Process Unread Emails',
        type: 'recurring',
        frequency: 'hourly',
        enabled: true,
        action: 'processEmails',
        status: 'active',
        errorCount: 0
      },
      {
        id: 'daily-summary',
        name: 'Generate Daily Summary',
        type: 'recurring',
        frequency: 'daily',
        enabled: true,
        action: 'generateSummary',
        status: 'active',
        errorCount: 0
      },
      {
        id: 'cleanup',
        name: 'Clean Old Data',
        type: 'recurring',
        frequency: 'weekly',
        enabled: true,
        action: 'cleanupOldData',
        status: 'active',
        errorCount: 0
      }
    ];

    // Add default jobs if they don't exist
    for (const defaultJob of defaultJobs) {
      if (!this.jobs.find(j => j.id === defaultJob.id)) {
        this.jobs.push(defaultJob);
      }
    }

    this.saveJobs();
  }

  /**
   * Schedule a new job
   */
  scheduleJob(job: Omit<ScheduledJob, 'id' | 'status' | 'errorCount'>): ScheduledJob {
    Logger.info('Scheduler', `Scheduling new job: ${job.name}`);

    const newJob: ScheduledJob = {
      ...job,
      id: Utilities.getUuid(),
      status: 'active',
      errorCount: 0,
      nextRun: this.calculateNextRun(job.frequency)
    };

    this.jobs.push(newJob);
    this.saveJobs();

    // Create Google Apps Script trigger if needed
    if (job.type === 'recurring' && job.enabled) {
      this.createTrigger(newJob);
    }

    return newJob;
  }

  /**
   * Run a scheduled job
   */
  async runJob(jobId: string): Promise<boolean> {
    const job = this.jobs.find(j => j.id === jobId);
    if (!job || !job.enabled) {
      Logger.warn('Scheduler', `Job ${jobId} not found or disabled`);
      return false;
    }

    Logger.info('Scheduler', `Running job: ${job.name}`);

    try {
      job.lastRun = new Date();

      // Execute job action
      switch (job.action) {
        case 'processEmails':
          await this.processEmailsAction(job.config);
          break;
        case 'generateSummary':
          await this.generateSummaryAction(job.config);
          break;
        case 'cleanupOldData':
          await this.cleanupAction(job.config);
          break;
        default:
          throw new Error(`Unknown action: ${job.action}`);
      }

      // Reset error count on success
      job.errorCount = 0;
      job.status = 'active';
      job.nextRun = this.calculateNextRun(job.frequency);

      Logger.info('Scheduler', `Job ${job.name} completed successfully`);
      this.saveJobs();
      return true;

    } catch (error) {
      Logger.error('Scheduler', `Job ${job.name} failed`, error);

      job.errorCount++;
      job.lastError = error instanceof Error ? error.message : String(error);

      // Disable job after 5 consecutive failures
      if (job.errorCount >= 5) {
        job.status = 'failed';
        job.enabled = false;
        Logger.error('Scheduler', `Job ${job.name} disabled after 5 failures`);
      }

      this.saveJobs();
      return false;
    }
  }

  /**
   * Run a job manually
   */
  runJobManually(jobId: string): boolean {
    const job = this.jobs.find(j => j.id === jobId);
    if (!job) {
      return false;
    }

    // Enable job temporarily if disabled
    const wasEnabled = job.enabled;
    job.enabled = true;

    const result = this.runJob(jobId);

    // Restore original enabled state
    job.enabled = wasEnabled;

    return true;
  }

  /**
   * Get scheduler status
   */
  getStatus(): any {
    const now = new Date();
    const activeJobs = this.jobs.filter(j => j.enabled);
    const failedJobs = this.jobs.filter(j => j.status === 'failed');

    // Find next scheduled job
    const nextJob = activeJobs
      .filter(j => j.nextRun)
      .sort((a, b) => (a.nextRun?.getTime() || 0) - (b.nextRun?.getTime() || 0))[0];

    return {
      totalJobs: this.jobs.length,
      activeJobs: activeJobs.length,
      failedJobs: failedJobs.length,
      nextRun: nextJob?.nextRun,
      nextJobName: nextJob?.name,
      jobs: this.jobs.map(j => ({
        id: j.id,
        name: j.name,
        type: j.type,
        frequency: j.frequency,
        status: j.status,
        enabled: j.enabled,
        lastRun: j.lastRun,
        nextRun: j.nextRun,
        errorCount: j.errorCount
      }))
    };
  }

  /**
   * Enable/disable a job
   */
  toggleJob(jobId: string, enabled: boolean): boolean {
    const job = this.jobs.find(j => j.id === jobId);
    if (!job) {
      return false;
    }

    job.enabled = enabled;

    if (enabled) {
      job.nextRun = this.calculateNextRun(job.frequency);
      if (job.type === 'recurring') {
        this.createTrigger(job);
      }
    } else {
      this.deleteTrigger(job.id);
    }

    this.saveJobs();
    return true;
  }

  /**
   * Calculate next run time based on frequency
   */
  private calculateNextRun(frequency?: ScheduledJob['frequency']): Date {
    const now = new Date();
    const next = new Date(now);

    switch (frequency) {
      case 'hourly':
        next.setHours(next.getHours() + 1, 0, 0, 0);
        break;
      case 'daily':
        next.setDate(next.getDate() + 1);
        next.setHours(9, 0, 0, 0); // Default to 9 AM
        break;
      case 'weekly':
        next.setDate(next.getDate() + 7);
        next.setHours(9, 0, 0, 0);
        break;
      case 'monthly':
        next.setMonth(next.getMonth() + 1);
        next.setDate(1);
        next.setHours(9, 0, 0, 0);
        break;
      default:
        next.setHours(next.getHours() + 1); // Default to hourly
    }

    return next;
  }

  /**
   * Create Google Apps Script trigger
   */
  private createTrigger(job: ScheduledJob): void {
    try {
      // Delete existing trigger for this job
      this.deleteTrigger(job.id);

      let trigger;
      switch (job.frequency) {
        case 'hourly':
          trigger = ScriptApp.newTrigger(`runScheduledJob_${job.id}`)
            .timeBased()
            .everyHours(1)
            .create();
          break;
        case 'daily':
          trigger = ScriptApp.newTrigger(`runScheduledJob_${job.id}`)
            .timeBased()
            .everyDays(1)
            .atHour(9)
            .create();
          break;
        case 'weekly':
          trigger = ScriptApp.newTrigger(`runScheduledJob_${job.id}`)
            .timeBased()
            .everyWeeks(1)
            .onWeekDay(ScriptApp.WeekDay.MONDAY)
            .atHour(9)
            .create();
          break;
        case 'monthly':
          trigger = ScriptApp.newTrigger(`runScheduledJob_${job.id}`)
            .timeBased()
            .onMonthDay(1)
            .atHour(9)
            .create();
          break;
      }

      Logger.info('Scheduler', `Created trigger for job: ${job.name}`);
    } catch (error) {
      Logger.error('Scheduler', `Failed to create trigger for job: ${job.name}`, error);
    }
  }

  /**
   * Delete trigger for a job
   */
  private deleteTrigger(jobId: string): void {
    try {
      const triggers = ScriptApp.getProjectTriggers();
      for (const trigger of triggers) {
        if (trigger.getHandlerFunction().includes(jobId)) {
          ScriptApp.deleteTrigger(trigger);
          Logger.info('Scheduler', `Deleted trigger for job: ${jobId}`);
        }
      }
    } catch (error) {
      Logger.error('Scheduler', `Failed to delete trigger for job: ${jobId}`, error);
    }
  }

  /**
   * Process emails action
   */
  private async processEmailsAction(config?: Record<string, any>): Promise<void> {
    // This would normally call the EmailProcessor
    // For now, just log the action
    Logger.info('Scheduler', 'Processing emails via scheduled job');

    // Update last run time in properties
    PropertiesService.getScriptProperties()
      .setProperty('LAST_EMAIL_PROCESSING', new Date().toISOString());
  }

  /**
   * Generate summary action
   */
  private async generateSummaryAction(config?: Record<string, any>): Promise<void> {
    Logger.info('Scheduler', 'Generating daily summary via scheduled job');

    // This would normally generate and send a summary email
    // For now, just log the action
    PropertiesService.getScriptProperties()
      .setProperty('LAST_SUMMARY_GENERATED', new Date().toISOString());
  }

  /**
   * Cleanup action
   */
  private async cleanupAction(config?: Record<string, any>): Promise<void> {
    Logger.info('Scheduler', 'Cleaning up old data via scheduled job');

    // This would normally clean up old data
    // For now, just log the action
    PropertiesService.getScriptProperties()
      .setProperty('LAST_CLEANUP', new Date().toISOString());
  }

  /**
   * Load jobs from storage
   */
  private loadJobs(): void {
    try {
      const stored = PropertiesService.getScriptProperties()
        .getProperty('SCHEDULED_JOBS');

      if (stored) {
        this.jobs = JSON.parse(stored).map((j: any) => ({
          ...j,
          nextRun: j.nextRun ? new Date(j.nextRun) : undefined,
          lastRun: j.lastRun ? new Date(j.lastRun) : undefined
        }));
      }
    } catch (error) {
      Logger.error('Scheduler', 'Failed to load jobs', error);
      this.jobs = [];
    }
  }

  /**
   * Save jobs to storage
   */
  private saveJobs(): void {
    try {
      PropertiesService.getScriptProperties()
        .setProperty('SCHEDULED_JOBS', JSON.stringify(this.jobs));
    } catch (error) {
      Logger.error('Scheduler', 'Failed to save jobs', error);
    }
  }
}