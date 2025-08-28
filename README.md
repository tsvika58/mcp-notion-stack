# MCP Notion Stack

A consolidated Docker-based stack that combines the official Notion MCP server with a custom Notion Router for ChatGPT Actions integration.

## Architecture

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

## Services

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

### 3. **Cloudflare Tunnel** (`cloudflared`)
- **Purpose**: Exposes services publicly with SSL
- **Configuration**: Named tunnel via dashboard
- **Hostnames**: 
  - `notion-mcp.path58.com` → `notion_mcp:3030`
  - `router.path58.com` → `notion_router:3032`

## Quick Start

### Prerequisites
- Docker and Docker Compose
- Notion API token
- Cloudflare account with named tunnel

### 1. **Environment Setup**
```bash
# Copy and configure environment files
cp .env.example .env
cp headers.env.example headers.env

# Edit .env with your Cloudflare tunnel token
nano .env

# Edit headers.env with your Notion token and MCP auth
nano headers.env
```

### 2. **Start Services**
```bash
# Make script executable
chmod +x validate-and-up.sh

# Validate and start all services
./validate-and-up.sh
```

### 3. **Verify Services**
```bash
# Check service status
docker compose ps

# Test health endpoints
curl -sf http://localhost:3030/health    # MCP Server (if ports exposed)
curl -sf http://localhost:3032/health    # Router (if ports exposed)

# View logs
docker compose logs -f
```

## Configuration

### Environment Files

#### `.env` (Public Configuration)
- `CLOUDFLARE_TUNNEL_TOKEN`: Your named tunnel token
- Optional: `OPENAI_API_KEY` if router needs it
- **Safe to commit** (no sensitive data)

#### `headers.env` (Local Only)
- `NOTION_TOKEN`: Your Notion API token
- `MCP_AUTH`: Internal MCP authentication token
- `ROUTER_PORT`: Router port (default: 3032)
- `LOG_LEVEL`: Logging level for services
- **NEVER commit** (contains secrets)

### Service Configuration

#### Router Endpoints
- `GET /health` - Health check (returns 200 OK)
- `POST /notion/pages.create` - Create new pages
- `POST /notion/pages.update` - Update existing pages
- `POST /notion/blocks.append` - Append content blocks
- `POST /notion/comments.create` - Create comments
- `POST /notion/databases.create` - Create databases
- `POST /notion/tools.call` - Generic MCP passthrough

#### MCP Server
- Uses official `mcp/notion:latest` image
- HTTP transport on port 3030
- Authentication via MCP_AUTH token

## Development

### Local Development
```bash
# Start services in development mode
docker compose up -d

# View logs
docker compose logs -f notion_mcp
docker compose logs -f notion_router

# Restart specific service
docker compose restart notion_router
```

### Adding New Services
1. Create service directory in `./services/`
2. Add Dockerfile and source code
3. Update `docker-compose.yml`
4. Add health checks and dependencies

### Testing
```bash
# Test router endpoints
curl -X POST http://localhost:3032/notion/pages.create \
  -H "Content-Type: application/json" \
  -d '{"database_id":"test","title":"Test Page"}'

# Test MCP server
curl http://localhost:3030/health
```

## Deployment

### Production
```bash
# Set production environment
export NODE_ENV=production

# Start all services
docker compose up -d

# Cloudflare tunnel starts automatically
```

### Cloudflare Setup
1. **Create Named Tunnel** in Cloudflare dashboard
2. **Get Tunnel Token** and add to `.env`
3. **Add Public Hostnames**:
   - `notion-mcp.path58.com` → `http://notion_mcp:3030`
   - `router.path58.com` → `http://notion_router:3032`
4. **Save Configuration** - Cloudflare pushes to running tunnel

## Troubleshooting

### Common Issues

#### Service Won't Start
```bash
# Check logs
docker compose logs <service-name>

# Check environment
docker compose config

# Restart services
docker compose down && docker compose up -d
```

#### Health Check Failures
```bash
# Check service status
docker compose ps

# Test endpoints manually
docker compose exec notion_mcp curl -sf http://localhost:3030/health
docker compose exec notion_router curl -sf http://localhost:3032/health

# Check dependencies
docker compose logs notion_mcp
```

#### MCP Connection Issues
```bash
# Verify MCP server is running
docker compose ps notion_mcp

# Check MCP logs
docker compose logs notion_mcp

# Test MCP endpoint
docker compose exec notion_mcp curl -sf http://localhost:3030/health
```

## Monitoring

### Health Checks
- **MCP Server**: `http://localhost:3030/health`
- **Router**: `http://localhost:3032/health`
- **Docker**: `docker compose ps`

### Logs
```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f notion_router
docker compose logs -f notion_mcp

# Follow with timestamps
docker compose logs -f --timestamps
```

### Metrics
- Service uptime via health checks
- Docker resource usage
- Cloudflare tunnel statistics

## Security

### API Keys
- Router API key for ChatGPT Actions
- MCP authentication between services
- Notion API token for external access

### Network
- Services communicate via Docker network
- External access only through Cloudflare tunnel
- Health checks prevent unauthorized access

### Environment
- Sensitive data in `headers.env` (local only)
- Public configuration in `.env`
- Docker secrets for production deployments

## Contributing

1. **Fork** the repository
2. **Create** feature branch
3. **Test** with Docker Compose
4. **Submit** pull request

## License

Private - Internal use only
