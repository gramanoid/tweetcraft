/**
 * Utility functions for HTML escaping to prevent XSS vulnerabilities
 */

/**
 * Escape HTML special characters to prevent XSS
 */
export function escapeHtml(str: string): string {
  const htmlEscapeMap: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '/': '&#x2F;'
  };
  
  return String(str).replace(/[&<>"'/]/g, (char) => htmlEscapeMap[char] || char);
}

/**
 * Escape a string for use in an HTML attribute
 */
export function escapeAttribute(str: string): string {
  return escapeHtml(str);
}

/**
 * Encode data for safe storage in a data attribute
 */
export function encodeDataAttribute(data: any): string {
  try {
    return encodeURIComponent(JSON.stringify(data));
  } catch {
    return '';
  }
}

/**
 * Decode data from a data attribute
 */
export function decodeDataAttribute(encoded: string): any {
  try {
    return JSON.parse(decodeURIComponent(encoded));
  } catch {
    return null;
  }
}

/**
 * Create a safe text node (prevents any HTML injection)
 */
export function createTextNode(text: string): Text {
  return document.createTextNode(String(text));
}

/**
 * Safely set inner text (prevents HTML injection)
 */
export function setTextContent(element: HTMLElement, text: string): void {
  element.textContent = String(text);
}

/**
 * Validate and sanitize numeric values
 */
export function sanitizeNumber(value: any, defaultValue: number = 0): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : defaultValue;
}

/**
 * Clamp a number between min and max
 */
export function clampNumber(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}