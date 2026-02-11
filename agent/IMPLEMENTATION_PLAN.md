# Multi-Tenant Index MCP Server - Implementation Plan

**Last Updated**: 2026-02-11
**Status**: Phase 0 Complete, Ready to Begin Phase 1

---

## Current Status

### ✅ Completed
- **Phase 0: Planning & Design** - All planning documents created
- **Documentation** - README.md updated with comprehensive documentation
- **Progress Tracking** - progress.yaml created and maintained
- **Architecture Design** - Multi-tenant design documented

### 🔄 In Progress
- None - Ready to begin implementation

### ⏸️ Not Started
- Phase 1: Refactor Index Core
- Phase 2: Multi-Tenant Wrapper
- Phase 3: Deployment Configuration
- Phase 4: agentbase.me Integration
- Phase 5: Testing & Validation
- Phase 6: Documentation
- Phase 7: Production Deployment

### 📊 Current Implementation Analysis
The existing codebase is a **fully functional single-tenant MCP server** with:
- ✅ 6 working tools (search, index, unindex, find similar, ask)
- ✅ Weaviate v3 client integration
- ✅ OpenAI embeddings (text-embedding-3-small)
- ✅ Hybrid search (semantic + keyword)
- ✅ Rich metadata support
- ❌ No multi-tenancy (single "Document" collection)
- ❌ No authentication
- ❌ No server factory pattern
- ❌ No package exports for library use

**Next Action**: Begin Phase 1, Task 1.1 - Create `src/server-factory.ts`

---

## Overview

This document provides a step-by-step implementation plan for transforming the `index` MCP server into a multi-tenant service integrated with agentbase.me.

## Prerequisites

- ✅ `@prmichaelsen/mcp-auth` framework (Phase 4 complete)
- ✅ Weaviate Cloud instance with API access
- ✅ OpenAI API key for embeddings
- ✅ Firebase project for authentication
- ✅ agentbase.me platform infrastructure

## Implementation Phases

### Phase 1: Refactor Index Core (Estimated: 4-6 hours)

**Goal**: Make index exportable as a server factory without breaking existing functionality.

#### Step 1.1: Create Server Factory Module
**File**: `src/server-factory.ts`

**Tasks**:
1. Extract server creation logic from [`src/server.ts`](src/server.ts)
2. Create `createIndexServer(weaviateConfig, userId, options)` function
3. Accept `WeaviateConfig` and `userId` as parameters
4. Return configured `Server` instance
5. Include all tool registrations and handlers

**Validation**:
- [ ] Function exports successfully
- [ ] TypeScript types are correct
- [ ] No circular dependencies

#### Step 1.2: Modify WeaviateClientWrapper
**File**: `src/weaviate/client.ts`

**Tasks**:
1. Add `userId` parameter to constructor
2. Generate collection name: `Document_${sanitizedUserId}`
3. Update `ensureSchema()` to create user-specific collection
4. Update all methods to use `this.collectionName`
5. Add `getCollectionName()` and `getUserId()` methods
6. Add collection name sanitization (alphanumeric + underscore only)

**Changes Required**:
```typescript
// Before
constructor(config: WeaviateConfig) {
  this.config = config;
}

// After
constructor(config: WeaviateConfig, userId: string = 'default') {
  this.config = config;
  this.userId = userId;
  const sanitizedUserId = userId.replace(/[^a-zA-Z0-9_]/g, '_');
  this.collectionName = `Document_${sanitizedUserId}`;
}
```

**Validation**:
- [ ] Collection names are properly sanitized
- [ ] All CRUD operations use correct collection
- [ ] Logging includes userId and collectionName
- [ ] Backward compatible with default user

#### Step 1.3: Update Main Server Entry Point
**File**: `src/server.ts`

**Tasks**:
1. Import `createIndexServer` from factory
2. Simplify to call factory with default config
3. Maintain stdio transport for backward compatibility
4. Keep environment variable loading

**Validation**:
- [ ] Existing stdio mode still works
- [ ] No breaking changes to CLI usage
- [ ] Environment variables work as before

#### Step 1.4: Update Package Exports
**File**: `package.json`

**Tasks**:
1. Add `./factory` export for server factory
2. Add `./client` export for WeaviateClientWrapper
3. Add `./types` export for type definitions
4. Ensure main entry point remains unchanged

