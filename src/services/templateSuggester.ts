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
import { OpenRouterSmartService } from './openRouterSmart';
import { MessageType } from '@/types/messages';

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
  private suggestionBoosts: Map<string, number> = new Map(); // Stores boost scores for combinations
  private readonly BOOST_INCREMENT = 0.1;
  private readonly BOOST_DECREMENT = 0.05;
  private readonly MAX_BOOST = 0.5;
  private readonly MIN_BOOST = -0.3;
  private readonly STORAGE_KEY = 'tweetcraft_suggestion_boosts';
  
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
    this.loadBoosts();
    console.log('%c🤖 TemplateSuggester initialized', 'color: #1DA1F2; font-weight: bold');
  }

  /**
   * Get smart suggestions based on context
   */
  async getSuggestions(context: SuggestionContext): Promise<SuggestionScore[]> {
    console.log('%c🤖 SMART TAB ANALYSIS STARTED', 'color: #794BC4; font-weight: bold; font-size: 16px');
    console.log('%c  LLM-First Algorithm:', 'color: #657786', '✅ ENABLED');
    console.log('%c  Tweet text:', 'color: #657786', context.tweetText ? '✅ YES' : '❌ NO');
    console.log('%c  Tweet length:', 'color: #657786', context.tweetText?.length || 0, 'characters');
    console.log('%c  Thread context:', 'color: #657786', context.threadContext?.length || 0, 'tweets');
    console.log('%c  User history available:', 'color: #657786', context.userHistory ? '✅ YES' : '❌ NO');
    console.log('%c  Available data points:', 'color: #657786', Object.keys(context).length);
    
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
    
    console.log('%c🤖 Top 12 suggestions with explanations:', 'color: #17BF63');
    sorted.slice(0, 12).forEach((s, i) => {
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
    
    // Apply suggestion boost based on user selection history
    const boostKey = `${template.id}:${tone.id}`;
    const boost = this.suggestionBoosts.get(boostKey) || 0;
    if (boost !== 0) {
      score += boost;
      reasons.push(boost > 0 ? `User preference (+${Math.round(boost * 100)}%)` : `Less preferred (${Math.round(boost * 100)}%)`);
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
   * PHASE 1.1 - Using service worker for API calls (security improvement)
   */
  private async getLLMAnalysis(tweetText: string, context: SuggestionContext, apiKey: string): Promise<LLMAnalysisResult | null> {
    console.log('%c🧠 LLM ANALYSIS STARTED', 'color: #794BC4; font-weight: bold; font-size: 14px');
    console.log('%c  Using service worker for secure API calls', 'color: #657786');
    console.log('%c  Tweet text length:', 'color: #657786', tweetText?.length || 0, 'characters');
    
    // Check if we're in a service worker context (when called from service worker)
    // In that case, use direct OpenRouterSmartService
    if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
      console.log('%c  Running in service worker context, using direct API', 'color: #657786');
      // Use the direct service when called from service worker
      const analysis = await OpenRouterSmartService.analyzeTweetWithLLM(
        tweetText,
        context,
        apiKey,
        {
          priority: 'high',
          timeout: 8000
        }
      );
      
      if (analysis) {
        if (analysis.isFallback) {
          console.log('%c⚠️ Using fallback analysis (API unavailable)', 'color: #FFA500; font-weight: bold');
        } else {
          console.log('%c✅ LLM ANALYSIS COMPLETE', 'color: #17BF63; font-weight: bold; font-size: 14px');
        }
      }
      
      return analysis;
    }
    
    // Use service worker when in content script context (more secure)
    try {
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          console.error('LLM analysis request timed out after 8 seconds');
          resolve(null);
        }, 8000); // 8 second timeout
        
        // Send message to service worker for LLM analysis
        chrome.runtime.sendMessage(
          { 
            type: MessageType.ANALYZE_TWEET_LLM,
            tweetText,
            context
          }, 
          (response) => {
            clearTimeout(timeout);
            
            if (chrome.runtime.lastError) {
              console.error('Failed to get LLM analysis:', chrome.runtime.lastError);
              resolve(null);
            } else if (response && response.success) {
              const analysis = response.data;
              
              if (analysis) {
                // Check if this is a fallback response
                if (analysis.isFallback) {
                  console.log('%c⚠️ Using fallback analysis (API unavailable)', 'color: #FFA500; font-weight: bold');
                  console.log('%c  Fallback confidence:', 'color: #657786', analysis.confidence);
                } else {
                  console.log('%c✅ LLM ANALYSIS COMPLETE', 'color: #17BF63; font-weight: bold; font-size: 14px');
                }
                
                console.log('%c  Sentiment:', 'color: #657786', analysis.sentiment || 'not detected');
                console.log('%c  Intent:', 'color: #657786', analysis.intent || 'not detected');
                console.log('%c  Suggested categories:', 'color: #657786', analysis.suggestedCategories?.length || 0);
                console.log('%c  Confidence score:', 'color: #657786', analysis.confidence || 'not provided');
                console.log('%c  Reasoning steps:', 'color: #657786', analysis.reasoning?.length || 0);
              }
              
              resolve(analysis);
            } else {
              console.error('LLM analysis failed:', response?.error);
              resolve(null);
            }
          }
        );
      });
    } catch (error) {
      console.error('Failed to get LLM analysis:', error);
      return null;
    }
  }
  
  /**
   * Track user selection to boost future suggestions
   * Called when user picks a suggestion
   */
  trackSuggestionSelected(templateId: string, toneId: string, allSuggestions: SuggestionScore[]): void {
    const selectedKey = `${templateId}:${toneId}`;
    
    // Boost the selected suggestion
    const currentBoost = this.suggestionBoosts.get(selectedKey) || 0;
    const newBoost = Math.min(currentBoost + this.BOOST_INCREMENT, this.MAX_BOOST);
    this.suggestionBoosts.set(selectedKey, newBoost);
    
    // Slightly decrease non-selected suggestions
    allSuggestions.forEach(suggestion => {
      const key = `${suggestion.templateId}:${suggestion.toneId}`;
      if (key !== selectedKey) {
        const boost = this.suggestionBoosts.get(key) || 0;
        const newBoost = Math.max(boost - this.BOOST_DECREMENT, this.MIN_BOOST);
        if (newBoost !== 0) {
          this.suggestionBoosts.set(key, newBoost);
        } else {
          this.suggestionBoosts.delete(key); // Clean up zero boosts
        }
      }
    });
    
    this.saveBoosts();
    console.log(`%c📈 Suggestion boost updated for ${selectedKey}: +${Math.round(newBoost * 100)}%`, 'color: #17BF63');
  }
  
  /**
   * Load boosts from storage
   */
  private async loadBoosts(): Promise<void> {
    try {
      const stored = await chrome.storage.local.get([this.STORAGE_KEY]);
      if (stored[this.STORAGE_KEY]) {
        this.suggestionBoosts = new Map(stored[this.STORAGE_KEY]);
        console.log(`%c📊 Loaded ${this.suggestionBoosts.size} suggestion boosts`, 'color: #1DA1F2');
      }
    } catch (error) {
      console.warn('Failed to load suggestion boosts:', error);
    }
  }
  
  /**
   * Save boosts to storage
   */
  private async saveBoosts(): Promise<void> {
    try {
      // Only keep significant boosts to save space
      const significantBoosts = Array.from(this.suggestionBoosts.entries())
        .filter(([_, boost]) => Math.abs(boost) > 0.01);
      
      await chrome.storage.local.set({
        [this.STORAGE_KEY]: significantBoosts
      });
    } catch (error) {
      console.warn('Failed to save suggestion boosts:', error);
    }
  }
  
  /**
   * Reset all boosts
   */
  resetBoosts(): void {
    this.suggestionBoosts.clear();
    this.saveBoosts();
    console.log('%c🔄 All suggestion boosts reset', 'color: #FFA500');
  }
  
  /**
   * Get current boost statistics
   */
  getBoostStats(): { total: number; positive: number; negative: number; strongest: string | null } {
    const boosts = Array.from(this.suggestionBoosts.entries());
    const positive = boosts.filter(([_, b]) => b > 0);
    const negative = boosts.filter(([_, b]) => b < 0);
    
    const strongest = boosts.length > 0
      ? boosts.reduce((max, current) => Math.abs(current[1]) > Math.abs(max[1]) ? current : max)
      : null;
    
    return {
      total: boosts.length,
      positive: positive.length,
      negative: negative.length,
      strongest: strongest ? strongest[0] : null
    };
  }
}

// Export singleton instance
export const templateSuggester = new TemplateSuggester();