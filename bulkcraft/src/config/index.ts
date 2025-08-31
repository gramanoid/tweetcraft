import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const configSchema = z.object({
  openrouter: z.object({
    apiKey: z.string().min(1),
    baseUrl: z.string().url(),
  }),
  models: z.object({
    default: z.string(),
    research: z.string(),
  }),
  generation: z.object({
    temperature: z.number().min(0).max(2),
    maxTokens: z.number().positive(),
    maxRetries: z.number().positive(),
  }),
  platform: z.object({
    defaultMaxLength: z.number().positive(),
    defaultPlatform: z.string(),
  }),
  research: z.object({
    trendSearchDepth: z.number().positive(),
    competitorAnalysisDepth: z.number().positive(),
  }),
  rateLimit: z.object({
    requestsPerMinute: z.number().positive(),
  }),
});

export const config = configSchema.parse({
  openrouter: {
    apiKey: process.env.OPENROUTER_API_KEY || '',
    baseUrl: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
  },
  models: {
    default: process.env.DEFAULT_MODEL || 'anthropic/claude-3.5-sonnet',
    research: process.env.RESEARCH_MODEL || 'perplexity/llama-3-sonar-large-32k-online',
  },
  generation: {
    temperature: parseFloat(process.env.DEFAULT_TEMPERATURE || '0.7'),
    maxTokens: parseInt(process.env.MAX_TOKENS || '500'),
    maxRetries: parseInt(process.env.MAX_RETRIES || '3'),
  },
  platform: {
    defaultMaxLength: parseInt(process.env.DEFAULT_MAX_LENGTH || '280'),
    defaultPlatform: process.env.DEFAULT_PLATFORM || 'twitter',
  },
  research: {
    trendSearchDepth: parseInt(process.env.TREND_SEARCH_DEPTH || '10'),
    competitorAnalysisDepth: parseInt(process.env.COMPETITOR_ANALYSIS_DEPTH || '50'),
  },
  rateLimit: {
    requestsPerMinute: parseInt(process.env.REQUESTS_PER_MINUTE || '20'),
  },
});

export type Config = z.infer<typeof configSchema>;