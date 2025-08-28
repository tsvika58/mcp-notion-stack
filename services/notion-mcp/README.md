# Notion MCP Server (TypeScript)

A Model Context Protocol server that exposes Notion CRUD tools for use with **OpenAI Agents** and **Claude**.

## Prereqs
- Node 18+
- A Notion **internal integration** (Settings → Connections → Develop or manage integrations). Copy the **internal integration token**.
- Share your target databases/pages with that integration (… menu → **Add connections** → select your integration).

## Setup

```bash
pnpm i   # or npm i / yarn
cp env.example .env
# put NOTION_TOKEN and (optionally) NOTION_DEFAULT_DATABASE_ID
```

## Run (HTTP / Streamable HTTP)
```bash
pnpm run dev:http
# server on http://localhost:3030/mcp
```

## Run (stdio)
```bash
pnpm run dev:stdio
# process will speak MCP over stdin/stdout
```

## Tools exposed
- `notion_search` – POST `/v1/search` across pages + databases shared with the integration.
- `notion_query_database` – POST `/v1/databases/{id}/query` with filter/sorts/pagination.
- `notion_create_page` – POST `/v1/pages` with `parent.database_id`, title property, optional extra properties, and optional content blocks.
- `notion_update_page` – PATCH `/v1/pages/{id}` with `properties`.
- `notion_append_blocks` – PATCH `/v1/blocks/{pageId}/children` for paragraphs, headings, bullets, to-dos.
- `notion_retrieve_page` – GET `/v1/pages/{id}` (properties only).
- `notion_list_block_children` – GET `/v1/blocks/{blockId}/children` (page content).
- `notion_archive_page` – PATCH `/v1/pages/{id}` with `{ archived: true }`.

> Notes:
> - Database rows in Notion are *pages*. Update rows via **Update page properties**, not "update database schema."
> - The block appender only supports a minimal set by default; extend `BlockSchema` in `src/types.ts` to add more block types.
> - Notion has API and per‑integration limits; this server retries on `429` using `p-retry`.

## Example: Using with OpenAI Agents SDK (Streamable HTTP)

```ts
import { Agent, run, MCPServerStreamableHttp } from '@openai/agents';

const mcp = new MCPServerStreamableHttp({
  url: 'http://localhost:3030/mcp',
  name: 'notion'
});

async function main() {
  await mcp.connect();
  const agent = new Agent({
    name: 'Notion Agent',
    instructions: 'Use the MCP tools to read/write Notion as requested.',
    mcpServers: [mcp]
  });

  const result = await run(agent, 'Create a task "Draft Q3 plan" due next Friday in the default database and add a note paragraph.');
  console.log(result.finalOutput);
}

main();
```

## Example: Using with Claude Desktop
- Add a new MCP server pointing to `http://localhost:3030/mcp` **or** run this server with `TRANSPORT=stdio` and add it as a stdio server.

## Extending
- Add more block types by expanding `BlockSchema` / `buildBlocks()`.
- Add tools like `create_database`, `update_database_schema`, `upload_file` (via Notion files support), etc.
- Introduce a property mapper to translate natural language keys ("due date", "owner") into your DB property names.

## Security
- Keep `NOTION_TOKEN` secret. If you expose HTTP remotely, add proper auth (reverse‑proxy, allow‑list, etc.).
- Consider `requireApproval` in OpenAI Agents for destructive tools.

## License
MIT
