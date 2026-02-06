# Agent Recall

Persistent, cross-project memory for VS Code AI assistants. Save decisions, preferences, and context once — recall them in any project, any session.

## Why?

AI assistants in VS Code forget everything when you close a chat session. Agent Recall fixes that by providing four tools to read, write, list, and delete knowledge base entries stored as markdown files on disk (`~/.agent-docs/`). Your knowledge persists across projects and sessions.

Works with any VS Code Language Model provider that supports tool calling — GitHub Copilot, Cline, Roo Code, and more.

## Features

| Tool | Reference | Description |
|------|-----------|-------------|
| **Knowledge Base Read** | `#kbRead` | Search saved entries by keyword |
| **Knowledge Base Write** | `#kbWrite` | Save new information with title, content, optional tags, and optional subdirectory |
| **Knowledge Base List** | `#kbList` | List all stored entries as a directory tree |
| **Knowledge Base Delete** | `#kbDelete` | Remove an entry by file path |

All tools are available directly in VS Code Chat and can be referenced in prompts with `#kbRead`, `#kbWrite`, `#kbList`, and `#kbDelete`.

The extension automatically configures [custom instructions](https://code.visualstudio.com/docs/copilot/customization/custom-instructions) that are loaded into every chat conversation. These instructions tell your AI assistant to use the knowledge base tools proactively — checking for saved context before asking questions, and saving new learnings automatically. No per-project configuration needed.

## Getting Started

### Install

From the VS Code Marketplace, search for **Agent Recall**.

Or install manually:

```bash
code --install-extension agent-recall-0.3.0.vsix
```

### First Use

1. Open **Chat** in any project (e.g. Copilot Chat, Cline, or any LM provider with tool support)
2. Ask the assistant to save something:
   > "Remember that we use 2-space indentation for TypeScript in this org"
3. On the tool confirmation dialog, select **Always Allow** (one-time per tool)
4. The entry is saved to `~/.agent-docs/` as a markdown file

### Recall Later

In any project, any session:
> "What indentation convention do we use?"

Your assistant will search the knowledge base and find the saved entry.

## Usage Examples

**Save an architectural decision:**
> "Save to the knowledge base: We chose PostgreSQL over MongoDB for the billing service because we need strong transactional guarantees"

**Save a debugging pattern:**
> "Remember this: When the API returns 403 on staging, it's usually because the service account token expired. Regenerate it in the GCP console."

**Save user preferences:**
> "Add to the KB that I prefer functional React components with hooks, no class components"

**Browse stored knowledge:**
> "What's in the knowledge base?"

**Search for specific info:**
> "Search the knowledge base for deployment procedures"

## How It Works

Agent Recall registers four [Language Model Tools](https://code.visualstudio.com/api/extension-guides/language-model-tool) via the VS Code Language Model API:

1. **Write** creates a markdown file in `~/.agent-docs/` with YAML frontmatter (title, timestamps, tags) and your content. An optional `directory` parameter places entries in subdirectories for organization.
2. **Read** performs keyword search across all entries, scoring by frequency and filename matches, returning the top 3 results
3. **List** returns a directory tree of all stored entries
4. **Delete** removes an entry by relative file path and cleans up empty parent directories

All entries are plain markdown files — you can edit, version control, or share them however you like.

### Instructions File

On activation, the extension writes an instructions file to `~/.agent-docs/.instructions/agent-recall.instructions.md` and registers the folder in VS Code's `chat.instructionsFilesLocations` setting at the user (global) level. This means the instructions are loaded into **every chat conversation**, in every workspace, automatically.

The instructions tell your AI assistant to:
- Always use `#kbRead`, `#kbWrite`, `#kbList`, and `#kbDelete` for knowledge base access (never read the files directly)
- Check the knowledge base before asking the user for previously stored information
- **Read LIBRARIAN.md before every write** to follow organizational guidelines
- Proactively save new decisions, preferences, and patterns
- Prefer knowledge base content over model training data

> **Note:** This file is managed by the extension and overwritten on each activation. Do not customize it directly — your edits will be lost on reload.

### LIBRARIAN.md

On activation, the extension writes a `LIBRARIAN.md` file in your storage directory. This file defines how the assistant should organize, categorize, and format knowledge base entries — acting as a style guide for your library.

The instructions template tells the assistant to read LIBRARIAN.md (via `#kbRead`) before every write, so it loads the guidelines at the right time — before deciding how to name and organize new entries.

> **Note:** This file is managed by the extension and overwritten on each activation. Do not customize it directly — your edits will be lost on reload.

## File Structure

### Extension files (installed with the VSIX)

```
agent-recall/
├── package.json                     # Tool declarations, extension metadata
├── out/
│   ├── extension.js                 # Activation: initializes storage, configures instructions, registers tools
│   ├── defaults/
│   │   ├── librarianTemplate.js     # Default LIBRARIAN.md content
│   │   └── instructionsTemplate.js  # Default instructions file content
│   └── tools/
│       ├── kbReadTool.js            # Keyword search across all .md entries
│       ├── kbWriteTool.js           # Creates/updates .md files with YAML frontmatter
│       ├── kbListTool.js            # Lists all entries as a directory tree
│       ├── kbDeleteTool.js          # Deletes entries and cleans up empty directories
│       └── utils.js                 # Shared helpers (path expansion, config reading)
```

- **`package.json`** — Declares the four Language Model Tools (`kbRead`, `kbWrite`, `kbList`, `kbDelete`) with `modelDescription` fields that tell the AI assistant when and how to use each tool.
- **`extension.js`** — On activation: creates the storage directory, deploys `LIBRARIAN.md` and instructions file (always overwritten), registers the instructions folder in `chat.instructionsFilesLocations`, and registers the four tools.

### Runtime files (created automatically)

```
~/.agent-docs/                       # Default location, configurable
├── LIBRARIAN.md                     # Organizational guidelines (managed by extension)
├── .instructions/
│   └── agent-recall.instructions.md # Chat instructions (managed by extension)
├── typescript-indentation.md        # Example entry
├── billing-service-database.md      # Example entry
└── ...                              # One .md file per knowledge base entry
```

- The storage directory is created on first activation. `LIBRARIAN.md` and the instructions file are overwritten on every activation (they are extension-managed).
- Each entry is a standalone markdown file with YAML frontmatter (`title`, `created`, `updated`, `tags`).
- Filenames are slugified from the entry title (e.g., "TypeScript Indentation" becomes `typescript-indentation.md`).
- Entries can be organized into subdirectories using the `directory` parameter on `#kbWrite`.
- Your knowledge base entries are yours — edit, delete, or version control them however you like. Only `LIBRARIAN.md` and the instructions file are managed by the extension.

> **Tip:** `git init ~/.agent-docs` — because nothing says "I told you so" like `git revert` after an AI confidently "tidies up" your knowledge base.

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `agentRecall.storageDir` | `~/.agent-docs` | Directory where knowledge base files are stored |

The extension also adds an entry to `chat.instructionsFilesLocations` in your user settings (the tilde-prefixed path to `~/.agent-docs/.instructions`). This is set once on first activation and can be removed manually if desired.

## Compatibility

Agent Recall uses the [VS Code Language Model Tools API](https://code.visualstudio.com/api/extension-guides/ai/tools), which is supported by any Language Model provider that implements tool calling:

- **GitHub Copilot** — full support in Agent mode
- **Cline** — via VS Code Language Model API
- **Roo Code** — via VS Code Language Model API
- **Any BYOK provider** — via VS Code's [Bring Your Own Key](https://code.visualstudio.com/blogs/2025/10/22/bring-your-own-key) feature

## Requirements

- VS Code 1.95.0 or later
- A Language Model provider with tool calling support (e.g. GitHub Copilot, Cline, Roo Code)

## Known Limitations

- Search is keyword-based (no fuzzy matching yet)
- No built-in conflict resolution for concurrent writes
- Maximum of 3 search results returned per query
- `LIBRARIAN.md` and instructions file cannot be customized (overwritten on each activation)

## License

MIT
