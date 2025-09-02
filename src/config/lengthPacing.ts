/**
 * Length & Pacing Configuration - How long/short the reply is
 * Controls tweet length, rhythm, sentence structure, and pacing
 */

export interface LengthPacingStyle {
  id: string;
  label: string;
  description: string;
  systemPrompt: string;
  characterRange?: { min: number; max: number };
  sentenceStyle?: string;
}

export const LENGTH_PACING_STYLES: Record<string, LengthPacingStyle> = {
  // Placeholder length & pacing styles - to be replaced with actual templates
  micro: {
    id: 'micro',
    label: 'Micro',
    description: 'Ultra-short, single thought',
    systemPrompt: 'Keep response under 50 characters. One sharp point only. Maximum impact, minimum words.',
    characterRange: { min: 1, max: 50 },
    sentenceStyle: 'fragment'
  },
  
  brief: {
    id: 'brief',
    label: 'Brief',
    description: 'Short and punchy',
    systemPrompt: 'Keep response between 50-100 characters. Quick, punchy delivery. Get to the point fast.',
    characterRange: { min: 50, max: 100 },
    sentenceStyle: 'short'
  },
  
  standard: {
    id: 'standard',
    label: 'Standard',
    description: 'Normal tweet length',
    systemPrompt: 'Keep response between 100-200 characters. Natural pacing with complete thoughts.',
    characterRange: { min: 100, max: 200 },
    sentenceStyle: 'balanced'
  },
  
  detailed: {
    id: 'detailed',
    label: 'Detailed',
    description: 'Comprehensive response',
    systemPrompt: 'Use 200-280 characters. Provide detailed response with multiple points or examples.',
    characterRange: { min: 200, max: 280 },
    sentenceStyle: 'complex'
  },
  
  maximal: {
    id: 'maximal',
    label: 'Maximal',
    description: 'Use full character limit',
    systemPrompt: 'Use close to 280 characters. Pack maximum information and value into the tweet.',
    characterRange: { min: 250, max: 280 },
    sentenceStyle: 'varied'
  },
  
  staccato: {
    id: 'staccato',
    label: 'Staccato',
    description: 'Short. Sharp. Bursts.',
    systemPrompt: 'Use staccato rhythm. Short sentences. Quick bursts. Choppy pacing. High energy.',
    characterRange: { min: 100, max: 200 },
    sentenceStyle: 'choppy'
  },
  
  flowing: {
    id: 'flowing',
    label: 'Flowing',
    description: 'Smooth, continuous flow',
    systemPrompt: 'Use flowing sentences that connect smoothly, creating a continuous stream of thought.',
    characterRange: { min: 150, max: 280 },
    sentenceStyle: 'fluid'
  },
  
  buildup: {
    id: 'buildup',
    label: 'Build-up',
    description: 'Start slow, accelerate to climax',
    systemPrompt: 'Start with short setup. Build momentum. Accelerate to powerful conclusion.',
    characterRange: { min: 150, max: 250 },
    sentenceStyle: 'crescendo'
  },
  
  punchline: {
    id: 'punchline',
    label: 'Punchline',
    description: 'Setup and deliver',
    systemPrompt: 'Structure as setup and punchline. Build anticipation, then deliver the payoff.',
    characterRange: { min: 100, max: 200 },
    sentenceStyle: 'setup-payoff'
  },
  
  list: {
    id: 'list',
    label: 'List Format',
    description: 'Bullet points or numbered',
    systemPrompt: 'Use list format with bullet points or numbers. Clear, scannable structure.',
    characterRange: { min: 100, max: 280 },
    sentenceStyle: 'enumerated'
  },
  
  rhythmic: {
    id: 'rhythmic',
    label: 'Rhythmic',
    description: 'Musical, pattern-based pacing',
    systemPrompt: 'Create rhythmic pattern in pacing. Use repetition and cadence for musicality.',
    characterRange: { min: 100, max: 250 },
    sentenceStyle: 'pattern'
  },
  
  dramatic: {
    id: 'dramatic',
    label: 'Dramatic',
    description: 'Pause... for effect',
    systemPrompt: 'Use dramatic pauses... Build suspense. Create tension. Then... release.',
    characterRange: { min: 100, max: 280 },
    sentenceStyle: 'theatrical'
  }
};

/**
 * Get length & pacing style by ID
 */
export function getLengthPacingStyle(id: string): LengthPacingStyle | undefined {
  return LENGTH_PACING_STYLES[id];
}

/**
 * Get all length & pacing styles as array
 */
export function getAllLengthPacingStyles(): LengthPacingStyle[] {
  return Object.values(LENGTH_PACING_STYLES);
}

/**
 * Get length & pacing prompt for a given style
 */
export function getLengthPacingPrompt(lengthPacingId: string): string {
  const style = getLengthPacingStyle(lengthPacingId);
  if (!style) {
    console.warn(`Length & Pacing style '${lengthPacingId}' not found, using standard as default`);
    return LENGTH_PACING_STYLES.standard.systemPrompt;
  }
  return style.systemPrompt;
}

/**
 * Get character limit guidance for a style
 */
export function getCharacterGuidance(lengthPacingId: string): string {
  const style = getLengthPacingStyle(lengthPacingId);
  if (!style || !style.characterRange) {
    return '';
  }
  return `Keep response between ${style.characterRange.min}-${style.characterRange.max} characters.`;
}