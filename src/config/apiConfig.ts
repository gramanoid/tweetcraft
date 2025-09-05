/**
 * OpenRouter API configuration
 * All values are loaded from environment variables via webpack DefinePlugin
 * Configure these in .env file (not committed to version control)
 */

export const API_CONFIG = {
  // API key from .env file (injected at build time by webpack)
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY || '',
  
  // Exa API key for trending topics
  EXA_API_KEY: process.env.EXA_API_KEY || '',
  
  // TwitterAPI.io configuration (NOT official Twitter API)
  TWITTERAPI_IO_KEY: process.env.TWITTERAPI_IO_KEY || '',
  TWITTERAPI_IO_BASE_URL: process.env.TWITTERAPI_IO_BASE_URL || 'https://twitterapi.io/api/v1',
  
  // API endpoints
  BASE_URL: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
  
  // Default headers
  HEADERS: {
    'Content-Type': 'application/json',
    'HTTP-Referer': 'https://tweetcraft.ai/extension',
    'X-Title': `${process.env.APP_NAME || 'TweetCraft'} v${process.env.APP_VERSION || '0.0.15'}`
  }
};