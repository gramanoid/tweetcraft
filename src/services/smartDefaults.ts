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

export interface TimePattern {
  hour: number;
  personality: string;
  successRate: number;
  count: number;
}

export interface TimeOfDayPatterns {
  morning: { preferred: string; rate: number; count: number };    // 6am-12pm
  afternoon: { preferred: string; rate: number; count: number };  // 12pm-5pm
  evening: { preferred: string; rate: number; count: number };    // 5pm-9pm
  night: { preferred: string; rate: number; count: number };      // 9pm-12am
  lateNight: { preferred: string; rate: number; count: number };  // 12am-6am
  weekend?: { preferred: string; rate: number; count: number };   // Sat-Sun
}

export interface ContentSuggestion {
  personality: string;
  vocabulary?: string;
  rhetoric?: string;
  lengthPacing?: string;
  confidence: number; // 0-1
  reason: string;
  matchedKeywords: string[];
}

export class SmartDefaultsService {
  private readonly STORAGE_KEY = 'tweetcraft_smart_defaults';
  private readonly LAST_USED_KEY = 'tweetcraft_last_selections';
  private readonly TIME_PATTERNS_KEY = 'tweetcraft_time_patterns';
  private readonly MIN_USAGE_FOR_HIGH_CONFIDENCE = 5;
  private readonly MIN_USAGE_FOR_MEDIUM_CONFIDENCE = 3;

