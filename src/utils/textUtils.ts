/**
 * Text processing utilities for TweetCraft
 * Centralized text manipulation and cleaning functions
 */

import { logger } from '@/utils/logger';

/**
 * Clean up the generated reply text
 * Removes quotes, hashtags, and normalizes formatting
 */
export function cleanupReply(text: string): string {
  let cleaned = text.trim();
  
  // Remove surrounding quotes if present
  if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || 
      (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
    cleaned = cleaned.slice(1, -1).trim();
  }
  
  // Remove leading/trailing quotes that might be from the prompt
  cleaned = cleaned.replace(/^["']|["']$/g, '');
  
  // Remove any "Reply:" or "Response:" prefixes that the AI might add
  cleaned = cleaned.replace(/^(Reply|Response|Answer|Tweet):\s*/i, '');
  
  // Clean up excessive whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  // Remove standalone hashtags at the end (keep inline hashtags)
  cleaned = cleaned.replace(/\s*#\w+(\s+#\w+)*\s*$/, '');
  
  // Ensure it doesn't start with @username (Twitter blocks this)
  if (cleaned.startsWith('@')) {
    cleaned = '.' + cleaned; // Add a period before @ to prevent blocking
  }
  
  logger.debug('Reply cleaned up:', { original: text, cleaned });
  
  return cleaned;
}

/**
 * Truncate text to a maximum length while preserving word boundaries
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  
  // Find the last space before maxLength
  const truncated = text.substring(0, maxLength);
  const lastSpaceIndex = truncated.lastIndexOf(' ');
  
  if (lastSpaceIndex > 0) {
    return truncated.substring(0, lastSpaceIndex) + '...';
  }
  
  return truncated + '...';
}

/**
 * Escape special characters for safe HTML display
 */
export function escapeHtml(text: string): string {
  const escapeMap: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;'
  };
  
  return text.replace(/[&<>"'/]/g, char => escapeMap[char]);
}

/**
 * Extract hashtags from text
 */
export function extractHashtags(text: string): string[] {
  const hashtagRegex = /#\w+/g;
  const matches = text.match(hashtagRegex);
  return matches ? matches.map(tag => tag.toLowerCase()) : [];
}

/**
 * Extract mentions from text
 */
export function extractMentions(text: string): string[] {
  const mentionRegex = /@\w+/g;
  const matches = text.match(mentionRegex);
  return matches ? matches.map(mention => mention.toLowerCase()) : [];
}

/**
 * Count characters for Twitter (considering special rules)
 */
export function countTwitterCharacters(text: string): number {
  // URLs count as 23 characters regardless of length
  const urlRegex = /https?:\/\/[^\s]+/g;
  let charCount = text.length;
  
  const urls = text.match(urlRegex);
  if (urls) {
    urls.forEach(url => {
      charCount = charCount - url.length + 23;
    });
  }
  
  return charCount;
}

/**
 * Check if text is within Twitter's character limit
 */
export function isWithinTwitterLimit(text: string, limit: number = 280): boolean {
  return countTwitterCharacters(text) <= limit;
}

/**
 * Remove emoji from text (useful for certain contexts)
 */
export function removeEmoji(text: string): string {
  // Comprehensive emoji regex pattern
  return text.replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F700}-\u{1F77F}]|[\u{1F780}-\u{1F7FF}]|[\u{1F800}-\u{1F8FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '');
}

/**
 * Normalize line breaks for consistent display
 */
export function normalizeLineBreaks(text: string): string {
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}