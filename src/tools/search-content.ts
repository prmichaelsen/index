import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { SearchContentArgs, SearchContentResult } from '../types/mcp.js';
import { WeaviateClientWrapper } from '../weaviate/client.js';
import { logger } from '../utils/logger.js';
import { CONTENT_TYPES } from '../types/content-types.js';

export class SearchContentTool {
  constructor(private weaviateClient: WeaviateClientWrapper) {}

  getToolDefinition(): Tool {
    return {
      name: 'search_content',
      description: `Universal semantic search across all indexed content types.

Args:
    query: Search query string for semantic or keyword matching
    filters: Optional search filters object
        contentType: Array of content types to search (${JSON.stringify([...CONTENT_TYPES])})
        fileExtension: Array of file extensions to filter by (e.g., ['.ts', '.js'])
        dateRange: Date range filter with 'after' and 'before' ISO date strings
        project: Project name to filter by
        tags: Array of tags to filter by
        priority: Priority level filter ('low', 'medium', 'high')
        status: Status filter string
        language: Programming language filter
        hasText: Boolean to filter images that have extracted text
        visualSimilarity: Boolean to enable visual similarity search for images
        referenceImage: Reference image for similarity search
    limit: Maximum number of results to return (1-100, default: 10)
    offset: Pagination offset (default: 0)

Returns:
    SearchContentResult object containing:
        results: Array of search results with content, metadata, and relevance scores
        total: Total number of results found
        query: Original search query
        filters: Applied filters
        executionTime: Search execution time in milliseconds

Raises:
    Exception: If there is an error performing the search or connecting to Weaviate`,
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search query string'
          },
          filters: {
            type: 'object',
            properties: {
              contentType: {
                type: 'array',
                items: {
                  type: 'string',
                  enum: CONTENT_TYPES
                },
                description: 'Filter by content types'
              },
              fileExtension: {
                type: 'array',
                items: { type: 'string' },
                description: 'Filter by file extensions'
              },
              dateRange: {
                type: 'object',
                properties: {
                  after: { type: 'string', description: 'ISO date string' },
                  before: { type: 'string', description: 'ISO date string' }
                },
                description: 'Filter by date range'
              },
              project: {
                type: 'string',
                description: 'Filter by project name'
              },
              tags: {
                type: 'array',
                items: { type: 'string' },
                description: 'Filter by tags'
              },
              priority: {
                type: 'string',
                enum: ['low', 'medium', 'high'],
                description: 'Filter by priority level'
              },
              status: {
                type: 'string',
                description: 'Filter by status'
              },
              language: {
                type: 'string',
                description: 'Filter by programming language'
              },
              hasText: {
                type: 'boolean',
                description: 'Filter images that have extracted text'
              },
              visualSimilarity: {
                type: 'boolean',
                description: 'Enable visual similarity search for images'
              },
              referenceImage: {
                type: 'string',
                description: 'Reference image for similarity search'
              }
            },
            description: 'Search filters'
          },
          limit: {
            type: 'number',
            minimum: 1,
            maximum: 100,
            default: 10,
            description: 'Maximum number of results'
          },
          offset: {
            type: 'number',
            minimum: 0,
            default: 0,
            description: 'Pagination offset'
          }
        },
        required: ['query']
      }
    };
  }

  async execute(args: any): Promise<any> {
    const startTime = Date.now();
    
    try {
      logger.info('Executing search_content', { query: args.query, filters: args.filters });

      // Use args directly without validation - LLM-driven system
      const query = args.query || '';
      const filters = args.filters || {};
      const limit = args.limit || 10;
      const offset = args.offset || 0;

      // Perform search using Weaviate client
      const searchResult = await this.weaviateClient.searchDocuments(
        query,
        filters,
        limit,
        offset
      );

      // Transform Weaviate results to our format
      const results = searchResult.data.Get.Document?.map((doc: any) => ({
        id: doc._additional.id,
        content: doc.content || '',
        metadata: {
          contentType: doc.contentType || 'unknown',
          title: doc.title,
          description: doc.description,
          filePath: doc.filePath,
          fileExtension: doc.fileExtension,
          project: doc.project,
          tags: doc.tags || [],
          priority: doc.priority,
          status: doc.status,
          language: doc.language,
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt,
          author: doc.author,
          extractedText: doc.extractedText,
          detectedObjects: doc.detectedObjects || [],
          imageType: doc.imageType,
          dimensions: doc.dimensions
        },
        relevanceScore: doc._additional.score || doc._additional.distance || 0,
        highlights: [] // TODO: Implement highlighting
      })) || [];

      const executionTime = Date.now() - startTime;

      const result = {
        results,
        total: results.length,
        query: query,
        filters: filters,
        executionTime
      };

      logger.info('Search completed', {
        resultCount: results.length,
        executionTime: `${executionTime}ms`
      });

      return result;

    } catch (error) {
      const executionTime = Date.now() - startTime;
      logger.error('Search failed', { error, executionTime: `${executionTime}ms` });
      
      throw new Error(`Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}