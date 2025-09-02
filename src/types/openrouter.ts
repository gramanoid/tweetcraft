/**
 * Type definitions for OpenRouter API responses
 */

export interface OpenRouterModel {
  id: string;
  name: string;
  description?: string;
  context_length: number;
  pricing: {
    prompt: number;
    completion: number;
    request?: number;
    image?: number;
  };
  top_provider?: {
    context_length?: number;
    max_completion_tokens?: number;
    is_moderated?: boolean;
  };
  per_request_limits?: {
    prompt_tokens?: number;
    completion_tokens?: number;
  };
  created?: number;
  architecture?: {
    modality?: string;
    tokenizer?: string;
    instruct_type?: string;
  };
}

export interface FetchModelsResponse {
  success: boolean;
  data?: OpenRouterModel[];
  error?: string;
}

export interface OpenRouterChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OpenRouterChatRequest {
  model: string;
  messages: OpenRouterChatMessage[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  repetition_penalty?: number;
  stop?: string[];
  stream?: boolean;
}

export interface OpenRouterChatResponse {
  id: string;
  model: string;
  object: string;
  created: number;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  system_fingerprint?: string;
}

export interface OpenRouterError {
  error: {
    message: string;
    type?: string;
    code?: string | number;
    param?: string;
  };
}

export interface TestApiKeyResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export interface GenerateReplyRequest {
  type: 'GENERATE_REPLY';
  tweetText: string;
  tone?: string;
  template?: string;
  customPrompt?: string;
  personality?: string;
  vocabulary?: string;
  rhetoric?: string;
  lengthPacing?: string;
  temperature?: number;
}

export interface GenerateReplyResponse {
  success: boolean;
  reply?: string;
  error?: string;
  cached?: boolean;
}

export interface GenerateImageRequest {
  type: 'GENERATE_IMAGE';
  prompt: string;
  style?: 'realistic' | 'cartoon' | 'artistic' | 'sketch';
}

export interface GenerateImageResponse {
  success: boolean;
  imageUrl?: string;
  altText?: string;
  error?: string;
}

export interface ExtensionMessage {
  type: string;
  [key: string]: any;
}

export interface StorageData {
  smartReply_apiKey?: string;
  smartReply_encryptedApiKey?: string;
  smartReply_migrationCompleted?: boolean;
  smartReply_selectedModel?: string;
  smartReply_lastTone?: string;
  smartReply_config?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  };
  [key: string]: any;
}