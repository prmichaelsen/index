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
import { SearchContentTool } from './tools/search-content.js';
import { AddDocumentTool } from './tools/add-document.js';
import { UpdateDocumentTool } from './tools/update-document.js';
import { DeleteDocumentTool } from './tools/delete-document.js';
import { HybridSearchTool } from './tools/hybrid-search.js';
import { GetSimilarTool } from './tools/get-similar.js';
import { RagQueryTool } from './tools/rag-query.js';
import { QueryAgentTool } from './tools/query-agent.js';
import { logger } from './utils/logger.js';

// Load environment variables
config();

class WeaviateMCPServer {
  private server: Server;
  private weaviateClient: WeaviateClientWrapper;
  private searchContentTool: SearchContentTool;
  private addDocumentTool: AddDocumentTool;
  private updateDocumentTool: UpdateDocumentTool;
  private deleteDocumentTool: DeleteDocumentTool;
  private hybridSearchTool: HybridSearchTool;
  private getSimilarTool: GetSimilarTool;
  private ragQueryTool: RagQueryTool;
  private queryAgentTool: QueryAgentTool;

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
    this.searchContentTool = new SearchContentTool(this.weaviateClient);
    this.addDocumentTool = new AddDocumentTool(this.weaviateClient);
    this.updateDocumentTool = new UpdateDocumentTool(this.weaviateClient);
    this.deleteDocumentTool = new DeleteDocumentTool(this.weaviateClient);
    this.hybridSearchTool = new HybridSearchTool(this.weaviateClient);
    this.getSimilarTool = new GetSimilarTool(this.weaviateClient);
    this.ragQueryTool = new RagQueryTool(this.weaviateClient);
    this.queryAgentTool = new QueryAgentTool(this.weaviateClient);

    this.setupHandlers();
  }

  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          this.searchContentTool.getToolDefinition(),
          this.addDocumentTool.getToolDefinition(),
          this.updateDocumentTool.getToolDefinition(),
          this.deleteDocumentTool.getToolDefinition(),
          this.hybridSearchTool.getToolDefinition(),
          this.getSimilarTool.getToolDefinition(),
          this.ragQueryTool.getToolDefinition(),
          this.queryAgentTool.getToolDefinition()
        ],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'search_content':
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(await this.searchContentTool.execute(args as any), null, 2),
                },
              ],
            };

          case 'add_document':
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(await this.addDocumentTool.execute(args as any), null, 2),
                },
              ],
            };

          case 'update_document':
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(await this.updateDocumentTool.execute(args as any), null, 2),
                },
              ],
            };

          case 'delete_document':
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(await this.deleteDocumentTool.execute(args as any), null, 2),
                },
              ],
            };

          case 'hybrid_search':
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(await this.hybridSearchTool.execute(args as any), null, 2),
                },
              ],
            };

          case 'get_similar':
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(await this.getSimilarTool.execute(args as any), null, 2),
                },
              ],
            };

          case 'rag_query':
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(await this.ragQueryTool.execute(args as any), null, 2),
                },
              ],
            };

          case 'query_agent':
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(await this.queryAgentTool.execute(args as any), null, 2),
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