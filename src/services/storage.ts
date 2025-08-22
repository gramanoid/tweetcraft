import { AppConfig, DEFAULT_CONFIG } from '@/types';

const STORAGE_KEYS = {
  CONFIG: 'smartReply_config',
  API_KEY: 'smartReply_apiKey'
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
      return result[STORAGE_KEYS.API_KEY];
    } catch (error) {
      console.error('Failed to get API key from storage:', error);
      return undefined;
    }
  }

  static async setApiKey(apiKey: string): Promise<void> {
    try {
      await chrome.storage.local.set({
        [STORAGE_KEYS.API_KEY]: apiKey
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
    } catch (error) {
      console.error('Failed to clear all data:', error);
      throw error;
    }
  }
}