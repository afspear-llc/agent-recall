# Agent Recall

Persistent, cross-project memory for AI assistants. Save decisions, preferences, and context once — recall them in any project, any session.

Works as a **VS Code extension** and as a standalone **MCP server** for any MCP-compatible client.

## Why?

AI assistants forget everything when you close a session. Agent Recall fixes that by providing four tools to read, write, list, and delete knowledge base entries stored as markdown files on disk (`~/.agent-docs/`). Your knowledge persists across projects and sessions.

**VS Code:** Works with any Language Model provider that supports tool calling — GitHub Copilot, Cline, Roo Code, and more.

**MCP:** Works with any client that supports the [Model Context Protocol](https://modelcontextprotocol.io) — Claude Desktop, Claude Code, Cursor, Windsurf, and more.

## Features

| Tool | Description |
|------|-------------|
| **kbRead** | Search saved entries by keyword |
| **kbWrite** | Save new information with title, content, optional tags, and optional subdirectory |
| **kbList** | List all stored entries as a directory tree |
| **kbDelete** | Remove an entry by file path |

All entries are plain markdown files — you can edit, version control, or share them however you like.

## Getting Started

### Option 1: VS Code Extension

**Install** from the VS Code Marketplace — search for **Agent Recall**.

Or install manually:

```bash
code --install-extension agent-recall-0.3.0.vsix
```

**First use:**

1. Open **Chat** in any project (e.g. Copilot Chat, Cline, or any LM provider with tool support)
2. Ask the assistant to save something:
   > "Remember that we use 2-space indentation for TypeScript in this org"
3. On the tool confirmation dialog, select **Always Allow** (one-time per tool)
4. The entry is saved to `~/.agent-docs/` as a markdown file

Tools are available in VS Code Chat as `#kbRead`, `#kbWrite`, `#kbList`, and `#kbDelete`.

### Option 2: MCP Server

The MCP server exposes the same four tools over the [Model Context Protocol](https://modelcontextprotocol.io) using stdio transport.

#### Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "agent-recall": {
      "command": "node",
      "args": ["/path/to/agent-recall/out/mcp-server.js"]
    }
  }
}
```

#### Claude Code

```bash
claude mcp add agent-recall node /path/to/agent-recall/out/mcp-server.js
```

#### Cursor / Windsurf / Other MCP Clients

Add to your MCP configuration (see your client's documentation):

```json
{
  "mcpServers": {
    "agent-recall": {
      "command": "node",
      "args": ["/path/to/agent-recall/out/mcp-server.js"]
    }
  }
}
```

#### Custom Storage Directory

By default, entries are stored in `~/.agent-docs/`. To use a different location:

```json
{
  "mcpServers": {
    "agent-recall": {
      "command": "node",
      "args": ["/path/to/agent-recall/out/mcp-server.js", "--storage-dir", "/path/to/your/docs"]
    }
  }
}
```

Or set the `AGENT_RECALL_STORAGE_DIR` environment variable.

#### If installed globally via npm

```json
{
  "mcpServers": {
    "agent-recall": {
      "command": "agent-recall-mcp"
    }
  }
}
```

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

Agent Recall provides four operations backed by the local filesystem:

1. **Write** creates a markdown file in `~/.agent-docs/` with YAML frontmatter (title, timestamps, tags) and your content. An optional `directory` parameter places entries in subdirectories for organization.
2. **Read** performs keyword search across all entries, scoring by frequency and filename matches, returning the top 3 results
3. **List** returns a directory tree of all stored entries
4. **Delete** removes an entry by relative file path and cleans up empty parent directories

The core operations are shared between the VS Code extension and the MCP server.

### VS Code: Instructions File

On activation, the extension writes an instructions file to `~/.agent-docs/.instructions/agent-recall.instructions.md` and registers the folder in VS Code's `chat.instructionsFilesLocations` setting at the user (global) level. This means the instructions are loaded into **every chat conversation**, in every workspace, automatically.

The instructions tell your AI assistant to:
- Always use `#kbRead`, `#kbWrite`, `#kbList`, and `#kbDelete` for knowledge base access (never read the files directly)
- Check the knowledge base before asking the user for previously stored information
- **Read LIBRARIAN.md before every write** to follow organizational guidelines
- Proactively save new decisions, preferences, and patterns
- Prefer knowledge base content over model training data

> **Note:** This file is managed by the extension and overwritten on each activation. Do not customize it directly — your edits will be lost on reload.

