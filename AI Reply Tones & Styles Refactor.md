### **Claude Code Prompt: Full Implementation of a Five-Step AI Reply System for TweetCraft**

**High-Level Goal:**

Refactor the TweetCraft AI Reply feature from its current "Templates & Tones" system (seen in the screenshot) into a new, five-step sequential workflow. This new system will be implemented entirely within the "All" tab of the AI Reply popup, as rendered by `src/content/unifiedSelector.ts`. The new architecture is based on the provided lists for `Persona & Framing`, `Attitude`, `Rhetoric`, `Vocabulary`, and `Format & Pacing` which you can find below. Ensure your implementation is fully compatible with the current architecture. Build detailed to do lists with tasks and subtasks when working on this project. 

CRITICAL: THE REFACTORING NEEDS TO BE PART OF THE ALL TAB OF THE AI PROMPT SIMILAR TO THE WAY WE HAVE NOW TEMPLATES & TONES. IT WILL BE A LONGER LIST AFTER REFACTOR SO ADD A SCROLL BAR. DO NOT CHANGE THE DESIGN, DO NOT CHANGE THE UX/UI.

Your task is to implement the full data structure, the new UI, the prompt concatenation logic for the orchestrator LLM, and the Tier 1 conflict warning system. Adhere to the consumer-focused principles in `CLAUDE.md`. The current prompt should be used as guidance whenver you require further clarification and can be found here: D:\repos\personal\tweetcraft\AI Reply Tones & Styles Refactor.md

---

### **Step 1: Overhaul the Data Structure (`src/config/templatesAndTones.ts`)**

The foundation of this refactor is a new, comprehensive data structure.

**Instructions:**

1.  Navigate to `src/config/templatesAndTones.ts`.
2.  Remove or comment out the existing `TEMPLATES`, `TONES`, and `REPLY_CONFIG` constants.
3.  Replace them with the following single, comprehensive exported constant named `REPLY_OPTIONS`. This object contains all options for the five new categories, including their prompts and the full list of incompatibility rules for the warning system. **This is the new single source of truth.**

**Full `REPLY_OPTIONS` Constant (Copy this directly into the file):**

```typescript
// src/config/templatesAndTones.ts

export const REPLY_OPTIONS = {
  personaFraming: [
    // Personas
    { id: 'persona-expert', label: '🎭 The Weary Expert', description: 'Jaded but helpful expert.', prompt: "Generate a reply from the persona of a 'Weary Expert' who has seen this topic debated endlessly. The tone should be slightly jaded, direct, and pragmatic, but ultimately helpful. Start with a phrase like 'Look,' or 'The thing is...'.", incompatibleWith: [] },
    { id: 'persona-builder', label: '🚀 The Optimistic Builder', description: 'Enthusiastic about technology and action.', prompt: "Generate a reply from the persona of an 'Optimistic Builder.' The tone should be high-energy, positive, and focused on future possibilities and taking action. Use words like 'build,' 'ship,' or 'let's go.'", incompatibleWith: ['attitude-mean', 'attitude-hostile', 'attitude-dismissive'] },
    { id: 'persona-jester', label: '🤡 The Cynical Jester', description: 'Sarcastic and funny observer of absurdity.', prompt: "Generate a reply from the persona of a 'Cynical Jester.' The tone should be darkly humorous, sarcastic, and point out the absurdity in the original tweet. Use irony.", incompatibleWith: ['attitude-earnest', 'attitude-supportive', 'rhetoric-steel-man'] },
    { id: 'persona-nurturer', label: '🫂 The Community Nurturer', description: 'Supportive, empathetic, and encouraging.', prompt: "Generate a reply from the persona of a 'Community Nurturer.' The tone should be extremely supportive, empathetic, and encouraging. Validate the original poster's point and aim to make them feel heard.", incompatibleWith: ['attitude-mean', 'attitude-hostile', 'attitude-inflammatory', 'attitude-condescending', 'attitude-sarcastic'] },
    // Framings (as Personas)
    { id: 'framing-personal', label: '🗣️ The First-Person Voice', description: 'Frames the reply from a personal perspective.', prompt: "Frame the reply from a personal perspective. Start with a phrase like 'Speaking for myself...', 'In my experience...', or 'As a [relevant role]...'.", incompatibleWith: [] },
    { id: 'framing-humble', label: '🙇 The Humble Inquirer', description: 'Frames the reply with humility and openness.', prompt: "Frame the reply with humility. Start with a phrase like 'Just a thought, but...', 'I might be missing something here...', or 'Correct me if I\'m wrong...'.", incompatibleWith: ['attitude-confident', 'attitude-condescending', 'attitude-mean'] },
    { id: 'framing-authoritative', label: '🎯 The Authoritative Voice', description: 'Frames the reply with confidence and directness.', prompt: "Frame the reply with confidence. Start with a phrase like 'Let's be clear:', 'The simple fact is...', or 'There's no question that...'.", incompatibleWith: ['framing-humble', 'attitude-pensive'] },
    { id: 'framing-collaborative', label: '🤝 The Bridge Builder', description: 'Frames the reply by building on the original point.', prompt: "Frame the reply collaboratively. Start with a phrase like 'Building on your point...', or 'Yes, and to add to that...'.", incompatibleWith: ['attitude-mean', 'attitude-dismissive', 'rhetoric-hot-take'] }
  ],
  attitude: {
    constructive: [
      { id: 'attitude-friendly', label: '😊 Friendly', description: 'Warm, approachable, and positive.', prompt: "Use a warm, approachable, and positive tone. Use friendly language and maybe a positive emoji.", incompatibleWith: ['attitude-mean', 'attitude-hostile', 'attitude-sarcastic'] },
      { id: 'attitude-professional', label: '💼 Professional', description: 'Respectful, formal, and restrained.', prompt: "Maintain a respectful, formal, and restrained tone suitable for a corporate or expert setting.", incompatibleWith: ['vocab-shitposter', 'vocab-genz'] },
      // ... Add all other "Constructive & Nuanced" attitudes here, with their prompts and incompatibilities. Example:
      { id: 'attitude-supportive', label: '🤗 Supportive', description: 'Empathetic and encouraging.', prompt: "Use an empathetic and encouraging tone. Validate the original poster's feelings or point of view.", incompatibleWith: ['attitude-mean', 'attitude-hostile', 'attitude-sarcastic', 'persona-jester'] },
      { id: 'attitude-earnest', label: '🧘 Earnest', description: 'Completely sincere and straightforward.', prompt: "Use a completely sincere and straightforward tone. Avoid all traces of sarcasm, irony, or cynicism.", incompatibleWith: ['persona-jester', 'attitude-sarcastic', 'attitude-snarky', 'attitude-dry'] }
    ],
    ironic: [
      { id: 'attitude-witty', label: '😄 Witty', description: 'Clever, insightful, and humorous.', prompt: "Use a clever and insightful tone. The humor should be smart and on-topic.", incompatibleWith: [] },
      { id: 'attitude-sarcastic', label: '😒 Sarcastic', description: 'Says the opposite of what is meant.', prompt: "Use a mocking, sarcastic tone that says the opposite of what is literally meant to show disapproval.", incompatibleWith: ['persona-nurturer', 'attitude-earnest', 'attitude-supportive'] },
      // ... Add all other "Ironic & Edgy" attitudes here.
    ],
    antagonistic: [
      { id: 'attitude-mean', label: '😠 Mean/Hostile', description: 'Directly insulting and belittling.', prompt: "Use a directly insulting and belittling tone.", incompatibleWith: ['persona-nurturer', 'framing-humble', 'framing-collaborative', 'rhetoric-steel-man'] },
      // ... Add all other "Antagonistic" attitudes here.
    ]
  },
  rhetoric: {
    directEngagement: [
      { id: 'rhetoric-agree-add', label: '👍 Agree & Add', description: 'Agrees, then adds new information.', prompt: "First, agree with the main point, then add one new, useful piece of information or perspective.", incompatibleWith: ['attitude-mean', 'attitude-dismissive'] },
      { id: 'rhetoric-steel-man', label: '😇 Steel-man', description: 'States their argument in its strongest form first.', prompt: "First, 'steel-man' the original tweet by summarizing its argument in the most favorable way possible. Then, gently introduce a counter-point or question.", incompatibleWith: ['attitude-mean', 'attitude-hostile', 'persona-jester'] },
      // ... Add all other "Direct Engagement" rhetorics
    ],
    informational: [
      { id: 'rhetoric-step-by-step', label: '🪜 Step-by-Step', description: 'Breaks down a process.', prompt: "Break down a process into a simple, numbered list (e.g., 1/ 2/ 3/).", incompatibleWith: ['format-single-word', 'format-statement-question'] },
      // ... Add all other "Informational & Contextual" rhetorics
    ],
    // ... Add other Rhetoric subcategories and items
  },
  vocabulary: {
    professional: [
      { id: 'vocab-academic', label: '🎓 Academic/Scholarly', description: 'Precise terminology and formal structure.', prompt: "Use precise terminology, nuanced language, and a formal, scholarly structure.", incompatibleWith: ['vocab-genz', 'vocab-shitposter'] },
      // ... Add all other "Professional & Formal" vocabularies
    ],
    conversational: [
      { id: 'vocab-plain-english', label: '📎 Plain English', description: 'Simple, short, and concrete words.', prompt: "Use simple, short, and concrete words. Avoid jargon and complex sentences.", incompatibleWith: [] },
      // ... Add all other "General & Conversational" vocabularies
    ],
    internet: [
      { id: 'vocab-genz', label: '😎 Internet/Gen Z', description: 'Current slang, memes, and casual punctuation.', prompt: "Use current slang, memes, and casual punctuation (e.g., lowercase, emojis). The tone should be very informal.", incompatibleWith: ['vocab-academic', 'vocab-corporate', 'attitude-professional'] },
      // ... Add all other "Internet & Subculture" vocabularies
    ]
  },
  formatPacing: [
    { id: 'format-single-word', label: 'Single Word / Emoji', description: 'An ultra-short, pure reaction.', prompt: "Generate a single-word or single-emoji reaction.", incompatibleWith: ['rhetoric-step-by-step', 'rhetoric-pros-cons', 'format-mini-thread'] },
    { id: 'format-statement-question', label: 'Statement + Question', description: 'A short statement followed by a question.', prompt: "Use a 'Statement + Question' structure: a short, assertive statement followed by a direct question.", incompatibleWith: ['rhetoric-step-by-step'] },
    // ... Add all other Format & Pacing options
  ]
};
```
*(Self-correction: The user provided subcategories for Attitude, Rhetoric, and Vocabulary. I must structure the `REPLY_OPTIONS` object to reflect these subcategories for easier UI rendering.)*


