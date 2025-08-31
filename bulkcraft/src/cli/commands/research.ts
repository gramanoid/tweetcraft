import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { LLMService } from '../../llm/index';

export const researchCommand = new Command('research')
  .description('Research trends and competitors')
  .option('--trends <topic>', 'Research trending topics')
  .option('--competitor <account>', 'Analyze competitor account')
  .option('--depth <number>', 'Analysis depth', '10')
  .option('--hooks <topic>', 'Generate viral hooks for topic')
  .option('--style <style>', 'Style for hooks generation')
  .action(async (options) => {
    if (!options.trends && !options.competitor && !options.hooks) {
      console.error(chalk.red('Please specify --trends, --competitor, or --hooks'));
      process.exit(1);
    }
    
    const spinner = ora('Researching...').start();
    
    try {
      const llm = new LLMService();
      
      if (options.trends) {
        spinner.text = `Researching trends for "${options.trends}"...`;
        const research = await llm.researchTrends(options.trends, parseInt(options.depth));
        spinner.succeed('Trend research complete!');
        
        console.log(chalk.cyan('\n=== Trending Topics ===\n'));
        research.trendingTopics.forEach((topic, i) => {
          console.log(`${i + 1}. ${chalk.yellow(topic.topic)}`);
          console.log(`   Volume: ${topic.volume.toLocaleString()} | Growth: ${topic.growth.toFixed(1)}%`);
          console.log(`   Sentiment: ${topic.sentiment}`);
        });
        
        if (research.viralPatterns.length > 0) {
          console.log(chalk.cyan('\n=== Viral Patterns ===\n'));
          research.viralPatterns.forEach(pattern => {
            console.log(`- ${chalk.yellow(pattern.type)}: ${pattern.description}`);
            console.log(`  Trigger: ${chalk.green(pattern.psychologicalTrigger)}`);
          });
        }
        
        if (research.recommendations.length > 0) {
          console.log(chalk.cyan('\n=== Recommendations ===\n'));
          research.recommendations.forEach(rec => {
            console.log(`• ${rec}`);
          });
        }
      }
      
      if (options.competitor) {
        spinner.text = `Analyzing @${options.competitor}...`;
        const research = await llm.analyzeCompetitor(
          options.competitor.replace('@', ''), 
          parseInt(options.depth)
        );
        spinner.succeed('Competitor analysis complete!');
        
        console.log(chalk.cyan(`\n=== @${options.competitor} Analysis ===\n`));
        
        if (research.competitorInsights.length > 0) {
          research.competitorInsights.forEach(insight => {
            console.log(chalk.yellow(`Account: @${insight.account}`));
            console.log(`Engagement Rate: ${(insight.engagementRate * 100).toFixed(2)}%`);
            console.log(`Posting Frequency: ${insight.postingFrequency} posts/day`);
            console.log('Success Patterns:');
            insight.successPatterns.forEach(pattern => {
              console.log(`  - ${pattern}`);
            });
          });
        }
        
        if (research.recommendations.length > 0) {
          console.log(chalk.cyan('\nStrategic Insights:'));
          research.recommendations.forEach(rec => {
            console.log(`• ${rec}`);
          });
        }
      }
      
      if (options.hooks) {
        const style = options.style || 'engaging';
        spinner.text = `Generating hooks for "${options.hooks}"...`;
        const hooks = await llm.generateHooks(options.hooks, style);
        spinner.succeed('Hooks generated!');
        
        console.log(chalk.cyan(`\n=== Viral Hooks for "${options.hooks}" ===\n`));
        hooks.forEach((hook, i) => {
          console.log(`${i + 1}. ${chalk.yellow(hook)}`);
        });
      }
      
    } catch (error: any) {
      spinner.fail('Research failed');
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });