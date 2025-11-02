# Index MCP Server

A Model Context Protocol (MCP) server providing semantic search and vector database capabilities using Weaviate. This server enables AI assistants to index, search, and retrieve information from various content types using hybrid search (combining semantic and keyword matching).

## Features

- **Hybrid Search**: Combines semantic (vector) and keyword (BM25) search for optimal results
- **Multiple Content Types**: Support for code, notes, documentation, images, and more
- **Flexible Configuration**: YAML-based configuration for easy customization
- **RAG Support**: Retrieval-Augmented Generation for AI-powered answers
- **Metadata & Filtering**: Rich metadata support with powerful filtering capabilities

## Installation

```bash
npm install
## Prerequisites

### Weaviate Setup

This server requires a running Weaviate instance.

#### Local Docker Instance (Recommended)

Create a `docker-compose.yml` file in your project directory:

```yaml
---
services:
  weaviate:
    command:
      - --host
      - 0.0.0.0
      - --port
      - '8080'
      - --scheme
      - http
    image: cr.weaviate.io/semitechnologies/weaviate:1.34.0
    ports:
      - 8080:8080
      - 50051:50051
    volumes:
      - weaviate_data:/var/lib/weaviate
    restart: on-failure:0
    environment:
      QUERY_DEFAULTS_LIMIT: 25
      AUTHENTICATION_ANONYMOUS_ACCESS_ENABLED: 'true'
      PERSISTENCE_DATA_PATH: '/var/lib/weaviate'
      DEFAULT_VECTORIZER_MODULE: 'text2vec-openai'
      ENABLE_MODULES: 'text2vec-openai'
      CLUSTER_HOSTNAME: 'node1'
volumes:
  weaviate_data:
...
```

Start Weaviate:

```bash
docker compose up -d
```

**Verify it's running:**
```bash
curl http://localhost:8080/v1/.well-known/ready
```

**Note**: Set your `OPENAI_APIKEY` environment variable before starting the Index MCP server, or add it to your `.env` file.

**Learn More**: [Weaviate Local Quickstart](https://docs.weaviate.io/weaviate/quickstart/local)

#### Weaviate Cloud

Alternatively, sign up for a free Weaviate Cloud instance at [console.weaviate.cloud](https://console.weaviate.cloud) and update your config:

```yaml
weaviate:
  url: "https://your-cluster.weaviate.network"
  apiKey: "your-weaviate-api-key"
  openaiApiKey: "sk-..."
```

## Configuration

The server uses a YAML configuration file to define Weaviate instance properties, schema, and shared definitions. By default, it looks for `config.yaml` in the project root, but you can specify a custom path using the `INDEX_CONFIG_PATH` environment variable.

### Configuration File Structure

```yaml
server:
  name: "index-mcp-server"
  version: "0.1.0"
  description: "Semantic search and vector database MCP server"

weaviate:
  url: "http://localhost:8080"
  timeout: 30000
  retries: 3

schema:
  collectionName: "Document"
  vectorizer:
    type: "text2vec-openai"
    model: "text-embedding-3-small"
  properties:
    - name: "content"
      dataType: "TEXT"
    # ... more properties

shared:
  contentTypes:
    - "code"
    - "note"
    # ... more types
  
  metadataFields:
    - name: "contentType"
      type: "string"
      required: true
    # ... more fields
  
  filterFields:
    - name: "contentType"
      type: "array"
    # ... more filters

tools:
  - name: "search_index"
    enabled: true
  - name: "index_new"
    enabled: true
  # ... more tools
```

### Configuration Sections

#### Server Configuration

Defines basic server metadata:

```yaml
server:
  name: "index-mcp-server"
  version: "0.1.0"
  description: "Your server description"
```

#### Weaviate Configuration

Configure your Weaviate instance connection:

```yaml
weaviate:
  url: "http://localhost:8080"  # Weaviate instance URL
  apiKey: "your-api-key"         # Optional: Weaviate API key
  timeout: 30000                 # Request timeout in milliseconds
  retries: 3                     # Number of retry attempts
  openaiApiKey: "sk-..."         # Optional: OpenAI API key for vectorization
