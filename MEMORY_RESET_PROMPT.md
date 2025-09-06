# TweetCraft Development Continuation Prompt

## Project Context
You are working on **TweetCraft v0.0.21**, a Chrome extension for AI-powered Twitter/X and HypeFury reply generation. The project is undergoing a comprehensive 7-phase UX/UI transformation to address critical issues including a **716KB bundle size** (2.93x over 244KB threshold) causing 3-5 second load times.

## Central Guiding Documentation
**CRITICAL: Read these documents first for complete context:**
1. **CLAUDE.md** - Core development principles, current status, and critical success factors
2. **TASKS_2025_01_09.md** - Complete 7-phase roadmap with Sprint plans and task tracking
3. **focus_chain_taskid_1757142571689.md** - Current task progress tracker
4. **CHANGELOG.md** - Recent changes and version history
5. **docs/ARSENAL_MODE_AUDIT.md** - Arsenal Mode implementation details

## Current Development Status

### ✅ Completed (Tasks 28-29, 51-53)
- **Task 28**: Bundle Size Optimization - Extracted unifiedSelector.ts into modular components
- **Task 29**: Refactored unifiedSelector.ts using TabManager pattern
  - Reduced from 9,947 lines to ~1,300 lines (87% reduction)
  - Preserved all functionality with backward compatibility
- **Sprint 1, Task 1.1**: Arsenal Mode Integration
  - Added 4 Arsenal message handlers to service worker
  - Integrated Arsenal tab into refactored unified selector
  - Created complete Arsenal tab styles with dark theme

### 🚧 IN PROGRESS: Sprint 1, Task 1.2 - Tab Consolidation
**Current Status**: UnifiedFavoritesTab.ts created but has TypeScript compilation error

#### What Was Just Completed:
1. Created `src/components/tabs/UnifiedFavoritesTab.ts` (1000+ lines)
   - Merges Custom tab (template creation) and Favorites tab (template management)
   - Implements togglable modes with smooth transitions
   - Includes one-time data migration from old storage keys
   - Features: popular template highlighting, search/filter, import/export

#### Critical Issue Blocking Progress:
```typescript
// CURRENT ERROR in UnifiedFavoritesTab.ts line 1:
import { TabComponent } from './TabComponent';  // ❌ File doesn't exist

// SHOULD BE:
import { TabComponent } from './TabManager';    // ✅ Correct import
```

#### Immediate Actions Required:
1. **Fix the import error** in UnifiedFavoritesTab.ts
2. **Create UnifiedFavoritesTab.scss** stylesheet
3. **Update unifiedSelectorRefactored.ts** to use the new unified tab
4. **Update service worker** message handlers for unified favorites

### Testing & Validation Instructions

#### Pre-Development Checks:
```bash
# 1. Verify current build status
npm run build

# 2. Check for TypeScript errors
npm run type-check

# 3. Run linter
npm run lint

# 4. Check bundle size
ls -lh dist/contentScript.js  # Should be under 244KB (currently 716KB!)
```

#### Expected Error:
```
ERROR in ./src/components/tabs/UnifiedFavoritesTab.ts
Module not found: Error: Can't resolve './TabComponent'
```

#### After Fixing Import:
1. Build should complete successfully
2. Extension should load in Chrome without errors
3. Unified Favorites tab should be accessible in the selector
4. Both create and manage modes should work

### Console Warnings & Observations

#### Current Console Issues:
1. **Bundle Size Warning**: `contentScript.js: 716KB (WARNING: exceeds 244KB threshold)`
2. **TypeScript Error**: `Cannot find module './TabComponent'`
3. **Orphaned Message Types**: 3 undefined handlers in messages.ts
   - SUGGEST_TEMPLATE
   - GENERATE_IMAGE  
   - (One more to identify)

#### Proposed Fixes:
1. **Import Error**: Change import to `'./TabManager'`
2. **Bundle Size**: After completing Sprint 1, implement code splitting in Sprint 2
3. **Orphaned Messages**: Either implement handlers or remove unused message types

## Comprehensive TODO List

