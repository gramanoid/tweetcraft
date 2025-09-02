/**
 * Centralized Configuration for Rhetoric and Personalities
 * This file can be easily modified to update rhetoric and personalities across the extension
 * without touching the frontend code
 */

import { Personality, PERSONALITIES, getPersonality, getPersonalitiesByCategory, PERSONALITY_CATEGORIES } from './personalities';
import { RhetoricalMove, RHETORICAL_MOVES, getRhetoricalMove, getRhetoricalMovesByCategory, RHETORIC_CATEGORIES } from './rhetoric';

// Import RhetoricalMove and create Template alias for backward compatibility
export interface Template {
  id: string;
  name: string;
  emoji: string;
  prompt: string;
  description: string;
  category: string;
  categoryLabel?: string;
  systemPrompt?: string;
}

// Re-export from personalities file
export { Personality, Personality as Tone, PERSONALITIES, getPersonality, getPersonalitiesByCategory, PERSONALITY_CATEGORIES } from './personalities';

// Re-export from rhetoric file
export { RhetoricalMove, RHETORICAL_MOVES, getRhetoricalMove, getRhetoricalMovesByCategory, RHETORIC_CATEGORIES } from './rhetoric';

// Maintain backward compatibility
export type { Personality as ToneType } from './personalities';

/**
 * TEMPLATES - Now maps to RHETORICAL_MOVES for backward compatibility
 * These determine WHAT to say
 */
export const TEMPLATES: Template[] = RHETORICAL_MOVES.map(move => ({
  ...move,
  prompt: move.systemPrompt, // Map systemPrompt to prompt for backward compatibility
  category: move.category as any // Map category type
}));

/**
 * PERSONALITIES (formerly TONES) - Define the personality and style of replies
 * These determine HOW to say it
 * Now using comprehensive personality system from personalities.ts
 */

// For backward compatibility, export PERSONALITIES as TONES
export const TONES = PERSONALITIES;

/**
 * Export a function to get templates by category
 */
export function getTemplatesByCategory(category: string): Template[] {
  return TEMPLATES.filter(t => t.category === category);
}

/**
 * Export a function to get a specific template
 */
export function getTemplate(id: string): Template | undefined {
  const move = getRhetoricalMove(id);
  if (!move) return undefined;
  return {
    ...move,
    prompt: move.systemPrompt,
    category: move.category
  };
}

/**
 * Export a function to get a specific tone (backward compatibility)
 */
export function getTone(id: string): Personality | undefined {
  return getPersonality(id);
}

/**
 * Configuration for reply generation behavior
 */
export const REPLY_CONFIG = {
  // Maximum length for different reply types
  maxLength: {
    short: 50,
    medium: 150,
    long: 280
  },
  
  // Default temperature settings for different personalities and rhetorical moves
  temperatureByPersonality: {
    // Positive personalities
    friendly: 0.7,
    supportive: 0.6,
    motivational: 0.7,
    enthusiastic: 0.8,
    earnest: 0.5,
    gratitude: 0.6,
    awestruck: 0.7,
    // Neutral personalities
    professional: 0.3,
    academic: 0.4,
    diplomatic: 0.5,
    neutral: 0.3,
    inquisitive: 0.6,
    calm: 0.4,
    zoom_out: 0.5,
    pensive: 0.6,
    // Humorous personalities
    witty: 0.8,
    sarcastic: 0.8,
    dry: 0.5,
    dramatic: 0.8,
    storyteller: 0.7,
    shitposter: 0.95,
    fanstan: 0.9,
    weary: 0.5,
    // Critical personalities
    confident: 0.4,
    skeptical: 0.5,
    provocative: 0.8,
    // Naughty personalities
    mean: 0.9,
    dismissive: 0.3,
    inflammatory: 0.95,
    condescending: 0.6,
    swearing: 0.9,
    controversial: 0.9,
    threatening: 0.7,
    // Rhetorical moves
    agree_build: 0.7,
    support: 0.8,
    celebrate: 0.8,
    personal_story: 0.7,
    ask_question: 0.5,
    add_insight: 0.4,
    drop_stats: 0.2,
    steel_man: 0.4,
    polite_challenge: 0.5,
    devils_advocate: 0.6,
    hot_take: 0.8,
    counter_example: 0.5,
    make_joke: 0.9,
    meme_reply: 0.95,
    meme_response: 0.95,
    ratio_bait: 0.9,
    // Legacy mappings
    default: 0.7
  },
  // Backward compatibility alias
  get temperatureByTone() {
    return this.temperatureByPersonality;
  },
  
  // System instructions that apply to all replies
  globalInstructions: `
    - Write authentic, human-like replies
    - Never use hashtags unless absolutely essential
    - Avoid corporate speak and buzzwords
    - Be specific rather than generic
    - Match the energy of the original tweet
    - Keep replies conversational and natural
    - Never include meta-commentary about the reply itself
  `
};