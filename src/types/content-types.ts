// Content type definitions
export type ContentType = 'code' | 'note' | 'screenplay' | 'todo' | 'documentation' | 'conversation' | 'image' | 'contact' | 'video' | 'event' | 'audio' | 'transcript' | 'system';

// Content type constants for reuse across tools
export const CONTENT_TYPES = ['code', 'note', 'screenplay', 'todo', 'documentation', 'conversation', 'image', 'contact', 'video', 'event', 'audio', 'transcript', 'system'] as const;

export const CONTENT_TYPES_DESCRIPTION = `Type of content:
  - 'code': Source code files
  - 'note': Personal notes and documentation
  - 'screenplay': Screenplay and script content
  - 'todo': Task lists and todos
  - 'documentation': Technical documentation
  - 'conversation': Chat logs and conversations
  - 'image': Image files and visual content
  - 'contact': Contact information
  - 'video': Video files and recordings
  - 'event': Calendar events and activities
  - 'audio': Audio files and recordings
  - 'transcript': Transcriptions of audio or video content
  - 'system': Agent instructions (reserved for internal use only)`;

// Search filters interface
export interface SearchFilters {
  contentType?: ContentType[];
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
}

// Document metadata interface
export interface DocumentMetadata {
  id: string;
  contentType: ContentType;
  title?: string;
  description?: string;
  filePath?: string;
  fileExtension?: string;
  project?: string;
  tags: string[];
  priority?: 'low' | 'medium' | 'high';
  status?: string;
  language?: string;
  createdAt: string;
  updatedAt: string;
  author?: string;
  // Image-specific metadata
  extractedText?: string;
  detectedObjects?: string[];
  imageType?: string;
  dimensions?: string;
}

// Search result interface
export interface SearchResult {
  id: string;
  content: string;
  metadata: DocumentMetadata;
  relevanceScore: number;
  highlights?: string[];
}

// Add document request interface
export interface AddDocumentRequest {
  content: string;
  metadata: Partial<DocumentMetadata> & {
    contentType: ContentType;
  };
  autoClassify?: boolean;
  image?: string; // base64 encoded image data
}

// Search request interface
export interface SearchRequest {
  query: string;
  filters?: SearchFilters;
  limit?: number;
  offset?: number;
}