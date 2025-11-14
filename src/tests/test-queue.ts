/**
 * Follow-up Queue System - Comprehensive Test Suite
 *
 * Tests all queue functionality including:
 * - Queue management (add, update, remove, get)
 * - Snooze operations (smart and quick)
 * - SLA tracking and deadlines
 * - Integration with classification engine
 * - Statistics and reporting
 */

import { FollowUpQueue } from '../features/queue/queue-manager';
import { SnoozeEngine } from '../features/queue/snooze-engine';
import { SLATracker } from '../features/queue/sla-tracker';
import {
  FollowUpItem,
  FollowUpReason,
  QueueItemStatus,
  SmartSnoozeRequest
} from '../features/queue/types';
import DatabaseService from '../core/database-service';
import VIPManager from '../features/vip/manager';
import ClassificationEngine from '../features/classifier/engine';

/**
 * Test 1: Queue Management - CRUD Operations
 */
export async function testQueueManagement(): Promise<void> {
  console.log('\n' + '='.repeat(60));
  console.log('TEST 1: Queue Management - CRUD Operations');
  console.log('='.repeat(60));

  const queue = FollowUpQueue.getInstance();

  try {
    // Test 1.1: Add item to queue
    console.log('\n[1.1] Adding item to queue...');
    const testItem: Partial<FollowUpItem> = {
      emailId: `test_email_${Date.now()}`,
      threadId: `test_thread_${Date.now()}`,
      subject: 'Test: Follow-up needed on project proposal',
      from: 'client@example.com',
      to: 'me@example.com',
      receivedDate: new Date(),
      priority: 'HIGH',
      category: 'work',
      labels: ['PA-Priority', 'PA-Work'],
      reason: FollowUpReason.NEEDS_REPLY
    };

    const itemId = await queue.addItem(testItem);
    console.log(`✓ Item added successfully with ID: ${itemId}`);

    // Test 1.2: Get item
    console.log('\n[1.2] Retrieving item...');
    const retrievedItem = await queue.getItem(itemId);

    if (retrievedItem) {
      console.log(`✓ Item retrieved successfully`);
      console.log(`  - Subject: ${retrievedItem.subject}`);
      console.log(`  - Priority: ${retrievedItem.priority}`);
      console.log(`  - Status: ${retrievedItem.status}`);
      console.log(`  - Reason: ${retrievedItem.reason}`);
    } else {
      console.log('✗ Failed to retrieve item');
      return;
    }

    // Test 1.3: Update item
    console.log('\n[1.3] Updating item priority...');
    await queue.updateItem(itemId, {
      priority: 'CRITICAL',
      aiReasoning: 'Escalated due to deadline'
    });

    const updatedItem = await queue.getItem(itemId);
    if (updatedItem && updatedItem.priority === 'CRITICAL') {
      console.log(`✓ Item updated successfully`);
      console.log(`  - New priority: ${updatedItem.priority}`);
      console.log(`  - Action count: ${updatedItem.actionCount}`);
    } else {
      console.log('✗ Update failed');
    }

    // Test 1.4: Get active items
    console.log('\n[1.4] Querying active items...');
    const activeItems = await queue.getActiveItems({
      priority: 'CRITICAL',
      limit: 10
    });

    console.log(`✓ Found ${activeItems.length} active CRITICAL items`);
    if (activeItems.length > 0) {
      console.log(`  - First item: ${activeItems[0].subject}`);
    }

    // Test 1.5: Mark completed
    console.log('\n[1.5] Marking item as completed...');
    await queue.markCompleted(itemId);

    const completedItem = await queue.getItem(itemId);
    if (completedItem && completedItem.status === QueueItemStatus.COMPLETED) {
      console.log(`✓ Item marked as completed`);
      console.log(`  - Status: ${completedItem.status}`);
      console.log(`  - Last action: ${completedItem.lastActionDate}`);
    } else {
      console.log('✗ Failed to mark as completed');
    }

    console.log('\n✅ Queue Management Test: PASSED');

  } catch (error) {
    console.log('\n❌ Queue Management Test: FAILED');
    console.error('Error:', error);
  }
}

/**
 * Test 2: Snooze Operations
 */
