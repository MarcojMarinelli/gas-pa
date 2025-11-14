# GAS-PA Project

## Overview
Google Apps Script Personal Assistant for Gmail management, written in TypeScript.

## Project Structure
- src/ - TypeScript source files
- dist/ - Compiled JavaScript output
- package.json - Node dependencies
- tsconfig.json - TypeScript configuration

## Build Commands
- `npm run build` - Compile TypeScript to JavaScript
- `npm run push` - Deploy to Google Apps Script  
- `npm run test` - Run tests

## Current Task
Fix TypeScript compilation errors for Google Apps Script environment, focusing on:
- Global object declarations
- Date type conversions
- Optional parameter handling
- Google Apps Script API type compatibility

## Tech Stack
- TypeScript
- Google Apps Script
- Gmail API
- Google Sheets API
- Clasp for deployment
```

### 3. Use Claude to Fix Your Build Errors

Now run `claude` again and try these commands:
```
# In Claude CLI:

# Ask Claude to check for build errors
run npm run build and show me any errors

# Fix specific files
edit src/main.ts to fix the global object declaration errors

# Get help with TypeScript issues  
fix all TypeScript compilation errors in the project

# Create or update files
create a working tsconfig.json for Google Apps Script

# Review and fix multiple files
review all files in src/ and fix any TypeScript errors
```

### 4. Useful Claude Code Commands
```
/init                 # Initialize project
/help                # Show available commands
edit <file> to...    # Edit a specific file
create <file>        # Create a new file
run <command>        # Run shell commands
review              # Review code
fix                 # Fix issues
```

### Try This Now

1. In your Claude session, try:
```
run npm run build
```

2. If there are errors, ask:
```
fix the TypeScript build errors shown above
```

3. Claude should be able to:
   - See the errors
   - Understand your project structure
   - Provide fixes
   - Even edit the files directly

### Example Session
```
> run npm run build

[Claude shows build output]

> edit src/main.ts to fix the global declaration errors

[Claude edits the file]

> run npm run build

[Should now build successfully
