import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { readFileSync, statSync } from 'fs';
import { basename, extname, dirname } from 'path';
import { WeaviateClientWrapper } from '../weaviate/client.js';
import { SharedDefinitions } from '../types/config.js';
import { canIndexFile } from '../utils/security-filter.js';
import { detectFileMetadata } from '../utils/file-metadata-detector.js';
import { logger } from '../utils/logger.js';

interface BulkIndexResult {
  total: number;
  successful: number;
  failed: number;
  results: Array<{
    filePath: string;
    success: boolean;
    id?: string;
    error?: string;
  }>;
}

export class BulkIndexTool {
  constructor(
    private weaviateClient: WeaviateClientWrapper,
    private sharedDefinitions?: SharedDefinitions
  ) {}

  getToolDefinition(): Tool {
    return {
      name: 'bulk_index',
      description: `Bulk index multiple files at once for efficient project indexing.

This tool is optimized for indexing many files quickly by:
- Reading files directly from disk
- Processing multiple files in a single operation
- Auto-detecting file metadata (extension, language, etc.)
- Providing batch progress reporting

Args:
    filePaths: Array of file paths to index
    project: Project name for all files
    repository: Optional repository name
    branch: Optional git branch name
    tags: Optional array of tags to apply to all files
    autoDetect: Whether to auto-detect language and other metadata (default: true)
    continueOnError: Whether to continue if individual files fail (default: true)

Returns:
    BulkIndexResult object containing:
        total: Total number of files processed
        successful: Number of successfully indexed files
        failed: Number of failed files
        results: Array of individual file results with IDs or errors

Example:
    {
      "filePaths": ["src/server.ts", "src/client.ts"],
      "project": "my-app",
      "tags": ["backend", "typescript"],
      "autoDetect": true
    }`,
      inputSchema: {
        type: 'object',
        properties: {
          filePaths: {
            type: 'array',
            items: { type: 'string' },
            description: 'Array of file paths to index'
          },
          project: {
            type: 'string',
            description: 'Project name for all files'
          },
          repository: {
            type: 'string',
            description: 'Repository name or URL (optional)'
          },
          branch: {
            type: 'string',
            description: 'Git branch name (optional)'
          },
          tags: {
            type: 'array',
            items: { type: 'string' },
            description: 'Tags to apply to all files (optional)'
          },
          autoDetect: {
            type: 'boolean',
            default: true,
            description: 'Auto-detect language and metadata from file extensions'
          },
          continueOnError: {
            type: 'boolean',
            default: true,
            description: 'Continue processing if individual files fail'
          }
        },
        required: ['filePaths', 'project']
      }
    };
  }

  async execute(args: any): Promise<BulkIndexResult> {
    const startTime = Date.now();
    const filePaths: string[] = args.filePaths || [];
    const project: string = args.project;
    const repository: string | undefined = args.repository;
    const branch: string | undefined = args.branch;
    const tags: string[] = args.tags || [];
    const autoDetect: boolean = args.autoDetect !== false;
    const continueOnError: boolean = args.continueOnError !== false;

    logger.info('Executing bulk_index', {
      fileCount: filePaths.length,
      project,
      autoDetect,
      continueOnError
    });

    const results: BulkIndexResult = {
      total: filePaths.length,
      successful: 0,
      failed: 0,
      results: []
    };

    for (const filePath of filePaths) {
      try {
        // Security check: prevent indexing sensitive files
        const securityCheck = canIndexFile(filePath);
        if (!securityCheck.isSafe) {
          throw new Error(`Security: ${securityCheck.reason}`);
        }
        
        // Read file content
        const content = readFileSync(filePath, 'utf-8');
        
        // Security check: scan content for sensitive data
        const contentCheck = canIndexFile(filePath, content);
        if (!contentCheck.isSafe) {
          throw new Error(`Security: ${contentCheck.reason}`);
        }
        
        const stats = statSync(filePath);
        
        // Extract file metadata
        const fileName = basename(filePath);
        const fileExt = extname(filePath);
        const directory = dirname(filePath);
        
        // Auto-detect language and content type
        let language = '';
        let contentType = 'code';
        let framework = '';
        
        if (autoDetect) {
          const detection = detectFileMetadata(fileExt, fileName, content);
          language = detection.language;
          contentType = detection.contentType;
          framework = detection.framework;
        }

        // Build document data
        const documentData: Record<string, any> = {
          content,
          contentType,
          title: fileName,
          description: `${contentType} file from ${project}`,
          filePath,
          fileExtension: fileExt,
          project,
          repository: repository || '',
          branch: branch || '',
          directory,
          language,
          framework,
          tags: [...tags, language, contentType].filter(Boolean),
          lineCount: content.split('\n').length,
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        // Index the document
        const documentId = await this.weaviateClient.addDocument(documentData);
        
        results.successful++;
        results.results.push({
          filePath,
          success: true,
          id: documentId
        });

        logger.info('File indexed successfully', { filePath, id: documentId });

      } catch (error) {
        results.failed++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        results.results.push({
          filePath,
          success: false,
          error: errorMessage
        });

        logger.error('Failed to index file', { filePath, error: errorMessage });

        if (!continueOnError) {
          break;
        }
      }
    }

    const executionTime = Date.now() - startTime;
    logger.info('Bulk index completed', {
      total: results.total,
      successful: results.successful,
      failed: results.failed,
      executionTime: `${executionTime}ms`
    });

    return results;
  }
}