  // Content auto-suggest keyword mappings
  private readonly KEYWORD_SUGGESTIONS = {
    // Technical content
    'bug': { personality: 'professional', rhetoric: 'analyze_problem', confidence: 0.9 },
    'issue': { personality: 'professional', rhetoric: 'analyze_problem', confidence: 0.8 },
    'broken': { personality: 'professional', rhetoric: 'analyze_problem', confidence: 0.8 },
    'error': { personality: 'professional', rhetoric: 'analyze_problem', confidence: 0.9 },
    'fix': { personality: 'professional', rhetoric: 'solve_and_verify', confidence: 0.8 },
    'debug': { personality: 'professional', rhetoric: 'analyze_problem', confidence: 0.9 },
    'code': { personality: 'professional', vocabulary: 'technical', confidence: 0.7 },
    'API': { personality: 'professional', vocabulary: 'technical', confidence: 0.8 },
    'database': { personality: 'professional', vocabulary: 'technical', confidence: 0.8 },

    // Excitement & Launches  
    '🚀': { personality: 'enthusiastic', rhetoric: 'highlight_excitement', confidence: 0.9 },
    'launch': { personality: 'enthusiastic', rhetoric: 'highlight_excitement', confidence: 0.9 },
    'excited': { personality: 'enthusiastic', rhetoric: 'highlight_excitement', confidence: 0.8 },
    'amazing': { personality: 'enthusiastic', rhetoric: 'highlight_excitement', confidence: 0.8 },
    'awesome': { personality: 'friendly', rhetoric: 'highlight_excitement', confidence: 0.7 },
    'celebrate': { personality: 'enthusiastic', rhetoric: 'highlight_excitement', confidence: 0.8 },
    'milestone': { personality: 'enthusiastic', rhetoric: 'highlight_excitement', confidence: 0.8 },

    // Support & Help
    'problem': { personality: 'supportive', rhetoric: 'offer_guidance', confidence: 0.9 },
    'help': { personality: 'supportive', rhetoric: 'offer_guidance', confidence: 0.9 },
    'stuck': { personality: 'supportive', rhetoric: 'offer_guidance', confidence: 0.8 },
    'struggling': { personality: 'supportive', rhetoric: 'offer_guidance', confidence: 0.9 },
    'advice': { personality: 'supportive', rhetoric: 'offer_guidance', confidence: 0.8 },
    'guidance': { personality: 'supportive', rhetoric: 'offer_guidance', confidence: 0.8 },

    // Debates & Opinions
    'hot take': { personality: 'contrarian', rhetoric: 'challenge_premise', confidence: 0.9 },
    'unpopular opinion': { personality: 'contrarian', rhetoric: 'challenge_premise', confidence: 0.9 },
    'disagree': { personality: 'contrarian', rhetoric: 'challenge_premise', confidence: 0.8 },
    'debate': { personality: 'analytical', rhetoric: 'analyze_problem', confidence: 0.8 },
    'controversial': { personality: 'contrarian', rhetoric: 'challenge_premise', confidence: 0.8 },
    'wrong': { personality: 'critical', rhetoric: 'challenge_premise', confidence: 0.7 },

    // Humor & Fun
    '😂': { personality: 'witty', rhetoric: 'add_humor', confidence: 0.9 },
    '🤣': { personality: 'witty', rhetoric: 'add_humor', confidence: 0.9 },
    'funny': { personality: 'witty', rhetoric: 'add_humor', confidence: 0.8 },
    'joke': { personality: 'witty', rhetoric: 'add_humor', confidence: 0.9 },
    'hilarious': { personality: 'witty', rhetoric: 'add_humor', confidence: 0.8 },
    'meme': { personality: 'witty', vocabulary: 'gen_z', confidence: 0.8 },

    // Achievements & Success
    'achievement': { personality: 'enthusiastic', rhetoric: 'celebrate_win', confidence: 0.8 },
    'success': { personality: 'enthusiastic', rhetoric: 'celebrate_win', confidence: 0.8 },
    'proud': { personality: 'enthusiastic', rhetoric: 'celebrate_win', confidence: 0.8 },
    'win': { personality: 'enthusiastic', rhetoric: 'celebrate_win', confidence: 0.8 },

    // Learning & Growth
    'learned': { personality: 'thoughtful', rhetoric: 'share_insight', confidence: 0.8 },
    'insight': { personality: 'thoughtful', rhetoric: 'share_insight', confidence: 0.8 },
    'lesson': { personality: 'thoughtful', rhetoric: 'share_insight', confidence: 0.8 },
    'growth': { personality: 'thoughtful', rhetoric: 'share_insight', confidence: 0.8 },

    // Trends & News
    'breaking': { personality: 'professional', rhetoric: 'share_news', lengthPacing: 'breaking_news', confidence: 0.9 },
    'news': { personality: 'professional', rhetoric: 'share_news', confidence: 0.8 },
    'update': { personality: 'professional', rhetoric: 'share_news', confidence: 0.7 },
    'trending': { personality: 'enthusiastic', rhetoric: 'highlight_trend', confidence: 0.8 },

    // Personal & Casual
    'coffee': { personality: 'casual', vocabulary: 'conversational', confidence: 0.7 },
    'monday': { personality: 'casual', rhetoric: 'casual_observation', confidence: 0.6 },
    'weekend': { personality: 'casual', vocabulary: 'conversational', confidence: 0.7 },
    'tired': { personality: 'casual', rhetoric: 'casual_observation', confidence: 0.6 },

    // Business & Professional
    'meeting': { personality: 'professional', vocabulary: 'business', confidence: 0.8 },
    'strategy': { personality: 'analytical', vocabulary: 'business', confidence: 0.8 },
    'team': { personality: 'supportive', vocabulary: 'business', confidence: 0.7 },
    'client': { personality: 'professional', vocabulary: 'business', confidence: 0.8 },
    'project': { personality: 'professional', vocabulary: 'business', confidence: 0.7 }
  } as const;

