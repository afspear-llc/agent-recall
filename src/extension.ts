import * as vscode from 'vscode';
import * as path from 'path';
import { promises as fs } from 'fs';
import { KBReadTool } from './tools/kbReadTool';
import { KBWriteTool } from './tools/kbWriteTool';
import { KBListTool } from './tools/kbListTool';
import { KBDeleteTool } from './tools/kbDeleteTool';
import { getStorageDir, getStorageDirRaw } from './tools/utils';
import { DEFAULT_LIBRARIAN_MD } from './defaults/librarianTemplate';
import { DEFAULT_INSTRUCTIONS_MD } from './defaults/instructionsTemplate';

const INSTRUCTIONS_DIR = '.instructions';
const INSTRUCTIONS_FILENAME = 'agent-recall.instructions.md';

export function activate(context: vscode.ExtensionContext) {
    const storageDir = getStorageDir();

    // Initialize storage directory and default files
    initializeStorage(storageDir).catch(err => {
        console.error('Agent Recall: Failed to initialize storage:', err);
    });

    // Configure chat.instructionsFilesLocations to include our instructions folder
    configureInstructionsLocation(storageDir).catch(err => {
        console.error('Agent Recall: Failed to configure instructions location:', err);
    });

    // Register tools
    context.subscriptions.push(
        vscode.lm.registerTool('agent-recall_read', new KBReadTool()),
        vscode.lm.registerTool('agent-recall_write', new KBWriteTool()),
        vscode.lm.registerTool('agent-recall_list', new KBListTool()),
        vscode.lm.registerTool('agent-recall_delete', new KBDeleteTool())
    );

    console.log('Agent Recall extension activated');
}

async function initializeStorage(storageDir: string): Promise<void> {
    await fs.mkdir(storageDir, { recursive: true });

    // Deploy managed files (always overwrite — these are extension-managed)
    const librarianPath = path.join(storageDir, 'LIBRARIAN.md');
    await fs.writeFile(librarianPath, DEFAULT_LIBRARIAN_MD, 'utf-8');

    const instructionsDir = path.join(storageDir, INSTRUCTIONS_DIR);
    await fs.mkdir(instructionsDir, { recursive: true });

    const instructionsPath = path.join(instructionsDir, INSTRUCTIONS_FILENAME);
    await fs.writeFile(instructionsPath, DEFAULT_INSTRUCTIONS_MD, 'utf-8');
}

async function configureInstructionsLocation(storageDir: string): Promise<void> {
    // Use the tilde-prefixed path — VS Code requires ~/... format, not absolute paths
    const rawDir = getStorageDirRaw();
    const tildeInstructionsDir = rawDir.endsWith('/')
        ? `${rawDir}${INSTRUCTIONS_DIR}`
        : `${rawDir}/${INSTRUCTIONS_DIR}`;

    const config = vscode.workspace.getConfiguration('chat');
    const current = config.get<Record<string, boolean>>('instructionsFilesLocations') ?? {};

    // Check if our instructions folder is already registered
    if (current[tildeInstructionsDir] === true) {
        return;
    }

    // Clean up any previously written absolute path entries
    const resolvedDir = path.join(storageDir, INSTRUCTIONS_DIR);
    const cleaned: Record<string, boolean> = {};
    for (const [key, value] of Object.entries(current)) {
        if (key !== resolvedDir) {
            cleaned[key] = value;
        }
    }

    // Add our instructions folder with tilde-prefixed path
    cleaned[tildeInstructionsDir] = true;
    await config.update('instructionsFilesLocations', cleaned, vscode.ConfigurationTarget.Global);
    console.log(`Agent Recall: Registered instructions location: ${tildeInstructionsDir}`);
}

export function deactivate() {}
