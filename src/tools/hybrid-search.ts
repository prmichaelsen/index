import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { WeaviateClientWrapper } from '../weaviate/client.js';
import { logger } from '../utils/logger.js';
import { CONTENT_TYPES, CONTENT_TYPES_DESCRIPTION } from '../types/content-types.js';

export class HybridSearchTool {
  constructor(private weaviateClient: WeaviateClientWrapper) {}

  getToolDefinition(): Tool {
    return {
      name: 'hybrid_search',
      description: `Enhanced search combining semantic (vector) and keyword (BM25) matching for optimal results.

Use this tool when you need both conceptual understanding AND precise term matching. 
Differs from search_content by adding keyword matching to semantic search for better precision.

Args:
    query: Search query string for both semantic and keyword matching
    alpha: Balance between vector and keyword search (0.0 = pure keyword, 1.0 = pure semantic, 0.7 = balanced, default: 0.7)
    filters: Optional search filters object (same as search_content)
        contentType: Array of content types to search. ${CONTENT_TYPES_DESCRIPTION}
        fileExtension: Array of file extensions to filter by
        dateRange: Date range filter with 'after' and 'before' ISO date strings
        project: Project name to filter by
        tags: Array of tags to filter by
        priority: Priority level filter ('low', 'medium', 'high')
        status: Status filter string
        language: Programming language filter
    limit: Maximum number of results to return (1-100, default: 10)
    offset: Pagination offset (default: 0)

Returns:
    HybridSearchResult object containing:
        results: Array of search results with both semantic and keyword relevance scores
        total: Total number of results found
        query: Original search query
        alpha: Alpha value used for search balance
        filters: Applied filters
        executionTime: Search execution time in milliseconds

Raises:
    Exception: If there is an error performing the hybrid search or connecting to Weaviate`,
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search query string'
          },
          alpha: {
            type: 'number',
            minimum: 0.0,
            maximum: 1.0,
            default: 0.7,
            description: 'Balance between vector (1.0) and keyword (0.0) search'
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
      logger.info('Executing hybrid_search', { query: args.query, alpha: args.alpha });

      const query = args.query || '';
      const alpha = args.alpha !== undefined ? args.alpha : 0.7;
      const filters = args.filters || {};
      const limit = args.limit || 10;
      const offset = args.offset || 0;

      // Perform hybrid search using Weaviate client
      const searchResult = await this.weaviateClient.hybridSearch(
        query,
        filters,
        limit,
        offset,
        alpha
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
        hybridScore: {
          vector: doc._additional.score || 0,
          keyword: doc._additional.distance || 0,
          combined: doc._additional.score || doc._additional.distance || 0
        }
      })) || [];

      const executionTime = Date.now() - startTime;

      const result = {
        results,
        total: results.length,
        query: query,
        alpha: alpha,
        filters: filters,
        executionTime
      };

      logger.info('Hybrid search completed', { 
        resultCount: results.length, 
        executionTime: `${executionTime}ms`,
        alpha: alpha
      });

      return result;

    } catch (error) {
      const executionTime = Date.now() - startTime;
      logger.error('Hybrid search failed', { error, executionTime: `${executionTime}ms` });
      
      throw new Error(`Hybrid search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}