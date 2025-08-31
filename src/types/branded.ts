/**
 * Branded Types for TweetCraft
 * Type-safe identifiers and values
 */

// Branded type helper
type Brand<K, T> = K & { __brand: T };

// ID Types
export type TemplateId = Brand<string, 'TemplateId'>;
export type ToneId = Brand<string, 'ToneId'>;
export type UserId = Brand<string, 'UserId'>;
export type TweetId = Brand<string, 'TweetId'>;
export type SessionId = Brand<string, 'SessionId'>;
export type ArsenalReplyId = Brand<string, 'ArsenalReplyId'>;

// Value Types
export type Temperature = Brand<number, 'Temperature'>;
export type Intensity = Brand<number, 'Intensity'>;
export type Percentage = Brand<number, 'Percentage'>;
export type Timestamp = Brand<number, 'Timestamp'>;
export type CharCount = Brand<number, 'CharCount'>;

// URL Types
export type ApiUrl = Brand<string, 'ApiUrl'>;
export type ImageUrl = Brand<string, 'ImageUrl'>;
export type TweetUrl = Brand<string, 'TweetUrl'>;

// Content Types
export type TweetText = Brand<string, 'TweetText'>;
export type PromptText = Brand<string, 'PromptText'>;
export type ApiKey = Brand<string, 'ApiKey'>;

// Type Guards
export const isTemplateId = (value: any): value is TemplateId => {
  return typeof value === 'string' && value.length > 0;
};

export const isToneId = (value: any): value is ToneId => {
  return typeof value === 'string' && value.length > 0;
};

export const isTemperature = (value: any): value is Temperature => {
  return typeof value === 'number' && value >= 0 && value <= 2;
};

export const isIntensity = (value: any): value is Intensity => {
  return typeof value === 'number' && value >= 0 && value <= 1;
};

export const isPercentage = (value: any): value is Percentage => {
  return typeof value === 'number' && value >= 0 && value <= 100;
};

export const isCharCount = (value: any): value is CharCount => {
  return typeof value === 'number' && value >= 0 && value <= 280;
};

// Constructors with validation
export const createTemplateId = (value: string): TemplateId => {
  if (!value || value.trim().length === 0) {
    throw new Error('Invalid template ID');
  }
  return value as TemplateId;
};

export const createToneId = (value: string): ToneId => {
  if (!value || value.trim().length === 0) {
    throw new Error('Invalid tone ID');
  }
  return value as ToneId;
};

export const createTemperature = (value: number): Temperature => {
  if (value < 0 || value > 2) {
    throw new Error(`Temperature must be between 0 and 2, got ${value}`);
  }
  return value as Temperature;
};

export const createIntensity = (value: number): Intensity => {
  if (value < 0 || value > 1) {
    throw new Error(`Intensity must be between 0 and 1, got ${value}`);
  }
  return value as Intensity;
};

export const createPercentage = (value: number): Percentage => {
  if (value < 0 || value > 100) {
    throw new Error(`Percentage must be between 0 and 100, got ${value}`);
  }
  return value as Percentage;
};

export const createCharCount = (value: number): CharCount => {
  if (value < 0 || value > 280) {
    throw new Error(`Character count must be between 0 and 280, got ${value}`);
  }
  return Math.floor(value) as CharCount;
};

export const createApiKey = (value: string): ApiKey => {
  if (!value || value.trim().length < 10) {
    throw new Error('Invalid API key');
  }
  return value as ApiKey;
};

export const createTweetText = (value: string): TweetText => {
  if (value.length > 280) {
    throw new Error(`Tweet text too long: ${value.length} characters`);
  }
  return value as TweetText;
};

export const createPromptText = (value: string): PromptText => {
  if (!value || value.trim().length === 0) {
    throw new Error('Prompt text cannot be empty');
  }
  return value as PromptText;
};

export const createTimestamp = (value?: number): Timestamp => {
  const ts = value ?? Date.now();
  if (ts < 0 || !Number.isFinite(ts)) {
    throw new Error('Invalid timestamp');
  }
  return ts as Timestamp;
};

// Utility functions
export const clampTemperature = (value: number): Temperature => {
  return createTemperature(Math.max(0, Math.min(2, value)));
};

export const clampIntensity = (value: number): Intensity => {
  return createIntensity(Math.max(0, Math.min(1, value)));
};

export const percentageToIntensity = (percentage: Percentage): Intensity => {
  return createIntensity(percentage / 100);
};

export const intensityToPercentage = (intensity: Intensity): Percentage => {
  return createPercentage(intensity * 100);
};

// Type-safe collections
export class TypedMap<K extends string, V> {
  private map = new Map<K, V>();

  set(key: K, value: V): void {
    this.map.set(key, value);
  }

  get(key: K): V | undefined {
    return this.map.get(key);
  }

  has(key: K): boolean {
    return this.map.has(key);
  }

  delete(key: K): boolean {
    return this.map.delete(key);
  }

  clear(): void {
    this.map.clear();
  }

  get size(): number {
    return this.map.size;
  }

  entries(): IterableIterator<[K, V]> {
    return this.map.entries();
  }

  keys(): IterableIterator<K> {
    return this.map.keys();
  }

  values(): IterableIterator<V> {
    return this.map.values();
  }

  forEach(callback: (value: V, key: K) => void): void {
    this.map.forEach((v, k) => callback(v, k));
  }
}

// Validation result type
export interface ValidationResult<T> {
  success: boolean;
  value?: T;
  error?: string;
}

// Generic validator
export class Validator<T> {
  private validators: Array<(value: any) => ValidationResult<any>> = [];

  addRule(validator: (value: any) => ValidationResult<any>): this {
    this.validators.push(validator);
    return this;
  }

  validate(value: any): ValidationResult<T> {
    for (const validator of this.validators) {
      const result = validator(value);
      if (!result.success) {
        return result;
      }
    }
    return { success: true, value: value as T };
  }
}

// Common validators
export const validators = {
  required: <T>(value: T): ValidationResult<T> => {
    if (value === null || value === undefined || value === '') {
      return { success: false, error: 'Value is required' };
    }
    return { success: true, value };
  },

  minLength: (min: number) => (value: string): ValidationResult<string> => {
    if (value.length < min) {
      return { success: false, error: `Minimum length is ${min}` };
    }
    return { success: true, value };
  },

  maxLength: (max: number) => (value: string): ValidationResult<string> => {
    if (value.length > max) {
      return { success: false, error: `Maximum length is ${max}` };
    }
    return { success: true, value };
  },

  range: (min: number, max: number) => (value: number): ValidationResult<number> => {
    if (value < min || value > max) {
      return { success: false, error: `Value must be between ${min} and ${max}` };
    }
    return { success: true, value };
  },

  pattern: (regex: RegExp, message?: string) => (value: string): ValidationResult<string> => {
    if (!regex.test(value)) {
      return { success: false, error: message || 'Invalid format' };
    }
    return { success: true, value };
  },

  email: (value: string): ValidationResult<string> => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return { success: false, error: 'Invalid email address' };
    }
    return { success: true, value };
  },

  url: (value: string): ValidationResult<string> => {
    try {
      new URL(value);
      return { success: true, value };
    } catch {
      return { success: false, error: 'Invalid URL' };
    }
  }
};

// Export type utilities
export type UnwrapBrand<T> = T extends Brand<infer K, any> ? K : T;
export type BrandOf<T> = T extends Brand<any, infer B> ? B : never;