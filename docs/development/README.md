# Development Guide

This document provides comprehensive development information for the MCP Notion Stack.

## 🛠️ Development Environment Setup

### Prerequisites

- Node.js 18+ and npm
- Docker and Docker Compose
- Git
- Code editor (VS Code recommended)

### 1. Clone and Setup

```bash
# Clone repository
git clone <your-repo-url>
cd mcp-notion-stack

# Install dependencies for all services
cd services/router && npm install
cd ../notion-mcp-dev && npm install
cd ../..

# Copy environment files
cp headers.env.example headers.env
cp .env.example .env
```

### 2. Environment Configuration

```bash
# Edit environment files
nano headers.env
nano .env

# Set development-specific values
export NODE_ENV=development
export LOG_LEVEL=debug
```

## 🏗️ Project Structure

```
mcp-notion-stack/
├── services/
│   ├── router/                 # Main router service
│   │   ├── src/               # TypeScript source
│   │   │   ├── index.ts       # Main Express app
│   │   │   ├── mcpPool.ts     # MCP client management
│   │   │   ├── routerLogic.ts # Routing decision engine
│   │   │   ├── logger.ts      # Logging configuration
│   │   │   ├── metrics.ts     # Metrics collection
│   │   │   └── rateLimit.ts   # Rate limiting middleware
│   │   ├── Dockerfile         # Router container
│   │   ├── package.json       # Dependencies
│   │   └── tsconfig.json      # TypeScript config
│   └── notion-mcp-dev/        # Development MCP server
│       ├── src/
│       │   └── index.ts       # MCP server implementation
│       ├── Dockerfile         # Dev server container
│       ├── package.json       # Dependencies
│       └── tsconfig.json      # TypeScript config
├── scripts/                    # Utility scripts
├── docs/                       # Documentation
├── docker-compose.yml          # Service orchestration
└── README.md                   # Project overview
```

## 🔧 Development Workflow

### Local Development

```bash
# Start development environment
docker compose --profile dev up -d

# View logs
docker compose logs -f notion_mcp_dev
docker compose logs -f notion_router

# Restart specific service
docker compose restart notion_mcp_dev
```

### Code Changes

```bash
# Make changes to source code
nano services/router/src/index.ts

# Rebuild and restart
docker compose build notion_router
docker compose restart notion_router

# Or use volume mounting for live reload
# Add to docker-compose.yml:
volumes:
  - ./services/router/src:/app/src
```

### Testing Changes

```bash
# Test health endpoints
curl -sf http://localhost:3031/health | jq  # Dev MCP
curl -sf http://localhost:3032/health | jq  # Router

# Test MCP protocol
./scripts/test-stack.sh

# Run specific tests
docker compose exec notion_mcp_dev curl -sf http://localhost:3031/health
```

## 📝 Code Standards

### TypeScript Configuration

- **Target**: ES2022
- **Module**: ES2022
- **Strict**: Enabled
- **Module Resolution**: Bundler

### Code Style

- **Indentation**: 2 spaces
- **Quotes**: Single quotes
- **Semicolons**: Required
- **Trailing commas**: Required in objects/arrays

### ESLint Configuration

```json
{
  "extends": ["eslint:recommended"],
  "env": {
    "node": true,
    "es2022": true
  },
  "rules": {
    "no-unused-vars": "warn",
    "prefer-const": "error"
  }
}
```

## 🔍 Debugging

### Enable Debug Logging

```bash
# Set debug level
export LOG_LEVEL=debug

# Restart services
docker compose restart

# View detailed logs
docker compose logs -f --timestamps
```

### Debug MCP Protocol

```bash
# Test MCP initialization
curl -i -N -X POST \
  -H "Authorization: Bearer $MCP_AUTH" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize"}' \
  http://localhost:3031/mcp

# Test tool listing
curl -i -N -X POST \
  -H "Authorization: Bearer $MCP_AUTH" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' \
  http://localhost:3031/mcp
```

### Debug Router

```bash
# Test router endpoints
curl -H "Authorization: Bearer $ROUTER_API_KEY" \
  http://localhost:3032/health

# Test MCP passthrough
curl -X POST http://localhost:3032/mcp/tools.call \
  -H "Authorization: Bearer $ROUTER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name":"API-get-users","arguments":{"page_size":2}}'
```

## 🧪 Testing

### Unit Testing

```bash
# Run tests (if configured)
cd services/router
npm test

# Run with coverage
npm run test:coverage
```

### Integration Testing

```bash
# Test complete stack
./scripts/test-stack.sh

# Test specific components
./scripts/health-check.sh

# Manual testing
./scripts/env-print.sh
```

### Load Testing

```bash
# Test rate limiting
for i in {1..110}; do
  curl -H "Authorization: Bearer $ROUTER_API_KEY" \
    http://localhost:3032/health
  sleep 0.1
done
```

## 🔄 Adding New Features

### 1. New MCP Tool

```typescript
// services/notion-mcp-dev/src/index.ts

// Add to TOOLS array
{
  name: "API-get-database",
  description: "Notion | Get database information",
  inputSchema: {
    type: "object",
    properties: {
      database_id: { type: "string" }
    },
    required: ["database_id"]
  }
}

// Add to handleToolCall function
case "API-get-database":
  return notionGet(`/v1/databases/${args.database_id}`);
```

### 2. New Router Endpoint

```typescript
// services/router/src/index.ts

// Add new endpoint
app.post("/notion/databases.get", metricsMiddleware("/notion/databases.get"), async (req, res) => {
  const { database_id } = req.body || {};
  if (!database_id) {
    return res.status(400).json({ error: "Missing database_id" });
  }
  
  try {
    const result = await CUSTOM.callTool("API-get-database", { database_id });
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});
```

