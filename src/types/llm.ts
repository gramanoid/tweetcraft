/**
 * Type definitions for LLM analysis results
 */

export interface LLMAnalysisResult {
  sentiment?: 'positive' | 'negative' | 'neutral' | 'controversial';
  intent?: 'question' | 'opinion' | 'announcement' | 'problem' | 'achievement' | 'humor' | 'debate';
  suggestedCategories?: string[];
  suggestedTones?: string[];
  topics?: string[];
  confidence?: number; // 0.0 to 1.0 confidence score
  reasoning?: string[]; // Step-by-step reasoning chain
  threadAnalysis?: {
    conversationStage?: 'opening' | 'middle' | 'heated' | 'resolution';
    threadSentiment?: 'escalating' | 'de-escalating' | 'neutral';
    participantCount?: number;
    threadLength?: number;
  };
  userContext?: {
    userType?: 'expert' | 'beginner' | 'influencer' | 'casual';
    engagementLevel?: 'high' | 'medium' | 'low';
    communicationStyle?: 'formal' | 'casual' | 'technical' | 'humorous';
  };
  score?: number;
  reasons?: string[];
  tokensUsed?: number;
  metadata?: Record<string, any>;
}