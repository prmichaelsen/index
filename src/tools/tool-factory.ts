import { ToolConfig, SharedDefinitions } from '../types/config.js';
import { WeaviateClientWrapper } from '../weaviate/client.js';
import { SearchIndexTool } from './search-index.js';
import { IndexNewTool } from './index-new.js';
import { IndexExistingTool } from './index-existing.js';
import { UnindexTool } from './unindex.js';
import { FindSimilarInIndexTool } from './find-similar-in-index.js';
import { AskIndexTool } from './ask-index.js';
import { BulkIndexTool } from './bulk-index.js';

export class ToolFactory {
  private weaviateClient: WeaviateClientWrapper;
  private sharedDefinitions?: SharedDefinitions;

  constructor(weaviateClient: WeaviateClientWrapper, sharedDefinitions?: SharedDefinitions) {
    this.weaviateClient = weaviateClient;
    this.sharedDefinitions = sharedDefinitions;
  }

  /**
   * Create a tool instance from configuration
   * Tool names and descriptions are hardcoded in the tool classes
   * Config only controls enabled/disabled state
   */
  createTool(toolConfig: ToolConfig): any {
    switch (toolConfig.name) {
      case 'search_index':
        return new SearchIndexTool(this.weaviateClient, this.sharedDefinitions);
      case 'index_new':
        return new IndexNewTool(this.weaviateClient, this.sharedDefinitions);
      case 'index_existing':
        return new IndexExistingTool(this.weaviateClient, this.sharedDefinitions);
      case 'unindex':
        return new UnindexTool(this.weaviateClient);
      case 'find_similar_in_index':
        return new FindSimilarInIndexTool(this.weaviateClient, this.sharedDefinitions);
      case 'ask_index':
        return new AskIndexTool(this.weaviateClient, this.sharedDefinitions);
      case 'bulk_index':
        return new BulkIndexTool(this.weaviateClient, this.sharedDefinitions);
      default:
        throw new Error(`Unknown tool: ${toolConfig.name}`);
    }
  }

  /**
   * Create all enabled tools from configuration
   */
  createTools(toolConfigs: ToolConfig[]): any[] {
    return toolConfigs
      .filter(config => config.enabled !== false)
      .map(config => this.createTool(config));
  }
}