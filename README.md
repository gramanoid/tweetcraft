# TweetCraft - AI-Powered Twitter/X Reply Assistant v1.4.1

[![Version](https://img.shields.io/badge/version-1.4.1-blue.svg)](https://github.com/yourusername/tweetcraft)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

TweetCraft is a Chrome extension that leverages AI to generate contextually relevant Twitter/X replies with customizable tones and thread context awareness.

## 🚀 Key Features

### Core Capabilities
- 🤖 **OpenRouter Integration** - Access any LLM (GPT-4, Claude, Gemini, Llama, etc.)
- 🧵 **Thread Context Extraction** - Analyzes up to 3 previous tweets for conversation continuity
- 🎨 **Custom System Prompts** - Define your personal writing style and voice
- 🎯 **5 Tone Presets** - Professional, Casual, Witty, Supportive, Contrarian
- 🎚️ **Temperature Control** - Fine-tune creativity level (0.1-1.0)
- 🔒 **Privacy First** - BYOK (Bring Your Own Key) architecture
- 🚫 **URL Tracking Stripping** - Removes tracking parameters for privacy

### Advanced Features (v1.4.1)
- 📊 **Context Mode Selector** - Choose between None/Single/Thread context
- 🔄 **Smart Model Fetching** - Dynamic retrieval of all OpenRouter models
- 💾 **Session Caching** - Reduces API calls for duplicate requests
- 🔧 **Debounced Operations** - Optimized performance with DOM mutation handling
- 📝 **Enhanced Error Logging** - Better debugging with detailed console output
- ⌨️ **Keyboard Navigation** - Arrow keys, Enter, Escape support
- 🎨 **Visual Feedback** - Hover effects and focus states
- 🔄 **SPA Navigation Support** - Proper cleanup on Twitter's single-page navigation
- 🧪 **API Key Validation** - Test your key before use
- 📊 **Character Counter** - Track reply length in real-time

## 📦 Installation

### From Source
1. Clone this repository
```bash
git clone https://github.com/yourusername/tweetcraft.git
cd tweetcraft/smart-reply-extension
```

2. Install dependencies
```bash
npm install
```

3. Build the extension
```bash
npm run build
```

4. Load in Chrome
- Open Chrome and navigate to `chrome://extensions/`
- Enable "Developer mode" (top right)
- Click "Load unpacked"
- Select the `dist` folder

## ⚙️ Configuration

1. **Get Your API Key**
   - Visit [openrouter.ai/keys](https://openrouter.ai/keys)
   - Create an account and generate an API key

2. **Configure Extension**
   - Click the TweetCraft icon in Chrome toolbar
   - Enter your OpenRouter API key
   - Click "↻" to fetch available models
   - Customize your system prompt
   - Adjust temperature for creativity
   - Select context mode preference

## 💡 Usage

1. Navigate to Twitter/X (twitter.com or x.com)
2. Click reply on any tweet
3. Look for the "AI Reply" button in the reply toolbar
4. Select a tone from the dropdown
5. Wait for generation (loading animation)
6. Edit the generated text if needed
7. Post your reply!

## 🛠️ Development

### Scripts
```bash
# Development build with watch mode
npm run dev

# Production build
npm run build

# Run linter
npm run lint

# Type checking
npm run type-check

# Clean build directory
npm run clean
```

### Project Structure
```
smart-reply-extension/
├── src/
│   ├── background/        # Service worker
│   ├── content/          # Content scripts & DOM utilities
│   ├── popup/            # Extension popup UI
│   ├── services/         # OpenRouter, Storage, Cache services
│   ├── types/            # TypeScript interfaces
│   └── utils/            # Utilities (debounce, URL cleaner)
├── public/               # Static assets & manifest
├── dist/                 # Built extension (git-ignored)
└── webpack.*.js          # Build configurations
```

### Architecture
- **Chrome Manifest V3** - Latest extension standards
- **TypeScript** - Type-safe development
- **Webpack** - Module bundling & optimization
- **SCSS** - Enhanced styling capabilities

## 🔄 Version History

### v1.4.1 (2024-12-23)
- Fixed empty response bug with better error handling
- Replaced dual context toggles with single Context Mode selector
- Added deduplication for thread tweets
- Improved console logging for debugging

### v1.4.0 (2024-12-22)
- Added thread context extraction (up to 3 tweets)
- Thread-aware reply generation

### v1.3.0 (2024-12-22)
- Rebranded to TweetCraft with custom icons
- Professional branding throughout

### v1.2.1 (2024-12-22)
- URL tracking parameter stripping for privacy

### v1.2.0 (2024-12-22)
- API key validation & masking
- Debounced DOM operations
- Enhanced cleanup on page navigation

See [CHANGELOG.md](CHANGELOG.md) for full version history.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details

## 🙏 Acknowledgments

- OpenRouter for LLM API aggregation
- Twitter/X for the platform
- Chrome Extensions team for Manifest V3

## 🐛 Known Issues

- Twitter's DOM structure changes may occasionally break functionality
- Rate limiting depends on your OpenRouter account tier
- Some models may have different response quality

## 📮 Support

For issues, feature requests, or questions:
- Open an issue on [GitHub](https://github.com/yourusername/tweetcraft/issues)
- Check existing issues before creating new ones

---

**Note**: This extension is not affiliated with Twitter/X or OpenRouter. Use responsibly and in accordance with platform terms of service.