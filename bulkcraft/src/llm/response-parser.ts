import { 
  GeneratedContent, 
  ResearchResult, 
  TrendingTopic, 
  CompetitorInsight,
  ViralPattern 
} from '../types';

export class ResponseParser {
  parseGeneratedContent(response: string): GeneratedContent {
    // Basic parsing - can be enhanced with more structured prompts
    const lines = response.split('\n').filter(l => l.trim());
    
    // Extract the main content (usually first line or paragraph)
    const text = this.extractTweetText(response);
    
    // Try to extract confidence and reasoning if provided
    const confidence = this.extractConfidence(response);
    const reasoning = this.extractReasoning(response);
    const alternatives = this.extractAlternatives(response);
    
    return {
      text,
      estimatedEngagement: confidence * 100, // Simple conversion
      confidence,
      reasoning,
      alternatives,
    };
  }

  parseResearchResult(response: string): ResearchResult {
    const sections = this.splitIntoSections(response);
    
    return {
      trendingTopics: this.extractTrendingTopics(sections),
      competitorInsights: this.extractCompetitorInsights(sections),
      viralPatterns: this.extractViralPatterns(sections),
      recommendations: this.extractRecommendations(sections),
    };
  }

  parseMultipleContents(response: string): GeneratedContent[] {
    const contents: GeneratedContent[] = [];
    
    // Split by numbered items or clear separators
    const items = response.split(/\n\d+\.|---|\n\n/).filter(item => item.trim());
    
    items.forEach(item => {
      if (this.looksLikeTweet(item)) {
        contents.push(this.parseGeneratedContent(item));
      }
    });
    
    return contents;
  }

  extractTweetText(response: string): string {
    // Look for quoted text first (but ensure it's substantial)
    const quotedMatch = response.match(/"([^"]+)"/);
    if (quotedMatch && quotedMatch[1].length > 30) return quotedMatch[1];
    
    // Look for text after "Tweet:" or similar markers
    const markerMatch = response.match(/(?:Tweet|Post|Content):\s*(.+)/si);
    if (markerMatch && markerMatch[1].trim().length > 30) return markerMatch[1].trim();
    
    // Return first substantial line
    const lines = response.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      // Skip short lines, headers, and metadata
      if (trimmed.length > 50 && 
          !trimmed.includes(':') && 
          !trimmed.match(/^(Variation|Option|\d+\.|Tweet #)/i)) {
        return trimmed;
      }
    }
    
    // If still nothing, try to extract any sentence longer than 50 chars
    const fullText = response.replace(/\n/g, ' ').trim();
    const sentences = fullText.match(/[^.!?]+[.!?]+/g) || [];
    for (const sentence of sentences) {
      if (sentence.trim().length > 50) {
        return sentence.trim();
      }
    }
    
    // Last resort - return cleaned response if it's substantial
    if (fullText.length > 50) {
      return fullText.substring(0, 280);
    }
    
    return ''; // Return empty for failed generations
  }

  private extractConfidence(response: string): number {
    const match = response.match(/confidence[:\s]+(\d+(?:\.\d+)?)/i);
    if (match) {
      return parseFloat(match[1]) / (match[1].includes('.') ? 1 : 100);
    }
    
    // Look for score
    const scoreMatch = response.match(/score[:\s]+(\d+)/i);
    if (scoreMatch) {
      return parseInt(scoreMatch[1]) / 10;
    }
    
    return 0.7; // Default confidence
  }

  private extractReasoning(response: string): string {
    const match = response.match(/(?:reasoning|explanation|why)[:\s]+(.+)/i);
    if (match) return match[1].trim();
    
    // Look for explanation paragraph
    const lines = response.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].toLowerCase().includes('because') || 
          lines[i].toLowerCase().includes('this works')) {
        return lines[i].trim();
      }
    }
    
    return 'Optimized for engagement based on analysis patterns';
  }

  private extractAlternatives(response: string): string[] {
    const alternatives: string[] = [];
    
    // Look for numbered alternatives
    const altMatches = response.matchAll(/(?:alternative|variation)\s*\d*[:\s]+["']?([^"'\n]+)/gi);
    for (const match of altMatches) {
      alternatives.push(match[1].trim());
    }
    
    return alternatives;
  }

  private splitIntoSections(response: string): Map<string, string> {
    const sections = new Map<string, string>();
    const lines = response.split('\n');
    
    let currentSection = 'main';
    let currentContent: string[] = [];
    
    for (const line of lines) {
      // Check if this is a section header
      if (line.match(/^\d+\.|^#+|^[A-Z][^:]+:/)) {
        if (currentContent.length > 0) {
          sections.set(currentSection, currentContent.join('\n'));
        }
        currentSection = line.replace(/[:#\d.]/g, '').trim().toLowerCase();
        currentContent = [];
      } else {
        currentContent.push(line);
      }
    }
    
    if (currentContent.length > 0) {
      sections.set(currentSection, currentContent.join('\n'));
    }
    
    return sections;
  }

  private extractTrendingTopics(sections: Map<string, string>): TrendingTopic[] {
    const topics: TrendingTopic[] = [];
    const relevant = sections.get('trending') || sections.get('topics') || sections.get('main') || '';
    
    // Simple extraction - can be enhanced
    const lines = relevant.split('\n').filter(l => l.trim());
    lines.forEach(line => {
      if (line.includes('-') || line.match(/^\d/)) {
        topics.push({
          topic: line.replace(/^[-\d.\s]+/, '').split(/[,:(]/)[0].trim(),
          volume: Math.floor(Math.random() * 100000), // Would need real data
          growth: Math.random() * 100,
          sentiment: 'neutral',
          examples: [],
        });
      }
    });
    
    return topics;
  }

  private extractCompetitorInsights(sections: Map<string, string>): CompetitorInsight[] {
    // Simplified - would need more sophisticated parsing
    return [];
  }

  private extractViralPatterns(sections: Map<string, string>): ViralPattern[] {
    const patterns: ViralPattern[] = [];
    const relevant = sections.get('patterns') || sections.get('viral') || '';
    
    const lines = relevant.split('\n').filter(l => l.trim());
    lines.forEach(line => {
      if (line.length > 10) {
        patterns.push({
          type: 'general',
          description: line.trim(),
          psychologicalTrigger: 'engagement',
          effectiveness: 0.7,
          examples: [],
        });
      }
    });
    
    return patterns;
  }

  private extractRecommendations(sections: Map<string, string>): string[] {
    const recommendations: string[] = [];
    const relevant = sections.get('recommendations') || sections.get('suggestions') || '';
    
    const lines = relevant.split('\n').filter(l => l.trim());
    lines.forEach(line => {
      if (line.trim().length > 10) {
        recommendations.push(line.trim());
      }
    });
    
    return recommendations;
  }

  private looksLikeTweet(text: string): boolean {
    const trimmed = text.trim();
    return trimmed.length > 10 && 
           trimmed.length < 500 && 
           !trimmed.includes('```') &&
           !trimmed.startsWith('#');
  }
}