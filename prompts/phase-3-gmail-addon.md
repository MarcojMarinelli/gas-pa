---
title: "Phase 3: Gmail Add-on Completion - Contextual Email Assistant"
phase: 3
duration: "2 days (16 hours)"
priority: "High"
quality_target: "8.5/10"
dependencies: "phase-1-fix-stabilize.md, phase-2-dashboard-implementation.md"
next_phase: "phase-4-integration-polish.md"
---

# Phase 3: Gmail Add-on Completion

## 🎯 Objectives

1. **Fix failing add-on tests** - Resolve truncation and card rendering issues
2. **Complete contextual email features** - Category, priority, VIP management
3. **Implement quick actions** - Process, archive, add to queue, extract tasks
4. **Polish add-on UX** - Loading states, optimistic updates, error handling

## 📋 Prerequisites

### Phase 1 & 2 Completion Required
- [ ] All core components working
- [ ] State management functional
- [ ] API integration complete
- [ ] Dashboard implemented

### Gmail Add-on Context
```bash
# Review existing add-on code
ls -la src/ui/addon/
cat src/ui/addon/*.ts

# Check test failures
npm run test -- addon.cards

# Review Gmail Add-on documentation
# https://developers.google.com/gmail/add-ons/
```

### Required Documentation
- Read `docs/UI_IMPLEMENTATION_PLAN_v2.md` - Section 11 (Gmail Add-on Integration)
- Review Google's Gmail Add-on design guidelines
- Check `src/ui/addon/` for existing implementation

---

## 🔧 Task 1: Fix Failing Add-on Tests (2 hours)

### Subtasks

#### 1.1 Fix KeyValue Truncation Tests
**Location**: `tests/unit/addon.cards.spec.ts:100-165`

**Failing Tests**:
1. Single-line truncation (truncate=1)
2. Two-line truncation (truncate=2)
3. No truncation specified
4. Empty content handling

**Root Cause Analysis**:
```bash
# Run specific failing test to see actual vs expected
npm run test -- addon.cards.spec.ts:100 --reporter=verbose
```

**Fix Implementation**:
```typescript
// Location: src/ui/addon/cards.ts (or wherever KeyValue is defined)

interface KeyValueConfig {
  topLabel: string;
  content: string;
  multiline?: boolean;
  truncate?: number;  // Number of lines (1 or 2)
  icon?: string;
  button?: {
    text: string;
    onClick: () => void;
  };
}

class KeyValue {
  render(config: KeyValueConfig): CardSection {
    const contentStyle = this.getContentStyle(config.truncate);

    return {
      widgets: [
        {
          keyValue: {
            topLabel: config.topLabel,
            content: config.content || '—',  // Handle empty
            contentMultiline: config.truncate > 1,
            bottomLabel: config.bottomLabel,
            icon: config.icon
          }
        }
      ]
    };
  }

  private getContentStyle(truncate?: number): string {
    if (!truncate) return '';

    return `
      overflow: hidden;
      text-overflow: ellipsis;
      display: -webkit-box;
      -webkit-line-clamp: ${truncate};
      -webkit-box-orient: vertical;
    `;
  }
}
```

**Gmail Add-on Card Service API**:
```typescript
// Gmail Add-on uses CardService, not HTML/CSS
// Must use proper CardService.newKeyValue() API

function createKeyValue(config: KeyValueConfig) {
  const keyValue = CardService.newKeyValue()
    .setTopLabel(config.topLabel)
    .setContent(config.content || 'No content');

  if (config.multiline) {
    keyValue.setMultiline(true);
  }

  if (config.icon) {
    keyValue.setIconUrl(config.icon);
  }

  if (config.button) {
    keyValue.setButton(
      CardService.newTextButton()
        .setText(config.button.text)
        .setOnClickAction(
          CardService.newAction()
            .setFunctionName(config.button.onClick)
        )
    );
  }

  return keyValue;
}
```

**Important**: Gmail Add-ons use `CardService` API, not HTML. Truncation is handled by `setMultiline()` and content length limits.

**Card Service Limits**:
- Single line: ~60 characters (auto-truncates with ...)
- Multi-line: ~200 characters (wraps to 2-3 lines)
- Empty content: Show placeholder text

