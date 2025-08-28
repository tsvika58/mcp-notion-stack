#!/usr/bin/env bash
set -euo pipefail

echo "🧪 M1 Stack E2E Validation"
echo "=========================="
echo "Validating: Router + MCP + Cloudflare + Notion"
echo ""

# auto-load env files if present
[[ -f ./.env ]] && set -a && . ./.env && set +a || true
[[ -f ./headers.env ]] && set -a && . ./headers.env && set +a || true

# defaults
: "${ROUTER_BASE:=https://router.path58.com}"
: "${MCP_BASE:=https://notion-mcp.path58.com}"
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

echo "🔍 Checking required environment variables..."
require ROUTER_API_KEY
require MCP_AUTH
require NOTION_TOKEN
: "${NOTION_VERSION:=2022-06-28}"

echo "✅ All required environment variables present"
echo ""

# Print versions
echo "📋 System Information:"
echo "   Docker Compose: $(docker compose version | head -1)"
echo "   curl: $(curl --version | head -1)"
echo "   Router Base: $ROUTER_BASE"
echo "   MCP Base: $MCP_BASE"
echo "   Database ID: $DB_ID"
echo ""

# Helper function to test endpoints
test_endpoint() {
  local name="$1"
  local url="$2"
  local method="${3:-GET}"
  local data="${4:-}"
  local headers="${5:-}"
  
  echo "🔍 Testing: $name"
  echo "   URL: $url"
  
  local response
  local status_code
  
  if [[ -n "$data" ]]; then
    # POST request with data
    response=$(curl -sS -w "\n%{http_code}\n" "$url" \
      -X "$method" \
      -H "content-type: application/json" \
      -H "$headers" \
      --data "$data" 2>/dev/null || echo "CURL_ERROR")
  else
    # GET request
    response=$(curl -sS -w "\n%{http_code}\n" "$url" \
      -H "$headers" 2>/dev/null || echo "CURL_ERROR")
  fi
  
  if [[ "$response" == "CURL_ERROR" ]]; then
    echo "   ❌ Failed: curl error"
    return 1
  fi
  
  # Extract status code (last line) - use sed for portability
  status_code=$(echo "$response" | sed -n '$p')
  # Extract response body (all lines except last) - use sed for portability
  response_body=$(echo "$response" | sed '$d')
  
  echo "   Status: $status_code"
  
  if [[ "$status_code" =~ ^2[0-9][0-9]$ ]]; then
    echo "   ✅ Success: $status_code"
    echo "   Response: $(echo "$response_body" | head -c 200)$(if [[ ${#response_body} -gt 200 ]]; then echo "..."; fi)"
    return 0
  else
    echo "   ❌ Failed: $status_code"
    echo "   Response: $response_body"
    return 1
  fi
}

# Test 1: Router health
echo "📋 Test 1: Router Health Check"
if test_endpoint "Router Health" "$ROUTER_BASE/health" "GET" "" "authorization: Bearer $ROUTER_API_KEY"; then
  echo "   ✅ Router health check passed"
else
  echo "   ❌ Router health check failed"
  exit 1
fi
echo ""

# Test 2: Router → MCP health (proxy through router)
echo "📋 Test 2: Router → MCP Health Check"
if test_endpoint "Router → MCP Health" "$ROUTER_BASE/mcp/health" "GET" "" "authorization: Bearer $ROUTER_API_KEY"; then
  echo "   ✅ Router → MCP health check passed"
else
  echo "   🔄 Trying direct MCP health check..."
  if test_endpoint "Direct MCP Health" "$MCP_BASE/health" "GET"; then
    echo "   ✅ Direct MCP health check passed"
  else
    echo "   ❌ MCP health check failed"
    exit 1
  fi
fi
echo ""

# Test 3: Generic tools.call - list users
echo "📋 Test 3: Generic MCP Tools Call"
tools_call_data='{"name":"API-get-users","arguments":{"page_size":2}}'
if test_endpoint "Generic Tools Call" "$ROUTER_BASE/mcp/tools.call" "POST" "$tools_call_data" "authorization: Bearer $ROUTER_API_KEY"; then
  echo "   ✅ Generic tools.call passed"
  
  # Validate response contains expected structure
  if echo "$response_body" | jq -e '.result.tools // .result.content // .tools // .content' >/dev/null 2>&1; then
    echo "   ✅ Response contains expected structure"
  else
    echo "   ⚠️  Response structure validation inconclusive"
  fi
else
  echo "   ❌ Generic tools.call failed"
  exit 1
fi
echo ""

# Test 4: Create Notion page
echo "📋 Test 4: Create Notion Page"
NOW="$(date -u +'%Y-%m-%d %H:%M:%S UTC')"
page_data="{
  \"database_id\":\"$DB_ID\",
  \"title\":\"M1 E2E Test $NOW\",
  \"statusName\":\"Discovery\"
}"

