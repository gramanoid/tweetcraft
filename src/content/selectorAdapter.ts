/**
 * Selector Adapter for TweetCraft
 * Simplified to only use UnifiedSelectorEnhanced
 */

import { UnifiedSelectorEnhanced, FiveStepSelectionResult } from './unifiedSelectorEnhanced';
import { PresetTemplate } from './presetTemplates';

// Constant for the five-step placeholder category
const FIVE_STEP_CATEGORY_PLACEHOLDER = 'five-step-mode' as const;

// Use PresetTemplate for both preset and custom templates
type CustomTemplate = PresetTemplate;

// Simplified ToneOption interface (since we deleted toneSelector.ts)
interface ToneOption {
  id: string;
  emoji: string;
  label: string;
  description: string;
  systemPrompt: string;
}

// Extended callback type
type SelectionCallback = (
  template: PresetTemplate | CustomTemplate, 
  tone: ToneOption,
  fiveStepSelections?: any
) => void;

export class SelectorAdapter {
  private unifiedSelector: UnifiedSelectorEnhanced;
  
  constructor() {
    // Always use UnifiedSelectorEnhanced
    this.unifiedSelector = new UnifiedSelectorEnhanced();
  }
  
  /**
   * Show the selector (unified five-step system)
   */
  async show(
    button: HTMLElement,
    callback: SelectionCallback
  ): Promise<void> {
    console.log('%c📋 SelectorAdapter.show called', 'color: #9146FF; font-weight: bold');
    
    // Use unified selector with five-step system
    this.unifiedSelector.show(button, (result: FiveStepSelectionResult) => {
      // Create a lightweight synthetic template and tone
      const template: PresetTemplate = {
        id: 'five-step-combined',
        name: 'Custom Selection',
        emoji: '🎯',
        prompt: result.combinedPrompts.join('\n'),
        category: FIVE_STEP_CATEGORY_PLACEHOLDER as any,
        description: 'Five-step AI reply configuration',
        examples: []
      };
      
      const tone: ToneOption = {
        id: 'five-step',
        emoji: '✨',
        label: 'Five-Step',
        description: 'Using five-step selection system',
        systemPrompt: `Temperature: ${result.temperature}`
      };
      
      callback(template, tone, result.selections);
    });
  }
  
  /**
   * Hide the selector
   */
  hide(): void {
    this.unifiedSelector.hide();
  }
  
  /**
   * Check if selector is open
   */
  isOpen(): boolean {
    return this.unifiedSelector.isOpen();
  }
}

// Export singleton instance
export const selectorAdapter = new SelectorAdapter();