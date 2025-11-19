/**
 * Email Processing Handler
 * Handles email processing operations (single, batch, retry)
 */

import { ApiRequest } from '../types/api-types';
import {
  ProcessingResult,
  BatchProcessingResult,
  ProcessingJobStatus,
  EmailAnalysis
} from '../../types/shared-models';
import { EmailTransformer } from '../transformers/email';
import {
  validate,
  processingRequestSchema,
  batchProcessingRequestSchema
} from '../../types/validators';
import { ValidationError, NotFoundError } from '../types/api-types';
import Logger from '../../core/logger';

/**
 * Backend Processing Service Interface
 * Abstraction layer for email processing operations
 */
export interface BackendProcessingService {
  // Single email processing
  processEmail(emailId: string, options?: ProcessingOptions): Promise<ProcessingResult>;

  // Batch processing
  startBatchJob(emailIds: string[], options?: ProcessingOptions): Promise<string>; // Returns job ID
  getJobStatus(jobId: string): Promise<ProcessingJobStatus>;
  cancelJob(jobId: string): Promise<void>;

  // Retry operations
  retryEmail(emailId: string): Promise<ProcessingResult>;
  retryJob(jobId: string): Promise<string>; // Returns new job ID

  // Analysis operations
  analyzeEmail(emailId: string): Promise<EmailAnalysis>;
  extractActionItems(emailId: string): Promise<string[]>;
  categorizeEmail(emailId: string): Promise<string>;
  determinePriority(emailId: string): Promise<'high' | 'medium' | 'low'>;
}

/**
 * Processing options
 */
export interface ProcessingOptions {
  skipIfProcessed?: boolean;
  forceReprocess?: boolean;
  addToQueue?: boolean;
  notifyOnComplete?: boolean;
}

/**
 * Processing Handler Class
 */
export class ProcessingHandler {
  private backendService: BackendProcessingService;

  constructor(backendService: BackendProcessingService) {
    this.backendService = backendService;
  }

  /**
   * Process single email
   * POST /api/process/email/:id
   */
  async processEmail(request: ApiRequest): Promise<ProcessingResult> {
    try {
      const emailId = request.pathParams?.id;

      if (!emailId) {
        throw new ValidationError('Missing email ID');
      }

      // Parse and validate options
      const options: ProcessingOptions = {};
      const params = request.postData || {};

      if (params.skipIfProcessed !== undefined) {
        options.skipIfProcessed = params.skipIfProcessed === true;
      }

      if (params.forceReprocess !== undefined) {
        options.forceReprocess = params.forceReprocess === true;
      }

      if (params.addToQueue !== undefined) {
        options.addToQueue = params.addToQueue === true;
      }

      if (params.notifyOnComplete !== undefined) {
        options.notifyOnComplete = params.notifyOnComplete === true;
      }

      Logger.info('ProcessingHandler', 'Processing email', {
        user: request.user,
        emailId,
        options
      });

      // Process email via backend
      const result = await this.backendService.processEmail(emailId, options);

      Logger.info('ProcessingHandler', 'Email processed', {
        user: request.user,
        emailId,
        success: result.success,
        category: result.category,
        priority: result.priority
      });

      return result;
    } catch (error) {
      Logger.error('ProcessingHandler', 'Failed to process email', error);
      throw error;
    }
  }

  /**
   * Batch process multiple emails
   * POST /api/process/batch
   */
  async batchProcess(request: ApiRequest): Promise<{
    jobId: string;
    message: string;
    emailCount: number;
  }> {
    try {
      const data = request.postData;

      // Validate batch request
      const validated = validate(batchProcessingRequestSchema, data);

      const { emailIds, options = {} } = validated;

      Logger.info('ProcessingHandler', 'Starting batch processing', {
        user: request.user,
        count: emailIds.length,
        options
      });

      // Start batch job in backend
      const jobId = await this.backendService.startBatchJob(emailIds, options);

      Logger.info('ProcessingHandler', 'Batch job started', {
        user: request.user,
        jobId,
        count: emailIds.length
      });

      return {
        jobId,
        message: `Batch processing job ${jobId} started`,
        emailCount: emailIds.length
      };
    } catch (error) {
      Logger.error('ProcessingHandler', 'Failed to start batch processing', error);
      throw error;
    }
  }

