/**
 * Unified Template & Tone Selector - Refactored with TabManager
 * Uses modular tab components for better code organization and bundle size
 */

import {
  Template,
  Personality,
  TEMPLATES,
  PERSONALITIES,
} from "@/config/templatesAndTones";
import {
  VocabularyStyle,
  getAllVocabularyStyles,
  VOCABULARY_STYLES,
} from "@/config/vocabulary";
import {
  LengthPacingStyle,
  getAllLengthPacingStyles,
  LENGTH_PACING_STYLES,
} from "@/config/lengthPacing";
import { RHETORICAL_MOVES } from "@/config/rhetoric";
import { QuickPersona, getAllQuickPersonas } from "@/config/quickPersonas";
import { TabManager } from "@/components/tabs/TabManager";
import { visualFeedback } from "@/ui/visualFeedback";
import { guidedTour, GuidedTour } from "@/components/GuidedTour";
import { templateSuggester } from "@/services/templateSuggester";
import { DOMUtils } from "@/content/domUtils";
import { smartDefaults, SmartDefaultsService } from "@/services/smartDefaults";
import { usageTracker } from "@/services/usageTracker";
import { createTemplateId } from "@/types/branded";
import { logger } from "@/utils/logger";
import { MessageType } from "@/types/messages";
import { customCombos } from "@/services/customCombos";
import { topicTracker } from "@/services/topicTracker";

// Type alias for backward compatibility
type Tone = Personality;

export interface SelectionResult {
  template: Template;
  tone: Tone;
  combinedPrompt: string;
  temperature: number;
  // New 4-part structure
  vocabulary?: string;
  lengthPacing?: string;
  personality?: string;
  rhetoric?: string;
  // Tab type for proper prompt routing
  tabType?: "personas" | "all" | "smart" | "favorites" | "custom" | "compose";
  // Additional configs for prompt architecture
  personaConfig?: {
    personality: string;
    vocabulary: string;
    rhetoricMove: string;
    lengthPacing: string;
    systemPrompt: string;
  };
  allTabConfig?: {
    personality: string;
    vocabulary: string;
    rhetoric: string;
    lengthPacing: string;
  };
  customConfig?: {
    style: string;
    tone: string;
    length: string;
    temperature?: number;
  };
  composeConfig?: {
    topic: string;
    style?: string;
    tone?: string;
    hashtags?: string[];
    length?: string;
  };
}

export class UnifiedSelector {
  private container: HTMLElement | null = null;
  private tabManager: TabManager;
  private isResizing: boolean = false;
  private mouseDownStartedInside: boolean = false;
  
  // Selection state
  private selectedTemplate: Template | null = null;
  private selectedPersonality: Personality | null = null;
  private selectedVocabulary: VocabularyStyle | null = null;
  private selectedLengthPacing: LengthPacingStyle | null = null;
  private selectedPersona: QuickPersona | null = null;
  
  // Backward compatibility aliases
  private get selectedTone(): Personality | null {
    return this.selectedPersonality;
  }
  private set selectedTone(value: Personality | null) {
    this.selectedPersonality = value;
  }
  private get selectedRhetoric(): Template | null {
    return this.selectedTemplate;
  }
  private set selectedRhetoric(value: Template | null) {
    this.selectedTemplate = value;
  }
  
  private onSelectCallback: ((result: SelectionResult) => void) | null = null;
  private favoriteRhetoric: Set<string> = new Set();
  private favoritePersonalities: Set<string> = new Set();
  private favoriteVocabulary: Set<string> = new Set();
  private favoriteLengthPacing: Set<string> = new Set();
  
  // Backward compatibility aliases for favorites
  private get favoriteTemplates(): Set<string> {
    return this.favoriteRhetoric;
  }
  private get favoriteTones(): Set<string> {
    return this.favoritePersonalities;
  }
  
  private view:
    | "personas"
    | "grid"
    | "smart"
    | "favorites"
    | "custom"
    | "compose"
    | "arsenal"
    | "stats"
    | "weekly"
    | "timing"
    | "trending"
    | "engagement"
    | "abtest"
    | "cache" = "smart";
  
  private clickOutsideHandler: ((e: MouseEvent) => void) | null = null;
  private scrollHandler: (() => void) | null = null;
  private anchorButton: HTMLElement | null = null;
  private keyboardHandler: ((e: KeyboardEvent) => void) | null = null;
  private eventListenerCleanups: (() => void)[] = [];
  
  constructor() {
    this.tabManager = new TabManager();
    this.loadFavorites();
    this.loadCustomTemplates();
  }

