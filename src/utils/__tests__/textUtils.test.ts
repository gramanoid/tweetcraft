/**
 * Tests for text processing utilities
 */

import { 
  cleanupReply, 
  truncateText, 
  escapeHtml, 
  extractHashtags,
  extractMentions,
  countTwitterCharacters,
  isWithinTwitterLimit,
  removeEmoji,
  normalizeLineBreaks
} from '../textUtils';

describe('textUtils', () => {
  describe('cleanupReply', () => {
    it('should remove surrounding quotes', () => {
      expect(cleanupReply('"This is a reply"')).toBe('This is a reply');
      expect(cleanupReply("'This is a reply'")).toBe('This is a reply');
    });

    it('should remove AI meta-text prefixes', () => {
      expect(cleanupReply('Reply: This is the actual reply')).toBe('This is the actual reply');
      expect(cleanupReply('Response: This is the actual reply')).toBe('This is the actual reply');
      expect(cleanupReply('Answer: This is the actual reply')).toBe('This is the actual reply');
    });

    it('should clean up excessive whitespace', () => {
      expect(cleanupReply('This  has   too    much     space')).toBe('This has too much space');
      expect(cleanupReply('\n\nMultiple\n\nlines\n\n')).toBe('Multiple lines');
    });

    it('should remove trailing hashtags', () => {
      expect(cleanupReply('Great point! #AI #Tech #Innovation')).toBe('Great point!');
      expect(cleanupReply('Check this out #amazing')).toBe('Check this out');
    });

    it('should prefix @ mentions to prevent blocking', () => {
      expect(cleanupReply('@user This is a reply')).toBe('.@user This is a reply');
    });

    it('should handle complex cases', () => {
      const input = '"Reply: Great point! #AI #Tech"';
      const expected = '.@Great point!';
      expect(cleanupReply('@' + cleanupReply(input))).toBe(expected);
    });
  });

  describe('truncateText', () => {
    it('should not truncate text within limit', () => {
      expect(truncateText('Short text', 20)).toBe('Short text');
    });

    it('should truncate at word boundary', () => {
      expect(truncateText('This is a very long text that needs truncation', 20))
        .toBe('This is a very long...');
    });

    it('should handle text without spaces', () => {
      expect(truncateText('Verylongtextwithoutspaces', 10))
        .toBe('Verylongte...');
    });
  });

  describe('escapeHtml', () => {
    it('should escape HTML special characters', () => {
      expect(escapeHtml('<script>alert("XSS")</script>'))
        .toBe('&lt;script&gt;alert(&quot;XSS&quot;)&lt;&#x2F;script&gt;');
    });

    it('should escape single quotes', () => {
      expect(escapeHtml("It's a test")).toBe('It&#x27;s a test');
    });

    it('should handle multiple special characters', () => {
      expect(escapeHtml('& < > " \' /')).toBe('&amp; &lt; &gt; &quot; &#x27; &#x2F;');
    });
  });

  describe('extractHashtags', () => {
    it('should extract hashtags from text', () => {
      const text = 'Check out #TweetCraft for #AI powered replies!';
      expect(extractHashtags(text)).toEqual(['#tweetcraft', '#ai']);
    });

    it('should return empty array when no hashtags', () => {
      expect(extractHashtags('No hashtags here')).toEqual([]);
    });

    it('should handle multiple hashtags together', () => {
      expect(extractHashtags('#web3 #crypto #blockchain'))
        .toEqual(['#web3', '#crypto', '#blockchain']);
    });
  });

  describe('extractMentions', () => {
    it('should extract mentions from text', () => {
      const text = '@user1 Thanks! CC @user2 @user3';
      expect(extractMentions(text)).toEqual(['@user1', '@user2', '@user3']);
    });

    it('should return empty array when no mentions', () => {
      expect(extractMentions('No mentions here')).toEqual([]);
    });
  });

  describe('countTwitterCharacters', () => {
    it('should count regular text normally', () => {
      expect(countTwitterCharacters('Hello world')).toBe(11);
    });

    it('should count URLs as 23 characters', () => {
      const text = 'Check this out: https://www.example.com/very/long/url/path';
      expect(countTwitterCharacters(text)).toBe(39); // "Check this out: " (16) + 23
    });

    it('should handle multiple URLs', () => {
      const text = 'https://example.com and https://another.com';
      expect(countTwitterCharacters(text)).toBe(51); // 23 + " and " (5) + 23
    });
  });

  describe('isWithinTwitterLimit', () => {
    it('should return true for text within limit', () => {
      expect(isWithinTwitterLimit('Short tweet')).toBe(true);
    });

    it('should return false for text exceeding limit', () => {
      const longText = 'a'.repeat(281);
      expect(isWithinTwitterLimit(longText)).toBe(false);
    });

    it('should handle custom limits', () => {
      expect(isWithinTwitterLimit('12345', 5)).toBe(true);
      expect(isWithinTwitterLimit('123456', 5)).toBe(false);
    });
  });

  describe('removeEmoji', () => {
    it('should remove emoji from text', () => {
      expect(removeEmoji('Hello 😊 World 🌍!')).toBe('Hello  World !');
    });

    it('should handle text without emoji', () => {
      expect(removeEmoji('No emoji here')).toBe('No emoji here');
    });

    it('should remove multiple emoji types', () => {
      expect(removeEmoji('🚀 Launch 💼 Work ✨ Magic')).toBe(' Launch  Work  Magic');
    });
  });

  describe('normalizeLineBreaks', () => {
    it('should normalize Windows line breaks', () => {
      expect(normalizeLineBreaks('Line1\r\nLine2\r\nLine3'))
        .toBe('Line1\nLine2\nLine3');
    });

    it('should normalize Mac line breaks', () => {
      expect(normalizeLineBreaks('Line1\rLine2\rLine3'))
        .toBe('Line1\nLine2\nLine3');
    });

    it('should handle mixed line breaks', () => {
      expect(normalizeLineBreaks('Line1\r\nLine2\rLine3\nLine4'))
        .toBe('Line1\nLine2\nLine3\nLine4');
    });
  });
});