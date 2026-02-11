# Multi-Tenant Architecture Design for Index MCP Server

## Executive Summary

This document outlines the design for transforming the `index` MCP server (Weaviate-based semantic search) into a multi-tenant service integrated with the agentbase.me platform using the `@prmichaelsen/mcp-auth` framework.

## Current State Analysis

### Index Project (`~/index`)
- **Purpose**: Weaviate-based semantic search and vector database MCP server
- **Transport**: stdio only
- **Auth**: None (direct Weaviate connection)
- **Architecture**: Monolithic server with tools for indexing and searching
- **Key Features**:
  - Semantic search via Weaviate
  - Document indexing with metadata
  - Hybrid search (vector + keyword)
  - Support for multiple content types (code, notes, images, etc.)
  - Vector similarity search

### Current Tools
1. [`search_index`](src/tools/search-index.ts) - Semantic search with filters
2. [`index_new`](src/tools/index-new.ts) - Index new documents
3. [`index_existing`](src/tools/index-existing.ts) - Index existing files
4. [`unindex`](src/tools/unindex.ts) - Remove documents
5. [`find_similar_in_index`](src/tools/find-similar-in-index.ts) - Find similar documents
6. [`ask_index`](src/tools/ask-index.ts) - Query index with natural language

### Current Schema
The Weaviate schema includes:
- Content fields: `content`, `contentType`, `title`, `description`
- File metadata: `filePath`, `fileExtension`, `project`, `language`
- Organization: `tags`, `priority`, `status`, `author`
- Timestamps: `createdAt`, `updatedAt`
- Image support: `image`, `extractedText`, `detectedObjects`, `imageType`, `dimensions`

## Multi-Tenant Requirements

### 1. Data Isolation
Each user must have their own isolated document collection in Weaviate:
- User A's documents are never visible to User B
- Search results are scoped to the authenticated user
- No cross-tenant data leakage

### 2. Authentication
- Integrate with agentbase.me Firebase authentication
- Validate Firebase JWT tokens on each request
- Extract `userId` from validated tokens

### 3. Scalability
- Support hundreds of concurrent users
- Efficient Weaviate collection management
- Connection pooling and resource optimization

### 4. Backward Compatibility
- Maintain stdio mode for local development
- Existing tool interfaces remain unchanged
- No breaking changes to tool schemas

## Architecture Design

### Pattern Selection: Server Wrapping Pattern

Based on the mcp-auth documentation, we'll use the **Server Wrapping Pattern** because:
- ✅ Already implemented in mcp-auth ([`wrapServer`](../mcp-auth/src/wrapper/index.ts))
- ✅ Minimal changes to index core
- ✅ Clean separation of concerns
- ✅ Proven pattern from agentbase-mcp-server

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                  index-mcp-server (Cloud Run)                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  @prmichaelsen/mcp-auth (Server Wrapper)                 │   │
│  │  - FirebaseAuthProvider (validates JWT)                  │   │
│  │  - WeaviateAccessProvider (manages user collections)     │   │
│  │  - wrapServer() creates per-user server instances       │   │
│  └────────────────────┬─────────────────────────────────────┘   │
│                       │                                          │
│                       │ For each request:                        │
│                       │ 1. Validate JWT → userId                 │
│                       │ 2. Get/create user's Weaviate collection │
│                       │ 3. Create index server instance          │
│                       │                                          │
│  ┌────────────────────▼─────────────────────────────────────┐   │
│  │  index (refactored)                                      │   │
│  │  - createIndexServer(weaviateConfig, userId)             │   │
│  │  - WeaviateClientWrapper + all tools                     │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
                              │
                              │ Weaviate Cloud
                              │
