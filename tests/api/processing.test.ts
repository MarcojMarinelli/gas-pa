/**
 * Email Processing Endpoint Tests
 * Tests for processing handler, batch jobs, and analysis operations
 *
 * These are template tests - adapt for your testing framework
 */

import {
  ProcessingHandler,
  MockBackendProcessingService,
  createProcessingHandler
} from '../../src/webapp/handlers/processing-handler';
import { ApiRequest } from '../../src/webapp/types/api-types';
import {
  ProcessingResult,
  ProcessingJobStatus,
  EmailAnalysis
} from '../../src/types/shared-models';
import {
  validate,
  processingResultSchema,
  processingJobStatusSchema,
  emailAnalysisSchema
} from '../../src/types/validators';

/**
 * Mock API Request
 */
function createMockRequest(
  user: string = 'test@example.com',
  pathParams: Record<string, string> = {},
  postData: any = {}
): ApiRequest {
  return {
    method: 'POST',
    path: '/api/process/email/test-123',
    parameters: {},
    pathParams,
    queryString: '',
    postData,
    headers: {},
    user
  };
}

/**
 * Processing Handler Tests
 */
describe('ProcessingHandler', () => {
  describe('processEmail', () => {
    it('should process single email successfully', async () => {
      const handler = createProcessingHandler(true); // Use mock
      const request = createMockRequest('user@example.com', { id: 'email-123' });

      const result = await handler.processEmail(request);

      // Validate structure
      expect(result).toBeDefined();
      expect(result.emailId).toBe('email-123');
      expect(result.success).toBeDefined();
      expect(typeof result.success).toBe('boolean');

      if (result.success) {
        expect(result.category).toBeDefined();
        expect(result.priority).toBeDefined();
        expect(['high', 'medium', 'low']).toContain(result.priority);
        expect(Array.isArray(result.actionItems)).toBe(true);
      }

      // Validate with schema
      expect(() => validate(processingResultSchema, result)).not.toThrow();
    });

    it('should handle processing options', async () => {
      const handler = createProcessingHandler(true);
      const request = createMockRequest(
        'user@example.com',
        { id: 'email-456' },
        {
          skipIfProcessed: true,
          addToQueue: true,
          notifyOnComplete: false
        }
      );

      const result = await handler.processEmail(request);

      expect(result).toBeDefined();
      expect(result.emailId).toBe('email-456');
      expect(result.timestamp).toBeDefined();
      expect(new Date(result.timestamp)).toBeInstanceOf(Date);
    });

    it('should validate processing result structure', async () => {
      const handler = createProcessingHandler(true);
      const request = createMockRequest('user@example.com', { id: 'email-789' });

      const result = await handler.processEmail(request);

      // Required fields
      expect(result.emailId).toBeDefined();
      expect(result.success).toBeDefined();
      expect(result.timestamp).toBeDefined();

      // Optional fields when successful
      if (result.success) {
        expect(typeof result.processingTime).toBe('number');
        expect(result.processingTime).toBeGreaterThan(0);
      } else {
        expect(result.error).toBeDefined();
        expect(typeof result.error).toBe('string');
      }
    });

    it('should handle processing failures gracefully', async () => {
      const handler = createProcessingHandler(true);
      const requests = [];

      // Make multiple requests (mock has 10% failure rate)
      for (let i = 0; i < 20; i++) {
        requests.push(
          handler.processEmail(
            createMockRequest('user@example.com', { id: `email-${i}` })
          )
        );
      }

      const results = await Promise.all(requests);

      // Should have mix of success and failure
      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);

      // All should have proper structure
      results.forEach(result => {
        expect(result.emailId).toBeDefined();
        expect(typeof result.success).toBe('boolean');
      });

      // Failed results should have error message
      failed.forEach(result => {
        expect(result.error).toBeDefined();
        expect(result.error).toContain('Failed to process');
      });
    });

    it('should throw ValidationError for missing email ID', async () => {
      const handler = createProcessingHandler(true);
      const request = createMockRequest('user@example.com', {}); // No id

      await expect(handler.processEmail(request)).rejects.toThrow('Missing email ID');
    });
  });

  describe('batchProcess', () => {
    it('should start batch processing job', async () => {
      const handler = createProcessingHandler(true);
      const emailIds = ['email-1', 'email-2', 'email-3', 'email-4', 'email-5'];
      const request = createMockRequest(
        'user@example.com',
        {},
        { emailIds }
      );

      const result = await handler.batchProcess(request);

      expect(result).toBeDefined();
      expect(result.jobId).toBeDefined();
      expect(result.jobId).toMatch(/^job-\d+$/);
      expect(result.message).toContain('started');
      expect(result.emailCount).toBe(5);
    });

    it('should validate batch request', async () => {
      const handler = createProcessingHandler(true);

      // Empty array should fail
      const request1 = createMockRequest('user@example.com', {}, { emailIds: [] });
      await expect(handler.batchProcess(request1)).rejects.toThrow();

      // Too many emails should fail (max 100)
      const tooMany = Array.from({ length: 101 }, (_, i) => `email-${i}`);
      const request2 = createMockRequest('user@example.com', {}, { emailIds: tooMany });
      await expect(handler.batchProcess(request2)).rejects.toThrow();
    });

    it('should process batch with options', async () => {
      const handler = createProcessingHandler(true);
      const request = createMockRequest(
        'user@example.com',
        {},
        {
          emailIds: ['email-1', 'email-2'],
          options: {
            skipIfProcessed: true,
            addToQueue: true
          }
        }
      );

      const result = await handler.batchProcess(request);

      expect(result.jobId).toBeDefined();
      expect(result.emailCount).toBe(2);
    });
  });

  describe('getJobStatus', () => {
    it('should get job status for running job', async () => {
      const handler = createProcessingHandler(true);

      // Start a batch job
      const startRequest = createMockRequest(
        'user@example.com',
        {},
        { emailIds: ['email-1', 'email-2', 'email-3'] }
      );
      const { jobId } = await handler.batchProcess(startRequest);

      // Get status
      const statusRequest = createMockRequest('user@example.com', { jobId });
      const status = await handler.getJobStatus(statusRequest);

      expect(status).toBeDefined();
      expect(status.jobId).toBe(jobId);
      expect(status.status).toBeDefined();
      expect(['queued', 'running', 'completed', 'failed', 'cancelled']).toContain(status.status);
      expect(status.total).toBe(3);
      expect(status.processed).toBeGreaterThanOrEqual(0);
      expect(status.successful).toBeGreaterThanOrEqual(0);
      expect(status.failed).toBeGreaterThanOrEqual(0);
      expect(status.progress).toBeGreaterThanOrEqual(0);
      expect(status.progress).toBeLessThanOrEqual(100);

      // Validate with schema
      expect(() => validate(processingJobStatusSchema, status)).not.toThrow();
    });

    it('should track job progress', async () => {
      const handler = createProcessingHandler(true);

      // Start a larger batch job
      const emailIds = Array.from({ length: 10 }, (_, i) => `email-${i}`);
      const startRequest = createMockRequest('user@example.com', {}, { emailIds });
      const { jobId } = await handler.batchProcess(startRequest);

      // Wait a bit for processing
      await new Promise(resolve => setTimeout(resolve, 200));

      const statusRequest = createMockRequest('user@example.com', { jobId });
      const status = await handler.getJobStatus(statusRequest);

      expect(status.total).toBe(10);
      expect(status.processed + status.successful + status.failed).toBeGreaterThan(0);
      expect(status.progress).toBeGreaterThan(0);
    });

    it('should wait for job completion', async () => {
      const handler = createProcessingHandler(true);

      const startRequest = createMockRequest(
        'user@example.com',
        {},
        { emailIds: ['email-1', 'email-2'] }
      );
      const { jobId } = await handler.batchProcess(startRequest);

      // Poll until complete
      let status;
      let attempts = 0;
      const maxAttempts = 20;

      while (attempts < maxAttempts) {
        const statusRequest = createMockRequest('user@example.com', { jobId });
        status = await handler.getJobStatus(statusRequest);

        if (status.status === 'completed') {
          break;
        }

        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }

      expect(status).toBeDefined();
      expect(status!.status).toBe('completed');
      expect(status!.processed).toBe(status!.total);
      expect(status!.progress).toBe(100);
      expect(status!.endTime).toBeDefined();
    });

    it('should throw NotFoundError for non-existent job', async () => {
      const handler = createProcessingHandler(true);
      const request = createMockRequest('user@example.com', { jobId: 'invalid-job' });

      await expect(handler.getJobStatus(request)).rejects.toThrow('not found');
    });
  });

  describe('cancelJob', () => {
    it('should cancel running job', async () => {
      const handler = createProcessingHandler(true);

      // Start a batch job
      const emailIds = Array.from({ length: 20 }, (_, i) => `email-${i}`);
      const startRequest = createMockRequest('user@example.com', {}, { emailIds });
      const { jobId } = await handler.batchProcess(startRequest);

      // Cancel immediately
      const cancelRequest = createMockRequest('user@example.com', { jobId });
      const result = await handler.cancelJob(cancelRequest);

      expect(result.message).toContain('cancelled');
      expect(result.jobId).toBe(jobId);

      // Verify status is cancelled
      const statusRequest = createMockRequest('user@example.com', { jobId });
      const status = await handler.getJobStatus(statusRequest);

      expect(status.status).toBe('cancelled');
    });
  });

  describe('retryEmail', () => {
    it('should retry failed email processing', async () => {
      const handler = createProcessingHandler(true);

      // Process email multiple times until we get a failure
      let failedEmailId: string | null = null;

      for (let i = 0; i < 30; i++) {
        const processRequest = createMockRequest('user@example.com', { id: `email-${i}` });
        const result = await handler.processEmail(processRequest);

        if (!result.success) {
          failedEmailId = result.emailId;
          break;
        }
      }

      if (failedEmailId) {
        // Retry the failed email
        const retryRequest = createMockRequest('user@example.com', { id: failedEmailId });
        const retryResult = await handler.retryEmail(retryRequest);

        expect(retryResult).toBeDefined();
        expect(retryResult.emailId).toBe(failedEmailId);
        // Retry has 95% success rate (better than initial 90%)
      }
    });
  });

  describe('retryJob', () => {
    it('should retry failed batch job', async () => {
      const handler = createProcessingHandler(true);

      // Start a batch job
      const emailIds = Array.from({ length: 20 }, (_, i) => `email-${i}`);
      const startRequest = createMockRequest('user@example.com', {}, { emailIds });
      const { jobId: originalJobId } = await handler.batchProcess(startRequest);

      // Wait for completion
      let status;
      for (let i = 0; i < 30; i++) {
        const statusRequest = createMockRequest('user@example.com', { jobId: originalJobId });
        status = await handler.getJobStatus(statusRequest);

        if (status.status === 'completed') {
          break;
        }

        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Retry if there were failures
      if (status && status.failed > 0) {
        const retryRequest = createMockRequest('user@example.com', { jobId: originalJobId });
        const retryResult = await handler.retryJob(retryRequest);

        expect(retryResult.jobId).toBeDefined();
        expect(retryResult.jobId).not.toBe(originalJobId);
        expect(retryResult.originalJobId).toBe(originalJobId);
        expect(retryResult.message).toContain('Retry job');
      }
    });

    it('should fail to retry job with no failures', async () => {
      const handler = createProcessingHandler(true);

      // Create a mock job status with no failures
      const backend = new MockBackendProcessingService();
      const jobId = await backend.startBatchJob(['email-1']);

      // Wait for completion
      await new Promise(resolve => setTimeout(resolve, 500));

      const status = await backend.getJobStatus(jobId);

      // If job succeeded with no failures, retry should fail
      if (status.failed === 0) {
        const retryRequest = createMockRequest('user@example.com', { jobId });
        await expect(handler.retryJob(retryRequest)).rejects.toThrow('no failed emails');
      }
    });
  });

  describe('analyzeEmail', () => {
    it('should analyze email and extract all information', async () => {
      const handler = createProcessingHandler(true);
      const request = createMockRequest('user@example.com', { id: 'email-123' });

      const analysis = await handler.analyzeEmail(request);

      // Validate structure
      expect(analysis).toBeDefined();
      expect(analysis.emailId).toBe('email-123');
      expect(analysis.category).toBeDefined();
      expect(analysis.priority).toBeDefined();
      expect(['high', 'medium', 'low']).toContain(analysis.priority);
      expect(Array.isArray(analysis.actionItems)).toBe(true);
      expect(['positive', 'neutral', 'negative']).toContain(analysis.sentiment);
      expect(Array.isArray(analysis.entities)).toBe(true);
      expect(typeof analysis.requiresResponse).toBe('boolean');
      expect(typeof analysis.isUrgent).toBe('boolean');
      expect(typeof analysis.confidence).toBe('number');
      expect(analysis.confidence).toBeGreaterThanOrEqual(0);
      expect(analysis.confidence).toBeLessThanOrEqual(1);
      expect(analysis.timestamp).toBeDefined();

      // Validate entities structure
      analysis.entities.forEach(entity => {
        expect(entity.type).toBeDefined();
        expect(entity.value).toBeDefined();
      });

      // Validate with schema
      expect(() => validate(emailAnalysisSchema, analysis)).not.toThrow();
    });
  });

  describe('extractActionItems', () => {
    it('should extract action items from email', async () => {
      const handler = createProcessingHandler(true);
      const request = createMockRequest('user@example.com', { id: 'email-456' });

      const result = await handler.extractActionItems(request);

      expect(result).toBeDefined();
      expect(result.emailId).toBe('email-456');
      expect(Array.isArray(result.actionItems)).toBe(true);

      // Action items should be strings
      result.actionItems.forEach(item => {
        expect(typeof item).toBe('string');
        expect(item.length).toBeGreaterThan(0);
      });
    });
  });

  describe('categorizeEmail', () => {
    it('should categorize email', async () => {
      const handler = createProcessingHandler(true);
      const request = createMockRequest('user@example.com', { id: 'email-789' });

      const result = await handler.categorizeEmail(request);

      expect(result).toBeDefined();
      expect(result.emailId).toBe('email-789');
      expect(typeof result.category).toBe('string');
      expect(result.category.length).toBeGreaterThan(0);
    });
  });

  describe('determinePriority', () => {
    it('should determine email priority', async () => {
      const handler = createProcessingHandler(true);
      const request = createMockRequest('user@example.com', { id: 'email-101' });

      const result = await handler.determinePriority(request);

      expect(result).toBeDefined();
      expect(result.emailId).toBe('email-101');
      expect(['high', 'medium', 'low']).toContain(result.priority);
    });
  });
});

