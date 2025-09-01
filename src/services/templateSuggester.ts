/**
 * Smart Template Suggestion Service for TweetCraft
 * ML-like pattern matching for context-aware suggestions
 */

import { TEMPLATES } from '@/content/presetTemplates';
import { TONES } from '@/content/toneSelector';
import type { PresetTemplate } from '@/content/presetTemplates';
import type { ToneOption } from '@/content/toneSelector';
import type { LLMAnalysisResult } from '@/types/llm';
import { TEMPLATE_SUGGESTER } from '@/config/models';
import { JSONExtractor } from '@/utils/jsonExtractor';

interface SuggestionContext {
  tweetText: string;
  isReply: boolean;
  threadContext?: string[];
  userHistory?: string[];
  timeOfDay?: number;
  dayOfWeek?: number;
}

interface SuggestionScore {
  templateId: string;
  toneId: string;
  score: number;
  reasons: string[];
}

interface PatternRule {
  pattern: RegExp;
  templates: string[];
  tones: string[];
  weight: number;
  description: string;
}

export class TemplateSuggester {
  private patternRules: PatternRule[] = [
    // Question patterns
    {
      pattern: /\?|how|what|when|where|why|who|which/i,
      templates: ['ask_question', 'add_insight', 'provide_data'],
      tones: ['professional', 'academic', 'casual'],
      weight: 1.5,
      description: 'Question detected'
    },
    // Opinion/statement patterns
    {
      pattern: /think|believe|opinion|feel|seems|appears/i,
      templates: ['agree_expand', 'challenge', 'devils_advocate'],
      tones: ['witty', 'contrarian', 'philosophical'],
      weight: 1.3,
      description: 'Opinion expressed'
    },
    // Achievement/success patterns
    {
      pattern: /achieved|launched|built|created|finished|completed|proud|excited/i,
      templates: ['congratulate', 'show_support', 'relate'],
      tones: ['enthusiastic', 'motivational', 'casual'],
      weight: 1.4,
      description: 'Achievement mentioned'
    },
    // Problem/issue patterns
    {
      pattern: /problem|issue|broken|failed|error|help|stuck|struggling/i,
      templates: ['add_insight', 'share_experience', 'show_support'],
      tones: ['professional', 'casual', 'motivational'],
      weight: 1.4,
      description: 'Problem detected'
    },
    // Data/facts patterns
    {
      pattern: /statistics|data|research|study|survey|report|analysis/i,
      templates: ['provide_data', 'fact_check', 'add_insight'],
      tones: ['academic', 'professional', 'minimalist'],
      weight: 1.3,
      description: 'Data discussion'
    },
    // Controversial/debate patterns
    {
      pattern: /controversial|debate|argue|disagree|wrong|actually/i,
      templates: ['challenge', 'devils_advocate', 'steel_man', 'hot_take'],
      tones: ['contrarian', 'sarcastic', 'savage'],
      weight: 1.5,
      description: 'Debate context'
    },
    // Humor patterns
    {
      pattern: /lol|haha|funny|joke|meme|lmao|hilarious/i,
      templates: ['meme_response', 'relate', 'agree_expand'],
      tones: ['witty', 'gen_z', 'sarcastic'],
      weight: 1.4,
      description: 'Humor detected'
    },
    // News/announcement patterns
    {
      pattern: /breaking|announced|news|update|released|available/i,
      templates: ['ask_question', 'add_insight', 'hot_take'],
      tones: ['professional', 'enthusiastic', 'contrarian'],
      weight: 1.2,
      description: 'News/announcement'
    }
  ];

  private usageHistory: Map<string, number> = new Map();
  private successHistory: Map<string, number> = new Map();

  constructor() {
    this.loadHistory();
    console.log('%c🤖 TemplateSuggester initialized', 'color: #1DA1F2; font-weight: bold');
  }

  /**
   * Get smart suggestions based on context
   */
  async getSuggestions(context: SuggestionContext): Promise<SuggestionScore[]> {
    console.log('%c🤖 Analyzing context for suggestions', 'color: #1DA1F2');
    
    const scores: Map<string, SuggestionScore> = new Map();
    
    // Analyze text patterns
    const patternScores = this.analyzePatterns(context.tweetText);
    
    // Get user preferences from localStorage
    const preferences = await this.getUserPreferences();
    
    // Try to get LLM-enhanced analysis if API key is available
    let llmAnalysis: LLMAnalysisResult | null = null;
    try {
      const apiKey = await this.getApiKey();
      if (apiKey && context.tweetText.length > 20) {
        llmAnalysis = await this.getLLMAnalysis(context.tweetText, apiKey);
      }
    } catch (error) {
      console.log('%c🤖 Proceeding without LLM analysis', 'color: #657786');
    }
    
    // Calculate scores for each template-tone combination
    const templates = TEMPLATES;
    const tones = TONES;
    
    templates.forEach((template: PresetTemplate) => {
      tones.forEach((tone: ToneOption) => {
        const key = `${template.id}:${tone.id}`;
        const score = this.calculateScore(
          template,
          tone,
          context,
          patternScores,
          preferences,
          llmAnalysis
        );
        
        scores.set(key, score);
      });
    });
    
    // Sort by score and return top suggestions
    const sorted = Array.from(scores.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
    
    console.log('%c🤖 Top suggestions:', 'color: #17BF63');
    sorted.slice(0, 3).forEach((s, i) => {
      console.log(`  ${i + 1}. ${s.templateId}:${s.toneId} (${s.score.toFixed(2)})`, s.reasons);
    });
    
    return sorted;
  }

  /**
   * Analyze text patterns
   */
  private analyzePatterns(text: string): Map<string, number> {
    const scores = new Map<string, number>();
    
    this.patternRules.forEach(rule => {
      if (rule.pattern.test(text)) {
        // Add score for matching templates
        rule.templates.forEach(templateId => {
          const current = scores.get(templateId) || 0;
          scores.set(templateId, current + rule.weight);
        });
        
        // Add score for matching tones
        rule.tones.forEach(toneId => {
          const current = scores.get(`tone:${toneId}`) || 0;
          scores.set(`tone:${toneId}`, current + rule.weight);
        });
      }
    });
    
    return scores;
  }

  /**
   * Calculate score for a template-tone combination
   */
  private calculateScore(
    template: PresetTemplate,
    tone: ToneOption,
    context: SuggestionContext,
    patternScores: Map<string, number>,
    preferences: any,
    llmAnalysis?: LLMAnalysisResult | null
  ): SuggestionScore {
    let score = 1.0;
    const reasons: string[] = [];
    
    // Pattern matching score
    const templatePatternScore = patternScores.get(template.id) || 0;
    const tonePatternScore = patternScores.get(`tone:${tone.id}`) || 0;
    score += templatePatternScore + tonePatternScore;
    
    if (templatePatternScore > 0) {
      reasons.push(`Template matches context (${templatePatternScore.toFixed(1)})`);
    }
    if (tonePatternScore > 0) {
      reasons.push(`Tone suits context (${tonePatternScore.toFixed(1)})`);
    }
    
    // Favorite bonus
    if (preferences.favoriteTemplates?.includes(template.id)) {
      score += 2.0;
      reasons.push('Favorite template');
    }
    if (preferences.favoriteTones?.includes(tone.id)) {
      score += 2.0;
      reasons.push('Favorite tone');
    }
    
    // Usage history bonus
    const usageKey = `${template.id}:${tone.id}`;
    const usageCount = this.usageHistory.get(usageKey) || 0;
    if (usageCount > 0) {
      score += Math.min(usageCount * 0.1, 1.0);
      reasons.push(`Used ${usageCount} times`);
    }
    
    // Success history bonus
    const successRate = this.successHistory.get(usageKey) || 0;
    if (successRate > 0) {
      score += successRate * 2.0;
      reasons.push(`Success rate: ${(successRate * 100).toFixed(0)}%`);
    }
    
    // Context-specific adjustments
    if (context.isReply) {
      // Boost engagement templates for replies
      if (template.category === 'engagement') {
        score += 0.5;
        reasons.push('Good for replies');
      }
    }
    
    // Time-based adjustments
    if (context.timeOfDay !== undefined) {
      const hour = context.timeOfDay;
      
      // Professional during work hours
      if (hour >= 9 && hour <= 17 && tone.id === 'professional') {
        score += 0.3;
        reasons.push('Work hours');
      }
      
      // Casual in evening
      if (hour >= 18 && hour <= 23 && tone.id === 'casual') {
        score += 0.3;
        reasons.push('Evening hours');
      }
    }
    
    // Thread context bonus
    if (context.threadContext && context.threadContext.length > 2) {
      // Boost debate templates for long threads
      if (template.category === 'debate') {
        score += 0.5;
        reasons.push('Long thread');
      }
    }
    
    // LLM analysis bonus if available
    if (llmAnalysis) {
      // Check if template matches LLM-detected intent
      if (llmAnalysis.suggestedCategories?.includes(template.category)) {
        score += 2.0;
        reasons.push('AI-detected intent match');
      }
      
      // Check if tone matches LLM-detected sentiment
      if (llmAnalysis.suggestedTones?.includes(tone.id)) {
        score += 1.5;
        reasons.push('AI-detected tone match');
      }
      
      // Sentiment-based adjustments
      if (llmAnalysis.sentiment) {
        if (llmAnalysis.sentiment === 'positive' && tone.id === 'enthusiastic') {
          score += 0.5;
        } else if (llmAnalysis.sentiment === 'negative' && tone.id === 'motivational') {
          score += 0.5;
        } else if (llmAnalysis.sentiment === 'controversial' && template.category === 'debate') {
          score += 1.0;
        }
      }
    }
    
    return {
      templateId: template.id,
      toneId: tone.id,
      score,
      reasons
    };
  }

  /**
   * Record usage of a template-tone combination
   */
  recordUsage(templateId: string, toneId: string): void {
    const key = `${templateId}:${toneId}`;
    const current = this.usageHistory.get(key) || 0;
    this.usageHistory.set(key, current + 1);
    this.saveHistory();
    
    console.log('%c🤖 Recorded usage:', 'color: #657786', key);
  }

  /**
   * Record success (user sent the generated reply)
   */
  recordSuccess(templateId: string, toneId: string, sent: boolean): void {
    const key = `${templateId}:${toneId}`;
    const current = this.successHistory.get(key) || 0;
    
    // Update success rate (exponential moving average)
    const alpha = 0.1; // Learning rate
    const newRate = alpha * (sent ? 1 : 0) + (1 - alpha) * current;
    
    this.successHistory.set(key, newRate);
    this.saveHistory();
    
    console.log('%c🤖 Recorded success:', 'color: #657786', key, sent);
  }

  /**
   * Get quick suggestions (no context analysis)
   */
  async getQuickSuggestions(): Promise<{ templates: PresetTemplate[], tones: ToneOption[] }> {
    // const preferences = await this.getUserPreferences();
    
    // Get favorites from localStorage
    const favoriteTemplates = await this.getFavoriteTemplates();
    const favoriteTones = await this.getFavoriteTones();
    
    // Get most used
    const mostUsedTemplates = this.getMostUsedTemplates(3);
    const mostUsedTones = this.getMostUsedTones(3);
    
    // Combine and deduplicate
    const templateIds = new Set([
      ...favoriteTemplates.map(t => t.id),
      ...mostUsedTemplates
    ]);
    
    const toneIds = new Set([
      ...favoriteTones.map(t => t.id),
      ...mostUsedTones
    ]);
    
    const templates = Array.from(templateIds)
      .map(id => TEMPLATES.find((t: PresetTemplate) => t.id === id))
      .filter(Boolean) as PresetTemplate[];
    
    const tones = Array.from(toneIds)
      .map(id => TONES.find((t: ToneOption) => t.id === id))
      .filter(Boolean) as ToneOption[];
    
    return { templates, tones };
  }

  /**
   * Get most used templates
   */
  private getMostUsedTemplates(limit: number): string[] {
    const templateUsage = new Map<string, number>();
    
    this.usageHistory.forEach((count, key) => {
      const [templateId] = key.split(':');
      const current = templateUsage.get(templateId) || 0;
      templateUsage.set(templateId, current + count);
    });
    
    return Array.from(templateUsage.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([id]) => id);
  }

  /**
   * Get most used tones
   */
  private getMostUsedTones(limit: number): string[] {
    const toneUsage = new Map<string, number>();
    
    this.usageHistory.forEach((count, key) => {
      const [, toneId] = key.split(':');
      const current = toneUsage.get(toneId) || 0;
      toneUsage.set(toneId, current + count);
    });
    
    return Array.from(toneUsage.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([id]) => id);
  }

  /**
   * Load history from storage
   */
  private async loadHistory(): Promise<void> {
    try {
      const stored = await chrome.storage.local.get(['suggestionHistory']);
      if (stored.suggestionHistory) {
        this.usageHistory = new Map(stored.suggestionHistory.usage);
        this.successHistory = new Map(stored.suggestionHistory.success);
      }
    } catch (error) {
      console.warn('Failed to load suggestion history:', error);
    }
  }

  /**
   * Save history to storage
   */
  private async saveHistory(): Promise<void> {
    try {
      await chrome.storage.local.set({
        suggestionHistory: {
          usage: Array.from(this.usageHistory.entries()),
          success: Array.from(this.successHistory.entries())
        }
      });
    } catch (error) {
      console.warn('Failed to save suggestion history:', error);
    }
  }

  /**
   * Clear history
   */
  clearHistory(): void {
    this.usageHistory.clear();
    this.successHistory.clear();
    this.saveHistory();
    console.log('%c🤖 History cleared', 'color: #FFA500');
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalUsage: number;
    uniqueCombinations: number;
    averageSuccessRate: number;
  } {
    const totalUsage = Array.from(this.usageHistory.values()).reduce((a, b) => a + b, 0);
    const uniqueCombinations = this.usageHistory.size;
    
    const successRates = Array.from(this.successHistory.values());
    const averageSuccessRate = successRates.length > 0
      ? successRates.reduce((a, b) => a + b, 0) / successRates.length
      : 0;
    
    return {
      totalUsage,
      uniqueCombinations,
      averageSuccessRate
    };
  }

  /**
   * Get user preferences from localStorage
   */
  private async getUserPreferences(): Promise<any> {
    try {
      const stored = await chrome.storage.local.get(['userPreferences']);
      return stored.userPreferences || {
        favoriteTemplates: [],
        favoriteTones: []
      };
    } catch {
      return {
        favoriteTemplates: [],
        favoriteTones: []
      };
    }
  }

  /**
   * Get favorite templates
   */
  private async getFavoriteTemplates(): Promise<PresetTemplate[]> {
    const preferences = await this.getUserPreferences();
    return preferences.favoriteTemplates
      ?.map((id: string) => TEMPLATES.find((t: PresetTemplate) => t.id === id))
      .filter(Boolean) || [];
  }

  /**
   * Get favorite tones
   */
  private async getFavoriteTones(): Promise<ToneOption[]> {
    const preferences = await this.getUserPreferences();
    return preferences.favoriteTones
      ?.map((id: string) => TONES.find((t: ToneOption) => t.id === id))
      .filter(Boolean) || [];
  }

  /**
   * Get API key from storage (with encryption support and timeout)
   */
  private async getApiKey(): Promise<string | null> {
    try {
      // Use message passing to service worker to avoid CSP issues
      return new Promise((resolve) => {
        // Set up timeout
        const timeout = setTimeout(() => {
          console.error('API key request timed out after 5 seconds');
          resolve(null);
        }, 5000); // 5 second timeout
        
        chrome.runtime.sendMessage({ type: 'GET_API_KEY' }, (response) => {
          // Clear timeout on response
          clearTimeout(timeout);
          
          if (chrome.runtime.lastError) {
            console.error('Failed to get API key:', chrome.runtime.lastError);
            resolve(null);
          } else if (response && response.success) {
            resolve(response.apiKey);
          } else {
            resolve(null);
          }
        });
      });
    } catch (error) {
      console.error('Failed to retrieve API key:', error);
      return null;
    }
  }

  /**
   * Get LLM analysis of tweet for better suggestions
   */
  private async getLLMAnalysis(tweetText: string, apiKey: string): Promise<LLMAnalysisResult | null> {
    try {
      console.log('%c🤖 Getting LLM analysis for better suggestions', 'color: #1DA1F2');
      
      const prompt = `Analyze this tweet for reply suggestions. Return JSON only:
Tweet: "${tweetText}"

Respond with:
{
  "sentiment": "positive/negative/neutral/controversial",
  "intent": "question/opinion/announcement/problem/achievement/humor/debate",
  "suggestedCategories": ["engagement", "value", "conversation", "humor", "debate", "viral"],
  "suggestedTones": ["professional", "casual", "witty", "enthusiastic", "contrarian", etc.],
  "topics": ["tech", "business", "personal", etc.]
}`;

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'chrome-extension://tweetcraft',
          'X-Title': 'TweetCraft Smart Suggestions'
        },
        body: JSON.stringify({
          model: TEMPLATE_SUGGESTER,
          messages: [
            {
              role: 'system',
              content: 'You are a tweet analysis assistant. Respond only with valid JSON.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3,
          max_tokens: 200
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;
      
      if (content) {
        // Use JSONExtractor for robust parsing
        const analysis = JSONExtractor.parseJSON<LLMAnalysisResult>(content);
        
        if (analysis) {
          console.log('%c🤖 LLM analysis result:', 'color: #17BF63', analysis);
          return analysis;
        } else {
          console.warn('Failed to extract valid JSON from LLM response');
        }
      }
    } catch (error) {
      console.log('%c🤖 LLM analysis failed:', 'color: #657786', error);
    }
    
    return null;
  }
}

// Export singleton instance
export const templateSuggester = new TemplateSuggester();