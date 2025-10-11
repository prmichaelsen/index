import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { WeaviateClientWrapper } from '../weaviate/client.js';
import { logger } from '../utils/logger.js';
import { CONTENT_TYPES, CONTENT_TYPES_DESCRIPTION } from '../types/content-types.js';

export class IndexExistingTool {
  constructor(
    private weaviateClient: WeaviateClientWrapper
  ) {}

  getToolDefinition(): Tool {
    return {
      name: 'index_existing',
      description: `Update an existing document in the index with new metadata or content.

Args:
    id: Document ID to update (required)
    content: Updated document content (optional)
    metadata: Updated document metadata object (optional)
        contentType: ${CONTENT_TYPES_DESCRIPTION}
        title: Document title
        description: Document description
        tags: Array of document tags
        filePath: File path if applicable
        fileExtension: File extension
        project: Project name
        priority: Priority level ('low', 'medium', 'high')
        status: Document status
        language: Programming language
        author: Document author
    image: Base64 encoded image data for visual content (optional)

Returns:
    UpdateDocumentResult object containing:
        id: Document ID that was updated
        success: Boolean indicating success or failure
        message: Status message describing the result

Raises:
    Exception: If id is missing, document not found, or if there is an error updating in Weaviate`,
      inputSchema: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'Document ID to update (required)'
          },
          content: {
            type: 'string',
            description: 'Updated document content'
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
                description: 'Document title'
              },
              description: {
                type: 'string',
                description: 'Document description'
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
                description: 'Document tags'
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
            description: 'Document metadata to update'
          },
          image: {
            type: 'string',
            description: 'Base64 encoded image data for visual content'
          }
        },
        required: ['id']
      }
    };
  }

  async execute(args: any): Promise<any> {
    try {
      logger.info('Executing index_existing', {
        id: args.id,
        hasContent: !!args.content,
        hasMetadata: !!args.metadata,
        hasImage: !!args.image
      });

      // Validate required fields
      if (!args.id) {
        throw new Error('Document ID is required');
      }

      // Build update data object with only provided fields
      const updateData: Record<string, any> = {};

      // Add content if provided
      if (args.content !== undefined) {
        updateData.content = args.content;
      }

      // Add metadata fields if provided
      if (args.metadata) {
        if (args.metadata.contentType !== undefined) {
          updateData.contentType = args.metadata.contentType;
        }
        if (args.metadata.title !== undefined) {
          updateData.title = args.metadata.title;
        }
        if (args.metadata.description !== undefined) {
          updateData.description = args.metadata.description;
        }
        if (args.metadata.filePath !== undefined) {
          updateData.filePath = args.metadata.filePath;
        }
        if (args.metadata.fileExtension !== undefined) {
          updateData.fileExtension = args.metadata.fileExtension;
        }
        if (args.metadata.project !== undefined) {
          updateData.project = args.metadata.project;
        }
        if (args.metadata.tags !== undefined) {
          updateData.tags = args.metadata.tags;
        }
        if (args.metadata.priority !== undefined) {
          updateData.priority = args.metadata.priority;
        }
        if (args.metadata.status !== undefined) {
          updateData.status = args.metadata.status;
        }
        if (args.metadata.language !== undefined) {
          updateData.language = args.metadata.language;
        }
        if (args.metadata.author !== undefined) {
          updateData.author = args.metadata.author;
        }
      }

      // Add image data if provided
      if (args.image !== undefined) {
        updateData.image = args.image;
        if (args.metadata?.imageType) {
          updateData.imageType = args.metadata.imageType;
        }
      }

      // Always update the updatedAt timestamp
      updateData.updatedAt = new Date().toISOString();

      // Check if there's anything to update
      if (Object.keys(updateData).length === 1) { // Only updatedAt
        throw new Error('No fields provided to update');
      }

      // Update document in Weaviate
      await this.weaviateClient.updateDocument(args.id, updateData);

      const result = {
        id: args.id,
        success: true,
        message: 'Document updated successfully'
      };

      logger.info('Document updated successfully', {
        id: args.id,
        fieldsUpdated: Object.keys(updateData)
      });

      return result;

    } catch (error) {
      logger.error('Failed to update document', { error });
      
      return {
        id: args.id || '',
        success: false,
        message: `Failed to update document: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
}