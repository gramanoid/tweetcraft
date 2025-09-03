# TweetCraft Prompt Architecture

## Strategic Prompt Structure Definition

This document defines the comprehensive prompt structure for all LLM requests across TweetCraft's various input sources.

## Master System Prompt

All requests (except Image Generation) start with this foundation:

```
You are an expert Twitter reply / tweet writer that excels in human/natural sounding verbiage and sentence flow. Analyze the provided tweet's content, tone, and intent first. If links are present, access them. If images accompany the tweet, analyze them thoroughly. This additional context is critical for crafting a relevant reply. Once you have complete information (tweet analysis + detailed image descriptions if they exist), build your reply using the provided guidelines.
```

## Prompt Construction by Tab

### 1. PERSONAS Tab
```
[MASTER SYSTEM PROMPT] + 
[USER'S SYSTEM PROMPT from Extension Popup] + 
[PERSONA SYSTEM PROMPT] +
[PERSONA 4-PART CONFIGURATION] +
[ANTI-DISCLOSURE INSTRUCTION]

Temperature: Extension Popup System-Wide Temperature
```

**Note**: Personas do NOT have custom temperature settings.

### 2. ALL Tab (4-Part Builder)
```
[MASTER SYSTEM PROMPT] + 
[USER'S SYSTEM PROMPT from Extension Popup] + 
[PERSONALITY] + 
[VOCABULARY] + 
[RHETORIC] + 
[LENGTH & PACING] +
[ANTI-DISCLOSURE INSTRUCTION]

Temperature: Extension Popup System-Wide Temperature
```

### 3. SMART Tab
Uses the same structure as ALL tab since suggestions are sourced from ALL templates.

```
[MASTER SYSTEM PROMPT] + 
[USER'S SYSTEM PROMPT from Extension Popup] + 
[Selected Template Configuration] +
[ANTI-DISCLOSURE INSTRUCTION]

Temperature: Extension Popup System-Wide Temperature
```

### 4. FAVORITES Tab
Uses the same structure as ALL tab since favorites are sourced from ALL templates.

```
[MASTER SYSTEM PROMPT] + 
[USER'S SYSTEM PROMPT from Extension Popup] + 
[Selected Template Configuration] +
[ANTI-DISCLOSURE INSTRUCTION]

Temperature: Extension Popup System-Wide Temperature
```

### 5. IMAGE GEN Tab
**No system prompts or temperature applied** - purely functional image generation.

### 6. CUSTOM Tab
```
[MASTER SYSTEM PROMPT] + 
[USER'S SYSTEM PROMPT from Extension Popup] + 
[CUSTOM STYLE INSTRUCTIONS] + 
[CUSTOM TONE INSTRUCTIONS] + 
[CUSTOM LENGTH INSTRUCTIONS] +
[ANTI-DISCLOSURE INSTRUCTION]

Temperature: Custom Temperature Override (if specified) OR Extension Popup System-Wide Temperature
```

**NEW**: Custom templates now include temperature slider for per-template creativity control.

## Anti-Disclosure Instruction

Appended to all prompts (except Image Gen):

```
CRITICAL: You are responding as a human Twitter/X user. Write ONLY the reply text itself. NEVER reveal you are an AI or explain your methodology. NEVER include meta-commentary like "Note: This response maintains neutrality by..." or "This approach uses..." or numbered explanations of your strategy. Do not break character or explain your reasoning. Respond naturally as if you are a real person engaging in conversation.
```

## Context Modes

Based on Extension Popup Context Mode setting:

### Thread Mode (Default)
```
Here is a Twitter conversation thread:
[Previous tweets in thread]
@[author]: [tweet being replied to]

Write a contextually relevant reply that continues this conversation naturally.
```

### Single Mode
```
Write a reply to this tweet: "[tweet text]"
```

### None Mode
```
Write an engaging tweet reply.
```

## Temperature Control

### System-Wide Default
- Set in Extension Popup
- Applied to all tabs except Custom (when overridden)
- Default: 0.7

### Custom Tab Override
- NEW: Per-template temperature control
- Slider in Custom tab creation form
- Range: 0.1 (focused) to 1.0 (creative)
- Stored with each custom template

## Implementation Files

### Core Architecture
- `src/services/promptArchitecture.ts` - Central prompt construction logic
- `src/services/openRouter.ts` - Integration with OpenRouter API

### UI Components
- `src/popup/popup-simple.ts` - Extension popup with system-wide settings
- `src/content/unifiedSelector.ts` - 6-tab AI interface with Custom temperature

### Configuration
- `.env` - Environment variables for defaults
- `src/config/` - Modular configuration files

## Comprehensive Logging

All prompt construction is logged with:
- Tab type identification
- System-wide settings
- Tab-specific configurations
- Custom temperature overrides
- Final prompt lengths
- Truncated previews for debugging

## Usage Example

```typescript
const config: PromptConfiguration = {
  // System-wide settings from Extension Popup
  systemPrompt: "I'm a helpful tech enthusiast",
  temperature: 0.7,
  contextMode: 'thread',
  
  // Tab identification
  tabType: 'custom',
  
  // Custom tab configuration
  customConfig: {
    style: "Ask thoughtful follow-up questions",
    tone: "Be genuinely curious and encouraging",
    length: "Keep it concise - 1-2 sentences",
    temperature: 0.5 // Override for more focused responses
  },
  
  // Context from Twitter
  context: {
    tweetText: "Just launched my new app!",
    authorHandle: "johndoe",
    threadContext: []
  }
};

const systemPrompt = PromptArchitecture.buildSystemPrompt(config);
const userPrompt = PromptArchitecture.buildUserPrompt(config);
const temperature = PromptArchitecture.getTemperature(config);
```

## Key Benefits

1. **Consistency**: All tabs follow the same architectural pattern
2. **Flexibility**: Custom templates can override temperature
3. **Clarity**: Clear separation between system/user prompts
4. **Debugging**: Comprehensive logging at every stage
5. **Security**: Anti-disclosure prevents AI self-revelation
6. **Context-Aware**: Adapts based on thread/single/none modes
7. **User Control**: System-wide prompt applied consistently

## Future Enhancements

- [ ] Per-persona temperature settings (if needed)
- [ ] Advanced context modes (quote tweets, media analysis)
- [ ] Dynamic prompt optimization based on usage patterns
- [ ] A/B testing for prompt effectiveness