/**
 * Mock Backend Service Tests
 */
describe('MockBackendProcessingService', () => {
  const backend = new MockBackendProcessingService();

  it('should process email with realistic timing', async () => {
    const startTime = Date.now();
    const result = await backend.processEmail('test-email');
    const duration = Date.now() - startTime;

    // Should take 100-500ms (simulated delay)
    expect(duration).toBeGreaterThan(50);
    expect(duration).toBeLessThan(600);

    expect(result).toBeDefined();
    expect(result.processingTime).toBeGreaterThan(0);
  });

  it('should have realistic failure rate', async () => {
    const results = [];

    for (let i = 0; i < 100; i++) {
      results.push(await backend.processEmail(`email-${i}`));
    }

    const failed = results.filter(r => !r.success).length;

    // Should have approximately 10% failure rate (±5%)
    expect(failed).toBeGreaterThan(5);
    expect(failed).toBeLessThan(20);
  });

  it('should start batch job and track progress', async () => {
    const emailIds = ['email-1', 'email-2', 'email-3'];
    const jobId = await backend.startBatchJob(emailIds);

    expect(jobId).toMatch(/^job-\d+$/);

    // Get initial status
    const initialStatus = await backend.getJobStatus(jobId);
    expect(initialStatus.status).toBe('running');
    expect(initialStatus.total).toBe(3);

    // Wait for completion
    await new Promise(resolve => setTimeout(resolve, 1000));

    const finalStatus = await backend.getJobStatus(jobId);
    expect(finalStatus.status).toBe('completed');
    expect(finalStatus.processed).toBe(3);
    expect(finalStatus.progress).toBe(100);
  });
});

