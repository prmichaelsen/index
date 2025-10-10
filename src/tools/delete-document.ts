import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { WeaviateClientWrapper } from '../weaviate/client.js';
import { logger } from '../utils/logger.js';

export class DeleteDocumentTool {
  constructor(
    private weaviateClient: WeaviateClientWrapper
  ) {}

  getToolDefinition(): Tool {
    return {
      name: 'delete_document',
      description: `Delete a document from the index by its ID.

Args:
    id: Document ID to delete (required)

Returns:
    DeleteDocumentResult object containing:
        id: Document ID that was deleted
        success: Boolean indicating success or failure
        message: Status message describing the result

Raises:
    Exception: If id is missing, document not found, or if there is an error deleting from Weaviate`,
      inputSchema: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'Document ID to delete (required)'
          }
        },
        required: ['id']
      }
    };
  }

  async execute(args: any): Promise<any> {
    try {
      logger.info('Executing delete_document', {
        id: args.id
      });

      // Validate required fields
      if (!args.id) {
        throw new Error('Document ID is required');
      }

      // Delete document from Weaviate
      await this.weaviateClient.deleteDocument(args.id);

      const result = {
        id: args.id,
        success: true,
        message: 'Document deleted successfully'
      };

      logger.info('Document deleted successfully', {
        id: args.id
      });

      return result;

    } catch (error) {
      logger.error('Failed to delete document', { error });
      
      return {
        id: args.id || '',
        success: false,
        message: `Failed to delete document: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
}