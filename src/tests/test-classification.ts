/**
 * Tests for Classification Engine
 */

import ClassificationEngine from '../features/classifier/engine';
import RulesEngine from '../features/classifier/rules-engine';
import VIPManager from '../features/vip/manager';
import LearningSystem from '../features/classifier/learning-system';
import { EmailContext, ClassificationFeedback } from '../features/classifier/types';
import LoggerService from '../core/logger-service';
import DatabaseService from '../core/database-service';

/**
 * Test the Classification Engine with sample emails
 */
export async function testClassificationEngine(): Promise<void> {
  console.log('=== Testing Classification Engine ===\n');

  const testCases: Array<{
    name: string;
    email: EmailContext;
    expectedPriority?: string;
    expectedCategory?: string;
  }> = [
    {
      name: 'Urgent Business Email',
      email: {
        email: {
          id: 'test_1',
          threadId: 'thread_1',
          subject: 'URGENT: Contract Review Needed by EOD',
          from: 'ceo@company.com',
          to: [Session.getActiveUser().getEmail()],
          date: new Date(),
          body: `Hi,

We need your urgent review and approval on the Q4 partnership contract.
The client is waiting for our response and we need to finalize this by end of day today.

Please review the attached contract and provide your feedback ASAP.

Key points to review:
- Payment terms (Section 3.2)
- Deliverables timeline (Section 4)
- Termination clause (Section 8)

This is critical for closing the deal this quarter.

Best regards,
John Smith
CEO`,
          hasAttachments: true,
          attachmentTypes: ['pdf']
        }
      },
      expectedPriority: 'CRITICAL',
      expectedCategory: 'work'
    },
    {
      name: 'Newsletter',
      email: {
        email: {
          id: 'test_2',
          threadId: 'thread_2',
          subject: 'Your Weekly Tech Digest',
          from: 'newsletter@techsite.com',
          to: [Session.getActiveUser().getEmail()],
          date: new Date(),
          body: `This week in tech:

- Latest AI developments
- New product launches
- Industry news

To unsubscribe from this newsletter, click here.`,
          hasAttachments: false
        }
      },
      expectedPriority: 'LOW',
      expectedCategory: 'newsletter'
    },
    {
      name: 'Meeting Request',
      email: {
        email: {
          id: 'test_3',
          threadId: 'thread_3',
          subject: 'Meeting Request: Project Status Review',
          from: 'manager@company.com',
          to: [Session.getActiveUser().getEmail()],
          date: new Date(),
          body: `Hi Team,

I'd like to schedule a meeting this week to review our project status.

Agenda:
- Current progress update
- Upcoming milestones
- Resource allocation
- Q4 planning

Please let me know your availability for a 1-hour meeting on Thursday or Friday.

Thanks,
Sarah`,
          hasAttachments: false
        },
        thread: {
          messageCount: 3,
          participants: ['manager@company.com', Session.getActiveUser().getEmail()],
          lastReplyFrom: Session.getActiveUser().getEmail(),
          hasUserReplied: true
        }
      },
      expectedPriority: 'MEDIUM',
      expectedCategory: 'work'
    },
    {
      name: 'Financial Document',
      email: {
        email: {
          id: 'test_4',
          threadId: 'thread_4',
          subject: 'Invoice #INV-2024-001 - Payment Due',
          from: 'billing@vendor.com',
          to: [Session.getActiveUser().getEmail()],
          date: new Date(),
          body: `Dear Customer,

Please find attached invoice #INV-2024-001 for services rendered in October 2024.

Amount Due: $5,000.00
Due Date: November 30, 2024

Payment methods:
- Bank transfer
- Credit card
- Check

Thank you for your business.`,
          hasAttachments: true,
          attachmentTypes: ['pdf']
        }
      },
      expectedPriority: 'HIGH',
      expectedCategory: 'finance'
    },
    {
      name: 'Support Ticket',
      email: {
        email: {
          id: 'test_5',
          threadId: 'thread_5',
          subject: 'Support Ticket #12345 - Issue Resolved',
          from: 'support@service.com',
          to: [Session.getActiveUser().getEmail()],
          date: new Date(),
          body: `Hello,

Your support ticket #12345 has been resolved.

Issue: Login problems
Resolution: Password has been reset

If you have any further questions, please reply to this email.

Best regards,
Support Team`,
          hasAttachments: false
        }
      },
      expectedPriority: 'LOW',
      expectedCategory: 'support'
    }
  ];

  const results: Array<{ name: string; success: boolean; details: any }> = [];

  for (const testCase of testCases) {
    console.log(`\nTesting: ${testCase.name}`);
    console.log(`Subject: ${testCase.email.email.subject}`);
    console.log(`From: ${testCase.email.email.from}`);

    try {
      const timer = LoggerService.startTimer(`Test_${testCase.name}`);
      const result = await ClassificationEngine.classifyEmail(testCase.email);
      timer();

      console.log('\nClassification Result:');
      console.log(`- Priority: ${result.priority} ${testCase.expectedPriority ? `(expected: ${testCase.expectedPriority})` : ''}`);
      console.log(`- Category: ${result.category} ${testCase.expectedCategory ? `(expected: ${testCase.expectedCategory})` : ''}`);
      console.log(`- Labels: ${result.labels.join(', ')}`);
      console.log(`- Needs Reply: ${result.needsReply}`);
      console.log(`- Confidence: ${(result.confidence * 100).toFixed(1)}%`);
      console.log(`- Method: ${result.method}`);
      console.log(`- Reasoning: ${result.reasoning}`);

      if (result.suggestedActions.length > 0) {
        console.log(`- Actions: ${result.suggestedActions.map(a => `${a.type}${a.value ? `:${a.value}` : ''}`).join(', ')}`);
      }

      const success = (!testCase.expectedPriority || result.priority === testCase.expectedPriority) &&
        (!testCase.expectedCategory || result.category === testCase.expectedCategory);

      results.push({
        name: testCase.name,
        success,
        details: {
          priority: result.priority,
          category: result.category,
          confidence: result.confidence,
          method: result.method
        }
      });

      console.log(`\n✓ Test ${success ? 'PASSED' : 'FAILED'}`);
    } catch (error) {
      console.error(`✗ Test FAILED with error:`, error);
      results.push({
        name: testCase.name,
        success: false,
        details: { error: (error as Error).message }
      });
    }
  }

  // Summary
  console.log('\n=== Test Summary ===');
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  results.forEach(result => {
    console.log(`${result.success ? '✓' : '✗'} ${result.name}: ${result.success ? 'PASSED' : 'FAILED'}`);
    if (!result.success) {
      console.log(`  Details: ${JSON.stringify(result.details)}`);
    }
  });

  console.log(`\nTotal: ${passed} passed, ${failed} failed`);
}

