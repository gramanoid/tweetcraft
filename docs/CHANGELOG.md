# Changelog

All notable changes to TweetCraft will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.0.12] - 2025-09-01

### Added
- **Full HypeFury Support**: Complete feature parity with Twitter/X
  - All 5-tab unified selector (Templates, Smart Suggestions, Favorites, Image Gen, Custom)
  - Full keyboard shortcuts support (Alt+1-9, Alt+Q, etc.)
  - AI Rewrite functionality
  - Smart context extraction from HypeFury's UI
  - Platform-specific styling and button placement

### Fixed
- **Chrome Message Timeouts**: Added 5-second timeout to prevent hanging on `chrome.runtime.sendMessage` calls
- **Timer Type Safety**: Fixed `NodeJS.Timeout` usage in browser context (now uses `ReturnType<typeof setTimeout>`)
- **JSON Extraction Bug**: Fixed depth tracking for nested JSON objects and arrays that was causing parse failures
- **Duplicate AI Reply Buttons**: Fixed issue where multiple AI Reply buttons would appear
  - **Twitter/X Fix**: Added immediate marking of processed toolbars to prevent race conditions
  - **Twitter/X Fix**: Enhanced duplicate detection with multiple checks at different levels
  - **Twitter/X Fix**: Added textarea-specific tracking to prevent duplicates per text area
  - **HypeFury Fix**: Limited button injection to actual reply textareas only
  - **HypeFury Fix**: Added filtering to skip search/filter inputs
  - **HypeFury Fix**: Maximum 5 buttons per page to prevent spam
  - **HypeFury Fix**: Added height check to skip small/hidden textareas
  - Automatic removal of duplicate buttons if they appear
- **Loading State Display**: Fixed "Generating..." text not showing on buttons
  - Added `<span>` wrapper to HypeFury button text
  - Enhanced `showLoadingState` to handle buttons with or without spans
  - Fixed `hideLoadingState` to restore correct text for each platform
  - Platform-aware button text restoration (with/without emojis)
- **HypeFury Button Selector**: Fixed button not found for loading state error
  - Added platform detection for correct class names
  - HypeFury uses `.smart-reply-button`, Twitter uses `.smart-reply-btn`

### Changed
- Improved reliability of message passing between content script and service worker
- Enhanced JSON parsing to correctly handle mixed bracket types (`{}` and `[]`)
- More robust toolbar processing to prevent duplicate button injection
- Platform-aware button selectors throughout the codebase

## [0.0.11] - 2025-09-01

### Added
- **Unified AI Reply Popup**: All features now integrated into single popup interface
  - Template & Tone matrix selection system
  - Smart Suggestions tab with AI-powered scoring
  - Favorites tab for quick access to preferred combinations
  - Image Generation tab with search and AI generation
  - Custom Template creation with separate Style and Tone prompts
- **Image Generation Features**: 
  - AI image generation using `models/gemini-2.0-flash-preview-image-generation`
  - Image search using `perplexity/sonar` model
  - Style selection (realistic, cartoon, artistic, sketch)
  - Direct URL insertion into tweets
- **Enhanced Custom Templates**:
  - Separate Style and Tone prompt fields
  - No character limits on prompts
  - Combined prompts for maximum flexibility
- **UI/UX Improvements**:
  - Popup stays anchored to button during scroll
  - Popup disappears immediately when generating starts
  - All dropdown text fixed to black on white background
  - Better visual feedback and loading states

### Changed
- Removed standalone Smart Suggestions and Image buttons (now integrated into AI Reply popup)
- Improved JSON extraction with robust parser utility
- Added retry logic with exponential backoff for API calls
- Made model names configurable via centralized config file
- Enhanced memory management with configurable cleanup intervals

### Fixed
- Fixed 14 CodeRabbit-identified issues including:
  - Memory leaks from unconfigurable cleanup intervals
  - Tweet link selector incorrectly capturing quoted tweets
  - UI flicker in image attachment auto-suggest
  - API key naming inconsistencies
  - Missing TypeScript types for LLM responses
  - Hard-coded model names throughout codebase
- Fixed popup positioning to stay with button on scroll
- Fixed dropdown text colors (was white on white)
- Removed all placeholder/mock images - only real images now
- Comprehensive bug fixes across multiple systems

### Security
- Added AES-GCM encryption for API keys using Web Crypto API
- Improved API key storage and retrieval mechanisms

## [0.0.10] - 2025-08-31

### Fixed
- **AI Rewrite Button Positioning**: Fixed incorrect placement when text is generated
  - Button now properly appears before the tweet/reply button using insertBefore()
  - Added proper CSS alignment with margin-right and flex-shrink properties
  - Added z-index to prevent overlapping with compose area
  - Enhanced debugging logs for button injection troubleshooting

## [0.0.9] - 2025-08-30

### Added
- **AI Rewrite Feature**: Transform your drafts with AI
  - Adaptive button changes from "AI Reply" to "AI Rewrite ✨" when text is present
  - Rewrites your draft while maintaining core message
  - Applies selected tone and style to improve clarity and impact
  - Works with both replies and standalone tweets
  - Real-time detection of text in reply box
