# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## IMPORTANT: Core Development Principles

**BUILD FOR CONSUMERS, NOT ENTERPRISES**
- This is a consumer product - prioritize user experience and speed
- Avoid enterprise patterns (factories, dependency injection, excessive abstraction layers)
- Complex features are fine, but implement them directly and clearly
- Skip unnecessary ceremonies - no need for interfaces when a simple function works
- Choose pragmatic solutions over "best practices" from enterprise software
- If the code is readable and works reliably, ship it

## Repository Overview

This repository contains the Smart Reply extension - an AI-powered Twitter/X reply generator with OpenRouter integration and custom prompt support.

## Project Structure

### Main Extension
- **smart-reply-extension/** - The primary TypeScript Chrome extension with OpenRouter integration
  - Built with TypeScript, Webpack, and Chrome Manifest V3
  - BYOK (Bring Your Own Key) architecture
  - Custom prompt system for personalization
  - Multiple tone presets for quick reply generation

### Reference Projects (in inspiration/ folder)
The `inspiration/` folder contains 8 open-source Twitter/X extensions used as reference:
- **XReplyGPT** - Chrome extension for generating Twitter replies using ChatGPT
- **XAI/xai-chrome-ext** - TypeScript/Webpack-based Twitter extension with ChatGPT and Twitter API integration
- **generative-x** - Next.js app with Chrome extension for AI-powered Twitter features
- **tweetGPT** - Chrome extension for writing tweets with ChatGPT (TypeScript/React)
- **twitter-ai-reply** - Vue.js/Vite-based Twitter AI reply extension
- **twitter-gpt-3-extension** - jQuery-based Twitter extension
- **twitter-dm-drafter** - Simple Chrome extension for DM drafting
- **x-post** - Basic Chrome extension for X/Twitter posting

### Backend Services (in inspiration/ folder)
- **XAI/xai-nodejs-backend** - Node.js/Express backend for Twitter API integration
- **XReplyGPT/supabase** - Supabase functions for analytics

## Development Commands

### Smart Reply Extension (Main Project)
```bash
cd smart-reply-extension
npm install              # Install dependencies
npm run dev             # Development build with watch mode
npm run build           # Production build
npm run lint            # Run ESLint
npm run type-check      # TypeScript type checking
```

### Loading the Extension in Chrome
1. Build the extension: `npm run build`
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" (top right)
4. Click "Load unpacked"
5. Select the `smart-reply-extension/dist` folder
6. Configure your OpenRouter API key in the extension popup

## Architecture Patterns

### Chrome Extension Architecture
All browser extensions follow Chrome Manifest V3 structure:
- **Service Worker** (`serviceWorker.js` or `service-worker.js`) - Background script handling extension lifecycle
- **Content Scripts** (`contentScript.js` or `content.js`) - Injected into Twitter/X pages
- **Popup/Options** - UI for extension settings and interactions
- **Manifest** (`manifest.json`) - Extension configuration

### Common Extension Patterns
1. **OpenAI Integration**: Most extensions use OpenAI API for text generation
2. **Twitter DOM Manipulation**: Content scripts interact with Twitter's DOM structure
3. **Storage API**: Chrome storage API for persisting user settings and API keys
4. **Message Passing**: Communication between content scripts, service workers, and popup

### Tech Stack Variations
- **Build Tools**: Webpack, Vite, or native browser support
- **Frameworks**: React, Vue.js, vanilla JavaScript
- **Languages**: TypeScript or JavaScript
- **Styling**: SCSS, CSS, Tailwind CSS

## Key Files to Understand

### For Chrome Extensions
- `manifest.json` - Extension configuration and permissions
- Content script files - DOM interaction logic
- Service worker files - Background processing
- API service files - OpenAI/Twitter API integration

### For Web Apps
- Next.js: `app/` directory for app router
- Vue.js: `src/App.vue` and component structure

## Testing Approach

Each project has different testing setups:
- **XAI**: Mocha with c8 coverage
- **XAI Backend**: Jest
- **Others**: No tests or basic test setup

Always check individual `package.json` files for available test commands.

## Security Considerations

- API keys are stored in Chrome storage or environment variables
- Extensions require specific permissions for Twitter domains
- Most extensions interact with Twitter's DOM which may break with Twitter UI updates

## Development Tips

1. When modifying extensions, always rebuild and reload the extension in Chrome
2. Check browser console for content script errors
3. Use Chrome DevTools for debugging service workers
4. Twitter's DOM structure changes frequently - verify selectors still work
5. Test with both twitter.com and x.com domains

## Documentation Maintenance Rules

**KEEP DOCUMENTATION CURRENT**
- Update CLAUDE.md whenever project structure changes significantly
- Update README.md after implementing major features or version releases
- Keep CHANGELOG.md updated with each version bump
- Document any new patterns or architectural decisions as they're made
- When context gets stale (>50 messages in conversation), proactively update docs
- Before starting a new development session, review and update relevant documentation
- Include current version number, latest features, and any known issues
- Documentation should be the single source of truth for the project state