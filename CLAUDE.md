# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## ⚠️ DOCUMENTATION GUIDELINE
**Keep documentation clear and organized.** When updating:
- Add new features/changes in the appropriate section
- Remove outdated information
- Keep explanations concise but complete
- Maintain a balance between brevity and comprehensiveness

## Core Development Principles

**BUILD FOR CONSUMERS, NOT ENTERPRISES**
- This is a consumer product - prioritize user experience and speed
- Avoid enterprise patterns (factories, dependency injection, excessive abstraction layers)
- Choose pragmatic solutions over "best practices" from enterprise software
- If the code is readable and works reliably, ship it

## Repository Overview

**TweetCraft v0.0.18** - AI-powered Twitter/X and HypeFury reply generator Chrome extension

### Key Features
- **Multi-platform support**: Twitter/X + HypeFury with full feature parity
- **6-tab AI interface**: Personas, All, Smart, Favorites, Image Gen, Custom
- **Strategic prompt architecture**: Centralized prompt construction with validation
- **4-part template system**: 24 personalities, 11 vocabularies, 15 rhetoric approaches, 6 pacing options
- **Smart Defaults & Quick Generate**: Space bar for instant generation with learned patterns
- **Arsenal Mode**: IndexedDB storage with 6 categories and usage tracking
- **Keyboard shortcuts**: Alt+1-9 for tones, Alt+Q/R/T/S/C/E for actions, Space for quick generate
- **Image context support**: Vision model integration for analyzing images in tweets
- **Thread context awareness**: Analyzes up to 4 tweets for context
- **Network resilience**: Offline queuing, adaptive timeouts, race condition prevention

### Current Version Status
- Version: 0.0.18
- Branch: main (recent merges from feature branches)
- **API Key**: Hardcoded in `src/config/apiConfig.ts` (personal use only - DO NOT COMMIT to public repos)

## Quick Start

```bash
# Development
npm install         # Install dependencies
npm run dev         # Development build with watch mode

# Production
npm run build       # Production build
npm run clean && npm run build  # Clean rebuild

# Testing
npm run test        # Run Jest tests
npm run test:watch  # Tests in watch mode
npm run lint        # ESLint
npm run type-check  # TypeScript checking

# Load Extension
# 1. Build: npm run build
# 2. Open chrome://extensions/
# 3. Enable "Developer mode"
# 4. Click "Load unpacked" and select /dist folder
```

## Architecture Overview

### Key Files and Services

```
src/
├── services/
│   ├── promptArchitecture.ts    # Central prompt construction (ALL TABS)
│   ├── openRouter.ts            # API integration with OpenRouter
│   ├── smartDefaults.ts         # Usage pattern learning
│   ├── arsenalService.ts        # IndexedDB storage
│   ├── templateSuggester.ts     # LLM-first smart suggestions
│   └── visionService.ts         # Image analysis pipeline
├── content/
│   ├── contentScript.ts         # Main content script (singleton)
│   ├── unifiedSelector.ts       # 6-tab UI component
│   └── domUtils.ts              # DOM manipulation (DO NOT MODIFY insertion logic)
├── utils/
│   ├── promptConfigValidator.ts # Configuration validation
│   ├── keyboardShortcuts.ts     # Keyboard handling
│   └── memoryManager.ts         # WeakMap/WeakSet cleanup
└── config/
    ├── apiConfig.ts             # API key storage (SENSITIVE)
    ├── personalities.ts         # 24 personality definitions
    ├── vocabulary.ts            # 11 vocabulary styles
    ├── rhetoric.ts              # 15 rhetorical approaches
    └── lengthPacing.ts          # 6 length/pacing options
```

### Prompt Architecture (CRITICAL)

The system uses strict validation for all tab configurations:

#### Tab Requirements
- **PERSONAS**: Requires `personaConfig` with all fields + systemPrompt
- **ALL**: Requires `allTabConfig` (personality, vocabulary, rhetoric, lengthPacing)
- **SMART**: Requires `allTabConfig` (shares ALL tab structure) - throws error if missing
- **FAVORITES**: Requires `allTabConfig` (saved from ALL tab) - throws error if missing
- **IMAGE_GEN**: No configuration required (returns empty prompts)
- **CUSTOM**: Requires `customConfig` with style, tone, length fields
- **Invalid tabs**: Throws descriptive error with list of valid tab types

#### Key Features
- Strict validation with descriptive errors (no silent failures)
- Image context inclusion in user prompts
- Temperature override for Custom templates
- Helper function `buildAllTabSystemPrompt` for code reuse
- Anti-disclosure instructions to prevent AI from revealing its nature
- Configuration validator utility for pre-validation

### Critical Implementation Notes

#### Text Insertion for Twitter/X (DO NOT MODIFY)
```javascript
// Twitter uses contentEditable divs - this approach is tested and proven
if (textarea.contentEditable === 'true') {
  // Position cursor at beginning
  const selection = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(textarea);
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
  
  // Insert text using execCommand
  document.execCommand('insertText', false, text);
  
  // Trigger React update
  const inputEvent = new InputEvent('input', { 
    inputType: 'insertText', 
    data: text 
  });
  textarea.dispatchEvent(inputEvent);
}
```

