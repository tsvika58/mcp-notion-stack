import express from "express";
import crypto from "crypto";
import { httpLogger, logger, hash as hash12 } from "./logger.js";
import { registry, metricsMiddleware, mcpToolCalls } from "./metrics.js";
import { routerLimiter } from "./rateLimit.js";
import { MCPClient } from "./mcpPool.js";
import { decideTarget, RouterCatalog } from "./routerLogic.js";

const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(httpLogger);

// --- Auth helper (keeps your existing model) ---
function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const expected = process.env.ROUTER_API_KEY;
  if (!expected) {
    return next(); // auth disabled
  }
  const auth = req.headers.authorization || "";
  if (auth === `Bearer ${expected}`) {
    return next();
  }
  res.status(401).json({ error: "Unauthorized" });
}

// --- MCP Clients ---
const OFFICIAL = new MCPClient({
  baseUrl: process.env.OFFICIAL_MCP_URL!,
  authToken: process.env.OFFICIAL_MCP_AUTH!,
  requestTimeoutMs: Number(process.env.MCP_TIMEOUT_MS || 12000),
});

const CUSTOM = new MCPClient({
  baseUrl: process.env.CUSTOM_MCP_URL!,
  authToken: process.env.CUSTOM_MCP_AUTH!,
  requestTimeoutMs: Number(process.env.MCP_TIMEOUT_MS || 12000),
});

let catalog: RouterCatalog = { official: new Map(), custom: new Map() };

async function refreshCatalog() {
  try {
    const [o, c] = await Promise.all([OFFICIAL.listTools(), CUSTOM.listTools()]);
    catalog = { official: o, custom: c };
    logger.info({ official: o.size, custom: c.size }, "Catalog updated");
  } catch (e) {
    logger.error({ err: e }, "Catalog refresh failed");
  }
}

// Health (keep yours; unthrottled but logged)
app.get("/health", metricsMiddleware("/health"), (_req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() });
});

// Rate-limit & protect all /mcp/* and /notion/*
app.use(["/mcp", "/notion"], requireAuth, routerLimiter);

// Generic passthrough (tools.call) with smart routing
app.post("/mcp/tools.call", metricsMiddleware("/mcp/tools.call"), async (req, res) => {
  const { name, arguments: args, target = "auto" } = req.body || {};
  if (!name) {
    return res.status(400).json({ error: "Missing tool name" });
  }

  let chosen: "official" | "custom";
  if (target === "official" || target === "custom") {
    chosen = target;
  } else {
    chosen = decideTarget(name, catalog);
  }

  const primary = chosen === "official" ? OFFICIAL : CUSTOM;
  const fallback = chosen === "official" ? CUSTOM : OFFICIAL;

  const start = Date.now();
  try {
    if (name) {
      mcpToolCalls.inc({ tool: String(name) });
    }
    
    const out = await primary.callTool(name, args || {});
    return res.json({ 
      backend: chosen, 
      durationMs: Date.now() - start, 
      ...out 
    });
  } catch (e1: any) {
    // Try fallback once
    try {
      const out2 = await fallback.callTool(name, args || {});
      return res.json({ 
        backend: chosen === "official" ? "custom" : "custom", 
        failover: true, 
        durationMs: Date.now() - start, 
        ...out2 
      });
    } catch (e2: any) {
      req.log?.error({ err: e1, tool: name, backend: chosen }, "Primary backend failed");
      req.log?.error({ err: e2, tool: name, backend: fallback === OFFICIAL ? "official" : "custom" }, "Fallback backend failed");
      return res.status(502).json({ 
        error: "Both backends failed", 
        primary: e1?.message || String(e1), 
        fallback: e2?.message || String(e2) 
      });
    }
  }
});

// Friendly helper: create Notion page (auto-routes to custom for writes)
app.post("/notion/pages.create", metricsMiddleware("/notion/pages.create"), async (req, res) => {
  try {
    const { database_id, title, statusName } = req.body || {};
    if (!database_id || !title) {
      return res.status(400).json({ error: "database_id and title are required" });
    }

    const toolNameOfficial = "API-post-page"; // adjust to your official tool names if present
    const toolNameCustom   = "API-post-page";

    // Pick backend via decideTarget (will select custom for write)
    const chosen = decideTarget(toolNameOfficial, catalog);
    const client = chosen === "official" ? OFFICIAL : CUSTOM;

    const properties: any = {
      "Project Name": { title: [{ text: { content: title } }] }
    };
    if (statusName) {
      properties["Project Status"] = { select: { name: statusName } };
    }

    const args = {
      parent: { database_id },
      properties
    };

    const result = await client.callTool(toolNameOfficial, args);
    res.json({ backend: chosen, ...result });
  } catch (err: any) {
    req.log?.error({ err }, "pages.create failed");
    res.status(502).json({ error: "pages.create failed", detail: err?.message });
  }
});

// Protected /metrics:
const metricsRequireAuth = String(process.env.METRICS_REQUIRE_AUTH || "true").toLowerCase() !== "false";

app.get("/metrics",
  metricsRequireAuth ? requireAuth : (_req, _res, next) => next(),
  async (_req, res) => {
    res.set("Content-Type", registry.contentType);
    res.end(await registry.metrics());
  }
);

// Start server (keep your port env):
const port = Number(process.env.PORT || process.env.ROUTER_PORT || 3032);
app.listen(port, "0.0.0.0", async () => {
  logger.info({ port }, "Router started");
  
  // Initialize MCP clients and catalog
  try {
    await OFFICIAL.init().catch((e) => logger.warn({ err: e }, "Official MCP init failed"));
    await CUSTOM.init().catch((e) => logger.warn({ err: e }, "Custom MCP init failed"));
    await refreshCatalog();
    setInterval(refreshCatalog, 60_000); // refresh every minute
  } catch (e) {
    logger.error({ err: e }, "Failed to initialize MCP clients");
  }
});
