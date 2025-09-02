/**
 * Encryption utilities for sensitive data
 * Uses Web Crypto API for secure encryption
 */

import { logger } from '@/utils/logger';

interface MigrationLock {
  lockId: string;
  timestamp: number;
  holder: string;
}

export class EncryptionService {
  private static readonly ALGORITHM = 'AES-GCM';
  private static readonly KEY_LENGTH = 256;
  private static readonly SALT_LENGTH = 16; // 16 bytes for salt
  
  // Migration lock configuration
  private static readonly MIGRATION_LOCK_KEY = 'tweetcraft_migration_lock';
  private static readonly LOCK_TIMEOUT_MS = 5000; // 5 seconds max lock hold time
  private static readonly LOCK_RETRY_DELAY_MS = 100; // Initial retry delay
  private static readonly LOCK_MAX_RETRIES = 30; // Max 3 seconds of retrying
  private static readonly LOCK_BACKOFF_MULTIPLIER = 1.2; // Exponential backoff
  
  // In-memory migration status to prevent duplicate work within same runtime
  private static migrationInProgress = new Map<string, Promise<string>>();
  
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
      logger.error('Encryption failed:', error);
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
      logger.error('Decryption failed:', error);
      throw new Error('Failed to decrypt data');
    }
  }
  
  /**
   * Acquire a migration lock with timeout and retry logic
   */
  private static async acquireMigrationLock(lockKey: string): Promise<string | null> {
    const lockId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const holder = `${chrome.runtime.id}_${lockId}`;
    let retries = 0;
    let delay = this.LOCK_RETRY_DELAY_MS;
    
    while (retries < this.LOCK_MAX_RETRIES) {
      try {
        // Check existing lock
        const result = await chrome.storage.local.get(lockKey);
        const existingLock = result[lockKey] as MigrationLock | undefined;
        
        // Check if existing lock is expired or doesn't exist
        const now = Date.now();
        if (!existingLock || (now - existingLock.timestamp) > this.LOCK_TIMEOUT_MS) {
          // Try to acquire lock
          const newLock: MigrationLock = {
            lockId,
            timestamp: now,
            holder
          };
          
          // Atomic set with a check
          await chrome.storage.local.set({ [lockKey]: newLock });
          
          // Double-check we got the lock (handle race condition)
          const verification = await chrome.storage.local.get(lockKey);
          const verifiedLock = verification[lockKey] as MigrationLock;
          
          if (verifiedLock && verifiedLock.holder === holder) {
            logger.log(`Migration lock acquired: ${lockId}`);
            return lockId;
          }
        }
        
        // Lock is held by someone else, wait and retry
        retries++;
        if (retries < this.LOCK_MAX_RETRIES) {
          await new Promise(resolve => setTimeout(resolve, delay));
          delay = Math.min(delay * this.LOCK_BACKOFF_MULTIPLIER, 500); // Cap at 500ms
        }
      } catch (error) {
        logger.error('Error acquiring migration lock:', error);
        retries++;
      }
    }
    
    logger.warn('Failed to acquire migration lock after retries');
    return null;
  }
  
  /**
   * Release a migration lock
   */
  private static async releaseMigrationLock(lockKey: string, lockId: string): Promise<void> {
    try {
      const result = await chrome.storage.local.get(lockKey);
      const existingLock = result[lockKey] as MigrationLock | undefined;
      
      // Only release if we own the lock
      if (existingLock && existingLock.lockId === lockId) {
        await chrome.storage.local.remove(lockKey);
        logger.log(`Migration lock released: ${lockId}`);
      }
    } catch (error) {
      logger.error('Error releasing migration lock:', error);
    }
  }
  
  /**
   * Clean up expired migration locks (safety mechanism)
   * Call this periodically or on extension startup
   */
  static async cleanupExpiredLocks(): Promise<void> {
    try {
      const storage = await chrome.storage.local.get();
      const now = Date.now();
      const keysToRemove: string[] = [];
      
      // Find all migration lock keys
      for (const key in storage) {
        if (key.startsWith(this.MIGRATION_LOCK_KEY)) {
          const lock = storage[key] as MigrationLock;
          if (lock && (now - lock.timestamp) > this.LOCK_TIMEOUT_MS) {
            keysToRemove.push(key);
            logger.log(`Cleaning up expired migration lock: ${lock.lockId}`);
          }
        }
      }
      
      // Remove expired locks
      if (keysToRemove.length > 0) {
        await chrome.storage.local.remove(keysToRemove);
        logger.log(`Cleaned up ${keysToRemove.length} expired migration locks`);
      }
    } catch (error) {
      logger.error('Error cleaning up expired locks:', error);
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
   * Perform the actual migration of a legacy encrypted key
   */
  private static async performLegacyMigration(
    ciphertext: string, 
    iv: string, 
    storageKey: string
  ): Promise<string> {
    const migrationKey = `${storageKey}_migration`;
    
    // Check if there's already a migration in progress for this key
    const existingMigration = this.migrationInProgress.get(migrationKey);
    if (existingMigration) {
      logger.log('Migration already in progress, waiting for completion...');
      return existingMigration;
    }
    
    // Create migration promise
    const migrationPromise = (async () => {
      const lockKey = `${this.MIGRATION_LOCK_KEY}_${storageKey}`;
      let lockId: string | null = null;
      
      try {
        // Attempt to acquire migration lock
        lockId = await this.acquireMigrationLock(lockKey);
        
        if (!lockId) {
          // Could not acquire lock after timeout, check if migration was completed
          logger.warn('Could not acquire migration lock, checking if migration was completed...');
          const recheckStored = await chrome.storage.local.get([`${storageKey}_encrypted`]);
          const recheckedData = recheckStored[`${storageKey}_encrypted`];
          
          if (recheckedData && recheckedData.salt) {
            // Migration was completed by another process
            logger.log('Migration was completed by another process');
            return await this.decrypt(recheckedData.ciphertext, recheckedData.iv, recheckedData.salt);
          }
          
          // Fall back to reading with legacy salt (non-fatal path)
          logger.warn('Falling back to legacy decryption without migration');
          const legacySalt = btoa('tweetcraft-v1-salt');
          return await this.decrypt(ciphertext, iv, legacySalt);
        }
        
        // Lock acquired, double-check if migration is still needed
        const doubleCheckStored = await chrome.storage.local.get([`${storageKey}_encrypted`]);
        const currentData = doubleCheckStored[`${storageKey}_encrypted`];
        
        if (currentData && currentData.salt) {
          // Migration was already completed
          logger.log('Migration already completed, using new format');
          return await this.decrypt(currentData.ciphertext, currentData.iv, currentData.salt);
        }
        
        // Perform the actual migration
        logger.log('Performing legacy key migration with lock protection...');
        const legacySalt = btoa('tweetcraft-v1-salt');
        const decryptedKey = await this.decrypt(ciphertext, iv, legacySalt);
        
        // Re-encrypt with new random salt
        await this.storeApiKey(decryptedKey, storageKey);
        logger.log('Successfully migrated API key to secure encryption format');
        
        return decryptedKey;
      } finally {
        // Always release the lock if we acquired it
        if (lockId) {
          await this.releaseMigrationLock(lockKey, lockId);
        }
        
        // Clean up in-memory migration tracking
        this.migrationInProgress.delete(migrationKey);
      }
    })();
    
    // Store the migration promise to prevent duplicate work
    this.migrationInProgress.set(migrationKey, migrationPromise);
    
    return migrationPromise;
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
          // Modern format with salt
          return await this.decrypt(ciphertext, iv, salt);
        } else {
          // Legacy format - needs migration with lock protection
          logger.warn('Legacy encryption format detected, initiating secure migration...');
          return await this.performLegacyMigration(ciphertext, iv, storageKey);
        }
      }
      
      // Fall back to unencrypted (legacy)
      if (stored[storageKey]) {
        logger.log('Found unencrypted API key, migrating to encrypted storage...');
        
        // Use simpler lock for unencrypted migration
        const lockKey = `${this.MIGRATION_LOCK_KEY}_unencrypted_${storageKey}`;
        const lockId = await this.acquireMigrationLock(lockKey);
        
        try {
          // Double-check the key is still unencrypted
          const recheck = await chrome.storage.local.get([`${storageKey}_encrypted`, storageKey]);
          
          if (recheck[`${storageKey}_encrypted`]) {
            // Migration was completed by another process
            const { ciphertext, iv, salt } = recheck[`${storageKey}_encrypted`];
            return salt 
              ? await this.decrypt(ciphertext, iv, salt)
              : await this.performLegacyMigration(ciphertext, iv, storageKey);
          }
          
          if (recheck[storageKey]) {
            // Migrate to encrypted storage
            await this.storeApiKey(recheck[storageKey], storageKey);
            // Remove unencrypted version
            await chrome.storage.local.remove([storageKey]);
            return recheck[storageKey];
          }
        } finally {
          if (lockId) {
            await this.releaseMigrationLock(lockKey, lockId);
          }
        }
      }
      
      return null;
    } catch (error) {
      logger.error('Failed to retrieve API key:', error);
      return null;
    }
  }
}