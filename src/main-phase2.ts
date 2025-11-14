/**
 * Main entry point for GAS-PA Phase 2
 * Includes both Phase 1 and Phase 2 functionality
 */

// Import existing Phase 1 functionality
import './main';

// Import Phase 2 Core Services
import ConfigManager from './core/config-manager';
import DatabaseService from './core/database-service';
import LoggerService from './core/logger-service';
import ErrorHandler from './core/error-handler';
import CacheManager from './core/cache-manager';

// Import OpenAI Service
import OpenAIClient from './services/openai/client';

// Import Classification Engine
import ClassificationEngine from './features/classifier/engine';
import RulesEngine from './features/classifier/rules-engine';
import VIPManager from './features/vip/manager';
import LearningSystem from './features/classifier/learning-system';

// Import Classification Tests
import {
  testClassificationEngine,
  testVIPManagement,
  testRulesEngine,
  testLearningSystem,
  testClassificationFeedback,
  runAllClassificationTests
} from './tests/test-classification';

// Import Follow-up Queue System
import FollowUpQueue from './features/queue/queue-manager';
import SnoozeEngine from './features/queue/snooze-engine';
import SLATracker from './features/queue/sla-tracker';

// Import Queue Tests
import {
  testQueueManagement,
  testSnoozeOperations,
  testSLATracking,
  testClassificationIntegration,
  testQueueStatistics,
  runAllQueueTests
} from './tests/test-queue';

/**
 * Phase 2 Setup - Initialize new components
 */
function setupPhase2(): void {
  const timer = LoggerService.startTimer('Phase2Setup');

  try {
    console.log('=== Starting Phase 2 Setup ===');

    // Validate configuration
    const validation = ConfigManager.validate();
    if (!validation.valid) {
      console.error('Configuration validation failed:', validation.errors);
      throw new Error(`Configuration errors: ${validation.errors.join(', ')}`);
    }
    console.log('✓ Configuration validated');

    // Initialize database
    DatabaseService.initialize().then(() => {
      console.log('✓ Database initialized');
      const dbUrl = DatabaseService.getSpreadsheetUrl();
      if (dbUrl) {
        console.log(`  Database URL: ${dbUrl}`);
      }
    }).catch(error => {
      console.error('✗ Database initialization failed:', error);
      throw error;
    });

    // Test OpenAI connection if configured
    if (OpenAIClient.isConfigured()) {
      console.log('✓ OpenAI configured');
      const rateLimitInfo = OpenAIClient.getRateLimitInfo();
      console.log('  Rate limits:', rateLimitInfo);
    } else {
      console.log('⚠ OpenAI not configured - Add API key for AI features');
    }

    // Initialize cache
    console.log('✓ Cache manager initialized');
    const cacheStats = CacheManager.getStatistics();
    console.log('  Cache stats:', cacheStats);

    timer();
    console.log('=== Phase 2 Setup Complete ===');

    // Send confirmation email
    const userEmail = Session.getActiveUser().getEmail();
    GmailApp.sendEmail(
      userEmail,
      'GAS-PA Phase 2 Setup Complete',
      `Your GAS-PA Phase 2 components have been initialized successfully!

Components Status:
- Configuration Manager: ✓ Active
- Database Service: ✓ Initialized
- Logger Service: ✓ Active
- Error Handler: ✓ Active
- Cache Manager: ✓ Active
- OpenAI Integration: ${OpenAIClient.isConfigured() ? '✓ Configured' : '⚠ Needs API Key'}

Database URL: ${DatabaseService.getSpreadsheetUrl() || 'Not available'}

Next Steps:
1. ${!OpenAIClient.isConfigured() ? 'Add OpenAI API key using setOpenAIKey() function' : 'OpenAI is ready'}
2. Run testPhase2Components() to verify all systems
3. Run testClassification() to test email classification
4. Run testDraftGeneration() to test AI drafts

Best regards,
GAS-PA Phase 2`
    );

  } catch (error) {
    timer();
    LoggerService.critical('Phase2Setup', 'Setup failed', error as Error);
    throw error;
  }
}

/**
 * Set OpenAI API Key
 */
function setOpenAIKey(apiKey: string): void {
  if (!apiKey || !apiKey.startsWith('sk-')) {
    throw new Error('Invalid OpenAI API key format. Key should start with "sk-"');
  }

  ConfigManager.set('OPENAI_API_KEY', apiKey);
  console.log('✓ OpenAI API key set successfully');

  // Test the key
  if (OpenAIClient.isConfigured()) {
    console.log('✓ OpenAI client configured and ready');
  }
}

/**
 * Test Phase 2 Components
 */
