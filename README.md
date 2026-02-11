# Index - Semantic Search MCP Server

**A Model Context Protocol (MCP) server providing semantic search and vector database capabilities using Weaviate.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)

---

## Overview

Index is an MCP server that provides powerful semantic search capabilities through Weaviate's vector database. It enables AI assistants to store, search, and retrieve documents using both semantic (vector) and keyword (BM25) matching for optimal results.

### Key Features

- 🔍 **Hybrid Search**: Combines semantic understanding with exact keyword matching
- 📚 **Rich Metadata**: Support for content types, tags, dates, priorities, and more
- 🎯 **Similarity Search**: Find documents similar to a reference document
- 💬 **Natural Language Queries**: Ask questions and get relevant documents
- 🗂️ **Multiple Content Types**: Code, notes, documentation, images, and more
- ⚡ **Fast & Scalable**: Built on Weaviate's high-performance vector database

---

## Current Status

**Version**: 0.1.0  
**Mode**: Single-tenant, stdio transport  
**Status**: ✅ Production-ready for local use

> **Note**: Multi-tenant version with Firebase authentication is planned. See [`agent/IMPLEMENTATION_PLAN.md`](agent/IMPLEMENTATION_PLAN.md) for details.

---

## Quick Start

### Prerequisites

- Node.js >= 18.0.0
- Weaviate Cloud account or local Weaviate instance
- OpenAI API key (for embeddings)

### Installation

```bash
# Clone the repository
git clone https://github.com/prmichaelsen/index.git
cd index

# Install dependencies
npm install

# Build the project
npm run build
```

### Configuration

Create a `.env` file in the project root:

```env
# Weaviate Configuration
WEAVIATE_URL=https://your-cluster.weaviate.network
WEAVIATE_API_KEY=your-weaviate-api-key

# OpenAI Configuration (for embeddings)
OPENAI_APIKEY=your-openai-api-key

# Optional: Timeouts and retries
WEAVIATE_TIMEOUT=30000
WEAVIATE_RETRIES=3
```

### Running the Server

```bash
# Start in stdio mode (for MCP clients)
npm start

# Development mode with auto-reload
npm run watch
```

---

## Available Tools

### 1. `search_index`

Universal hybrid search combining semantic and keyword matching.

**Parameters**:
- `query` (required): Search query string
- `alpha` (optional): Balance between vector (1.0) and keyword (0.0) search (default: 0.7)
- `filters` (optional): Filter by content type, tags, dates, etc.
- `limit` (optional): Maximum results (1-100, default: 10)
- `offset` (optional): Pagination offset (default: 0)

**Example**:
```json
{
  "query": "How to implement authentication in Node.js",
  "alpha": 0.7,
  "filters": {
    "contentType": ["code", "documentation"],
    "language": "javascript"
  },
  "limit": 5
}
```

### 2. `index_new`

Index a new document with metadata.

**Parameters**:
- `content` (required): Document content
- `contentType` (required): Type of content (code, note, documentation, etc.)
- `title` (optional): Document title
- `description` (optional): Brief description
- `metadata` (optional): Additional metadata (tags, priority, status, etc.)

**Example**:
```json
{
  "content": "function authenticate(user) { ... }",
  "contentType": "code",
  "title": "Authentication Function",
  "metadata": {
    "language": "javascript",
    "tags": ["auth", "security"],
    "priority": "high"
  }
}
```

### 3. `index_existing`

Index an existing file from the filesystem.

**Parameters**:
- `filePath` (required): Path to the file
- `contentType` (optional): Override content type detection
- `metadata` (optional): Additional metadata

### 4. `unindex`

Remove a document from the index.

**Parameters**:
- `id` (required): Document ID to remove

### 5. `find_similar_in_index`

Find documents similar to a reference document.

**Parameters**:
- `referenceId` (required): ID of the reference document
- `limit` (optional): Maximum results (default: 10)

### 6. `ask_index`

Ask a natural language question and get relevant documents.

**Parameters**:
- `question` (required): Natural language question
- `limit` (optional): Maximum results (default: 5)

---

## Content Types

The following content types are supported:

