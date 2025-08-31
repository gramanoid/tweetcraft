export { CSVParser } from './csv-parser';
export { MetricsCalculator } from './metrics-calculator';
export { ContentAnalyzer, ContentAnalysis } from './content-analyzer';

import { CSVParser } from './csv-parser';
import { MetricsCalculator } from './metrics-calculator';
import { ContentAnalyzer } from './content-analyzer';
import { Tweet, AnalysisResult } from '../types';

export class AnalysisEngine {
  private csvParser: CSVParser;
  private metricsCalculator: MetricsCalculator;
  private contentAnalyzer: ContentAnalyzer;

  constructor() {
    this.csvParser = new CSVParser();
    this.metricsCalculator = new MetricsCalculator();
    this.contentAnalyzer = new ContentAnalyzer();
  }

  async analyzeTwitterData(csvPath: string): Promise<AnalysisResult> {
    const tweets = await this.csvParser.parseTweetsFromCSV(csvPath);
    const analysis = this.metricsCalculator.analyzePerformance(tweets);
    
    // Enhance with content analysis
    const enhancedTopPosts = analysis.topPosts.map(tweet => ({
      ...tweet,
      contentAnalysis: this.contentAnalyzer.analyzeContent(tweet),
    }));

    // Extract style elements from top performers
    const styleElements = this.contentAnalyzer.extractStyleElements(analysis.topPosts);
    
    return {
      ...analysis,
      styleElements,
    } as any;
  }

  async getViralFormula(csvPath: string): Promise<{
    formula: string;
    components: string[];
    examples: string[];
  }> {
    const tweets = await this.csvParser.parseTweetsFromCSV(csvPath);
    const segments = this.metricsCalculator.segmentByPerformance(tweets);
    
    const viralTweets = segments.viral;
    const viralPatterns = this.identifyViralPatterns(viralTweets);
    
    return {
      formula: this.generateFormula(viralPatterns),
      components: viralPatterns,
      examples: viralTweets.slice(0, 5).map(t => t.text),
    };
  }

  private identifyViralPatterns(tweets: Tweet[]): string[] {
    const patterns: string[] = [];
    
    // Check for reply dominance
    const replyCount = tweets.filter(t => t.text.startsWith('@')).length;
    if (replyCount / tweets.length > 0.7) {
      patterns.push('Reply to popular accounts');
    }
    
    // Check for controversial language
    const controversialWords = ['absurd', 'ridiculous', 'moron', 'stupid', 'wild'];
    const hasControversy = tweets.some(t => 
      controversialWords.some(word => t.text.toLowerCase().includes(word))
    );
    if (hasControversy) {
      patterns.push('Controversial/strong opinions');
    }
    
    // Check average length
    const avgLength = tweets.reduce((sum, t) => sum + t.text.length, 0) / tweets.length;
    if (avgLength >= 200 && avgLength <= 280) {
      patterns.push(`Optimal length (${Math.round(avgLength)} chars)`);
    }
    
    return patterns;
  }

  private generateFormula(patterns: string[]): string {
    return patterns.join(' + ') + ' = Viral Content';
  }
}