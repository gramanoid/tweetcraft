/**
 * Unified Prompt Builder for 4-Part Tweet Generation
 * Combines: Personality + Vocabulary + Rhetoric + Length & Pacing = Perfect Tweet
 */

import { ReplyGenerationRequest } from '@/types';
import { getPersonality } from '@/config/personalities';
import { getVocabularyPrompt } from '@/config/vocabulary';
import { getRhetoricalMove } from '@/config/rhetoric';
import { getLengthPacingPrompt, getCharacterGuidance } from '@/config/lengthPacing';

export interface PromptComponents {
  personality: string;
  vocabulary: string;
  rhetoric: string;
  lengthPacing: string;
  combined: string;
}

/**
 * Build the complete 4-part prompt structure
 * Each part is clearly separated and logged for tracking
 */
export function buildFourPartPrompt(request: ReplyGenerationRequest): PromptComponents {
  console.log('%c🎯 BUILDING 4-PART PROMPT STRUCTURE', 'color: #FF6B6B; font-weight: bold; font-size: 16px');
  console.log('%c════════════════════════════════════════', 'color: #2E3236');
  
  // Part 1: PERSONALITY - Who is talking
  const personalityId = request.personality || 'neutral';
  const personality = getPersonality(personalityId);
  const personalityPrompt = personality?.systemPrompt || 'Respond in a neutral, balanced tone.';
  
  console.log('%c📍 PART 1: PERSONALITY (Who is talking)', 'color: #1DA1F2; font-weight: bold');
  console.log('%c  Selected:', 'color: #657786', personalityId);
  console.log('%c  Label:', 'color: #657786', personality?.label || 'Unknown');
  console.log('%c  Prompt:', 'color: #17BF63', personalityPrompt.substring(0, 100) + '...');
  
  // Part 2: VOCABULARY - How it's written
  const vocabularyId = request.vocabulary || 'plain_english';
  const vocabularyPrompt = getVocabularyPrompt(vocabularyId);
  
  console.log('%c📍 PART 2: VOCABULARY (How it\'s written)', 'color: #9146FF; font-weight: bold');
  console.log('%c  Selected:', 'color: #657786', vocabularyId);
  console.log('%c  Prompt:', 'color: #17BF63', vocabularyPrompt.substring(0, 100) + '...');
  
  // Part 3: RHETORIC - Approach to topic
  const rhetoricId = request.rhetoric || 'agree_build';
  const rhetoric = getRhetoricalMove(rhetoricId);
  const rhetoricPrompt = rhetoric?.systemPrompt || 'Generate a collaborative reply.';
  
  console.log('%c📍 PART 3: RHETORIC (Approach to topic)', 'color: #FF9F1C; font-weight: bold');
  console.log('%c  Selected:', 'color: #657786', rhetoricId);
  console.log('%c  Label:', 'color: #657786', rhetoric?.name || 'Unknown');
  console.log('%c  Prompt:', 'color: #17BF63', rhetoricPrompt.substring(0, 100) + '...');
  
  // Part 4: LENGTH & PACING - How long/short is the reply
  const lengthPacingId = request.lengthPacing || 'standard';
  const lengthPacingPrompt = getLengthPacingPrompt(lengthPacingId);
  const characterGuidance = getCharacterGuidance(lengthPacingId);
  
  console.log('%c📍 PART 4: LENGTH & PACING (How long/short)', 'color: #E91E63; font-weight: bold');
  console.log('%c  Selected:', 'color: #657786', lengthPacingId);
  console.log('%c  Prompt:', 'color: #17BF63', lengthPacingPrompt.substring(0, 100) + '...');
  if (characterGuidance) {
    console.log('%c  Character Guidance:', 'color: #657786', characterGuidance);
  }
  
  // Combine all parts into final prompt
  const combinedPrompt = buildCombinedPrompt({
    personality: personalityPrompt,
    vocabulary: vocabularyPrompt,
    rhetoric: rhetoricPrompt,
    lengthPacing: lengthPacingPrompt
  });
  
  console.log('%c✨ FINAL COMBINED PROMPT', 'color: #FFD700; font-weight: bold; font-size: 14px');
  console.log('%c  Total Length:', 'color: #657786', combinedPrompt.length + ' characters');
  console.log('%c  Structure:', 'color: #657786', 'Personality → Vocabulary → Rhetoric → Length & Pacing');
  console.log('%c════════════════════════════════════════', 'color: #2E3236');
  
  return {
    personality: personalityPrompt,
    vocabulary: vocabularyPrompt,
    rhetoric: rhetoricPrompt,
    lengthPacing: lengthPacingPrompt,
    combined: combinedPrompt
  };
}

/**
 * Combine the 4 parts into a single, coherent system prompt
 */
function buildCombinedPrompt(components: {
  personality: string;
  vocabulary: string;
  rhetoric: string;
  lengthPacing: string;
}): string {
  // Structure the prompt in clear sections
  const sections = [
    '=== PERSONALITY (Who is talking) ===',
    components.personality,
    '',
    '=== VOCABULARY (How it\'s written) ===',
    components.vocabulary,
    '',
    '=== RHETORIC (Approach to topic) ===',
    components.rhetoric,
    '',
    '=== LENGTH & PACING (How long/short) ===',
    components.lengthPacing,
    '',
    '=== INSTRUCTION ===',
    'Combine ALL FOUR elements above to create the perfect tweet response. Each element is equally important and must be reflected in your response.'
  ];
  
  return sections.join('\n');
}

/**
 * Log the prompt components for debugging
 */
export function logPromptComponents(components: PromptComponents): void {
  console.group('%c🔍 PROMPT COMPONENTS BREAKDOWN', 'color: #FF6B6B; font-weight: bold');
  
  console.log('%c1️⃣ PERSONALITY', 'color: #1DA1F2; font-weight: bold');
  console.log(components.personality);
  
  console.log('%c2️⃣ VOCABULARY', 'color: #9146FF; font-weight: bold');
  console.log(components.vocabulary);
  
  console.log('%c3️⃣ RHETORIC', 'color: #FF9F1C; font-weight: bold');
  console.log(components.rhetoric);
  
  console.log('%c4️⃣ LENGTH & PACING', 'color: #E91E63; font-weight: bold');
  console.log(components.lengthPacing);
  
  console.log('%c🎯 COMBINED PROMPT', 'color: #FFD700; font-weight: bold');
  console.log(components.combined);
  
  console.groupEnd();
}

/**
 * Validate that all required components are present
 */
export function validatePromptComponents(request: ReplyGenerationRequest): {
  isValid: boolean;
  missing: string[];
} {
  const missing: string[] = [];
  
  if (!request.personality) missing.push('personality');
  if (!request.vocabulary) missing.push('vocabulary');
  if (!request.rhetoric) missing.push('rhetoric');
  if (!request.lengthPacing) missing.push('lengthPacing');
  
  if (missing.length > 0) {
    console.warn('%c⚠️ Missing prompt components:', 'color: #FFA500; font-weight: bold', missing);
  }
  
  return {
    isValid: missing.length === 0,
    missing
  };
}