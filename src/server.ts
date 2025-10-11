#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { config } from 'dotenv';
import { createServer } from 'http';
import { WeaviateClientWrapper } from './weaviate/client.js';
import { WeaviateConfig } from './types/weaviate.js';
import { SearchIndexTool } from './tools/search-index.js';
import { IndexNewTool } from './tools/index-new.js';
import { IndexExistingTool } from './tools/index-existing.js';
import { UnindexTool } from './tools/unindex.js';
import { FindSimilarInIndexTool } from './tools/find-similar-in-index.js';
import { AskIndexTool } from './tools/ask-index.js';
import { logger } from './utils/logger.js';

// Load environment variables
config();

class WeaviateMCPServer {
  private server: Server;
  private weaviateClient: WeaviateClientWrapper;
  private searchIndexTool: SearchIndexTool;
  private indexNewTool: IndexNewTool;
  private indexExistingTool: IndexExistingTool;
  private unindexTool: UnindexTool;
  private findSimilarInIndexTool: FindSimilarInIndexTool;
  private askIndexTool: AskIndexTool;

  constructor() {
    // Initialize server
    this.server = new Server(
      {
        name: 'weaviate-mcp-server',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Initialize Weaviate client
    const weaviateConfig: WeaviateConfig = {
      url: process.env.WEAVIATE_URL || 'http://localhost:8080',
      apiKey: process.env.WEAVIATE_API_KEY,
      timeout: parseInt(process.env.WEAVIATE_TIMEOUT || '30000'),
      retries: parseInt(process.env.WEAVIATE_RETRIES || '3')
    };

    this.weaviateClient = new WeaviateClientWrapper(weaviateConfig);
    this.searchIndexTool = new SearchIndexTool(this.weaviateClient);
    this.indexNewTool = new IndexNewTool(this.weaviateClient);
    this.indexExistingTool = new IndexExistingTool(this.weaviateClient);
    this.unindexTool = new UnindexTool(this.weaviateClient);
    this.findSimilarInIndexTool = new FindSimilarInIndexTool(this.weaviateClient);
    this.askIndexTool = new AskIndexTool(this.weaviateClient);

    this.setupHandlers();
  }

  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          this.searchIndexTool.getToolDefinition(),
          this.indexNewTool.getToolDefinition(),
          this.indexExistingTool.getToolDefinition(),
          this.unindexTool.getToolDefinition(),
          this.findSimilarInIndexTool.getToolDefinition(),
          this.askIndexTool.getToolDefinition()
        ],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'search_index':
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(await this.searchIndexTool.execute(args as any), null, 2),
                },
              ],
            };

          case 'index_new':
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(await this.indexNewTool.execute(args as any), null, 2),
                },
              ],
            };

          case 'index_existing':
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(await this.indexExistingTool.execute(args as any), null, 2),
                },
              ],
            };

          case 'unindex':
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(await this.unindexTool.execute(args as any), null, 2),
                },
              ],
            };

          case 'find_similar_in_index':
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(await this.findSimilarInIndexTool.execute(args as any), null, 2),
                },
              ],
            };

          case 'ask_index':
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(await this.askIndexTool.execute(args as any), null, 2),
                },
              ],
            };

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
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
      logger.info('Starting Weaviate MCP Server...');

      // Connect to Weaviate
      await this.weaviateClient.connect();
      
      // Ensure schema exists
      await this.weaviateClient.ensureSchema();

      // Start MCP server with stdio transport
      const transport = new StdioServerTransport();
      await this.server.connect(transport);

      // Don't log to stdout/stderr when using stdio transport - it interferes with MCP JSON
      // logger.info('Weaviate MCP Server started successfully');
      // logger.info('Server capabilities:', {
      //   tools: ['search_content', 'add_document'],
      //   weaviateConnected: this.weaviateClient.isClientConnected()
      // });

    } catch (error) {
      // Don't log to stderr when using stdio transport
      // logger.error('Failed to start server:', error);
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