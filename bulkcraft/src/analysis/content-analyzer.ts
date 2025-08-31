import { Tweet } from '../types';

export interface ContentAnalysis {
  length: number;
  wordCount: number;
  hasMedia: boolean;
  hasLinks: boolean;
  hasHashtags: boolean;
  hasMentions: boolean;
  sentiment: 'positive' | 'negative' | 'neutral';
  readabilityScore: number;
  emotionalIntensity: number;
}

export class ContentAnalyzer {
  analyzeContent(tweet: Tweet): ContentAnalysis {
    const text = tweet.text;
    
    return {
      length: text.length,
      wordCount: this.countWords(text),
      hasMedia: this.detectMedia(text),
      hasLinks: this.detectLinks(text),
      hasHashtags: this.detectHashtags(text),
      hasMentions: this.detectMentions(text),
      sentiment: this.analyzeSentiment(text),
      readabilityScore: this.calculateReadability(text),
      emotionalIntensity: this.measureEmotionalIntensity(text),
    };
  }

  private countWords(text: string): number {
    return text.split(/\s+/).filter(word => word.length > 0).length;
  }

  private detectMedia(text: string): boolean {
    return text.includes('https://t.co/') || text.includes('pic.twitter.com');
  }

  private detectLinks(text: string): boolean {
    return /https?:\/\/[^\s]+/.test(text);
  }

  private detectHashtags(text: string): boolean {
    return /#\w+/.test(text);
  }

  private detectMentions(text: string): boolean {
    return /@\w+/.test(text);
  }

  private analyzeSentiment(text: string): 'positive' | 'negative' | 'neutral' {
    const positive = [
      'amazing', 'great', 'excellent', 'love', 'best', 'awesome',
      'fantastic', 'wonderful', 'brilliant', 'perfect', 'beautiful'
    ];
    const negative = [
      'terrible', 'awful', 'hate', 'worst', 'horrible', 'disgusting',
      'pathetic', 'ridiculous', 'stupid', 'absurd', 'moron'
    ];

    const lowerText = text.toLowerCase();
    const positiveScore = positive.filter(word => lowerText.includes(word)).length;
    const negativeScore = negative.filter(word => lowerText.includes(word)).length;

    if (positiveScore > negativeScore) return 'positive';
    if (negativeScore > positiveScore) return 'negative';
    return 'neutral';
  }

  private calculateReadability(text: string): number {
    // Simple readability score based on average word length
    const words = text.split(/\s+/);
    if (words.length === 0) return 0;
    
    const avgWordLength = words.reduce((sum, word) => sum + word.length, 0) / words.length;
    
    // Score from 1-10, where lower is simpler
    return Math.min(10, Math.max(1, avgWordLength * 1.5));
  }

  private measureEmotionalIntensity(text: string): number {
    const intensifiers = [
      'very', 'extremely', 'absolutely', 'totally', 'completely',
      'utterly', 'entirely', 'really', 'definitely', 'certainly',
      '!', 'CAPS', 'never', 'always', 'cannot believe', 'shocking'
    ];

    const lowerText = text.toLowerCase();
    let intensity = 0;

    intensifiers.forEach(word => {
      if (word === 'CAPS') {
        // Check for words in all caps
        const capsWords = text.match(/\b[A-Z]{2,}\b/g);
        intensity += capsWords ? capsWords.length : 0;
      } else if (word === '!') {
        intensity += (text.match(/!/g) || []).length;
      } else {
        intensity += lowerText.includes(word) ? 1 : 0;
      }
    });

    return Math.min(10, intensity);
  }

  extractStyleElements(tweets: Tweet[]): {
    openingPatterns: string[];
    closingPatterns: string[];
    transitionPhrases: string[];
    hooks: string[];
  } {
    const openings: Record<string, number> = {};
    const closings: Record<string, number> = {};
    const transitions: Record<string, number> = {};
    const hooks: Record<string, number> = {};

    tweets.forEach(tweet => {
      // Extract opening patterns (first 50 chars)
      const opening = tweet.text.substring(0, 50).toLowerCase();
      if (opening.match(/^@\w+\s+/)) {
        this.increment(openings, 'Direct reply');
      } else if (opening.startsWith('let me')) {
        this.increment(openings, 'Let me explain...');
      } else if (opening.includes('honestly')) {
        this.increment(openings, 'Honestly...');
      }

      // Extract transition phrases
      const transitionPatterns = [
        'but here\'s',
        'the thing is',
        'actually',
        'to be fair',
        'on the other hand'
      ];
      transitionPatterns.forEach(pattern => {
        if (tweet.text.toLowerCase().includes(pattern)) {
          this.increment(transitions, pattern);
        }
      });

      // Extract hooks
      if (tweet.text.includes('?')) {
        this.increment(hooks, 'Question hook');
      }
      if (/^\d+\./.test(tweet.text)) {
        this.increment(hooks, 'Numbered list');
      }
      if (tweet.text.match(/^(BREAKING|UPDATE|JUST IN)/)) {
        this.increment(hooks, 'News-style hook');
      }
    });

    return {
      openingPatterns: this.getTop(openings, 5),
      closingPatterns: this.getTop(closings, 5),
      transitionPhrases: this.getTop(transitions, 5),
      hooks: this.getTop(hooks, 5),
    };
  }

  private increment(obj: Record<string, number>, key: string): void {
    obj[key] = (obj[key] || 0) + 1;
  }

  private getTop(obj: Record<string, number>, n: number): string[] {
    return Object.entries(obj)
      .sort(([, a], [, b]) => b - a)
      .slice(0, n)
      .map(([key]) => key);
  }
}