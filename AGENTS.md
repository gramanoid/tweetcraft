## TweetCraft Agent Guidelines

This document provides essential guidelines for AI agents developing the TweetCraft Chrome extension.

### Build & Test Commands

- **Build for production:** `npm run build`
- **Lint code:** `npm run lint`
- **Type-check:** `npm run type-check`
- **Run all tests:** `npm run test`
- **Run a single test file:** `npm test -- <path/to/test.ts>`
- **Pre-change check:** `npm run build && npm run lint && npm run type-check`

### Code Style & Conventions

- **Focus:** Prioritize consumer UX and speed over enterprise patterns.
- **Imports:** Use absolute paths from `src`.
- **Formatting:** Follow existing code style; use Prettier if configured.
- **Types:** Use TypeScript strict mode and define types in `src/types`.
- **Naming:** Use camelCase for variables/functions, PascalCase for classes/types.
- **Error Handling:** Implement error handling with recovery options.
- **API Keys:** Use `.env` and `webpack.DefinePlugin`; NEVER hardcode keys.
- **Logging:** Use the structured, color-coded console logging standard.
- **Messaging:** Use the `MessageType` enum from `src/types/messages.ts`.
- **Commits:** Follow the format `[PHASE-X.TASK-Y.Z]: Brief description`.