  /**
   * Analyze tweet content and suggest appropriate personality/style
   */
  analyzeContent(tweetText: string): ContentSuggestion | null {
    if (!tweetText || tweetText.trim().length === 0) {
      return null;
    }

    const text = tweetText.toLowerCase();
    const matchedKeywords: string[] = [];
    const suggestions: Array<{
      personality: string;
      vocabulary?: string;
      rhetoric?: string;
      lengthPacing?: string;
      confidence: number;
      keywords: string[];
    }> = [];

    // Check for keyword matches
    for (const [keyword, suggestion] of Object.entries(this.KEYWORD_SUGGESTIONS)) {
      if (text.includes(keyword.toLowerCase())) {
        matchedKeywords.push(keyword);
        suggestions.push({
          ...suggestion,
          keywords: [keyword]
        });
      }
    }

    if (suggestions.length === 0) {
      return null;
    }

    // Sort by confidence and find best match
    suggestions.sort((a, b) => b.confidence - a.confidence);
    const best = suggestions[0];

    // Combine all matched keywords
    const allKeywords = [...new Set(suggestions.flatMap(s => s.keywords))];

    return {
      personality: best.personality,
      vocabulary: best.vocabulary || 'plain_english',
      rhetoric: best.rhetoric || 'agree_build',
      lengthPacing: best.lengthPacing || 'drive_by',
      confidence: best.confidence,
      reason: `Suggested based on keywords: ${allKeywords.join(', ')}`,
      matchedKeywords: allKeywords
    };
  }

  /**
   * Get smart defaults based on usage patterns and content analysis
   */
  async getSmartDefaults(tweetContent?: string): Promise<SmartDefaults | null> {
    // Priority 1: Content analysis (if tweet content provided)
    if (tweetContent) {
      const contentSuggestion = this.analyzeContent(tweetContent);
      if (contentSuggestion && contentSuggestion.confidence >= 0.8) {
        console.log('%c🎯 Content-based suggestion', 'color: #1DA1F2; font-weight: bold', contentSuggestion);
        return {
          personality: contentSuggestion.personality,
          vocabulary: contentSuggestion.vocabulary,
          rhetoric: contentSuggestion.rhetoric,
          lengthPacing: contentSuggestion.lengthPacing,
          confidence: 'high',
          reason: contentSuggestion.reason
        };
      }
    }

    const stats = usageTracker.getStats();
    
    // Priority 2: Time-based patterns
    const timeBasedDefaults = await this.getTimeBasedDefaults();
    if (timeBasedDefaults && timeBasedDefaults.confidence !== 'low') {
      return timeBasedDefaults;
    }
    
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

  /**
   * Track time-of-day usage patterns
   */
  async trackTimePattern(personality: string, wasSuccessful: boolean): Promise<void> {
    try {
      const now = new Date();
      const hour = now.getHours();
      const dayOfWeek = now.getDay(); // 0 = Sunday, 6 = Saturday
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      const result = await chrome.storage.local.get([this.TIME_PATTERNS_KEY]);
      const patterns: TimePattern[] = result[this.TIME_PATTERNS_KEY] || [];

      // Find existing pattern for this hour and personality
      const existingIndex = patterns.findIndex(p => p.hour === hour && p.personality === personality);
      
      if (existingIndex >= 0) {
        // Update existing pattern
        const pattern = patterns[existingIndex];
        pattern.count++;
        if (wasSuccessful) {
          pattern.successRate = ((pattern.successRate * (pattern.count - 1)) + 1) / pattern.count;
        } else {
          pattern.successRate = (pattern.successRate * (pattern.count - 1)) / pattern.count;
        }
      } else {
        // Create new pattern
        patterns.push({
          hour,
          personality,
          successRate: wasSuccessful ? 1 : 0,
          count: 1
        });
      }

      await chrome.storage.local.set({ [this.TIME_PATTERNS_KEY]: patterns });
      console.log('%c⏰ Time pattern tracked', 'color: #1DA1F2', { hour, personality, wasSuccessful });
    } catch (error) {
      console.error('Failed to track time pattern:', error);
    }
  }

  /**
   * Get time-based smart defaults
   */
  async getTimeBasedDefaults(): Promise<SmartDefaults | null> {
    try {
      const patterns = await this.getTimeOfDayPatterns();
      if (!patterns) return null;

      const now = new Date();
      const hour = now.getHours();
      const dayOfWeek = now.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      // Determine time period
      let period: keyof TimeOfDayPatterns;
      if (hour >= 6 && hour < 12) {
        period = 'morning';
      } else if (hour >= 12 && hour < 17) {
        period = 'afternoon';
      } else if (hour >= 17 && hour < 21) {
        period = 'evening';
      } else if (hour >= 21 && hour < 24) {
        period = 'night';
      } else {
        period = 'lateNight';
      }

      // Check weekend patterns first if applicable
      if (isWeekend && patterns.weekend && patterns.weekend.count >= 3) {
        return {
          personality: patterns.weekend.preferred,
          vocabulary: 'plain_english',
          rhetoric: 'agree_build',
          lengthPacing: 'drive_by',
          confidence: patterns.weekend.count >= 5 ? 'high' : 'medium',
          reason: `Your weekend favorite (${Math.round(patterns.weekend.rate * 100)}% success rate)`
        };
      }

      // Get pattern for current time period
      const timePattern = patterns[period];
      if (timePattern && timePattern.count >= 3) {
        const timeLabel = period === 'lateNight' ? 'late night' : period;
        return {
          personality: timePattern.preferred,
          vocabulary: 'plain_english',
          rhetoric: 'agree_build',
          lengthPacing: 'drive_by',
          confidence: timePattern.count >= 5 ? 'high' : 'medium',
          reason: `Your ${timeLabel} favorite (${Math.round(timePattern.rate * 100)}% success rate)`
        };
      }

      return null;
    } catch (error) {
      console.error('Failed to get time-based defaults:', error);
      return null;
    }
  }

  /**
   * Get weekly statistics from usage tracker
   */
  getWeeklyStats(): {
    totalReplies: number;
    totalSent: number;
    successRate: number;
    topPersonality: string;
    topVocabulary: string;
    topRhetoric: string;
    mostActiveDay: string;
    weekStart: Date;
    weekEnd: Date;
  } {
    const stats = usageTracker.getStats();
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    
    // Count replies and sent
    const totalReplies = stats.eventsByType['reply_generated'] || 0;
    const totalSent = stats.eventsByType['reply_sent'] || 0;
    const successRate = totalReplies > 0 ? (totalSent / totalReplies) * 100 : 0;
    
    // Find top personality from personalityUsage map
    let topPersonality = 'Professional';
    let maxPersonalityCount = 0;
    stats.personalityUsage.forEach((count, personality) => {
      if (count > maxPersonalityCount) {
        maxPersonalityCount = count;
        topPersonality = personality;
      }
    });
    
    // If no personality data, try from templateUsage
    if (maxPersonalityCount === 0 && stats.templateUsage.size > 0) {
      const templateCounts = new Map<string, number>();
      stats.templateUsage.forEach((count, templateId) => {
        const personality = templateId.split('_')[0] || 'professional';
        templateCounts.set(personality, (templateCounts.get(personality) || 0) + count);
      });
      templateCounts.forEach((count, personality) => {
        if (count > maxPersonalityCount) {
          maxPersonalityCount = count;
          topPersonality = personality.charAt(0).toUpperCase() + personality.slice(1);
        }
      });
    }
    
    // Find top vocabulary
    let topVocabulary = 'Sophisticated';
    let maxVocabCount = 0;
    stats.vocabularyUsage.forEach((count, vocab) => {
      if (count > maxVocabCount) {
        maxVocabCount = count;
        topVocabulary = vocab;
      }
    });
    
    // Find top rhetoric
    let topRhetoric = 'Logical';
    let maxRhetoricCount = 0;
    // Try to get from template usage patterns
    const rhetoricPatterns = new Map<string, number>();
    stats.templateUsage.forEach((count, templateId) => {
      // Extract rhetoric from template ID pattern if available
      const parts = templateId.split('_');
      if (parts.length > 1) {
        const rhetoric = parts[1] || 'logical';
        rhetoricPatterns.set(rhetoric, (rhetoricPatterns.get(rhetoric) || 0) + count);
      }
    });
    rhetoricPatterns.forEach((count, rhetoric) => {
      if (count > maxRhetoricCount) {
        maxRhetoricCount = count;
        topRhetoric = rhetoric.charAt(0).toUpperCase() + rhetoric.slice(1);
      }
    });
    
    // Find most active day of the week
    const dayActivity = new Map<string, number>();
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    // Count activity per day from daily usage
    stats.dailyUsage.forEach((count, dateStr) => {
      const date = new Date(dateStr);
      const dayName = days[date.getDay()];
      dayActivity.set(dayName, (dayActivity.get(dayName) || 0) + count);
    });
    
    // Find most active day
    let mostActiveDay = 'Monday';
    let maxDayActivity = 0;
    dayActivity.forEach((count, day) => {
      if (count > maxDayActivity) {
        maxDayActivity = count;
        mostActiveDay = day;
      }
    });
    
    return {
      totalReplies,
      totalSent,
      successRate: Math.round(successRate),
      topPersonality,
      topVocabulary,
      topRhetoric,
      mostActiveDay,
      weekStart,
      weekEnd
    };
  }

  /**
   * Analyze and return time-of-day patterns
   */
  async getTimeOfDayPatterns(): Promise<TimeOfDayPatterns | null> {
    try {
      const result = await chrome.storage.local.get([this.TIME_PATTERNS_KEY]);
      const patterns: TimePattern[] = result[this.TIME_PATTERNS_KEY] || [];
      
      if (patterns.length < 10) return null; // Not enough data

      const timeGroups: TimeOfDayPatterns = {
        morning: { preferred: '', rate: 0, count: 0 },
        afternoon: { preferred: '', rate: 0, count: 0 },
        evening: { preferred: '', rate: 0, count: 0 },
        night: { preferred: '', rate: 0, count: 0 },
        lateNight: { preferred: '', rate: 0, count: 0 }
      };

      // Group patterns by time period
      const periodPatterns: Record<keyof TimeOfDayPatterns, TimePattern[]> = {
        morning: patterns.filter(p => p.hour >= 6 && p.hour < 12),
        afternoon: patterns.filter(p => p.hour >= 12 && p.hour < 17),
        evening: patterns.filter(p => p.hour >= 17 && p.hour < 21),
        night: patterns.filter(p => p.hour >= 21 && p.hour < 24),
        lateNight: patterns.filter(p => p.hour >= 0 && p.hour < 6),
        weekend: [] // Will be calculated separately
      };

      // Find best personality for each period
      for (const [period, periodData] of Object.entries(periodPatterns) as [keyof TimeOfDayPatterns, TimePattern[]][]) {
        if (period === 'weekend') continue;
        if (periodData.length === 0) continue;

        // Group by personality and calculate weighted success
        const personalityStats = new Map<string, { totalSuccess: number; count: number }>();
        
        periodData.forEach(pattern => {
          const stats = personalityStats.get(pattern.personality) || { totalSuccess: 0, count: 0 };
          stats.totalSuccess += pattern.successRate * pattern.count;
          stats.count += pattern.count;
          personalityStats.set(pattern.personality, stats);
        });

        // Find best performing personality
        let bestPersonality = '';
        let bestRate = 0;
        let totalCount = 0;

        personalityStats.forEach((stats, personality) => {
          const avgRate = stats.totalSuccess / stats.count;
          if (avgRate > bestRate || (avgRate === bestRate && stats.count > totalCount)) {
            bestPersonality = personality;
            bestRate = avgRate;
            totalCount = stats.count;
          }
        });

        if (bestPersonality) {
          timeGroups[period] = {
            preferred: bestPersonality,
            rate: bestRate,
            count: totalCount
          };
        }
      }

      return timeGroups;
    } catch (error) {
      console.error('Failed to get time patterns:', error);
      return null;
    }
  }
}

// Export singleton instance
export const smartDefaults = new SmartDefaultsService();