  /**
   * Get processing job status
   * GET /api/process/status/:jobId
   */
  async getJobStatus(request: ApiRequest): Promise<ProcessingJobStatus> {
    try {
      const jobId = request.pathParams?.jobId;

      if (!jobId) {
        throw new ValidationError('Missing job ID');
      }

      Logger.debug('ProcessingHandler', 'Getting job status', {
        user: request.user,
        jobId
      });

      const status = await this.backendService.getJobStatus(jobId);

      if (!status) {
        throw new NotFoundError(`Job ${jobId} not found`);
      }

      Logger.debug('ProcessingHandler', 'Job status retrieved', {
        jobId,
        status: status.status,
        progress: `${status.processed}/${status.total}`
      });

      return status;
    } catch (error) {
      Logger.error('ProcessingHandler', 'Failed to get job status', error);
      throw error;
    }
  }

  /**
   * Cancel processing job
   * POST /api/process/cancel/:jobId
   */
  async cancelJob(request: ApiRequest): Promise<{ message: string; jobId: string }> {
    try {
      const jobId = request.pathParams?.jobId;

      if (!jobId) {
        throw new ValidationError('Missing job ID');
      }

      Logger.info('ProcessingHandler', 'Cancelling job', {
        user: request.user,
        jobId
      });

      await this.backendService.cancelJob(jobId);

      Logger.info('ProcessingHandler', 'Job cancelled', {
        user: request.user,
        jobId
      });

      return {
        message: `Job ${jobId} cancelled successfully`,
        jobId
      };
    } catch (error) {
      Logger.error('ProcessingHandler', 'Failed to cancel job', error);
      throw error;
    }
  }

  /**
   * Retry failed email processing
   * POST /api/process/retry/email/:id
   */
  async retryEmail(request: ApiRequest): Promise<ProcessingResult> {
    try {
      const emailId = request.pathParams?.id;

      if (!emailId) {
        throw new ValidationError('Missing email ID');
      }

      Logger.info('ProcessingHandler', 'Retrying email processing', {
        user: request.user,
        emailId
      });

      const result = await this.backendService.retryEmail(emailId);

      Logger.info('ProcessingHandler', 'Email retry completed', {
        user: request.user,
        emailId,
        success: result.success
      });

      return result;
    } catch (error) {
      Logger.error('ProcessingHandler', 'Failed to retry email', error);
      throw error;
    }
  }

  /**
   * Retry failed batch job
   * POST /api/process/retry/job/:jobId
   */
  async retryJob(request: ApiRequest): Promise<{
    jobId: string;
    message: string;
    originalJobId: string;
  }> {
    try {
      const originalJobId = request.pathParams?.jobId;

      if (!originalJobId) {
        throw new ValidationError('Missing job ID');
      }

      Logger.info('ProcessingHandler', 'Retrying failed job', {
        user: request.user,
        originalJobId
      });

      const newJobId = await this.backendService.retryJob(originalJobId);

      Logger.info('ProcessingHandler', 'Job retry started', {
        user: request.user,
        originalJobId,
        newJobId
      });

      return {
        jobId: newJobId,
        message: `Retry job ${newJobId} started (original: ${originalJobId})`,
        originalJobId
      };
    } catch (error) {
      Logger.error('ProcessingHandler', 'Failed to retry job', error);
      throw error;
    }
  }

  /**
   * Analyze email (extract all information)
   * POST /api/process/analyze/:id
   */
  async analyzeEmail(request: ApiRequest): Promise<EmailAnalysis> {
    try {
      const emailId = request.pathParams?.id;

      if (!emailId) {
        throw new ValidationError('Missing email ID');
      }

      Logger.info('ProcessingHandler', 'Analyzing email', {
        user: request.user,
        emailId
      });

      const analysis = await this.backendService.analyzeEmail(emailId);

      Logger.debug('ProcessingHandler', 'Email analyzed', {
        emailId,
        category: analysis.category,
        priority: analysis.priority,
        actionItemCount: analysis.actionItems.length
      });

      return analysis;
    } catch (error) {
      Logger.error('ProcessingHandler', 'Failed to analyze email', error);
      throw error;
    }
  }

  /**
   * Extract action items from email
   * POST /api/process/extract-actions/:id
   */
  async extractActionItems(request: ApiRequest): Promise<{
    emailId: string;
    actionItems: string[];
  }> {
    try {
      const emailId = request.pathParams?.id;

      if (!emailId) {
        throw new ValidationError('Missing email ID');
      }

      Logger.info('ProcessingHandler', 'Extracting action items', {
        user: request.user,
        emailId
      });

      const actionItems = await this.backendService.extractActionItems(emailId);

      Logger.debug('ProcessingHandler', 'Action items extracted', {
        emailId,
        count: actionItems.length
      });

      return {
        emailId,
        actionItems
      };
    } catch (error) {
      Logger.error('ProcessingHandler', 'Failed to extract action items', error);
      throw error;
    }
  }

