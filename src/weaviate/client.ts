import weaviate, { WeaviateClient, ApiKey } from 'weaviate-client';
import { WeaviateConfig } from '../types/weaviate.js';
import { logger } from '../utils/logger.js';

export class WeaviateClientWrapper {
  private client!: WeaviateClient;
  private config: WeaviateConfig;
  private isConnected = false;

  constructor(config: WeaviateConfig) {
    this.config = config;
  }

  async connect(): Promise<void> {
    try {
      // Initialize Weaviate client with v3 API
      this.client = await weaviate.connectToWeaviateCloud(
        this.config.url,
        {
          authCredentials: this.config.apiKey ? new ApiKey(this.config.apiKey) : undefined,
          headers: {
            'X-OpenAI-Api-Key': process.env.OPENAI_APIKEY || ''
          }
        }
      );

      // Test connection
      await this.client.collections.listAll();
      this.isConnected = true;
      logger.info('Connected to Weaviate successfully');
    } catch (error) {
      this.isConnected = false;
      logger.error('Failed to connect to Weaviate:', error);
      throw new Error(`Failed to connect to Weaviate: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async ensureSchema(): Promise<void> {
    try {
      // Check if Document collection exists
      const collections = await this.client.collections.listAll();
      const documentCollection = collections.find(col => col.name === 'Document');

      if (!documentCollection) {
        logger.info('Creating Document collection...');
        
        await this.client.collections.create({
          name: 'Document',
          vectorizers: weaviate.configure.vectorizer.text2VecOpenAI({
            model: 'text-embedding-3-small'
          }),
          properties: [
            { name: 'content', dataType: weaviate.configure.dataType.TEXT },
            { name: 'contentType', dataType: weaviate.configure.dataType.TEXT },
            { name: 'title', dataType: weaviate.configure.dataType.TEXT },
            { name: 'description', dataType: weaviate.configure.dataType.TEXT },
            { name: 'filePath', dataType: weaviate.configure.dataType.TEXT },
            { name: 'fileExtension', dataType: weaviate.configure.dataType.TEXT },
            { name: 'project', dataType: weaviate.configure.dataType.TEXT },
            { name: 'tags', dataType: weaviate.configure.dataType.TEXT_ARRAY },
            { name: 'priority', dataType: weaviate.configure.dataType.TEXT },
            { name: 'status', dataType: weaviate.configure.dataType.TEXT },
            { name: 'language', dataType: weaviate.configure.dataType.TEXT },
            { name: 'createdAt', dataType: weaviate.configure.dataType.DATE },
            { name: 'updatedAt', dataType: weaviate.configure.dataType.DATE },
            { name: 'author', dataType: weaviate.configure.dataType.TEXT },
            // Note: Image support will be added later with external processing
            { name: 'extractedText', dataType: weaviate.configure.dataType.TEXT },
            { name: 'detectedObjects', dataType: weaviate.configure.dataType.TEXT_ARRAY },
            { name: 'imageType', dataType: weaviate.configure.dataType.TEXT },
            { name: 'dimensions', dataType: weaviate.configure.dataType.TEXT }
          ]
        });
        
        logger.info('Document collection created successfully');
      } else {
        logger.info('Document collection already exists');
      }
    } catch (error) {
      logger.error('Failed to ensure schema:', error);
      throw new Error(`Failed to ensure schema: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async addDocument(data: Record<string, any>): Promise<string> {
    if (!this.isConnected) {
      throw new Error('Not connected to Weaviate');
    }

    try {
      const collection = this.client.collections.get('Document');
      const result = await collection.data.insert(data);

      logger.info(`Document added with ID: ${result}`);
      return result;
    } catch (error) {
      logger.error('Failed to add document:', error);
      throw new Error(`Failed to add document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updateDocument(id: string, data: Record<string, any>): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Not connected to Weaviate');
    }

    try {
      const collection = this.client.collections.get('Document');
      await collection.data.update({
        id,
        properties: data
      });

      logger.info(`Document updated with ID: ${id}`);
    } catch (error) {
      logger.error('Failed to update document:', error);
      throw new Error(`Failed to update document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async deleteDocument(id: string): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Not connected to Weaviate');
    }

    try {
      const collection = this.client.collections.get('Document');
      await collection.data.deleteById(id);

      logger.info(`Document deleted with ID: ${id}`);
    } catch (error) {
      logger.error('Failed to delete document:', error);
      throw new Error(`Failed to delete document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async searchDocuments(query: string, filters?: Record<string, any>, limit = 10, offset = 0): Promise<any> {
    if (!this.isConnected) {
      throw new Error('Not connected to Weaviate');
    }

    try {
      const collection = this.client.collections.get('Document');
      
      const searchOptions: any = {
        limit,
        offset,
        returnMetadata: ['score', 'distance']
      };

      // Add filters if provided
      if (filters && Object.keys(filters).length > 0) {
        const whereFilter = this.buildWhereFilter(filters);
        if (whereFilter) {
          searchOptions.where = whereFilter;
        }
      }

      const result = await collection.query.nearText(query, searchOptions);
      logger.info(`Search completed, found ${result.objects?.length || 0} results`);
      
      // Transform to expected format
      return {
        data: {
          Get: {
            Document: result.objects?.map(obj => ({
              _additional: {
                id: obj.uuid,
                score: obj.metadata?.score,
                distance: obj.metadata?.distance
              },
              ...obj.properties
            })) || []
          }
        }
      };
    } catch (error) {
      logger.error('Failed to search documents:', error);
      throw new Error(`Failed to search documents: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async hybridSearch(query: string, filters?: Record<string, any>, limit = 10, offset = 0, alpha = 0.7): Promise<any> {
    if (!this.isConnected) {
      throw new Error('Not connected to Weaviate');
    }

    try {
      const collection = this.client.collections.get('Document');
      
      const searchOptions: any = {
        limit,
        offset,
        alpha,
        returnMetadata: ['score', 'distance']
      };

      // Add filters if provided
      if (filters && Object.keys(filters).length > 0) {
        const whereFilter = this.buildWhereFilter(filters);
        if (whereFilter) {
          searchOptions.where = whereFilter;
        }
      }

      const result = await collection.query.hybrid(query, searchOptions);
      logger.info(`Hybrid search completed, found ${result.objects?.length || 0} results`);
      
      // Transform to expected format
      return {
        data: {
          Get: {
            Document: result.objects?.map(obj => ({
              _additional: {
                id: obj.uuid,
                score: obj.metadata?.score,
                distance: obj.metadata?.distance
              },
              ...obj.properties
            })) || []
          }
        }
      };
    } catch (error) {
      logger.error('Failed to perform hybrid search:', error);
      throw new Error(`Failed to perform hybrid search: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findSimilar(referenceId: string, limit = 10): Promise<any> {
    if (!this.isConnected) {
      throw new Error('Not connected to Weaviate');
    }

    try {
      const collection = this.client.collections.get('Document');
      
      const result = await collection.query.nearObject(referenceId, {
        limit,
        returnMetadata: ['score', 'distance']
      });

      logger.info(`Similar search completed, found ${result.objects?.length || 0} results`);
      
      // Transform to expected format
      return {
        data: {
          Get: {
            Document: result.objects?.map(obj => ({
              _additional: {
                id: obj.uuid,
                score: obj.metadata?.score,
                distance: obj.metadata?.distance
              },
              ...obj.properties
            })) || []
          }
        }
      };
    } catch (error) {
      logger.error('Failed to find similar documents:', error);
      throw new Error(`Failed to find similar documents: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private buildWhereFilter(filters: Record<string, any>): any {
    const conditions: any[] = [];

    // Content type filter
    if (filters.contentType && Array.isArray(filters.contentType) && filters.contentType.length > 0) {
      if (filters.contentType.length === 1) {
        conditions.push({
          path: 'contentType',
          operator: 'Equal',
          valueText: filters.contentType[0]
        });
      } else {
        conditions.push({
          operator: 'Or',
          operands: filters.contentType.map((type: string) => ({
            path: 'contentType',
            operator: 'Equal',
            valueText: type
          }))
        });
      }
    }

    // Project filter
    if (filters.project) {
      conditions.push({
        path: 'project',
        operator: 'Equal',
        valueText: filters.project
      });
    }

    // Language filter
    if (filters.language) {
      conditions.push({
        path: 'language',
        operator: 'Equal',
        valueText: filters.language
      });
    }

    // Priority filter
    if (filters.priority) {
      conditions.push({
        path: 'priority',
        operator: 'Equal',
        valueText: filters.priority
      });
    }

    // Status filter
    if (filters.status) {
      conditions.push({
        path: 'status',
        operator: 'Equal',
        valueText: filters.status
      });
    }

    // File extension filter
    if (filters.fileExtension && Array.isArray(filters.fileExtension) && filters.fileExtension.length > 0) {
      if (filters.fileExtension.length === 1) {
        conditions.push({
          path: 'fileExtension',
          operator: 'Equal',
          valueText: filters.fileExtension[0]
        });
      } else {
        conditions.push({
          operator: 'Or',
          operands: filters.fileExtension.map((ext: string) => ({
            path: 'fileExtension',
            operator: 'Equal',
            valueText: ext
          }))
        });
      }
    }

    // Date range filter
    if (filters.dateRange) {
      if (filters.dateRange.after) {
        conditions.push({
          path: 'createdAt',
          operator: 'GreaterThanEqual',
          valueDate: new Date(filters.dateRange.after)
        });
      }
      if (filters.dateRange.before) {
        conditions.push({
          path: 'createdAt',
          operator: 'LessThanEqual',
          valueDate: new Date(filters.dateRange.before)
        });
      }
    }

    // Tags filter
    if (filters.tags && Array.isArray(filters.tags) && filters.tags.length > 0) {
      conditions.push({
        operator: 'Or',
        operands: filters.tags.map((tag: string) => ({
          path: 'tags',
          operator: 'ContainsAny',
          valueTextArray: [tag]
        }))
      });
    }

    // Return combined conditions
    if (conditions.length === 0) {
      return undefined;
    } else if (conditions.length === 1) {
      return conditions[0];
    } else {
      return {
        operator: 'And',
        operands: conditions
      };
    }
  }

  getClient(): WeaviateClient {
    return this.client;
  }

  isClientConnected(): boolean {
    return this.isConnected;
  }
}