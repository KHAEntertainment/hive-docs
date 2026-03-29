# hive-docs - Agent Instructions

## Project Overview

hive-docs is a VS Code extension for centralized wiki-style documentation management. It uses SQLite for local storage, provides a React web UI embedded via webviews, and exposes document operations to AI agents through an MCP server. Currently at v0.1.0 with Phase 1 largely complete. The project is being evaluated for integration into the legilimens project rather than standalone production.

## Tech Stack

- **Language**: TypeScript
- **Frontend**: React 18 with custom CSS (no component library)
- **Build**: Vite (web app) + Webpack (extension)
- **Test**: Vitest (unit), Mocha (extension integration)
- **Database**: SQLite3 (node-sqlite3) with FTS5 full-text search
- **MCP**: @modelcontextprotocol/sdk ^1.17.3 (stdio transport)
- **Markdown**: marked + highlight.js
- **Extension**: VS Code API ^1.74.0, webview panel
- **Linting**: ESLint 8 + @typescript-eslint

## Project Structure

```
src/
├── extension/            # VS Code extension layer
│   ├── extension.ts      # Activation, commands, lifecycle
│   ├── webview-provider.ts  # React UI embedding via webviews
│   ├── configuration-manager.ts
│   ├── mcp-server-manager.ts
│   └── test/             # Mocha-based extension tests
├── shared/               # Core business logic (shared between extension and web)
│   ├── config/           # Configuration management
│   ├── database/         # SQLite connection, schema, migration, recovery
│   ├── documents/        # Document CRUD, search, metadata
│   ├── git/              # Git ignore management
│   ├── import/           # Markdown file scanner + importer
│   ├── mcp/              # MCP server, tool registry, 4 document tools
│   │   └── tools/        # readDocument, writeDocument, searchDocuments, listDocuments
│   └── types.ts          # Shared TypeScript interfaces
└── web/                  # Standalone React web application
    ├── App.tsx           # Entry point (NOTE: uses MockDocumentManager)
    ├── main.tsx
    ├── index.html
    └── components/       # 10 React components with co-located CSS
        ├── WikiInterface.tsx      # Main layout (sidebar + editor)
        ├── DocumentList.tsx       # Document navigation
        ├── DocumentEditor.tsx     # Edit/create documents
        ├── DocumentMetadataEditor.tsx
        ├── MarkdownEditor.tsx     # Split editor/preview
        ├── MarkdownRenderer.tsx   # Markdown → HTML rendering
        ├── SearchInterface.tsx    # Full-text search UI
        ├── ImportDialog.tsx       # Markdown file import
        ├── MCPSetupPanel.tsx      # AI agent setup instructions
        └── ConfigurationPanel.tsx # Settings management
```

## Development Commands

```bash
# Install
npm install

# Dev server (standalone web app at localhost:3000)
npm run dev:web

# Dev extension (watch mode)
npm run dev:extension

# Build web app
npm run build:web

# Build extension
npm run build:extension

# Build both
npm run build

# Run tests (Vitest)
npm test

# Run tests in watch mode
npm run test:watch

# Lint
npm run lint
npm run lint:fix

# Package VS Code extension
npm run package
```

## Current Status

**Phase 1 (MVP):** Largely complete. 233 tests passing. Core modules all implemented.

What works:
- SQLite database layer with FTS5 search, schema migration, recovery
- Document CRUD with full-text search, tags, metadata
- MCP server with 4 tools (read/write/search/list documents) over stdio transport
- Git ignore management for database files
- Markdown file import with workspace scanner and ignore rules
- 10 React UI components with CSS styling
- VS Code extension scaffold with commands, webview, configuration

Critical gaps:
- **Web UI uses MockDocumentManager** — the standalone web app (`App.tsx`) is not connected to the real SQLite backend. The extension/webview path IS connected via `webview-provider.ts`, but the standalone dev server has no real data.
- **3 TODO stubs in WikiInterface.tsx** — import dialog, config panel, and MCP setup buttons are not wired
- **9 TypeScript errors** — extension test runner (Mocha types) and MarkdownRenderer (highlight option)
- **17 npm vulnerabilities** (13 high) — transitive deps in tar, mocha
- **No E2E tests** — Phase 1 tasks 8-9 not started
- **Phase 2 specs massively over-scoped** — 71 tasks across 10 epics covering enterprise SSO, real-time collaboration, plugin systems. Needs significant pruning.

