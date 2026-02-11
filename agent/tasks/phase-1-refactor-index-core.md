# Phase 1: Refactor Index Core

**Estimated Duration**: 4-6 hours  
**Status**: Not Started  
**Dependencies**: None

## Overview

Extract server creation logic into a reusable factory function while maintaining backward compatibility with the existing stdio mode.

## Goals

- Make index exportable as a server factory
- Support per-user Weaviate collections
- Maintain backward compatibility
- No breaking changes to existing functionality

## Tasks

### Task 1.1: Create Server Factory Module
**File**: `src/server-factory.ts`

**Checklist**:
- [ ] Create new file `src/server-factory.ts`
- [ ] Extract server creation logic from `src/server.ts`
- [ ] Create `createIndexServer(weaviateConfig, userId, options)` function
- [ ] Accept `WeaviateConfig` and `userId` as parameters
- [ ] Return configured `Server` instance
- [ ] Include all tool registrations (6 tools)
- [ ] Include tool execution handlers
- [ ] Add proper TypeScript types
- [ ] Add JSDoc documentation
- [ ] Export function and types

**Validation**:
- [ ] Function exports successfully
- [ ] TypeScript types are correct
- [ ] No circular dependencies
- [ ] Build succeeds without errors

**Code Template**:
```typescript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { WeaviateConfig } from './types/weaviate.js';

export interface ServerOptions {
  name?: string;
  version?: string;
}

export async function createIndexServer(
  weaviateConfig: WeaviateConfig,
  userId: string,
  options?: ServerOptions
): Promise<Server> {
  // Implementation
}
```

---

### Task 1.2: Modify WeaviateClientWrapper
**File**: `src/weaviate/client.ts`

**Checklist**:
- [ ] Add `userId` parameter to constructor
- [ ] Add `collectionName` private property
- [ ] Implement userId sanitization (alphanumeric + underscore only)
- [ ] Generate collection name: `Document_${sanitizedUserId}`
- [ ] Update `ensureSchema()` to use `this.collectionName`
- [ ] Update `addDocument()` to use `this.collectionName`
- [ ] Update `updateDocument()` to use `this.collectionName`
- [ ] Update `deleteDocument()` to use `this.collectionName`
- [ ] Update `searchDocuments()` to use `this.collectionName`
- [ ] Update `hybridSearch()` to use `this.collectionName`
- [ ] Update `findSimilar()` to use `this.collectionName`
- [ ] Add `getCollectionName()` method
- [ ] Add `getUserId()` method
- [ ] Update logging to include userId and collectionName
- [ ] Add default value for userId parameter ('default')

**Validation**:
- [ ] Collection names are properly sanitized
- [ ] All CRUD operations use correct collection
- [ ] Logging includes userId and collectionName
- [ ] Backward compatible with default user
- [ ] No TypeScript errors

**Code Changes**:
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
    // Sanitize userId for collection name
    const sanitizedUserId = userId.replace(/[^a-zA-Z0-9_]/g, '_');
    this.collectionName = `Document_${sanitizedUserId}`;
  }

  getCollectionName(): string {
    return this.collectionName;
  }
  
  getUserId(): string {
    return this.userId;
  }
}
```

---

### Task 1.3: Update Main Server Entry Point
**File**: `src/server.ts`

**Checklist**:
- [ ] Import `createIndexServer` from `./server-factory.js`
- [ ] Import `WeaviateConfig` type
- [ ] Remove server creation logic (moved to factory)
- [ ] Call `createIndexServer()` with default config
- [ ] Pass 'default-user' as userId
- [ ] Maintain stdio transport setup
- [ ] Keep environment variable loading
- [ ] Keep graceful shutdown handlers
- [ ] Update logging messages
- [ ] Test backward compatibility

**Validation**:
- [ ] Existing stdio mode still works
- [ ] No breaking changes to CLI usage
- [ ] Environment variables work as before
- [ ] Can run with `npm start`
- [ ] Documents indexed to `Document_default` collection

**Code Template**:
```typescript
#!/usr/bin/env node

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { config } from 'dotenv';
import { createIndexServer } from './server-factory.js';
import { WeaviateConfig } from './types/weaviate.js';
import { logger } from './utils/logger.js';

