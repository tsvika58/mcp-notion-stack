import { v4 as uuidv4 } from "uuid";

type MCPClientConfig = {
  baseUrl: string;     // e.g. http://notion_mcp:3030/mcp
  authToken: string;   // Bearer
  requestTimeoutMs: number;
};

type ToolDef = { name: string; description?: string; inputSchema?: any };
type ToolsList = Map<string, ToolDef>;

export class MCPClient {
  private cfg: MCPClientConfig;
  private sessionId: string | null = null;
  private ready = false;
  private initializing = false;

  constructor(cfg: MCPClientConfig) { this.cfg = cfg; }

  async init(): Promise<void> {
    if (this.initializing) return; // Prevent concurrent initialization
    if (this.ready) return; // Already initialized
    
    this.initializing = true;
    try {
      const res = await fetch(this.cfg.baseUrl, {
        method: "POST",
        headers: {
          "authorization": `Bearer ${this.cfg.authToken}`,
          "accept": "application/json, text/event-stream",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "initialize",
          params: {
            clientInfo: { name: "router", version: "1.0.0" },
            protocolVersion: "2024-11-05",
            capabilities: {},
          },
        }),
      });

      // Get session ID from response headers
      this.sessionId = res.headers.get("mcp-session-id") || "";
      if (!this.sessionId) {
        throw new Error("No mcp-session-id returned by server");
      }

      // Read the first SSE message (initialize result)
      const text = await res.text();
      const line = text.split("\n").find(l => l.startsWith("data: "));
      if (!line) throw new Error("No SSE data frame in initialize response");
      const payload = JSON.parse(line.slice(6));
      
      if (payload?.result?.protocolVersion) {
        this.ready = true;
      }
    } finally {
      this.initializing = false;
    }
  }

  async listTools(): Promise<ToolsList> {
    if (!this.ready) await this.init();
    const out = new Map<string, ToolDef>();
    const res = await this.rpcInternal("tools/list", {});
    const tools = res?.result?.tools || [];
    for (const t of tools) out.set(t.name, t);
    return out;
  }

  async callTool(name: string, args: any): Promise<any> {
    if (!this.ready) await this.init();
    return this.rpcInternal("tools/call", { name, arguments: args });
  }

  private async rpcInternal(method: string, params: any): Promise<any> {
    if (!this.sessionId) {
      throw new Error("MCP client not initialized");
    }
    
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), this.cfg.requestTimeoutMs);

    try {
      const resp = await fetch(this.cfg.baseUrl, {
        method: "POST",
        headers: {
          "authorization": `Bearer ${this.cfg.authToken}`,
          "mcp-session": this.sessionId,
          "mcp-session-id": this.sessionId,
          "accept": "application/json, text/event-stream",
          "content-type": "application/json",
        },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
        signal: ctrl.signal,
      });

      clearTimeout(to);

      if (resp.status === 200 && resp.headers.get("content-type")?.includes("text/event-stream")) {
        // Parse the first SSE "event: message\ndata: {...}\n\n"
        const text = await resp.text();
        const line = text.split("\n").find(l => l.startsWith("data: "));
        if (!line) throw new Error("No SSE data frame");
        return JSON.parse(line.replace(/^data:\s*/, ""));
      } else {
        const body = await resp.text();
        throw new Error(`MCP bad resp ${resp.status}: ${body}`);
      }
    } catch (e) {
      clearTimeout(to);
      if (e instanceof Error) throw e;
      throw new Error(`MCP fetch error: ${e}`);
    }
  }

  // Public method that ensures initialization
  async rpc(method: string, params: any): Promise<any> {
    if (!this.ready) await this.init();
    return this.rpcInternal(method, params);
  }
}
