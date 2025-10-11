import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { WeaviateClientWrapper } from '../weaviate/client.js';
import { logger } from '../utils/logger.js';
import { CONTENT_TYPES, CONTENT_TYPES_DESCRIPTION } from '../types/content-types.js';

export class IndexNewTool {
  constructor(
    private weaviateClient: WeaviateClientWrapper
  ) {}

  getToolDefinition(): Tool {
    return {
      name: 'index_new',
      description: `Index new content with metadata for semantic search.

Args:
    content: Document content to be indexed
    metadata: Document metadata object (required)
        contentType: ${CONTENT_TYPES_DESCRIPTION}
        title: Document title (required)
        description: Document description (required)
        tags: Array of document tags (required)
        filePath: File path if applicable (optional)
        fileExtension: File extension (optional)
        project: Project name (optional)
        priority: Priority level ('low', 'medium', 'high') (optional)
        status: Document status (optional)
        language: Programming language (optional)
        author: Document author (optional)
    image: Base64 encoded image data for visual content (optional)

Returns:
    AddDocumentResult object containing:
        id: Generated document ID in Weaviate
        success: Boolean indicating success or failure
        message: Status message describing the result

Raises:
    Exception: If content, metadata.contentType, metadata.title, metadata.description, or metadata.tags is missing, or if there is an error indexing to Weaviate`,
      inputSchema: {
        type: 'object',
        properties: {
          content: {
            type: 'string',
            description: 'Document content'
          },
          metadata: {
            type: 'object',
            properties: {
              contentType: {
                type: 'string',
                enum: CONTENT_TYPES,
                description: 'Type of content'
              },
              title: {
                type: 'string',
                description: 'Document title (required)'
              },
              description: {
                type: 'string',
                description: 'Document description (required)'
              },
              filePath: {
                type: 'string',
                description: 'File path if applicable'
              },
              fileExtension: {
                type: 'string',
                description: 'File extension'
              },
              project: {
                type: 'string',
                description: 'Project name'
              },
              tags: {
                type: 'array',
                items: { type: 'string' },
                description: 'Document tags (required)'
              },
              priority: {
                type: 'string',
                enum: ['low', 'medium', 'high'],
                description: 'Priority level'
              },
              status: {
                type: 'string',
                description: 'Document status'
              },
              language: {
                type: 'string',
                description: 'Programming language'
              },
              author: {
                type: 'string',
                description: 'Document author'
              }
            },
            required: ['contentType', 'title', 'description', 'tags'],
            description: 'Document metadata'
          },
          image: {
            type: 'string',
            description: 'Base64 encoded image data for visual content'
          }
        },
        required: ['content', 'metadata']
      }
    };
  }

  async execute(args: any): Promise<any> {
    try {
      logger.info('Executing index_new', {
        contentType: args.metadata?.contentType,
        hasImage: !!args.image
      });

      // Client must provide all required metadata - no extraction
      if (!args.content) {
        throw new Error('Content is required');
      }
      
      if (!args.metadata?.contentType) {
        throw new Error('metadata.contentType is required');
      }

      if (!args.metadata?.title) {
        throw new Error('metadata.title is required');
      }

      if (!args.metadata?.description) {
        throw new Error('metadata.description is required');
      }

      if (!args.metadata?.tags || !Array.isArray(args.metadata.tags)) {
        throw new Error('metadata.tags is required and must be an array');
      }

      // Use metadata exactly as provided by client
      const documentData: Record<string, any> = {
        content: args.content,
        contentType: args.metadata.contentType,
        title: args.metadata.title,
        description: args.metadata.description,
        filePath: args.metadata.filePath || '',
        fileExtension: args.metadata.fileExtension || '',
        project: args.metadata.project || '',
        tags: args.metadata.tags,
        priority: args.metadata.priority || '',
        status: args.metadata.status || '',
        language: args.metadata.language || '',
        author: args.metadata.author || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Add image data if provided
      if (args.image) {
        documentData.image = args.image;
        documentData.imageType = args.metadata.imageType || 'user-uploaded';
      }

      // Add document to Weaviate
      const documentId = await this.weaviateClient.addDocument(documentData);

      const result = {
        id: documentId,
        success: true,
        message: 'Document indexed successfully'
      };

      logger.info('Document added successfully', {
        id: documentId,
        contentType: args.metadata.contentType
      });

      return result;

    } catch (error) {
      logger.error('Failed to add document', { error });
      
      return {
        id: '',
        success: false,
        message: `Failed to add document: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
}