/**
 * OpenAI Prompt Templates
 */

import {
  EmailClassificationRequest,
  DraftGenerationRequest,
  SnoozeSuggestionRequest,
  SummarizationRequest
} from './types';

export class PromptTemplates {
  static getSystemPrompt(): string {
    return `You are an advanced email assistant AI for a professional email management system.
Your role is to help classify emails, generate appropriate responses, and provide intelligent suggestions.
Always maintain professionalism, accuracy, and consider context carefully.
Respond in JSON format when requested.`;
  }

  static getClassificationPrompt(request: EmailClassificationRequest): string {
    const rulesSection = request.customRules && request.customRules.length > 0
      ? `\nCustom Rules to Consider:\n${request.customRules.join('\n')}`
      : '';

    return `Analyze the following email and provide a detailed classification:

Subject: ${request.subject}
From: ${request.from}
To: ${request.to}

Body:
${request.body}

${request.previousEmails && request.previousEmails.length > 0 ? `
Previous Context (last ${request.previousEmails.length} emails):
${request.previousEmails.join('\n---\n')}
` : ''}

${rulesSection}

Provide a classification with the following structure:
{
  "priority": "HIGH/MEDIUM/LOW",
  "category": "work/personal/finance/newsletter/shopping/travel/support/other",
  "labels": ["label1", "label2"],
  "needsReply": true/false,
  "waitingOnOthers": true/false,
  "sentiment": "POSITIVE/NEUTRAL/NEGATIVE/URGENT",
  "keyTopics": ["topic1", "topic2"],
  "suggestedActions": ["action1", "action2"],
  "confidence": 0.0-1.0,
  "reasoning": "Brief explanation of classification logic"
}

Classification Guidelines:
- HIGH priority: Urgent requests, time-sensitive matters, VIP senders, critical business issues
- MEDIUM priority: Regular business communications, project updates, meeting requests
- LOW priority: Newsletters, notifications, FYI emails, automated messages

- needsReply: true if the email contains questions or requests requiring a response
- waitingOnOthers: true if you've sent an email and are waiting for their response
- confidence: Your confidence level in this classification (0-1)`;
  }

  static getDraftGenerationPrompt(request: DraftGenerationRequest): string {
    const contextSection = request.context ? `
Context:
- Relationship: ${request.context.relationship || 'UNKNOWN'}
- Preferred Tone: ${request.context.tone || 'PROFESSIONAL'}
${request.context.previousEmails ? `- Previous exchanges included` : ''}
` : '';

    const instructionsSection = request.instructions
      ? `\nSpecial Instructions: ${request.instructions}`
      : '';

    return `Generate a professional email reply for the following email:

Original Email:
Subject: ${request.originalEmail.subject}
From: ${request.originalEmail.from}

${request.originalEmail.body}

${contextSection}
${instructionsSection}

Generate a response with the following structure:
{
  "subject": "Reply subject line",
  "body": "Plain text email body",
  "htmlBody": "Optional HTML formatted body",
  "confidence": 0.0-1.0,
  "alternativeResponses": [
    {
      "type": "SHORT/DETAILED/APOLOGETIC/ASSERTIVE",
      "body": "Alternative response text"
    }
  ],
  "suggestedSendTime": "ISO 8601 datetime or null"
}

Guidelines:
- Match the tone appropriately (formal for business, casual for personal)
- Be concise but complete
- Address all questions or points raised
- Maintain professionalism
- Suggest alternative response styles when applicable
- Consider optimal sending time based on context`;
  }

  static getSnoozeSuggestionPrompt(request: SnoozeSuggestionRequest): string {
    const workingHoursSection = request.workingHours ? `
Working Hours:
- Start: ${request.workingHours.start}
- End: ${request.workingHours.end}
- Days: ${request.workingHours.daysOfWeek.join(', ')}
` : '';

    return `Analyze this email and suggest an optimal time to handle it:

Email Details:
Subject: ${request.email.subject}
From: ${request.email.from}
Received: ${request.email.receivedDate.toISOString()}

Content Preview:
${request.email.body.substring(0, 500)}...

User Timezone: ${request.userTimezone}
${workingHoursSection}

Provide snooze suggestions with this structure:
{
  "suggestedTime": "ISO 8601 datetime",
  "reasoning": "Explanation for the suggested time",
  "alternativeTimes": ["ISO 8601 datetime", "ISO 8601 datetime"],
  "urgencyLevel": "IMMEDIATE/TODAY/THIS_WEEK/NEXT_WEEK/LATER"
}

Consider:
- Email urgency and importance
- Optimal working hours
- Type of request (meeting, deadline, FYI)
- Sender importance
- Time needed to properly respond
- Current time and day of week`;
  }

  static getSummarizationPrompt(request: SummarizationRequest): string {
    const focusSection = request.focusAreas && request.focusAreas.length > 0
      ? `\nFocus particularly on: ${request.focusAreas.join(', ')}`
      : '';

    const emails = request.emails.map((email, index) => `
Email ${index + 1}:
Date: ${email.date.toISOString()}
From: ${email.from}
Subject: ${email.subject}

${email.body}
`).join('\n---\n');

    return `Summarize the following email thread:

${emails}

${focusSection}

Maximum summary length: ${request.maxLength || 500} characters

Provide a summary with this structure:
{
  "summary": "Concise overview of the thread",
  "keyPoints": ["point1", "point2"],
  "actionItems": ["action1", "action2"],
  "decisions": ["decision1", "decision2"],
  "nextSteps": ["step1", "step2"]
}

Guidelines:
- Focus on outcomes and decisions
- Highlight any deadlines or time-sensitive items
- Extract clear action items
- Identify who is responsible for what
- Keep the summary concise but comprehensive`;
  }

  static getMeetingDetectionPrompt(emailBody: string): string {
    return `Analyze this email for meeting-related content:

${emailBody}

Identify if this email contains:
{
  "isMeetingRelated": true/false,
  "meetingType": "REQUEST/CONFIRMATION/CANCELLATION/RESCHEDULE/null",
  "proposedTimes": ["ISO 8601 datetime"],
  "duration": "minutes or null",
  "location": "location or null",
  "isVirtual": true/false,
  "platform": "Zoom/Teams/Meet/null",
  "attendees": ["email1", "email2"],
  "agenda": "agenda summary or null",
  "requiresResponse": true/false
}`;
  }

  static getSentimentAnalysisPrompt(emailBody: string): string {
    return `Analyze the sentiment and tone of this email:

${emailBody}

Provide analysis:
{
  "overallSentiment": "POSITIVE/NEUTRAL/NEGATIVE/MIXED",
  "tone": "FORMAL/CASUAL/URGENT/FRIENDLY/FRUSTRATED/APPRECIATIVE",
  "emotionalIntensity": 0.0-1.0,
  "keyEmotions": ["emotion1", "emotion2"],
  "riskLevel": "NONE/LOW/MEDIUM/HIGH",
  "riskFactors": ["factor1", "factor2"],
  "suggestedResponseTone": "FORMAL/CASUAL/EMPATHETIC/ASSERTIVE"
}`;
  }

  static getActionExtractionPrompt(emailBody: string): string {
    return `Extract all actionable items from this email:

${emailBody}

Identify:
{
  "tasks": [
    {
      "description": "task description",
      "assignee": "email or name",
      "deadline": "ISO 8601 datetime or null",
      "priority": "HIGH/MEDIUM/LOW",
      "status": "PENDING/IN_PROGRESS/COMPLETED"
    }
  ],
  "questions": [
    {
      "question": "the question text",
      "requiresResponse": true/false,
      "urgency": "IMMEDIATE/SOON/WHENEVER"
    }
  ],
  "requests": [
    {
      "type": "APPROVAL/INFORMATION/ACTION/MEETING",
      "description": "request description",
      "deadline": "ISO 8601 datetime or null"
    }
  ],
  "commitments": [
    {
      "description": "what was promised",
      "promisedBy": "email or name",
      "promisedTo": "email or name",
      "deadline": "ISO 8601 datetime or null"
    }
  ]
}`;
  }

  static getRelationshipAnalysisPrompt(emails: string[]): string {
    return `Analyze the relationship based on these email exchanges:

${emails.join('\n---\n')}

Determine:
{
  "relationshipType": "COLLEAGUE/CLIENT/VENDOR/MANAGER/REPORT/PERSONAL/UNKNOWN",
  "formalityLevel": "VERY_FORMAL/FORMAL/NEUTRAL/CASUAL/VERY_CASUAL",
  "communicationFrequency": "DAILY/WEEKLY/MONTHLY/OCCASIONAL/RARE",
  "responseExpectation": "IMMEDIATE/SAME_DAY/NEXT_DAY/WITHIN_WEEK/FLEXIBLE",
  "importance": "VIP/HIGH/NORMAL/LOW",
  "historicalContext": "summary of relationship history",
  "suggestedGreeting": "appropriate greeting for replies",
  "suggestedClosing": "appropriate closing for replies"
}`;
  }

  static getSmartCategorizationPrompt(
    emailBody: string,
    existingCategories: string[]
  ): string {
    return `Categorize this email intelligently:

${emailBody}

Existing categories in the system:
${existingCategories.join(', ')}

Provide categorization:
{
  "primaryCategory": "best matching category",
  "secondaryCategories": ["category1", "category2"],
  "suggestedNewCategory": "if none fit well, suggest a new one or null",
  "confidence": 0.0-1.0,
  "keywords": ["keyword1", "keyword2"],
  "matchingRules": ["rule1", "rule2"]
}`;
  }
}

export class PromptOptimizer {
  static optimizeForModel(prompt: string, model: string): string {
    // Model-specific optimizations
    if (model.includes('gpt-4')) {
      // GPT-4 handles longer context well
      return prompt;
    } else if (model.includes('gpt-3.5')) {
      // GPT-3.5 benefits from more concise prompts
      return this.truncatePrompt(prompt, 2000);
    }
    return prompt;
  }

  private static truncatePrompt(prompt: string, maxLength: number): string {
    if (prompt.length <= maxLength) {
      return prompt;
    }

    // Smart truncation that preserves structure
    const lines = prompt.split('\n');
    let result = '';
    let essential = '';

    // Preserve JSON structure requirements
    lines.forEach(line => {
      if (line.includes('{') || line.includes('}') || line.includes('structure:')) {
        essential += line + '\n';
      }
    });

    // Add content until we reach the limit
    for (const line of lines) {
      if ((result + line).length < maxLength - essential.length) {
        result += line + '\n';
      } else {
        break;
      }
    }

    return result + '\n...\n' + essential;
  }

  static addExamples(prompt: string, examples: any[]): string {
    if (examples.length === 0) {
      return prompt;
    }

    const exampleSection = `
Examples:
${examples.map((ex, i) => `Example ${i + 1}: ${JSON.stringify(ex)}`).join('\n')}
`;

    return prompt + exampleSection;
  }

  static addContext(prompt: string, context: Record<string, any>): string {
    const contextSection = `
Additional Context:
${Object.entries(context)
  .map(([key, value]) => `- ${key}: ${value}`)
  .join('\n')}
`;

    return prompt + contextSection;
  }
}