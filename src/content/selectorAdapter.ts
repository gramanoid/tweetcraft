/**
 * Selector Adapter for TweetCraft
 * Provides backward compatibility while transitioning to unified selector
 */

import { TemplateSelector } from './templateSelector';
import { PresetTemplate } from './presetTemplates';
import { ToneOption } from './toneSelector';
import { LazyLoader } from '@/services/lazyLoader';

// Use PresetTemplate for both preset and custom templates
type CustomTemplate = PresetTemplate;

export class SelectorAdapter {
  private useUnifiedSelector: boolean;
  private templateSelector: TemplateSelector | null = null;
  private unifiedSelector: any = null;
  private unifiedSelectorModule: any = null;
  
  constructor() {
    // Check feature flag from storage or default to unified
    this.useUnifiedSelector = this.checkFeatureFlag();
    
    if (this.useUnifiedSelector) {
      // Lazy load unified selector when needed
      this.loadUnifiedSelector();
    } else {
      this.templateSelector = new TemplateSelector();
    }
  }
  
  /**
   * Lazy load the unified selector
   */
  private async loadUnifiedSelector(): Promise<void> {
    if (!this.unifiedSelectorModule) {
      try {
        this.unifiedSelectorModule = await LazyLoader.loadUnifiedSelector();
        this.unifiedSelector = new this.unifiedSelectorModule.UnifiedSelector();
      } catch (error) {
        console.warn('Failed to load unified selector, falling back to template selector:', error);
        this.useUnifiedSelector = false;
        this.templateSelector = new TemplateSelector();
      }
    }
  }
  
  /**
   * Check if unified selector should be used
   */
  private checkFeatureFlag(): boolean {
    // Check localStorage for feature flag
    const flag = localStorage.getItem('tweetcraft_unified_selector');
    
    // Default to true (use unified selector)
    return flag !== 'false';
  }
  
  /**
   * Show the selector (unified or traditional)
   */
  async show(
    button: HTMLElement,
    callback: (template: PresetTemplate  , tone: ToneOption) => void
  ): Promise<void> {
    if (this.useUnifiedSelector) {
      // Ensure unified selector is loaded
      await this.loadUnifiedSelector();
      
      if (this.unifiedSelector) {
        // Use unified selector
        this.unifiedSelector.show(button, (result: any) => {
          // Convert unified result to traditional format
          const template: PresetTemplate = {
            id: result.template.id,
            name: result.template.name,
            emoji: result.template.emoji,
            prompt: result.template.prompt,
            category: result.template.category,
            description: result.template.description || ''
          };
          
          const tone: ToneOption = {
            id: result.tone.id,
            emoji: result.tone.emoji,
            label: result.tone.label,
            description: result.tone.description,
            systemPrompt: result.tone.systemPrompt
          };
          
          callback(template, tone);
        });
      }
    } else if (this.templateSelector) {
      // Use traditional two-popup flow
      this.templateSelector.show(button, callback);
    }
  }
  
  /**
   * Hide the selector
   */
  hide(): void {
    if (this.useUnifiedSelector && this.unifiedSelector) {
      this.unifiedSelector.hide();
    } else if (this.templateSelector) {
      // Template selector handles its own hiding
    }
  }
  
  /**
   * Enable unified selector
   */
  async enableUnifiedSelector(): Promise<void> {
    localStorage.setItem('tweetcraft_unified_selector', 'true');
    this.useUnifiedSelector = true;
    
    // Clean up old selector
    if (this.templateSelector) {
      this.templateSelector = null;
    }
    
    // Load unified selector if not already loaded
    await this.loadUnifiedSelector();
  }
  
  /**
   * Disable unified selector (fallback to traditional)
   */
  disableUnifiedSelector(): void {
    localStorage.setItem('tweetcraft_unified_selector', 'false');
    this.useUnifiedSelector = false;
    
    // Clean up unified selector
    if (this.unifiedSelector) {
      this.unifiedSelector.hide();
      this.unifiedSelector = null;
    }
    
    // Initialize traditional selector
    if (!this.templateSelector) {
      this.templateSelector = new TemplateSelector();
    }
  }
  
  /**
   * Check which selector is active
   */
  isUnifiedSelectorActive(): boolean {
    return this.useUnifiedSelector;
  }
}

// Export singleton instance
export const selectorAdapter = new SelectorAdapter();