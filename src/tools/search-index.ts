import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { WeaviateClientWrapper } from '../weaviate/client.js';
import { SharedDefinitions } from '../types/config.js';
import { SchemaBuilder } from '../utils/schema-builder.js';
import { logger } from '../utils/logger.js';
import { serializeError } from '../utils/error-serializer.js';

export class SearchIndexTool {
  private schemaBuilder: SchemaBuilder;

  constructor(
    private weaviateClient: WeaviateClientWrapper,
    sharedDefinitions?: SharedDefinitions
  ) {
    this.schemaBuilder = new SchemaBuilder(sharedDefinitions);
  }

  getToolDefinition(): Tool {
    const filtersSchema = this.schemaBuilder.buildFiltersSchema();
    
    return {
      name: 'search_index',
      description: `Universal search combining semantic (vector) and keyword (BM25) matching for optimal results.

When to Use Hybrid Search?
Hybrid search queries are ideal for a search system that wants to leverage the power of semantic search capabilities but still rely on exact keyword matches. For example, the example search query "How to catch an Alaskan Pollock" from before would lead to better results with a hybrid search query than with a common keyword search or even a semantic search query.

Advantages of Hybrid Search
Hybrid search engines bring several advantages that make it a powerful approach for modern search systems, especially when both semantic understanding and exact keyword matching are essential. This dual approach excels in handling diverse user queries, whether they are domain-specific queries requiring exact matches or semantic queries that rely on context and meaning. For instance, in scenarios where users might include ambiguous phrases, domain-specific terms, or misspellings in their queries, hybrid search ensures relevant results by understanding the query's intent while still honoring exact matches for critical keywords.

In addition to its flexibility, hybrid search significantly improves the user experience by reducing the need for perfectly phrased queries. Dense vector embeddings capture the semantic meaning behind a search query, making it easier to handle multi-concept or even multilingual queries. Its ability to seamlessly integrate semantic relationships with precise keyword matches ensures more accurate and contextually relevant outcomes.

This makes hybrid search engines an ideal choice for applications in e-commerce, customer support, and other search-driven domains.

Args:
    query: Search query string for both semantic and keyword matching
    alpha: Balance between vector and keyword search (0.0 = pure keyword, 1.0 = pure semantic, 0.7 = balanced, default: 0.7)
    filters: Optional search filters object
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
          filters: filtersSchema,
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
      logger.info('Executing search_index', { query: args.query, alpha: args.alpha });

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

      logger.info('Search completed', {
        resultCount: results.length,
        executionTime: `${executionTime}ms`,
        alpha: alpha
      });

      return result;

    } catch (error) {
      const executionTime = Date.now() - startTime;
      logger.error('Search failed', { error, executionTime: `${executionTime}ms` });
      
      return {
        results: [],
        total: 0,
        query: args.query || '',
        alpha: args.alpha !== undefined ? args.alpha : 0.7,
        filters: args.filters || {},
        executionTime,
        error: true,
        errorDetails: serializeError(error)
      };
    }
  }
}