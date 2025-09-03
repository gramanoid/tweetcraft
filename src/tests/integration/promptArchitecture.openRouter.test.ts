/**
 * Integration Tests for PromptArchitecture and OpenRouter Services
 * Validates end-to-end prompt construction and API communication
 */

import { PromptArchitecture, PromptConfiguration } from '../../services/promptArchitecture';
import { PromptConfigValidator } from '../../utils/promptConfigValidator';

// Mock OpenRouter service methods
const mockOpenRouterCall = (systemPrompt: string, userPrompt: string, temperature: number) => {
  // Simulate OpenRouter API call structure
  return {
    model: 'gpt-4',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature,
    max_tokens: 300
  };
};

describe('PromptArchitecture + OpenRouter Integration', () => {
  
  describe('End-to-End Prompt Flow', () => {
    
    it('should construct valid API request for ALL tab', () => {
      const config: PromptConfiguration = {
        systemPrompt: 'I am a helpful assistant',
        temperature: 0.7,
        contextMode: 'single',
        tabType: 'all',
        allTabConfig: {
          personality: 'Friendly and supportive',
          vocabulary: 'Plain English',
          rhetoric: 'Agree and build',
          lengthPacing: 'Normal reply'
        },
        context: {
          tweetText: 'Test tweet content',
          authorHandle: 'testuser'
        }
      };

      // Validate config first
      const validationResult = PromptConfigValidator.validate(config);
      expect(validationResult.isValid).toBe(true);
      
      // Build prompts
      const systemPrompt = PromptArchitecture.buildSystemPrompt(config);
      const userPrompt = PromptArchitecture.buildUserPrompt(config);
      const temperature = PromptArchitecture.getTemperature(config);
      
      // Simulate API call
      const apiRequest = mockOpenRouterCall(systemPrompt, userPrompt, temperature);
      
      // Validate API request structure
      expect(apiRequest.messages).toHaveLength(2);
      expect(apiRequest.messages[0].role).toBe('system');
      expect(apiRequest.messages[0].content).toContain('expert Twitter reply');
      expect(apiRequest.messages[0].content).toContain('Personality: Friendly and supportive');
      expect(apiRequest.messages[1].role).toBe('user');
      expect(apiRequest.messages[1].content).toContain('Test tweet content');
      expect(apiRequest.temperature).toBe(0.7);
    });

    it('should handle SMART tab with proper allTabConfig', () => {
      const config: PromptConfiguration = {
        systemPrompt: 'Smart suggestions mode',
        temperature: 0.8,
        contextMode: 'thread',
        tabType: 'smart',
        allTabConfig: {
          personality: 'Witty and clever',
          vocabulary: 'Internet slang',
          rhetoric: 'Hot take',
          lengthPacing: 'One-liner'
        },
        context: {
          tweetText: 'Main tweet',
          threadContext: [
            { author: 'user1', text: 'First tweet' },
            { author: 'user2', text: 'Reply tweet' }
          ]
        }
      };

      const validationResult = PromptConfigValidator.validate(config);
      expect(validationResult.isValid).toBe(true);
      
      const systemPrompt = PromptArchitecture.buildSystemPrompt(config);
      const userPrompt = PromptArchitecture.buildUserPrompt(config);
      
      const apiRequest = mockOpenRouterCall(systemPrompt, userPrompt, 0.8);
      
      // Verify thread context is included
      expect(apiRequest.messages[1].content).toContain('Twitter conversation thread');
      expect(apiRequest.messages[1].content).toContain('user1: First tweet');
      expect(apiRequest.messages[1].content).toContain('user2: Reply tweet');
    });

    it('should handle CUSTOM tab with temperature override', () => {
      const config: PromptConfiguration = {
        systemPrompt: 'System default',
        temperature: 0.5, // System temperature
        contextMode: 'none',
        tabType: 'custom',
        customConfig: {
          style: 'Write like Shakespeare',
          tone: 'Dramatic and poetic',
          length: 'Exactly 3 lines',
          temperature: 0.9 // Custom override
        }
      };

      const validationResult = PromptConfigValidator.validate(config);
      expect(validationResult.isValid).toBe(true);
      
      const systemPrompt = PromptArchitecture.buildSystemPrompt(config);
      const temperature = PromptArchitecture.getTemperature(config);
      
      // Should use custom temperature, not system
      expect(temperature).toBe(0.9);
      
      const apiRequest = mockOpenRouterCall(systemPrompt, 'Write an engaging tweet reply.', temperature);
      
      expect(apiRequest.messages[0].content).toContain('Write like Shakespeare');
      expect(apiRequest.messages[0].content).toContain('Dramatic and poetic');
      expect(apiRequest.temperature).toBe(0.9);
    });

    it('should handle image context for vision models', () => {
      const config: PromptConfiguration = {
        systemPrompt: 'Vision-enabled assistant',
        temperature: 0.7,
        contextMode: 'single',
        tabType: 'all',
        allTabConfig: {
          personality: 'Observant',
          vocabulary: 'Descriptive',
          rhetoric: 'Analytical',
          lengthPacing: 'Detailed'
        },
        context: {
          tweetText: 'Check out this photo!',
          images: [
            'https://example.com/image1.jpg',
            'https://example.com/image2.jpg'
          ]
        }
      };

      const validationResult = PromptConfigValidator.validate(config);
      expect(validationResult.isValid).toBe(true);
      
      const systemPrompt = PromptArchitecture.buildSystemPrompt(config);
      const userPrompt = PromptArchitecture.buildUserPrompt(config);
      
      // Verify images are included in user prompt
      expect(userPrompt).toContain('[Visual Context]');
      expect(userPrompt).toContain('Image 1: https://example.com/image1.jpg');
      expect(userPrompt).toContain('Image 2: https://example.com/image2.jpg');
      expect(userPrompt).toContain('Consider the visual content');
      
      // System prompt should mention image analysis
      expect(systemPrompt).toContain('If images accompany the tweet, analyze them thoroughly');
    });

    it('should validate and reject invalid configurations', () => {
      const invalidConfig: PromptConfiguration = {
        systemPrompt: 'Test',
        temperature: 0.7,
        contextMode: 'single',
        tabType: 'smart'
        // Missing required allTabConfig for SMART tab
      };

      const validationResult = PromptConfigValidator.validate(invalidConfig);
      expect(validationResult.isValid).toBe(false);
      expect(validationResult.errors).toContain('SMART tab requires allTabConfig');
      
      // Should throw when trying to build prompts
      expect(() => {
        PromptArchitecture.buildSystemPrompt(invalidConfig);
      }).toThrow('SMART tab requires allTabConfig');
    });

    it('should sanitize and apply defaults for incomplete configs', () => {
      const incompleteConfig: PromptConfiguration = {
        systemPrompt: '  Trimmed prompt  ',
        temperature: -1, // Invalid, should clamp
        contextMode: 'single',
        tabType: 'all',
        allTabConfig: {
          personality: 'Friendly',
          vocabulary: '', // Empty, should get default
          rhetoric: '  ', // Whitespace, should get default
          lengthPacing: undefined as any // Missing, should get default
        }
      };

      const sanitized = PromptConfigValidator.sanitizeOrThrow(incompleteConfig);
      
      expect(sanitized.systemPrompt).toBe('Trimmed prompt'); // Trimmed
      expect(sanitized.temperature).toBe(0.1); // Clamped to minimum
      expect(sanitized.allTabConfig?.vocabulary).toBe('Plain English with modern slang');
      expect(sanitized.allTabConfig?.rhetoric).toBe('Agree and build upon the original point');
      expect(sanitized.allTabConfig?.lengthPacing).toBe('Normal reply with 1-2 sentences');
      
      // Should work with sanitized config
      const systemPrompt = PromptArchitecture.buildSystemPrompt(sanitized);
      expect(systemPrompt).toContain('Vocabulary style: Plain English with modern slang');
    });
  });

  describe('Error Handling and Recovery', () => {
    
    it('should provide clear error messages for missing configs', () => {
      const configs = [
        { tabType: 'smart' as const, expectedError: 'SMART tab requires allTabConfig' },
        { tabType: 'favorites' as const, expectedError: 'FAVORITES tab requires allTabConfig' },
        { tabType: 'custom' as const, expectedError: 'CUSTOM tab requires customConfig' },
        { tabType: 'personas' as const, expectedError: 'PERSONAS tab requires personaConfig' }
      ];

      configs.forEach(({ tabType, expectedError }) => {
        const config: PromptConfiguration = {
          systemPrompt: 'Test',
          temperature: 0.7,
          contextMode: 'none',
          tabType
        };

        try {
          PromptArchitecture.buildSystemPrompt(config);
          fail('Should have thrown an error');
        } catch (error: any) {
          expect(error.message).toContain(expectedError);
        }
      });
    });

    it('should handle invalid tab types', () => {
      const config: any = {
        systemPrompt: 'Test',
        temperature: 0.7,
        contextMode: 'none',
        tabType: 'invalid_tab'
      };

      expect(() => {
        PromptArchitecture.buildSystemPrompt(config);
      }).toThrow('Invalid tab type "invalid_tab"');
    });

    it('should handle malformed context gracefully', () => {
      const config: PromptConfiguration = {
        systemPrompt: 'Test',
        temperature: 0.7,
        contextMode: 'thread',
        tabType: 'all',
        allTabConfig: {
          personality: 'Friendly',
          vocabulary: 'Plain',
          rhetoric: 'Supportive',
          lengthPacing: 'Normal'
        },
        context: {
          tweetText: null as any, // Invalid
          threadContext: [
            { author: 'user1', text: 'Valid' },
            { author: null as any, text: 'Invalid author' }, // Invalid
            { author: 'user3', text: null as any } // Invalid text
          ],
          images: [
            'valid.jpg',
            null as any, // Invalid
            '', // Empty
            '  ' // Whitespace
          ]
        }
      };

      const sanitized = PromptConfigValidator.sanitizeOrThrow(config);
      
      // Invalid entries should be filtered out
      expect(sanitized.context?.threadContext).toHaveLength(1);
      expect(sanitized.context?.threadContext?.[0].author).toBe('user1');
      expect(sanitized.context?.images).toHaveLength(1);
      expect(sanitized.context?.images?.[0]).toBe('valid.jpg');
    });
  });

  describe('Performance Considerations', () => {
    
    it('should handle rapid successive calls efficiently', () => {
      const configs: PromptConfiguration[] = Array(100).fill(null).map((_, i) => ({
        systemPrompt: `System ${i}`,
        temperature: 0.7,
        contextMode: 'single' as const,
        tabType: 'all' as const,
        allTabConfig: {
          personality: `Personality ${i}`,
          vocabulary: `Vocabulary ${i}`,
          rhetoric: `Rhetoric ${i}`,
          lengthPacing: `Pacing ${i}`
        }
      }));

      const startTime = Date.now();
      
      configs.forEach(config => {
        const systemPrompt = PromptArchitecture.buildSystemPrompt(config);
        const userPrompt = PromptArchitecture.buildUserPrompt(config);
        const temperature = PromptArchitecture.getTemperature(config);
        
        // Simulate API request construction
        mockOpenRouterCall(systemPrompt, userPrompt, temperature);
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should process 100 requests quickly
      expect(duration).toBeLessThan(200); // Less than 200ms for 100 requests
    });

    it('should use helper function for consistent ALL/SMART/FAVORITES handling', () => {
      const tabTypes: Array<'all' | 'smart' | 'favorites'> = ['all', 'smart', 'favorites'];
      const prompts: string[] = [];

      tabTypes.forEach(tabType => {
        const config: PromptConfiguration = {
          systemPrompt: 'Consistent system',
          temperature: 0.7,
          contextMode: 'none',
          tabType,
          allTabConfig: {
            personality: 'Same personality',
            vocabulary: 'Same vocabulary',
            rhetoric: 'Same rhetoric',
            lengthPacing: 'Same pacing'
          }
        };

        prompts.push(PromptArchitecture.buildSystemPrompt(config));
      });

      // All three tabs should produce identical system prompts
      expect(prompts[0]).toBe(prompts[1]);
      expect(prompts[1]).toBe(prompts[2]);
    });
  });

  describe('OpenRouter API Compatibility', () => {
    
    it('should format prompts for OpenRouter API structure', () => {
      const config: PromptConfiguration = {
        systemPrompt: 'OpenRouter compatible',
        temperature: 0.7,
        contextMode: 'single',
        tabType: 'all',
        allTabConfig: {
          personality: 'Professional',
          vocabulary: 'Formal',
          rhetoric: 'Analytical',
          lengthPacing: 'Detailed'
        },
        context: {
          tweetText: 'Testing API compatibility'
        }
      };

      const systemPrompt = PromptArchitecture.buildSystemPrompt(config);
      const userPrompt = PromptArchitecture.buildUserPrompt(config);
      const temperature = PromptArchitecture.getTemperature(config);

      // Simulate OpenRouter request structure
      const openRouterRequest = {
        model: 'openai/gpt-4',
        messages: [
          { role: 'system' as const, content: systemPrompt },
          { role: 'user' as const, content: userPrompt }
        ],
        temperature,
        max_tokens: 300,
        stream: false
      };

      // Validate request structure matches OpenRouter expectations
      expect(openRouterRequest.messages).toBeDefined();
      expect(openRouterRequest.messages[0].role).toBe('system');
      expect(openRouterRequest.messages[1].role).toBe('user');
      expect(typeof openRouterRequest.temperature).toBe('number');
      expect(openRouterRequest.temperature).toBeGreaterThanOrEqual(0.1);
      expect(openRouterRequest.temperature).toBeLessThanOrEqual(1.0);
      
      // System prompt should include anti-disclosure
      expect(systemPrompt).toContain('NEVER reveal you are an AI');
      expect(systemPrompt).toContain('expert Twitter reply');
    });
  });
});