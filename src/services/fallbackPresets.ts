/**
 * Fallback Presets Service - PHASE 1.2
 * Deterministic fallback presets for when AI is unavailable
 * Provides high-quality, context-aware suggestions without API calls
 */

import type { PresetTemplate } from '@/content/presetTemplates';
import type { ToneOption } from '@/content/toneSelector';
import { TEMPLATES } from '@/content/presetTemplates';
import { TONES } from '@/content/toneSelector';
import { logger } from '@/utils/logger';

interface FallbackPreset {
  id: string;
  name: string;
  description: string;
  triggers: {
    patterns: RegExp[];
    keywords: string[];
    sentimentRange?: ('positive' | 'negative' | 'neutral' | 'all')[];
  };
  suggestions: {
    templates: string[]; // template IDs
    tones: string[]; // tone IDs
    confidence: number;
    reasoning: string[];
  };
  priority: number; // Higher priority presets are checked first
  category: 'question' | 'achievement' | 'problem' | 'opinion' | 'debate' | 'general';
}

export class FallbackPresetsService {
  private static presets: FallbackPreset[] = [
    // Question-based presets
    {
      id: 'tech-help',
      name: 'Technical Help Request',
      description: 'User asking for technical assistance',
      triggers: {
        patterns: [
          /how (do|can|to)/i,
          /anyone know/i,
          /help with/i,
          /struggling with/i,
          /can't figure out/i,
          /what's the best/i
        ],
        keywords: ['help', 'tutorial', 'guide', 'documentation', 'error', 'issue'],
        sentimentRange: ['neutral', 'negative']
      },
      suggestions: {
        templates: ['add_insight', 'share_experience', 'provide_data', 'suggest_solution'],
        tones: ['professional', 'casual', 'academic'],
        confidence: 0.85,
        reasoning: [
          'Technical question detected',
          'Help-seeking language identified',
          'Professional tone appropriate for technical discourse'
        ]
      },
      priority: 10,
      category: 'question'
    },
    
    {
      id: 'opinion-request',
      name: 'Opinion or Advice Request',
      description: 'Asking for opinions or advice',
      triggers: {
        patterns: [
          /what do you think/i,
          /thoughts on/i,
          /opinion on/i,
          /should i/i,
          /would you/i,
          /advice on/i
        ],
        keywords: ['opinion', 'thoughts', 'advice', 'recommend', 'suggest'],
        sentimentRange: ['all']
      },
      suggestions: {
        templates: ['personal_story', 'relate', 'add_perspective', 'agree_expand'],
        tones: ['casual', 'witty', 'philosophical'],
        confidence: 0.82,
        reasoning: [
          'Opinion request identified',
          'Personal engagement appropriate',
          'Conversational tone fits request style'
        ]
      },
      priority: 8,
      category: 'question'
    },

    // Achievement-based presets
    {
      id: 'launch-announcement',
      name: 'Product Launch or Achievement',
      description: 'Announcing a launch or major achievement',
      triggers: {
        patterns: [
          /just (launched|shipped|released|published)/i,
          /proud to announce/i,
          /excited to share/i,
          /finally finished/i,
          /\d+ (months|years) of work/i,
          /🚀|🎉|🎊|✨/
        ],
        keywords: ['launched', 'shipped', 'released', 'built', 'created', 'proud', 'excited'],
        sentimentRange: ['positive']
      },
      suggestions: {
        templates: ['congratulate', 'celebrate', 'show_support', 'relate'],
        tones: ['enthusiastic', 'motivational', 'wholesome'],
        confidence: 0.92,
        reasoning: [
          'Achievement announcement detected',
          'Positive sentiment requires supportive response',
          'Celebration and encouragement appropriate'
        ]
      },
      priority: 10,
      category: 'achievement'
    },

    {
      id: 'milestone-reached',
      name: 'Milestone or Personal Achievement',
      description: 'Personal milestone or accomplishment',
      triggers: {
        patterns: [
          /reached \d+/i,
          /hit \d+/i,
          /milestone/i,
          /anniversary/i,
          /years? (ago|today)/i,
          /celebrating/i
        ],
        keywords: ['milestone', 'anniversary', 'followers', 'subscribers', 'users', 'customers'],
        sentimentRange: ['positive']
      },
      suggestions: {
        templates: ['celebrate', 'congratulate', 'relate', 'add_energy'],
        tones: ['enthusiastic', 'gen_z', 'casual'],
        confidence: 0.88,
        reasoning: [
          'Milestone celebration detected',
          'High energy response appropriate',
          'Community building opportunity'
        ]
      },
      priority: 8,
      category: 'achievement'
    },

    // Problem-based presets
    {
      id: 'debugging-issue',
      name: 'Debugging or Technical Problem',
      description: 'Dealing with bugs or technical issues',
      triggers: {
        patterns: [
          /bug|broken|error|crash/i,
          /not working/i,
          /doesn't work/i,
          /failed to/i,
          /undefined|null|NaN/i,
          /stack overflow/i
        ],
        keywords: ['debug', 'fix', 'error', 'bug', 'issue', 'problem', 'broken'],
        sentimentRange: ['negative', 'neutral']
      },
      suggestions: {
        templates: ['share_experience', 'add_insight', 'show_support', 'suggest_solution'],
        tones: ['professional', 'casual', 'motivational'],
        confidence: 0.86,
        reasoning: [
          'Technical problem identified',
          'Solution-oriented response needed',
          'Empathy and expertise balance required'
        ]
      },
      priority: 9,
      category: 'problem'
    },

    {
      id: 'frustration-vent',
      name: 'Frustration or Venting',
      description: 'Expressing frustration or venting',
      triggers: {
        patterns: [
          /frustrated|annoyed|angry/i,
          /hate when/i,
          /tired of/i,
          /sick of/i,
          /why is .* so/i,
          /😤|😡|🤬/
        ],
        keywords: ['frustrated', 'annoyed', 'hate', 'tired', 'sick', 'angry'],
        sentimentRange: ['negative']
      },
      suggestions: {
        templates: ['show_support', 'relate', 'add_humor', 'validate'],
        tones: ['casual', 'witty', 'wholesome', 'sarcastic'],
        confidence: 0.83,
        reasoning: [
          'Frustration detected',
          'Validation and humor can help',
          'Avoid being preachy or dismissive'
        ]
      },
      priority: 7,
      category: 'problem'
    },

    // Opinion/Debate presets
    {
      id: 'hot-take',
      name: 'Hot Take or Controversial Opinion',
      description: 'Strong or controversial opinion',
      triggers: {
        patterns: [
          /unpopular opinion/i,
          /hot take/i,
          /controversial but/i,
          /fight me/i,
          /hill to die on/i,
          /change my mind/i
        ],
        keywords: ['opinion', 'take', 'controversial', 'unpopular', 'debate'],
        sentimentRange: ['all']
      },
      suggestions: {
        templates: ['challenge', 'devils_advocate', 'agree_expand', 'add_perspective'],
        tones: ['contrarian', 'philosophical', 'witty', 'sarcastic'],
        confidence: 0.87,
        reasoning: [
          'Controversial opinion detected',
          'Debate-style engagement appropriate',
          'Intellectual discourse opportunity'
        ]
      },
      priority: 9,
      category: 'debate'
    },

    {
      id: 'industry-criticism',
      name: 'Industry or Tech Criticism',
      description: 'Criticizing industry practices or tech',
      triggers: {
        patterns: [
          /tech companies/i,
          /silicon valley/i,
          /startup culture/i,
          /why do .* always/i,
          /industry .* broken/i
        ],
        keywords: ['industry', 'companies', 'culture', 'broken', 'problem', 'issue'],
        sentimentRange: ['negative', 'neutral']
      },
      suggestions: {
        templates: ['steel_man', 'add_perspective', 'challenge', 'agree_build'],
        tones: ['professional', 'philosophical', 'contrarian'],
        confidence: 0.84,
        reasoning: [
          'Industry criticism identified',
          'Thoughtful analysis appropriate',
          'Balance critique with perspective'
        ]
      },
      priority: 6,
      category: 'debate'
    },

    // General engagement presets
    {
      id: 'sharing-resource',
      name: 'Sharing Resource or Link',
      description: 'Sharing useful resources or links',
      triggers: {
        patterns: [
          /check out/i,
          /useful resource/i,
          /great article/i,
          /must read/i,
          /thread 🧵/i,
          /\[link\]|\[thread\]/i
        ],
        keywords: ['resource', 'article', 'thread', 'link', 'tool', 'guide'],
        sentimentRange: ['positive', 'neutral']
      },
      suggestions: {
        templates: ['bookmark', 'thank', 'add_value', 'relate'],
        tones: ['casual', 'professional', 'enthusiastic'],
        confidence: 0.79,
        reasoning: [
          'Resource sharing detected',
          'Appreciation and value-add appropriate',
          'Community engagement opportunity'
        ]
      },
      priority: 5,
      category: 'general'
    },

    {
      id: 'morning-greeting',
      name: 'Morning or Daily Check-in',
      description: 'Morning greetings or daily updates',
      triggers: {
        patterns: [
          /good morning/i,
          /gm/i,
          /rise and shine/i,
          /coffee time/i,
          /starting the day/i,
          /☕|🌅|🌞/
        ],
        keywords: ['morning', 'coffee', 'day', 'breakfast', 'routine'],
        sentimentRange: ['positive', 'neutral']
      },
      suggestions: {
        templates: ['greet_back', 'add_energy', 'relate', 'motivate'],
        tones: ['wholesome', 'enthusiastic', 'casual'],
        confidence: 0.75,
        reasoning: [
          'Greeting or check-in detected',
          'Friendly engagement appropriate',
          'Energy matching important'
        ]
      },
      priority: 4,
      category: 'general'
    },

    // Default fallback
    {
      id: 'default-engagement',
      name: 'Default Engagement',
      description: 'Generic engagement for unmatched tweets',
      triggers: {
        patterns: [/.*/], // Matches anything
        keywords: [],
        sentimentRange: ['all']
      },
      suggestions: {
        templates: ['agree_expand', 'add_perspective', 'relate', 'ask_question'],
        tones: ['casual', 'professional', 'witty'],
        confidence: 0.60,
        reasoning: [
          'No specific pattern detected',
          'Generic engagement approach',
          'Safe, versatile response options'
        ]
      },
      priority: 0, // Lowest priority - only used if nothing else matches
      category: 'general'
    }
  ];

