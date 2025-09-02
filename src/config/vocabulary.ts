/**
 * Vocabulary Configuration - How the tweet is written
 * Controls word choice, language style, and expression patterns
 */

export interface VocabularyStyle {
  id: string;
  label: string;
  description: string;
  emoji: string;
  systemPrompt: string;
  examples?: string[];
}

export const VOCABULARY_STYLES: Record<string, VocabularyStyle> = {
  plain_english: {
    id: 'plain_english',
    label: 'Plain English',
    description: 'Simple, short, and concrete words',
    emoji: '📎',
    systemPrompt: 'Rewrite this core idea `[User\'s Core Idea]` as a reply to `[Original Tweet Text]`. Use simple, short, and concrete words. Avoid jargon and complex sentences.',
    examples: ['easy words', 'common phrases', 'plain English']
  },
  
  corporate_pr: {
    id: 'corporate_pr',
    label: 'Corporate/PR',
    description: 'Cautious, reputation-aware language',
    emoji: '🏢',
    systemPrompt: 'Rewrite this core idea `[User\'s Core Idea]` as a reply to `[Original Tweet Text]`. Use cautious, reputation-aware language. The tone should be official and brand-safe.',
    examples: ['stakeholders', 'synergy', 'moving forward']
  },
  
  academic_scholarly: {
    id: 'academic_scholarly',
    label: 'Academic/Scholarly',
    description: 'Precise terminology and formal structure',
    emoji: '🎓',
    systemPrompt: 'Rewrite this core idea `[User\'s Core Idea]` as a reply to `[Original Tweet Text]`. Use precise terminology, nuanced language, and a formal, scholarly structure.',
    examples: ['furthermore', 'consequently', 'hypothesis']
  },
  
  technical_engineer: {
    id: 'technical_engineer',
    label: 'Technical/Engineer',
    description: 'Systems, constraints, and first principles',
    emoji: '🛠️',
    systemPrompt: 'Rewrite this core idea `[User\'s Core Idea]` as a reply to `[Original Tweet Text]`. Focus on systems, constraints, trade-offs, and first principles. Use technical but clear language.',
    examples: ['architecture', 'optimization', 'scalability']
  },
  
  journalistic: {
    id: 'journalistic',
    label: 'Journalistic',
    description: 'Inverted pyramid structure with attribution',
    emoji: '📰',
    systemPrompt: 'Rewrite this core idea `[User\'s Core Idea]` as a reply to `[Original Tweet Text]`. Structure it with the most important information first (inverted pyramid) and attribute any claims.',
    examples: ['according to', 'sources say', 'reports indicate']
  },
  
  marketing_hype: {
    id: 'marketing_hype',
    label: 'Marketing/Hype',
    description: 'Benefits, outcomes, and excitement',
    emoji: '📣',
    systemPrompt: 'Rewrite this core idea `[User\'s Core Idea]` as a reply to `[Original Tweet Text]`. Focus on benefits, positive outcomes, and social proof. Build excitement.',
    examples: ['game-changer', 'revolutionary', 'transform your']
  },
  
  legal_compliance: {
    id: 'legal_compliance',
    label: 'Legal/Compliance',
    description: 'Disclaimers and carefully hedged language',
    emoji: '🧾',
    systemPrompt: 'Rewrite this core idea `[User\'s Core Idea]` as a reply to `[Original Tweet Text]`. Include disclaimers, qualifiers, and carefully hedged language to minimize liability.',
    examples: ['allegedly', 'may constitute', 'not legal advice']
  },
  
  internet_genz: {
    id: 'internet_genz',
    label: 'Internet/Gen Z',
    description: 'Current slang, memes, and casual style',
    emoji: '😎',
    systemPrompt: 'Rewrite this core idea `[User\'s Core Idea]` as a reply to `[Original Tweet Text]`. Use current slang, memes, and casual punctuation (e.g., lowercase, emojis). The tone should be very informal.',
    examples: ['fr fr', 'no cap', 'bussin', 'slay']
  },
  
  storyteller_narrative: {
    id: 'storyteller_narrative',
    label: 'Storyteller/Narrative',
    description: 'Anecdotes and story format',
    emoji: '📚',
    systemPrompt: 'Frame this core idea `[User\'s Core Idea]` as a short anecdote or story in reply to `[Original Tweet Text]`. Start with \'That reminds me of a time...\' or a similar hook.',
    examples: ['Once upon a time', 'That reminds me', 'Let me tell you']
  },
  
  shitposter_meme: {
    id: 'shitposter_meme',
    label: 'Shitposter/Meme-Lord',
    description: 'Absurdist, ironic, or surreal',
    emoji: '🤡',
    systemPrompt: 'Generate an absurdist, ironic, or non-sequitur reply to this tweet: `[Original Tweet Text]` based on the idea `[User\'s Core Idea]`. It should feel like an inside joke or a surreal meme.',
    examples: ['based', 'ratio + L', 'sir this is a wendys']
  },
  
  fan_stanspeak: {
    id: 'fan_stanspeak',
    label: 'Fan/Stanspeak',
    description: 'Effusively positive fan language',
    emoji: '💖',
    systemPrompt: 'Generate an effusively positive and hyperbolic reply to this tweet: `[Original Tweet Text]`. Use fan community slang (e.g., \'literally shaking,\' \'ATE,\' \'the blueprint\') to praise the subject.',
    examples: ['literally shaking', 'ATE and left no crumbs', 'the blueprint', 'mother is mothering']
  }
};

/**
 * Get vocabulary style by ID
 */
export function getVocabularyStyle(id: string): VocabularyStyle | undefined {
  return VOCABULARY_STYLES[id];
}

/**
 * Get all vocabulary styles as array
 */
export function getAllVocabularyStyles(): VocabularyStyle[] {
  return Object.values(VOCABULARY_STYLES);
}

/**
 * Get vocabulary prompt for a given style
 */
export function getVocabularyPrompt(vocabularyId: string): string {
  const style = getVocabularyStyle(vocabularyId);
  if (!style) {
    console.warn(`Vocabulary style '${vocabularyId}' not found, using plain_english as default`);
    return VOCABULARY_STYLES.plain_english.systemPrompt;
  }
  return style.systemPrompt;
}