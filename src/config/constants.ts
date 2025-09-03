/**
 * Global constants for the TweetCraft extension
 * All magic numbers and configuration values should be defined here
 */

// Timing constants (in milliseconds)
export const TIMING = {
  // DOM and UI
  DOM_MUTATION_DEBOUNCE: 100,
  BUTTON_HOVER_DELAY: 200,
  POPUP_AUTO_CLOSE: 15000,
  POPUP_CLOSE_DELAY: 500,
  TOAST_DURATION: 3000,
  
  // Retry and polling
  INITIAL_RETRY_DELAY: 500,
  MAX_INITIAL_RETRIES: 10,
  RETRY_BACKOFF_MULTIPLIER: 1.5,
  MAX_RETRY_DELAY: 5000,
  CONNECTION_RETRY_DELAY: 1000,
  SERVICE_WORKER_RECONNECT_DELAY: 5000,
  
  // Navigation and loading
  NAVIGATION_INJECTION_DELAY: 800,
  MANUAL_SCAN_DELAY: 1000,
  VUE_COMPONENT_LOAD_DELAY: 2000,
  
  // Cleanup and maintenance
  CLEANUP_INTERVAL: 3000,
  STATE_EXPIRATION: 3600000, // 1 hour
  RECOVERY_CHECK_INTERVAL: 5000,
  RECOVERY_STATE_MAX_AGE: 120000, // 2 minutes
  
  // API and network
  MIN_REQUEST_INTERVAL: 100,
  BATCH_WINDOW: 50,
  API_TIMEOUT: 30000,
  CACHE_TTL: 3600000, // 1 hour
} as const;

// Size constants
export const SIZES = {
  // UI dimensions
  UNIFIED_SELECTOR_WIDTH: 560,
  UNIFIED_SELECTOR_HEIGHT: 420,
  UNIFIED_SELECTOR_MIN_WIDTH: 400,
  UNIFIED_SELECTOR_MAX_WIDTH: 600,
  UNIFIED_SELECTOR_MIN_HEIGHT: 300,
  UNIFIED_SELECTOR_MAX_HEIGHT: 600,
  
  // Mobile breakpoints
  MOBILE_BREAKPOINT: 768,
  TABLET_BREAKPOINT: 1024,
  
  // Text limits
  MAX_TWEET_LENGTH: 280,
  MAX_CONTEXT_LENGTH: 1000,
  MAX_CACHE_ENTRIES: 100,
  MAX_SUGGESTIONS: 6,
  MAX_ARSENAL_ITEMS: 50,
  
  // Textarea detection
  MIN_TEXTAREA_HEIGHT: 30,
  MIN_TEXTAREA_WIDTH: 100,
} as const;

// API configuration
export const API_CONFIG = {
  BASE_URL: 'https://openrouter.ai/api/v1',
  MODELS: {
    PRIMARY: 'openai/gpt-4o',
    FALLBACK: 'openai/gpt-4o-mini',
    VISION: 'google/gemini-2.5-flash-image-preview',
    SEARCH: 'perplexity/sonar',
  },
  RETRY_ATTEMPTS: 3,
  RETRY_DELAYS: [1000, 2000, 3000],
  RATE_LIMIT_WINDOW: 60000, // 1 minute
  MAX_REQUESTS_PER_WINDOW: 60,
} as const;

// API and Request Configuration (renamed to avoid confusion)
export const API_CONSTANTS = {
  MIN_REQUEST_INTERVAL: 100, // 100ms between requests
  MAX_RETRIES: 3,
  RETRY_DELAYS: [1000, 2000, 4000], // Exponential backoff in ms
  REQUEST_CACHE_MAX_SIZE: 100,
  OFFLINE_QUEUE_MAX_AGE: 300000, // 5 minutes in ms
  OFFLINE_QUEUE_MAX_SIZE: 50,
  MAX_BATCH_SIZE: 10,
  MAX_RESPONSE_TIME_SAMPLES: 100,
  DEFAULT_MAX_TOKENS: 500,
  DEFAULT_TOP_P: 0.9,
} as const;

// Storage and Memory Limits
export const STORAGE_LIMITS = {
  MAX_CACHE_SIZE: 100,
  MAX_CACHE_AGE_MS: 3600000, // 1 hour
  MAX_SIZE_BYTES: 5 * 1024 * 1024, // 5MB
  MAX_EVENTS: 1000,
  MAX_STORAGE_KEYS: 100, // Chrome storage API limit
  MAX_KEY_LENGTH: 100,
  ESTIMATED_SIZE_LIMIT: 1024 * 1024, // 1MB
} as const;

// Temperature Configuration
export const TEMPERATURE_CONFIG = {
  MIN: 0.1,
  MAX: 1.0,
  DEFAULT: 0.7,
  BY_TONE: {
    fact_check: 0.3,      // Low creativity for facts
    provide_data: 0.4,    // Low for data/stats
    hot_take: 0.9,        // High for controversial
    ratio_bait: 0.9,      // High for provocative
    meme_response: 0.8,   // High for humor
    ask_question: 0.6,    // Moderate for questions
    share_experience: 0.7, // Moderate-high for stories
  },
} as const;

// Reply Length Configuration
export const REPLY_LENGTH = {
  SHORT: {
    instruction: ' Keep the reply very brief, under 50 characters.',
    maxChars: 50,
  },
  MEDIUM: {
    instruction: ' Keep the reply concise, between 50-150 characters.',
    minChars: 50,
    maxChars: 150,
  },
  LONG: {
    instruction: ' Write a detailed reply, 150-280 characters.',
    minChars: 150,
    maxChars: 280,
  },
} as const;

// DOM selectors
export const SELECTORS = {
  // Twitter/X selectors
  REACT_ROOT: '#react-root',
  TWEET_ARTICLE: 'article[data-testid="tweet"]',
  TOOLBAR: 'div[data-testid="toolBar"]',
  REPLY_TEXTAREA: '[data-testid^="tweetTextarea_"]',
  TWEET_BUTTON: '[data-testid="tweetButton"], [data-testid="tweetButtonInline"]',
  
  // HypeFury selectors
  HYPEFURY_TEXTAREA: 'textarea',
  HYPEFURY_CONTAINER: '.mention-item, .feed-item',
  
  // Extension selectors
  SMART_REPLY_BUTTON: '.smart-reply-btn',
  SMART_REPLY_BUTTON_HYPEFURY: '.smart-reply-button',
  SMART_REPLY_CONTAINER: '.smart-reply-container',
  SMART_REPLY_DROPDOWN: '.smart-reply-dropdown',
} as const;

// Feature flags
export const FEATURES = {
  UNIFIED_SELECTOR: true,
  VISION_API: true,
  ARSENAL_MODE: true,
  SMART_SUGGESTIONS: true,
  IMAGE_GENERATION: true,
  KEYBOARD_SHORTCUTS: true,
  PROGRESSIVE_ENHANCEMENT: true,
  CONTEXT_RECOVERY: true,
} as const;

// Storage keys
export const STORAGE_KEYS = {
  CONFIG: 'smartReply_config',
  API_KEY: 'smartReply_apiKey',
  LAST_TONE: 'smartReply_lastTone',
  ARSENAL_DB: 'arsenal_replies_db',
  RECOVERY_STATE: 'tweetcraft_recovery_state',
  CACHE_PREFIX: 'tweetcraft_cache_',
  MIGRATION_LOCK: 'tweetcraft_migration_lock',
} as const;

// Encryption settings
export const ENCRYPTION = {
  ALGORITHM: 'AES-GCM',
  KEY_LENGTH: 256,
  SALT_LENGTH: 16,
  ITERATIONS: 100000,
  HASH: 'SHA-256',
  PREFIX: 'enc_',
} as const;

// Platform detection
export const PLATFORMS = {
  TWITTER: ['twitter.com', 'x.com'],
  HYPEFURY: ['app.hypefury.com'],
} as const;

// Colors for console logging
export const LOG_COLORS = {
  PRIMARY: '#1DA1F2', // Twitter blue
  SUCCESS: '#17BF63', // Green
  ERROR: '#DC3545', // Red
  WARNING: '#FFA500', // Orange
  INFO: '#657786', // Gray
  SPECIAL: '#9146FF', // Purple
  HIGHLIGHT: '#E1AD01', // Gold
} as const;

// Export a type for the constants
export type TimingConstants = typeof TIMING;
export type SizeConstants = typeof SIZES;
export type ApiConfigConstants = typeof API_CONFIG;
export type SelectorsConstants = typeof SELECTORS;
export type FeaturesConstants = typeof FEATURES;
export type StorageKeysConstants = typeof STORAGE_KEYS;
export type EncryptionConstants = typeof ENCRYPTION;
export type PlatformsConstants = typeof PLATFORMS;
export type LogColorsConstants = typeof LOG_COLORS;