```

Environment variables can override these settings:
- `WEAVIATE_URL`: Override the Weaviate URL
- `WEAVIATE_API_KEY`: Set the Weaviate API key
- `OPENAI_APIKEY`: Set the OpenAI API key for vectorization

#### Schema Configuration

Define your Weaviate collection schema:

```yaml
schema:
  collectionName: "Document"  # Name of the Weaviate collection
  
  vectorizer:
    type: "text2vec-openai"   # Vectorizer type
    model: "text-embedding-3-small"  # Model to use
    options: {}               # Additional vectorizer options
  
  properties:
    - name: "content"
      dataType: "TEXT"
      description: "Main content"
    - name: "tags"
      dataType: "TEXT_ARRAY"
      description: "Document tags"
    # Add more properties as needed
```

Supported vectorizer types:
- `text2vec-openai`: OpenAI embeddings
- `text2vec-cohere`: Cohere embeddings
- `text2vec-huggingface`: HuggingFace embeddings
- `none`: No vectorization

Supported data types:
- `TEXT`: Text field
- `TEXT_ARRAY`: Array of text values
- `DATE`: Date/timestamp
- `NUMBER`: Numeric value
- `INT`: Integer value
- `BOOLEAN`: Boolean value

#### Shared Definitions

Define reusable metadata and filter schemas that are automatically applied to relevant tools:

```yaml
shared:
  # Content types available across all tools
  contentTypes:
    - "code"
    - "note"
    - "documentation"
    - "todo"
    # ... add your custom types
  
  # Priority levels
  priorities:
    - "low"
    - "medium"
    - "high"
  
  # Metadata fields for index_new and index_existing tools
  metadataFields:
    - name: "contentType"
      type: "string"
      description: "Type of content"
      required: true
      enum: []  # Uses contentTypes from above
    
    - name: "title"
      type: "string"
      description: "Document title"
      required: true
    
    - name: "tags"
      type: "array"
      description: "Document tags"
      required: true
    
    # Add more metadata fields as needed
  
  # Filter fields for search and query tools
  filterFields:
    - name: "contentType"
      type: "array"
      description: "Filter by content types"
    
    - name: "project"
      type: "string"
      description: "Filter by project name"
    
    - name: "dateRange"
      type: "object"
      description: "Filter by date range"
      properties:
        after: "ISO date string"
        before: "ISO date string"
    
    # Add more filter fields as needed
```

**Key Benefits of Shared Definitions:**
- **DRY Principle**: Define metadata and filters once, use everywhere
- **Consistency**: Ensures all tools use the same field definitions
- **Easy Customization**: Add new content types or metadata fields in one place
- **Type Safety**: Automatically generates proper JSON schemas for tools

#### Tool Configuration

Enable or disable specific tools:

```yaml
tools:
  - name: "search_index"
    enabled: true
  
  - name: "index_new"
    enabled: true
  
  - name: "index_existing"
    enabled: true
  
  - name: "unindex"
    enabled: true
  
  - name: "find_similar_in_index"
    enabled: true
  
  - name: "ask_index"
    enabled: true
```

**Note**: Tool names and descriptions are hardcoded in the tool classes. The configuration only controls which tools are enabled/disabled.

### Creating Custom Configurations

For different use cases, create separate configuration files:

```bash
# Development configuration
cp config.yaml config.dev.yaml

# Production configuration
cp config.yaml config.prod.yaml

# Custom use case
cp config.yaml config.custom.yaml
```

Then specify which config to use:

```bash
INDEX_CONFIG_PATH=./config.prod.yaml npm start
```

### Example: Custom Content Types

To add custom content types for your specific use case:

```yaml
shared:
  contentTypes:
    - "code"
    - "note"
    - "research-paper"      # Custom type
    - "meeting-notes"       # Custom type
    - "customer-feedback"   # Custom type
  
  metadataFields:
    - name: "contentType"
      type: "string"
      required: true
    
    # Add custom metadata for your types
    - name: "department"
      type: "string"
      description: "Department name"
    
    - name: "confidentiality"
      type: "string"
      description: "Confidentiality level"
      enum: ["public", "internal", "confidential"]
