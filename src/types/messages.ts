/**
 * Type-safe message definitions for Chrome extension message passing
 */

import { AppConfig, ReplyGenerationRequest, TwitterContext } from './index';

// Message types enum for type safety
export enum MessageType {
  PING = 'PING',
  EXA_SEARCH = 'EXA_SEARCH',
  GET_CONFIG = 'GET_CONFIG',
  SET_CONFIG = 'SET_CONFIG',
  GET_API_KEY = 'GET_API_KEY',
  SET_API_KEY = 'SET_API_KEY',
  VALIDATE_API_KEY = 'VALIDATE_API_KEY',
  CLEAR_DATA = 'CLEAR_DATA',
  GET_LAST_TONE = 'GET_LAST_TONE',
  SET_LAST_TONE = 'SET_LAST_TONE',
  GENERATE_REPLY = 'GENERATE_REPLY',
  GET_STORAGE = 'GET_STORAGE',
  SET_STORAGE = 'SET_STORAGE',
  TEST_API_KEY = 'TEST_API_KEY',
  FETCH_MODELS = 'FETCH_MODELS',
  RESET_USAGE_STATS = 'RESET_USAGE_STATS',
  ANALYZE_IMAGES = 'ANALYZE_IMAGES',
  FETCH_TRENDING_TOPICS = 'FETCH_TRENDING_TOPICS',
  SUGGEST_TEMPLATE = 'SUGGEST_TEMPLATE',
  GENERATE_IMAGE = 'GENERATE_IMAGE',
  ANALYZE_TWEET_LLM = 'ANALYZE_TWEET_LLM',
  IMAGE_SEARCH_PERPLEXITY = 'IMAGE_SEARCH_PERPLEXITY',
  IMAGE_EXTRACT_CONTEXT = 'IMAGE_EXTRACT_CONTEXT',
  IMAGE_GENERATE_PROMPT = 'IMAGE_GENERATE_PROMPT',
  GET_WEEKLY_SUMMARY = 'GET_WEEKLY_SUMMARY',
  GET_TIME_RECOMMENDATIONS = 'GET_TIME_RECOMMENDATIONS'
}

// Base message interface
interface BaseMessage {
  type: MessageType;
}

// Specific message types
export interface GetConfigMessage extends BaseMessage {
  type: MessageType.GET_CONFIG;
}

export interface SetConfigMessage extends BaseMessage {
  type: MessageType.SET_CONFIG;
  config: Partial<AppConfig>;
}

export interface GetApiKeyMessage extends BaseMessage {
  type: MessageType.GET_API_KEY;
}

export interface SetApiKeyMessage extends BaseMessage {
  type: MessageType.SET_API_KEY;
  apiKey: string;
}

export interface ValidateApiKeyMessage extends BaseMessage {
  type: MessageType.VALIDATE_API_KEY;
  apiKey?: string;
}

export interface ClearDataMessage extends BaseMessage {
  type: MessageType.CLEAR_DATA;
}

export interface GetLastToneMessage extends BaseMessage {
  type: MessageType.GET_LAST_TONE;
}

export interface SetLastToneMessage extends BaseMessage {
  type: MessageType.SET_LAST_TONE;
  tone: string;
}

export interface GenerateReplyMessage extends BaseMessage {
  type: MessageType.GENERATE_REPLY;
  request: ReplyGenerationRequest;
  context: TwitterContext;
}

export interface GetStorageMessage extends BaseMessage {
  type: MessageType.GET_STORAGE;
  keys: string | string[] | { [key: string]: any } | null;
}

export interface SetStorageMessage extends BaseMessage {
  type: MessageType.SET_STORAGE;
  data: { [key: string]: any };
}

export interface TestApiKeyMessage extends BaseMessage {
  type: MessageType.TEST_API_KEY;
  apiKey: string;
}

export interface FetchModelsMessage extends BaseMessage {
  type: MessageType.FETCH_MODELS;
}

export interface ResetUsageStatsMessage extends BaseMessage {
  type: MessageType.RESET_USAGE_STATS;
}

export interface AnalyzeImagesMessage extends BaseMessage {
  type: MessageType.ANALYZE_IMAGES;
  modelId: string;
  messages: any[];
}

export interface FetchTrendingTopicsMessage extends BaseMessage {
  type: MessageType.FETCH_TRENDING_TOPICS;
}

export interface SuggestTemplateMessage extends BaseMessage {
  type: MessageType.SUGGEST_TEMPLATE;
  tweetText: string;
  patterns?: any;
}

export interface GenerateImageMessage extends BaseMessage {
  type: MessageType.GENERATE_IMAGE;
  prompt: string;
  options?: any;
}

export interface AnalyzeTweetLLMMessage extends BaseMessage {
  type: MessageType.ANALYZE_TWEET_LLM;
  tweetText: string;
  context: any;
}

export interface GetWeeklySummaryMessage extends BaseMessage {
  type: MessageType.GET_WEEKLY_SUMMARY;
}

export interface GetTimeRecommendationsMessage extends BaseMessage {
  type: MessageType.GET_TIME_RECOMMENDATIONS;
}

export interface PingMessage extends BaseMessage {
  type: MessageType.PING;
}

