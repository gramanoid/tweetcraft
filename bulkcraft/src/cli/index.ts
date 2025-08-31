#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { config } from '../config/index';
import { analyzeCommand } from './commands/analyze';
import { generateCommand } from './commands/generate';
import { researchCommand } from './commands/research';
import { testCommand } from './commands/test';
import { batchGenerateCommand } from './commands/batch-generate';
import { batchCsvCommand } from './commands/batch-csv';

const program = new Command();

program
  .name('bulkcraft')
  .description('AI-powered viral Twitter content generation and analysis tool')
  .version('0.1.0');

// Add commands
program.addCommand(analyzeCommand);
program.addCommand(generateCommand);
program.addCommand(researchCommand);
program.addCommand(testCommand);
program.addCommand(batchGenerateCommand);
program.addCommand(batchCsvCommand);

// Error handling
program.exitOverride();

async function main() {
  try {
    await program.parseAsync(process.argv);
  } catch (error: any) {
    if (error.code === 'commander.missingArgument') {
      console.error(chalk.red('Error: Missing required argument'));
    } else if (error.code === 'commander.unknownOption') {
      console.error(chalk.red('Error: Unknown option'));
    } else {
      console.error(chalk.red('Error:'), error.message);
    }
    process.exit(1);
  }
}

// Check for API key
if (!config.openrouter.apiKey) {
  console.error(chalk.red('Error: OPENROUTER_API_KEY not set in environment'));
  console.error(chalk.yellow('Please copy .env.example to .env and add your API key'));
  process.exit(1);
}

main();