// Hardcoded OpenRouter API configuration
// This file contains the API key for OpenRouter integration

export const API_CONFIG = {
  // Hardcoded OpenRouter API key - DO NOT COMMIT TO PUBLIC REPOS
  OPENROUTER_API_KEY: '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',
  
  // API endpoints
  BASE_URL: 'https://openrouter.ai/api/v1',
  
  // Default headers
  HEADERS: {
    'Content-Type': 'application/json',
    'HTTP-Referer': 'https://tweetcraft.ai/extension',
    'X-Title': 'TweetCraft - AI Reply Assistant v0.0.12'
  }
};