import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { LLMService } from '../../llm/index';
import { GenerationOptions, ControlSettings } from '../../types';
import { AnalysisEngine } from '../../analysis/index';
import { existsSync } from 'fs';

export const batchCsvCommand = new Command('csv')
  .description('Generate tweets in Excel-ready CSV format (A1 downwards)')
  .option('-n, --number <number>', 'Number of tweets to generate', '20')
  .option('--topics <topics>', 'Comma-separated list of topics')
  .option('--with-analysis <csv>', 'Use CSV analysis for context')
  .option('--style <style>', 'Preferred style (confrontational, humorous, professional)', 'confrontational')
  .option('--min-length <number>', 'Minimum character length', '50')
  .option('--max-length <number>', 'Maximum character length', '280')
  .option('--no-emojis', 'Remove emojis from output (for compatibility)')
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
      
      // Define topics based on your best performers
      const topics = options.topics 
        ? options.topics.split(',').map((t: string) => t.trim())
        : ['AI', 'technology', 'startups', 'coding', 'productivity', 'crypto', 'innovation'];
      
      // Use your best performing styles
      const styles = ['confrontational', 'sarcastic'];
      const tones = ['sarcastic', 'aggressive', 'authoritative'];
      
      // Generate varied lengths like your viral posts
      const lengths = [];
      for (let i = 0; i < count; i++) {
        if (i < count / 3) {
          lengths.push(Math.floor(Math.random() * 100) + 80); // Short (80-180)
        } else if (i < (count * 2) / 3) {
          lengths.push(Math.floor(Math.random() * 80) + 180); // Medium (180-260)
        } else {
          lengths.push(Math.floor(Math.random() * 20) + 260); // Long (260-280)
        }
      }
      
      const tweets = [];
      
      spinner.text = `Generating ${count} tweets...`;
      
      for (let i = 0; i < count; i++) {
        spinner.text = `Generating tweet ${i + 1}/${count}...`;
        
        const topic = topics[Math.floor(Math.random() * topics.length)];
        const style = options.style || styles[Math.floor(Math.random() * styles.length)];
        const tone = tones[Math.floor(Math.random() * tones.length)];
        const targetLength = lengths[i];
        
        // 30% chance to generate a reply (your best performer)
        const isReply = Math.random() < 0.3;
        
        const genOptions: GenerationOptions = {
          style: style as any,
          tone: tone as any,
          length: targetLength,
          topic: topic,
          replyTo: isReply ? `Popular opinion about ${topic}` : undefined,
        };
        
        const controls: ControlSettings = {
          minLength: Math.max(parseInt(options.minLength), targetLength - 30),
          maxLength: Math.min(parseInt(options.maxLength), targetLength + 30),
        };
        
        try {
          const result = await llm.generateContent(genOptions, controls, context);
          
          // Clean the text for CSV (remove newlines, escape quotes)
          let cleanText = result.text
            .replace(/\n/g, ' ')
            .replace(/\r/g, ' ')
            .replace(/"/g, '""')
            .trim();
          
          // Remove emojis if requested (for Excel compatibility)
          if (options.noEmojis === false) {
            // Remove common emoji ranges
            cleanText = cleanText.replace(/[\u{1F600}-\u{1F64F}]/gu, ''); // Emoticons
            cleanText = cleanText.replace(/[\u{1F300}-\u{1F5FF}]/gu, ''); // Misc symbols
            cleanText = cleanText.replace(/[\u{1F680}-\u{1F6FF}]/gu, ''); // Transport
            cleanText = cleanText.replace(/[\u{2600}-\u{26FF}]/gu, '');   // Misc symbols
            cleanText = cleanText.replace(/[\u{2700}-\u{27BF}]/gu, '');   // Dingbats
            cleanText = cleanText.replace(/[\u{1F900}-\u{1F9FF}]/gu, ''); // Supplemental
            cleanText = cleanText.replace(/[\u{1F1E0}-\u{1F1FF}]/gu, ''); // Flags
          }
          
          tweets.push(cleanText);
          
          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error: any) {
          console.error(chalk.yellow(`\nFailed to generate tweet ${i + 1}: ${error.message}`));
          tweets.push(''); // Add empty cell on failure
        }
      }
      
      spinner.succeed(`Generated ${tweets.filter(t => t).length} tweets!`);
      
      // Create timestamp for filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const filename = `tweets_${timestamp}.csv`;
      const filepath = join('output', filename);
      
      // Create CSV with one tweet per row, starting from A1
      // Add BOM for proper UTF-8 encoding in Excel
      const BOM = '\ufeff';
      let csvContent = BOM;
      tweets.forEach((tweet, index) => {
        // Each tweet in quotes, one per line
        csvContent += `"${tweet}"\n`;
      });
      
      writeFileSync(filepath, csvContent, { encoding: 'utf-8' });
      
      // Display summary
      console.log(chalk.cyan('\n=== Generation Complete ===\n'));
      console.log(`Total tweets: ${chalk.green(tweets.filter(t => t).length)}`);
      console.log(`CSV file: ${chalk.green(filepath)}`);
      console.log(chalk.gray(`Format: One tweet per row, starting from A1`));
      
      // Show first 3 tweets as preview
      console.log(chalk.cyan('\n=== Preview (first 3 tweets) ===\n'));
      tweets.slice(0, 3).forEach((tweet, i) => {
        if (tweet) {
          console.log(chalk.yellow(`Row ${i + 1}:`));
          console.log(chalk.white(tweet.substring(0, 100) + (tweet.length > 100 ? '...' : '')));
          console.log();
        }
      });
      
      console.log(chalk.green(`\n✅ Ready to paste into Excel/Google Sheets!`));
      console.log(chalk.gray(`Open ${filepath} and copy column A`));
      
    } catch (error: any) {
      spinner.fail('Generation failed');
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });