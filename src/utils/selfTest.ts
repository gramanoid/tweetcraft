/**
 * Self-Test Utility for TweetCraft
 * Performs one-click health check of all system components
 */

import { MessageType } from '@/types/messages';

export interface TestResult {
  name: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: string;
}

export interface SelfTestResults {
  overall: 'pass' | 'fail' | 'warning';
  score: number; // 0-100
  tests: TestResult[];
  timestamp: number;
}

export class SelfTestService {
  /**
   * Run complete system health check
   */
  async runHealthCheck(): Promise<SelfTestResults> {
    console.log('%c🔍 Self-Test Started', 'color: #1DA1F2; font-weight: bold');
    const startTime = Date.now();

    const tests: TestResult[] = [];
    
    // Test 1: API Connection
    tests.push(await this.testOpenRouter());
    
    // Test 2: DOM Selectors
    tests.push(await this.testDOMSelectors());
    
    // Test 3: Storage
    tests.push(await this.testStorage());
    
    // Test 4: Extension Context
    tests.push(await this.testExtensionContext());
    
    // Test 5: Platform Compatibility
    tests.push(await this.testPlatformCompatibility());

    // Calculate overall score and status
    const passedTests = tests.filter(t => t.status === 'pass').length;
    const warningTests = tests.filter(t => t.status === 'warning').length;
    const failedTests = tests.filter(t => t.status === 'fail').length;
    
    const score = Math.round((passedTests / tests.length) * 100);
    
    let overall: 'pass' | 'fail' | 'warning';
    if (failedTests === 0 && warningTests === 0) {
      overall = 'pass';
    } else if (failedTests > 0) {
      overall = 'fail';
    } else {
      overall = 'warning';
    }

    const duration = Date.now() - startTime;
    console.log(`%c🔍 Self-Test Completed`, 'color: #17BF63; font-weight: bold', 
                `${duration}ms | Score: ${score}%`);

    return {
      overall,
      score,
      tests,
      timestamp: Date.now()
    };
  }

