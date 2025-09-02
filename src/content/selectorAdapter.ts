/**
 * Selector Adapter for TweetCraft
 * Provides backward compatibility while transitioning to unified selector
 */

import { TemplateSelector } from './templateSelector';
import { UnifiedSelectorEnhanced } from './unifiedSelectorEnhanced';
import { PresetTemplate } from './presetTemplates';
import { ToneOption } from './toneSelector';

// Constant for the five-step placeholder category
// Used to identify when selections come from the five-step system rather than legacy templates
const FIVE_STEP_CATEGORY_PLACEHOLDER = 'five-step-mode' as const;

// Use PresetTemplate for both preset and custom templates
type CustomTemplate = PresetTemplate;

// Extended callback type that can handle both old and new systems
type SelectionCallback = (
  template: PresetTemplate | CustomTemplate, 
  tone: ToneOption,
  fiveStepSelections?: any
) => void;

export class SelectorAdapter {
  private useUnifiedSelector: boolean;
  private templateSelector: TemplateSelector | null = null;
  private unifiedSelector: UnifiedSelectorEnhanced | null = null;
  
  constructor() {
    // Check feature flag from storage or default to unified
    this.useUnifiedSelector = this.checkFeatureFlag();
    
    if (this.useUnifiedSelector) {
      // Direct instantiation - no lazy loading to ensure reliability
      this.unifiedSelector = new UnifiedSelectorEnhanced();
    } else {
      this.templateSelector = new TemplateSelector();
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
   * Now supports both old template/tone system and new five-step system
   */
  async show(
    button: HTMLElement,
    callback: SelectionCallback
  ): Promise<void> {
    console.log('%c📋 SelectorAdapter.show called', 'color: #9146FF; font-weight: bold');
    console.log('%c  Using unified selector:', 'color: #657786', this.useUnifiedSelector);
    
    if (this.useUnifiedSelector && this.unifiedSelector) {
      // Use unified selector with five-step system - no lazy loading
      this.unifiedSelector.show(button, (result: any) => {
        // Create a lightweight synthetic template and tone
        const template: PresetTemplate = {
          id: 'five-step-combined',
          name: 'Custom Selection',
          emoji: '🎯',
          prompt: '',
          category: FIVE_STEP_CATEGORY_PLACEHOLDER as any,
          description: 'Five-step AI reply configuration'
        };
        const tone: ToneOption = {
          id: 'five-step',
          emoji: '✨',
          label: 'Five-Step',
          description: 'Using five-step selection system',
          systemPrompt: ''
        };
        callback(template, tone, result.selections);
      });
      return;
    }

    if (this.templateSelector) {
      // Traditional two-popup flow
      this.templateSelector.show(button, (template, tone) => {
        callback(template, tone, undefined);
      });
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
  enableUnifiedSelector(): void {
    localStorage.setItem('tweetcraft_unified_selector', 'true');
    this.useUnifiedSelector = true;
    
    // Clean up old selector
    if (this.templateSelector) {
      this.templateSelector = null;
    }
    
    // Initialize unified selector immediately
    if (!this.unifiedSelector) {
      this.unifiedSelector = new UnifiedSelectorEnhanced();
    }
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
    
    // Initialize traditional selector immediately
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
