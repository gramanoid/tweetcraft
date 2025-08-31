import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { LLMService } from '../../llm/index';

export const testCommand = new Command('test')
  .description('Test connection to OpenRouter API')
  .action(async () => {
    const spinner = ora('Testing OpenRouter connection...').start();
    
    try {
      const llm = new LLMService();
      const success = await llm.testConnection();
      
      if (success) {
        spinner.succeed('Connection successful!');
        console.log(chalk.green('✓ OpenRouter API is working'));
        console.log(chalk.gray('You can now use bulkcraft to generate viral content'));
      } else {
        spinner.fail('Connection test failed');
        console.log(chalk.red('✗ Could not connect to OpenRouter API'));
        console.log(chalk.yellow('Please check your API key in .env file'));
      }
    } catch (error: any) {
      spinner.fail('Connection test failed');
      console.error(chalk.red('Error:'), error.message);
      console.log(chalk.yellow('\nTroubleshooting:'));
      console.log('1. Check that OPENROUTER_API_KEY is set in .env file');
      console.log('2. Verify your API key is valid at https://openrouter.ai');
      console.log('3. Check your internet connection');
      process.exit(1);
    }
  });