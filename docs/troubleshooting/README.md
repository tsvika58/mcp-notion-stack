# Troubleshooting Guide

This document provides comprehensive troubleshooting information for the MCP Notion Stack.

## 🚨 Common Issues and Solutions

### Service Won't Start

#### Symptoms
- Docker containers fail to start
- Services show as "unhealthy" or "exited"
- Error messages in logs

#### Solutions

**1. Check Docker Status**
```bash
# Verify Docker is running
docker --version
docker compose version

# Check system resources
docker system df
docker stats --no-stream
```

**2. Check Environment Variables**
```bash
# Verify environment files exist
ls -la headers.env .env

# Check environment variable loading
docker compose config

# Test environment variable access
docker compose exec notion_router env | grep MCP
```

**3. Check Port Conflicts**
```bash
# Check if ports are already in use
netstat -tulpn | grep :3030
netstat -tulpn | grep :3031
netstat -tulpn | grep :3032

# Kill conflicting processes
sudo lsof -ti:3030 | xargs kill -9
```

**4. Restart Services**
```bash
# Stop all services
docker compose down

# Remove volumes if needed
docker compose down -v

# Start fresh
docker compose up -d

# Check status
docker compose ps
```

### Health Check Failures

#### Symptoms
- Services show as "unhealthy"
- Health endpoints return errors
- Service dependencies fail

#### Solutions

**1. Check Service Logs**
```bash
# View logs for specific service
docker compose logs notion_mcp
docker compose logs notion_router
docker compose logs notion_mcp_dev

# Follow logs in real-time
docker compose logs -f notion_mcp
```

**2. Test Health Endpoints Manually**
```bash
# Test MCP server health
docker compose exec notion_mcp curl -sf http://localhost:3030/health

# Test router health
docker compose exec notion_router curl -sf http://localhost:3032/health

# Test dev server health
docker compose exec notion_mcp_dev curl -sf http://localhost:3031/health
```

**3. Check Dependencies**
```bash
# Verify service dependencies
docker compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"

# Check network connectivity
docker compose exec notion_router ping notion_mcp
docker compose exec notion_router ping notion_mcp_dev
```

**4. Fix Health Check Issues**
```bash
# Increase health check retries
# Edit docker-compose.yml:
healthcheck:
  test: ["CMD", "curl", "-sf", "http://localhost:3030/health"]
  interval: 30s
  timeout: 10s
  retries: 30

# Restart services
docker compose restart
```

### MCP Protocol Issues

#### Symptoms
- "Server not initialized" errors
- Tool calls fail
- Session management issues

#### Solutions

**1. Test MCP Protocol Manually**
```bash
# Test initialization
curl -i -N -X POST \
  -H "Authorization: Bearer $MCP_AUTH" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize"}' \
  http://localhost:3030/mcp

# Test tool listing
curl -i -N -X POST \
  -H "Authorization: Bearer $MCP_AUTH" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' \
  http://localhost:3030/mcp
```

**2. Check MCP Authentication**
```bash
# Verify MCP auth token
echo $MCP_AUTH

# Test with different auth
curl -H "Authorization: Bearer test-token" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize"}' \
  http://localhost:3030/mcp
```

**3. Reset MCP Sessions**
```bash
# Restart MCP services
docker compose restart notion_mcp
docker compose restart notion_mcp_dev

# Clear router cache
docker compose restart notion_router
```

### Router Issues

#### Symptoms
- Router endpoints return errors
- MCP passthrough fails
- Authentication issues

#### Solutions

**1. Check Router Configuration**
```bash
# Verify router environment
docker compose exec notion_router env | grep -E "(MCP|ROUTER)"

# Check router logs
docker compose logs -f notion_router

# Test router health
curl -H "Authorization: Bearer $ROUTER_API_KEY" \
  http://localhost:3032/health
```

**2. Test Router Endpoints**
```bash
# Test health endpoint
curl -H "Authorization: Bearer $ROUTER_API_KEY" \
  http://localhost:3032/health

# Test MCP passthrough
curl -X POST http://localhost:3032/mcp/tools.call \
  -H "Authorization: Bearer $ROUTER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name":"API-get-users","arguments":{"page_size":2}}'
```

**3. Check Rate Limiting**
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

### Network Issues

#### Symptoms
- Services can't communicate
- Connection refused errors
- Timeout errors

#### Solutions

**1. Check Docker Networks**
```bash
# List networks
docker network ls

# Inspect network
docker network inspect mcp-notion-stack_mcp

# Check network connectivity
docker compose exec notion_router ping notion_mcp
```

**2. Fix Network Issues**
```bash
# Recreate network
docker compose down
docker network prune -f
docker compose up -d

# Check network configuration
docker compose exec notion_router ip route
```

**3. Test Internal Communication**
```bash
# Test from router to MCP
docker compose exec notion_router curl -sf http://notion_mcp:3030/health

# Test from router to dev MCP
docker compose exec notion_router curl -sf http://notion_mcp_dev:3031/health
```

### Cloudflare Tunnel Issues

#### Symptoms
- External endpoints not accessible
- SSL certificate errors
- Tunnel connection failures

#### Solutions

**1. Check Tunnel Status**
```bash
# View tunnel logs
docker compose logs -f cloudflared

# Check tunnel configuration
docker compose exec cloudflared cloudflared tunnel info
```

**2. Verify Tunnel Configuration**
```bash
# Check tunnel token
echo $CLOUDFLARE_TUNNEL_TOKEN

# Verify hostname configuration
# Check Cloudflare dashboard for correct routing
```