### LIBRARIAN.md

On first run, a `LIBRARIAN.md` file is created in your storage directory. This file defines how the assistant should organize, categorize, and format knowledge base entries — acting as a style guide for your library.

The VS Code instructions template tells the assistant to read LIBRARIAN.md (via `#kbRead`) before every write, so it loads the guidelines at the right time — before deciding how to name and organize new entries.

> **Note (VS Code):** This file is managed by the extension and overwritten on each activation. Do not customize it directly — your edits will be lost on reload.
>
> **Note (MCP):** The MCP server only creates LIBRARIAN.md if it doesn't already exist, so your edits are preserved.

## File Structure

### Source files

```
agent-recall/
├── package.json                     # Extension metadata, tool declarations, bin entry
├── src/
│   ├── extension.ts                 # VS Code extension entry point
│   ├── mcp-server.ts                # MCP server entry point (stdio transport)
│   ├── core/
│   │   ├── utils.ts                 # Shared path utilities, file collection, tree builder
│   │   └── operations.ts            # Core KB operations (read, write, list, delete)
│   ├── tools/
│   │   ├── kbReadTool.ts            # VS Code tool wrapper for read
│   │   ├── kbWriteTool.ts           # VS Code tool wrapper for write
│   │   ├── kbListTool.ts            # VS Code tool wrapper for list
│   │   ├── kbDeleteTool.ts          # VS Code tool wrapper for delete
│   │   └── utils.ts                 # VS Code-specific config helpers
│   └── defaults/
│       ├── librarianTemplate.ts     # Default LIBRARIAN.md content
│       └── instructionsTemplate.ts  # Default instructions file content
```

### Runtime files (created automatically)

```
~/.agent-docs/                       # Default location, configurable
├── LIBRARIAN.md                     # Organizational guidelines (managed)
├── .instructions/
│   └── agent-recall.instructions.md # Chat instructions (VS Code only, managed)
├── typescript-indentation.md        # Example entry
├── billing-service-database.md      # Example entry
└── ...                              # One .md file per knowledge base entry
```

- Each entry is a standalone markdown file with YAML frontmatter (`title`, `created`, `updated`, `tags`).
- Filenames are slugified from the entry title (e.g., "TypeScript Indentation" becomes `typescript-indentation.md`).
- Entries can be organized into subdirectories using the `directory` parameter on `kbWrite`.
- Your knowledge base entries are yours — edit, delete, or version control them however you like.

> **Tip:** `git init ~/.agent-docs` — because nothing says "I told you so" like `git revert` after an AI confidently "tidies up" your knowledge base.

## Configuration

### VS Code Extension

| Setting | Default | Description |
|---------|---------|-------------|
| `agentRecall.storageDir` | `~/.agent-docs` | Directory where knowledge base files are stored |

The extension also adds an entry to `chat.instructionsFilesLocations` in your user settings (the tilde-prefixed path to `~/.agent-docs/.instructions`). This is set once on first activation and can be removed manually if desired.

### MCP Server

| Option | Default | Description |
|--------|---------|-------------|
| `--storage-dir <path>` | `~/.agent-docs` | Directory where knowledge base files are stored |
| `AGENT_RECALL_STORAGE_DIR` env var | `~/.agent-docs` | Alternative to `--storage-dir` |

## Compatibility

### VS Code Extension

Uses the [VS Code Language Model Tools API](https://code.visualstudio.com/api/extension-guides/ai/tools):

- **GitHub Copilot** — full support in Agent mode
- **Cline** — via VS Code Language Model API
- **Roo Code** — via VS Code Language Model API
- **Any BYOK provider** — via VS Code's [Bring Your Own Key](https://code.visualstudio.com/blogs/2025/10/22/bring-your-own-key) feature

Requires VS Code 1.95.0 or later.

### MCP Server

Works with any client supporting the [Model Context Protocol](https://modelcontextprotocol.io):

- **Claude Desktop**
- **Claude Code**
- **Cursor**
- **Windsurf**
- **Any MCP-compatible client**

Requires Node.js 18 or later.

## Known Limitations

- Search is keyword-based (no fuzzy matching yet)
- No built-in conflict resolution for concurrent writes
- Maximum of 3 search results returned per query
- `LIBRARIAN.md` and instructions file cannot be customized in VS Code (overwritten on each activation)

## License

MIT
