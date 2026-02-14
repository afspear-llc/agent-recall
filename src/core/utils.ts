import * as path from 'path';
import * as os from 'os';
import { promises as fs } from 'fs';

/**
 * Expand a tilde-prefixed path to an absolute path.
 */
export function expandPath(p: string): string {
    if (p.startsWith('~')) {
        return path.join(os.homedir(), p.slice(1));
    }
    return p;
}

/**
 * Resolve the storage directory from an optional override or default.
 */
export function resolveStorageDir(storageDir?: string): string {
    return expandPath(storageDir ?? '~/.agent-docs');
}

/**
 * Recursively collect all .md files, skipping hidden directories.
 */
export async function collectMdFiles(
    dir: string,
    rootDir: string
): Promise<Array<{ absolute: string; relative: string }>> {
    let entries: string[];
    try {
        entries = await fs.readdir(dir);
    } catch {
        return [];
    }

    const results: Array<{ absolute: string; relative: string }> = [];

    for (const entry of entries) {
        if (entry.startsWith('.')) {
            continue;
        }

        const fullPath = path.join(dir, entry);
        const stat = await fs.stat(fullPath);

        if (stat.isDirectory()) {
            const children = await collectMdFiles(fullPath, rootDir);
            results.push(...children);
        } else if (entry.endsWith('.md')) {
            results.push({
                absolute: fullPath,
                relative: path.relative(rootDir, fullPath)
            });
        }
    }

    return results;
}

/** Hidden/internal entries to exclude from the directory tree. */
const HIDDEN_ENTRIES = new Set(['.instructions', '.obsidian', 'LIBRARIAN.md']);

/**
 * Build an ASCII directory tree of the knowledge base.
 */
export async function buildTree(dir: string, prefix: string): Promise<string[]> {
    let entries: string[];
    try {
        entries = await fs.readdir(dir);
    } catch {
        return [];
    }

    entries = entries.filter(e => !HIDDEN_ENTRIES.has(e) && !e.startsWith('.'));
    entries.sort();

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
