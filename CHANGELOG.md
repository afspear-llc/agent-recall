# Changelog

## 0.3.0

- Added `kbDelete` tool — CRUD is now complete
- `kbWrite` supports `directory` parameter for subdirectory organization
- LIBRARIAN.md guidance loaded pre-write via instructions (instead of post-write)
- Managed files (LIBRARIAN.md, instructions) always overwrite on activation
- Path traversal protection on write and delete operations
- Rebranded from "Copilot Recall" to "Agent Recall" — works with any VS Code Language Model provider

## 0.2.2

- Fixed `inputSchema` registration (was incorrectly using `parametersSchema`)

## 0.2.0

- Reframed tool `modelDescription` fields for better autonomous invocation
- Rewrote instructions template to identity-based framing

## 0.1.0

- Initial release
- `kbRead`, `kbWrite`, `kbList` tools
- Keyword search with scoring
- YAML frontmatter on all entries
- Configurable storage directory
