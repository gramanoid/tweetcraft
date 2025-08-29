# TweetCraft 🚀

An AI-powered Chrome extension for generating intelligent, context-aware replies on Twitter/X. Craft perfect responses with multiple tones, preset templates, and customizable AI models.

![Version](https://img.shields.io/badge/version-1.5.0-blue)
![Chrome Extension](https://img.shields.io/badge/platform-Chrome-green)
![TypeScript](https://img.shields.io/badge/language-TypeScript-blue)
![License](https://img.shields.io/badge/license-MIT-purple)

## ✨ Features

### 🎯 Core Capabilities
- **AI-Powered Reply Generation** - Use any OpenRouter-supported model (GPT-4, Claude, Gemini, Llama, etc.)
- **BYOK Architecture** - Bring Your Own Key for complete control and privacy
- **Thread Context Awareness** - Analyzes up to 4 tweets for context-aware responses
- **Smart Caching** - Session-based caching to reduce API calls and costs
- **Privacy-Focused** - Automatic URL tracking parameter removal

### 🎨 New in v1.5.0

#### Multiple Reply Suggestions
- Generate 3 variations simultaneously with different creativity levels
- Interactive carousel UI with keyboard navigation
- Edit suggestions inline before using
- Individual regeneration for each suggestion

#### Preset Reply Templates
- 12+ built-in templates for common reply types
- Categories: Engagement, Value, Conversation, Humor
- Create and save custom templates
- Quick access bar for favorite templates

#### Visual Tone Selector
- Emoji-based grid interface (💼 😊 😄 🤗 🤔 ✨)
- Quick mood modifiers for fine-tuning
- Custom tone with your own prompts
- Visual feedback and animations

### ⌨️ Keyboard Shortcuts
- **Alt+Q** - Generate AI reply with your default tone
- Arrow keys for navigation in suggestion carousel
- Number keys (1-3) for quick suggestion selection

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
   git clone https://github.com/yourusername/tweetcraft.git
   cd tweetcraft/tweetcraft
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
   - Select the `tweetcraft/dist` folder

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
├── src/
│   ├── content/          # Content scripts
│   │   ├── contentScript.ts
│   │   ├── toneSelector.ts
│   │   ├── suggestionCarousel.ts
│   │   └── presetTemplates.ts
│   ├── background/       # Service worker
│   ├── popup/           # Extension popup UI
│   ├── services/        # API and storage services
│   └── utils/          # Utility functions
├── public/             # Static assets
├── dist/              # Built extension
└── webpack.*.js       # Build configs
```

### Development Commands
```bash
npm run dev        # Development build with watch
npm run build      # Production build
npm run lint       # Run ESLint
npm run type-check # TypeScript checking
npm run clean      # Clean build directory
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

- **Issues**: [GitHub Issues](https://github.com/yourusername/tweetcraft/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/tweetcraft/discussions)
- **Email**: support@tweetcraft.example.com

---

**TweetCraft v1.5.0** - Craft perfect replies with AI 🚀

Made with ❤️ by the TweetCraft team