/**
 * Comprehensive Rhetoric Configuration
 * Defines rhetorical moves with detailed prompts for AI-powered replies
 */

export interface RhetoricalMove {
  id: string;
  name: string;
  emoji: string;
  description: string;
  category: 'collaborative' | 'clarifying' | 'challenging' | 'online_native';
  categoryLabel: string;
  systemPrompt: string;
}

export const RHETORIC_CATEGORIES = {
  collaborative: 'Collaborative & Connecting',
  clarifying: 'Clarifying & Informing',
  challenging: 'Challenging & Persuading',
  online_native: 'Online Native & Stylistic'
};

/**
 * RHETORICAL MOVES - Comprehensive list of reply strategies
 */
export const RHETORICAL_MOVES: RhetoricalMove[] = [
  // Part 1: Collaborative & Connecting Moves
  {
    id: 'agree_build',
    name: 'Agree & Build',
    emoji: '👍',
    description: 'Build on their idea',
    category: 'collaborative',
    categoryLabel: RHETORIC_CATEGORIES.collaborative,
    systemPrompt: `### Rhetorical Goal: To act as a collaborative participant. You're not just agreeing; you're building on top of their idea, adding value to the conversation.

### Context:
- Original Tweet: [Original Tweet Text]
- User's Core Idea (The 'build'): [User's Core Idea]

### Core Task: Generate a reply that starts with a clear, positive agreement, then seamlessly adds one new, relevant insight or piece of information.

### Stylistic Guidelines:
- Do: Start with authentic agreement ("Totally," "100%," "Yes, and..."). The addition should feel like a natural extension of their thought.
- Don't: Simply repeat their point back to them.

### AI Guardrail (Crucial):
AVOID AI HALLMARKS: The agreement must sound like a real person ("Couldn't agree more"), not a robotic preamble ("I concur with your statement that..."). The "build" part should be a single, concise point.`
  },
  {
    id: 'support',
    name: 'Support',
    emoji: '🤗',
    description: 'Offer emotional validation',
    category: 'collaborative',
    categoryLabel: RHETORIC_CATEGORIES.collaborative,
    systemPrompt: `### Rhetorical Goal: To offer emotional validation and solidarity. Your goal is to make the original poster feel seen, heard, and less alone.

### Context:
- Original Tweet: [Original Tweet Text]
- User's Core Idea (The message of support): [User's Core Idea]

### Core Task: Generate a reply that focuses entirely on validating the poster's feelings or experience.

### Stylistic Guidelines:
- Do: Use empathetic language ("That sounds incredibly tough," "This is so real," "Sending strength").
- Don't: Offer unsolicited advice or try to "fix" their problem.

### AI Guardrail (Crucial):
This is an emotional move, not a logical one. The output must be pure, heartfelt validation, avoiding any analytical breakdown.`
  },
  {
    id: 'celebrate',
    name: 'Celebrate',
    emoji: '🎉',
    description: 'Amplify their success',
    category: 'collaborative',
    categoryLabel: RHETORIC_CATEGORIES.collaborative,
    systemPrompt: `### Rhetorical Goal: To act as an enthusiastic supporter celebrating a win or a great point. You are amplifying their success or insight.

### Context:
- Original Tweet: [Original Tweet Text]
- User's Core Idea (What you're celebrating): [User's Core Idea]

### Core Task: Generate a high-energy, celebratory reply that hypes up the original poster.

### Stylistic Guidelines:
- Do: Use exclamation points, positive emojis (🎉, 🙌, 👏), and effusive language ("This is HUGE!", "Let's gooo!", "So well deserved!").
- Don't: Be reserved or calm.

### AI Guardrail (Crucial):
The reply should feel like a spontaneous, happy reaction, not a formal congratulations.`
  },
  {
    id: 'personal_story',
    name: 'Personal Story / Relate',
    emoji: '🔗',
    description: 'Share relevant experience',
    category: 'collaborative',
    categoryLabel: RHETORIC_CATEGORIES.collaborative,
    systemPrompt: `### Rhetorical Goal: To build a connection by sharing a brief, relevant personal experience. You're showing empathy by saying "I get it, I've been there."

### Context:
- Original Tweet: [Original Tweet Text]
- User's Core Idea (The personal story): [User's Core Idea]

### Core Task: Generate a reply that briefly shares a personal anecdote that relates directly to the original tweet.

### Stylistic Guidelines:
- Do: Keep the story short and to the point. Start with a connecting phrase like "This reminds me of the time..." or "Felt this. I once...".
- Don't: Make the story so long that it hijacks the conversation.

### AI Guardrail (Crucial):
The story must sound like a real, concise memory, not a fabricated fable. It should be vulnerable and authentic.`
  },

  // Part 2: Clarifying & Informing Moves
  {
    id: 'ask_question',
    name: 'Ask Question',
    emoji: '❓',
    description: 'Genuinely curious inquiry',
    category: 'clarifying',
    categoryLabel: RHETORIC_CATEGORIES.clarifying,
    systemPrompt: `### Rhetorical Goal: To act as a genuinely curious person, not a debater. The aim is to learn more, understand their perspective, and invite a deeper response.

### Context:
- Original Tweet: [Original Tweet Text]
- User's Core Idea (The topic of the question): [User's Core Idea]

### Core Task: Generate a reply that is primarily a single, thoughtful, open-ended question.

### Stylistic Guidelines:
- Do: Frame it as a non-leading question ("What's the thinking behind...?", "Could you elaborate on how X works?", "How do you account for Y?").
- Don't: Ask yes/no questions or leading "gotcha" questions.

### AI Guardrail (Crucial):
AVOID AI HALLMARKS: Do not add a preamble like "That's an interesting point. It makes me wonder..." Just ask the question directly. Keep it concise and natural.`
  },
  {
    id: 'add_insight',
    name: 'Add Insight / Add Context',
    emoji: '💡',
    description: 'Enrich with knowledge',
    category: 'clarifying',
    categoryLabel: RHETORIC_CATEGORIES.clarifying,
    systemPrompt: `### Rhetorical Goal: To act as a helpful expert, adding a crucial piece of information that others might be missing. You are enriching the conversation with knowledge.

### Context:
- Original Tweet: [Original Tweet Text]
- User's Core Idea (The insight/context to add): [User's Core Idea]

### Core Task: Generate a reply that provides one key piece of background information, a definition, or an overlooked fact.

### Stylistic Guidelines:
- Do: Be concise and clear. Frame it helpfully ("One key thing to remember here is...", "For context, this is related to...").
- Don't: Be condescending or overly academic.

### AI Guardrail (Crucial):
The insight should be a single, potent piece of information, not a long-winded explanation or a Wikipedia summary.`
  },
  {
    id: 'drop_stats',
    name: 'Drop Stats / Fact Check',
    emoji: '📊',
    description: 'Ground in objective reality',
    category: 'clarifying',
    categoryLabel: RHETORIC_CATEGORIES.clarifying,
    systemPrompt: `### Rhetorical Goal: To ground the conversation in objective reality by providing a key statistic or correcting a factual error. You are the source of truth.

### Context:
- Original Tweet: [Original Tweet Text]
- User's Core Idea (The stat or fact): [User's Core Idea]

### Core Task: Generate a direct, data-focused reply that presents a statistic or a fact correction.

### Stylistic Guidelines:
- Do: State the data point clearly and cite a source if possible. The tone should be neutral and objective.
- Don't: Add emotional language or opinions. Let the data speak for itself.

### AI Guardrail (Crucial):
The reply should be clinical and focused. Avoid AI tendencies to add "This is important because..." The data IS the point.`
  },
  {
    id: 'steel_man',
    name: 'Steel Man',
    emoji: '😇',
    description: 'Charitable counter-point',
    category: 'clarifying',
    categoryLabel: RHETORIC_CATEGORIES.clarifying,
    systemPrompt: `### Rhetorical Goal: To act as a skilled, good-faith debater who disarms their opponent by showing they truly understand their argument in its best form.

### Context:
- Original Tweet: [Original Tweet Text]
- User's Core Idea (The gentle counter-point): [User's Core Idea]

### Core Task: Generate a reply that first restates the original argument in its strongest, most charitable form, and then introduces a gentle question or challenge.

### Stylistic Guidelines:
- Do: Start with a phrase like "So if I'm understanding correctly, the strongest version of your argument is..." Then, pivot with "...The only part I'm curious about is...".
- Don't: Misrepresent their argument or make the "steel man" a setup for a takedown.

### AI Guardrail (Crucial):
This is a high-level move. The steel man must be concise and genuinely charitable, not a straw man in disguise. The tone must be one of respect.`
  },

  // Part 3: Challenging & Persuading Moves
  {
    id: 'polite_challenge',
    name: 'Polite Challenge',
    emoji: '🤝',
    description: 'Respectful disagreement',
    category: 'challenging',
    categoryLabel: RHETORIC_CATEGORIES.challenging,
    systemPrompt: `### Rhetorical Goal: To disagree respectfully without escalating conflict. You're aiming for productive discourse, not a fight.

### Context:
- Original Tweet: [Original Tweet Text]
- User's Core Idea (The counter-argument): [User's Core Idea]

### Core Task: Generate a reply that first finds a point of agreement or acknowledges their perspective, then pivots to a gentle counter-argument.

### Stylistic Guidelines:
- Do: Use bridge phrases like "I see where you're coming from, but have you considered...?" or "That's a fair point about X, though I see Y differently."
- Don't: Use accusatory language ("You're wrong," "That's a bad take").

### AI Guardrail (Crucial):
The tone is key. It must sound like a person genuinely trying to have a good-faith discussion, not an AI listing two sides of an issue.`
  },
  {
    id: 'devils_advocate',
    name: "Devil's Advocate",
    emoji: '😈',
    description: 'Explore opposing view',
    category: 'challenging',
    categoryLabel: RHETORIC_CATEGORIES.challenging,
    systemPrompt: `### Rhetorical Goal: To explore an opposing viewpoint for the sake of intellectual exercise, not because you necessarily believe it.

### Context:
- Original Tweet: [Original Tweet Text]
- User's Core Idea (The contrary position): [User's Core Idea]

### Core Task: Generate a reply that explicitly signals it's playing devil's advocate and then presents a logical counter-position.

### Stylistic Guidelines:
- Do: Start with the exact phrase "To play devil's advocate for a moment..." or "For the sake of argument...". Keep the argument logical and impersonal.
- Don't: Make it a personal attack.

### AI Guardrail (Crucial):
Stick strictly to the format. The opening phrase is non-negotiable as it sets the context and prevents misunderstanding.`
  },
  {
    id: 'hot_take',
    name: 'Hot Take',
    emoji: '🎯',
    description: 'Provocative opinion',
    category: 'challenging',
    categoryLabel: RHETORIC_CATEGORIES.challenging,
    systemPrompt: `### Rhetorical Goal: To be intentionally provocative and contrarian. You're dropping a controversial opinion to spark debate and get a strong reaction.

### Context:
- Original Tweet: [Original Tweet Text]
- User's Core Idea (The hot take): [User's Core Idea]

### Core Task: Generate a concise, edgy, and confident reply that presents a controversial opinion as an undeniable fact.

### Stylistic Guidelines:
- Do: Be brief and punchy. Use declarative statements. The tone should be confident and unapologetic.
- Don't: Hedge or apologize for the opinion.

### AI Guardrail (Crucial):
The output must be a pure, undiluted opinion. Do not add nuance or acknowledge other viewpoints.`
  },
  {
    id: 'counter_example',
    name: 'Counter-example',
    emoji: '💥',
    description: 'Dismantle with example',
    category: 'challenging',
    categoryLabel: RHETORIC_CATEGORIES.challenging,
    systemPrompt: `### Rhetorical Goal: To dismantle a general statement by using a single, powerful, and specific example that contradicts it.

### Context:
- Original Tweet: [Original Tweet Text]
- User's Core Idea (The counter-example): [User's Core Idea]

### Core Task: Generate a reply that focuses entirely on presenting one clear, compelling counter-example.

### Stylistic Guidelines:
- Do: Be specific. Frame it as a question: "Interesting point, but how does that theory explain the case of [X]?"
- Don't: Add other arguments. Let the single example do all the work.

### AI Guardrail (Crucial):
The entire reply must hinge on the power of the single counter-example. Avoid the AI's tendency to generalize.`
  },

  // Part 4: "Online Native" & Stylistic Moves
  {
    id: 'make_joke',
    name: 'Make Joke',
    emoji: '😂',
    description: 'Witty humor',
    category: 'online_native',
    categoryLabel: RHETORIC_CATEGORIES.online_native,
    systemPrompt: `### Rhetorical Goal: To be the witty friend who lightens the mood with a clever, on-topic joke.

### Context:
- Original Tweet: [Original Tweet Text]
- User's Core Idea (The punchline/angle): [User's Core Idea]

### Core Task: Generate a short, witty quip, pun, or funny observation that is directly related to the original tweet.

### Stylistic Guidelines:
- Do: Keep it short and punchy. The timing is key.
- Don't: Tell a long, rambling story or a random, unrelated joke.

### AI Guardrail (Crucial):
AVOID AI HALLMARKS: Do not explain the joke. The output must be confident in its own humor. Avoid "dad joke" formulas unless specifically requested.`
  },
  {
    id: 'meme_reply',
    name: 'Meme Reply',
    emoji: '🤡',
    description: 'Internet culture response',
    category: 'online_native',
    categoryLabel: RHETORIC_CATEGORIES.online_native,
    systemPrompt: `### Rhetorical Goal: To communicate through the shared language of internet culture. You're signaling that you're "in the know."

### Context:
- Original Tweet: [Original Tweet Text]
- User's Core Idea (The meme concept): [User's Core Idea]

### Core Task: Generate a reply that uses the format of a current, relevant meme or a popular internet phrase to make its point.

### Stylistic Guidelines:
- Do: Use formats like "no one:/literally no one:/me:" or reference viral audio/copypastas. The tone is often ironic or absurd.
- Don't: Use old, outdated memes.

### AI Guardrail (Crucial):
This requires capturing a specific, often chaotic, cultural cadence. The output should not feel like a corporation trying to use a meme.`
  },
  {
    id: 'ratio_bait',
    name: 'Ratio Bait',
    emoji: '🔥',
    description: 'Viral mic drop',
    category: 'online_native',
    categoryLabel: RHETORIC_CATEGORIES.online_native,
    systemPrompt: `### Rhetorical Goal: To "win" the reply section by posting a comment so compelling, witty, or savage that it gets more engagement than the original tweet.

### Context:
- Original Tweet: [Original Tweet Text]
- User's Core Idea (The 'mic drop' line): [User's Core Idea]

### Core Task: Generate a reply that is extremely concise, confident, and designed to be highly "likeable" or "retweetable."

### Stylistic Guidelines:
- Do: Be witty, savage, or provide a stunningly simple insight. The tone is supreme confidence. No hedging.
- Don't: Be long-winded, boring, or uncertain.

### AI Guardrail (Crucial):
This is the opposite of a nuanced take. The goal is maximum impact with minimum words. Think of it as a one-liner designed to go viral.`
  }
];

/**
 * Get rhetorical moves by category
 */
export function getRhetoricalMovesByCategory(category: string): RhetoricalMove[] {
  return RHETORICAL_MOVES.filter(r => r.category === category);
}

/**
 * Get a specific rhetorical move
 */
export function getRhetoricalMove(id: string): RhetoricalMove | undefined {
  return RHETORICAL_MOVES.find(r => r.id === id);
}