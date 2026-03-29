# hive-docs - Agent Instructions

## Project Overview

hive-docs is a VS Code extension for centralized wiki-style documentation management with SQLite storage, React web UI, and MCP server integration for AI agent access. Version 0.1.0, Phase 1 largely complete. Being evaluated for integration into the legilimens project rather than standalone production.

## Quick Start

```bash
npm install          # Install dependencies
npm run dev:web      # Start standalone web dev server at localhost:3000
npm run dev:extension # Build extension in watch mode
npm test             # Run Vitest test suite (233 tests)
npm run build        # Build both web app and extension
npm run lint         # Check for linting errors
```

**Prerequisites:** Node.js 18+, npm

## Tech Stack

- TypeScript, React 18
- SQLite3 with FTS5 (full-text search)
- @modelcontextprotocol/sdk (MCP server, stdio transport)
- Vite (web build) + Webpack (extension build)
- Vitest (tests), ESLint
- VS Code Extension API ^1.74.0

## Project Structure

```
src/
├── extension/     — VS Code extension (activation, webview, commands)
├── shared/        — Core business logic
│   ├── config/    — Settings management
│   ├── database/  — SQLite connection, schema, migration, recovery
│   ├── documents/ — Document CRUD, search, metadata
│   ├── git/       — Git ignore management
│   ├── import/    — Workspace markdown scanner + importer
│   └── mcp/       — MCP server + tools (read/write/search/list)
└── web/           — React standalone web app
    └── components/ — 10 UI components (WikiInterface, DocumentEditor, etc.)
```

**Important:** The standalone web app (`src/web/App.tsx`) currently uses a `MockDocumentManager` — it's not wired to the real SQLite backend. The VS Code extension webview path IS connected.

## What's Working

- SQLite database with FTS5 search, WAL mode, schema migrations, recovery
- Document CRUD with full-text search, tags, metadata
- MCP server with 4 tools over stdio transport
- Git ignore management for database files
- Markdown file import with workspace scanner
- 10 React UI components
- VS Code extension with commands, webview, configuration
- 233 unit tests passing

## What's Not

- Standalone web app uses mock data (no real backend connection)
- 3 unwired buttons in WikiInterface.tsx (import, config, MCP setup)
- 9 TypeScript errors (test runner types, MarkdownRenderer)
- 17 npm audit vulnerabilities (transitive)
- No E2E tests
- Phase 2 specs exist but are massively over-scoped (71 tasks, enterprise-grade features)

## Coding Conventions

- Tests live alongside source files (`*.test.ts`)
- React components use co-located CSS (`Component.tsx` + `Component.css`)
- Database changes must go through the migration system (`src/shared/database/schema.ts`)
- MCP tool changes must update the tool registry (`src/shared/mcp/tools/index.ts`)
- Be cautious with native modules (sqlite3 has native bindings)

## Context & Project Management Access

**Do not use the Linear CLI or native Linear MCP directly.**

All Linear interaction goes through **core-memory MCP** via `execute_integration_action`. This builds accumulated project memory over time.

**Session start pattern:**
```
memory_search("hive-docs")

execute_integration_action(
  accountId: "0b4764e3-a793-4537-89b7-b26eff7b7675",
  action: "linear_search_issues",
  params: { query: "hive-docs", first: 20 }
)
```

**Available Linear actions:**
- `linear_search_issues`, `linear_create_issue`, `linear_update_issue`
- `linear_create_project`, `linear_update_project`
- `linear_create_label`, `linear_list_cycles`, `linear_get_viewer`

**Linear accountId:** `0b4764e3-a793-4537-89b7-b26eff7b7675`

**Tracking:** KHA-84 "Revival Decision: the-hive ecosystem" (Backlog). No dedicated Linear project.

## Related Projects

- **legilimens-cli** — potential destination for hive-docs document management
- **hive-projecthub** — previous planned merger target (deprioritized)
