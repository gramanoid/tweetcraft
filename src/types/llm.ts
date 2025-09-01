/**
 * Type definitions for LLM analysis results
 */

export interface LLMAnalysisResult {
  sentiment?: 'positive' | 'negative' | 'neutral' | 'controversial';
  intent?: 'question' | 'opinion' | 'announcement' | 'problem' | 'achievement' | 'humor' | 'debate';
  suggestedCategories?: string[];
  suggestedTones?: string[];
  topics?: string[];
  score?: number;
  reasons?: string[];
  tokensUsed?: number;
  metadata?: Record<string, any>;
}