- `code` - Source code files
- `note` - Personal notes and memos
- `documentation` - Technical documentation
- `article` - Articles and blog posts
- `email` - Email messages
- `chat` - Chat transcripts
- `task` - Tasks and todos
- `meeting` - Meeting notes
- `image` - Images with extracted text
- `pdf` - PDF documents
- `spreadsheet` - Spreadsheet data
- `presentation` - Presentation slides
- `video` - Video transcripts
- `audio` - Audio transcripts
- `webpage` - Web page content
- `social` - Social media posts
- `other` - Other content types

---

## Architecture

### Current Architecture (Single-Tenant)

```
┌─────────────────────────────────────┐
│   MCP Client (Claude, etc.)         │
└─────────────┬───────────────────────┘
              │ stdio
              │
┌─────────────▼───────────────────────┐
│   Index MCP Server                  │
│   - WeaviateMCPServer class         │
│   - 6 tools (search, index, etc.)   │
└─────────────┬───────────────────────┘
              │
┌─────────────▼───────────────────────┐
│   WeaviateClientWrapper             │
│   - Single "Document" collection    │
└─────────────┬───────────────────────┘
              │
┌─────────────▼───────────────────────┐
│   Weaviate Cloud                    │
│   - Vector embeddings (OpenAI)      │
│   - Hybrid search                   │
└─────────────────────────────────────┘
```

### Planned Architecture (Multi-Tenant)

See [`agent/MULTI_TENANT_DESIGN.md`](agent/MULTI_TENANT_DESIGN.md) for the planned multi-tenant architecture with Firebase authentication and per-user data isolation.

---

## Development

### Project Structure

```
index/
├── src/
│   ├── server.ts              # Main server class
│   ├── weaviate/
│   │   └── client.ts          # Weaviate client wrapper
│   ├── tools/                 # Tool implementations
│   │   ├── search-index.ts
│   │   ├── index-new.ts
│   │   ├── index-existing.ts
│   │   ├── unindex.ts
│   │   ├── find-similar-in-index.ts
│   │   └── ask-index.ts
│   ├── types/                 # TypeScript type definitions
│   │   ├── content-types.ts
│   │   ├── mcp.ts
│   │   └── weaviate.ts
│   └── utils/                 # Utility functions
│       ├── logger.ts
│       └── error-serializer.ts
├── agent/                     # Planning and documentation
│   ├── IMPLEMENTATION_PLAN.md
│   ├── MULTI_TENANT_DESIGN.md
│   ├── progress.yaml
│   └── tasks/
├── package.json
├── tsconfig.json
└── README.md
```

### Scripts

```bash
# Build the project
npm run build

# Watch mode for development
npm run watch

# Start the server
npm start

# Run tests
npm test

# Run tests in watch mode
npm test:watch

# Lint code
npm run lint

# Clean build artifacts
npm run clean
```

### Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- search-index.test.ts
```

---

## Roadmap

### ✅ Phase 0: Planning & Design (Complete)
- Comprehensive implementation plan
- Multi-tenant architecture design
- Detailed task breakdowns

### 🔄 Phase 1: Refactor Index Core (Planned)
- Extract server factory pattern
- Add userId support to WeaviateClientWrapper
- Configure package exports
- Maintain backward compatibility

### 🔄 Phase 2: Multi-Tenant Wrapper (Planned)
- Create `index-mcp-server` project
- Integrate Firebase authentication
- Implement SSE transport
- Add server pooling and rate limiting

### 🔄 Phase 3: Deployment (Planned)
- Docker containerization
- Google Cloud Run deployment
- Secrets management
- CI/CD pipeline

See [`agent/IMPLEMENTATION_PLAN.md`](agent/IMPLEMENTATION_PLAN.md) for complete roadmap.

---

## Contributing

Contributions are welcome! Please read the implementation plan and design documents before submitting PRs.

### Development Workflow

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Run linter and tests
6. Submit a pull request

---

## License

MIT License - see [LICENSE](LICENSE) file for details.

---

## Support

- **Issues**: [GitHub Issues](https://github.com/prmichaelsen/index/issues)
- **Documentation**: See [`agent/`](agent/) directory for detailed docs
- **MCP Protocol**: [Model Context Protocol](https://modelcontextprotocol.io/)

---

## Acknowledgments

- Built with [Model Context Protocol SDK](https://github.com/modelcontextprotocol/sdk)
- Powered by [Weaviate](https://weaviate.io/) vector database
- Embeddings by [OpenAI](https://openai.com/)

---

**Author**: Patrick Michaelsen  
**Version**: 0.1.0  
**Last Updated**: 2026-02-11
