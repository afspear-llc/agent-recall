import * as vscode from 'vscode';
import { promises as fs } from 'fs';
import * as path from 'path';
import { getStorageDir } from './utils';

interface KBWriteInput {
    title: string;
    content: string;
    tags?: string[];
    directory?: string;
}

export class KBWriteTool implements vscode.LanguageModelTool<KBWriteInput> {
    async invoke(
        options: vscode.LanguageModelToolInvocationOptions<KBWriteInput>,
        _token: vscode.CancellationToken
    ): Promise<vscode.LanguageModelToolResult> {
        try {
            const storageDir = getStorageDir();
            const title = options.input?.title ?? '';
            const content = options.input?.content ?? '';
            const tags = options.input?.tags;
            const directory = options.input?.directory?.trim() || undefined;

            if (!title.trim() || !content.trim()) {
                return new vscode.LanguageModelToolResult([
                    new vscode.LanguageModelTextPart('Missing required parameters. Provide both a "title" and "content" to save an entry.')
                ]);
            }

            // Validate directory parameter if provided
            if (directory) {
                if (directory.includes('..')) {
                    return new vscode.LanguageModelToolResult([
                        new vscode.LanguageModelTextPart('Invalid directory: ".." traversal is not allowed.')
                    ]);
                }
                const dirParts = directory.split(/[/\\]/);
                if (dirParts.some(p => p.startsWith('.'))) {
                    return new vscode.LanguageModelToolResult([
                        new vscode.LanguageModelTextPart('Invalid directory: hidden directories (starting with ".") are not allowed.')
                    ]);
                }
            }

            // Resolve target directory
            const targetDir = directory
                ? path.join(storageDir, directory)
                : storageDir;

            // Verify target is within storageDir
            const resolvedDir = path.resolve(targetDir);
            if (!resolvedDir.startsWith(storageDir + path.sep) && resolvedDir !== storageDir) {
                return new vscode.LanguageModelToolResult([
                    new vscode.LanguageModelTextPart('Invalid directory: target is outside the knowledge base directory.')
                ]);
            }

            // Ensure directory exists
            await fs.mkdir(targetDir, { recursive: true });

            // Create filename from title (slug format)
            const slug = title
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-|-$/g, '');

            const filename = `${slug}.md`;
            const filePath = path.join(targetDir, filename);

            // Check if file already exists
            let exists = false;
            try {
                await fs.access(filePath);
                exists = true;
            } catch {
                // File doesn't exist
            }

            // Build frontmatter
            const timestamp = new Date().toISOString();
            const frontmatterLines = [
                '---',
                `title: "${title}"`,
                `created: ${timestamp}`,
                `updated: ${timestamp}`,
            ];
            if (tags && tags.length > 0) {
                frontmatterLines.push(`tags: [${tags.map(t => `"${t}"`).join(', ')}]`);
            }
            frontmatterLines.push('---', '');

            const fullContent = frontmatterLines.join('\n') + content;

            await fs.writeFile(filePath, fullContent, 'utf-8');

            const relativePath = directory ? path.join(directory, filename) : filename;
            const resultMessage = exists
                ? `Updated existing entry: ${relativePath}`
                : `Created new entry: ${relativePath}`;

            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(resultMessage)
            ]);
        } catch (error) {
            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(
                    `Error writing to knowledge base: ${error instanceof Error ? error.message : String(error)}`
                )
            ]);
        }
    }

    async prepareInvocation(
        options: vscode.LanguageModelToolInvocationPrepareOptions<KBWriteInput>,
        _token: vscode.CancellationToken
    ): Promise<vscode.PreparedToolInvocation> {
        return {
            invocationMessage: `Saving "${options.input?.title ?? ''}" to knowledge base...`
        };
    }
}
