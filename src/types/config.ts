// Configuration types for YAML-based setup

export interface WeaviateInstanceConfig {
  url: string;
  apiKey?: string;
  timeout?: number;
  retries?: number;
  openaiApiKey?: string;
}

export interface SchemaPropertyConfig {
  name: string;
  dataType: 'TEXT' | 'TEXT_ARRAY' | 'DATE' | 'NUMBER' | 'BOOLEAN' | 'INT';
  description?: string;
}

export interface VectorizerConfig {
  type: 'text2vec-openai' | 'text2vec-cohere' | 'text2vec-huggingface' | 'none';
  model?: string;
  options?: Record<string, any>;
}

export interface SchemaConfig {
  collectionName: string;
  vectorizer: VectorizerConfig;
  properties: SchemaPropertyConfig[];
}

// Shared definitions for metadata and filters
export interface MetadataFieldConfig {
  name: string;
  type: 'string' | 'array' | 'date';
  description: string;
  required?: boolean;
  enum?: string[];
}

export interface FilterFieldConfig {
  name: string;
  type: 'string' | 'array' | 'date' | 'object';
  description: string;
  enum?: string[];
  properties?: Record<string, any>;
}

export interface SharedDefinitions {
  contentTypes?: string[];
  priorities?: string[];
  metadataFields?: MetadataFieldConfig[];
  filterFields?: FilterFieldConfig[];
}

export interface ToolConfig {
  name: string;
  enabled?: boolean;
}

export interface ServerConfig {
  name: string;
  version: string;
  description?: string;
}

export interface IndexConfig {
  server: ServerConfig;
  weaviate: WeaviateInstanceConfig;
  schema: SchemaConfig;
  shared?: SharedDefinitions;
  tools: ToolConfig[];
}

// Helper function to validate config
export function validateConfig(config: any): config is IndexConfig {
  if (!config.server?.name || !config.server?.version) {
    throw new Error('Invalid config: server.name and server.version are required');
  }
  
  if (!config.weaviate?.url) {
    throw new Error('Invalid config: weaviate.url is required');
  }
  
  if (!config.schema?.collectionName || !config.schema?.properties) {
    throw new Error('Invalid config: schema.collectionName and schema.properties are required');
  }
  
  if (!Array.isArray(config.tools) || config.tools.length === 0) {
    throw new Error('Invalid config: tools must be a non-empty array');
  }
  
  return true;
}