┌─────────────────────────────▼─────────────────────────────────────┐
│                    Weaviate Cloud Instance                         │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐      │
│  │ Document_user1 │  │ Document_user2 │  │ Document_user3 │ ...  │
│  │ (Collection)   │  │ (Collection)   │  │ (Collection)   │      │
│  └────────────────┘  └────────────────┘  └────────────────┘      │
└───────────────────────────────────────────────────────────────────┘
```

## Implementation Strategy

### Phase 1: Refactor Index to Export Server Factory

**Goal**: Extract server creation logic into a reusable factory function.

#### Changes to Index Project

**File**: [`src/server-factory.ts`](src/server-factory.ts) (NEW)

```typescript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { WeaviateClientWrapper } from './weaviate/client.js';
import { WeaviateConfig } from './types/weaviate.js';
import { SearchIndexTool } from './tools/search-index.js';
import { IndexNewTool } from './tools/index-new.js';
import { IndexExistingTool } from './tools/index-existing.js';
import { UnindexTool } from './tools/unindex.js';
import { FindSimilarInIndexTool } from './tools/find-similar-in-index.js';
import { AskIndexTool } from './tools/ask-index.js';
import { logger } from './utils/logger.js';

export interface ServerOptions {
  name?: string;
  version?: string;
}

/**
 * Create an Index MCP server instance for a specific user
 * 
 * @param weaviateConfig - Weaviate configuration with user-specific collection
 * @param userId - User identifier for logging and collection naming
 * @param options - Optional server configuration
 * @returns Configured MCP Server instance
 */
export async function createIndexServer(
  weaviateConfig: WeaviateConfig,
  userId: string,
  options?: ServerOptions
): Promise<Server> {
  // Create Weaviate client with user-specific configuration
  const weaviateClient = new WeaviateClientWrapper(weaviateConfig, userId);
  
  // Connect and ensure schema
  await weaviateClient.connect();
  await weaviateClient.ensureSchema();
  
  // Initialize tools
  const searchIndexTool = new SearchIndexTool(weaviateClient);
  const indexNewTool = new IndexNewTool(weaviateClient);
  const indexExistingTool = new IndexExistingTool(weaviateClient);
  const unindexTool = new UnindexTool(weaviateClient);
  const findSimilarInIndexTool = new FindSimilarInIndexTool(weaviateClient);
  const askIndexTool = new AskIndexTool(weaviateClient);
  
  // Create MCP server
  const server = new Server(
    {
      name: options?.name || `index-${userId}`,
      version: options?.version || '0.1.0'
    },
    {
      capabilities: {
        tools: {}
      }
    }
  );
  
  // Register list_tools handler
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        searchIndexTool.getToolDefinition(),
        indexNewTool.getToolDefinition(),
        indexExistingTool.getToolDefinition(),
        unindexTool.getToolDefinition(),
        findSimilarInIndexTool.getToolDefinition(),
        askIndexTool.getToolDefinition()
      ]
    };
  });
  
  // Register call_tool handler
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    
    try {
      let result: any;
      
      switch (name) {
        case 'search_index':
          result = await searchIndexTool.execute(args);
          break;
        case 'index_new':
          result = await indexNewTool.execute(args);
          break;
        case 'index_existing':
          result = await indexExistingTool.execute(args);
          break;
        case 'unindex':
          result = await unindexTool.execute(args);
          break;
        case 'find_similar_in_index':
          result = await findSimilarInIndexTool.execute(args);
          break;
        case 'ask_index':
          result = await askIndexTool.execute(args);
          break;
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }
        ],
        isError: result.error ? true : false
      };
    } catch (error) {
      logger.error(`Tool execution failed for ${name}:`, error);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: error instanceof Error ? error.message : 'Unknown error',
              tool: name
            }, null, 2)
          }
        ],
        isError: true
      };
    }
  });
  
  return server;
}
```

**File**: [`src/weaviate/client.ts`](src/weaviate/client.ts) (MODIFIED)

Key changes:
1. Add `userId` parameter to constructor
2. Use user-specific collection names: `Document_${userId}`
3. Add collection name getter method

```typescript
export class WeaviateClientWrapper {
  private client!: WeaviateClient;
  private config: WeaviateConfig;
  private userId: string;
  private collectionName: string;
  private isConnected = false;