CATEGORY 1: The new cateogries and subcategories.

---

### **Step 1: Persona & Framing**
*Choose the voice and stance for the reply.*

*   🎭 **Expert Persona:** (Previously *The Weary Expert*)
    *   **Prompt:** "Generate a reply from the persona of a seasoned expert who has seen this topic debated endlessly. The tone should be slightly jaded, direct, and pragmatic, but ultimately helpful. Start with a phrase like 'Look,' or 'The thing is...'. The core idea to convey is `[User's Core Idea]`."
*   🚀 **Builder Persona:** (Previously *The Optimistic Builder*)
    *   **Prompt:** "Generate a reply from the persona of an optimistic builder. The tone should be high-energy, positive, and focused on future possibilities and taking action. Use words like 'build,' 'ship,' or 'let's go.' The core idea to convey is `[User's Core Idea]`."
*   🤡 **Jester Persona:** (Previously *The Cynical Jester*)
    *   **Prompt:** "Generate a reply from the persona of a cynical jester. The tone should be darkly humorous and sarcastic, pointing out the absurdity in the original tweet. Use irony to make the point that `[User's Core Idea]`."
*   🫂 **Nurturer Persona:** (Previously *The Community Nurturer*)
    *   **Prompt:** "Generate a reply from the persona of a community nurturer. The tone should be extremely supportive, empathetic, and encouraging. Validate the original poster's point and aim to make them feel heard. The core idea to convey is `[User's Core Idea]`."
*   🗣️ **Personal Framing:**
    *   **Prompt:** "Generate a reply to `[Original Tweet Text]` that is framed from a personal perspective. Start the reply with a phrase like 'Speaking for myself...', 'In my experience...', or 'As a [relevant role]...'. The core idea to convey is `[User's Core Idea]`."
*   🙇 **Humble Framing:**
    *   **Prompt:** "Generate a reply to `[Original Tweet Text]` that is framed with humility. Start the reply with a phrase like 'Just a thought, but...', 'I might be missing something here...', or 'Correct me if I'm wrong...'. The core idea to convey is `[User's Core Idea]`."
*   🎯 **Confident Framing:**
    *   **Prompt:** "Generate a reply to `[Original Tweet Text]` that is framed with confidence. Start the reply with a phrase like 'Let's be clear:', 'The simple fact is...', or 'There's no question that...'. The core idea to convey is `[User's Core Idea]`."
