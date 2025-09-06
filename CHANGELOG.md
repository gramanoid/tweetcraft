# Changelog

All notable changes to TweetCraft will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.0.21] - 2025-01-09

### ⚔️ Features - Sprint 1: Architectural Consolidation (IN PROGRESS)
- **Arsenal Mode Integration**: Pre-generated reply storage now integrated into main popup UI
  - Eliminated duplicate UI code by consolidating Arsenal into TabManager architecture
  - Arsenal tab (⚔️) now available alongside existing 6 tabs in unified selector
  - Dark theme consistency with orange accent colors (#FFA500)
  - Complete feature parity with standalone Arsenal Mode
  - TabManager architecture implementation for maintainability

### 🚧 Architectural Improvements
- **Bundle Size Reduction**: Started addressing critical 716KB bundle size (2.93x over threshold)
  - Integrated Arsenal Mode reduces duplicate UI code
  - Modularized unifiedSelector.ts using TabManager pattern
  - Reduced file from 9,947 lines to ~1,300 lines (87% reduction)
  
### 🔧 Technical Changes
- Added Arsenal message handlers to service worker (GET_ARSENAL_REPLIES, SAVE_ARSENAL_REPLY, UPDATE_ARSENAL_REPLY, DELETE_ARSENAL_REPLY)
- Fixed 8 TabManager API mismatches (destroy vs cleanup, switchTab vs renderTab)
- Created ArsenalTab.scss with complete dark theme styling
- Integrated ArsenalTab component following TabComponent interface

### 📝 Sprint 1 Progress
- Completed Tasks 51-53: Arsenal Mode Integration
- Overall progress: 32/50 tasks completed (64%)
- Current Sprint: Architectural Consolidation

## [0.0.20] - 2025-01-09

### 🔒 Security
- **CRITICAL FIX**: API keys are now isolated to service worker and never passed through message channels
- Service worker retrieves API keys directly from secure Chrome storage
- Prevents potential API key exposure through content script messaging

### ✨ Features
- **Weekly Summary Analytics**: Real-time statistics display in popup showing:
  - Total replies generated and sent
  - Success rate (sent vs generated)
  - Top personality, vocabulary, and rhetoric styles
  - Most active day of the week
- **Best Time to Tweet**: AI-powered recommendations based on engagement patterns
- **Real Usage Tracking**: Replaced mock data with actual user behavior analytics
- **Time Pattern Analysis**: Tracks optimal posting times by personality type

### 🐛 Bug Fixes
- Fixed templateSuggester timeout inconsistency (10s → 8s)
- Fixed ESLint JSON syntax error in .eslintrc.json
- Added missing import for smartDefaults in service worker

### 📝 Phase 5 Progress
- Completed Task 5.1: Expose Weekly Summary in UI
- Completed Task 5.2: Best Time to Tweet Implementation
- 17/23 total tasks completed (74%)

## [0.0.19] - 2025-01-09

### ✨ Features - Phase 4: Smart Learning (COMPLETED)
- **Track Send vs Cancel**: Monitor user actions to improve suggestions
- **Time-of-Day Patterns**: Track personality usage by hour for recommendations
- **Simple Model Fallback**: 3-model fallback chain (gpt-4o-mini → claude-3-haiku → llama-3.1-8b)
- **Smart Suggestions Boost**: Boost/decay algorithm for frequently selected options
- **Weekly Summary**: Sunday 7PM notifications with week's statistics

### 🔒 Security & Architecture
- **API Key Management**: All keys via .env file with webpack DefinePlugin
- **Type-Safe Messaging**: MessageType enum throughout for compile-time safety
- **Complete Data Cleanup**: CLEAR_DATA removes both chrome.storage AND IndexedDB
- **Real API Validation**: Validate Key button performs actual OpenRouter test
- **Enhanced UI Controls**: New Clear Data and Validate Key buttons in popup

## [0.0.18] - 2025-01-06

### ✨ Features - Phase 3: Visual Polish (COMPLETED)
- **Tighter Visual Design**: CSS variables for consistent spacing and colors
- **Settings Icon in Main UI**: Quick access gear icon in selector header
- **Progressive Disclosure**: Collapsible sections to reduce overwhelm
- **Visual Feedback**: Enhanced loading states, success animations, error feedback
- **Guided First Use**: 3-step onboarding tour for new users

### 🎨 Visual Hierarchy & UX
- **Section Completion Indicators**: Visual checkmarks with progress bar
- **Smart Suggestions Scoring**: Visual score badges (1-10) with breakdown
- **Dynamic Popup Sizing**: Responsive with manual resize handle
- **Expanded View Mode**: Power user mode with transparency and docking
- **Category Color Coding**: Visual distinction for rhetoric and personalities
- **Frequency-based Prominence**: Popular options scale with bolder fonts

### 🐛 Bug Fixes
- Fixed Vision API "Failed to extract image(s)" error
- Fixed orphaned button false positive detection
- Reduced DOM selector console noise
- Fixed CSP violations from inline event handlers

### ⚡ Performance
- **Smart Selector Throttling**: Reduced console spam from 100+ to ~10 messages
- **Enhanced Twitter Selectors**: Better reliability for modern Twitter/X
- **DOM Cache Optimization**: Enhanced performance and cache hit rates

## [0.0.17] - 2025-01-06

### ✨ Features - Phase 2: Consumer-Focused (COMPLETED)
- **Personal Stats Dashboard**: 30-day rolling analytics with CSS charts
- **Quick Start Presets**: One-click presets for common scenarios
- **Your Top 5 Display**: Most-used combinations in Favorites tab
- **Arsenal Quick Access**: Quick Arsenal button with modal overlay

## [0.0.16] - 2025-01-06

### ✨ Features - Phase 1: Quick Wins (COMPLETED)
- **Group Personalities Visually**: 24 personalities into 5 visual categories
- **Collapsible Groups**: 60% reduction in choice overwhelm
- **Visual Icons**: 💼 Professional, 😊 Friendly, 😄 Humorous, 🔥 Spicy, 🎭 Creative

### 🏗️ Prompt Architecture
- Strict validation for Smart/Favorites tabs
- Image context inclusion in user prompts
- Default case for invalid tab types with descriptive errors
- Helper function to reduce code duplication
- Configuration validator utility class
- Enhanced error messages with recovery suggestions

### 🎨 Previous Enhancements
- **LLM-First Smart Suggestions**: AI-driven scoring with reasoning
- **Enhanced Personas Tab**: Compact 5-column grid with usage sorting
- **Streamlined Extension Popup**: 5 essential settings only
- **Arsenal Mode**: IndexedDB with 6 categories and usage tracking
- **Advanced Keyboard Shortcuts**: Alt+1-9, Alt+Q/R/T/S/C/E
- **Multi-Stage Loading States**: Progress indicators and animations

## [Earlier Versions]

For changes prior to v0.0.16, please refer to git history.

---

Generated with [Claude Code](https://claude.ai/code)
via [Happy](https://happy.engineering)

Co-Authored-By: Claude <noreply@anthropic.com>
Co-Authored-By: Happy <yesreply@happy.engineering>
