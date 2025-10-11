import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { WeaviateClientWrapper } from '../weaviate/client.js';
import { logger } from '../utils/logger.js';
import { CONTENT_TYPES, CONTENT_TYPES_DESCRIPTION } from '../types/content-types.js';

export class GetSimilarTool {
  constructor(private weaviateClient: WeaviateClientWrapper) {}

  getToolDefinition(): Tool {
    return {
      name: 'get_similar',
      description: `Find content similar to a specific document or code snippet for content discovery.

Use this tool to discover related content, find code patterns, or locate similar implementations.
Differs from search tools by taking reference content instead of text queries.

Args:
    referenceContent: The content to find similar items for (document text, code snippet, etc.)
    referenceId: Optional Weaviate document ID to use as reference (alternative to referenceContent)
    similarityThreshold: Minimum similarity score (0.0-1.0, default: 0.7)
    filters: Optional search filters object (same as search_content)
        contentType: Array of content types to search within. ${CONTENT_TYPES_DESCRIPTION}
        fileExtension: Array of file extensions to filter by
        project: Project name to filter by
        tags: Array of tags to filter by
        language: Programming language filter
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
              project: {
                type: 'string',
                description: 'Filter by project name'
              },
              tags: {
                type: 'array',
                items: { type: 'string' },
                description: 'Filter by tags'
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
      logger.info('Executing get_similar', { 
        hasReferenceContent: !!args.referenceContent,
        referenceId: args.referenceId,
        threshold: args.similarityThreshold 
      });

      // Validate that we have either reference content or reference ID
      if (!args.referenceContent && !args.referenceId) {
        throw new Error('Either referenceContent or referenceId is required');
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
        throw new Error('Reference content similarity search not yet implemented - use referenceId instead');
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
      
      throw new Error(`Similar content search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}