#### Console Logging Standard
```javascript
console.log('%c🚀 FEATURE NAME', 'color: #1DA1F2; font-weight: bold; font-size: 14px');
console.log('%c  Property:', 'color: #657786', value);

// Color Palette:
// #1DA1F2 - Primary actions (Twitter blue)
// #17BF63 - Success (green)
// #DC3545 - Errors (red)
// #FFA500 - Warnings (orange)
// #657786 - Details (gray)
```

## Testing Requirements

### Platform Testing
- Test on twitter.com, x.com, and app.hypefury.com
- Verify all template/tone combinations work
- Check "Generating..." loading states
- Test keyboard shortcuts (Alt+1-9, Space for Quick Generate)

### Console Monitoring
- Check for structured, color-coded logging
- Verify no errors during normal operation
- Monitor API response times

## Common Issues and Solutions

| Issue | Solution |
|-------|----------|
| Extension context invalidated | Reload extension in chrome://extensions |
| DOM elements not found | Check selector fallbacks (4+ strategies per selector) |
| API errors | Verify OpenRouter credits and API key |
| Text not inserting | Twitter UI may have changed - check domUtils.ts |
| Smart/Favorites tab errors | Ensure allTabConfig is provided |

## Recent Changes (v0.0.16)

### Prompt Architecture Enhancements
- ✅ Strict validation for Smart/Favorites tabs (throw on missing allTabConfig)
- ✅ Image context inclusion in user prompts for vision models
- ✅ Default case for invalid tab types with descriptive errors
- ✅ Helper function to reduce code duplication (ALL/SMART/FAVORITES)
- ✅ Configuration validator utility class for pre-validation
- ✅ UnifiedSelector provides complete allTabConfig with defaults
- ✅ Comprehensive integration tests for prompt flow
- ✅ Enhanced error messages with recovery suggestions

### Visual Hierarchy & UX Improvements
- ✅ **Visual Hierarchy Color Coding** - Category-based colors for rhetoric (4) and personalities (5)
- ✅ **Frequency-based Prominence** - Popular items scale 1.03x with bolder fonts
- ✅ **Smart Dimming** - Rarely-used items at 85% opacity until hover
- ✅ **Popup Size Memory** - Remembers user's preferred selector size via localStorage
- ✅ **Resize Observer** - Auto-saves size changes with 500ms debounce
- ✅ **Visual Resize Handle** - Corner indicator for resize capability
- ✅ **Persistent Selection Bar** - Shows current selections across all tabs
- ✅ **Quick Presets Section** - Top 3 most-used combinations as single-click buttons
- ✅ **Smart Defaults Button** - Applies intelligent defaults based on usage patterns

### Code Quality Improvements
- ✅ **Centralized Constants** - All magic numbers extracted to `config/constants.ts`
- ✅ **Enhanced Logger** - Compact mode with truncation and color coding
- ✅ **API Key Security** - Proper environment variable usage with build-time injection

## Service Worker Message Types

```javascript
// Configuration
GET_CONFIG / SET_CONFIG         // Configuration management
GET_API_KEY / SET_API_KEY       // API key management
GET_STORAGE / SET_STORAGE       // Generic storage (CSP compliance)

// Generation
GENERATE_REPLY                  // Main reply generation
ANALYZE_IMAGES                  // Vision analysis
TEST_API_KEY                    // Validate API key

// Analytics
RESET_USAGE_STATS              // Reset usage counters
GET_LAST_TONE / SET_LAST_TONE  // Tone preferences
```

## BulkCraft (Pending Integration)

Separate feature in `/bulkcraft` directory for bulk content generation:
- CSV analysis for viral patterns
- AI-powered content generation
- Trend research and competitor analysis
- Viral prediction scoring

## Development Guidelines

1. **Before Committing**:
   - Test on all platforms (Twitter/X, HypeFury)
   - Run `npm run lint` and `npm run type-check`
   - Update version in manifest.json and package.json
   - Ensure API key is not exposed

2. **When Adding Features**:
   - Follow existing patterns (singleton content script, message passing)
   - Add structured console logging
   - Include error handling with recovery
   - Update this documentation

3. **Code Quality**:
   - Use TypeScript strict mode
   - Add proper type definitions
   - Follow memory management patterns (WeakMap/WeakSet)
   - Implement proper cleanup on navigation

4. **Performance**:
   - Use debounced operations (100ms for DOM mutations)
   - Implement caching where appropriate
   - Batch API requests when possible
   - Monitor memory usage

## Recent Changes (v0.0.18)

### UI/UX Enhancements  
- ✅ **Smart Suggestions Scoring** - Visual score badges (1-10) with detailed breakdown
- ✅ **Dynamic Popup Sizing** - Responsive width/height with manual resize handle
- ✅ Auto-populate Favorites Tab - Shows top 5 combinations or defaults when empty
- ✅ Expanded View Mode - Power user mode with transparency, docking, and keyboard navigation
- ✅ Section Completion Indicators with checkmarks and progress bar
- ✅ Visual hierarchy with category-based color coding
- ✅ Popup size memory with ResizeObserver and manual handle
- ✅ Auto-height adjustment based on content
- ✅ Responsive breakpoints with proper constraints
- ✅ Fixed Vision API with updated OpenRouter model IDs

## Known Issues

- Service worker shows "Inactive" in Chrome extensions page (normal for Manifest V3)
- Rate limiting depends on OpenRouter account tier
- Twitter DOM structure changes may break selectors (mitigated with fallbacks)