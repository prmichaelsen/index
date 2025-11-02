import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { readFileSync } from 'fs';
import { WeaviateClientWrapper } from '../weaviate/client.js';
import { SharedDefinitions } from '../types/config.js';
import { SchemaBuilder } from '../utils/schema-builder.js';
import { canIndexFile } from '../utils/security-filter.js';
import { logger } from '../utils/logger.js';

export class IndexNewTool {
  private schemaBuilder: SchemaBuilder;

  constructor(
    private weaviateClient: WeaviateClientWrapper,
    sharedDefinitions?: SharedDefinitions
  ) {
    this.schemaBuilder = new SchemaBuilder(sharedDefinitions);
  }

  getToolDefinition(): Tool {
    const metadataSchema = this.schemaBuilder.buildMetadataSchema();
    
    return {
      name: 'index_new',
      description: `Index new content with metadata for semantic search.

Args:
    content: Document content to be indexed (optional if filePath provided)
    filePath: Path to file to read and index (optional if content provided)
    metadata: Document metadata object (required) - see metadata schema for available fields
    image: Base64 encoded image data for visual content (optional)

Returns:
    AddDocumentResult object containing:
        id: Generated document ID in Weaviate
        success: Boolean indicating success or failure
        message: Status message describing the result

Raises:
    Exception: If neither content nor filePath is provided, or if metadata is invalid`,
      inputSchema: {
        type: 'object',
        properties: {
          content: {
            type: 'string',
            description: 'Document content (optional if filePath provided)'
          },
          filePath: {
            type: 'string',
            description: 'Path to file to read and index (optional if content provided)'
          },
          metadata: metadataSchema,
          image: {
            type: 'string',
            description: 'Base64 encoded image data for visual content'
          }
        },
        required: ['metadata']
      }
    };
  }

  async execute(args: any): Promise<any> {
    try {
      logger.info('Executing index_new', {
        contentType: args.metadata?.contentType,
        hasImage: !!args.image,
        hasFilePath: !!args.filePath
      });

      // Get content from either direct content or file path
      let content: string;
      
      if (args.content) {
        content = args.content;
      } else if (args.filePath) {
        const filePath: string = args.filePath;
        
        // Security check: prevent indexing sensitive files
        const securityCheck = canIndexFile(filePath);
        if (!securityCheck.isSafe) {
          throw new Error(`Security: Cannot index sensitive file - ${securityCheck.reason}`);
        }
        
        try {
          content = readFileSync(filePath, 'utf-8');
          logger.info('Read file content', { filePath, length: content.length });
          
          // Security check: scan content for sensitive data
          const contentCheck = canIndexFile(filePath, content);
          if (!contentCheck.isSafe) {
            throw new Error(`Security: File contains sensitive data - ${contentCheck.reason}`);
          }
        } catch (error) {
          throw new Error(`Failed to read file ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      } else {
        throw new Error('Either content or filePath is required');
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
        content: content,
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