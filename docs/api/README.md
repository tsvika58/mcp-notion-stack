# API Documentation

This document provides comprehensive API documentation for the MCP Notion Stack.

## 🔗 Base URLs

- **Production Router**: `https://router.path58.com`
- **Development Router**: `http://localhost:3032` (if ports exposed)
- **MCP Server**: `https://notion-mcp.path58.com`

## 🔐 Authentication

All API endpoints require authentication using Bearer tokens:

```bash
Authorization: Bearer YOUR_API_KEY
```

### API Keys

- **Router API Key**: Set in `ROUTER_API_KEY` environment variable
- **MCP Auth Token**: Set in `MCP_AUTH` environment variable

## 📋 Endpoints

### Health Check

#### `GET /health`

Check if the router service is healthy.

**Response:**
```json
{
  "ok": true,
  "ts": "2025-08-28T22:47:42.846Z"
}
```

**Status Codes:**
- `200` - Service is healthy
- `401` - Unauthorized (missing or invalid API key)

---

### MCP Tools

#### `POST /mcp/tools.call`

Generic endpoint for calling any MCP tool via the Notion MCP server.

**Request Body:**
```json
{
  "name": "API-get-users",
  "arguments": {
    "page_size": 2
  },
  "target": "auto"
}
```

**Parameters:**
- `name` (required): Name of the MCP tool to call
- `arguments` (optional): Arguments to pass to the MCP tool
- `target` (optional): Force routing to specific backend ("official", "custom", or "auto")

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
  },
  "jsonrpc": "2.0",
  "id": 1
}
```

**Status Codes:**
- `200` - Tool executed successfully
- `400` - Bad request (missing required fields)
- `401` - Unauthorized
- `502` - Bad gateway (MCP server error)

---

### Notion Helpers

#### `POST /notion/pages.create`

Helper endpoint for creating Notion pages.

**Request Body:**
```json
{
  "database_id": "21ed7960-213a-803f-a2bf-e39ea2c941e5",
  "title": "New Page Title",
  "statusName": "Active"
}
```

**Parameters:**
- `database_id` (required): Notion database ID
- `title` (required): Page title
- `statusName` (optional): Status property value

**Response:**
```json
{
  "backend": "custom",
  "durationMs": 1203,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "Page created successfully"
      }
    ]
  }
}
```

---

## 🔄 MCP Protocol

The system implements the full MCP (Model Context Protocol) specification:

### 1. Initialize

Establish a session with the MCP server.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "clientInfo": {
      "name": "router",
      "version": "1.0.0"
    },
    "protocolVersion": "2024-11-05",
    "capabilities": {}
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "protocolVersion": "2024-11-05",
    "capabilities": {
      "tools": {
        "listChanged": true
      }
    },
    "serverInfo": {
      "name": "notion-mcp-server",
      "version": "1.0.0"
    }
  }
}
```

### 2. Tools/List

Discover available tools from the MCP server.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/list",
  "params": {}
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "tools": [
      {
        "name": "API-get-users",
        "description": "Get Notion Users",
        "inputSchema": {
          "type": "object",
          "properties": {
            "page_size": {
              "type": "number",
              "default": 100
            }
          }
        }
      }
    ]
  }
}
```

### 3. Tools/Call

Execute a specific tool with arguments.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "API-get-users",
    "arguments": {
      "page_size": 2
    }
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 3,
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

## 🛠️ Available Tools

### API-get-users

Retrieves a list of Notion users accessible to the integration.

**Arguments:**
- `page_size` (optional): Number of users to return (default: 100)
- `start_cursor` (optional): Pagination cursor

**Example:**
```bash
curl -X POST https://router.path58.com/mcp/tools.call \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "API-get-users",
    "arguments": {
      "page_size": 5
    }
  }'
```

### API-post-page

Creates a new page in a Notion database.

**Arguments:**
- `parent`: Database or page parent information
- `properties`: Page properties (title, status, etc.)
- `children` (optional): Page content blocks

**Example:**
```bash
curl -X POST https://router.path58.com/mcp/tools.call \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "API-post-page",
    "arguments": {
      "parent": {
        "database_id": "your-database-id"
      },
      "properties": {
        "title": {
          "title": [
            {
              "text": {
                "content": "New Page"
              }
            }
          ]
        }
      }
    }
  }'
```

## 📊 Response Format

All successful responses follow this structure:

```json
{
  "backend": "custom|official",
  "durationMs": 1234,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "Tool execution result"
      }
    ]
  }
}
```

**Fields:**
- `backend`: Which MCP backend processed the request
- `durationMs`: Request processing time in milliseconds
- `result`: Tool execution result in MCP format

## 🚨 Error Handling

### Error Response Format

```json
{
  "error": {
    "type": "error_type",
    "code": "error_code",
    "detail": "Detailed error message"
  }
}
```

### Common Error Codes

- `400` - Bad Request: Invalid request format
- `401` - Unauthorized: Missing or invalid API key
- `404` - Not Found: Tool or endpoint not found
- `429` - Too Many Requests: Rate limit exceeded
- `502` - Bad Gateway: MCP server error
- `500` - Internal Server Error: Unexpected error

### Rate Limiting

- **Limit**: 100 requests per 15 minutes per API key
- **Headers**: `Retry-After` indicates when to retry
- **Response**: 429 status code when limit exceeded

## 🔍 Testing

### Test with curl

```bash
# Health check
curl -H "Authorization: Bearer YOUR_API_KEY" \
  https://router.path58.com/health

# MCP tool call
curl -X POST https://router.path58.com/mcp/tools.call \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name":"API-get-users","arguments":{"page_size":2}}'
```

### Test with Postman

1. Set base URL: `https://router.path58.com`
2. Add header: `Authorization: Bearer YOUR_API_KEY`
3. Test endpoints with appropriate request bodies

## 📚 Additional Resources

- [MCP Protocol Specification](https://modelcontextprotocol.io/)
- [Notion API Documentation](https://developers.notion.com/)
- [OpenAPI Specification](../openapi-min.yaml)
- [Troubleshooting Guide](../troubleshooting/README.md)