  /**
   * Get saved size preferences from localStorage
   */
  private getSavedSize(): { width: number; height: number } {
    const screenWidth = window.innerWidth || document.documentElement.clientWidth;
    let defaultWidth = 840;
    
    if (screenWidth < 1024) {
      defaultWidth = Math.min(screenWidth * 0.9, 600);
    } else if (screenWidth < 1440) {
      defaultWidth = 720;
    }

    try {
      const saved = localStorage.getItem("tweetcraft-selector-size");
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          width: Math.min(
            Math.max(parsed.width || defaultWidth, 480),
            Math.min(980, screenWidth * 0.95),
          ),
          height: Math.min(Math.max(parsed.height || 380, 350), 450),
        };
      }
    } catch (e) {
      logger.error("Failed to get saved size", e);
    }
    
    return { width: defaultWidth, height: 380 };
  }

  /**
   * Save size preferences to localStorage
   */
  private saveSize(width: number, height: number): void {
    try {
      let minWidth = 480;
      let maxWidth = 900;
      let minHeight = 350;
      let maxHeight = 600;

      if (minWidth > maxWidth) {
        [minWidth, maxWidth] = [maxWidth, minWidth];
      }
      if (minHeight > maxHeight) {
        [minHeight, maxHeight] = [maxHeight, minHeight];
      }

      const constrainedWidth = Math.min(Math.max(width, minWidth), maxWidth);
      const constrainedHeight = Math.min(Math.max(height, minHeight), maxHeight);

      localStorage.setItem(
        "tweetcraft-selector-size",
        JSON.stringify({
          width: constrainedWidth,
          height: constrainedHeight,
        }),
      );

      console.log(
        "%c📐 Popup size saved",
        "color: #8B98A5",
        `${constrainedWidth}x${constrainedHeight}px`,
      );
    } catch (e) {
      logger.error("Failed to save size", e);
    }
  }

  /**
   * Show the unified selector
   */
  async show(
    button: HTMLElement,
    onSelect: (result: SelectionResult) => void,
  ): Promise<void> {
    this.onSelectCallback = onSelect;
    
    // Remove any existing selector
    this.hide();
    
    // Store button reference for repositioning
    this.anchorButton = button;
    
    // Create and show new selector
    this.container = this.createUI();
    document.body.appendChild(this.container);
    
    // Position near button
    this.positionNearButton(button);
    
    // Show with animation
    requestAnimationFrame(() => {
      if (this.container) {
        this.container.style.display = "flex";
        this.container.style.opacity = "0";
        
        requestAnimationFrame(() => {
          if (this.container) {
            this.container.style.transition = "opacity 0.2s";
            this.container.style.opacity = "1";
          }
        });
      }
    });
    
    // Add click outside handler
    this.setupClickOutsideHandler();
    
    // Add keyboard event handler
    this.setupKeyboardHandler();
    
    // Add scroll handler to keep popup positioned relative to button
    this.setupScrollHandler();
    
    // Start guided tour if first time
    if (guidedTour.shouldShowTour()) {
      GuidedTour.injectStyles();
      setTimeout(() => {
        if (this.container) {
          guidedTour.start(this.container);
        }
      }, 500);
    }
  }

  /**
   * Hide the selector
   */
  hide(): void {
    // Clean up tab manager
    if (this.tabManager) {
      this.tabManager.destroy();
    }
    
    if (this.container) {
      this.container.remove();
      this.container = null;
    }
    
    // Reset resizing flag and mousedown tracking
    this.isResizing = false;
    this.mouseDownStartedInside = false;
    
    // Clean up all event listeners
    this.eventListenerCleanups.forEach((cleanup) => cleanup());
    this.eventListenerCleanups = [];
    
    // Remove click outside handler
    if (this.clickOutsideHandler) {
      document.removeEventListener("click", this.clickOutsideHandler, true);
      this.clickOutsideHandler = null;
    }
    
    // Remove mouse tracking handlers
    if ((this as any)._mouseDownHandler) {
      document.removeEventListener("mousedown", (this as any)._mouseDownHandler, true);
      (this as any)._mouseDownHandler = null;
    }
    
    if ((this as any)._mouseUpHandler) {
      document.removeEventListener("mouseup", (this as any)._mouseUpHandler, true);
      (this as any)._mouseUpHandler = null;
    }
    
    // Remove scroll handler
    if (this.scrollHandler) {
      window.removeEventListener("scroll", this.scrollHandler, true);
      this.scrollHandler = null;
    }
    
    // Remove keyboard handler
    if (this.keyboardHandler) {
      document.removeEventListener("keydown", this.keyboardHandler);
      this.keyboardHandler = null;
    }
    
    this.anchorButton = null;
  }

  /**
   * Position selector near button
   */
  private positionNearButton(button: HTMLElement): void {
    if (!this.container) return;

    const buttonRect = button.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    const spaceBelow = viewportHeight - buttonRect.bottom;
    const spaceAbove = buttonRect.top;
    const selectorHeight = 600;
    const showAbove = spaceBelow < selectorHeight && spaceAbove > spaceBelow;

    this.container.style.position = "fixed";

    if (showAbove) {
      this.container.style.bottom = `${viewportHeight - buttonRect.top + 8}px`;
      this.container.style.top = "auto";
    } else {
      this.container.style.top = `${buttonRect.bottom + 8}px`;
      this.container.style.bottom = "auto";
    }

    const selectorWidth = 540;
    let leftPos = buttonRect.left + buttonRect.width / 2 - selectorWidth / 2;

    if (leftPos < 10) {
      leftPos = 10;
    } else if (leftPos + selectorWidth > viewportWidth - 10) {
      leftPos = viewportWidth - selectorWidth - 10;
    }

    this.container.style.left = `${leftPos}px`;
    this.container.style.right = "auto";
    this.container.style.transform = "none";
  }

  /**
   * Setup click outside handler
   */
  private setupClickOutsideHandler(): void {
    const mouseDownHandler = (e: MouseEvent) => {
      if (
        this.container &&
        (this.container.contains(e.target as Node) ||
          (e.target as HTMLElement).closest(".resize-handle"))
      ) {
        this.mouseDownStartedInside = true;
      } else {
        this.mouseDownStartedInside = false;
      }
    };

    const mouseUpHandler = () => {
      setTimeout(() => {
        this.mouseDownStartedInside = false;
      }, 50);
    };

    this.clickOutsideHandler = (e: MouseEvent) => {
      if (this.container && !this.container.contains(e.target as Node)) {
        if (
          this.isResizing ||
          this.container?.classList.contains("resizing") ||
          this.mouseDownStartedInside
        ) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        this.hide();
      }
    };

    document.addEventListener("mousedown", mouseDownHandler, true);
    document.addEventListener("mouseup", mouseUpHandler, true);

    (this as any)._mouseDownHandler = mouseDownHandler;
    (this as any)._mouseUpHandler = mouseUpHandler;

    setTimeout(() => {
      if (this.clickOutsideHandler) {
        document.addEventListener("click", this.clickOutsideHandler, true);
      }
    }, 100);
  }

  /**
   * Setup keyboard handler for shortcuts
   */
  private setupKeyboardHandler(): void {
    this.keyboardHandler = (e: KeyboardEvent) => {
      if (!this.container || this.container.style.display === "none") return;

      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;

      switch (e.key) {
        case " ":
        case "Spacebar":
          e.preventDefault();
          e.stopPropagation();
          this.handleQuickGenerate();
          break;
        case "Escape":
          e.preventDefault();
          e.stopPropagation();
          this.hide();
          break;
        case "Enter":
          e.preventDefault();
          e.stopPropagation();
          this.handleGenerate();
          break;
      }
    };

    document.addEventListener("keydown", this.keyboardHandler);
  }

  /**
   * Setup scroll handler to keep popup positioned
   */
  private setupScrollHandler(): void {
    this.scrollHandler = () => {
      if (this.anchorButton && this.container) {
        this.positionNearButton(this.anchorButton);
      }
    };

    window.addEventListener("scroll", this.scrollHandler, true);
  }

  /**
   * Create the unified selector UI
   */
  private createUI(): HTMLElement {
    this.container = document.createElement("div");
    this.container.className = "tweetcraft-unified-selector";
    
    // Set container for TabManager
    this.tabManager.setContainer(this.container);
    
    this.render();
    this.applyStyles();

    const savedSize = this.getSavedSize();
    this.container.style.width = `${savedSize.width}px`;
    this.container.style.height = `${savedSize.height}px`;

    this.observeResize();
    this.addResizeHandle();

    return this.container;
  }

  /**
   * Observe container resize and save size
   */
  private observeResize(): void {
    if (!this.container) return;

    let resizeTimeout: NodeJS.Timeout;
    let isInitialLoad = true;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (this.container?.classList.contains("resizing")) return;

        if (isInitialLoad) {
          isInitialLoad = false;
          return;
        }

        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
          const { width, height } = entry.contentRect;
          const currentSaved = this.getSavedSize();
          if (
            Math.abs(width - currentSaved.width) > 5 ||
            Math.abs(height - currentSaved.height) > 5
          ) {
            this.saveSize(Math.round(width), Math.round(height));
          }
        }, 500);
      }
    });

    resizeObserver.observe(this.container);
    (this.container as any)._resizeObserver = resizeObserver;
  }

  /**
   * Add a visual resize handle in the bottom-right corner
   */
  private addResizeHandle(): void {
    if (!this.container) return;

    const handle = document.createElement("div");
    handle.className = "resize-handle";
    handle.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" opacity="0.4">
        <path d="M11 11H9V9h2v2zm-4 0H5V9h2v2zm-4 0H1V9h2v2z"/>
      </svg>
    `;
    this.container.appendChild(handle);

    let startX = 0;
    let startY = 0;
    let startWidth = 0;
    let startHeight = 0;

    const preventClick = (e: MouseEvent) => {
      if (this.isResizing) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      this.isResizing = true;
      startX = e.clientX;
      startY = e.clientY;
      const rect = this.container!.getBoundingClientRect();
      startWidth = rect.width;
      startHeight = rect.height;
      e.preventDefault();
      e.stopPropagation();

      document.body.style.cursor = "se-resize";
      this.container!.classList.add("resizing");
      document.addEventListener("click", preventClick, true);
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!this.isResizing || !this.container) return;

      const newWidth = Math.min(
        Math.max(startWidth + e.clientX - startX, 480),
        900,
      );
      const newHeight = Math.min(
        Math.max(startHeight + e.clientY - startY, 350),
        600,
      );

      this.container.style.width = `${newWidth}px`;
      this.container.style.height = `${newHeight}px`;

      e.preventDefault();
      e.stopPropagation();
    };

    const handleMouseUp = (e?: MouseEvent) => {
      if (this.isResizing) {
        document.body.style.cursor = "";
        this.container?.classList.remove("resizing");

        if (this.container) {
          const rect = this.container.getBoundingClientRect();
          const finalWidth = Math.round(rect.width);
          const finalHeight = Math.round(rect.height);
          this.saveSize(finalWidth, finalHeight);

          this.container.style.width = `${finalWidth}px`;
          this.container.style.height = `${finalHeight}px`;
        }

        if (e) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
        }

        requestAnimationFrame(() => {
          this.isResizing = false;
          document.removeEventListener("click", preventClick, true);
        });
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && this.isResizing) {
        this.isResizing = false;
        document.body.style.cursor = "";
        this.container?.classList.remove("resizing");
        document.removeEventListener("click", preventClick, true);
        e.preventDefault();
        e.stopPropagation();
      }
    };

    handle.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("keydown", handleKeyDown);

    (handle as any)._cleanup = () => {
      handle.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("click", preventClick, true);
      this.isResizing = false;
    };
  }

  /**
   * Render the selector UI
   */
  private render(): void {
    if (!this.container) return;

    const currentWidth = this.container.style.width;
    const currentHeight = this.container.style.height;

    this.container.innerHTML = `
      ${this.renderPersistentSelectionBar()}
      <div class="selector-header">
        <button class="expanded-view-toggle-btn" title="Toggle Expanded View" data-expanded="false">
          <span class="expand-icon">⊞</span>
        </button>
        <button class="quick-generate-btn" id="quickGenerateBtn" title="Generate with randomized settings (Space)">
          <span class="quick-generate-icon">⚡</span>
          <span class="quick-generate-text">Quick Generate</span>
        </button>
        <button class="settings-btn" title="Open Settings">
          <span class="settings-icon">⚙️</span>
        </button>
        <div class="selector-tabs">
          <button class="tab-btn ${this.view === "personas" ? "active" : ""}" data-view="personas">
            👤 Personas
          </button>
          <button class="tab-btn ${this.view === "grid" ? "active" : ""}" data-view="grid">
            📝 All
          </button>
          <button class="tab-btn ${this.view === "smart" ? "active" : ""}" data-view="smart">
            🤖 Smart
          </button>
          <button class="tab-btn ${this.view === "favorites" ? "active" : ""}" data-view="favorites">
            ⭐ Favorites
          </button>
          <button class="tab-btn ${this.view === "custom" ? "active" : ""}" data-view="custom">
            ✨ Custom
          </button>
          <button class="tab-btn ${this.view === "compose" ? "active" : ""}" data-view="compose">
            ✍️ Compose
          </button>
          <button class="tab-btn ${this.view === "arsenal" ? "active" : ""}" data-view="arsenal">
            ⚔️ Arsenal
          </button>
          <button class="tab-btn ${this.view === "stats" ? "active" : ""}" data-view="stats">
            📊 Stats
          </button>
          <button class="tab-btn ${this.view === "weekly" ? "active" : ""}" data-view="weekly">
            📅 Weekly
          </button>
          <button class="tab-btn ${this.view === "timing" ? "active" : ""}" data-view="timing">
            ⏰ Timing
          </button>
          <button class="tab-btn ${this.view === "trending" ? "active" : ""}" data-view="trending">
            🔥 Trending
          </button>
          <button class="tab-btn ${this.view === "engagement" ? "active" : ""}" data-view="engagement">
            📈 Engagement
          </button>
          <button class="tab-btn ${this.view === "abtest" ? "active" : ""}" data-view="abtest">
            🧪 A/B Test
          </button>
          <button class="tab-btn ${this.view === "cache" ? "active" : ""}" data-view="cache">
            💾 Cache
          </button>
        </div>
        <div class="header-actions">
          <button class="close-btn" aria-label="Close">×</button>
        </div>
      </div>

      <div class="selector-content ${this.view}-view" id="tabContent">
        ${this.renderViewContent()}
      </div>

      <div class="selector-footer">
        <div class="selection-info">
          ${this.renderSelectionInfo()}
        </div>
        <div class="footer-buttons">
          <button class="smart-defaults-btn" title="Apply smart defaults based on your usage">
            🎯 Smart Defaults
          </button>
          <button class="generate-btn ${this.isReadyToGenerate() ? "active" : ""}"
                  ${!this.isReadyToGenerate() ? "disabled" : ""}>
            Generate Reply
          </button>
        </div>
      </div>
    `;

    if (currentWidth) this.container.style.width = currentWidth;
    if (currentHeight) this.container.style.height = currentHeight;

    this.attachEventListeners();
  }

  /**
   * Render persistent selection bar
   */
  private renderPersistentSelectionBar(): string {
    const hasAnySelection =
      this.selectedPersona ||
      this.selectedPersonality ||
      this.selectedVocabulary ||
      this.selectedTemplate ||
      this.selectedLengthPacing;

    if (!hasAnySelection) {
      return "";
    }

    let selectionSummary = "";

    if (this.view === "personas" && this.selectedPersona) {
      selectionSummary = `
        <div class="selection-item persona-selection">
          <span class="selection-emoji">${this.selectedPersona.emoji}</span>
          <span class="selection-name">${this.selectedPersona.name}</span>
        </div>
      `;
    } else if (this.view === "grid") {
      const items = [];
      if (this.selectedPersonality) {
        items.push(
          `<div class="selection-item"><span class="selection-number">1️⃣</span><span class="selection-emoji">${this.selectedPersonality.emoji}</span><span class="selection-name">${this.selectedPersonality.label}</span></div>`,
        );
      }
      if (this.selectedVocabulary) {
        items.push(
          `<div class="selection-item"><span class="selection-number">2️⃣</span><span class="selection-emoji">${this.selectedVocabulary.emoji}</span><span class="selection-name">${this.selectedVocabulary.label}</span></div>`,
        );
      }
      if (this.selectedTemplate) {
        items.push(
          `<div class="selection-item"><span class="selection-number">3️⃣</span><span class="selection-emoji">${this.selectedTemplate.emoji}</span><span class="selection-name">${this.selectedTemplate.name}</span></div>`,
        );
      }
      if (this.selectedLengthPacing) {
        items.push(
          `<div class="selection-item"><span class="selection-number">4️⃣</span><span class="selection-name">${this.selectedLengthPacing.label}</span></div>`,
        );
      }
      selectionSummary = items.join("");
    } else {
      const items = [];
      if (this.selectedTemplate) {
        items.push(
          `<div class="selection-item"><span class="selection-emoji">${this.selectedTemplate.emoji}</span><span class="selection-name">${this.selectedTemplate.name}</span></div>`,
        );
      }
      if (this.selectedPersonality) {
        items.push(
          `<div class="selection-item"><span class="selection-emoji">${this.selectedPersonality.emoji}</span><span class="selection-name">${this.selectedPersonality.label}</span></div>`,
        );
      }
      selectionSummary = items.join(" + ");
    }

    return `
      <div class="persistent-selection-bar">
        <div class="selection-summary">
          ${selectionSummary}
        </div>
        <button class="clear-selection-btn" title="Clear all selections">
          <span class="clear-icon">×</span>
          Clear
        </button>
      </div>
    `;
  }

  /**
   * Render view content using TabManager for modular tabs
   */
  private renderViewContent(): string {
    // Map view names to TabManager tab types
    const tabMap: Record<string, string> = {
      personas: "personas",
      grid: "grid",
      smart: "smart",
      favorites: "favorites",
      custom: "custom",
      compose: "compose",
      arsenal: "arsenal",
      stats: "stats",
      weekly: "weekly",
      timing: "timing",
      trending: "trending",
      engagement: "engagement",
      abtest: "abtest",
      cache: "cache",
    };

    const tabType = tabMap[this.view] || "smart";
    
    // Switch to the tab and let TabManager handle rendering
    setTimeout(async () => {
      await this.tabManager.switchTab(tabType as any);
      this.tabManager.renderCurrentTab();
    }, 0);
    
    // Return placeholder content that will be replaced by TabManager
    return '<div class="loading-tab">Loading...</div>';
  }

  /**
   * Render selection info for footer
   */
  private renderSelectionInfo(): string {
    if (this.view === "personas") {
      return this.selectedPersona 
        ? `<span class="selected-persona">${this.selectedPersona.emoji} ${this.selectedPersona.name}</span>` 
        : '<span class="missing-item">Select a persona...</span>';
    } else if (this.view === "grid") {
      return `
        <div class="four-part-selection">
          ${this.selectedPersonality ? `<span class="selected-item">1️⃣ ${this.selectedPersonality.emoji}</span>` : '<span class="missing-item">1️⃣ ...</span>'}
          ${this.selectedVocabulary ? `<span class="selected-item">2️⃣ ${this.selectedVocabulary.emoji}</span>` : '<span class="missing-item">2️⃣ ...</span>'}
          ${this.selectedTemplate ? `<span class="selected-item">3️⃣ ${this.selectedTemplate.emoji}</span>` : '<span class="missing-item">3️⃣ ...</span>'}
          ${this.selectedLengthPacing ? `<span class="selected-item">4️⃣ ${this.selectedLengthPacing.label.substring(0, 10)}</span>` : '<span class="missing-item">4️⃣ ...</span>'}
        </div>
      `;
    } else {
      return `
        ${this.selectedTemplate ? `<span class="selected-template">${this.selectedTemplate.emoji} ${this.selectedTemplate.name}</span>` : ""}
        ${this.selectedPersonality ? `<span class="selected-personality">${this.selectedPersonality.emoji} ${this.selectedPersonality.label}</span>` : ""}
      `;
    }
  }

  /**
   * Check if ready to generate
   */
  private isReadyToGenerate(): boolean {
    if (this.view === "personas") {
      return !!this.selectedPersona;
    } else if (this.view === "grid") {
      return !!(
        this.selectedPersonality &&
        this.selectedVocabulary &&
        this.selectedTemplate &&
        this.selectedLengthPacing
      );
    } else {
      return !!(this.selectedTemplate && this.selectedPersonality);
    }
  }

  /**
   * Attach event listeners
   */
  private attachEventListeners(): void {
    if (!this.container) return;

    // Clear selection button
    const clearBtn = this.container.querySelector(".clear-selection-btn");
    if (clearBtn) {
      clearBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.clearAllSelections();
        this.render();
        if (this.anchorButton) {
          visualFeedback.showSuccess(this.anchorButton, "Selections cleared");
        }
      });
    }

    // Tab switching
    this.container.querySelectorAll(".tab-btn").forEach((btn) => {
      (btn as HTMLElement).addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const view = (e.currentTarget as HTMLElement).dataset.view as typeof this.view;
        this.view = view;
        
        // Load data for specific tabs if needed
        if (view === "smart") {
          this.loadSmartSuggestions();
        } else if (view === "custom") {
          setTimeout(() => this.populateCustomCombosList(), 100);
        }
        
        this.render();
      });
    });

    // Settings button
    const settingsBtn = this.container.querySelector(".settings-btn");
    if (settingsBtn) {
      settingsBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.openSettingsModal();
      });
    }

    // Quick Generate button
    const quickGenerateBtn = this.container.querySelector(".quick-generate-btn");
    if (quickGenerateBtn) {
      quickGenerateBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.handleQuickGenerate();
      });
    }

    // Smart defaults button
    const smartDefaultsBtn = this.container.querySelector(".smart-defaults-btn");
    if (smartDefaultsBtn) {
      smartDefaultsBtn.addEventListener("click", async () => {
        await this.applySmartDefaults();
      });
    }

    // Generate button
    const generateBtn = this.container.querySelector(".generate-btn");
    if (generateBtn) {
      generateBtn.addEventListener("click", () => {
        this.handleGenerate();
      });
    }

    // Close button
    const closeBtn = this.container.querySelector(".close-btn");
    if (closeBtn) {
      closeBtn.addEventListener("click", () => {
        this.hide();
      });
    }

    // Expanded view toggle
    const expandedViewBtn = this.container.querySelector(".expanded-view-toggle-btn");
    if (expandedViewBtn) {
      expandedViewBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.toggleExpandedView();
      });
    }
  }

  /**
   * Clear all selections
   */
  private clearAllSelections(): void {
    this.selectedPersona = null;
    this.selectedPersonality = null;
    this.selectedVocabulary = null;
    this.selectedTemplate = null;
    this.selectedLengthPacing = null;
  }

  /**
   * Handle generate action
   */
  private handleGenerate(): void {
    if (!this.onSelectCallback) return;

    let result: SelectionResult;

    if (this.view === "personas") {
      if (!this.selectedPersona) return;

      result = {
        template: {
          id: this.selectedPersona.id,
          name: this.selectedPersona.name,
          emoji: this.selectedPersona.emoji,
          prompt: this.selectedPersona.systemPrompt,
          description: this.selectedPersona.description,
          category: "persona",
          categoryLabel: "Persona",
        },
        tone: {
          id: this.selectedPersona.id,
          emoji: this.selectedPersona.emoji,
          label: this.selectedPersona.name,
          description: this.selectedPersona.description,
          systemPrompt: this.selectedPersona.systemPrompt,
          category: "neutral",
        },
        combinedPrompt: this.selectedPersona.systemPrompt,
        temperature: 0.8,
        vocabulary: this.selectedPersona.vocabulary,
        lengthPacing: this.selectedPersona.lengthPacing,
        personality: this.selectedPersona.personality,
        rhetoric: this.selectedPersona.rhetoricMove,
        tabType: "personas",
        personaConfig: {
          personality: this.selectedPersona.personality || "",
          vocabulary: this.selectedPersona.vocabulary || "",
          rhetoricMove: this.selectedPersona.rhetoricMove || "",
          lengthPacing: this.selectedPersona.lengthPacing || "",
          systemPrompt: this.selectedPersona.systemPrompt,
        },
      };
    } else if (this.view === "compose") {
      // Handle compose view generation
      // For now, use a simple compose configuration
      // TODO: Get compose data from the ComposeTab component
      const composeTopic = "general tweet";
      
      result = {
        template: {
          id: "compose_tweet",
          name: "Compose Tweet",
          emoji: "✍️",
          prompt: `Write an original tweet about: ${composeTopic}`,
          description: "Generate original tweet",
          category: "compose",
          categoryLabel: "Compose",
        },
        tone: {
          id: "compose_tone",
          systemPrompt: "",
          emoji: "✍️",
          label: "Compose",
          description: "Original tweet composition",
          category: "neutral",
        },
        combinedPrompt: `Write an original tweet about: ${composeTopic}`,
        temperature: 0.8,
        tabType: "compose",
        composeConfig: {
          topic: composeTopic,
        },
      };
    } else if (this.view === "grid") {
      if (
        !this.selectedPersonality ||
        !this.selectedVocabulary ||
        !this.selectedTemplate ||
        !this.selectedLengthPacing
      )
        return;

      const combinedPrompt = `${this.selectedTemplate.prompt} ${this.selectedPersonality.systemPrompt || ""}`;

      result = {
        template: this.selectedTemplate,
        tone: this.selectedPersonality,
        combinedPrompt,
        temperature: 0.7,
        vocabulary: this.selectedVocabulary.id,
        lengthPacing: this.selectedLengthPacing.id,
        tabType: "all",
        allTabConfig: {
          personality: this.selectedPersonality.id,
          vocabulary: this.selectedVocabulary.id,
          rhetoric: this.selectedTemplate.id,
          lengthPacing: this.selectedLengthPacing.id,
        },
      };
    } else {
      if (!this.selectedTemplate || !this.selectedPersonality) return;

      const combinedPrompt = `${this.selectedTemplate.prompt} ${this.selectedPersonality.systemPrompt || ""}`;

      result = {
        template: this.selectedTemplate,
        tone: this.selectedPersonality,
        combinedPrompt,
        temperature: 0.7,
      };

      // Add tab-specific configs
      if (this.view === "smart") {
        result.tabType = "smart";
        result.allTabConfig = {
          personality: this.selectedPersonality.id,
          vocabulary: this.selectedVocabulary?.id || "Plain English with modern slang",
          rhetoric: this.selectedTemplate.id,
          lengthPacing: this.selectedLengthPacing?.id || "Normal reply with 1-2 sentences",
        };
      } else if (this.view === "favorites") {
        result.tabType = "favorites";
        result.allTabConfig = {
          personality: this.selectedPersonality.id,
          vocabulary: this.selectedVocabulary?.id || "Plain English with modern slang",
          rhetoric: this.selectedTemplate.id,
          lengthPacing: this.selectedLengthPacing?.id || "Normal reply with 1-2 sentences",
        };
      } else if (this.view === "custom") {
        result.tabType = "custom";
        // TODO: Get custom form data from the CustomTab component
        result.customConfig = {
          style: "casual",
          tone: "friendly",
          length: "medium",
        };
      }
    }

    // Save recent settings
    if (this.view === "grid") {
      const recentSettings = {
        personality: this.selectedPersonality?.id,
        vocabulary: this.selectedVocabulary?.id,
        rhetoric: this.selectedTemplate?.id,
        lengthPacing: this.selectedLengthPacing?.id,
        timestamp: Date.now(),
      };
      localStorage.setItem("tweetcraft_recent_settings", JSON.stringify(recentSettings));
    }

    this.hide();
    this.onSelectCallback(result);
  }

  /**
   * Handle quick generate with randomization
   */
  private async handleQuickGenerate(): Promise<void> {
    if (!this.onSelectCallback) return;

    console.log(
      "%c⚡ Quick Generate triggered (with randomization)",
      "color: #1DA1F2; font-weight: bold",
    );

    try {
      const personalities = PERSONALITIES;
      const templates = TEMPLATES;
      const vocabularyStyles = getAllVocabularyStyles();
      const lengthPacingStyles = getAllLengthPacingStyles();

      const randomPersonality = personalities[Math.floor(Math.random() * personalities.length)];
      const randomTemplate = templates[Math.floor(Math.random() * templates.length)];
      const randomVocabulary = vocabularyStyles[Math.floor(Math.random() * vocabularyStyles.length)];
      const randomLengthPacing = lengthPacingStyles[Math.floor(Math.random() * lengthPacingStyles.length)];

      const selections = {
        personality: randomPersonality.id,
        vocabulary: randomVocabulary.id,
        rhetoric: randomTemplate.id,
        lengthPacing: randomLengthPacing.id,
      };

      let combinedPrompt = `${randomPersonality.systemPrompt}\n\nReply approach: ${randomTemplate.prompt}`;
      if (randomVocabulary) {
        combinedPrompt += `\n\nVocabulary style: ${randomVocabulary.systemPrompt}`;
      }
      if (randomLengthPacing) {
        combinedPrompt += `\n\nLength and pacing: ${randomLengthPacing.systemPrompt}`;
      }

      const result: SelectionResult = {
        template: randomTemplate,
        tone: randomPersonality,
        combinedPrompt,
        temperature: 0.7,
        vocabulary: selections.vocabulary,
        lengthPacing: selections.lengthPacing,
        personality: selections.personality,
        rhetoric: selections.rhetoric,
        tabType: "all",
        allTabConfig: {
          personality: selections.personality,
          vocabulary: selections.vocabulary,
          rhetoric: selections.rhetoric,
          lengthPacing: selections.lengthPacing,
        },
      };

      await smartDefaults.saveLastUsed(selections);

      console.log("%c✅ Quick Generate completed", "color: #17BF63; font-weight: bold");

      this.hide();
      this.onSelectCallback(result);
    } catch (error) {
      console.error("Quick Generate failed:", error);
    }
  }

  /**
   * Apply smart defaults based on usage patterns
   */
  private async applySmartDefaults(): Promise<void> {
    const smartDefaultsService = new SmartDefaultsService();
    const currentContent = this.getCurrentTweetContent();
    const defaults = await smartDefaultsService.getSmartDefaults(currentContent);

    if (!defaults) {
      visualFeedback.showToast("Unable to determine smart defaults", {
        type: "warning",
      });
      return;
    }

    if (this.view === "grid") {
      if (defaults.personality) {
        const personality = PERSONALITIES.find((p) => p.id === defaults.personality);
        if (personality) this.selectedPersonality = personality;
      }

      if (defaults.vocabulary) {
        const vocabularies = getAllVocabularyStyles();
        const vocabulary = vocabularies.find((v) => v.id === defaults.vocabulary);
        if (vocabulary) this.selectedVocabulary = vocabulary;
      }

      if (defaults.rhetoric) {
        const template = TEMPLATES.find((t) => t.id === defaults.rhetoric);
        if (template) this.selectedTemplate = template;
      }

      if (defaults.lengthPacing) {
        const lengthPacings = getAllLengthPacingStyles();
        const lengthPacing = lengthPacings.find((l) => l.id === defaults.lengthPacing);
        if (lengthPacing) this.selectedLengthPacing = lengthPacing;
      }
    } else if (this.view === "personas") {
      const personas = getAllQuickPersonas();
      const matchingPersona = personas.find((p) => p.personality === defaults.personality);
      if (matchingPersona) {
        this.selectedPersona = matchingPersona;
      }
    } else {
      if (defaults.rhetoric) {
        const template = TEMPLATES.find((t) => t.id === defaults.rhetoric);
        if (template) this.selectedTemplate = template;
      }

      if (defaults.personality) {
        const personality = PERSONALITIES.find((p) => p.id === defaults.personality);
        if (personality) this.selectedPersonality = personality;
      }
    }

    visualFeedback.showToast(`Smart defaults applied: ${defaults.reason}`, {
      type: "success",
      duration: 4000,
    });

    this.render();

    logger.success("Smart Defaults Applied", {
      confidence: defaults.confidence,
      reason: defaults.reason,
      selections: defaults,
    });
  }

  /**
   * Get current tweet content for context
   */
  private getCurrentTweetContent(): string {
    try {
      const textarea = DOMUtils.findReplyTextarea();
      if (textarea && textarea instanceof HTMLElement) {
        if (textarea.tagName === "TEXTAREA") {
          return (textarea as HTMLTextAreaElement).value;
        } else if (textarea.contentEditable === "true") {
          return textarea.textContent || "";
        }
      }
      return "";
    } catch (error) {
      console.error("Failed to get tweet content:", error);
      return "";
    }
  }

  /**
   * Toggle expanded view
   */
  private toggleExpandedView(): void {
    // Implementation for expanded view toggle
    // This is a simplified version - you may want to implement the full expanded view
    const btn = this.container?.querySelector(".expanded-view-toggle-btn") as HTMLButtonElement;
    const isExpanded = btn?.getAttribute("data-expanded") === "true";

    if (!isExpanded) {
      btn?.setAttribute("data-expanded", "true");
      const icon = btn?.querySelector(".expand-icon");
      if (icon) icon.textContent = "⊟";
      
      // Expand the container
      if (this.container) {
        this.container.style.width = "800px";
        this.container.style.maxWidth = "90vw";
        this.container.style.height = "600px";
        this.container.style.maxHeight = "90vh";
      }
    } else {
      btn?.setAttribute("data-expanded", "false");
      const icon = btn?.querySelector(".expand-icon");
      if (icon) icon.textContent = "⊞";
      
      // Restore normal size
      const savedSize = this.getSavedSize();
      if (this.container) {
        this.container.style.width = `${savedSize.width}px`;
        this.container.style.height = `${savedSize.height}px`;
      }
    }
  }

  /**
   * Open settings modal
   */
  private openSettingsModal(): void {
    chrome.runtime.sendMessage({ action: "openOptionsPage" }, (response) => {
      if (chrome.runtime.lastError) {
        console.error("Failed to open settings:", chrome.runtime.lastError);
        this.showSettingsInlineModal();
      }
    });
  }

  /**
   * Show inline settings modal as fallback
   */
  private showSettingsInlineModal(): void {
    const modalOverlay = document.createElement("div");
    modalOverlay.className = "settings-modal-overlay";
    modalOverlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 999999;
    `;

    const modal = document.createElement("div");
    modal.style.cssText = `
      background: #15202B;
      border-radius: 16px;
      padding: 24px;
      max-width: 400px;
      width: 90%;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
      border: 1px solid #38444D;
    `;

    modal.innerHTML = `
      <div style="text-align: center;">
        <h2 style="margin: 0 0 16px 0; color: #1DA1F2; font-size: 20px;">
          ⚙️ TweetCraft Settings
        </h2>
        <p style="color: #8899A6; font-size: 14px; margin-bottom: 20px;">
          Click the TweetCraft extension icon in your browser toolbar to access all settings.
        </p>
        <button class="close-settings-modal" style="
          padding: 8px 20px;
          background: #1DA1F2;
          border: none;
          border-radius: 20px;
          color: white;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
        ">
          Got it!
        </button>
      </div>
    `;

    modalOverlay.appendChild(modal);
    document.body.appendChild(modalOverlay);

    const closeModal = () => {
      modalOverlay.remove();
    };

    modal.querySelector(".close-settings-modal")?.addEventListener("click", closeModal);
    modalOverlay.addEventListener("click", (e) => {
      if (e.target === modalOverlay) closeModal();
    });
  }

  /**
   * Load smart suggestions
   */
  private async loadSmartSuggestions(): Promise<void> {
    try {
      console.log("%c🤖 Loading smart suggestions", "color: #1DA1F2");

      const replyBox = document.querySelector(
        '[data-testid="tweetTextarea_0"], .DraftEditor-root',
      );
      let context: any = { tweetText: "", isReply: false };

      if (replyBox) {
        const extracted = DOMUtils.extractTwitterContext();
        context = {
          tweetText: extracted.tweetText || "",
          isReply: extracted.isReply,
          threadContext: extracted.threadContext,
        };
      }

      // Get topic-aware recommendations if we have tweet content
      if (context.tweetText && context.tweetText.trim().length > 10) {
        try {
          const topicRecommendations = await topicTracker.getTopicRecommendations(context.tweetText);
          // Store recommendations for later use
          (this as any)._topicRecommendations = topicRecommendations;
        } catch (error) {
          console.error('Failed to get topic recommendations:', error);
        }
      }

      const suggestions = await templateSuggester.getSuggestions({
        tweetText: context.tweetText || "",
        isReply: true,
        threadContext: context.threadContext,
        timeOfDay: new Date().getHours(),
        dayOfWeek: new Date().getDay(),
      });

      // Store suggestions for later use
      (this as any)._smartSuggestions = suggestions;

      console.log("%c🤖 Smart suggestions loaded", "color: #17BF63");

      this.render();
    } catch (error) {
      console.error("Failed to load smart suggestions:", error);
      this.render();
    }
  }

  /**
   * Populate custom combos list
   */
  private async populateCustomCombosList(): Promise<void> {
    // This will be handled by the CustomTab component itself
    // The CustomTab has its own logic for populating combos
  }

  /**
   * Load favorites from storage
   */
  private async loadFavorites(): Promise<void> {
    try {
      const stored = localStorage.getItem("tweetcraft_favorites");
      const prefs = stored ? JSON.parse(stored) : null;
      if (prefs) {
        this.favoriteRhetoric = new Set(prefs.favoriteRhetoric || prefs.favoriteTemplates || []);
        this.favoritePersonalities = new Set(prefs.favoritePersonalities || prefs.favoriteTones || []);
        this.favoriteVocabulary = new Set(prefs.favoriteVocabulary || []);
        this.favoriteLengthPacing = new Set(prefs.favoriteLengthPacing || []);
      }
    } catch (error) {
      console.error("Failed to load favorites:", error);
    }
  }

  /**
   * Save favorites to storage
   */
  private saveFavorites(): void {
    const favorites = {
      favoriteTemplates: Array.from(this.favoriteTemplates),
      favoritePersonalities: Array.from(this.favoritePersonalities),
      favoriteVocabulary: Array.from(this.favoriteVocabulary),
      favoriteLengthPacing: Array.from(this.favoriteLengthPacing),
      favoriteRhetoric: Array.from(this.favoriteRhetoric),
    };
    localStorage.setItem("tweetcraft_favorites", JSON.stringify(favorites));
  }

  /**
   * Load custom templates from storage
   */
  private async loadCustomTemplates(): Promise<void> {
    try {
      chrome.runtime.sendMessage(
        { type: MessageType.GET_STORAGE, keys: ["customTemplates"] },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error("Failed to load custom templates:", chrome.runtime.lastError);
            return;
          }

          if (response && response.success && response.data) {
            const customTemplates = response.data.customTemplates || [];
            if (Array.isArray(customTemplates)) {
              customTemplates.forEach((template: Template) => {
                if (!TEMPLATES.find((t) => t.id === template.id)) {
                  TEMPLATES.push(template);
                }
              });
            }
          }
        },
      );
    } catch (error) {
      console.error("Failed to load custom templates:", error);
    }
  }

  /**
   * Apply styles
   */
  private applyStyles(): void {
    // Reuse existing styles - this would be imported from a separate CSS file
    // For now, just ensure basic styles are applied
    if (!document.querySelector("#tweetcraft-unified-styles")) {
      const style = document.createElement("style");
      style.id = "tweetcraft-unified-styles";
      // Import styles from a separate CSS file or module
      style.textContent = this.getStyles();
      document.head.appendChild(style);
    }
  }

  /**
   * Get styles for the selector
   */
  private getStyles(): string {
    // This should be imported from a separate CSS module
    // For now, return minimal styles
    return `
      .tweetcraft-unified-selector {
        position: fixed;
        background: #15202b;
        border: 1px solid rgba(139, 152, 165, 0.3);
        border-radius: 12px;
        display: flex;
        flex-direction: column;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        z-index: 10001;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.8);
        overflow: hidden;
      }
      
      .selector-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 12px;
        border-bottom: 1px solid rgba(139, 152, 165, 0.2);
        background: #15202b;
        gap: 12px;
      }
      
      .selector-tabs {
        display: flex;
        gap: 4px;
        flex: 1;
        overflow-x: auto;
      }
      
      .tab-btn {
        padding: 4px 8px;
        background: transparent;
        border: 1px solid transparent;
        border-radius: 12px;
        color: #8b98a5;
        cursor: pointer;
        transition: all 0.2s;
        font-size: 12px;
        font-weight: 500;
        white-space: nowrap;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 3px;
        flex-shrink: 0;
      }
      
      .tab-btn:hover {
        background: rgba(255, 255, 255, 0.05);
      }
      
      .tab-btn.active {
        background: rgba(29, 155, 240, 0.2);
        border-color: rgba(29, 155, 240, 0.5);
        color: #1d9bf0;
      }
      
      .selector-content {
        flex: 1;
        overflow-y: auto;
        padding: 12px;
        background: #15202b;
      }
      
      .selector-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px 14px;
        border-top: 1px solid rgba(139, 152, 165, 0.2);
        background: #15202b;
        margin-top: auto;
        gap: 8px;
      }
      
      /* Add more essential styles as needed */
    `;
  }

  /**
   * Destroy the component
   */
  destroy(): void {
    this.hide();
    if (this.tabManager) {
      this.tabManager.destroy();
    }
    this.container = null;
    this.onSelectCallback = null;
  }
}

export const unifiedSelector = new UnifiedSelector();
