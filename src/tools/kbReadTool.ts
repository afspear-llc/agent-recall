import * as vscode from 'vscode';
import { promises as fs } from 'fs';
import * as path from 'path';
import { getStorageDir } from './utils';

interface KBReadInput {
    query: string;
}

export class KBReadTool implements vscode.LanguageModelTool<KBReadInput> {
    async invoke(
        options: vscode.LanguageModelToolInvocationOptions<KBReadInput>,
        token: vscode.CancellationToken
    ): Promise<vscode.LanguageModelToolResult> {
        try {
            const storageDir = getStorageDir();
            const query = options.input?.query ?? '';

            const mdFiles = await collectMdFiles(storageDir, storageDir);

            if (mdFiles.length === 0) {
                return new vscode.LanguageModelToolResult([
                    new vscode.LanguageModelTextPart('Knowledge base is empty. No entries found.')
                ]);
            }

            let topResults: Array<{ relativePath: string; content: string }>;

            if (!query.trim()) {
                // No query — return most recently modified entries
                const filesWithMtime: Array<{ relativePath: string; content: string; mtime: number }> = [];
                for (const file of mdFiles) {
                    if (token.isCancellationRequested) { break; }
                    const [content, stat] = await Promise.all([
                        fs.readFile(file.absolute, 'utf-8'),
                        fs.stat(file.absolute)
                    ]);
                    filesWithMtime.push({ relativePath: file.relative, content, mtime: stat.mtimeMs });
                }
                filesWithMtime.sort((a, b) => b.mtime - a.mtime);
                topResults = filesWithMtime.slice(0, 5);
            } else {
                // Keyword search with scoring
                const results: Array<{ relativePath: string; content: string; score: number }> = [];
                const keywords = query.toLowerCase().split(/\s+/).filter(k => k.length > 0);

                for (const file of mdFiles) {
                    if (token.isCancellationRequested) { break; }

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
                    return new vscode.LanguageModelToolResult([
                        new vscode.LanguageModelTextPart(
                            `No entries found matching "${query}". Try different keywords or use #kbList to see available topics.`
                        )
                    ]);
                }

                results.sort((a, b) => b.score - a.score);
                topResults = results.slice(0, 3);
            }

            const totalFound = query.trim() ? topResults.length : mdFiles.length;
            const output = topResults.map(r => `## ${r.relativePath}\n\n${r.content}\n\n---\n`).join('\n');

            const header = query.trim()
                ? `Found ${totalFound} matching entries. Showing top ${topResults.length}:`
                : `Showing ${topResults.length} most recent entries (${totalFound} total). Use a query for targeted search.`;

            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(`${header}\n\n${output}`)
            ]);
        } catch (error) {
            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(
                    `Error reading knowledge base: ${error instanceof Error ? error.message : String(error)}`
                )
            ]);
        }
    }

    async prepareInvocation(
        options: vscode.LanguageModelToolInvocationPrepareOptions<KBReadInput>,
        _token: vscode.CancellationToken
    ): Promise<vscode.PreparedToolInvocation> {
        return {
            invocationMessage: `Searching knowledge base for "${options.input?.query ?? ''}"...`
        };
    }
}

/** Recursively collect all .md files, skipping hidden directories */
async function collectMdFiles(
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
        // Skip hidden entries
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
