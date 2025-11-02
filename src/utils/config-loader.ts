import { readFileSync } from 'fs';
import { load } from 'js-yaml';
import { IndexConfig, validateConfig } from '../types/config.js';
import { logger } from './logger.js';

export class ConfigLoader {
  private config: IndexConfig | null = null;

  /**
   * Load configuration from a YAML file
   * @param configPath Path to the YAML config file
   * @returns Parsed and validated configuration
   */
  loadFromFile(configPath: string): IndexConfig {
    try {
      logger.info(`Loading configuration from: ${configPath}`);
      
      const fileContents = readFileSync(configPath, 'utf8');
      const config = load(fileContents) as any;
      
      // Validate the configuration
      if (validateConfig(config)) {
        this.config = config;
        logger.info('Configuration loaded and validated successfully', {
          server: config.server.name,
          version: config.server.version,
          toolCount: config.tools.length
        });
        return config;
      }
      
      throw new Error('Configuration validation failed');
    } catch (error) {
      logger.error('Failed to load configuration', { error, configPath });
      throw new Error(`Failed to load config from ${configPath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Load configuration from environment variable or default path
   * @returns Parsed and validated configuration
   */
  loadFromEnvironment(): IndexConfig {
    const configPath = process.env.INDEX_CONFIG_PATH || './config.yaml';
    return this.loadFromFile(configPath);
  }

  /**
   * Get the currently loaded configuration
   * @returns Current configuration or null if not loaded
   */
  getConfig(): IndexConfig | null {
    return this.config;
  }

  /**
   * Check if a tool is enabled in the configuration
   * @param toolName Name of the tool to check
   * @returns True if the tool is enabled, false otherwise
   */
  isToolEnabled(toolName: string): boolean {
    if (!this.config) {
      return false;
    }
    
    const tool = this.config.tools.find(t => t.name === toolName);
    return tool ? (tool.enabled !== false) : false;
  }

  /**
   * Get enabled tools from the configuration
   * @returns Array of enabled tool configurations
   */
  getEnabledTools() {
    if (!this.config) {
      return [];
    }
    
    return this.config.tools.filter(tool => tool.enabled !== false);
  }
}

// Singleton instance
export const configLoader = new ConfigLoader();