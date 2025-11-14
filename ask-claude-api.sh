#!/bin/bash

# Check if API key is set
if [ -z "$ANTHROPIC_API_KEY" ]; then
    echo "Please set ANTHROPIC_API_KEY environment variable"
    echo "export ANTHROPIC_API_KEY='your-key-here'"
    exit 1
fi

# Read code from file or stdin
if [ -n "$1" ]; then
    CODE=$(cat "$1")
    FILENAME="$1"
else
    echo "Paste your code (Ctrl+D when done):"
    CODE=$(cat)
    FILENAME="stdin"
fi

# Create the prompt
PROMPT="Please help fix this TypeScript code for Google Apps Script:\n\n\`\`\`typescript\n$CODE\n\`\`\`"

# Call Claude API
curl -X POST https://api.anthropic.com/v1/messages \
     -H "Content-Type: application/json" \
     -H "x-api-key: $ANTHROPIC_API_KEY" \
     -H "anthropic-version: 2023-06-01" \
     -d "{
       \"model\": \"claude-3-sonnet-20240229\",
       \"max_tokens\": 4000,
       \"messages\": [{
         \"role\": \"user\",
         \"content\": \"$PROMPT\"
       }]
     }"
