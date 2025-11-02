import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { WeaviateClientWrapper } from '../weaviate/client.js';
import { SharedDefinitions } from '../types/config.js';
import { SchemaBuilder } from '../utils/schema-builder.js';
import { logger } from '../utils/logger.js';
import { serializeError } from '../utils/error-serializer.js';

export class FindSimilarInIndexTool {
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
      name: 'find_similar_in_index',
      description: `Find content similar to a specific document or code snippet for content discovery.

Use this tool to discover related content, find code patterns, or locate similar implementations.
Differs from search tools by taking reference content instead of text queries.

Args:
    referenceContent: The content to find similar items for (document text, code snippet, etc.)
    referenceId: Optional Weaviate document ID to use as reference (alternative to referenceContent)
    similarityThreshold: Minimum similarity score (0.0-1.0, default: 0.7)
    filters: Optional search filters object
    limit: Maximum number of similar items to return (1-50, default: 10)

Returns:
    SimilarContentResult object containing:
        results: Array of similar content with similarity scores and metadata
        referenceContent: The content used as reference (truncated for display)
        referenceId: Document ID if used as reference
        similarityThreshold: Threshold used for filtering
        filters: Applied filters
        executionTime: Search execution time in milliseconds

Raises:
    Exception: If neither referenceContent nor referenceId is provided, or if there is an error finding similar content`,
      inputSchema: {
        type: 'object',
        properties: {
          referenceContent: {
            type: 'string',
            description: 'Content to find similar items for'
          },
          referenceId: {
            type: 'string',
            description: 'Weaviate document ID to use as reference'
          },
          similarityThreshold: {
            type: 'number',
            minimum: 0.0,
            maximum: 1.0,
            default: 0.7,
            description: 'Minimum similarity score'
          },
          filters: filtersSchema,
          limit: {
            type: 'number',
            minimum: 1,
            maximum: 50,
            default: 10,
            description: 'Maximum number of similar items'
          }
        }
      }
    };
  }

  async execute(args: any): Promise<any> {
    const startTime = Date.now();
    
    try {
      logger.info('Executing find_similar_in_index', {
        hasReferenceContent: !!args.referenceContent,
        referenceId: args.referenceId,
        threshold: args.similarityThreshold
      });

      // Validate that we have either reference content or reference ID
      if (!args.referenceContent && !args.referenceId) {
        const executionTime = Date.now() - startTime;
        const validationError = new Error('Either referenceContent or referenceId is required');
        return {
          results: [],
          referenceContent: undefined,
          referenceId: undefined,
          similarityThreshold: args.similarityThreshold || 0.7,
          filters: args.filters || {},
          executionTime,
          error: true,
          errorDetails: serializeError(validationError)
        };
      }

      const similarityThreshold = args.similarityThreshold || 0.7;
      const filters = args.filters || {};
      const limit = args.limit || 10;

      let searchResult;

      if (args.referenceId) {
        // Use existing document as reference
        searchResult = await this.weaviateClient.findSimilar(args.referenceId, limit);
      } else {
        // For reference content, we'd need to create a temporary embedding
        // This is a simplified implementation - in production, you'd want to:
        // 1. Create a temporary document with the reference content
        // 2. Use its vector for similarity search
        // 3. Clean up the temporary document
        const executionTime = Date.now() - startTime;
        const notImplementedError = new Error('Reference content similarity search not yet implemented - use referenceId instead');
        return {
          results: [],
          referenceContent: args.referenceContent?.substring(0, 200) + '...',
          referenceId: undefined,
          similarityThreshold: args.similarityThreshold || 0.7,
          filters: args.filters || {},
          executionTime,
          error: true,
          errorDetails: serializeError(notImplementedError)
        };
      }

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
          author: doc.author
        },
        similarityScore: 1 - (doc._additional.distance || 0), // Convert distance to similarity
        distance: doc._additional.distance || 0
      }))
      // Filter by similarity threshold
      .filter((item: any) => item.similarityScore >= similarityThreshold) || [];

      const executionTime = Date.now() - startTime;

      const result = {
        results,
        referenceContent: args.referenceContent ? args.referenceContent.substring(0, 200) + '...' : undefined,
        referenceId: args.referenceId,
        similarityThreshold,
        filters,
        executionTime
      };

      logger.info('Similar content search completed', { 
        resultCount: results.length, 
        executionTime: `${executionTime}ms`,
        threshold: similarityThreshold
      });

      return result;

    } catch (error) {
      const executionTime = Date.now() - startTime;
      logger.error('Similar content search failed', { error, executionTime: `${executionTime}ms` });
      
      return {
        results: [],
        referenceContent: args.referenceContent ? args.referenceContent.substring(0, 200) + '...' : undefined,
        referenceId: args.referenceId,
        similarityThreshold: args.similarityThreshold || 0.7,
        filters: args.filters || {},
        executionTime,
        error: true,
        errorDetails: serializeError(error)
      };
    }
  }
}