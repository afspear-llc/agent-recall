# Agent Recall

Persistent, cross-project memory for AI assistants. Save decisions, preferences, and context once — recall them in any project, any session.

Works as a **VS Code extension** and as a standalone **MCP server**.

## Tools

| Tool | Description |
|------|-------------|
| **kbRead** | Search saved entries by keyword |
| **kbWrite** | Save entries with title, content, optional tags and subdirectory |
| **kbList** | List all entries as a directory tree |
| **kbDelete** | Remove an entry by file path |

Entries are plain markdown files with YAML frontmatter, stored in `~/.agent-docs/` by default. Edit, version control, or share them however you like.

## Setup

### VS Code Extension

Install from the VS Code Marketplace — search for **Agent Recall**.

Tools are available in Chat as `#kbRead`, `#kbWrite`, `#kbList`, and `#kbDelete`. Works with GitHub Copilot, Cline, Roo Code, and any provider supporting the [Language Model Tools API](https://code.visualstudio.com/api/extension-guides/ai/tools). Requires VS Code 1.95+.

### MCP Server

Works with any [MCP](https://modelcontextprotocol.io)-compatible client — Claude Desktop, Claude Code, Cursor, Windsurf, etc. Requires Node.js 18+.

**Claude Code:**

```bash
claude mcp add agent-recall node /path/to/agent-recall/out/mcp-server.js
```

**Claude Desktop / Cursor / other clients** — add to your MCP config:

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

**If installed globally via npm:**

```json
{
  "mcpServers": {
    "agent-recall": {
      "command": "agent-recall-mcp"
    }
  }
}
```

## Configuration

| Context | Setting | Default |
|---------|---------|---------|
| VS Code | `agentRecall.storageDir` | `~/.agent-docs` |
| MCP CLI | `--storage-dir <path>` | `~/.agent-docs` |
| MCP env | `AGENT_RECALL_STORAGE_DIR` | `~/.agent-docs` |

## How It Works

Entries are markdown files with YAML frontmatter (`title`, `created`, `updated`, `tags`). Filenames are slugified from the title (e.g. "TypeScript Indentation" becomes `typescript-indentation.md`). Subdirectories are supported via the `directory` parameter on `kbWrite`.

```
~/.agent-docs/
├── LIBRARIAN.md                     # Organizational guidelines
├── frontend/
│   ├── styling.md
│   └── components.md
├── infrastructure/
│   └── database.md
└── api/
    └── users.md
```

**LIBRARIAN.md** defines how the assistant should organize and categorize entries. The VS Code extension overwrites it on each activation; the MCP server only creates it if missing.

**Instructions file** (VS Code only): The extension auto-registers `~/.agent-docs/.instructions/agent-recall.instructions.md` so every chat conversation knows to use the KB tools proactively.

> **Tip:** `git init ~/.agent-docs` — because nothing says "I told you so" like `git revert` after an AI confidently "tidies up" your knowledge base.

## License

MIT
