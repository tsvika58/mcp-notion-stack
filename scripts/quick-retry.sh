#!/usr/bin/env bash
set -euo pipefail

echo "🔄 Quick Retry: Create Notion Page"
echo "=================================="

# auto-load env files if present
[[ -f ./.env ]] && set -a && . ./.env && set +a || true
[[ -f ./headers.env ]] && set -a && . ./headers.env && set +a || true

# defaults
: "${ROUTER_BASE:=https://router.path58.com}"
: "${DB_ID:=21ed7960-213a-803f-a2bf-e39ea2c941e5}"

# required
require() { 
  v="$1"; 
  eval "val=\${$v:-}"; 
  [[ -n "${val:-}" ]] || { 
    echo "❌ Missing required env: $v"; 
    exit 1; 
  }; 
}

require ROUTER_API_KEY

NOW="$(date -u +'%Y-%m-%d %H:%M:%S UTC')"
page_data="{
  \"database_id\":\"$DB_ID\",
  \"title\":\"M1 E2E Test $NOW\",
  \"statusName\":\"Discovery\"
}"

echo "📄 Attempting to create page: M1 E2E Test $NOW"
echo ""

for attempt in 1 2 3; do
  echo "🔄 Attempt $attempt/3..."
  
  response=$(curl -sS -w "\n%{http_code}\n" "$ROUTER_BASE/notion/pages.create" \
    -H "content-type: application/json" \
    -H "authorization: Bearer $ROUTER_API_KEY" \
    --data "$page_data" 2>/dev/null || echo "CURL_ERROR")
  
  if [[ "$response" == "CURL_ERROR" ]]; then
    echo "   ❌ Curl error on attempt $attempt"
    if [[ $attempt -lt 3 ]]; then
      echo "   ⏳ Waiting 2 seconds before retry..."
      sleep 2
    fi
    continue
  fi
  
  # Extract status code (last line)
  status_code=$(echo "$response" | tail -1)
  # Extract response body (all lines except last)
  response_body=$(echo "$response" | head -n -1)
  
  echo "   Status: $status_code"
  
  if [[ "$status_code" =~ ^2[0-9][0-9]$ ]]; then
    echo "   ✅ Success on attempt $attempt!"
    
    # Extract page ID
    PAGE_ID=$(echo "$response_body" | jq -r '.id // .page.id // .result.id // .result.page.id // empty' 2>/dev/null || echo "")
    
    if [[ -n "$PAGE_ID" ]]; then
      echo "   📄 Created Page ID: $PAGE_ID"
      echo "   🎉 Page creation successful!"
      exit 0
    else
      echo "   ⚠️  Success but could not extract page ID"
      echo "   Response: $(echo "$response_body" | head -c 200)..."
      exit 0
    fi
  else
    echo "   ❌ Failed on attempt $attempt: $status_code"
    echo "   Response: $(echo "$response_body" | head -c 200)..."
    
    if [[ $attempt -lt 3 ]]; then
      echo "   ⏳ Waiting 2 seconds before retry..."
      sleep 2
    fi
  fi
done

echo ""
echo "❌ All 3 attempts failed. Check logs with: ./scripts/logs.sh"
exit 1
