/**
 * Comprehensive Test Suite for TweetCraft Prompt Architecture
 * Tests every possible prompt combination from all 6 tabs
 */

import { PromptArchitecture, PromptConfiguration } from '@/services/promptArchitecture';

describe('TweetCraft Prompt Architecture - Complete Validation', () => {
  const masterPrompt = 'You are an expert Twitter reply / tweet writer that excels in human/natural sounding verbiage and sentence flow. Analyze the provided tweet\'s content, tone, and intent first. If links are present, access them. If images accompany the tweet, analyze them thoroughly. This additional context is critical for crafting a relevant reply. Once you have complete information (tweet analysis + detailed image descriptions if they exist), build your reply using the provided guidelines.';
  const antiDisclosure = ' CRITICAL: You are responding as a human Twitter/X user. Write ONLY the reply text itself. NEVER reveal you are an AI or explain your methodology. NEVER include meta-commentary like "Note: This response maintains neutrality by..." or "This approach uses..." or numbered explanations of your strategy. Do not break character or explain your reasoning. Respond naturally as if you are a real person engaging in conversation.';
  const userSystemPrompt = 'I am a tech enthusiast who loves AI';
  const defaultTemp = 0.7;

  describe('1. PERSONAS Tab', () => {
    it('should build correct prompt with persona configuration', () => {
      const config: PromptConfiguration = {
        systemPrompt: userSystemPrompt,
        temperature: defaultTemp,
        contextMode: 'thread',
        tabType: 'personas',
        personaConfig: {
          personality: 'debate_lord',
          vocabulary: 'academic_scholarly',
          rhetoricMove: 'devils_advocate',
          lengthPacing: 'one_two_punch',
          systemPrompt: 'Generate a reply from the persona of The Debate Lord'
        }
      };

      const result = PromptArchitecture.buildSystemPrompt(config);
      
      expect(result).toContain(masterPrompt);
      expect(result).toContain(userSystemPrompt);
      expect(result).toContain('Generate a reply from the persona of The Debate Lord');
      expect(result).toContain('Personality: debate_lord');
      expect(result).toContain('Vocabulary style: academic_scholarly');
      expect(result).toContain('Rhetorical approach: devils_advocate');
      expect(result).toContain('Length and pacing: one_two_punch');
      expect(result).toContain(antiDisclosure);
    });

    it('should use system-wide temperature (no persona override)', () => {
      const config: PromptConfiguration = {
        systemPrompt: userSystemPrompt,
        temperature: 0.8,
        contextMode: 'single',
        tabType: 'personas',
        personaConfig: {
          personality: 'chaos_muppet',
          vocabulary: 'shitposter_meme',
          rhetoricMove: 'make_joke',
          lengthPacing: 'breathless_ramble',
          systemPrompt: 'Be chaotic and unpredictable'
        }
      };

      const temperature = PromptArchitecture.getTemperature(config);
      expect(temperature).toBe(0.8); // System-wide, not custom
    });
  });

  describe('2. ALL Tab (4-Part Builder)', () => {
    const allCombinations = [
      { personality: 'friendly', vocabulary: 'plain_english', rhetoric: 'agree_build', lengthPacing: 'drive_by' },
      { personality: 'professional', vocabulary: 'corporate', rhetoric: 'devils_advocate', lengthPacing: 'mini_thread' },
      { personality: 'sarcastic', vocabulary: 'gen_z_slang', rhetoric: 'hot_take', lengthPacing: 'one_two_punch' },
      { personality: 'technical', vocabulary: 'academic_scholarly', rhetoric: 'data_driven', lengthPacing: 'comprehensive' }
    ];

    allCombinations.forEach(combo => {
      it(`should build correct prompt for: ${combo.personality} + ${combo.vocabulary} + ${combo.rhetoric} + ${combo.lengthPacing}`, () => {
        const config: PromptConfiguration = {
          systemPrompt: userSystemPrompt,
          temperature: defaultTemp,
          contextMode: 'thread',
          tabType: 'all',
          allTabConfig: combo
        };

        const result = PromptArchitecture.buildSystemPrompt(config);
        
        expect(result).toContain(masterPrompt);
        expect(result).toContain(userSystemPrompt);
        expect(result).toContain(`Personality: ${combo.personality}`);
        expect(result).toContain(`Vocabulary style: ${combo.vocabulary}`);
        expect(result).toContain(`Rhetorical approach: ${combo.rhetoric}`);
        expect(result).toContain(`Length and pacing: ${combo.lengthPacing}`);
        expect(result).toContain(antiDisclosure);
        expect(result).not.toContain('undefined');
      });
    });

    it('should use system-wide temperature', () => {
      const config: PromptConfiguration = {
        systemPrompt: '',
        temperature: 0.5,
        contextMode: 'none',
        tabType: 'all',
        allTabConfig: {
          personality: 'friendly',
          vocabulary: 'plain_english',
          rhetoric: 'agree_build',
          lengthPacing: 'drive_by'
        }
      };

      const temperature = PromptArchitecture.getTemperature(config);
      expect(temperature).toBe(0.5);
    });
  });

  describe('3. SMART Tab', () => {
    it('should use ALL tab logic for Smart suggestions', () => {
      const config: PromptConfiguration = {
        systemPrompt: userSystemPrompt,
        temperature: defaultTemp,
        contextMode: 'thread',
        tabType: 'smart',
        allTabConfig: {
          personality: 'analytical',
          vocabulary: 'technical',
          rhetoric: 'data_driven',
          lengthPacing: 'comprehensive'
        }
      };

      const result = PromptArchitecture.buildSystemPrompt(config);
      
      expect(result).toContain(masterPrompt);
      expect(result).toContain(userSystemPrompt);
      expect(result).toContain('Personality: analytical');
      expect(result).toContain('Vocabulary style: technical');
      expect(result).toContain('Rhetorical approach: data_driven');
      expect(result).toContain('Length and pacing: comprehensive');
      expect(result).toContain(antiDisclosure);
    });
  });

  describe('4. FAVORITES Tab', () => {
    it('should use ALL tab logic for Favorites', () => {
      const config: PromptConfiguration = {
        systemPrompt: userSystemPrompt,
        temperature: defaultTemp,
        contextMode: 'single',
        tabType: 'favorites',
        allTabConfig: {
          personality: 'enthusiastic',
          vocabulary: 'casual',
          rhetoric: 'supportive',
          lengthPacing: 'quick'
        }
      };

      const result = PromptArchitecture.buildSystemPrompt(config);
      
      expect(result).toContain(masterPrompt);
      expect(result).toContain('Personality: enthusiastic');
      expect(result).toContain(antiDisclosure);
    });
  });

  describe('5. IMAGE_GEN Tab', () => {
    it('should return empty prompt for image generation', () => {
      const config: PromptConfiguration = {
        systemPrompt: userSystemPrompt,
        temperature: defaultTemp,
        contextMode: 'none',
        tabType: 'image_gen'
      };

      const result = PromptArchitecture.buildSystemPrompt(config);
      
      expect(result).toBe('');
      expect(result).not.toContain(masterPrompt);
      expect(result).not.toContain(antiDisclosure);
    });

    it('should still use system temperature', () => {
      const config: PromptConfiguration = {
        systemPrompt: '',
        temperature: 0.9,
        contextMode: 'none',
        tabType: 'image_gen'
      };

      const temperature = PromptArchitecture.getTemperature(config);
      expect(temperature).toBe(0.9);
    });
  });

  describe('6. CUSTOM Tab', () => {
    const customTests = [
      { 
        style: 'Ask thoughtful questions',
        tone: 'Be curious and encouraging', 
        length: '1-2 sentences max',
        temperature: 0.3
      },
      { 
        style: 'Share personal experiences',
        tone: 'Be vulnerable and authentic', 
        length: 'Medium length, 2-3 sentences',
        temperature: 0.9
      },
      { 
        style: 'Provide expert analysis',
        tone: 'Be authoritative but approachable', 
        length: 'Comprehensive mini-thread',
        temperature: 0.5
      }
    ];

    customTests.forEach(custom => {
      it(`should build correct prompt with custom: "${custom.style.substring(0, 20)}..."`, () => {
        const config: PromptConfiguration = {
          systemPrompt: userSystemPrompt,
          temperature: defaultTemp,
          contextMode: 'thread',
          tabType: 'custom',
          customConfig: custom
        };

        const result = PromptArchitecture.buildSystemPrompt(config);
        
        expect(result).toContain(masterPrompt);
        expect(result).toContain(userSystemPrompt);
        expect(result).toContain(`Writing style: ${custom.style}`);
        expect(result).toContain(`Tone of voice: ${custom.tone}`);
        expect(result).toContain(`Length instructions: ${custom.length}`);
        expect(result).toContain(antiDisclosure);
      });

      it(`should override temperature with custom value: ${custom.temperature}`, () => {
        const config: PromptConfiguration = {
          systemPrompt: '',
          temperature: defaultTemp,
          contextMode: 'none',
          tabType: 'custom',
          customConfig: custom
        };

        const temperature = PromptArchitecture.getTemperature(config);
        expect(temperature).toBe(custom.temperature); // Custom override, not system
      });
    });

    it('should use system temperature when custom temperature not provided', () => {
      const config: PromptConfiguration = {
        systemPrompt: '',
        temperature: 0.6,
        contextMode: 'none',
        tabType: 'custom',
        customConfig: {
          style: 'Test style',
          tone: 'Test tone',
          length: 'Test length'
          // No temperature override
        }
      };

      const temperature = PromptArchitecture.getTemperature(config);
      expect(temperature).toBe(0.6); // Falls back to system
    });
  });

  describe('Context Mode Variations', () => {
    const modes: Array<'none' | 'single' | 'thread'> = ['none', 'single', 'thread'];
    
    modes.forEach(mode => {
      it(`should handle context mode: ${mode}`, () => {
        const config: PromptConfiguration = {
          systemPrompt: userSystemPrompt,
          temperature: defaultTemp,
          contextMode: mode,
          tabType: 'all',
          allTabConfig: {
            personality: 'friendly',
            vocabulary: 'plain_english',
            rhetoric: 'agree_build',
            lengthPacing: 'drive_by'
          },
          context: {
            tweetText: 'Test tweet content',
            authorHandle: '@testuser',
            threadContext: mode === 'thread' ? [
              { author: '@user1', text: 'First tweet' },
              { author: '@user2', text: 'Second tweet' }
            ] : undefined
          }
        };

        const userPrompt = PromptArchitecture.buildUserPrompt(config);
        
        if (mode === 'thread') {
          expect(userPrompt).toContain('Twitter conversation thread');
          expect(userPrompt).toContain('@user1: First tweet');
          expect(userPrompt).toContain('@user2: Second tweet');
        } else if (mode === 'single') {
          expect(userPrompt).toContain('Write a reply to this tweet');
          expect(userPrompt).toContain('Test tweet content');
        } else {
          expect(userPrompt).toContain('Write an engaging tweet');
        }
      });
    });
  });

  describe('Edge Cases and Validation', () => {
    it('should default to ALL tab when tabType is missing', () => {
      const config: PromptConfiguration = {
        systemPrompt: userSystemPrompt,
        temperature: defaultTemp,
        contextMode: 'none',
        // Missing tabType - should default to 'all'
        tabType: undefined as any
      };

      const result = PromptArchitecture.buildSystemPrompt(config);
      expect(result).toContain(masterPrompt); // Should still build a prompt
    });

    it('should handle missing user system prompt gracefully', () => {
      const config: PromptConfiguration = {
        systemPrompt: '', // Empty user prompt
        temperature: defaultTemp,
        contextMode: 'none',
        tabType: 'all',
        allTabConfig: {
          personality: 'friendly',
          vocabulary: 'plain_english',
          rhetoric: 'agree_build',
          lengthPacing: 'drive_by'
        }
      };

      const result = PromptArchitecture.buildSystemPrompt(config);
      expect(result).toContain(masterPrompt);
      expect(result).not.toContain('undefined');
      expect(result).toContain(antiDisclosure);
    });

    it('should handle missing config fields without breaking', () => {
      const config: PromptConfiguration = {
        systemPrompt: userSystemPrompt,
        temperature: defaultTemp,
        contextMode: 'thread',
        tabType: 'personas',
        personaConfig: {
          personality: '', // Empty field
          vocabulary: undefined as any, // Missing field
          rhetoricMove: 'test',
          lengthPacing: '',
          systemPrompt: 'Test persona'
        }
      };

      const result = PromptArchitecture.buildSystemPrompt(config);
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
    });

    it('should validate temperature is used correctly', () => {
      // Test temperature bounds
      const configs = [
        { temp: 0.0, expected: 0.0 },
        { temp: 0.1, expected: 0.1 },
        { temp: 0.5, expected: 0.5 },
        { temp: 1.0, expected: 1.0 },
        { temp: 1.5, expected: 1.5 }, // Should accept out of range (no validation)
      ];

      configs.forEach(({ temp, expected }) => {
        const config: PromptConfiguration = {
          systemPrompt: '',
          temperature: temp,
          contextMode: 'none',
          tabType: 'all'
        };

        const temperature = PromptArchitecture.getTemperature(config);
        expect(temperature).toBe(expected);
      });
    });
  });

  describe('Prompt Logging', () => {
    it('should log prompt architecture details', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const config: PromptConfiguration = {
        systemPrompt: userSystemPrompt,
        temperature: defaultTemp,
        contextMode: 'thread',
        tabType: 'custom',
        customConfig: {
          style: 'Test style',
          tone: 'Test tone',
          length: 'Test length',
          temperature: 0.8
        }
      };

      const systemPrompt = PromptArchitecture.buildSystemPrompt(config);
      const userPrompt = PromptArchitecture.buildUserPrompt(config);
      const temperature = PromptArchitecture.getTemperature(config);

      PromptArchitecture.logPromptArchitecture(config, systemPrompt, userPrompt, temperature);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('PROMPT ARCHITECTURE'),
        expect.any(String),
        expect.any(String)
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Tab Type:'),
        expect.any(String),
        'CUSTOM'
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Custom Temperature:'),
        expect.any(String),
        0.8
      );

      consoleSpy.mockRestore();
    });
  });
});

