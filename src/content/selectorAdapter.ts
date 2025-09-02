/**
 * Selector Adapter for TweetCraft
 * Provides backward compatibility while transitioning to unified selector
 */

import { TemplateSelector } from './templateSelector';
import { UnifiedSelectorEnhanced, FiveStepSelectionResult } from './unifiedSelectorEnhanced';
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
  show(
    button: HTMLElement,
    callback: SelectionCallback
  ): void {
    console.log('%c📋 SelectorAdapter.show called', 'color: #9146FF; font-weight: bold');
    console.log('%c  Using unified selector:', 'color: #657786', this.useUnifiedSelector);
    console.log('%c  Unified selector instance:', 'color: #657786', this.unifiedSelector);
    
    if (this.useUnifiedSelector && this.unifiedSelector) {
      console.log('%c  Calling UnifiedSelectorEnhanced.show()', 'color: #657786');
      // Use unified selector with five-step system
      this.unifiedSelector.show(button, (result: FiveStepSelectionResult) => {
        // For the five-step system, we create synthetic template and tone objects
        // but also pass the actual selections for proper handling
        
        // Create a synthetic template that represents the selections
        const template: PresetTemplate = {
          id: 'five-step-combined',
          name: 'Custom Selection',
          emoji: '🎯',
          prompt: '', // Empty - prompts are in selections
          category: FIVE_STEP_CATEGORY_PLACEHOLDER as any, // Placeholder category for five-step mode
          description: 'Five-step AI reply configuration'
        };
        
        // Create a synthetic tone
        const tone: ToneOption = {
          id: 'five-step',
          emoji: '✨',
          label: 'Five-Step',
          description: 'Using five-step selection system',
          systemPrompt: '' // Empty - prompts are in selections
        };
        
        // Pass the five-step selections as the third parameter
        callback(template, tone, result.selections);
      });
    } else if (this.templateSelector) {
      // Use traditional two-popup flow (no five-step selections)
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
    
    // Initialize unified selector
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