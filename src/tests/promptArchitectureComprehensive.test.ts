/**
 * Comprehensive Test Suite for TweetCraft Prompt Architecture
 * Validates all 6 tabs, configurations, edge cases, and integration points
 */

import { PromptArchitecture, PromptConfiguration } from '../services/promptArchitecture';

describe('PromptArchitecture Comprehensive Test Suite', () => {
  
  // Helper function to validate prompt structure
  const validatePromptStructure = (systemPrompt: string, expectedParts: string[]) => {
    expectedParts.forEach(part => {
      expect(systemPrompt).toContain(part);
    });
  };

  // Helper to create base configuration
  const createBaseConfig = (tabType: PromptConfiguration['tabType']): PromptConfiguration => ({
    systemPrompt: 'I am a helpful Twitter user',
    temperature: 0.7,
    contextMode: 'single',
    tabType,
    context: {
      tweetText: 'Test tweet content',
      authorHandle: 'testuser',
      threadContext: [],
      images: []
    }
  });

  describe('1. PERSONAS TAB', () => {
    it('should construct complete prompt with all persona configurations', () => {
      const config: PromptConfiguration = {
        ...createBaseConfig('personas'),
        personaConfig: {
          personality: 'Friendly and supportive',
          vocabulary: 'Plain English with modern slang',
          rhetoricMove: 'Agree and build upon ideas',
          lengthPacing: 'Normal reply with 1-2 sentences',
          systemPrompt: 'You are The Encourager persona'
        }
      };

      const systemPrompt = PromptArchitecture.buildSystemPrompt(config);
      const userPrompt = PromptArchitecture.buildUserPrompt(config);
      const temperature = PromptArchitecture.getTemperature(config);

      // Validate system prompt contains all expected parts
      validatePromptStructure(systemPrompt, [
        'expert Twitter reply / tweet writer',
        'I am a helpful Twitter user',
        'You are The Encourager persona',
        'Personality: Friendly and supportive',
        'Vocabulary style: Plain English with modern slang',
        'Rhetorical approach: Agree and build upon ideas',
        'Length and pacing: Normal reply with 1-2 sentences',
        'CRITICAL: You are responding as a human Twitter/X user'
      ]);

      // Validate user prompt
      expect(userPrompt).toContain('Write a reply to this tweet: "Test tweet content"');
      
      // Validate temperature
      expect(temperature).toBe(0.7);
    });

    it('should handle missing persona config gracefully', () => {
      const config: PromptConfiguration = createBaseConfig('personas');
      // No personaConfig provided

      const systemPrompt = PromptArchitecture.buildSystemPrompt(config);
      
      // Should still have base prompt
      expect(systemPrompt).toContain('expert Twitter reply / tweet writer');
      expect(systemPrompt).toContain('I am a helpful Twitter user');
    });

    it('should handle partial persona config', () => {
      const config: PromptConfiguration = {
        ...createBaseConfig('personas'),
        personaConfig: {
          personality: 'Sarcastic',
          vocabulary: '', // Empty
          rhetoricMove: undefined as any, // Missing
          lengthPacing: '  ', // Whitespace only
          systemPrompt: 'Sarcasm expert'
        }
      };

      const systemPrompt = PromptArchitecture.buildSystemPrompt(config);
      
      // Should include non-empty values only
      expect(systemPrompt).toContain('Personality: Sarcastic');
      expect(systemPrompt).toContain('Sarcasm expert');
      expect(systemPrompt).not.toContain('Vocabulary style:');
      expect(systemPrompt).not.toContain('Rhetorical approach:');
      expect(systemPrompt).not.toContain('Length and pacing:');
    });
  });

  describe('2. ALL TAB', () => {
    it('should construct prompt with 4-part builder configuration', () => {
      const config: PromptConfiguration = {
        ...createBaseConfig('all'),
        allTabConfig: {
          personality: 'Professional and authoritative',
          vocabulary: 'Corporate PR speak',
          rhetoric: 'Steel man the argument',
          lengthPacing: 'Stream of consciousness 3-4 sentences'
        }
      };

      const systemPrompt = PromptArchitecture.buildSystemPrompt(config);
      
      validatePromptStructure(systemPrompt, [
        'Personality: Professional and authoritative',
        'Vocabulary style: Corporate PR speak',
        'Rhetorical approach: Steel man the argument',
        'Length and pacing: Stream of consciousness 3-4 sentences'
      ]);
    });

    it('should handle missing allTabConfig', () => {
      const config: PromptConfiguration = createBaseConfig('all');
      // No allTabConfig provided

      const systemPrompt = PromptArchitecture.buildSystemPrompt(config);
      
      // Should still have base elements
      expect(systemPrompt).toContain('expert Twitter reply / tweet writer');
      expect(systemPrompt.length).toBeGreaterThan(100);
    });

    it('should handle all possible personality/vocabulary/rhetoric/pacing combinations', () => {
      const personalities = ['Friendly', 'Sarcastic', 'Professional', 'Witty'];
      const vocabularies = ['Plain English', 'Gen Z', 'Corporate', 'Academic'];
      const rhetorics = ['Agree & Build', 'Devil\'s Advocate', 'Hot Take', 'Ratio Bait'];
      const pacings = ['One Word', 'Statement + Question', 'Normal Reply', 'Mini-Thread'];

      personalities.forEach(personality => {
        vocabularies.forEach(vocabulary => {
          rhetorics.forEach(rhetoric => {
            pacings.forEach(pacing => {
              const config: PromptConfiguration = {
                ...createBaseConfig('all'),
                allTabConfig: { personality, vocabulary, rhetoric, lengthPacing: pacing }
              };

              const systemPrompt = PromptArchitecture.buildSystemPrompt(config);
              
              expect(systemPrompt).toContain(`Personality: ${personality}`);
              expect(systemPrompt).toContain(`Vocabulary style: ${vocabulary}`);
              expect(systemPrompt).toContain(`Rhetorical approach: ${rhetoric}`);
              expect(systemPrompt).toContain(`Length and pacing: ${pacing}`);
            });
          });
        });
      });
    });
  });

  describe('3. SMART TAB', () => {
    it('should use ALL tab structure for Smart suggestions', () => {
      const config: PromptConfiguration = {
        ...createBaseConfig('smart'),
        allTabConfig: {
          personality: 'Chaos Muppet energy',
          vocabulary: 'Internet memes and references',
          rhetoric: 'Chaotic neutral observations',
          lengthPacing: 'Drive-by one-liner'
        }
      };

      const systemPrompt = PromptArchitecture.buildSystemPrompt(config);
      
      // Smart tab should use the same structure as ALL tab
      validatePromptStructure(systemPrompt, [
        'Personality: Chaos Muppet energy',
        'Vocabulary style: Internet memes and references',
        'Rhetorical approach: Chaotic neutral observations',
        'Length and pacing: Drive-by one-liner'
      ]);
    });

    it('CRITICAL: should handle missing allTabConfig for Smart tab', () => {
      const config: PromptConfiguration = createBaseConfig('smart');
      // No allTabConfig - this is a critical dependency!

      const systemPrompt = PromptArchitecture.buildSystemPrompt(config);
      
      // Currently handles gracefully but should potentially throw
      expect(systemPrompt).toBeDefined();
      expect(systemPrompt).toContain('expert Twitter reply / tweet writer');
      // Issue: This should potentially throw an error as Smart tab requires allTabConfig
    });
  });

  describe('4. FAVORITES TAB', () => {
    it('should use ALL tab structure for saved favorites', () => {
      const config: PromptConfiguration = {
        ...createBaseConfig('favorites'),
        allTabConfig: {
          personality: 'The Debate Lord',
          vocabulary: 'Academic with citations',
          rhetoric: 'Fact-check everything',
          lengthPacing: 'Two-tweet thread'
        }
      };

      const systemPrompt = PromptArchitecture.buildSystemPrompt(config);
      
      // Favorites should use ALL tab structure
      validatePromptStructure(systemPrompt, [
        'Personality: The Debate Lord',
        'Vocabulary style: Academic with citations',
        'Rhetorical approach: Fact-check everything',
        'Length and pacing: Two-tweet thread'
      ]);
    });

    it('CRITICAL: should handle missing allTabConfig for Favorites tab', () => {
      const config: PromptConfiguration = createBaseConfig('favorites');
      // No allTabConfig - critical dependency!

      const systemPrompt = PromptArchitecture.buildSystemPrompt(config);
      
      // Currently handles gracefully but should potentially throw
      expect(systemPrompt).toBeDefined();
      // Issue: Should enforce allTabConfig requirement
    });
  });

  describe('5. IMAGE_GEN TAB', () => {
    it('should return empty string for image generation', () => {
      const config: PromptConfiguration = createBaseConfig('image_gen');

      const systemPrompt = PromptArchitecture.buildSystemPrompt(config);
      const userPrompt = PromptArchitecture.buildUserPrompt(config);
      const temperature = PromptArchitecture.getTemperature(config);

      // Image gen doesn't use prompts
      expect(systemPrompt).toBe('');
      expect(userPrompt).toBe('Write an engaging tweet.');
      expect(temperature).toBe(0.7);
    });

    it('should ignore all configurations for image_gen', () => {
      const config: PromptConfiguration = {
        ...createBaseConfig('image_gen'),
        systemPrompt: 'This should be ignored',
        allTabConfig: {
          personality: 'Ignored',
          vocabulary: 'Ignored',
          rhetoric: 'Ignored',
          lengthPacing: 'Ignored'
        }
      };

      const systemPrompt = PromptArchitecture.buildSystemPrompt(config);
      
      expect(systemPrompt).toBe('');
    });
  });

  describe('6. CUSTOM TAB', () => {
    it('should construct prompt with custom style/tone/length', () => {
      const config: PromptConfiguration = {
        ...createBaseConfig('custom'),
        customConfig: {
          style: 'Write like a pirate',
          tone: 'Adventurous and bold',
          length: 'Exactly 280 characters',
          temperature: 0.9
        }
      };

      const systemPrompt = PromptArchitecture.buildSystemPrompt(config);
      const temperature = PromptArchitecture.getTemperature(config);

      validatePromptStructure(systemPrompt, [
        'Writing style: Write like a pirate',
        'Tone of voice: Adventurous and bold',
        'Length instructions: Exactly 280 characters'
      ]);

      // Should use custom temperature override
      expect(temperature).toBe(0.9);
    });

    it('should override system temperature with custom value', () => {
      const config: PromptConfiguration = {
        ...createBaseConfig('custom'),
        temperature: 0.3, // System temperature
        customConfig: {
          style: 'Formal',
          tone: 'Serious',
          length: 'Brief',
          temperature: 0.95 // Custom override
        }
      };

      const temperature = PromptArchitecture.getTemperature(config);
      
      // Should use custom temperature, not system
      expect(temperature).toBe(0.95);
    });

    it('should handle missing custom fields gracefully', () => {
      const config: PromptConfiguration = {
        ...createBaseConfig('custom'),
        customConfig: {
          style: '', // Empty
          tone: '   ', // Whitespace
          length: null as any // Null
        }
      };

      const systemPrompt = PromptArchitecture.buildSystemPrompt(config);
      
      // Should not include empty fields
      expect(systemPrompt).not.toContain('Writing style:');
      expect(systemPrompt).not.toContain('Tone of voice:');
      expect(systemPrompt).not.toContain('Length instructions:');
    });

    it('should validate temperature bounds', () => {
      const configs = [
        { ...createBaseConfig('custom'), customConfig: { style: 'Test', tone: 'Test', length: 'Test', temperature: -1 }},
        { ...createBaseConfig('custom'), customConfig: { style: 'Test', tone: 'Test', length: 'Test', temperature: 0 }},
        { ...createBaseConfig('custom'), customConfig: { style: 'Test', tone: 'Test', length: 'Test', temperature: 0.05 }},
        { ...createBaseConfig('custom'), customConfig: { style: 'Test', tone: 'Test', length: 'Test', temperature: 1.5 }},
        { ...createBaseConfig('custom'), customConfig: { style: 'Test', tone: 'Test', length: 'Test', temperature: 100 }}
      ];

      configs.forEach(config => {
        const temperature = PromptArchitecture.getTemperature(config);
        
        // Should clamp to valid range [0.1, 1.0]
        expect(temperature).toBeGreaterThanOrEqual(0.1);
        expect(temperature).toBeLessThanOrEqual(1.0);
      });
    });
  });

  describe('Context Handling', () => {
    it('should handle none context mode', () => {
      const config: PromptConfiguration = {
        ...createBaseConfig('all'),
        contextMode: 'none'
      };

      const userPrompt = PromptArchitecture.buildUserPrompt(config);
      
      expect(userPrompt).toBe('Write an engaging tweet reply.');
    });

    it('should handle single context mode', () => {
      const config: PromptConfiguration = {
        ...createBaseConfig('all'),
        contextMode: 'single',
        context: {
          tweetText: 'This is the original tweet text',
          authorHandle: 'originalauthor'
        }
      };

      const userPrompt = PromptArchitecture.buildUserPrompt(config);
      
      expect(userPrompt).toBe('Write a reply to this tweet: "This is the original tweet text"');
    });

    it('should handle thread context mode', () => {
      const config: PromptConfiguration = {
        ...createBaseConfig('all'),
        contextMode: 'thread',
        context: {
          tweetText: 'Latest tweet in thread',
          authorHandle: 'currentuser',
          threadContext: [
            { author: 'user1', text: 'First tweet in thread' },
            { author: 'user2', text: 'Second tweet in thread' },
            { author: 'user3', text: 'Third tweet in thread' }
          ]
        }
      };

      const userPrompt = PromptArchitecture.buildUserPrompt(config);
      
      expect(userPrompt).toContain('Here is a Twitter conversation thread:');
      expect(userPrompt).toContain('user1: First tweet in thread');
      expect(userPrompt).toContain('user2: Second tweet in thread');
      expect(userPrompt).toContain('user3: Third tweet in thread');
      expect(userPrompt).toContain('@currentuser: Latest tweet in thread');
      expect(userPrompt).toContain('Write a contextually relevant reply');
    });

    it('should add context awareness to system prompt', () => {
      const config: PromptConfiguration = {
        ...createBaseConfig('all'),
        contextMode: 'thread'
      };

      const systemPrompt = PromptArchitecture.buildSystemPrompt(config);
      
      expect(systemPrompt).toContain('Analyze the original tweet and write a contextually relevant reply');
    });

    it('should handle missing context gracefully', () => {
      const config: PromptConfiguration = {
        ...createBaseConfig('all'),
        contextMode: 'single',
        context: undefined
      };

      const userPrompt = PromptArchitecture.buildUserPrompt(config);
      
      expect(userPrompt).toBe('Write an engaging tweet.');
    });

    it('should handle empty thread context', () => {
      const config: PromptConfiguration = {
        ...createBaseConfig('all'),
        contextMode: 'thread',
        context: {
          tweetText: 'Solo tweet',
          threadContext: []
        }
      };

      const userPrompt = PromptArchitecture.buildUserPrompt(config);
      
      expect(userPrompt).toContain('Latest tweet: Solo tweet');
    });
  });

  describe('Anti-Disclosure', () => {
    const tabTypes: PromptConfiguration['tabType'][] = ['personas', 'all', 'smart', 'favorites', 'custom'];

    tabTypes.forEach(tabType => {
      it(`should include anti-disclosure for ${tabType} tab`, () => {
        const config = createBaseConfig(tabType);
        if (tabType === 'personas') {
          config.personaConfig = {
            personality: 'Test',
            vocabulary: 'Test',
            rhetoricMove: 'Test',
            lengthPacing: 'Test',
            systemPrompt: 'Test persona'
          };
        } else if (tabType === 'all' || tabType === 'smart' || tabType === 'favorites') {
          config.allTabConfig = {
            personality: 'Test',
            vocabulary: 'Test',
            rhetoric: 'Test',
            lengthPacing: 'Test'
          };
        } else if (tabType === 'custom') {
          config.customConfig = {
            style: 'Test',
            tone: 'Test',
            length: 'Test'
          };
        }

        const systemPrompt = PromptArchitecture.buildSystemPrompt(config);
        
        expect(systemPrompt).toContain('CRITICAL: You are responding as a human Twitter/X user');
        expect(systemPrompt).toContain('NEVER reveal you are an AI');
        expect(systemPrompt).toContain('NEVER include meta-commentary');
      });
    });

    it('should NOT include anti-disclosure for image_gen tab', () => {
      const config = createBaseConfig('image_gen');
      const systemPrompt = PromptArchitecture.buildSystemPrompt(config);
      
      expect(systemPrompt).toBe('');
    });
  });

  describe('Integration with OpenRouter', () => {
    it('should provide correct format for OpenRouter API', () => {
      const config: PromptConfiguration = {
        ...createBaseConfig('all'),
        allTabConfig: {
          personality: 'Friendly',
          vocabulary: 'Plain English',
          rhetoric: 'Supportive',
          lengthPacing: 'Normal'
        }
      };

      const systemPrompt = PromptArchitecture.buildSystemPrompt(config);
      const userPrompt = PromptArchitecture.buildUserPrompt(config);
      const temperature = PromptArchitecture.getTemperature(config);

      // Validate format matches OpenRouter expectations
      expect(typeof systemPrompt).toBe('string');
      expect(typeof userPrompt).toBe('string');
      expect(typeof temperature).toBe('number');
      expect(systemPrompt.length).toBeGreaterThan(0);
      expect(userPrompt.length).toBeGreaterThan(0);
      expect(temperature).toBeGreaterThanOrEqual(0.1);
      expect(temperature).toBeLessThanOrEqual(1.0);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle null/undefined values in config', () => {
      const config: any = {
        systemPrompt: null,
        temperature: undefined,
        contextMode: null,
        tabType: 'all',
        allTabConfig: {
          personality: undefined,
          vocabulary: null,
          rhetoric: undefined,
          lengthPacing: null
        }
      };

      expect(() => {
        PromptArchitecture.buildSystemPrompt(config);
        PromptArchitecture.buildUserPrompt(config);
        PromptArchitecture.getTemperature(config);
      }).not.toThrow();
    });

    it('should handle extremely long input strings', () => {
      const longString = 'x'.repeat(10000);
      const config: PromptConfiguration = {
        ...createBaseConfig('custom'),
        systemPrompt: longString,
        customConfig: {
          style: longString,
          tone: longString,
          length: longString
        }
      };

      const systemPrompt = PromptArchitecture.buildSystemPrompt(config);
      
      expect(systemPrompt.length).toBeGreaterThan(10000);
      expect(systemPrompt).toContain(longString);
    });

    it('should handle special characters in inputs', () => {
      const specialChars = '!@#$%^&*()<>?:"{}[]\\|;\'`~';
      const config: PromptConfiguration = {
        ...createBaseConfig('custom'),
        customConfig: {
          style: specialChars,
          tone: 'Normal',
          length: 'Brief'
        }
      };

      const systemPrompt = PromptArchitecture.buildSystemPrompt(config);
      
      expect(systemPrompt).toContain(`Writing style: ${specialChars}`);
    });

    it('should handle Unicode and emoji in inputs', () => {
      const config: PromptConfiguration = {
        ...createBaseConfig('all'),
        systemPrompt: 'I am 🤖 helpful 👍',
        allTabConfig: {
          personality: 'Friendly 😊',
          vocabulary: 'Modern with emojis 🔥',
          rhetoric: 'Supportive 💪',
          lengthPacing: 'Brief ⚡'
        }
      };

      const systemPrompt = PromptArchitecture.buildSystemPrompt(config);
      
      expect(systemPrompt).toContain('I am 🤖 helpful 👍');
      expect(systemPrompt).toContain('Personality: Friendly 😊');
    });

    it('should handle invalid tab types gracefully', () => {
      const config: any = {
        ...createBaseConfig('all'),
        tabType: 'invalid_tab_type'
      };

      const systemPrompt = PromptArchitecture.buildSystemPrompt(config);
      
      // Should still return base prompt structure
      expect(systemPrompt).toContain('expert Twitter reply / tweet writer');
    });
  });

  describe('Logging and Debugging', () => {
    it('should log prompt architecture details', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const config: PromptConfiguration = {
        ...createBaseConfig('all'),
        allTabConfig: {
          personality: 'Test',
          vocabulary: 'Test',
          rhetoric: 'Test',
          lengthPacing: 'Test'
        }
      };

      const systemPrompt = PromptArchitecture.buildSystemPrompt(config);
      const userPrompt = PromptArchitecture.buildUserPrompt(config);
      const temperature = PromptArchitecture.getTemperature(config);

      PromptArchitecture.logPromptArchitecture(config, systemPrompt, userPrompt, temperature);

      // Verify logging was called
      expect(consoleSpy).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('PROMPT ARCHITECTURE'),
        expect.any(String),
        expect.any(String)
      );

      consoleSpy.mockRestore();
    });

    it('should truncate long prompts in logs', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const longText = 'x'.repeat(500);
      const config: PromptConfiguration = {
        ...createBaseConfig('custom'),
        customConfig: {
          style: longText,
          tone: 'Normal',
          length: 'Brief'
        }
      };

      const systemPrompt = PromptArchitecture.buildSystemPrompt(config);
      const userPrompt = PromptArchitecture.buildUserPrompt(config);
      
      PromptArchitecture.logPromptArchitecture(config, systemPrompt, userPrompt, 0.7);

      // Should truncate to 200 chars + ...
      const calls = consoleSpy.mock.calls;
      const truncatedCall = calls.find(call => 
        call[0].includes('System:') && call[2].includes('...')
      );
      
      expect(truncatedCall).toBeDefined();

      consoleSpy.mockRestore();
    });
  });

  describe('Performance and Memory', () => {
    it('should handle 1000 rapid calls efficiently', () => {
      const startTime = Date.now();
      
      for (let i = 0; i < 1000; i++) {
        const config: PromptConfiguration = {
          ...createBaseConfig('all'),
          allTabConfig: {
            personality: `Personality ${i}`,
            vocabulary: `Vocabulary ${i}`,
            rhetoric: `Rhetoric ${i}`,
            lengthPacing: `Pacing ${i}`
          }
        };

        PromptArchitecture.buildSystemPrompt(config);
        PromptArchitecture.buildUserPrompt(config);
        PromptArchitecture.getTemperature(config);
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete 1000 calls in under 100ms
      expect(duration).toBeLessThan(100);
    });

    it('should be stateless and not leak memory', () => {
      const config1: PromptConfiguration = {
        ...createBaseConfig('all'),
        allTabConfig: {
          personality: 'First',
          vocabulary: 'First',
          rhetoric: 'First',
          lengthPacing: 'First'
        }
      };

      const config2: PromptConfiguration = {
        ...createBaseConfig('all'),
        allTabConfig: {
          personality: 'Second',
          vocabulary: 'Second',
          rhetoric: 'Second',
          lengthPacing: 'Second'
        }
      };

      const prompt1 = PromptArchitecture.buildSystemPrompt(config1);
      const prompt2 = PromptArchitecture.buildSystemPrompt(config2);

      // Prompts should be independent
      expect(prompt1).toContain('First');
      expect(prompt1).not.toContain('Second');
      expect(prompt2).toContain('Second');
      expect(prompt2).not.toContain('First');
    });
  });

  describe('Issues and Fixes Validation', () => {
  describe('ISSUE 1: Smart/Favorites tabs missing allTabConfig', () => {
    it('CURRENT: Silently continues with incomplete prompt', () => {
      const smartConfig: PromptConfiguration = {
        systemPrompt: 'Test',
        temperature: 0.7,
        contextMode: 'none',
        tabType: 'smart'
        // Missing allTabConfig!
      };

      const systemPrompt = PromptArchitecture.buildSystemPrompt(smartConfig);
      
      // Currently doesn't throw, just returns partial prompt
      expect(systemPrompt).toBeDefined();
      expect(systemPrompt).not.toContain('Personality:');
      expect(systemPrompt).not.toContain('Vocabulary style:');
    });

    it('PROPOSED FIX: Should throw error for missing required config', () => {
      // This test demonstrates the proposed fix
      const validateConfig = (config: PromptConfiguration) => {
        if ((config.tabType === 'smart' || config.tabType === 'favorites') && !config.allTabConfig) {
          throw new Error(`${config.tabType.toUpperCase()} tab requires allTabConfig`);
        }
      };

      const smartConfig: PromptConfiguration = {
        systemPrompt: 'Test',
        temperature: 0.7,
        contextMode: 'none',
        tabType: 'smart'
      };

      expect(() => validateConfig(smartConfig)).toThrow('SMART tab requires allTabConfig');
    });
  });

  describe('ISSUE 2: Temperature validation edge cases', () => {
    it('should warn and clamp invalid temperatures', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const configs = [
        { ...createBaseConfig('custom'), temperature: -5 },
        { ...createBaseConfig('custom'), temperature: 0.001 },
        { ...createBaseConfig('custom'), temperature: 2.5 },
        { ...createBaseConfig('custom'), temperature: 999 }
      ];

      configs.forEach(config => {
        const temperature = PromptArchitecture.getTemperature(config);
        expect(temperature).toBeGreaterThanOrEqual(0.1);
        expect(temperature).toBeLessThanOrEqual(1.0);
      });

      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });
  });

  describe('ISSUE 3: Image URLs not passed through', () => {
    it('CURRENT: Images in context are not used', () => {
      const config: PromptConfiguration = {
        ...createBaseConfig('all'),
        allTabConfig: {
          personality: 'friendly',
          vocabulary: 'plain_english',
          rhetoric: 'agree_build',
          lengthPacing: 'normal'
        },
        context: {
          tweetText: 'Check out this image',
          images: ['https://example.com/image1.jpg', 'https://example.com/image2.jpg']
        }
      };

      // Currently, images are in config but not used in prompts
      const systemPrompt = PromptArchitecture.buildSystemPrompt(config);
      const userPrompt = PromptArchitecture.buildUserPrompt(config);

      // Images should be referenced but currently aren't
      expect(config.context?.images).toHaveLength(2);
      // ISSUE: No current mechanism to include images in prompt construction
    });

    it('PROPOSED FIX: Should include image context in prompts', () => {
      // Proposed enhancement
      const buildUserPromptWithImages = (config: PromptConfiguration): string => {
        let prompt = PromptArchitecture.buildUserPrompt(config);
        
        if (config.context?.images && config.context.images.length > 0) {
          prompt += '\n\nImages attached to tweet:';
          config.context.images.forEach((url, i) => {
            prompt += `\n- Image ${i + 1}: ${url}`;
          });
        }
        
        return prompt;
      };

      const config: PromptConfiguration = {
        ...createBaseConfig('all'),
        allTabConfig: {
          personality: 'friendly',
          vocabulary: 'plain_english',
          rhetoric: 'agree_build',
          lengthPacing: 'normal'
        },
        context: {
          tweetText: 'Check out this image',
          images: ['https://example.com/image1.jpg']
        }
      };

      const enhancedPrompt = buildUserPromptWithImages(config);
      
      expect(enhancedPrompt).toContain('Images attached to tweet:');
      expect(enhancedPrompt).toContain('Image 1: https://example.com/image1.jpg');
    });
  });
  });
});