- **Backend API Integration**: Improved security and architecture
  - Moved OpenRouter API calls from frontend to service worker
  - Removed API key input from main popup
  - Separate secure config page for API management
  - Automatic API key validation
- **Custom Prompts & Tones**: Enhanced personalization
  - System Prompt field for defining your identity
  - Custom Style Prompt for writing instructions
  - Custom Tone creation with emoji support
  - Unlimited prompt length (removed character limits)
  - Reply Length presets (Short/Medium/Long)
- **Template + Tone System**: Revolutionary two-step selection process
  - Choose reply structure (templates) separately from personality (tones)
  - 12+ preset templates: Ask Question, Add Value, Share Experience, Challenge Politely, etc.
  - 11 personality tones: Professional, Witty, Sarcastic, Academic, Spicy, Dismissive, etc.
  - Combined prompts merge template structure with tone personality
- **Custom Template Creation**: Build your own reply templates
  - Support for {variable} placeholders in patterns
  - Usage tracking to see most-used templates
  - Edit and delete custom templates
  - Import/export functionality for sharing
- **Dark Mode UI**: Beautiful interface matching Twitter/X
  - Dark theme (#15202b background) throughout
  - Compact design with improved space utilization
  - Larger popup (480px height) for better visibility
  - Seamless template → tone selection without closing
- **Comprehensive Console Logging**: Full debugging visibility
  - Template selection logging with all properties
  - Tone selection with system prompts
  - Combined prompt construction tracking
  - Final system prompt display
  - Rewrite mode detection and tracking

### Changed
- Replaced simple tone dropdown with full Template Selector UI
- Increased popup dimensions (380x480px) for better browsing
- Improved UX flow - popup stays open during selection process
- Enhanced prompt system to combine template + tone instructions

### Fixed
- **Navigation Issue**: AI Reply button now appears properly when navigating between posts
  - Enhanced navigation detection with comprehensive logging
  - Manual toolbar scanning as fallback after navigation
  - Improved retry mechanism with exponential backoff
  - Support for home page, status pages, and compose pages
- System prompt now properly includes combined template+tone instructions
- Version number updated to v0.0.9
- Event propagation issues preventing smooth transitions
- Create Custom Template button always visible without scrolling

## [0.0.8] - 2025-08-30

### Added
- **Keyboard Shortcuts System**: Comprehensive keyboard shortcut management
  - Alt+1-9 for quick tone selection (Professional to Dismissive)
  - Alt+Q for quick generate with default tone
  - Alt+R to regenerate last reply
  - Alt+T to toggle through tone presets
  - Alt+C to clear reply box
  - Alt+E to expand/collapse tone selector
- **Enhanced Loading States**: Multi-stage progress indicators with animations
  - Five distinct stages: Preparing, Validating, Building, Generating, Finalizing
  - Real-time progress bar with shimmer animation
  - Time elapsed display with color-coded warnings
  - Cancel button for aborting long-running operations
- **Instant UI Response**: AI Reply button appears immediately (100ms debounce)

### Changed
- Tone dropdown now auto-closes after selection for better UX
- Loading text shortened from "Generating AI Reply..." to "Generating..." to prevent line wrapping
- Reduced DOM mutation observer debounce from 1500ms to 100ms for instant button appearance

### Fixed
- Tone dropdown staying open after selection
- Loading text wrapping to two lines on narrow reply boxes
- Delayed appearance of AI Reply button

## [0.0.6] - 2025-08-30

### Added
- **Race Condition Prevention**: AsyncOperationManager with AbortController coordination
- **Network Resilience**: Offline request queuing and adaptive timeouts based on connection quality
- **Connection Quality Detection**: Automatic timeout adjustment (10s for 5G, 60s for slow-3g)
- **Request Deduplication**: Prevents duplicate API calls when users click multiple times
- **Intelligent Toolbar Detection**: Only processes reply contexts, eliminating console spam

### Changed
- Simplified error handler from 412 lines to 87 lines for better maintainability
- Improved console logging to only show meaningful operations
- Enhanced reply detection logic with multiple fallback strategies

### Fixed
- Console spam from DOM selector failures on non-reply toolbars
- AI Reply button not appearing due to overly restrictive detection
- Race conditions when rapidly clicking generate button
- Network timeout issues on slow connections

## [0.0.5] - 2025-08-29

### Added
- API Request Optimization with 40-60% performance improvement
- Progressive Enhancement System for Twitter UI changes
- DOM query caching with WeakMap for memory efficiency
- Enhanced loading states with multi-stage progress indicators
- User-friendly error recovery with contextual actions
- Fallback selector chains for DOM resilience

## [0.0.4] - 2025-08-28

### Added
- User Experience Enhancement features
- Improved error handling and recovery workflows

## [0.0.3] - 2025-08-27

### Added
- Performance improvements and optimizations

## [0.0.2] - 2025-08-26

### Added
- Core stability improvements

## [0.0.1] - 2025-08-25

### Added
- Initial MVP release
- AI reply generation with 12 tone presets
- Thread context extraction (up to 4 tweets)
- OpenRouter API integration with BYOK architecture
- Chrome extension popup configuration
- Session-based response caching
- Visual tone selector interface