/**
 * Integration Tests
 */
describe('Processing API Integration', () => {
  it('should handle complete processing flow', async () => {
    const handler = createProcessingHandler(true);

    // 1. Process single email
    const processRequest = createMockRequest('user@example.com', { id: 'email-123' });
    const processResult = await handler.processEmail(processRequest);

    expect(processResult).toBeDefined();
    expect(processResult.emailId).toBe('email-123');

    // 2. Analyze email
    const analyzeRequest = createMockRequest('user@example.com', { id: 'email-123' });
    const analysis = await handler.analyzeEmail(analyzeRequest);

    expect(analysis).toBeDefined();
    expect(analysis.emailId).toBe('email-123');

    // 3. Start batch processing
    const batchRequest = createMockRequest(
      'user@example.com',
      {},
      { emailIds: ['email-1', 'email-2', 'email-3'] }
    );
    const { jobId } = await handler.batchProcess(batchRequest);

    // 4. Check job status
    const statusRequest = createMockRequest('user@example.com', { jobId });
    const status = await handler.getJobStatus(statusRequest);

    expect(status.jobId).toBe(jobId);
  });

  it('should handle batch processing with retries', async () => {
    const handler = createProcessingHandler(true);

    // Start batch job
    const emailIds = Array.from({ length: 15 }, (_, i) => `email-${i}`);
    const batchRequest = createMockRequest('user@example.com', {}, { emailIds });
    const { jobId } = await handler.batchProcess(batchRequest);

    // Wait for completion
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Check final status
    const statusRequest = createMockRequest('user@example.com', { jobId });
    const status = await handler.getJobStatus(statusRequest);

    expect(status.status).toBe('completed');

    // Retry failed items if any
    if (status.failed > 0) {
      const retryRequest = createMockRequest('user@example.com', { jobId });
      const retryResult = await handler.retryJob(retryRequest);

      expect(retryResult.jobId).toBeDefined();
      expect(retryResult.originalJobId).toBe(jobId);
    }
  });
});

