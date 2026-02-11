# Phase 3: Deployment Configuration

**Estimated Duration**: 3-4 hours  
**Status**: Not Started  
**Dependencies**: Phase 2 (Multi-Tenant Wrapper)

## Overview

Prepare the multi-tenant index server for production deployment on Google Cloud Run with proper containerization, configuration, and infrastructure setup.

## Goals

- Create production-ready Docker container
- Configure Cloud Build for CI/CD
- Set up deployment scripts
- Configure secrets management
- Prepare for horizontal scaling

## Tasks

### Task 3.1: Create Dockerfile
**File**: `Dockerfile`

**Checklist**:
- [ ] Create `Dockerfile` in project root
- [ ] Use Node 20 Alpine base image
- [ ] Set working directory to `/app`
- [ ] Copy `package*.json` files
- [ ] Run `npm ci --only=production`
- [ ] Copy built `dist/` directory
- [ ] Expose port 8080
- [ ] Add health check endpoint
- [ ] Set CMD to start server
- [ ] Optimize for small image size
- [ ] Add proper labels

**Dockerfile Template**:
```dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
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

**Validation**:
- [ ] Docker image builds successfully
- [ ] Image size < 200MB
- [ ] Health check works
- [ ] Runs in container locally
- [ ] No unnecessary files included

**Test Commands**:
```bash
docker build -t index-mcp-server .
docker run -p 8080:8080 --env-file .env index-mcp-server
curl http://localhost:8080/health
```

---

### Task 3.2: Create .dockerignore
**File**: `.dockerignore`

**Checklist**:
- [ ] Create `.dockerignore` file
- [ ] Exclude `node_modules/`
- [ ] Exclude `src/` (only need dist/)
- [ ] Exclude `.git/`
- [ ] Exclude `.env` files
- [ ] Exclude test files
- [ ] Exclude documentation
- [ ] Exclude CI/CD configs

**Template**:
```
node_modules/
src/
tests/
.git/
.gitignore
.env
.env.*
*.md
tsconfig.json
.vscode/
.idea/
coverage/
*.log
```

**Validation**:
- [ ] Image build faster
- [ ] Image size smaller
- [ ] No sensitive files included

---

### Task 3.3: Create Cloud Build Configuration
**File**: `cloudbuild.yaml`

**Checklist**:
- [ ] Create `cloudbuild.yaml` file
- [ ] Define build step for Docker image
- [ ] Define push step to GCR
- [ ] Define deploy step to Cloud Run
- [ ] Configure environment variables
- [ ] Set resource limits
- [ ] Configure region
- [ ] Set concurrency limits
- [ ] Add timeout settings

**Template**:
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
      - '--memory'
      - '512Mi'
      - '--cpu'
      - '1'
      - '--max-instances'
      - '10'
      - '--set-env-vars'
      - 'FIREBASE_PROJECT_ID=${_FIREBASE_PROJECT_ID},WEAVIATE_URL=${_WEAVIATE_URL}'
      - '--set-secrets'
      - 'WEAVIATE_API_KEY=weaviate-api-key:latest,OPENAI_APIKEY=openai-api-key:latest'

images:
  - 'gcr.io/$PROJECT_ID/index-mcp-server:$COMMIT_SHA'

timeout: '1200s'
```

**Validation**:
- [ ] YAML syntax valid
- [ ] All steps defined correctly
- [ ] Environment variables configured
- [ ] Secrets referenced properly
- [ ] Resource limits appropriate

---

### Task 3.4: Create Deployment Script
**File**: `scripts/deploy.sh`

**Checklist**:
- [ ] Create `scripts/` directory
- [ ] Create `deploy.sh` script
- [ ] Make script executable: `chmod +x scripts/deploy.sh`
- [ ] Add shebang: `#!/bin/bash`
- [ ] Add error handling: `set -e`
- [ ] Build Docker image locally
- [ ] Tag image appropriately
- [ ] Push to Google Container Registry
- [ ] Deploy to Cloud Run
- [ ] Verify deployment
- [ ] Add logging
- [ ] Add confirmation prompts

**Script Template**:
```bash
#!/bin/bash
set -e

# Configuration
PROJECT_ID="agentbase-prod"
REGION="us-central1"
SERVICE_NAME="index-mcp-server"
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

echo "🚀 Deploying ${SERVICE_NAME} to Cloud Run..."

# Build
echo "📦 Building Docker image..."
docker build -t ${IMAGE_NAME}:latest .

# Push
echo "⬆️  Pushing to GCR..."
docker push ${IMAGE_NAME}:latest

# Deploy
echo "🌐 Deploying to Cloud Run..."
gcloud run deploy ${SERVICE_NAME} \
  --image ${IMAGE_NAME}:latest \
  --region ${REGION} \
  --platform managed \
  --allow-unauthenticated \
  --memory 512Mi \
  --cpu 1 \
  --max-instances 10 \
  --set-env-vars FIREBASE_PROJECT_ID=${FIREBASE_PROJECT_ID},WEAVIATE_URL=${WEAVIATE_URL} \
  --set-secrets WEAVIATE_API_KEY=weaviate-api-key:latest,OPENAI_APIKEY=openai-api-key:latest

echo "✅ Deployment complete!"
echo "🔗 Service URL:"
gcloud run services describe ${SERVICE_NAME} --region ${REGION} --format 'value(status.url)'
```

**Validation**:
- [ ] Script executable
- [ ] All commands valid
- [ ] Error handling works
- [ ] Logging clear
- [ ] Deployment succeeds

---

### Task 3.5: Configure Google Secret Manager
**Tool**: Google Cloud Console / gcloud CLI

**Checklist**:
- [ ] Enable Secret Manager API
- [ ] Create secret: `weaviate-api-key`
- [ ] Add Weaviate API key value
- [ ] Create secret: `openai-api-key`
- [ ] Add OpenAI API key value
- [ ] Grant Cloud Run service account access
- [ ] Set IAM permissions: `roles/secretmanager.secretAccessor`
- [ ] Test secret access
- [ ] Document secret names

**Commands**:
```bash
# Enable API
gcloud services enable secretmanager.googleapis.com

# Create secrets