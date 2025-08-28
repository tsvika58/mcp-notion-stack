#!/usr/bin/env bash

echo "🔍 Environment Configuration"
echo "==========================="

# auto-load env files if present
[[ -f ./.env ]] && set -a && . ./.env && set +a || true
[[ -f ./headers.env ]] && set -a && . ./headers.env && set +a || true

echo "📋 Environment Files:"
if [[ -f ./.env ]]; then
  echo "   ✅ .env present"
else
  echo "   ❌ .env missing"
fi

if [[ -f ./headers.env ]]; then
  echo "   ✅ headers.env present"
else
  echo "   ❌ headers.env missing"
fi

echo ""
echo "🔑 Required Variables:"
echo "   ROUTER_API_KEY: ${ROUTER_API_KEY:-❌ MISSING}"
echo "   MCP_AUTH: ${MCP_AUTH:-❌ MISSING}"
echo "   NOTION_TOKEN: ${NOTION_TOKEN:-❌ MISSING}"
echo "   NOTION_VERSION: ${NOTION_VERSION:-2022-06-28}"

echo ""
echo "🌐 Endpoints:"
echo "   ROUTER_BASE: ${ROUTER_BASE:-https://router.path58.com}"
echo "   DB_ID: ${DB_ID:-21ed7960-213a-803f-a2bf-e39ea2c941e5}"

echo ""
echo "🐳 Docker Status:"
if command -v docker >/dev/null 2>&1; then
  echo "   ✅ Docker available"
  if docker compose ps >/dev/null 2>&1; then
    echo "   ✅ Docker Compose available"
    echo ""
    echo "   Container Status:"
    docker compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"
  else
    echo "   ❌ Docker Compose not available"
  fi
else
  echo "   ❌ Docker not available"
fi

echo ""
echo "📋 System Tools:"
echo "   curl: $(command -v curl >/dev/null 2>&1 && echo "✅ Available" || echo "❌ Missing")"
echo "   jq: $(command -v curl >/dev/null 2>&1 && echo "✅ Available" || echo "❌ Missing")"

echo ""
echo "🔍 Environment inspection complete."
