export interface AppConfig {
  apiKey: string;
  model: string;
  systemPrompt: string;
  customStylePrompt?: string; // New: Custom style prompt for how tweets should be written
  contextMode?: 'none' | 'single' | 'thread';
  tonePresets: TonePreset[];
  customTones?: TonePreset[]; // New: User-created custom tones
  temperature?: number;
  defaultTone?: string;
  replyLengthDefault?: 'short' | 'medium' | 'long'; // New: Default reply length
}

export interface TonePreset {
  id: string;
  name: string;
  description: string;
  promptModifier: string;
  emoji: string;
}

export interface ReplyGenerationRequest {
  originalTweet?: string;
  tone?: string;
  customPrompt?: string;
  model?: string;
  replyLength?: 'short' | 'medium' | 'long'; // New: Reply length preset
  isRewriteMode?: boolean; // New: Whether to rewrite existing text
  existingText?: string; // New: The text to rewrite
  selections?: { // New: Five-step selections
    personaFraming: string | null;
    attitude: string | null;
    rhetoric: string | null;
    vocabulary: string | null;
    formatPacing: string | null;
  };
}

export interface ReplyGenerationResponse {
  success: boolean;
  reply?: string;
  error?: string;
}

export interface ThreadTweet {
  author: string;
  text: string;
}

export interface TwitterContext {
  tweetText?: string;
  authorHandle?: string;
  tweetId?: string;
  isReply: boolean;
  threadContext?: ThreadTweet[];
}

export interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OpenRouterRequest {
  model: string;
  messages: OpenRouterMessage[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
}

export interface OpenRouterResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export const DEFAULT_TONE_PRESETS: TonePreset[] = [
  {
    id: 'professional',
    name: 'Professional',
    description: 'Formal and business-appropriate',
    promptModifier: 'Write in a professional, respectful tone suitable for business networking.',
    emoji: '💼'
  },
  {
    id: 'casual',
    name: 'Casual',
    description: 'Friendly and conversational',
    promptModifier: 'Write in a casual, friendly tone as if talking to a friend.',
    emoji: '😊'
  },
  {
    id: 'witty',
    name: 'Witty',
    description: 'Clever and humorous',
    promptModifier: 'Write with wit and humor, being clever but not offensive.',
    emoji: '😏'
  },
  {
    id: 'supportive',
    name: 'Supportive',
    description: 'Encouraging and empathetic',
    promptModifier: 'Write in an encouraging, supportive tone that shows empathy.',
    emoji: '🤝'
  },
  {
    id: 'contrarian',
    name: 'Contrarian',
    description: 'Thoughtful disagreement',
    promptModifier: 'Respectfully challenge the point with a different perspective, staying constructive.',
    emoji: '🤔'
  }
];

export const DEFAULT_CONFIG: Partial<AppConfig> = {
  model: 'openai/gpt-4o',
  systemPrompt: 'You are a helpful social media user who writes engaging, authentic replies to tweets. Keep responses concise and natural.',
  contextMode: 'thread',
  tonePresets: DEFAULT_TONE_PRESETS
};