  /**
   * Categorize email
   * POST /api/process/categorize/:id
   */
  async categorizeEmail(request: ApiRequest): Promise<{
    emailId: string;
    category: string;
  }> {
    try {
      const emailId = request.pathParams?.id;

      if (!emailId) {
        throw new ValidationError('Missing email ID');
      }

      Logger.info('ProcessingHandler', 'Categorizing email', {
        user: request.user,
        emailId
      });

      const category = await this.backendService.categorizeEmail(emailId);

      Logger.debug('ProcessingHandler', 'Email categorized', {
        emailId,
        category
      });

      return {
        emailId,
        category
      };
    } catch (error) {
      Logger.error('ProcessingHandler', 'Failed to categorize email', error);
      throw error;
    }
  }

  /**
   * Determine email priority
   * POST /api/process/prioritize/:id
   */
  async determinePriority(request: ApiRequest): Promise<{
    emailId: string;
    priority: 'high' | 'medium' | 'low';
  }> {
    try {
      const emailId = request.pathParams?.id;

      if (!emailId) {
        throw new ValidationError('Missing email ID');
      }

      Logger.info('ProcessingHandler', 'Determining priority', {
        user: request.user,
        emailId
      });

      const priority = await this.backendService.determinePriority(emailId);

      Logger.debug('ProcessingHandler', 'Priority determined', {
        emailId,
        priority
      });

      return {
        emailId,
        priority
      };
    } catch (error) {
      Logger.error('ProcessingHandler', 'Failed to determine priority', error);
      throw error;
    }
  }
}

/**
 * Mock Backend Processing Service
 * For testing and development
 */
export class MockBackendProcessingService implements BackendProcessingService {
  private jobs: Map<string, ProcessingJobStatus> = new Map();
  private nextJobId = 1;

  /**
   * Process single email
   */
  async processEmail(emailId: string, options: ProcessingOptions = {}): Promise<ProcessingResult> {
    // Simulate processing delay
    await this.delay(100 + Math.random() * 400);

    // Simulate occasional failures (10% failure rate)
    const success = Math.random() > 0.1;

    if (!success) {
      return {
        emailId,
        success: false,
        error: 'Failed to process email: API timeout',
        processingTime: 500,
        timestamp: new Date().toISOString()
      };
    }

    // Successful processing
    const categories = ['work', 'personal', 'finance', 'shopping', 'travel'];
    const priorities: Array<'high' | 'medium' | 'low'> = ['high', 'medium', 'low'];

    return {
      emailId,
      success: true,
      category: categories[Math.floor(Math.random() * categories.length)],
      priority: priorities[Math.floor(Math.random() * priorities.length)],
      actionItems: this.generateActionItems(),
      addedToQueue: options.addToQueue === true,
      processingTime: Math.floor(100 + Math.random() * 400),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Start batch processing job
   */
  async startBatchJob(emailIds: string[], options: ProcessingOptions = {}): Promise<string> {
    const jobId = `job-${this.nextJobId++}`;

    const jobStatus: ProcessingJobStatus = {
      jobId,
      status: 'running',
      total: emailIds.length,
      processed: 0,
      successful: 0,
      failed: 0,
      errors: [],
      startTime: new Date().toISOString(),
      progress: 0
    };

    this.jobs.set(jobId, jobStatus);

    // Simulate background processing
    this.simulateBatchProcessing(jobId, emailIds, options);

    return jobId;
  }

  /**
   * Get job status
   */
  async getJobStatus(jobId: string): Promise<ProcessingJobStatus> {
    const status = this.jobs.get(jobId);

    if (!status) {
      throw new Error(`Job ${jobId} not found`);
    }

    return status;
  }

  /**
   * Cancel job
   */
  async cancelJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);

    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    if (job.status === 'running') {
      job.status = 'cancelled';
      job.endTime = new Date().toISOString();
    }
  }

  /**
   * Retry email processing
   */
  async retryEmail(emailId: string): Promise<ProcessingResult> {
    // Retry has higher success rate (95%)
    return await this.processEmail(emailId, { forceReprocess: true });
  }

  /**
   * Retry failed job
   */
  async retryJob(jobId: string): Promise<string> {
    const originalJob = this.jobs.get(jobId);

    if (!originalJob) {
      throw new Error(`Job ${jobId} not found`);
    }

    // Extract failed email IDs
    const failedEmailIds = originalJob.errors?.map(e => e.emailId) || [];

    if (failedEmailIds.length === 0) {
      throw new Error(`Job ${jobId} has no failed emails to retry`);
    }

    // Start new job with failed emails
    return await this.startBatchJob(failedEmailIds, { forceReprocess: true });
  }