*   🤝 **Collaborative Framing:**
    *   **Prompt:** "Generate a reply to `[Original Tweet Text]` that is framed collaboratively. Start the reply with a phrase like 'Building on your point...', 'I agree, and to add to that...', or 'Yes, and...'. The core idea to convey is `[User's Core Idea]`."

---

### **Step 2: Attitude**
*Set the core emotion or mood of the reply.*

#### **Constructive & Nuanced**
*   😊 **Friendly:**
    *   **Prompt:** "Generate a warm, approachable, and positive reply to `[Original Tweet Text]`. The core idea is `[User's Core Idea]`. Use friendly language and a positive emoji."
*   💼 **Professional:**
    *   **Prompt:** "Generate a respectful, formal, and restrained reply to `[Original Tweet Text]`. The core idea is `[User's Core Idea]`. Maintain a professional tone suitable for a corporate or expert setting."
*   🤗 **Supportive:**
    *   **Prompt:** "Generate an empathetic and encouraging reply to `[Original Tweet Text]`. The core idea is `[User's Core Idea]`. Validate the original poster's feelings or point of view."
*   💪 **Motivational:**
    *   **Prompt:** "Generate an energetic, aspirational, and uplifting reply to `[Original Tweet Text]`. The core idea is `[User's Core Idea]`. Aim to inspire the original poster or the audience."
*   🧘 **Earnest:**
    *   **Prompt:** "Generate a completely sincere and straightforward reply to `[Original Tweet Text]`. The core idea is `[User's Core Idea]`. Avoid all traces of sarcasm, irony, or cynicism."
*   🧭 **Diplomatic:**
    *   **Prompt:** "Generate a balanced, non-confrontational, and de-escalating reply to `[Original Tweet Text]`. The core idea is `[User's Core Idea]`. Aim to find common ground or gently reframe the conversation."
*   🤔 **Inquisitive/Curious:**
    *   **Prompt:** "Generate a genuinely curious reply to `[Original Tweet Text]` that seeks to learn more. The core idea is `[User's Core Idea]`. Ask open-ended questions to understand their perspective better."
*   😌 **Calm/Zen:**
    *   **Prompt:** "Generate a serene, unbothered, and high-level perspective reply to `[Original Tweet Text]`. The core idea is `[User's Core Idea]`. The tone should be calming and detached from the immediate emotional fray."
*   🙌 **Enthusiastic:**
    *   **Prompt:** "Generate a high-energy, eager, and positive reply to `[Original Tweet Text]`. The core idea is `[User's Core Idea]`. Use exclamation points and effusive language to convey excitement."
*   🤩 **Awestruck:**
    *   **Prompt:** "Generate a reply to `[Original Tweet Text]` that expresses genuine, unironic admiration or awe. The core idea is `[User's Core Idea]`."
*   🤔 **Pensive/Musing:**
    *   **Prompt:** "Generate a reply to `[Original Tweet Text]` that sounds like someone thinking out loud. The tone should be pensive and not fully committed to a stance. The core idea is `[User's Core Idea]`."

#### **Ironic & Edgy**
*   😄 **Witty:**
    *   **Prompt:** "Generate a clever and insightful reply to `[Original Tweet Text]`. The humor should be smart and on-topic, not just a random joke. The core idea is `[User's Core Idea]`."
*   😏 **Snarky:**
    *   **Prompt:** "Generate a reply with a playful, sharp edge to `[Original Tweet Text]`. It should be subtly mocking or critical without being a direct personal attack. The core idea is `[User's Core Idea]`."
*   🙃 **Dry/Deadpan:**
    *   **Prompt:** "Generate an understated, ironic reply to `[Original Tweet Text]`. The humor should come from a complete lack of obvious emotion. The core idea is `[User's Core Idea]`."
*   😒 **Sarcastic:**
    *   **Prompt:** "Generate a mocking, sarcastic reply to `[Original Tweet Text]` that says the opposite of what is literally meant to show disapproval. The core idea is `[User's Core Idea]`."
*   🎭 **Dramatic/Performative:**
    *   **Prompt:** "Generate an exaggerated, hyperbolic, and theatrical reply to `[Original Tweet Text]`. Use vivid language for dramatic effect. The core idea is `[User's Core Idea]`."
*   🔥 **Provocative:**
    *   **Prompt:** "Generate a bold, challenging, and risk-tolerant reply to `[Original Tweet Text]`. It should be designed to spark debate. The core idea is `[User's Core Idea]`."
*   💣 **Controversial:**
    *   **Prompt:** "Generate a reply to `[Original Tweet Text]` that intentionally takes the most divisive and unpopular stance possible on the topic, based on the core idea `[User's Core Idea]`."
*   😈 **Devil's Advocate:**
    *   **Prompt:** "Generate a reply to `[Original Tweet Text]` that argues a contrary position for the sake of argument, starting with a phrase like 'For the sake of argument...'. The core idea to argue is `[User's Core Idea]`."
*   🥱 **Weary:**
    *   **Prompt:** "Generate a reply to `[Original Tweet Text]` that conveys a sense of fatigue or exhaustion with the discourse. The core idea is `[User's Core Idea]`."

#### **Antagonistic**
*   😠 **Mean/Hostile:**
    *   **Prompt:** "Generate a directly insulting and belittling reply to `[Original Tweet Text]` based on the core idea `[User's Core Idea]`."
*   🙄 **Dismissive:**
    *   **Prompt:** "Generate a reply to `[Original Tweet Text]` that treats the post as irrelevant, unintelligent, or a waste of time, using phrases like 'anyway' or 'ok, and?'. The core idea is `[User's Core Idea]`."
*   🔥 **Inflammatory:**
    *   **Prompt:** "Generate a reply to `[Original Tweet Text]` designed to provoke maximum anger and arguments from readers, using baiting language. The core idea is `[User's Core Idea]`."
*   🧐 **Condescending:**
    *   **Prompt:** "Generate a reply to `[Original Tweet Text]` that speaks down to the author, explaining something to them as if they are a child. Use phrases like 'let me explain' or 'actually...'. The core idea is `[User's Core Idea]`."
*   🤬 **Swearing/Profane:**
    *   **Prompt:** "Generate a reply to `[Original Tweet Text]` that uses strong curse words for emphasis or as an insult. The core idea is `[User's Core Idea]`."
*   🚨 **Threatening:**
    *   **Prompt:** "Generate a reply to `[Original Tweet Text]` that implies a veiled or direct negative consequence for the author, based on the core idea `[User's Core Idea]`."

---

### **Step 3: Rhetoric**
*Choose the logical "move" or argument structure.*

