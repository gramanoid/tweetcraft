/**
 * Five-Step AI Reply System Configuration
 * This file contains the comprehensive data structure for the new reply generation system
 * with Persona & Framing, Attitude, Rhetoric, Vocabulary, and Format & Pacing options
 */

export interface ReplyOption {
  id: string;
  label: string;
  description: string;
  prompt: string;
  incompatibleWith: string[];
}

export interface ReplyOptionsStructure {
  personaFraming: ReplyOption[];
  attitude: {
    constructive: ReplyOption[];
    ironic: ReplyOption[];
    antagonistic: ReplyOption[];
  };
  rhetoric: {
    directEngagement: ReplyOption[];
    informational: ReplyOption[];
    creative: ReplyOption[];
    inquisitive: ReplyOption[];
  };
  vocabulary: {
    professional: ReplyOption[];
    conversational: ReplyOption[];
    internet: ReplyOption[];
  };
  formatPacing: ReplyOption[];
}

/**
 * REPLY_OPTIONS - The new single source of truth for all reply generation options
 * Each option includes its prompt and incompatibility rules for the warning system
 */
export const REPLY_OPTIONS: ReplyOptionsStructure = {
  personaFraming: [
    // Personas
    { 
      id: 'persona-expert', 
      label: '🎭 Expert Persona', 
      description: 'Jaded but helpful expert',
      prompt: "Generate a reply from the persona of a seasoned expert who has seen this topic debated endlessly. The tone should be slightly jaded, direct, and pragmatic, but ultimately helpful. Start with a phrase like 'Look,' or 'The thing is...'.",
      incompatibleWith: []
    },
    { 
      id: 'persona-builder', 
      label: '🚀 Builder Persona', 
      description: 'Enthusiastic about technology and action',
      prompt: "Generate a reply from the persona of an optimistic builder. The tone should be high-energy, positive, and focused on future possibilities and taking action. Use words like 'build,' 'ship,' or 'let's go.'",
      incompatibleWith: ['attitude-mean', 'attitude-hostile', 'attitude-dismissive']
    },
    { 
      id: 'persona-jester', 
      label: '🤡 Jester Persona', 
      description: 'Sarcastic and funny observer of absurdity',
      prompt: "Generate a reply from the persona of a cynical jester. The tone should be darkly humorous and sarcastic, pointing out the absurdity in the original tweet. Use irony.",
      incompatibleWith: ['attitude-earnest', 'attitude-supportive', 'rhetoric-steel-man']
    },
    { 
      id: 'persona-nurturer', 
      label: '🫂 Nurturer Persona', 
      description: 'Supportive, empathetic, and encouraging',
      prompt: "Generate a reply from the persona of a community nurturer. The tone should be extremely supportive, empathetic, and encouraging. Validate the original poster's point and aim to make them feel heard.",
      incompatibleWith: ['attitude-mean', 'attitude-hostile', 'attitude-inflammatory', 'attitude-condescending', 'attitude-sarcastic', 'attitude-dismissive']
    },
    // Framings
    { 
      id: 'framing-personal', 
      label: '🗣️ Personal Framing', 
      description: 'Frames reply from personal perspective',
      prompt: "Frame the reply from a personal perspective. Start with a phrase like 'Speaking for myself...', 'In my experience...', or 'As a [relevant role]...'.",
      incompatibleWith: []
    },
    { 
      id: 'framing-humble', 
      label: '🙇 Humble Framing', 
      description: 'Frames reply with humility',
      prompt: "Frame the reply with humility. Start with a phrase like 'Just a thought, but...', 'I might be missing something here...', or 'Correct me if I'm wrong...'.",
      incompatibleWith: ['attitude-confident', 'attitude-condescending', 'attitude-mean', 'framing-authoritative']
    },
    { 
      id: 'framing-authoritative', 
      label: '🎯 Confident Framing', 
      description: 'Frames reply with confidence',
      prompt: "Frame the reply with confidence. Start with a phrase like 'Let's be clear:', 'The simple fact is...', or 'There's no question that...'.",
      incompatibleWith: ['framing-humble', 'attitude-pensive', 'attitude-inquisitive']
    },
    { 
      id: 'framing-collaborative', 
      label: '🤝 Collaborative Framing', 
      description: 'Builds on the original point',
      prompt: "Frame the reply collaboratively. Start with a phrase like 'Building on your point...', 'I agree, and to add to that...', or 'Yes, and...'.",
      incompatibleWith: ['attitude-mean', 'attitude-dismissive', 'rhetoric-hot-take', 'attitude-hostile']
    }
  ],
  
  attitude: {
    constructive: [
      { 
        id: 'attitude-friendly', 
        label: '😊 Friendly', 
        description: 'Warm and approachable',
        prompt: "Use a warm, approachable, and positive tone. Use friendly language and maybe a positive emoji.",
        incompatibleWith: ['attitude-mean', 'attitude-hostile', 'attitude-sarcastic', 'attitude-dismissive']
      },
      { 
        id: 'attitude-professional', 
        label: '💼 Professional', 
        description: 'Formal and restrained',
        prompt: "Maintain a respectful, formal, and restrained tone suitable for a corporate or expert setting.",
        incompatibleWith: ['vocab-shitposter', 'vocab-genz', 'vocab-fanspeak']
      },
      { 
        id: 'attitude-supportive', 
        label: '🤗 Supportive', 
        description: 'Empathetic and encouraging',
        prompt: "Use an empathetic and encouraging tone. Validate the original poster's feelings or point of view.",
        incompatibleWith: ['attitude-mean', 'attitude-hostile', 'attitude-sarcastic', 'persona-jester', 'attitude-dismissive']
      },
      { 
        id: 'attitude-motivational', 
        label: '💪 Motivational', 
        description: 'Energetic and uplifting',
        prompt: "Generate an energetic, aspirational, and uplifting reply. Aim to inspire the original poster or the audience.",
        incompatibleWith: ['attitude-weary', 'attitude-sarcastic', 'attitude-dismissive']
      },
      { 
        id: 'attitude-earnest', 
        label: '🧘 Earnest', 
        description: 'Completely sincere',
        prompt: "Use a completely sincere and straightforward tone. Avoid all traces of sarcasm, irony, or cynicism.",
        incompatibleWith: ['persona-jester', 'attitude-sarcastic', 'attitude-snarky', 'attitude-dry']
      },
      { 
        id: 'attitude-diplomatic', 
        label: '🧭 Diplomatic', 
        description: 'Balanced and de-escalating',
        prompt: "Generate a balanced, non-confrontational, and de-escalating reply. Aim to find common ground or gently reframe the conversation.",
        incompatibleWith: ['attitude-mean', 'attitude-hostile', 'attitude-provocative']
      },
      { 
        id: 'attitude-inquisitive', 
        label: '🤔 Inquisitive', 
        description: 'Genuinely curious',
        prompt: "Generate a genuinely curious reply that seeks to learn more. Ask open-ended questions to understand their perspective better.",
        incompatibleWith: ['framing-authoritative', 'attitude-condescending']
      },
      { 
        id: 'attitude-calm', 
        label: '😌 Calm/Zen', 
        description: 'Serene and unbothered',
        prompt: "Generate a serene, unbothered, and high-level perspective reply. The tone should be calming and detached from emotional fray.",
        incompatibleWith: ['attitude-dramatic', 'attitude-provocative']
      },
      { 
        id: 'attitude-enthusiastic', 
        label: '🙌 Enthusiastic', 
        description: 'High-energy and eager',
        prompt: "Generate a high-energy, eager, and positive reply. Use exclamation points and effusive language to convey excitement.",
        incompatibleWith: ['attitude-weary', 'attitude-dry']
      },
      { 
        id: 'attitude-awestruck', 
        label: '🤩 Awestruck', 
        description: 'Genuine admiration',
        prompt: "Generate a reply that expresses genuine, unironic admiration or awe.",
        incompatibleWith: ['attitude-sarcastic', 'attitude-dismissive']
      },
      { 
        id: 'attitude-pensive', 
        label: '🤔 Pensive', 
        description: 'Thinking out loud',
        prompt: "Generate a reply that sounds like someone thinking out loud. The tone should be pensive and not fully committed to a stance.",
        incompatibleWith: ['framing-authoritative', 'attitude-confident']
      }
    ],
    
    ironic: [
      { 
        id: 'attitude-witty', 
        label: '😄 Witty', 
        description: 'Clever and insightful',
        prompt: "Use a clever and insightful tone. The humor should be smart and on-topic.",
        incompatibleWith: []
      },
      { 
        id: 'attitude-snarky', 
        label: '😏 Snarky', 
        description: 'Playful sharp edge',
        prompt: "Generate a reply with a playful, sharp edge. It should be subtly mocking or critical without being a direct personal attack.",
        incompatibleWith: ['attitude-earnest', 'attitude-supportive']
      },
      { 
        id: 'attitude-dry', 
        label: '🙃 Dry/Deadpan', 
        description: 'Understated irony',
        prompt: "Generate an understated, ironic reply. The humor should come from a complete lack of obvious emotion.",
        incompatibleWith: ['attitude-earnest', 'attitude-enthusiastic']
      },
      { 
        id: 'attitude-sarcastic', 
        label: '😒 Sarcastic', 
        description: 'Says opposite of what is meant',
        prompt: "Use a mocking, sarcastic tone that says the opposite of what is literally meant to show disapproval.",
        incompatibleWith: ['persona-nurturer', 'attitude-earnest', 'attitude-supportive', 'attitude-friendly']
      },
      { 
        id: 'attitude-dramatic', 
        label: '🎭 Dramatic', 
        description: 'Exaggerated and theatrical',
        prompt: "Generate an exaggerated, hyperbolic, and theatrical reply. Use vivid language for dramatic effect.",
        incompatibleWith: ['attitude-calm', 'attitude-professional']
      },
      { 
        id: 'attitude-provocative', 
        label: '🔥 Provocative', 
        description: 'Bold and challenging',
        prompt: "Generate a bold, challenging, and risk-tolerant reply. It should be designed to spark debate.",
        incompatibleWith: ['attitude-diplomatic', 'attitude-calm']
      },
      { 
        id: 'attitude-controversial', 
        label: '💣 Controversial', 
        description: 'Intentionally divisive',
        prompt: "Generate a reply that intentionally takes the most divisive and unpopular stance possible on the topic.",
        incompatibleWith: ['attitude-diplomatic', 'persona-nurturer']
      },
      { 
        id: 'attitude-devils-advocate', 
        label: '😈 Devil\'s Advocate', 
        description: 'Argues contrary position',
        prompt: "Generate a reply that argues a contrary position for the sake of argument, starting with 'For the sake of argument...'.",
        incompatibleWith: ['attitude-supportive', 'persona-nurturer']
      },
      { 
        id: 'attitude-weary', 
        label: '🥱 Weary', 
        description: 'Exhausted with discourse',
        prompt: "Generate a reply that conveys a sense of fatigue or exhaustion with the discourse.",
        incompatibleWith: ['attitude-enthusiastic', 'attitude-motivational']
      }
    ],
    
    antagonistic: [
      { 
        id: 'attitude-mean', 
        label: '😠 Mean/Hostile', 
        description: 'Directly insulting',
        prompt: "Use a directly insulting and belittling tone.",
        incompatibleWith: ['persona-nurturer', 'persona-builder', 'framing-humble', 'framing-collaborative', 'rhetoric-steel-man', 'attitude-friendly', 'attitude-supportive']
      },
      { 
        id: 'attitude-dismissive', 
        label: '🙄 Dismissive', 
        description: 'Treats as irrelevant',
        prompt: "Generate a reply that treats the post as irrelevant, unintelligent, or a waste of time, using phrases like 'anyway' or 'ok, and?'.",
        incompatibleWith: ['persona-nurturer', 'persona-builder', 'framing-collaborative', 'attitude-supportive', 'attitude-friendly']
      },
      { 
        id: 'attitude-inflammatory', 
        label: '🔥 Inflammatory', 
        description: 'Designed to provoke anger',
        prompt: "Generate a reply designed to provoke maximum anger and arguments from readers, using baiting language.",
        incompatibleWith: ['persona-nurturer', 'attitude-diplomatic', 'attitude-calm']
      },
      { 
        id: 'attitude-condescending', 
        label: '🧐 Condescending', 
        description: 'Speaks down to author',
        prompt: "Generate a reply that speaks down to the author, explaining something as if they are a child. Use phrases like 'let me explain' or 'actually...'.",
        incompatibleWith: ['persona-nurturer', 'framing-humble', 'attitude-supportive', 'attitude-inquisitive']
      },
      { 
        id: 'attitude-hostile', 
        label: '🤬 Hostile', 
        description: 'Aggressive and combative',
        prompt: "Generate an aggressive and combative reply with strong negative emotion.",
        incompatibleWith: ['persona-nurturer', 'persona-builder', 'framing-collaborative', 'attitude-friendly', 'attitude-supportive', 'attitude-diplomatic']
      }
    ]
  },
  
  rhetoric: {
    directEngagement: [
      { 
        id: 'rhetoric-agree-add', 
        label: '👍 Agree & Add', 
        description: 'Agrees then adds info',
        prompt: "First agree with the main point, then add one new, useful piece of information or perspective.",
        incompatibleWith: ['attitude-mean', 'attitude-dismissive', 'attitude-hostile']
      },
      { 
        id: 'rhetoric-polite-challenge', 
        label: '🤝 Polite Challenge', 
        description: 'Respectfully challenges',
        prompt: "Respectfully challenge the argument. Start by finding a point of agreement, then pivot to a counter-argument.",
        incompatibleWith: ['attitude-mean', 'attitude-hostile']
      },
      { 
        id: 'rhetoric-steel-man', 
        label: '😇 Steel-man', 
        description: 'Strengthen then address',
        prompt: "First 'steel-man' the original tweet by summarizing its argument in the most favorable way possible. Then, gently introduce a counter-point or question.",
        incompatibleWith: ['attitude-mean', 'attitude-hostile', 'persona-jester', 'attitude-dismissive']
      },
      { 
        id: 'rhetoric-concede-point', 
        label: '✅ Concede Point', 
        description: 'Acknowledges validity',
        prompt: "Start by conceding a specific point from the original tweet. Use a phrase like 'That's a great point,' or 'You're right about that.' Then briefly add your related thought.",
        incompatibleWith: ['attitude-dismissive', 'attitude-mean']
      },
      { 
        id: 'rhetoric-find-disagreement', 
        label: '🎯 Find Core Disagreement', 
        description: 'Identifies key conflict',
        prompt: "Attempt to find the core disagreement. Say something like, 'It seems we both agree on [Point A], but the real disagreement is about [Point B]. Is that right?'",
        incompatibleWith: ['format-single-word', 'attitude-dismissive']
      },
      { 
        id: 'rhetoric-counter-example', 
        label: '💥 Counter-example', 
        description: 'Single powerful counter',
        prompt: "Provide a single, powerful counter-example that challenges their general claim.",
        incompatibleWith: []
      }
    ],
    
    informational: [
      { 
        id: 'rhetoric-add-context', 
        label: '📚 Add Context', 
        description: 'Provides background',
        prompt: "Provide essential background information or define a key term to give more context.",
        incompatibleWith: ['format-single-word']
      },
      { 
        id: 'rhetoric-share-experience', 
        label: '🔗 Share Experience', 
        description: 'Personal anecdote',
        prompt: "Share a relevant personal anecdote or observed experience.",
        incompatibleWith: ['format-single-word']
      },
      { 
        id: 'rhetoric-zoom-out', 
        label: '🔭 Zoom Out', 
        description: 'Big picture view',
        prompt: "Re-contextualize the topic by connecting it to a larger trend or historical pattern.",
        incompatibleWith: []
      },
      { 
        id: 'rhetoric-analogy', 
        label: '🧠 Analogy', 
        description: 'Explains via comparison',
        prompt: "Explain a core concept using a simple analogy from a more familiar domain.",
        incompatibleWith: []
      },
      { 
        id: 'rhetoric-pros-cons', 
        label: '➕➖ Pros/Cons', 
        description: 'Lists both sides',
        prompt: "Quickly list the pros and cons of their main point.",
        incompatibleWith: ['format-single-word', 'format-statement-question']
      },
      { 
        id: 'rhetoric-myth-fact', 
        label: '🧪 Myth/Fact', 
        description: 'Debunks claim',
        prompt: "Debunk a specific claim by stating it as a 'Myth' and providing the 'Fact'.",
        incompatibleWith: []
      },
      { 
        id: 'rhetoric-risk-caveat', 
        label: '❗ Risk/Caveat', 
        description: 'Points out edge case',
        prompt: "Point out a potential risk, edge case, or important caveat to their argument.",
        incompatibleWith: []
      },
      { 
        id: 'rhetoric-step-by-step', 
        label: '🪜 Step-by-Step', 
        description: 'Breaks down process',
        prompt: "Break down a process into a simple, numbered list (e.g., 1/ 2/ 3/).",
        incompatibleWith: ['format-single-word', 'format-statement-question', 'format-single-sentence']
      }
    ],
    
    creative: [
      { 
        id: 'rhetoric-hot-take', 
        label: '🎯 Hot Take', 
        description: 'Concise contrarian view',
        prompt: "Generate a concise, contrarian, and edgy reply.",
        incompatibleWith: ['framing-collaborative', 'attitude-diplomatic']
      },
      { 
        id: 'rhetoric-make-joke', 
        label: '😂 Make Joke', 
        description: 'On-topic quip',
        prompt: "Generate a short, on-topic quip or joke.",
        incompatibleWith: ['attitude-professional', 'attitude-earnest']
      },
      { 
        id: 'rhetoric-reframe', 
        label: '✍️ Reframe', 
        description: 'Restates differently',
        prompt: "Restate their claim in a new way to clarify it or test its limits.",
        incompatibleWith: []
      },
      { 
        id: 'rhetoric-pull-quote', 
        label: '🔍 Pull-Quote', 
        description: 'Quotes and reacts',
        prompt: "Quote one specific phrase from the original tweet and react directly to that phrase.",
        incompatibleWith: []
      },
      { 
        id: 'rhetoric-compare-contrast', 
        label: '🧩 Compare/Contrast', 
        description: 'Highlights differences',
        prompt: "Compare X and Y, highlighting 1-2 key differences.",
        incompatibleWith: ['format-single-word']
      }
    ],
    
    inquisitive: [
      { 
        id: 'rhetoric-ask-question', 
        label: '❓ Ask Question', 
        description: 'Thoughtful question',
        prompt: "Ask a thoughtful, open-ended question.",
        incompatibleWith: []
      },
      { 
        id: 'rhetoric-suggest-solution', 
        label: '💡 Suggest Solution', 
        description: 'Proposes action',
        prompt: "Propose a specific, actionable solution or next step.",
        incompatibleWith: []
      },
      { 
        id: 'rhetoric-request-data', 
        label: '📊 Request Data', 
        description: 'Asks for evidence',
        prompt: "Politely ask for a source, evidence, or data to support their claim.",
        incompatibleWith: []
      },
      { 
        id: 'rhetoric-call-action', 
        label: '🏃 Call to Action', 
        description: 'Invites participation',
        prompt: "Invite the audience to perform a specific action (e.g., 'Reply with your thoughts,' 'Check out this link').",
        incompatibleWith: []
      },
      { 
        id: 'rhetoric-what-would-take', 
        label: '🧭 What Would It Take?', 
        description: 'Asks for change criteria',
        prompt: "Ask what evidence or conditions would be required to change their mind.",
        incompatibleWith: []
      }
    ]
  },
  
  vocabulary: {
    professional: [
      { 
        id: 'vocab-academic', 
        label: '🎓 Academic', 
        description: 'Precise and formal',
        prompt: "Use precise terminology, nuanced language, and a formal, scholarly structure.",
        incompatibleWith: ['vocab-genz', 'vocab-shitposter', 'vocab-fanspeak']
      },
      { 
        id: 'vocab-technical', 
        label: '🛠️ Technical', 
        description: 'Systems and constraints',
        prompt: "Focus on systems, constraints, trade-offs, and first principles. Use technical but clear language.",
        incompatibleWith: ['vocab-shitposter', 'vocab-fanspeak']
      },
      { 
        id: 'vocab-corporate', 
        label: '👔 Corporate/PR', 
        description: 'Cautious and brand-safe',
        prompt: "Use cautious, reputation-aware language. The tone should be official and brand-safe.",
        incompatibleWith: ['vocab-genz', 'vocab-shitposter', 'persona-jester', 'vocab-fanspeak']
      },
      { 
        id: 'vocab-journalistic', 
        label: '📰 Journalistic', 
        description: 'Inverted pyramid structure',
        prompt: "Structure with the most important information first (inverted pyramid) and attribute any claims.",
        incompatibleWith: ['vocab-shitposter']
      },
      { 
        id: 'vocab-legal', 
        label: '🧾 Legal/Compliance', 
        description: 'Disclaimers and hedging',
        prompt: "Include disclaimers, qualifiers, and carefully hedged language to minimize liability.",
        incompatibleWith: ['vocab-genz', 'vocab-shitposter', 'persona-jester', 'vocab-fanspeak']
      }
    ],
    
    conversational: [
      { 
        id: 'vocab-plain-english', 
        label: '📎 Plain English', 
        description: 'Simple and concrete',
        prompt: "Use simple, short, and concrete words. Avoid jargon and complex sentences.",
        incompatibleWith: []
      },
      { 
        id: 'vocab-storyteller', 
        label: '📚 Storyteller', 
        description: 'Narrative style',
        prompt: "Frame as a short anecdote or story. Start with 'That reminds me of a time...' or a similar hook.",
        incompatibleWith: ['format-single-word']
      },
      { 
        id: 'vocab-marketing', 
        label: '📣 Marketing/Hype', 
        description: 'Benefits and excitement',
        prompt: "Focus on benefits, positive outcomes, and social proof. Build excitement.",
        incompatibleWith: ['attitude-weary', 'attitude-sarcastic']
      }
    ],
    
    internet: [
      { 
        id: 'vocab-genz', 
        label: '😎 Internet/Gen Z', 
        description: 'Current slang and memes',
        prompt: "Use current slang, memes, and casual punctuation (e.g., lowercase, emojis). The tone should be very informal.",
        incompatibleWith: ['vocab-academic', 'vocab-corporate', 'vocab-legal', 'attitude-professional']
      },
      { 
        id: 'vocab-shitposter', 
        label: '🤡 Shitposter', 
        description: 'Absurdist and ironic',
        prompt: "Generate an absurdist, ironic, or non-sequitur reply. It should feel like an inside joke or a surreal meme.",
        incompatibleWith: ['vocab-academic', 'vocab-corporate', 'vocab-legal', 'vocab-technical', 'vocab-journalistic', 'attitude-professional', 'attitude-earnest']
      },
      { 
        id: 'vocab-fanspeak', 
        label: '💖 Fan/Stanspeak', 
        description: 'Effusive and hyperbolic',
        prompt: "Generate an effusively positive and hyperbolic reply. Use fan community slang (e.g., 'literally shaking,' 'ATE,' 'the blueprint').",
        incompatibleWith: ['vocab-academic', 'vocab-corporate', 'vocab-legal', 'vocab-technical', 'attitude-professional']
      }
    ]
  },
  
  formatPacing: [
    { 
      id: 'format-single-word', 
      label: '💬 Single Word/Emoji', 
      description: 'Ultra-short reaction',
      prompt: "Generate a single-word or single-emoji reaction.",
      incompatibleWith: ['rhetoric-step-by-step', 'rhetoric-pros-cons', 'rhetoric-share-experience', 'rhetoric-add-context', 'rhetoric-agree-add', 'rhetoric-polite-challenge', 'rhetoric-find-disagreement', 'rhetoric-compare-contrast', 'vocab-storyteller', 'format-mini-thread', 'format-statement-question', 'format-bulleted-list', 'format-stream-consciousness', 'format-single-sentence']
    },
    { 
      id: 'format-statement-question', 
      label: '❓ Statement + Question', 
      description: 'Assertion then question',
      prompt: "Use a 'Statement + Question' structure: a short, assertive statement followed by a direct question.",
      incompatibleWith: ['rhetoric-step-by-step', 'rhetoric-pros-cons', 'format-single-word', 'format-mini-thread', 'format-bulleted-list']
    },
    { 
      id: 'format-paced-punctuation', 
      label: '... Paced Punctuation', 
      description: 'Thoughtful or hesitant',
      prompt: "Use punctuation like ellipses (...) or line breaks to create a thoughtful or hesitant pace.",
      incompatibleWith: []
    },
    { 
      id: 'format-single-sentence', 
      label: '📝 Single Sentence', 
      description: 'Complete one sentence',
      prompt: "Generate a complete, single-sentence reply.",
      incompatibleWith: ['rhetoric-step-by-step', 'format-single-word', 'format-mini-thread', 'format-bulleted-list']
    },
    { 
      id: 'format-stream-consciousness', 
      label: '💭 Stream of Consciousness', 
      description: 'Long connected thoughts',
      prompt: "Generate a single, long-form tweet reply that feels like a stream of consciousness. Connect multiple ideas with 'but', 'and', or 'so' and use minimal formal punctuation.",
      incompatibleWith: ['format-single-word', 'format-statement-question', 'format-bulleted-list']
    },
    { 
      id: 'format-bulleted-list', 
      label: '📋 Bulleted List', 
      description: 'Emoji bullet points',
      prompt: "Format as a list using emoji for bullets (e.g., ✅, ❌, 👉).",
      incompatibleWith: ['format-single-word', 'format-statement-question', 'format-single-sentence', 'format-stream-consciousness']
    },
    { 
      id: 'format-mini-thread', 
      label: '🧵 Mini-Thread (2-3)', 
      description: '2-3 connected tweets',
      prompt: "Generate a 2-tweet thread replying to the original. The first tweet should make the main point, and the second should elaborate or provide an example.",
      incompatibleWith: ['format-single-word', 'format-statement-question', 'format-single-sentence']
    },
    { 
      id: 'format-quote-tweet', 
      label: '🔄 Quote Tweet', 
      description: 'Quote with commentary',
      prompt: "Generate a Quote Tweet. Provide a brief, often opinionated, summary or re-framing.",
      incompatibleWith: []
    },
    { 
      id: 'format-gif-meme', 
      label: '🖼️ GIF/Meme Suggest', 
      description: 'Visual reply concept',
      prompt: "Suggest a concept for a popular GIF or meme that would be a funny reply. Also, write a short, one-line caption to go with it.",
      incompatibleWith: []
    }
  ]
};

/**
 * Legacy exports for backward compatibility (will be removed after full migration)
 */
export interface Template {
  id: string;
  name: string;
  emoji: string;
  prompt: string;
  description: string;
  category: string;
}

export interface Tone {
  id: string;
  emoji: string;
  label: string;
  description: string;
  systemPrompt: string;
}

// Empty arrays to prevent immediate breaking changes
export const TEMPLATES: Template[] = [];
export const TONES: Tone[] = [];

export function getTemplate(id: string): Template | undefined {
  return undefined;
}

export function getTone(id: string): Tone | undefined {
  return undefined;
}

export const REPLY_CONFIG = {
  maxLength: { short: 50, medium: 150, long: 280 },
  temperatureByTone: { default: 0.7 },
  globalInstructions: ''
};