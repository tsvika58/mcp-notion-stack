#!/usr/bin/env node
import express from "express";
import fetch from "node-fetch";
// === CONFIGURATION ===
const PORT = Number(process.env.PORT ?? 3033);
const MCP_AUTH = process.env.AUTH_TOKEN ?? process.env.MCP_AUTH ?? "";
const MIRO_TOKEN = process.env.MIRO_TOKEN ?? "";
if (!MIRO_TOKEN) {
    console.error("ERROR: MIRO_TOKEN is required");
    console.error("Get your token from: https://miro.com/app/settings/user-profile/apps");
    process.exit(1);
}
// Simple logger
const log = (...args) => console.log(new Date().toISOString(), ...args);
// === MIRO TOOLS DEFINITION ===
const TOOLS = [
    // Board Management
    {
        name: "miro_list_boards",
        description: "List all Miro boards accessible to the user",
        inputSchema: {
            type: "object",
            properties: {
                team_id: { type: "string", description: "Filter by team ID (optional)" },
                query: { type: "string", description: "Search query to filter boards by name" },
                limit: { type: "number", description: "Maximum number of boards to return (default: 20, max: 50)" }
            },
            required: []
        }
    },
    {
        name: "miro_create_board",
        description: "Create a new Miro board",
        inputSchema: {
            type: "object",
            properties: {
                name: { type: "string", description: "Name of the board" },
                description: { type: "string", description: "Description of the board" },
                team_id: { type: "string", description: "Team ID where the board will be created" }
            },
            required: ["name"]
        }
    },
    {
        name: "miro_get_board",
        description: "Get details of a specific Miro board",
        inputSchema: {
            type: "object",
            properties: {
                board_id: { type: "string", description: "The ID of the board" }
            },
            required: ["board_id"]
        }
    },
    {
        name: "miro_delete_board",
        description: "Delete a Miro board",
        inputSchema: {
            type: "object",
            properties: {
                board_id: { type: "string", description: "The ID of the board to delete" }
            },
            required: ["board_id"]
        }
    },
    // Items (Generic)
    {
        name: "miro_get_items",
        description: "Get all items on a Miro board with optional filtering",
        inputSchema: {
            type: "object",
            properties: {
                board_id: { type: "string", description: "The ID of the board" },
                type: { type: "string", description: "Filter by item type: sticky_note, shape, text, image, frame, connector, card" },
                limit: { type: "number", description: "Maximum number of items to return (default: 50)" }
            },
            required: ["board_id"]
        }
    },
    {
        name: "miro_delete_item",
        description: "Delete an item from a Miro board",
        inputSchema: {
            type: "object",
            properties: {
                board_id: { type: "string", description: "The ID of the board" },
                item_id: { type: "string", description: "The ID of the item to delete" }
            },
            required: ["board_id", "item_id"]
        }
    },
    // Sticky Notes
    {
        name: "miro_create_sticky_note",
        description: "Create a sticky note on a Miro board",
        inputSchema: {
            type: "object",
            properties: {
                board_id: { type: "string", description: "The ID of the board" },
                content: { type: "string", description: "Text content of the sticky note (supports inline HTML tags)" },
                x: { type: "number", description: "X position on the board (default: 0)" },
                y: { type: "number", description: "Y position on the board (default: 0)" },
                width: { type: "number", description: "Width of the sticky note (default: auto)" },
                color: { type: "string", description: "Color: gray, light_yellow, yellow, orange, light_green, green, dark_green, cyan, light_pink, pink, violet, red, light_blue, blue, dark_blue, black" }
            },
            required: ["board_id", "content"]
        }
    },
    {
        name: "miro_update_sticky_note",
        description: "Update a sticky note on a Miro board",
        inputSchema: {
            type: "object",
            properties: {
                board_id: { type: "string", description: "The ID of the board" },
                item_id: { type: "string", description: "The ID of the sticky note" },
                content: { type: "string", description: "New text content" },
                x: { type: "number", description: "New X position" },
                y: { type: "number", description: "New Y position" },
                color: { type: "string", description: "New color" }
            },
            required: ["board_id", "item_id"]
        }
    },
    // Shapes
    {
        name: "miro_create_shape",
        description: "Create a shape on a Miro board",
        inputSchema: {
            type: "object",
            properties: {
                board_id: { type: "string", description: "The ID of the board" },
                shape: { type: "string", description: "Shape type: rectangle, circle, triangle, rhombus, parallelogram, trapezoid, pentagon, hexagon, octagon, wedge_round_rectangle_callout, round_rectangle, right_arrow, left_arrow, left_right_arrow, left_brace, right_brace, cross, can, heart, star, flow_chart_predefined_process, cloud, flow_chart_or, flow_chart_summing_junction, flow_chart_connector" },
                content: { type: "string", description: "Text content inside the shape" },
                x: { type: "number", description: "X position" },
                y: { type: "number", description: "Y position" },
                width: { type: "number", description: "Width (default: 200)" },
                height: { type: "number", description: "Height (default: 200)" },
                color: { type: "string", description: "Fill color as hex (e.g., #ff0000) or preset" }
            },
            required: ["board_id", "shape"]
        }
    },
    {
        name: "miro_update_shape",
        description: "Update a shape on a Miro board",
        inputSchema: {
            type: "object",
            properties: {
                board_id: { type: "string", description: "The ID of the board" },
                item_id: { type: "string", description: "The ID of the shape" },
                content: { type: "string", description: "New text content" },
                x: { type: "number", description: "New X position" },
                y: { type: "number", description: "New Y position" },
                width: { type: "number", description: "New width" },
                height: { type: "number", description: "New height" },
                color: { type: "string", description: "New fill color" }
            },
            required: ["board_id", "item_id"]
        }
    },
    // Text
    {
        name: "miro_create_text",
        description: "Create a text item on a Miro board",
        inputSchema: {
            type: "object",
            properties: {
                board_id: { type: "string", description: "The ID of the board" },
                content: { type: "string", description: "Text content (supports HTML: <p>, <a>, <strong>, <em>, <u>, <s>)" },
                x: { type: "number", description: "X position" },
                y: { type: "number", description: "Y position" },
                width: { type: "number", description: "Width of the text box" },
                font_size: { type: "number", description: "Font size (10-288)" },
                text_align: { type: "string", description: "Alignment: left, center, right" }
            },
            required: ["board_id", "content"]
        }
    },
    {
        name: "miro_update_text",
        description: "Update a text item on a Miro board",
        inputSchema: {
            type: "object",
            properties: {
                board_id: { type: "string", description: "The ID of the board" },
                item_id: { type: "string", description: "The ID of the text item" },
                content: { type: "string", description: "New text content" },
                x: { type: "number", description: "New X position" },
                y: { type: "number", description: "New Y position" },
                font_size: { type: "number", description: "New font size" }
            },
            required: ["board_id", "item_id"]
        }
    },
    // Frames
    {
        name: "miro_create_frame",
        description: "Create a frame on a Miro board (used to group and organize items)",
        inputSchema: {
            type: "object",
            properties: {
                board_id: { type: "string", description: "The ID of the board" },
                title: { type: "string", description: "Title of the frame" },
                x: { type: "number", description: "X position" },
                y: { type: "number", description: "Y position" },
                width: { type: "number", description: "Width (default: 800)" },
                height: { type: "number", description: "Height (default: 600)" },
                color: { type: "string", description: "Background color as hex" }
            },
            required: ["board_id"]
        }
    },
    // Connectors
    {
        name: "miro_create_connector",
        description: "Create a connector line between two items on a Miro board",
        inputSchema: {
            type: "object",
            properties: {
                board_id: { type: "string", description: "The ID of the board" },
                start_item_id: { type: "string", description: "ID of the item where the connector starts" },
                end_item_id: { type: "string", description: "ID of the item where the connector ends" },
                caption: { type: "string", description: "Text label on the connector" },
                style: { type: "string", description: "Line style: normal, dashed, dotted" },
                stroke_color: { type: "string", description: "Line color as hex" },
                stroke_width: { type: "number", description: "Line width (1-24)" }
            },
            required: ["board_id", "start_item_id", "end_item_id"]
        }
    },
    // Cards
    {
        name: "miro_create_card",
        description: "Create a card on a Miro board (like a Kanban card with title, description, due date)",
        inputSchema: {
            type: "object",
            properties: {
                board_id: { type: "string", description: "The ID of the board" },
                title: { type: "string", description: "Title of the card" },
                description: { type: "string", description: "Description/body of the card" },
                x: { type: "number", description: "X position" },
                y: { type: "number", description: "Y position" },
                due_date: { type: "string", description: "Due date in ISO 8601 format" },
                assignee_id: { type: "string", description: "User ID to assign the card to" }
            },
            required: ["board_id", "title"]
        }
    },
    // Images
    {
        name: "miro_create_image_from_url",
        description: "Add an image to a Miro board from a URL",
        inputSchema: {
            type: "object",
            properties: {
                board_id: { type: "string", description: "The ID of the board" },
                url: { type: "string", description: "URL of the image to add" },
                x: { type: "number", description: "X position" },
                y: { type: "number", description: "Y position" },
                width: { type: "number", description: "Width of the image" },
                title: { type: "string", description: "Alt text/title for the image" }
            },
            required: ["board_id", "url"]
        }
    },
    // Bulk Operations
    {
        name: "miro_bulk_create_sticky_notes",
        description: "Create multiple sticky notes at once on a Miro board",
        inputSchema: {
            type: "object",
            properties: {
                board_id: { type: "string", description: "The ID of the board" },
                notes: {
                    type: "array",
                    description: "Array of sticky notes to create",
                    items: {
                        type: "object",
                        properties: {
                            content: { type: "string" },
                            x: { type: "number" },
                            y: { type: "number" },
                            color: { type: "string" }
                        },
                        required: ["content"]
                    }
                }
            },
            required: ["board_id", "notes"]
        }
    }
];
// === EXPRESS APP SETUP ===
const app = express();
app.use(express.json());
// === HEALTH ENDPOINT ===
app.get("/health", (_req, res) => {
    res.json({
        status: "healthy",
        timestamp: new Date().toISOString(),
        transport: "http",
        port: PORT,
        tools: TOOLS.length,
        service: "miro-mcp"
    });
});
// === MCP ENDPOINT (SSE) ===
app.post("/mcp", (req, res) => {
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
    const body = req.body;
    const send = (payload) => {
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
                    serverInfo: { name: "Miro MCP Server", version: "1.0.0" }
                }
            });
            return finish();
        }
        if (body.method === "tools/list") {
            send({ jsonrpc: "2.0", id: body.id ?? null, result: { tools: TOOLS } });
            return finish();
        }
        if (body.method === "tools/call") {
            const name = body.params?.name;
            const args = (body.params?.arguments ?? {});
            handleToolCall(name, args)
                .then((result) => {
                send({
                    jsonrpc: "2.0",
                    id: body.id ?? null,
                    result: {
                        content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
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
    }
    catch (e) {
        const error = e;
        send({ jsonrpc: "2.0", id: body.id ?? null, error: { code: -32000, message: String(error?.message || e) } });
        finish();
    }
});
app.listen(PORT, () => log(`Miro MCP server listening on :${PORT}`));
// === TOOL IMPLEMENTATIONS ===
async function handleToolCall(name, args) {
    switch (name) {
        // Board Management
        case "miro_list_boards":
            return miroGet("/v2/boards", {
                team_id: args.team_id,
                query: args.query,
                limit: args.limit ?? 20
            });
        case "miro_create_board":
            return miroPost("/v2/boards", {
                name: args.name,
                description: args.description,
                teamId: args.team_id
            });
        case "miro_get_board":
            return miroGet(`/v2/boards/${args.board_id}`, {});
        case "miro_delete_board":
            return miroDelete(`/v2/boards/${args.board_id}`);
        // Items
        case "miro_get_items":
            return miroGet(`/v2/boards/${args.board_id}/items`, {
                type: args.type,
                limit: args.limit ?? 50
            });
        case "miro_delete_item":
            return miroDelete(`/v2/boards/${args.board_id}/items/${args.item_id}`);
        // Sticky Notes
        case "miro_create_sticky_note": {
            const stickyData = {
                data: { content: args.content, shape: "square" },
                position: { x: args.x ?? 0, y: args.y ?? 0 }
            };
            if (args.color)
                stickyData.style = { fillColor: args.color };
            if (args.width)
                stickyData.geometry = { width: args.width };
            return miroPost(`/v2/boards/${args.board_id}/sticky_notes`, stickyData);
        }
        case "miro_update_sticky_note": {
            const updateData = {};
            if (args.content)
                updateData.data = { content: args.content };
            if (args.x !== undefined || args.y !== undefined) {
                updateData.position = { x: args.x, y: args.y };
            }
            if (args.color)
                updateData.style = { fillColor: args.color };
            return miroPatch(`/v2/boards/${args.board_id}/sticky_notes/${args.item_id}`, updateData);
        }
        // Shapes
        case "miro_create_shape": {
            const shapeData = {
                data: {
                    shape: args.shape,
                    content: args.content ?? ""
                },
                position: { x: args.x ?? 0, y: args.y ?? 0 },
                geometry: {
                    width: args.width ?? 200,
                    height: args.height ?? 200
                }
            };
            if (args.color)
                shapeData.style = { fillColor: args.color };
            return miroPost(`/v2/boards/${args.board_id}/shapes`, shapeData);
        }
        case "miro_update_shape": {
            const updateData = {};
            if (args.content !== undefined)
                updateData.data = { content: args.content };
            if (args.x !== undefined || args.y !== undefined) {
                updateData.position = { x: args.x, y: args.y };
            }
            if (args.width !== undefined || args.height !== undefined) {
                updateData.geometry = { width: args.width, height: args.height };
            }
            if (args.color)
                updateData.style = { fillColor: args.color };
            return miroPatch(`/v2/boards/${args.board_id}/shapes/${args.item_id}`, updateData);
        }
        // Text
        case "miro_create_text": {
            const textData = {
                data: { content: args.content },
                position: { x: args.x ?? 0, y: args.y ?? 0 }
            };
            if (args.width)
                textData.geometry = { width: args.width };
            if (args.font_size || args.text_align) {
                textData.style = {};
                if (args.font_size)
                    textData.style.fontSize = String(args.font_size);
                if (args.text_align)
                    textData.style.textAlign = args.text_align;
            }
            return miroPost(`/v2/boards/${args.board_id}/texts`, textData);
        }
        case "miro_update_text": {
            const updateData = {};
            if (args.content)
                updateData.data = { content: args.content };
            if (args.x !== undefined || args.y !== undefined) {
                updateData.position = { x: args.x, y: args.y };
            }
            if (args.font_size)
                updateData.style = { fontSize: String(args.font_size) };
            return miroPatch(`/v2/boards/${args.board_id}/texts/${args.item_id}`, updateData);
        }
        // Frames
        case "miro_create_frame": {
            const frameData = {
                data: { title: args.title ?? "", format: "custom" },
                position: { x: args.x ?? 0, y: args.y ?? 0 },
                geometry: {
                    width: args.width ?? 800,
                    height: args.height ?? 600
                }
            };
            if (args.color)
                frameData.style = { fillColor: args.color };
            return miroPost(`/v2/boards/${args.board_id}/frames`, frameData);
        }
        // Connectors
        case "miro_create_connector": {
            const connectorData = {
                startItem: { id: args.start_item_id },
                endItem: { id: args.end_item_id }
            };
            if (args.caption)
                connectorData.captions = [{ content: args.caption }];
            if (args.style || args.stroke_color || args.stroke_width) {
                connectorData.style = {};
                if (args.style)
                    connectorData.style.strokeStyle = args.style;
                if (args.stroke_color)
                    connectorData.style.strokeColor = args.stroke_color;
                if (args.stroke_width)
                    connectorData.style.strokeWidth = String(args.stroke_width);
            }
            return miroPost(`/v2/boards/${args.board_id}/connectors`, connectorData);
        }
        // Cards
        case "miro_create_card": {
            const cardData = {
                data: {
                    title: args.title,
                    description: args.description ?? ""
                },
                position: { x: args.x ?? 0, y: args.y ?? 0 }
            };
            if (args.due_date)
                cardData.data.dueDate = args.due_date;
            if (args.assignee_id)
                cardData.data.assigneeId = args.assignee_id;
            return miroPost(`/v2/boards/${args.board_id}/cards`, cardData);
        }
        // Images
        case "miro_create_image_from_url": {
            const imageData = {
                data: { url: args.url },
                position: { x: args.x ?? 0, y: args.y ?? 0 }
            };
            if (args.width)
                imageData.geometry = { width: args.width };
            if (args.title)
                imageData.data.title = args.title;
            return miroPost(`/v2/boards/${args.board_id}/images`, imageData);
        }
        // Bulk Operations
        case "miro_bulk_create_sticky_notes": {
            const notes = args.notes;
            const results = [];
            for (const note of notes) {
                const stickyData = {
                    data: { content: note.content, shape: "square" },
                    position: { x: note.x ?? 0, y: note.y ?? 0 }
                };
                if (note.color)
                    stickyData.style = { fillColor: note.color };
                results.push(await miroPost(`/v2/boards/${args.board_id}/sticky_notes`, stickyData));
            }
            return { created: results.length, items: results };
        }
        default:
            throw new Error(`Unknown tool: ${name}`);
    }
}
// === MIRO API HELPERS ===
async function miroGet(path, query) {
    const url = new URL(`https://api.miro.com${path}`);
    Object.entries(query || {}).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== "")
            url.searchParams.set(k, String(v));
    });
    const r = await fetch(url.toString(), {
        headers: {
            Authorization: `Bearer ${MIRO_TOKEN}`,
            "Content-Type": "application/json"
        }
    });
    if (!r.ok)
        throw new Error(`Miro GET ${path} failed: ${r.status} ${await r.text()}`);
    return r.json();
}
async function miroPost(path, body) {
    const url = `https://api.miro.com${path}`;
    const r = await fetch(url, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${MIRO_TOKEN}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
    });
    if (!r.ok)
        throw new Error(`Miro POST ${path} failed: ${r.status} ${await r.text()}`);
    return r.json();
}
async function miroPatch(path, body) {
    const url = `https://api.miro.com${path}`;
    const r = await fetch(url, {
        method: "PATCH",
        headers: {
            Authorization: `Bearer ${MIRO_TOKEN}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
    });
    if (!r.ok)
        throw new Error(`Miro PATCH ${path} failed: ${r.status} ${await r.text()}`);
    return r.json();
}
async function miroDelete(path) {
    const url = `https://api.miro.com${path}`;
    const r = await fetch(url, {
        method: "DELETE",
        headers: {
            Authorization: `Bearer ${MIRO_TOKEN}`,
            "Content-Type": "application/json"
        }
    });
    if (!r.ok)
        throw new Error(`Miro DELETE ${path} failed: ${r.status} ${await r.text()}`);
    // DELETE often returns 204 No Content
    if (r.status === 204)
        return { success: true };
    return r.json();
}
function cryptoRandomId() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0, v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}
