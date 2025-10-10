// MCP tool argument interfaces
export interface SearchContentArgs {
  query: string;
  filters?: {
    contentType?: Array<'code' | 'note' | 'screenplay' | 'todo' | 'documentation' | 'conversation' | 'image'>;
    fileExtension?: string[];
    dateRange?: {
      after?: string;
      before?: string;
    };
    project?: string;
    tags?: string[];
    priority?: 'low' | 'medium' | 'high';
    status?: string;
    language?: string;
    hasText?: boolean;
    visualSimilarity?: boolean;
    referenceImage?: string;
  };
  limit?: number;
  offset?: number;
}

export interface AddDocumentArgs {
  content: string;
  metadata: {
    contentType: 'code' | 'note' | 'screenplay' | 'todo' | 'documentation' | 'conversation' | 'image';
    title?: string;
    description?: string;
    filePath?: string;
    fileExtension?: string;
    project?: string;
    tags?: string[];
    priority?: 'low' | 'medium' | 'high';
    status?: string;
    language?: string;
    author?: string;
  };
  autoClassify?: boolean;
  image?: string;
}

export interface CreateCollectionArgs {
  name: string;
  description?: string;
  vectorizer?: string;
  moduleConfig?: Record<string, any>;
}

export interface SearchConversationsArgs {
  query: string;
  filters?: {
    dateRange?: {
      after?: string;
      before?: string;
    };
    participants?: string[];
    topics?: string[];
  };
  limit?: number;
  offset?: number;
}

// MCP tool result interfaces
export interface SearchResult {
  id: string;
  content: string;
  metadata: {
    contentType: string;
    title?: string;
    description?: string;
    filePath?: string;
    fileExtension?: string;
    project?: string;
    tags: string[];
    priority?: string;
    status?: string;
    language?: string;
    createdAt: string;
    updatedAt: string;
    author?: string;
    extractedText?: string;
    detectedObjects?: string[];
    imageType?: string;
    dimensions?: string;
  };
  relevanceScore: number;
  highlights?: string[];
}

export interface SearchContentResult {
  results: SearchResult[];
  total: number;
  query: string;
  filters?: Record<string, any>;
  executionTime: number;
}

export interface AddDocumentResult {
  id: string;
  success: boolean;
  message: string;
  detectedMetadata?: Record<string, any>;
}

export interface CreateCollectionResult {
  name: string;
  success: boolean;
  message: string;
  schema?: Record<string, any>;
}