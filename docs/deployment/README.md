# Deployment Guide

This document provides comprehensive deployment instructions for the MCP Notion Stack.

## 🚀 Quick Deployment

### Prerequisites

- Docker and Docker Compose installed
- Notion API token
- Cloudflare account with named tunnel
- Domain names for your services

### 1. Clone Repository

```bash
git clone <your-repo-url>
cd mcp-notion-stack
```

### 2. Environment Setup

```bash
# Copy environment templates
cp headers.env.example headers.env
cp .env.example .env

# Edit configuration files
nano headers.env
nano .env
```

### 3. Deploy Services

```bash
# Start all services
docker compose up -d

# Check status
docker compose ps

# View logs
docker compose logs -f
```

## 🔧 Environment Configuration

### Required Environment Variables

#### `headers.env`

```bash
# === NOTION API CONFIGURATION ===
NOTION_TOKEN=your_notion_api_token_here
NOTION_VERSION=2022-06-28

# === MCP AUTHENTICATION ===
MCP_AUTH=your_secure_mcp_auth_token

# === ROUTER CONFIGURATION ===
ROUTER_PORT=3032
ROUTER_LOG_LEVEL=info
ROUTER_API_KEY=your_router_api_key

# === MCP BACKEND CONFIGURATION ===
MCP_BASE_URL=http://notion_mcp:3030
MCP_DEV_URL=http://notion_mcp_dev:3031

# === RATE LIMITING ===
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW_MS=900000

# === METRICS ===
METRICS_REQUIRE_AUTH=true
```

#### `.env`

```bash
# Cloudflare tunnel token
CLOUDFLARE_TUNNEL_TOKEN=your_tunnel_token_here

# Optional: OpenAI API key if needed
OPENAI_API_KEY=your_openai_key_here
```

### Environment File Security

- **`headers.env`**: Contains sensitive data - NEVER commit to git
- **`.env`**: Contains public configuration - safe to commit
- **`headers.env.router`**: Router-specific configuration

## 🌐 Cloudflare Tunnel Setup

### 1. Create Named Tunnel