  /**
   * Get fallback suggestions based on tweet content
   */
  static getSuggestions(tweetText: string, context?: any): {
    templates: PresetTemplate[],
    tones: ToneOption[],
    confidence: number,
    reasoning: string[],
    matchedPreset: string
  } {
    logger.log('🎯 Fallback Presets: Analyzing tweet for pattern matching');
    
    // Sort presets by priority (highest first)
    const sortedPresets = [...this.presets].sort((a, b) => b.priority - a.priority);
    
    // Find the best matching preset
    for (const preset of sortedPresets) {
      if (this.matchesPreset(tweetText, preset)) {
        logger.log(`✅ Matched preset: ${preset.name} (confidence: ${preset.suggestions.confidence})`);
        
        // Get the actual template and tone objects
        const templates = preset.suggestions.templates
          .map(id => TEMPLATES.find(t => t.id === id))
          .filter(Boolean) as PresetTemplate[];
          
        const tones = preset.suggestions.tones
          .map(id => TONES.find(t => t.id === id))
          .filter(Boolean) as ToneOption[];
        
        return {
          templates,
          tones,
          confidence: preset.suggestions.confidence,
          reasoning: preset.suggestions.reasoning,
          matchedPreset: preset.name
        };
      }
    }
    
    // This shouldn't happen as we have a default fallback, but just in case
    logger.warn('⚠️ No preset matched (using emergency defaults)');
    return this.getEmergencyDefaults();
  }

