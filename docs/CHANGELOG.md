# Changelog

All notable changes to TweetCraft will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.5.0] - 2025-08-26

### 🎉 New Features

#### Multiple Reply Suggestions
- Generate 3 reply variations in parallel with different creativity levels (0.5, 0.7, 0.9)
- **NEW: Vertical list display** showing all 3 suggestions simultaneously (redesigned from carousel)
- Individual action buttons for each suggestion (Use, Regenerate, Edit, Copy)
- Inline editing capability for fine-tuning
- Keyboard shortcuts (1, 2, 3) for quick selection and use
- "3 Options" modifier in tone selector to trigger multi-suggestion mode
- Visual creativity indicators for each suggestion
- Dark mode optimized display with proper contrast

#### Preset Reply Templates
- 12+ built-in templates across 4 categories:
  - **Engagement**: Ask Question, Agree & Expand, Challenge Politely
  - **Value**: Add Value, Share Experience, Share Resource
  - **Conversation**: Show Support, Congratulate, Empathize
  - **Humor**: Add Humor, Witty Observation, Playful Tease
- Custom template creator with dialog UI
- Templates saved to Chrome storage for persistence
- Expandable UI with quick access bar
- Full integration with tone selector

#### Visual Emoji Tone Selector
- Grid-based UI with expandable tone selection (6 default, 12 total)
- **12 diverse tone options** including:
  - Positive: Professional 💼, Casual 😊, Witty 😄, Supportive 🤗, Excited 🎉, Academic 🎓
  - Challenging: Counter 🤔, Skeptic 🤨, Sarcastic 😏, Spicy 🔥, Dismissive 🙄
  - Custom ✨ with user-defined prompts
- Quick mood modifiers (3 Options, Question, Emojis, Shorter, Longer)
- Visual feedback with hover and active states
- Clear separation between tone (personality) and templates (structure)

#### Enhanced Memory Management
- Comprehensive MemoryManager class with singleton pattern
- Event listener tracking with unique IDs
- MutationObserver tracking and cleanup
- Timer and interval tracking with automatic cleanup
- AbortController tracking for fetch requests
- Custom cleanup callbacks registration
- Memory usage statistics reporting
- Auto-cleanup on page unload and navigation
- Development mode periodic stats logging

### 🐛 Bug Fixes
- **Fixed UI overflow issues in preset templates**:
  - Redesigned layout to use compact 3-column grid for quick access
  - Limited initial display to 6 presets to prevent overflow
  - Added compact emoji-only buttons for expanded view
  - Constrained all widths with proper box-sizing
- **Fixed contrast issues in dark mode**:
  - Changed all text colors from dark gray to light colors (#e7e9ea, #8b98a5)
  - Updated backgrounds to dark with transparency
  - Ensured proper visibility for all UI elements
  - Fixed white header background in suggestion carousel for dark mode
  - Improved creativity label contrast (now #536471 on light, #e7e9ea on dark)
- **Fixed expand button closing popup**:
  - Added proper event propagation stopping
  - Optimized DOM updates to avoid context invalidation
  - Changed from innerHTML replacement to display toggling
- **Fixed tone-template combination logic**:
  - Separated tones (personality) from templates (structure)
  - Templates are now tone-agnostic actions
  - Tone instructions take priority with templates as secondary modifiers
  - Added "CRITICAL INSTRUCTION" prefix for tone emphasis
- **Fixed suggestion carousel display**:
  - Redesigned from carousel to vertical list showing all 3 options at once
  - Added individual bordered cards for each suggestion
  - Fixed keyboard navigation to directly select and use suggestions
- **Fixed TypeScript errors**:
  - Added 'data' property to ErrorContext interface
  - Fixed event listener type casting for PromiseRejectionEvent and ErrorEvent
  
### 🔧 Technical Improvements
- Improved TypeScript types for better type safety
- **Enhanced console logging** with clear tone/template separation:
  - `📊 TONE & TEMPLATE BREAKDOWN` shows primary tone and modifiers
  - `🎯 TEMPLATE SELECTED` shows tone-template combination
  - `📝 Building System Prompt` shows how instructions are assembled
- **Comprehensive error handling with ErrorHandler class**:
  - Automatic recovery strategies for different error types
  - Exponential backoff retry logic (1s, 2s, 4s delays)
  - User-friendly toast notifications
  - Error categorization (API, DOM, Network, Storage)
  - Global error handlers for unhandled rejections
- Performance optimizations for DOM operations
- Reduced memory footprint with proper cleanup
- Improved system prompt construction with proper priority ordering
- Vertical list layout for better UX (replaced carousel navigation)

### 📝 Documentation
- Updated CLAUDE.md with v1.5.0 features
- Comprehensive TODO.md with implementation details
- Added detailed feature specifications

## [1.4.3] - 2025-01-24

### 🎯 Features
- Keyboard shortcut system with Alt+Q for quick reply generation
- Default tone selector in popup for keyboard shortcuts
- Proper integration with Twitter's contentEditable elements using execCommand
- Fallback generation without toolbar when needed
- Retry logic with 15 attempts for toolbar detection
- Console logging with numbered categories and sub-items

### 🐛 Bug Fixes
- Fixed text insertion in Twitter's contentEditable divs
- Resolved React state management issues with Twitter's implementation
- Fixed keyboard shortcut not working on Mac (changed from Option+R to Alt+Q)
- Removed non-working Alt+Shift+Q shortcut

## [1.4.2] - 2025-01-23

### 🎯 Core Features
- OpenRouter integration for any LLM (GPT-4, Claude, Gemini, Llama, etc.)
- BYOK (Bring Your Own Key) architecture
- 5 tone presets: Professional, Casual, Witty, Supportive, Contrarian
- Custom system prompt for personalization
- Thread context extraction (up to 4 tweets total)
- Context mode selector (None/Single/Thread)
- Temperature control slider (0.1-1.0 for creativity)
- Session-based response caching to reduce API calls
- URL tracking parameter stripping for privacy
- API key validation and masking in UI
- Dynamic model fetching from OpenRouter
- Unlimited token output (no truncation)

### 🔧 Technical Features
- Chrome Manifest V3 compliant
- TypeScript with strict type checking
- Webpack build system with dev/prod configs
- SCSS for enhanced styling
- Debounced DOM operations for performance
- Proper SPA navigation handling
- Memory leak prevention with cleanup
- Structured console logging for debugging

## [1.0.0] - 2024-12-01

### 🚀 Initial Release
- Basic Twitter/X reply generation
- OpenRouter API integration
- Simple tone selection
- Chrome extension with popup settings
- Basic thread context awareness

---

## Version History Summary

- **v1.5.0** - Major feature release with multiple suggestions, preset templates, and visual improvements
- **v1.4.3** - Keyboard shortcuts and bug fixes
- **v1.4.2** - Core functionality stabilization
- **v1.0.0** - Initial release

## Upcoming Features (v2.0.0)

- Backend service architecture for advanced features
- Image context analysis with vision models
- Research integration (Grok → Exa → Perplexity)
- Analytics dashboard with usage statistics
- Scheduling and automation features
- Enhanced error recovery mechanisms
- Performance monitoring and optimization