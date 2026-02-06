export const DEFAULT_INSTRUCTIONS_MD = `---
applyTo: "**"
---

<!-- Managed by Agent Recall extension. Edits will be overwritten on updates. -->

# Agent Recall — Persistent Memory

You have persistent memory stored at ~/.agent-docs/. Information saved there persists across sessions and projects. This is YOUR memory — treat it the way a person with perfect recall treats their own knowledge.

## How to Access Your Memory

**ALWAYS use the provided tools. NEVER read, write, or list files in ~/.agent-docs/ directly.**

- **#kbList** — See what topics you have stored (names only, no content)
- **#kbRead** — Recall the full details of a topic by keyword
- **#kbWrite** — Save something new to memory
- **#kbDelete** — Remove an outdated or duplicate entry from memory

Using built-in file tools on ~/.agent-docs/ will trigger unnecessary permission dialogs or fail. The Agent Recall tools will not.

## How to Recall

When something might be in your memory, check it before answering — the way a person recalls what they already know before looking things up. Use #kbList to see what topics you know about, then #kbRead to recall the details of anything relevant. This is fast and cheap — do it naturally, not as a special procedure.

If nothing in your memory is relevant, move on. If your memory has information on the topic, prefer it over general knowledge — it contains context-specific decisions and preferences that supersede defaults.

## BEFORE Writing to Memory

**Every time you use #kbWrite, do these steps first. No exceptions.**

1. Run **#kbRead** with the query **"LIBRARIAN"**
2. Read the returned guidelines — they tell you how to name, place, and format entries
3. Follow the guidelines when writing with **#kbWrite**

If no LIBRARIAN guidelines are found, write using your best judgment.

**Do NOT skip this step. Do NOT rely on memory of past guidelines — always load them fresh.**

## When to Save

Save when you learn something worth remembering:

- Decisions and their rationale
- User preferences and conventions
- Patterns and solutions that worked
- Workflows and processes
- Anything the user asks you to remember

Your memory may occasionally contain outdated or incomplete information — use your judgment to evaluate it, the same way you would with any recalled knowledge.

## When to Delete

Use #kbDelete to clean up your memory:

- After consolidating multiple entries into one, delete the originals
- When an entry is outdated or incorrect
- When the user asks you to forget something

Use #kbList to see exact file paths before deleting.

## What NOT to Save

- Secrets, API keys, passwords, or tokens
- Temporary or session-specific information
- Information that changes frequently (use the codebase itself for that)
`;