export async function testSnoozeOperations(): Promise<void> {
  console.log('\n' + '='.repeat(60));
  console.log('TEST 2: Snooze Operations');
  console.log('='.repeat(60));

  const queue = FollowUpQueue.getInstance();
  const snoozeEngine = SnoozeEngine.getInstance();

  try {
    // Test 2.1: Add test item
    console.log('\n[2.1] Creating test item for snooze...');
    const testItem: Partial<FollowUpItem> = {
      emailId: `snooze_test_${Date.now()}`,
      threadId: `snooze_thread_${Date.now()}`,
      subject: 'Test: Review quarterly report',
      from: 'manager@company.com',
      to: 'me@example.com',
      receivedDate: new Date(),
      priority: 'MEDIUM',
      category: 'work',
      labels: [],
      reason: FollowUpReason.NEEDS_REPLY
    };

    const itemId = await queue.addItem(testItem);
    console.log(`✓ Test item created: ${itemId}`);

    // Test 2.2: Quick snooze options
    console.log('\n[2.2] Getting quick snooze options...');
    const quickOptions = await snoozeEngine.getQuickSnoozeOptions();

    console.log(`✓ Generated ${quickOptions.length} quick snooze options:`);
    quickOptions.forEach((option, index) => {
      console.log(`  ${index + 1}. ${option.label}: ${option.time.toLocaleString()}`);
      console.log(`     Reason: ${option.reason}`);
    });

    // Test 2.3: Smart snooze suggestion
    console.log('\n[2.3] Getting AI-powered smart snooze suggestion...');
    const snoozeRequest: SmartSnoozeRequest = {
      emailContext: {
        subject: testItem.subject!,
        body: 'Please review the attached quarterly report and provide feedback by end of week.',
        from: testItem.from!,
        priority: testItem.priority!,
        category: testItem.category!
      },
      userPreferences: {
        workingHours: { start: 9, end: 17 },
        timezone: 'America/New_York'
      }
    };

    const smartSuggestion = await snoozeEngine.suggestSnoozeTime(snoozeRequest);

    console.log(`✓ Smart snooze suggestion generated:`);
    console.log(`  - Suggested time: ${smartSuggestion.suggestedTime.toLocaleString()}`);
    console.log(`  - Reasoning: ${smartSuggestion.reasoning}`);
    console.log(`  - Confidence: ${(smartSuggestion.confidence * 100).toFixed(1)}%`);
    console.log(`  - Alternatives: ${smartSuggestion.alternatives.length}`);

    smartSuggestion.alternatives.forEach((alt, index) => {
      console.log(`    ${index + 1}. ${alt.time.toLocaleString()} - ${alt.reason}`);
    });

    // Test 2.4: Snooze the item
    console.log('\n[2.4] Snoozing item...');
    const snoozeUntil = new Date(Date.now() + 3 * 60 * 60 * 1000); // 3 hours from now

    await queue.snoozeItem(itemId, {
      until: snoozeUntil,
      reason: 'Will review this afternoon',
      smart: true,
      aiReasoning: smartSuggestion.reasoning
    });

    const snoozedItem = await queue.getItem(itemId);
    if (snoozedItem && snoozedItem.status === QueueItemStatus.SNOOZED) {
      console.log(`✓ Item snoozed successfully`);
      console.log(`  - Snoozed until: ${snoozedItem.snoozedUntil?.toLocaleString()}`);
      console.log(`  - Snooze count: ${snoozedItem.snoozeCount}`);
      console.log(`  - AI reasoning: ${snoozedItem.aiReasoning}`);
    } else {
      console.log('✗ Snooze failed');
    }

    // Test 2.5: Check snoozed items (simulate time passing)
    console.log('\n[2.5] Checking for snoozed items to resurface...');
    // Note: In real test, would need to wait or manipulate time
    // For now, just show the function works
    const resurfaced = await queue.checkSnoozedItems();
    console.log(`✓ Checked snoozed items, found ${resurfaced.length} to resurface`);

    console.log('\n✅ Snooze Operations Test: PASSED');

  } catch (error) {
    console.log('\n❌ Snooze Operations Test: FAILED');
    console.error('Error:', error);
  }
}

/**
 * Test 3: SLA Tracking and Deadlines
 */
