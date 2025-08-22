# Smart Reply Extension v1.0.2

AI-powered Twitter reply generation with custom prompts and OpenRouter integration.

## Features

### Core Features
- 🤖 **OpenRouter Integration** - Use any LLM (GPT-4, Claude, Gemini, etc.)
- 🎨 **Custom Prompts** - Define your personal style and tonality
- 🎯 **Tone Selection** - Quick presets (Professional, Casual, Witty, Supportive, Contrarian)
- 🧠 **Context Aware** - Analyzes original tweets for relevant replies
- ⚡ **Fast Integration** - Seamless Twitter/X DOM integration
- 🔒 **BYOK** - Bring Your Own Key for privacy and control

### v1.0.2 Improvements (Phase 1 Complete)
- 📊 **Character Counter** - Live character count with color warnings (red >280, orange >260)
- 📝 **Progress Feedback** - Shows generation progress ("Analyzing tweet context...", "Generating reply...")
- ⌨️ **Keyboard Navigation** - Use arrow keys to navigate, Enter to select, Escape to close
- 🎨 **Visual Feedback** - Hover effects and focus states for better UX
- 🖱️ **Click Outside to Close** - Dropdown closes when clicking elsewhere
- 🔧 **Error Handling** - Graceful handling of extension reloads and context invalidation

## Installation

1. Clone this repository
2. Install dependencies: `npm install`
3. Build the extension: `npm run build`
4. Load `dist` folder in Chrome as unpacked extension

## Development

```bash
# Install dependencies
npm install

# Development build with watch mode
npm run dev

# Production build
npm run build

# Lint code
npm run lint

# Type check
npm run type-check
```

## Configuration

1. Get your OpenRouter API key from [openrouter.ai/keys](https://openrouter.ai/keys)
2. Click the extension icon in Chrome
3. Enter your API key and configure your settings
4. Customize your system prompt to match your voice

## Usage

1. Go to Twitter/X and navigate to any tweet
2. Click reply to open the reply box
3. Look for the "AI Reply" button next to the toolbar
4. Click to select a tone and generate your reply
5. Edit the generated text if needed and post

## Architecture

- **TypeScript + Webpack** - Modern build system
- **Chrome Manifest V3** - Latest extension standards
- **Content Scripts** - DOM manipulation and UI injection
- **Service Worker** - Background processing
- **Chrome Storage API** - Settings and API key management

## Project Structure

```
src/
├── background/          # Service worker
├── content/            # Content scripts and DOM utils
├── popup/              # Extension popup UI
├── services/           # API and storage services
└── types/              # TypeScript interfaces
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run `npm run lint` and `npm run type-check`
5. Submit a pull request

## License

MIT License - see LICENSE file for details