/**
 * Test VIP Management
 */
export async function testVIPManagement(): Promise<void> {
  console.log('=== Testing VIP Management ===\n');

  try {
    // Add test VIPs
    const vipEmails = [
      {
        email: 'ceo@company.com',
        name: 'John Smith (CEO)',
        tier: 1 as const,
        autoDraft: true,
        slaHours: 4
      },
      {
        email: 'important.client@partner.com',
        name: 'Important Client',
        tier: 2 as const,
        autoDraft: true,
        slaHours: 24
      },
      {
        email: '*@vip-domain.com',
        name: 'VIP Domain',
        tier: 3 as const,
        autoDraft: false,
        slaHours: 48
      }
    ];

    console.log('Adding VIP contacts...');
    for (const vip of vipEmails) {
      try {
        await VIPManager.addVIP(vip);
        console.log(`✓ Added VIP: ${vip.name} (Tier ${vip.tier})`);
      } catch (error) {
        console.log(`  VIP might already exist: ${vip.email}`);
      }
    }

    // Test VIP detection
    console.log('\nTesting VIP detection:');

    const testEmails = [
      'ceo@company.com',
      'random@vip-domain.com',
      'notavip@example.com'
    ];

    for (const email of testEmails) {
      const vip = await VIPManager.isVIP(email);
      if (vip) {
        console.log(`✓ ${email} is VIP (Tier ${vip.tier})`);
      } else {
        console.log(`  ${email} is not VIP`);
      }
    }

    // Get VIP statistics
    const stats = await VIPManager.getVIPStatistics();
    console.log('\nVIP Statistics:');
    console.log(`- Total VIPs: ${stats.totalVIPs}`);
    console.log(`- Tier 1: ${stats.byTier[1]}`);
    console.log(`- Tier 2: ${stats.byTier[2]}`);
    console.log(`- Tier 3: ${stats.byTier[3]}`);
    console.log(`- With Auto-draft: ${stats.withAutoDraft}`);

    // Suggest new VIPs
    console.log('\nSuggested VIPs:');
    const suggestions = VIPManager.suggestVIPs();
    suggestions.forEach(suggestion => {
      console.log(`- ${suggestion.email} (Tier ${suggestion.suggestedTier}): ${suggestion.reason}`);
    });

    console.log('\n✓ VIP Management test completed');
  } catch (error) {
    console.error('VIP Management test failed:', error);
  }
}

/**
 * Test Rules Engine
 */