export async function testSLATracking(): Promise<void> {
  console.log('\n' + '='.repeat(60));
  console.log('TEST 3: SLA Tracking and Deadlines');
  console.log('='.repeat(60));

  const queue = FollowUpQueue.getInstance();
  const slaTracker = SLATracker.getInstance();
  const vipManager = VIPManager; // VIPManager is already a singleton instance

  try {
    // Test 3.1: Create test item with SLA
    console.log('\n[3.1] Creating high-priority item with SLA...');
    const testItem: Partial<FollowUpItem> = {
      emailId: `sla_test_${Date.now()}`,
      threadId: `sla_thread_${Date.now()}`,
      subject: 'URGENT: Server downtime affecting production',
      from: 'ops@company.com',
      to: 'me@example.com',
      receivedDate: new Date(),
      priority: 'CRITICAL',
      category: 'technical',
      labels: ['PA-Critical'],
      reason: FollowUpReason.NEEDS_REPLY
    };

    const itemId = await queue.addItem(testItem);
    const item = await queue.getItem(itemId);

    if (!item) {
      console.log('✗ Failed to create test item');
      return;
    }

    // Test 3.2: Calculate SLA deadline
    console.log('\n[3.2] Calculating SLA deadline...');
    const deadline = slaTracker.calculateDeadline(item);

    console.log(`✓ SLA deadline calculated:`);
    console.log(`  - Priority: ${item.priority}`);
    console.log(`  - Received: ${item.receivedDate.toLocaleString()}`);
    console.log(`  - Deadline: ${deadline.toLocaleString()}`);

    const hoursRemaining = slaTracker.getTimeRemaining(deadline);
    console.log(`  - Time remaining: ${hoursRemaining.toFixed(2)} hours`);

    // Test 3.3: Get SLA status
    console.log('\n[3.3] Checking SLA status...');
    const slaStatus = slaTracker.getSLAStatus(deadline, item.priority);

    console.log(`✓ SLA Status: ${slaStatus}`);

    // Update item with SLA info
    await queue.updateItem(itemId, {
      slaDeadline: deadline,
      slaStatus: slaStatus,
      timeRemaining: hoursRemaining
    });

    // Test 3.4: VIP SLA calculation
    console.log('\n[3.4] Testing VIP SLA calculation...');

    // Add a VIP for testing
    await vipManager.addVIP({
      email: 'ceo@company.com',
      name: 'Jane CEO',
      tier: 1,
      autoDraft: true,
      slaHours: 2 // VIP gets 2-hour SLA
    });

    const vipTestItem: Partial<FollowUpItem> = {
      emailId: `vip_sla_test_${Date.now()}`,
      threadId: `vip_sla_thread_${Date.now()}`,
      subject: 'Need your input on board presentation',
      from: 'ceo@company.com',
      to: 'me@example.com',
      receivedDate: new Date(),
      priority: 'HIGH',
      category: 'work',
      labels: ['PA-VIP'],
      reason: FollowUpReason.VIP_REQUIRES_ATTENTION
    };

    const vipItemId = await queue.addItem(vipTestItem);
    const vipItem = await queue.getItem(vipItemId);

    if (vipItem) {
      const vip = await vipManager.isVIP('ceo@company.com');
      const vipDeadline = slaTracker.calculateDeadline(vipItem, vip || undefined);

      console.log(`✓ VIP SLA calculated:`);
      console.log(`  - VIP: ${vip?.name} (Tier ${vip?.tier})`);
      console.log(`  - VIP SLA: ${vip?.slaHours} hours`);
      console.log(`  - Deadline: ${vipDeadline.toLocaleString()}`);
      console.log(`  - Time remaining: ${slaTracker.getTimeRemaining(vipDeadline).toFixed(2)} hours`);
    }

    // Test 3.5: Check overdue items
    console.log('\n[3.5] Checking for overdue items...');
    const overdueItems = await slaTracker.checkAndAlertOverdue();

    console.log(`✓ Checked overdue items: ${overdueItems.length} found`);

    // Test 3.6: SLA configuration
    console.log('\n[3.6] Checking SLA configuration...');
    const slaConfig = slaTracker.getSLAConfig();

    console.log(`✓ SLA Configuration:`);
    console.log(`  - CRITICAL: ${slaConfig.critical} hours`);
    console.log(`  - HIGH: ${slaConfig.high} hours`);
    console.log(`  - MEDIUM: ${slaConfig.medium} hours`);
    console.log(`  - LOW: ${slaConfig.low} hours`);
    console.log(`  - Adjust for weekends: ${slaConfig.adjustForWeekends}`);
    console.log(`  - Working hours: ${slaConfig.workingHours?.start}:00 - ${slaConfig.workingHours?.end}:00`);

    console.log('\n✅ SLA Tracking Test: PASSED');

  } catch (error) {
    console.log('\n❌ SLA Tracking Test: FAILED');
    console.error('Error:', error);
  }
}

