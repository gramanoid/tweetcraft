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
  // Removed orphaned message types that have no handlers:
  // IMAGE_SEARCH_PERPLEXITY, IMAGE_EXTRACT_CONTEXT, IMAGE_GENERATE_PROMPT
  GET_WEEKLY_SUMMARY = 'GET_WEEKLY_SUMMARY',
  GET_TIME_RECOMMENDATIONS = 'GET_TIME_RECOMMENDATIONS',
  // Arsenal-related messages
  GET_ARSENAL_REPLIES = 'GET_ARSENAL_REPLIES',
  SAVE_ARSENAL_REPLY = 'SAVE_ARSENAL_REPLY',
  TRACK_ARSENAL_USAGE = 'TRACK_ARSENAL_USAGE',
  TOGGLE_ARSENAL_FAVORITE = 'TOGGLE_ARSENAL_FAVORITE',
  DELETE_ARSENAL_REPLIES = 'DELETE_ARSENAL_REPLIES',
  // Compose-related messages
  COMPOSE_TWEET = 'COMPOSE_TWEET',
  // Suggestions
  GET_SUGGESTIONS = 'GET_SUGGESTIONS'
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
  tweetText?: string;
  context?: any;
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
  weekOffset?: number; // 0 = current week, -1 = last week, -2 = two weeks ago, etc.
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

// Removed orphaned message interfaces:
// ImageSearchPerplexityMessage, ImageExtractContextMessage, ImageGeneratePromptMessage

// Arsenal-related messages
export interface GetArsenalRepliesMessage extends BaseMessage {
  type: MessageType.GET_ARSENAL_REPLIES;
  filters?: {
    category?: string;
    searchTerm?: string;
    limit?: number;
  };
}

export interface SaveArsenalReplyMessage extends BaseMessage {
  type: MessageType.SAVE_ARSENAL_REPLY;
  reply: {
    text: string;
    category: string;
    metadata?: any;
  };
}

export interface TrackArsenalUsageMessage extends BaseMessage {
  type: MessageType.TRACK_ARSENAL_USAGE;
  replyId: string;
}

export interface ToggleArsenalFavoriteMessage extends BaseMessage {
  type: MessageType.TOGGLE_ARSENAL_FAVORITE;
  replyId: string;
  isFavorite: boolean;
}

export interface DeleteArsenalRepliesMessage extends BaseMessage {
  type: MessageType.DELETE_ARSENAL_REPLIES;
  replyIds: string[];
}

// Compose-related messages
export interface ComposeTweetMessage extends BaseMessage {
  type: MessageType.COMPOSE_TWEET;
  config: {
    topic?: string;
    style?: string;
    tone?: string;
    draft?: string;
    type: 'generate' | 'enhance' | 'suggest';
  };
}

// Suggestions message
export interface GetSuggestionsMessage extends BaseMessage {
  type: MessageType.GET_SUGGESTIONS;
  context: any;
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
  | GetTimeRecommendationsMessage
  | GetArsenalRepliesMessage
  | SaveArsenalReplyMessage
  | TrackArsenalUsageMessage
  | ToggleArsenalFavoriteMessage
  | DeleteArsenalRepliesMessage
  | ComposeTweetMessage
  | GetSuggestionsMessage;

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

// Arsenal message type guards
export function isGetArsenalRepliesMessage(msg: any): msg is GetArsenalRepliesMessage {
  return msg?.type === MessageType.GET_ARSENAL_REPLIES;
}

export function isSaveArsenalReplyMessage(msg: any): msg is SaveArsenalReplyMessage {
  return msg?.type === MessageType.SAVE_ARSENAL_REPLY && 
         msg?.reply !== undefined;
}

export function isTrackArsenalUsageMessage(msg: any): msg is TrackArsenalUsageMessage {
  return msg?.type === MessageType.TRACK_ARSENAL_USAGE && typeof msg?.replyId === 'string';
}

export function isToggleArsenalFavoriteMessage(msg: any): msg is ToggleArsenalFavoriteMessage {
  return msg?.type === MessageType.TOGGLE_ARSENAL_FAVORITE && 
         typeof msg?.replyId === 'string' && 
         typeof msg?.isFavorite === 'boolean';
}

export function isDeleteArsenalRepliesMessage(msg: any): msg is DeleteArsenalRepliesMessage {
  return msg?.type === MessageType.DELETE_ARSENAL_REPLIES && Array.isArray(msg?.replyIds);
}

// Compose and suggestions type guards
export function isComposeTweetMessage(msg: any): msg is ComposeTweetMessage {
  return msg?.type === MessageType.COMPOSE_TWEET && 
         msg?.config !== undefined;
}

export function isGetSuggestionsMessage(msg: any): msg is GetSuggestionsMessage {
  return msg?.type === MessageType.GET_SUGGESTIONS && 
         msg?.context !== undefined;
}

// Response types
export interface MessageResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: any;
}
