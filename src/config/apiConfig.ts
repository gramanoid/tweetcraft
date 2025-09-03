// OpenRouter API configuration using environment variables
// API key is now loaded from .env file (not committed to repo)

export const API_CONFIG = {
  // API key loaded from environment variable
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY || '',
  
  // API endpoints
  BASE_URL: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
  
  // Default headers
  HEADERS: {
    'Content-Type': 'application/json',
    'HTTP-Referer': 'https://tweetcraft.ai/extension',
    'X-Title': `${process.env.APP_NAME || 'TweetCraft'} v${process.env.APP_VERSION || '0.0.15'}`
  }
};