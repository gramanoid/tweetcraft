/**
 * Arsenal Mode Service for TweetCraft
 * Pre-generate and store ready-to-use replies
 */

import { TEMPLATES } from '@/content/presetTemplates';
import { TONES } from '@/content/toneSelector';
import type { PresetTemplate } from '@/content/presetTemplates';
import type { ToneOption } from '@/content/toneSelector';

interface ArsenalReply {
  id: string;
  templateId: string;
  toneId: string;
  text: string;
  category: string;
  tags: string[];
  usageCount: number;
  lastUsed?: Date;
  createdAt: Date;
  temperature: number;
  isFavorite: boolean;
}

interface ArsenalCategory {
  id: string;
  name: string;
  emoji: string;
  replies: ArsenalReply[];
}

interface GenerationOptions {
  count: number;
  templates?: string[];
  tones?: string[];
  categories?: string[];
}

export class ArsenalService {
  private arsenal: Map<string, ArsenalReply> = new Map();
  private categories: Map<string, ArsenalCategory> = new Map();
  private db: IDBDatabase | null = null;
  private readonly DB_NAME = 'TweetCraftArsenal';
  private readonly DB_VERSION = 1;
  private readonly STORE_NAME = 'replies';

  constructor() {
    this.initializeDB();
    this.initializeCategories();
    console.log('%c⚔️ ArsenalService initialized', 'color: #1DA1F2; font-weight: bold');
  }

