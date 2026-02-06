import * as path from 'path';
import * as os from 'os';
import * as vscode from 'vscode';

export function expandPath(p: string): string {
    if (p.startsWith('~')) {
        return path.join(os.homedir(), p.slice(1));
    }
    return p;
}

export function getStorageDirRaw(): string {
    const config = vscode.workspace.getConfiguration('agentRecall');
    return config.get<string>('storageDir', '~/.agent-docs');
}

export function getStorageDir(): string {
    return expandPath(getStorageDirRaw());
}
