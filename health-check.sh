#!/bin/bash
# =========
# CONFIG
# =========
set -euo pipefail

# Public hostnames you configured in Cloudflare
MCP_HOST="notion-mcp.path58.com"
ROUTER_HOST="router.path58.com"

# MCP HTTP transport auth (must match headers.env / compose)
MCP_AUTH="my-local-mcp-secret"

# =========
# INTERNAL (Docker network) CHECKS
# =========
echo "🔧 Internal: Router health endpoint ..."
docker compose exec -T notion_router curl -sf http://localhost:3032/health | jq .

echo "🔧 Internal: Router ➜ MCP health over Docker DNS ..."
docker compose exec -T notion_router curl -sf http://notion_mcp:3030/health | jq .

# =========
# PUBLIC (Cloudflare) CHECKS
# =========
echo "🌐 Public: MCP /health ..."
curl -sS -i "https://${MCP_HOST}/health" | sed -n '1,10p'

echo "🌐 Public: Router /health ..."
if curl -sS -i "https://${ROUTER_HOST}/health" | sed -n '1,10p'; then
  echo "✅ Router endpoint accessible"
else
  echo "⚠️  Router endpoint not accessible - check Cloudflare hostname configuration"
fi

# Optional TLS details (confirm TLSv1.3 + HTTP/2)
echo "🔒 TLS details (expect TLSv1.3 + h2) ..."
curl -svo /dev/null "https://${MCP_HOST}" 2>&1 | grep -i 'ssl connection\|alpn\|http/3' || true

# =========
# AUTHENTICATED MCP CALL OVER TUNNEL
# =========
echo "🪪 Authenticated initialize over SSE ..."
curl -sS -N -X POST \
  -H "Authorization: Bearer ${MCP_AUTH}" \
  -H "accept: application/json, text/event-stream" \
  -H "content-type: application/json" \
  --data '{
    "jsonrpc":"2.0",
    "id":1,
    "method":"initialize",
    "params":{
      "clientInfo":{"name":"curl","version":"1.0.0"},
      "protocolVersion":"2024-11-05",
      "capabilities":{}
    }
  }' \
  "https://${MCP_HOST}/mcp" \
  | grep '^data: ' | head -1 | sed 's/^data: //' | jq .

echo "✅ All checks completed."
