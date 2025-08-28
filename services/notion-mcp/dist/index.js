import express from 'express';
import cors from 'cors';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { CONFIG } from './config.js';
import { registerTools } from './tools.js';
async function buildServer() {
    const server = new McpServer({ name: 'notion-mcp-server', version: '1.0.0' });
    registerTools(server);
    return server;
}
async function startHttp() {
    const app = express();
    app.use(express.json());
    app.use(cors({ origin: '*', exposedHeaders: ['Mcp-Session-Id'], allowedHeaders: ['Content-Type', 'mcp-session-id'] }));
    // Stateful Streamable HTTP with session IDs (best for performance)
    const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    });
    const server = await buildServer();
    await server.connect(transport);
    app.all('/mcp', async (req, res) => {
        try {
            await transport.handleRequest(req, res, req.body);
        }
        catch (err) {
            console.error('MCP handleRequest error', err);
            if (!res.headersSent)
                res.status(500).json({ error: 'Internal server error' });
        }
    });
    app.get('/', (_req, res) => res.json({ ok: true, name: 'notion-mcp-server', transport: 'http' }));
    app.listen(CONFIG.port, () => {
        console.log(`[MCP] HTTP server listening on http://localhost:${CONFIG.port}`);
    });
}
async function startStdio() {
    const server = await buildServer();
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.log('[MCP] stdio transport ready');
}
if (CONFIG.transport === 'stdio') {
    startStdio();
}
else {
    startHttp();
}
