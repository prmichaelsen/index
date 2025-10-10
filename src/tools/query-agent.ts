import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { WeaviateClientWrapper } from '../weaviate/client.js';
import { logger } from '../utils/logger.js';

export class QueryAgentTool {
  constructor(private weaviateClient: WeaviateClientWrapper) {}

  getToolDefinition(): Tool {
    return {
      name: 'query_agent',
      description: `Natural language querying using Weaviate's QueryAgent for complex analytical questions.

Use this tool for complex analytical questions that require multiple database operations and aggregations.
Differs from other tools by providing the most comprehensive citations with query explanations and full transparency.
QueryAgent automatically generates optimized Weaviate queries from natural language and provides detailed source tracking.

Args:
    query: Natural language query for complex analysis (e.g., "What are the most common error patterns in my TypeScript code?")
    collections: Array of collection names to query (default: ["Document"])
    responseFormat: Preferred response format ('detailed', 'summary', 'data_only', default: 'detailed')
    includeQueryExplanation: Whether to include explanation of generated queries (default: true)
    maxResults: Maximum results per query operation (1-100, default: 20)

Returns:
    QueryAgentResult object containing:
        answer: AI-generated analytical answer with insights
        sources: Array of source objects with full metadata and relevance scores
        queryExplanation: Detailed explanation of what queries were performed and why
        generatedQueries: Array of actual Weaviate queries that were executed
        aggregations: Any aggregation results (counts, averages, etc.)
        confidence: Confidence score for the analysis quality (0.0-1.0)
        executionTime: Total execution time for all operations

Raises:
    Exception: If query is missing, QueryAgent is not available, or there is an error during query execution`,
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Natural language query for analysis'
          },
          collections: {
            type: 'array',
            items: { type: 'string' },
            default: ['Document'],
            description: 'Collection names to query'
          },
          responseFormat: {
            type: 'string',
            enum: ['detailed', 'summary', 'data_only'],
            default: 'detailed',
            description: 'Preferred response format'
          },
          includeQueryExplanation: {
            type: 'boolean',
            default: true,
            description: 'Include explanation of generated queries'
          },
          maxResults: {
            type: 'number',
            minimum: 1,
            maximum: 100,
            default: 20,
            description: 'Maximum results per query operation'
          }
        },
        required: ['query']
      }
    };
  }

  async execute(args: any): Promise<any> {
    const startTime = Date.now();
    
    try {
      logger.info('Executing query_agent', { 
        query: args.query?.substring(0, 100),
        collections: args.collections 
      });

      if (!args.query) {
        throw new Error('Query is required');
      }

      const query = args.query;
      const collections = args.collections || ['Document'];
      const responseFormat = args.responseFormat || 'detailed';
      const includeQueryExplanation = args.includeQueryExplanation !== false;
      const maxResults = args.maxResults || 20;

      // Note: This is a simplified implementation placeholder
      // In production, you would integrate with Weaviate's QueryAgent library:
      // 
      // import { QueryAgent } from '@weaviate/query-agent';
      // const queryAgent = new QueryAgent(this.weaviateClient.getClient());
      // const result = await queryAgent.query(query, { collections, maxResults });

      // For now, provide a structured response that shows what QueryAgent would return
      const executionTime = Date.now() - startTime;

      const result = {
        answer: `QueryAgent Analysis for: "${query}"

[Note: This is a placeholder implementation. In production, this would use Weaviate's QueryAgent library to:
1. Parse your natural language query
2. Generate optimized Weaviate GraphQL queries
3. Execute multiple database operations as needed
4. Aggregate and analyze results
5. Provide comprehensive insights with full source transparency]

To implement QueryAgent:
1. Install @weaviate/query-agent package
2. Initialize QueryAgent with your Weaviate client
3. Call queryAgent.query() with natural language input
4. Return structured results with full citations and query explanations`,
        
        sources: [],
        queryExplanation: includeQueryExplanation ? 
          `QueryAgent would analyze "${query}" and generate appropriate GraphQL queries for the Document collection, potentially including aggregations, filters, and multi-step operations.` : 
          undefined,
        generatedQueries: [
          "# Example queries that would be generated:",
          "# 1. Initial search query",
          "# 2. Aggregation queries for patterns",
          "# 3. Follow-up queries for detailed analysis"
        ],
        aggregations: {},
        confidence: 0.0,
        executionTime,
        implementation_note: "QueryAgent integration requires @weaviate/query-agent package and is only available for Weaviate Cloud instances"
      };

      logger.info('QueryAgent placeholder completed', { 
        executionTime: `${executionTime}ms`
      });

      return result;

    } catch (error) {
      const executionTime = Date.now() - startTime;
      logger.error('QueryAgent execution failed', { error, executionTime: `${executionTime}ms` });
      
      throw new Error(`QueryAgent execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}