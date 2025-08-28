import express from "express";
import type { Request, Response } from "express";
import { createParser } from "eventsource-parser";
import fetch from "node-fetch";

// === CONFIGURATION ===
const PORT = Number(process.env.PORT ?? 3031); // dev port
const MCP_AUTH = process.env.AUTH_TOKEN ?? process.env.MCP_AUTH ?? "";
const NOTION_TOKEN = process.env.NOTION_TOKEN ?? "";
const NOTION_VERSION = process.env.NOTION_VERSION ?? "2022-06-28";

if (!NOTION_TOKEN) {
  console.error("ERROR: NOTION_TOKEN is required");
  process.exit(1);
}

// Simple logger
const log = (...args: any[]) => console.log(new Date().toISOString(), ...args);

// === MINIMAL MCP OVER HTTP (SSE) ===
// Implements: initialize, tools/list, tools/call
// Tools implemented:
//  - API-get-users (Notion /v1/users)
//  - API-post-page (Notion /v1/pages)

type Json = Record<string, any>;
type JsonRpcReq = { jsonrpc: "2.0"; id?: number | string; method: string; params?: Json };
type JsonRpcRes = { jsonrpc: "2.0"; id?: number | string | null; result?: any; error?: { code: number; message: string } };

const TOOLS = [
  {
    name: "API-get-users",
    description: "Notion | List all users",
    inputSchema: {
      type: "object",
      properties: {
        start_cursor: { type: "string" },
        page_size: { type: "number", default: 50 }
      },
      required: []
    }
  },
  {
    name: "API-post-page",
    description: "Notion | Create a page",
    inputSchema: {
      type: "object",
      properties: {
        parent: { type: "object" },
        properties: { type: "object" },
        children: { type: "array" }
      },
      required: ["parent", "properties"]
    }
  }
];

const app = express();
app.use(express.json());

// === HEALTH ENDPOINT ===
app.get("/health", (_req, res) => {
  res.json({ 
    status: "healthy", 
    timestamp: new Date().toISOString(), 
    transport: "http", 
    port: PORT,
    tools: TOOLS.length
  });
});

// === MCP ENDPOINT (SSE) ===
app.post("/mcp", (req: Request, res: Response) => {
  const clientAuth = req.header("authorization")?.replace(/^Bearer\s+/i, "");
  if (MCP_AUTH && clientAuth !== MCP_AUTH) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // event-stream response
  res.status(200);
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  const serverSessionId = cryptoRandomId();
  res.setHeader("mcp-session-id", serverSessionId);

  const body: JsonRpcReq = req.body;

  const send = (payload: JsonRpcRes) => {
    res.write(`event: message\n`);
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  };

  const finish = () => {
    res.end();
  };

  try {
    if (body.method === "initialize") {
      send({
        jsonrpc: "2.0",
        id: body.id ?? null,
        result: {
          protocolVersion: "2024-11-05",
          capabilities: { tools: {} },
          serverInfo: { name: "Notion MCP (dev)", version: "0.1.0" }
        }
      });
      return finish();
    }

    if (body.method === "tools/list") {
      send({ jsonrpc: "2.0", id: body.id ?? null, result: { tools: TOOLS } });
      return finish();
    }

    if (body.method === "tools/call") {
      const name = body.params?.name as string;
      const args = (body.params?.arguments ?? {}) as Json;
      handleToolCall(name, args)
        .then((result) => {
          // Return as text content, similar to the working production server
          send({
            jsonrpc: "2.0",
            id: body.id ?? null,
            result: {
              content: [{ type: "text", text: JSON.stringify(result) }]
            }
          });
          finish();
        })
        .catch((err) => {
          console.error("tools/call error:", err);
          send({ jsonrpc: "2.0", id: body.id ?? null, error: { code: -32000, message: String(err.message || err) } });
          finish();
        });
      return;
    }

    // Unknown method
    send({ jsonrpc: "2.0", id: body.id ?? null, error: { code: -32601, message: "Method not found" } });
    finish();
  } catch (e: any) {
    send({ jsonrpc: "2.0", id: (req.body as any)?.id ?? null, error: { code: -32000, message: String(e?.message || e) } });
    finish();
  }
});

app.listen(PORT, () => log(`MCP dev server listening on :${PORT}`));

// === TOOL IMPLEMENTATIONS ===

async function handleToolCall(name: string, args: Json) {
  switch (name) {
    case "API-get-users":
      return notionGet("/v1/users", {
        start_cursor: args.start_cursor,
        page_size: args.page_size ?? 50
      });

    case "API-post-page":
      return notionPost("/v1/pages", {
        parent: args.parent,
        properties: args.properties,
        children: args.children
      });

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

async function notionGet(path: string, query: Record<string, any>) {
  const url = new URL(`https://api.notion.com${path}`);
  Object.entries(query || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
  });

  const r = await fetch(url, {
    headers: {
      Authorization: `Bearer ${NOTION_TOKEN}`,
      "Notion-Version": NOTION_VERSION,
      "Content-Type": "application/json"
    }
  });
  if (!r.ok) throw new Error(`Notion GET ${url} failed: ${r.status} ${await r.text()}`);
  return r.json();
}

async function notionPost(path: string, body: any) {
  const url = `https://api.notion.com${path}`;
  const r = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${NOTION_TOKEN}`,
      "Notion-Version": NOTION_VERSION,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
  if (!r.ok) throw new Error(`Notion POST ${path} failed: ${r.status} ${await r.text()}`);
  return r.json();
}

function cryptoRandomId() {
  // simple random id; good enough for a session header
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0,
      v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