#### **Direct Engagement**
*   👍 **Agree & Add:**
    *   **Prompt:** "Generate a reply to `[Original Tweet Text]` that first agrees with the main point, then adds one new, useful piece of information or perspective based on `[User's Core Idea]`."
*   🤝 **Polite Challenge:**
    *   **Prompt:** "Generate a reply to `[Original Tweet Text]` that respectfully challenges the argument. Start by finding a point of agreement, then pivot to a counter-argument based on `[User's Core Idea]`."
*   😇 **Steel-man:**
    *   **Prompt:** "Generate a reply to `[Original Tweet Text]` that first 'steel-mans' the original tweet by summarizing its argument in the most favorable way possible. Then, gently introduce a counter-point or question based on `[User's Core Idea]`."
*   ✅ **Concede a Point:**
    *   **Prompt:** "Generate a reply to `[Original Tweet Text]` that starts by conceding a specific point from the original tweet. Use a phrase like 'That's a great point,' or 'You're right about that.' Then, briefly add your related thought: `[User's Core Idea]`."
*   🎯 **Find Core Disagreement:**
    *   **Prompt:** "Generate a reply to `[Original Tweet Text]` that attempts to find the core disagreement. It should say something like, 'It seems like we both agree on [Point A], but the real disagreement is about [Point B]. Is that right?' Use `[User's Core Idea]` to define Point B."
*   💥 **Counter-example:**
    *   **Prompt:** "Generate a reply to `[Original Tweet Text]` that provides a single, powerful counter-example that challenges their general claim, based on `[User's Core Idea]`."

#### **Informational & Contextual**
*   📚 **Add Context:**
    *   **Prompt:** "Generate a reply to `[Original Tweet Text]` that provides essential background information or defines a key term to give more context, based on `[User's Core Idea]`."
*   🔗 **Share Experience:**
    *   **Prompt:** "Generate a reply to `[Original Tweet Text]` that shares a relevant personal anecdote or observed experience related to `[User's Core Idea]`."
*   🔭 **Zoom Out/Big Picture:**
    *   **Prompt:** "Generate a reply to `[Original Tweet Text]` that re-contextualizes the topic by connecting it to a larger trend or historical pattern, based on `[User's Core Idea]`."
*   🧠 **Analogy:**
    *   **Prompt:** "Generate a reply to `[Original Tweet Text]` that explains a core concept using a simple analogy from a more familiar domain, based on `[User's Core Idea]`."
*   ➕➖ **Pros/Cons:**
    *   **Prompt:** "Generate a reply to `[Original Tweet Text]` that quickly lists the pros and cons of their main point, based on `[User's Core Idea]`."
*   🧪 **Myth/Fact:**
    *   **Prompt:** "Generate a reply to `[Original Tweet Text]` that debunks a specific claim by stating it as a 'Myth' and providing the 'Fact', based on `[User's Core Idea]`."
*   ❗ **Risk/Caveat:**
    *   **Prompt:** "Generate a reply to `[Original Tweet Text]` that points out a potential risk, edge case, or important caveat to their argument, based on `[User's Core Idea]`."

#### **Creative & Reframing**
*   🎯 **Hot Take:**
    *   **Prompt:** "Generate a concise, contrarian, and edgy reply to `[Original Tweet Text]` based on the hot take `[User's Core Idea]`."
*   😂 **Make Joke:**
    *   **Prompt:** "Generate a short, on-topic quip or joke in reply to `[Original Tweet Text]` based on the core idea `[User's Core Idea]`."
*   ✍️ **Reframe:**
    *   **Prompt:** "Generate a reply to `[Original Tweet Text]` that restates their claim in a new way to clarify it or test its limits, based on the reframe `[User's Core Idea]`."
*   🔍 **Pull-Quote:**
    *   **Prompt:** "Generate a reply to `[Original Tweet Text]` by quoting one specific phrase from it and reacting directly to that phrase with `[User's Core Idea]`."
*   🧩 **Compare/Contrast:**
    *   **Prompt:** "Generate a reply to `[Original Tweet Text]` that compares X and Y, highlighting 1-2 key differences, based on `[User's Core Idea]`."

#### **Inquisitive & Action-Oriented**
*   ❓ **Ask Question:**
    *   **Prompt:** "Generate a reply to `[Original Tweet Text]` that asks a thoughtful, open-ended question based on `[User's Core Idea]`."
*   💡 **Suggest Solution:**
    *   **Prompt:** "Generate a reply to `[Original Tweet Text]` that proposes a specific, actionable solution or next step based on `[User's Core Idea]`."
*   📊 **Request Data:**
    *   **Prompt:** "Generate a reply to `[Original Tweet Text]` that politely asks for a source, evidence, or data to support their claim, based on `[User's Core Idea]`."
*   🏃 **Call to Action:**
    *   **Prompt:** "Generate a reply to `[Original Tweet Text]` that invites the audience to perform a specific action based on `[User's Core Idea]` (e.g., 'Reply with your thoughts,' 'Check out this link')."
*   🧭 **“What Would It Take?”:**
    *   **Prompt:** "Generate a reply to `[Original Tweet Text]` that asks what evidence or conditions would be required to change their mind, based on the question in `[User's Core Idea]`."
*   🪜 **Step-by-Step:**
    *   **Prompt:** "Generate a reply to `[Original Tweet Text]` that breaks down a process related to `[User's Core Idea]` into a simple, numbered list (e.g., 1/ 2/ 3/)."

---

### **Step 4: Vocabulary**
*Define the style of language and word choice.*

#### **Professional & Formal**
*   🎓 **Academic/Scholarly:**
    *   **Prompt:** "Rewrite this core idea `[User's Core Idea]` as a reply to `[Original Tweet Text]`. Use precise terminology, nuanced language, and a formal, scholarly structure."
*   🛠️ **Technical/Engineer:**
    *   **Prompt:** "Rewrite this core idea `[User's Core Idea]` as a reply to `[Original Tweet Text]`. Focus on systems, constraints, trade-offs, and first principles. Use technical but clear language."
*   👔 **Corporate/PR:**
    *   **Prompt:** "Rewrite this core idea `[User's Core Idea]` as a reply to `[Original Tweet Text]`. Use cautious, reputation-aware language. The tone should be official and brand-safe."
*   📰 **Journalistic:**
    *   **Prompt:** "Rewrite this core idea `[User's Core Idea]` as a reply to `[Original Tweet Text]`. Structure it with the most important information first (inverted pyramid) and attribute any claims."