### 🔴 Immediate Priority (Complete Task 1.2)
- [ ] Fix TabComponent import error in UnifiedFavoritesTab.ts
- [ ] Create UnifiedFavoritesTab.scss with dark theme styling
- [ ] Update TabManager.ts to include unified favorites tab
- [ ] Replace separate Custom/Favorites imports in unifiedSelectorRefactored.ts
- [ ] Test unified tab functionality (create, save, manage, import/export)
- [ ] Commit: `[Sprint-1.Task-1.2]: Tab Consolidation - Unified Favorites Tab`

### 🟡 Sprint 1 Completion (Task 1.3)
- [ ] Identify and deprecate obsolete features
- [ ] Remove duplicate UI code
- [ ] Clean up unused imports and dead code
- [ ] Measure bundle size reduction
- [ ] Commit: `[Sprint-1.Task-1.3]: Deprecate Obsolete Features`

### 🟢 Remaining Sprints (2-6)
**Sprint 2**: High-Density Toolbar
- [ ] Implement single-line toolbar design
- [ ] Add Quick Actions buttons
- [ ] Create collapsible sections

**Sprint 3**: UI Unification  
- [ ] Merge duplicate UI patterns
- [ ] Standardize component interfaces
- [ ] Implement consistent styling

**Sprint 4**: Core Features
- [ ] Enhance Smart tab functionality
- [ ] Improve template suggestions
- [ ] Add better defaults

**Sprint 5**: All Tab Simplification
- [ ] Reduce cognitive load
- [ ] Implement progressive disclosure
- [ ] Add visual grouping

**Sprint 6**: Foundational Stability
- [ ] Fix all console errors
- [ ] Implement proper error boundaries
- [ ] Add comprehensive logging

### Development Workflow

1. **Start with validation**:
   ```bash
   npm run build  # Expect TypeScript error
   ```

2. **Fix the import error**:
   - Open `src/components/tabs/UnifiedFavoritesTab.ts`
   - Change line 1 from `'./TabComponent'` to `'./TabManager'`

3. **Create the stylesheet**:
   - Create `src/components/tabs/UnifiedFavoritesTab.scss`
   - Use ArsenalTab.scss as reference for dark theme styling

4. **Update the refactored selector**:
   - Modify `src/content/unifiedSelectorRefactored.ts`
   - Replace Custom and Favorites tab imports with UnifiedFavoritesTab

5. **Test thoroughly**:
   - Load extension in Chrome
   - Verify tab switching works
   - Test create mode and manage mode
   - Verify data migration from old storage

6. **Commit with proper message format**:
   ```
   [Sprint-1.Task-1.2]: Tab Consolidation - Unified Favorites Tab
   
   - Fixed TabComponent import error
   - Created UnifiedFavoritesTab.scss stylesheet  
   - Integrated unified tab into refactored selector
   - Tested create/manage modes and data migration
   
   Files: src/components/tabs/UnifiedFavoritesTab.ts, .scss
   Breaking: None (backward compatible)
   Rollback: Safe to previous commit
   ```

## Hypothesis & Next Steps

### Current Hypothesis:
The tab consolidation will reduce bundle size by ~15-20KB by eliminating duplicate code between Custom and Favorites tabs. The unified interface will also improve UX by reducing cognitive load.

### Validation Metrics:
- Bundle size should decrease from 716KB toward 600KB
- No console errors after implementation
- All existing functionality preserved
- Successful data migration from old storage keys

### Risk Mitigation:
- Keep backward compatibility for existing saved templates
- Implement proper error handling for migration
- Test on both Twitter/X and HypeFury platforms

## Critical Reminders

⚠️ **DO NOT**:
- Start new features before completing current task
- Commit without testing all platforms
- Modify core message passing without updating types
- Skip documentation updates

✅ **ALWAYS**:
- Run build, lint, and type-check before commits
- Test on Twitter/X and HypeFury
- Update TASKS_2025_01_09.md progress
- Follow commit message format
- Keep bundle size in mind

## Ready to Continue?

**Current Working Directory**: `d:/repos/personal/tweetcraft`

**First Command to Run**:
```bash
npm run build
```

This will show you the TypeScript error that needs fixing. Once you see the error about `'./TabComponent'`, you'll know exactly where to start.

**Remember**: The project is 64% complete overall. Sprint 1 is at 66% completion (2/3 tasks done). Your immediate goal is to complete Task 1.2 to bring Sprint 1 to 100%.

---

*This prompt contains everything needed to continue development after a memory reset. Start by reading the central documentation files, then proceed with fixing the import error and completing Task 1.2.*
