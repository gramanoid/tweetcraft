/**
 * Robust JSON extraction utility
 * Handles nested objects and special characters
 */

export class JSONExtractor {
  /**
   * Extract JSON from a string using a deterministic scanner
   * Handles nested objects, arrays, and escaped characters
   */
  static extractJSON(text: string): string | null {
    // First try to find fenced JSON blocks
    const fencedMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fencedMatch) {
      return fencedMatch[1].trim();
    }
    
    // Find the first opening brace or bracket
    let startIdx = -1;
    let startChar = '';
    
    for (let i = 0; i < text.length; i++) {
      if (text[i] === '{' || text[i] === '[') {
        startIdx = i;
        startChar = text[i];
        break;
      }
    }
    
    if (startIdx === -1) {
      return null;
    }
    
    // Track depth and string state
    let depth = 1; // Start at 1 since we found the opening bracket
    let inString = false;
    let escapeNext = false;
    let endIdx = -1;
    const endChar = startChar === '{' ? '}' : ']';
    
    for (let i = startIdx + 1; i < text.length; i++) {
      const char = text[i];
      
      // Handle escape sequences
      if (escapeNext) {
        escapeNext = false;
        continue;
      }
      
      if (char === '\\' && inString) {
        escapeNext = true;
        continue;
      }
      
      // Handle string boundaries
      if (char === '"' && !escapeNext) {
        inString = !inString;
        continue;
      }
      
      // Only process structural characters outside of strings
      if (!inString) {
        // Track matching pairs separately based on initial start character
        if (startChar === '{') {
          // For JSON objects, only track curly braces
          if (char === '{') {
            depth++;
          } else if (char === '}') {
            depth--;
            if (depth === 0) {
              endIdx = i;
              break;
            }
          }
        } else if (startChar === '[') {
          // For JSON arrays, only track square brackets
          if (char === '[') {
            depth++;
          } else if (char === ']') {
            depth--;
            if (depth === 0) {
              endIdx = i;
              break;
            }
          }
        }
      }
    }
    
    if (endIdx === -1) {
      return null;
    }
    
    return text.substring(startIdx, endIdx + 1);
  }
  
  /**
   * Parse JSON safely with error handling
   */
  static parseJSON<T = any>(text: string): T | null {
    try {
      const jsonStr = this.extractJSON(text);
      if (!jsonStr) {
        return null;
      }
      
      return JSON.parse(jsonStr);
    } catch (error) {
      console.warn('Failed to parse JSON:', error);
      return null;
    }
  }
}