export async function testRulesEngine(): Promise<void> {
  console.log('=== Testing Rules Engine ===\n');

  try {
    // Create test rules
    const testRules = [
      {
        name: 'Urgent Emails',
        precedence: 100,
        conditions: [
          {
            field: 'subject' as const,
            operator: 'contains' as const,
            value: 'urgent',
            caseSensitive: false
          }
        ],
        actions: [
          { type: 'label' as const, value: 'PA-Urgent' },
          { type: 'star' as const }
        ],
        enabled: true,
        confidence: 0.9
      },
      {
        name: 'Client Emails',
        precedence: 90,
        conditions: [
          {
            field: 'from' as const,
            operator: 'endsWith' as const,
            value: '@client.com',
            caseSensitive: false
          }
        ],
        actions: [
          { type: 'label' as const, value: 'PA-Client' }
        ],
        enabled: true,
        confidence: 0.85
      }
    ];

    console.log('Creating rules...');
    for (const rule of testRules) {
      const id = await RulesEngine.createRule(rule);
      console.log(`✓ Created rule: ${rule.name} (ID: ${id})`);
    }

    // Test rule evaluation
    const testContext: EmailContext = {
      email: {
        id: 'test_rule',
        threadId: 'thread_rule',
        subject: 'Urgent: Client Request',
        from: 'contact@client.com',
        to: [Session.getActiveUser().getEmail()],
        date: new Date(),
        body: 'This is an urgent request from our client.',
        hasAttachments: false
      }
    };

    console.log('\nEvaluating rules for test email:');
    console.log(`Subject: ${testContext.email.subject}`);
    console.log(`From: ${testContext.email.from}`);

    const matches = await RulesEngine.evaluateRules(testContext);

    console.log(`\nMatched ${matches.length} rules:`);
    matches.forEach(match => {
      console.log(`- ${match.rule.name} (confidence: ${(match.confidence * 100).toFixed(1)}%)`);
      console.log(`  Conditions: ${match.matchedConditions.join(', ')}`);
    });

    // Get rule statistics
    const stats = await RulesEngine.getRuleStatistics();
    console.log('\nRule Statistics:');
    console.log(`- Total Rules: ${stats.totalRules}`);
    console.log(`- Active Rules: ${stats.activeRules}`);
    console.log(`- Average Confidence: ${(stats.averageConfidence * 100).toFixed(1)}%`);

    console.log('\n✓ Rules Engine test completed');
  } catch (error) {
    console.error('Rules Engine test failed:', error);
  }
}

/**
 * Test Learning System
 */
export async function testLearningSystem(): Promise<void> {
  console.log('=== Testing Learning System ===\n');

  try {
    // Test category suggestion
    console.log('Testing category suggestion...');

    const testEmails = [
      {
        subject: 'Invoice for October Services',
        from: 'billing@company.com',
        body: 'Please find attached the invoice for services rendered.',
        expected: 'finance'
      },
      {
        subject: 'Team Meeting Tomorrow',
        from: 'manager@company.com',
        body: 'Reminder about our team meeting tomorrow at 2 PM.',
        expected: 'work'
      },
      {
        subject: 'Your Weekly Newsletter',
        from: 'newsletter@news.com',
        body: 'This week in tech news. To unsubscribe, click here.',
        expected: 'newsletter'
      }
    ];

    for (const test of testEmails) {
      const suggestion = await LearningSystem.suggestCategoryForEmail(
        test.subject,
        test.from,
        test.body
      );

      if (suggestion) {
        console.log(`\n"${test.subject}"`);
        console.log(`  Suggested: ${suggestion.category} (${(suggestion.confidence * 100).toFixed(1)}%)`);
        console.log(`  Expected: ${test.expected}`);
        console.log(`  ${suggestion.category === test.expected ? '✓' : '✗'} Match`);
      } else {
        console.log(`\n"${test.subject}": No suggestion`);
      }
    }

    // Test priority calculation
    console.log('\n\nTesting priority calculation...');

    const priorityFactors = {
      senderImportance: 0.8,
      keywordUrgency: 0.6,
      deadlineProximity: 0.9,
      vipStatus: 1.0,
      historicalResponse: 0.5,
      sentimentUrgency: 0.7,
      contextualClues: 0.3
    };

    const priorityScore = LearningSystem.calculatePriorityScore(priorityFactors);
    console.log(`Priority Score: ${priorityScore.toFixed(1)}/100`);

    // Test feedback recording
    console.log('\n\nTesting feedback recording...');

    const mockClassification = {
      priority: 'MEDIUM' as const,
      category: 'work',
      labels: ['PA-Work'],
      needsReply: true,
      waitingOnOthers: false,
      isRecurring: false,
      isNewsletter: false,
      isAutomated: false,
      sentiment: 'NEUTRAL' as const,
      importance: 50,
      urgency: 50,
      suggestedActions: [],
      confidence: 0.75,
      method: 'HYBRID' as const,
      reasoning: 'Test classification',
      appliedRules: [],
      isVIP: false,
      feedbackRequired: true,
      learningOpportunity: true
    };

    const feedback: ClassificationFeedback = {
      emailId: 'test_feedback',
      timestamp: new Date(),
      feedbackType: 'WRONG_PRIORITY',
      correctValue: { priority: 'HIGH' }
    };

    await LearningSystem.recordFeedback('test_feedback', mockClassification, feedback);
    console.log('✓ Feedback recorded');

    // Get learning statistics
    const stats = await LearningSystem.getStatistics();
    console.log('\n\nLearning System Statistics:');
    console.log(`- Total Examples: ${stats.totalExamples}`);
    console.log(`- Accuracy: ${stats.accuracy.toFixed(1)}%`);
    console.log(`- Categories Learned: ${stats.categoriesLearned}`);
    console.log(`- Feedback Types:`);
    Object.entries(stats.feedbackByType).forEach(([type, count]) => {
      if (count > 0) {
        console.log(`  ${type}: ${count}`);
      }
    });

    console.log('\n✓ Learning System test completed');
  } catch (error) {
    console.error('Learning System test failed:', error);
  }
}

