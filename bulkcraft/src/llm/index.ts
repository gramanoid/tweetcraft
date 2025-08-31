export { OpenRouterClient, ChatMessage, CompletionOptions } from './openrouter-client';
export { PromptTemplates } from './prompt-templates';
export { ResponseParser } from './response-parser';

import { OpenRouterClient } from './openrouter-client';
import { PromptTemplates } from './prompt-templates';
import { ResponseParser } from './response-parser';
import { 
  GenerationOptions, 
  ControlSettings, 
  GeneratedContent,
  ResearchResult,
  AnalysisResult 
} from '../types';

export class LLMService {
  private client: OpenRouterClient;
  private parser: ResponseParser;

  constructor() {
    this.client = new OpenRouterClient();
    this.parser = new ResponseParser();
  }

  async generateContent(
    options: GenerationOptions,
    controls: ControlSettings = {},
    context?: AnalysisResult
  ): Promise<GeneratedContent> {
    const prompt = PromptTemplates.contentGeneration(options, controls, context);
    const response = await this.client.generateWithRetry(prompt);
    return this.parser.parseGeneratedContent(response);
  }

  async generateVariations(
    baseContent: string,
    count: number = 3
  ): Promise<GeneratedContent[]> {
    const prompt = PromptTemplates.contentVariations(baseContent, count);
    const response = await this.client.generateWithRetry(prompt);
    return this.parser.parseMultipleContents(response);
  }

  async researchTrends(topic: string, depth: number = 10): Promise<ResearchResult> {
    const prompt = PromptTemplates.trendResearch(topic, depth);
    const response = await this.client.research(prompt);
    return this.parser.parseResearchResult(response);
  }

  async analyzeCompetitor(account: string, depth: number = 50): Promise<ResearchResult> {
    const prompt = PromptTemplates.competitorAnalysis(account, depth);
    const response = await this.client.research(prompt);
    return this.parser.parseResearchResult(response);
  }

  async generateWithPsychology(
    trigger: string,
    audience: string,
    options: GenerationOptions
  ): Promise<GeneratedContent> {
    const strategyPrompt = PromptTemplates.psychologyStrategy(trigger, audience);
    const strategy = await this.client.generateWithRetry(strategyPrompt);
    
    // Use strategy as context for generation
    const enhancedPrompt = `${PromptTemplates.contentGeneration(options, {}, undefined)}
    
Apply this psychological strategy:
${strategy}`;
    
    const response = await this.client.generateWithRetry(enhancedPrompt);
    return this.parser.parseGeneratedContent(response);
  }

  async predictVirality(content: string): Promise<{
    score: number;
    analysis: string;
    improvements: string[];
  }> {
    const prompt = PromptTemplates.viralPrediction(content);
    const response = await this.client.generateWithRetry(prompt);
    
    // Parse prediction response
    const scoreMatch = response.match(/score[:\s]+(\d+)/i);
    const score = scoreMatch ? parseInt(scoreMatch[1]) : 5;
    
    const improvements = response
      .split('\n')
      .filter(line => line.includes('improve') || line.includes('suggest'))
      .map(line => line.trim());
    
    return {
      score,
      analysis: response,
      improvements,
    };
  }

  async adjustTone(
    content: string,
    fromTone: string,
    toTone: string
  ): Promise<string> {
    const prompt = PromptTemplates.toneAdjustment(content, fromTone, toTone);
    const response = await this.client.generateWithRetry(prompt);
    return this.parser.extractTweetText(response);
  }

  async generateHooks(topic: string, style: string): Promise<string[]> {
    const prompt = PromptTemplates.hookGeneration(topic, style);
    const response = await this.client.generateWithRetry(prompt);
    
    return response
      .split('\n')
      .filter(line => line.trim())
      .map(line => line.replace(/^[-\d.\s]+/, '').split('-')[0].trim())
      .filter(hook => hook.length > 5 && hook.length < 100);
  }

  async testConnection(): Promise<boolean> {
    return this.client.testConnection();
  }
}