import { z } from 'zod';

// Minimal block schema to make appending content easy for LLMs
export const BlockSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('paragraph'), text: z.string() }),
  z.object({ type: z.literal('heading_1'), text: z.string() }),
  z.object({ type: z.literal('heading_2'), text: z.string() }),
  z.object({ type: z.literal('heading_3'), text: z.string() }),
  z.object({ type: z.literal('bulleted_list_item'), text: z.string() }),
  z.object({ type: z.literal('to_do'), text: z.string(), checked: z.boolean().optional() })
]);
export type BlockInput = z.infer<typeof BlockSchema>;

export const PropertiesPassthroughSchema = z.record(z.string(), z.unknown());

export const CreatePageInput = z.object({
  databaseId: z.string().optional(), // falls back to default
  titleProperty: z.string().default('Name'), // Notion DB title prop name
  title: z.string().min(1, 'title is required'),
  properties: PropertiesPassthroughSchema.optional(),
  blocks: z.array(BlockSchema).optional()
});
export type CreatePageInput = z.infer<typeof CreatePageInput>;

export const UpdatePageInput = z.object({
  pageId: z.string().min(1),
  properties: PropertiesPassthroughSchema
});
export type UpdatePageInput = z.infer<typeof UpdatePageInput>;

export const AppendBlocksInput = z.object({
  pageId: z.string().min(1),
  blocks: z.array(BlockSchema).min(1)
});
export type AppendBlocksInput = z.infer<typeof AppendBlocksInput>;

export const QueryDatabaseInput = z.object({
  databaseId: z.string().min(1),
  filter: z.record(z.string(), z.unknown()).optional(),
  sorts: z.array(z.record(z.string(), z.unknown())).optional(),
  page_size: z.number().int().min(1).max(100).optional(),
  start_cursor: z.string().optional()
});
export type QueryDatabaseInput = z.infer<typeof QueryDatabaseInput>;

export const SearchInput = z.object({
  query: z.string().default(''),
  filter: z.object({ value: z.enum(['page', 'database']), property: z.literal('object') }).optional(),
  sort: z.object({ direction: z.enum(['ascending', 'descending']), timestamp: z.enum(['last_edited_time']) }).optional(),
  page_size: z.number().int().min(1).max(100).optional(),
  start_cursor: z.string().optional()
});
export type SearchInput = z.infer<typeof SearchInput>;

export const RetrievePageInput = z.object({ pageId: z.string().min(1) });
export const ListBlockChildrenInput = z.object({ blockId: z.string().min(1), page_size: z.number().int().min(1).max(100).optional(), start_cursor: z.string().optional() });
export const ArchivePageInput = z.object({ pageId: z.string().min(1), archived: z.boolean().default(true) });