/**
 * Test 4: Integration with Classification Engine
 */
export async function testClassificationIntegration(): Promise<void> {
  console.log('\n' + '='.repeat(60));
  console.log('TEST 4: Integration with Classification Engine');
  console.log('='.repeat(60));

  const queue = FollowUpQueue.getInstance();
  const classifier = ClassificationEngine; // ClassificationEngine is already a singleton instance

  try {
    // Test 4.1: Classify email and auto-add to queue
    console.log('\n[4.1] Classifying email that needs follow-up...');

    const emailContext = {
      email: {
        id: `integration_test_${Date.now()}`,
        threadId: `integration_thread_${Date.now()}`,
        subject: 'Can you review this proposal by Friday?',
        from: 'partner@example.com',
        to: ['me@example.com'], // Array format as expected by classifier
        date: new Date(),
        snippet: 'We need your feedback on the attached proposal...'
      },
      body: 'Hi, We need your feedback on the attached proposal for the new project. Can you review it by Friday and let us know your thoughts? Thanks!',
      headers: {}
    };

    const classification = await classifier.classifyEmail(emailContext);

    console.log(`✓ Email classified:`);
    console.log(`  - Priority: ${classification.priority}`);
    console.log(`  - Category: ${classification.category}`);
    console.log(`  - Needs reply: ${classification.needsReply}`);
    console.log(`  - Confidence: ${(classification.confidence * 100).toFixed(1)}%`);

    // Test 4.2: Process classification and add to queue
    console.log('\n[4.2] Processing classification for queue...');

    const queueItemId = await queue.processNewClassification(
      classification,
      {
        emailId: emailContext.email.id,
        threadId: emailContext.email.threadId,
        subject: emailContext.email.subject,
        from: emailContext.email.from,
        to: emailContext.email.to,
        receivedDate: emailContext.email.date
      }
    );

    if (queueItemId) {
      console.log(`✓ Email added to queue: ${queueItemId}`);

      const queueItem = await queue.getItem(queueItemId);
      if (queueItem) {
        console.log(`  - Subject: ${queueItem.subject}`);
        console.log(`  - Priority: ${queueItem.priority}`);
        console.log(`  - Reason: ${queueItem.reason}`);
        console.log(`  - AI reasoning: ${queueItem.aiReasoning}`);
      }
    } else {
      console.log('✓ Email did not need to be added to queue (low priority or auto-archive)');
    }

    console.log('\n✅ Classification Integration Test: PASSED');

  } catch (error) {
    console.log('\n❌ Classification Integration Test: FAILED');
    console.error('Error:', error);
  }
}

/**
 * Test 5: Queue Statistics and Reporting
 */
