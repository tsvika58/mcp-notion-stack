# MCP Notion Stack

A production-grade, enterprise-level MCP (Model Context Protocol) Notion Stack that serves as a bridge between ChatGPT Actions and Notion's API. This system provides intelligent dual-MCP routing, comprehensive monitoring, and a clean development environment.

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   ChatGPT       │    │  Notion Router   │    │  Notion MCP     │
│   Actions       │───▶│   (Port 3032)    │───▶│   (Port 3030)   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │                        │
                                ▼                        ▼
                       ┌──────────────────┐    ┌─────────────────┐
                       │ Cloudflare       │    │   Notion API    │
                       │   Tunnel         │    │   (External)    │
                       └──────────────────┘    └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose
- Notion API token
- Cloudflare account with named tunnel

### 1. Environment Setup
```bash
# Copy and configure environment files
cp headers.env.example headers.env
cp .env.example .env

# Edit headers.env with your Notion token and MCP auth
nano headers.env

# Edit .env with your Cloudflare tunnel token
nano .env
```

### 2. Start Services
```bash
# Start production stack
docker compose up -d

# Start with development server
docker compose --profile dev up -d
```

### 3. Verify Services
```bash
# Check service status
docker compose ps

# Test health endpoints
curl -sf http://localhost:3030/health    # MCP Server
curl -sf http://localhost:3032/health    # Router
```

## 📋 Services

### 1. **Notion MCP Server** (`notion_mcp`)
- **Port**: 3030 (internal)
- **Image**: `mcp/notion:latest`
- **Purpose**: Official MCP server with HTTP transport
- **Health**: `/health` endpoint
- **Auth**: Uses MCP_AUTH token

### 2. **Notion Router** (`notion_router`)
- **Port**: 3032 (internal)
- **Purpose**: HTTP endpoints for ChatGPT Actions
- **Health**: `/health` endpoint
- **Source**: `./services/router/`

### 3. **Development MCP Server** (`notion_mcp_dev`)
- **Port**: 3031 (internal)
- **Purpose**: Clean, minimal MCP implementation for development
- **Health**: `/health` endpoint
- **Source**: `./services/notion-mcp-dev/`

### 4. **Cloudflare Tunnel** (`cloudflared`)
- **Purpose**: Exposes services publicly with SSL
- **Configuration**: Named tunnel via dashboard
- **Hostnames**: 
  - `notion-mcp.path58.com` → `notion_mcp:3030`
  - `router.path58.com` → `notion_router:3032`

## 🔧 Configuration

### Environment Files

#### `.env` (Public Configuration)
- `CLOUDFLARE_TUNNEL_TOKEN`: Your named tunnel token
- Optional: `OPENAI_API_KEY` if router needs it
- **Safe to commit** (no sensitive data)

#### `headers.env` (Local Only)
- `NOTION_TOKEN`: Your Notion API token
- `MCP_AUTH`: Internal MCP authentication token
- `NOTION_VERSION`: Notion API version (default: 2022-06-28)
- **NEVER commit** (contains secrets)

#### `headers.env.router` (Router Configuration)
- `ROUTER_API_KEY`: API key for router authentication
- `MCP_BASE_URL`: Production MCP server URL
- `MCP_DEV_URL`: Development MCP server URL
- Rate limiting and metrics configuration

## 📖 API Documentation

### Router Endpoints

#### `GET /health`
Health check endpoint for the router service.

**Response:**
```json
{
  "ok": true,
  "ts": "2025-08-28T22:47:42.846Z"
}
```

#### `POST /mcp/tools.call`
Generic endpoint for calling any MCP tool.

**Request:**
```json
{
  "name": "API-get-users",
  "arguments": {
    "page_size": 2
  }
}
```

**Response:**
```json
{
  "backend": "custom",
  "durationMs": 751,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\"object\":\"list\",\"results\":[...]}"
      }
    ]
  }
}
```

#### `POST /notion/pages.create`
Helper endpoint for creating Notion pages.

**Request:**
```json
{
  "database_id": "your-database-id",
  "title": "Page Title",
  "statusName": "Active"
}
```

### MCP Protocol

The system implements the full MCP protocol:

1. **Initialize**: Establish session and capabilities
2. **Tools/List**: Discover available tools
3. **Tools/Call**: Execute tools with arguments

## 🧪 Testing

### Run Test Suite
```bash
# Execute comprehensive E2E tests
./scripts/test-stack.sh

# Quick health checks
./scripts/health-check.sh

# View logs
./scripts/logs.sh
```

### Manual Testing
```bash
# Test MCP server directly
curl -H "Authorization: Bearer $MCP_AUTH" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize"}' \
  http://localhost:3030/mcp

# Test router
curl -H "Authorization: Bearer $ROUTER_API_KEY" \
  http://localhost:3032/health
```

## 🔒 Security

- **Authentication**: Bearer token-based security
- **Rate Limiting**: 100 requests per 15 minutes per API key
- **Network Isolation**: Docker networks for service isolation
- **Health Checks**: Comprehensive service monitoring

## 📊 Monitoring

- **Health Checks**: Service status monitoring
- **Metrics**: Prometheus metrics collection
- **Logging**: Structured logging with Pino
- **Error Tracking**: Comprehensive error handling and logging

## 🚀 Deployment

### Production Deployment
```bash
# Deploy to production
docker compose up -d

# Monitor deployment
docker compose ps
docker compose logs -f
```

### Development Mode
```bash
# Start with development server
docker compose --profile dev up -d

# Switch router to dev server
# Edit headers.env.router: MCP_BASE_URL=http://notion_mcp_dev:3031
docker compose restart notion_router
```

## 📁 Project Structure

```
mcp-notion-stack/
├── services/
│   ├── router/                 # Main router service
│   │   ├── src/               # TypeScript source
│   │   ├── Dockerfile         # Router container
│   │   └── package.json       # Dependencies
│   └── notion-mcp-dev/        # Development MCP server
│       ├── src/               # TypeScript source
│       ├── Dockerfile         # Dev server container
│       └── package.json       # Dependencies
├── scripts/                    # Utility scripts
├── docs/                       # Documentation
├── docker-compose.yml          # Service orchestration
├── headers.env                 # Environment configuration
└── README.md                   # This file
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For issues and questions:
1. Check the [documentation](docs/)
2. Review [troubleshooting guide](docs/troubleshooting.md)
3. Open an issue on GitHub

## 🎯 Roadmap

- [ ] Additional Notion API endpoints
- [ ] Enhanced monitoring and alerting
- [ ] Multi-tenant support
- [ ] Advanced caching strategies
- [ ] Performance optimization

---

**Built with ❤️ for the AI and Notion communities**