export interface ExaSearchMessage extends BaseMessage {
  type: MessageType.EXA_SEARCH;
  query: string;
  options?: {
    numResults?: number;
    useAutoprompt?: boolean;
    type?: 'neural' | 'keyword';
  };
}

// Union type of all messages
export type ExtensionMessage = 
  | PingMessage
  | ExaSearchMessage
  | GetConfigMessage
  | SetConfigMessage
  | GetApiKeyMessage
  | SetApiKeyMessage
  | ValidateApiKeyMessage
  | ClearDataMessage
  | GetLastToneMessage
  | SetLastToneMessage
  | GenerateReplyMessage
  | GetStorageMessage
  | SetStorageMessage
  | TestApiKeyMessage
  | FetchModelsMessage
  | ResetUsageStatsMessage
  | AnalyzeImagesMessage
  | FetchTrendingTopicsMessage
  | SuggestTemplateMessage
  | GenerateImageMessage
  | AnalyzeTweetLLMMessage
  | GetWeeklySummaryMessage
  | GetTimeRecommendationsMessage;

// Type guard functions
export function isGetConfigMessage(msg: any): msg is GetConfigMessage {
  return msg?.type === MessageType.GET_CONFIG;
}

export function isSetConfigMessage(msg: any): msg is SetConfigMessage {
  return msg?.type === MessageType.SET_CONFIG && msg?.config !== undefined;
}

export function isGetApiKeyMessage(msg: any): msg is GetApiKeyMessage {
  return msg?.type === MessageType.GET_API_KEY;
}

export function isSetApiKeyMessage(msg: any): msg is SetApiKeyMessage {
  return msg?.type === MessageType.SET_API_KEY && typeof msg?.apiKey === 'string';
}

export function isValidateApiKeyMessage(msg: any): msg is ValidateApiKeyMessage {
  return msg?.type === MessageType.VALIDATE_API_KEY;
}

export function isClearDataMessage(msg: any): msg is ClearDataMessage {
  return msg?.type === MessageType.CLEAR_DATA;
}

export function isGetLastToneMessage(msg: any): msg is GetLastToneMessage {
  return msg?.type === MessageType.GET_LAST_TONE;
}

export function isSetLastToneMessage(msg: any): msg is SetLastToneMessage {
  return msg?.type === MessageType.SET_LAST_TONE && typeof msg?.tone === 'string';
}

export function isGenerateReplyMessage(msg: any): msg is GenerateReplyMessage {
  return msg?.type === MessageType.GENERATE_REPLY && 
         msg?.request !== undefined && 
         msg?.context !== undefined;
}

export function isGetStorageMessage(msg: any): msg is GetStorageMessage {
  return msg?.type === MessageType.GET_STORAGE;
}

export function isSetStorageMessage(msg: any): msg is SetStorageMessage {
  return msg?.type === MessageType.SET_STORAGE && msg?.data !== undefined;
}

export function isTestApiKeyMessage(msg: any): msg is TestApiKeyMessage {
  return msg?.type === MessageType.TEST_API_KEY && typeof msg?.apiKey === 'string';
}

export function isFetchModelsMessage(msg: any): msg is FetchModelsMessage {
  return msg?.type === MessageType.FETCH_MODELS;
}

export function isResetUsageStatsMessage(msg: any): msg is ResetUsageStatsMessage {
  return msg?.type === MessageType.RESET_USAGE_STATS;
}

export function isAnalyzeImagesMessage(msg: any): msg is AnalyzeImagesMessage {
  return msg?.type === MessageType.ANALYZE_IMAGES && 
         typeof msg?.modelId === 'string' && 
         Array.isArray(msg?.messages);
}

export function isFetchTrendingTopicsMessage(msg: any): msg is FetchTrendingTopicsMessage {
  return msg?.type === MessageType.FETCH_TRENDING_TOPICS;
}

export function isSuggestTemplateMessage(msg: any): msg is SuggestTemplateMessage {
  return msg?.type === MessageType.SUGGEST_TEMPLATE && 
         typeof msg?.tweetText === 'string';
}

export function isGenerateImageMessage(msg: any): msg is GenerateImageMessage {
  return msg?.type === MessageType.GENERATE_IMAGE && 
         typeof msg?.prompt === 'string';
}

export function isAnalyzeTweetLLMMessage(msg: any): msg is AnalyzeTweetLLMMessage {
  return msg?.type === MessageType.ANALYZE_TWEET_LLM && 
         typeof msg?.tweetText === 'string' &&
         msg?.context !== undefined;
}

export function isGetWeeklySummaryMessage(msg: any): msg is GetWeeklySummaryMessage {
  return msg?.type === MessageType.GET_WEEKLY_SUMMARY;
}

export function isGetTimeRecommendationsMessage(msg: any): msg is GetTimeRecommendationsMessage {
  return msg?.type === MessageType.GET_TIME_RECOMMENDATIONS;
}

export function isPingMessage(msg: any): msg is PingMessage {
  return msg?.type === MessageType.PING;
}

export function isExaSearchMessage(msg: any): msg is ExaSearchMessage {
  return msg?.type === MessageType.EXA_SEARCH && typeof msg?.query === 'string';
}

// Response types
export interface MessageResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: any;
}
