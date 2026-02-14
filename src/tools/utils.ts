import * as vscode from 'vscode';
import { expandPath } from '../core/utils';

export { expandPath };

export function getStorageDirRaw(): string {
    const config = vscode.workspace.getConfiguration('agentRecall');
    return config.get<string>('storageDir', '~/.agent-docs');
}

export function getStorageDir(): string {
    return expandPath(getStorageDirRaw());
}
