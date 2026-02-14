import { promises as fs } from 'fs';
import * as path from 'path';
import { collectMdFiles, buildTree } from './utils';

// ── Read ────────────────────────────────────────────────────────────────────

export interface KBReadParams {
    query: string;
}

export async function kbRead(storageDir: string, params: KBReadParams): Promise<string> {
    const query = params.query ?? '';
    const mdFiles = await collectMdFiles(storageDir, storageDir);

    if (mdFiles.length === 0) {
        return 'Knowledge base is empty. No entries found.';
    }

    let topResults: Array<{ relativePath: string; content: string }>;

    if (!query.trim()) {
        const filesWithMtime: Array<{ relativePath: string; content: string; mtime: number }> = [];
        for (const file of mdFiles) {
            const [content, stat] = await Promise.all([
                fs.readFile(file.absolute, 'utf-8'),
                fs.stat(file.absolute)
            ]);
            filesWithMtime.push({ relativePath: file.relative, content, mtime: stat.mtimeMs });
        }
        filesWithMtime.sort((a, b) => b.mtime - a.mtime);
        topResults = filesWithMtime.slice(0, 5);
    } else {
        const results: Array<{ relativePath: string; content: string; score: number }> = [];
        const keywords = query.toLowerCase().split(/\s+/).filter(k => k.length > 0);

        for (const file of mdFiles) {
            const content = await fs.readFile(file.absolute, 'utf-8');
            const contentLower = content.toLowerCase();
            const pathLower = file.relative.toLowerCase();

            let score = 0;
            for (const keyword of keywords) {
                const contentMatches = contentLower.split(keyword).length - 1;
                score += contentMatches;
                if (pathLower.includes(keyword)) {
                    score += 3;
                }
            }

            if (score > 0) {
                results.push({ relativePath: file.relative, content, score });
            }
        }

        if (results.length === 0) {
            return `No entries found matching "${query}". Try different keywords or use kbList to see available topics.`;
        }

        results.sort((a, b) => b.score - a.score);
        topResults = results.slice(0, 3);
    }

    const totalFound = query.trim() ? topResults.length : mdFiles.length;
    const output = topResults.map(r => `## ${r.relativePath}\n\n${r.content}\n\n---\n`).join('\n');

    const header = query.trim()
        ? `Found ${totalFound} matching entries. Showing top ${topResults.length}:`
        : `Showing ${topResults.length} most recent entries (${totalFound} total). Use a query for targeted search.`;

    return `${header}\n\n${output}`;
}

// ── Write ───────────────────────────────────────────────────────────────────

export interface KBWriteParams {
    title: string;
    content: string;
    tags?: string[];
    directory?: string;
}

export async function kbWrite(storageDir: string, params: KBWriteParams): Promise<string> {
    const title = params.title ?? '';
    const content = params.content ?? '';
    const tags = params.tags;
    const directory = params.directory?.trim() || undefined;

    if (!title.trim() || !content.trim()) {
        return 'Missing required parameters. Provide both a "title" and "content" to save an entry.';
    }

    if (directory) {
        if (directory.includes('..')) {
            return 'Invalid directory: ".." traversal is not allowed.';
        }
        const dirParts = directory.split(/[/\\]/);
        if (dirParts.some(p => p.startsWith('.'))) {
            return 'Invalid directory: hidden directories (starting with ".") are not allowed.';
        }
    }

    const targetDir = directory
        ? path.join(storageDir, directory)
        : storageDir;

    const resolvedDir = path.resolve(targetDir);
    if (!resolvedDir.startsWith(storageDir + path.sep) && resolvedDir !== storageDir) {
        return 'Invalid directory: target is outside the knowledge base directory.';
    }

    await fs.mkdir(targetDir, { recursive: true });

    let slug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

    if (!slug) {
        slug = `entry-${Date.now()}`;
    }

    const filename = `${slug}.md`;
    const filePath = path.join(targetDir, filename);

    let exists = false;
    try {
        await fs.access(filePath);
        exists = true;
    } catch {
        // File doesn't exist
    }

    const timestamp = new Date().toISOString();
    const escapedTitle = title.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    const frontmatterLines = [
        '---',
        `title: "${escapedTitle}"`,
        `created: ${timestamp}`,
        `updated: ${timestamp}`,
    ];
    if (tags && tags.length > 0) {
        const escapedTags = tags.map(t => `"${t.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`);
        frontmatterLines.push(`tags: [${escapedTags.join(', ')}]`);
    }
    frontmatterLines.push('---', '');

    const fullContent = frontmatterLines.join('\n') + content;
    await fs.writeFile(filePath, fullContent, 'utf-8');

    const relativePath = directory ? path.join(directory, filename) : filename;
    return exists
        ? `Updated existing entry: ${relativePath}`
        : `Created new entry: ${relativePath}`;
}

// ── List ────────────────────────────────────────────────────────────────────

export async function kbList(storageDir: string): Promise<string> {
    const tree = await buildTree(storageDir, '');

    if (tree.length === 0) {
        return 'Knowledge base is empty. No entries found.';
    }

    return tree.join('\n');
}

// ── Delete ──────────────────────────────────────────────────────────────────

export interface KBDeleteParams {
    relativePath: string;
}

export async function kbDelete(storageDir: string, params: KBDeleteParams): Promise<string> {
    const relativePath = params.relativePath ?? '';

    if (!relativePath.trim()) {
        return 'Missing required parameter "relativePath". Provide the path of the file to delete, e.g. "old-notes.md" or "subdir/file.md".';
    }

    if (relativePath.includes('..')) {
        return 'Invalid path: ".." traversal is not allowed.';
    }

    const parts = relativePath.split(/[/\\]/);
    if (parts.some(p => p.startsWith('.'))) {
        return 'Cannot delete hidden files or files in hidden directories.';
    }

    const resolved = path.resolve(storageDir, relativePath);
    if (!resolved.startsWith(storageDir + path.sep)) {
        return 'Invalid path: target is outside the knowledge base directory.';
    }

    if (path.basename(resolved) === 'LIBRARIAN.md' && path.dirname(resolved) === storageDir) {
        return 'Cannot delete LIBRARIAN.md — it contains organizational guidelines for the knowledge base.';
    }

    try {
        const stat = await fs.stat(resolved);
        if (!stat.isFile()) {
            return `"${relativePath}" is not a file. Only files can be deleted.`;
        }
    } catch {
        return `File not found: "${relativePath}". Use kbList to see available entries.`;
    }

    await fs.unlink(resolved);

    // Clean up empty parent directories
    let parent = path.dirname(resolved);
    while (parent !== storageDir && parent.startsWith(storageDir)) {
        const contents = await fs.readdir(parent);
        if (contents.length === 0) {
            try {
                await fs.rmdir(parent);
                parent = path.dirname(parent);
            } catch {
                break;
            }
        } else {
            break;
        }
    }

    return `Deleted: ${relativePath}`;
}