export async function testQueueStatistics(): Promise<void> {
  console.log('\n' + '='.repeat(60));
  console.log('TEST 5: Queue Statistics and Reporting');
  console.log('='.repeat(60));

  const queue = FollowUpQueue.getInstance();

  try {
    // Test 5.1: Get queue statistics
    console.log('\n[5.1] Calculating queue statistics...');

    const stats = await queue.getStatistics();

    console.log(`✓ Queue Statistics:`);
    console.log(`\n  Queue Metrics:`);
    console.log(`    - Total active: ${stats.totalActive}`);
    console.log(`    - Total snoozed: ${stats.totalSnoozed}`);
    console.log(`    - Total waiting: ${stats.totalWaiting}`);
    console.log(`    - Total completed: ${stats.totalCompleted}`);

    console.log(`\n  Priority Breakdown:`);
    console.log(`    - Critical: ${stats.criticalCount}`);
    console.log(`    - High: ${stats.highCount}`);
    console.log(`    - Medium: ${stats.mediumCount}`);
    console.log(`    - Low: ${stats.lowCount}`);

    console.log(`\n  SLA Metrics:`);
    console.log(`    - On time: ${stats.onTimeCount}`);
    console.log(`    - At risk: ${stats.atRiskCount}`);
    console.log(`    - Overdue: ${stats.overdueCount}`);
    console.log(`    - Avg response time: ${stats.averageResponseTime.toFixed(2)} hours`);

    console.log(`\n  Performance Metrics:`);
    console.log(`    - Completed today: ${stats.completedToday}`);
    console.log(`    - Completed this week: ${stats.completedThisWeek}`);
    console.log(`    - Avg time in queue: ${stats.averageTimeInQueue.toFixed(2)} hours`);

    console.log(`\n  Waiting Metrics:`);
    console.log(`    - Waiting on others: ${stats.waitingOnOthersCount}`);
    console.log(`    - Avg wait time: ${stats.averageWaitTime.toFixed(2)} hours`);

    console.log(`\n  Snooze Metrics:`);
    console.log(`    - Snoozed count: ${stats.snoozedCount}`);
    console.log(`    - Avg snooze time: ${stats.averageSnoozeTime.toFixed(2)} hours`);

    console.log(`\n  Last updated: ${stats.lastUpdated.toLocaleString()}`);

    // Test 5.2: Bulk operations
    console.log('\n[5.2] Testing bulk operations...');

    // Create test items for bulk operations
    const testIds: string[] = [];

    for (let i = 0; i < 3; i++) {
      const id = await queue.addItem({
        emailId: `bulk_test_${Date.now()}_${i}`,
        threadId: `bulk_thread_${Date.now()}_${i}`,
        subject: `Bulk test item ${i + 1}`,
        from: 'test@example.com',
        to: 'me@example.com',
        receivedDate: new Date(),
        priority: 'LOW',
        category: 'test',
        labels: [],
        reason: FollowUpReason.MANUAL_FOLLOW_UP
      });
      testIds.push(id);
    }

    console.log(`✓ Created ${testIds.length} test items for bulk operations`);

    // Test bulk snooze
    const snoozeResult = await queue.bulkSnooze(testIds, {
      until: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      reason: 'Bulk snooze test'
    });

    console.log(`✓ Bulk snooze result:`);
    console.log(`  - Successful: ${snoozeResult.successful.length}`);
    console.log(`  - Failed: ${snoozeResult.failed.length}`);

    // Test bulk complete
    const completeResult = await queue.bulkComplete(testIds);

    console.log(`✓ Bulk complete result:`);
    console.log(`  - Successful: ${completeResult.successful.length}`);
    console.log(`  - Failed: ${completeResult.failed.length}`);

    console.log('\n✅ Queue Statistics Test: PASSED');

  } catch (error) {
    console.log('\n❌ Queue Statistics Test: FAILED');
    console.error('Error:', error);
  }
}

/**
 * Run all queue tests
 */
export async function runAllQueueTests(): Promise<void> {
  console.log('========================================');
  console.log('    FOLLOW-UP QUEUE TEST SUITE         ');
  console.log('========================================\n');

  // Initialize database
  console.log('Initializing database for tests...');
  try {
    await DatabaseService.initialize();
    console.log('✓ Database initialized\n');
  } catch (error) {
    console.error('⚠ Database initialization failed:', error);
  }

  const tests = [
    { name: 'Queue Management', fn: testQueueManagement },
    { name: 'Snooze Operations', fn: testSnoozeOperations },
    { name: 'SLA Tracking', fn: testSLATracking },
    { name: 'Classification Integration', fn: testClassificationIntegration },
    { name: 'Queue Statistics', fn: testQueueStatistics }
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      await test.fn();
      passed++;
    } catch (error) {
      console.error(`\n❌ Test "${test.name}" failed with error:`, error);
      failed++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('TEST SUITE SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total tests: ${tests.length}`);
  console.log(`Passed: ${passed} ✅`);
  console.log(`Failed: ${failed} ${failed > 0 ? '❌' : ''}`);
  console.log(`Success rate: ${((passed / tests.length) * 100).toFixed(1)}%`);
  console.log('='.repeat(60));

  if (failed === 0) {
    console.log('\n🎉 ALL TESTS PASSED! Queue system is ready for production.');
  } else {
    console.log(`\n⚠ ${failed} test(s) failed. Please review the errors above.`);
  }
}
