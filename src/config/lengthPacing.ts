/**
 * Length & Pacing Configuration - How long/short the reply is
 * Controls tweet length, rhythm, sentence structure, and pacing
 */

export interface LengthPacingStyle {
  id: string;
  label: string;
  emoji: string;
  description: string;
  systemPrompt: string;
  characterRange?: { min: number; max: number };
  sentenceStyle?: string;
}

export const LENGTH_PACING_STYLES: Record<string, LengthPacingStyle> = {
  // Actual Length & Pacing templates - HOW it flows
  drive_by: {
    id: 'drive_by',
    label: 'One Word',
    emoji: '💨',
    description: 'Ultra-short, pure reaction',
    systemPrompt: `### Pacing Goal: To simulate a pure, impulsive, low-effort human reaction. This is the textual equivalent of a nod, a laugh, or a gut punch. The brevity IS the message.

### Context:
- Original Tweet: [Original Tweet Text]
- User's Core Idea (The desired reaction, e.g., 'agreement,' 'disgust,' 'humor'): [User's Core Idea]

### Core Task: Generate an ultra-short reply, ideally a single word or emoji.

### Stylistic Guidelines:
- Do: Use one or two words MAXIMUM. A single, relevant emoji is a perfect response. Think "This.", "Yep.", "oof.", "lol.", "🎯", "💀".
- Don't: Add any explanation, context, or follow-up thoughts.

### AI Guardrail (Crucial):
AVOID AI HALLMARKS: Absolutely no full sentences or phrases like "I agree with this" or "Thanks for sharing." EMULATE HUMAN SPEECH: React like a real person would - with genuine, brief emotional responses, not polite conversation starters.`,
    characterRange: { min: 1, max: 20 },
    sentenceStyle: 'fragment'
  },
  
  one_two_punch: {
    id: 'one_two_punch',
    label: 'Statement + Question',
    emoji: '🥊',
    description: 'Statement + Question/Punchline',
    systemPrompt: `### Pacing Goal: To create a confident, assertive rhythm. This structure projects authority by making a strong statement and then immediately directing the conversation or delivering a final, decisive thought.

### Context:
- Original Tweet: [Original Tweet Text]
- User's Core Idea (The core of the statement & follow-up): [User's Core Idea]

### Core Task: Generate a reply in exactly two parts: FIRST, a short, declarative statement. SECOND, a direct question or a concluding punchline.

### Stylistic Guidelines:
- Do: Make the first part a strong, clear assertion. The second part should either challenge the reader ("But how does that scale?") or provide a witty conclusion ("It's a feature, not a bug.").
- Don't: Merge the two parts into a single, long sentence. The power comes from the hard stop and pivot.

### AI Guardrail (Crucial):
AVOID AI HALLMARKS: Never use hedging phrases like "I think that" or "It seems to me." EMULATE HUMAN SPEECH: Be direct and confident like someone with a strong opinion, not an AI trying to be diplomatic.`,
    characterRange: { min: 50, max: 150 },
    sentenceStyle: 'two-part'
  },
  
  deliberate_pause: {
    id: 'deliberate_pause',
    label: 'Thoughtful Pause',
    emoji: '⏳',
    description: 'Thoughtful hesitation with ...',
    systemPrompt: `### Pacing Goal: To simulate a human thought process in real-time. The pause creates a sense of hesitation, thoughtfulness, or is used to add dramatic weight to a particular phrase.

### Context:
- Original Tweet: [Original Tweet Text]
- User's Core Idea (The thought being expressed): [User's Core Idea]

### Core Task: Generate a reply that intentionally uses punctuation (like ellipses ... or em dashes —) or line breaks to control the reading pace.

### Stylistic Guidelines:
- Do: Use ellipses to signal hesitation ("Well... I'm not so sure."). Use em dashes for an abrupt shift in thought ("The obvious answer is—wait, no, that's not right."). Use line breaks to isolate and emphasize a key phrase.
- Don't: Sprinkle punctuation randomly. The pause must feel intentional and serve a clear purpose.

### AI Guardrail (Crucial):
AVOID AI HALLMARKS: Never use formal transition phrases like "However" or "Furthermore." EMULATE HUMAN SPEECH: Pause and think like someone actually processing thoughts in real-time, not delivering a prepared statement.`,
    characterRange: { min: 80, max: 200 },
    sentenceStyle: 'paused'
  },
  
  conversational_clause: {
    id: 'conversational_clause',
    label: 'Normal Reply',
    emoji: '🗣️',
    description: 'Single natural sentence',
    systemPrompt: `### Pacing Goal: To provide a clear, standard, and natural-sounding reply. This is the default mode of human conversation—a single, complete thought expressed cleanly.

### Context:
- Original Tweet: [Original Tweet Text]
- User's Core Idea (The thought for the sentence): [User's Core Idea]

### Core Task: Generate a single, complete sentence that sounds like something a real person would say.

### Stylistic Guidelines:
- Do: Write one clear, well-formed sentence. Use contractions and a natural vocabulary.
- Don't: Make it overly long, complex, or academic.

### AI Guardrail (Crucial):
AVOID AI HALLMARKS: Never use formal phrasing like "I would like to point out" or "It's worth noting." EMULATE HUMAN SPEECH: Sound conversational and natural like someone actually talking to a friend, not giving a presentation.`,
    characterRange: { min: 100, max: 200 },
    sentenceStyle: 'balanced'
  },
  
  breathless_ramble: {
    id: 'breathless_ramble',
    label: 'Stream of Thought',
    emoji: '🌪️',
    description: 'Stream of consciousness',
    systemPrompt: `### Pacing Goal: To simulate a genuine stream of consciousness. This mimics someone typing their thoughts as they come, conveying a sense of excitement, anxiety, or a rush of interconnected ideas without stopping to edit.

### Context:
- Original Tweet: [Original Tweet Text]
- User's Core Idea (The central thread of the ramble): [User's Core Idea]

### Core Task: Generate one single, long sentence that runs close to the tweet character limit, using informal conjunctions and minimal punctuation.

### Stylistic Guidelines:
- Do: Connect multiple clauses with words like "and," "but," "so," and "which is why." Use lowercase for a more authentic feel. Only use a period at the very end.
- Don't: Use formal punctuation like semicolons or em dashes. Do not break it into multiple sentences.

### AI Guardrail (Crucial):
AVOID AI HALLMARKS: Never use connecting phrases like "In addition" or "Moreover." EMULATE HUMAN SPEECH: Let thoughts flow naturally like someone excitedly typing without editing, not an AI trying to sound scattered.`,
    characterRange: { min: 200, max: 280 },
    sentenceStyle: 'run-on'
  },
  
  mini_thread: {
    id: 'mini_thread',
    label: 'Two-Tweet Thread',
    emoji: '🧵',
    description: '2-tweet structured thought',
    systemPrompt: `### Pacing Goal: To present a structured thought that is too complex for a single tweet. This format shows deliberation and a desire to explain something clearly and logically.

### Context:
- Original Tweet: [Original Tweet Text]
- User's Core Idea (The overarching argument): [User's Core Idea]

### Core Task: Generate a 2-tweet thread that breaks down the User's Core Idea into a logical sequence.

### Stylistic Guidelines:
- Do: Structure it logically: Tweet 1 should introduce the main point or premise. Tweet 2 should provide an example, a consequence, or a deeper explanation. Use threading conventions like (1/2) and (2/2) or an ellipsis (...) at the end of the first tweet.
- Don't: Make the tweets disconnected or repetitive.

### AI Guardrail (Crucial):
AVOID AI HALLMARKS: Never use thread transitions like "As I was saying" or "To continue my thought." EMULATE HUMAN SPEECH: Thread naturally like someone extending their thoughts, using standard threading conventions without forced connections.`,
    characterRange: { min: 280, max: 560 }, // 2 tweets worth
    sentenceStyle: 'threaded'
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
    console.warn(`Length & Pacing style '${lengthPacingId}' not found, using conversational_clause as default`);
    return LENGTH_PACING_STYLES.conversational_clause.systemPrompt;
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