**Validation**:
- [ ] All exports resolve correctly
- [ ] TypeScript declarations generated
- [ ] No import errors

#### Step 1.5: Build and Test
**Commands**:
```bash
cd ~/index
npm run build
npm start  # Test stdio mode
```

**Validation**:
- [ ] Build succeeds without errors
- [ ] Stdio mode works with default user
- [ ] All tools function correctly
- [ ] Documents indexed to `Document_default` collection

---

### Phase 2: Create Multi-Tenant Wrapper (Estimated: 6-8 hours)

**Goal**: Create new `index-mcp-server` project that wraps index with authentication.

#### Step 2.1: Initialize Project
**Location**: `~/index-mcp-server/`

**Tasks**:
```bash
mkdir -p ~/index-mcp-server/src/auth
cd ~/index-mcp-server
npm init -y
```

1. Create project structure
2. Install dependencies
3. Configure TypeScript
4. Set up build scripts

**Dependencies**:
```json
{
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

**Validation**:
- [ ] Project structure created
- [ ] Dependencies installed
- [ ] TypeScript configured

#### Step 2.2: Implement Firebase Auth Provider
**File**: `src/auth/firebase-provider.ts`

**Tasks**:
1. Implement `AuthProvider` interface from mcp-auth
2. Use `firebase-auth-cloudflare-workers` for token validation
3. Extract `userId` from Firebase JWT
4. Handle authentication errors gracefully

**Key Methods**:
- `authenticate(context: RequestContext): Promise<AuthResult>`
- Extract Bearer token from headers
- Verify with Firebase
- Return userId on success

**Validation**:
- [ ] Valid tokens authenticate successfully
- [ ] Invalid tokens rejected with clear errors
- [ ] userId extracted correctly
- [ ] No Firebase Admin SDK dependency

#### Step 2.3: Implement Weaviate Access Provider
**File**: `src/auth/weaviate-access-provider.ts`

**Tasks**:
1. Implement `ResourceTokenResolver` interface
2. Return placeholder token (Weaviate uses collection isolation)
3. Add initialization and cleanup methods

**Note**: Unlike Instagram/OAuth services, Weaviate doesn't need per-user tokens. The `WeaviateClientWrapper` handles isolation via collection names.

**Validation**:
- [ ] Implements interface correctly
- [ ] Returns non-null for 'weaviate' resource type
- [ ] Logs appropriately

#### Step 2.4: Create Main Server Entry Point
**File**: `src/index.ts`

**Tasks**:
1. Import `wrapServer` from mcp-auth
2. Import `createIndexServer` from index factory
3. Configure Firebase auth provider
4. Configure Weaviate access provider
5. Set up server factory function
6. Configure SSE transport
7. Enable server pooling and rate limiting

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
  }
});
```

**Validation**:
- [ ] Server starts successfully
- [ ] Environment variables loaded
- [ ] Configuration validated

#### Step 2.5: Create Environment Configuration
**File**: `.env.example`

**Tasks**:
1. Document all required environment variables
2. Provide example values
3. Add comments for clarity

**Required Variables**:
- `FIREBASE_PROJECT_ID`
- `WEAVIATE_URL`
- `WEAVIATE_API_KEY`
- `OPENAI_APIKEY`
- `PORT` (optional, default 8080)
- `HOST` (optional, default 0.0.0.0)

**Validation**:
- [ ] All variables documented
- [ ] Examples provided
- [ ] Comments clear

#### Step 2.6: Build and Local Test
**Commands**:
```bash
cd ~/index-mcp-server
npm run build
npm run dev  # Watch mode for development
```

**Test Scenarios**:
1. Start server
2. Send request without auth → expect 401
3. Send request with invalid token → expect 401
4. Send request with valid Firebase token → expect success
5. Verify user-specific collection created
6. Index document as user A
7. Search as user A → find document
8. Search as user B → no results (isolation verified)

**Validation**:
- [ ] Server starts on port 8080
- [ ] Authentication works
- [ ] User collections created
- [ ] Data isolation verified
- [ ] All tools functional

---

### Phase 3: Deployment Configuration (Estimated: 3-4 hours)

**Goal**: Prepare for production deployment on Google Cloud Run.

#### Step 3.1: Create Dockerfile
**File**: `Dockerfile`

