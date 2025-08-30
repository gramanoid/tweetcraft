# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## IMPORTANT: Core Development Principles

**BUILD FOR CONSUMERS, NOT ENTERPRISES**
- This is a consumer product - prioritize user experience and speed
- Avoid enterprise patterns (factories, dependency injection, excessive abstraction layers)
- Complex features are fine, but implement them directly and clearly
- Skip unnecessary ceremonies - no need for interfaces when a simple function works
- Choose pragmatic solutions over "best practices" from enterprise software
- If the code is readable and works reliably, ship it

## Repository Overview

This repository contains TweetCraft - an AI-powered Twitter/X reply generator Chrome extension with OpenRouter integration, template+tone system, custom templates with variables, and thread context awareness. Current version: 0.0.9 Enhanced Template System

## Project Structure

The repository is a single Chrome extension project built with TypeScript, Webpack, and Chrome Manifest V3:
- BYOK (Bring Your Own Key) architecture
- Custom prompt system for personalization  
- Multiple tone presets for quick reply generation
- Thread context awareness and caching

## Development Commands

```bash
npm install              # Install dependencies
npm run dev             # Development build with watch mode
npm run build           # Production build
npm run lint            # Run ESLint
npm run type-check      # TypeScript type checking
npm run clean           # Clean build directory

# Common workflow:
npm run clean && npm run build  # Clean rebuild for production
```

### Loading the Extension in Chrome
1. Build the extension: `npm run build`
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" (top right)
4. Click "Load unpacked"
5. Select the `dist` folder
6. Configure your OpenRouter API key in the extension popup

### Testing the Extension
1. Navigate to twitter.com or x.com
2. Click reply on any tweet
3. Look for the "AI Reply" button in the reply toolbar
4. Check browser console for debug logs (extension uses structured, color-coded logging)

## Architecture Patterns

### Chrome Extension Architecture
All browser extensions follow Chrome Manifest V3 structure:
- **Service Worker** (`serviceWorker.js` or `service-worker.js`) - Background script handling extension lifecycle
- **Content Scripts** (`contentScript.js` or `content.js`) - Injected into Twitter/X pages
- **Popup/Options** - UI for extension settings and interactions
- **Manifest** (`manifest.json`) - Extension configuration

### Extension Architecture Patterns
1. **OpenRouter Integration**: Uses OpenRouter API for multiple LLM access
2. **Twitter DOM Manipulation**: Content scripts interact with Twitter's DOM structure
3. **Storage API**: Chrome storage API for persisting user settings and API keys
4. **Message Passing**: Communication between content scripts, service workers, and popup
5. **Instance Management**: Singleton pattern prevents multiple content script instances
6. **Memory Management**: WeakSet for DOM references, proper cleanup on navigation
7. **Debounced Operations**: Performance optimization for DOM mutations and API calls

### Tech Stack
- **Build Tool**: Webpack with TypeScript loader and SCSS support
- **Framework**: Vanilla TypeScript (no React/Vue)
- **Language**: TypeScript with strict type checking
- **Styling**: SCSS with CSS extraction

## Key Files to Understand

### Core Extension Files
- `public/manifest.json` - Chrome extension configuration and permissions
- `src/content/contentScript.ts` - Main DOM manipulation and button injection with singleton pattern
- `src/content/domUtils.ts` - Twitter DOM helpers and context extraction
- `src/content/toneSelector.ts` - Visual tone selection interface
- `src/content/presetTemplates.ts` - Reply template system
- `src/content/replyCarousel.ts` - Multiple suggestion carousel UI
- `src/content/suggestionCarousel.ts` - Additional carousel functionality
- `src/background/serviceWorker.ts` - Background script for message handling
- `src/services/openRouter.ts` - OpenRouter API integration
- `src/services/storage.ts` - Chrome storage API wrapper
- `src/services/cache.ts` - Session-based response caching
- `src/popup/popup-simple.ts` - Extension settings UI (simplified version)
- `src/popup/popup.ts` - Full popup UI implementation
- `src/utils/urlCleaner.ts` - Privacy-focused URL tracking parameter removal
- `src/utils/debounce.ts` - Performance optimization utilities
- `src/utils/memoryManager.ts` - Memory leak prevention and cleanup
- `src/utils/errorHandler.ts` - Error handling and recovery
- `src/types/index.ts` - TypeScript type definitions

### Build Configuration
- `build/webpack.common.js` - Shared webpack configuration
- `build/webpack.dev.js` - Development build configuration  
- `build/webpack.prod.js` - Production build configuration

## Testing Approach

The TweetCraft extension currently has no automated tests. Testing is done manually:
- Load unpacked extension in Chrome  
- Test on both twitter.com and x.com
- Verify all 12 tone presets generate different responses
- Test thread context extraction (up to 4 tweets)
- Verify API key validation and model fetching
- Check URL tracking parameter removal
- Test multiple suggestion carousel functionality
- Verify preset template system works correctly

## Security Considerations

- API keys are stored in Chrome storage or environment variables
- Extensions require specific permissions for Twitter domains
- Most extensions interact with Twitter's DOM which may break with Twitter UI updates

