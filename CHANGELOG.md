# Changelog

## [1.0.3] - 2024-12-22

### Working Features

#### Core Functionality ✅
- All five tone presets working correctly (Professional, Casual, Witty, Supportive, Contrarian)
- Tweet text extraction working properly
- Reply generation with proper context
- Character count display (subtle gray)
- Loading animation during generation
- Dropdown closes after successful generation

#### UI/UX ✅
- Keyboard navigation fully functional
- Click-outside to close working
- Dropdown follows button when scrolling
- Visual hover feedback on options
- Clean, minimal interface

#### Improvements
- Removed AI meta-text from responses (no more "A balanced reply could be:")
- Simplified UI - removed unnecessary status messages
- Better error handling for extension reloads
- Comprehensive debug logging for troubleshooting

### Debug Features
- Logs extracted tweet text from DOM
- Logs user prompt sent to LLM
- Logs tone selection and application
- Logs final system prompt with modifiers

### Known Working Scenarios
- Replying to regular tweets ✅
- Replying to tweets with images ✅
- Different tone selections producing varied responses ✅
- Character counting for generated replies ✅

## [1.0.2] - 2024-12-22

### Phase 1 - Zero-Risk UI Improvements

#### Added
- 📊 Character counter with dynamic color coding (red >280, orange >260)
- 📝 Progress text during generation ("Analyzing tweet context...", "Generating reply...")
- ⌨️ Full keyboard navigation support (Arrow keys, Enter, Escape)
- 🎨 Visual hover feedback on dropdown options
- 🖱️ Click-outside to close dropdown functionality
- 🎆 Focus states for accessibility
- 👑 Twitter Premium character limit detection (25k chars)
- 🔄 Live character count updates as user edits

#### Improved
- Cleaner console output (removed verbose logging)
- Better duplicate button prevention
- Silent service worker reconnection
- Graceful handling of extension context invalidation
- Singleton pattern to prevent multiple content script instances

#### Fixed
- Prevented duplicate button injections in same toolbar
- "Extension context invalidated" errors when reloading extension
- Memory leaks from old content script instances

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