  /**
   * Initialize IndexedDB for storing pre-generated replies
   */
  private async initializeDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('%c⚔️ Arsenal database opened', 'color: #17BF63');
        this.loadFromDB();
        resolve();
      };

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          const store = db.createObjectStore(this.STORE_NAME, { keyPath: 'id' });
          store.createIndex('category', 'category', { unique: false });
          store.createIndex('templateId', 'templateId', { unique: false });
          store.createIndex('toneId', 'toneId', { unique: false });
          store.createIndex('usageCount', 'usageCount', { unique: false });
          store.createIndex('lastUsed', 'lastUsed', { unique: false });
          console.log('%c⚔️ Arsenal database created', 'color: #17BF63');
        }
      };
    });
  }

  /**
   * Initialize reply categories
   */
  private initializeCategories(): void {
    const defaultCategories = [
      { id: 'quick', name: 'Quick Responses', emoji: '⚡' },
      { id: 'debate', name: 'Debate Arsenal', emoji: '⚔️' },
      { id: 'humor', name: 'Humor Bank', emoji: '😂' },
      { id: 'support', name: 'Support Replies', emoji: '💪' },
      { id: 'professional', name: 'Professional', emoji: '💼' },
      { id: 'viral', name: 'Viral Potential', emoji: '🔥' }
    ];

    defaultCategories.forEach(cat => {
      this.categories.set(cat.id, { ...cat, replies: [] });
    });
  }

  /**
   * Pre-generate replies for arsenal
   */
  async generateArsenal(options: GenerationOptions): Promise<ArsenalReply[]> {
    console.log('%c⚔️ Generating arsenal', 'color: #1DA1F2', options);
    
    const generated: ArsenalReply[] = [];
    const templates = options.templates 
      ? options.templates.map(id => TEMPLATES.find((t: PresetTemplate) => t.id === id)).filter(Boolean) as PresetTemplate[]
      : TEMPLATES;
    
    const tones = options.tones
      ? options.tones.map(id => TONES.find((t: ToneOption) => t.id === id)).filter(Boolean) as ToneOption[]
      : TONES;

    // Generate combinations
    const combinations: Array<{ template: PresetTemplate, tone: ToneOption }> = [];
    
    templates.forEach((template: PresetTemplate) => {
      tones.forEach((tone: ToneOption) => {
        // Filter by category if specified
        if (options.categories && !options.categories.includes(template.category)) {
          return;
        }
        combinations.push({ template, tone });
      });
    });

    // Shuffle and limit
    const shuffled = this.shuffle(combinations);
    const limited = shuffled.slice(0, options.count);

    // Generate replies (mock for now - in production would call API)
    for (const { template, tone } of limited) {
      const reply = this.createMockReply(template, tone);
      generated.push(reply);
      this.addReply(reply);
    }

    console.log(`%c⚔️ Generated ${generated.length} replies`, 'color: #17BF63');
    return generated;
  }

  /**
   * Create a mock reply (placeholder for actual API generation)
   */
  private createMockReply(template: PresetTemplate, tone: ToneOption): ArsenalReply {
    const id = `arsenal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Mock text generation based on template and tone
    const mockTexts = {
      'ask_question:professional': "That's an interesting point. Could you elaborate on how this approach differs from traditional methods?",
      'ask_question:witty': "Fascinating take! Quick question though - is this the innovation we've been waiting for, or just old wine in new bottles? 🍷",
      'agree_expand:enthusiastic': "YES! This is exactly what I've been saying! And to add to your brilliant point - this could revolutionize how we approach the entire industry! 🚀",
      'challenge:contrarian': "Interesting perspective, but have you considered the opposite might be true? The data suggests a completely different conclusion when viewed through a critical lens.",
      'hot_take:savage': "Unpopular opinion: Everyone's overthinking this. The solution is ridiculously simple, we're just too invested in complexity to see it. 🔥",
      'meme_response:gen_z': "no bc this is literally me trying to explain why this matters and everyone's just... not getting it fr fr 💀",
      'default': `${template.prompt} [${tone.label} style]`
    };

    const key = `${template.id}:${tone.id}`;
    const text = mockTexts[key as keyof typeof mockTexts] || mockTexts.default;

    return {
      id,
      templateId: template.id,
      toneId: tone.id,
      text,
      category: template.category,
      tags: [template.category, tone.id, 'pre-generated'],
      usageCount: 0,
      createdAt: new Date(),
      temperature: this.getTemperatureForTone(tone.id),
      isFavorite: false
    };
  }

  /**
   * Add reply to arsenal
   */
  async addReply(reply: ArsenalReply): Promise<void> {
    this.arsenal.set(reply.id, reply);
    
    // Add to category
    const category = this.categories.get(reply.category);
    if (category) {
      category.replies.push(reply);
    }

    // Save to IndexedDB
    if (this.db) {
      const transaction = this.db.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      store.put(reply);
    }
  }

  /**
   * Get reply by ID
   */
  getReply(id: string): ArsenalReply | undefined {
    return this.arsenal.get(id);
  }

  /**
   * Get replies by category
   */
  getRepliesByCategory(categoryId: string): ArsenalReply[] {
    const category = this.categories.get(categoryId);
    return category ? category.replies : [];
  }

  /**
   * Get suggested replies based on context
   */
  getSuggestedReplies(context: {
    text?: string;
    category?: string;
    limit?: number;
  }): ArsenalReply[] {
    let replies = Array.from(this.arsenal.values());

    // Filter by category
    if (context.category) {
      replies = replies.filter(r => r.category === context.category);
    }

    // Sort by relevance (usage count and recency)
    replies.sort((a, b) => {
      // Prioritize favorites
      if (a.isFavorite && !b.isFavorite) return -1;
      if (!a.isFavorite && b.isFavorite) return 1;
      
      // Then by usage count
      if (a.usageCount !== b.usageCount) {
        return b.usageCount - a.usageCount;
      }
      
      // Then by recency
      const aTime = a.lastUsed?.getTime() || 0;
      const bTime = b.lastUsed?.getTime() || 0;
      return bTime - aTime;
    });

    return replies.slice(0, context.limit || 10);
  }

  /**
   * Use a reply (increment usage count)
   */
  async useReply(id: string): Promise<void> {
    const reply = this.arsenal.get(id);
    if (reply) {
      reply.usageCount++;
      reply.lastUsed = new Date();
      
      // Update in database
      if (this.db) {
        const transaction = this.db.transaction([this.STORE_NAME], 'readwrite');
        const store = transaction.objectStore(this.STORE_NAME);
        store.put(reply);
      }
      
      console.log('%c⚔️ Reply used:', 'color: #657786', id);
    }
  }

  /**
   * Toggle favorite status
   */
  async toggleFavorite(id: string): Promise<boolean> {
    const reply = this.arsenal.get(id);
    if (reply) {
      reply.isFavorite = !reply.isFavorite;
      
      // Update in database
      if (this.db) {
        const transaction = this.db.transaction([this.STORE_NAME], 'readwrite');
        const store = transaction.objectStore(this.STORE_NAME);
        store.put(reply);
      }
      
      console.log('%c⚔️ Favorite toggled:', 'color: #FFA500', id, reply.isFavorite);
      return reply.isFavorite;
    }
    return false;
  }

  /**
   * Delete reply from arsenal
   */
  async deleteReply(id: string): Promise<void> {
    const reply = this.arsenal.get(id);
    if (reply) {
      this.arsenal.delete(id);
      
      // Remove from category
      const category = this.categories.get(reply.category);
      if (category) {
        const index = category.replies.findIndex(r => r.id === id);
        if (index > -1) {
          category.replies.splice(index, 1);
        }
      }
      
      // Delete from database
      if (this.db) {
        const transaction = this.db.transaction([this.STORE_NAME], 'readwrite');
        const store = transaction.objectStore(this.STORE_NAME);
        store.delete(id);
      }
      
      console.log('%c⚔️ Reply deleted:', 'color: #DC3545', id);
    }
  }

  /**
   * Load replies from IndexedDB
   */
  private async loadFromDB(): Promise<void> {
    if (!this.db) return;

    const transaction = this.db.transaction([this.STORE_NAME], 'readonly');
    const store = transaction.objectStore(this.STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      const replies = request.result as ArsenalReply[];
      replies.forEach(reply => {
        // Convert date strings back to Date objects
        reply.createdAt = new Date(reply.createdAt);
        if (reply.lastUsed) {
          reply.lastUsed = new Date(reply.lastUsed);
        }
        
        this.arsenal.set(reply.id, reply);
        
        // Add to category
        const category = this.categories.get(reply.category);
        if (category) {
          category.replies.push(reply);
        }
      });
      
      console.log(`%c⚔️ Loaded ${replies.length} replies from database`, 'color: #17BF63');
    };
  }

  /**
   * Clear all replies
   */
  async clearArsenal(): Promise<void> {
    this.arsenal.clear();
    this.categories.forEach(cat => cat.replies = []);
    
    if (this.db) {
      const transaction = this.db.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      store.clear();
    }
    
    console.log('%c⚔️ Arsenal cleared', 'color: #FFA500');
  }

  /**
   * Get arsenal statistics
   */
  getStats(): {
    totalReplies: number;
    byCategory: Record<string, number>;
    favorites: number;
    mostUsed: ArsenalReply | null;
    averageUsage: number;
  } {
    const replies = Array.from(this.arsenal.values());
    const byCategory: Record<string, number> = {};
    
    this.categories.forEach((cat, id) => {
      byCategory[id] = cat.replies.length;
    });
    
    const favorites = replies.filter(r => r.isFavorite).length;
    const mostUsed = replies.reduce((max, r) => 
      !max || r.usageCount > max.usageCount ? r : max, null as ArsenalReply | null
    );
    
    const totalUsage = replies.reduce((sum, r) => sum + r.usageCount, 0);
    const averageUsage = replies.length > 0 ? totalUsage / replies.length : 0;
    
    return {
      totalReplies: replies.length,
      byCategory,
      favorites,
      mostUsed,
      averageUsage
    };
  }

  /**
   * Get temperature for tone
   */
  private getTemperatureForTone(toneId: string): number {
    const temperatureMap: Record<string, number> = {
      'professional': 0.3,
      'witty': 0.7,
      'enthusiastic': 0.6,
      'casual': 0.5,
      'academic': 0.2,
      'sarcastic': 0.8,
      'motivational': 0.6,
      'contrarian': 0.7,
      'gen_z': 0.9,
      'philosophical': 0.5,
      'minimalist': 0.1,
      'savage': 0.9,
      'dismissive': 0.4
    };
    return temperatureMap[toneId] || 0.5;
  }

  /**
   * Shuffle array
   */
  private shuffle<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  /**
   * Export arsenal to JSON
   */
  exportToJSON(): string {
    const data = {
      replies: Array.from(this.arsenal.values()),
      stats: this.getStats(),
      exportedAt: new Date().toISOString()
    };
    
    return JSON.stringify(data, null, 2);
  }

  /**
   * Import arsenal from JSON
   */
  async importFromJSON(json: string): Promise<void> {
    try {
      const data = JSON.parse(json);
      
      if (data.replies && Array.isArray(data.replies)) {
        for (const reply of data.replies) {
          // Validate and add reply
          if (reply.id && reply.templateId && reply.toneId && reply.text) {
            await this.addReply(reply);
          }
        }
        
        console.log(`%c⚔️ Imported ${data.replies.length} replies`, 'color: #17BF63');
      }
    } catch (error) {
      console.error('Failed to import arsenal:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const arsenalService = new ArsenalService();