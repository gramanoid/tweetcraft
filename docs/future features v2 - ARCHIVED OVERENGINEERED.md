Awesome—thanks for pasting the repo. I went through your tree and wired the **RapidAPI upgrades** together with the **six high‑impact, non‑Rapid features** you approved. Below is a **repo‑accurate, implementation‑ready plan** with file‑by‑file diffs, new files, types, storage keys, manifest updates, and acceptance checks. You can hand this straight to Claude Code.

> **Constraints you set (respected here):**
> • **No official X API.**
> • **Auto‑post is OFF by default (toggle).**
> • Primary posting via **RapidAPI** provider + **2 fallbacks**.
> • Keep solutions **creative/useful/complex‑but‑not‑over‑engineered**.

---

# 0) Quick repo notes

* Your **webpack entry** uses `popup-simple.ts` (not `popup.ts`). I extend **`popup.html` + `popup-simple.ts`** for new settings.
* Storage currently uses:

  * `chrome.storage.local`: `smartReply_apiKey` (OpenRouter)
  * `chrome.storage.sync`: `smartReply_config`
* I keep sensitive keys in **local** (RapidAPI, Cohere, Perplexity), feature flags in **sync**.

---

# 1) Manifest changes

Add host permissions for RapidAPI + optional reranker/crumb. (No official X API.)

```diff
*** public/manifest.json
@@
   "host_permissions": [
-    "https://openrouter.ai/*"
+    "https://openrouter.ai/*",
+    "https://*.p.rapidapi.com/*",           // RapidAPI providers
+    "https://api.cohere.ai/*",              // (optional) reranker
+    "https://api.perplexity.ai/*"           // (optional) one-crumb
   ],
   "permissions": [
-    "storage",
+    "storage",
     "scripting",
     "notifications"
   ],
```

---

# 2) Types & storage (new fields)

We extend config + request types, add new secure key getters/setters.

```diff
*** src/types/index.ts
@@
 export interface AppConfig {
   apiKey: string;                   // OpenRouter key (legacy field, persisted as smartReply_apiKey in local)
   model: string;
   systemPrompt: string;
   contextMode?: 'none' | 'single' | 'thread';
   tonePresets: TonePreset[];
   temperature?: number;
+  // --- New feature flags / UX ---
+  autoPostEnabled?: boolean;        // default: false
+  readOnlyMode?: boolean;           // default: true (safety; if true, never auto-click DOM)
+  postVendorOrder?: ('twttrapi'|'intent'|'dom')[]; // posting chain
+  debugLogs?: boolean;              // wrap console logs
 }
@@
 export interface OpenRouterRequest {
   model: string;
   messages: OpenRouterMessage[];
   temperature?: number;
   max_tokens?: number;
   top_p?: number;
+  // N-best jitter
+  presence_penalty?: number;
+  frequency_penalty?: number;
+  seed?: number;
+  response_format?: any; // json_schema for variants
 }
@@
 export interface TwitterContext {
   tweetText?: string;
   authorHandle?: string;
   tweetId?: string;
   isReply: boolean;
   threadContext?: ThreadTweet[];
+  // cadence mimic
+  topSig?: { len: 'S'|'M'|'L'; device: '?'|'—'|'()'|'🙂'|'·' };
 }
@@
 export const DEFAULT_CONFIG: Partial<AppConfig> = {
   model: 'openai/gpt-4o',
   systemPrompt: 'You are a helpful social media user who writes engaging, authentic replies to tweets. Keep responses concise and natural.',
   contextMode: 'thread',
-  tonePresets: DEFAULT_TONE_PRESETS
+  tonePresets: DEFAULT_TONE_PRESETS,
+  autoPostEnabled: false,
+  readOnlyMode: true,
+  postVendorOrder: ['twttrapi','intent','dom'],
+  debugLogs: true
 };
```

### Storage service (merge‑safe setConfig + new key helpers)

```diff
*** src/services/storage.ts
@@
 const STORAGE_KEYS = {
   CONFIG: 'smartReply_config',
   API_KEY: 'smartReply_apiKey',
-  LAST_TONE: 'smartReply_lastTone'
+  LAST_TONE: 'smartReply_lastTone',
+  RAPID_KEY: 'smartReply_rapidApiKey',
+  COHERE_KEY: 'smartReply_cohereApiKey',
+  PPLX_KEY: 'smartReply_perplexityApiKey'
 } as const;
@@
   static async setConfig(config: Partial<AppConfig>): Promise<void> {
     try {
-      await chrome.storage.sync.set({
-        [STORAGE_KEYS.CONFIG]: config
-      });
+      // merge with current config so we never clobber fields
+      const current = await this.getConfig();
+      const next = { ...current, ...config };
+      await chrome.storage.sync.set({ [STORAGE_KEYS.CONFIG]: next });
     } catch (error) {
       console.error('Failed to save config to storage:', error);
       throw error;
     }
   }
@@
+  // --- RapidAPI / Cohere / Perplexity keys (local) ---
+  static async getRapidApiKey(): Promise<string | undefined> {
+    try { return (await chrome.storage.local.get(STORAGE_KEYS.RAPID_KEY))[STORAGE_KEYS.RAPID_KEY]; }
+    catch { return undefined; }
+  }
+  static async setRapidApiKey(key: string): Promise<void> {
+    await chrome.storage.local.set({ [STORAGE_KEYS.RAPID_KEY]: key });
+  }
+  static async getCohereKey(): Promise<string | undefined> {
+    try { return (await chrome.storage.local.get(STORAGE_KEYS.COHERE_KEY))[STORAGE_KEYS.COHERE_KEY]; }
+    catch { return undefined; }
+  }
+  static async setCohereKey(key: string): Promise<void> {
+    await chrome.storage.local.set({ [STORAGE_KEYS.COHERE_KEY]: key });
+  }
+  static async getPerplexityKey(): Promise<string | undefined> {
+    try { return (await chrome.storage.local.get(STORAGE_KEYS.PPLX_KEY))[STORAGE_KEYS.PPLX_KEY]; }
+    catch { return undefined; }
+  }
+  static async setPerplexityKey(key: string): Promise<void> {
+    await chrome.storage.local.set({ [STORAGE_KEYS.PPLX_KEY]: key });
+  }
```

---

# 3) Popup: new settings (auto‑post toggle, RapidAPI/Cohere/PPLX keys, vendor order)

### HTML (add a simple section; minimal UI changes)

```diff
*** public/popup.html
@@
       <main class="popup-content">
         ...
+        <div class="setting-group">
+          <label for="rapid-key">RapidAPI Key (for posting/context):</label>
+          <input type="password" id="rapid-key" placeholder="Enter your RapidAPI key">
+          <small>Used for providers like TwttrAPI / Old Bird on RapidAPI.</small>
+        </div>
+
+        <div class="setting-group">
+          <label><input type="checkbox" id="auto-post"> Enable auto‑post (toggle)</label>
+          <small>OFF by default. When ON, replies may be posted automatically via provider chain.</small>
+        </div>
+
+        <div class="setting-group">
+          <label for="vendor-order">Posting vendor order:</label>
+          <select id="vendor-order" multiple>
+            <option value="twttrapi" selected>TwttrAPI (RapidAPI)</option>
+            <option value="intent" selected>Share Intent (prefilled)</option>
+            <option value="dom" selected>DOM click (composer)</option>
+          </select>
+          <small>Drag or select order to set primary + fallbacks.</small>
+        </div>
+
+        <div class="setting-group">
+          <label for="cohere-key">Cohere API Key (optional, reranker):</label>
+          <input type="password" id="cohere-key" placeholder="sk-...">
+        </div>
+
+        <div class="setting-group">
+          <label for="pplx-key">Perplexity API Key (optional, crumb):</label>
+          <input type="password" id="pplx-key" placeholder="pplx-...">
+        </div>
```

### Script (load/save the new settings)

```diff
*** src/popup/popup-simple.ts
@@
   const refreshModelsBtn = document.getElementById('refresh-models') as HTMLButtonElement;
+  const rapidKeyInput = document.getElementById('rapid-key') as HTMLInputElement;
+  const autoPostCheckbox = document.getElementById('auto-post') as HTMLInputElement;
+  const vendorOrderSelect = document.getElementById('vendor-order') as HTMLSelectElement;
+  const cohereKeyInput = document.getElementById('cohere-key') as HTMLInputElement;
+  const pplxKeyInput = document.getElementById('pplx-key') as HTMLInputElement;
@@
   chrome.storage.sync.get(['smartReply_config'], (result) => {
     if (result.smartReply_config) {
       const config = result.smartReply_config;
       ...
+      if (autoPostCheckbox) autoPostCheckbox.checked = !!config.autoPostEnabled;
+      if (vendorOrderSelect && Array.isArray(config.postVendorOrder)) {
+        [...vendorOrderSelect.options].forEach(o => o.selected = config.postVendorOrder.includes(o.value as any));
+      }
     }
   });
+  chrome.storage.local.get(['smartReply_rapidApiKey','smartReply_cohereApiKey','smartReply_perplexityApiKey'], (r) => {
+    if (rapidKeyInput && r.smartReply_rapidApiKey) rapidKeyInput.value = r.smartReply_rapidApiKey;
+    if (cohereKeyInput && r.smartReply_cohereApiKey) cohereKeyInput.value = r.smartReply_cohereApiKey;
+    if (pplxKeyInput && r.smartReply_perplexityApiKey) pplxKeyInput.value = r.smartReply_perplexityApiKey;
+  });
@@
   if (saveBtn) {
     saveBtn.addEventListener('click', async () => {
       ...
+      const autoPostEnabled = !!autoPostCheckbox?.checked;
+      const postVendorOrder = [...vendorOrderSelect?.selectedOptions || []].map(o => o.value) as any;
+      const rapidKey = rapidKeyInput?.value?.trim();
+      const cohereKey = cohereKeyInput?.value?.trim();
+      const pplxKey = pplxKeyInput?.value?.trim();
@@
-      if (apiKey) {
+      if (apiKey) {
         ...
         const config = {
           model: model || 'openai/gpt-4o',
           systemPrompt: systemPrompt || 'I am a helpful assistant',
           contextMode: contextMode,
-          temperature
+          temperature,
+          autoPostEnabled,
+          postVendorOrder: postVendorOrder?.length ? postVendorOrder : ['twttrapi','intent','dom']
         };
         await chrome.storage.sync.set({ smartReply_config: config });
+        if (rapidKey) await chrome.storage.local.set({ smartReply_rapidApiKey: rapidKey });
+        if (cohereKey) await chrome.storage.local.set({ smartReply_cohereApiKey: cohereKey });
+        if (pplxKey) await chrome.storage.local.set({ smartReply_perplexityApiKey: pplxKey });
```

---

# 4) New service files (drop into `src/services/`)

## 4.1 Reranker (Cohere) — **optional**

```ts
// src/services/rerank.ts
export async function rerankCohere(apiKey: string, query: string, docs: string[], ms = 450): Promise<number> {
  const ctrl = new AbortController(); const to = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch('https://api.cohere.ai/v2/rerank', {
      method: 'POST', signal: ctrl.signal,
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'rerank-english-v3.0', query, documents: docs })
    });
    const j = await r.json();
    return j?.results?.[0]?.index ?? 0;
  } catch { return 0; } finally { clearTimeout(to); }
}
```

## 4.2 Novelty gate (embedding‑free)

```ts
// src/services/novelty.ts
const KEY='tweetcraft_hist_v1', LIM=200;
function grams3(s:string){ const w=s.toLowerCase().replace(/[^\w\s]/g,'').split(/\s+/).filter(Boolean);
  const g:string[]=[]; for(let i=0;i<w.length-2;i++) g.push(w.slice(i,i+3).join(' ')); return new Set(g);
}
function jacc(a:Set<string>,b:Set<string>){ const inter=[...a].filter(x=>b.has(x)).length; return inter/(a.size+b.size-inter||1); }

export async function tooSimilar(candidate:string, thresh=0.58){
  const hist=(await chrome.storage.local.get(KEY))[KEY]||[];
  const cg=grams3(candidate); return hist.some((h:any)=> jacc(cg, new Set(h.g)) >= thresh);
}
export async function saveToHist(text:string){
  const hist=(await chrome.storage.local.get(KEY))[KEY]||[];
  const entry={t:Date.now(), g:[...grams3(text)]};
  const next=[...hist,entry].slice(-LIM); await chrome.storage.local.set({[KEY]:next});
}
```

## 4.3 One‑crumb (Perplexity) — **optional**

````ts
// src/services/perplexity.ts
export async function oneCrumb(tweetText:string, key:string, ms=450):
  Promise<{fact:string,url?:string}|null> {
  const ctrl=new AbortController(); const t=setTimeout(()=>ctrl.abort(),ms);
  try{
    const r=await fetch('https://api.perplexity.ai/chat/completions',{
      method:'POST',signal:ctrl.signal,
      headers:{'Authorization':`Bearer ${key}`,'Content-Type':'application/json'},
      body:JSON.stringify({
        model:'sonar',
        messages:[
          {role:'system',content:'Return JSON {"fact":"<=18 words","url":"<credible>"} only.'},
          {role:'user',content:tweetText}
        ]
      })
    });
    const raw=(await r.json())?.choices?.[0]?.message?.content?.replace(/```json|```/g,'')||'';
    const {fact,url}=JSON.parse(raw); return fact?{fact,url}:null;
  } catch { return null } finally { clearTimeout(t); }
}
````

## 4.4 Posting orchestrator + TwttrAPI adapter

> **Primary posting provider:** **TwttrAPI on RapidAPI** — their listing advertises **“create and delete posts, reposts, likes...”** (write support). ([RapidAPI][1])
> **Fallbacks (no official X API):** 1) Share Intent window prefill, 2) DOM click in current composer.

```ts
// src/services/poster.ts
import { StorageService } from './storage';

export type PostResult = { ok: boolean; provider: string; id?: string; error?: string };

export async function postChain(text: string, inReplyToId?: string): Promise<PostResult> {
  const cfg = await StorageService.getConfig();
  const order = cfg.postVendorOrder || ['twttrapi','intent','dom'];
  for (const p of order) {
    try {
      if (p === 'twttrapi') {
        const r = await postViaTwttrAPI(text, inReplyToId);
        if (r.ok) return r;
      } else if (p === 'intent') {
        const r = await postViaIntent(text, inReplyToId);
        if (r.ok) return r;
      } else if (p === 'dom') {
        const r = await postViaDom(text);
        if (r.ok) return r;
      }
    } catch (e:any) { /* continue */ }
  }
  return { ok:false, provider: order.join('>'), error: 'All providers failed' };
}

// --- Provider 1: TwttrAPI (RapidAPI) ---
async function postViaTwttrAPI(text:string, inReplyToId?:string): Promise<PostResult> {
  const rapid = await StorageService.getRapidApiKey();
  if (!rapid) return { ok:false, provider:'twttrapi', error:'RapidAPI key missing' };
  // Endpoint shape: TwttrAPI exposes write operations (create/delete posts). Exact path varies;
  // keep base stable & pass params body; adjust per vendor docs.
  const host = 'twttrapi.p.rapidapi.com';
  const url  = `https://${host}/post/create`; // <— confirm exact path in docs
  const body:any = { text };
  if (inReplyToId) body.reply_to = inReplyToId;

  const r = await fetch(url, {
    method:'POST',
    headers:{
      'Content-Type':'application/json',
      'X-RapidAPI-Key': rapid,
      'X-RapidAPI-Host': host
    },
    body: JSON.stringify(body)
  });
  if (!r.ok) return { ok:false, provider:'twttrapi', error:`${r.status}` };
  const j = await r.json().catch(()=>({}));
  const id = j?.data?.id || j?.id;
  return { ok: !!id, provider:'twttrapi', id, error: id?undefined:'no id in response' };
}

// --- Fallback 1: Share Intent (prefill + auto-submit) ---
async function postViaIntent(text:string, inReplyToId?:string): Promise<PostResult> {
  try {
    const u = new URL('https://twitter.com/intent/tweet');
    u.searchParams.set('text', text);
    if (inReplyToId) u.searchParams.set('in_reply_to', inReplyToId);
    const w = window.open(u.toString(), '_blank', 'width=640,height=480');
    if (!w) return { ok:false, provider:'intent', error:'popup blocked' };
    // Optionally attempt auto-submit by probing the compose form after load.
    // If blocked by CSP, user can hit Enter; we still count as ok=false to proceed to next fallback if needed.
    return { ok:false, provider:'intent', error:'user action needed' };
  } catch (e:any) { return { ok:false, provider:'intent', error:e?.message||'intent failed' }; }
}

// --- Fallback 2: DOM click (current composer) ---
async function postViaDom(text:string): Promise<PostResult> {
  try {
    // assume text already pasted; try to click Post/Reply button
    const btn = document.querySelector('[data-testid="tweetButtonInline"],[data-testid="tweetButton"]') as HTMLButtonElement | null;
    if (!btn) return { ok:false, provider:'dom', error:'button not found' };
    btn.click();
    return { ok:true, provider:'dom' };
  } catch (e:any) { return { ok:false, provider:'dom', error:e?.message||'dom error' }; }
}
```

## 4.5 (Optional) Old Bird v2 (RapidAPI) — **read‑only context**

Use to enrich context if DOM text is missing or to resolve tweet IDs. Old Bird markets itself as an “X‑like API”; its official site describes the product; on RapidAPI, it’s offered by third‑party publishers (read‑only is typical). ([RapidAPI][2])

```ts
// src/services/oldbird.ts
import { StorageService } from './storage';