*   🧾 **Legal/Compliance:**
    *   **Prompt:** "Rewrite this core idea `[User's Core Idea]` as a reply to `[Original Tweet Text]`. Include disclaimers, qualifiers, and carefully hedged language to minimize liability."

#### **General & Conversational**
*   📎 **Plain English:**
    *   **Prompt:** "Rewrite this core idea `[User's Core Idea]` as a reply to `[Original Tweet Text]`. Use simple, short, and concrete words. Avoid jargon and complex sentences."
*   📚 **Storyteller/Narrative:**
    *   **Prompt:** "Frame this core idea `[User's Core Idea]` as a short anecdote or story in reply to `[Original Tweet Text]`. Start with 'That reminds me of a time...' or a similar hook."
*   📣 **Marketing/Hype:**
    *   **Prompt:** "Rewrite this core idea `[User's Core Idea]` as a reply to `[Original Tweet Text]`. Focus on benefits, positive outcomes, and social proof. Build excitement."

#### **Internet & Subculture**
*   😎 **Internet/Gen Z:**
    *   **Prompt:** "Rewrite this core idea `[User's Core Idea]` as a reply to `[Original Tweet Text]`. Use current slang, memes, and casual punctuation (e.g., lowercase, emojis). The tone should be very informal."
*   🤡 **Shitposter/Meme-Lord:**
    *   **Prompt:** "Generate an absurdist, ironic, or non-sequitur reply to `[Original Tweet Text]` based on the idea `[User's Core Idea]`. It should feel like an inside joke or a surreal meme."
*   💖 **Fan/Stanspeak:**
    *   **Prompt:** "Generate an effusively positive and hyperbolic reply to `[Original Tweet Text]`. Use fan community slang (e.g., 'literally shaking,' 'ATE,' 'the blueprint') to praise the subject, based on `[User's Core Idea]`."

---

### **Step 5: Format & Pacing**
*Choose the final structure, length, and rhythm of the reply.*

*   **Single Word / Emoji:**
    *   **Prompt:** "Generate a single-word or single-emoji reaction to `[Original Tweet Text]` that conveys the core idea of `[User's Core Idea, e.g., 'agreement', 'disagreement', 'surprise']`."
*   **Statement + Question:**
    *   **Prompt:** "Generate a reply to `[Original Tweet Text]` using a 'Statement + Question' structure: a short, assertive statement followed by a direct question. The core idea is `[User's Core Idea]`."
*   **Paced with Punctuation:**
    *   **Prompt:** "Generate a reply to `[Original Tweet Text]` that uses punctuation like ellipses (...) or line breaks to create a thoughtful or hesitant pace. The core idea is `[User's Core Idea]`."
*   **Single Sentence Reply:**
    *   **Prompt:** "Generate a complete, single-sentence reply to `[Original Tweet Text]` based on `[User's Core Idea]`."
*   **Long Stream-of-Consciousness:**
    *   **Prompt:** "Generate a single, long-form tweet reply to `[Original Tweet Text]` that feels like a stream of consciousness. Connect multiple ideas with 'but', 'and', or 'so' and use minimal formal punctuation. The core idea is `[User's Core Idea]`."
*   **Bulleted List:**
    *   **Prompt:** "Generate a reply to `[Original Tweet Text]` based on `[User's Core Idea]`, formatted as a list using emoji for bullets (e.g., ✅, ❌, 👉)."
*   **Mini-Thread (2-3 Tweets):**
    *   **Prompt:** "Generate a 2-tweet thread replying to `[Original Tweet Text]`. The first tweet should make the main point (`[User's Core Idea]`), and the second should elaborate or provide an example."
*   **Quote Tweet:**
    *   **Prompt:** "Generate a Quote Tweet for `[Original Tweet Text]`. The text of the quote tweet should provide a brief, often opinionated, summary or re-framing based on `[User's Core Idea]`."
*   **GIF/Meme Suggestion:**
    *   **Prompt:** "Suggest a concept for a popular GIF or meme that would be a funny reply to `[Original Tweet Text]`. Also, write a short, one-line caption to go with it. The core idea to convey is `[User's Core Idea]`."


---

### **Step 2: Rebuild the UI in `src/content/unifiedSelector.ts`**

Modify the `UnifiedSelector` class to render the new five-step UI and manage selections and conflict warnings.

**Instructions:**

1.  **Import the New Data Structure:**
    ```typescript
    import { REPLY_OPTIONS } from '@/config/templatesAndTones';
    ```

2.  **Add State Management:** In the `UnifiedSelector` class, add a property to hold the user's selections.
    ```typescript
    private selections: { [key: string]: string | null } = {
      personaFraming: null,
      attitude: null,
      rhetoric: null,
      vocabulary: null,
      formatPacing: null,
    };
    ```

3.  **Update the `render()` Method:** Replace the existing rendering logic with a new structure that creates the five sequential sections.

    **Conceptual `render()` Logic:**
    ```typescript
    // Inside UnifiedSelector.ts

    private render(): void {
      if (!this.container) return;
      this.container.innerHTML = `
        <div class="unified-selector-header">...</div>
        <div class="unified-selector-content">
          ${this.renderCategory('personaFraming', 'Step 1: Persona & Framing')}
          ${this.renderCategoryWithSubgroups('attitude', 'Step 2: Attitude')}
          ${this.renderCategoryWithSubgroups('rhetoric', 'Step 3: Rhetoric')}
          ${this.renderCategoryWithSubgroups('vocabulary', 'Step 4: Vocabulary')}
          ${this.renderCategory('formatPacing', 'Step 5: Format & Pacing')}
        </div>
        <div class="unified-selector-footer">
          <button class="generate-button">Generate Reply</button>
        </div>
      `;
      this.attachEventListeners();
      this.updateWarnings(); // Initial warning check
    }

    private renderCategory(key: string, title: string): string {
      const options = REPLY_OPTIONS[key as keyof typeof REPLY_OPTIONS] as any[];
      return `
        <div class="selector-category">
          <h3 class="category-title">${title}</h3>
          <div class="options-grid">
            ${options.map(opt => this.renderOptionButton(opt, key)).join('')}
          </div>
        </div>
      `;
    }
    
    private renderCategoryWithSubgroups(key: string, title: string): string {
      const subgroups = REPLY_OPTIONS[key as keyof typeof REPLY_OPTIONS] as Record<string, any[]>;
      let html = `<div class="selector-category"><h3 class="category-title">${title}</h3>`;
      for (const subKey in subgroups) {
        // Simple title from camelCase, e.g., directEngagement -> Direct Engagement
        const subTitle = subKey.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
        html += `<h4 class="category-subtitle">${subTitle}</h4>`;
        html += `<div class="options-grid">${subgroups[subKey].map(opt => this.renderOptionButton(opt, key)).join('')}</div>`;
      }
      html += `</div>`;
      return html;
    }

    private renderOptionButton(option: any, categoryKey: string): string {
      const isSelected = this.selections[categoryKey] === option.id;
      return `
        <button class="option-button ${isSelected ? 'selected' : ''}" data-id="${option.id}" data-category="${categoryKey}" title="${option.description}">
          ${option.label}
        </button>
      `;
    }
    ```

