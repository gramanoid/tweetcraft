import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { LLMService } from '../../llm/index';
import { GenerationOptions, ControlSettings } from '../../types';
import { AnalysisEngine } from '../../analysis/index';
import { existsSync } from 'fs';

export const generateCommand = new Command('generate')
  .description('Generate viral Twitter content')
  .option('-s, --style <style>', 'Style: confrontational, supportive, humorous, professional, casual')
  .option('-t, --tone <tone>', 'Tone: aggressive, friendly, neutral, sarcastic, authoritative')
  .option('-l, --length <number>', 'Target character length', '250')
  .option('--topic <topic>', 'Topic to write about')
  .option('--reply-to <text>', 'Generate as a reply to this text')
  .option('--variations <number>', 'Number of variations to generate', '1')
  .option('--with-analysis <csv>', 'Use CSV analysis for context')
  .option('--psychology <trigger>', 'Apply psychological trigger (scarcity, controversy, etc.)')
  .option('--audience <audience>', 'Target audience')
  .option('--min-length <number>', 'Minimum character length')
  .option('--max-length <number>', 'Maximum character length', '280')
  .option('--required-words <words>', 'Comma-separated required keywords')
  .option('--banned-words <words>', 'Comma-separated banned words')
  .option('--predict', 'Predict virality score')
  .action(async (options) => {
    const spinner = ora('Generating content...').start();
    
    try {
      const llm = new LLMService();
      
      // Build generation options
      const genOptions: GenerationOptions = {
        style: options.style as any,
        tone: options.tone as any,
        length: parseInt(options.length),
        topic: options.topic,
        replyTo: options.replyTo,
      };
      
      // Build control settings
      const controls: ControlSettings = {
        minLength: options.minLength ? parseInt(options.minLength) : undefined,
        maxLength: parseInt(options.maxLength),
        requiredKeywords: options.requiredWords?.split(',').map((w: string) => w.trim()),
        bannedWords: options.bannedWords?.split(',').map((w: string) => w.trim()),
      };
      
      // Load analysis context if provided
      let context;
      if (options.withAnalysis && existsSync(options.withAnalysis)) {
        spinner.text = 'Loading analysis context...';
        const engine = new AnalysisEngine();
        context = await engine.analyzeTwitterData(options.withAnalysis);
      }
      
      // Generate content
      spinner.text = 'Generating viral content...';
      
      let results;
      if (options.psychology && options.audience) {
        results = [await llm.generateWithPsychology(
          options.psychology,
          options.audience,
          genOptions
        )];
      } else if (parseInt(options.variations) > 1) {
        // Generate base then variations
        const base = await llm.generateContent(genOptions, controls, context);
        const variations = await llm.generateVariations(base.text, parseInt(options.variations) - 1);
        results = [base, ...variations];
      } else {
        results = [await llm.generateContent(genOptions, controls, context)];
      }
      
      spinner.succeed('Content generated!');
      
      // Display results
      console.log(chalk.cyan('\n=== Generated Content ===\n'));
      
      for (let i = 0; i < results.length; i++) {
        const content = results[i];
        
        if (results.length > 1) {
          console.log(chalk.yellow(`\nVariation ${i + 1}:`));
        }
        
        console.log(chalk.white.bgBlue(' Tweet: '));
        console.log(chalk.white(content.text));
        console.log(chalk.gray(`Length: ${content.text.length} characters`));
        
        if (content.confidence) {
          console.log(chalk.green(`Confidence: ${(content.confidence * 100).toFixed(0)}%`));
        }
        
        if (content.reasoning && options.verbose) {
          console.log(chalk.gray(`Reasoning: ${content.reasoning}`));
        }
        
        // Predict virality if requested
        if (options.predict) {
          spinner.start('Analyzing viral potential...');
          const prediction = await llm.predictVirality(content.text);
          spinner.stop();
          
          console.log(chalk.yellow(`\nViral Score: ${prediction.score}/10`));
          if (prediction.improvements.length > 0) {
            console.log(chalk.gray('Suggested improvements:'));
            prediction.improvements.forEach((imp: string) => {
              console.log(`  - ${imp}`);
            });
          }
        }
        
        console.log(chalk.gray('\n' + '─'.repeat(50)));
      }
      
    } catch (error: any) {
      spinner.fail('Generation failed');
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });