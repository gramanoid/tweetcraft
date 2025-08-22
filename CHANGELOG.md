# Changelog

## [1.0.2] - 2024-12-22

### Improved
- Cleaner console output (removed verbose logging)
- Better duplicate button prevention
- Silent service worker reconnection

### Fixed
- Prevented duplicate button injections in same toolbar

## [1.0.1] - 2024-12-22

### Improved
- Better cleanup on page navigation
- Simple rate limiting (1 second between API calls)
- More robust service worker reconnection
- Fixed memory leaks with proper cleanup

### Fixed
- Text insertion using proven paste event method
- Dropdown visibility with stronger CSS specificity
- Dark mode styling for dropdown

## [1.0.0] - 2024-12-22

### Initial Release
- OpenRouter integration for any LLM (GPT-4, Claude, etc.)
- Custom prompt system for personal style
- 5 tone presets (Professional, Casual, Witty, Supportive, Contrarian)
- Context-aware reply generation
- BYOK (Bring Your Own Key) architecture
- Chrome Manifest V3 compliant