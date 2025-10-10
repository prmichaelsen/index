// Weaviate configuration interface
export interface WeaviateConfig {
  url: string;
  apiKey?: string;
  timeout?: number;
  retries?: number;
}

// Weaviate class schema for documents
export const WeaviateDocumentSchema = {
  class: 'Document',
  vectorizer: 'multi2vec-clip',
  moduleConfig: {
    'multi2vec-clip': {
      imageFields: ['image'],
      textFields: ['content', 'description', 'extractedText'],
      weights: {
        textFields: [0.7],
        imageFields: [0.3]
      }
    }
  },
  properties: [
    {
      name: 'content',
      dataType: ['text'],
      description: 'Main content of the document'
    },
    {
      name: 'contentType',
      dataType: ['string'],
      description: 'Type of content (code, note, screenplay, etc.)'
    },
    {
      name: 'title',
      dataType: ['string'],
      description: 'Document title'
    },
    {
      name: 'description',
      dataType: ['text'],
      description: 'Document description'
    },
    {
      name: 'filePath',
      dataType: ['string'],
      description: 'File path if applicable'
    },
    {
      name: 'fileExtension',
      dataType: ['string'],
      description: 'File extension'
    },
    {
      name: 'project',
      dataType: ['string'],
      description: 'Project name'
    },
    {
      name: 'tags',
      dataType: ['string[]'],
      description: 'Document tags'
    },
    {
      name: 'priority',
      dataType: ['string'],
      description: 'Priority level (low, medium, high)'
    },
    {
      name: 'status',
      dataType: ['string'],
      description: 'Document status'
    },
    {
      name: 'language',
      dataType: ['string'],
      description: 'Programming language or document language'
    },
    {
      name: 'createdAt',
      dataType: ['date'],
      description: 'Creation timestamp'
    },
    {
      name: 'updatedAt',
      dataType: ['date'],
      description: 'Last update timestamp'
    },
    {
      name: 'author',
      dataType: ['string'],
      description: 'Document author'
    },
    // Image-specific properties
    {
      name: 'image',
      dataType: ['blob'],
      description: 'Image data for visual search'
    },
    {
      name: 'extractedText',
      dataType: ['text'],
      description: 'Text extracted from images via OCR'
    },
    {
      name: 'detectedObjects',
      dataType: ['string[]'],
      description: 'Objects detected in images'
    },
    {
      name: 'imageType',
      dataType: ['string'],
      description: 'Type of image (screenshot, diagram, etc.)'
    },
    {
      name: 'dimensions',
      dataType: ['string'],
      description: 'Image dimensions'
    }
  ]
};

// Weaviate search response interface
export interface WeaviateSearchResponse {
  data: {
    Get: {
      Document: Array<{
        _additional: {
          id: string;
          score?: number;
          distance?: number;
        };
        content?: string;
        contentType?: string;
        title?: string;
        description?: string;
        filePath?: string;
        fileExtension?: string;
        project?: string;
        tags?: string[];
        priority?: string;
        status?: string;
        language?: string;
        createdAt?: string;
        updatedAt?: string;
        author?: string;
        extractedText?: string;
        detectedObjects?: string[];
        imageType?: string;
        dimensions?: string;
      }>;
    };
  };
}

// Weaviate error interface
export interface WeaviateError {
  message: string;
  code?: number;
  locations?: Array<{
    line: number;
    column: number;
  }>;
}