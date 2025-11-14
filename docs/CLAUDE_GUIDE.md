# Claude Development Guide for GAS-PA

## Project Overview

GAS-PA (Google Apps Script Personal Assistant) is a TypeScript-based email management system that runs entirely within Google Workspace. It automatically processes, categorizes, and manages Gmail inbox with intelligent rules and reporting.

## Key Architecture Points

### Technology Stack
- **Language**: TypeScript (compiles to Google Apps Script V8 JavaScript)
- **Runtime**: Google Apps Script (server-side)
- **Services**: Gmail API, Google Sheets API, Properties Service
- **Development**: Local with clasp CLI tool
- **Deployment**: Personal account → Work account migration

### Core Design Patterns
1. **Singleton Services**: Config and Logger use singleton pattern
2. **Service Layer**: Separate services for Gmail, Sheets operations
3. **Processor Pattern**: Email processing logic separated from triggers
4. **Type Safety**: Full TypeScript interfaces for all data structures

## When Assisting with Development

### Code Style Guidelines
- Use TypeScript strict mode
- Implement comprehensive error handling
- Add JSDoc comments for all public functions
- Keep functions focused and under 50 lines
- Use descriptive variable names

### Google Apps Script Constraints
- No ES6 modules (use namespace imports)
- Global scope for GAS entry points
- 6-minute execution time limit
- Daily quotas for API calls
- No external npm packages (only GAS services)

### Common Development Tasks

#### Adding New Email Category
```typescript
// In emailProcessor.ts, modify categorizeEmail()
const categories = {
  'NewCategory': ['keyword1', 'keyword2', 'keyword3'],
  // ... existing categories
};
```

#### Adding New Processor
```typescript
// Create new file: src/processors/newProcessor.ts
export class NewProcessor {
  process(email: EmailData): ProcessingResult {
    // Implementation
  }
}
```

#### Adding Configuration Option
```typescript
// 1. Update types/index.d.ts
interface Config {
  features: {
    newFeature: boolean;
  }
}

// 2. Update core/config.ts defaults
features: {
  newFeature: false
}
```

## Testing Strategies

### Unit Testing (Local Mock)
```typescript
// Create test functions in main.ts
function testSpecificFeature() {
  const testEmail = {
    id: 'test123',
    subject: 'Test Subject',
    body: 'Test Body',
    // ... mock data
  };
  
  const processor = new EmailProcessor();
  const result = processor.processEmail(testEmail);
  console.log(result);
}
```

### Integration Testing
```bash
# Deploy to personal account
npm run push

# Run test function
clasp run testEmailProcessing

# Monitor logs
npm run logs
```

## Common Issues and Solutions

### Issue: TypeScript Compilation Errors
```bash
# Check TypeScript version
npx tsc --version

# Clean build
rm -rf dist/
npm run build
```

### Issue: Clasp Authentication
```bash
# Re-authenticate
clasp logout
clasp login

# Check credentials
clasp apis list
```

### Issue: Trigger Not Firing
```javascript
// Debug triggers
function listTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    console.log(`Function: ${trigger.getHandlerFunction()}`);
    console.log(`Type: ${trigger.getTriggerSource()}`);
  });
}
```

## Performance Optimization

### Batch Operations
```typescript
// Good: Batch read
const threads = GmailApp.search('is:unread', 0, 50);

// Bad: Individual reads in loop
for (let i = 0; i < 50; i++) {
  const thread = GmailApp.getInboxThreads(i, 1)[0];
}
```

### Caching Strategy
```typescript
// Use Properties Service for caching
const cache = PropertiesService.getScriptProperties();
cache.setProperty('lastRun', new Date().toISOString());
```

## AI Integration Points

When adding OpenAI integration:

### 1. API Service
```typescript
// src/services/ai.ts
export class AIService {
  private apiKey: string;
  
  constructor() {
    this.apiKey = PropertiesService.getScriptProperties()
      .getProperty('OPENAI_API_KEY') || '';
  }
  
  async categorizeEmail(email: EmailData): Promise<string> {
    // OpenAI API call
  }
}
```

### 2. Integration Points
- Email categorization
- Priority detection
- Action item extraction
- Response drafting
- Summary generation

## Migration Considerations

### Personal → Work Account

#### Code Bundling
```bash
# Create single file for easy copy-paste
cat dist/*.js > bundle.gs
```

#### Configuration Extraction
```javascript
// Export all settings
function exportConfig() {
  return {
    properties: PropertiesService.getScriptProperties().getProperties(),
    triggers: ScriptApp.getProjectTriggers().map(t => ({
      function: t.getHandlerFunction(),
      schedule: t.getTriggerSource()
    }))
  };
}
```

## Future Enhancement Ideas

### Priority 1 (Next Sprint)
- OpenAI integration for categorization
- Web interface for configuration
- Advanced filtering rules

### Priority 2 (Future)
- Calendar integration
- Slack notifications
- Machine learning model training
- Email templates

### Priority 3 (Long-term)
- Multi-account support
- Team collaboration features
- Advanced analytics dashboard

## Code Review Checklist

When reviewing changes:
- [ ] TypeScript compiles without errors
- [ ] Error handling implemented
- [ ] Logging added for debugging
- [ ] Types properly defined
- [ ] Documentation updated
- [ ] Test function created
- [ ] Migration bundle tested

## Resources

### Official Documentation
- [Google Apps Script Reference](https://developers.google.com/apps-script/reference)
- [Gmail Service](https://developers.google.com/apps-script/reference/gmail)
- [TypeScript Handbook](https://www.typescriptlang.org/docs)

### Project-Specific
- README.md - General overview
- MIGRATION_GUIDE.md - Deployment instructions
- src/types/index.d.ts - Type definitions

## Questions to Ask When Developing

1. **Scope**: Is this feature for personal or work account?
2. **Scale**: How many emails will this process?
3. **Frequency**: How often will this run?
4. **Dependencies**: Does this need external APIs?
5. **Migration**: How will this deploy to work account?

---

Use this guide when helping with GAS-PA development. Focus on maintainable, type-safe code that can easily migrate between accounts.
