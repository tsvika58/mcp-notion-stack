# Miro MCP Server

A Model Context Protocol (MCP) server that enables Claude Desktop to interact with Miro boards. Create sticky notes, shapes, connectors, frames, and more directly from your AI assistant.

## Features

- **Board Management**: List, create, get, and delete Miro boards
- **Sticky Notes**: Create and update sticky notes with customizable colors
- **Shapes**: Create shapes (rectangles, circles, triangles, flowchart elements, etc.)
- **Text Items**: Add and format text on boards
- **Frames**: Create frames to organize content
- **Connectors**: Draw lines between items
- **Cards**: Create Kanban-style cards with due dates
- **Images**: Add images from URLs
- **Bulk Operations**: Create multiple sticky notes at once

## Prerequisites

1. **Miro Account**: You need a Miro account
2. **Miro API Token**: Get your access token from [Miro Developer Settings](https://miro.com/app/settings/user-profile/apps)

### Getting Your Miro Token

1. Go to [Miro Developer Portal](https://developers.miro.com/)
2. Click on **Your apps** in the top navigation
3. Create a new app or select an existing one
4. In your app settings, install it to a team to get an access token
5. Copy the access token

For personal use, you can also create a Developer Token:
1. Go to [Profile Settings](https://miro.com/app/settings/user-profile/apps)
2. Under **Developer token**, generate a new token
3. Select the required scopes (boards:read, boards:write)

## Installation

### Option 1: Run Locally with Node.js

```bash
cd services/miro-mcp
npm install
npm run build

# Set your Miro token
export MIRO_TOKEN="your-miro-token-here"

# Start the server
npm start
```

The server will start on port 3033 by default.

### Option 2: Run with Docker

```bash
# From the project root
docker compose --profile miro up -d miro_mcp

# Or build and run directly
cd services/miro-mcp
docker build -t miro-mcp .
docker run -p 3033:3033 -e MIRO_TOKEN="your-token" miro-mcp
```

### Option 3: Run for Development

```bash
cd services/miro-mcp
npm install
export MIRO_TOKEN="your-miro-token-here"
npm run dev  # Hot reload with tsx
```

## Claude Desktop Configuration

Add the following to your Claude Desktop configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
**Linux**: `~/.config/Claude/claude_desktop_config.json`

### Using HTTP Transport (Recommended)

First, start the MCP server, then configure Claude Desktop:

```json
{
  "mcpServers": {
    "miro": {
      "url": "http://localhost:3033/mcp",
      "transport": "http"
    }
  }
}
```

### Using npx (Direct Execution)

You can also run the server directly via npx:

```json
{
  "mcpServers": {
    "miro": {
      "command": "npx",
      "args": ["-y", "tsx", "/path/to/miro-mcp/src/index.ts"],
      "env": {
        "MIRO_TOKEN": "your-miro-token-here"
      }
    }
  }
}
```

### With Authentication

If you've set `MCP_AUTH` or `AUTH_TOKEN` environment variable:

```json
{
  "mcpServers": {
    "miro": {
      "url": "http://localhost:3033/mcp",
      "transport": "http",
      "headers": {
        "Authorization": "Bearer your-mcp-auth-token"
      }
    }
  }
}
```

## Available Tools

| Tool | Description |
|------|-------------|
| `miro_list_boards` | List all accessible Miro boards |
| `miro_create_board` | Create a new board |
| `miro_get_board` | Get board details |
| `miro_delete_board` | Delete a board |
| `miro_get_items` | Get all items on a board |
| `miro_delete_item` | Delete an item |
| `miro_create_sticky_note` | Create a sticky note |
| `miro_update_sticky_note` | Update a sticky note |
| `miro_create_shape` | Create a shape |
| `miro_update_shape` | Update a shape |
| `miro_create_text` | Create text item |
| `miro_update_text` | Update text item |
| `miro_create_frame` | Create a frame |
| `miro_create_connector` | Create a connector between items |
| `miro_create_card` | Create a card |
| `miro_create_image_from_url` | Add an image from URL |
| `miro_bulk_create_sticky_notes` | Create multiple sticky notes |

## Example Usage with Claude

Once configured, you can ask Claude things like:

- "List all my Miro boards"
- "Create a new board called 'Project Planning'"
- "Add a yellow sticky note saying 'Review requirements' to board X"
- "Create a flowchart with three shapes connected by arrows"
- "Add a frame titled 'Sprint 1' and put some cards in it"

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `MIRO_TOKEN` | Yes | Your Miro API access token |
| `PORT` | No | Server port (default: 3033) |
| `MCP_AUTH` | No | Optional authentication token for the MCP server |
| `AUTH_TOKEN` | No | Alias for MCP_AUTH |

## API Endpoints

- `GET /health` - Health check endpoint
- `POST /mcp` - MCP JSON-RPC endpoint (SSE transport)

## Troubleshooting

### "MIRO_TOKEN is required" error
Make sure you've set the `MIRO_TOKEN` environment variable with a valid Miro access token.

### "Unauthorized" error from Miro API
1. Check that your token hasn't expired
2. Verify your app has the required scopes (boards:read, boards:write)
3. Ensure the token has access to the team/boards you're trying to access

### Connection refused
Make sure the server is running and accessible at the configured URL.

## Development

```bash
# Install dependencies
npm install

# Run in development mode (hot reload)
npm run dev

# Build for production
npm run build

# Run production build
npm start
```

## License

MIT