#### 1.2 Update Tests to Match CardService Behavior
```typescript
// tests/unit/addon.cards.spec.ts

test('should truncate KeyValue content to single line', () => {
  const longText = 'A'.repeat(100);
  const card = createKeyValue({
    topLabel: 'Subject',
    content: longText,
    multiline: false  // Single line
  });

  // Gmail CardService auto-truncates at ~60 chars
  expect(card.keyValue.content.length).toBeLessThanOrEqual(60);
  expect(card.keyValue.multiline).toBe(false);
});

test('should handle empty content gracefully', () => {
  const card = createKeyValue({
    topLabel: 'Subject',
    content: '',
    multiline: false
  });

  expect(card.keyValue.content).toBe('No content');
});
```

### Task 1 Acceptance Criteria
- [ ] All add-on.cards tests passing
- [ ] Truncation works correctly (1 line, 2 lines, none)
- [ ] Empty content shows placeholder
- [ ] Tests match CardService API behavior

---

## 📧 Task 2: Email Context Card (4 hours)

### Subtasks

#### 2.1 Main Context Card
**Location**: `src/ui/addon/EmailContextCard.ts`

**Card Structure**:
```
┌─────────────────────────────────┐
│ Email Classification            │
├─────────────────────────────────┤
│ Category: Work            [Edit]│
│ Priority: High            [Edit]│
│ VIP Sender: Yes          [Toggle]│
├─────────────────────────────────┤
│ Quick Actions                   │
│ [Process Now] [Add to Queue]    │
│ [Extract Tasks] [Archive]       │
├─────────────────────────────────┤
│ Follow-up                       │
│ ○ None  ○ Tomorrow  ○ This Week │
├─────────────────────────────────┤
│ [Open Full Dashboard]           │
└─────────────────────────────────┘
```

**Implementation**:
```typescript
// src/ui/addon/EmailContextCard.ts

class EmailContextCard {
  buildCard(email: GmailMessage): Card {
    const classification = this.getEmailClassification(email);

    return CardService.newCardBuilder()
      .setHeader(
        CardService.newCardHeader()
          .setTitle('GAS-PA Email Assistant')
          .setSubtitle('Quick Actions')
          .setImageUrl('https://...')  // Add-on icon
      )
      .addSection(this.buildClassificationSection(classification))
      .addSection(this.buildQuickActionsSection(email))
      .addSection(this.buildFollowUpSection(email))
      .addSection(this.buildFooterSection())
      .build();
  }

  private buildClassificationSection(classification: EmailClassification): CardSection {
    return CardService.newCardSection()
      .setHeader('Classification')
      .addWidget(
        CardService.newKeyValue()
          .setTopLabel('Category')
          .setContent(classification.category)
          .setButton(
            CardService.newTextButton()
              .setText('Edit')
              .setOnClickAction(
                CardService.newAction()
                  .setFunctionName('openCategoryEditor')
              )
          )
      )
      .addWidget(
        CardService.newKeyValue()
          .setTopLabel('Priority')
          .setContent(this.getPriorityDisplay(classification.priority))
          .setButton(
            CardService.newTextButton()
              .setText('Edit')
              .setOnClickAction(
                CardService.newAction()
                  .setFunctionName('openPriorityEditor')
              )
          )
      )
      .addWidget(
        CardService.newKeyValue()
          .setTopLabel('VIP Sender')
          .setContent(classification.isVIP ? 'Yes' : 'No')
          .setButton(
            CardService.newTextButton()
              .setText(classification.isVIP ? 'Remove' : 'Add')
              .setOnClickAction(
                CardService.newAction()
                  .setFunctionName('toggleVIP')
                  .setParameters({ emailId: email.getId() })
              )
          )
      );
  }

  private buildQuickActionsSection(email: GmailMessage): CardSection {
    return CardService.newCardSection()
      .setHeader('Quick Actions')
      .addWidget(
        CardService.newButtonSet()
          .addButton(
            CardService.newTextButton()
              .setText('Process Now')
              .setOnClickAction(
                CardService.newAction()
                  .setFunctionName('processEmail')
                  .setParameters({ emailId: email.getId() })
                  .setLoadIndicator(CardService.LoadIndicator.SPINNER)
              )
          )
          .addButton(
            CardService.newTextButton()
              .setText('Add to Queue')
              .setOnClickAction(
                CardService.newAction()
                  .setFunctionName('addToQueue')
                  .setParameters({ emailId: email.getId() })
              )
          )
      )
      .addWidget(
        CardService.newButtonSet()
          .addButton(
            CardService.newTextButton()
              .setText('Extract Tasks')
              .setOnClickAction(
                CardService.newAction()
                  .setFunctionName('extractTasks')
                  .setParameters({ emailId: email.getId() })
              )
          )
          .addButton(
            CardService.newTextButton()
              .setText('Archive')
              .setOnClickAction(
                CardService.newAction()
                  .setFunctionName('archiveEmail')
                  .setParameters({ emailId: email.getId() })
              )
          )
      );
  }

  private buildFollowUpSection(email: GmailMessage): CardSection {
    return CardService.newCardSection()
      .setHeader('Follow-up')
      .addWidget(
        CardService.newSelectionInput()
          .setType(CardService.SelectionInputType.RADIO_BUTTON)
          .setFieldName('followup')
          .addItem('None', 'none', true)
          .addItem('Tomorrow', 'tomorrow', false)
          .addItem('This Week', 'week', false)
          .addItem('Custom', 'custom', false)
          .setOnChangeAction(
            CardService.newAction()
              .setFunctionName('setFollowUp')
              .setParameters({ emailId: email.getId() })
          )
      );
  }

  private buildFooterSection(): CardSection {
    return CardService.newCardSection()
      .addWidget(
        CardService.newTextButton()
          .setText('Open Full Dashboard')
          .setOpenLink(
            CardService.newOpenLink()
              .setUrl(this.getDashboardUrl())
              .setOpenAs(CardService.OpenAs.FULL_SIZE)
              .setOnClose(CardService.OnClose.RELOAD_ADD_ON)
          )
      );
  }
}
```