Dead files to clean up:
- `integration/unified-document-manager.ts` — empty stub from aborted hive-projecthub merger
- `src/shared/git/example.ts` — appears to be a test/demo artifact

## Architecture Notes

- **Two build targets**: Vite for standalone web, Webpack for VS Code extension. Shared code lives in `src/shared/`.
- **MCP uses stdio transport** — the MCP server communicates over stdin/stdout, not HTTP. The `mcp-server-manager.ts` in the extension layer manages the server lifecycle.
- **Database uses WAL mode** — SQLite Write-Ahead Logging for better concurrent access.
- **FTS5 for search** — Full-text search virtual table `documents_fts` with automatic triggers to keep index in sync.
- **Extension registers as bottom panel** — `views: { panel: [...] }` in package.json, optimized for landscape layout.
- **WebView message passing** — `webview-provider.ts` handles bidirectional communication between extension and React UI via `postMessage`.

## Known Issues / Tech Debt

1. App.tsx MockDocumentManager — standalone web dev server has no real backend
2. 9 TypeScript errors in test runner and MarkdownRenderer
3. 17 npm audit vulnerabilities (transitive)
4. WikiInterface.tsx has 3 unwired button handlers
5. Phase 2 specs (71 tasks) are over-scoped — need pruning before any Phase 2 work
6. CLAUDE.md was previously 20KB of superdesign instructions (replaced 2026-03-28)

## Agent Guidelines

- Do not modify the SQLite schema without updating the migration system in `src/shared/database/schema.ts`
- MCP tool changes must update both the tool implementation AND `src/shared/mcp/tools/index.ts` registry
- React components use co-located CSS files (Component.tsx + Component.css)
- Tests use Vitest and live alongside source files (*.test.ts)
- The extension test runner uses Mocha (separate from Vitest)
- Do not add new npm dependencies without checking for native module compatibility (sqlite3 has native bindings)

## Related Projects / Dependencies

- **legilimens-cli** — potential destination for hive-docs document management capabilities
- **hive-projecthub** — previous planned merger target (Aug 2025 decision, now deprioritized)

## Context & Project Management Access

**Do not use the Linear CLI or native Linear MCP directly.**

All Linear interaction goes through **core-memory MCP** via `execute_integration_action`. This is what builds accumulated project memory over time — each call is logged and future sessions benefit from what was accessed.

**Session start pattern:**
```
# 1. Search memory for prior context
memory_search("hive-docs")

# 2. Check Linear backlog via core-memory
execute_integration_action(
  accountId: "0b4764e3-a793-4537-89b7-b26eff7b7675",
  action: "linear_search_issues",
  params: { query: "hive-docs", first: 20 }
)
```

**Available Linear actions through core-memory:**
- `linear_search_issues` — search/filter by project, label, state, text
- `linear_create_issue` — create with projectId, priority, labels, parent
- `linear_update_issue` — update state, project, labels (requires internal UUID, not KHA-XX)
- `linear_create_project` / `linear_update_project` — manage projects
- `linear_create_label` — create team labels
- `linear_list_cycles` — list sprints/cycles
- `linear_get_viewer` — get authenticated user

**Linear accountId:** `0b4764e3-a793-4537-89b7-b26eff7b7675`

**Linear tracking:** KHA-84 "Revival Decision: the-hive ecosystem" (Backlog) — only issue referencing this project. No dedicated Linear project exists.

Additional context (decisions, notes, test results) lives in **Linear project docs** — not in this repo. Keep this CLAUDE.md focused on what an agent needs to work immediately, not a full knowledge dump.

Local ephemeral context (session notes, prompt experiments, machine-specific config) lives in `.agent/` (gitignored, never committed).

## UI Design Instructions

When asked to design UI or frontend interfaces, use the Superdesign extension patterns. Output design files in `.superdesign/design_iterations/` as `{design_name}_{n}.html`. Use Flowbite library, avoid indigo/blue defaults, generate responsive designs, use Google Fonts from the approved list. Follow the step-by-step workflow: layout design → theme design → animation design → generate HTML.
