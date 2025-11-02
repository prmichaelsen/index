#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { config } from 'dotenv';
import { WeaviateClientWrapper } from './weaviate/client.js';
import { WeaviateConfig } from './types/weaviate.js';
import { ToolFactory } from './tools/tool-factory.js';
import { configLoader } from './utils/config-loader.js';
import { logger } from './utils/logger.js';

// Load environment variables
config();

class WeaviateMCPServer {
  private server: Server;
  private weaviateClient: WeaviateClientWrapper;
  private tools: any[];
  private toolMap: Map<string, any>;

  constructor() {
    // Load configuration
    const indexConfig = configLoader.loadFromEnvironment();

    // Initialize server with config
    this.server = new Server(
      {
        name: indexConfig.server.name,
        version: indexConfig.server.version,
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Initialize Weaviate client with config
    const weaviateConfig: WeaviateConfig = {
      url: process.env.WEAVIATE_URL || indexConfig.weaviate.url,
      apiKey: process.env.WEAVIATE_API_KEY || indexConfig.weaviate.apiKey,
      timeout: indexConfig.weaviate.timeout || 30000,
      retries: indexConfig.weaviate.retries || 3,
      openaiApiKey: process.env.OPENAI_APIKEY || indexConfig.weaviate.openaiApiKey
    };

    this.weaviateClient = new WeaviateClientWrapper(weaviateConfig, indexConfig.schema);

    // Create tools from configuration
    const toolFactory = new ToolFactory(this.weaviateClient, indexConfig.shared);
    this.tools = toolFactory.createTools(indexConfig.tools);
    
    // Create tool map for quick lookup
    this.toolMap = new Map();
    for (const tool of this.tools) {
      const definition = tool.getToolDefinition();
      this.toolMap.set(definition.name, tool);
    }

    this.setupHandlers();
  }

  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: this.tools.map(tool => tool.getToolDefinition()),
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        const tool = this.toolMap.get(name);
        if (!tool) {
          throw new Error(`Unknown tool: ${name}`);
        }

        const result = await tool.execute(args as any);

        // Check if the tool returned an error response
        if (result.error) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
            isError: true,
          };
        }

        // Normal successful response
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        logger.error(`Tool execution failed for ${name}:`, error);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: error instanceof Error ? error.message : 'Unknown error',
                tool: name
              }, null, 2),
            },
          ],
          isError: true,
        };
      }
    });
  }

  async start(): Promise<void> {
    try {
      // Write startup info to a log file for debugging
      const fs = await import('fs');
      const logPath = '/tmp/index-mcp-server.log';
      const log = (msg: string) => {
        const timestamp = new Date().toISOString();
        fs.appendFileSync(logPath, `[${timestamp}] ${msg}\n`);
      };

      log('Starting Index MCP Server...');
      log(`Config path: ${process.env.INDEX_CONFIG_PATH || './config.yaml'}`);
      log(`Weaviate URL: ${process.env.WEAVIATE_URL || 'from config'}`);

      // Start MCP server with stdio transport first
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      log('MCP transport connected');

      // Try to connect to Weaviate (non-blocking)
      try {
        log('Attempting to connect to Weaviate...');
        await this.weaviateClient.connect();
        log('Connected to Weaviate successfully');
        
        // Ensure schema exists
        log('Ensuring schema exists...');
        await this.weaviateClient.ensureSchema();
        log('Schema ready');
      } catch (weaviateError) {
        // Log error but don't fail - server can still start
        log(`Weaviate connection failed: ${weaviateError instanceof Error ? weaviateError.message : 'Unknown error'}`);
        log('Server will continue running, but tools will fail until Weaviate is available');
        // Tools will handle the connection error gracefully
      }

      log('Index MCP Server started successfully');

    } catch (error) {
      // Write error to log file
      const fs = await import('fs');
      const logPath = '/tmp/index-mcp-server.log';
      const errorMsg = `FATAL ERROR: ${error instanceof Error ? error.message : 'Unknown error'}\n${error instanceof Error ? error.stack : ''}`;
      fs.appendFileSync(logPath, `[${new Date().toISOString()}] ${errorMsg}\n`);
      process.exit(1);
    }
  }

  async stop(): Promise<void> {
    // Don't log when using stdio transport
    // logger.info('Stopping Weaviate MCP Server...');
    await this.server.close();
    // logger.info('Server stopped');
  }
}

// Handle graceful shutdown
const server = new WeaviateMCPServer();

process.on('SIGINT', async () => {
  await server.stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await server.stop();
  process.exit(0);
});

// Start the server
server.start().catch((error) => {
  // Don't log to stderr when using stdio transport
  // logger.error('Server startup failed:', error);
  process.exit(1);
});