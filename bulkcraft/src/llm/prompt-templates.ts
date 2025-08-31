import { GenerationOptions, ControlSettings, AnalysisResult } from '../types';

export class PromptTemplates {
  static contentGeneration(
    options: GenerationOptions,
    controls: ControlSettings,
    context?: AnalysisResult
  ): string {
    let prompt = `Generate a complete viral Twitter post. Output ONLY the tweet text, nothing else.\n\n`;
    
    prompt += `Requirements:\n`;
    
    if (options.style) {
      prompt += `- Style: ${options.style}\n`;
    }
    if (options.tone) {
      prompt += `- Tone: ${options.tone}\n`;
    }
    if (options.topic) {
      prompt += `- Topic: ${options.topic}\n`;
    }
    if (options.length) {
      prompt += `- Target length: ${options.length} characters (must be at least 50 chars)\n`;
    }
    if (options.replyTo) {
      prompt += `- This is a reply to: "${options.replyTo}"\n`;
    }
    
    if (controls.minLength || controls.maxLength) {
      prompt += `- Length MUST be between ${controls.minLength || 50}-${controls.maxLength || 280} characters\n`;
    }
    if (controls.requiredKeywords?.length) {
      prompt += `- Must include keywords: ${controls.requiredKeywords.join(', ')}\n`;
    }
    if (controls.bannedWords?.length) {
      prompt += `- Must NOT include: ${controls.bannedWords.join(', ')}\n`;
    }
    
    if (context) {
      prompt += `\nProven viral patterns:\n`;
      prompt += `- Optimal length: ${context.optimalLength} characters\n`;
      prompt += `- Best topics: ${context.bestPerformingTopics.join(', ')}\n`;
      prompt += `- Winning patterns: ${context.contentPatterns.map(p => p.pattern).join(', ')}\n`;
    }
    
    prompt += `\nCRITICAL: Generate ONLY the complete tweet text. No explanations, no metadata. The tweet must be a complete thought, minimum 50 characters.`;
    
    return prompt;
  }

  static trendResearch(topic: string, depth: number = 10): string {
    return `Research current viral trends related to "${topic}". 
    
Provide:
1. Top ${depth} trending subtopics or angles
2. Recent viral posts or discussions
3. Common sentiment and emotional triggers
4. Controversial or debate-worthy aspects
5. Timing relevance (why this topic is hot now)

Format as structured data with examples.`;
  }

  static competitorAnalysis(account: string, depth: number = 50): string {
    return `Analyze the Twitter account @${account} based on their recent ${depth} posts.
    
Identify:
1. Most successful content themes
2. Posting patterns and frequency
3. Engagement tactics they use
4. Language style and tone
5. Types of posts that get highest engagement
6. Unique angles or perspectives they take

Provide specific examples and patterns.`;
  }

  static psychologyStrategy(trigger: string, audience: string): string {
    return `Design a content strategy using the psychological trigger "${trigger}" for the "${audience}" audience.
    
Include:
1. How this trigger works psychologically
2. Specific implementation tactics for Twitter
3. Example phrases and structures
4. Potential risks or backlash to avoid
5. Complementary triggers that enhance effectiveness

Provide actionable guidelines with examples.`;
  }

  static viralPrediction(content: string): string {
    return `Analyze this tweet for viral potential:
    
"${content}"

Evaluate:
1. Engagement likelihood (1-10 score)
2. Potential reach multiplier
3. Emotional triggers present
4. Shareability factors
5. Potential improvements
6. Risk factors or potential backlash

Provide specific reasoning for each assessment.`;
  }

  static contentVariations(
    baseContent: string,
    numberOfVariations: number = 3
  ): string {
    return `Create ${numberOfVariations} variations of this tweet, each optimized for different engagement goals:
    
Original: "${baseContent}"

For each variation, specify:
1. The optimization goal (likes, replies, shares, etc.)
2. What changes were made and why
3. Expected performance difference

Maintain the core message while varying style, tone, and structure.`;
  }

  static toneAdjustment(
    content: string,
    fromTone: string,
    toTone: string
  ): string {
    return `Adjust the tone of this content from ${fromTone} to ${toTone}:
    
"${content}"

Requirements:
1. Maintain the core message and information
2. Adjust language, punctuation, and style to match ${toTone} tone
3. Keep within similar character count
4. Preserve any essential keywords or mentions

Provide the adjusted version with explanation of changes.`;
  }

  static hookGeneration(topic: string, style: string): string {
    return `Generate 5 powerful opening hooks for tweets about "${topic}" in a ${style} style.
    
Each hook should:
1. Be under 50 characters
2. Create immediate curiosity or emotional response
3. Work well for the Twitter algorithm
4. Lead naturally into the main content

Format: [Hook] - [Why it works]`;
  }
}