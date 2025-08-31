export interface Tweet {
  id: string;
  date: Date;
  text: string;
  link: string;
  impressions: number;
  likes: number;
  engagements: number;
  bookmarks: number;
  shares: number;
  newFollows: number;
  replies: number;
  reposts: number;
  profileVisits: number;
  detailExpands: number;
  urlClicks: number;
  hashtagClicks: number;
  permalinkClicks: number;
}

export interface AnalysisResult {
  topPosts: Tweet[];
  averageEngagementRate: number;
  bestPerformingTopics: string[];
  optimalLength: number;
  bestPostingTimes: string[];
  contentPatterns: ContentPattern[];
}

export interface ContentPattern {
  pattern: string;
  frequency: number;
  averageEngagement: number;
  examples: string[];
}

export interface GenerationOptions {
  style?: 'confrontational' | 'supportive' | 'humorous' | 'professional' | 'casual';
  tone?: 'aggressive' | 'friendly' | 'neutral' | 'sarcastic' | 'authoritative';
  length?: number;
  topic?: string;
  replyTo?: string;
  includeHashtags?: boolean;
  includeEmojis?: boolean;
}

export interface GeneratedContent {
  text: string;
  estimatedEngagement: number;
  confidence: number;
  reasoning: string;
  alternatives?: string[];
}

export interface ResearchResult {
  trendingTopics: TrendingTopic[];
  competitorInsights: CompetitorInsight[];
  viralPatterns: ViralPattern[];
  recommendations: string[];
}

export interface TrendingTopic {
  topic: string;
  volume: number;
  growth: number;
  sentiment: 'positive' | 'negative' | 'neutral';
  examples: string[];
}

export interface CompetitorInsight {
  account: string;
  topContent: string[];
  engagementRate: number;
  postingFrequency: number;
  successPatterns: string[];
}

export interface ViralPattern {
  type: string;
  description: string;
  psychologicalTrigger: string;
  effectiveness: number;
  examples: string[];
}

export interface ControlSettings {
  minLength?: number;
  maxLength?: number;
  requiredKeywords?: string[];
  bannedWords?: string[];
  sentimentTarget?: 'positive' | 'negative' | 'neutral';
  readabilityLevel?: 'simple' | 'moderate' | 'complex';
}

export interface LLMProvider {
  name: string;
  generateContent(prompt: string, options?: any): Promise<string>;
  research(query: string): Promise<ResearchResult>;
}

export interface Plugin {
  name: string;
  version: string;
  hooks: {
    beforeGeneration?: (context: GenerationContext) => Promise<void>;
    afterGeneration?: (content: GeneratedContent[]) => Promise<GeneratedContent[]>;
    beforeAnalysis?: (data: Tweet[]) => Promise<void>;
    afterAnalysis?: (result: AnalysisResult) => Promise<AnalysisResult>;
  };
}

export interface GenerationContext {
  options: GenerationOptions;
  controls: ControlSettings;
  analysisData?: AnalysisResult;
  researchData?: ResearchResult;
}