**Tasks**:
1. Use Node 20 Alpine base image
2. Copy dependencies and built code
3. Expose port 8080
4. Add health check endpoint
5. Set up proper signal handling

**Validation**:
- [ ] Docker image builds successfully
- [ ] Image size optimized
- [ ] Health check works
- [ ] Runs in container locally

**Test**:
```bash
docker build -t index-mcp-server .
docker run -p 8080:8080 --env-file .env index-mcp-server
```

#### Step 3.2: Create Cloud Build Configuration
**File**: `cloudbuild.yaml`

**Tasks**:
1. Define build steps
2. Configure container registry
3. Set up Cloud Run deployment
4. Configure environment variables
5. Set resource limits

**Validation**:
- [ ] YAML syntax valid
- [ ] All steps defined
- [ ] Environment variables configured

#### Step 3.3: Create Deployment Scripts
**File**: `scripts/deploy.sh`

**Tasks**:
1. Build Docker image
2. Push to Google Container Registry
3. Deploy to Cloud Run
4. Configure custom domain
5. Set up health checks

**Validation**:
- [ ] Script executable
- [ ] All commands valid
- [ ] Error handling included

#### Step 3.4: Configure Secrets Management
**Tool**: Google Secret Manager

**Tasks**:
1. Store `WEAVIATE_API_KEY` as secret
2. Store `OPENAI_APIKEY` as secret
3. Configure Cloud Run to access secrets
4. Document secret setup process

**Validation**:
- [ ] Secrets created
- [ ] IAM permissions configured
- [ ] Cloud Run can access secrets

---

### Phase 4: Integration with agentbase.me (Estimated: 4-6 hours)

**Goal**: Add Index integration to agentbase.me platform.

#### Step 4.1: Update Frontend Integration List
**File**: `~/agentbase.me/src/data/integrations.ts`

**Tasks**:
1. Add Index integration card
2. Include description and icon
3. Set up enable/disable toggle
4. Add documentation link

**Integration Object**:
```typescript
{
  id: 'index',
  name: 'Index',
  description: 'Semantic search and vector database for your documents',
  icon: '🔍',
  category: 'productivity',
  status: 'active',
  requiresOAuth: false, // Uses Firebase auth directly
  setupUrl: '/integrations/index',
  docsUrl: 'https://docs.agentbase.me/integrations/index'
}
```

**Validation**:
- [ ] Card displays correctly
- [ ] Toggle works
- [ ] Links functional

#### Step 4.2: Create Integration Page
**File**: `~/agentbase.me/src/routes/integrations/index.tsx`

**Tasks**:
1. Create integration setup page
2. Show connection status
3. Display usage statistics (optional)
4. Provide MCP connection instructions
5. Add troubleshooting section

**Features**:
- Enable/disable toggle
- Connection test button
- MCP endpoint URL display
- Example usage snippets

**Validation**:
- [ ] Page renders correctly
- [ ] Enable/disable works
- [ ] Status updates in real-time

#### Step 4.3: Update Firestore Schema
**Collection**: `users/{userId}/integrations/index`

**Tasks**:
1. Create Firestore security rules
2. Define document structure
3. Add indexes if needed

**Document Structure**:
```typescript
{
  enabled: boolean;
  createdAt: Timestamp;
  lastUsed: Timestamp;
  documentCount?: number;
  collectionName?: string;
}
```

**Security Rules**:
```
match /users/{userId}/integrations/index {
  allow read, write: if request.auth.uid == userId;
}
```

**Validation**:
- [ ] Rules deployed
- [ ] Documents can be created
- [ ] Permissions work correctly

#### Step 4.4: Add Backend API Endpoints (Optional)
**File**: `~/agentbase.me/src/routes/api/integrations/index.tsx`

**Tasks** (if needed):
1. Create enable/disable endpoint
2. Add usage statistics endpoint
3. Implement collection cleanup endpoint

**Validation**:
- [ ] Endpoints functional
- [ ] Authentication enforced
- [ ] Error handling robust

---

### Phase 5: Testing and Validation (Estimated: 6-8 hours)

**Goal**: Comprehensive testing before production release.

#### Step 5.1: Unit Tests
**Location**: `~/index-mcp-server/tests/`

**Test Files**:
1. `firebase-provider.test.ts` - Auth provider tests
2. `weaviate-access-provider.test.ts` - Access provider tests
3. `integration.test.ts` - End-to-end tests