/**
 * Test Classification with Feedback Loop
 */
export async function testClassificationFeedback(): Promise<void> {
  console.log('=== Testing Classification with Feedback ===\n');

  try {
    // Create test email
    const testEmail: EmailContext = {
      email: {
        id: 'feedback_test',
        threadId: 'thread_feedback',
        subject: 'Project Update',
        from: 'colleague@company.com',
        to: [Session.getActiveUser().getEmail()],
        date: new Date(),
        body: 'Here is the latest update on the project status.',
        hasAttachments: false
      }
    };

    console.log('Step 1: Initial Classification');
    const initialResult = await ClassificationEngine.classifyEmail(testEmail);

    console.log(`Priority: ${initialResult.priority}`);
    console.log(`Category: ${initialResult.category}`);
    console.log(`Confidence: ${(initialResult.confidence * 100).toFixed(1)}%`);

    console.log('\nStep 2: Simulating User Correction');
    const feedback: ClassificationFeedback = {
      emailId: testEmail.email.id,
      timestamp: new Date(),
      feedbackType: 'WRONG_PRIORITY',
      correctValue: { priority: 'HIGH' },
      userAction: 'manual_priority_change'
    };

    await ClassificationEngine.recordFeedback(testEmail.email.id, feedback);
    console.log('✓ Feedback recorded');

    console.log('\nStep 3: Re-classify Similar Email');
    testEmail.email.id = 'feedback_test_2';
    testEmail.email.subject = 'Another Project Update';

    const secondResult = await ClassificationEngine.classifyEmail(testEmail);

    console.log(`Priority: ${secondResult.priority}`);
    console.log(`Category: ${secondResult.category}`);
    console.log(`Confidence: ${(secondResult.confidence * 100).toFixed(1)}%`);

    console.log('\n✓ Feedback loop test completed');
  } catch (error) {
    console.error('Feedback test failed:', error);
  }
}

/**
 * Run all classification tests
 */
export async function runAllClassificationTests(): Promise<void> {
  console.log('========================================');
  console.log('    CLASSIFICATION ENGINE TEST SUITE    ');
  console.log('========================================\n');

  // Initialize database before running tests
  console.log('Initializing database for tests...');
  try {
    await DatabaseService.initialize();
    console.log('✓ Database initialized\n');
  } catch (error) {
    console.error('⚠ Database initialization failed, some tests may fail:', error);
  }

  const tests = [
    { name: 'Classification Engine', fn: testClassificationEngine },
    { name: 'VIP Management', fn: testVIPManagement },
    { name: 'Rules Engine', fn: testRulesEngine },
    { name: 'Learning System', fn: testLearningSystem },
    { name: 'Feedback Loop', fn: testClassificationFeedback }
  ];

  const results: Array<{ name: string; success: boolean; error?: string }> = [];

  for (const test of tests) {
    console.log(`\n${'='.repeat(40)}`);
    console.log(`Running: ${test.name}`);
    console.log(`${'='.repeat(40)}\n`);

    try {
      await test.fn();
      results.push({ name: test.name, success: true });
    } catch (error) {
      console.error(`\n✗ ${test.name} failed:`, error);
      results.push({
        name: test.name,
        success: false,
        error: (error as Error).message
      });
    }
  }

  // Final Summary
  console.log('\n========================================');
  console.log('           FINAL TEST SUMMARY           ');
  console.log('========================================\n');

  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  results.forEach(result => {
    console.log(`${result.success ? '✓ PASS' : '✗ FAIL'}: ${result.name}`);
    if (result.error) {
      console.log(`  Error: ${result.error}`);
    }
  });

  console.log(`\n${'='.repeat(40)}`);
  console.log(`Total: ${passed} passed, ${failed} failed`);
  console.log(`Success Rate: ${((passed / results.length) * 100).toFixed(1)}%`);
  console.log(`${'='.repeat(40)}\n`);
}