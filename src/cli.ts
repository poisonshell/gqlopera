#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { DocGenerator } from './generator';
import { ConfigManager } from './config';
import { logger } from './utils/logger';
import packageJson from '../package.json';

const program = new Command();

program
  .name('gqlopera')
  .description('Extract individual GraphQL operation files from GraphQL APIs')
  .version(packageJson.version);

program
  .command('generate')
  .aliases(['gen', 'g'])
  .description('Extract individual GraphQL operation files from GraphQL endpoint')
  .option('-c, --config <path>', 'Path to config file', 'gqlopera.config.json')
  .option('-e, --endpoint <url>', 'GraphQL endpoint URL')
  .option('-o, --output <path>', 'Output directory', 'graphql')
  .option('-h, --headers <headers>', 'HTTP headers as JSON string')
  .option('--watch', 'Watch for schema changes and regenerate')
  .option('--verbose', 'Enable verbose logging')
  .option('--max-depth <number>', 'Maximum depth for field expansion', '5')
  .option('--max-fields <number>', 'Maximum fields per type', '50')
  .option('--shallow', 'Enable shallow mode (maxDepth=1)')
  .option('--include-fields <fields>', 'Comma-separated list of fields to include')
  .option('--exclude-fields <fields>', 'Comma-separated list of fields to exclude')
  .option('--circular-ref-depth <number>', 'Depth limit for circular references', '1')
  .option('--circular-refs <mode>', 'Circular reference handling: skip, silent, or allow', 'skip')
  .action(async (options) => {
    try {
      if (options.verbose) {
        logger.setLevel('debug');
      }

      logger.info(chalk.blue('🚀 GraphQL Schema Generator'));
      
      const configManager = new ConfigManager();
      const config = await configManager.loadConfig(options.config, options);
      
      const generator = new DocGenerator(config);
      await generator.generate();
      
      if (options.watch) {
        logger.info(chalk.yellow('👀 Watching for changes...'));
        await generator.watch();
      }
    } catch (error) {
      logger.error(chalk.red('❌ Error:'), error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program
  .command('init')
  .description('Initialize a new JSON configuration file')
  .action(async () => {
    try {
      const configManager = new ConfigManager();
      await configManager.initConfig();
      logger.success(chalk.green('✅ Configuration file created!'));
    } catch (error) {
      logger.error(chalk.red('❌ Error:'), error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program
  .command('validate')
  .description('Validate GraphQL endpoint and configuration')
  .option('-c, --config <path>', 'Path to config file', 'gqlopera.config.json')
  .action(async (options) => {
    try {
      const configManager = new ConfigManager();
      const config = await configManager.loadConfig(options.config);
      
      logger.info(chalk.blue('🔍 Validating configuration and endpoint...'));
      
      const generator = new DocGenerator(config);
      await generator.validate();
      
      logger.success(chalk.green('✅ Validation successful!'));
    } catch (error) {
      logger.error(chalk.red('❌ Validation failed:'), error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program.parse(); 