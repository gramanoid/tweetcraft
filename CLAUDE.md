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

## 🎯 UX/UI TRANSFORMATION PROJECT

**CRITICAL**: This project is undergoing a comprehensive 7-phase UX/UI transformation. See `UX_UI_TRANSFORMATION_REPORT.md` in the root folder for complete context, tasks, and recovery information.

**KEY CONSTRAINTS:**
- ALL 24 personalities must be preserved (including negative ones) - explicitly required
- Use TwitterAPI.io (NOT expensive official Twitter API) for analytics
- Each phase = new git version with proper commits for rollback capability
- Each task completion requires individual commit with comprehensive documentation

**CURRENT STATUS:** Phase 1 (Smart Tab Resurrection) - fixing OpenRouter integration issues

### **🚨 CRITICAL SUCCESS FACTORS**
**READ THIS EVERY SESSION**: Essential requirements for transformation success

#### **NON-NEGOTIABLE CONSTRAINTS**
1. **ALL 24 personalities MUST be preserved** (including negative ones) - user explicitly required
2. **Use TwitterAPI.io ONLY** (not expensive official Twitter API) for all analytics
3. **Each task = individual git commit** with rollback capability
4. **Test ALL platforms** (Twitter/X, HypeFury) before any commit
5. **Never break existing functionality** - maintain backward compatibility

#### **SAFETY PROTOCOLS**
- **Before ANY code changes**: Run `npm run build && npm run lint && npm run type-check`
- **Before ANY commit**: Test extension reload and verify no console errors
- **API Key Security**: NEVER commit API keys - only use .env with webpack DefinePlugin
- **Rollback Ready**: Each commit must be a complete, working state
- **Documentation Sync**: Update both documents after EVERY task completion

#### **QUALITY GATES**
- ✅ Extension builds successfully
- ✅ No TypeScript or ESLint errors
- ✅ All platforms (Twitter/X, HypeFury) working
- ✅ No console errors in browser DevTools
- ✅ All template combinations still functional
- ✅ Keyboard shortcuts still working (Alt+1-9, Space, etc.)
- ✅ Documentation updated before commit

### **📋 PRE-IMPLEMENTATION VALIDATION**
**COMPLETE BEFORE STARTING PHASE 1**: Verify all prerequisites are in place

#### **Environment Setup**
- [ ] .env file exists with OpenRouter API key
- [ ] `npm install` completed successfully  
- [ ] `npm run build` runs without errors
- [ ] Extension loads in Chrome without errors
- [ ] All platforms accessible (Twitter/X, HypeFury)

#### **Documentation Readiness**
- [ ] UX_UI_TRANSFORMATION_REPORT.md contains complete context
- [ ] Memory reset recovery section comprehensive
- [ ] All 32 tasks and 128+ subtasks documented
- [ ] Git workflow and commit standards defined
- [ ] Success metrics and KPIs clearly defined

#### **Architecture Understanding**
- [ ] Core files identified: unifiedSelector.ts, promptArchitecture.ts, arsenalMode.ts
- [ ] API integration points mapped: OpenRouter, TwitterAPI.io requirements
- [ ] Extension patterns understood: Manifest V3, service worker messaging
- [ ] Critical constraint confirmed: ALL 24 personalities preserved

#### **Implementation Strategy**
- [ ] Phase 1 priority confirmed: Smart tab resurrection
- [ ] Task order validated: OpenRouter fixes → fallbacks → defaults → suggestions
- [ ] Rollback strategy tested: git reset procedures documented
- [ ] Quality gates established: build + lint + test before commit

### **⚠️ RISK MITIGATION & CONTINGENCY PLANNING**
**ANTICIPATE THESE COMMON ISSUES**: Prepare for likely obstacles during implementation

#### **Technical Risks**
- **Bundle Size Growth**: contentScript.js already 495KB (warning threshold 244KB)
  - *Mitigation*: Implement code splitting and lazy loading during Phase 1
  - *Trigger*: If bundle exceeds 600KB, stop and refactor immediately
- **API Rate Limiting**: OpenRouter/TwitterAPI.io may have usage limits
  - *Mitigation*: Implement request queuing and circuit breakers in Task 1.6/1.7
  - *Trigger*: If >10% API failures, pause and add throttling
- **Chrome Extension Manifest V3 Changes**: Google may update requirements
  - *Mitigation*: Monitor Chrome extension developer updates
  - *Trigger*: Extension rejection → immediate compatibility review

#### **UX Risks** 
- **Choice Paralysis Persists**: Progressive disclosure may not solve core problem
  - *Mitigation*: A/B test with real users after Phase 2
  - *Trigger*: If user feedback doesn't improve, revisit approach
