/**
 * Centralized Configuration for Templates and Tones
 * This file can be easily modified to update templates and tones across the extension
 * without touching the frontend code
 */

export interface Template {
  id: string;
  name: string;
  emoji: string;
  prompt: string;
  description: string;
  category: 'engagement' | 'value' | 'conversation' | 'humor' | 'debate' | 'viral';
}

export interface Tone {
  id: string;
  emoji: string;
  label: string;
  description: string;
  systemPrompt: string;
}

/**
 * TEMPLATES - Define the structure and intent of replies
 * These determine WHAT to say
 */
export const TEMPLATES: Template[] = [
  // Engagement Templates
  {
    id: 'ask_question',
    name: 'Ask Question',
    emoji: '❓',
    prompt: 'Ask a thought-provoking follow-up question that encourages deeper discussion.',
    description: 'Engage with questions',
    category: 'engagement'
  },
  {
    id: 'agree_expand',
    name: 'Agree & Build',
    emoji: '🔥',
    prompt: 'Strongly agree and add a powerful supporting point or example.',
    description: 'Amplify their point',
    category: 'engagement'
  },
  {
    id: 'challenge',
    name: 'Challenge View',
    emoji: '⚔️',
    prompt: 'Challenge their perspective with a contrarian but well-reasoned viewpoint.',
    description: 'Offer counter-argument',
    category: 'engagement'
  },
  
  // Value Templates
  {
    id: 'add_insight',
    name: 'Add Insight',
    emoji: '💡',
    prompt: 'Share a unique insight or lesser-known fact that adds value.',
    description: 'Share valuable info',
    category: 'value'
  },
  {
    id: 'share_experience',
    name: 'Personal Story',
    emoji: '📖',
    prompt: 'Share a relevant personal experience or anecdote that relates.',
    description: 'Add personal touch',
    category: 'value'
  },
  {
    id: 'provide_data',
    name: 'Drop Stats',
    emoji: '📊',
    prompt: 'Provide relevant statistics, data, or research to support or contextualize.',
    description: 'Back with data',
    category: 'value'
  },
  
  // Viral/Controversial Templates
  {
    id: 'hot_take',
    name: 'Hot Take',
    emoji: '🌶️',
    prompt: 'Deliver a spicy hot take that challenges conventional wisdom.',
    description: 'Controversial opinion',
    category: 'viral'
  },
  {
    id: 'ratio_bait',
    name: 'Ratio Bait',
    emoji: '🎣',
    prompt: 'Write something provocative that will generate strong reactions and replies.',
    description: 'Generate reactions',
    category: 'viral'
  },
  {
    id: 'meme_response',
    name: 'Meme Reply',
    emoji: '😂',
    prompt: 'Respond with a humorous take using internet culture references or meme format.',
    description: 'Funny meme response',
    category: 'humor'
  },
  
  // Debate Templates
  {
    id: 'fact_check',
    name: 'Fact Check',
    emoji: '🔍',
    prompt: 'Politely fact-check or correct misinformation with sources.',
    description: 'Correct with facts',
    category: 'debate'
  },
  {
    id: 'devils_advocate',
    name: "Devil's Advocate",
    emoji: '😈',
    prompt: "Play devil's advocate to explore the other side of the argument.",
    description: 'Argue opposite side',
    category: 'debate'
  },
  {
    id: 'steel_man',
    name: 'Steel Man',
    emoji: '🛡️',
    prompt: 'Strengthen their argument before respectfully addressing its limitations.',
    description: 'Strengthen then counter',
    category: 'debate'
  },
  
  // Conversation Templates
  {
    id: 'show_support',
    name: 'Support',
    emoji: '💪',
    prompt: 'Express strong support and encouragement for their point or situation.',
    description: 'Show support',
    category: 'conversation'
  },
  {
    id: 'relate',
    name: 'Relate',
    emoji: '🤝',
    prompt: 'Find common ground and relate to their experience.',
    description: 'Find commonality',
    category: 'conversation'
  },
  {
    id: 'congratulate',
    name: 'Celebrate',
    emoji: '🎉',
    prompt: 'Celebrate their achievement or milestone with enthusiasm.',
    description: 'Congratulate success',
    category: 'conversation'
  }
];

