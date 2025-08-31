import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { LLMService } from '../../llm/index';
import { GenerationOptions, ControlSettings } from '../../types';
import { AnalysisEngine } from '../../analysis/index';
import { existsSync } from 'fs';

export const batchGenerateCommand = new Command('batch')
  .description('Generate multiple tweets and save to file')
  .option('-n, --number <number>', 'Number of tweets to generate', '10')
  .option('--topics <topics>', 'Comma-separated list of topics')
  .option('--with-analysis <csv>', 'Use CSV analysis for context')
  .option('--min-length <number>', 'Minimum character length', '50')
  .option('--max-length <number>', 'Maximum character length', '280')
  .option('--mixed-styles', 'Use various styles (confrontational, humorous, professional)')
  .option('--replies', 'Generate replies to trending topics')
  .option('--output-format <format>', 'Output format: json, csv, or txt', 'json')
  .action(async (options) => {
    const spinner = ora('Preparing batch generation...').start();
    
    try {
      const llm = new LLMService();
      const count = parseInt(options.number);
      
      // Load analysis context if provided
      let context;
      if (options.withAnalysis && existsSync(options.withAnalysis)) {
        spinner.text = 'Loading analysis context...';
        const engine = new AnalysisEngine();
        context = await engine.analyzeTwitterData(options.withAnalysis);
      }
      
      // Define topics
      const topics = options.topics 
        ? options.topics.split(',').map((t: string) => t.trim())
        : ['AI', 'technology', 'startups', 'coding', 'productivity', 'future', 'innovation'];
      
      // Define styles
      const styles = options.mixedStyles
        ? ['confrontational', 'humorous', 'professional', 'casual', 'supportive']
        : ['confrontational', 'sarcastic']; // Your best performing styles
      
      // Define tones
      const tones = ['sarcastic', 'authoritative', 'friendly', 'neutral', 'aggressive'];
      
      // Generate length variations
      const lengths = [];
      const minLen = parseInt(options.minLength);
      const maxLen = parseInt(options.maxLength);
      for (let i = 0; i < count; i++) {
        // Create varied lengths: some short (50-150), medium (150-250), long (250-280)
        if (i < count / 3) {
          lengths.push(Math.floor(Math.random() * 100) + 50); // Short
        } else if (i < (count * 2) / 3) {
          lengths.push(Math.floor(Math.random() * 100) + 150); // Medium
        } else {
          lengths.push(Math.floor(Math.random() * 30) + 250); // Long
        }
      }
      
      const tweets = [];
      
      spinner.text = `Generating ${count} tweets...`;
      
      for (let i = 0; i < count; i++) {
        spinner.text = `Generating tweet ${i + 1}/${count}...`;
        
        const topic = topics[Math.floor(Math.random() * topics.length)];
        const style = styles[Math.floor(Math.random() * styles.length)];
        const tone = tones[Math.floor(Math.random() * tones.length)];
        const targetLength = lengths[i];
        
        const genOptions: GenerationOptions = {
          style: style as any,
          tone: tone as any,
          length: targetLength,
          topic: topic,
        };
        
        const controls: ControlSettings = {
          minLength: Math.max(minLen, targetLength - 20),
          maxLength: Math.min(maxLen, targetLength + 20),
        };
        
        try {
          const result = await llm.generateContent(genOptions, controls, context);
          
          tweets.push({
            id: i + 1,
            text: result.text,
            length: result.text.length,
            topic: topic,
            style: style,
            tone: tone,
            targetLength: targetLength,
            confidence: result.confidence,
            timestamp: new Date().toISOString(),
          });
          
          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error: any) {
          console.error(chalk.yellow(`\nFailed to generate tweet ${i + 1}: ${error.message}`));
        }
      }
      
      spinner.succeed(`Generated ${tweets.length} tweets!`);
      
      // Create timestamp for filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const filename = `tweets_${timestamp}.${options.outputFormat}`;
      const filepath = join('output', filename);
      
      // Format and save output
      let output = '';
      
      if (options.outputFormat === 'json') {
        output = JSON.stringify(tweets, null, 2);
      } else if (options.outputFormat === 'csv') {
        output = 'ID,Text,Length,Topic,Style,Tone,Confidence,Timestamp\n';
        tweets.forEach(tweet => {
          output += `${tweet.id},"${tweet.text.replace(/"/g, '""')}",${tweet.length},${tweet.topic},${tweet.style},${tweet.tone},${tweet.confidence},${tweet.timestamp}\n`;
        });
      } else {
        // txt format
        tweets.forEach(tweet => {
          output += `=== Tweet #${tweet.id} ===\n`;
          output += `Topic: ${tweet.topic} | Style: ${tweet.style} | Tone: ${tweet.tone}\n`;
          output += `Length: ${tweet.length} chars (target: ${tweet.targetLength})\n`;
          output += `Text: ${tweet.text}\n`;
          output += `Confidence: ${(tweet.confidence * 100).toFixed(0)}%\n`;
          output += `Generated: ${tweet.timestamp}\n`;
          output += '\n';
        });
      }
      
      writeFileSync(filepath, output);
      
      // Display summary
      console.log(chalk.cyan('\n=== Generation Summary ===\n'));
      console.log(`Total tweets generated: ${chalk.green(tweets.length)}`);
      console.log(`Average length: ${chalk.green(Math.round(tweets.reduce((sum, t) => sum + t.length, 0) / tweets.length))} characters`);
      console.log(`File saved: ${chalk.green(filepath)}`);
      
      // Show sample tweets
      console.log(chalk.cyan('\n=== Sample Tweets ===\n'));
      const samples = tweets.slice(0, 3);
      samples.forEach(tweet => {
        console.log(chalk.yellow(`#${tweet.id} (${tweet.length} chars, ${tweet.style}/${tweet.tone}):`));
        console.log(chalk.white(tweet.text));
        console.log();
      });
      
      console.log(chalk.gray(`View all ${tweets.length} tweets in: ${filepath}`));
      
    } catch (error: any) {
      spinner.fail('Batch generation failed');
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });