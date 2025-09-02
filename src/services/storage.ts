import { AppConfig, DEFAULT_CONFIG } from '@/types';
import { EncryptionService } from '@/utils/encryption';

const STORAGE_KEYS = {
  CONFIG: 'smartReply_config',
  API_KEY: 'smartReply_apiKey',
  LAST_TONE: 'smartReply_lastTone'
} as const;

export class StorageService {
  static async getConfig(): Promise<Partial<AppConfig>> {
    try {
      const result = await chrome.storage.sync.get(STORAGE_KEYS.CONFIG);
      return { ...DEFAULT_CONFIG, ...result[STORAGE_KEYS.CONFIG] };
    } catch (error) {
      console.error('Failed to get config from storage:', error);
      return DEFAULT_CONFIG;
    }
  }

  static async setConfig(config: Partial<AppConfig>): Promise<void> {
    try {
      await chrome.storage.sync.set({
        [STORAGE_KEYS.CONFIG]: config
      });
    } catch (error) {
      console.error('Failed to save config to storage:', error);
      throw error;
    }
  }

  static async getApiKey(): Promise<string | undefined> {
    try {
      const result = await chrome.storage.local.get(STORAGE_KEYS.API_KEY);
      const storedValue = result[STORAGE_KEYS.API_KEY];
      
      if (!storedValue) {
        return undefined;
      }
      
      // Check if it's encrypted (has the encrypted prefix)
      if (storedValue.startsWith('enc_')) {
        // It's already encrypted, decrypt it
        const decrypted = await EncryptionService.decryptApiKey(storedValue);
        console.log('%c🔓 API Key Decrypted', 'color: #17BF63', { 
          stored: storedValue.substring(0, 20) + '...', 
          decrypted: decrypted ? 'success' : 'failed' 
        });
        return decrypted;
      } else {
        // Legacy plain text API key - encrypt it for future use
        console.log('%c🔐 Encrypting legacy API key', 'color: #FFA500');
        const encrypted = await EncryptionService.encryptApiKey(storedValue);
        await chrome.storage.local.set({
          [STORAGE_KEYS.API_KEY]: encrypted
        });
        return storedValue;
      }
    } catch (error) {
      console.error('Failed to get API key from storage:', error);
      return undefined;
    }
  }

  static async setApiKey(apiKey: string): Promise<void> {
    try {
      // Always encrypt API keys before storing
      const encrypted = await EncryptionService.encryptApiKey(apiKey);
      await chrome.storage.local.set({
        [STORAGE_KEYS.API_KEY]: encrypted
      });
    } catch (error) {
      console.error('Failed to save API key to storage:', error);
      throw error;
    }
  }

  static async clearApiKey(): Promise<void> {
    try {
      await chrome.storage.local.remove(STORAGE_KEYS.API_KEY);
    } catch (error) {
      console.error('Failed to clear API key from storage:', error);
      throw error;
    }
  }

  static async clearAllData(): Promise<void> {
    try {
      await chrome.storage.local.clear();
      await chrome.storage.sync.clear();
      await chrome.storage.session.clear();
    } catch (error) {
      console.error('Failed to clear all data:', error);
      throw error;
    }
  }

  static async getLastTone(): Promise<string | undefined> {
    try {
      const result = await chrome.storage.session.get(STORAGE_KEYS.LAST_TONE);
      return result[STORAGE_KEYS.LAST_TONE];
    } catch (error) {
      console.error('Failed to get last tone from session storage:', error);
      return undefined;
    }
  }

  static async setLastTone(tone: string): Promise<void> {
    try {
      await chrome.storage.session.set({
        [STORAGE_KEYS.LAST_TONE]: tone
      });
      console.log('Smart Reply: Saved last used tone:', tone);
    } catch (error) {
      console.error('Failed to save last tone to session storage:', error);
    }
  }
}