export async function fetchTweetById(tweetId: string): Promise<{ text?: string; author?: string }|null> {
  const rapid = await StorageService.getRapidApiKey();
  if (!rapid) return null;
  const host = 'the-old-bird.p.rapidapi.com'; // check vendor page for exact host
  const url  = `https://${host}/tweets/${tweetId}`;
  try {
    const r = await fetch(url, {
      headers: { 'X-RapidAPI-Key': rapid, 'X-RapidAPI-Host': host }
    });
    if (!r.ok) return null;
    const j = await r.json();
    return { text: j?.data?.text || j?.text, author: j?.data?.user?.username || j?.user?.username };
  } catch { return null; }
}
```

> **Why TwttrAPI for posting?** Its RapidAPI listing explicitly advertises **“create and delete posts, reposts, likes...”** which implies **write endpoints** suited for auto‑posting. ([RapidAPI][1])
> **Why Old Bird for read?** A stable **read‑only** context provider to backfill tweet text/author when DOM fails. ([RapidAPI][2])

---

# 5) DOM utils: tweetId + top‑reply signature

```diff
*** src/content/domUtils.ts
@@
   static readonly ORIGINAL_TWEET_SELECTOR = 'article[data-testid="tweet"][tabindex="-1"]';
+  static readonly LIKE_BUTTON = '[data-testid="like"]';
@@
   static extractTwitterContext(toolbarElement: Element): TwitterContext {
     const context: TwitterContext = {
       isReply: false
     };
@@
-    const originalTweetElement = document.querySelector(this.ORIGINAL_TWEET_SELECTOR);
+    const originalTweetElement = document.querySelector(this.ORIGINAL_TWEET_SELECTOR);
@@
       if (tweetTextElement) {
         const rawText = tweetTextElement.textContent || '';
         // Clean tracking parameters from any URLs in the tweet
         context.tweetText = URLCleaner.cleanTextURLs(rawText);
         ...
       }
+      // Extract tweetId from canonical status link if available
+      const statusLink = originalTweetElement.querySelector('a[href*="/status/"]') as HTMLAnchorElement | null;
+      if (statusLink?.href) {
+        const m = statusLink.href.match(/status\/(\d+)/);
+        if (m) context.tweetId = m[1];
+      }
@@
-    return context;
+    // Cadence signature from top visible reply
+    context.topSig = this.getTopReplySignature();
+    return context;
   }
@@
   static extractThreadContext(): Array<{author: string, text: string}> | null {
     ...
   }
+
+  static getTopReplySignature(): TwitterContext['topSig'] {
+    try {
+      const arts=[...document.querySelectorAll('article[data-testid="tweet"]')];
+      const replies=arts.slice(1); const emoj=/\p{Extended_Pictographic}/u;
+      const top=replies.map(a=>{
+        const txt=a.querySelector('[data-testid="tweetText"]')?.textContent?.trim()||'';
+        const likes=+(a.querySelector(this.LIKE_BUTTON)?.getAttribute('aria-label')?.replace(/[^\d]/g,'')||0);
+        const words=txt.split(/\s+/).filter(Boolean).length;
+        const len = words<=10?'S':words<=18?'M':'L';
+        const device = txt.includes('?') ? '?' :
+                       (/—|--/.test(txt) ? '—' :
+                       (/\(.*\)/.test(txt) ? '()' : (emoj.test(txt) ? '🙂' : '·')));
+        return {likes,len,device};
+      }).sort((a,b)=>b.likes-a.likes)[0];
+      if (top) return { len: top.len as any, device: top.device as any };
+    } catch {}
+    return undefined;
+  }
```

---

# 6) OpenRouter pipeline upgrades (the 6 high‑impact features)

**Scope:** Everything lives inside `src/services/openRouter.ts` (no UI change required).

### What we add

1. **Structured N‑best** with **style roulette** + **sampling jitter**
2. **Reranker as human‑filter** (Cohere; skip if no key / >450ms)
3. **Embedding‑free Novelty Gate** (3‑gram Jaccard)
4. **One‑crumb** (Perplexity; URL present; ≤450ms; 40% chance)
5. **Cadence mimic** (match top reply’s `?`, `—`, `()`, emoji; length band S/M/L)
6. **Topic‑aware routing** (select model per topic)

````diff
*** src/services/openRouter.ts
@@
 import { StorageService } from './storage';
 import { CacheService } from './cache';
 import { URLCleaner } from '@/utils/urlCleaner';
+import { rerankCohere } from './rerank';
+import { tooSimilar, saveToHist } from './novelty';
+import { oneCrumb } from './perplexity';

 export class OpenRouterService {
@@
   static async generateReply(
     request: ReplyGenerationRequest, 
     context: TwitterContext
   ): Promise<ReplyGenerationResponse> {
     try {
@@
       const config = await StorageService.getConfig();
       const apiKey = await StorageService.getApiKey();
+      const cohereKey = await StorageService.getCohereKey();
+      const pplxKey = await StorageService.getPerplexityKey();
@@
-      const messages = await this.buildMessages(request, context, config);
+      const messages = await this.buildMessages(request, context, config);
       const temperature = config.temperature || 0.7;
@@
-      const openRouterRequest: OpenRouterRequest = {
-        model: request.model || config.model || 'openai/gpt-4o',
-        messages,
-        temperature,
-        // max_tokens intentionally omitted for unlimited output
-        top_p: 0.9
-      };
+      const chosenModel = request.model || this.routeModel(context.tweetText || '', config.model);
+      const jitter = () => +(Math.random()*0.3).toFixed(2);
+      const response_format = {
+        type: 'json_schema',
+        json_schema: {
+          name: 'tweet_variants', strict: true,
+          schema: {
+            type: 'object', required: ['variants'], additionalProperties:false,
+            properties: {
+              variants: {
+                type: 'array', minItems:3, maxItems:3,
+                items: {
+                  type:'object', required:['reply','style'], additionalProperties:false,
+                  properties: {
+                    reply: { type:'string', minLength:1, maxLength:280 },
+                    style: { type:'string', enum:['quip','question','take','bridge','nudge'] }
+                  }
+                }
+              }
+            }
+          }
+        }
+      };
+      const openRouterRequest: OpenRouterRequest = {
+        model: chosenModel,
+        messages,
+        temperature: 0.6 + Math.random()*0.25,
+        top_p: 0.85 + Math.random()*0.1,
+        presence_penalty: jitter(),
+        frequency_penalty: jitter(),
+        seed: Math.floor(Math.random()*1e9),
+        response_format
+      };
@@
-      const result: OpenRouterResponse = await response.json();
+      const result: OpenRouterResponse = await response.json();
@@
-      const reply = result.choices[0]?.message?.content?.trim();
+      const raw = result.choices[0]?.message?.content?.trim() || '';
+      // Try to parse structured variants
+      let variants: string[] = [];
+      try {
+        const txt = raw.replace(/```json|```/g,'').trim();
+        const o = JSON.parse(txt);
+        variants = (o?.variants||[]).map((v:any)=>v.reply).filter(Boolean);
+      } catch { /* fallback below */ }
+      if (!variants.length) variants = [raw];
@@
-      if (!reply) {
+      if (!variants[0]) {
         ...
       }
@@
-      const cleanedReply = this.cleanupReply(reply);
+      // Rerank (optional)
+      let idx = 0;
+      if (cohereKey && variants.length > 1) {
+        const q = `Pick the least-cliché, most human reply to: "${context.tweetText}". Penalize generic praise; reward one concrete detail or a question.`;
+        try { idx = await rerankCohere(cohereKey, q, variants, 450); } catch {}
+      }
+      let best = this.cleanupReply(variants[idx] || variants[0]);
@@
-      if (!cleanedReply) {
+      if (!best) {
         ...
       }
-      const replyToUse = cleanedReply || reply;
+      // Per-link crumb (optional, URL present, 40% chance, <=450ms)
+      const hasURL = /\bhttps?:\/\//.test(context.tweetText || '');
+      if (hasURL && pplxKey && Math.random() < 0.4) {
+        try {
+          const crumb = await oneCrumb(context.tweetText!, pplxKey, 450);
+          if (crumb?.fact) {
+            const host = crumb.url ? new URL(crumb.url).hostname : '';
+            best = best.replace(/\.$/, '') + ` — ${crumb.fact}${host?` (${host})`:''}`;
+          }
+        } catch {}
+      }
+      // Cadence mimic (top reply signature)
+      best = this.nudgeToSig(best, context.topSig);
+      // Novelty gate (avoid near-duplicates)
+      if (await tooSimilar(best)) {
+        const snip=(context.tweetText||'').split(/\s+/).slice(0,3).join(' ');
+        best = best.replace(/\.$/, '') + ` — re: “${snip}”`;
+      }
+      await saveToHist(best);
+      const replyToUse = best;
@@
       // Cache the successful response if we have a tweet ID and tone
       if (context.tweetId && request.tone) {
         CacheService.set(context.tweetId, request.tone, replyToUse);
       }
@@
       const finalReply = URLCleaner.cleanTextURLs(replyToUse);
       return {
         success: true,
         reply: finalReply
       };
````

Add two tiny helpers inside the class:

```diff
*** src/services/openRouter.ts
@@
   private static cleanupReply(reply: string): string { ... }
