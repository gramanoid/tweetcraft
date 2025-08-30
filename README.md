<div align="center">
  <img src="./public/icons/logo48.png" alt="TweetCraft Logo" width="48" height="48" style="margin-right: 12px;" />
  <h1 style="display: inline-block; margin: 0;">TweetCraft AI Suite</h1>
  <p><em>Comprehensive AI-powered social media automation with 38+ features</em></p>
</div>

<div align="center">
  
![Version](https://img.shields.io/badge/version-0.0.8-blue?style=flat-square)
![Chrome Extension](https://img.shields.io/badge/platform-Chrome-green?style=flat-square)
![TypeScript](https://img.shields.io/badge/language-TypeScript-blue?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-purple?style=flat-square)
![MVP](https://img.shields.io/badge/status-MVP-orange?style=flat-square)
![Features](https://img.shields.io/badge/roadmap-5%20focused%20features-blue?style=flat-square)

</div>

---

<div align="center">
  <strong>🚀 AI-powered Twitter/X reply assistant • 🎭 12 unique tones • 🧵 Thread context awareness • ⚙️ OpenRouter integration</strong>
</div>

## 🚀 **TweetCraft: Current MVP + Future Roadmap**

### ✅ **Currently Working (v0.0.8)**
- **🎯 AI Reply Generation** - 12 tones, thread context, OpenRouter integration
- **⚙️ Multi-API Management** - Secure key storage via OpenRouter
- **🎨 Visual Interface** - Tone selector with emoji-based interface
- **🧵 Context Processing** - Thread context extraction (up to 4 tweets)
- **🚫 Race Condition Prevention** - AsyncOperationManager with AbortController coordination
- **🌐 Network Resilience** - Offline queuing, adaptive timeouts (3G/4G/5G aware)
- **🎯 Clean Console** - Intelligent toolbar detection eliminates DOM selector spam
- **💾 Session Caching** - Response caching to reduce API calls
- **⚡ Keyboard Shortcuts** - Alt+1-9 for tones, Alt+Q for quick generate, Alt+R/T/C/E for actions
- **📊 Enhanced Loading States** - Multi-stage progress indicators with cancel functionality
- **🚀 Instant UI Response** - AI Reply button appears immediately with 100ms debounce

### 🔮 **Future Features Roadmap (Planned)**
- **📝 Content Creation** - Thread composer, quote tweet generator, AI tweet creation
- **🧠 Psychology Analytics** - Behavioral pattern insights, audience psychology profiling
- **🔬 Research Assistant** - Real-time research with citations and fact checking
- **📊 Content Analysis** - Sentiment analysis, engagement prediction, viral assessment
- **✨ Enhanced UI** - Improved tone selector, better context modes, keyboard shortcuts

### 🎨 MVP Features

#### Intelligent Tone Selection
- **12 unique tone options** from Professional 💼 to Witty 😄 to Counter-arguments 🤔
- **Visual tone selector** with emoji-based interface for quick selection
- **Custom tone support** - define your own style and personality

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

1. **Get your OpenRouter API Key**
   - Visit [openrouter.ai/keys](https://openrouter.ai/keys)
   - Create an account and generate an API key
   - Keep it safe - you'll need it for setup

2. **Configure the Extension**
   - Click the TweetCraft icon in your Chrome toolbar
   - Enter your OpenRouter API key
   - Select your preferred AI model
   - Customize your style/personality prompt
   - Choose your default tone for keyboard shortcuts

3. **Start Using TweetCraft**
   - Navigate to [twitter.com](https://twitter.com) or [x.com](https://x.com)
   - Click reply on any tweet
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

### Popup Settings
- **API Key** - Your OpenRouter API key (stored securely)
- **Model Selection** - Choose from available AI models
- **System Prompt** - Define your writing style and personality
- **Temperature** - Control creativity (0.1 = focused, 1.0 = creative)
- **Context Mode** - None, Single tweet, or Full thread
- **Default Tone** - For keyboard shortcut (Alt+Q)

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

- [CHANGELOG.md](CHANGELOG.md) - Version history and changes
- [TODO.md](TODO.md) - Roadmap and planned features
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

**TweetCraft v0.0.8** - AI reply assistant with keyboard shortcuts, enhanced loading states, and instant UI response 🚀

Made with ❤️ by the TweetCraft team