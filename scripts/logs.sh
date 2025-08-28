#!/usr/bin/env bash

echo "📋 Container Status"
echo "=================="
docker compose ps

echo ""
echo "📋 Container Logs (Last 200 lines each)"
echo "========================================"

echo "--- notion_router (last 200) ---"
docker compose logs --tail=200 notion_router || true

echo ""
echo "--- notion_mcp (last 200) ---"
docker compose logs --tail=200 notion_mcp || true

echo ""
echo "--- cloudflared (last 200) ---"
docker compose logs --tail=200 cloudflared || true

echo ""
echo "🔍 Logs inspection complete. Look for any ERROR, FATAL, or restart messages above."