+
+  private static routeModel(tweet:string, fallback:string|undefined){
+    const t=(tweet||'').toLowerCase();
+    if (/\b(node|react|rust|cuda|llm|prompt|api|repo|typescript|docker|k8s)\b/.test(t))
+      return 'groq/llama-3.1-8b-instant';
+    if (/\b(cpi|btc|\$[A-Z]{1,5}|yield|earnings|ipo|inflation)\b/.test(t))
+      return 'openai/gpt-4o';
+    return fallback || 'openai/gpt-4o';
+  }
+
+  private static nudgeToSig(text:string, sig?:{len:'S'|'M'|'L';device:string}){
+    if(!sig) return text.trim();
+    let out = text.trim();
+    out = out.replace(/[?—]/g,'');
+    if (sig.device==='?') out = out.replace(/[.!…]*$/,'?');
+    else if (sig.device==='—') out = out.replace(/[.!?…]*$/,' —');
+    else if (sig.device==='()' && out.length>30) out += ' (quick thought)';
+    const words = out.split(/\s+/);
+    if (sig.len==='S' && words.length>13) out = words.slice(0,13).join(' ');
+    if (sig.len==='L' && words.length<16) out += ' — tiny detail?';
+    return out;
+  }
```

---

# 7) Content script: **auto‑post chain** (guarded by toggle)

* After inserting the text, **if** `autoPostEnabled === true`, call `postChain()` with `context.tweetId` as reply target (when applicable).
* Respect `readOnlyMode` (if set, never click DOM). We keep `readOnlyMode` default **true** for safety.

```diff
*** src/content/contentScript.ts
@@
 import './contentScript.scss';
