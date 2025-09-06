<div align="center">
  <img src="./public/icons/logo48.png" alt="TweetCraft Logo" width="48" height="48" style="margin-right: 12px;" />
  <h1 style="display: inline-block; margin: 0;">TweetCraft AI Suite</h1>
  <p><em>Comprehensive AI-powered social media automation with 38+ features</em></p>
</div>

<div align="center">
  
![Version](https://img.shields.io/badge/version-0.0.21-blue?style=flat-square)
![Chrome Extension](https://img.shields.io/badge/platform-Chrome-green?style=flat-square)
![TypeScript](https://img.shields.io/badge/language-TypeScript-blue?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-purple?style=flat-square)
![Progress](https://img.shields.io/badge/progress-55%25%20complete-yellow?style=flat-square)
![Phase](https://img.shields.io/badge/phase_5-25%25%20done-orange?style=flat-square)

</div>

---

<div align="center">
  <strong>🚀 AI-powered Twitter/X & HypeFury assistant • 🎭 12 unique tones • 🧵 Thread context awareness • ⚙️ OpenRouter integration</strong>
</div>

## 🚀 **TweetCraft: Current MVP + Development Status**

### 📊 **Development Progress**
- **Overall Completion:** 17/31 tasks (55%)
- **Current Phase:** Phase 5 - Missing Features (25% complete)
- **Critical Issues:** Bundle size optimization needed (see TASKS_2025_01_09.md)
- **Next Milestone:** v0.1.0 after Phase 5 completion

### ✅ **Currently Working (v0.0.21 - Latest: Arsenal Mode Integration)**

#### 🌐 Multi-Platform Support
- **Twitter/X** - Full feature support on twitter.com and x.com
- **HypeFury** - Complete feature parity on app.hypefury.com

#### ⚔️ **NEW: Arsenal Mode Integration (v0.0.21)**
- **Integrated Arsenal Mode** - Pre-generated reply storage now integrated into main popup UI
- **Reduced Bundle Size** - Eliminated duplicate UI code by consolidating Arsenal into TabManager architecture
- **Seamless Tab Navigation** - Arsenal tab (⚔️) now available alongside existing 6 tabs in unified selector
- **Dark Theme Consistency** - Arsenal styling matches existing dark theme with orange accent colors (#FFA500)
- **Complete Feature Parity** - All Arsenal features (categories, search, filter, usage tracking) preserved in integration
- **TabManager Architecture** - Arsenal now follows standardized TabComponent interface for maintainability

#### 🔒 **Critical Security Fix & Analytics (v0.0.20)**
- **API Key Security Hardening** - API keys now isolated to service worker, never passed in messages
- **Weekly Summary Analytics** - Real-time stats display: success rate, top personality, most active day
- **Best Time to Tweet** - AI-powered recommendations based on your engagement patterns
- **Enhanced Data Protection** - Service worker retrieves API keys directly from secure Chrome storage
- **Real Usage Tracking** - Replaced mock data with actual user behavior analytics
- **Time Pattern Analysis** - Tracks optimal posting times by personality and engagement

#### 🔒 **Security & Architecture (v0.0.19)**
- **API Key Security** - All API keys now exclusively managed via .env file
- **Type-Safe Messaging** - MessageType enum enforced throughout for compile-time safety
- **Complete Data Cleanup** - Clear Data now removes both chrome.storage AND IndexedDB
- **Real API Validation** - Validate Key button performs actual OpenRouter connection test
- **Enhanced UI Controls** - New Clear Data and Validate Key buttons in extension popup
- **Future-Ready Architecture** - Added message types for upcoming template and image services

#### 🎨 **Visual Hierarchy & Enhanced UX (v0.0.18)**
- **Section Completion Indicators** - Visual checkmarks (✓) show completed sections with progress bar
- **Compact Mode Density** - 4-column layout with reduced padding (8px) for maximum visibility
- **Auto-populate Favorites** - Shows top 5 combinations when empty with Accept/Dismiss buttons
- **Smart Suggestions Scoring** - Visual score badges (1-10) with detailed breakdown view
- **Dynamic Popup Sizing** - Responsive width/height with manual resize handle
- **Expanded View Mode** - Power user mode showing all options with transparency and docking
- **Category Color Coding** - Visual distinction with 4 colors for rhetoric, 5 for personalities
- **Frequency-based Prominence** - Popular options scale 1.03x with bolder fonts
- **Smart Dimming** - Rarely-used items at 85% opacity until hover
- **Size Memory** - Remembers preferred selector dimensions via localStorage
- **Resize Observer** - Auto-saves size changes with 500ms debounce
- **Visual Resize Handle** - Corner indicator showing resize capability
- **Persistent Selection Bar** - Shows current selections across all tabs
- **Quick Presets Section** - Top 3 most-used combinations as single-click buttons
- **Smart Defaults Button** - Applies intelligent defaults based on usage patterns
- **Real-time Progress Updates** - Section indicators update instantly as selections are made
- **Pulse Animation** - Sections needing selection have subtle pulsing glow effect

#### 🎭 **Enhanced Personas Tab** 
- **Compact 5-column grid** showing all 10 personas simultaneously (massive space efficiency improvement)
- **Smart usage-based sorting** with visual indicators (count badges + recent usage dots)
- **Hover tooltips** with full descriptions and usage statistics
- **Integrated analytics** with main usage tracker for intelligent recommendations

#### 🤖 **NEW: LLM-First Smart Suggestions**
- **AI-driven scoring** - LLM analysis is now primary with confidence scoring and reasoning chains
- **Enhanced context analysis** - Thread dynamics, user behavior patterns, and engagement metrics
- **Sophisticated prompts** - Expert system prompts with concrete examples for each template type  
- **Reasoning integration** - AI explanations flow through to user-facing suggestion reasons
- **Confidence scoring** - LLM confidence (0.0-1.0) directly boosts suggestion rankings

#### 🎛️ **NEW: Streamlined Extension Popup**
- **5 Essential Settings Only** - Model, System Prompt (Your Identity), Default Reply Length, Temperature, Context Mode
- **Backend Configuration** - All advanced settings moved to .env file for security and maintainability
- **No Additional Setup Required** - API keys and feature toggles pre-configured in environment
- **Usage Analytics Reset** - Functional reset button with full backend message handling
- **Image Understanding Always Enabled** - Vision analysis moved to backend-only operation

#### 🚀 **Core Features**
- ✅ Unified 6-tab selector (Personas, All, Smart, Favorites, Image Gen, Custom)
- ✅ All keyboard shortcuts (Alt+1-9 for tones, Alt+Q for quick generate)
- ✅ AI Rewrite functionality  
- ✅ Loading states with "Generating..." text
- ✅ Smart context extraction from HypeFury's UI
- ✅ Platform-specific styling and button placement

#### Discovered Existing Features (Already Implemented)
- **🛡️ Arsenal Mode** - 474 lines, IndexedDB with 6 categories, usage tracking ([src/services/arsenalService.ts](src/services/arsenalService.ts))
- **⌨️ Advanced Keyboard Shortcuts** - 384 lines comprehensive system with Alt+1-9, Alt+Q/R/T/S/C/E ([src/utils/keyboardShortcuts.ts](src/utils/keyboardShortcuts.ts))
- **📊 Multi-Stage Loading States** - 326 lines with progress indicators and animations ([src/utils/loadingStateManager.ts](src/utils/loadingStateManager.ts))
- **🔄 DOM Resilience System** - 4+ fallback levels per selector with caching ([src/utils/domCache.ts](src/utils/domCache.ts))
- **🚦 Race Condition Prevention** - AsyncOperationManager with AbortController ([src/utils/asyncOperationManager.ts](src/utils/asyncOperationManager.ts))
- **⚙️ Configuration Manager** - 349 lines centralized settings system ([src/config/configurationManager.ts](src/config/configurationManager.ts))
- **💾 Memory Manager** - 314 lines with WeakMap/WeakSet cleanup ([src/utils/memoryManager.ts](src/utils/memoryManager.ts))
- **🔧 Error Handler** - 412 lines with recovery workflows ([src/utils/errorHandler.ts](src/utils/errorHandler.ts))

#### Current Working Features
- **🎨 Unified AI Reply Popup** - 6-tab interface (Personas, All, Smart, Favorites, Image Gen, Custom)
- **📝 Template + Tone System** - Choose reply structure (templates) AND personality (tones) separately
- **🤖 Smart Suggestions** - AI-powered template/tone recommendations with scoring
- **🖼️ Image Generation** - AI image creation and web search integrated into replies
- **✨ AI Rewrite** - Transform your draft tweets with AI while maintaining core message
- **🎯 AI Reply Generation** - 15+ preset templates, 12 tones, custom templates with Style and Tone prompts
- **🎨 Dark Mode UI** - Beautiful dark theme matching Twitter/X's interface
- **📊 Custom Templates** - Inline creation system with Style, Tone, and Length fields (unlimited characters)
- **⚙️ Multi-API Management** - Secure key storage via OpenRouter
- **🧵 Context Processing** - Thread context extraction (up to 4 tweets)
- **🚫 Race Condition Prevention** - AsyncOperationManager with AbortController coordination
- **🌐 Network Resilience** - Offline queuing, adaptive timeouts (3G/4G/5G aware)
- **💾 Session Caching** - Response caching to reduce API calls
- **⚡ Keyboard Shortcuts** - Alt+1-9 for tones, Alt+Q for quick generate, Alt+R/T/C/E for actions
- **📊 Enhanced Loading States** - Multi-stage progress indicators with cancel functionality
- **🚀 Instant UI Response** - AI Reply button appears immediately with 100ms debounce
- **🔍 Comprehensive Logging** - Full prompt construction tracking in console

#### 🛠️ **Recent Critical Fixes & Improvements (v0.0.17)**
- **🎨 Visual Hierarchy Implementation** - Category-based color coding for better visual organization
- **📏 Popup Size Memory** - Selector remembers user's preferred dimensions across sessions
- **✨ Code Quality Enhancements** - Centralized constants, enhanced logger, improved API key security

#### 🛠️ **Previous Fixes (v0.0.15-16)**
- **✅ Personas Tab Generate Button** - Fixed issue where clicking persona cards didn't enable Generate button
- **🤖 AI Anti-Disclosure System** - Prevents AI from revealing its nature or methodology in responses
- **⚡ Quick Generate Smart Defaults** - Improved ID matching for instant generation with previous settings
- **🎨 UI Compactness** - Fixed collapsible sections (Vocabulary, Length & Pacing) and compact tab layout
- **📱 Tab Layout** - All tabs including Custom now display properly without text wrapping
- **🎯 Perfect Visual Consistency** - Unified selection states with `#1d9bf0` blue background and white text
- **⭐ Enhanced Star Buttons** - 32px clickable areas with gold hover states and clean design
- **📏 Font Size Normalization** - Consistent 16px emoji, 12px label sizing across all categories
- **🔤 Descriptive Length & Pacing** - Clear labels like "One Word" 💨, "Statement + Question" 🥊 instead of vague names
- **🚫 Comprehensive AI Guardrails** - All 40+ prompts enhanced with anti-meta-commentary restrictions preventing robotic responses

### 📋 **Development Status**
All major features have been implemented and the extension is production-ready:
- ✅ Visual feedback system, Custom tab creation, keyboard shortcuts, Smart Defaults
- ✅ Smart suggestions with scoring and detailed breakdowns
- ✅ Dynamic popup sizing with memory
- ✅ Vision API integration for image analysis
- ✅ Multi-platform support (Twitter/X and HypeFury)

### 🔮 **Truly New Features (Not Yet Implemented)**
- **📝 Thread Composer** - Multi-tweet thread creation with auto-numbering (NOT IMPLEMENTED)
- **💬 Quote Tweet Generator** - Smart commentary for quote tweets (NOT IMPLEMENTED)
- **🤖 AI Tweet Creation** - Generate original tweets from topics (NOT IMPLEMENTED)
- **📊 Simple Analytics** - Basic engagement insights (NOT IMPLEMENTED)
- **🚀 Smart Posting** - Automated posting with safety controls (NOT IMPLEMENTED)

### 🎨 Latest UI Updates (v0.0.15)

#### 🎨 Unified AI Reply Interface
- **Six-tab popup** - Personas (enhanced compact grid), All, Smart (8 suggestions + refresh), Favorites, Image Gen, Custom
- **Enhanced Smart Suggestions** - 8 AI-analyzed suggestions with descriptive labels and color-coded reason chips
- **Compact Personas Tab** - 5-column grid showing all 10 personas with usage-based sorting and hover tooltips
- **Image Generation** - Search or generate AI images with styles (realistic, cartoon, artistic, sketch)
- **Favorites System** - Star your favorite templates and tones for quick access
- **Enhanced Custom Templates** - Inline creation with Style, Tone, and Length fields, full management system

#### 📝 Template + Tone System
- **Four-part selection process** - Personality → Vocabulary → Rhetoric → Length & Pacing
- **24 personalities** - Friendly, Supportive, Professional, Sarcastic, and more
- **11 vocabulary styles** - Plain English, Corporate/PR, Academic, Technical, Gen Z, and more
- **15 rhetoric approaches** - Agree & Build, Steel Man, Devil's Advocate, Hot Take, Ratio Bait, and more
- **6 length & pacing options** - One Word 💨, Statement + Question 🥊, Normal Reply 🗣️, and more
- **10 quick personas** - Pre-configured combinations like The Debate Lord, The Chaos Muppet, The Edgy Philosopher
- **Custom templates** - Comprehensive inline creation and management with Style, Tone, and Length fields
- **Dark mode UI** - Beautiful interface matching Twitter/X's dark theme
- **Seamless flow** - Popup disappears immediately when generating starts

#### Intelligent Reply Generation
- **Combined prompts** - Template structure + Tone personality for perfect replies
- **Visual selection** - Emoji-based interface for quick recognition
- **Usage tracking** - See which templates you use most

#### Advanced Context Processing  
- **Thread context analysis** - understands conversation flow up to 4 tweets
- **Multiple context modes** - None, Single tweet, or Full thread context
- **Smart content extraction** - automatically parses tweet content and author info

#### Developer-Friendly Architecture
- **TypeScript + Webpack** - Modern build system with hot reloading
- **Modular components** - Clean separation of concerns
- **Memory management** - Prevents leaks with proper cleanup
- **Error handling** - Comprehensive error recovery and user feedback

### ⚡ Quick Usage
- **One-click generation** - Click the AI Reply button in any Twitter/X reply box
- **Instant tone switching** - Select from 12 different tones with visual emoji interface  
- **Context-aware responses** - Automatically analyzes thread context for relevant replies

### 🎭 Tone Presets (12 Options)
**Positive Tones:**
- **Professional** 💼 - Formal and business-appropriate
- **Casual** 😊 - Friendly and conversational  
- **Witty** 😄 - Humorous and clever
- **Supportive** 🤗 - Encouraging and empathetic
- **Excited** 🎉 - Energetic and passionate
- **Academic** 🎓 - Scholarly and analytical

**Challenging Tones:**
- **Counter** 🤔 - Thoughtful counterpoints
- **Skeptic** 🤨 - Questioning and doubtful
- **Sarcastic** 😏 - Ironic and mocking
- **Spicy** 🔥 - Bold and controversial
- **Dismissive** 🙄 - Unimpressed and critical

**Personalized:**
- **Custom** ✨ - Your own style

## 📦 Installation

### From Source (Development)

1. **Clone the repository**
   ```bash
   git clone https://github.com/gramanoid/tweetcraft.git
   cd tweetcraft
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build the extension**
   ```bash
   npm run build
   ```

4. **Load in Chrome**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (top right)
   - Click "Load unpacked"
   - Select the `dist` folder

### From Chrome Web Store
*Coming soon!*

## 🚀 Getting Started

1. **No Setup Required!**
   - API keys and all advanced settings are pre-configured
   - Extension works out-of-the-box with optimal defaults
   - No additional configuration needed for most users

2. **Optional Customization**
   - Click the TweetCraft icon in your Chrome toolbar
   - Adjust only 5 essential settings if desired:
     - Model selection
     - System Prompt (your personality)
     - Default Reply Length
     - Temperature (creativity level)
     - Context Mode

3. **Start Using TweetCraft**
   - Navigate to [twitter.com](https://twitter.com), [x.com](https://x.com), or [app.hypefury.com](https://app.hypefury.com)
   - Click reply on any tweet/post
   - Look for the "AI Reply" button in the reply toolbar
   - Select a tone or template and generate!

## 🛠️ Development

### Project Structure
```
tweetcraft/
├── build/              # 🔧 Webpack build configuration
├── docs/               # 📚 Documentation and guides  
├── src/                # 💻 Source code
│   ├── content/        # Twitter/X page integration
│   │   ├── contentScript.ts    # Main content script
│   │   ├── domUtils.ts        # DOM manipulation utilities
│   │   ├── toneSelector.ts    # Tone selection interface
│   │   ├── presetTemplates.ts # Reply templates
│   │   └── *.ts              # Additional components
│   ├── background/     # Extension service worker
│   ├── popup/         # Settings popup interface
│   ├── services/      # API and storage services
│   ├── utils/         # Shared utilities & memory management
│   └── types/         # TypeScript definitions
├── public/            # Static assets & manifest
├── tools/             # Development utilities
└── dist/              # Built extension (generated)
```

### Development Commands
```bash
npm run dev        # Development build with watch
npm run build      # Production build 
npm run clean      # Clean build directory
npm run lint       # Run ESLint
npm run type-check # TypeScript checking
```

### Testing the Extension
1. Make changes to the code
2. Run `npm run dev` for watch mode
3. Reload the extension in Chrome (Extensions page → Reload button)
4. Test on Twitter/X

## 🔧 Configuration

### Streamlined Popup Settings (5 Essential Settings)
- **Model Selection** - Choose from available AI models (auto-fetched from OpenRouter)
- **System Prompt (Your Identity)** - Define your writing style and personality
- **Default Reply Length** - Auto, One Word, Statement+Question, Normal Reply, etc.
- **Temperature** - Control creativity (0.1 = focused, 1.0 = creative)
- **Context Mode** - None, Single tweet, or Full thread context
- **Usage Reset** - Reset all usage counters with one click

### Advanced Features
- **Multiple Suggestions** - Click "3 Suggestions" modifier
- **Preset Templates** - Access via expanded template panel
- **Custom Templates** - Create your own with variables
- **Session Caching** - Automatic, clears on browser restart

## 🐛 Troubleshooting

### Common Issues

**Extension won't load**
- Check Chrome version (90+ required)
- Ensure Manifest V3 is supported
- Verify build completed without errors

**Keyboard shortcuts not working**
- Check for conflicts in `chrome://extensions/shortcuts`
- Ensure you're on Twitter/X domain
- Try reloading the extension

**API errors**
- Verify API key is correct
- Check OpenRouter account has credits
- Ensure selected model is available

**Text not inserting properly**
- Twitter's UI may have changed
- Try refreshing the page
- Report issue with console logs

### Debug Mode
Open Chrome DevTools Console to see detailed logs:
- 🚀 Feature activation
- 📦 Request packages
- ✅ Success states
- ❌ Error details

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 Documentation

- [TASKS_2025_01_09.md](TASKS_2025_01_09.md) - **📋 Complete task tracking and development roadmap (150+ tasks)**
- [CHANGELOG.md](CHANGELOG.md) - Version history and changes
- [CLAUDE.md](CLAUDE.md) - Development guide for AI assistants

## 🔒 Privacy & Security

- **No data collection** - Your tweets and replies stay private
- **Local storage only** - Settings stored locally in Chrome
- **BYOK model** - You control your API key and usage
- **Open source** - Audit the code yourself

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- OpenRouter for AI model access
- Twitter/X for the platform
- Chrome Extensions team for Manifest V3
- Open source community for inspiration

## 📧 Support

- **Issues**: [GitHub Issues](https://github.com/gramanoid/tweetcraft/issues)
- **Discussions**: [GitHub Discussions](https://github.com/gramanoid/tweetcraft/discussions) 
- **Email**: [Open an Issue](https://github.com/gramanoid/tweetcraft/issues/new)

---

**TweetCraft v0.0.21** - Production-ready AI reply assistant with integrated Arsenal Mode, enhanced security, weekly analytics, real-time usage tracking, and 40+ features. See [TASKS_2025_01_09.md](TASKS_2025_01_09.md) for development roadmap 🚀

Made with ❤️ by the TweetCraft team
