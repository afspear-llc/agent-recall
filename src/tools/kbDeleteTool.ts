import * as vscode from 'vscode';
import { promises as fs } from 'fs';
import * as path from 'path';
import { getStorageDir } from './utils';

interface KBDeleteInput {
    relativePath: string;
}

export class KBDeleteTool implements vscode.LanguageModelTool<KBDeleteInput> {
    async invoke(
        options: vscode.LanguageModelToolInvocationOptions<KBDeleteInput>,
        _token: vscode.CancellationToken
    ): Promise<vscode.LanguageModelToolResult> {
        try {
            const storageDir = getStorageDir();
            const relativePath = options.input?.relativePath ?? '';

            if (!relativePath.trim()) {
                return new vscode.LanguageModelToolResult([
                    new vscode.LanguageModelTextPart(
                        'Missing required parameter "relativePath". Provide the path of the file to delete, e.g. "old-notes.md" or "subdir/file.md".'
                    )
                ]);
            }

            // Block path traversal
            if (relativePath.includes('..')) {
                return new vscode.LanguageModelToolResult([
                    new vscode.LanguageModelTextPart('Invalid path: ".." traversal is not allowed.')
                ]);
            }

            // Block hidden files/directories
            const parts = relativePath.split(/[/\\]/);
            if (parts.some(p => p.startsWith('.'))) {
                return new vscode.LanguageModelToolResult([
                    new vscode.LanguageModelTextPart('Cannot delete hidden files or files in hidden directories.')
                ]);
            }

            // Resolve and verify target is within storageDir
            const resolved = path.resolve(storageDir, relativePath);
            if (!resolved.startsWith(storageDir + path.sep)) {
                return new vscode.LanguageModelToolResult([
                    new vscode.LanguageModelTextPart('Invalid path: target is outside the knowledge base directory.')
                ]);
            }

            // Protect LIBRARIAN.md at root
            if (path.basename(resolved) === 'LIBRARIAN.md' && path.dirname(resolved) === storageDir) {
                return new vscode.LanguageModelToolResult([
                    new vscode.LanguageModelTextPart(
                        'Cannot delete LIBRARIAN.md — it contains organizational guidelines for the knowledge base.'
                    )
                ]);
            }

            // Check file exists and is a file
            try {
                const stat = await fs.stat(resolved);
                if (!stat.isFile()) {
                    return new vscode.LanguageModelToolResult([
                        new vscode.LanguageModelTextPart(`"${relativePath}" is not a file. Only files can be deleted.`)
                    ]);
                }
            } catch {
                return new vscode.LanguageModelToolResult([
                    new vscode.LanguageModelTextPart(
                        `File not found: "${relativePath}". Use #kbList to see available entries.`
                    )
                ]);
            }

            // Delete the file
            await fs.unlink(resolved);

            // Clean up empty parent directories (never delete storageDir itself)
            let parent = path.dirname(resolved);
            while (parent !== storageDir && parent.startsWith(storageDir)) {
                const contents = await fs.readdir(parent);
                if (contents.length === 0) {
                    try {
                        await fs.rmdir(parent);
                        parent = path.dirname(parent);
                    } catch (err) {
                        // Directory may no longer be empty (race condition)
                        break;
                    }
                } else {
                    break;
                }
            }

            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(`Deleted: ${relativePath}`)
            ]);
        } catch (error) {
            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(
                    `Error deleting from knowledge base: ${error instanceof Error ? error.message : String(error)}`
                )
            ]);
        }
    }

    async prepareInvocation(
        options: vscode.LanguageModelToolInvocationPrepareOptions<KBDeleteInput>,
        _token: vscode.CancellationToken
    ): Promise<vscode.PreparedToolInvocation> {
        return {
            invocationMessage: `Deleting "${options.input?.relativePath ?? ''}" from knowledge base...`
        };
    }
}
