import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { existsSync } from 'fs';
import { AnalysisEngine } from '../../analysis/index';

export const analyzeCommand = new Command('analyze')
  .description('Analyze Twitter export CSV for content patterns')
  .argument('<csv-file>', 'Path to Twitter analytics CSV file')
  .option('-o, --output <file>', 'Output analysis to JSON file')
  .option('-v, --verbose', 'Show detailed analysis')
  .option('--viral-only', 'Focus only on viral content (top 10%)')
  .action(async (csvFile: string, options) => {
    if (!existsSync(csvFile)) {
      console.error(chalk.red(`File not found: ${csvFile}`));
      process.exit(1);
    }

    const spinner = ora('Analyzing Twitter data...').start();
    
    try {
      const engine = new AnalysisEngine();
      const analysis = await engine.analyzeTwitterData(csvFile);
      
      spinner.succeed('Analysis complete!');
      
      // Display results
      console.log(chalk.cyan('\n=== Analysis Results ===\n'));
      
      console.log(chalk.yellow('Top Performing Posts:'));
      analysis.topPosts.slice(0, 5).forEach((post, i) => {
        console.log(`${i + 1}. ${chalk.gray(post.text.substring(0, 80))}...`);
        console.log(`   ${chalk.green(`${post.impressions.toLocaleString()} impressions`)} | ${chalk.blue(`${post.likes} likes`)} | ${chalk.magenta(`${post.replies} replies`)}`);
      });
      
      console.log(chalk.yellow('\nContent Patterns:'));
      analysis.contentPatterns.forEach(pattern => {
        console.log(`- ${pattern.pattern}: ${chalk.green(`${(pattern.averageEngagement * 100).toFixed(1)}% engagement`)}`);
      });
      
      console.log(chalk.yellow('\nBest Performing Topics:'));
      analysis.bestPerformingTopics.forEach(topic => {
        console.log(`- ${topic}`);
      });
      
      console.log(chalk.yellow('\nOptimal Posting:'));
      console.log(`- Length: ${chalk.green(`~${analysis.optimalLength} characters`)}`);
      console.log(`- Best times: ${chalk.green(analysis.bestPostingTimes.join(', '))}`);
      console.log(`- Avg engagement: ${chalk.green(`${(analysis.averageEngagementRate * 100).toFixed(2)}%`)}`);
      
      if (options.verbose) {
        console.log(chalk.yellow('\nViral Formula:'));
        const viralFormula = await engine.getViralFormula(csvFile);
        console.log(chalk.cyan(viralFormula.formula));
        console.log('\nComponents:');
        viralFormula.components.forEach(c => console.log(`  - ${c}`));
      }
      
      if (options.output) {
        const { writeFileSync } = await import('fs');
        writeFileSync(options.output, JSON.stringify(analysis, null, 2));
        console.log(chalk.green(`\nAnalysis saved to ${options.output}`));
      }
      
    } catch (error: any) {
      spinner.fail('Analysis failed');
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });