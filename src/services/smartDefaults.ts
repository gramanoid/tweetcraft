/**
 * Smart Defaults Service for TweetCraft
 * Manages intelligent selection defaults based on usage patterns
 */

import { usageTracker } from './usageTracker';
import { PERSONALITIES, getPersonality } from '@/config/personalities';
import { getAllVocabularyStyles } from '@/config/vocabulary';
import { getAllRhetoricalMoves } from '@/config/rhetoric';
import { getAllLengthPacingStyles } from '@/config/lengthPacing';

export interface SmartDefaults {
  personality?: string;
  vocabulary?: string;
  rhetoric?: string;
  lengthPacing?: string;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
}

export interface LastUsedSelections {
  personality?: string;
  vocabulary?: string;
  rhetoric?: string;
  lengthPacing?: string;
  timestamp: number;
}

export class SmartDefaultsService {
  private readonly STORAGE_KEY = 'tweetcraft_smart_defaults';
  private readonly LAST_USED_KEY = 'tweetcraft_last_selections';
  private readonly MIN_USAGE_FOR_HIGH_CONFIDENCE = 5;
  private readonly MIN_USAGE_FOR_MEDIUM_CONFIDENCE = 3;

  /**
   * Get smart defaults based on usage patterns
   */
  async getSmartDefaults(): Promise<SmartDefaults | null> {
    const stats = usageTracker.getStats();
    
    // Get most used combinations
    const topPersonalities = this.getTopUsed(stats.toneUsage);
    const topTemplates = this.getTopUsed(stats.templateUsage);
    
    // If we have enough data, recommend based on usage
    if (topPersonalities.length > 0 || topTemplates.length > 0) {
      const personality = topPersonalities[0];
      const rhetoric = topTemplates[0];
      
      const personalityCount = stats.toneUsage.get(personality) || 0;
      const rhetoricCount = stats.templateUsage.get(rhetoric) || 0;
      
      let confidence: 'high' | 'medium' | 'low' = 'low';
      let reason = '';
      
      if (personalityCount >= this.MIN_USAGE_FOR_HIGH_CONFIDENCE && 
          rhetoricCount >= this.MIN_USAGE_FOR_HIGH_CONFIDENCE) {
        confidence = 'high';
        reason = `Your most used combination (${personalityCount + rhetoricCount} times)`;
      } else if (personalityCount >= this.MIN_USAGE_FOR_MEDIUM_CONFIDENCE || 
                 rhetoricCount >= this.MIN_USAGE_FOR_MEDIUM_CONFIDENCE) {
        confidence = 'medium';
        reason = `Based on your usage patterns`;
      } else {
        confidence = 'low';
        reason = `Suggested based on limited data`;
      }

      return {
        personality,
        rhetoric,
        vocabulary: 'plain_english', // Default to most accessible
        lengthPacing: 'drive_by', // Default to quickest
        confidence,
        reason
      };
    }

    // Fall back to sensible defaults for new users
    return {
      personality: 'friendly',
      vocabulary: 'plain_english',
      rhetoric: 'agree_build',
      lengthPacing: 'drive_by',
      confidence: 'low',
      reason: 'Default suggestions for new users'
    };
  }

  /**
   * Save last used selections for quick access
   */
  async saveLastUsed(selections: Omit<LastUsedSelections, 'timestamp'>): Promise<void> {
    const lastUsed: LastUsedSelections = {
      ...selections,
      timestamp: Date.now()
    };

    try {
      await chrome.storage.local.set({
        [this.LAST_USED_KEY]: lastUsed
      });
      console.log('%c🎯 Last used selections saved', 'color: #1DA1F2', lastUsed);
    } catch (error) {
      console.error('Failed to save last used selections:', error);
    }
  }

