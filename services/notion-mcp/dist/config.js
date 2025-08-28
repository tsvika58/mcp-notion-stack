import 'dotenv/config';
export const CONFIG = {
    transport: (process.env.TRANSPORT ?? 'http'),
    port: parseInt(process.env.PORT ?? '3030', 10),
    notion: {
        token: process.env.NOTION_TOKEN ?? '',
        version: process.env.NOTION_VERSION ?? '2022-06-28'
    },
    defaults: {
        databaseId: process.env.NOTION_DEFAULT_DATABASE_ID
    }
};
if (!CONFIG.notion.token) {
    console.warn('[WARN] NOTION_TOKEN is not set. The server will fail on first Notion call.');
}