#### 2.2 Category/Priority Editors
**Location**: `src/ui/addon/editors/`

**Category Editor Card**:
```typescript
function openCategoryEditor(e: any): Card {
  const currentCategory = e.parameters.category || 'Uncategorized';

  return CardService.newCardBuilder()
    .setHeader(
      CardService.newCardHeader()
        .setTitle('Change Category')
    )
    .addSection(
      CardService.newCardSection()
        .addWidget(
          CardService.newSelectionInput()
            .setType(CardService.SelectionInputType.DROPDOWN)
            .setFieldName('category')
            .setTitle('Select Category')
            .addItem('Work', 'work', currentCategory === 'Work')
            .addItem('Personal', 'personal', currentCategory === 'Personal')
            .addItem('Finance', 'finance', currentCategory === 'Finance')
            .addItem('Shopping', 'shopping', currentCategory === 'Shopping')
            .addItem('Travel', 'travel', currentCategory === 'Travel')
            .addItem('Other', 'other', currentCategory === 'Other')
        )
        .addWidget(
          CardService.newButtonSet()
            .addButton(
              CardService.newTextButton()
                .setText('Save')
                .setOnClickAction(
                  CardService.newAction()
                    .setFunctionName('saveCategory')
                    .setParameters({ emailId: e.parameters.emailId })
                )
            )
            .addButton(
              CardService.newTextButton()
                .setText('Cancel')
                .setOnClickAction(
                  CardService.newAction()
                    .setFunctionName('closeEditor')
                )
            )
        )
    )
    .build();
}

// Backend handler
function saveCategory(e: any): ActionResponse {
  const emailId = e.parameters.emailId;
  const category = e.formInput.category;

  // Update email classification in database
  const dbService = DatabaseService.getInstance();
  dbService.updateEmailClassification(emailId, { category });

  // Apply Gmail label
  const email = GmailApp.getMessageById(emailId);
  const label = GmailApp.getUserLabelByName(`PA-${category}`);
  if (label) {
    email.getThread().addLabel(label);
  }

  // Show success notification and return to main card
  return CardService.newActionResponseBuilder()
    .setNotification(
      CardService.newNotification()
        .setText(`Category updated to ${category}`)
    )
    .setNavigation(
      CardService.newNavigation()
        .popCard()
    )
    .build();
}
```