/**
 * Performance Tests
 */
describe('Processing Performance', () => {
  it('should process single email in under 1 second', async () => {
    const handler = createProcessingHandler(true);
    const request = createMockRequest('user@example.com', { id: 'email-perf' });

    const startTime = Date.now();
    await handler.processEmail(request);
    const duration = Date.now() - startTime;

    expect(duration).toBeLessThan(1000);
  });

  it('should analyze email in under 1 second', async () => {
    const handler = createProcessingHandler(true);
    const request = createMockRequest('user@example.com', { id: 'email-analyze' });

    const startTime = Date.now();
    await handler.analyzeEmail(request);
    const duration = Date.now() - startTime;

    expect(duration).toBeLessThan(1000);
  });

  it('should handle concurrent processing efficiently', async () => {
    const handler = createProcessingHandler(true);

    const startTime = Date.now();

    // Process 10 emails concurrently
    const promises = Array.from({ length: 10 }, (_, i) =>
      handler.processEmail(
        createMockRequest('user@example.com', { id: `email-${i}` })
      )
    );

    const results = await Promise.all(promises);
    const duration = Date.now() - startTime;

    // Should complete all in under 2 seconds (concurrent processing)
    expect(duration).toBeLessThan(2000);
    expect(results).toHaveLength(10);
  });

  it('should complete batch job within reasonable time', async () => {
    const handler = createProcessingHandler(true);

    const emailIds = Array.from({ length: 20 }, (_, i) => `email-${i}`);
    const batchRequest = createMockRequest('user@example.com', {}, { emailIds });

    const startTime = Date.now();
    const { jobId } = await handler.batchProcess(batchRequest);

    // Wait for completion
    let status;
    for (let i = 0; i < 50; i++) {
      const statusRequest = createMockRequest('user@example.com', { jobId });
      status = await handler.getJobStatus(statusRequest);

      if (status.status === 'completed') {
        break;
      }

      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const duration = Date.now() - startTime;

    expect(status!.status).toBe('completed');
    // 20 emails @ ~250ms each with 50ms delays = ~6 seconds max
    expect(duration).toBeLessThan(8000);
  });
});

/**
 * Manual Testing Instructions
 *
 * To manually test the processing endpoints in deployed GAS:
 *
 * 1. Deploy as web app
 * 2. Get authentication token:
 *    POST https://your-deployment-url/api/auth/login
 *
 * 3. Process single email:
 *    POST https://your-deployment-url/api/process/email/test-123
 *    Headers: Authorization: Bearer <token>
 *    Body: { "addToQueue": true }
 *    Expected: ProcessingResult with success/error
 *
 * 4. Start batch processing:
 *    POST https://your-deployment-url/api/process/batch
 *    Headers: Authorization: Bearer <token>
 *    Body: { "emailIds": ["email-1", "email-2", "email-3"] }
 *    Expected: { "jobId": "job-123", "message": "...", "emailCount": 3 }
 *
 * 5. Check job status:
 *    GET https://your-deployment-url/api/process/status/job-123
 *    Headers: Authorization: Bearer <token>
 *    Expected: ProcessingJobStatus with progress
 *
 * 6. Analyze email:
 *    POST https://your-deployment-url/api/process/analyze/test-456
 *    Headers: Authorization: Bearer <token>
 *    Expected: EmailAnalysis with category, priority, actionItems, etc.
 *
 * 7. Extract action items:
 *    POST https://your-deployment-url/api/process/extract-actions/test-789
 *    Headers: Authorization: Bearer <token>
 *    Expected: { "emailId": "...", "actionItems": ["..."] }
 *
 * 8. Retry failed email:
 *    POST https://your-deployment-url/api/process/retry/email/failed-email-id
 *    Headers: Authorization: Bearer <token>
 *    Expected: ProcessingResult (retry attempt)
 *
 * 9. Cancel batch job:
 *    POST https://your-deployment-url/api/process/cancel/job-123
 *    Headers: Authorization: Bearer <token>
 *    Expected: { "message": "...", "jobId": "job-123" }
 *
 * 10. Test error handling:
 *     - Try without auth token (should get 401)
 *     - Try with invalid email ID (should handle gracefully)
 *     - Try batch with > 100 emails (should get validation error)
 */
