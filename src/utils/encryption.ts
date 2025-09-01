/**
 * Encryption utilities for sensitive data
 * Uses Web Crypto API for secure encryption
 */

export class EncryptionService {
  private static readonly ALGORITHM = 'AES-GCM';
  private static readonly KEY_LENGTH = 256;
  private static readonly SALT_LENGTH = 16; // 16 bytes for salt
  
  /**
   * Derive a key from a passphrase with a unique salt
   */
  private static async deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(passphrase),
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    );
    
    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt.buffer as ArrayBuffer,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: this.ALGORITHM, length: this.KEY_LENGTH },
      false,
      ['encrypt', 'decrypt']
    );
  }
  
  /**
   * Encrypt a string
   */
  static async encrypt(text: string, passphrase?: string): Promise<{ ciphertext: string; iv: string; salt: string }> {
    try {
      // Use extension ID as passphrase if not provided
      const finalPassphrase = passphrase || chrome.runtime.id;
      
      // Generate random salt for this encryption
      const salt = crypto.getRandomValues(new Uint8Array(this.SALT_LENGTH));
      const key = await this.deriveKey(finalPassphrase, salt);
      
      const encoder = new TextEncoder();
      const data = encoder.encode(text);
      
      // Generate random IV
      const iv = crypto.getRandomValues(new Uint8Array(12));
      
      // Encrypt
      const encrypted = await crypto.subtle.encrypt(
        {
          name: this.ALGORITHM,
          iv: iv
        },
        key,
        data
      );
      
      // Convert to base64 for storage
      const ciphertext = btoa(String.fromCharCode(...new Uint8Array(encrypted)));
      const ivBase64 = btoa(String.fromCharCode(...iv));
      const saltBase64 = btoa(String.fromCharCode(...salt));
      
      return { ciphertext, iv: ivBase64, salt: saltBase64 };
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Failed to encrypt data');
    }
  }
  
  /**
   * Decrypt a string
   */
  static async decrypt(ciphertext: string, iv: string, salt: string, passphrase?: string): Promise<string> {
    try {
      // Use extension ID as passphrase if not provided
      const finalPassphrase = passphrase || chrome.runtime.id;
      
      // Convert salt from base64
      const saltArray = Uint8Array.from(atob(salt), c => c.charCodeAt(0));
      const key = await this.deriveKey(finalPassphrase, saltArray);
      
      // Convert from base64
      const encryptedData = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0));
      const ivArray = Uint8Array.from(atob(iv), c => c.charCodeAt(0));
      
      // Decrypt
      const decrypted = await crypto.subtle.decrypt(
        {
          name: this.ALGORITHM,
          iv: ivArray
        },
        key,
        encryptedData
      );
      
      const decoder = new TextDecoder();
      return decoder.decode(decrypted);
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('Failed to decrypt data');
    }
  }
  
  /**
   * Store encrypted API key
   */
  static async storeApiKey(key: string, storageKey: string = 'openrouter_apiKey'): Promise<void> {
    const encrypted = await this.encrypt(key);
    await chrome.storage.local.set({
      [`${storageKey}_encrypted`]: encrypted
    });
  }
  
  /**
   * Retrieve and decrypt API key
   */
  static async getApiKey(storageKey: string = 'openrouter_apiKey'): Promise<string | null> {
    try {
      const stored = await chrome.storage.local.get([`${storageKey}_encrypted`, storageKey]);
      
      // Try encrypted version first
      if (stored[`${storageKey}_encrypted`]) {
        const { ciphertext, iv, salt } = stored[`${storageKey}_encrypted`];
        // Handle both new (with salt) and legacy (without salt) formats
        if (salt) {
          return await this.decrypt(ciphertext, iv, salt);
        } else {
          // Legacy format - migrate on next save
          console.warn('Legacy encryption format detected, will migrate on next save');
          // For legacy, use a fixed salt derived from the storage key
          const legacySalt = btoa('tweetcraft-v1-salt');
          return await this.decrypt(ciphertext, iv, legacySalt);
        }
      }
      
      // Fall back to unencrypted (legacy)
      if (stored[storageKey]) {
        // Migrate to encrypted storage
        await this.storeApiKey(stored[storageKey], storageKey);
        // Remove unencrypted version
        await chrome.storage.local.remove([storageKey]);
        return stored[storageKey];
      }
      
      return null;
    } catch (error) {
      console.error('Failed to retrieve API key:', error);
      return null;
    }
  }
}