  constructor(config: WeaviateConfig, userId: string = 'default') {
    this.config = config;
    this.userId = userId;
    // Sanitize userId for collection name (alphanumeric + underscore only)
    const sanitizedUserId = userId.replace(/[^a-zA-Z0-9_]/g, '_');
    this.collectionName = `Document_${sanitizedUserId}`;
  }

  async ensureSchema(): Promise<void> {
    try {
      // Check if user's collection exists
      const collections = await this.client.collections.listAll();
      const userCollection = collections.find(col => col.name === this.collectionName);

      if (!userCollection) {
        logger.info(`Creating collection for user: ${this.userId}`, {
          collectionName: this.collectionName
        });
        
        await this.client.collections.create({
          name: this.collectionName,
          vectorizers: weaviate.configure.vectorizer.text2VecOpenAI({
            model: 'text-embedding-3-small'
          }),
          properties: [
            // ... same properties as before
          ]
        });
        
        logger.info('User collection created successfully', {
          collectionName: this.collectionName
        });
      } else {
        logger.info('User collection already exists', {
          collectionName: this.collectionName
        });
      }
    } catch (error) {
      logger.error('Failed to ensure schema:', error);
      throw new Error(`Failed to ensure schema: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Update all methods to use this.collectionName instead of 'Document'
  async addDocument(data: Record<string, any>): Promise<string> {
    if (!this.isConnected) {
      throw new Error('Not connected to Weaviate');
    }

    try {
      const collection = this.client.collections.get(this.collectionName);
      const result = await collection.data.insert(data);

      logger.info(`Document added to user collection`, {
        id: result,
        userId: this.userId,
        collectionName: this.collectionName
      });
      return result;
    } catch (error) {
      logger.error('Failed to add document:', error);
      throw new Error(`Failed to add document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ... update all other methods similarly
  
  getCollectionName(): string {
    return this.collectionName;
  }
  
  getUserId(): string {
    return this.userId;
  }
}
```

**File**: [`src/server.ts`](src/server.ts) (MODIFIED for backward compatibility)

```typescript
#!/usr/bin/env node

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { config } from 'dotenv';
import { createIndexServer } from './server-factory.js';
import { WeaviateConfig } from './types/weaviate.js';
import { logger } from './utils/logger.js';

// Load environment variables
config();

// Backward compatible: single-user stdio mode
async function main() {
  try {
    logger.info('Starting Index MCP Server (stdio mode)...');

    const weaviateConfig: WeaviateConfig = {
      url: process.env.WEAVIATE_URL || 'http://localhost:8080',
      apiKey: process.env.WEAVIATE_API_KEY,
      timeout: parseInt(process.env.WEAVIATE_TIMEOUT || '30000'),
      retries: parseInt(process.env.WEAVIATE_RETRIES || '3')
    };

    // Create server for default user
    const server = await createIndexServer(weaviateConfig, 'default-user');

    // Start with stdio transport
    const transport = new StdioServerTransport();
    await server.connect(transport);

    logger.info('Index MCP Server started successfully (stdio mode)');
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  process.exit(0);
});

process.on('SIGTERM', async () => {
  process.exit(0);
});

main().catch((error) => {
  logger.error('Server startup failed:', error);
  process.exit(1);
});
```

**File**: [`package.json`](package.json) (MODIFIED exports)

```json
{
  "name": "@prmichaelsen/index",
  "version": "0.1.0",
  "description": "Index - MCP server providing semantic search and vector database capabilities using Weaviate",
  "main": "dist/server.js",
  "type": "module",
  "exports": {
    ".": {
      "types": "./dist/server.d.ts",
      "import": "./dist/server.js"
    },
    "./factory": {
      "types": "./dist/server-factory.d.ts",
      "import": "./dist/server-factory.js"
    },
    "./client": {
      "types": "./dist/weaviate/client.d.ts",
      "import": "./dist/weaviate/client.js"
    },
    "./types": {
      "types": "./dist/types/index.d.ts",
      "import": "./dist/types/index.js"
    }
  },
  "scripts": {
    "build": "node esbuild.build.js",
    "watch": "node esbuild.watch.js",
    "start": "node dist/server.js",
    "test": "vitest",
    "test:watch": "vitest --watch",
    "lint": "eslint src --ext .ts",
    "clean": "rm -rf dist"
  },
  "keywords": [
    "mcp",
    "weaviate",
    "vector-database",
    "semantic-search",
    "ai",
    "multi-tenant"
  ],
  "author": "Patrick Michaelsen",
  "license": "MIT",
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "dotenv": "^16.3.1",
    "weaviate-client": "^3.0.8"
  },
  "devDependencies": {
    "@types/node": "^20.10.0",
    "@typescript-eslint/eslint-plugin": "^6.14.0",
    "@typescript-eslint/parser": "^6.14.0",
    "esbuild": "^0.25.10",
    "eslint": "^8.55.0",
    "tsx": "^4.6.0",
    "typescript": "^5.3.0",
    "vitest": "^1.0.0"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

### Phase 2: Create Multi-Tenant Wrapper Server

**Project**: `index-mcp-server` (new project in agentbase.me ecosystem)

**File**: `package.json`

```json
{
  "name": "index-mcp-server",
  "version": "1.0.0",
  "description": "Multi-tenant Index MCP server with Firebase authentication",
  "type": "module",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "tsx watch src/index.ts"
  },
  "dependencies": {
    "@prmichaelsen/index": "file:../index",
    "@prmichaelsen/mcp-auth": "file:../mcp-auth",
    "@modelcontextprotocol/sdk": "^1.0.4",
    "firebase-auth-cloudflare-workers": "^1.0.0"
  },
  "devDependencies": {
    "@types/node": "^22.19.10",
    "tsx": "^4.19.2",
    "typescript": "^5.7.2"
  }
}
```

**File**: `src/index.ts`

```typescript
import { wrapServer } from '@prmichaelsen/mcp-auth';
import { createIndexServer } from '@prmichaelsen/index/factory';
import { WeaviateConfig } from '@prmichaelsen/index/types';
import { FirebaseAuthProvider } from './auth/firebase-provider.js';
import { WeaviateAccessProvider } from './auth/weaviate-access-provider.js';

// Configuration from environment
const config = {
  firebaseProjectId: process.env.FIREBASE_PROJECT_ID || 'agentbase-prod',
  weaviateUrl: process.env.WEAVIATE_URL!,
  weaviateApiKey: process.env.WEAVIATE_API_KEY,
  openaiApiKey: process.env.OPENAI_APIKEY!,
  port: parseInt(process.env.PORT || '8080'),
  host: process.env.HOST || '0.0.0.0',
};

if (!config.weaviateUrl) {
  throw new Error('WEAVIATE_URL environment variable is required');
}

if (!config.openaiApiKey) {
  throw new Error('OPENAI_APIKEY environment variable is required');
}

// Create auth provider (validates Firebase JWT)
const authProvider = new FirebaseAuthProvider({
  projectId: config.firebaseProjectId,
});

// Create Weaviate access provider (manages user collections)
const accessProvider = new WeaviateAccessProvider({
  weaviateUrl: config.weaviateUrl,
  weaviateApiKey: config.weaviateApiKey,
  openaiApiKey: config.openaiApiKey,
});

// Wrap index server with authentication
const wrappedServer = wrapServer({
  // Factory function: creates a new index server for each user
  serverFactory: async (userId: string) => {
    const weaviateConfig: WeaviateConfig = {
      url: config.weaviateUrl,
      apiKey: config.weaviateApiKey,
      timeout: 30000,
      retries: 3
    };
    
    return createIndexServer(weaviateConfig, userId, {
      name: `index-${userId}`,
      version: '1.0.0'
    });
  },
  
  // Authentication configuration
  authProvider,
  tokenResolver: accessProvider, // Weaviate doesn't need external tokens
  resourceType: 'weaviate',
  
  // Transport configuration
  transport: {
    type: 'sse',
    port: config.port,
    host: config.host,
    basePath: '/mcp'
  },
  
  // Optional: Server pooling for performance
  pooling: {
    enabled: true,
    maxServers: 100,
    idleTimeoutMs: 10 * 60 * 1000, // 10 minutes
  },
  
  // Optional: Rate limiting
  middleware: {
    rateLimit: {
      enabled: true,
      maxRequests: 1000,
      windowMs: 60 * 60 * 1000, // 1 hour per user
    },
    logging: {
      enabled: true,
      level: 'info',
    }
  }
});

// Start the server
async function main() {
  await wrappedServer.start();
  console.log(`Multi-tenant Index MCP server running on http://${config.host}:${config.port}/mcp`);
  console.log(`Firebase Project: ${config.firebaseProjectId}`);
  console.log(`Weaviate URL: ${config.weaviateUrl}`);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
```

**File**: `src/auth/firebase-provider.ts`

```typescript
import { AuthProvider, AuthResult, RequestContext } from '@prmichaelsen/mcp-auth';
import { Auth } from 'firebase-auth-cloudflare-workers';

export interface FirebaseAuthProviderConfig {
  projectId: string;
}

/**
 * Firebase JWT authentication provider
 * 
 * Validates Firebase ID tokens without requiring Admin SDK
 * Compatible with Cloudflare Workers and serverless environments
 */
export class FirebaseAuthProvider implements AuthProvider {
  private auth: Auth;
  
  constructor(config: FirebaseAuthProviderConfig) {
    this.auth = new Auth({
      projectId: config.projectId,
    });
  }
  
  async authenticate(context: RequestContext): Promise<AuthResult> {
    try {
      // Extract JWT from Authorization header
      const authHeader = context.headers?.['authorization'];
      if (!authHeader || Array.isArray(authHeader)) {
        return {
          authenticated: false,
          error: 'No authorization header provided'
        };
      }
      
      // Parse Bearer token
      const parts = authHeader.split(' ');
      if (parts.length !== 2 || parts[0] !== 'Bearer') {
        return {
          authenticated: false,
          error: 'Invalid authorization header format. Expected: Bearer <token>'
        };
      }
      
      const token = parts[1];
      
      // Verify Firebase ID token
      const decodedToken = await this.auth.verifyIdToken(token);
      
      if (!decodedToken.uid) {
        return {
          authenticated: false,
          error: 'Invalid token: missing user ID'
        };
      }
      
      return {
        authenticated: true,
        userId: decodedToken.uid,
        metadata: {
          email: decodedToken.email,
          emailVerified: decodedToken.email_verified,
        }
      };
    } catch (error) {
      return {
        authenticated: false,
        error: error instanceof Error ? error.message : 'Token verification failed'
      };
    }
  }
}
```

**File**: `src/auth/weaviate-access-provider.ts`

```typescript
import { ResourceTokenResolver } from '@prmichaelsen/mcp-auth';

export interface WeaviateAccessProviderConfig {
  weaviateUrl: string;
  weaviateApiKey?: string;
  openaiApiKey: string;
}

/**
 * Weaviate access provider
 * 
 * For Weaviate, we don't need to resolve external tokens.
 * The WeaviateClientWrapper handles collection isolation per user.
 * This provider just returns the Weaviate connection info.
 */
export class WeaviateAccessProvider implements ResourceTokenResolver {
  private config: WeaviateAccessProviderConfig;
  
  constructor(config: WeaviateAccessProviderConfig) {
    this.config = config;
  }
  
  async resolveToken(userId: string, resourceType: string): Promise<string | null> {
    if (resourceType !== 'weaviate') {
      return null;
    }
    
    // For Weaviate, we don't need per-user tokens
    // The collection isolation is handled by the WeaviateClientWrapper
    // Return a placeholder to indicate access is granted
    return 'weaviate-access-granted';
  }
  
  async initialize(): Promise<void> {
    console.log('Weaviate access provider initialized');
  }
  
  async cleanup(): Promise<void> {
    console.log('Weaviate access provider cleaned up');
  }
}
```

### Phase 3: Deployment Configuration

**File**: `Dockerfile`

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy built application
COPY dist ./dist

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start server
CMD ["node", "dist/index.js"]
```

**File**: `.env.example`

```env
# Firebase Configuration
FIREBASE_PROJECT_ID=agentbase-prod

# Weaviate Configuration
WEAVIATE_URL=https://your-cluster.weaviate.network
WEAVIATE_API_KEY=your-weaviate-api-key

# OpenAI Configuration (for embeddings)
OPENAI_APIKEY=your-openai-api-key

# Server Configuration
PORT=8080
HOST=0.0.0.0
NODE_ENV=production

# Optional: Logging
LOG_LEVEL=info
```

**File**: `cloudbuild.yaml` (Google Cloud Build)

```yaml
steps:
  # Build the container image
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'gcr.io/$PROJECT_ID/index-mcp-server:$COMMIT_SHA', '.']
  
  # Push the container image
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'gcr.io/$PROJECT_ID/index-mcp-server:$COMMIT_SHA']
  
  # Deploy to Cloud Run
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: gcloud
    args:
      - 'run'
      - 'deploy'
      - 'index-mcp-server'
      - '--image'
      - 'gcr.io/$PROJECT_ID/index-mcp-server:$COMMIT_SHA'
      - '--region'
      - 'us-central1'
      - '--platform'
      - 'managed'
      - '--allow-unauthenticated'
      - '--set-env-vars'
      - 'FIREBASE_PROJECT_ID=${_FIREBASE_PROJECT_ID},WEAVIATE_URL=${_WEAVIATE_URL},WEAVIATE_API_KEY=${_WEAVIATE_API_KEY},OPENAI_APIKEY=${_OPENAI_APIKEY}'

images:
  - 'gcr.io/$PROJECT_ID/index-mcp-server:$COMMIT_SHA'
```

## Data Isolation Strategy

### Collection Naming Convention

Each user gets their own Weaviate collection:
- Format: `Document_{sanitized_userId}`
- Example: `Document_abc123def456` for user `abc123def456`
- Sanitization: Replace non-alphanumeric characters with underscores

### Benefits
1. **Strong Isolation**: Physical separation of user data
2. **Performance**: No filter overhead on queries
3. **Scalability**: Weaviate handles collection management efficiently
4. **Security**: No risk of filter bypass vulnerabilities

### Considerations
- **Collection Limit**: Weaviate Cloud has collection limits (check pricing tier)
- **Alternative**: If hitting limits, use single collection with `userId` filter
  - Add `userId` property to schema
  - Filter all queries by `userId`
  - Trade-off: Slightly slower queries, but unlimited users

## Integration with agentbase.me

### User Flow

1. **User Authentication**
   - User logs into agentbase.me via Firebase Auth
   - Receives Firebase ID token

2. **MCP Connection**
   - User's MCP client connects to `https://index.agentbase.me/mcp`
   - Includes `Authorization: Bearer <firebase-token>` header

3. **Request Processing**
   - Server validates Firebase token → extracts `userId`
   - Creates/retrieves user's Weaviate collection
   - Executes tool with user-scoped data

4. **Response**
   - Results returned only from user's collection
   - Complete data isolation guaranteed

### agentbase.me Integration Points

**Frontend** (`~/agentbase.me`):
- Add "Index" integration card to integrations page
- No OAuth needed (uses Firebase auth directly)
- Configuration: Just enable/disable toggle

**Database** (Firestore):
```
users/{userId}/integrations/index
  - enabled: boolean
  - createdAt: timestamp
  - lastUsed: timestamp
  - documentCount: number (optional tracking)
```

## Performance Optimization

### Server Pooling
- Keep server instances alive for 10 minutes after last use
- Reuse instances for same user
- Max 100 concurrent server instances

### Connection Pooling
- Weaviate client connection reuse
- Lazy collection creation
- Cache collection existence checks

### Rate Limiting
- 1000 requests per hour per user
- Prevents abuse and controls costs
- Configurable per deployment

## Cost Considerations

### Weaviate Cloud Costs
- **Storage**: ~$0.10/GB/month
- **Compute**: Based on cluster size
- **Vectors**: Text embeddings via OpenAI

### OpenAI Costs
- **text-embedding-3-small**: $