async function testPhase2Components(): Promise<void> {
  console.log('=== Testing Phase 2 Components ===\n');

  const results: Record<string, boolean> = {};

  // Test 1: Configuration Manager
  console.log('Testing Configuration Manager...');
  try {
    const config = ConfigManager.getAllConfigurations();
    console.log(`  ✓ Loaded ${Object.keys(config).length} configurations`);
    results['ConfigManager'] = true;
  } catch (error) {
    console.error('  ✗ ConfigManager test failed:', error);
    results['ConfigManager'] = false;
  }

  // Test 2: Database Service
  console.log('\nTesting Database Service...');
  try {
    await DatabaseService.initialize();

    // Test insert
    const testId = await DatabaseService.insert('Analytics', {
      date: new Date().toISOString().split('T')[0],
      emailsProcessed: 10,
      emailsClassified: 8,
      draftsGenerated: 3,
      draftsSent: 2,
      avgResponseTime: 45,
      accuracyRate: 0.85,
      automationRate: 0.65
    });
    console.log(`  ✓ Insert test passed (ID: ${testId})`);

    // Test find
    const records = await DatabaseService.find('Analytics', { limit: 1 });
    console.log(`  ✓ Find test passed (${records.length} records)`);

    // Test update
    const updated = await DatabaseService.update('Analytics', testId, {
      emailsProcessed: 15
    });
    console.log(`  ✓ Update test passed (${updated ? 'success' : 'failed'})`);

    results['DatabaseService'] = true;
  } catch (error) {
    console.error('  ✗ DatabaseService test failed:', error);
    results['DatabaseService'] = false;
  }

  // Test 3: Logger Service
  console.log('\nTesting Logger Service...');
  try {
    LoggerService.info('Test', 'Test info message');
    LoggerService.warn('Test', 'Test warning message');
    LoggerService.error('Test', 'Test error message', new Error('Test error'));
    LoggerService.trackMetric('test.metric', 42);

    const stats = await LoggerService.getLogStatistics();
    console.log(`  ✓ Logger test passed (${stats.totalLogs} logs recorded)`);
    results['LoggerService'] = true;
  } catch (error) {
    console.error('  ✗ LoggerService test failed:', error);
    results['LoggerService'] = false;
  }

  // Test 4: Cache Manager
  console.log('\nTesting Cache Manager...');
  try {
    // Test set and get
    await CacheManager.set('test_key', { value: 'test_data' }, 60);
    const cached = await CacheManager.get('test_key');

    if (cached && cached.value === 'test_data') {
      console.log('  ✓ Cache set/get test passed');
    } else {
      throw new Error('Cache value mismatch');
    }

    // Test invalidation
    const invalidated = await CacheManager.invalidate('test_');
    console.log(`  ✓ Cache invalidation test passed (${invalidated} entries cleared)`);

    results['CacheManager'] = true;
  } catch (error) {
    console.error('  ✗ CacheManager test failed:', error);
    results['CacheManager'] = false;
  }

  // Test 5: Error Handler
  console.log('\nTesting Error Handler...');
  try {
    const result = await ErrorHandler.handle(
      () => {
        throw new Error('Test error');
      },
      { operation: 'test' },
      { type: 'FALLBACK', fallbackValue: 'recovered' }
    );

    if (result === 'recovered') {
      console.log('  ✓ Error recovery test passed');
    }

    const errorStats = ErrorHandler.getErrorStatistics();
    console.log(`  ✓ Error handler test passed (${Object.keys(errorStats).length} error types tracked)`);
    results['ErrorHandler'] = true;
  } catch (error) {
    console.error('  ✗ ErrorHandler test failed:', error);
    results['ErrorHandler'] = false;
  }

  // Test 6: OpenAI Client (if configured)
  console.log('\nTesting OpenAI Client...');
  if (OpenAIClient.isConfigured()) {
    try {
      const rateLimitInfo = OpenAIClient.getRateLimitInfo();
      console.log('  ✓ OpenAI client initialized');
      console.log(`    Requests available: ${rateLimitInfo.requestsPerMinute - rateLimitInfo.currentRequests}`);
      console.log(`    Tokens available: ${rateLimitInfo.tokensPerMinute - rateLimitInfo.currentTokens}`);
      results['OpenAIClient'] = true;
    } catch (error) {
      console.error('  ✗ OpenAI test failed:', error);
      results['OpenAIClient'] = false;
    }
  } else {
    console.log('  ⚠ OpenAI not configured (skipping)');
    results['OpenAIClient'] = null;
  }

  // Summary
  console.log('\n=== Test Summary ===');
  let passed = 0;
  let failed = 0;
  let skipped = 0;

  Object.entries(results).forEach(([component, success]) => {
    if (success === true) {
      console.log(`✓ ${component}: PASSED`);
      passed++;
    } else if (success === false) {
      console.log(`✗ ${component}: FAILED`);
      failed++;
    } else {
      console.log(`⚠ ${component}: SKIPPED`);
      skipped++;
    }
  });

  console.log(`\nResults: ${passed} passed, ${failed} failed, ${skipped} skipped`);
}

