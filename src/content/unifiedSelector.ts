/**
 * Unified Template & Tone Selector
 * Matrix-based selection UI for combining templates and tones
 */

import {
  Template,
  Personality,
  TEMPLATES,
  PERSONALITIES,
} from "@/config/templatesAndTones";
import { VocabularyStyle, getAllVocabularyStyles } from "@/config/vocabulary";
import {
  LengthPacingStyle,
  getAllLengthPacingStyles,
} from "@/config/lengthPacing";
import { QuickPersona, getAllQuickPersonas } from "@/config/quickPersonas";
// Type alias for backward compatibility
type Tone = Personality;
import { visualFeedback } from "@/ui/visualFeedback";
import { templateSuggester } from "@/services/templateSuggester";
import { DOMUtils } from "@/content/domUtils";
import { imageService } from "@/services/imageService";
import { smartDefaults, SmartDefaultsService } from "@/services/smartDefaults";
import { usageTracker } from "@/services/usageTracker";
import { createTemplateId } from "@/types/branded";
import { logger } from "@/utils/logger";
import { TrendService, TrendingTopic } from "@/services/trendService";
import { debounce } from "@/utils/debounce";
import { MessageType } from "@/types/messages";

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
  tabType?:
    | "personas"
    | "all"
    | "smart"
    | "favorites"
    | "custom"
    | "compose";
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
  private isResizing: boolean = false;
  private mouseDownStartedInside: boolean = false;
  private selectedTemplate: Template | null = null;
  private selectedPersonality: Personality | null = null;
  private selectedVocabulary: VocabularyStyle | null = null;
  private selectedLengthPacing: LengthPacingStyle | null = null;
  private selectedPersona: QuickPersona | null = null;
  // Backward compatibility alias
  private get selectedTone(): Personality | null {
    return this.selectedPersonality;
  }
  private set selectedTone(value: Personality | null) {
    this.selectedPersonality = value;
  }
  // Alias for selectedTemplate (rhetoric is essentially the template)
  private get selectedRhetoric(): Template | null {
    return this.selectedTemplate;
  }
  private set selectedRhetoric(value: Template | null) {
    this.selectedTemplate = value;
  }
  private onSelectCallback: ((result: SelectionResult) => void) | null = null;
  private favoriteRhetoric: Set<string> = new Set();
  // Backward compatibility alias
  private get favoriteTemplates(): Set<string> {
    return this.favoriteRhetoric;
  }
  private favoritePersonalities: Set<string> = new Set();
  // Backward compatibility alias
  private get favoriteTones(): Set<string> {
    return this.favoritePersonalities;
  }
  private favoriteVocabulary: Set<string> = new Set();
  private favoriteLengthPacing: Set<string> = new Set();
  private view:
    | "personas"
    | "grid"
    | "smart"
    | "favorites"
    | "custom"
    | "compose" = "smart";
  private clickOutsideHandler: ((e: MouseEvent) => void) | null = null;
  private scrollHandler: (() => void) | null = null;
  private anchorButton: HTMLElement | null = null;
  private smartSuggestions: {
    templates: Template[];
    personalities: Personality[];
  } = { templates: [], personalities: [] };
  private smartSuggestionsScores: any[] = [];
  private customTemplatesLoaded: Promise<void> | null = null;
  private quickGenerateButton: HTMLElement | null = null;
  private lastUsedSelections: any = null;
  private composeTopic: string = "";
  private selectedTrend: TrendingTopic | null = null;
  private trendingSuggestions: TrendingTopic[] = [];
  private debouncedHashtagUpdate: ((topic: string) => void) | null = null;
  private eventListenerCleanups: (() => void)[] = [];

  // Trending suggestions cache
  private trendingCache: { data: TrendingTopic[]; fetchedAt: number } | null =
    null;
  private readonly TRENDING_CACHE_TTL = 15 * 60 * 1000; // 15 minutes
  private fetchButton: HTMLElement | null = null;
  private fetchButtonDebounceTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.loadFavorites();
    // Defer async loading
    this.customTemplatesLoaded = this.loadCustomTemplates();
  }

  /**
   * Helper method to truncate text for preview display
   */
  private truncateText(text: string, maxLength: number): string {
    if (!text) return "Not specified";
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  }

  /**
   * Get section completion status for the ALL tab (4-part structure)
   */
  private getSectionCompletionStatus(): {
    personality: boolean;
    vocabulary: boolean;
    rhetoric: boolean;
    lengthPacing: boolean;
    completedCount: number;
    totalCount: number;
    percentage: number;
  } {
    const status = {
      personality: this.selectedPersonality !== null,
      vocabulary: this.selectedVocabulary !== null,
      rhetoric: this.selectedTemplate !== null,
      lengthPacing: this.selectedLengthPacing !== null,
      completedCount: 0,
      totalCount: 4,
      percentage: 0,
    };

    status.completedCount = [
      status.personality,
      status.vocabulary,
      status.rhetoric,
      status.lengthPacing,
    ].filter(Boolean).length;
    status.percentage = Math.round(
      (status.completedCount / status.totalCount) * 100,
    );

    return status;
  }

  /**
   * Get completion indicator HTML for a section
   */
  private getSectionCompletionIndicator(
    isCompleted: boolean,
    needsSelection: boolean = false,
  ): string {
    if (isCompleted) {
      return '<span class="section-completion-indicator completed" title="Section completed">✓</span>';
    } else if (needsSelection) {
      return '<span class="section-completion-indicator needs-selection" title="Selection required">●</span>';
    }
    return '<span class="section-completion-indicator empty" title="No selection yet">○</span>';
  }

  /**
   * Get saved size preferences from localStorage
   */
  private getSavedSize(): { width: number; height: number } {
    // Get screen width for responsive defaults
    const screenWidth =
      window.innerWidth || document.documentElement.clientWidth;

    // Determine default width based on screen size
    let defaultWidth = 840;
    if (screenWidth < 1024) {
      defaultWidth = Math.min(screenWidth * 0.9, 600); // 90% of screen or 600px max for small screens
    } else if (screenWidth < 1440) {
      defaultWidth = 720; // Medium screens
    }

    try {
      const saved = localStorage.getItem("tweetcraft-selector-size");
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          width: Math.min(
            Math.max(parsed.width || defaultWidth, 480),
            Math.min(980, screenWidth * 0.95),
          ), // Responsive max width
          height: Math.min(Math.max(parsed.height || 380, 350), 450), // Default 380, max 450 for compact
        };
      }
    } catch (e) {
      logger.error("Failed to get saved size", e);
    }
    // Default size - responsive to screen width
    return { width: defaultWidth, height: 380 };
  }

  /**
   * Save size preferences to localStorage
   */
  private saveSize(width: number, height: number): void {
    try {
      // Define constraints
      let minWidth = 480;
      let maxWidth = 900;
      let minHeight = 350;
      let maxHeight = 600;

      // Validate that min < max, swap if needed
      if (minWidth > maxWidth) {
        [minWidth, maxWidth] = [maxWidth, minWidth];
        console.warn(
          "Width constraints were invalid (min > max), swapped values",
        );
      }
      if (minHeight > maxHeight) {
        [minHeight, maxHeight] = [maxHeight, minHeight];
        console.warn(
          "Height constraints were invalid (min > max), swapped values",
        );
      }

      // Apply validated constraints
      const constrainedWidth = Math.min(Math.max(width, minWidth), maxWidth);
      const constrainedHeight = Math.min(
        Math.max(height, minHeight),
        maxHeight,
      );

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
   * Get example preview text for personality types
   */
  private getPersonalityExample(personalityId: string): string {
    const examples: Record<string, string> = {
      friendly: '"Oh this is great! Love seeing posts like this ✨"',
      supportive: '"This resonates so much. Sending you strength 🤗"',
      motivational: '"Yes! You\'ve got this! Keep pushing forward 💪"',
      professional:
        '"Interesting perspective on this topic. Well articulated."',
      sarcastic: '"Well, that\'s one way to look at it... 🤔"',
      humorous: '"Haha this made my day! Thanks for the laugh 😄"',
      technical: '"Good point about the implementation details here."',
      creative: '"This sparks so many creative ideas! ✨🎨"',
      analytical:
        '"Breaking this down, there are several factors to consider..."',
      casual: '"yep totally agree! thanks for sharing this"',
      enthusiastic:
        '"OMG YES! This is exactly what I needed to see today!!! 🎉"',
      empathetic:
        '"I can really feel what you\'re going through here. Thank you for sharing."',
    };
    return examples[personalityId] || "See preview when you hover...";
  }

  /**
   * Get example preview text for vocabulary styles
   */
  private getVocabularyExample(vocabularyId: string): string {
    const examples: Record<string, string> = {
      plain_english: '"That makes total sense to me."',
      corporate: '"This aligns well with our strategic objectives."',
      gen_z: '"no cap this is actually fire ngl"',
      academic: '"This empirical evidence supports your hypothesis."',
      casual: '"yeah totally, makes sense"',
      technical: '"The implementation methodology is sound here."',
      creative: '"This paints such a vivid picture in my mind!"',
    };
    return examples[vocabularyId] || "See preview when you hover...";
  }

  /**
   * Get example preview text for rhetoric approaches
   */
  private getRhetoricExample(rhetoricId: string): string {
    const examples: Record<string, string> = {
      agree_and_build: '"Yes, and building on that idea..."',
      question: '"What are your thoughts on the long-term implications?"',
      devils_advocate: '"Playing devil\'s advocate here, but what if..."',
      personal_experience: '"This reminds me of when I experienced..."',
      hot_take: '"Controversial opinion: I think you\'re absolutely right."',
      steel_man: '"The strongest version of this argument would be..."',
    };
    return examples[rhetoricId] || "See preview when you hover...";
  }

  /**
   * Show the unified selector
   */
  async show(
    button: HTMLElement,
    onSelect: (result: SelectionResult) => void,
  ): Promise<void> {
    // Ensure custom templates are loaded
    if (this.customTemplatesLoaded) {
      await this.customTemplatesLoaded;
    }

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
  }

  /**
   * Hide the selector
   */
  hide(): void {
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

    // Remove click outside handler and mouse tracking handlers
    if (this.clickOutsideHandler) {
      document.removeEventListener("click", this.clickOutsideHandler, true);
      this.clickOutsideHandler = null;
    }

    // Remove mouse tracking handlers
    if ((this as any)._mouseDownHandler) {
      document.removeEventListener(
        "mousedown",
        (this as any)._mouseDownHandler,
        true,
      );
      (this as any)._mouseDownHandler = null;
    }

    if ((this as any)._mouseUpHandler) {
      document.removeEventListener(
        "mouseup",
        (this as any)._mouseUpHandler,
        true,
      );
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

    // Calculate whether to show above or below
    const spaceBelow = viewportHeight - buttonRect.bottom;
    const spaceAbove = buttonRect.top;
    const selectorHeight = 600; // max-height from CSS (updated to match new design)
    const showAbove = spaceBelow < selectorHeight && spaceAbove > spaceBelow;

    // Use fixed positioning to stick to viewport
    this.container.style.position = "fixed";

    // Position vertically relative to button
    if (showAbove) {
      this.container.style.bottom = `${viewportHeight - buttonRect.top + 8}px`;
      this.container.style.top = "auto";
    } else {
      this.container.style.top = `${buttonRect.bottom + 8}px`;
      this.container.style.bottom = "auto";
    }

    // Center horizontally but keep within viewport
    const selectorWidth = 540; // width from CSS (updated to match new design)
    let leftPos = buttonRect.left + buttonRect.width / 2 - selectorWidth / 2;

    // Ensure it stays within viewport bounds
    if (leftPos < 10) {
      leftPos = 10;
    } else if (leftPos + selectorWidth > viewportWidth - 10) {
      leftPos = viewportWidth - selectorWidth - 10;
    }

    this.container.style.left = `${leftPos}px`;
    this.container.style.right = "auto";

    // Remove the transform since we're positioning directly
    this.container.style.transform = "none";
  }

  /**
   * Setup click outside handler
   */
  private setupClickOutsideHandler(): void {
    // Track mousedown to know if drag started inside
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

    // Track mouseup to reset the flag
    const mouseUpHandler = () => {
      // Small delay to ensure click event checks the flag first
      setTimeout(() => {
        this.mouseDownStartedInside = false;
      }, 50);
    };

    this.clickOutsideHandler = (e: MouseEvent) => {
      // Only handle clicks outside the container
      if (this.container && !this.container.contains(e.target as Node)) {
        // Don't hide if we're currently resizing or if the mouse was pressed down inside the container
        if (
          this.isResizing ||
          this.container?.classList.contains("resizing") ||
          this.mouseDownStartedInside
        ) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }

        // Otherwise, hide the popup
        this.hide();
      }
      // Clicks inside the container should proceed normally
    };

    // Set up all handlers immediately
    document.addEventListener("mousedown", mouseDownHandler, true);
    document.addEventListener("mouseup", mouseUpHandler, true);

    // Store references for cleanup
    (this as any)._mouseDownHandler = mouseDownHandler;
    (this as any)._mouseUpHandler = mouseUpHandler;

    // Delay click handler to avoid immediate trigger
    setTimeout(() => {
      if (this.clickOutsideHandler) {
        // Use capture phase to intercept events earlier
        document.addEventListener("click", this.clickOutsideHandler, true);
      }
    }, 100);
  }

  /**
   * Setup keyboard handler for shortcuts
   */
  private keyboardHandler: ((e: KeyboardEvent) => void) | null = null;

  private setupKeyboardHandler(): void {
    this.keyboardHandler = (e: KeyboardEvent) => {
      // Only handle if the selector is visible
      if (!this.container || this.container.style.display === "none") return;

      // Ignore if user is typing in an input field
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;

      switch (e.key) {
        case " ":
        case "Spacebar": // For older browsers
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

    // Listen to scroll on window and any scrollable parent
    window.addEventListener("scroll", this.scrollHandler, true);
  }

  /**
   * Create the unified selector UI
   */
  private createUI(): HTMLElement {
    // Keep reference to callback (removed self-assignment)

    this.container = document.createElement("div");
    this.container.className = "tweetcraft-unified-selector";
    this.render();
    this.applyStyles();

    // Apply saved size directly as inline styles
    const savedSize = this.getSavedSize();
    this.container.style.width = `${savedSize.width}px`;
    this.container.style.height = `${savedSize.height}px`;

    // Add resize observer to save size when user resizes
    this.observeResize();

    return this.container;
  }

  /**
   * Observe container resize and save size
   */
  private observeResize(): void {
    if (!this.container) return;

    let resizeTimeout: NodeJS.Timeout;
    let isInitialLoad = true; // Track if this is the first observation

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        // Skip if container is being manually resized
        if (this.container?.classList.contains("resizing")) return;

        // Skip auto-adjustment on initial load
        if (isInitialLoad) {
          isInitialLoad = false;
          return;
        }

        // Debounce to avoid excessive saves
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
          const { width, height } = entry.contentRect;
          // Only save if size actually changed significantly (more than 5px)
          const currentSaved = this.getSavedSize();
          if (
            Math.abs(width - currentSaved.width) > 5 ||
            Math.abs(height - currentSaved.height) > 5
          ) {
            this.saveSize(Math.round(width), Math.round(height));
          }
          // Don't auto-adjust height - let user control size
          // this.adjustHeightToContent();
        }, 500);
      }
    });

    resizeObserver.observe(this.container);

    // Add manual resize handle for better UX
    this.addResizeHandle();

    // Store observer for cleanup
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

    // Enable manual resizing
    let startX = 0;
    let startY = 0;
    let startWidth = 0;
    let startHeight = 0;

    // Prevent clicks during resize
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

      // Add cursor style during resize
      document.body.style.cursor = "se-resize";
      this.container!.classList.add("resizing");

      // Add click prevention during resize
      document.addEventListener("click", preventClick, true);
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!this.isResizing || !this.container) return;

      const newWidth = Math.min(
        Math.max(startWidth + e.clientX - startX, 480),
        900,
      ); // Max 900 to allow full tabs
      const newHeight = Math.min(
        Math.max(startHeight + e.clientY - startY, 350),
        600,
      ); // Reduced max to 600

      this.container.style.width = `${newWidth}px`;
      this.container.style.height = `${newHeight}px`;

      // Prevent the container from disappearing
      e.preventDefault();
      e.stopPropagation();
    };

    const handleMouseUp = (e?: MouseEvent) => {
      if (this.isResizing) {
        document.body.style.cursor = "";
        this.container?.classList.remove("resizing");

        // Save the final size
        if (this.container) {
          const rect = this.container.getBoundingClientRect();
          const finalWidth = Math.round(rect.width);
          const finalHeight = Math.round(rect.height);
          this.saveSize(finalWidth, finalHeight);

          // Ensure the size is maintained
          this.container.style.width = `${finalWidth}px`;
          this.container.style.height = `${finalHeight}px`;
        }

        // Prevent event propagation and the subsequent click event
        if (e) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
        }

        // Use requestAnimationFrame to clear the flag after the current event cycle
        requestAnimationFrame(() => {
          this.isResizing = false;
          // Remove the click prevention listener
          document.removeEventListener("click", preventClick, true);
        });
      }
    };

    // Handle escape key to cancel resize
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

    // Store cleanup function
    (handle as any)._cleanup = () => {
      handle.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("click", preventClick, true);
      // Ensure resizing flag is cleared
      this.isResizing = false;
    };
  }

  /**
   * Auto-adjust height based on content
   */
  private adjustHeightToContent(): void {
    // This method is now disabled to respect user's manual sizing preferences
    // Users can manually resize the popup using the resize handle
    return;

    /* Original auto-adjust code - preserved for reference
    if (!this.container || this.view === 'expanded') return;

    // Only auto-adjust if content overflows or has too much space
    const content = this.container.querySelector('.selector-content');
    if (!content) return;

    const contentHeight = (content as HTMLElement).scrollHeight;
    const containerHeight = this.container.clientHeight;
    const headerHeight = this.container.querySelector('.selector-header')?.clientHeight || 0;
    const selectionBarHeight = this.container.querySelector('.persistent-selection-bar')?.clientHeight || 0;
    const footerHeight = this.container.querySelector('.selector-footer')?.clientHeight || 0;

    const totalContentHeight = contentHeight + headerHeight + selectionBarHeight + footerHeight + 40; // 40px for padding

    // Only adjust if there's significant difference
    if (Math.abs(totalContentHeight - containerHeight) > 50) {
      const newHeight = Math.min(Math.max(totalContentHeight, 400), window.innerHeight * 0.9);
      this.container.style.height = `${newHeight}px`;
    }
    */
  }

  /**
   * Render the selector UI
   */
  private render(): void {
    if (!this.container) return;

    const templates = TEMPLATES;
    const personalities = PERSONALITIES;

    // Save current size before re-rendering
    const currentWidth = this.container.style.width;
    const currentHeight = this.container.style.height;

    this.container.innerHTML = `
      ${this.renderPersistentSelectionBar()}
      <div class="selector-header">
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
        </div>
        <div class="header-actions">
          <button class="quick-generate-btn" id="quickGenerateBtn" title="Generate with randomized settings (Space)">
            <span class="quick-generate-icon">⚡</span>
            <span class="quick-generate-text">Quick Generate</span>
          </button>
          <button class="close-btn" aria-label="Close">×</button>
        </div>
      </div>

      ${this.renderViewContent(templates, personalities)}

      <div class="selector-footer">
        <div class="selection-info">
          ${
            this.view === "personas"
              ? `
            ${this.selectedPersona ? `<span class="selected-persona">${this.selectedPersona.emoji} ${this.selectedPersona.name}</span>` : '<span class="missing-item">Select a persona...</span>'}
          `
              : this.view === "grid"
                ? `
            <div class="four-part-selection">
              ${this.selectedPersonality ? `<span class="selected-item">1️⃣ ${this.selectedPersonality.emoji}</span>` : '<span class="missing-item">1️⃣ ...</span>'}
              ${this.selectedVocabulary ? `<span class="selected-item">2️⃣ ${this.selectedVocabulary.emoji}</span>` : '<span class="missing-item">2️⃣ ...</span>'}
              ${this.selectedTemplate ? `<span class="selected-item">3️⃣ ${this.selectedTemplate.emoji}</span>` : '<span class="missing-item">3️⃣ ...</span>'}
              ${this.selectedLengthPacing ? `<span class="selected-item">4️⃣ ${this.selectedLengthPacing.label.substring(0, 10)}</span>` : '<span class="missing-item">4️⃣ ...</span>'}
            </div>
          `
                : `
            ${this.selectedTemplate ? `<span class="selected-template">${this.selectedTemplate.emoji} ${this.selectedTemplate.name}</span>` : ""}
            ${this.selectedPersonality ? `<span class="selected-personality">${this.selectedPersonality.emoji} ${this.selectedPersonality.label}</span>` : ""}
          `
          }
        </div>
        <div class="footer-buttons">
          <button class="smart-defaults-btn" title="Apply smart defaults based on your usage">
            🎯 Smart Defaults
          </button>
          <button class="generate-btn ${
            this.view === "personas"
              ? this.selectedPersona
                ? "active"
                : ""
              : this.view === "grid"
                ? this.selectedPersonality &&
                  this.selectedVocabulary &&
                  this.selectedTemplate &&
                  this.selectedLengthPacing
                  ? "active"
                  : ""
                : this.selectedTemplate && this.selectedPersonality
                  ? "active"
                  : ""
          }"
                  ${
                    this.view === "personas"
                      ? !this.selectedPersona
                        ? "disabled"
                        : ""
                      : this.view === "grid"
                        ? !this.selectedPersonality ||
                          !this.selectedVocabulary ||
                          !this.selectedTemplate ||
                          !this.selectedLengthPacing
                          ? "disabled"
                          : ""
                        : !this.selectedTemplate || !this.selectedPersonality
                          ? "disabled"
                          : ""
                  }>
            Generate Reply
          </button>
        </div>
      </div>
    `;

    // Restore size after re-rendering
    if (currentWidth) this.container.style.width = currentWidth;
    if (currentHeight) this.container.style.height = currentHeight;

    this.attachEventListeners();
  }

  /**
   * Render persistent selection bar showing current selections
   */
  private renderPersistentSelectionBar(): string {
    const hasAnySelection =
      this.selectedPersona ||
      this.selectedPersonality ||
      this.selectedVocabulary ||
      this.selectedTemplate ||
      this.selectedLengthPacing;

    if (!hasAnySelection) {
      return ""; // Don't show bar if nothing selected
    }

    // Build selection summary based on current view
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
      // For other views, show template and personality if selected
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
   * Render content based on current view
   */
  private renderViewContent(
    templates: Template[],
    personalities: Personality[],
  ): string {
    switch (this.view) {
      case "personas":
        return this.renderPersonasView();
      case "smart":
        return this.renderSmartSuggestionsView(templates, personalities);
      case "favorites":
        return this.renderFavoritesView(templates, personalities);
      case "custom":
        return this.renderCustomView(templates, personalities);
      case "compose":
        return this.renderComposeView();
      default:
        return this.renderGridView(templates, personalities);
    }
  }

  /**
   * Render personas view (quick personas)
   */
  private renderPersonasView(): string {
    const personas = getAllQuickPersonas();

    // Sort personas by usage frequency (most used first)
    const sortedPersonas = this.sortPersonasByUsage(personas);

    // Get top 3 most used combinations for quick presets
    const topCombinations = usageTracker.getTopCombinations(3);

    return `
      <div class="selector-content personas-view">
        ${
          topCombinations.length > 0
            ? `
          <div class="quick-presets-section">
            <div class="quick-presets-header">
              <span class="quick-presets-title">⚡ Quick Presets</span>
              <span class="quick-presets-subtitle">Your most-used combinations</span>
            </div>
            <div class="quick-presets-grid">
              ${topCombinations
                .map((combo, index) => {
                  const [templateId, personalityId] =
                    combo.combination.split(":");
                  const template = TEMPLATES.find((t) => t.id === templateId);
                  const personality = PERSONALITIES.find(
                    (p) => p.id === personalityId,
                  );

                  if (!template || !personality) return "";

                  return `
                  <button class="quick-preset-btn"
                          data-preset-template="${templateId}"
                          data-preset-personality="${personalityId}"
                          title="Apply this preset combination (used ${combo.count} times)">
                    <div class="preset-number">${index + 1}</div>
                    <div class="preset-content">
                      <div class="preset-icons">
                        ${template.emoji} + ${personality.emoji}
                      </div>
                      <div class="preset-names">
                        ${template.name} + ${personality.label}
                      </div>
                      <div class="preset-usage">${combo.count}x</div>
                    </div>
                  </button>
                `;
                })
                .join("")}
            </div>
          </div>
        `
            : ""
        }

        <div class="personas-info">
          <p style="text-align: center; color: #8b98a5; font-size: 12px; margin: 0 0 12px 0;">
            🎭 Quick personas with pre-configured personality, vocabulary, rhetoric, and pacing
          </p>
        </div>
        <div class="personas-grid-compact">
          ${sortedPersonas
            .map((persona, index) => {
              const usageCount = this.getPersonaUsageCount(persona.id);
              const isRecentlyUsed = this.isPersonaRecentlyUsed(persona.id);
              return `
              <button class="persona-card-compact ${this.selectedPersona?.id === persona.id ? "selected" : ""}"
                      data-persona="${persona.id}"
                      title="${persona.description}${usageCount > 0 ? " • Used " + usageCount + " times" : ""}">
                <div class="persona-emoji">${persona.emoji}</div>
                <div class="persona-name">${persona.name}</div>
                ${usageCount > 0 ? `<div class="usage-indicator">${usageCount}</div>` : ""}
                ${isRecentlyUsed ? '<div class="recent-indicator">•</div>' : ""}
              </button>
            `;
            })
            .join("")}
        </div>
      </div>
    `;
  }

  /**
   * Sort personas by usage frequency (most used first)
   */
  private sortPersonasByUsage(personas: any[]): any[] {
    return [...personas].sort((a, b) => {
      const usageA = this.getPersonaUsageCount(a.id);
      const usageB = this.getPersonaUsageCount(b.id);

      // If usage counts are different, sort by usage
      if (usageA !== usageB) {
        return usageB - usageA;
      }

      // If same usage, prioritize recently used
      const recentA = this.isPersonaRecentlyUsed(a.id);
      const recentB = this.isPersonaRecentlyUsed(b.id);

      if (recentA && !recentB) return -1;
      if (!recentA && recentB) return 1;

      // Otherwise maintain original order
      return 0;
    });
  }

  /**
   * Get usage count for a persona
   */
  private getPersonaUsageCount(personaId: string): number {
    try {
      const stats = usageTracker.getStats();
      return stats.templateUsage?.get(createTemplateId(personaId)) || 0;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Get usage count for a personality
   */
  private getPersonalityUsageCount(personalityId: string): number {
    try {
      const stats = usageTracker.getStats();
      return stats.personalityUsage?.get(personalityId) || 0;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Get usage count for vocabulary
   */
  private getVocabularyUsageCount(vocabularyId: string): number {
    try {
      const stats = usageTracker.getStats();
      return stats.vocabularyUsage?.get(vocabularyId) || 0;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Get usage count for a template (rhetoric)
   */
  private getTemplateUsageCount(templateId: string): number {
    try {
      const stats = usageTracker.getStats();
      return stats.templateUsage?.get(createTemplateId(templateId)) || 0;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Get usage count for length & pacing
   */
  private getLengthPacingUsageCount(lengthPacingId: string): number {
    try {
      const stats = usageTracker.getStats();
      return stats.lengthPacingUsage?.get(lengthPacingId) || 0;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Check if persona was used recently (within last 24 hours)
   */
  private isPersonaRecentlyUsed(personaId: string): boolean {
    try {
      const recentSelections = JSON.parse(
        localStorage.getItem("tweetcraft_recent_personas") || "{}",
      );
      const lastUsed = recentSelections[personaId];
      if (!lastUsed) return false;

      const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
      return lastUsed > twentyFourHoursAgo;
    } catch (error) {
      return false;
    }
  }

  /**
   * Group personalities into visual categories
   */
  private getPersonalityGroups(): Array<{
    id: string;
    icon: string;
    label: string;
    personalities: Personality[];
  }> {
    const allPersonalities = PERSONALITIES;
    
    return [
      {
        id: 'professional',
        icon: '💼',
        label: 'Professional',
        personalities: allPersonalities.filter(p => 
          ['professional', 'academic', 'diplomatic', 'neutral', 'earnest'].includes(p.id)
        )
      },
      {
        id: 'friendly',
        icon: '😊',
        label: 'Friendly',
        personalities: allPersonalities.filter(p => 
          ['friendly', 'supportive', 'motivational', 'enthusiastic', 'gratitude', 'awestruck'].includes(p.id)
        )
      },
      {
        id: 'humorous',
        icon: '😄',
        label: 'Humorous',
        personalities: allPersonalities.filter(p => 
          ['witty', 'snarky', 'sarcastic', 'dry', 'shitposter', 'fanstan'].includes(p.id)
        )
      },
      {
        id: 'spicy',
        icon: '🔥',
        label: 'Spicy',
        personalities: allPersonalities.filter(p => 
          ['provocative', 'contrarian', 'devils_advocate', 'counter_example', 'skeptical', 'confident', 'mean', 'dismissive'].includes(p.id)
        )
      },
      {
        id: 'creative',
        icon: '🎭',
        label: 'Creative',
        personalities: allPersonalities.filter(p => 
          ['philosophical', 'storyteller', 'dramatic', 'pensive', 'inquisitive', 'zoom_out', 'calm', 'weary'].includes(p.id)
        )
      },
      {
        id: 'extreme',
        icon: '⚠️',
        label: 'Extreme (Use Carefully)',
        personalities: allPersonalities.filter(p => 
          ['inflammatory', 'condescending', 'swearing', 'controversial', 'threatening'].includes(p.id)
        )
      }
    ].filter(group => group.personalities.length > 0);
  }

  /**
   * Get collapsed state for a personality group
   */
  private isPersonalityGroupCollapsed(groupId: string): boolean {
    try {
      const collapsedGroups = JSON.parse(
        localStorage.getItem("tweetcraft_collapsed_personality_groups") || "[]"
      );
      return collapsedGroups.includes(groupId);
    } catch {
      return false;
    }
  }

  /**
   * Toggle collapsed state for a personality group
   */
  private togglePersonalityGroup(groupId: string): void {
    try {
      const collapsedGroups = JSON.parse(
        localStorage.getItem("tweetcraft_collapsed_personality_groups") || "[]"
      );
      const index = collapsedGroups.indexOf(groupId);
      if (index > -1) {
        collapsedGroups.splice(index, 1);
      } else {
        collapsedGroups.push(groupId);
      }
      localStorage.setItem(
        "tweetcraft_collapsed_personality_groups",
        JSON.stringify(collapsedGroups)
      );
    } catch (error) {
      console.warn("Failed to toggle personality group:", error);
    }
  }

  /**
   * Track persona usage
   */
  private trackPersonaUsage(personaId: string): void {
    try {
      // Track in usage tracker
      usageTracker.trackPersonaSelection(personaId, "manual");

      // Track recent usage
      const recentSelections = JSON.parse(
        localStorage.getItem("tweetcraft_recent_personas") || "{}",
      );
      recentSelections[personaId] = Date.now();
      localStorage.setItem(
        "tweetcraft_recent_personas",
        JSON.stringify(recentSelections),
      );
    } catch (error) {
      console.warn("Failed to track persona usage:", error);
    }
  }

  /**
   * Render grid view (all 4 parts)
   */
  private renderGridView(
    templates: Template[],
    personalities: Personality[],
  ): string {
    const vocabularyStyles = getAllVocabularyStyles();
    const lengthPacingStyles = getAllLengthPacingStyles();
    const completionStatus = this.getSectionCompletionStatus();

    return `
      <div class="selector-content grid-view four-part-structure">
        <!-- Progress Indicator -->
        ${
          completionStatus.completedCount > 0
            ? `
          <div class="section-progress-indicator">
            <div class="progress-bar-container">
              <div class="progress-bar-fill" style="width: ${completionStatus.percentage}%"></div>
            </div>
            <div class="progress-text">
              ${
                completionStatus.completedCount === completionStatus.totalCount
                  ? '<span class="all-complete">✨ All sections complete!</span>'
                  : `${completionStatus.completedCount} of ${completionStatus.totalCount} sections complete`
              }
            </div>
          </div>
        `
            : ""
        }
        <!-- Part 1: Personality (Who is talking) -->
        <div class="part-section personalities-section ${this.selectedPersonality ? "section-completed" : ""}">
          <h3>
            <span class="part-number">1</span>
            Personality
            <span class="part-subtitle">(Who is talking)</span>
            ${this.getSectionCompletionIndicator(!!this.selectedPersonality, !this.selectedPersonality)}
          </h3>
          <div class="personality-groups">
            ${this.getPersonalityGroups()
              .map((group) => {
                const isCollapsed = this.isPersonalityGroupCollapsed(group.id);
                const hasSelection = group.personalities.some(p => p.id === this.selectedPersonality?.id);
                return `
                <div class="personality-group ${hasSelection ? "has-selection" : ""}" data-group-id="${group.id}">
                  <div class="group-header ${isCollapsed ? "collapsed" : ""}" data-personality-group="${group.id}">
                    <span class="group-icon">${group.icon}</span>
                    <span class="group-label">${group.label}</span>
                    <span class="group-count">(${group.personalities.length})</span>
                    <span class="group-chevron">${isCollapsed ? "▶" : "▼"}</span>
                  </div>
                  <div class="personality-grid selection-grid ${isCollapsed ? "collapsed" : ""}">
                    ${group.personalities
                      .map((personality) => {
                        const usageCount = this.getPersonalityUsageCount(personality.id);
                        const isFrequent = usageCount > 5;
                        return `
                        <div class="item-wrapper">
                          <button class="personality-btn ${this.selectedPersonality?.id === personality.id ? "selected" : ""} ${isFrequent ? "frequent" : ""}"
                                  data-personality="${personality.id}"
                                  data-category="${personality.category}"
                                  title="${personality.description}${usageCount > 0 ? " • Used " + usageCount + " times" : ""}">
                            <span class="personality-emoji">${personality.emoji}</span>
                            <span class="personality-label">${personality.label}</span>
                            ${usageCount > 0 ? `<span class="usage-counter">${usageCount}</span>` : ""}
                          </button>
                          <button class="star-btn ${this.favoritePersonalities.has(personality.id) ? "active" : ""}"
                                  data-personality-star="${personality.id}"
                                  title="${this.favoritePersonalities.has(personality.id) ? "Remove from favorites" : "Add to favorites"}">
                            ${this.favoritePersonalities.has(personality.id) ? "⭐" : "☆"}
                          </button>
                        </div>
                        `;
                      })
                      .join("")}
                  </div>
                </div>
                `;
              })
              .join("")}
          </div>
        </div>

        <!-- Part 2: Vocabulary (How it's written) -->
        <div class="part-section vocabulary-section collapsible-section ${this.selectedVocabulary ? "section-completed" : ""}" data-section="vocabulary">
          <h3 class="collapsible-header" data-toggle="vocabulary">
            <span class="part-number">2</span>
            <span class="section-title">
              Vocabulary
              <span class="part-subtitle">(How it's written)</span>
              ${this.getSectionCompletionIndicator(!!this.selectedVocabulary)}
            </span>
            <span class="collapse-indicator">−</span>
          </h3>
          <div class="vocabulary-grid selection-grid collapsible-content" id="vocabulary-content">
            ${vocabularyStyles
              .map((vocab) => {
                const usageCount = this.getVocabularyUsageCount(vocab.id);
                const isFrequent = usageCount > 5;
                return `
              <div class="item-wrapper">
                <button class="vocabulary-btn ${this.selectedVocabulary?.id === vocab.id ? "selected" : ""} ${isFrequent ? "frequent" : ""}"
                        data-vocabulary="${vocab.id}"
                        title="${vocab.description}${usageCount > 0 ? " • Used " + usageCount + " times" : ""}">
                  <span class="vocabulary-emoji">${vocab.emoji}</span>
                  <span class="vocabulary-label">${vocab.label}</span>
                  ${usageCount > 0 ? `<span class="usage-counter">${usageCount}</span>` : ""}
                </button>
                <button class="star-btn ${this.favoriteVocabulary?.has(vocab.id) ? "active" : ""}"
                        data-vocabulary-star="${vocab.id}"
                        title="${this.favoriteVocabulary?.has(vocab.id) ? "Remove from favorites" : "Add to favorites"}">
                  ${this.favoriteVocabulary?.has(vocab.id) ? "⭐" : "☆"}
                </button>
              </div>
              `;
              })
              .join("")}
          </div>
        </div>

        <!-- Part 3: Rhetoric (Approach to topic) -->
        <div class="part-section rhetoric-section ${this.selectedTemplate ? "section-completed" : ""}">
          <h3>
            <span class="part-number">3</span>
            Rhetoric
            <span class="part-subtitle">(Approach to topic)</span>
            ${this.getSectionCompletionIndicator(!!this.selectedTemplate, !this.selectedTemplate)}
          </h3>
          <div class="rhetoric-grid selection-grid">
            ${templates
              .map((template) => {
                const usageCount = this.getTemplateUsageCount(template.id);
                // Determine if this is a frequently used item
                const isFrequent = usageCount > 5;
                return `
              <div class="item-wrapper">
                <button class="rhetoric-btn ${this.selectedTemplate?.id === template.id ? "selected" : ""} ${isFrequent ? "frequent" : ""}"
                        data-rhetoric="${template.id}"
                        data-category="${template.category}"
                        title="${template.description}${usageCount > 0 ? " • Used " + usageCount + " times" : ""}">
                  <span class="rhetoric-emoji">${template.emoji}</span>
                  <span class="rhetoric-name">${template.name}</span>
                  ${usageCount > 0 ? `<span class="usage-counter">${usageCount}</span>` : ""}
                </button>
                <button class="star-btn ${this.favoriteTemplates.has(template.id) ? "active" : ""}"
                        data-rhetoric-star="${template.id}"
                        title="${this.favoriteTemplates.has(template.id) ? "Remove from favorites" : "Add to favorites"}">
                  ${this.favoriteTemplates.has(template.id) ? "⭐" : "☆"}
                </button>
              </div>
              `;
              })
              .join("")}
          </div>
        </div>

        <!-- Part 4: Length & Pacing (How it flows) -->
        <div class="part-section length-pacing-section collapsible-section ${this.selectedLengthPacing ? "section-completed" : ""}" data-section="lengthPacing">
          <h3 class="collapsible-header" data-toggle="lengthPacing">
            <span class="part-number">4</span>
            <span class="section-title">
              Length & Pacing
              <span class="part-subtitle">(How it flows)</span>
              ${this.getSectionCompletionIndicator(!!this.selectedLengthPacing)}
            </span>
            <span class="collapse-indicator">−</span>
          </h3>
          <div class="length-pacing-grid selection-grid collapsible-content" id="lengthPacing-content">
            ${lengthPacingStyles
              .map((pacing) => {
                const usageCount = this.getLengthPacingUsageCount(pacing.id);
                const isFrequent = usageCount > 5;
                return `
              <div class="item-wrapper">
                <button class="length-pacing-btn ${this.selectedLengthPacing?.id === pacing.id ? "selected" : ""} ${isFrequent ? "frequent" : ""}"
                        data-lengthpacing="${pacing.id}"
                        title="${pacing.description}${usageCount > 0 ? " • Used " + usageCount + " times" : ""}">
                  <span class="length-pacing-emoji">${pacing.emoji}</span>
                  <span class="length-pacing-label">${pacing.label}</span>
                  ${usageCount > 0 ? `<span class="usage-counter">${usageCount}</span>` : ""}
                </button>
                <button class="star-btn ${this.favoriteLengthPacing?.has(pacing.id) ? "active" : ""}"
                        data-lengthpacing-star="${pacing.id}"
                        title="${this.favoriteLengthPacing?.has(pacing.id) ? "Remove from favorites" : "Add to favorites"}">
                  ${this.favoriteLengthPacing?.has(pacing.id) ? "⭐" : "☆"}
                </button>
              </div>
              `;
              })
              .join("")}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render suggested favorites when the tab is empty
   */
  private renderFavoriteSuggestions(
    templates: Template[],
    personalities: Personality[],
  ): string {
    // Get dismissed suggestions
    const dismissedKey = "tweetcraft_dismissed_suggestions";
    const dismissed = JSON.parse(localStorage.getItem(dismissedKey) || "[]");

    // Get top 5 most used combinations and filter out dismissed ones
    const allTopCombinations = usageTracker.getTopCombinations(10); // Get more in case some are dismissed
    const topCombinations = allTopCombinations
      .filter((combo) => {
        // Use the combination string directly as key
        return !dismissed.includes(combo.combination);
      })
      .slice(0, 5);

    // Get top used templates and personalities separately
    const stats = usageTracker.getStats();
    const topTemplates: { template: Template; count: number }[] = [];
    const topPersonalities: { personality: Personality; count: number }[] = [];

    // Get top 3 templates
    if (stats.templateUsage) {
      templates.forEach((t) => {
        const count = stats.templateUsage?.get(createTemplateId(t.id)) || 0;
        if (count > 0) {
          topTemplates.push({ template: t, count });
        }
      });
      topTemplates.sort((a, b) => b.count - a.count);
      topTemplates.splice(3); // Keep only top 3
    }

    // Get top 3 personalities
    if (stats.personalityUsage) {
      personalities.forEach((p) => {
        const count = stats.personalityUsage?.get(p.id) || 0;
        if (count > 0) {
          topPersonalities.push({ personality: p, count });
        }
      });
      topPersonalities.sort((a, b) => b.count - a.count);
      topPersonalities.splice(3); // Keep only top 3
    }

    // If no usage data, show default suggestions
    const hasUsageData =
      topCombinations.length > 0 ||
      topTemplates.length > 0 ||
      topPersonalities.length > 0;

    return `
      <div class="selector-content favorites-view">
        <div class="favorites-suggestions">
          <div class="suggestions-header">
            <h3>🌟 Suggested Favorites</h3>
            <p class="suggestions-subtitle">${hasUsageData ? "Based on your usage patterns" : "Popular starting points"}</p>
          </div>

          ${
            topCombinations.length > 0
              ? `
            <div class="suggested-combinations">
              <h4>Top Combinations</h4>
              <div class="combination-suggestions">
                ${topCombinations
                  .map((combo, index) => {
                    const [templateId, personalityId] =
                      combo.combination.split(":");
                    const template = templates.find((t) => t.id === templateId);
                    const personality = personalities.find(
                      (p) => p.id === personalityId,
                    );

                    if (!template || !personality) return "";

                    return `
                    <div class="suggestion-card combination-suggestion"
                         data-template="${templateId}"
                         data-personality="${personalityId}">
                      <div class="suggestion-rank">#${index + 1}</div>
                      <div class="suggestion-content">
                        <div class="suggestion-icons">
                          ${template.emoji} + ${personality.emoji}
                        </div>
                        <div class="suggestion-names">
                          ${template.name} + ${personality.label}
                        </div>
                        <div class="suggestion-usage">Used ${combo.count} times</div>
                      </div>
                      <div class="suggestion-actions">
                        <button class="accept-suggestion-btn"
                                data-accept-template="${templateId}"
                                data-accept-personality="${personalityId}"
                                title="Add to favorites">
                          ⭐ Add
                        </button>
                        <button class="dismiss-suggestion-btn"
                                data-dismiss-combo="${combo.combination}"
                                title="Hide this suggestion">
                          ×
                        </button>
                      </div>
                    </div>
                  `;
                  })
                  .join("")}
              </div>
            </div>
          `
              : ""
          }

          ${
            !hasUsageData
              ? `
            <div class="default-suggestions">
              <div class="suggestion-group">
                <h4>Recommended Templates</h4>
                <div class="template-grid">
                  ${templates
                    .slice(0, 3)
                    .map(
                      (template) => `
                    <div class="suggestion-card template-suggestion">
                      <button class="template-btn"
                              data-template="${template.id}"
                              title="${template.description}">
                        <span class="template-emoji">${template.emoji}</span>
                        <span class="template-name">${template.name}</span>
                      </button>
                      <button class="accept-suggestion-btn solo"
                              data-accept-template="${template.id}"
                              title="Add to favorites">
                        ⭐
                      </button>
                    </div>
                  `,
                    )
                    .join("")}
                </div>
              </div>

              <div class="suggestion-group">
                <h4>Recommended Personalities</h4>
                <div class="personality-grid">
                  ${personalities
                    .slice(0, 3)
                    .map(
                      (personality) => `
                    <div class="suggestion-card personality-suggestion">
                      <button class="personality-btn"
                              data-personality="${personality.id}"
                              title="${personality.description}">
                        <span class="personality-emoji">${personality.emoji}</span>
                        <span class="personality-label">${personality.label}</span>
                      </button>
                      <button class="accept-suggestion-btn solo"
                              data-accept-personality="${personality.id}"
                              title="Add to favorites">
                        ⭐
                      </button>
                    </div>
                  `,
                    )
                    .join("")}
                </div>
              </div>
            </div>
          `
              : `
            <div class="individual-suggestions">
              ${
                topTemplates.length > 0
                  ? `
                <div class="suggestion-group">
                  <h4>Most Used Templates</h4>
                  <div class="template-grid">
                    ${topTemplates
                      .map(
                        ({ template, count }) => `
                      <div class="suggestion-card template-suggestion">
                        <button class="template-btn"
                                data-template="${template.id}"
                                title="${template.description}">
                          <span class="template-emoji">${template.emoji}</span>
                          <span class="template-name">${template.name}</span>
                          <span class="usage-badge">${count}×</span>
                        </button>
                        <button class="accept-suggestion-btn solo"
                                data-accept-template="${template.id}"
                                title="Add to favorites">
                          ⭐
                        </button>
                      </div>
                    `,
                      )
                      .join("")}
                  </div>
                </div>
              `
                  : ""
              }

              ${
                topPersonalities.length > 0
                  ? `
                <div class="suggestion-group">
                  <h4>Most Used Personalities</h4>
                  <div class="personality-grid">
                    ${topPersonalities
                      .map(
                        ({ personality, count }) => `
                      <div class="suggestion-card personality-suggestion">
                        <button class="personality-btn"
                                data-personality="${personality.id}"
                                title="${personality.description}">
                          <span class="personality-emoji">${personality.emoji}</span>
                          <span class="personality-label">${personality.label}</span>
                          <span class="usage-badge">${count}×</span>
                        </button>
                        <button class="accept-suggestion-btn solo"
                                data-accept-personality="${personality.id}"
                                title="Add to favorites">
                          ⭐
                        </button>
                      </div>
                    `,
                      )
                      .join("")}
                  </div>
                </div>
              `
                  : ""
              }
            </div>
          `
          }

          <div class="suggestions-footer">
            <p class="suggestions-hint">💡 Click items to select, click ⭐ to save as favorite</p>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Convert numeric score to descriptive label with 1-10 scale
   */
  private getScoreLabel(score: number): {
    label: string;
    icon: string;
    color: string;
    numericScore: number;
  } {
    // Normalize score to 1-10 scale if needed
    const normalizedScore =
      score <= 5 ? Math.round(score * 2) : Math.round(score);

    // Color coding based on TODO.md requirements: Green (8-10), Yellow (5-7), Gray (1-4)
    if (normalizedScore >= 8) {
      return {
        label: "Perfect Match",
        icon: "🎯",
        color: "#17BF63", // Green
        numericScore: normalizedScore,
      };
    }
    if (normalizedScore >= 7) {
      return {
        label: "Excellent Fit",
        icon: "⭐",
        color: "#FFD700", // Yellow
        numericScore: normalizedScore,
      };
    }
    if (normalizedScore >= 5) {
      return {
        label: "Good Match",
        icon: "✨",
        color: "#FFD700", // Yellow
        numericScore: normalizedScore,
      };
    }
    if (normalizedScore >= 4) {
      return {
        label: "Worth Trying",
        icon: "💡",
        color: "#8B98A5", // Gray
        numericScore: normalizedScore,
      };
    }
    return {
      label: "Possible Match",
      icon: "🤔",
      color: "#8B98A5", // Gray
      numericScore: Math.max(1, normalizedScore),
    };
  }

  /**
   * Get score breakdown for detailed view
   */
  private getScoreBreakdown(
    score: any,
  ): Array<{ name: string; value: string; color: string }> {
    const factors = [];

    // Context matching score
    if (score.contextMatch !== undefined) {
      factors.push({
        name: "Context Match",
        value: `${Math.round(score.contextMatch * 100)}%`,
        color:
          score.contextMatch > 0.7
            ? "#17BF63"
            : score.contextMatch > 0.4
              ? "#FFD700"
              : "#8B98A5",
      });
    }

    // Usage history score
    if (score.usageScore !== undefined) {
      factors.push({
        name: "Usage History",
        value: `${Math.round(score.usageScore * 100)}%`,
        color:
          score.usageScore > 0.7
            ? "#17BF63"
            : score.usageScore > 0.4
              ? "#FFD700"
              : "#8B98A5",
      });
    }

    // User preference score
    if (score.preferenceScore !== undefined) {
      factors.push({
        name: "User Preference",
        value: `${Math.round(score.preferenceScore * 100)}%`,
        color:
          score.preferenceScore > 0.7
            ? "#17BF63"
            : score.preferenceScore > 0.4
              ? "#FFD700"
              : "#8B98A5",
      });
    }

    // Time-based score
    if (score.timeScore !== undefined) {
      factors.push({
        name: "Time Relevance",
        value: `${Math.round(score.timeScore * 100)}%`,
        color:
          score.timeScore > 0.7
            ? "#17BF63"
            : score.timeScore > 0.4
              ? "#FFD700"
              : "#8B98A5",
      });
    }

    // AI confidence score
    if (score.aiConfidence !== undefined) {
      factors.push({
        name: "AI Confidence",
        value: `${Math.round(score.aiConfidence * 100)}%`,
        color:
          score.aiConfidence > 0.7
            ? "#17BF63"
            : score.aiConfidence > 0.4
              ? "#FFD700"
              : "#8B98A5",
      });
    }

    // If no detailed factors, create based on overall score
    if (factors.length === 0) {
      const normalizedScore = score.score <= 5 ? score.score * 2 : score.score;
      factors.push({
        name: "Overall Match",
        value: `${Math.round(normalizedScore * 10)}%`,
        color:
          normalizedScore >= 8
            ? "#17BF63"
            : normalizedScore >= 5
              ? "#FFD700"
              : "#8B98A5",
      });
    }

    return factors;
  }

  /**
   * Enhance reason descriptions to be more user-friendly
   */
  private enhanceReasonDescription(reason: string): {
    text: string;
    icon: string;
    category: string;
  } {
    // Pattern matching reasons
    if (reason.includes("Template matches context"))
      return {
        text: "Perfect for this conversation",
        icon: "🎯",
        category: "context",
      };
    if (reason.includes("Tone suits context"))
      return { text: "Right emotional tone", icon: "🎨", category: "tone" };

    // User preference reasons
    if (reason.includes("Favorite template"))
      return {
        text: "Your favorite approach",
        icon: "⭐",
        category: "favorite",
      };
    if (reason.includes("Favorite tone"))
      return { text: "Your preferred style", icon: "⭐", category: "favorite" };

    // Usage history reasons
    if (reason.includes("Used") && reason.includes("times"))
      return { text: "You use this often", icon: "🔄", category: "usage" };
    if (reason.includes("Success rate"))
      return { text: "High success rate", icon: "📈", category: "success" };

    // Context-specific reasons
    if (reason.includes("Good for replies"))
      return { text: "Great for replies", icon: "💬", category: "context" };
    if (reason.includes("Work hours"))
      return { text: "Professional time", icon: "💼", category: "timing" };
    if (reason.includes("Evening hours"))
      return { text: "Casual time", icon: "🌆", category: "timing" };
    if (reason.includes("Long thread"))
      return { text: "Good for debates", icon: "🧵", category: "context" };

    // AI analysis reasons
    if (reason.includes("AI-detected intent match"))
      return {
        text: "AI recommends this approach",
        icon: "🤖",
        category: "ai",
      };
    if (reason.includes("AI-detected tone match"))
      return { text: "AI suggests this tone", icon: "🤖", category: "ai" };

    // Fallback
    return { text: reason, icon: "💡", category: "general" };
  }

  /**
   * Render smart suggestions view
   */
  private renderSmartSuggestionsView(
    templates: Template[],
    personalities: Personality[],
  ): string {
    // Use smart suggestions with scores if available
    const suggestedTemplates =
      this.smartSuggestions.templates.length > 0
        ? this.smartSuggestions.templates
        : templates.slice(0, 6); // Fallback to first 6 templates

    const suggestedPersonalities =
      this.smartSuggestions.personalities.length > 0
        ? this.smartSuggestions.personalities
        : personalities.slice(0, 6); // Fallback to first 6 personalities

    // Get scores from smartSuggestionsScores if available
    const scores = (this as any).smartSuggestionsScores || [];

    return `
      <div class="selector-content smart-view">
        <div class="smart-info">
          <div style="display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 12px;">
            <p style="text-align: center; color: #8b98a5; font-size: 12px; margin: 0;">
              🤖 Top 12 AI-suggested combinations with detailed explanations
            </p>
            <button class="refresh-suggestions-btn" title="Get new suggestions">
              <span style="font-size: 12px;">🔄</span>
            </button>
          </div>
        </div>
        <div class="smart-suggestions-list">
          ${
            scores.length > 0
              ? scores
                  .slice(0, 12)
                  .map((score: any, _index: number) => {
                    const template = TEMPLATES.find(
                      (t) => t.id === score.templateId,
                    );
                    const personality = PERSONALITIES.find(
                      (p) => p.id === (score.personalityId || score.toneId),
                    );
                    if (!template || !personality) return "";

                    const scoreInfo = this.getScoreLabel(score.score);

                    return `
              <div class="suggestion-card" data-template="${template.id}" data-personality="${personality.id}" data-score-index="${_index}">
                <div class="suggestion-header">
                  <span class="suggestion-combo">
                    ${template.emoji} ${template.name} + ${personality.emoji} ${personality.label}
                  </span>
                  <div class="score-container">
                    <span class="suggestion-score-badge"
                          title="Recommendation score: ${scoreInfo.numericScore}/10 - ${scoreInfo.label}"
                          style="background-color: ${scoreInfo.color}">
                      ${scoreInfo.numericScore}/10
                    </span>
                    <button class="why-recommended-btn"
                            data-score-index="${_index}"
                            title="View scoring breakdown">
                      Why?
                    </button>
                  </div>
                </div>
                <div class="suggestion-preview">
                  ${template.description}
                </div>
                <div class="suggestion-reasons">
                  ${score.reasons
                    .slice(0, 5)
                    .map((reason: string) => {
                      const enhanced = this.enhanceReasonDescription(reason);
                      return `<span class="reason-chip reason-${enhanced.category}" title="${enhanced.text}">
                      ${enhanced.icon} ${enhanced.text}
                    </span>`;
                    })
                    .join("")}
                </div>
                <div class="score-breakdown" id="score-breakdown-${_index}" style="display: none;">
                  <h4>📊 Scoring Breakdown</h4>
                  <div class="breakdown-factors">
                    ${this.getScoreBreakdown(score)
                      .map(
                        (factor: any) => `
                      <div class="breakdown-factor">
                        <span class="factor-name">${factor.name}:</span>
                        <span class="factor-value" style="color: ${factor.color}">${factor.value}</span>
                      </div>
                    `,
                      )
                      .join("")}
                  </div>
                  <div class="breakdown-details">
                    <strong>All factors:</strong>
                    ${score.reasons
                      .map((reason: string) => {
                        const enhanced = this.enhanceReasonDescription(reason);
                        return `<div>• ${enhanced.icon} ${enhanced.text}</div>`;
                      })
                      .join("")}
                  </div>
                </div>
              </div>
            `;
                  })
                  .join("")
              : `
            <div class="rhetoric-section">
              <h3>Suggested Rhetoric</h3>
              <div class="template-grid">
                ${suggestedTemplates
                  .map(
                    (template) => `
                  <button class="template-btn ${this.selectedTemplate?.id === template.id ? "selected" : ""}"
                          data-template="${template.id}"
                          title="${template.description}">
                    <span class="template-emoji">${template.emoji}</span>
                    <span class="template-name">${template.name}</span>
                  </button>
                `,
                  )
                  .join("")}
              </div>
            </div>

            <div class="personalities-section">
              <h3>Suggested Personality</h3>
              <div class="personality-grid">
                ${suggestedPersonalities
                  .map(
                    (personality) => `
                  <button class="personality-btn ${this.selectedPersonality?.id === personality.id ? "selected" : ""}"
                          data-personality="${personality.id}"
                          title="${personality.description}">
                    <span class="personality-emoji">${personality.emoji}</span>
                    <span class="personality-label">${personality.label}</span>
                  </button>
                `,
                  )
                  .join("")}
              </div>
            </div>
          `
          }
        </div>
      </div>
    `;
  }

  /**
   * Render favorites view
   */
  private renderFavoritesView(
    templates: Template[],
    personalities: Personality[],
  ): string {
    const favoriteTemplatesList = templates.filter((t) =>
      this.favoriteTemplates.has(t.id),
    );
    const favoritePersonalitiesList = personalities.filter((p) =>
      this.favoritePersonalities.has(p.id),
    );

    // Auto-populate with suggestions when favorites is empty
    if (
      favoriteTemplatesList.length === 0 &&
      favoritePersonalitiesList.length === 0
    ) {
      return this.renderFavoriteSuggestions(templates, personalities);
    }

    return `
      <div class="selector-content favorites-view">
        ${
          favoriteTemplatesList.length > 0
            ? `
          <div class="rhetoric-section">
            <h3>Favorite Rhetoric</h3>
            <div class="template-grid">
              ${favoriteTemplatesList
                .map(
                  (template) => `
                <button class="template-btn ${this.selectedTemplate?.id === template.id ? "selected" : ""}"
                        data-template="${template.id}"
                        title="${template.description}">
                  <span class="template-emoji">${template.emoji}</span>
                  <span class="template-name">${template.name}</span>
                </button>
              `,
                )
                .join("")}
            </div>
          </div>
        `
            : ""
        }

        ${
          favoritePersonalitiesList.length > 0
            ? `
          <div class="personalities-section">
            <h3>Favorite Personality</h3>
            <div class="personality-grid">
              ${favoritePersonalitiesList
                .map(
                  (personality) => `
                <button class="personality-btn ${this.selectedPersonality?.id === personality.id ? "selected" : ""}"
                        data-personality="${personality.id}"
                        title="${personality.description}">
                  <span class="personality-emoji">${personality.emoji}</span>
                  <span class="personality-label">${personality.label}</span>
                </button>
              `,
                )
                .join("")}
            </div>
          </div>
        `
            : ""
        }
      </div>
    `;
  }

  /**
   * Render custom view with inline template creation
   */
  private renderCustomView(
    templates: Template[],
    personalities: Personality[],
  ): string {
    const customTemplates = templates.filter((t) => t.id.startsWith("custom_"));

    return `
      <div class="selector-content custom-view">
        <!-- Inline Template Creation Form -->
        <div class="custom-creation-section">
          <div class="creation-header">
            <h3>✨ Create Custom Template</h3>
            <button class="toggle-creation-btn" data-expanded="false">➕</button>
          </div>

          <div class="creation-form" style="display: none;">
            <div class="form-group">
              <label for="custom-style-field">Style Instructions</label>
              <div class="field-description">How should this template structure replies?</div>
              <textarea
                id="custom-style-field"
                placeholder="Define the writing approach and structure... (e.g., 'Ask a thoughtful follow-up question that builds on their point and encourages discussion')"
                rows="4"></textarea>
            </div>

            <div class="form-group">
              <label for="custom-tone-field">Tone Instructions</label>
              <div class="field-description">What personality should this template use?</div>
              <textarea
                id="custom-tone-field"
                placeholder="Describe the personality and voice... (e.g., 'Be genuinely curious and encouraging. Use warm language. Avoid being preachy or condescending')"
                rows="4"></textarea>
            </div>

            <div class="form-group">
              <label for="custom-length-field">Length Instructions</label>
              <div class="field-description">How long should replies be?</div>
              <textarea
                id="custom-length-field"
                placeholder="Specify the desired length and pacing... (e.g., 'Keep it concise - 1-2 sentences max. Get to the point quickly but include one insightful detail')"
                rows="4"></textarea>
            </div>

            <div class="form-group">
              <label for="custom-temperature-field">Temperature: <span id="custom-temp-value">0.7</span></label>
              <div class="field-description">Control creativity (0.1 = focused, 1.0 = creative)</div>
              <input
                type="range"
                id="custom-temperature-field"
                min="0.1"
                max="1.0"
                step="0.1"
                value="0.7" />
              <div class="temperature-labels">
                <span style="float: left; font-size: 11px; color: #8899A6;">← Focused</span>
                <span style="float: right; font-size: 11px; color: #8899A6;">Creative →</span>
              </div>
            </div>

            <div class="form-group template-name-row">
              <label for="custom-name-field">Template Name (optional for saving)</label>
              <div class="name-save-row">
                <input type="text" id="custom-name-field" placeholder="Enter template name..." maxlength="50" />
                <button class="save-template-btn">💾 Save Template</button>
              </div>
            </div>

            <div class="form-group">
              <button class="generate-custom-btn">🚀 Generate Reply</button>
            </div>
          </div>
        </div>

        <!-- Saved Templates List -->
        <div class="saved-templates-section">
          <h3>Saved Templates (${customTemplates.length})</h3>

          ${
            customTemplates.length === 0
              ? `
            <div class="no-templates-message">
              <p>No custom templates yet. Create your first one above! ↑</p>
            </div>
          `
              : `
            <div class="templates-list">
              ${customTemplates
                .map(
                  (template) => `
                <div class="template-item" data-template-id="${template.id}">
                  <div class="template-header">
                    <div class="template-title">
                      <span class="template-emoji">${template.emoji}</span>
                      <span class="template-name">${template.name}</span>
                    </div>
                    <div class="template-actions">
                      <button class="action-btn edit-btn" title="Edit template" data-action="edit">✏️</button>
                      <button class="action-btn delete-btn" title="Delete template" data-action="delete">🗑️</button>
                      <button class="action-btn preview-btn" title="Preview output" data-action="preview">👁️</button>
                      <button class="action-btn favorite-btn" title="Add to favorites" data-action="favorite">⭐</button>
                    </div>
                  </div>
                  <div class="template-preview">
                    <div class="preview-field">
                      <strong>Style:</strong> <span class="preview-text">${this.truncateText(template.stylePrompt || "", 60)}</span>
                    </div>
                    <div class="preview-field">
                      <strong>Tone:</strong> <span class="preview-text">${this.truncateText(template.tonePrompt || "", 60)}</span>
                    </div>
                    <div class="preview-field">
                      <strong>Length:</strong> <span class="preview-text">${this.truncateText(template.lengthPrompt || "", 60)}</span>
                    </div>
                    ${
                      template.temperature !== undefined
                        ? `
                    <div class="preview-field">
                      <strong>Temperature:</strong> <span class="preview-text">${template.temperature}</span>
                    </div>`
                        : ""
                    }
                  </div>
                </div>
              `,
                )
                .join("")}
            </div>
          `
          }

          ${
            customTemplates.length > 0
              ? `
            <div class="bulk-actions">
              <button class="bulk-action-btn export-btn">📤 Export All</button>
              <button class="bulk-action-btn import-btn">📥 Import</button>
              <button class="bulk-action-btn reset-btn">🔄 Reset All</button>
            </div>
          `
              : ""
          }
        </div>
      </div>
    `;
  }

  /**
   * Render compose view - for generating original tweets from topics
   */
  private renderComposeView(): string {
    return `
      <div class="selector-content compose-view">
        <div class="compose-section">
          <h3 class="compose-title">📝 Compose Original Tweet</h3>

          <div class="topic-input-group">
            <label class="compose-label">Topic or Idea</label>
            <textarea
              id="compose-topic"
              class="compose-topic-input"
              placeholder="Enter a topic, idea, or let me suggest trending topics..."
              rows="2">${this.composeTopic || ""}</textarea>
          </div>

          <div class="trending-suggestions">
            <div class="trending-header">
              <span class="trending-title">🔥 Trending Topics</span>
              <button id="fetch-trends" class="fetch-trends-btn" title="Fetch trending topics">
                Fetch
              </button>
            </div>
            <div id="trending-topics" class="trending-chips">
              ${
                this.trendingSuggestions.length > 0
                  ? this.trendingSuggestions
                      .map(
                        (t) => `
                  <button class="trend-chip" data-topic="${t.topic}">
                    ${t.topic}
                    ${t.volume ? `<span class="trend-volume">${t.volume > 1000 ? Math.floor(t.volume / 1000) + "K" : t.volume}</span>` : ""}
                  </button>
                `,
                      )
                      .join("")
                  : '<div class="loading-trends">Click "Fetch" to load trending topics</div>'
              }
            </div>
          </div>

          <div class="compose-options">
            <div class="option-group">
              <label class="option-label">Style</label>
              <select id="compose-style" class="compose-select">
                <option value="casual">Casual</option>
                <option value="professional">Professional</option>
                <option value="witty">Witty</option>
                <option value="thought-leader">Thought Leader</option>
                <option value="storytelling">Storytelling</option>
                <option value="educational">Educational</option>
              </select>
            </div>

            <div class="option-group">
              <label class="option-label">Tone</label>
              <select id="compose-tone" class="compose-select">
                <option value="neutral">Neutral</option>
                <option value="enthusiastic">Enthusiastic</option>
                <option value="controversial">Controversial</option>
                <option value="humorous">Humorous</option>
                <option value="inspirational">Inspirational</option>
                <option value="analytical">Analytical</option>
              </select>
            </div>

            <div class="option-group">
              <label class="option-label">Length</label>
              <select id="compose-length" class="compose-select">
                <option value="short">Short (< 100 chars)</option>
                <option value="medium" selected>Medium (100-200 chars)</option>
                <option value="long">Long (200-280 chars)</option>
                <option value="thread">Thread (2-3 tweets)</option>
              </select>
            </div>
          </div>

          <div class="hashtag-suggestions">
            <label class="hashtag-label">Suggested Hashtags</label>
            <div id="hashtag-chips" class="hashtag-chips">
              <!-- Hashtags will be loaded dynamically -->
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render expanded view - shows all options at once for power users
   */


  /**
   * Attach event listeners
   */
  private attachEventListeners(): void {
    if (!this.container) return;

    // Handle clear selection button in persistent bar
    const clearBtn = this.container.querySelector(".clear-selection-btn");
    if (clearBtn) {
      clearBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.clearAllSelections();
        this.render(); // Re-render to update UI
        // Show feedback near the button
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
        const view = (e.currentTarget as HTMLElement).dataset.view as
          | "personas"
          | "grid"
          | "smart"
          | "favorites"
                | "custom"
          | "compose";
        this.view = view;
        if (view === "smart") {
          this.loadSmartSuggestions();
        }
        // Don't auto-load trending topics for compose view - user will click Fetch
        this.render();
      });
    });

    // Quick preset selection (top 3 combinations)
    this.container.querySelectorAll(".quick-preset-btn").forEach((btn) => {
      (btn as HTMLElement).addEventListener("click", (e) => {
        e.stopPropagation();
        const templateId = (e.currentTarget as HTMLElement).dataset
          .presetTemplate!;
        const personalityId = (e.currentTarget as HTMLElement).dataset
          .presetPersonality!;

        // Apply the preset combination
        const template = TEMPLATES.find((t) => t.id === templateId);
        const personality = PERSONALITIES.find((p) => p.id === personalityId);

        if (template && personality) {
          this.selectedTemplate = template;
          this.selectedPersonality = personality;

          // Track the preset usage
          usageTracker.trackTemplateSelection(templateId as any, "favorite");
          usageTracker.trackPersonaSelection(personalityId, "favorite");

          // Show success feedback
          if (this.anchorButton) {
            visualFeedback.showSuccess(
              this.anchorButton,
              `Applied preset: ${template.name} + ${personality.label}`,
            );
          }

          // Re-render to show selections
          this.render();

          logger.success("Quick Preset Applied", {
            template: templateId,
            personality: personalityId,
          });
        }
      });
    });

    // Persona selection (quick personas)
    this.container
      .querySelectorAll(".persona-card, .persona-card-compact")
      .forEach((btn) => {
        (btn as HTMLElement).addEventListener("click", (e) => {
          e.stopPropagation();
          const personaId = (e.currentTarget as HTMLElement).dataset.persona!;
          this.selectPersona(personaId);
        });
      });

    // Vocabulary selection (new 4-part structure)
    this.container.querySelectorAll(".vocabulary-btn").forEach((btn) => {
      (btn as HTMLElement).addEventListener("click", (e) => {
        e.stopPropagation();
        const vocabularyId = (e.currentTarget as HTMLElement).dataset
          .vocabulary!;
        this.selectVocabulary(vocabularyId);
      });
    });

    // Rhetoric selection (new buttons)
    this.container.querySelectorAll(".rhetoric-btn").forEach((btn) => {
      (btn as HTMLElement).addEventListener("click", (e) => {
        e.stopPropagation();
        const rhetoricId = (e.currentTarget as HTMLElement).dataset.rhetoric!;
        this.selectTemplate(rhetoricId);
      });
    });

    // Length & Pacing selection (new 4-part structure)
    this.container.querySelectorAll(".length-pacing-btn").forEach((btn) => {
      (btn as HTMLElement).addEventListener("click", (e) => {
        e.stopPropagation();
        const lengthPacingId = (e.currentTarget as HTMLElement).dataset
          .lengthpacing!;
        this.selectLengthPacing(lengthPacingId);
      });
    });

    // Template selection (backward compatibility)
    this.container.querySelectorAll(".template-btn").forEach((btn) => {
      (btn as HTMLElement).addEventListener("click", (e) => {
        e.stopPropagation();
        const templateId = (e.currentTarget as HTMLElement).dataset.template!;
        this.selectTemplate(templateId);
      });
    });

    // Rhetoric star buttons (new)
    this.container.querySelectorAll("[data-rhetoric-star]").forEach((btn) => {
      (btn as HTMLElement).addEventListener("click", async (e) => {
        e.stopPropagation();
        e.preventDefault();
        const rhetoricId = (e.currentTarget as HTMLElement).dataset
          .rhetoricStar!;
        await this.toggleFavoriteTemplate(rhetoricId);
      });
    });

    // Template star buttons (backward compatibility)
    this.container.querySelectorAll("[data-template-star]").forEach((btn) => {
      (btn as HTMLElement).addEventListener("click", async (e) => {
        e.stopPropagation();
        e.preventDefault();
        const templateId = (e.currentTarget as HTMLElement).dataset
          .templateStar!;
        await this.toggleFavoriteTemplate(templateId);
      });
    });

    // Suggestion card selection (for Smart view)
    this.container.querySelectorAll(".suggestion-card").forEach((card) => {
      (card as HTMLElement).addEventListener("click", (e) => {
        e.stopPropagation();
        const templateId = (e.currentTarget as HTMLElement).dataset.template!;
        const personalityId = (e.currentTarget as HTMLElement).dataset
          .personality!;
        this.selectTemplate(templateId);
        this.selectPersonality(personalityId);
      });
    });

    // Refresh suggestions button
    // Why recommended buttons in smart suggestions
    this.container.querySelectorAll(".why-recommended-btn").forEach((btn) => {
      (btn as HTMLElement).addEventListener("click", (e) => {
        e.stopPropagation();
        e.preventDefault();
        const scoreIndex = (e.currentTarget as HTMLElement).dataset.scoreIndex;
        const breakdown = this.container?.querySelector(
          `#score-breakdown-${scoreIndex}`,
        ) as HTMLElement;
        if (breakdown) {
          const isVisible = breakdown.style.display !== "none";
          breakdown.style.display = isVisible ? "none" : "block";
          // Update button text
          (e.currentTarget as HTMLElement).textContent = isVisible
            ? "Why?"
            : "Hide";
        }
      });
    });

    this.container
      .querySelectorAll(".refresh-suggestions-btn")
      .forEach((btn) => {
        (btn as HTMLElement).addEventListener("click", (e) => {
          e.stopPropagation();
          e.preventDefault();
          console.log(
            "%c🔄 Refreshing suggestions",
            "color: #1DA1F2; font-weight: bold",
          );
          // Update scores based on recent usage patterns
          this.updateSmartSuggestionScores();
          this.loadSmartSuggestions();
        });
      });

    // Personality group header toggle
    this.container.querySelectorAll(".group-header[data-personality-group]").forEach((header) => {
      (header as HTMLElement).addEventListener("click", (e) => {
        e.stopPropagation();
        const groupId = (e.currentTarget as HTMLElement).dataset.personalityGroup!;
        this.togglePersonalityGroup(groupId);
        
        // Toggle the collapsed class on the header and grid
        const groupElement = (e.currentTarget as HTMLElement).closest(".personality-group");
        if (groupElement) {
          const header = groupElement.querySelector(".group-header");
          const grid = groupElement.querySelector(".personality-grid");
          const chevron = header?.querySelector(".group-chevron");
          
          const isCollapsed = this.isPersonalityGroupCollapsed(groupId);
          if (header) header.classList.toggle("collapsed", isCollapsed);
          if (grid) grid.classList.toggle("collapsed", isCollapsed);
          if (chevron) chevron.textContent = isCollapsed ? "▶" : "▼";
        }
      });
    });

    // Personality selection
    this.container.querySelectorAll(".personality-btn").forEach((btn) => {
      (btn as HTMLElement).addEventListener("click", (e) => {
        e.stopPropagation();
        const personalityId = (e.currentTarget as HTMLElement).dataset
          .personality!;
        this.selectPersonality(personalityId);
      });
    });

    // Personality star buttons
    this.container
      .querySelectorAll("[data-personality-star]")
      .forEach((btn) => {
        (btn as HTMLElement).addEventListener("click", async (e) => {
          e.stopPropagation();
          e.preventDefault();
          const personalityId = (e.currentTarget as HTMLElement).dataset
            .personalityStar!;
          await this.toggleFavoritePersonality(personalityId);
        });
      });

    // Vocabulary star buttons
    this.container.querySelectorAll("[data-vocabulary-star]").forEach((btn) => {
      (btn as HTMLElement).addEventListener("click", async (e) => {
        e.stopPropagation();
        e.preventDefault();
        const vocabularyId = (e.currentTarget as HTMLElement).dataset
          .vocabularyStar!;
        await this.toggleFavoriteVocabulary(vocabularyId);
      });
    });

    // Length-pacing star buttons
    this.container
      .querySelectorAll("[data-lengthpacing-star]")
      .forEach((btn) => {
        (btn as HTMLElement).addEventListener("click", async (e) => {
          e.stopPropagation();
          e.preventDefault();
          const lengthPacingId = (e.currentTarget as HTMLElement).dataset
            .lengthpacingStar!;
          await this.toggleFavoriteLengthPacing(lengthPacingId);
        });
      });

    // Smart defaults button
    const smartDefaultsBtn = this.container.querySelector(
      ".smart-defaults-btn",
    );
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

    // Expanded view option selections
      this.container.querySelectorAll(".expanded-option").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          const el = e.currentTarget as HTMLElement;

          // Handle different option types
          if (el.dataset.expandedPersonality) {
            const personality = PERSONALITIES.find(
              (p) => p.id === el.dataset.expandedPersonality,
            );
            if (personality) {
              this.selectedPersonality = personality;
            }
          } else if (el.dataset.expandedVocabulary) {
            const vocab = getAllVocabularyStyles().find(
              (v: VocabularyStyle) => v.id === el.dataset.expandedVocabulary,
            );
            if (vocab) {
              this.selectedVocabulary = vocab;
            }
          } else if (el.dataset.expandedRhetoric) {
            const rhetoric = TEMPLATES.find(
              (r: Template) => r.id === el.dataset.expandedRhetoric,
            );
            if (rhetoric) {
              this.selectedTemplate = rhetoric;
            }
          } else if (el.dataset.expandedLength) {
            const length = getAllLengthPacingStyles().find(
              (l: LengthPacingStyle) => l.id === el.dataset.expandedLength,
            );
            if (length) {
              this.selectedLengthPacing = length;
            }
          } else if (el.dataset.expandedPersona) {
            const persona = getAllQuickPersonas().find(
              (p: QuickPersona) => p.id === el.dataset.expandedPersona,
            );
            if (persona) {
              this.selectedPersona = persona;
            }
          } else if (el.dataset.expandedTemplate) {
            const template = TEMPLATES.find(
              (t) => t.id === el.dataset.expandedTemplate,
            );
            if (template) {
              this.selectedTemplate = template;
            }
          }

          // Update UI
          this.render();
          this.updateUI();
        });
      });

    }

    // Quick Generate button
    const quickGenerateBtn = this.container.querySelector(
      ".quick-generate-btn",
    );
    if (quickGenerateBtn) {
      quickGenerateBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.handleQuickGenerate();
      });
    }

    // Toggle creation form
    const toggleBtn = this.container.querySelector(".toggle-creation-btn");
    if (toggleBtn) {
      toggleBtn.addEventListener("click", () => {
        this.toggleCreationForm();
      });
    }

    // Save template button
    const saveBtn = this.container.querySelector(".save-template-btn");
    if (saveBtn) {
      saveBtn.addEventListener("click", () => {
        this.handleSaveCustomTemplate();
      });
    }

    // Generate custom reply button
    const generateCustomBtn = this.container.querySelector(
      ".generate-custom-btn",
    );
    if (generateCustomBtn) {
      generateCustomBtn.addEventListener("click", () => {
        this.handleGenerateCustomReply();
      });
    }

    // Temperature slider event listener
    const tempSlider = this.container.querySelector(
      "#custom-temperature-field",
    ) as HTMLInputElement;
    const tempValue = this.container.querySelector("#custom-temp-value");
    if (tempSlider && tempValue) {
      tempSlider.addEventListener("input", () => {
        tempValue.textContent = tempSlider.value;
      });
    }

    // Add listeners to custom form fields to update button state on input
    const customFields = this.container.querySelectorAll(
      "#custom-style-field, #custom-tone-field, #custom-length-field",
    );
    customFields.forEach((field) => {
      field.addEventListener("input", () => this.updateUI());
    });

    // Compose view handlers
    if (this.view === "compose") {
      // Create debounced hashtag update function
      this.debouncedHashtagUpdate = debounce(async (topic: string) => {
        if (topic.length > 3) {
          try {
            const hashtags = await TrendService.getRelatedHashtags(topic);
            this.updateHashtagSuggestions(hashtags);
          } catch (error) {
            console.error("Failed to fetch hashtags:", error);
          }
        }
      }, 500); // 500ms delay

      // Topic input handler
      const topicInput = this.container.querySelector(
        "#compose-topic",
      ) as HTMLTextAreaElement;
      if (topicInput) {
        const inputHandler = (e: Event) => {
          this.composeTopic = (e.target as HTMLTextAreaElement).value;
          // Use debounced function for hashtag suggestions
          if (this.debouncedHashtagUpdate) {
            this.debouncedHashtagUpdate(this.composeTopic);
          }
        };
        topicInput.addEventListener("input", inputHandler);
        // Store cleanup function
        this.eventListenerCleanups.push(() => {
          topicInput.removeEventListener("input", inputHandler);
        });
      }

      // Trending topic chip handlers
      this.container.querySelectorAll(".trend-chip").forEach((chip) => {
        chip.addEventListener("click", async (e) => {
          const topic = (e.currentTarget as HTMLElement).dataset.topic || "";
          this.composeTopic = topic;
          if (topicInput) topicInput.value = topic;
          // Load hashtags for selected trend
          const hashtags = await TrendService.getRelatedHashtags(topic);
          this.updateHashtagSuggestions(hashtags);
        });
      });

      // Fetch trends button
      const fetchBtn = this.container.querySelector("#fetch-trends");
      if (fetchBtn) {
        // Store reference for disabling/enabling
        this.fetchButton = fetchBtn as HTMLElement;

        fetchBtn.addEventListener("click", async () => {
          const button = fetchBtn as HTMLButtonElement;

          // Don't proceed if button is disabled
          if (button.disabled) {
            return;
          }

          const originalText = button.textContent;

          try {
            // Update button state
            button.textContent = "Loading...";

            // Load trending topics with force refresh
            await this.loadTrendingSuggestions(true);
          } catch (error) {
            console.error("Failed to fetch trending topics:", error);
            visualFeedback.showToast("Failed to fetch trending topics", {
              type: "error",
            });
          } finally {
            // Restore button text (enable/disable handled by the method)
            if (!button.disabled) {
              button.textContent = originalText || "Fetch";
            }
          }
        });
      }
    }

    // Template action buttons
    this.container.querySelectorAll(".action-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const action = (e.currentTarget as HTMLElement).dataset.action!;
        const templateId = (e.currentTarget as HTMLElement)
          .closest(".template-item")
          ?.getAttribute("data-template-id")!;
        this.handleTemplateAction(action, templateId);
      });
    });

    // Bulk action buttons
    this.container.querySelectorAll(".bulk-action-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const action = (e.currentTarget as HTMLElement).classList.contains(
          "export-btn",
        )
          ? "export"
          : (e.currentTarget as HTMLElement).classList.contains("import-btn")
            ? "import"
            : "reset";
        this.handleBulkAction(action);
      });
    });


    // Accept suggestion buttons in Favorites tab
    this.container
      .querySelectorAll("[data-suggestion-accept]")
      .forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          const index = parseInt(
            (e.currentTarget as HTMLElement).dataset.suggestionAccept!,
          );
          this.acceptSuggestion(index);
        });
      });

    // Dismiss suggestion buttons in Favorites tab
    this.container
      .querySelectorAll("[data-suggestion-dismiss]")
      .forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          const index = parseInt(
            (e.currentTarget as HTMLElement).dataset.suggestionDismiss!,
          );
          this.dismissSuggestion(index);
        });
      });


    // Collapsible section headers
    this.container.querySelectorAll(".collapsible-header").forEach((header) => {
      header.addEventListener("click", (e) => {
        e.stopPropagation();
        const toggle = (e.currentTarget as HTMLElement).dataset.toggle;
        if (toggle) {
          this.toggleSection(toggle);
        }
      });
    });
  }

  /**
   * Update smart suggestion scores based on recent usage patterns
   */
  private updateSmartSuggestionScores(): void {
    if (
      !this.smartSuggestionsScores ||
      this.smartSuggestionsScores.length === 0
    )
      return;

    // Get recent usage data
    const usageStats = usageTracker.getStats();
    const recentCombinations = usageTracker.getTopCombinations(10);

    // Update each score based on recent usage
    this.smartSuggestionsScores = this.smartSuggestionsScores.map(
      (suggestion: any) => {
        let adjustedScore = suggestion.score || 0;

        // Boost score if this combination was recently used
        const comboKey = `${suggestion.templateId}:${suggestion.personalityId || suggestion.toneId}`;
        const recentUse = recentCombinations.find(
          (c) => c.combination === comboKey,
        );
        if (recentUse) {
          // Increase score based on usage frequency
          const usageBoost = Math.min(recentUse.count * 0.1, 1); // Max 1 point boost
          adjustedScore += usageBoost;

          // Add usage reason if not already present
          if (!suggestion.reasons.some((r: string) => r.includes("Used"))) {
            suggestion.reasons.unshift(
              `Used ${recentUse.count} times recently`,
            );
          }
        }

        // Adjust based on time of day patterns
        const currentHour = new Date().getHours();
        const isWorkHours = currentHour >= 9 && currentHour <= 17;

        if (isWorkHours && suggestion.templateId?.includes("professional")) {
          adjustedScore += 0.5;
        } else if (!isWorkHours && suggestion.templateId?.includes("casual")) {
          adjustedScore += 0.5;
        }

        // Update additional scoring factors
        suggestion.contextMatch =
          suggestion.contextMatch || Math.random() * 0.5 + 0.5;
        suggestion.usageScore = recentUse
          ? Math.min(recentUse.count / 10, 1)
          : 0;
        suggestion.preferenceScore = this.favoriteTemplates.has(
          suggestion.templateId,
        )
          ? 1
          : 0.5;
        suggestion.timeScore = isWorkHours ? 0.7 : 0.3;
        suggestion.aiConfidence = suggestion.aiConfidence || 0.75;

        return {
          ...suggestion,
          score: Math.min(adjustedScore, 5), // Cap at 5 (will be normalized to 10)
        };
      },
    );

    // Re-sort by updated scores
    this.smartSuggestionsScores.sort((a: any, b: any) => b.score - a.score);

    console.log(
      "%c📊 Updated suggestion scores based on usage patterns",
      "color: #17BF63",
      this.smartSuggestionsScores,
    );
  }

  /**
   * Load smart suggestions based on context
   */
  private async loadSmartSuggestions(): Promise<void> {
    try {
      console.log("%c🤖 Loading smart suggestions", "color: #1DA1F2");

      // Get the current tweet context
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

      // Get suggestions from the template suggester
      const suggestions = await templateSuggester.getSuggestions({
        tweetText: context.tweetText || "",
        isReply: true,
        threadContext: context.threadContext,
        timeOfDay: new Date().getHours(),
        dayOfWeek: new Date().getDay(),
      });

      // Store the full scores for display
      this.smartSuggestionsScores = suggestions;

      // Extract unique templates and tones from suggestions
      const templateIds = new Set<string>();
      const toneIds = new Set<string>();

      // Extract templates and tones from top 12 suggestions for better variety
      suggestions.slice(0, 12).forEach((suggestion) => {
        templateIds.add(suggestion.templateId);
        toneIds.add(suggestion.toneId);
      });

      // Get the actual template and tone objects
      const suggestedTemplates = Array.from(templateIds)
        .map((id) => TEMPLATES.find((t) => t.id === id))
        .filter(Boolean) as Template[];

      const suggestedPersonalities = Array.from(toneIds)
        .map((id) => PERSONALITIES.find((p) => p.id === id))
        .filter(Boolean) as Personality[];

      // Ensure we have at least 12 suggestions for better variety
      if (suggestedTemplates.length < 12) {
        const remaining = 12 - suggestedTemplates.length;
        const additionalTemplates = TEMPLATES.filter(
          (t) => !templateIds.has(t.id),
        ).slice(0, remaining);
        suggestedTemplates.push(...additionalTemplates);
      }

      if (suggestedPersonalities.length < 12) {
        const remaining = 12 - suggestedPersonalities.length;
        const additionalPersonalities = PERSONALITIES.filter(
          (p) => !toneIds.has(p.id),
        ).slice(0, remaining);
        suggestedPersonalities.push(...additionalPersonalities);
      }

      // Store the suggestions - expanded to 12 for better variety
      this.smartSuggestions = {
        templates: suggestedTemplates.slice(0, 12),
        personalities: suggestedPersonalities.slice(0, 12),
      };

      console.log(
        "%c🤖 Smart suggestions loaded:",
        "color: #17BF63",
        this.smartSuggestions,
      );

      // Re-render to show the suggestions
      this.render();
    } catch (error) {
      console.error("Failed to load smart suggestions:", error);

      // Fallback to popular choices
      this.smartSuggestions = {
        templates: TEMPLATES.slice(0, 6),
        personalities: PERSONALITIES.slice(0, 6),
      };

      this.render();
    }
  }

  /**
   * Load trending topics for compose view
   */
  private async loadTrendingSuggestions(
    forceRefresh: boolean = false,
  ): Promise<void> {
    try {
      // Check cache first
      if (
        !forceRefresh &&
        this.trendingCache &&
        Date.now() - this.trendingCache.fetchedAt < this.TRENDING_CACHE_TTL
      ) {
        console.log("%c🎯 Using cached trending topics", "color: #657786");
        this.trendingSuggestions = this.trendingCache.data;
        if (this.view === "compose") {
          this.render();
        }
        return;
      }

      console.log("%c🔥 Loading trending topics", "color: #1DA1F2");

      // Disable fetch button temporarily
      this.disableFetchButton();

      // Get trending topics through the service worker (to avoid CORS issues)
      const response = await chrome.runtime.sendMessage({
        type: MessageType.FETCH_TRENDING_TOPICS,
      });

      if (response?.success && response?.data) {
        this.trendingSuggestions = response.data;

        // Update cache
        this.trendingCache = {
          data: response.data,
          fetchedAt: Date.now(),
        };

        console.log(
          `%c✅ Loaded ${response.data.length} trending topics`,
          "color: #17BF63",
        );
      } else {
        throw new Error(response?.error || "Failed to fetch trending topics");
      }

      // Re-render to show the loaded topics
      if (this.view === "compose") {
        this.render();
      }
    } catch (error) {
      console.error("Failed to load trending topics:", error);

      // Use fallback topics
      this.trendingSuggestions = [
        { topic: "AI Technology", category: "tech" },
        { topic: "Climate Change", category: "news" },
        { topic: "Remote Work", category: "business" },
      ];

      if (this.view === "compose") {
        this.render();
      }
    } finally {
      // Re-enable fetch button after a delay
      this.enableFetchButtonAfterDelay();
    }
  }

  /**
   * Disable fetch button to prevent rapid clicks
   */
  private disableFetchButton(): void {
    if (this.fetchButton) {
      this.fetchButton.setAttribute("disabled", "true");
      this.fetchButton.style.opacity = "0.5";
      this.fetchButton.style.cursor = "not-allowed";
    }
  }

  /**
   * Re-enable fetch button after a delay
   */
  private enableFetchButtonAfterDelay(): void {
    if (this.fetchButtonDebounceTimer) {
      clearTimeout(this.fetchButtonDebounceTimer);
    }

    this.fetchButtonDebounceTimer = setTimeout(() => {
      if (this.fetchButton) {
        this.fetchButton.removeAttribute("disabled");
        this.fetchButton.style.opacity = "1";
        this.fetchButton.style.cursor = "pointer";
      }
    }, 2000); // 2 second delay
  }

  /**
   * Update hashtag suggestions in compose view
   */
  private updateHashtagSuggestions(hashtags: string[]): void {
    const hashtagContainer = this.container?.querySelector("#hashtag-chips");
    if (!hashtagContainer) return;

    hashtagContainer.innerHTML =
      hashtags
        .map(
          (tag) => `
      <button class="hashtag-chip" data-hashtag="${tag}">
        ${tag}
      </button>
    `,
        )
        .join("") || '<div class="no-hashtags">No hashtags available</div>';

    // Add click handlers to hashtag chips
    hashtagContainer.querySelectorAll(".hashtag-chip").forEach((chip) => {
      chip.addEventListener("click", (e) => {
        const hashtag = (e.currentTarget as HTMLElement).dataset.hashtag;
        if (hashtag) {
          // Add hashtag to topic input
          const topicInput = this.container?.querySelector(
            "#compose-topic",
          ) as HTMLTextAreaElement;
          if (topicInput && !topicInput.value.includes(hashtag)) {
            topicInput.value += ` ${hashtag}`;
            this.composeTopic = topicInput.value;
          }
        }
      });
    });
  }

  /**
   * Select a template
   */
  private selectTemplate(templateId: string): void {
    const template = TEMPLATES.find((t) => t.id === templateId) || null;
    if (template) {
      this.selectedTemplate = template;
      console.log("%c📋 Template selected:", "color: #1DA1F2", template.name);
      this.updateUI();
      this.checkReadyToGenerate();
    }
  }

  /**
   * Select a quick persona
   */
  private selectPersona(personaId: string): void {
    const personas = getAllQuickPersonas();
    const persona = personas.find((p) => p.id === personaId) || null;
    if (persona) {
      this.selectedPersona = persona;

      // Track persona usage
      this.trackPersonaUsage(personaId);

      console.log(
        "%c👤 Persona selected:",
        "color: #FFD700; font-weight: bold",
        persona.name,
      );
      console.log("%c  Pre-configured:", "color: #657786");
      console.log("%c    Personality:", "color: #9146FF", persona.personality);
      console.log("%c    Vocabulary:", "color: #FF6B6B", persona.vocabulary);
      console.log("%c    Rhetoric:", "color: #FF9F1C", persona.rhetoricMove);
      console.log("%c    Pacing:", "color: #E91E63", persona.lengthPacing);
      this.updateUI();
      this.checkReadyToGenerate();
    }
  }

  /**
   * Select a vocabulary style
   */
  private selectVocabulary(vocabularyId: string): void {
    const vocabulary =
      getAllVocabularyStyles().find((v) => v.id === vocabularyId) || null;
    if (vocabulary) {
      this.selectedVocabulary = vocabulary;
      console.log(
        "%c📝 Vocabulary selected:",
        "color: #FF6B6B",
        vocabulary.label,
      );
      this.updateUI();
      this.checkReadyToGenerate();
    }
  }

  /**
   * Select a length & pacing style
   */
  private selectLengthPacing(lengthPacingId: string): void {
    const lengthPacing =
      getAllLengthPacingStyles().find((lp) => lp.id === lengthPacingId) || null;
    if (lengthPacing) {
      this.selectedLengthPacing = lengthPacing;
      console.log(
        "%c⏱️ Length & Pacing selected:",
        "color: #E91E63",
        lengthPacing.label,
      );
      this.updateUI();
      this.checkReadyToGenerate();
    }
  }

  /**
   * Select a personality
   */
  private selectPersonality(personalityId: string): void {
    const personality =
      PERSONALITIES.find((p) => p.id === personalityId) || null;
    if (personality) {
      this.selectedPersonality = personality;
      console.log(
        "%c🎭 Personality selected:",
        "color: #9146FF",
        personality.label,
      );
      this.updateUI();
      this.checkReadyToGenerate();
    }
  }

  /**
   * Update UI after selection
   */
  private updateUI(): void {
    if (!this.container) return;

    // Re-render to update completion indicators and progress bar
    this.render();
  }

  /**
   * Check if ready to generate and update button state
   */
  private checkReadyToGenerate(): void {
    if (this.view === "personas") {
      // Check if persona is selected
      if (this.selectedPersona) {
        console.log(
          "%c✅ Persona selected!",
          "color: #17BF63; font-weight: bold",
        );
        console.log("%c  Name:", "color: #657786", this.selectedPersona.name);
        console.log(
          "%c  Using pre-configured 4-part structure",
          "color: #FFD700",
        );
      }
    } else if (this.view === "grid") {
      // Check all 4 parts for grid view
      if (
        this.selectedPersonality &&
        this.selectedVocabulary &&
        this.selectedTemplate &&
        this.selectedLengthPacing
      ) {
        console.log(
          "%c✅ All 4 parts selected!",
          "color: #17BF63; font-weight: bold",
        );
        console.log(
          "%c  1️⃣ Personality:",
          "color: #657786",
          this.selectedPersonality.label,
        );
        console.log(
          "%c  2️⃣ Vocabulary:",
          "color: #657786",
          this.selectedVocabulary.label,
        );
        console.log(
          "%c  3️⃣ Rhetoric:",
          "color: #657786",
          this.selectedTemplate.name,
        );
        console.log(
          "%c  4️⃣ Length & Pacing:",
          "color: #657786",
          this.selectedLengthPacing.label,
        );
      }
    } else {
      // Check 2 parts for other views (backward compatibility)
      if (this.selectedTemplate && this.selectedTone) {
        console.log("%c✅ Ready to generate!", "color: #17BF63");
        console.log(
          "%c  Template:",
          "color: #657786",
          this.selectedTemplate.name,
        );
        console.log("%c  Tone:", "color: #657786", this.selectedTone.label);
      }
    }

    // Update button state immediately after checking
    this.updateUI();
  }

  /**
   * Handle generate action
   */
  private handleGenerate(): void {
    if (!this.onSelectCallback) return;

    // Check requirements based on view
    if (this.view === "personas") {
      if (!this.selectedPersona) return;

      // Use persona's system prompt directly
      const result: SelectionResult = {
        // Create temporary template and tone for backward compatibility
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
          category: "neutral", // Use neutral for personas as they have varied tones
        },
        combinedPrompt: this.selectedPersona.systemPrompt,
        temperature: 0.8, // Slightly higher for personas
        // Pass pre-configured 4-part data
        vocabulary: this.selectedPersona.vocabulary,
        lengthPacing: this.selectedPersona.lengthPacing,
        // Also pass personality and rhetoric for complete structure
        personality: this.selectedPersona.personality,
        rhetoric: this.selectedPersona.rhetoricMove,
        // Set tab type for prompt architecture
        tabType: "personas",
        personaConfig: {
          personality: this.selectedPersona.personality || "",
          vocabulary: this.selectedPersona.vocabulary || "",
          rhetoricMove: this.selectedPersona.rhetoricMove || "",
          lengthPacing: this.selectedPersona.lengthPacing || "",
          systemPrompt: this.selectedPersona.systemPrompt,
        },
      };

      console.log(
        "%c🚀 Generating with Persona:",
        "color: #FFD700; font-weight: bold",
      );
      console.log("%c  Name:", "color: #657786", this.selectedPersona.name);
      console.log("%c  Pre-configured 4-part structure:", "color: #FF6B6B");
      console.log("%c    Personality:", "color: #9146FF", result.personality);
      console.log("%c    Vocabulary:", "color: #FF6B6B", result.vocabulary);
      console.log("%c    Rhetoric:", "color: #FF9F1C", result.rhetoric);
      console.log("%c    Pacing:", "color: #E91E63", result.lengthPacing);

      // Hide and call callback
      this.hide();
      this.onSelectCallback(result);
      return;
    }

    // Handle compose view
    if (this.view === "compose") {
      if (!this.composeTopic) return;

      const composeStyle =
        (this.container?.querySelector("#compose-style") as HTMLSelectElement)
          ?.value || "casual";
      const composeTone =
        (this.container?.querySelector("#compose-tone") as HTMLSelectElement)
          ?.value || "neutral";
      const composeLength =
        (this.container?.querySelector("#compose-length") as HTMLSelectElement)
          ?.value || "medium";

      const result: SelectionResult = {
        template: {
          id: "compose_tweet",
          name: "Compose Tweet",
          emoji: "✍️",
          prompt: `Write an original tweet about: ${this.composeTopic}`,
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
        combinedPrompt: `Write an original tweet about: ${this.composeTopic}`,
        temperature: 0.8,
        tabType: "compose" as const,
        composeConfig: {
          topic: this.composeTopic,
          style: composeStyle,
          tone: composeTone,
          length: composeLength,
        },
      };

      this.onSelectCallback(result);
      return;
    }

    if (this.view === "grid") {
      if (
        !this.selectedPersonality ||
        !this.selectedVocabulary ||
        !this.selectedTemplate ||
        !this.selectedLengthPacing
      )
        return;
    } else {
      if (!this.selectedTemplate || !this.selectedTone) return;
    }

    // Combine template and tone prompts (backward compatibility)
    const combinedPrompt = `${this.selectedTemplate.prompt} ${this.selectedTone?.systemPrompt || this.selectedPersonality?.systemPrompt || ""}`;

    // Get temperature for tone (default 0.7)
    const temperature = 0.7;

    const result: SelectionResult = {
      template: this.selectedTemplate,
      tone: this.selectedTone || this.selectedPersonality!,
      combinedPrompt,
      temperature,
      // Add 4-part structure data if in grid view
      ...(this.view === "grid" && {
        vocabulary: this.selectedVocabulary?.id,
        lengthPacing: this.selectedLengthPacing?.id,
        tabType: "all" as const,
        allTabConfig: {
          personality: this.selectedPersonality?.id || "",
          vocabulary: this.selectedVocabulary?.id || "",
          rhetoric: this.selectedTemplate?.id || "",
          lengthPacing: this.selectedLengthPacing?.id || "",
        },
      }),
      // Add tab type for other views
      ...(this.view === "smart" && {
        tabType: "smart" as const,
        allTabConfig: {
          personality:
            this.selectedPersonality?.id || this.selectedTone?.id || "",
          vocabulary:
            this.selectedVocabulary?.id || "Plain English with modern slang",
          rhetoric:
            this.selectedRhetoric?.id ||
            this.selectedTemplate?.id ||
            "Agree and build upon the original point",
          lengthPacing:
            this.selectedLengthPacing?.id || "Normal reply with 1-2 sentences",
        },
      }),
      ...(this.view === "favorites" && {
        tabType: "favorites" as const,
        allTabConfig: {
          personality:
            this.selectedPersonality?.id || this.selectedTone?.id || "",
          vocabulary:
            this.selectedVocabulary?.id || "Plain English with modern slang",
          rhetoric:
            this.selectedRhetoric?.id ||
            this.selectedTemplate?.id ||
            "Agree and build upon the original point",
          lengthPacing:
            this.selectedLengthPacing?.id || "Normal reply with 1-2 sentences",
        },
      }),
      ...(this.view === "custom" && {
        tabType: "custom" as const,
        customConfig: this.getCustomFormData(),
      }),
    };

    console.log(
      "%c🚀 Generating with selection:",
      "color: #1DA1F2; font-weight: bold",
    );
    if (this.view === "grid") {
      console.log(
        "%c  Using 4-part structure:",
        "color: #FF6B6B; font-weight: bold",
      );
      console.log("%c  Vocabulary ID:", "color: #657786", result.vocabulary);
      console.log(
        "%c  Length & Pacing ID:",
        "color: #657786",
        result.lengthPacing,
      );
    }
    console.log(
      "%c  Combined prompt length:",
      "color: #657786",
      combinedPrompt.length,
    );
    console.log("%c  Temperature:", "color: #657786", temperature);

    // Hide the popup immediately when generating starts
    this.hide();

    // Call the callback after hiding
    this.onSelectCallback(result);
  }

  /**
   * Handle quick generate with last used selections or smart defaults
   */
  private async handleQuickGenerate(): Promise<void> {
    if (!this.onSelectCallback) return;

    console.log(
      "%c⚡ Quick Generate triggered (with randomization)",
      "color: #1DA1F2; font-weight: bold",
    );

    try {
      // Randomize all 4 parameters
      const personalities = PERSONALITIES;
      const templates = TEMPLATES;
      const vocabularyStyles = getAllVocabularyStyles();
      const lengthPacingStyles = getAllLengthPacingStyles();
      
      // Pick random selections
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
      
      const source = "randomized";

      console.log("%c  Using randomized selections:", "color: #657786", {
        personality: randomPersonality.label,
        vocabulary: randomVocabulary.label,
        rhetoric: randomTemplate.name,
        lengthPacing: randomLengthPacing.label,
      });

      // Use the random selections directly
      const template = randomTemplate;
      const personality = randomPersonality;
      const vocabularyStyle = randomVocabulary;
      const lengthPacingStyle = randomLengthPacing;

      // Build the combined prompt
      let combinedPrompt = `${personality.systemPrompt}\n\nReply approach: ${template.prompt}`;

      if (vocabularyStyle) {
        combinedPrompt += `\n\nVocabulary style: ${vocabularyStyle.systemPrompt}`;
      }

      if (lengthPacingStyle) {
        combinedPrompt += `\n\nLength and pacing: ${lengthPacingStyle.systemPrompt}`;
      }

      const result: SelectionResult = {
        template,
        tone: personality,
        combinedPrompt,
        temperature: 0.7,
        vocabulary: selections.vocabulary,
        lengthPacing: selections.lengthPacing,
        personality: selections.personality,
        rhetoric: selections.rhetoric,
        // Explicitly set tabType and config for proper prompt routing
        tabType: "all",
        allTabConfig: {
          personality: selections.personality || "friendly",
          vocabulary: selections.vocabulary || "plain_english",
          rhetoric: selections.rhetoric || "agree_build",
          lengthPacing: selections.lengthPacing || "drive_by",
        },
      };

      // Save this as the new last used selection
      await smartDefaults.saveLastUsed({
        personality: selections.personality,
        vocabulary: selections.vocabulary,
        rhetoric: selections.rhetoric,
        lengthPacing: selections.lengthPacing,
      });

      console.log(
        "%c✅ Quick Generate completed",
        "color: #17BF63; font-weight: bold",
      );

      // Hide and execute
      this.hide();
      this.onSelectCallback(result);
    } catch (error) {
      console.error("Quick Generate failed:", error);
      // Fall back to opening the selector for manual selection
      console.log("%c  Falling back to manual selection", "color: #FFA500");
    }
  }

  /**
   * Check if custom form is valid for generation
   */
  private isCustomFormValid(): boolean {
    if (this.view !== "custom" || !this.container) return false;

    const style = (
      this.container.querySelector("#custom-style-field") as HTMLTextAreaElement
    )?.value.trim();
    const tone = (
      this.container.querySelector("#custom-tone-field") as HTMLTextAreaElement
    )?.value.trim();
    const length = (
      this.container.querySelector(
        "#custom-length-field",
      ) as HTMLTextAreaElement
    )?.value.trim();

    // Require all three fields for generation
    return !!(style && tone && length);
  }

  /**
   * Get custom form data for custom tab generation
   */
  private getCustomFormData():
    | { style: string; tone: string; length: string; temperature?: number }
    | undefined {
    if (this.view !== "custom") return undefined;

    const styleField = this.container?.querySelector(
      "#custom-style-field",
    ) as HTMLTextAreaElement;
    const toneField = this.container?.querySelector(
      "#custom-tone-field",
    ) as HTMLTextAreaElement;
    const lengthField = this.container?.querySelector(
      "#custom-length-field",
    ) as HTMLTextAreaElement;
    const temperatureField = this.container?.querySelector(
      "#custom-temperature-field",
    ) as HTMLInputElement;

    if (!styleField || !toneField || !lengthField) return undefined;

    const style = styleField.value.trim();
    const tone = toneField.value.trim();
    const length = lengthField.value.trim();
    let temperature = temperatureField
      ? parseFloat(temperatureField.value)
      : undefined;

    // Validate and clamp temperature range
    if (temperature !== undefined) {
      temperature = Math.max(0.1, Math.min(1.0, temperature));
    }

    // Require all fields for generation
    if (!style || !tone || !length) return undefined;

    return { style, tone, length, temperature };
  }

  /**
   * Toggle collapsible section visibility
   */
  private toggleSection(sectionName: string): void {
    if (!this.container) return;

    const header = this.container.querySelector(
      `[data-toggle="${sectionName}"]`,
    ) as HTMLElement;
    const content = this.container.querySelector(
      `#${sectionName}-content`,
    ) as HTMLElement;
    const indicator = header?.querySelector(
      ".collapse-indicator",
    ) as HTMLElement;

    if (!header || !content || !indicator) {
      console.warn(`Missing elements for section ${sectionName}:`, {
        header: !!header,
        content: !!content,
        indicator: !!indicator,
      });
      return;
    }

    // Use computed style to check visibility more reliably
    const computedStyle = window.getComputedStyle(content);
    const isCollapsed =
      content.style.display === "none" || computedStyle.display === "none";

    if (isCollapsed) {
      // Expand
      content.style.display = "grid";
      content.style.visibility = "visible";
      indicator.textContent = "−";
      header.classList.remove("collapsed");
      console.log(`%c📖 Expanded ${sectionName} section`, "color: #1DA1F2");
    } else {
      // Collapse
      content.style.display = "none";
      indicator.textContent = "+";
      header.classList.add("collapsed");
      console.log(`%c📕 Collapsed ${sectionName} section`, "color: #1DA1F2");
    }
  }

  /**
   * Toggle favorite template
   */
  private async toggleFavoriteTemplate(rhetoricId: string): Promise<void> {
    if (this.favoriteRhetoric.has(rhetoricId)) {
      this.favoriteRhetoric.delete(rhetoricId);
      this.saveFavorites();
      console.log("%c⭐ Removed from favorites:", "color: #FFA500", rhetoricId);
    } else {
      this.favoriteRhetoric.add(rhetoricId);
      this.saveFavorites();
      console.log("%c⭐ Added to favorites:", "color: #FFA500", rhetoricId);
    }
    this.render();
  }

  /**
   * Toggle favorite personality
   */
  private async toggleFavoritePersonality(
    personalityId: string,
  ): Promise<void> {
    if (this.favoritePersonalities.has(personalityId)) {
      this.favoritePersonalities.delete(personalityId);
      this.saveFavorites();
      console.log(
        "%c⭐ Removed from favorites:",
        "color: #FFA500",
        personalityId,
      );
    } else {
      this.favoritePersonalities.add(personalityId);
      this.saveFavorites();
      console.log("%c⭐ Added to favorites:", "color: #FFA500", personalityId);
    }
    this.render();
  }

  /**
   * Toggle favorite vocabulary
   */
  private async toggleFavoriteVocabulary(vocabularyId: string): Promise<void> {
    if (this.favoriteVocabulary.has(vocabularyId)) {
      this.favoriteVocabulary.delete(vocabularyId);
      this.saveFavorites();
      console.log(
        "%c⭐ Removed vocabulary from favorites:",
        "color: #FFA500",
        vocabularyId,
      );
    } else {
      this.favoriteVocabulary.add(vocabularyId);
      this.saveFavorites();
      console.log(
        "%c⭐ Added vocabulary to favorites:",
        "color: #FFA500",
        vocabularyId,
      );
    }
    this.render();
  }

  /**
   * Toggle favorite length pacing
   */
  private async toggleFavoriteLengthPacing(
    lengthPacingId: string,
  ): Promise<void> {
    if (this.favoriteLengthPacing.has(lengthPacingId)) {
      this.favoriteLengthPacing.delete(lengthPacingId);
      this.saveFavorites();
      console.log(
        "%c⭐ Removed length pacing from favorites:",
        "color: #FFA500",
        lengthPacingId,
      );
    } else {
      this.favoriteLengthPacing.add(lengthPacingId);
      this.saveFavorites();
      console.log(
        "%c⭐ Added length pacing to favorites:",
        "color: #FFA500",
        lengthPacingId,
      );
    }
    this.render();
  }

  /**
   * Accept a suggested favorite combination
   */
  private acceptSuggestion(index: number): void {
    const topCombinations = usageTracker.getTopCombinations(5);

    if (index < topCombinations.length) {
      const combo = topCombinations[index];

      // Parse combination string and add to favorites
      const parts = combo.combination.split("_");
      if (parts.length === 4) {
        const [personalityId, vocabularyId, rhetoricId, lengthPacingId] = parts;
        if (personalityId) this.favoritePersonalities.add(personalityId);
        if (vocabularyId) this.favoriteVocabulary.add(vocabularyId);
        if (rhetoricId) this.favoriteRhetoric.add(rhetoricId);
        if (lengthPacingId) this.favoriteLengthPacing.add(lengthPacingId);
      } else if (parts.length === 2) {
        // Handle legacy template:personality format
        const [templateId, personalityId] = parts;
        this.favoriteRhetoric.add(templateId);
        this.favoritePersonalities.add(personalityId);
      }

      this.saveFavorites();

      // Track acceptance
      usageTracker.trackTemplateSelection(
        "favorite-suggestion" as any,
        "favorite",
      );

      console.log("%c⭐ Accepted suggestion:", "color: #17BF63", combo);

      // Show success feedback
      if (this.anchorButton) {
        visualFeedback.showSuccess(this.anchorButton, "Added to favorites!");
      }

      this.render();
    } else {
      // Handle default suggestions
      const defaultIndex = index - topCombinations.length;
      const defaults = [
        {
          personalityId: "supportive",
          vocabularyId: "accessible",
          rhetoricId: "empathetic",
          lengthPacingId: "balanced",
        },
        {
          personalityId: "thought-leader",
          vocabularyId: "academic",
          rhetoricId: "data-driven",
          lengthPacingId: "comprehensive",
        },
        {
          personalityId: "funny",
          vocabularyId: "casual",
          rhetoricId: "humorous",
          lengthPacingId: "punchy",
        },
        {
          personalityId: "contrarian",
          vocabularyId: "provocative",
          rhetoricId: "challenging",
          lengthPacingId: "rapid",
        },
        {
          personalityId: "teacher",
          vocabularyId: "simple",
          rhetoricId: "educational",
          lengthPacingId: "methodical",
        },
      ];

      if (defaultIndex >= 0 && defaultIndex < defaults.length) {
        const combo = defaults[defaultIndex];

        // Add to favorites
        if (combo.personalityId)
          this.favoritePersonalities.add(combo.personalityId);
        if (combo.vocabularyId) this.favoriteVocabulary.add(combo.vocabularyId);
        if (combo.rhetoricId) this.favoriteRhetoric.add(combo.rhetoricId);
        if (combo.lengthPacingId)
          this.favoriteLengthPacing.add(combo.lengthPacingId);

        this.saveFavorites();

        console.log(
          "%c⭐ Accepted default suggestion:",
          "color: #17BF63",
          combo,
        );

        // Show success feedback
        if (this.anchorButton) {
          visualFeedback.showSuccess(this.anchorButton, "Added to favorites!");
        }

        this.render();
      }
    }
  }

  /**
   * Dismiss a suggested favorite combination
   */
  private dismissSuggestion(index: number): void {
    // Store dismissed suggestions in localStorage
    const dismissedKey = "tweetcraft_dismissed_suggestions";
    const dismissed = JSON.parse(localStorage.getItem(dismissedKey) || "[]");

    const topCombinations = usageTracker.getTopCombinations(5);

    if (index < topCombinations.length) {
      const combo = topCombinations[index];
      // Use the combination string directly as the key
      const comboKey = combo.combination;

      if (!dismissed.includes(comboKey)) {
        dismissed.push(comboKey);
        localStorage.setItem(dismissedKey, JSON.stringify(dismissed));
      }

      console.log("%c🚫 Dismissed suggestion:", "color: #FFA500", combo);
    } else {
      // Handle default suggestions
      const defaultIndex = index - topCombinations.length;
      const dismissKey = `default_${defaultIndex}`;

      if (!dismissed.includes(dismissKey)) {
        dismissed.push(dismissKey);
        localStorage.setItem(dismissedKey, JSON.stringify(dismissed));
      }

      console.log(
        "%c🚫 Dismissed default suggestion:",
        "color: #FFA500",
        defaultIndex,
      );
    }

    // Show feedback
    if (this.anchorButton) {
      visualFeedback.showToast("Suggestion dismissed", { type: "info" });
    }

    this.render();
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
   * Load favorites from storage
   */
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
   * Apply smart defaults based on usage patterns
   */
  private async applySmartDefaults(): Promise<void> {
    const smartDefaultsService = new SmartDefaultsService();
    const defaults = await smartDefaultsService.getSmartDefaults();

    if (!defaults) {
      visualFeedback.showToast("Unable to determine smart defaults", {
        type: "warning",
      });
      return;
    }

    // Apply defaults based on current view
    if (this.view === "grid") {
      // Apply all 4 parts for grid view
      if (defaults.personality) {
        const personality = PERSONALITIES.find(
          (p) => p.id === defaults.personality,
        );
        if (personality) this.selectedPersonality = personality;
      }

      if (defaults.vocabulary) {
        const vocabularies = getAllVocabularyStyles();
        const vocabulary = vocabularies.find(
          (v) => v.id === defaults.vocabulary,
        );
        if (vocabulary) this.selectedVocabulary = vocabulary;
      }

      if (defaults.rhetoric) {
        const template = TEMPLATES.find((t) => t.id === defaults.rhetoric);
        if (template) this.selectedTemplate = template;
      }

      if (defaults.lengthPacing) {
        const lengthPacings = getAllLengthPacingStyles();
        const lengthPacing = lengthPacings.find(
          (l) => l.id === defaults.lengthPacing,
        );
        if (lengthPacing) this.selectedLengthPacing = lengthPacing;
      }
    } else if (this.view === "personas") {
      // Try to find a matching persona based on personality
      const personas = getAllQuickPersonas();
      const matchingPersona = personas.find(
        (p) => p.personality === defaults.personality,
      );

      if (matchingPersona) {
        this.selectedPersona = matchingPersona;
      }
    } else {
      // Apply template and personality for other views
      if (defaults.rhetoric) {
        const template = TEMPLATES.find((t) => t.id === defaults.rhetoric);
        if (template) this.selectedTemplate = template;
      }

      if (defaults.personality) {
        const personality = PERSONALITIES.find(
          (p) => p.id === defaults.personality,
        );
        if (personality) this.selectedPersonality = personality;
      }
    }

    // Show feedback
    visualFeedback.showToast(`Smart defaults applied: ${defaults.reason}`, {
      type: "success",
      duration: 4000,
    });

    // Re-render to show selections
    this.render();

    // Check if ready to generate
    this.checkReadyToGenerate();

    logger.success("Smart Defaults Applied", {
      confidence: defaults.confidence,
      reason: defaults.reason,
      selections: {
        personality: defaults.personality,
        vocabulary: defaults.vocabulary,
        rhetoric: defaults.rhetoric,
        lengthPacing: defaults.lengthPacing,
      },
    });
  }

  private async loadFavorites(): Promise<void> {
    try {
      // Load favorites from localStorage
      const stored = localStorage.getItem("tweetcraft_favorites");
      const prefs = stored ? JSON.parse(stored) : null;
      if (prefs) {
        this.favoriteRhetoric = new Set(
          prefs.favoriteRhetoric || prefs.favoriteTemplates || [],
        );
        this.favoritePersonalities = new Set(
          prefs.favoritePersonalities || prefs.favoriteTones || [],
        );
        this.favoriteVocabulary = new Set(prefs.favoriteVocabulary || []);
        this.favoriteLengthPacing = new Set(prefs.favoriteLengthPacing || []);
      }
    } catch (error) {
      console.error("Failed to load favorites:", error);
    }
  }

  /**
   * Show create custom template/tone dialog
   */
  private showCreateCustomDialog(): void {
    // Create modal overlay
    const modal = document.createElement("div");
    modal.className = "tweetcraft-custom-modal";
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>Create Custom Template</h3>
          <button class="modal-close">×</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Template Name *</label>
            <input type="text" id="custom-name" placeholder="e.g., Thoughtful Response" maxlength="50" />
          </div>
          <div class="form-group">
            <label>Emoji Icon</label>
            <input type="text" id="custom-emoji" placeholder="e.g., 💭" maxlength="2" value="✨" />
          </div>
          <div class="form-group">
            <label>Description</label>
            <input type="text" id="custom-description" placeholder="Brief description of this template" />
          </div>
          <div class="form-group">
            <label>Style Prompt *</label>
            <textarea id="custom-style" rows="4" placeholder="Define the writing style and approach for this template (e.g., 'Write a thoughtful reply that acknowledges the point and adds a new perspective')"></textarea>
          </div>
          <div class="form-group">
            <label>Tone Prompt *</label>
            <textarea id="custom-tone" rows="4" placeholder="Define the tone and personality (e.g., 'Be professional but approachable, use clear language, avoid jargon')"></textarea>
          </div>
          <div class="form-group">
            <label>Length Instructions</label>
            <textarea id="custom-length" rows="3" placeholder="Specify desired length and pacing (e.g., 'Keep concise - 1-2 sentences max')"></textarea>
          </div>
          <div class="form-group">
            <label>Temperature: <span id="modal-temp-value">0.7</span></label>
            <input type="range" id="custom-temperature" min="0.1" max="1.0" step="0.1" value="0.7" />
            <div style="display: flex; justify-content: space-between; font-size: 11px; color: #8899A6;">
              <span>← Focused</span>
              <span>Creative →</span>
            </div>
          </div>
          <div class="form-group">
            <label>Category</label>
            <select id="custom-category">
              <option value="custom">Custom</option>
              <option value="engagement">Engagement</option>
              <option value="debate">Debate</option>
              <option value="humor">Humor</option>
            </select>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-cancel">Cancel</button>
          <button class="btn-save">Create Template</button>
        </div>
      </div>
    `;

    // Apply styles
    const style = document.createElement("style");
    style.textContent = `
      .tweetcraft-custom-modal {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10002;
      }

      .modal-content {
        background: #15202b;
        border-radius: 12px;
        width: 500px;
        max-width: 90vw;
        border: 1px solid rgba(139, 152, 165, 0.3);
      }

      .modal-header {
        padding: 16px 20px;
        border-bottom: 1px solid rgba(139, 152, 165, 0.2);
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .modal-header h3 {
        margin: 0;
        color: #e7e9ea;
        font-size: 18px;
      }

      .modal-close {
        background: transparent;
        border: none;
        color: #8b98a5;
        font-size: 24px;
        cursor: pointer;
        padding: 0;
        width: 30px;
        height: 30px;
      }

      .modal-close:hover {
        color: #e7e9ea;
      }

      .modal-body {
        padding: 20px;
      }

      .form-group {
        margin-bottom: 16px;
      }

      .form-group label {
        display: block;
        color: #8b98a5;
        font-size: 13px;
        margin-bottom: 6px;
      }

      .form-group input,
      .form-group textarea,
      .form-group select {
        width: 100%;
        background: rgba(255, 255, 255, 0.95);
        border: 1px solid rgba(139, 152, 165, 0.3);
        border-radius: 8px;
        padding: 10px 12px;
        color: #000;
        font-size: 14px;
      }

      .form-group select option {
        background: white;
        color: black;
      }

      .form-group input:focus,
      .form-group textarea:focus,
      .form-group select:focus {
        outline: none;
        border-color: #1d9bf0;
        background: rgba(255, 255, 255, 0.08);
      }

      .modal-footer {
        padding: 16px 20px;
        border-top: 1px solid rgba(139, 152, 165, 0.2);
        display: flex;
        justify-content: flex-end;
        gap: 10px;
      }

      .btn-cancel,
      .btn-save {
        padding: 8px 20px;
        border-radius: 18px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
      }

      .btn-cancel {
        background: transparent;
        border: 1px solid rgba(139, 152, 165, 0.3);
        color: #8b98a5;
      }

      .btn-cancel:hover {
        background: rgba(255, 255, 255, 0.05);
      }

      .btn-save {
        background: #1d9bf0;
        border: none;
        color: white;
      }

      .btn-save:hover {
        background: #1a8cd8;
      }
    `;

    document.head.appendChild(style);
    document.body.appendChild(modal);

    // Event handlers
    const closeModal = () => {
      modal.remove();
      style.remove();
    };

    modal.querySelector(".modal-close")?.addEventListener("click", closeModal);
    modal.querySelector(".btn-cancel")?.addEventListener("click", closeModal);

    // Temperature slider event listener in modal
    const modalTempSlider = modal.querySelector(
      "#custom-temperature",
    ) as HTMLInputElement;
    const modalTempValue = modal.querySelector("#modal-temp-value");
    if (modalTempSlider && modalTempValue) {
      modalTempSlider.addEventListener("input", () => {
        modalTempValue.textContent = modalTempSlider.value;
      });
    }

    modal.querySelector(".btn-save")?.addEventListener("click", async () => {
      const name = (
        modal.querySelector("#custom-name") as HTMLInputElement
      )?.value.trim();
      const emoji =
        (
          modal.querySelector("#custom-emoji") as HTMLInputElement
        )?.value.trim() || "✨";
      const description = (
        modal.querySelector("#custom-description") as HTMLInputElement
      )?.value.trim();
      const stylePrompt = (
        modal.querySelector("#custom-style") as HTMLTextAreaElement
      )?.value.trim();
      const tonePrompt = (
        modal.querySelector("#custom-tone") as HTMLTextAreaElement
      )?.value.trim();
      const lengthPrompt = (
        modal.querySelector("#custom-length") as HTMLTextAreaElement
      )?.value.trim();
      const temperature = parseFloat(
        (modal.querySelector("#custom-temperature") as HTMLInputElement)
          ?.value || "0.7",
      );
      const category =
        (modal.querySelector("#custom-category") as HTMLSelectElement)?.value ||
        "custom";

      if (!name || !stylePrompt || !tonePrompt) {
        visualFeedback.showToast(
          "Name, style prompt, and tone prompt are required",
          { type: "error" },
        );
        return;
      }

      // Combine the prompts
      const combinedPrompt = `${stylePrompt}\n\n${tonePrompt}${lengthPrompt ? `\n\n${lengthPrompt}` : ""}`;

      // Create custom template
      const customTemplate: Template = {
        id: `custom_${Date.now()}`,
        name,
        emoji,
        description: description || `Custom template: ${name}`,
        prompt: combinedPrompt,
        category: category as any,
        stylePrompt,
        tonePrompt,
        lengthPrompt,
        temperature,
      };

      // Save to storage
      await this.saveCustomTemplate(customTemplate);

      visualFeedback.showToast("Custom template created!", { type: "success" });
      closeModal();

      // Refresh the view
      this.view = "custom";
      this.render();
    });

    // Click outside to close
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        closeModal();
      }
    });
  }

  /**
   * Save custom template to storage
   */
  private async saveCustomTemplate(template: Template): Promise<void> {
    try {
      // First get existing templates via message passing
      chrome.runtime.sendMessage(
        { type: MessageType.GET_STORAGE, keys: ["customTemplates"] },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error(
              "Failed to load templates for saving:",
              chrome.runtime.lastError,
            );
            return;
          }

          const customTemplates = response?.data?.customTemplates || [];
          const updatedTemplates = Array.isArray(customTemplates)
            ? [...customTemplates, template]
            : [template];

          // Save updated templates via service worker
          chrome.runtime.sendMessage(
            {
              type: MessageType.SET_STORAGE,
              data: { customTemplates: updatedTemplates },
            },
            (saveResponse) => {
              if (chrome.runtime.lastError) {
                console.error(
                  "Failed to save custom template:",
                  chrome.runtime.lastError,
                );
              } else if (saveResponse?.success) {
                // Add to TEMPLATES array for current session
                TEMPLATES.push(template);
                console.log("Custom template saved successfully");
              }
            },
          );
        },
      );
    } catch (error) {
      console.error("Failed to save custom template:", error);
    }
  }

  /**
   * Load custom templates from storage
   */
  private async loadCustomTemplates(): Promise<void> {
    try {
      // Use message passing to avoid CSP issues
      chrome.runtime.sendMessage(
        { type: MessageType.GET_STORAGE, keys: ["customTemplates"] },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error(
              "Failed to load custom templates:",
              chrome.runtime.lastError,
            );
            return;
          }

          if (response && response.success && response.data) {
            const customTemplates = response.data.customTemplates || [];

            // Ensure customTemplates is an array before iterating
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
   * Toggle the creation form visibility
   */
  private toggleCreationForm(): void {
    const toggleBtn = this.container?.querySelector(".toggle-creation-btn");
    const form = this.container?.querySelector(".creation-form") as HTMLElement;

    if (!toggleBtn || !form) return;

    const isExpanded = toggleBtn.getAttribute("data-expanded") === "true";

    if (isExpanded) {
      form.style.display = "none";
      toggleBtn.textContent = "➕";
      toggleBtn.setAttribute("data-expanded", "false");
    } else {
      form.style.display = "block";
      toggleBtn.textContent = "➖";
      toggleBtn.setAttribute("data-expanded", "true");

      // Focus on first field
      const firstField = form.querySelector(
        "#custom-style-field",
      ) as HTMLTextAreaElement;
      if (firstField) {
        firstField.focus();
      }
    }
  }

  /**
   * Handle generating a reply with custom template values
   */
  private handleGenerateCustomReply(): void {
    const customConfig = this.getCustomFormData();

    if (!customConfig) {
      visualFeedback.showToast("Please fill in all required fields", {
        type: "error",
      });
      return;
    }

    // Create a selection result with the custom configuration
    const result: SelectionResult = {
      template: {
        id: "custom_temp",
        name: "Custom Template",
        emoji: "✨",
        prompt: customConfig.style,
        description: "Custom template",
        category: "custom",
        categoryLabel: "Custom",
      },
      tone: {
        id: "custom_tone",
        systemPrompt: customConfig.tone,
        emoji: "✨",
        label: "Custom",
        description: "Custom tone",
        category: "neutral", // Use neutral as the category since 'custom' is not in the type
      },
      combinedPrompt: `${customConfig.style} ${customConfig.tone}`,
      temperature: customConfig.temperature || 0.7,
      tabType: "custom" as const,
      customConfig: customConfig,
    };

    // Hide selector and trigger the callback if available
    this.hide();
    if (this.onSelectCallback) {
      this.onSelectCallback(result);
    }
  }

  /**
   * Handle saving a custom template from the inline form
   */
  private async handleSaveCustomTemplate(): Promise<void> {
    const styleField = this.container?.querySelector(
      "#custom-style-field",
    ) as HTMLTextAreaElement;
    const toneField = this.container?.querySelector(
      "#custom-tone-field",
    ) as HTMLTextAreaElement;
    const lengthField = this.container?.querySelector(
      "#custom-length-field",
    ) as HTMLTextAreaElement;
    const nameField = this.container?.querySelector(
      "#custom-name-field",
    ) as HTMLInputElement;
    const temperatureField = this.container?.querySelector(
      "#custom-temperature-field",
    ) as HTMLInputElement;

    if (!styleField || !toneField || !lengthField || !nameField) return;

    const style = styleField.value.trim();
    const tone = toneField.value.trim();
    const length = lengthField.value.trim();
    const name = nameField.value.trim();
    const temperature = temperatureField
      ? parseFloat(temperatureField.value)
      : 0.7;

    // Validation
    if (!name) {
      visualFeedback.showToast("Template name is required", { type: "error" });
      nameField.focus();
      return;
    }

    if (!style) {
      visualFeedback.showToast("Style instructions are required", {
        type: "error",
      });
      styleField.focus();
      return;
    }

    if (!tone) {
      visualFeedback.showToast("Tone instructions are required", {
        type: "error",
      });
      toneField.focus();
      return;
    }

    if (!length) {
      visualFeedback.showToast("Length instructions are required", {
        type: "error",
      });
      lengthField.focus();
      return;
    }

    // Create the template with expanded structure
    const template: Template = {
      id: `custom_${Date.now()}`,
      name,
      emoji: "✨",
      description: `Custom template: ${name}`,
      category: "custom",
      prompt: `${style}\n\nTone: ${tone}\n\nLength: ${length}`,
      stylePrompt: style,
      tonePrompt: tone,
      lengthPrompt: length,
      temperature,
    };

    // Save template
    await this.saveCustomTemplate(template);

    // Clear form
    styleField.value = "";
    toneField.value = "";
    lengthField.value = "";
    nameField.value = "";

    // Collapse form
    this.toggleCreationForm();

    // Refresh the view to show the new template
    this.render();

    visualFeedback.showToast(`Template "${name}" created!`, {
      type: "success",
    });
  }

  /**
   * Handle template actions (edit, delete, preview, favorite)
   */
  private handleTemplateAction(action: string, templateId: string): void {
    const template = TEMPLATES.find((t) => t.id === templateId);
    if (!template) return;

    switch (action) {
      case "edit":
        this.editTemplate(template);
        break;
      case "delete":
        this.deleteTemplate(templateId);
        break;
      case "preview":
        this.previewTemplate(template);
        break;
      case "favorite":
        this.toggleFavoriteTemplate(templateId);
        break;
    }
  }

  /**
   * Edit a template by populating the form
   */
  private editTemplate(template: Template): void {
    // Show the creation form if hidden
    const toggleBtn = this.container?.querySelector(".toggle-creation-btn");
    const form = this.container?.querySelector(".creation-form") as HTMLElement;

    if (toggleBtn?.getAttribute("data-expanded") !== "true") {
      this.toggleCreationForm();
    }

    // Populate form fields
    const styleField = this.container?.querySelector(
      "#custom-style-field",
    ) as HTMLTextAreaElement;
    const toneField = this.container?.querySelector(
      "#custom-tone-field",
    ) as HTMLTextAreaElement;
    const lengthField = this.container?.querySelector(
      "#custom-length-field",
    ) as HTMLTextAreaElement;
    const nameField = this.container?.querySelector(
      "#custom-name-field",
    ) as HTMLInputElement;

    if (styleField) styleField.value = template.stylePrompt || "";
    if (toneField) toneField.value = template.tonePrompt || "";
    if (lengthField) lengthField.value = template.lengthPrompt || "";
    if (nameField) nameField.value = template.name;

    // Focus on name field
    if (nameField) nameField.focus();

    // Delete the old template since we'll create a new one on save
    this.deleteTemplate(template.id);

    visualFeedback.showToast(`Editing "${template.name}"`, { type: "info" });
  }

  /**
   * Delete a custom template
   */
  private async deleteTemplate(templateId: string): Promise<void> {
    const template = TEMPLATES.find((t) => t.id === templateId);
    if (!template) return;

    if (
      !confirm(`Delete template "${template.name}"? This cannot be undone.`)
    ) {
      return;
    }

    try {
      // Remove from TEMPLATES array
      const index = TEMPLATES.findIndex((t) => t.id === templateId);
      if (index !== -1) {
        TEMPLATES.splice(index, 1);
      }

      // Update storage
      chrome.runtime.sendMessage(
        { type: MessageType.GET_STORAGE, keys: ["customTemplates"] },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error(
              "Failed to load templates for deletion:",
              chrome.runtime.lastError,
            );
            return;
          }

          const customTemplates = response?.data?.customTemplates || [];
          const updatedTemplates = customTemplates.filter(
            (t: Template) => t.id !== templateId,
          );

          chrome.runtime.sendMessage(
            {
              type: MessageType.SET_STORAGE,
              data: { customTemplates: updatedTemplates },
            },
            () => {
              if (chrome.runtime.lastError) {
                console.error(
                  "Failed to delete template from storage:",
                  chrome.runtime.lastError,
                );
              } else {
                visualFeedback.showToast(
                  `Template "${template.name}" deleted`,
                  { type: "success" },
                );
                this.render(); // Refresh view
              }
            },
          );
        },
      );
    } catch (error) {
      console.error("Failed to delete template:", error);
      visualFeedback.showToast("Failed to delete template", { type: "error" });
    }
  }

  /**
   * Preview a template's output
   */
  private previewTemplate(template: Template): void {
    // For now, show a simple dialog with the template details
    const dialog = document.createElement("div");
    dialog.className = "template-preview-dialog";
    dialog.innerHTML = `
      <div class="preview-content">
        <div class="preview-header">
          <h3>🔍 Template Preview: ${template.name}</h3>
          <button class="preview-close">✕</button>
        </div>
        <div class="preview-body">
          <div class="preview-section">
            <h4>Style Instructions:</h4>
            <p>${template.stylePrompt || "Not specified"}</p>
          </div>
          <div class="preview-section">
            <h4>Tone Instructions:</h4>
            <p>${template.tonePrompt || "Not specified"}</p>
          </div>
          <div class="preview-section">
            <h4>Length Instructions:</h4>
            <p>${template.lengthPrompt || "Not specified"}</p>
          </div>
          <div class="preview-section">
            <h4>Combined Prompt:</h4>
            <div class="combined-prompt">${template.prompt}</div>
          </div>
        </div>
      </div>
    `;

    // Style the dialog
    const style = document.createElement("style");
    style.textContent = `
      .template-preview-dialog {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .preview-content {
        background: #15202b;
        border-radius: 12px;
        max-width: 600px;
        max-height: 80vh;
        overflow-y: auto;
        color: #e7e9ea;
      }
      .preview-header {
        padding: 16px;
        border-bottom: 1px solid #38444d;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .preview-close {
        background: none;
        border: none;
        color: #e7e9ea;
        font-size: 20px;
        cursor: pointer;
      }
      .preview-body {
        padding: 16px;
      }
      .preview-section {
        margin-bottom: 16px;
      }
      .preview-section h4 {
        margin: 0 0 8px 0;
        color: #1d9bf0;
      }
      .preview-section p {
        margin: 0;
        line-height: 1.4;
        color: #8b98a5;
      }
      .combined-prompt {
        background: #192734;
        padding: 12px;
        border-radius: 8px;
        font-family: monospace;
        white-space: pre-wrap;
        font-size: 13px;
      }
    `;

    document.head.appendChild(style);
    document.body.appendChild(dialog);

    // Close handlers
    const closeDialog = () => {
      dialog.remove();
      style.remove();
    };

    dialog
      .querySelector(".preview-close")
      ?.addEventListener("click", closeDialog);
    dialog.addEventListener("click", (e) => {
      if (e.target === dialog) closeDialog();
    });
  }

  /**
   * Handle bulk actions (export, import, reset)
   */
  private handleBulkAction(action: string): void {
    switch (action) {
      case "export":
        this.exportTemplates();
        break;
      case "import":
        this.importTemplates();
        break;
      case "reset":
        this.resetAllTemplates();
        break;
    }
  }

  /**
   * Export all custom templates
   */
  private exportTemplates(): void {
    const customTemplates = TEMPLATES.filter((t) => t.id.startsWith("custom_"));

    if (customTemplates.length === 0) {
      visualFeedback.showToast("No custom templates to export", {
        type: "info",
      });
      return;
    }

    const data = {
      version: "1.0",
      timestamp: new Date().toISOString(),
      templates: customTemplates,
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `tweetcraft-templates-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    visualFeedback.showToast(`Exported ${customTemplates.length} templates`, {
      type: "success",
    });
  }

  /**
   * Import templates from file
   */
  private importTemplates(): void {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";

    input.addEventListener("change", (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string);

          if (!data.templates || !Array.isArray(data.templates)) {
            visualFeedback.showToast("Invalid template file format", {
              type: "error",
            });
            return;
          }

          // Add imported templates
          data.templates.forEach((template: Template) => {
            // Generate new ID to avoid conflicts
            template.id = `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            TEMPLATES.push(template);
          });

          // Save to storage
          const customTemplates = TEMPLATES.filter((t) =>
            t.id.startsWith("custom_"),
          );
          chrome.runtime.sendMessage(
            {
              type: MessageType.SET_STORAGE,
              data: { customTemplates },
            },
            () => {
              if (chrome.runtime.lastError) {
                console.error(
                  "Failed to save imported templates:",
                  chrome.runtime.lastError,
                );
              } else {
                visualFeedback.showToast(
                  `Imported ${data.templates.length} templates`,
                  { type: "success" },
                );
                this.render();
              }
            },
          );
        } catch (error) {
          console.error("Failed to import templates:", error);
          visualFeedback.showToast("Failed to import templates", {
            type: "error",
          });
        }
      };

      reader.readAsText(file);
    });

    input.click();
  }

  /**
   * Reset all custom templates
   */
  private resetAllTemplates(): void {
    const customTemplates = TEMPLATES.filter((t) => t.id.startsWith("custom_"));

    if (customTemplates.length === 0) {
      visualFeedback.showToast("No custom templates to reset", {
        type: "info",
      });
      return;
    }

    if (
      !confirm(
        `Delete all ${customTemplates.length} custom templates? This cannot be undone.`,
      )
    ) {
      return;
    }

    // Remove all custom templates
    TEMPLATES.splice(
      0,
      TEMPLATES.length,
      ...TEMPLATES.filter((t) => !t.id.startsWith("custom_")),
    );

    // Clear storage
    chrome.runtime.sendMessage(
      {
        type: "SET_STORAGE",
        data: { customTemplates: [] },
      },
      () => {
        if (chrome.runtime.lastError) {
          console.error("Failed to reset templates:", chrome.runtime.lastError);
        } else {
          visualFeedback.showToast("All custom templates deleted", {
            type: "success",
          });
          this.render();
        }
      },
    );
  }

  /**
   * Apply styles
   */
  private applyStyles(): void {
    // Get saved size preferences
    const savedSize = this.getSavedSize();

    if (!document.querySelector("#tweetcraft-unified-styles")) {
      const style = document.createElement("style");
      style.id = "tweetcraft-unified-styles";
      style.textContent = `
        .tweetcraft-unified-selector {
          position: fixed;
          background: #15202b;
          border: 1px solid rgba(139, 152, 165, 0.3);
          border-radius: 12px;
          width: ${savedSize.width}px;
          height: ${savedSize.height}px;
          max-width: 980px;
          min-width: 480px;
          max-height: 90vh;
          min-height: 400px;
          display: flex;
          resize: both;
          overflow: auto;
          flex-direction: column;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          z-index: 10001;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.8);
          overflow: hidden;
          transition: width 0.2s ease, height 0.2s ease;
        }

        /* Enhanced resize handle */
        .resize-handle {
          position: absolute;
          bottom: 0;
          right: 0;
          width: 20px;
          height: 20px;
          cursor: se-resize;
          z-index: 10;
          display: flex;
          align-items: center;
          justify-content: center;
          color: rgba(139, 152, 165, 0.5);
          transition: color 0.2s;
        }

        .resize-handle:hover {
          color: rgba(29, 155, 240, 0.7);
        }

        /* Visual resize indicator */
        .tweetcraft-unified-selector.resizing {
          transition: none;
          user-select: none;
        }

        .tweetcraft-unified-selector.resizing * {
          pointer-events: none;
        }

        /* Persistent selection bar */
        .persistent-selection-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 12px;
          background: linear-gradient(135deg, rgba(29, 155, 240, 0.1), rgba(29, 155, 240, 0.05));
          border-bottom: 1px solid rgba(29, 155, 240, 0.3);
          min-height: 36px;
        }

        .persistent-selection-bar .selection-summary {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
          flex: 1;
        }

        .persistent-selection-bar .selection-item {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 8px;
          background: rgba(29, 155, 240, 0.15);
          border: 1px solid rgba(29, 155, 240, 0.3);
          border-radius: 12px;
          color: #e7e9ea;
          font-size: 12px;
          font-weight: 500;
        }

        .persistent-selection-bar .selection-number {
          font-size: 10px;
          opacity: 0.8;
        }

        .persistent-selection-bar .selection-emoji {
          font-size: 14px;
        }

        .persistent-selection-bar .selection-name {
          max-width: 120px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .persistent-selection-bar .clear-selection-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 4px 10px;
          background: rgba(220, 53, 69, 0.1);
          border: 1px solid rgba(220, 53, 69, 0.3);
          border-radius: 8px;
          color: #dc3545;
          font-size: 11px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .persistent-selection-bar .clear-selection-btn:hover {
          background: rgba(220, 53, 69, 0.2);
          border-color: rgba(220, 53, 69, 0.5);
        }

        .persistent-selection-bar .clear-icon {
          font-size: 14px;
          line-height: 1;
        }

        /* Quick presets section */
        .quick-presets-section {
          padding: 12px;
          background: linear-gradient(135deg, rgba(255, 215, 0, 0.05), rgba(255, 215, 0, 0.02));
          border: 1px solid rgba(255, 215, 0, 0.2);
          border-radius: 8px;
          margin-bottom: 12px;
        }

        .quick-presets-header {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          margin-bottom: 12px;
        }

        .quick-presets-title {
          font-size: 14px;
          font-weight: 600;
          color: #FFD700;
        }

        .quick-presets-subtitle {
          font-size: 11px;
          color: #8b98a5;
        }

        .quick-presets-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
        }

        .quick-preset-btn {
          position: relative;
          padding: 8px;
          background: linear-gradient(135deg, #15202b, rgba(29, 155, 240, 0.1));
          border: 1px solid rgba(29, 155, 240, 0.3);
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
          color: #e7e9ea;
        }

        .quick-preset-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(29, 155, 240, 0.3);
          border-color: #1d9bf0;
        }

        .preset-number {
          position: absolute;
          top: 4px;
          left: 4px;
          width: 18px;
          height: 18px;
          background: rgba(255, 215, 0, 0.2);
          border: 1px solid rgba(255, 215, 0, 0.5);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          font-weight: bold;
          color: #FFD700;
        }

        .preset-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }

        .preset-icons {
          font-size: 20px;
        }

        .preset-names {
          font-size: 10px;
          color: #8b98a5;
          text-align: center;
          line-height: 1.2;
        }

        .preset-usage {
          position: absolute;
          bottom: 4px;
          right: 4px;
          font-size: 9px;
          color: #657786;
          background: rgba(0, 0, 0, 0.4);
          padding: 2px 4px;
          border-radius: 4px;
        }

        /* Responsive design for smaller screens */
        @media (max-width: 600px) {
          .tweetcraft-unified-selector {
            width: 95vw !important;
            min-width: 320px !important;
            max-width: 95vw !important;
            max-height: 85vh !important;
          }

          .grid-view {
            grid-template-columns: 1fr !important;
            gap: 6px;
          }

          .selector-header {
            padding: 6px 8px;
          }

          .selector-content {
            padding: 6px;
          }

          .selector-footer {
            padding: 6px 8px;
          }
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

        .close-btn {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: transparent;
          border: none;
          color: #8b98a5;
          font-size: 20px;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .close-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          color: #e7e9ea;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .expanded-view-toggle-btn {
          display: flex;
          align-items: center;
          padding: 5px 8px;
          background: transparent;
          border: 1px solid #38444d;
          border-radius: 8px;
          color: #8b98a5;
          font-size: 16px;
          cursor: pointer;
          transition: all 0.2s;
          margin-right: 8px;
        }

        .expanded-view-toggle-btn:hover {
          background: rgba(29, 155, 240, 0.1);
          border-color: #1d9bf0;
          color: #1d9bf0;
        }

        .quick-generate-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 5px 10px;
          background: linear-gradient(135deg, #1d9bf0, #1a8cd8);
          border: none;
          border-radius: 14px;
          color: white;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 2px 4px rgba(29, 155, 240, 0.3);
          flex-shrink: 0;
        }

        .quick-generate-btn:hover {
          background: linear-gradient(135deg, #1a8cd8, #1679c2);
          box-shadow: 0 4px 8px rgba(29, 155, 240, 0.4);
          transform: translateY(-1px);
        }

        .quick-generate-btn:active {
          transform: translateY(0);
          box-shadow: 0 2px 4px rgba(29, 155, 240, 0.3);
        }

        .quick-generate-icon {
          font-size: 14px;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }

        .collapsible-header {
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 0;
          user-select: none;
        }

        .collapsible-header:hover {
          color: #1d9bf0;
        }

        .collapsible-header.collapsed {
          opacity: 0.7;
        }

        .section-title {
          flex: 1;
        }

        .collapse-indicator {
          font-size: 16px;
          font-weight: bold;
          color: #8b98a5;
          transition: transform 0.2s ease;
          width: 16px;
          text-align: center;
        }

        .collapsible-header:hover .collapse-indicator {
          color: #1d9bf0;
        }

        .collapsible-content {
          transition: all 0.3s ease;
          overflow: hidden;
        }

        .collapsible-section {
          border: 1px solid rgba(139, 152, 165, 0.1);
          border-radius: 8px;
          padding: 12px;
          margin: 8px 0;
          background: rgba(139, 152, 165, 0.02);
        }

        .selector-content {
          flex: 1;
          overflow-y: auto;
          padding: 6px;
          background: #15202b;
        }

        /* Expanded View Styles */
        .expanded-view {
          padding: 16px;
        }

        .expanded-controls {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px;
          background: rgba(21, 32, 43, 0.95);
          border-radius: 8px;
          margin-bottom: 16px;
          border: 1px solid #38444d;
        }

        .control-group {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .control-group label {
          color: #8b98a5;
          font-size: 12px;
          font-weight: 600;
        }

        .transparency-slider {
          width: 100px;
        }

        .transparency-value {
          color: #e7e9ea;
          font-size: 12px;
          min-width: 35px;
        }

        .dock-btn {
          padding: 4px 8px;
          background: transparent;
          border: 1px solid #38444d;
          color: #8b98a5;
          border-radius: 6px;
          font-size: 11px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .dock-btn:hover {
          background: rgba(29, 155, 240, 0.1);
          border-color: #1d9bf0;
          color: #1d9bf0;
        }

        .dock-btn.active {
          background: #1d9bf0;
          border-color: #1d9bf0;
          color: white;
        }

        .expanded-grid {
          display: grid;
          gap: 16px;
        }

        .expanded-section {
          background: rgba(21, 32, 43, 0.95);
          border: 1px solid #38444d;
          border-radius: 12px;
          padding: 12px;
        }

        .expanded-section h4 {
          margin: 0 0 12px 0;
          color: #e7e9ea;
          font-size: 14px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .expanded-options-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
          gap: 8px;
        }

        .expanded-option {
          padding: 8px;
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid #38444d;
          border-radius: 8px;
          color: #e7e9ea;
          font-size: 11px;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          text-align: center;
        }

        .expanded-option:hover {
          background: rgba(29, 155, 240, 0.1);
          border-color: #1d9bf0;
          transform: translateY(-1px);
        }

        .expanded-option.selected {
          background: #1d9bf0;
          border-color: #1d9bf0;
          color: white;
        }

        .expanded-option:focus {
          outline: 2px solid #1d9bf0;
          outline-offset: 2px;
        }

        .keyboard-helper {
          margin-top: 12px;
          padding: 8px;
          background: rgba(139, 152, 165, 0.1);
          border-radius: 8px;
          text-align: center;
          color: #8b98a5;
          font-size: 11px;
        }

        .selector-content.expanded-view[data-docked="left"],
        .selector-content.expanded-view[data-docked="right"] {
          height: 100%;
          overflow-y: auto;
        }

        .grid-view {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        /* 4-part structure styles */
        .four-part-structure {
          gap: 0;
        }

        .part-section {
          padding: 8px 6px;
          border-bottom: 1px solid rgba(139, 152, 165, 0.2);
          background: #15202b;
          position: relative;
        }

        /* Subtle gradient divider */
        .part-section::after {
          content: '';
          position: absolute;
          bottom: -1px;
          left: 8px;
          right: 8px;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(139, 152, 165, 0.1), transparent);
          pointer-events: none;
        }

        .part-section:last-child {
          border-bottom: none;
        }

        .part-section h3 {
          margin: 0 0 6px 0;
          color: #e7e9ea;
          font-size: 13px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 6px;
          position: relative;
        }

        .part-section h3 .section-completion-indicator {
          margin-left: auto;
        }

        .collapsible-header .section-title {
          display: flex;
          align-items: center;
          flex: 1;
        }

        .collapsible-header .section-title .section-completion-indicator {
          margin-left: 8px;
        }

        .part-number {
          background: rgba(29, 155, 240, 0.2);
          color: #1d9bf0;
          padding: 2px 6px;
          border-radius: 4px;
          font-weight: 700;
          font-size: 12px;
        }

        .part-subtitle {
          color: #8b98a5;
          font-size: 12px;
          font-weight: 400;
        }

        .templates-section,
        .personalities-section {
          flex: 1;
        }

        .templates-section h3,
        .personalities-section h3 {
          margin: 0 0 10px 0;
          color: #e7e9ea;
          font-size: 13px;
          font-weight: 600;
          padding-bottom: 8px;
          border-bottom: 1px solid rgba(139, 152, 165, 0.2);
        }

        /* Removed template-category styles since we no longer use categories */

        .selection-grid,
        .rhetoric-grid,
        .template-grid,
        .personality-grid,
        .vocabulary-grid,
        .length-pacing-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 4px;
        }

        .vocabulary-grid {
          grid-template-columns: repeat(2, 1fr);
        }

        /* Personality Groups */
        .personality-groups {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .personality-group {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(139, 152, 165, 0.2);
          border-radius: 8px;
          overflow: hidden;
          transition: all 0.2s;
        }

        .personality-group.has-selection {
          border-color: rgba(29, 155, 240, 0.3);
          background: rgba(29, 155, 240, 0.05);
        }

        .group-header {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: rgba(255, 255, 255, 0.03);
          cursor: pointer;
          user-select: none;
          transition: all 0.2s;
          border-radius: 6px;
        }

        .group-header:hover {
          background: rgba(29, 155, 240, 0.1);
        }

        .group-icon {
          font-size: 18px;
        }

        .group-label {
          flex: 1;
          font-weight: 600;
          font-size: 13px;
          color: #e7e9ea;
        }

        .group-count {
          color: #8b98a5;
          font-size: 12px;
        }

        .group-chevron {
          font-size: 12px;
          color: #8b98a5;
          transition: transform 0.2s;
        }

        .group-header.collapsed .group-chevron {
          transform: rotate(-90deg);
        }

        .personality-grid.collapsed {
          display: none !important;
        }

        .personality-group .personality-grid {
          padding: 8px;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 6px;
        }

        .length-pacing-grid {
          grid-template-columns: repeat(2, 1fr);
        }

        .vocabulary-btn,
        .length-pacing-btn {
          display: flex;
          align-items: center;
          gap: 3px;
          padding: 4px 16px 4px 4px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(139, 152, 165, 0.3);
          border-radius: 6px;
          color: #e7e9ea;
          cursor: pointer;
          transition: all 0.2s;
          position: relative;
          font-size: 11px;
          min-height: 28px;
          width: 100%;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .vocabulary-btn:hover,
        .length-pacing-btn:hover {
          background: rgba(29, 155, 240, 0.15);
          border-color: rgba(29, 155, 240, 0.5);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(29, 155, 240, 0.2);
        }

        .vocabulary-btn.selected,
        .length-pacing-btn.selected {
          background: #1d9bf0 !important;
          border-color: #1d9bf0;
          color: white !important;
        }

        .vocabulary-btn.selected .vocabulary-label,
        .length-pacing-btn.selected .length-pacing-label {
          color: white !important;
        }

        .vocabulary-emoji,
        .length-pacing-emoji {
          font-size: 16px;
        }

        .vocabulary-label,
        .length-pacing-label {
          font-size: 12px;
          flex: 1;
          text-align: left;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* Personas view styles */
        .personas-view {
          padding: 8px;
        }
        
        /* Favorites view font normalization */
        .favorites-view .template-name,
        .favorites-view .personality-label {
          font-size: 12px !important;
        }

        .personas-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8px;
          max-height: 350px;
          overflow-y: auto;
        }

        .persona-card {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(139, 152, 165, 0.2);
          border-radius: 12px;
          padding: 8px;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 4px;
        }

        .persona-card:hover {
          background: rgba(29, 155, 240, 0.1);
          border-color: rgba(29, 155, 240, 0.3);
          transform: translateY(-2px);
        }

        .persona-card.selected {
          background: #1d9bf0 !important;
          border-color: #1d9bf0;
          color: white !important;
          box-shadow: 0 4px 12px rgba(29, 155, 240, 0.4);
        }

        .persona-card.selected .persona-name {
          color: white !important;
        }

        .persona-card.selected .persona-description {
          color: rgba(255, 255, 255, 0.8) !important;
        }

        .persona-emoji {
          font-size: 24px;
        }

        .persona-name {
          font-size: 13px;
          font-weight: 600;
          color: #e7e9ea;
        }

        .persona-description {
          font-size: 11px;
          color: #8b98a5;
          line-height: 1.2;
          max-height: 2.4em;
          overflow: hidden;
          text-overflow: ellipsis;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }

        .selected-persona {
          padding: 4px 12px;
          background: rgba(255, 215, 0, 0.15);
          border: 1px solid rgba(255, 215, 0, 0.3);
          border-radius: 10px;
          font-size: 13px;
          color: #FFD700;
          font-weight: 500;
        }

        /* Compact Personas Grid - Shows all 10 personas at once */
        .personas-grid-compact {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 6px;
          max-height: none;
          margin: 0;
        }

        .persona-card-compact {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(139, 152, 165, 0.2);
          border-radius: 8px;
          padding: 6px 4px;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 3px;
          position: relative;
          min-height: 60px;
        }

        .persona-card-compact:hover {
          background: rgba(29, 155, 240, 0.1);
          border-color: rgba(29, 155, 240, 0.3);
          transform: translateY(-1px);
        }

        /* Hover tooltip for full description */
        .persona-card-compact:hover::after {
          content: attr(title);
          position: absolute;
          top: -10px;
          left: 50%;
          transform: translateX(-50%) translateY(-100%);
          background: #1e1e1e;
          color: #e7e9ea;
          padding: 6px 8px;
          border-radius: 6px;
          font-size: 11px;
          white-space: nowrap;
          max-width: 200px;
          white-space: normal;
          width: max-content;
          z-index: 1000;
          border: 1px solid rgba(139, 152, 165, 0.3);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
          opacity: 1;
          pointer-events: none;
        }

        .persona-card-compact.selected {
          background: #1d9bf0 !important;
          border-color: #1d9bf0;
          color: white !important;
          box-shadow: 0 2px 8px rgba(29, 155, 240, 0.4);
        }

        .persona-card-compact.selected .persona-name {
          color: white !important;
        }

        .persona-card-compact .persona-emoji {
          font-size: 18px;
        }

        .persona-card-compact .persona-name {
          font-size: 10px;
          font-weight: 600;
          color: #e7e9ea;
          line-height: 1.1;
          text-align: center;
        }

        /* Usage and recent indicators */
        .usage-indicator {
          position: absolute;
          top: 2px;
          right: 2px;
          background: rgba(255, 215, 0, 0.2);
          border: 1px solid rgba(255, 215, 0, 0.4);
          border-radius: 10px;
          padding: 1px 4px;
          font-size: 8px;
          color: #FFD700;
          font-weight: 600;
          min-width: 12px;
          text-align: center;
        }

        .usage-counter {
          position: absolute;
          top: 2px;
          left: 2px;
          background: rgba(29, 155, 240, 0.15);
          border: 1px solid rgba(29, 155, 240, 0.3);
          border-radius: 8px;
          padding: 1px 4px;
          font-size: 8px;
          color: #1DA1F2;
          font-weight: 600;
          min-width: 12px;
          text-align: center;
          line-height: 1;
        }

        .recent-indicator {
          position: absolute;
          top: -2px;
          left: -2px;
          width: 8px;
          height: 8px;
          background: #17BF63;
          border-radius: 50%;
          border: 2px solid #0f1419;
        }

        /* Mobile responsive adjustments */
        @media (max-width: 480px) {
          .personas-grid-compact {
            grid-template-columns: repeat(3, 1fr);
            gap: 4px;
          }

          .persona-card-compact {
            padding: 4px 2px;
            min-height: 55px;
          }

          .persona-card-compact .persona-emoji {
            font-size: 16px;
          }

          .persona-card-compact .persona-name {
            font-size: 9px;
          }
        }

        .item-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .rhetoric-btn,
        .template-btn,
        .personality-btn {
          display: flex;
          align-items: center;
          gap: 3px;
          padding: 4px 16px 4px 4px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(139, 152, 165, 0.3);
          border-radius: 6px;
          color: #e7e9ea;
          cursor: pointer;
          transition: all 0.2s;
          position: relative;
          font-size: 11px;
          min-height: 28px;
          width: 100%;
        }

        /* Category-based color coding for rhetoric buttons */
        .rhetoric-btn[data-category="collaborative"] {
          background: rgba(29, 155, 240, 0.05);
          border-color: rgba(29, 155, 240, 0.3);
        }

        .rhetoric-btn[data-category="collaborative"]:hover {
          background: rgba(29, 155, 240, 0.15);
          border-color: rgba(29, 155, 240, 0.6);
          box-shadow: 0 2px 8px rgba(29, 155, 240, 0.2);
        }

        .rhetoric-btn[data-category="clarifying"] {
          background: rgba(0, 186, 124, 0.05);
          border-color: rgba(0, 186, 124, 0.3);
        }

        .rhetoric-btn[data-category="clarifying"]:hover {
          background: rgba(0, 186, 124, 0.15);
          border-color: rgba(0, 186, 124, 0.6);
          box-shadow: 0 2px 8px rgba(0, 186, 124, 0.2);
        }

        .rhetoric-btn[data-category="challenging"] {
          background: rgba(255, 165, 0, 0.05);
          border-color: rgba(255, 165, 0, 0.3);
        }

        .rhetoric-btn[data-category="challenging"]:hover {
          background: rgba(255, 165, 0, 0.15);
          border-color: rgba(255, 165, 0, 0.6);
          box-shadow: 0 2px 8px rgba(255, 165, 0, 0.2);
        }

        .rhetoric-btn[data-category="online_native"] {
          background: rgba(145, 70, 255, 0.05);
          border-color: rgba(145, 70, 255, 0.3);
        }

        .rhetoric-btn[data-category="online_native"]:hover {
          background: rgba(145, 70, 255, 0.15);
          border-color: rgba(145, 70, 255, 0.6);
          box-shadow: 0 2px 8px rgba(145, 70, 255, 0.2);
        }

        /* Category-based color coding for personality buttons */
        .personality-btn[data-category="positive"] {
          background: rgba(0, 186, 124, 0.05);
          border-color: rgba(0, 186, 124, 0.3);
        }

        .personality-btn[data-category="positive"]:hover {
          background: rgba(0, 186, 124, 0.15);
          border-color: rgba(0, 186, 124, 0.6);
          box-shadow: 0 2px 8px rgba(0, 186, 124, 0.2);
        }

        .personality-btn[data-category="neutral"] {
          background: rgba(101, 119, 134, 0.05);
          border-color: rgba(101, 119, 134, 0.3);
        }

        .personality-btn[data-category="neutral"]:hover {
          background: rgba(101, 119, 134, 0.15);
          border-color: rgba(101, 119, 134, 0.6);
          box-shadow: 0 2px 8px rgba(101, 119, 134, 0.2);
        }

        .personality-btn[data-category="humorous"] {
          background: rgba(255, 215, 0, 0.05);
          border-color: rgba(255, 215, 0, 0.3);
        }

        .personality-btn[data-category="humorous"]:hover {
          background: rgba(255, 215, 0, 0.15);
          border-color: rgba(255, 215, 0, 0.6);
          box-shadow: 0 2px 8px rgba(255, 215, 0, 0.2);
        }

        .personality-btn[data-category="critical"] {
          background: rgba(244, 33, 46, 0.05);
          border-color: rgba(244, 33, 46, 0.3);
        }

        .personality-btn[data-category="critical"]:hover {
          background: rgba(244, 33, 46, 0.15);
          border-color: rgba(244, 33, 46, 0.6);
          box-shadow: 0 2px 8px rgba(244, 33, 46, 0.2);
        }

        .personality-btn[data-category="naughty"] {
          background: rgba(188, 42, 141, 0.05);
          border-color: rgba(188, 42, 141, 0.3);
        }

        .personality-btn[data-category="naughty"]:hover {
          background: rgba(188, 42, 141, 0.15);
          border-color: rgba(188, 42, 141, 0.6);
          box-shadow: 0 2px 8px rgba(188, 42, 141, 0.2);
        }

        /* Frequently used items are slightly larger and more prominent */
        .rhetoric-btn.frequent,
        .personality-btn.frequent,
        .vocabulary-btn.frequent,
        .length-pacing-btn.frequent {
          transform: scale(1.03);
          font-weight: 500;
          border-width: 1.5px;
        }

        /* Rarely used items are dimmed */
        .rhetoric-btn:not(.frequent):not(.selected),
        .personality-btn:not(.frequent):not(.selected),
        .vocabulary-btn:not(.frequent):not(.selected),
        .length-pacing-btn:not(.frequent):not(.selected) {
          opacity: 0.85;
        }

        .rhetoric-btn:not(.frequent):not(.selected):hover,
        .personality-btn:not(.frequent):not(.selected):hover,
        .vocabulary-btn:not(.frequent):not(.selected):hover,
        .length-pacing-btn:not(.frequent):not(.selected):hover {
          opacity: 1;
        }

        .star-btn {
          position: absolute;
          right: 2px;
          top: 50%;
          transform: translateY(-50%);
          background: transparent;
          border: none;
          cursor: pointer;
          font-size: 16px;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10;
          color: #8b98a5;
          transition: all 0.2s ease;
          opacity: 0.6;
        }

        .star-btn:hover {
          color: #ffd700;
          transform: translateY(-50%) scale(1.1);
          opacity: 1;
        }

        .star-btn.active {
          color: #ffd700 !important;
          opacity: 1;
          text-shadow: 0 0 4px rgba(255, 215, 0, 0.6);
        }

        .rhetoric-btn:hover,
        .template-btn:hover,
        .personality-btn:hover {
          background: rgba(29, 155, 240, 0.15);
          border-color: rgba(29, 155, 240, 0.5);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(29, 155, 240, 0.2);
        }


        .rhetoric-btn.selected,
        .template-btn.selected,
        .personality-btn.selected {
          background: #1d9bf0 !important;
          border-color: #1d9bf0;
          color: white !important;
        }

        .rhetoric-btn.selected .rhetoric-name,
        .template-btn.selected .template-name,
        .personality-btn.selected .personality-label {
          color: white !important;
        }

        .rhetoric-emoji,
        .template-emoji,
        .personality-emoji {
          font-size: 16px;
        }

        .rhetoric-name,
        .template-name,
        .personality-label {
          font-size: 12px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          flex: 1;
        }

        .favorite-star {
          position: absolute;
          top: 2px;
          right: 2px;
          font-size: 10px;
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

        .selection-info {
          display: flex;
          gap: 6px;
        }

        .selected-template,
        .selected-tone {
          padding: 4px 10px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
          font-size: 12px;
          color: #e7e9ea;
        }

        /* 4-part selection display */
        .four-part-selection {
          display: flex;
          gap: 6px;
          align-items: center;
        }

        .selected-item,
        .missing-item {
          padding: 3px 8px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 500;
        }

        .selected-item {
          background: rgba(29, 155, 240, 0.2);
          color: #1d9bf0;
          border: 1px solid rgba(29, 155, 240, 0.3);
        }

        .missing-item {
          background: rgba(139, 152, 165, 0.1);
          color: #657786;
          border: 1px dashed rgba(139, 152, 165, 0.3);
        }

        .footer-buttons {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .smart-defaults-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 8px 14px;
          background: linear-gradient(135deg, rgba(255, 215, 0, 0.15), rgba(255, 215, 0, 0.05));
          border: 1px solid rgba(255, 215, 0, 0.3);
          border-radius: 18px;
          color: #FFD700;
          cursor: pointer;
          font-size: 12px;
          font-weight: 600;
          transition: all 0.2s;
        }

        .smart-defaults-btn:hover {
          background: linear-gradient(135deg, rgba(255, 215, 0, 0.25), rgba(255, 215, 0, 0.1));
          border-color: rgba(255, 215, 0, 0.5);
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(255, 215, 0, 0.2);
        }

        .generate-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 8px 18px;
          background: rgba(29, 155, 240, 0.3);
          border: 1px solid rgba(29, 155, 240, 0.5);
          border-radius: 18px;
          color: #8b98a5;
          cursor: not-allowed;
          font-size: 13px;
          font-weight: 600;
          transition: all 0.2s;
        }

        .generate-btn.active {
          background: #1d9bf0;
          border-color: #1d9bf0;
          color: white;
          cursor: pointer;
        }

        .generate-btn.active:hover {
          background: #1a8cd8;
        }

        .empty-state {
          text-align: center;
          padding: 40px;
          color: #8b98a5;
        }

        /* Custom Templates Inline Interface */
        .custom-creation-section {
          margin-bottom: 24px;
          border: 1px solid #38444d;
          border-radius: 12px;
          overflow: hidden;
        }

        .creation-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 12px;
          background: #1e2732;
          border-bottom: 1px solid #38444d;
        }

        .creation-header h3 {
          margin: 0;
          color: #e7e9ea;
          font-size: 13px;
          font-weight: 600;
        }

        .toggle-creation-btn {
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 6px;
          color: white;
          width: 32px;
          height: 32px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          transition: all 0.2s;
        }

        .toggle-creation-btn:hover {
          background: rgba(255, 255, 255, 0.2);
          border-color: rgba(255, 255, 255, 0.3);
          transform: scale(1.05);
        }

        .creation-form {
          padding: 12px;
          background: #15202b;
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-group label {
          display: block;
          color: #e7e9ea;
          font-weight: 500;
          margin-bottom: 4px;
          font-size: 12px;
        }

        .field-description {
          color: #8b98a5;
          font-size: 12px;
          margin-bottom: 8px;
          font-style: italic;
        }

        .form-group textarea,
        .form-group input {
          width: 100%;
          background: #192734;
          border: 1px solid #38444d;
          border-radius: 8px;
          color: #e7e9ea;
          padding: 8px;
          font-size: 12px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          resize: vertical;
          min-height: 80px;
          transition: border-color 0.2s;
        }

        .form-group input {
          min-height: auto;
          height: 42px;
        }

        .form-group textarea:focus,
        .form-group input:focus {
          outline: none;
          border-color: #1d9bf0;
          box-shadow: 0 0 0 1px #1d9bf0;
        }

        .form-group textarea::placeholder,
        .form-group input::placeholder {
          color: #6e767d;
        }

        .template-name-row {
          margin-bottom: 0;
        }

        .name-save-row {
          display: flex;
          gap: 12px;
          align-items: center;
        }

        .name-save-row input {
          flex: 1;
        }

        .save-template-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          background: #00ba7c;
          border: none;
          border-radius: 8px;
          color: white;
          padding: 12px 20px;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.2s;
          font-size: 14px;
        }

        .save-template-btn:hover {
          background: #00a46c;
          transform: translateY(-1px);
        }

        .save-template-btn:active {
          transform: translateY(0);
        }

        .generate-custom-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border: none;
          border-radius: 8px;
          color: white;
          padding: 14px 24px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 16px;
          box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
        }

        .generate-custom-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }

        .generate-custom-btn:active {
          transform: translateY(0);
        }

        .generate-custom-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* Saved Templates Section */
        .saved-templates-section {
          margin-top: 24px;
        }

        .saved-templates-section h3 {
          margin: 0 0 10px 0;
          color: #e7e9ea;
          font-size: 13px;
          font-weight: 600;
        }

        .no-templates-message {
          text-align: center;
          padding: 40px;
          color: #8b98a5;
          font-style: italic;
        }

        .no-templates-message p {
          margin: 0;
        }

        .templates-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .template-item {
          background: #1e2732;
          border: 1px solid #38444d;
          border-radius: 12px;
          overflow: hidden;
          transition: all 0.2s;
        }

        .template-item:hover {
          border-color: #1d9bf0;
          transform: translateY(-1px);
        }

        .template-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px;
        }

        .template-title {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .template-emoji {
          font-size: 20px;
        }

        .template-name {
          color: #e7e9ea;
          font-weight: 600;
          font-size: 15px;
        }

        .template-actions {
          display: flex;
          gap: 8px;
        }

        .action-btn {
          background: rgba(255, 255, 255, 0.1);
          border: none;
          border-radius: 6px;
          color: #e7e9ea;
          width: 32px;
          height: 32px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          transition: all 0.2s;
        }

        .action-btn:hover {
          background: rgba(255, 255, 255, 0.2);
          transform: scale(1.1);
        }

        .edit-btn:hover {
          background: rgba(29, 155, 240, 0.3);
        }

        .delete-btn:hover {
          background: rgba(244, 33, 46, 0.3);
        }

        .preview-btn:hover {
          background: rgba(0, 186, 124, 0.3);
        }

        .favorite-btn:hover {
          background: rgba(255, 212, 0, 0.3);
        }

        .template-preview {
          padding: 16px;
          background: #192734;
          border-top: 1px solid #38444d;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .preview-field {
          display: flex;
          gap: 8px;
          font-size: 13px;
        }

        .preview-field strong {
          color: #1d9bf0;
          min-width: 60px;
          flex-shrink: 0;
        }

        .preview-text {
          color: #8b98a5;
          flex: 1;
        }

        /* Bulk Actions */
        .bulk-actions {
          margin-top: 20px;
          padding-top: 16px;
          border-top: 1px solid #38444d;
          display: flex;
          gap: 12px;
          justify-content: center;
        }

        .bulk-action-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(139, 152, 165, 0.3);
          border-radius: 8px;
          color: #e7e9ea;
          padding: 8px 16px;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 13px;
          white-space: nowrap;
        }

        .bulk-action-btn:hover {
          background: rgba(255, 255, 255, 0.15);
          transform: translateY(-1px);
        }

        .export-btn:hover {
          background: rgba(0, 186, 124, 0.2);
          border-color: #00ba7c;
        }

        .import-btn:hover {
          background: rgba(29, 155, 240, 0.2);
          border-color: #1d9bf0;
        }

        .reset-btn:hover {
          background: rgba(244, 33, 46, 0.2);
          border-color: #f4212e;
        }

        /* Smart suggestions cards */
        .smart-suggestions-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          max-height: 600px;
          overflow-y: auto;
          padding-right: 8px;
        }
        
        .smart-suggestions-list::-webkit-scrollbar {
          width: 6px;
        }
        
        .smart-suggestions-list::-webkit-scrollbar-track {
          background: rgba(139, 152, 165, 0.1);
          border-radius: 3px;
        }
        
        .smart-suggestions-list::-webkit-scrollbar-thumb {
          background: rgba(139, 152, 165, 0.3);
          border-radius: 3px;
        }
        
        .smart-suggestions-list::-webkit-scrollbar-thumb:hover {
          background: rgba(139, 152, 165, 0.5);
        }

        .suggestion-card {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(139, 152, 165, 0.3);
          border-radius: 8px;
          padding: 10px 12px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .suggestion-card:hover {
          background: rgba(29, 155, 240, 0.15);
          border-color: rgba(29, 155, 240, 0.5);
          transform: translateY(-1px);
        }

        .suggestion-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 6px;
        }

        .score-container {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .suggestion-score-badge {
          padding: 2px 6px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 600;
          color: #15202b;
          min-width: 35px;
          text-align: center;
        }

        .why-recommended-btn {
          background: transparent;
          border: 1px solid #38444d;
          border-radius: 4px;
          padding: 2px 6px;
          font-size: 10px;
          color: #8b98a5;
          cursor: pointer;
          transition: all 0.2s;
        }

        .why-recommended-btn:hover {
          background: rgba(29, 155, 240, 0.1);
          border-color: #1d9bf0;
          color: #1d9bf0;
        }

        .score-breakdown {
          margin-top: 10px;
          padding: 10px;
          background: rgba(21, 32, 43, 0.5);
          border-radius: 6px;
          border: 1px solid #38444d;
        }

        .score-breakdown h4 {
          margin: 0 0 8px 0;
          font-size: 12px;
          color: #e7e9ea;
        }

        .breakdown-factors {
          display: flex;
          flex-direction: column;
          gap: 4px;
          margin-bottom: 10px;
        }

        .breakdown-factor {
          display: flex;
          justify-content: space-between;
          font-size: 11px;
        }

        .factor-name {
          color: #8b98a5;
        }

        .factor-value {
          font-weight: 600;
        }

        .breakdown-details {
          font-size: 11px;
          color: #8b98a5;
          border-top: 1px solid #38444d;
          padding-top: 8px;
        }

        .breakdown-details strong {
          color: #e7e9ea;
          display: block;
          margin-bottom: 4px;
        }

        .breakdown-details div {
          margin: 2px 0;
        }

        .suggestion-combo {
          color: #e7e9ea;
          font-size: 13px;
          font-weight: 500;
        }

        .suggestion-score {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          color: #1d9bf0;
          font-size: 12px;
          font-weight: 600;
          background: rgba(29, 155, 240, 0.1);
          padding: 2px 6px;
          border-radius: 4px;
        }

        .score-icon {
          font-size: 10px;
        }

        .suggestion-preview {
          font-size: 11px;
          color: #8899a6;
          margin-bottom: 8px;
          line-height: 1.3;
          font-style: italic;
        }

        .suggestion-reasons {
          display: flex;
          gap: 4px;
          flex-wrap: wrap;
        }

        .reason-chip {
          background: rgba(29, 155, 240, 0.15);
          color: #a8b3bf;
          font-size: 11px;
          padding: 3px 6px;
          border-radius: 4px;
          transition: all 0.2s;
        }

        .reason-chip:hover {
          background: rgba(29, 155, 240, 0.25);
          color: #e7e9ea;
        }

        /* Enhanced reason chips with categories */
        .reason-context {
          background: rgba(29, 155, 240, 0.15);
          border-left: 2px solid #1d9bf0;
        }

        .reason-favorite {
          background: rgba(255, 212, 0, 0.15);
          border-left: 2px solid #ffd400;
          color: #ffd400;
        }

        .reason-usage {
          background: rgba(23, 191, 99, 0.15);
          border-left: 2px solid #17bf63;
          color: #17bf63;
        }

        .reason-success {
          background: rgba(102, 187, 106, 0.15);
          border-left: 2px solid #66bb6a;
          color: #66bb6a;
        }

        .reason-timing {
          background: rgba(156, 39, 176, 0.15);
          border-left: 2px solid #9c27b0;
          color: #ba68c8;
        }

        .reason-ai {
          background: rgba(255, 87, 34, 0.15);
          border-left: 2px solid #ff5722;
          color: #ff8a65;
        }

        .reason-tone {
          background: rgba(233, 30, 99, 0.15);
          border-left: 2px solid #e91e63;
          color: #f48fb1;
        }

        /* Refresh suggestions button */
        .refresh-suggestions-btn {
          background: rgba(29, 155, 240, 0.1);
          border: 1px solid rgba(29, 155, 240, 0.3);
          border-radius: 4px;
          padding: 4px 6px;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 12px;
        }

        .refresh-suggestions-btn:hover {
          background: rgba(29, 155, 240, 0.2);
          border-color: rgba(29, 155, 240, 0.5);
          transform: rotate(90deg);
        }

        /* Enhanced suggestion score styling */
        .suggestion-score {
          font-size: 11px;
          font-weight: 500;
          background: transparent;
          padding: 2px 4px;
          border-radius: 4px;
        }

        /* Compose View Styles */
        .compose-view {
          padding: 8px 12px;
        }

        .compose-section {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .compose-title {
          margin: 0 0 8px 0;
          color: #e7e9ea;
          font-size: 13px;
          font-weight: 600;
        }

        .compose-label {
          color: #8b98a5;
          font-size: 12px;
          margin-bottom: 4px;
          display: block;
        }

        .compose-topic-input {
          width: 100%;
          padding: 8px;
          background: #192734;
          border: 1px solid #38444d;
          border-radius: 8px;
          color: #e7e9ea;
          font-size: 12px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          resize: vertical;
          min-height: 60px;
        }

        .compose-topic-input:focus {
          outline: none;
          border-color: #1d9bf0;
        }

        /* Image Generation View Styles */
        .imagegen-view {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .image-gen-controls {
          display: flex;
          flex-direction: column;
          gap: 10px;
          padding: 8px;
          background: rgba(255, 255, 255, 0.02);
          border-radius: 8px;
        }

        .search-input-wrapper {
          display: flex;
          gap: 6px;
        }

        .image-search-input {
          flex: 1;
          padding: 8px 12px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(139, 152, 165, 0.3);
          border-radius: 8px;
          color: #e7e9ea;
          font-size: 13px;
        }

        .image-search-input:focus {
          outline: none;
          border-color: #1d9bf0;
          background: rgba(255, 255, 255, 0.08);
        }

        .image-search-btn,
        .image-generate-btn {
          padding: 8px 14px;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(139, 152, 165, 0.3);
          border-radius: 8px;
          color: #e7e9ea;
          cursor: pointer;
          font-size: 16px;
          transition: all 0.2s;
        }

        .image-search-btn:hover,
        .image-generate-btn:hover {
          background: rgba(29, 155, 240, 0.2);
          border-color: rgba(29, 155, 240, 0.5);
        }

        .image-style-options {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .style-label {
          color: #8b98a5;
          font-size: 12px;
        }

        .image-style-select {
          flex: 1;
          padding: 6px 10px;
          background: rgba(255, 255, 255, 0.95);
          border: 1px solid rgba(139, 152, 165, 0.3);
          border-radius: 6px;
          color: #000;
          font-size: 12px;
        }

        .image-style-select option {
          background: white;
          color: black;
        }

        .image-results-container {
          flex: 1;
          overflow-y: auto;
          position: relative;
        }

        .image-results-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
          padding: 8px;
        }

        .image-result-item {
          position: relative;
          aspect-ratio: 1;
          overflow: hidden;
          border-radius: 8px;
          cursor: pointer;
          transition: transform 0.2s;
        }

        .image-result-item:hover {
          transform: scale(1.05);
        }

        .image-result-item img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .image-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(to bottom, transparent 60%, rgba(0, 0, 0, 0.8));
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          padding: 6px;
          opacity: 0;
          transition: opacity 0.2s;
        }

        .image-result-item:hover .image-overlay {
          opacity: 1;
        }

        .use-image-btn {
          width: 28px;
          height: 28px;
          background: #1d9bf0;
          border: none;
          border-radius: 50%;
          color: white;
          font-size: 16px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .use-image-btn:hover {
          background: #1a8cd8;
        }

        .image-source {
          background: rgba(0, 0, 0, 0.6);
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 10px;
          color: white;
        }

        .image-empty-state,
        .image-loading-state {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          text-align: center;
          color: #8b98a5;
        }

        .image-loading-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }

        .spinner {
          width: 24px;
          height: 24px;
          border: 2px solid rgba(29, 155, 240, 0.3);
          border-top-color: #1d9bf0;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `;
      document.head.appendChild(style);
    }
  }






  /**
   * Destroy the component
   */
  destroy(): void {
    this.container?.remove();
    this.container = null;
    this.onSelectCallback = null;
  }
}

export const unifiedSelector = new UnifiedSelector();