  /**
   * Get last used selections
   */
  async getLastUsed(): Promise<LastUsedSelections | null> {
    try {
      const result = await chrome.storage.local.get([this.LAST_USED_KEY]);
      const lastUsed = result[this.LAST_USED_KEY];
      
      if (lastUsed) {
        // Check if selections are recent (within 24 hours)
        const isRecent = (Date.now() - lastUsed.timestamp) < (24 * 60 * 60 * 1000);
        if (isRecent) {
          console.log('%c🎯 Last used selections loaded', 'color: #17BF63', lastUsed);
          return lastUsed;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Failed to load last used selections:', error);
      return null;
    }
  }

  /**
   * Get quick generate options based on usage patterns
   */
  async getQuickOptions(): Promise<{
    lastUsed?: LastUsedSelections;
    smartDefaults?: SmartDefaults;
    topCombinations: Array<{
      personality: string;
      rhetoric: string;
      vocabulary?: string;
      lengthPacing?: string;
      count: number;
      label: string;
    }>;
  }> {
    const [lastUsed, smartDefaults] = await Promise.all([
      this.getLastUsed(),
      this.getSmartDefaults()
    ]);

    const stats = usageTracker.getStats();
    const topCombinations = Array.from(stats.combinationUsage.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([combo, count]) => {
        const [personality, rhetoric] = combo.split(':');
        return {
          personality,
          rhetoric,
          vocabulary: 'plain_english', // Default
          lengthPacing: 'drive_by', // Default
          count,
          label: this.createCombinationLabel(personality, rhetoric)
        };
      });

    return {
      lastUsed: lastUsed || undefined,
      smartDefaults: smartDefaults || undefined,
      topCombinations
    };
  }

  /**
   * Check if certain sections can be hidden based on usage patterns
   */
  async getSectionVisibility(): Promise<{
    vocabularyOptional: boolean;
    lengthPacingOptional: boolean;
  }> {
    const stats = usageTracker.getStats();
    
    // If user frequently uses default vocabulary/pacing, make those sections optional
    const totalGenerations = stats.eventsByType['reply_generated'] || 0;
    const plainEnglishUsage = this.countPatternUsage(stats, 'plain_english');
    const driveByUsage = this.countPatternUsage(stats, 'drive_by');
    
    return {
      vocabularyOptional: totalGenerations > 10 && (plainEnglishUsage / totalGenerations) > 0.7,
      lengthPacingOptional: totalGenerations > 10 && (driveByUsage / totalGenerations) > 0.7
    };
  }

  /**
   * Apply smart defaults to the UI
   */
  applySmartDefaults = async (
    selector: any, 
    options: { 
      skipVocabulary?: boolean; 
      skipLengthPacing?: boolean;
      useLastUsed?: boolean;
    } = {}
  ): Promise<void> => {
    const { useLastUsed = false } = options;
    
    let selections: Partial<LastUsedSelections> | null = null;
    
    if (useLastUsed) {
      selections = await this.getLastUsed();
    }
    
    if (!selections) {
      const smartDefaults = await this.getSmartDefaults();
      if (smartDefaults) {
        selections = {
          personality: smartDefaults.personality,
          vocabulary: smartDefaults.vocabulary,
          rhetoric: smartDefaults.rhetoric,
          lengthPacing: smartDefaults.lengthPacing
        };
      }
    }

    if (selections) {
      // Apply selections to the selector
      if (selections.personality && selector.setPersonality) {
        selector.setPersonality(selections.personality);
      }
      
      if (selections.rhetoric && selector.setRhetoric) {
        selector.setRhetoric(selections.rhetoric);
      }
      
      if (!options.skipVocabulary && selections.vocabulary && selector.setVocabulary) {
        selector.setVocabulary(selections.vocabulary);
      }
      
      if (!options.skipLengthPacing && selections.lengthPacing && selector.setLengthPacing) {
        selector.setLengthPacing(selections.lengthPacing);
      }
      
      console.log('%c🎯 Smart defaults applied', 'color: #1DA1F2; font-weight: bold', selections);
    }
  }

  /**
   * Helper to get top used items from usage map
   */
  private getTopUsed<T>(usageMap: Map<T, number>): T[] {
    return Array.from(usageMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([item]) => item);
  }

  /**
   * Helper to create readable combination labels
   */
  private createCombinationLabel(personality: string, rhetoric: string): string {
    const personalities = PERSONALITIES;
    const rhetorics = getAllRhetoricalMoves();
    
    const personalityObj = personalities.find((p: any) => p.id === personality);
    const rhetoricObj = rhetorics.find((r: any) => r.id === rhetoric);
    
    const personalityLabel = personalityObj ? personalityObj.label : personality;
    const rhetoricLabel = rhetoricObj ? rhetoricObj.name : rhetoric;
    
    return `${personalityLabel} • ${rhetoricLabel}`;
  }

  /**
   * Helper to count pattern usage in stats
   */
  private countPatternUsage(stats: any, pattern: string): number {
    // This would need to be implemented based on how patterns are tracked
    // For now, return 0 as placeholder
    return 0;
  }
}

// Export singleton instance
export const smartDefaults = new SmartDefaultsService();