/**
 * Test Email Classification with AI
 */
async function testClassification(): Promise<void> {
  if (!OpenAIClient.isConfigured()) {
    console.error('OpenAI not configured. Run setOpenAIKey() first.');
    return;
  }

  console.log('=== Testing Email Classification ===\n');

  const testEmail = {
    subject: 'Q4 Partnership Proposal - Urgent Response Needed',
    from: 'partner@techcompany.com',
    to: Session.getActiveUser().getEmail(),
    body: `Hi,

I hope this email finds you well. I wanted to reach out regarding our Q4 partnership opportunity that we discussed last week.

We need to finalize the agreement by end of this week to meet our internal deadlines. Could you please review the attached proposal and let me know if you have any questions?

The key points are:
- 3-year partnership term
- $50,000 annual investment
- Joint marketing initiatives
- Quarterly business reviews

Please confirm your availability for a call tomorrow at 2 PM PST to discuss the final details.

Best regards,
John Smith
Director of Partnerships
TechCompany Inc.`
  };

  try {
    const timer = LoggerService.startTimer('TestClassification');

    console.log('Classifying email...');
    console.log(`Subject: ${testEmail.subject}`);
    console.log(`From: ${testEmail.from}\n`);

    const classification = await OpenAIClient.classifyEmail(testEmail);

    console.log('Classification Results:');
    console.log(`- Priority: ${classification.priority}`);
    console.log(`- Category: ${classification.category}`);
    console.log(`- Labels: ${classification.labels.join(', ')}`);
    console.log(`- Needs Reply: ${classification.needsReply}`);
    console.log(`- Sentiment: ${classification.sentiment}`);
    console.log(`- Key Topics: ${classification.keyTopics.join(', ')}`);
    console.log(`- Confidence: ${(classification.confidence * 100).toFixed(1)}%`);
    console.log(`- Reasoning: ${classification.reasoning}`);

    if (classification.suggestedActions.length > 0) {
      console.log(`- Suggested Actions:`);
      classification.suggestedActions.forEach(action => {
        console.log(`  • ${action}`);
      });
    }

    timer();
    console.log('\n✓ Classification test completed successfully');

  } catch (error) {
    console.error('Classification test failed:', error);
  }
}

/**
 * Test Draft Generation with AI
 */
async function testDraftGeneration(): Promise<void> {
  if (!OpenAIClient.isConfigured()) {
    console.error('OpenAI not configured. Run setOpenAIKey() first.');
    return;
  }

  console.log('=== Testing Draft Generation ===\n');

  const originalEmail = {
    subject: 'Meeting Request - Project Review',
    from: 'manager@company.com',
    body: `Hi,

Could we schedule a meeting this week to review the project status? I'd like to discuss:
- Current progress
- Upcoming milestones
- Any blockers or issues

Please let me know your availability.

Thanks,
Sarah`
  };

  try {
    const timer = LoggerService.startTimer('TestDraftGeneration');

    console.log('Generating draft reply...');
    console.log(`Original Subject: ${originalEmail.subject}`);
    console.log(`From: ${originalEmail.from}\n`);

    const draft = await OpenAIClient.generateDraft({
      originalEmail,
      context: {
        relationship: 'COLLEAGUE',
        tone: 'PROFESSIONAL'
      }
    });

    console.log('Generated Draft:');
    console.log(`\nSubject: ${draft.subject}`);
    console.log(`\nBody:\n${draft.body}`);
    console.log(`\nConfidence: ${(draft.confidence * 100).toFixed(1)}%`);

    if (draft.alternativeResponses && draft.alternativeResponses.length > 0) {
      console.log('\nAlternative Responses:');
      draft.alternativeResponses.forEach(alt => {
        console.log(`\n[${alt.type}]:`);
        console.log(alt.body);
      });
    }

    timer();
    console.log('\n✓ Draft generation test completed successfully');

  } catch (error) {
    console.error('Draft generation test failed:', error);
  }
}

/**
 * Get Phase 2 Status
 */
