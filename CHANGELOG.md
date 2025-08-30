# Changelog

All notable changes to TweetCraft will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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