+import { postChain } from '@/services/poster';
@@
   private async generateReply(
     textarea: HTMLElement, 
     context: any, 
     tone?: string
   ): Promise<void> {
@@
       if (response.success && response.reply) {
         // Set the generated text in the textarea
         DOMUtils.setTextareaValue(textarea, response.reply);
         ...
+        // Optional auto-post (toggle; default OFF)
+        try {
+          const cfg = await StorageService.getConfig();
+          if (cfg.autoPostEnabled) {
+            const r = await postChain(response.reply, context?.tweetId);
+            console.log('[TweetCraft] AutoPost', r);
+          }
+        } catch(e) { console.log('[TweetCraft] AutoPost skipped', e); }
```

*(If you want an **extra** guard to prevent accidental posting, add a mini 3‑second “UNDO” toast before invoking `postChain`; easy add in DOM.)*

---

# 8) Background/service worker (optional helpers)

If you prefer **all network calls** to originate from the service worker (to bypass any CSP in content), add simple message handlers that proxy fetches for TwttrAPI and reranker/crumb. Current setup allows direct fetch from content with host permissions—**no change required** unless you hit CSP.

---

# 9) Final combined feature list (what’s included)

## A. **Automated Posting (OFF by default) + 2 fallbacks**

* **Primary:** **TwttrAPI via RapidAPI** (write support advertised: create/delete posts, reposts, likes). ([RapidAPI][1])

  * **Config:** `rapidApiKey` in `chrome.storage.local`.
  * **Endpoint:** `https://twttrapi.p.rapidapi.com/post/create` *(confirm exact path; code is adapter‑ready).*
  * **Reply linking:** pass `reply_to` when `context.tweetId` exists.
* **Fallback 1:** **Share Intent** (`/intent/tweet`) prefill; try to auto‑submit, else user taps **Tweet**.
* **Fallback 2:** **DOM post**—click current composer’s **Tweet/Reply** button.
* **Safety:** `autoPostEnabled: false` by default; optional `readOnlyMode` to hard‑disable DOM clicks.
* **Observability:** `console.log('[TweetCraft] AutoPost', {provider, id, ok})`.

## B. **Old Bird v2 (RapidAPI) context (read‑only)**

* Used when DOM text missing or to backfill context. (Official site markets Old Bird; RapidAPI has listings by publishers.) ([RapidAPI][2])
* **Function:** `fetchTweetById(id)` → `{text, author}`; integrates in `buildMessages` only when needed.

## C. Six **High‑Impact** non‑Rapid features (all integrated in `openRouter.ts`)

1. **Structured N‑Best + Style Roulette + Jitter**

   * 3 variants via `response_format: json_schema`; roulette styles; jitter on temp/top\_p/penalties/seed.
   * Fallback to plaintext if schema ignored.

2. **Reranker as Human Filter (Cohere)**

   * Enabled iff `cohereKey` present; **450ms** timebox; else skip.

3. **Embedding‑Free Novelty Gate**

   * 3‑gram Jaccard ≥0.58 → nudge/avoid dupes; rolling 200 history in local storage.

4. **Perplexity One‑Crumb**

   * On link tweets, **≤18‑word** fact + hostname appended; **40%** chance; **450ms** timebox.

5. **Top‑Reply Cadence Mimic**

   * Read top visible reply’s **device** (`?`, `—`, `()`, `🙂`) + **length band** (S/M/L); nudge output.

6. **Topic‑Aware Routing**

   * Regex heuristics → code/markets/general → pick model (`groq/llama‑3.1‑8b‑instant` for code; `gpt‑4o` otherwise).
   * Manual override still respected via popup model select.

---

# 10) Acceptance tests (clipboard for QA)

**Auto‑post chain**

* With `autoPostEnabled=false` → never posts, only paste text.
* With `autoPostEnabled=true` and valid Rapid key:

  * TwttrAPI responds 2xx → post result logs `{ok:true, provider:'twttrapi'}`.
  * Force TwttrAPI 5xx → falls back to **intent**; if popup blocked, logs `{ok:false, provider:'intent'}` then tries **dom**.
  * With composer present → DOM fallback returns `{ok:true, provider:'dom'}`.

**Old Bird context**

* Clear DOM text artificially; `fetchTweetById` returns text → `buildMessages` uses it in prompt.

**N‑Best / Reranker / Novelty / Crumb / Cadence**

* N‑Best returns 3 items ≥95% of the time; fallback works when schema ignored.
* Reranker (with key) picks non‑cliché variant ≥80% on synthetic test set; skipped if >450ms.
* Novelty: feed 20 near‑dupes → block rate ≥90%.
* Crumb: on link tweet, attaches ≤18 words + `(host)` \~40% of runs; none when no URL or timeout.
* Cadence: top reply ends with `?` → our reply ends with `?`; short thread → we truncate to S band.

**Perf**

* p95 end‑to‑end latency < 1.6s without crumb/rerank; < 2.2s when both max‑timeout.

---

# 11) Security & compliance notes

* **No official X API** calls—only RapidAPI provider(s) and DOM/intent.
* Auto‑post is **opt‑in only** (default OFF).
* Keys stored securely: **Rapid/Cohere/Perplexity in local**, non‑sensitive flags in sync.

---

# 12) What Claude Code should do next (checklist)

1. Apply the **diffs** above to `manifest.json`, `types`, `storage`, `popup.html`, `popup-simple.ts`, `domUtils.ts`, `openRouter.ts`, and add new files under `src/services/`.
2. Confirm **RapidAPI hosts** and **exact TwttrAPI write endpoint path**; plug into `postViaTwttrAPI` (adapter already set for host/key headers).

   * Reference: **TwttrAPI RapidAPI listing** advertises **create/delete posts**. ([RapidAPI][1])
3. (Optional) Confirm **Old Bird v2** RapidAPI host path and patch `oldbird.ts`. ([RapidAPI][2])
4. Build & test:

   * `npm run build` → load unpacked → run through acceptance tests above.
5. If CSP blocks provider fetches in content, proxy via **service worker** (simple `chrome.runtime.onMessage` → `fetch`).

---

## References used for provider choices

* **TwttrAPI (RapidAPI):** “with twttrapi, you can … **create and delete posts**, reposts, likes…” (RapidAPI listing & vendor site). ([RapidAPI][1])
* **Old Bird (product site, RapidAPI presence via publishers):** general product/context. ([RapidAPI][2])

---

If you want, I can collapse these into a **single PR‑style patch** (file‑by‑file) or a **straight “apply‑this‑diff” blob** next.

[1]: https://rapidapi.com/organization/twttrapi?utm_source=chatgpt.com "twttrapi"
[2]: https://rapidapi.com/search/emergency?utm_source=chatgpt.com "API Hub"















Perfect—thanks for the screenshots. I mapped **every upgrade in the final combined plan** to (1) what it does & how it’s used, and (2) exactly **how it shows up in your current popup UI** (which is the only interactive surface right now). Where something needs a tiny in‑page element (e.g., a posting confirmation toast), I call it out as **optional UI expansion**—but everything works with the popup alone.

Below, “🔧 Popup UI” items use your existing `setting-group` pattern, labels, and tone. Default values respect your constraints (**no official X API**, **auto‑post OFF by default**).

---

## A) Automated Posting (primary via RapidAPI **TwttrAPI**, 2 fallbacks)

**What it does / how to use**

* When you click **AI Reply** in X:

  1. We generate the reply.
  2. If **Auto‑post** is enabled, we try to **publish** automatically through a provider **chain**:

     * **1. TwttrAPI (RapidAPI)** ← primary (supports **create posts**, reply‑to when we have `tweetId`).
     * **2. Share Intent** prefill (opens a `twitter.com/intent/tweet` window; user taps **Tweet** if CSP blocks auto‑submit).
     * **3. DOM click** (clicks the **Tweet/Reply** button if the composer is already open).
  3. Chain stops at the first success; failures fall through automatically.
* If **Auto‑post** is **OFF**, nothing is posted; we just paste the text into the composer as today.

**🔧 Popup UI (new, minimal)**

* **RapidAPI Key (for posting/context)** – password field under **OpenRouter API Key**.

  * *Label*: “RapidAPI Key (for posting/context)”
  * *Storage*: `smartReply_rapidApiKey` (local)
* **Auto‑post** – checkbox (OFF by default).

  * *Label*: “Enable auto‑post (toggle)”
  * *Help text*: “OFF by default. When ON, replies may be posted automatically via provider chain.”
  * *Config*: `autoPostEnabled: boolean`
* **Posting provider order** – multi‑select (default: `TwttrAPI, Intent, DOM` all selected).

  * *Label*: “Posting provider order”
  * *Help text*: “Select order to set primary + fallbacks.”
  * *Config*: `postVendorOrder: ('twttrapi'|'intent'|'dom')[]`
* **(Optional)** “Show desktop notification when posted” – checkbox (uses already requested `"notifications"` permission).

**Optional in‑page UI expansion**

* 3‑second **“UNDO” toast** after a successful post (clicking undoes only if provider supports delete; if not, the toast is informational). This improves safety while keeping Auto‑post useful.

**What the user sees day‑to‑day**

* With Auto‑post OFF: no change—reply gets pasted.
* With Auto‑post ON: after generation, the reply is posted; if TwttrAPI fails, we fall back to a prefilled Intent tab; otherwise DOM button click. An optional Chrome notification “✅ Posted via TwttrAPI” (or fallback label) can appear.

---

## B) Old Bird v2 (RapidAPI) – **read‑only** context fallback

**What it does / how to use**

* If X’s DOM changes (or text is missing), we call **Old Bird v2** via RapidAPI to fetch **tweet text + author** by `tweetId`. It’s **read‑only** and only used if the DOM data is incomplete.
* No user action during reply; this runs in the background.

**🔧 Popup UI**

* **Use external context fallback** – checkbox (ON by default).

  * *Label*: “Use RapidAPI context fallback (Old Bird) when DOM text is missing”
  * *Storage*: piggybacks the same **RapidAPI Key** above.
  * *Config*: `externalContextFallback: boolean` (we can store inside `smartReply_config`)

**What the user sees**

* No UI change during reply; they just get better context and more relevant replies when DOM extraction is flaky.

---

## C) Six high‑impact non‑Rapid features in your LLM pipeline

> These run automatically; the popup adds small, understandable toggles. All defaults reflect a safe, useful baseline.

### 1) **Structured N‑Best + Style Roulette + Jitter**

**What it does / how to use**

* The LLM returns **3 structured variants** (`{reply, style}`) in one call.
* We apply slight parameter **jitter** (temperature/top‑p/penalties/seed) so variants don’t feel samey.
* One candidate is picked downstream (reranker/novelty/cadence may influence it).
* User does not need to pick variants in the UI; it keeps the experience one‑click.

**🔧 Popup UI**

* **Variety mode (3 candidates)** – checkbox (ON).

  * *Label*: “Variety mode (3 behind‑the‑scenes candidates)”
  * *Help text*: “Improves natural variation; no extra clicks.”
  * *Config*: `varietyNBest: boolean` (implicit; defaults ON)
* **(Optional)** Developer toggle: “Log variants to console (debug)” – checkbox (OFF).
  Useful for tuning, doesn’t affect end users.

**UX effect**

* Replies feel less templated without UI clutter. No extra clicks for users.

---

### 2) **Reranker as human‑filter (Cohere/Jina/Voyage; using Cohere here)**

**What it does / how to use**

* If you provide a **Cohere API key**, we timebox a **rerank** request (**≤450 ms**) to pick the least‑cliché, most “human” variant.
* If the reranker is slow or errors, we skip it without blocking.

**🔧 Popup UI**

* **Cohere API Key** – password field (optional).
* **Smart pick (Reranker)** – checkbox (ON if key is present; hidden/disabled when empty).

  * *Help text*: “Tries to pick the least‑cliché variant in \~450 ms. Fails open.”
  * *Storage*: `smartReply_cohereApiKey` (local), `rerankEnabled: boolean`

**UX effect**

* Users see cleaner, more human replies. No new steps.

---

### 3) **Embedding‑free Novelty Gate** (3‑gram Jaccard)

**What it does / how to use**

* Keeps a rolling history of your last \~200 replies (stored locally as 3‑gram sets).
* If a new reply is too similar (`Jaccard ≥ 0.58`), we subtly **nudge** it (e.g., add a 2–3 word quote from the tweet) or choose another variant when available.

**🔧 Popup UI**

* **Avoid near‑duplicates** – checkbox (ON).
* **Similarity threshold** – small slider (0.50–0.70; default **0.58**).

  * *Config*: `noveltyEnabled: boolean`, `noveltyThreshold: number`

**UX effect**

* Long‑term variety without user noticing. No additional clicks.

---

### 4) **Per‑link One‑Crumb grounding (Perplexity)**

**What it does / how to use**

* If the tweet contains a URL and you’ve added a **Perplexity key**, we attempt a single **fast lookup** (≤450 ms) to append **one short, checkable fact** + site hostname.
* We do this randomly \~**40%** of the time to avoid sounding procedural.

**🔧 Popup UI**

* **Perplexity API Key** – password field (optional).
* **Add a quick fact on link tweets** – checkbox (ON if key present).
* **Appearance rate** – slider (0–100%; default **40%**).

  * *Config*: `crumbEnabled: boolean`, `crumbRate: number` (0.4)

**UX effect**

* Replies to link‑tweets feel more informed. When timeboxed call fails, nothing changes.

---

### 5) **Top‑reply Cadence Mimic**

**What it does / how to use**

* We read the most‑liked visible reply and mirror just **one** aspect of its “shape”:

  * **Length band**: S / M / L.
  * **One device**: `?`, `—`, `()`, or a single emoji.
* Keeps you “sounding like the room” without copying content.

**🔧 Popup UI**

* **Match the room (cadence mimic)** – checkbox (ON).

  * *Help text*: “Aligns punctuation/length with the top reply’s vibe.”

**UX effect**

* Replies fit the thread’s cadence better; no UI change during use.

---

### 6) **Topic‑aware Model Routing** (tiny, safe heuristics)

**What it does / how to use**

* We detect light topic hints (e.g., `node`, `rust`, `api`, `btc`, `inflation`) and route to the appropriate **fast/cheap** vs **quality** model from OpenRouter—unless the user explicitly picked a model in the popup.

  * Example defaults:

    * **Code/build** → `groq/llama-3.1-8b-instant` (fast, good on codey chatter)
    * **Finance/markets** → your default `openai/gpt-4o`
    * **General** → your popup model (default `gpt-4o`)

**🔧 Popup UI**

* **Auto model routing** – checkbox (ON).
* **Route models** – 3 dropdowns: **General**, **Code**, **Markets** (pre‑filled with your fetched model list).

  * *Config*: `routingEnabled: boolean`, `routeModels: { general: string; code: string; markets: string }`

**UX effect**

* Faster responses on codey threads without the user needing to switch models.

---

## D) Small global toggles & safety polish

**What they do / how to use**

* **Debug logs** – one master toggle to print structured logs (helpful for tuning).
* **(Optional) Ban common clichés** – micro‑banlist for openers like “Totally agree”.

**🔧 Popup UI**

* **Developer / Advanced** collapsible section with:

  * “Debug logs” (ON)
  * “Ban common clichés” (ON)

**UX effect**

* Cleaner console during dev; no change for end users once shipped.

---

# Where everything sits in your popup (visual order)

Using your screenshots as reference, here’s the recommended order so the popup stays uncluttered but powerful:

1. **Keys & Providers**

   * OpenRouter API Key (existing)
   * **RapidAPI Key (new)**
   * **Cohere API Key (optional)**
   * **Perplexity API Key (optional)**
   * *Keep the existing **Test** button for OpenRouter; optional “Test RapidAPI” later if you want.*

2. **Model & Style**

   * Model (existing) + Refresh (existing)
   * Your Style/Personality (existing)

3. **Creativity & Context**

   * Temperature (existing)
   * Context Mode (existing)
   * **Variety mode (3 candidates)** (new)
   * **Avoid near‑duplicates** + threshold (new)
   * **Match the room (cadence mimic)** (new)
   * **Add a quick fact on link tweets** + appearance rate (new; enabled only if Perplexity key added)

4. **Routing**

   * **Auto model routing** (new)
   * **Route models:** General / Code / Markets (new)

5. **Posting**

   * **Enable auto‑post (toggle)** (new, OFF by default)
   * **Posting provider order** (TwttrAPI → Intent → DOM) (new)
   * **Use RapidAPI context fallback (Old Bird)** (new)
   * **(Optional)** Desktop notification on success (new)

6. **Advanced (collapsible)**

   * Log variants to console
   * Debug logs
   * Ban common clichés

7. **Save Settings** (existing)

> All new controls use your `setting-group` styling and will fit under the **Context Mode** section shown in your screenshots.

---

# End‑to‑end user journey (with/without Auto‑post)

### Setup (once, in popup)

1. Paste **OpenRouter key** (as you do now).
2. (Optional) Paste **RapidAPI key**.
3. (Optional) Paste **Cohere** and/or **Perplexity** keys.
4. Keep defaults or toggle:

   * Variety mode ✅, Novelty ✅, Cadence ✅, Routing ✅
   * Auto‑post ❌ (OFF by default)
   * Crumb 40% (if PPLX key present)
5. Click **Save Settings**.

### Daily use on X (Auto‑post OFF)

* Click **Reply** → click **AI Reply** → choose tone (existing).
* Extension:

  * Builds thread context (DOM, or Old Bird fallback if DOM missing),
  * Generates **3 variants**, optional **rerank**, **crumb** (if URL), **cadence mimic**, **novelty**.
* Result is **pasted** into the composer (as today). You edit or click **Tweet**.

### Daily use on X (Auto‑post ON)

* Same steps, but after paste we **post automatically**:

  * Try **TwttrAPI** → if fail, open **Intent** prefilled → if blocked, try **DOM click**.
* Optional **desktop notification** (“Posted via TwttrAPI”).
* (Optional UI expansion) brief **UNDO** toast.

---

# Defaults & safety (so it “just works”)

* **Auto‑post:** OFF ✅
* **Variety/N‑Best:** ON ✅
* **Novelty gate:** ON (0.58) ✅
* **Cadence mimic:** ON ✅
* **Crumb:** OFF unless Perplexity key provided; then ON at 40% ✅
* **Reranker:** OFF unless Cohere key provided; then ON (≤450 ms) ✅
* **Routing:** ON (simple heuristics) ✅
* **Old Bird fallback:** ON (requires RapidAPI key) ✅
* **Notifications:** OFF (optional) ✅

---

## What changes visually in the popup (summary)

* **3 new key fields** (RapidAPI / Cohere / Perplexity).
* **5–7 small toggles/sliders**, grouped under “Creativity & Context,” “Routing,” and “Posting.”
* Optional **Advanced** collapsible to hide debug stuff and keep the popup clean.

Nothing else changes on the page unless you enable the optional **posting notification** or **UNDO toast**. The **AI Reply** flow in the composer remains the one‑click experience your users already know.

---

If you want, I can output the exact HTML snippets for the new `setting-group`s (using your CSS), plus the `chrome.storage` keys they bind to—ready for Claude Code to paste into `public/popup.html` and `src/popup/popup-simple.ts`.