- **Power Users Revolt**: Simplification may anger advanced users
  - *Mitigation*: Expanded view mode and keyboard shortcuts preserved
  - *Trigger*: Negative feedback → enhance power user features
- **Performance Degradation**: 24,750 combinations may cause UI lag
  - *Mitigation*: Virtualization and intelligent caching
  - *Trigger*: >500ms render time → optimize immediately

#### **Project Risks**
- **Scope Creep**: 7 phases may expand beyond original scope
  - *Mitigation*: Phase gates with go/no-go decisions
  - *Trigger*: Phase takes >50% longer than estimate → reassess
- **Memory Reset Issues**: Context loss between sessions
  - *Mitigation*: Comprehensive documentation (completed)
  - *Trigger*: Key information missing → update recovery section

## Repository Overview

**TweetCraft v0.0.19** - AI-powered Twitter/X and HypeFury reply generator Chrome extension

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
- Version: 0.0.19
- Branch: feature/test-new-feature (architectural improvements)
- **API Key**: Managed via .env file with webpack DefinePlugin (NEVER hardcode keys)

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

## UI Features & Controls

### Expanded View Toggle Button (⊞/⊟)
- **Location**: Left of the Quick Generate button in the header
- **Function**: Toggles between normal view and Expanded View for power users
- **Icon States**: 
  - ⊞ = Click to expand (normal view active)
  - ⊟ = Click to collapse (expanded view active)
- **Expanded View Features**:
  - Shows ALL options at once (Personas, Personalities, Vocabulary, Rhetoric, Length)
  - Transparency slider: Adjust popup opacity (70%-100%)
  - Docking options: Float, dock left, or dock right
  - Keyboard navigation support for rapid selection
  - Ideal for power users who want to see everything at once

### Quick Generate Button (⚡)
- **Location**: Next to the Expanded View button
- **Function**: Instantly generate with last used settings
- **Shortcut**: Space bar
- **Uses smart defaults based on usage patterns

## Common Issues and Solutions

| Issue | Solution |
|-------|----------|
| Extension context invalidated | Reload extension in chrome://extensions |
| DOM elements not found | Check selector fallbacks (4+ strategies per selector) |
| API errors | Verify OpenRouter credits and API key |
| Text not inserting | Twitter UI may have changed - check domUtils.ts |
| Smart/Favorites tab errors | Ensure allTabConfig is provided |

## Recent Changes (v0.0.19)

### Architectural Security & Consistency Improvements
- ✅ **API Key Management**: All keys provided at runtime only via webpack DefinePlugin (never bundled into build artifacts)
- ✅ **Type-Safe Messaging**: Replaced string literals with MessageType enum throughout
- ✅ **Complete Data Cleanup**: CLEAR_DATA now removes both chrome.storage AND IndexedDB
- ✅ **API Validation**: Implemented real OpenRouter API key validation (was stub)
- ✅ **UI Integration**: Added Clear Data and Validate Key buttons to popup
- ✅ **Future-Ready**: Added SUGGEST_TEMPLATE and GENERATE_IMAGE message types (experimental/planned features)

## Previous Changes (v0.0.18)

### Vision API Fixes
- ✅ Fixed "Failed to extract image(s)" error
- ✅ Images now converted to base64 in content script (has Twitter auth)
- ✅ Service worker receives pre-converted base64 images
- ✅ Full compatibility with OpenRouter Vision API

### Bug Fixes
- ✅ Fixed orphaned button false positive detection
- ✅ Fixed Vision API response handling (content vs data)
- ✅ Updated version number across all files

## Previous Changes (v0.0.16)

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
MessageType.GET_CONFIG / SET_CONFIG         // Configuration management
MessageType.GET_API_KEY / SET_API_KEY       // API key management  
MessageType.GET_STORAGE / SET_STORAGE       // Generic storage (type-safe)
MessageType.VALIDATE_API_KEY                // Real API validation ✅
MessageType.CLEAR_DATA                      // Clears ALL data (storage + IndexedDB) ✅
MessageType.TEST_API_KEY                    // Test API connection
MessageType.FETCH_MODELS                    // Fetch available models from OpenRouter

// Generation
MessageType.GENERATE_REPLY                  // Main reply generation
MessageType.ANALYZE_IMAGES                  // Vision analysis
MessageType.SUGGEST_TEMPLATE                // Template suggestions (future - no handler yet)
MessageType.GENERATE_IMAGE                  // Image generation (future - no handler yet)

