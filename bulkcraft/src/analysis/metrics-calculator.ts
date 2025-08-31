import { Tweet, AnalysisResult, ContentPattern } from '../types';

export class MetricsCalculator {
  calculateEngagementRate(tweet: Tweet): number {
    if (tweet.impressions === 0) return 0;
    return tweet.engagements / tweet.impressions;
  }

  calculateWeightedEngagement(tweet: Tweet): number {
    // Weighted scoring: bookmarks > replies > likes > clicks
    return (
      tweet.bookmarks * 5 +
      tweet.replies * 3 +
      tweet.likes * 2 +
      tweet.reposts * 2 +
      tweet.urlClicks * 1 +
      tweet.profileVisits * 1
    );
  }

  analyzePerformance(tweets: Tweet[]): AnalysisResult {
    const sortedByImpressions = [...tweets].sort((a, b) => b.impressions - a.impressions);
    const topPosts = sortedByImpressions.slice(0, 20);
    
    const engagementRates = tweets.map(t => this.calculateEngagementRate(t));
    const averageEngagementRate = engagementRates.reduce((a, b) => a + b, 0) / engagementRates.length;
    
    const topics = this.extractTopics(topPosts);
    const optimalLength = this.calculateOptimalLength(topPosts);
    const bestTimes = this.analyzeBestPostingTimes(topPosts);
    const patterns = this.extractContentPatterns(topPosts);

    return {
      topPosts,
      averageEngagementRate,
      bestPerformingTopics: topics,
      optimalLength,
      bestPostingTimes: bestTimes,
      contentPatterns: patterns,
    };
  }

  private extractTopics(tweets: Tweet[]): string[] {
    const topicKeywords = {
      'AI/Tech': ['ai', 'llm', 'code', 'model', 'gpt', 'claude', 'software'],
      'Politics': ['immigration', 'government', 'policy', 'election'],
      'Business': ['startup', 'business', 'entrepreneur', 'money'],
      'Personal': ['life', 'experience', 'story', 'personal'],
    };

    const topicCounts: Record<string, number> = {};
    
    tweets.forEach(tweet => {
      const text = tweet.text.toLowerCase();
      Object.entries(topicKeywords).forEach(([topic, keywords]) => {
        if (keywords.some(keyword => text.includes(keyword))) {
          topicCounts[topic] = (topicCounts[topic] || 0) + 1;
        }
      });
    });

    return Object.entries(topicCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([topic]) => topic);
  }

  private calculateOptimalLength(tweets: Tweet[]): number {
    const lengths = tweets.map(t => t.text.length);
    lengths.sort((a, b) => a - b);
    const median = lengths[Math.floor(lengths.length / 2)];
    return median;
  }

  private analyzeBestPostingTimes(tweets: Tweet[]): string[] {
    const hourCounts: Record<number, number> = {};
    
    tweets.forEach(tweet => {
      const hour = tweet.date.getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + tweet.impressions;
    });

    return Object.entries(hourCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([hour]) => `${hour}:00`);
  }

  private extractContentPatterns(tweets: Tweet[]): ContentPattern[] {
    const patterns: Record<string, ContentPattern> = {};
    
    const patternChecks = [
      { 
        name: 'Reply', 
        check: (text: string) => text.startsWith('@'),
      },
      {
        name: 'Question',
        check: (text: string) => text.includes('?'),
      },
      {
        name: 'Strong Opinion',
        check: (text: string) => /\b(absolutely|definitely|obviously|clearly|ridiculous|absurd)\b/i.test(text),
      },
      {
        name: 'Confrontational',
        check: (text: string) => /\b(you're|you are|your|you don't|you can't)\b/i.test(text),
      },
    ];

    tweets.forEach(tweet => {
      patternChecks.forEach(({ name, check }) => {
        if (check(tweet.text)) {
          if (!patterns[name]) {
            patterns[name] = {
              pattern: name,
              frequency: 0,
              averageEngagement: 0,
              examples: [],
            };
          }
          patterns[name].frequency++;
          patterns[name].averageEngagement += this.calculateEngagementRate(tweet);
          if (patterns[name].examples.length < 3) {
            patterns[name].examples.push(tweet.text.substring(0, 100));
          }
        }
      });
    });

    return Object.values(patterns).map(pattern => ({
      ...pattern,
      averageEngagement: pattern.averageEngagement / pattern.frequency,
    }));
  }

  segmentByPerformance(tweets: Tweet[]): {
    viral: Tweet[];
    highPerforming: Tweet[];
    average: Tweet[];
    lowPerforming: Tweet[];
  } {
    const sorted = [...tweets].sort((a, b) => b.impressions - a.impressions);
    const percentile = (p: number) => sorted[Math.floor(sorted.length * p)];
    
    const p90 = percentile(0.1).impressions;
    const p75 = percentile(0.25).impressions;
    const p25 = percentile(0.75).impressions;

    return {
      viral: tweets.filter(t => t.impressions >= p90),
      highPerforming: tweets.filter(t => t.impressions >= p75 && t.impressions < p90),
      average: tweets.filter(t => t.impressions >= p25 && t.impressions < p75),
      lowPerforming: tweets.filter(t => t.impressions < p25),
    };
  }
}