config();

async function main() {
  const weaviateConfig: WeaviateConfig = {
    url: process.env.WEAVIATE_URL || 'http://localhost:8080',
    apiKey: process.env.WEAVIATE_API_KEY,
    timeout: parseInt(process.env.WEAVIATE_TIMEOUT || '30000'),
    retries: parseInt(process.env.WEAVIATE_RETRIES || '3')
  };

  const server = await createIndexServer(weaviateConfig, 'default-user');
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  logger.error('Server startup failed:', error);
  process.exit(1);
});
```

---

### Task 1.4: Update Package Exports
**File**: `package.json`

**Checklist**:
- [ ] Add `./factory` export pointing to `dist/server-factory.js`
- [ ] Add `./client` export pointing to `dist/weaviate/client.js`
- [ ] Add `./types` export pointing to `dist/types/weaviate.js`
- [ ] Ensure main entry point remains `dist/server.js`
- [ ] Update keywords to include 'multi-tenant'
- [ ] Verify all exports have TypeScript declarations

**Validation**:
- [ ] All exports resolve correctly
- [ ] TypeScript declarations generated
- [ ] No import errors
- [ ] Can import from `@prmichaelsen/index/factory`

**Package.json Changes**:
```json
{
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
      "types": "./dist/types/weaviate.d.ts",
      "import": "./dist/types/weaviate.js"
    }
  }
}
```

---

### Task 1.5: Build and Test
**Commands**: 
```bash
cd ~/index
npm run build
npm start
```

**Checklist**:
- [ ] Run `npm run build` - succeeds without errors
- [ ] Run `npm start` - server starts successfully
- [ ] Test `index_new` tool - document indexed
- [ ] Test `search_index` tool - document found
- [ ] Test `find_similar_in_index` tool - similar docs found
- [ ] Test `ask_index` tool - questions answered
- [ ] Test `index_existing` tool - file indexed
- [ ] Test `unindex` tool - document removed
- [ ] Verify collection name is `Document_default`
- [ ] Check logs for proper userId logging
- [ ] Verify no TypeScript errors
- [ ] Verify no runtime errors

**Validation**:
- [ ] Build succeeds without errors
- [ ] Stdio mode works with default user
- [ ] All tools function correctly
- [ ] Documents indexed to `Document_default` collection
- [ ] No breaking changes to existing functionality

---

## Testing Strategy

### Unit Tests
Create `tests/server-factory.test.ts`:
```typescript
import { createIndexServer } from '../src/server-factory.js';
import { WeaviateConfig } from '../src/types/weaviate.js';

describe('createIndexServer', () => {
  it('should create server with valid config', async () => {
    const config: WeaviateConfig = {
      url: 'http://localhost:8080',
      timeout: 30000,
      retries: 3
    };
    const server = await createIndexServer(config, 'test-user');
    expect(server).toBeDefined();
  });
  
  it('should sanitize userId in collection name', async () => {
    // Test implementation
  });
});
```

### Integration Tests
- [ ] Test with real Weaviate instance
- [ ] Index document as 'user1'
- [ ] Search as 'user1' - find document
- [ ] Search as 'user2' - no results (isolation)

---

## Rollback Plan

If issues arise:
1. Revert changes to `src/server.ts`
2. Remove `src/server-factory.ts`
3. Revert changes to `src/weaviate/client.ts`
4. Revert changes to `package.json`
5. Run `npm run build` to restore working state

---

## Success Criteria

- [ ] All tasks completed
- [ ] All validation checks passed
- [ ] Tests passing
- [ ] Build succeeds
- [ ] Stdio mode works
- [ ] No breaking changes
- [ ] Documentation updated
- [ ] Code reviewed

---

## Notes

- Keep changes minimal and focused
- Maintain backward compatibility at all times
- Test thoroughly before moving to Phase 2
- Document any deviations from plan
- Update progress.yaml after each task