## Development Tips

1. When modifying extensions, always rebuild and reload the extension in Chrome
2. Check browser console for content script errors (TweetCraft uses color-coded logs)
3. Use Chrome DevTools for debugging service workers (chrome://extensions → Service Worker link)
4. Twitter's DOM structure changes frequently - verify selectors still work
5. Test with both twitter.com and x.com domains
6. Extension context can become invalidated - reload extension if seeing "Extension context invalidated" errors
7. Use the structured console logging for debugging (🔍 CONFIG, 🎯 TONE, 🧵 THREAD, etc.)
8. Session storage is used for caching - clears on browser restart
9. The extension uses a debounced mutation observer to reduce CPU usage
10. **Singleton Pattern**: Content script uses singleton pattern to prevent multiple instances - look for `__smartReplyInstance` global
11. **Hot Reloading**: Use `npm run dev` for development builds with watch mode
12. **Memory Management**: Extension implements comprehensive cleanup with `WeakSet` for DOM references

## Console Logging Standards

**MANDATORY FOR ALL NEW FEATURES**
Every new feature must include comprehensive console logging following these standards:

### Logging Requirements
1. **Use Color-Coded Headers** with emojis for visual scanning
   - Entry points: Bold, 14px font size
   - Sub-sections: Bold without size override
   - Details: Normal weight, #657786 color
   
2. **Structured Format**:
   ```javascript
   console.log('%c🚀 FEATURE NAME', 'color: #1DA1F2; font-weight: bold; font-size: 14px');
   console.log('%c  Property:', 'color: #657786', value);
   console.log('%c  Details:', 'color: #657786', { structured: data });
   ```

3. **Color Palette**:
   - `#1DA1F2` - Primary actions (Twitter blue)
   - `#17BF63` - Success states (green)
   - `#DC3545` - Errors/failures (red)
   - `#FFA500` - Warnings/missing data (orange)
   - `#9146FF` - Data transmission (purple)
   - `#FF6B6B` - Processing/building (coral)
   - `#657786` - Details/metadata (gray)

4. **Required Logging Points**:
   - Feature entry point (when activated)
   - User input/selection received
   - Data transformation/processing
   - API calls (before and after)
   - Success/failure states
   - Any cached data usage

5. **Data Formatting**:
   - Truncate long strings: `text.substring(0, 100) + '...'`
   - Group related data with separator lines
   - Use hierarchical indentation for nested data
   - Include counts/lengths for arrays and strings

6. **Example Separators**:
   ```javascript
   console.log('%c════════════════════════════════', 'color: #2E3236');  // Section divider
   console.log('%c────────────────────────────────', 'color: #E1E8ED');  // Sub-section
   ```

### Current Logging Examples
- **Tone Selection**: `🎯 TONE SELECTION`, `🔄 TONE CHANGE`, `➕/➖ MODIFIER`
- **Content Script**: `📤 CONTENT SCRIPT RECEIVED`, `🔧 PROCESSING`
- **OpenRouter**: `🚀 OPENROUTER SERVICE`, `💾 CACHE HIT/MISS`
- **API Calls**: `📤 SENDING TO API`, `✅ SUCCESS`, `❌ ERROR`
- **Building**: `🔨 BUILDING MESSAGES`, `📦 REQUEST PACKAGE`

### Why This Matters
- **Debugging**: Quickly identify where issues occur in the flow
- **Verification**: Confirm frontend selections reach the backend
- **Performance**: Track cache hits, API calls, and processing time
- **User Support**: Understand user actions when troubleshooting

This logging standard ensures maintainability and makes the extension's behavior transparent during development and debugging.

## Current Features (v0.0.8)

### Core Functionality
- OpenRouter integration for any LLM (GPT-4, Claude, Gemini, Llama, etc.)
- BYOK (Bring Your Own Key) architecture - users provide their own API key
- **12 diverse tone presets**: Professional, Casual, Witty, Supportive, Excited, Academic, Counter, Skeptic, Sarcastic, Spicy, Dismissive, Custom
- Default tone selector for keyboard shortcuts
- Custom system prompt for personalization
- Thread context extraction (up to 4 tweets total)
- Context mode selector (None/Single/Thread)
- Temperature control slider (0.1-1.0 for creativity)
- Session-based response caching to reduce API calls
- URL tracking parameter stripping for privacy
- API key validation and masking in UI
- Dynamic model fetching from OpenRouter
- Unlimited token output (no truncation)

### MVP Implementation Features
- **Multiple Reply Suggestions**: Generate 3 variations in parallel with carousel UI
- **Preset Reply Templates**: 12+ tone-agnostic templates (Ask Question, Add Value, Share Experience, etc.)
- **Visual Emoji Tone Selector**: Expandable grid UI with 12 tone options
- **Enhanced Memory Management**: Comprehensive resource tracking and cleanup
- **Custom Template Creator**: Create and save your own reply templates
- **Tone-Template Separation**: Clear distinction between personality (tones) and structure (templates)
- **Improved Console Logging**: Detailed breakdown of tone/template combination

### Keyboard Shortcut
- **Alt+Q**: Generate AI reply using default tone from settings

### Technical Features
- Chrome Manifest V3 compliant
- TypeScript with strict type checking
- Webpack build system with dev/prod configs
- SCSS for enhanced styling
- Debounced DOM operations for performance
- Proper SPA navigation handling
- Memory leak prevention with cleanup
- Beautiful structured console logging

### Latest Enhancements (v0.0.8)
- **Enhanced Loading States**: Multi-stage progress indicators with animations, time estimates, and cancel button
- **Expanded Keyboard Shortcuts**: Alt+1-9 for tones, Alt+Q for quick generate, Alt+R to regenerate, Alt+C to copy
- **Instant Button Appearance**: Reduced delay from 1.5s to 0.1s for immediate UI response
- **Auto-Close Dropdown**: Tone selector automatically closes after selection
- **Cleaner Loading Text**: Shortened "Generating AI Reply..." to "Generating..." for single-line display
- **DOM Cache Utility**: Performance optimization for frequently accessed DOM elements
- **Memory Leak Prevention**: Proper event listener cleanup and management

## Known Issues

- Twitter DOM structure changes may break button injection
- Service worker appears "Inactive" in Chrome (normal for Manifest V3)
- Extension context can become invalidated on reload (requires extension reload)
- Rate limiting depends on OpenRouter account tier
- **Architecture Files**: Multiple `.mermaid` architecture diagrams exist representing planned future features

## Critical Implementation Notes

### Text Insertion for Twitter/X (IMPORTANT - DO NOT CHANGE)
Twitter uses contentEditable divs, not regular textareas. The text insertion implementation in `domUtils.ts` is carefully crafted to work with Twitter's React-based architecture:

1. **Primary Method: execCommand('insertText')** - Proven to work reliably with Twitter's contentEditable elements
2. **Fallback: Paste Event** - Used for non-contentEditable elements
3. **Event Dispatching** - Must use InputEvent with proper inputType for React recognition
4. **Cursor Positioning** - Place cursor at beginning before insertion to ensure proper placement

The working implementation flow:
```typescript
// 1. For contentEditable (Twitter's approach), use execCommand
if (textarea.contentEditable === 'true') {
  // Position cursor
  const selection = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(textarea);
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
  
  // Insert text
  document.execCommand('insertText', false, text);
  
  // Trigger React update
  const inputEvent = new InputEvent('input', { 
    inputType: 'insertText', 
    data: text 
  });
  textarea.dispatchEvent(inputEvent);
}
```

This approach has been tested and proven to work with Twitter's current implementation (Aug 2025).

## Build System Architecture

The project uses Webpack with a multi-config setup located in the `build/` directory:

### Webpack Configuration Structure
- **`build/webpack.common.js`** - Shared configuration for all environments
  - Entry points: contentScript, serviceWorker, popup
  - TypeScript compilation with ts-loader
  - SCSS processing with sass-loader and CSS extraction
  - Asset copying from `public/` to `dist/`
  - Path aliases (`@` -> `src/`)

- **`build/webpack.dev.js`** - Development configuration
  - Merges with common config
  - Watch mode enabled by default
  - Source maps for debugging

- **`build/webpack.prod.js`** - Production configuration  
  - Merges with common config
  - Optimized builds with minification
  - Code splitting for vendor dependencies

### Key Build Features
- **Clean builds**: Output directory cleared on each build
- **Asset copying**: Static files from `public/` copied to `dist/`
- **CSS extraction**: SCSS compiled and extracted to separate files
- **Code splitting**: Vendor dependencies separated into chunks
- **TypeScript compilation**: Strict type checking with source maps

## Documentation Maintenance Rules

**KEEP DOCUMENTATION CURRENT**
- Update CLAUDE.md whenever project structure changes significantly
- Update README.md after implementing major features or version releases
- Keep CHANGELOG.md updated with each version bump
- Document any new patterns or architectural decisions as they're made
- When context gets stale (>50 messages in conversation), proactively update docs
- Before starting a new development session, review and update relevant documentation
- Include current version number, latest features, and any known issues
- Documentation should be the single source of truth for the project state

## Current Implementation vs Future Roadmap

**Current Implementation (v0.0.9)**:
- Template + Tone system - separate selection of structure and personality
- 12+ preset reply templates (Ask Question, Add Value, Share Experience, etc.)
- 11 personality tones (Professional, Witty, Sarcastic, Academic, Spicy, etc.)
- Custom template creation with {variable} placeholders
- Dark mode UI matching Twitter/X interface
- Thread context extraction (up to 4 tweets)
- OpenRouter API integration with BYOK architecture
- Session-based response caching
- Comprehensive console logging for debugging
- Seamless template → tone selection flow

**Future Roadmap**:
Architecture diagrams represent a simplified, consumer-focused roadmap with 7 core features. The codebase is designed with simple, extensible architecture that avoids enterprise complexity while supporting focused consumer features like automated posting and basic analytics.