### Task 2 Acceptance Criteria
- [ ] Email context card displays current classification
- [ ] Category editor functional
- [ ] Priority editor functional
- [ ] VIP toggle works
- [ ] All editors show success notifications
- [ ] Navigation between cards works
- [ ] Loading indicators show during actions

---

## ⚡ Task 3: Quick Actions Implementation (4 hours)

### Subtasks

#### 3.1 Process Email Action
```typescript
// src/ui/addon/actions/processEmail.ts

function processEmail(e: any): ActionResponse {
  const emailId = e.parameters.emailId;

  try {
    // Get email processor service
    const processor = EmailProcessor.getInstance();
    const email = GmailApp.getMessageById(emailId);

    // Show loading
    // CardService automatically shows spinner with LoadIndicator.SPINNER

    // Process email
    const result = processor.processEmail({
      id: emailId,
      subject: email.getSubject(),
      body: email.getPlainBody(),
      from: email.getFrom(),
      to: email.getTo(),
      date: email.getDate()
    });

    // Update labels
    const label = GmailApp.getUserLabelByName('PA-Processed');
    if (label) {
      email.getThread().addLabel(label);
    }

    // Return success with notification
    return CardService.newActionResponseBuilder()
      .setNotification(
        CardService.newNotification()
          .setText(`Email processed: ${result.category} (${result.priority})`)
      )
      .setStateChanged(true)  // Reload add-on
      .build();

  } catch (error) {
    Logger.log('Error processing email: ' + error);

    return CardService.newActionResponseBuilder()
      .setNotification(
        CardService.newNotification()
          .setText('Error processing email. Please try again.')
          .setType(CardService.NotificationType.ERROR)
      )
      .build();
  }
}
```

#### 3.2 Add to Queue Action
```typescript
function addToQueue(e: any): ActionResponse {
  const emailId = e.parameters.emailId;

  try {
    const queueService = QueueService.getInstance();
    const email = GmailApp.getMessageById(emailId);

    queueService.addToQueue({
      emailId: emailId,
      subject: email.getSubject(),
      from: email.getFrom(),
      date: email.getDate(),
      priority: 'medium'
    });

    return CardService.newActionResponseBuilder()
      .setNotification(
        CardService.newNotification()
          .setText('Added to processing queue')
      )
      .build();

  } catch (error) {
    return CardService.newActionResponseBuilder()
      .setNotification(
        CardService.newNotification()
          .setText('Failed to add to queue')
          .setType(CardService.NotificationType.ERROR)
      )
      .build();
  }
}
```

#### 3.3 Extract Tasks Action
```typescript
function extractTasks(e: any): ActionResponse {
  const emailId = e.parameters.emailId;

  try {
    const taskExtractor = TaskExtractor.getInstance();
    const email = GmailApp.getMessageById(emailId);

    const tasks = taskExtractor.extractTasks(email.getPlainBody());

    if (tasks.length === 0) {
      return CardService.newActionResponseBuilder()
        .setNotification(
          CardService.newNotification()
            .setText('No tasks found in this email')
        )
        .build();
    }

    // Show tasks card
    return CardService.newActionResponseBuilder()
      .setNavigation(
        CardService.newNavigation()
          .pushCard(buildTasksCard(tasks, emailId))
      )
      .build();

  } catch (error) {
    return CardService.newActionResponseBuilder()
      .setNotification(
        CardService.newNotification()
          .setText('Error extracting tasks')
          .setType(CardService.NotificationType.ERROR)
      )
      .build();
  }
}

function buildTasksCard(tasks: Task[], emailId: string): Card {
  const builder = CardService.newCardBuilder()
    .setHeader(
      CardService.newCardHeader()
        .setTitle(`${tasks.length} Tasks Found`)
    );

  const section = CardService.newCardSection();

  tasks.forEach((task, index) => {
    section.addWidget(
      CardService.newKeyValue()
        .setTopLabel(`Task ${index + 1}`)
        .setContent(task.description)
        .setMultiline(true)
    );
  });

  section.addWidget(
    CardService.newButtonSet()
      .addButton(
        CardService.newTextButton()
          .setText('Add to Tasks')
          .setOnClickAction(
            CardService.newAction()
              .setFunctionName('addTasksToSheet')
              .setParameters({ emailId, tasks: JSON.stringify(tasks) })
          )
      )
      .addButton(
        CardService.newTextButton()
          .setText('Back')
          .setOnClickAction(
            CardService.newAction()
              .setFunctionName('closeTasksCard')
          )
      )
  );

  return builder.addSection(section).build();
}
```

