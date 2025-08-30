/**
 * Custom Reply Templates for TweetCraft v0.0.9
 * Allows users to create, save, and manage custom reply templates with variables
 */

import { StorageService } from '@/services/storage';
import { PresetTemplate } from './presetTemplates';

export interface CustomTemplate extends PresetTemplate {
  isCustom: true;
  pattern?: string; // The actual template pattern with variables
  variables?: string[]; // Variable names that can be filled in
  exampleOutput?: string; // Example of what the template produces
  createdAt: number;
  usageCount: number;
}

export interface TemplateVariable {
  name: string;
  description: string;
  defaultValue?: string;
  required?: boolean;
}

export class CustomTemplateManager {
  private static customTemplates: Map<string, CustomTemplate> = new Map();
  private static isInitialized = false;
  
  /**
   * Built-in template patterns users can customize
   */
  static readonly TEMPLATE_PATTERNS = {
    THANKS_SHARE: "Thanks for sharing! {comment}",
    AGREE_BUT: "I agree with {point}, but {counterpoint}",
    CURIOUS_ABOUT: "Curious about {topic} - {question}?",
    REMINDS_ME: "This reminds me of {comparison}. {elaboration}",
    INTERESTING_BECAUSE: "This is interesting because {reason}. Have you considered {alternative}?",
    APPRECIATE_PERSPECTIVE: "I appreciate your perspective on {topic}. {addition}",
    GREAT_POINT: "Great point about {subject}! {followup}",
    LEARNED_SOMETHING: "I learned something new about {topic} from this. {reflection}",
    SIMILAR_EXPERIENCE: "Had a similar experience with {situation}. {outcome}",
    LOVE_APPROACH: "Love your approach to {topic}! How do you handle {challenge}?"
  };
  
  /**
   * Common variables that can be used in templates
   */
  static readonly COMMON_VARIABLES: TemplateVariable[] = [
    { name: 'topic', description: 'The main topic being discussed' },
    { name: 'point', description: 'A specific point from the tweet' },
    { name: 'question', description: 'A follow-up question' },
    { name: 'comment', description: 'Your additional comment' },
    { name: 'example', description: 'A relevant example' },
    { name: 'reason', description: 'A reason or explanation' },
    { name: 'suggestion', description: 'A helpful suggestion' },
    { name: 'perspective', description: 'Your perspective on the topic' },
    { name: 'experience', description: 'Personal experience or anecdote' },
    { name: 'resource', description: 'A helpful resource or link' }
  ];
  
  /**
   * Initialize the custom template manager
   */
  static async init(): Promise<void> {
    if (this.isInitialized) return;
    
    console.log('%c📝 Custom Templates: Initializing', 'color: #9146FF; font-weight: bold');
    
    // Load saved custom templates
    await this.loadCustomTemplates();
    
    // If no custom templates exist, create some defaults
    if (this.customTemplates.size === 0) {
      await this.createDefaultCustomTemplates();
    }
    
    this.isInitialized = true;
    console.log(`%c  Loaded ${this.customTemplates.size} custom templates`, 'color: #657786');
  }
  
  /**
   * Load custom templates from storage
   */
  private static async loadCustomTemplates(): Promise<void> {
    try {
      const stored = await chrome.storage.local.get('customTemplates');
      if (stored.customTemplates) {
        const templates = JSON.parse(stored.customTemplates) as CustomTemplate[];
        templates.forEach(template => {
          this.customTemplates.set(template.id, template);
        });
      }
    } catch (error) {
      console.error('Failed to load custom templates:', error);
    }
  }
  
  /**
   * Save custom templates to storage
   */
  private static async saveCustomTemplates(): Promise<void> {
    try {
      const templates = Array.from(this.customTemplates.values());
      await chrome.storage.local.set({ 
        customTemplates: JSON.stringify(templates) 
      });
    } catch (error) {
      console.error('Failed to save custom templates:', error);
    }
  }
  