**Test Cases**:
- [ ] Valid Firebase token authenticates
- [ ] Invalid token rejected
- [ ] Expired token rejected
- [ ] Missing token rejected
- [ ] User collection created on first use
- [ ] Data isolation between users
- [ ] All tools work correctly
- [ ] Rate limiting enforced
- [ ] Server pooling works

#### Step 5.2: Integration Tests
**Scenarios**:

1. **User A Flow**:
   - Authenticate as User A
   - Index 5 documents
   - Search and verify results
   - Find similar documents
   - Ask index questions

2. **User B Flow**:
   - Authenticate as User B
   - Search for User A's documents → expect no results
   - Index own documents
   - Verify isolation

3. **Concurrent Users**:
   - Simulate 10 concurrent users
   - Each indexes and searches
   - Verify no cross-contamination
   - Check performance

4. **Error Handling**:
   - Invalid Weaviate credentials
   - Network timeouts
   - Malformed requests
   - Rate limit exceeded

**Validation**:
- [ ] All scenarios pass
- [ ] No data leakage
- [ ] Performance acceptable
- [ ] Errors handled gracefully

#### Step 5.3: Load Testing
**Tool**: Apache Bench or k6

**Tests**:
1. 100 requests/second for 1 minute
2. 1000 concurrent users
3. Large document indexing (10MB)
4. Complex search queries

**Metrics to Monitor**:
- Response time (p50, p95, p99)
- Error rate
- Memory usage
- CPU usage
- Weaviate query performance

**Validation**:
- [ ] Response time < 500ms (p95)
- [ ] Error rate < 0.1%
- [ ] Memory stable
- [ ] No memory leaks

#### Step 5.4: Security Testing
**Checks**:

1. **Authentication**:
   - [ ] Cannot bypass auth
   - [ ] Token validation strict
   - [ ] No token leakage in logs

2. **Authorization**:
   - [ ] Users cannot access other collections
   - [ ] Collection names properly sanitized
   - [ ] No SQL/NoSQL injection possible

3. **Rate Limiting**:
   - [ ] Rate limits enforced
   - [ ] Per-user limits work
   - [ ] No bypass possible

4. **Data Protection**:
   - [ ] No sensitive data in logs
   - [ ] Environment variables secure
   - [ ] Secrets properly managed

---

### Phase 6: Documentation (Estimated: 3-4 hours)

**Goal**: Comprehensive documentation for users and developers.

#### Step 6.1: User Documentation
**File**: `~/index-mcp-server/README.md`

**Sections**:
1. Overview and features
2. Getting started
3. Authentication setup
4. MCP client configuration
5. Available tools and usage
6. Troubleshooting
7. FAQ

**Validation**:
- [ ] Clear and concise
- [ ] Examples included
- [ ] Screenshots added
- [ ] Links work

#### Step 6.2: API Documentation
**File**: `~/index-mcp-server/API.md`

**Sections**:
1. Authentication flow
2. Tool specifications
3. Request/response formats
4. Error codes
5. Rate limits
6. Best practices

**Validation**:
- [ ] All tools documented
- [ ] Examples provided
- [ ] Error codes listed

#### Step 6.3: Deployment Guide
**File**: `~/index-mcp-server/DEPLOYMENT.md`

**Sections**:
1. Prerequisites
2. Environment setup
3. Cloud Run deployment
4. Custom domain configuration
5. Monitoring setup
6. Backup and recovery

**Validation**:
- [ ] Step-by-step instructions
- [ ] Commands provided
- [ ] Troubleshooting included

#### Step 6.4: Developer Guide
**File**: `~/index-mcp-server/DEVELOPMENT.md`

**Sections**:
1. Project structure
2. Development setup
3. Running locally
4. Testing
5. Contributing guidelines
6. Architecture overview

**Validation**:
- [ ] Easy to follow
- [ ] Code examples included
- [ ] Architecture diagrams added

---

### Phase 7: Production Deployment (Estimated: 2-3 hours)

**Goal**: Deploy to production and monitor.

#### Step 7.1: Pre-Deployment Checklist
- [ ] All tests passing
- [ ] Documentation complete
- [ ] Secrets configured
- [ ] Domain configured
- [ ] Monitoring set up
- [ ] Backup plan ready
- [ ] Rollback plan ready