#### 3.4 Archive Action
```typescript
function archiveEmail(e: any): ActionResponse {
  const emailId = e.parameters.emailId;

  try {
    const email = GmailApp.getMessageById(emailId);
    email.getThread().moveToArchive();

    return CardService.newActionResponseBuilder()
      .setNotification(
        CardService.newNotification()
          .setText('Email archived')
      )
      .build();

  } catch (error) {
    return CardService.newActionResponseBuilder()
      .setNotification(
        CardService.newNotification()
          .setText('Error archiving email')
          .setType(CardService.NotificationType.ERROR)
      )
      .build();
  }
}
```

### Task 3 Acceptance Criteria
- [ ] Process Email action works correctly
- [ ] Add to Queue action successful
- [ ] Extract Tasks finds action items
- [ ] Archive action moves to archive
- [ ] All actions show loading indicators
- [ ] Success notifications display
- [ ] Error notifications display on failure
- [ ] Optimistic updates where applicable

---

## 🎨 Task 4: UX Polish & Optimization (3 hours)

### Subtasks

#### 4.1 Loading States
```typescript
// Use CardService LoadIndicator for all async actions
.setOnClickAction(
  CardService.newAction()
    .setFunctionName('processEmail')
    .setLoadIndicator(CardService.LoadIndicator.SPINNER)  // Shows spinner
)

// For long operations, show progress card
function showProgressCard(operation: string): Card {
  return CardService.newCardBuilder()
    .setHeader(
      CardService.newCardHeader()
        .setTitle('Processing...')
    )
    .addSection(
      CardService.newCardSection()
        .addWidget(
          CardService.newTextParagraph()
            .setText(`${operation} in progress. Please wait...`)
        )
    )
    .build();
}
```

#### 4.2 Optimistic Updates
```typescript
// Update UI immediately, then sync
function toggleVIP(e: any): ActionResponse {
  const emailId = e.parameters.emailId;
  const currentVIP = e.parameters.isVIP === 'true';
  const newVIP = !currentVIP;

  // Optimistic: update card immediately
  const responseBuilder = CardService.newActionResponseBuilder()
    .setNotification(
      CardService.newNotification()
        .setText(newVIP ? 'Added to VIP senders' : 'Removed from VIP senders')
    )
    .setStateChanged(true);  // Refresh card with new state

  // Background: sync to database
  try {
    const vipService = VIPService.getInstance();
    const email = GmailApp.getMessageById(emailId);
    const sender = email.getFrom();

    if (newVIP) {
      vipService.addVIPSender(sender);
    } else {
      vipService.removeVIPSender(sender);
    }
  } catch (error) {
    // If sync fails, show error but UI already updated
    Logger.log('VIP sync error: ' + error);
  }

  return responseBuilder.build();
}
```

#### 4.3 Error Recovery
```typescript
// Add retry mechanism for failed actions
function withRetry<T>(
  fn: () => T,
  retries: number = 3,
  delay: number = 1000
): T {
  for (let i = 0; i < retries; i++) {
    try {
      return fn();
    } catch (error) {
      if (i === retries - 1) throw error;
      Utilities.sleep(delay * (i + 1));
    }
  }
  throw new Error('Max retries exceeded');
}

// Usage in actions
function processEmail(e: any): ActionResponse {
  try {
    const result = withRetry(() => {
      return processor.processEmail(emailData);
    }, 3, 1000);

    return successResponse(result);
  } catch (error) {
    return errorResponse('Failed after 3 attempts. Please try again later.');
  }
}
```