4.  **Implement Selection Logic and Warning System:** Create methods to handle clicks and update the UI with conflict warnings.

    **Code to Add to `UnifiedSelector.ts`:**
    ```typescript
    // Inside UnifiedSelector.ts

    private handleOptionClick(event: MouseEvent) {
      const button = (event.currentTarget as HTMLElement);
      const optionId = button.dataset.id;
      const category = button.dataset.category;

      if (!optionId || !category) return;
      
      // Toggle selection logic
      if (this.selections[category] === optionId) {
        this.selections[category] = null; // Deselect
      } else {
        this.selections[category] = optionId; // Select
      }

      // Re-render or update classes to reflect selection
      this.updateSelectedVisuals();
      this.updateWarnings();
    }

    private updateSelectedVisuals() {
      const allButtons = this.container.querySelectorAll('.option-button');
      allButtons.forEach(button => {
        const optionId = button.getAttribute('data-id');
        const category = button.getAttribute('data-category');
        if (optionId && category) {
          button.classList.toggle('selected', this.selections[category] === optionId);
        }
      });
    }

    private updateWarnings() {
      const allSelectedIds = Object.values(this.selections).filter(Boolean) as string[];
      const allOptionsFlat = Object.values(REPLY_OPTIONS).flat(2); // Flatten all options

      this.container.querySelectorAll('.option-button').forEach(button => {
        const optionId = button.getAttribute('data-id');
        
        // Remove existing warning
        const existingWarning = button.querySelector('.conflict-warning');
        if (existingWarning) existingWarning.remove();

        const optionData = allOptionsFlat.find(opt => opt.id === optionId);
        if (!optionData || !optionData.incompatibleWith) return;

        const isConflicting = allSelectedIds.some(selectedId => 
          optionData.incompatibleWith.includes(selectedId)
        );

        if (isConflicting && !button.classList.contains('selected')) {
          const warningIcon = document.createElement('span');
          warningIcon.className = 'conflict-warning';
          warningIcon.textContent = ' ⚠️';
          warningIcon.title = 'May conflict with your other selections.';
          button.appendChild(warningIcon);
          button.classList.add('conflicting');
        } else {
          button.classList.remove('conflicting');
        }
      });
    }
    ```

5.  **Add CSS for Warnings:** Add styles for the warning icon and conflicting state in your relevant SCSS file (e.g., `src/content/unifiedSelector.scss`).
    ```scss
    .option-button.conflicting {
      opacity: 0.6;
      border-style: dashed;
    }
    .conflict-warning {
      color: orange;
      font-weight: bold;
    }
    ```

---

### **Step 3: Update Prompt Orchestration in `src/background/serviceWorker.ts`**

HOW THE COMBINATIONS WILL BE SENT TO THE LLM
	
A concatenated  structure is the correct way to orchestrate this. You would concatenate the individual prompts selected by the user into a single, comprehensive "meta-prompt" for the LLM.

Here is a concrete example. Let's say a user selects the following five options:

1.  **Persona:** 🎭 **Expert Persona**
2.  **Attitude:** 🙃 **Dry/Deadpan**
3.  **Rhetoric:** ❗ **Risk/Caveat**
4.  **Vocabulary:** 🛠️ **Technical/Engineer**
5.  **Format & Pacing:** 🗣️ **Single Sentence Reply**

The final instruction sent to the LLM would be a combination of all five individual prompts, like this:

**Master Prompt Sent to LLM:**

> Generate a Tweet reply to `[Original Tweet Text]` based on the following combined instructions. The core idea to convey is `[User's Core Idea]`.
> 
> *   **Persona Instruction:** Generate a reply from the persona of a seasoned expert who has seen this topic debated endlessly. The tone should be slightly jaded, direct, and pragmatic, but ultimately helpful. Start with a phrase like 'Look,' or 'The thing is...'.
> *   **Attitude Instruction:** The reply must have an understated, ironic tone. The humor should come from a complete lack of obvious emotion.
> *   **Rhetoric Instruction:** The reply must point out a potential risk, edge case, or important caveat to the argument in the original tweet.
> *   **Vocabulary Instruction:** The reply must use language focused on systems, constraints, trade-offs, and first principles. The vocabulary should be technical but clear.
> *   **Format Instruction:** The final output must be a single, complete sentence.

Modify the service worker to accept the five selection IDs and build the final, concatenated prompt.

**Instructions:**

1.  **Modify `handleGenerateReply`:** Ensure the message from the content script now includes the `selections` object.
2.  **Rewrite `buildMessages`:** Replace the old logic with the new concatenation strategy.

**Updated `buildMessages` function in `serviceWorker.ts`:**
```typescript
// src/background/serviceWorker.ts

import { REPLY_OPTIONS } from '@/config/templatesAndTones'; // Ensure this import works

private async buildMessages(request: any, context: any, config: any): Promise<OpenRouterMessage[]> {
  const { selections } = request; // selections = { personaFraming: '...', attitude: '...', ... }

  let systemPrompt = config.systemPrompt || 'You are a helpful social media assistant.';

  const instructions: string[] = [];
  const allOptionsFlat = Object.values(REPLY_OPTIONS).flat(2);

  // Define the order of prompt concatenation
  const categoryOrder: (keyof typeof selections)[] = ['personaFraming', 'attitude', 'rhetoric', 'vocabulary', 'formatPacing'];

  for (const category of categoryOrder) {
    const selectedId = selections[category];
    if (selectedId) {
      const selectedOption = allOptionsFlat.find(opt => opt.id === selectedId);
      if (selectedOption && selectedOption.prompt) {
        instructions.push(selectedOption.prompt);
      }
    }
  }

  if (instructions.length > 0) {
    systemPrompt += "\n\nCRITICAL: You must generate a reply following these specific, combined instructions:\n- " + instructions.join("\n- ");
  }

  // The rest of the function (building the user prompt with tweet context) can remain the same.
  const userPrompt = this.buildUserPrompt(request, context, config);

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ];
}

// You will also need a buildUserPrompt helper function containing the logic
// from the old buildMessages that handled context, rewrite mode, etc.
private buildUserPrompt(request: any, context: any, config: any): string {
  // ... (Paste the user prompt creation logic from your old buildMessages here)
  // This includes handling rewrite mode, thread context, single tweet context, etc.
  // Example start:
  if (request.isRewriteMode && request.existingText) {
    return `Please rewrite and improve this tweet reply while maintaining its core message:\n\n"${request.existingText}"\n\nContext - this is a reply to: "${context.tweetText}"`;
  }
  // ... etc.
  return `Write a reply to this tweet: "${context.tweetText}"`;
}
```
Yes, absolutely. My apologies for not making that section prominent enough. The Tier 1 solution—displaying non-blocking warnings for conflicting selections—is a critical part of the user experience, and its implementation was embedded within the UI refactoring steps.

