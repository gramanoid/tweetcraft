/**
 * Vocabulary Configuration - How the tweet is written
 * Controls word choice, language style, and expression patterns
 */

export interface VocabularyStyle {
  id: string;
  label: string;
  description: string;
  systemPrompt: string;
  examples?: string[];
}

export const VOCABULARY_STYLES: Record<string, VocabularyStyle> = {
  // Placeholder vocabulary styles - to be replaced with actual templates
  simple: {
    id: 'simple',
    label: 'Simple',
    description: 'Basic, everyday language',
    systemPrompt: 'Use simple, everyday words that anyone can understand. Avoid jargon and complex vocabulary.',
    examples: ['easy words', 'common phrases', 'plain English']
  },
  
  sophisticated: {
    id: 'sophisticated',
    label: 'Sophisticated',
    description: 'Elevated, refined language',
    systemPrompt: 'Use sophisticated vocabulary with nuanced word choices. Include refined expressions and elegant phrasing.',
    examples: ['eloquent', 'articulate', 'refined diction']
  },
  
  technical: {
    id: 'technical',
    label: 'Technical',
    description: 'Industry-specific terminology',
    systemPrompt: 'Use technical terms and industry jargon appropriately. Be precise with technical vocabulary.',
    examples: ['specialized terms', 'technical jargon', 'industry language']
  },
  
  casual: {
    id: 'casual',
    label: 'Casual',
    description: 'Conversational, informal language',
    systemPrompt: 'Use casual, conversational language with contractions and informal expressions.',
    examples: ["gonna", "wanna", "y'all"]
  },
  
  academic: {
    id: 'academic',
    label: 'Academic',
    description: 'Scholarly, formal language',
    systemPrompt: 'Use academic vocabulary with formal structure. Include scholarly terms and precise language.',
    examples: ['furthermore', 'consequently', 'hypothesis']
  },
  
  slang: {
    id: 'slang',
    label: 'Slang/Internet',
    description: 'Modern internet and slang terms',
    systemPrompt: 'Use modern internet slang, abbreviations, and trendy expressions.',
    examples: ['fr fr', 'no cap', 'bussin']
  },
  
  poetic: {
    id: 'poetic',
    label: 'Poetic',
    description: 'Metaphorical, artistic language',
    systemPrompt: 'Use poetic language with metaphors, imagery, and artistic expression.',
    examples: ['metaphors', 'vivid imagery', 'lyrical phrases']
  },
  
  minimalist: {
    id: 'minimalist',
    label: 'Minimalist',
    description: 'Sparse, essential words only',
    systemPrompt: 'Use minimal words. Be extremely concise. Every word must earn its place.',
    examples: ['few words', 'essential only', 'bare minimum']
  },
  
  verbose: {
    id: 'verbose',
    label: 'Verbose',
    description: 'Elaborate, detailed language',
    systemPrompt: 'Use elaborate vocabulary with detailed explanations and extensive descriptions.',
    examples: ['elaborate descriptions', 'extensive details', 'rich vocabulary']
  },
  
  professional: {
    id: 'professional',
    label: 'Professional',
    description: 'Business-appropriate language',
    systemPrompt: 'Use professional business vocabulary. Maintain formal but accessible language.',
    examples: ['leverage', 'implement', 'strategic']
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
    console.warn(`Vocabulary style '${vocabularyId}' not found, using simple as default`);
    return VOCABULARY_STYLES.simple.systemPrompt;
  }
  return style.systemPrompt;
}