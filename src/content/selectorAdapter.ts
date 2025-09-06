/**
 * Selector Adapter for TweetCraft
 * Provides the unified selector interface
 */

// Static import for UnifiedSelector to prevent chunk loading issues in Chrome extension
import { UnifiedSelector } from './unifiedSelector';
import { PresetTemplate } from './presetTemplates';
import { ToneOption } from './toneSelector';

// Use PresetTemplate for both preset and custom templates
type CustomTemplate = PresetTemplate;

export class SelectorAdapter {
  private unifiedSelector: UnifiedSelector | null = null;
  
  constructor() {
    // Always use unified selector - no fallback to old system
    this.unifiedSelector = new UnifiedSelector();
  }
  
  /**
   * Show the unified selector
   */
  async show(
    button: HTMLElement,
    callback: (
      template: PresetTemplate, 
      tone: ToneOption, 
      vocabulary?: string, 
      lengthPacing?: string,
      tabType?: 'personas' | 'all' | 'smart' | 'favorites' | 'image_gen' | 'custom' | 'compose',
      personaConfig?: any,
      allTabConfig?: any,
      customConfig?: any
    ) => void
  ): Promise<void> {
    if (this.unifiedSelector) {
      this.unifiedSelector.show(button, (result) => {
        // Convert unified result to traditional format
        const template: PresetTemplate = {
          id: result.template.id,
          name: result.template.name,
          emoji: result.template.emoji,
          prompt: result.template.prompt,
          // Category is now properly typed to support all values
          category: result.template.category as any, // Template category is flexible now
          description: result.template.description || ''
        };
        
        const tone: ToneOption = {
          id: result.tone.id,
          emoji: result.tone.emoji,
          label: result.tone.label,
          description: result.tone.description,
          systemPrompt: result.tone.systemPrompt
        };
        
        // Pass all data including tab type and configs for prompt architecture
        callback(
          template, 
          tone, 
          result.vocabulary, 
          result.lengthPacing,
          result.tabType,
          result.personaConfig,
          result.allTabConfig,
          result.customConfig
        );
      });
    }
  }
  
  /**
   * Hide the selector
   */
  hide(): void {
    if (this.unifiedSelector) {
      this.unifiedSelector.hide();
    }
  }
  
  /**
   * Check if unified selector is active (always true now)
   */
  isUnifiedSelectorActive(): boolean {
    return true;
  }
}

// Export singleton instance
export const selectorAdapter = new SelectorAdapter();