Let me extract, clarify, and detail that specific part of the implementation for you.

Here is the explicit, step-by-step guide on **how to implement the Tier 1 conflict handling system** using the data and code from the previous prompt.

---

### **How to Handle Potential Overlaps and Conflicting Scenarios (Tier 1 Solution)**

The Tier 1 solution works by visually indicating potential conflicts without preventing the user from making a selection. This is achieved through a combination of data structure, UI logic, and CSS.

#### **Step 1: The Data Foundation (The Rules)**

The core of the conflict system resides in the `incompatibleWith` array within your new `REPLY_OPTIONS` data structure in `src/config/templatesAndTones.ts`. Each option explicitly declares which other options it conflicts with.

**Example from the data structure:**

```typescript
// src/config/templatesAndTones.ts

export const REPLY_OPTIONS = {
  // ...
  attitude: {
    // ...
    antagonistic: [
      { 
        id: 'attitude-mean', 
        label: '😠 Mean/Hostile',
        // ...
        // This option is incompatible with the following IDs:
        incompatibleWith: [
          'persona-nurturer',         // Can't be a nurturer and mean
          'framing-humble',           // Can't be humble and mean
          'framing-collaborative',    // Can't be collaborative and mean
          'rhetoric-steel-man',       // Can't steel-man and be mean
          'attitude-supportive'       // Direct contradiction
        ] 
      },
      // ...
    ]
  },
  // ...
};
```

This data structure is the "brain" of the conflict system. The UI logic will read from these arrays to determine what to do.

#### **Step 2: The UI Logic (The "How-To" Check)**

This logic lives inside your `src/content/unifiedSelector.ts` file. You need a function that runs every time the user's selections change. This function will check for conflicts and update the UI accordingly.

**Implementation in `UnifiedSelector.ts`:**

Add this exact method to your `UnifiedSelector` class. It performs the core logic for the Tier 1 warning system.

```typescript
// src/content/unifiedSelector.ts

// (Inside the UnifiedSelector class)

private updateWarnings(): void {
  // 1. Get a simple list of all currently selected option IDs.
  const allSelectedIds = Object.values(this.selections).filter(Boolean) as string[];

  // 2. Flatten the entire REPLY_OPTIONS object to make searching easier.
  //    The `flat(2)` is used because some categories have sub-groups.
  const allOptionsFlat = Object.values(REPLY_OPTIONS).flat(2);

  // 3. Iterate over every single button in the UI.
  this.container?.querySelectorAll('.option-button').forEach(button => {
    const buttonElement = button as HTMLElement;
    const optionId = buttonElement.dataset.id;

    if (!optionId) return;

    // 4. Clean up any previous warning icon from this button.
    const existingWarning = buttonElement.querySelector('.conflict-warning');
    if (existingWarning) {
      existingWarning.remove();
    }
    buttonElement.classList.remove('conflicting');

    // 5. Find the full data for the current button's option.
    const optionData = allOptionsFlat.find(opt => opt.id === optionId);
    if (!optionData || !optionData.incompatibleWith || optionData.incompatibleWith.length === 0) {
      return; // No conflict rules for this option.
    }

    // 6. THE CORE LOGIC: Check if any of the currently selected IDs
    //    are present in this button's 'incompatibleWith' list.
    const isConflicting = allSelectedIds.some(selectedId => 
      optionData.incompatibleWith.includes(selectedId)
    );

    // 7. If there is a conflict AND the button isn't currently selected,
    //    apply the warning. We don't warn about the selected item itself.
    if (isConflicting && !buttonElement.classList.contains('selected')) {
      const warningIcon = document.createElement('span');
      warningIcon.className = 'conflict-warning';
      warningIcon.textContent = ' ⚠️';
      warningIcon.title = 'This option may produce unpredictable results with your current selections.';
      
      buttonElement.appendChild(warningIcon);
      buttonElement.classList.add('conflicting');
    }
  });
}
```

#### **Step 3: Triggering the Logic (The "When-To" Check)**

The `updateWarnings()` function needs to be called at the right times to keep the UI in sync.

**Instructions:**

1.  Call `this.updateWarnings()` at the end of your `handleOptionClick` method. This ensures that every time a user selects or deselects an option, the warnings for all other options are immediately re-evaluated.
2.  Call `this.updateWarnings()` at the end of your main `render()` or `show()` method. This ensures that when the popup first appears, any pre-selected options correctly trigger warnings.

**Example:**
```typescript
// src/content/unifiedSelector.ts
private handleOptionClick(event: MouseEvent) {
  // ... (your selection logic here) ...
  this.updateSelectedVisuals();
  this.updateWarnings(); // <-- Add this call here
}

public show(...) {
  // ... (your logic to show the popup) ...
  this.render();
  this.updateWarnings(); // <-- And add this call here
}
```

#### **Step 4: The Visual Feedback (The UI)**

Finally, you need to add CSS to make the warnings visible to the user. This CSS goes into the stylesheet associated with your popup (e.g., a new `unifiedSelector.scss` or your existing `contentScript.scss`).

**CSS for Warnings:**

```scss
/* Add to your relevant SCSS file */

.option-button.conflicting {
  // Make the button look less prominent to suggest it's a poor choice.
  opacity: 0.65;
  border-style: dashed;
  border-color: #FFA500; // An orange warning color.

  &:hover {
    opacity: 1; // Restore full opacity on hover so user can still select it.
  }
}

.conflict-warning {
  // Style the warning icon itself.
  color: #FFA500;
  font-weight: bold;
  pointer-events: none; // Ensures the icon doesn't interfere with clicks.
}
```

Here is a comprehensive list of all the specific conflict rules. This list is designed to be directly translated into the `incompatibleWith` arrays in your `config.js` file. The rules are categorized into two main types:

