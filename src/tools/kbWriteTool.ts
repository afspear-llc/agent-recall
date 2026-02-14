import * as vscode from 'vscode';
import { getStorageDir } from './utils';
import { kbWrite, KBWriteParams } from '../core/operations';

export class KBWriteTool implements vscode.LanguageModelTool<KBWriteParams> {
    async invoke(
        options: vscode.LanguageModelToolInvocationOptions<KBWriteParams>,
        _token: vscode.CancellationToken
    ): Promise<vscode.LanguageModelToolResult> {
        try {
            const storageDir = getStorageDir();
            const result = await kbWrite(storageDir, {
                title: options.input?.title ?? '',
                content: options.input?.content ?? '',
                tags: options.input?.tags,
                directory: options.input?.directory
            });
            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(result)
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
        options: vscode.LanguageModelToolInvocationPrepareOptions<KBWriteParams>,
        _token: vscode.CancellationToken
    ): Promise<vscode.PreparedToolInvocation> {
        return {
            invocationMessage: `Saving "${options.input?.title ?? ''}" to knowledge base...`
        };
    }
}
