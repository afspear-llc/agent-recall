import * as vscode from 'vscode';
import { getStorageDir } from './utils';
import { kbList } from '../core/operations';

export class KBListTool implements vscode.LanguageModelTool<Record<string, never>> {
    async invoke(
        _options: vscode.LanguageModelToolInvocationOptions<Record<string, never>>,
        _token: vscode.CancellationToken
    ): Promise<vscode.LanguageModelToolResult> {
        try {
            const storageDir = getStorageDir();
            const result = await kbList(storageDir);
            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(result)
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
