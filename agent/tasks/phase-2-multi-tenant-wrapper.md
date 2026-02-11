# Phase 2: Create Multi-Tenant Wrapper

**Estimated Duration**: 6-8 hours  
**Status**: Not Started  
**Dependencies**: Phase 1 (Refactor Index Core)

## Overview

Create a new `index-mcp-server` project that wraps the index server with authentication and multi-tenancy support using the `@prmichaelsen/mcp-auth` framework.

## Goals

- Create standalone multi-tenant server project
- Integrate Firebase authentication
- Implement Weaviate access provider
- Configure SSE transport for remote access
- Enable server pooling and rate limiting

## Tasks

### Task 2.1: Initialize Project
**Location**: `~/index-mcp-server/`

**Checklist**:
- [ ] Create project directory: `mkdir -p ~/index-mcp-server/src/auth`
- [ ] Initialize npm: `npm init -y`
- [ ] Install dependencies (see below)
- [ ] Create `tsconfig.json`
- [ ] Create `.gitignore`
- [ ] Create `README.md`
- [ ] Create `.env.example`
- [ ] Set up directory structure

**Dependencies**:
```bash
npm install @prmichaelsen/index@file:../index
npm install @prmichaelsen/mcp-auth@file:../mcp-auth
npm install @modelcontextprotocol/sdk@^1.0.4
npm install firebase-auth-cloudflare-workers@^1.0.0
npm install --save-dev @types/node@^22.19.10
npm install --save-dev tsx@^4.19.2
npm install --save-dev typescript@^5.7.2
```

