/**
 * Custom Combos Service - Task 5.2
 * Save and manage custom personality/vocabulary/rhetoric combinations
 */

import { MessageType } from '@/types/messages';

export interface CustomCombo {
  id: string;
  name: string;
  personality: string;
  vocabulary: string;
  rhetoric: string;
  lengthPacing: string;
  createdAt: number;
  usageCount: number;
  lastUsed: number;
}

class CustomCombosService {
  private readonly STORAGE_KEY = 'tweetcraft-custom-combos';
  private combos: CustomCombo[] = [];
  private isInitialized = false;

  async init(): Promise<void> {
    if (this.isInitialized) return;
    
    console.log('%c💫 Initializing Custom Combos Service', 'color: #9146FF; font-weight: bold');
    
    try {
      await this.loadCombos();
      this.isInitialized = true;
      console.log('%c✅ Custom Combos Service initialized', 'color: #17BF63', `${this.combos.length} combos loaded`);
    } catch (error) {
      console.error('Failed to initialize Custom Combos Service:', error);
    }
  }

  private async loadCombos(): Promise<void> {
    try {
      const response = await chrome.runtime.sendMessage({
        type: MessageType.GET_STORAGE,
        keys: [this.STORAGE_KEY]
      });

      if (response?.success && response.data?.[this.STORAGE_KEY]) {
        this.combos = response.data[this.STORAGE_KEY];
        console.log('%c📦 Loaded custom combos:', 'color: #657786', this.combos.length);
      } else {
        this.combos = [];
        console.log('%c📦 No custom combos found, starting with empty list', 'color: #657786');
      }
    } catch (error) {
      console.error('Failed to load custom combos:', error);
      this.combos = [];
    }
  }

  private async saveCombos(): Promise<void> {
    try {
      await chrome.runtime.sendMessage({
        type: MessageType.SET_STORAGE,
        data: {
          [this.STORAGE_KEY]: this.combos
        }
      });
      console.log('%c💾 Custom combos saved', 'color: #17BF63');
    } catch (error) {
      console.error('Failed to save custom combos:', error);
      throw error;
    }
  }

