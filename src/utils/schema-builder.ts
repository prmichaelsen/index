import { SharedDefinitions, MetadataFieldConfig, FilterFieldConfig } from '../types/config.js';

/**
 * Builds JSON schema for tool parameters from shared definitions
 */
export class SchemaBuilder {
  private shared?: SharedDefinitions;

  constructor(shared?: SharedDefinitions) {
    this.shared = shared;
  }

  /**
   * Build metadata parameter schema from shared definitions
   */
  buildMetadataSchema(): any {
    if (!this.shared?.metadataFields) {
      return this.getDefaultMetadataSchema();
    }

    const properties: Record<string, any> = {};
    const required: string[] = [];

    for (const field of this.shared.metadataFields) {
      properties[field.name] = {
        type: field.type === 'array' ? 'array' : 'string',
        description: field.description
      };

      if (field.type === 'array') {
        properties[field.name].items = { type: 'string' };
      }

      if (field.enum) {
        if (field.name === 'contentType' && this.shared.contentTypes) {
          properties[field.name].enum = this.shared.contentTypes;
        } else if (field.name === 'priority' && this.shared.priorities) {
          properties[field.name].enum = this.shared.priorities;
        } else {
          properties[field.name].enum = field.enum;
        }
      }

      if (field.required) {
        required.push(field.name);
      }
    }

    return {
      type: 'object',
      properties,
      required: required.length > 0 ? required : ['contentType', 'title', 'description', 'tags'],
      description: 'Document metadata'
    };
  }

  /**
   * Build filters parameter schema from shared definitions
   */
  buildFiltersSchema(): any {
    if (!this.shared?.filterFields) {
      return this.getDefaultFiltersSchema();
    }

    const properties: Record<string, any> = {};

    for (const field of this.shared.filterFields) {
      if (field.type === 'array') {
        properties[field.name] = {
          type: 'array',
          items: { type: 'string' },
          description: field.description
        };

        if (field.enum) {
          if (field.name === 'contentType' && this.shared.contentTypes) {
            properties[field.name].items.enum = this.shared.contentTypes;
          } else {
            properties[field.name].items.enum = field.enum;
          }
        }
      } else if (field.type === 'object') {
        properties[field.name] = {
          type: 'object',
          properties: field.properties || {},
          description: field.description
        };
      } else {
        properties[field.name] = {
          type: 'string',
          description: field.description
        };

        if (field.enum) {
          if (field.name === 'priority' && this.shared.priorities) {
            properties[field.name].enum = this.shared.priorities;
          } else {
            properties[field.name].enum = field.enum;
          }
        }
      }
    }

    return {
      type: 'object',
      properties,
      description: 'Search filters'
    };
  }

  /**
   * Get content types enum
   */
  getContentTypes(): string[] {
    return this.shared?.contentTypes || [
      'code', 'note', 'screenplay', 'todo', 'documentation', 
      'conversation', 'image', 'contact', 'video', 'event', 
      'audio', 'transcript', 'system'
    ];
  }

  /**
   * Get priorities enum
   */
  getPriorities(): string[] {
    return this.shared?.priorities || ['low', 'medium', 'high'];
  }

  /**
   * Build content types description
   */
  getContentTypesDescription(): string {
    const types = this.getContentTypes();
    return `Type of content. Available types: ${types.join(', ')}`;
  }

  private getDefaultMetadataSchema(): any {
    return {
      type: 'object',
      properties: {
        contentType: {
          type: 'string',
          enum: this.getContentTypes(),
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
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Document tags (required)'
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
        priority: {
          type: 'string',
          enum: this.getPriorities(),
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
    };
  }

  private getDefaultFiltersSchema(): any {
    return {
      type: 'object',
      properties: {
        contentType: {
          type: 'array',
          items: {
            type: 'string',
            enum: this.getContentTypes()
          },
          description: 'Filter by content types'
        },
        fileExtension: {
          type: 'array',
          items: { type: 'string' },
          description: 'Filter by file extensions'
        },
        project: {
          type: 'string',
          description: 'Filter by project name'
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Filter by tags'
        },
        priority: {
          type: 'string',
          enum: this.getPriorities(),
          description: 'Filter by priority level'
        },
        status: {
          type: 'string',
          description: 'Filter by status'
        },
        language: {
          type: 'string',
          description: 'Filter by programming language'
        },
        dateRange: {
          type: 'object',
          properties: {
            after: { type: 'string', description: 'ISO date string' },
            before: { type: 'string', description: 'ISO date string' }
          },
          description: 'Filter by date range'
        }
      },
      description: 'Search filters'
    };
  }
}