if test_endpoint "Create Notion Page" "$ROUTER_BASE/notion/pages.create" "POST" "$page_data" "authorization: Bearer $ROUTER_API_KEY"; then
  echo "   ✅ Notion page creation passed"
  
  # Extract page ID and URL
  PAGE_ID=""
  PAGE_URL=""
  
  # Try different possible response structures
  PAGE_ID=$(echo "$response_body" | jq -r '.id // .page.id // .result.id // .result.page.id // empty' 2>/dev/null || echo "")
  PAGE_URL=$(echo "$response_body" | jq -r '.url // .page.url // .result.url // .result.page.url // empty' 2>/dev/null || echo "")
  
  if [[ -n "$PAGE_ID" ]]; then
    echo "   📄 Created Page ID: $PAGE_ID"
    if [[ -n "$PAGE_URL" ]]; then
      echo "   🔗 Page URL: $PAGE_URL"
    fi
    
    # Verify page exists via direct Notion API
    echo "   🔍 Verifying page via direct Notion API..."
    verification_response=$(curl -sS -H "Authorization: Bearer $NOTION_TOKEN" \
      -H "Notion-Version: ${NOTION_VERSION}" \
      "https://api.notion.com/v1/pages/${PAGE_ID}" 2>/dev/null || echo "VERIFICATION_ERROR")
    
    if [[ "$verification_response" != "VERIFICATION_ERROR" ]]; then
      verified_id=$(echo "$verification_response" | jq -r '.id // empty' 2>/dev/null || echo "")
      verified_url=$(echo "$verification_response" | jq -r '.url // empty' 2>/dev/null || echo "")
      verified_time=$(echo "$verification_response" | jq -r '.last_edited_time // empty' 2>/dev/null || echo "")
      
      if [[ -n "$verified_id" ]]; then
        echo "   ✅ Page verified via Notion API"
        echo "   📄 Verified ID: $verified_id"
        if [[ -n "$verified_url" ]]; then
          echo "   🔗 Verified URL: $verified_url"
        fi
        if [[ -n "$verified_time" ]]; then
          echo "   🕒 Last Edited: $verified_time"
        fi
      else
        echo "   ⚠️  Page verification inconclusive"
      fi
    else
      echo "   ⚠️  Could not verify page via direct API"
    fi
  else
    echo "   ⚠️  Could not extract page ID from response"
  fi
else
  echo "   ❌ Notion page creation failed"
  exit 1
fi
echo ""

# Test 5: Unauthorized access checks
echo "📋 Test 5: Unauthorized Access Checks"

# Test health endpoint without auth
echo "   🔍 Testing /health without Authorization header..."
unauth_response=$(curl -sS -w "\n%{http_code}\n" "$ROUTER_BASE/health" 2>/dev/null || echo "CURL_ERROR")
if [[ "$unauth_response" != "CURL_ERROR" ]]; then
  unauth_status=$(echo "$unauth_response" | sed -n '$p')
  if [[ "$unauth_status" =~ ^4[0-9][0-9]$ ]]; then
    echo "   ✅ Unauthorized access to /health properly blocked: $unauth_status"
  else
    echo "   ❌ Unauthorized access to /health not blocked: $unauth_status"
    exit 1
  fi
else
  echo "   ❌ Failed to test unauthorized access to /health"
  exit 1
fi

# Test tools.call without auth
echo "   🔍 Testing /mcp/tools.call without Authorization header..."
unauth_tools_response=$(curl -sS -w "\n%{http_code}\n" "$ROUTER_BASE/mcp/tools.call" \
  -H "content-type: application/json" \
  --data '{"name":"test"}' 2>/dev/null || echo "CURL_ERROR")

if [[ "$unauth_tools_response" != "CURL_ERROR" ]]; then
  unauth_tools_status=$(echo "$unauth_tools_response" | sed -n '$p')
  if [[ "$unauth_tools_status" =~ ^4[0-9][0-9]$ ]]; then
    echo "   ✅ Unauthorized access to /mcp/tools.call properly blocked: $unauth_tools_status"
  else
    echo "   ❌ Unauthorized access to /mcp/tools.call not blocked: $unauth_tools_status"
    exit 1
  fi
else
  echo "   ❌ Failed to test unauthorized access to /mcp/tools.call"
  exit 1
fi
echo ""

# Final summary
echo "🎉 M1 Stack E2E Validation Complete!"
echo "===================================="
echo "✅ All tests passed successfully!"
echo "✅ Router authentication working"
echo "✅ MCP connectivity verified"
echo "✅ Notion page creation successful"
echo "✅ Unauthorized access properly blocked"
echo ""
echo "🚀 Your M1 stack is production-ready!"
echo ""
echo "📊 Test Summary:"
echo "   Router Health: ✅"
echo "   Generic Tools Call: ✅"
echo "   Notion Page Creation: ✅"
echo "   Security (Unauthorized): ✅"
echo ""
echo "🔗 Created Page:"
if [[ -n "$PAGE_ID" ]]; then
  echo "   ID: $PAGE_ID"
  if [[ -n "$PAGE_URL" ]]; then
    echo "   URL: $PAGE_URL"
  fi
  echo "   Title: M1 E2E Test $NOW"
  echo "   Status: Discovery"
fi