function getPhase2Status(): any {
  return {
    configuration: {
      valid: ConfigManager.validate().valid,
      settings: ConfigManager.getAllConfigurations()
    },
    database: {
      initialized: DatabaseService.getSpreadsheetUrl() !== null,
      url: DatabaseService.getSpreadsheetUrl()
    },
    openai: {
      configured: OpenAIClient.isConfigured(),
      rateLimit: OpenAIClient.isConfigured() ? OpenAIClient.getRateLimitInfo() : null
    },
    cache: CacheManager.getStatistics(),
    errors: {
      recent: ErrorHandler.getRecentErrors(5),
      statistics: ErrorHandler.getErrorStatistics()
    },
    logs: LoggerService.getLogStatistics()
  };
}

/**
 * Export configuration for backup
 */
function exportPhase2Config(): string {
  return ConfigManager.exportConfiguration();
}

/**
 * Import configuration from backup
 */
function importPhase2Config(jsonString: string): void {
  const result = ConfigManager.importConfiguration(jsonString);

  if (result.valid) {
    console.log('✓ Configuration imported successfully');
  } else {
    console.error('Import failed:', result.errors);
    throw new Error(`Import failed: ${result.errors.join(', ')}`);
  }
}

// Export Phase 2 functions to global scope
declare const global: any;
global.setupPhase2 = setupPhase2;
global.setOpenAIKey = setOpenAIKey;
global.testPhase2Components = testPhase2Components;
global.testClassification = testClassification;
global.testDraftGeneration = testDraftGeneration;
global.getPhase2Status = getPhase2Status;
global.exportPhase2Config = exportPhase2Config;
global.importPhase2Config = importPhase2Config;

// Export Classification Engine functions
global.testClassificationEngine = testClassificationEngine;
global.testVIPManagement = testVIPManagement;
global.testRulesEngine = testRulesEngine;
global.testLearningSystem = testLearningSystem;
global.testClassificationFeedback = testClassificationFeedback;
global.runAllClassificationTests = runAllClassificationTests;

// Export Queue Test functions
global.testQueueManagement = testQueueManagement;
global.testSnoozeOperations = testSnoozeOperations;
global.testSLATracking = testSLATracking;
global.testClassificationIntegration = testClassificationIntegration;
global.testQueueStatistics = testQueueStatistics;
global.runAllQueueTests = runAllQueueTests;

// Debug function for queue database issues
global.debugQueueDatabase = async function() {
  console.log('=== Debugging Queue Database ===\n');

  try {
    // Initialize database first!
    console.log('[0] Initializing database...');
    await DatabaseService.initialize();
    console.log('✓ Database initialized\n');

    // Test 1: Add an item
    console.log('[1] Adding test item...');
    const testId = await FollowUpQueue.addItem({
      emailId: `debug_${Date.now()}`,
      threadId: `debug_thread_${Date.now()}`,
      subject: 'Debug test item',
      from: 'test@example.com',
      to: 'me@example.com',
      receivedDate: new Date(),
      priority: 'MEDIUM',
      category: 'test',
      labels: [],
      reason: 'MANUAL_FOLLOW_UP'
    });
    console.log(`✓ Item added with ID: ${testId}\n`);

    // Test 2: Try to retrieve it
    console.log('[2] Attempting to retrieve item...');
    const retrieved = await FollowUpQueue.getItem(testId);

    if (retrieved) {
      console.log('✓ Item retrieved successfully!');
      console.log(`  Subject: ${retrieved.subject}`);
      console.log(`  Priority: ${retrieved.priority}`);
    } else {
      console.log('✗ Item NOT found');
    }

    // Test 3: Query database directly
    console.log('\n[3] Querying database directly...');
    const allItems = await DatabaseService.find('FollowUpQueue', { limit: 10 });
    console.log(`Found ${allItems.length} items in database:`);
    allItems.forEach((item, idx) => {
      console.log(`  ${idx + 1}. ID: ${item.id}, Subject: ${item.subject}`);
    });

    // Test 4: Try find with where clause
    console.log('\n[4] Testing find with where clause...');
    const foundItems = await DatabaseService.find('FollowUpQueue', {
      where: { id: testId },
      limit: 1
    });
    console.log(`Found ${foundItems.length} items with where clause`);
    if (foundItems.length > 0) {
      console.log(`✓ Found: ${foundItems[0].subject}`);
    }

  } catch (error) {
    console.error('Debug test failed:', error);
  }
};

// Also export internal services for testing
global.ConfigManager = ConfigManager;
global.DatabaseService = DatabaseService;
global.LoggerService = LoggerService;
global.ErrorHandler = ErrorHandler;
global.CacheManager = CacheManager;
global.OpenAIClient = OpenAIClient;
global.ClassificationEngine = ClassificationEngine;
global.RulesEngine = RulesEngine;
global.VIPManager = VIPManager;
global.LearningSystem = LearningSystem;
global.FollowUpQueue = FollowUpQueue;
global.SnoozeEngine = SnoozeEngine;
global.SLATracker = SLATracker;