### 3. New MCP Backend

```typescript
// services/router/src/mcpPool.ts

// Add new client
const NEW_BACKEND = new MCPClient({
  baseUrl: process.env.NEW_MCP_URL!,
  authToken: process.env.NEW_MCP_AUTH!,
  requestTimeoutMs: Number(process.env.MCP_TIMEOUT_MS || 12000),
});

// Update catalog refresh
async function refreshCatalog() {
  try {
    const [o, c, n] = await Promise.all([
      OFFICIAL.listTools(), 
      CUSTOM.listTools(),
      NEW_BACKEND.listTools()
    ]);
    catalog = { official: o, custom: c, new: n };
  } catch (e) {
    logger.error({ err: e }, "Catalog refresh failed");
  }
}
```

## 📊 Performance Optimization

### Code Optimization

```typescript
// Use connection pooling
const mcpClients = new Map<string, MCPClient>();

// Implement caching
const toolCache = new Map<string, { tools: ToolDef[], timestamp: number }>();

// Optimize JSON parsing
const fastJson = require('fast-json-parse');
```

### Docker Optimization

```dockerfile
# Multi-stage build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:20-alpine
COPY --from=builder /app/node_modules ./node_modules
COPY dist ./dist
CMD ["node", "dist/index.js"]
```

### Resource Management

```yaml
# docker-compose.yml
services:
  notion_router:
    deploy:
      resources:
        limits:
          memory: 1G
          cpus: '0.5'
        reservations:
          memory: 512M
          cpus: '0.25'
```

## 🔒 Security Development

### Authentication Testing

```bash
# Test without auth
curl http://localhost:3032/health

# Test with invalid auth
curl -H "Authorization: Bearer invalid" http://localhost:3032/health

# Test with valid auth
curl -H "Authorization: Bearer $ROUTER_API_KEY" http://localhost:3032/health
```

### Rate Limiting Testing

```bash
# Test rate limits
for i in {1..110}; do
  response=$(curl -s -w "%{http_code}" \
    -H "Authorization: Bearer $ROUTER_API_KEY" \
    http://localhost:3032/health)
  echo "Request $i: $response"
  if [[ "$response" == *"429"* ]]; then
    echo "Rate limit hit at request $i"
    break
  fi
  sleep 0.1
done
```

### Input Validation

```typescript
// Validate input parameters
function validateInput(data: any, schema: any): boolean {
  // Implement validation logic
  return true;
}

// Sanitize inputs
function sanitizeInput(input: string): string {
  return input.replace(/[<>]/g, '');
}
```

## 📝 Documentation

### Code Documentation

```typescript
/**
 * MCP Client for managing connections to MCP servers
 * 
 * @param config - Configuration object for the client
 * @param config.baseUrl - Base URL for the MCP server
 * @param config.authToken - Authentication token
 * @param config.requestTimeoutMs - Request timeout in milliseconds
 */
export class MCPClient {
  // Implementation
}
```

### API Documentation

```typescript
/**
 * @api {post} /mcp/tools.call Call MCP Tool
 * @apiName CallTool
 * @apiGroup MCP
 * @apiVersion 1.0.0
 * 
 * @apiParam {String} name Tool name
 * @apiParam {Object} [arguments] Tool arguments
 * @apiParam {String} [target] Target backend
 * 
 * @apiSuccess {String} backend Backend used
 * @apiSuccess {Number} durationMs Request duration
 * @apiSuccess {Object} result Tool execution result
 */
```

## 🚀 Deployment

### Development Deployment

```bash
# Build and deploy dev environment
docker compose --profile dev up -d --build

# Switch to dev MCP server
export MCP_BASE_URL=http://notion_mcp_dev:3031
docker compose restart notion_router
```

### Production Deployment

```bash
# Build production images
docker compose build

# Deploy to production
docker compose up -d

# Verify deployment
docker compose ps
./scripts/health-check.sh
```

## 🔍 Monitoring and Debugging

### Log Analysis

```bash
# View recent logs
docker compose logs --tail=100 notion_router

# Search logs
docker compose logs notion_router | grep "error"

# Follow logs with timestamps
docker compose logs -f --timestamps notion_router
```

### Metrics Collection

```bash
# View metrics
curl -H "Authorization: Bearer $ROUTER_API_KEY" \
  http://localhost:3032/metrics

# Parse metrics
curl -s -H "Authorization: Bearer $ROUTER_API_KEY" \
  http://localhost:3032/metrics | grep "mcp_tool_calls_total"
```

### Health Monitoring

```bash
# Continuous health monitoring
watch -n 5 'docker compose ps && echo "---" && curl -sf http://localhost:3032/health | jq'

# Health check script
while true; do
  ./scripts/health-check.sh
  sleep 30
done
```

## 🎯 Development Checklist

- [ ] Environment configured
- [ ] Dependencies installed
- [ ] Services running locally
- [ ] Health checks passing
- [ ] Code changes tested
- [ ] Documentation updated
- [ ] Tests passing
- [ ] Security reviewed
- [ ] Performance optimized
- [ ] Ready for deployment

## 📚 Additional Resources

- [API Documentation](../api/README.md)
- [Deployment Guide](../deployment/README.md)
- [Troubleshooting Guide](../troubleshooting/README.md)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Express.js Documentation](https://expressjs.com/)
- [Docker Documentation](https://docs.docker.com/)
- [MCP Protocol Specification](https://modelcontextprotocol.io/)
