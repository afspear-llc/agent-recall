import * as vscode from 'vscode';
import { getStorageDir } from './utils';
import { kbRead, KBReadParams } from '../core/operations';

export class KBReadTool implements vscode.LanguageModelTool<KBReadParams> {
    async invoke(
        options: vscode.LanguageModelToolInvocationOptions<KBReadParams>,
        _token: vscode.CancellationToken
    ): Promise<vscode.LanguageModelToolResult> {
        try {
            const storageDir = getStorageDir();
            const result = await kbRead(storageDir, {
                query: options.input?.query ?? ''
            });
            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(result)
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
        options: vscode.LanguageModelToolInvocationPrepareOptions<KBReadParams>,
        _token: vscode.CancellationToken
    ): Promise<vscode.PreparedToolInvocation> {
        return {
            invocationMessage: `Searching knowledge base for "${options.input?.query ?? ''}"...`
        };
    }
}