// Analytics
MessageType.RESET_USAGE_STATS              // Reset usage counters ✅
MessageType.GET_LAST_TONE / SET_LAST_TONE  // Tone preferences
MessageType.FETCH_TRENDING_TOPICS          // Exa trending topics
```

**IMPORTANT**: Always import and use the MessageType enum from `src/types/messages.ts` instead of string literals for type safety.

## BulkCraft (Pending Integration)

Separate feature in `/bulkcraft` directory for bulk content generation:
- CSV analysis for viral patterns
- AI-powered content generation
- Trend research and competitor analysis
- Viral prediction scoring

## Development Guidelines

### 📊 Task Progress Documentation Requirements

**IMPORTANT**: Update UX_UI_TRANSFORMATION_REPORT.md after EVERY completed subtask
- Mark completed tasks with ✅ and date (YYYY-MM-DD)
- Update "CURRENTLY IN PROGRESS" section with active task
- Move completed tasks to "COMPLETED TASKS" section
- Each subtask completion = immediate document update
- This ensures continuity across Claude memory resets

## 📜 UX/UI TRANSFORMATION GIT WORKFLOW

### **PHASE-BASED VERSION CONTROL**
- **Each Phase = New Version**: v0.1.0 (Phase 1), v0.2.0 (Phase 2), etc.
- **Each Task = Individual Commit**: Granular commits for safe rollback capability
- **Feature Branches**: Create branch per phase, merge after completion
- **Git Tags**: Tag each phase completion for easy reference

### **COMMIT MESSAGE STANDARD**
```
[PHASE-X.TASK-Y.Z]: Brief description

Detailed changes:
- Specific change 1
- Impact and testing notes

Files: src/path/file.ts, src/path/style.scss
Breaking: None
Rollback: Safe to previous commit
```

### **TESTING BEFORE EACH COMMIT**
- All platforms (Twitter/X, HypeFury) working
- No console errors or build failures  
- Template combinations functioning
- Keyboard shortcuts operational

### **CRITICAL DOCUMENTATION MAINTENANCE**
**MANDATORY**: After EVERY task completion, update the following in exact order:

#### **1. UX_UI_TRANSFORMATION_REPORT.md Updates**
- Update "IMPLEMENTATION STATUS TRACKING" → "COMPLETED TASKS" section with:
  - ✅ Task name and completion date
  - Brief description of what was accomplished
- Update "CURRENTLY IN PROGRESS" section (remove completed, add new in-progress)
- Update "DOCUMENT UPDATE LOG" at bottom with new entry
- If any architecture changes, update "MEMORY RESET Recovery" section

#### **2. CLAUDE.md Updates** 
- Update "Recent Changes" section with task completion details
- Update version status if phase completed
- Add any new Known Issues discovered during implementation
- Update "Current Version Status" if version numbers changed

#### **3. TodoWrite Tool Updates**
- Mark completed task as "completed" with activeForm showing accomplishment
- Mark next task as "in_progress" before starting work
- Keep todo list synchronized with actual work progress

#### **4. Code Documentation**
- Add inline comments for new functions/classes with JSDoc format
- Document any new API message types in src/types/messages.ts
- Update README sections if major functionality added
- Document breaking changes and migration notes

#### **5. Git Commit Documentation**
- Use exact commit format: `[PHASE-X.TASK-Y.Z]: Brief description`
- Include file list, breaking changes, rollback notes
- Tag phase completions: `git tag v0.X.0 -m "Phase X: Description"`

## Development Guidelines

1. **Before Committing**:
   - Test on all platforms (Twitter/X, HypeFury)
   - Run `npm run lint` and `npm run type-check`
   - Run `npm run build` to validate all changes
   - Update version in manifest.json, package.json, and src/config/version.ts
   - Verify API keys are ONLY in .env file, never in source code
   - Verify no secrets or API keys appear in dist/ (scan build output for common secret patterns)
   - Use MessageType enum from `src/types/messages.ts` for all message passing

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
- Twitter DOM structure changes may break selectors (mitigated with fallbacks) - **Owner:** Frontend Team | **Tracking:** [#DOM-001](https://github.com/gramanoid/tweetcraft/issues) | **Priority:** Medium | **ETA:** Q1 2025
- Some services (templateSuggester, imageService) still make direct API calls (to be migrated) - **Owner:** Backend Team | **Tracking:** [#API-002](https://github.com/gramanoid/tweetcraft/issues) | **Priority:** High | **ETA:** v0.0.20
- No secrets in dist/ - ensure build artifacts contain no credentials (temporary enforcement until CI rule implemented) - **Owner:** DevOps Team | **Tracking:** [#SEC-003](https://github.com/gramanoid/tweetcraft/issues) | **Priority:** Critical | **ETA:** Immediate