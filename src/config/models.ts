/**
 * Centralized model configuration
 * For Chrome extensions, we can't use process.env
 */

// Valid service keys for type safety
const SERVICE_KEYS = ['template_suggester', 'image_search', 'image_prompt', 'default'] as const;
type ServiceKey = typeof SERVICE_KEYS[number];

// Model validation helper
function validateModel(value: string | undefined, fallback: string): string {
  // Check if value exists and is non-empty
  if (!value || typeof value !== 'string' || value.trim() === '') {
    return fallback;
  }
  
  // Basic model name pattern validation (provider/model-name format)
  const modelPattern = /^[a-zA-Z0-9_-]+\/[a-zA-Z0-9._-]+$/;
  if (!modelPattern.test(value)) {
    console.warn(`Invalid model format: ${value}, using fallback: ${fallback}`);
    return fallback;
  }
  
  return value;
}

// Default fallback model
const DEFAULT_FALLBACK = 'google/gemini-2.5-flash-lite';

export const MODEL_CONFIG = {
  // Default models for different services (validated)
  TEMPLATE_SUGGESTER: validateModel('google/gemini-2.5-flash-lite', DEFAULT_FALLBACK),
  IMAGE_SERVICE_PERPLEXITY: validateModel('perplexity/llama-3.1-sonar-small-128k-online', DEFAULT_FALLBACK),
  IMAGE_SERVICE_PROMPT: validateModel('anthropic/claude-3-haiku', DEFAULT_FALLBACK),
  
  // Fallback model if specific one not set
  DEFAULT_MODEL: DEFAULT_FALLBACK,
  
  // Get model for a specific service with validation
  getModel(service: ServiceKey): string {
    switch (service) {
      case 'template_suggester':
        return this.TEMPLATE_SUGGESTER;
      case 'image_search':
        return this.IMAGE_SERVICE_PERPLEXITY;
      case 'image_prompt':
        return this.IMAGE_SERVICE_PROMPT;
      default:
        return this.DEFAULT_MODEL;
    }
  }
};

// Export individual models for direct import
export const { TEMPLATE_SUGGESTER, IMAGE_SERVICE_PERPLEXITY, IMAGE_SERVICE_PROMPT, DEFAULT_MODEL } = MODEL_CONFIG;