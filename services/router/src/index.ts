import express from "express";
import cors from "cors";
import { notionCreatePageViaMcp, mcpSseCall } from "./mcp.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

const PORT = parseInt(
  process.env.PORT || process.env.ROUTER_PORT || "3032",
  10,
);
const ROUTER_API_KEY = process.env.ROUTER_API_KEY || ""; // optional bearer

// Type definitions for better type safety
interface ErrorResponse {
  error: string;
}

interface McpToolsCallRequest {
  name: string;
  arguments?: Record<string, unknown>;
}

interface NotionPageCreateRequest {
  database_id: string;
  title: string;
  statusName?: string;
}

interface HealthResponse {
  ok: boolean;
  ts: string;
}

function requireAuth(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
): void {
  if (!ROUTER_API_KEY) return next(); // no auth enforced
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (token !== ROUTER_API_KEY) {
    res.status(401).json({ error: "Unauthorized" } as ErrorResponse);
    return;
  }
  next();
}

app.get("/health", requireAuth, (_req, res) => {
  const response: HealthResponse = { ok: true, ts: new Date().toISOString() };
  res.json(response);
});

// Generic passthrough for MCP JSON-RPC tools.call
app.post("/mcp/tools.call", requireAuth, async (req, res) => {
  try {
    const payload = req.body as McpToolsCallRequest;
    if (!payload?.name) {
      return res.status(400).json({
        error: 'Missing "name" in body for tools.call',
      } as ErrorResponse);
    }
    const { result } = await mcpSseCall({
      jsonrpc: "2.0",
      method: "tools/call",
      params: { name: payload.name, arguments: payload.arguments || {} },
    });
    res.json(result);
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : "MCP tools.call failed";
    res.status(502).json({ error: errorMessage } as ErrorResponse);
  }
});

// Friendly helper: create a Notion page via MCP
app.post("/notion/pages.create", requireAuth, async (req, res) => {
  try {
    const { database_id, title, statusName } =
      req.body as NotionPageCreateRequest;
    if (!database_id || !title) {
      return res
        .status(400)
        .json({ error: "database_id and title are required" } as ErrorResponse);
    }
    const page = await notionCreatePageViaMcp({
      database_id,
      title,
      statusName,
    });
    res.json(page);
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : "pages.create failed";
    res.status(502).json({ error: errorMessage } as ErrorResponse);
  }
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Router listening on :${PORT}`);
});