#### 4.4 Caching for Performance
```typescript
// Cache classification data to avoid repeated API calls
const classificationCache = CacheService.getUserCache();

function getEmailClassification(email: GmailMessage): EmailClassification {
  const cacheKey = `classification_${email.getId()}`;
  const cached = classificationCache.get(cacheKey);

  if (cached) {
    return JSON.parse(cached);
  }

  const classification = computeClassification(email);

  // Cache for 10 minutes
  classificationCache.put(cacheKey, JSON.stringify(classification), 600);

  return classification;
}
```

### Task 4 Acceptance Criteria
- [ ] Loading spinners show during async operations
- [ ] Optimistic updates provide instant feedback
- [ ] Errors handled gracefully with retry
- [ ] Cache reduces redundant API calls
- [ ] Add-on feels responsive (<500ms feedback)
- [ ] No freezing or blocking UI

---

## ✅ Phase 3 Quality Gates

### Functional Requirements
- [ ] All add-on tests passing
- [ ] Email context card displays correctly
- [ ] All quick actions work
- [ ] Category/priority editors functional
- [ ] VIP toggle works
- [ ] Task extraction working
- [ ] Dashboard link opens correctly

### User Experience
- [ ] Loading indicators present
- [ ] Optimistic updates implemented
- [ ] Error messages helpful
- [ ] Navigation smooth
- [ ] Actions complete in <2s
- [ ] No UI freezing

### Gmail Add-on Compliance
- [ ] Uses CardService API correctly
- [ ] No unauthorized scopes
- [ ] Proper error handling
- [ ] Loading indicators on all actions
- [ ] Meets Gmail Add-on design guidelines

### Testing
- [ ] All unit tests passing
- [ ] Integration tests for actions
- [ ] Manual testing in Gmail
- [ ] Error scenarios tested

---

## 🧪 Testing & Validation

### Test in Gmail
```bash
# Deploy to test environment
npm run build
npm run push

# Open Gmail and test:
1. Open an email
2. Click GAS-PA add-on
3. Verify context card displays
4. Test each quick action
5. Test category/priority editors
6. Test VIP toggle
7. Test task extraction
8. Test dashboard link
```

### Automated Tests
```typescript
// tests/integration/addon.spec.ts

test('processEmail action succeeds', async () => {
  const event = {
    parameters: {
      emailId: 'test123'
    }
  };

  const response = processEmail(event);

  expect(response.notification).toBeDefined();
  expect(response.notification.text).toContain('processed');
});

test('extractTasks finds action items', () => {
  const emailBody = 'Please review the document and send feedback by Friday.';
  const tasks = extractTasksFromText(emailBody);

  expect(tasks.length).toBeGreaterThan(0);
  expect(tasks[0].description).toContain('review');
});
```

---

## 📚 Reference Documentation

- Gmail Add-on Developer Guide: https://developers.google.com/gmail/add-ons/
- CardService Reference: https://developers.google.com/apps-script/reference/card-service/
- Gmail Add-on Design Guidelines: https://developers.google.com/gmail/add-ons/guides/design
- `docs/UI_IMPLEMENTATION_PLAN_v2.md` §11

---

## 🎯 Phase 3 Completion Checklist

- [ ] All add-on tests passing (100%)
- [ ] Email context card complete
- [ ] Category editor working
- [ ] Priority editor working
- [ ] VIP toggle functional
- [ ] Process Email action works
- [ ] Add to Queue action works
- [ ] Extract Tasks works
- [ ] Archive action works
- [ ] Loading states implemented
- [ ] Error handling complete
- [ ] Optimistic updates working
- [ ] Caching implemented
- [ ] Tested in Gmail
- [ ] Meets Gmail Add-on guidelines

---

## 🚀 Next Steps

```bash
git add .
git commit -m "Phase 3 complete: Gmail Add-on

- Fixed all add-on tests
- Complete email context card
- All quick actions functional
- Optimistic updates and error handling
- Tested in Gmail

Quality: 8.5/10
UX: Responsive and polished"

git tag -a phase-3-complete -m "Phase 3: Gmail Add-on complete"
```

**Move to Phase 4**: `prompts/phase-4-integration-polish.md`

---

**Phase 3 Quality Rating: 8.5/10**
