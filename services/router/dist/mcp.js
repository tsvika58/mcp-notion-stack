// Minimal MCP HTTP client with SSE support
const MCP_BASE_URL = process.env.MCP_BASE_URL || "http://notion_mcp:3030";
const MCP_AUTH = process.env.MCP_AUTH || "";
async function mcpInitialize() {
    const body = {
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
            clientInfo: { name: "router", version: "1.0.0" },
            protocolVersion: "2024-11-05",
            capabilities: {},
        },
    };
    const res = await fetch(`${MCP_BASE_URL}/mcp`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${MCP_AUTH}`,
            accept: "application/json, text/event-stream",
            "content-type": "application/json",
        },
        body: JSON.stringify(body),
    });
    const sessionId = res.headers.get("mcp-session-id") || "";
    if (!sessionId)
        throw new Error("No mcp-session-id returned by server");
    // Read the first SSE message (initialize result)
    const text = await res.text();
    const line = text.split("\n").find((l) => l.startsWith("data: "));
    if (!line)
        throw new Error("No SSE data frame in initialize response");
    const payload = JSON.parse(line.slice(6));
    return { sessionId, result: payload.result };
}
// Generic SSE JSON-RPC call; returns parsed .result if available, else full message
export async function mcpSseCall(req) {
    const { sessionId } = await mcpInitialize();
    // Some MCPs like both headers; include both for compatibility
    const res = await fetch(`${MCP_BASE_URL}/mcp`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${MCP_AUTH}`,
            "mcp-session": sessionId,
            "mcp-session-id": sessionId,
            accept: "application/json, text/event-stream",
            "content-type": "application/json",
        },
        body: JSON.stringify({
            jsonrpc: "2.0",
            id: req.id ?? Date.now(),
            method: req.method,
            params: req.params ?? {},
        }),
    });
    // Stream can be large; but for our use, reading whole text is OK.
    const text = await res.text();
    // Grab last data: frame (usually contains the result)
    const dataFrames = text.split("\n").filter((l) => l.startsWith("data: "));
    if (dataFrames.length === 0)
        throw new Error("No SSE data frames in response");
    const last = JSON.parse(dataFrames[dataFrames.length - 1].slice(6));
    if (last.error) {
        throw new Error(`MCP error: ${last.error?.message || "unknown"}`);
    }
    return { result: last.result, raw: last };
}
// Helpers for Notion shortcuts
export async function notionCreatePageViaMcp(args) {
    const properties = {
        "Project Name": {
            title: [{ text: { content: args.title } }],
        },
    };
    if (args.statusName) {
        properties["Project Status"] = { select: { name: args.statusName } };
    }
    const params = {
        name: "API-post-page",
        arguments: {
            parent: { database_id: args.database_id },
            properties,
        },
    };
    const callReq = {
        jsonrpc: "2.0",
        method: "tools/call",
        params,
    };
    const { result } = await mcpSseCall(callReq);
    // The Notion MCP sometimes returns content as text JSON string; normalize:
    let page;
    if (Array.isArray(result?.content) && result.content[0]?.type === "text") {
        try {
            page = JSON.parse(result.content[0].text);
        }
        catch {
            page = { raw: result };
        }
    }
    else if (result?.data) {
        page = result.data;
    }
    else {
        page = result;
    }
    return page;
}