1.  **Logical & Structural Conflicts:** Combinations that are functionally impossible (e.g., a multi-step guide in a single word).
2.  **Tonal & Intentional Conflicts:** Combinations that are deeply contradictory in their purpose or tone (e.g., a supportive persona with a hostile attitude).

---

### **Conflict Rules Master List**

#### **Category 1: Format & Pacing Conflicts**

These are the most rigid rules. If a user selects a specific format, it logically invalidates many rhetorical structures.

**If you select `Format: Single Word / Emoji`...**
*   ...then disable these **Rhetoric** options:
    *   `Step-by-Step`
    *   `Pros/Cons`
    *   `Compare/Contrast`
    *   `Steel-man`
    *   `Share Experience`
    *   `Add Context`
    *   `Agree & Add`
    *   `Polite Challenge`
    *   `Find Core Disagreement`
*   ...then disable these **Format & Pacing** options:
    *   All other formats (`Statement + Question`, `Mini-Thread`, `Bulleted List`, etc.)

**If you select `Format: Statement + Question`...**
*   ...then disable these **Rhetoric** options:
    *   `Step-by-Step`
    *   `Pros/Cons`
    *   `Bulleted List`
*   ...then disable these **Format & Pacing** options:
    *   `Single Word / Emoji`
    *   `Long Stream-of-Consciousness`
    *   `Mini-Thread`

**If you select `Format: Bulleted List`...**
*   ...then disable these **Format & Pacing** options:
    *   `Single Word / Emoji`
    *   `Statement + Question`
    *   `Single Sentence Reply`
    *   `Long Stream-of-Consciousness`

**If you select `Format: Mini-Thread`...**
*   ...then disable **all other `Format & Pacing` options**.

---

#### **Category 2: Persona & Framing Conflicts**

These rules are based on maintaining a consistent character.

**If you select `Persona: Nurturer` or `Bridge Builder`...**
*   ...then disable these **Attitude** options (the entire Antagonistic category):
    *   `Mean/Hostile`
    *   `Dismissive`
    *   `Inflammatory`
    *   `Condescending`
    *   `Threatening`
    *   `Sarcastic` (A nurturer is rarely sarcastic)
*   ...then disable these **Rhetoric** options:
    *   `Hot Take` (A bridge builder avoids divisive takes)

**If you select `Persona: Humble Inquirer`...**
*   ...then disable these **Persona & Framing** options:
    *   `Authoritative Voice`
*   ...then disable these **Attitude** options:
    *   `Confident`
    *   `Condescending`
    *   `Provocative`
    *   `Mean/Hostile`

**If you select `Persona: Authoritative Voice`...**
*   ...then disable these **Persona & Framing** options:
    *   `Humble Inquirer`
*   ...then disable these **Attitude** options:
    *   `Pensive/Musing` (An authoritative voice is not uncertain)
    *   `Inquisitive/Curious`

**If you select `Persona: Jester`...**
*   ...then disable this **Attitude** option:
    *   `Earnest` (A jester is fundamentally insincere or ironic)

---

#### **Category 3: Attitude Conflicts**

These rules prevent direct emotional contradictions.

**If you select any `Constructive & Nuanced` Attitude (e.g., `Supportive`, `Friendly`, `Diplomatic`, `Earnest`)...**
*   ...then disable all `Antagonistic` **Attitude** options (`Mean/Hostile`, `Dismissive`, etc.).

**If you select `Attitude: Earnest`...**
*   ...then disable these `Ironic & Edgy` **Attitude** options:
    *   `Sarcastic`
    *   `Snarky`
    *   `Dry/Deadpan`
    *   `Devil's Advocate`
*   ...then disable this **Persona**:
    *   `Jester Persona`

**If you select any `Antagonistic` Attitude (e.g., `Mean/Hostile`, `Condescending`)...**
*   ...then disable these **Persona & Framing** options:
    *   `Nurturer`
    *   `Bridge Builder`
    *   `Humble Inquirer`
*   ...then disable these collaborative **Rhetoric** options:
    *   `Steel-man` (The direct opposite of antagonism)
    *   `Agree & Add`
    *   `Concede a Point`
    *   `Gratitude/Shout-out`

---

#### **Category 4: Rhetoric Conflicts**

These rules focus on the logical intent of the reply.

**If you select `Rhetoric: Steel-man`...**
*   ...then disable all `Antagonistic` **Attitude** options.
*   ...then disable the `Jester` **Persona**. (Steel-manning requires good faith).

**If you select `Rhetoric: Agree & Add`, `Concede a Point`, or `Gratitude/Shout-out`...**
*   ...then disable these `Antagonistic` **Attitude** options:
    *   `Mean/Hostile`
    *   `Dismissive`
    *   `Condescending`

---

#### **Category 5: Vocabulary Conflicts**

These rules prevent jarring mismatches in language style.

**If you select `Vocabulary: Legal/Compliance` or `Corporate/PR`...**
*   ...then disable these informal **Vocabulary** options:
    *   `Internet/Gen Z`
    *   `Shitposter/Meme-Lord`
    *   `Fan/Stanspeak`
*   ...then disable this **Persona**:
    *   `Jester Persona`

**If you select `Vocabulary: Shitposter/Meme-Lord`...**
*   ...then disable these formal **Vocabulary** options:
    *   `Academic/Scholarly`
    *   `Corporate/PR`
    *   `Legal/Compliance`
    *   `Journalistic`
*   ...then disable these **Attitude** options:
    *   `Professional`
    *   `Earnest`

---
### **Note on Redundancy (Soft Conflicts)**

There are also "soft conflicts" where two options are not contradictory but highly redundant (e.g., `Attitude: Inquisitive/Curious` and `Rhetoric: Ask Question`). For the "graying out" logic, it's often best to **allow these combinations**, as the user might be trying to emphasize a specific intent. The LLM is generally good at merging redundant positive instructions. The most critical rules to implement are the ones that prevent logical impossibilities and direct tonal contradictions listed above.


With these four steps, you have a complete Tier 1 conflict handling system. It reads the rules from your central data structure, uses JavaScript logic to check for conflicts on every user interaction, and applies clear but non-blocking CSS styles to warn the user, fulfilling the requirements perfectly.



---

**Summary of Expected Outcome:**

After implementing these changes, the TweetCraft extension will feature a new, five-step UI in the "All" tab of the AI Reply popup. The user will be able to select one option from each category. The UI will provide visual warnings for conflicting choices. Upon clicking "Generate Reply," the selections will be sent to the service worker, which will construct a detailed, multi-instruction system prompt for the orchestrator LLM, resulting in highly specific and nuanced AI-generated replies.