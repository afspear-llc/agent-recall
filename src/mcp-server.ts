#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { promises as fs } from 'fs';
import * as path from 'path';
import { resolveStorageDir } from './core/utils';
import { kbRead, kbWrite, kbList, kbDelete } from './core/operations';
import { DEFAULT_LIBRARIAN_MD } from './defaults/librarianTemplate';

// ── Parse CLI args ──────────────────────────────────────────────────────────

function parseArgs(): { storageDir: string } {
    const args = process.argv.slice(2);
    let storageDir: string | undefined;

    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--storage-dir' && i + 1 < args.length) {
            storageDir = args[++i];
        }
    }

    // Also check environment variable
    if (!storageDir) {
        storageDir = process.env.AGENT_RECALL_STORAGE_DIR;
    }

    return { storageDir: resolveStorageDir(storageDir) };
}

// ── Initialize storage ──────────────────────────────────────────────────────

async function initializeStorage(storageDir: string): Promise<void> {
    await fs.mkdir(storageDir, { recursive: true });

    const librarianPath = path.join(storageDir, 'LIBRARIAN.md');
    try {
        await fs.access(librarianPath);
    } catch {
        // Only write LIBRARIAN.md if it doesn't already exist
        await fs.writeFile(librarianPath, DEFAULT_LIBRARIAN_MD, 'utf-8');
    }
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
    const { storageDir } = parseArgs();

    await initializeStorage(storageDir);

    const server = new McpServer({
        name: 'agent-recall',
        version: '0.3.0',
    });

    // ── kbRead ──────────────────────────────────────────────────────────

    server.tool(
        'kbRead',
        'Search saved entries by keyword from your persistent memory (default: ~/.agent-docs/). ' +
        'Pass keywords in the query parameter to search (e.g. query: "ui design"). ' +
        'When a topic in your memory (kbList) is relevant, use this to recall the full details. ' +
        'Always check your memory before searching the codebase.',
        { query: z.string().describe('Search terms to look up in your memory, e.g. "ui design" or "workflow"') },
        async ({ query }) => {
            try {
                const result = await kbRead(storageDir, { query });
                return { content: [{ type: 'text' as const, text: result }] };
            } catch (error) {
                return {
                    content: [{ type: 'text' as const, text: `Error reading knowledge base: ${error instanceof Error ? error.message : String(error)}` }],
                    isError: true,
                };
            }
        }
    );

    // ── kbWrite ─────────────────────────────────────────────────────────

    server.tool(
        'kbWrite',
        'Save something to your persistent memory (default: ~/.agent-docs/). ' +
        'Use this when you learn something worth remembering — decisions, preferences, patterns, solutions, conventions — ' +
        'so you can recall it in future sessions. ' +
        'Use the optional directory parameter to organize entries into subdirectories.',
        {
            title: z.string().describe('Title for the knowledge base entry'),
            content: z.string().describe('The content to save'),
            tags: z.array(z.string()).optional().describe('Optional tags for categorization'),
            directory: z.string().optional().describe(
                'Optional subdirectory within the knowledge base to place the entry. ' +
                'e.g. "my-project" or "frontend/patterns". Created automatically if it doesn\'t exist.'
            ),
        },
        async ({ title, content, tags, directory }) => {
            try {
                const result = await kbWrite(storageDir, { title, content, tags, directory });
                return { content: [{ type: 'text' as const, text: result }] };
            } catch (error) {
                return {
                    content: [{ type: 'text' as const, text: `Error writing to knowledge base: ${error instanceof Error ? error.message : String(error)}` }],
                    isError: true,
                };
            }
        }
    );

    // ── kbList ──────────────────────────────────────────────────────────

    server.tool(
        'kbList',
        'Recall what you know. Returns the topics and subjects stored in your persistent memory (default: ~/.agent-docs/). ' +
        'Use this at the start of every conversation to remember what you know, ' +
        'and before answering any question where you might have relevant saved context. This is cheap — use it freely.',
        {},
        async () => {
            try {
                const result = await kbList(storageDir);
                return { content: [{ type: 'text' as const, text: result }] };
            } catch (error) {
                return {
                    content: [{ type: 'text' as const, text: `Error listing knowledge base: ${error instanceof Error ? error.message : String(error)}` }],
                    isError: true,
                };
            }
        }
    );

    // ── kbDelete ────────────────────────────────────────────────────────

    server.tool(
        'kbDelete',
        'Remove an entry from your persistent memory (default: ~/.agent-docs/). ' +
        'Use this when consolidating, cleaning up, or removing outdated entries. ' +
        'Pass the relative file path (e.g. "old-notes.md" or "subdir/file.md") — use kbList first to see exact paths.',
        {
            relativePath: z.string().describe(
                'Path of the file to delete, relative to the knowledge base directory. e.g. "old-notes.md" or "subdir/file.md"'
            ),
        },
        async ({ relativePath }) => {
            try {
                const result = await kbDelete(storageDir, { relativePath });
                return { content: [{ type: 'text' as const, text: result }] };
            } catch (error) {
                return {
                    content: [{ type: 'text' as const, text: `Error deleting from knowledge base: ${error instanceof Error ? error.message : String(error)}` }],
                    isError: true,
                };
            }
        }
    );

    // ── Connect stdio transport ─────────────────────────────────────────

    const transport = new StdioServerTransport();
    await server.connect(transport);
}

main().catch((error) => {
    console.error('Fatal error in MCP server:', error);
    process.exit(1);
});
