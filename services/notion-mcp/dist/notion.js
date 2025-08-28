import fetch from 'node-fetch';
import pRetry from 'p-retry';
import { CONFIG } from './config.js';
const BASE = 'https://api.notion.com/v1';
function authHeaders() {
    return {
        'Authorization': `Bearer ${CONFIG.notion.token}`,
        'Notion-Version': CONFIG.notion.version,
        'Content-Type': 'application/json'
    };
}
async function request(path, init = {}) {
    const doFetch = async () => {
        const res = await fetch(`${BASE}${path}`, { ...init, headers: { ...authHeaders(), ...(init.headers || {}) } });
        if (res.status === 429) {
            const retryAfter = Number(res.headers.get('retry-after') || '1');
            const err = new Error('Rate limited');
            err.retryAfter = retryAfter;
            err.code = 429;
            throw err;
        }
        if (!res.ok) {
            const text = await res.text();
            throw new Error(`Notion API ${res.status}: ${text}`);
        }
        return res.json();
    };
    return pRetry(doFetch, {
        retries: 5,
        onFailedAttempt: (e) => {
            // Respect Retry-After for 429s; otherwise exponential backoff
            const any = e;
            if (any.code === 429 && any.retryAfter) {
                e.delay = any.retryAfter * 1000;
            }
        }
    });
}
// --- Minimal helpers ---
export async function search(body) {
    return request('/search', { method: 'POST', body: JSON.stringify(body) });
}
export async function queryDatabase(databaseId, body) {
    return request(`/databases/${databaseId}/query`, { method: 'POST', body: JSON.stringify(body) });
}
export async function createPageInDatabase(databaseId, titleProp, title, properties, blocks) {
    const children = blocks ? buildBlocks(blocks) : undefined;
    const body = {
        parent: { database_id: databaseId },
        properties: {
            [titleProp]: { title: [{ type: 'text', text: { content: title } }] },
            ...(properties || {})
        },
        ...(children ? { children } : {})
    };
    return request('/pages', { method: 'POST', body: JSON.stringify(body) });
}
export async function updatePageProperties(pageId, properties) {
    return request(`/pages/${pageId}`, { method: 'PATCH', body: JSON.stringify({ properties }) });
}
export async function appendBlocks(pageId, blocks) {
    const children = buildBlocks(blocks);
    return request(`/blocks/${pageId}/children`, { method: 'PATCH', body: JSON.stringify({ children }) });
}
export async function retrievePage(pageId) {
    return request(`/pages/${pageId}`, { method: 'GET' });
}
export async function listBlockChildren(blockId, opts) {
    const params = new URLSearchParams();
    if (opts?.page_size)
        params.set('page_size', String(opts.page_size));
    if (opts?.start_cursor)
        params.set('start_cursor', opts.start_cursor);
    const qs = params.toString();
    return request(`/blocks/${blockId}/children${qs ? `?${qs}` : ''}`, { method: 'GET' });
}
export async function archivePage(pageId, archived = true) {
    // Notion "deletes" by setting archived: true on the page
    return request(`/pages/${pageId}`, { method: 'PATCH', body: JSON.stringify({ archived }) });
}
// --- Block builder ---
function textBlock(text) {
    return [{ type: 'text', text: { content: text } }];
}
export function buildBlocks(blocks) {
    return blocks.map((b) => {
        switch (b.type) {
            case 'paragraph':
                return { type: 'paragraph', paragraph: { rich_text: textBlock(b.text) } };
            case 'heading_1':
            case 'heading_2':
            case 'heading_3': {
                return { type: b.type, [b.type]: { rich_text: textBlock(b.text), is_toggleable: false } };
            }
            case 'bulleted_list_item':
                return { type: 'bulleted_list_item', bulleted_list_item: { rich_text: textBlock(b.text) } };
            case 'to_do':
                return { type: 'to_do', to_do: { rich_text: textBlock(b.text), checked: !!b.checked } };
            default:
                throw new Error(`Unsupported block type: ${b.type}`);
        }
    });
}
export function notionCanonicalPageUrl(pageId) {
    // Convenience URL (may not be accessible unless shared). Remove hyphens per Notion canonical URLs
    const clean = pageId.replaceAll('-', '');
    return `https://www.notion.so/${clean}`;
}
