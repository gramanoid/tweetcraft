/**
 * Jest setup file
 * Configures test environment and global mocks
 */

import '@testing-library/jest-dom';

// Mock Chrome API
global.chrome = {
  runtime: {
    id: 'test-extension-id',
    sendMessage: jest.fn(),
    onMessage: {
      addListener: jest.fn(),
      removeListener: jest.fn()
    },
    getManifest: jest.fn(() => ({
      version: '0.0.12',
      name: 'TweetCraft'
    }))
  },
  storage: {
    local: {
      get: jest.fn((keys, callback) => {
        if (callback) callback({});
        return Promise.resolve({});
      }),
      set: jest.fn((items, callback) => {
        if (callback) callback();
        return Promise.resolve();
      }),
      remove: jest.fn((keys, callback) => {
        if (callback) callback();
        return Promise.resolve();
      })
    }
  }
} as any;

// Mock fetch
global.fetch = jest.fn();

// Mock crypto for encryption tests
Object.defineProperty(global, 'crypto', {
  value: {
    subtle: {
      encrypt: jest.fn(),
      decrypt: jest.fn(),
      importKey: jest.fn(),
      deriveKey: jest.fn(),
      deriveBits: jest.fn()
    },
    getRandomValues: jest.fn((arr) => {
      // Fill with mock random values for testing
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    })
  }
});

// Mock IndexedDB
const indexedDB = {
  open: jest.fn()
};
global.indexedDB = indexedDB as any;