  /**
   * Check if tweet matches a preset
   */
  private static matchesPreset(tweetText: string, preset: FallbackPreset): boolean {
    const lowerText = tweetText.toLowerCase();
    
    // Check pattern matches
    const patternMatch = preset.triggers.patterns.some(pattern => pattern.test(tweetText));
    
    // Check keyword matches (at least one keyword should be present)
    const keywordMatch = preset.triggers.keywords.length === 0 || 
                        preset.triggers.keywords.some(keyword => lowerText.includes(keyword.toLowerCase()));
    
    // For high-priority presets, either pattern OR keyword match is sufficient
    // For low-priority presets, we might want both
    if (preset.priority >= 7) {
      return patternMatch || keywordMatch;
    } else if (preset.priority >= 4) {
      return patternMatch && keywordMatch;
    } else {
      // For default/low priority, always match if patterns allow
      return patternMatch;
    }
  }

  /**
   * Get emergency defaults if nothing else works
   */
  private static getEmergencyDefaults() {
    const defaultTemplates = ['agree_expand', 'add_perspective', 'ask_question']
      .map(id => TEMPLATES.find(t => t.id === id))
      .filter(Boolean) as PresetTemplate[];
      
    const defaultTones = ['casual', 'professional']
      .map(id => TONES.find(t => t.id === id))
      .filter(Boolean) as ToneOption[];
    
    return {
      templates: defaultTemplates,
      tones: defaultTones,
      confidence: 0.5,
      reasoning: ['Emergency fallback activated', 'Using safe defaults'],
      matchedPreset: 'Emergency Default'
    };
  }

