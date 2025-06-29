import * as fs from 'fs-extra';
import * as path from 'path';
import Joi from 'joi';
import { DocGenConfig } from './types';
import { logger } from './utils/logger';

const configSchema = Joi.object({
  endpoint: Joi.string().uri().required(),
  output: Joi.string().default('graphql'),
  headers: Joi.object().pattern(Joi.string(), Joi.string()).optional(),
  excludeTypes: Joi.array().items(Joi.string()).optional(),
  watch: Joi.boolean().default(false),
  maxDepth: Joi.number().integer().min(1).max(10).default(5),
  maxFields: Joi.number().integer().min(5).max(100).default(50),
  skipCircularRefs: Joi.boolean().default(true),
});

export class ConfigManager {
  async loadConfig(configPath?: string, cliOptions?: any): Promise<DocGenConfig> {
    let config: Partial<DocGenConfig> = {};

    if (configPath) {
      config = await this.loadConfigFile(configPath);
    }

    if (cliOptions) {
      if (cliOptions.endpoint) config.endpoint = cliOptions.endpoint;
      if (cliOptions.output && cliOptions.output !== 'graphql') config.output = cliOptions.output;
      if (cliOptions.headers) {
        try {
          config.headers = JSON.parse(cliOptions.headers);
        } catch (error) {
          throw new Error('Invalid JSON format for headers');
        }
      }
      if (cliOptions.watch) config.watch = cliOptions.watch;
    }

    const { error, value } = configSchema.validate(config, { 
      allowUnknown: false,
      stripUnknown: true 
    });

    if (error) {
      throw new Error(`Configuration validation failed: ${error.details[0].message}`);
    }

    return value as DocGenConfig;
  }

  private async loadConfigFile(configPath: string): Promise<Partial<DocGenConfig>> {
    const fullPath = path.resolve(configPath);
    
    if (!await fs.pathExists(fullPath)) {
      logger.warn(`Config file not found: ${fullPath}`);
      return {};
    }

    if (!configPath.endsWith('.json')) {
      throw new Error('Only JSON configuration files are supported. Use .json extension.');
    }

    const content = await fs.readFile(fullPath, 'utf-8');

    try {
      return JSON.parse(content);
    } catch (error) {
      throw new Error(`Failed to parse JSON config file: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async initConfig(): Promise<void> {
    const config = {
      endpoint: 'http://localhost:4000/graphql',
      output: 'graphql',
      headers: {
        // 'Authorization': 'Bearer YOUR_TOKEN_HERE'
      },
      maxDepth: 5,
      maxFields: 50,
      skipCircularRefs: true
    };

    const fileName = 'gqlopera.config.json';
    const filePath = path.resolve(fileName);

    if (await fs.pathExists(filePath)) {
      logger.warn(`Configuration file already exists: ${fileName}`);
      return;
    }

    const content = JSON.stringify(config, null, 2);
    await fs.writeFile(filePath, content);
    logger.success(`Configuration file created: ${fileName}`);
  }
} 