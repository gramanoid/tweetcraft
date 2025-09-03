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
  authorHandle?: string;
  threadLength?: number;
  participantCount?: number;
  recentEngagement?: {
    likes: number;
    retweets: number; 
    replies: number;
  };
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
    // Question patterns - more comprehensive
    {
      pattern: /\?|how do|what if|can you|should i|why does|where can|when will|who knows|which one/i,
      templates: ['ask_question', 'add_insight', 'provide_data'],
      tones: ['professional', 'academic', 'casual'],
      weight: 1.8,
      description: 'Question detected'
    },
    // Opinion/statement patterns - enhanced
    {
      pattern: /i think|my opinion|i believe|personally|in my view|seems like|appears that|i feel/i,
      templates: ['agree_expand', 'challenge', 'devils_advocate', 'personal_story'],
      tones: ['witty', 'contrarian', 'philosophical', 'casual'],
      weight: 1.5,
      description: 'Personal opinion expressed'
    },
    // Strong disagreement/controversy patterns - new
    {
      pattern: /wrong|terrible|awful|disagree|nonsense|ridiculous|stupid|bad take|worst/i,
      templates: ['challenge', 'devils_advocate', 'steel_man', 'hot_take'],
      tones: ['contrarian', 'sarcastic', 'savage', 'philosophical'],
      weight: 2.0,
      description: 'Strong disagreement detected'
    },
    // Achievement/success patterns - enhanced
    {
      pattern: /just launched|shipped|achieved|built|created|finished|completed|proud of|excited to announce|success/i,
      templates: ['congratulate', 'show_support', 'relate', 'celebrate'],
      tones: ['enthusiastic', 'motivational', 'casual', 'wholesome'],
      weight: 1.6,
      description: 'Achievement or success story'
    },
    // Problem/issue patterns - more specific  
    {
      pattern: /having trouble|can't figure out|struggling with|problem|issue|broken|failed|error|help needed|stuck on/i,
      templates: ['add_insight', 'share_experience', 'show_support', 'suggest_solution'],
      tones: ['professional', 'casual', 'motivational', 'wholesome'],
      weight: 1.6,
      description: 'Help or support needed'
    },
    // Excitement/hype patterns - new
    {
      pattern: /amazing|incredible|love this|so good|excited|hyped|can't wait|obsessed|blown away/i,
      templates: ['agree_build', 'celebrate', 'relate', 'add_energy'],
      tones: ['enthusiastic', 'gen_z', 'casual', 'motivational'],
      weight: 1.4,
      description: 'High excitement or enthusiasm'
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
        llmAnalysis = await this.getLLMAnalysis(context.tweetText, context, apiKey);
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
      .slice(0, 12); // Increased from 10 to 12 for better variety
    
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
    let score = 0.5; // Lower base score - LLM will be primary
    const reasons: string[] = [];
    
    // LLM analysis is now PRIMARY scoring mechanism
    if (llmAnalysis) {
      // Primary LLM-based scoring (much higher weights)
      if (llmAnalysis.suggestedCategories?.includes(template.category)) {
        score += 8.0; // Massive boost for LLM category match
        reasons.push('🤖 AI strongly recommends this approach');
      }
      
      if (llmAnalysis.suggestedTones?.includes(tone.id)) {
        score += 6.0; // Major boost for LLM tone match  
        reasons.push('🤖 AI suggests this tone');
      }
      
      // Confidence-based scoring
      if (llmAnalysis.confidence) {
        const confidenceBoost = llmAnalysis.confidence * 4.0;
        score += confidenceBoost;
        reasons.push(`🤖 AI confidence: ${(llmAnalysis.confidence * 100).toFixed(0)}%`);
      }
      
      // Sentiment-based major adjustments
      if (llmAnalysis.sentiment) {
        if (llmAnalysis.sentiment === 'positive' && tone.id === 'enthusiastic') {
          score += 3.0;
          reasons.push('🎯 Perfect tone for positive sentiment');
        } else if (llmAnalysis.sentiment === 'negative' && tone.id === 'motivational') {
          score += 3.0;  
          reasons.push('🎯 Motivational tone for negativity');
        } else if (llmAnalysis.sentiment === 'controversial' && template.category === 'debate') {
          score += 4.0;
          reasons.push('🔥 Debate approach for controversy');
        }
      }
      
      // Intent-based major scoring
      if (llmAnalysis.intent) {
        const intentMatches = this.getIntentMatches(template, tone, llmAnalysis.intent);
        score += intentMatches.score;
        if (intentMatches.reason) {
          reasons.push(`🎯 ${intentMatches.reason}`);
        }
      }

      // Reasoning chain integration - show AI's thinking process
      if (llmAnalysis.reasoning && llmAnalysis.reasoning.length > 0) {
        const keyReasoning = llmAnalysis.reasoning[0]; // Use first/primary reasoning
        reasons.push(`🧠 AI reasoning: ${keyReasoning}`);
        
        // Boost score based on reasoning confidence
        if (keyReasoning.includes('perfect') || keyReasoning.includes('ideal')) {
          score += 2.0;
        } else if (keyReasoning.includes('good') || keyReasoning.includes('suitable')) {
          score += 1.0;
        }
      }

      // Thread analysis scoring
      if (llmAnalysis.threadAnalysis) {
        const threadBonus = this.calculateThreadAnalysisBonus(template, tone, llmAnalysis.threadAnalysis);
        score += threadBonus.score;
        if (threadBonus.reason) {
          reasons.push(`🧵 ${threadBonus.reason}`);
        }
      }

      // User context scoring  
      if (llmAnalysis.userContext) {
        const userBonus = this.calculateUserContextBonus(template, tone, llmAnalysis.userContext);
        score += userBonus.score;
        if (userBonus.reason) {
          reasons.push(`👤 ${userBonus.reason}`);
        }
      }
    } else {
      // Fallback to pattern matching when LLM unavailable (lower weights)
      const templatePatternScore = (patternScores.get(template.id) || 0) * 0.3;
      const tonePatternScore = (patternScores.get(`tone:${tone.id}`) || 0) * 0.3;
      score += templatePatternScore + tonePatternScore;
      
      if (templatePatternScore > 0) {
        reasons.push(`Pattern match (${templatePatternScore.toFixed(1)})`);
      }
      if (tonePatternScore > 0) {
        reasons.push(`Tone pattern (${tonePatternScore.toFixed(1)})`);
      }
      
      reasons.push('⚠️ Using fallback pattern matching (AI unavailable)');
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
   * Get intent-based scoring matches
   */
  private getIntentMatches(template: PresetTemplate, tone: ToneOption, intent: string): { score: number; reason?: string } {
    const intentMappings: Record<string, { templates: string[], tones: string[], score: number, reason: string }> = {
      'question': {
        templates: ['ask_question', 'add_insight', 'provide_data'],
        tones: ['professional', 'academic', 'casual'],
        score: 5.0,
        reason: 'Perfect for answering questions'
      },
      'opinion': {
        templates: ['agree_expand', 'challenge', 'devils_advocate'],  
        tones: ['witty', 'contrarian', 'philosophical'],
        score: 4.5,
        reason: 'Great for opinion discussions'
      },
      'problem': {
        templates: ['add_insight', 'share_experience', 'suggest_solution'],
        tones: ['professional', 'motivational', 'wholesome'],
        score: 5.5,
        reason: 'Ideal for problem-solving'
      },
      'achievement': {
        templates: ['congratulate', 'show_support', 'celebrate'],
        tones: ['enthusiastic', 'motivational', 'wholesome'],
        score: 4.0,
        reason: 'Perfect for celebrating success'
      },
      'debate': {
        templates: ['challenge', 'devils_advocate', 'steel_man', 'hot_take'],
        tones: ['contrarian', 'sarcastic', 'savage', 'philosophical'],
        score: 6.0,
        reason: 'Excellent for debates'
      },
      'humor': {
        templates: ['add_humor', 'roast', 'meme_reference'],
        tones: ['witty', 'sarcastic', 'gen_z'],
        score: 3.5,
        reason: 'Great for humor'
      }
    };

    const mapping = intentMappings[intent];
    if (!mapping) return { score: 0 };

    let matchScore = 0;
    if (mapping.templates.includes(template.id)) matchScore += mapping.score;
    if (mapping.tones.includes(tone.id)) matchScore += mapping.score * 0.6;

    return matchScore > 0 ? { score: matchScore, reason: mapping.reason } : { score: 0 };
  }

  /**
   * Build context string for LLM analysis
   */
  private buildContextString(context: SuggestionContext): string {
    const contextParts: string[] = [];
    
    if (context.threadContext && context.threadContext.length > 0) {
      contextParts.push(`THREAD CONTEXT (${context.threadContext.length} previous tweets):`);
      context.threadContext.forEach((tweet, i) => {
        contextParts.push(`${i + 1}. ${tweet}`);
      });
    }
    
    if (context.authorHandle) {
      contextParts.push(`AUTHOR: ${context.authorHandle}`);
    }
    
    if (context.threadLength) {
      contextParts.push(`THREAD LENGTH: ${context.threadLength} tweets`);
    }
    
    if (context.participantCount && context.participantCount > 1) {
      contextParts.push(`PARTICIPANTS: ${context.participantCount} people in conversation`);
    }
    
    if (context.recentEngagement) {
      const eng = context.recentEngagement;
      contextParts.push(`ENGAGEMENT: ${eng.likes} likes, ${eng.retweets} retweets, ${eng.replies} replies`);
    }
    
    if (context.timeOfDay !== undefined) {
      const hour = context.timeOfDay;
      let timeContext = '';
      if (hour >= 5 && hour < 12) timeContext = 'morning';
      else if (hour >= 12 && hour < 17) timeContext = 'afternoon';  
      else if (hour >= 17 && hour < 22) timeContext = 'evening';
      else timeContext = 'late night/early morning';
      contextParts.push(`TIME CONTEXT: ${timeContext} (${hour}:00)`);
    }
    
    if (context.isReply) {
      contextParts.push(`REPLY CONTEXT: This is a reply to another tweet`);
    }
    
    return contextParts.length > 0 ? contextParts.join('\n') : 'LIMITED CONTEXT AVAILABLE';
  }

  /**
   * Calculate thread analysis bonus scoring
   */
  private calculateThreadAnalysisBonus(template: PresetTemplate, tone: ToneOption, threadAnalysis: any): { score: number; reason?: string } {
    let score = 0;
    let reason = '';

    // Conversation stage bonuses
    if (threadAnalysis.conversationStage === 'heated' && template.category === 'debate') {
      score += 2.5;
      reason = 'Perfect for heated debates';
    } else if (threadAnalysis.conversationStage === 'resolution' && template.category === 'collaborative') {
      score += 2.0; 
      reason = 'Great for resolution phase';
    } else if (threadAnalysis.conversationStage === 'opening' && template.category === 'engagement') {
      score += 1.5;
      reason = 'Good conversation starter';
    }

    // Thread sentiment bonuses
    if (threadAnalysis.threadSentiment === 'escalating' && tone.id === 'professional') {
      score += 1.5;
      reason += (reason ? ' + ' : '') + 'Professional tone de-escalates';
    } else if (threadAnalysis.threadSentiment === 'de-escalating' && tone.id === 'wholesome') {
      score += 1.0;
      reason += (reason ? ' + ' : '') + 'Wholesome tone maintains calm';
    }

    return { score, reason: reason || undefined };
  }

  /**
   * Calculate user context bonus scoring  
   */
  private calculateUserContextBonus(template: PresetTemplate, tone: ToneOption, userContext: any): { score: number; reason?: string } {
    let score = 0;
    let reason = '';

    // User type bonuses
    if (userContext.userType === 'expert' && tone.id === 'academic') {
      score += 2.0;
      reason = 'Academic tone for experts';
    } else if (userContext.userType === 'beginner' && tone.id === 'casual') {
      score += 1.5;
      reason = 'Casual tone for beginners';
    } else if (userContext.userType === 'influencer' && template.category === 'viral') {
      score += 2.5;
      reason = 'Viral content for influencers';
    }

    // Communication style matching
    if (userContext.communicationStyle === 'formal' && tone.id === 'professional') {
      score += 1.5;
      reason += (reason ? ' + ' : '') + 'Matches formal style';
    } else if (userContext.communicationStyle === 'humorous' && tone.id === 'witty') {
      score += 2.0;
      reason += (reason ? ' + ' : '') + 'Matches humorous style';
    } else if (userContext.communicationStyle === 'technical' && template.category === 'value') {
      score += 1.5;
      reason += (reason ? ' + ' : '') + 'Technical value-add';
    }

    return { score, reason: reason || undefined };
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
  private async getLLMAnalysis(tweetText: string, context: SuggestionContext, apiKey: string): Promise<LLMAnalysisResult | null> {
    try {
      console.log('%c🤖 Getting advanced LLM analysis for better suggestions', 'color: #1DA1F2');
      
      const contextInfo = this.buildContextString(context);
      
      const prompt = `You are an expert social media strategist analyzing tweets for optimal reply suggestions. 

TWEET TO ANALYZE: "${tweetText}"

${contextInfo}

ANALYSIS FRAMEWORK:
1. Read the tweet carefully and understand the author's intent
2. Consider the conversation context and thread dynamics  
3. Identify the optimal reply approach and tone
4. Provide confidence scores and reasoning

EXAMPLES:

Tweet: "Just shipped our new AI feature after 6 months of work! 🚀"
Analysis: {
  "sentiment": "positive",
  "intent": "achievement", 
  "confidence": 0.95,
  "reasoning": ["Clear achievement announcement", "Positive sentiment with emoji", "Invites congratulations"],
  "suggestedCategories": ["celebration", "engagement", "support"],
  "suggestedTones": ["enthusiastic", "motivational", "wholesome"],
  "threadAnalysis": {"conversationStage": "opening"},
  "userContext": {"engagementLevel": "high"}
}

Tweet: "Why do people still think AI will replace developers? This is such a bad take..."
Analysis: {
  "sentiment": "controversial", 
  "intent": "debate",
  "confidence": 0.88,
  "reasoning": ["Controversial opinion stated", "Dismissive language used", "Invites debate/discussion"],
  "suggestedCategories": ["debate", "challenge", "perspective"],
  "suggestedTones": ["contrarian", "professional", "philosophical"], 
  "threadAnalysis": {"conversationStage": "heated"},
  "userContext": {"communicationStyle": "technical"}
}

Tweet: "Having trouble with React state management. Anyone know good patterns?"
Analysis: {
  "sentiment": "neutral",
  "intent": "problem", 
  "confidence": 0.92,
  "reasoning": ["Clear problem statement", "Direct request for help", "Technical domain"],
  "suggestedCategories": ["help", "solution", "insight"],
  "suggestedTones": ["professional", "casual", "academic"],
  "threadAnalysis": {"conversationStage": "opening"},
  "userContext": {"userType": "beginner", "communicationStyle": "technical"}
}

NOW ANALYZE THE TARGET TWEET. Return ONLY valid JSON with all fields:`;

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
              content: 'You are an expert social media strategist and tweet analysis assistant. Provide detailed, confident analysis in valid JSON format only. Always include confidence scores and reasoning chains.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.2, // Lower temperature for more consistent analysis
          max_tokens: 800
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