  /**
   * Get preset by category
   */
  static getPresetsByCategory(category: FallbackPreset['category']): FallbackPreset[] {
    return this.presets.filter(p => p.category === category);
  }

  /**
   * Get all high-confidence presets (>= 0.85 confidence)
   */
  static getHighConfidencePresets(): FallbackPreset[] {
    return this.presets.filter(p => p.suggestions.confidence >= 0.85);
  }

  /**
   * Add custom preset (for future extensibility)
   */
  static addCustomPreset(preset: FallbackPreset): void {
    // Validate preset structure
    if (!preset.id || !preset.name || !preset.triggers || !preset.suggestions) {
      logger.error('Invalid preset structure');
      return;
    }
    
    // Check for duplicate ID
    if (this.presets.some(p => p.id === preset.id)) {
      logger.warn(`Preset with ID ${preset.id} already exists`);
      return;
    }
    
    this.presets.push(preset);
    logger.log(`Added custom preset: ${preset.name}`);
  }

  /**
   * Get statistics about preset usage (for analytics)
   */
  static getPresetStats() {
    return {
      totalPresets: this.presets.length,
      byCategory: {
        question: this.presets.filter(p => p.category === 'question').length,
        achievement: this.presets.filter(p => p.category === 'achievement').length,
        problem: this.presets.filter(p => p.category === 'problem').length,
        opinion: this.presets.filter(p => p.category === 'opinion').length,
        debate: this.presets.filter(p => p.category === 'debate').length,
        general: this.presets.filter(p => p.category === 'general').length
      },
      averageConfidence: this.presets.reduce((sum, p) => sum + p.suggestions.confidence, 0) / this.presets.length,
      highConfidenceCount: this.getHighConfidencePresets().length
    };
  }
}

// Export singleton instance
export const fallbackPresets = new FallbackPresetsService();