1. Go to [Cloudflare Zero Trust Dashboard](https://dash.cloudflare.com/)
2. Navigate to **Access** → **Tunnels**
3. Click **Create a tunnel**
4. Choose **Named tunnel**
5. Give it a name (e.g., `mcp-notion-stack`)

### 2. Configure Hostnames

Add the following public hostnames:

| Hostname | Service | Internal URL |
|----------|---------|--------------|
| `notion-mcp.yourdomain.com` | MCP Server | `http://notion_mcp:3030` |
| `router.yourdomain.com` | Router | `http://notion_router:3032` |

### 3. Get Tunnel Token

1. Copy the tunnel token from the dashboard
2. Add it to your `.env` file
3. The tunnel will automatically connect when you start the services

## 🐳 Docker Deployment

### Production Deployment

```bash
# Start production stack
docker compose up -d

# Verify services
docker compose ps

# Check health
curl -sf http://localhost:3030/health
curl -sf http://localhost:3032/health
```

### Development Mode

```bash
# Start with development server
docker compose --profile dev up -d

# Switch router to dev server
# Edit headers.env.router: MCP_BASE_URL=http://notion_mcp_dev:3031
docker compose restart notion_router
```

### Service Management

```bash
# View service logs
docker compose logs -f notion_router
docker compose logs -f notion_mcp

# Restart specific service
docker compose restart notion_router

# Scale services
docker compose up -d --scale notion_router=2

# Stop all services
docker compose down

# Stop and remove volumes
docker compose down -v
```

## 🔍 Health Monitoring

### Health Check Endpoints

- **MCP Server**: `http://localhost:3030/health`
- **Router**: `http://localhost:3032/health`
- **Dev Server**: `http://localhost:3031/health`

### Health Check Scripts

```bash
# Run comprehensive health checks
./scripts/health-check.sh

# Quick status check
docker compose ps

# Manual health checks
curl -sf http://localhost:3030/health | jq
curl -sf http://localhost:3032/health | jq
```

### Monitoring Commands

```bash
# View real-time logs
docker compose logs -f

# Check resource usage
docker stats

# View service details
docker compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"
```

## 🔒 Security Configuration

### Authentication

- **Router API Key**: Required for all router endpoints
- **MCP Auth Token**: Internal service authentication
- **Rate Limiting**: 100 requests per 15 minutes per API key

### Network Security

- **Docker Networks**: Services communicate via internal networks
- **Port Exposure**: Services not exposed to host by default
- **Cloudflare Tunnel**: SSL termination and DDoS protection

### Environment Security

```bash
# Set secure permissions
chmod 600 headers.env
chmod 600 headers.env.router

# Use strong tokens
MCP_AUTH=$(openssl rand -hex 32)
ROUTER_API_KEY=$(openssl rand -hex 32)
```

## 📊 Production Considerations

### Resource Requirements

- **Memory**: Minimum 2GB RAM
- **CPU**: 2+ cores recommended
- **Storage**: 10GB+ for logs and data
- **Network**: Stable internet connection

### Scaling

```bash
# Scale router service
docker compose up -d --scale notion_router=3

# Load balancing (requires external load balancer)
# Configure multiple router instances
```

### Backup and Recovery

```bash
# Backup configuration
cp headers.env headers.env.backup
cp .env .env.backup

# Backup Docker volumes
docker run --rm -v mcp-notion-stack_data:/data -v $(pwd):/backup alpine tar czf /backup/data-backup.tar.gz -C /data .

# Restore from backup
docker run --rm -v mcp-notion-stack_data:/data -v $(pwd):/backup alpine tar xzf /backup/data-backup.tar.gz -C /data
```

## 🚨 Troubleshooting

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

#### Network Issues

```bash
# Check network configuration
docker network ls
docker network inspect mcp-notion-stack_mcp

# Test internal communication
docker compose exec notion_router ping notion_mcp
```

### Debug Mode

```bash
# Enable debug logging
export LOG_LEVEL=debug

# Restart services
docker compose restart

# View detailed logs
docker compose logs -f --timestamps
```

## 🔄 Updates and Maintenance

### Updating Services

```bash
# Pull latest images
docker compose pull

# Restart services
docker compose up -d

# Verify updates
docker compose ps
```

### Rolling Updates

```bash
# Update one service at a time
docker compose up -d --no-deps notion_router
docker compose up -d --no-deps notion_mcp

# Verify each service before continuing
docker compose ps notion_router
docker compose ps notion_mcp
```

### Configuration Changes

```bash
# Edit configuration files
nano headers.env
nano headers.env.router

# Restart affected services
docker compose restart notion_router

# Verify changes
curl -sf http://localhost:3032/health | jq
```

## 📈 Performance Optimization

### Resource Limits

```yaml
# Add to docker-compose.yml
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

### Caching

- **Tool Catalog**: Automatically refreshed every minute
- **Session Management**: Efficient MCP session handling
- **Response Caching**: Consider Redis for high-traffic scenarios

### Monitoring

```bash
# Enable metrics endpoint
curl -H "Authorization: Bearer $ROUTER_API_KEY" \
  http://localhost:3032/metrics

# Prometheus integration
# Configure metrics scraping from /metrics endpoint
```

## 🎯 Deployment Checklist

- [ ] Environment variables configured
- [ ] Cloudflare tunnel set up
- [ ] Domain names configured
- [ ] Services started and healthy
- [ ] Health checks passing
- [ ] Authentication working
- [ ] Rate limiting configured
- [ ] Monitoring enabled
- [ ] Backup strategy in place
- [ ] Documentation updated

## 📚 Additional Resources

- [API Documentation](../api/README.md)
- [Development Guide](../development/README.md)
- [Troubleshooting Guide](../troubleshooting/README.md)
- [OpenAPI Specification](../openapi-min.yaml)
- [Docker Compose Reference](https://docs.docker.com/compose/)
- [Cloudflare Tunnel Documentation](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/)