  /**
   * Test OpenRouter API connection
   */
  private async testOpenRouter(): Promise<TestResult> {
    try {
      const response = await chrome.runtime.sendMessage({
        type: MessageType.VALIDATE_API_KEY
      });

      if (response.success) {
        return {
          name: 'OpenRouter API',
          status: 'pass',
          message: 'API connection successful',
          details: `Model: ${response.model || 'unknown'}`
        };
      } else {
        return {
          name: 'OpenRouter API',
          status: 'fail',
          message: 'API validation failed',
          details: response.error || 'Unknown error'
        };
      }
    } catch (error) {
      return {
        name: 'OpenRouter API',
        status: 'fail',
        message: 'API test failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Test DOM selectors reliability
   */
  private async testDOMSelectors(): Promise<TestResult> {
    try {
      const selectors = [
        { name: 'Tweet Button', selector: '[data-testid*="tweet"], button[data-testid*="reply"]' },
        { name: 'Reply Textarea', selector: '[data-testid^="tweetTextarea_"][contenteditable="true"]' },
        { name: 'Toolbar', selector: '[role="group"], [data-testid*="toolbar"]' },
        { name: 'Tweet Text', selector: '[data-testid="tweetText"]' }
      ];

      const results = selectors.map(({ name, selector }) => {
        const elements = document.querySelectorAll(selector);
        return {
          name,
          found: elements.length,
          working: elements.length > 0
        };
      });

      const workingSelectors = results.filter(r => r.working).length;
      const totalSelectors = results.length;
      
      if (workingSelectors === totalSelectors) {
        return {
          name: 'DOM Selectors',
          status: 'pass',
          message: `All ${totalSelectors} selectors working`,
          details: results.map(r => `${r.name}: ${r.found} found`).join(', ')
        };
      } else if (workingSelectors >= totalSelectors / 2) {
        return {
          name: 'DOM Selectors',
          status: 'warning',
          message: `${workingSelectors}/${totalSelectors} selectors working`,
          details: results.filter(r => !r.working).map(r => `${r.name}: failed`).join(', ')
        };
      } else {
        return {
          name: 'DOM Selectors',
          status: 'fail',
          message: `Only ${workingSelectors}/${totalSelectors} selectors working`,
          details: 'Twitter may have updated their interface'
        };
      }
    } catch (error) {
      return {
        name: 'DOM Selectors',
        status: 'fail',
        message: 'Selector test failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Test storage functionality
   */
  private async testStorage(): Promise<TestResult> {
    try {
      const testKey = 'tweetcraft_self_test';
      const testValue = { timestamp: Date.now(), test: true };

      // Test write
      await chrome.storage.local.set({ [testKey]: testValue });
      
      // Test read
      const result = await chrome.storage.local.get([testKey]);
      const retrieved = result[testKey];
      
      // Verify data integrity
      if (retrieved && retrieved.timestamp === testValue.timestamp) {
        // Cleanup
        await chrome.storage.local.remove([testKey]);
        
        return {
          name: 'Storage',
          status: 'pass',
          message: 'Storage read/write successful',
          details: 'Chrome storage API working correctly'
        };
      } else {
        return {
          name: 'Storage',
          status: 'fail',
          message: 'Storage data corruption',
          details: 'Retrieved data does not match written data'
        };
      }
    } catch (error) {
      return {
        name: 'Storage',
        status: 'fail',
        message: 'Storage test failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Test extension context and service worker
   */
  private async testExtensionContext(): Promise<TestResult> {
    try {
      const startTime = Date.now();
      
      // Test service worker connection with proper message format
      const pingResponse = await chrome.runtime.sendMessage({
        type: MessageType.PING
      });

      if (pingResponse && pingResponse.success && pingResponse.data === 'pong') {
        return {
          name: 'Extension Context',
          status: 'pass',
          message: 'Service worker responsive',
          details: `Response time: ${Date.now() - startTime}ms`
        };
      } else {
        return {
          name: 'Extension Context',
          status: 'warning',
          message: 'Service worker not responding correctly',
          details: `Response: ${JSON.stringify(pingResponse)}`
        };
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('context invalidated')) {
        return {
          name: 'Extension Context',
          status: 'fail',
          message: 'Extension context invalidated',
          details: 'Please reload the extension from chrome://extensions'
        };
      }
      
      return {
        name: 'Extension Context',
        status: 'fail',
        message: 'Extension context test failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Test platform compatibility
   */
  private async testPlatformCompatibility(): Promise<TestResult> {
    try {
      const currentUrl = window.location.href;
      const supportedPlatforms = [
        { name: 'Twitter', pattern: /twitter\.com/ },
        { name: 'X.com', pattern: /x\.com/ },
        { name: 'HypeFury', pattern: /app\.hypefury\.com/ }
      ];

      const currentPlatform = supportedPlatforms.find(p => p.pattern.test(currentUrl));
      
      if (currentPlatform) {
        // Test platform-specific elements
        const platformTests = [
          document.querySelector('[role="main"]') !== null,
          document.querySelector('nav, header') !== null,
          document.querySelector('[data-testid], [class*="tweet"], [class*="post"]') !== null
        ];
        
        const workingTests = platformTests.filter(Boolean).length;
        
        if (workingTests === platformTests.length) {
          return {
            name: 'Platform Compatibility',
            status: 'pass',
            message: `Fully compatible with ${currentPlatform.name}`,
            details: `All ${platformTests.length} platform tests passed`
          };
        } else {
          return {
            name: 'Platform Compatibility',
            status: 'warning',
            message: `Partial compatibility with ${currentPlatform.name}`,
            details: `${workingTests}/${platformTests.length} platform tests passed`
          };
        }
      } else {
        return {
          name: 'Platform Compatibility',
          status: 'warning',
          message: 'Unknown platform',
          details: `Current URL: ${currentUrl.substring(0, 50)}... - Extension may not work properly`
        };
      }
    } catch (error) {
      return {
        name: 'Platform Compatibility',
        status: 'fail',
        message: 'Platform test failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Format test results for display
   */
  formatResults(results: SelfTestResults): string {
    const statusEmoji = {
      pass: '✅',
      warning: '⚠️',
      fail: '❌'
    };

    const overallEmoji = statusEmoji[results.overall];
    const scoreColor = results.score >= 80 ? '#17BF63' : results.score >= 60 ? '#FFA500' : '#DC3545';
    
    let output = `${overallEmoji} TweetCraft Health Check\n`;
    output += `Score: ${results.score}% (${results.tests.filter(t => t.status === 'pass').length}/${results.tests.length} tests passed)\n\n`;
    
    results.tests.forEach(test => {
      output += `${statusEmoji[test.status]} ${test.name}: ${test.message}\n`;
      if (test.details) {
        output += `   ${test.details}\n`;
      }
    });

    return output;
  }
}

// Export singleton instance
export const selfTest = new SelfTestService();