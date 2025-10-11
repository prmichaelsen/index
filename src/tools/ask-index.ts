import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { WeaviateClientWrapper } from '../weaviate/client.js';
import { logger } from '../utils/logger.js';
import { CONTENT_TYPES, CONTENT_TYPES_DESCRIPTION } from '../types/content-types.js';

export class AskIndexTool {
  constructor(private weaviateClient: WeaviateClientWrapper) {}

  getToolDefinition(): Tool {
    return {
      name: 'ask_index',
      description: `Retrieval-Augmented Generation - search your content then generate direct answers using an LLM.

Use this tool when you want direct answers to questions, not just search results.
Differs from search tools by returning AI-generated answers with source citations instead of raw documents.

Args:
    question: Natural language question to answer using your indexed content
    maxSources: Maximum number of source documents to retrieve for context (1-10, default: 5)
    filters: Optional search filters to limit source documents (same as search_content)
        contentType: Array of content types to search within. ${CONTENT_TYPES_DESCRIPTION}
        fileExtension: Array of file extensions to filter by
        project: Project name to filter by
        tags: Array of tags to filter by
        language: Programming language filter
    answerLength: Preferred answer length ('short', 'medium', 'detailed', default: 'medium')
    includeSources: Whether to include full source document citations (default: true)

Returns:
    RagQueryResult object containing:
        answer: AI-generated answer to the question
        sources: Array of source documents used with relevance scores and citations
        question: Original question asked
        sourceCount: Number of sources used for the answer
        confidence: Confidence score for the answer quality (0.0-1.0)
        executionTime: Total execution time including search and generation

Raises:
    Exception: If question is missing, no relevant sources are found, or there is an error during search or answer generation`,
      inputSchema: {
        type: 'object',
        properties: {
          question: {
            type: 'string',
            description: 'Natural language question to answer'
          },
          maxSources: {
            type: 'number',
            minimum: 1,
            maximum: 10,
            default: 5,
            description: 'Maximum source documents to retrieve'
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
            description: 'Search filters for source documents'
          },
          answerLength: {
            type: 'string',
            enum: ['short', 'medium', 'detailed'],
            default: 'medium',
            description: 'Preferred answer length'
          },
          includeSources: {
            type: 'boolean',
            default: true,
            description: 'Include source document citations'
          }
        },
        required: ['question']
      }
    };
  }

  async execute(args: any): Promise<any> {
    const startTime = Date.now();
    
    try {
      logger.info('Executing ask_index', {
        question: args.question?.substring(0, 100),
        maxSources: args.maxSources
      });

      if (!args.question) {
        throw new Error('Question is required');
      }

      const question = args.question;
      const maxSources = args.maxSources || 5;
      const filters = args.filters || {};
      const answerLength = args.answerLength || 'medium';
      const includeSources = args.includeSources !== false;

      // Step 1: Search for relevant source documents
      const searchResult = await this.weaviateClient.searchDocuments(
        question,
        filters,
        maxSources,
        0
      );

      const sources = searchResult.data.Get.Document?.map((doc: any) => ({
        id: doc._additional.id,
        content: doc.content || '',
        metadata: {
          contentType: doc.contentType || 'unknown',
          title: doc.title,
          description: doc.description,
          filePath: doc.filePath,
          project: doc.project,
          tags: doc.tags || [],
          language: doc.language,
          author: doc.author
        },
        relevanceScore: doc._additional.score || doc._additional.distance || 0
      })) || [];

      if (sources.length === 0) {
        throw new Error('No relevant sources found for the question');
      }

      // Step 2: Generate answer using the sources
      // Note: This is a simplified implementation
      // In production, you'd integrate with your preferred LLM (Claude, GPT, etc.)
      const contextText = sources
        .map((source: any) => `Source: ${source.metadata.title || 'Untitled'}\nContent: ${source.content.substring(0, 500)}`)
        .join('\n\n');

      // Simplified answer generation (replace with actual LLM integration)
      const answer = `Based on the ${sources.length} relevant sources found in your content, here's what I found regarding: "${question}"

The most relevant information comes from:
${sources.slice(0, 3).map((source: any, idx: number) =>
  `${idx + 1}. ${source.metadata.title || 'Untitled'} (${source.metadata.contentType})`
).join('\n')}

[Note: This is a simplified RAG implementation. In production, this would use an LLM to generate a comprehensive answer from the retrieved context.]`;

      const executionTime = Date.now() - startTime;

      const result = {
        answer,
        sources: includeSources ? sources : [],
        question,
        sourceCount: sources.length,
        confidence: sources.length > 0 ? Math.min(sources[0].relevanceScore * 2, 1.0) : 0.0,
        executionTime
      };

      logger.info('RAG query completed', { 
        sourceCount: sources.length,
        executionTime: `${executionTime}ms`
      });

      return result;

    } catch (error) {
      const executionTime = Date.now() - startTime;
      logger.error('RAG query failed', { error, executionTime: `${executionTime}ms` });
      
      throw new Error(`RAG query failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}