```

## Available Tools

### search_index
Hybrid search combining semantic and keyword matching.

### index_new
Index new content with metadata.

### index_existing
Update existing indexed content.

### unindex
Remove content from the index.

### find_similar_in_index
Find similar content based on a reference document.

### ask_index
RAG-based question answering using indexed content.

## Security Features

The Index MCP server includes comprehensive security filtering to prevent indexing sensitive data:

### Blocked File Patterns
- **Environment files**: `.env`, `.env.*`, `.env-*`
- **Secrets**: `secrets.yaml`, `credentials.json`
- **Private keys**: `.pem`, `.key`, `.p12`, `id_rsa`, etc.
- **API keys**: `api-keys.json`, `tokens.json`
- **Cloud credentials**: `.aws/credentials`, `.kube/config`
- **Git credentials**: `.git-credentials`, `.netrc`

### Blocked Directories
- `node_modules/`, `.git/`, `.vscode/`, `.idea/`
- `dist/`, `build/`, `coverage/`
- `.aws/`, `.ssh/`, `.gnupg/`, `.kube/`
- `.terraform/`, `vendor/`

### Content Scanning
The system also scans file content for sensitive patterns:
- API keys and tokens (long alphanumeric strings)
- Passwords in configuration
- Private key blocks
- Certificate blocks

**Note**: Both `index_new` (with file paths) and `bulk_index` automatically apply these security filters.

## Usage

The Index MCP server is started automatically by your MCP client (Kilo Code, Claude Desktop, etc.) based on the configuration in your MCP settings file. You don't need to manually start the server.

### Configuration

The server reads configuration from `config.yaml` by default. To use a different config file, set the `INDEX_CONFIG_PATH` environment variable in your MCP settings:

```json
{
  "mcpServers": {
    "index": {
      "env": {
        "INDEX_CONFIG_PATH": "/path/to/custom/config.yaml"
      }
    }
  }
}
```

### Development

```bash
# Watch mode
npm run watch

# Build
npm run build

# Lint
npm run lint
```

## Environment Variables

- `INDEX_CONFIG_PATH`: Path to configuration file (default: `./config.yaml`)
- `WEAVIATE_URL`: Weaviate instance URL (overrides config)
- `WEAVIATE_API_KEY`: Weaviate API key (overrides config)
- `WEAVIATE_TIMEOUT`: Request timeout in milliseconds
- `WEAVIATE_RETRIES`: Number of retry attempts

## MCP Settings Configuration

To use this server with Kilo Code or other MCP clients, add it to your MCP settings file:

### Kilo Code Configuration

Add to `kilo-code/settings/mcp_settings.json`:

```json
{
  "mcpServers": {
    "index": {
      "command": "node",
      "args": [
        "/path/to/your/index/dist/server.js"
      ],
      "env": {
        "WEAVIATE_URL": "http://localhost:8080",
        "OPENAI_APIKEY": "sk-...",
        "INDEX_CONFIG_PATH": "/path/to/your/index/config.yaml"
      },
      "alwaysAllow": [
        "search_index",
        "index_new",
        "index_existing",
        "unindex",
        "find_similar_in_index",
        "ask_index",
        "bulk_index"
      ]
    }
  }
}
```

### Claude Desktop Configuration

Add to `Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "index": {
      "command": "node",
      "args": ["/path/to/your/index/dist/server.js"],
      "env": {
        "WEAVIATE_URL": "http://localhost:8080",
        "OPENAI_APIKEY": "sk-...",
        "INDEX_CONFIG_PATH": "/path/to/your/index/config.yaml"
      }
    }
  }
}
```

**Important**: 
- Replace `/path/to/your/index` with the actual path to this project
- Set your OpenAI API key in the `OPENAI_APIKEY` environment variable
- The `alwaysAllow` list (Kilo Code only) pre-approves tool usage for convenience

- `OPENAI_APIKEY`: OpenAI API key for vectorization

## Architecture

The server uses a modular architecture:

- **Config Loader**: Loads and validates YAML configuration
- **Schema Builder**: Generates tool schemas from shared definitions
- **Tool Factory**: Creates tool instances based on configuration
- **Weaviate Client**: Manages Weaviate connection and operations

This design allows for:
- Easy customization through YAML config
- Reusable metadata and filter definitions
- Dynamic tool generation
- Multiple use case support

## License

MIT

## Author

Patrick Michaelsen