**Directory Structure**:
```
index-mcp-server/
├── src/
│   ├── index.ts
│   └── auth/
│       ├── firebase-provider.ts
│       └── weaviate-access-provider.ts
├── tests/
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

**Validation**:
- [ ] Project structure created
- [ ] Dependencies installed successfully
- [ ] TypeScript configured
- [ ] Can run `npm run build`

---

### Task 2.2: Implement Firebase Auth Provider
**File**: `src/auth/firebase-provider.ts`

**Checklist**:
- [ ] Create file `src/auth/firebase-provider.ts`
- [ ] Import `AuthProvider` interface from mcp-auth
- [ ] Import `Auth` from firebase-auth-cloudflare-workers
- [ ] Create `FirebaseAuthProviderConfig` interface
- [ ] Implement `FirebaseAuthProvider` class
- [ ] Implement `authenticate()` method
- [ ] Extract Bearer token from headers
- [ ] Verify Firebase ID token
- [ ] Extract userId from decoded token
- [ ] Handle authentication errors
- [ ] Add proper error messages
- [ ] Add JSDoc documentation

**Key Methods**:
```typescript
async authenticate(context: RequestContext): Promise<AuthResult> {
  // 1. Extract Authorization header
  // 2. Parse Bearer token
  // 3. Verify with Firebase
  // 4. Extract userId
  // 5. Return AuthResult
}
```

**Validation**:
- [ ] Valid tokens authenticate successfully
- [ ] Invalid tokens rejected with clear errors
- [ ] Expired tokens rejected
- [ ] Missing tokens rejected
- [ ] userId extracted correctly
- [ ] No Firebase Admin SDK dependency
- [ ] TypeScript types correct

**Test Cases**:
- [ ] Valid Firebase JWT → authenticated: true
- [ ] Invalid JWT → authenticated: false
- [ ] Expired JWT → authenticated: false
- [ ] Missing header → authenticated: false
- [ ] Malformed header → authenticated: false

---

### Task 2.3: Implement Weaviate Access Provider
**File**: `src/auth/weaviate-access-provider.ts`

**Checklist**:
- [ ] Create file `src/auth/weaviate-access-provider.ts`
- [ ] Import `ResourceTokenResolver` interface from mcp-auth
- [ ] Create `WeaviateAccessProviderConfig` interface
- [ ] Implement `WeaviateAccessProvider` class
- [ ] Implement `resolveToken()` method
- [ ] Return placeholder token for 'weaviate' resource type
- [ ] Return null for other resource types
- [ ] Implement `initialize()` method (optional)
- [ ] Implement `cleanup()` method (optional)
- [ ] Add JSDoc documentation

**Note**: Unlike Instagram/OAuth services, Weaviate doesn't need per-user tokens. The `WeaviateClientWrapper` handles isolation via collection names.

**Validation**:
- [ ] Implements interface correctly
- [ ] Returns non-null for 'weaviate' resource type
- [ ] Returns null for other resource types
- [ ] Logs appropriately
- [ ] TypeScript types correct

**Code Template**:
```typescript
export class WeaviateAccessProvider implements ResourceTokenResolver {
  async resolveToken(userId: string, resourceType: string): Promise<string | null> {
    if (resourceType !== 'weaviate') {
      return null;
    }
    // Collection isolation handled by WeaviateClientWrapper
    return 'weaviate-access-granted';
  }
}
```

---

### Task 2.4: Create Main Server Entry Point
**File**: `src/index.ts`

**Checklist**:
- [ ] Create file `src/index.ts`
- [ ] Import `wrapServer` from mcp-auth
- [ ] Import `createIndexServer` from index factory
- [ ] Import `WeaviateConfig` type
- [ ] Import auth providers
- [ ] Load environment variables
- [ ] Validate required environment variables
- [ ] Create Firebase auth provider instance
- [ ] Create Weaviate access provider instance
- [ ] Configure server factory function
- [ ] Configure SSE transport
- [ ] Enable server pooling
- [ ] Enable rate limiting
- [ ] Add logging configuration
- [ ] Implement main() function
- [ ] Add error handling
- [ ] Add graceful shutdown

**Configuration**:
```typescript
const wrappedServer = wrapServer({
  serverFactory: async (userId: string) => {
    const weaviateConfig: WeaviateConfig = {
      url: process.env.WEAVIATE_URL!,
      apiKey: process.env.WEAVIATE_API_KEY,
      timeout: 30000,
      retries: 3
    };
    return createIndexServer(weaviateConfig, userId);
  },
  authProvider,
  tokenResolver: accessProvider,
  resourceType: 'weaviate',
  transport: {
    type: 'sse',
    port: 8080,
    host: '0.0.0.0',
    basePath: '/mcp'
  },
  pooling: {
    enabled: true,
    maxServers: 100,
    idleTimeoutMs: 10 * 60 * 1000
  },
  middleware: {
    rateLimit: {
      enabled: true,
      maxRequests: 1000,
      windowMs: 60 * 60 * 1000
    },
    logging: {
      enabled: true,
      level: 'info'
    }
  }
});
```

**Validation**:
- [ ] Server starts successfully
- [ ] Environment variables loaded
- [ ] Configuration validated
- [ ] No TypeScript errors
- [ ] Logs startup information

---

### Task 2.5: Create Environment Configuration
**File**: `.env.example`

**Checklist**:
- [ ] Create `.env.example` file
- [ ] Document `FIREBASE_PROJECT_ID`
- [ ] Document `WEAVIATE_URL`
- [ ] Document `WEAVIATE_API_KEY`
- [ ] Document `OPENAI_APIKEY`
- [ ] Document `PORT` (optional)
- [ ] Document `HOST` (optional)
- [ ] Document `NODE_ENV` (optional)
- [ ] Document `LOG_LEVEL` (optional)
- [ ] Add comments explaining each variable
- [ ] Provide example values

**Validation**:
- [ ] All required variables documented
- [ ] Examples provided
- [ ] Comments clear and helpful
- [ ] Format consistent

**Template**:
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

---

### Task 2.6: Configure Package Scripts
**File**: `package.json`

**Checklist**:
- [ ] Add `build` script: `tsc`
- [ ] Add `start` script: `node dist/index.js`
- [ ] Add `dev` script: `tsx watch src/index.ts`
- [ ] Add `test` script: `vitest`
- [ ] Add `lint` script: `eslint src --ext .ts`
- [ ] Set `type: "module"`
- [ ] Set `main: "dist/index.js"`
- [ ] Add proper metadata

**Validation**:
- [ ] `npm run build` works
- [ ] `npm start` works
- [ ] `npm run dev` works (watch mode)
- [ ] All scripts functional

---

### Task 2.7: Build and Local Test
**Commands**:
```bash
cd ~/index-mcp-server
npm run build
npm run dev
```

**Test Scenarios**:

1. **No Authentication**:
   - [ ] Send request without auth header
   - [ ] Expect 401 Unauthorized
   - [ ] Verify error message clear

2. **Invalid Token**:
   - [ ] Send request with invalid Firebase token
   - [ ] Expect 401 Unauthorized
   - [ ] Verify error message helpful

3. **Valid Authentication**:
   - [ ] Send request with valid Firebase token
   - [ ] Expect 200 OK
   - [ ] Verify userId extracted
   - [ ] Verify collection created

4. **Index Document**:
   - [ ] Authenticate as user A
   - [ ] Index a test document
   - [ ] Verify document added
   - [ ] Check collection name: `Document_{userA_id}`

5. **Search Document**:
   - [ ] Authenticate as user A
   - [ ] Search for indexed document
   - [ ] Verify document found
   - [ ] Verify correct results

6. **Data Isolation**:
   - [ ] Authenticate as user B
   - [ ] Search for user A's document
   - [ ] Verify no results (isolation confirmed)
   - [ ] Index document as user B
   - [ ] Verify user B's document separate

7. **All Tools**:
   - [ ] Test `search_index`
   - [ ] Test `index_new`
   - [ ] Test `index_existing`
   - [ ] Test `unindex`
   - [ ] Test `find_similar_in_index`
   - [ ] Test `ask_index`

**Validation**:
- [ ] Server starts on port 8080
- [ ] Authentication works correctly
- [ ] User collections created automatically
- [ ] Data isolation verified
- [ ] All tools functional
- [ ] No errors in logs
- [ ] Performance acceptable

---

## Testing Strategy

### Unit Tests
Create `tests/firebase-provider.test.ts`:
```typescript
describe('FirebaseAuthProvider', () => {
  it('should validate valid JWT', async () => {
    const provider = new FirebaseAuthProvider({ 
      projectId: 'test-project' 
    });
    const result = await provider.authenticate({
      headers: { authorization: 'Bearer valid-jwt' },
      transport: 'sse',
      timestamp: new Date()
    });
    expect(result.authenticated).toBe(true);
    expect(result.userId).toBeDefined();
  });
  
  it('should reject invalid JWT', async () => {
    // Test implementation
  });
});
```

### Integration Tests
Create `tests/integration.test.ts`:
```typescript
describe('Multi-tenant Index Server', () => {
  it('should isolate data between users', async () => {
    // 1. Index document as user A
    // 2. Search as user A → found
    // 3. Search as user B → not found
  });
});
```

---

## Rollback Plan

If issues arise:
1. Stop the server
2. Review error logs
3. Fix configuration issues
4. Revert code changes if needed
5. Test with single user first
6. Gradually add multi-tenancy

---

## Success Criteria

- [ ] All tasks completed
- [ ] All validation checks passed
- [ ] Tests passing
- [ ] Build succeeds
- [ ] Server starts successfully
- [ ] Authentication works
- [ ] Data isolation verified
- [ ] All tools functional
- [ ] Documentation updated
- [ ] Code reviewed

---

## Notes

- Test thoroughly with multiple users
- Monitor memory usage during testing
- Check for connection leaks
- Verify server pooling works
- Test rate limiting
- Document any issues encountered
- Update progress.yaml after each task