/**
 * TONES - Define the personality and style of replies
 * These determine HOW to say it
 */
export const TONES: Tone[] = [
  {
    id: 'professional',
    emoji: '💼',
    label: 'Professional',
    description: 'Formal & Respectful',
    systemPrompt: 'Write in a professional, formal tone. Be respectful, measured, and business-appropriate. Use proper grammar and avoid slang.'
  },
  {
    id: 'casual',
    emoji: '😊',
    label: 'Casual',
    description: 'Friendly & Relaxed',
    systemPrompt: 'Write in a casual, friendly tone. Be approachable, conversational, and warm. Use natural language and occasional informal expressions.'
  },
  {
    id: 'witty',
    emoji: '✨',
    label: 'Witty',
    description: 'Clever & Humorous',
    systemPrompt: 'Write with wit and cleverness. Be humorous, entertaining, and quick-witted while staying relevant. Use wordplay when appropriate.'
  },
  {
    id: 'sarcastic',
    emoji: '😏',
    label: 'Sarcastic',
    description: 'Ironic & Sharp',
    systemPrompt: 'Write with sarcasm and irony. Be sharp and cutting but not mean-spirited. Use dry humor and pointed observations.'
  },
  {
    id: 'enthusiastic',
    emoji: '🚀',
    label: 'Enthusiastic',
    description: 'Energetic & Excited',
    systemPrompt: 'Write with high energy and enthusiasm! Be passionate, excited, and optimistic. Use exclamation points and energetic language.'
  },
  {
    id: 'academic',
    emoji: '🎓',
    label: 'Academic',
    description: 'Scholarly & Analytical',
    systemPrompt: 'Write in an academic, analytical tone. Be intellectually rigorous, evidence-based, and precise. Use formal vocabulary and structured arguments.'
  },
  {
    id: 'gen_z',
    emoji: '💅',
    label: 'Gen Z',
    description: 'Internet Native',
    systemPrompt: 'Write like Gen Z on Twitter. Use current internet slang, lowercase, no punctuation vibes, fr fr. Be unhinged but make it make sense.'
  },
  {
    id: 'contrarian',
    emoji: '🤔',
    label: 'Contrarian',
    description: 'Challenge & Question',
    systemPrompt: 'Write as a thoughtful contrarian. Challenge assumptions, question popular opinions, and provide alternative perspectives respectfully.'
  },
  {
    id: 'motivational',
    emoji: '💪',
    label: 'Motivational',
    description: 'Inspiring & Uplifting',
    systemPrompt: 'Write in an inspiring, motivational tone. Be encouraging, positive, and uplifting. Help people see their potential and overcome challenges.'
  },
  {
    id: 'savage',
    emoji: '🔥',
    label: 'Savage',
    description: 'Bold & Unfiltered',
    systemPrompt: 'Write with savage honesty and boldness. Be direct, unfiltered, and brutally honest. Drop truth bombs without apology.'
  },
  {
    id: 'philosophical',
    emoji: '🧠',
    label: 'Philosophical',
    description: 'Deep & Thoughtful',
    systemPrompt: 'Write philosophically. Explore deeper meanings, ask existential questions, and ponder the nature of things. Be contemplative and profound.'
  },
  {
    id: 'minimalist',
    emoji: '⚡',
    label: 'Minimalist',
    description: 'Brief & Impactful',
    systemPrompt: 'Write with extreme brevity. Maximum impact, minimum words. Be concise, punchy, and memorable. Every word must count.'
  }
];

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
  return TEMPLATES.find(t => t.id === id);
}

/**
 * Export a function to get a specific tone
 */
export function getTone(id: string): Tone | undefined {
  return TONES.find(t => t.id === id);
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
  
  // Default temperature settings for different tones
  temperatureByTone: {
    professional: 0.3,
    academic: 0.4,
    casual: 0.7,
    witty: 0.8,
    sarcastic: 0.8,
    gen_z: 0.9,
    savage: 0.9,
    default: 0.7
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