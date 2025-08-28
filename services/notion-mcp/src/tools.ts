import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { 
  appendBlocks,
  archivePage,
  createPageInDatabase,
  listBlockChildren,
  notionCanonicalPageUrl,
  queryDatabase,
  retrievePage,
  search,
  updatePageProperties
} from './notion.js';
import {
  AppendBlocksInput,
  ArchivePageInput,
  CreatePageInput,
  ListBlockChildrenInput,
  QueryDatabaseInput,
  RetrievePageInput,
  SearchInput,
  UpdatePageInput
} from './types.js';
import { CONFIG } from './config.js';

export function registerTools(server: McpServer) {
  // Search (workspace-scoped to what the integration can see)
  server.registerTool(
    'notion_search',
    {
      title: 'Search pages & databases',
      description: 'POST /v1/search over pages and databases shared with the integration.',
      inputSchema: SearchInput.shape
    },
    async (args) => {
      const result = await search(args);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  // Query a specific database
  server.registerTool(
    'notion_query_database',
    {
      title: 'Query database',
      description: 'Query a database by ID with filters/sorts/pagination.',
      inputSchema: QueryDatabaseInput.shape
    },
    async ({ databaseId, ...rest }) => {
      const result = await queryDatabase(databaseId, rest);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  // Create a page (row) in a database
  server.registerTool(
    'notion_create_page',
    {
      title: 'Create page in database',
      description: 'Create a new page (row) in the given database. You must share the DB with the integration.',
      inputSchema: CreatePageInput.shape
    },
    async ({ databaseId, titleProperty, title, properties, blocks }) => {
      const dbId = databaseId || CONFIG.defaults.databaseId;
      if (!dbId) throw new Error('databaseId not provided and NOTION_DEFAULT_DATABASE_ID is not set.');
      const page = await createPageInDatabase(dbId, titleProperty, title, properties, blocks) as any;
      return {
        content: [
          { type: 'text', text: `Created page ${page.id}` },
          { type: 'text', text: notionCanonicalPageUrl(page.id) }
        ]
      };
    }
  );

  // Update page properties
  server.registerTool(
    'notion_update_page',
    {
      title: 'Update page properties',
      description: 'PATCH /v1/pages/{pageId} with a properties object.',
      inputSchema: UpdatePageInput.shape
    },
    async ({ pageId, properties }) => {
      const result = await updatePageProperties(pageId, properties);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  // Append blocks to a page
  server.registerTool(
    'notion_append_blocks',
    {
      title: 'Append content blocks',
      description: 'Append paragraph/headings/bulleted/to-do blocks to a page.',
      inputSchema: AppendBlocksInput.shape
    },
    async ({ pageId, blocks }) => {
      const result = await appendBlocks(pageId, blocks);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  // Retrieve page (properties only)
  server.registerTool(
    'notion_retrieve_page',
    {
      title: 'Retrieve page (properties)',
      description: 'GET /v1/pages/{pageId}. Use list_block_children to fetch content.',
      inputSchema: RetrievePageInput.shape
    },
    async ({ pageId }) => {
      const result = await retrievePage(pageId);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  // List block children (page content)
  server.registerTool(
    'notion_list_block_children',
    {
      title: 'List block children',
      description: 'GET /v1/blocks/{blockId}/children to read page content.',
      inputSchema: ListBlockChildrenInput.shape
    },
    async ({ blockId, page_size, start_cursor }) => {
      const result = await listBlockChildren(blockId, { page_size, start_cursor });
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  // Archive (soft-delete) page
  server.registerTool(
    'notion_archive_page',
    {
      title: 'Archive (soft-delete) page',
      description: 'PATCH /v1/pages/{pageId} { archived: true } to move a page to trash.',
      inputSchema: ArchivePageInput.shape
    },
    async ({ pageId, archived }) => {
      const result = await archivePage(pageId, archived);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );
}