#### Step 7.2: Deploy to Staging
**Environment**: `index-staging.agentbase.me`

**Tasks**:
1. Deploy to staging Cloud Run service
2. Run smoke tests
3. Verify with test users
4. Check monitoring dashboards
5. Review logs

**Validation**:
- [ ] Staging deployment successful
- [ ] All features work
- [ ] No errors in logs
- [ ] Performance acceptable

#### Step 7.3: Deploy to Production
**Environment**: `index.agentbase.me`

**Tasks**:
1. Deploy to production Cloud Run service
2. Update DNS records
3. Enable SSL certificate
4. Configure CDN (if applicable)
5. Set up alerts

**Deployment Command**:
```bash
gcloud run deploy index-mcp-server \
  --image gcr.io/agentbase-prod/index-mcp-server:latest \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars FIREBASE_PROJECT_ID=agentbase-prod
```

**Validation**:
- [ ] Production deployment successful
- [ ] Domain resolves correctly
- [ ] SSL certificate active
- [ ] Health checks passing

#### Step 7.4: Post-Deployment Monitoring
**Duration**: First 24 hours

**Monitor**:
- Error rates
- Response times
- User adoption
- Resource usage
- Cost metrics

**Alerts**:
- [ ] Error rate > 1%
- [ ] Response time > 1s
- [ ] Memory usage > 80%
- [ ] CPU usage > 80%

---

## Timeline Summary

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Phase 1: Refactor Index Core | 4-6 hours | None |
| Phase 2: Multi-Tenant Wrapper | 6-8 hours | Phase 1 |
| Phase 3: Deployment Config | 3-4 hours | Phase 2 |
| Phase 4: agentbase.me Integration | 4-6 hours | Phase 3 |
| Phase 5: Testing | 6-8 hours | Phase 4 |
| Phase 6: Documentation | 3-4 hours | Phase 5 |
| Phase 7: Production Deployment | 2-3 hours | Phase 6 |
| **Total** | **28-39 hours** | |

**Estimated Calendar Time**: 1-2 weeks (with testing and review)

## Success Criteria

### Technical
- [ ] All tests passing (unit, integration, load)
- [ ] Data isolation verified
- [ ] Performance targets met (p95 < 500ms)
- [ ] Security audit passed
- [ ] Zero data leakage incidents

### User Experience
- [ ] Easy setup process (< 5 minutes)
- [ ] Clear documentation
- [ ] Responsive support
- [ ] Positive user feedback

### Business
- [ ] Cost per user < $0.10/month
- [ ] 99.9% uptime
- [ ] User adoption > 50% of agentbase.me users
- [ ] No security incidents

## Risk Mitigation

### Risk 1: Weaviate Collection Limits
**Mitigation**: Monitor collection count, implement single-collection fallback with userId filtering if needed.

### Risk 2: OpenAI API Costs
**Mitigation**: Set spending limits, implement caching, monitor usage per user.

### Risk 3: Data Loss
**Mitigation**: Regular Weaviate backups, implement soft delete, maintain audit logs.

### Risk 4: Performance Degradation
**Mitigation**: Server pooling, connection pooling, rate limiting, horizontal scaling.

### Risk 5: Security Breach
**Mitigation**: Regular security audits, strict authentication, data encryption, audit logging.

## Next Steps

1. **Review this plan** with team
2. **Allocate resources** (developer time, infrastructure)
3. **Set up project tracking** (GitHub issues, project board)
4. **Begin Phase 1** implementation
5. **Schedule regular check-ins** (daily standups during development)

## Support and Maintenance

### Ongoing Tasks
- Monitor error logs daily
- Review performance metrics weekly
- Update dependencies monthly
- Security patches as needed
- User feedback review weekly

### Escalation Path
1. Developer → Tech Lead
2. Tech Lead → Engineering Manager
3. Engineering Manager → CTO

## Conclusion

This implementation plan provides a comprehensive roadmap for transforming the Index MCP server into a production-ready, multi-tenant service integrated with agentbase.me. The phased approach ensures quality at each step while maintaining backward compatibility and minimizing risk.

**Key Success Factors**:
- Strong data isolation via Weaviate collections
- Proven authentication pattern from mcp-auth
- Comprehensive testing strategy
- Clear documentation
- Robust monitoring and alerting

**Ready to begin Phase 1!** 🚀
