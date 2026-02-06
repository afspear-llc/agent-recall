import * as vscode from 'vscode';
import { promises as fs } from 'fs';
import * as path from 'path';
import { getStorageDir } from './utils';

// Hidden/internal directories and files to exclude from the tree
const HIDDEN_ENTRIES = new Set(['.instructions', '.obsidian', 'LIBRARIAN.md']);

export class KBListTool implements vscode.LanguageModelTool<Record<string, never>> {
    async invoke(
        _options: vscode.LanguageModelToolInvocationOptions<Record<string, never>>,
        _token: vscode.CancellationToken
    ): Promise<vscode.LanguageModelToolResult> {
        try {
            const storageDir = getStorageDir();
            const tree = await buildTree(storageDir, '');

            if (tree.length === 0) {
                return new vscode.LanguageModelToolResult([
                    new vscode.LanguageModelTextPart('Knowledge base is empty. No entries found.')
                ]);
            }

            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(tree.join('\n'))
            ]);
        } catch (error) {
            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(
                    `Error listing knowledge base: ${error instanceof Error ? error.message : String(error)}`
                )
            ]);
        }
    }

    async prepareInvocation(
        _options: vscode.LanguageModelToolInvocationPrepareOptions<Record<string, never>>,
        _token: vscode.CancellationToken
    ): Promise<vscode.PreparedToolInvocation> {
        return {
            invocationMessage: 'Listing knowledge base structure...'
        };
    }
}

async function buildTree(dir: string, prefix: string): Promise<string[]> {
    let entries: string[];
    try {
        entries = await fs.readdir(dir);
    } catch {
        return [];
    }

    // Filter out hidden/internal entries
    entries = entries.filter(e => !HIDDEN_ENTRIES.has(e) && !e.startsWith('.'));
    entries.sort();

    // Separate directories and files
    const dirs: string[] = [];
    const files: string[] = [];

    for (const entry of entries) {
        const fullPath = path.join(dir, entry);
        const stat = await fs.stat(fullPath);
        if (stat.isDirectory()) {
            dirs.push(entry);
        } else if (entry.endsWith('.md')) {
            files.push(entry);
        }
    }

    const items = [...dirs.map(d => ({ name: d, isDir: true })), ...files.map(f => ({ name: f, isDir: false }))];
    const lines: string[] = [];

    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const isLast = i === items.length - 1;
        const connector = isLast ? '└── ' : '├── ';
        const childPrefix = isLast ? '    ' : '│   ';

        if (item.isDir) {
            lines.push(`${prefix}${connector}${item.name}/`);
            const children = await buildTree(path.join(dir, item.name), prefix + childPrefix);
            lines.push(...children);
        } else {
            lines.push(`${prefix}${connector}${item.name}`);
        }
    }

    return lines;
}