**3. Test External Access**
```bash
# Test external endpoints
curl -sf https://router.yourdomain.com/health
curl -sf https://notion-mcp.yourdomain.com/health
```

## 🔍 Diagnostic Commands

### System Information
```bash
# Docker information
docker version
docker compose version
docker system info

# System resources
free -h
df -h
top -n 1

# Network information
ip addr show
netstat -tulpn
```

### Service Status
```bash
# Service overview
docker compose ps

# Service details
docker compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}\t{{.Health}}"

# Service logs
docker compose logs --tail=50

# Service resources
docker stats --no-stream
```

### Health Checks
```bash
# Run health check script
./scripts/health-check.sh

# Manual health checks
curl -sf http://localhost:3030/health | jq
curl -sf http://localhost:3032/health | jq

# Test with authentication
curl -H "Authorization: Bearer $ROUTER_API_KEY" \
  http://localhost:3032/health | jq
```

## 🛠️ Debug Mode

### Enable Debug Logging
```bash
# Set debug level
export LOG_LEVEL=debug
export ROUTER_LOG_LEVEL=debug

# Restart services
docker compose restart

# View detailed logs
docker compose logs -f --timestamps
```

### Verbose Output
```bash
# Verbose Docker Compose
docker compose --verbose up -d

# Verbose service logs
docker compose logs -f --timestamps --tail=100

# Debug environment
docker compose config --verbose
```

### Performance Monitoring
```bash
# Monitor resource usage
watch -n 1 'docker stats --no-stream'

# Monitor logs
watch -n 1 'docker compose logs --tail=10'

# Monitor health
watch -n 5 'docker compose ps && echo "---" && curl -sf http://localhost:3032/health | jq'
```

## 🔧 Fixes and Workarounds

### Quick Fixes

**1. Restart Everything**
```bash
# Nuclear option - restart everything
docker compose down
docker system prune -f
docker compose up -d
```

**2. Reset Environment**
```bash
# Reload environment
source headers.env
source .env

# Restart services
docker compose restart
```

**3. Clear Caches**
```bash
# Clear Docker caches
docker system prune -f
docker volume prune -f

# Restart services
docker compose up -d
```

### Configuration Fixes

**1. Fix Environment Variables**
```bash
# Check for missing variables
grep -r "undefined" services/*/src/

# Set default values
export MCP_TIMEOUT_MS=${MCP_TIMEOUT_MS:-12000}
export RATE_LIMIT_MAX=${RATE_LIMIT_MAX:-100}
```

**2. Fix Network Configuration**
```bash
# Update docker-compose.yml network configuration
networks:
  mcp:
    name: mcp-notion-stack_mcp
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16
```

**3. Fix Health Checks**
```bash
# Update health check configuration
healthcheck:
  test: ["CMD-SHELL", "curl -sf http://localhost:3030/health || exit 1"]
  interval: 30s
  timeout: 10s
  retries: 5
  start_period: 40s
```

## 📊 Monitoring and Alerts

### Health Monitoring
```bash
# Continuous monitoring script
#!/bin/bash
while true; do
  echo "$(date): Checking services..."
  ./scripts/health-check.sh
  sleep 60
done
```

### Alert Setup
```bash
# Simple alert script
#!/bin/bash
if ! curl -sf http://localhost:3032/health > /dev/null; then
  echo "ALERT: Router is down at $(date)" | mail -s "Service Alert" admin@example.com
fi
```

### Log Analysis
```bash
# Search for errors
docker compose logs | grep -i error

# Search for warnings
docker compose logs | grep -i warn

# Search for specific patterns
docker compose logs | grep "Server not initialized"
```

## 🚨 Emergency Procedures

### Service Recovery
```bash
# Emergency restart
docker compose down
docker system prune -f
docker compose up -d

# Verify recovery
./scripts/health-check.sh
```

### Data Recovery
```bash
# Backup configuration
cp headers.env headers.env.backup.$(date +%Y%m%d_%H%M%S)
cp .env .env.backup.$(date +%Y%m%d_%H%M%S)

# Restore from backup
cp headers.env.backup.20250101_120000 headers.env
cp .env.backup.20250101_120000 .env
```

### Rollback
```bash
# Rollback to previous version
git checkout HEAD~1
docker compose down
docker compose up -d

# Verify rollback
./scripts/health-check.sh
```

## 📚 Additional Resources

### Documentation
- [API Documentation](../api/README.md)
- [Deployment Guide](../deployment/README.md)
- [Development Guide](../development/README.md)

### External Resources
- [Docker Troubleshooting](https://docs.docker.com/config/daemon/)
- [Docker Compose Issues](https://docs.docker.com/compose/troubleshooting/)
- [Cloudflare Tunnel Issues](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/troubleshooting/)

### Support Channels
- GitHub Issues
- Docker Community Forums
- Cloudflare Support

## 🎯 Troubleshooting Checklist

- [ ] Check Docker status and resources
- [ ] Verify environment variables
- [ ] Check service logs
- [ ] Test health endpoints
- [ ] Verify network connectivity
- [ ] Check authentication
- [ ] Test MCP protocol
- [ ] Verify Cloudflare tunnel
- [ ] Check rate limiting
- [ ] Monitor resource usage
- [ ] Review error messages
- [ ] Test with minimal configuration
- [ ] Verify dependencies
- [ ] Check external access
- [ ] Document the issue
- [ ] Implement fix
- [ ] Test the solution
- [ ] Update documentation

---

**Remember**: When in doubt, restart the services and check the logs!