  async saveCombo(combo: Omit<CustomCombo, 'id' | 'createdAt' | 'usageCount' | 'lastUsed'>): Promise<CustomCombo> {
    await this.init();
    
    // Generate unique ID
    const id = `combo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Check if combo with same name already exists
    const existingCombo = this.combos.find(c => c.name.toLowerCase() === combo.name.toLowerCase());
    if (existingCombo) {
      throw new Error(`Combo with name "${combo.name}" already exists`);
    }

    const newCombo: CustomCombo = {
      ...combo,
      id,
      createdAt: Date.now(),
      usageCount: 0,
      lastUsed: 0
    };

    this.combos.push(newCombo);
    await this.saveCombos();

    console.log('%c💫 Custom combo saved:', 'color: #9146FF; font-weight: bold', combo.name);
    return newCombo;
  }

  async deleteCombo(id: string): Promise<boolean> {
    await this.init();
    
    const initialLength = this.combos.length;
    this.combos = this.combos.filter(combo => combo.id !== id);
    
    if (this.combos.length === initialLength) {
      return false; // Combo not found
    }

    await this.saveCombos();
    console.log('%c🗑️ Custom combo deleted:', 'color: #DC3545', id);
    return true;
  }

  async updateCombo(id: string, updates: Partial<Omit<CustomCombo, 'id' | 'createdAt'>>): Promise<CustomCombo | null> {
    await this.init();
    
    const comboIndex = this.combos.findIndex(combo => combo.id === id);
    if (comboIndex === -1) {
      return null; // Combo not found
    }

    // Check name conflict if name is being updated
    if (updates.name) {
      const existingCombo = this.combos.find(c => 
        c.id !== id && c.name.toLowerCase() === updates.name!.toLowerCase()
      );
      if (existingCombo) {
        throw new Error(`Combo with name "${updates.name}" already exists`);
      }
    }

    this.combos[comboIndex] = {
      ...this.combos[comboIndex],
      ...updates
    };

    await this.saveCombos();
    console.log('%c📝 Custom combo updated:', 'color: #E1AD01', this.combos[comboIndex].name);
    return this.combos[comboIndex];
  }

  async incrementUsage(id: string): Promise<void> {
    await this.init();
    
    const combo = this.combos.find(c => c.id === id);
    if (combo) {
      combo.usageCount++;
      combo.lastUsed = Date.now();
      await this.saveCombos();
    }
  }

  async getAllCombos(): Promise<CustomCombo[]> {
    await this.init();
    
    // Sort by usage count (most used first), then by name
    return [...this.combos].sort((a, b) => {
      if (a.usageCount === b.usageCount) {
        return a.name.localeCompare(b.name);
      }
      return b.usageCount - a.usageCount;
    });
  }

  async getCombo(id: string): Promise<CustomCombo | null> {
    await this.init();
    return this.combos.find(combo => combo.id === id) || null;
  }

  async searchCombos(query: string): Promise<CustomCombo[]> {
    await this.init();
    
    const lowercaseQuery = query.toLowerCase();
    return this.combos.filter(combo =>
      combo.name.toLowerCase().includes(lowercaseQuery) ||
      combo.personality.toLowerCase().includes(lowercaseQuery) ||
      combo.vocabulary.toLowerCase().includes(lowercaseQuery) ||
      combo.rhetoric.toLowerCase().includes(lowercaseQuery)
    ).sort((a, b) => b.usageCount - a.usageCount);
  }

  async getPopularCombos(limit: number = 5): Promise<CustomCombo[]> {
    const allCombos = await this.getAllCombos();
    return allCombos.filter(combo => combo.usageCount > 0).slice(0, limit);
  }

  async getRecentCombos(limit: number = 5): Promise<CustomCombo[]> {
    await this.init();
    
    return [...this.combos]
      .filter(combo => combo.lastUsed > 0)
      .sort((a, b) => b.lastUsed - a.lastUsed)
      .slice(0, limit);
  }

  // Helper method to create combo from current settings
  createComboFromSettings(settings: {
    personality: string;
    vocabulary: string;
    rhetoric: string;
    lengthPacing: string;
  }, name: string): Omit<CustomCombo, 'id' | 'createdAt' | 'usageCount' | 'lastUsed'> {
    return {
      name,
      personality: settings.personality,
      vocabulary: settings.vocabulary,
      rhetoric: settings.rhetoric,
      lengthPacing: settings.lengthPacing
    };
  }

  // Validate combo configuration
  validateCombo(combo: Partial<CustomCombo>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!combo.name || combo.name.trim().length < 1) {
      errors.push('Combo name is required');
    }
    
    if (combo.name && combo.name.length > 50) {
      errors.push('Combo name must be 50 characters or less');
    }
    
    if (!combo.personality) {
      errors.push('Personality is required');
    }
    
    if (!combo.vocabulary) {
      errors.push('Vocabulary is required');
    }
    
    if (!combo.rhetoric) {
      errors.push('Rhetoric style is required');
    }
    
    if (!combo.lengthPacing) {
      errors.push('Length/Pacing is required');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Export combos for backup
  async exportCombos(): Promise<string> {
    const allCombos = await this.getAllCombos();
    return JSON.stringify({
      version: '1.0',
      exportedAt: new Date().toISOString(),
      combos: allCombos
    }, null, 2);
  }

  // Import combos from backup
  async importCombos(jsonData: string): Promise<{ imported: number; skipped: number; errors: string[] }> {
    await this.init();
    
    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];
    
    try {
      const data = JSON.parse(jsonData);
      
      if (!data.combos || !Array.isArray(data.combos)) {
        throw new Error('Invalid backup format: missing combos array');
      }
      
      for (const comboData of data.combos) {
        try {
          const validation = this.validateCombo(comboData);
          if (!validation.valid) {
            errors.push(`Invalid combo "${comboData.name}": ${validation.errors.join(', ')}`);
            skipped++;
            continue;
          }
          
          // Check if combo already exists
          const exists = this.combos.some(c => 
            c.name.toLowerCase() === comboData.name.toLowerCase()
          );
          
          if (exists) {
            skipped++;
            continue;
          }
          
          // Import the combo
          const newCombo: CustomCombo = {
            id: `combo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: comboData.name,
            personality: comboData.personality,
            vocabulary: comboData.vocabulary,
            rhetoric: comboData.rhetoric,
            lengthPacing: comboData.lengthPacing,
            createdAt: Date.now(),
            usageCount: comboData.usageCount || 0,
            lastUsed: comboData.lastUsed || 0
          };
          
          this.combos.push(newCombo);
          imported++;
          
        } catch (error) {
          errors.push(`Failed to import combo "${comboData.name}": ${error instanceof Error ? error.message : 'Unknown error'}`);
          skipped++;
        }
      }
      
      if (imported > 0) {
        await this.saveCombos();
      }
      
    } catch (error) {
      errors.push(`Failed to parse backup data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    console.log(`%c📥 Import complete: ${imported} imported, ${skipped} skipped`, 'color: #17BF63');
    
    return { imported, skipped, errors };
  }
}

// Export singleton instance
export const customCombos = new CustomCombosService();