  /**
   * Create default custom templates for first-time users
   */
  private static async createDefaultCustomTemplates(): Promise<void> {
    const defaults: Partial<CustomTemplate>[] = [
      {
        id: 'custom_thanks_insight',
        name: 'Thank & Add Insight',
        emoji: '🙏',
        prompt: 'Thank them and add your own insight using template: ' + this.TEMPLATE_PATTERNS.THANKS_SHARE,
        pattern: this.TEMPLATE_PATTERNS.THANKS_SHARE,
        variables: ['comment'],
        description: 'Express gratitude and add value',
        category: 'engagement',
        exampleOutput: 'Thanks for sharing! This really highlights the importance of user feedback in product development.'
      },
      {
        id: 'custom_agree_but',
        name: 'Agree with Nuance',
        emoji: '🤔',
        prompt: 'Agree but add nuance using template: ' + this.TEMPLATE_PATTERNS.AGREE_BUT,
        pattern: this.TEMPLATE_PATTERNS.AGREE_BUT,
        variables: ['point', 'counterpoint'],
        description: 'Agree while adding perspective',
        category: 'engagement',
        exampleOutput: 'I agree with your point about automation, but we should also consider the human element in the process.'
      },
      {
        id: 'custom_curious',
        name: 'Express Curiosity',
        emoji: '🔍',
        prompt: 'Show curiosity using template: ' + this.TEMPLATE_PATTERNS.CURIOUS_ABOUT,
        pattern: this.TEMPLATE_PATTERNS.CURIOUS_ABOUT,
        variables: ['topic', 'question'],
        description: 'Ask an engaging question',
        category: 'engagement',
        exampleOutput: 'Curious about your testing methodology - do you use automated tests or manual QA?'
      }
    ];
    
    for (const template of defaults) {
      await this.createTemplate(template as CustomTemplate);
    }
  }
  
  /**
   * Create a new custom template
   */
  static async createTemplate(template: Partial<CustomTemplate>): Promise<CustomTemplate> {
    const newTemplate: CustomTemplate = {
      id: template.id || `custom_${Date.now()}`,
      name: template.name || 'Untitled Template',
      emoji: template.emoji || '📝',
      prompt: template.prompt || '',
      pattern: template.pattern,
      variables: template.variables || [],
      description: template.description || '',
      category: template.category || 'engagement',
      isCustom: true,
      createdAt: Date.now(),
      usageCount: 0,
      exampleOutput: template.exampleOutput,
      ...template
    };
    
    this.customTemplates.set(newTemplate.id, newTemplate);
    await this.saveCustomTemplates();
    
    console.log('%c📝 Created custom template:', 'color: #17BF63', newTemplate.name);
    return newTemplate;
  }
  
  /**
   * Update an existing template
   */
  static async updateTemplate(id: string, updates: Partial<CustomTemplate>): Promise<void> {
    const template = this.customTemplates.get(id);
    if (!template) {
      throw new Error(`Template ${id} not found`);
    }
    
    const updated = { ...template, ...updates };
    this.customTemplates.set(id, updated);
    await this.saveCustomTemplates();
    
    console.log('%c✏️ Updated template:', 'color: #1DA1F2', updated.name);
  }
  
  /**
   * Delete a custom template
   */
  static async deleteTemplate(id: string): Promise<void> {
    const template = this.customTemplates.get(id);
    if (!template) {
      throw new Error(`Template ${id} not found`);
    }
    
    this.customTemplates.delete(id);
    await this.saveCustomTemplates();
    
    console.log('%c🗑️ Deleted template:', 'color: #DC3545', template.name);
  }
  
  /**
   * Get all custom templates
   */
  static getTemplates(): CustomTemplate[] {
    return Array.from(this.customTemplates.values())
      .sort((a, b) => b.usageCount - a.usageCount); // Sort by usage
  }
  
  /**
   * Get a specific template
   */
  static getTemplate(id: string): CustomTemplate | undefined {
    return this.customTemplates.get(id);
  }
  
  /**
   * Track template usage
   */
  static async trackUsage(id: string): Promise<void> {
    const template = this.customTemplates.get(id);
    if (template) {
      template.usageCount++;
      await this.saveCustomTemplates();
    }
  }
  
  /**
   * Process template with variables
   */
  static processTemplate(template: CustomTemplate, values: Record<string, string>): string {
    if (!template.pattern) {
      return template.prompt;
    }
    
    let processed = template.pattern;
    
    // Replace variables with provided values
    for (const [key, value] of Object.entries(values)) {
      const regex = new RegExp(`\\{${key}\\}`, 'g');
      processed = processed.replace(regex, value);
    }
    
    // Remove any unfilled variables
    processed = processed.replace(/\{[^}]+\}/g, '');
    
    return processed;
  }
  
  /**
   * Export templates as JSON
   */
  static exportTemplates(): string {
    const templates = Array.from(this.customTemplates.values());
    return JSON.stringify(templates, null, 2);
  }
  
  /**
   * Import templates from JSON
   */
  static async importTemplates(json: string): Promise<number> {
    try {
      const templates = JSON.parse(json) as CustomTemplate[];
      let imported = 0;
      
      for (const template of templates) {
        if (!this.customTemplates.has(template.id)) {
          await this.createTemplate(template);
          imported++;
        }
      }
      
      return imported;
    } catch (error) {
      console.error('Failed to import templates:', error);
      throw new Error('Invalid template JSON');
    }
  }
}