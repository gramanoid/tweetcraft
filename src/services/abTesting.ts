/**
 * A/B Testing Service
 * Compare performance of different tweet styles
 */

import { twitterAPI, type TrackedTweet } from './twitterAPI';

export interface ABTestCombo {
  personality: string;
  vocabulary: string;
  rhetoric: string;
  lengthPacing: string;
}

export interface ABTestGroup {
  name: string;
  combo: ABTestCombo;
  tweets: number;
  avgLikes: number;
  avgRetweets: number;
  avgEngagement: number;
  confidence: number; // Statistical confidence level
}

export interface ABTestResult {
  winner: ABTestGroup | null;
  groups: ABTestGroup[];
  sampleSize: number;
  confidenceLevel: number;
  recommendation: string;
}

export class ABTestingService {
  private readonly MIN_SAMPLE_SIZE = 5; // Minimum tweets per group for meaningful comparison
  private readonly CONFIDENCE_THRESHOLD = 0.95; // 95% confidence level

  /**
   * Compare two or more style combinations
   */
  async compareStyles(combos: ABTestCombo[]): Promise<ABTestResult> {
    const trackedTweets = await twitterAPI.getTrackedTweets();
    const groups: ABTestGroup[] = [];

    // Analyze each combo
    for (const combo of combos) {
      const group = this.analyzeGroup(combo, trackedTweets);
      if (group) {
        groups.push(group);
      }
    }

    // Determine winner
    const winner = this.determineWinner(groups);
    const sampleSize = groups.reduce((sum, g) => sum + g.tweets, 0);
    const confidenceLevel = this.calculateOverallConfidence(groups);
    const recommendation = this.generateRecommendation(winner, groups, sampleSize);

    return {
      winner,
      groups,
      sampleSize,
      confidenceLevel,
      recommendation
    };
  }

  /**
   * Get suggested A/B tests based on current usage
   */
  async getSuggestedTests(): Promise<Array<{ name: string; combos: ABTestCombo[]; reason: string }>> {
    const trackedTweets = await twitterAPI.getTrackedTweets();
    const suggestions: Array<{ name: string; combos: ABTestCombo[]; reason: string }> = [];

    // Find most used combinations
    const comboUsage = new Map<string, { combo: ABTestCombo; count: number }>();
    
    trackedTweets.forEach(tweet => {
      const key = this.getComboKey(tweet.combo);
      if (!comboUsage.has(key)) {
        comboUsage.set(key, { combo: tweet.combo, count: 0 });
      }
      comboUsage.get(key)!.count++;
    });

    const topCombos = Array.from(comboUsage.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map(item => item.combo);

    if (topCombos.length >= 2) {
      // Test top 2 most used
      suggestions.push({
        name: 'Top Performers',
        combos: topCombos.slice(0, 2),
        reason: 'Compare your two most frequently used styles'
      });
    }

    // Suggest personality variation test
    if (topCombos.length > 0) {
      const baseCombo = topCombos[0];
      const personalities = ['Friendly', 'Professional', 'Witty', 'Bold'];
      const alternativePersonality = personalities.find(p => p !== baseCombo.personality);
      
      if (alternativePersonality) {
        suggestions.push({
          name: 'Personality Test',
          combos: [
            baseCombo,
            { ...baseCombo, personality: alternativePersonality }
          ],
          reason: `Test if ${alternativePersonality} works better than ${baseCombo.personality}`
        });
      }
    }

    // Suggest length variation test
    if (topCombos.length > 0) {
      const baseCombo = topCombos[0];
      const alternativeLength = baseCombo.lengthPacing === 'Concise' ? 'Detailed' : 'Concise';
      
      suggestions.push({
        name: 'Length Test',
        combos: [
          baseCombo,
          { ...baseCombo, lengthPacing: alternativeLength }
        ],
        reason: `Test ${alternativeLength} vs ${baseCombo.lengthPacing} responses`
      });
    }

    return suggestions;
  }

  /**
   * Analyze a single group's performance
   */
  private analyzeGroup(combo: ABTestCombo, tweets: TrackedTweet[]): ABTestGroup | null {
    const groupTweets = tweets.filter(t => 
      t.combo.personality === combo.personality &&
      t.combo.vocabulary === combo.vocabulary &&
      t.combo.rhetoric === combo.rhetoric &&
      t.combo.lengthPacing === combo.lengthPacing &&
      t.metrics // Only include tweets with metrics
    );

    if (groupTweets.length === 0) {
      return null;
    }

    const totalLikes = groupTweets.reduce((sum, t) => sum + (t.metrics?.likes || 0), 0);
    const totalRetweets = groupTweets.reduce((sum, t) => sum + (t.metrics?.retweets || 0), 0);
    const totalEngagement = totalLikes + totalRetweets;

    const avgLikes = totalLikes / groupTweets.length;
    const avgRetweets = totalRetweets / groupTweets.length;
    const avgEngagement = totalEngagement / groupTweets.length;

    // Calculate confidence based on sample size
    const confidence = this.calculateConfidence(groupTweets.length);

    return {
      name: `${combo.personality} + ${combo.rhetoric}`,
      combo,
      tweets: groupTweets.length,
      avgLikes,
      avgRetweets,
      avgEngagement,
      confidence
    };
  }

  /**
   * Determine the winning group
   */
  private determineWinner(groups: ABTestGroup[]): ABTestGroup | null {
    if (groups.length === 0) return null;

    // Filter groups with sufficient sample size
    const validGroups = groups.filter(g => g.tweets >= this.MIN_SAMPLE_SIZE);
    
    if (validGroups.length === 0) return null;

    // Sort by average engagement
    const sorted = validGroups.sort((a, b) => b.avgEngagement - a.avgEngagement);
    
    // Check if the difference is statistically significant
    if (sorted.length >= 2) {
      const diff = sorted[0].avgEngagement - sorted[1].avgEngagement;
      const threshold = sorted[1].avgEngagement * 0.2; // 20% difference threshold
      
      if (diff > threshold && sorted[0].confidence >= this.CONFIDENCE_THRESHOLD) {
        return sorted[0];
      }
    }

    // Return top performer even if not statistically significant
    return sorted[0];
  }

  /**
   * Calculate confidence level based on sample size
   */
  private calculateConfidence(sampleSize: number): number {
    if (sampleSize < this.MIN_SAMPLE_SIZE) return 0;
    if (sampleSize >= 30) return 0.99;
    if (sampleSize >= 20) return 0.95;
    if (sampleSize >= 10) return 0.90;
    return 0.80;
  }

  /**
   * Calculate overall confidence for the test
   */
  private calculateOverallConfidence(groups: ABTestGroup[]): number {
    if (groups.length === 0) return 0;
    
    const avgConfidence = groups.reduce((sum, g) => sum + g.confidence, 0) / groups.length;
    const minSampleSize = Math.min(...groups.map(g => g.tweets));
    
    // Penalize if sample sizes are too different
    const sampleSizes = groups.map(g => g.tweets);
    const maxDiff = Math.max(...sampleSizes) - Math.min(...sampleSizes);
    const samplePenalty = maxDiff > 10 ? 0.1 : 0;
    
    return Math.max(0, avgConfidence - samplePenalty);
  }

  /**
   * Generate recommendation based on results
   */
  private generateRecommendation(winner: ABTestGroup | null, groups: ABTestGroup[], sampleSize: number): string {
    if (groups.length === 0) {
      return 'Not enough data. Keep tracking your tweets to enable A/B testing.';
    }

    if (sampleSize < this.MIN_SAMPLE_SIZE * 2) {
      return `Need more data. Current sample: ${sampleSize} tweets. Recommended: ${this.MIN_SAMPLE_SIZE * 2}+ tweets.`;
    }

    if (!winner) {
      return 'No clear winner yet. Continue testing to gather more data.';
    }

    const improvement = groups.length >= 2 
      ? Math.round(((winner.avgEngagement - groups[1].avgEngagement) / groups[1].avgEngagement) * 100)
      : 0;

    if (winner.confidence >= this.CONFIDENCE_THRESHOLD) {
      return `Strong winner: "${winner.name}" performs ${improvement}% better with ${Math.round(winner.confidence * 100)}% confidence.`;
    } else {
      return `"${winner.name}" is leading but needs more data for confidence (current: ${Math.round(winner.confidence * 100)}%).`;
    }
  }

  /**
   * Get unique key for a combo
   */
  private getComboKey(combo: ABTestCombo): string {
    return `${combo.personality}:${combo.vocabulary}:${combo.rhetoric}:${combo.lengthPacing}`;
  }

  /**
   * Start an A/B test session
   */
  async startABTest(testName: string, combos: ABTestCombo[]): Promise<void> {
    const testConfig = {
      name: testName,
      combos,
      startedAt: Date.now(),
      active: true
    };

    await chrome.storage.local.set({
      tweetcraft_active_ab_test: testConfig
    });

    console.log('%c🧪 A/B Test Started', 'color: #8B5CF6; font-weight: bold', testConfig);
  }

  /**
   * Get active A/B test
   */
  async getActiveTest(): Promise<any | null> {
    const result = await chrome.storage.local.get(['tweetcraft_active_ab_test']);
    return result.tweetcraft_active_ab_test || null;
  }

  /**
   * Stop active A/B test
   */
  async stopABTest(): Promise<void> {
    await chrome.storage.local.remove(['tweetcraft_active_ab_test']);
    console.log('%c🧪 A/B Test Stopped', 'color: #8B5CF6; font-weight: bold');
  }
}

// Export singleton instance
export const abTesting = new ABTestingService();