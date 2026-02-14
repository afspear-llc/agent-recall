import * as vscode from 'vscode';
import { getStorageDir } from './utils';
import { kbDelete, KBDeleteParams } from '../core/operations';

export class KBDeleteTool implements vscode.LanguageModelTool<KBDeleteParams> {
    async invoke(
        options: vscode.LanguageModelToolInvocationOptions<KBDeleteParams>,
        _token: vscode.CancellationToken
    ): Promise<vscode.LanguageModelToolResult> {
        try {
            const storageDir = getStorageDir();
            const result = await kbDelete(storageDir, {
                relativePath: options.input?.relativePath ?? ''
            });
            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(result)
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
        options: vscode.LanguageModelToolInvocationPrepareOptions<KBDeleteParams>,
        _token: vscode.CancellationToken
    ): Promise<vscode.PreparedToolInvocation> {
        return {
            invocationMessage: `Deleting "${options.input?.relativePath ?? ''}" from knowledge base...`
        };
    }
}