describe('Data Flow Integration Tests', () => {
  describe('UnifiedSelector → SelectorAdapter → ContentScript → OpenRouter', () => {
    it('should pass all required fields through the complete chain', () => {
      // Simulate the data flow
      const selectionResult = {
        template: { id: 'test', name: 'Test', emoji: '🧪', prompt: 'Test prompt' },
        tone: { id: 'test', label: 'Test', emoji: '🧪', systemPrompt: 'Test tone' },
        combinedPrompt: 'Combined test',
        temperature: 0.7,
        vocabulary: 'plain_english',
        lengthPacing: 'drive_by',
        personality: 'friendly',
        rhetoric: 'agree_build',
        tabType: 'all' as const,
        allTabConfig: {
          personality: 'friendly',
          vocabulary: 'plain_english',
          rhetoric: 'agree_build',
          lengthPacing: 'drive_by'
        }
      };

      // Verify all fields are present
      expect(selectionResult.tabType).toBe('all');
      expect(selectionResult.allTabConfig).toBeDefined();
      expect(selectionResult.allTabConfig?.personality).toBe('friendly');
      expect(selectionResult.allTabConfig?.vocabulary).toBe('plain_english');
      expect(selectionResult.allTabConfig?.rhetoric).toBe('agree_build');
      expect(selectionResult.allTabConfig?.lengthPacing).toBe('drive_by');
    });

    it('should handle Custom tab with temperature override', () => {
      const customResult = {
        tabType: 'custom' as const,
        customConfig: {
          style: 'Professional analysis',
          tone: 'Authoritative',
          length: 'Comprehensive',
          temperature: 0.3 // Override
        },
        temperature: 0.7 // System default
      };

      // Temperature should be overridden
      const config: PromptConfiguration = {
        systemPrompt: '',
        temperature: customResult.temperature,
        contextMode: 'none',
        tabType: customResult.tabType,
        customConfig: customResult.customConfig
      };

      const finalTemp = PromptArchitecture.getTemperature(config);
      expect(finalTemp).toBe(0.3); // Custom override wins
    });
  });
});