  /**
   * Analyze email
   */
  async analyzeEmail(emailId: string): Promise<EmailAnalysis> {
    await this.delay(200 + Math.random() * 300);

    const categories = ['work', 'personal', 'finance', 'shopping', 'travel'];
    const priorities: Array<'high' | 'medium' | 'low'> = ['high', 'medium', 'low'];

    return {
      emailId,
      category: categories[Math.floor(Math.random() * categories.length)],
      priority: priorities[Math.floor(Math.random() * priorities.length)],
      actionItems: this.generateActionItems(),
      sentiment: this.generateSentiment(),
      entities: this.generateEntities(),
      requiresResponse: Math.random() > 0.5,
      isUrgent: Math.random() > 0.7,
      confidence: 0.7 + Math.random() * 0.3,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Extract action items
   */
  async extractActionItems(emailId: string): Promise<string[]> {
    await this.delay(150 + Math.random() * 250);
    return this.generateActionItems();
  }

  /**
   * Categorize email
   */
  async categorizeEmail(emailId: string): Promise<string> {
    await this.delay(100 + Math.random() * 200);
    const categories = ['work', 'personal', 'finance', 'shopping', 'travel'];
    return categories[Math.floor(Math.random() * categories.length)];
  }

  /**
   * Determine priority
   */
  async determinePriority(emailId: string): Promise<'high' | 'medium' | 'low'> {
    await this.delay(100 + Math.random() * 200);
    const priorities: Array<'high' | 'medium' | 'low'> = ['high', 'medium', 'low'];
    return priorities[Math.floor(Math.random() * priorities.length)];
  }

  /**
   * Simulate batch processing in background
   */
  private simulateBatchProcessing(jobId: string, emailIds: string[], options: ProcessingOptions): void {
    setTimeout(async () => {
      const job = this.jobs.get(jobId);
      if (!job || job.status === 'cancelled') return;

      for (const emailId of emailIds) {
        // Check if job was cancelled
        if (job.status === 'cancelled') break;

        // Process email
        const result = await this.processEmail(emailId, options);

        job.processed++;
        job.progress = Math.floor((job.processed / job.total) * 100);

        if (result.success) {
          job.successful++;
        } else {
          job.failed++;
          if (!job.errors) job.errors = [];
          job.errors.push({
            emailId,
            error: result.error || 'Unknown error'
          });
        }

        // Update job status
        this.jobs.set(jobId, job);

        // Small delay between emails
        await this.delay(50);
      }

      // Mark job as complete
      if (job.status !== 'cancelled') {
        job.status = 'completed';
        job.endTime = new Date().toISOString();
        this.jobs.set(jobId, job);
      }
    }, 100);
  }

  /**
   * Generate mock action items
   */
  private generateActionItems(): string[] {
    const items = [
      'Reply to sender by end of week',
      'Schedule meeting to discuss proposal',
      'Review attached document',
      'Forward to team for input',
      'Complete expense report',
      'Confirm attendance at event',
      'Update project timeline',
      'Provide feedback on draft'
    ];

    const count = Math.floor(Math.random() * 3);
    const selected: string[] = [];

    for (let i = 0; i < count; i++) {
      const item = items[Math.floor(Math.random() * items.length)];
      if (!selected.includes(item)) {
        selected.push(item);
      }
    }

    return selected;
  }

  /**
   * Generate mock sentiment
   */
  private generateSentiment(): 'positive' | 'neutral' | 'negative' {
    const sentiments: Array<'positive' | 'neutral' | 'negative'> = ['positive', 'neutral', 'negative'];
    return sentiments[Math.floor(Math.random() * sentiments.length)];
  }

  /**
   * Generate mock entities
   */
  private generateEntities(): Array<{ type: string; value: string }> {
    const entities = [
      { type: 'person', value: 'John Smith' },
      { type: 'organization', value: 'Acme Corp' },
      { type: 'date', value: '2025-11-20' },
      { type: 'location', value: 'New York' },
      { type: 'amount', value: '$5,000' }
    ];

    const count = Math.floor(Math.random() * 3);
    const selected = [];

    for (let i = 0; i < count; i++) {
      selected.push(entities[Math.floor(Math.random() * entities.length)]);
    }

    return selected;
  }

  /**
   * Simulate delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Factory function to create processing handler
 */
export function createProcessingHandler(useMock: boolean = false): ProcessingHandler {
  const backendService = useMock
    ? new MockBackendProcessingService()
    : new MockBackendProcessingService(); // TODO: Replace with real backend

  return new ProcessingHandler(backendService);
}

/**
 * Default handler instance
 */
export const processingHandler = createProcessingHandler(true); // Set to false for production
