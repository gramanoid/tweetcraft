# Changelog

All notable changes to TweetCraft will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.0.9] - 2025-08-30

### Added
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

### Changed
- Replaced simple tone dropdown with full Template Selector UI
- Increased popup dimensions (380x480px) for better browsing
- Improved UX flow - popup stays open during selection process
- Enhanced prompt system to combine template + tone instructions

### Fixed
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