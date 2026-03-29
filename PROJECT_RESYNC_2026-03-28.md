# Project Resync Report: hive-docs

**Date:** 2026-03-28
**Mode:** Sync (KHA-84 "Revival Decision: the-hive ecosystem" exists in Linear Backlog)
**Last meaningful code change:** August 16, 2025
**Remote:** https://github.com/KHAEntertainment/hive-docs

---

## Executive Summary

hive-docs is a VS Code extension for centralized documentation management, built with TypeScript/React/SQLite/MCP. Phase 1 is largely complete with 233 passing tests, but the project has been dormant for 7+ months following an August 2025 decision to merge it into hive-projecthub. That merger was abandoned. The current direction is to keep the project active for potential integration into the legilimens project. A clean git repo was initialized today, pushed to GitHub, and agent instruction files were rewritten from scratch. The standalone web app still uses mock data — it's the most critical technical gap.

---

## Gap Analysis

### Phase 1 Tasks (from `.kiro/specs/hive-docs/tasks.md`)

| Task | Status | Evidence |
|------|--------|----------|
| 1. Dev environment setup | ✅ Complete | package.json, tsconfig, vite, webpack all configured |
| 2.1 Database connection & schema | ✅ Complete | `src/shared/database/` — 10 files, schema migration system |
| 2.2 Document CRUD operations | ✅ Complete | `src/shared/documents/manager.ts` — full CRUD + FTS5 search |
| 2.3 Concurrent access & recovery | ✅ Complete | WAL mode, `recovery.ts`, error handling |
| 3.1 Workspace markdown scanner | ✅ Complete | `src/shared/import/scanner.ts` with glob + ignore rules |
| 3.2 File import interface | ✅ Complete | `src/shared/import/manager.ts`, ImportDialog.tsx |
| 4.1 Main wiki interface | ✅ Complete | WikiInterface.tsx + 9 other React components |
| 4.2 Import & config interfaces | ✅ Complete | ImportDialog.tsx, ConfigurationPanel.tsx, MCPSetupPanel.tsx |
| 4.3 Markdown rendering & editing | ✅ Complete | MarkdownEditor.tsx (split view), MarkdownRenderer.tsx |
| 5.1 MCP server & tool registry | ✅ Complete | `src/shared/mcp/server.ts` + `registry.ts` |
| 5.2 MCP document tools | ✅ Complete | 4 tools: read, write, search, list documents |
| 5.3 MCP configuration & setup | ✅ Complete | config.ts, MCPSetupPanel.tsx with agent instructions |
| 6.1 Git ignore management | ✅ Complete | `src/shared/git/manager.ts` + `service.ts` |
| 7.1 VS Code extension wrapper | ✅ Complete | extension.ts, webview-provider.ts, package.json manifest |
| 7.2 Web UI integration | ⚠️ Partial | Extension webview IS connected; standalone web uses MockDocumentManager |
| 7.3 Command palette integration | ✅ Complete | 9 commands registered in package.json |
| 8.1 End-to-end workflow tests | 📋 Not started | No E2E tests |
| 8.2 Performance & load testing | 📋 Not started | No perf tests |
| 9.1 User documentation | 📋 Partial | README exists; no MCP setup guides, no user docs |
| 9.2 Distribution preparation | 📋 Not started | No CI/CD, no marketplace listing |

### Code vs. Documentation Drift

| Item | Status | Notes |
|------|--------|-------|
| Kiro specs reference SQLite backend | ⚠️ Drift | Accurate for current code, but strategic direction is Supabase/legilimens |
| Phase 2 specs (71 tasks) | ⚠️ Drift | Massively over-scoped — enterprise SSO, real-time collab, plugin system |
| `integration/unified-document-manager.ts` | 🔴 Dead | Empty file from aborted hive-projecthub merger |
| `src/shared/git/example.ts` | 🔴 Dead | Demo/test artifact, not referenced |
| `App.tsx` MockDocumentManager | ⚠️ Drift | Not documented anywhere that standalone web has no real backend |
| WikiInterface.tsx TODO stubs | ⚠️ Partial | 3 buttons (import, config, MCP) are empty onClick handlers |

### TODO/FIXME Markers in Code

```
src/web/components/WikiInterface.tsx:80 — TODO: Open import dialog
src/web/components/WikiInterface.tsx:87 — TODO: Open config panel
src/web/components/WikiInterface.tsx:94 — TODO: Open MCP setup
```

---

## Changes Made to Agent Instructions

### CLAUDE.md
**Before:** 20KB (580 lines) of superdesign/superdesign UI frontend design instructions — duplicated from .windsurfrules. Zero project working context.

**After:** Comprehensive project reference (~200 lines) covering:
- Project overview and current status
- Tech stack, project structure, dev commands
- Critical gaps (MockDocumentManager, TypeScript errors, dead files)
- Architecture notes (dual build targets, MCP stdio transport, WAL mode, FTS5)
- Known issues and tech debt
- Agent guidelines and coding conventions
- Core-memory Linear access pattern
- Superdesign UI design instructions preserved in a dedicated section at the bottom

### AGENTS.md
**Created new.** Standalone comprehensive reference (~120 lines) for non-Claude tools (Gemini CLI, Codex, OpenCode). Contains the same core information as CLAUDE.md with slightly different framing. Includes:
- Quick start commands
- What's working / what's not
- Coding conventions
- Core-memory Linear access pattern

### Files NOT modified (intentionally kept)
- `.windsurfrules` — Windsurf-specific, same content as old CLAUDE.md. User may still use Windsurf.
- `.cursor/rules/design.mdc` — Cursor-specific design rules
- `.kiro/steering/*` — Kiro IDE steering files
- `.superdesign/` — Superdesign extension artifacts

---

## Linear Audit Report

### Issues Reviewed: 1

### Accurate (no action needed)
None.

### Stale (needs update — flag for human review)
- **KHA-84: "Revival Decision: the-hive ecosystem"** ⚠️
  - What's drifted: This issue is about deciding the fate of the "the-hive ecosystem" broadly. The decision has evolved — hive-docs is no longer merging into hive-projecthub. Current direction is potential integration into legilimens.
  - Suggested correction: Update description to reflect that hive-docs is active, being evaluated for legilimens integration. Close or repurpose as a tracking issue for the hive-docs → legilimens evaluation.

### Appears Done (still open — flag for manual close)
None.

### Missing Issues (new gaps not covered by any existing issue)

These are ordered by priority for getting hive-docs into a healthy, maintainable state.

---

**Connect standalone web app to real SQLite backend**
- Type: Feature
- Priority: High
- Estimated Effort: M
- Why not covered by existing issues: No Linear tracking exists for hive-docs work items.

**Description:**
The standalone web app (`src/web/App.tsx`) uses a `MockDocumentManager` with hardcoded sample documents. The real `DocumentManager` in `src/shared/documents/manager.ts` has full CRUD + FTS5 search but is only wired through the VS Code extension path. The standalone dev server (`npm run dev:web`) shows a demo UI with no real functionality. This is the biggest gap between what's built and what's usable.

**Context & Where to Start:**
Open `src/web/App.tsx` — the `MockDocumentManager` class on lines 7-72 needs to be replaced with the real `DocumentManager` from `src/shared/documents/manager.ts`. The real manager requires a `DatabaseConnection` from `src/shared/database/connection.ts`. The web app runs in a browser context, so you'll need to decide how to bridge the SQLite dependency (e.g., sql.js for browser-side SQLite, or a small Express API server that the web app talks to). Check `src/extension/webview-provider.ts` to see how the extension path handles this — it uses VS Code message passing to communicate with the shared backend.

```
# Session start
memory_search("hive-docs")
execute_integration_action(
  accountId: "0b4764e3-a793-4537-89b7-b26eff7b7675",
  action: "linear_search_issues",
  params: { query: "hive-docs", first: 20 }
)
```

**Approach:**
1. Research whether sql.js (WASM SQLite) can work with the existing schema.ts migrations
2. If yes: create a browser-compatible database connection adapter that uses sql.js
3. If no: create a lightweight Express server that wraps DocumentManager with REST endpoints, and have the web app talk to that
4. Replace MockDocumentManager in App.tsx with the chosen approach
5. Verify all 10 React components work with real data
6. Test full workflow: create document → edit → search → delete

**Acceptance Criteria:**
- [ ] `npm run dev:web` launches a web app connected to a real SQLite database
- [ ] Documents persist across browser refreshes
- [ ] Full-text search returns real results from stored documents
- [ ] Markdown import works from the standalone web app
- [ ] All 10 React components work with real data (not mocks)

**Guardrails:**
- Do not modify the shared database schema or migration system
- Do not break the VS Code extension build path — the shared code must still work with node-sqlite3
- Keep the MockDocumentManager available as a fallback/development mode if needed

---

**Fix TypeScript errors and update dependencies**
- Type: Chore
- Priority: Medium
- Estimated Effort: S
- Why not covered by existing issues: No Linear tracking exists for hive-docs maintenance.

**Description:**
The project has 9 TypeScript errors and 17 npm audit vulnerabilities (13 high). The TS errors are in the extension test runner (Mocha API incompatibility) and MarkdownRenderer (highlight option type). The vulnerabilities are transitive deps (tar, serialize-javascript in mocha). These are not blocking but should be cleaned up to get the project into a healthy state.

**Context & Where to Start:**
Run `./node_modules/.bin/tsc --noEmit` to see the 9 errors. The errors are in:
- `src/extension/test/suite/index.ts` (5 errors) — Mocha constructor and glob API types
- `src/web/components/MarkdownRenderer.tsx` (3 errors) — `highlight` option not in MarkedOptions

Run `npm audit` to see all 17 vulnerabilities.

```
# Session start
memory_search("hive-docs")
execute_integration_action(
  accountId: "0b4764e3-a793-4537-89b7-b26eff7b7675",
  action: "linear_search_issues",
  params: { query: "hive-docs", first: 20 }
)
```

**Approach:**
1. Fix MarkdownRenderer.tsx — cast or restructure the highlight option to satisfy the marked types
2. Fix extension test suite — update Mocha import pattern and glob usage to match current API
3. Run `npm audit fix` for safe fixes, review breaking changes before force-fixing
4. Run `npm test` to confirm 233+ tests still pass after changes

**Acceptance Criteria:**
- [ ] `tsc --noEmit` exits with zero errors
- [ ] `npm test` passes with 233+ tests
- [ ] High-severity npm vulnerabilities resolved or documented as accepted risk

**Guardrails:**
- Do not upgrade sqlite3 major version (native binding compatibility risk)
- Do not change test frameworks (keep Vitest for shared, Mocha for extension)

---

**Remove dead files and wire WikiInterface button handlers**
- Type: Chore
- Priority: Medium
- Estimated Effort: XS
- Why not covered by existing issues: No Linear tracking exists for hive-docs cleanup.

**Description:**
Three categories of cleanup needed: (1) Remove dead files — `integration/unified-document-manager.ts` (empty stub from aborted hive-projecthub merger) and `src/shared/git/example.ts` (unreferenced demo). (2) Wire the 3 TODO button handlers in WikiInterface.tsx (import dialog, config panel, MCP setup). These buttons exist in the UI but do nothing when clicked. (3) Consolidate duplicate agent instruction files — `.windsurfrules` is identical to the old CLAUDE.md content.

**Context & Where to Start:**
- Dead files: `integration/unified-document-manager.ts` (1 line, empty), `src/shared/git/example.ts`
- TODO stubs: `src/web/components/WikiInterface.tsx` lines 80, 87, 94
- Duplicate: Compare `.windsurfrules` with old `CLAUDE.md` — identical superdesign instructions

```
# Session start
memory_search("hive-docs")
execute_integration_action(
  accountId: "0b4764e3-a793-4537-89b7-b26eff7b7675",
  action: "linear_search_issues",
  params: { query: "hive-docs", first: 20 }
)
```

**Approach:**
1. Delete `integration/unified-document-manager.ts` and `src/shared/git/example.ts`
2. Wire WikiInterface buttons to show their respective panels (ImportDialog, ConfigurationPanel, MCPSetupPanel)
3. Check if `.windsurfrules` is still needed — if user doesn't use Windsurf, remove it. If they do, update it to match the new AGENTS.md content.

**Acceptance Criteria:**
- [ ] Dead files removed
- [ ] Import/Config/MCP buttons in WikiInterface navigate to their panels
- [ ] No duplicate instruction files with stale content

**Guardrails:**
- Do not change the component APIs or prop interfaces
- Do not remove `.windsurfrules` without confirming user doesn't use Windsurf
- Do not use Linear CLI or native Linear MCP — use core-memory

---

**Prune Phase 2 specifications to realistic scope**
- Type: Spike
- Priority: Low
- Estimated Effort: M
- Why not covered by existing issues: Phase 2 specs exist but are wildly over-scoped with no tracking.

**Description:**
The Phase 2 specifications in `.kiro/specs/hive-docs-phase2/` contain 71 tasks across 10 epics covering enterprise SSO, real-time collaboration, plugin systems, analytics, and more. This scope is appropriate for a venture-backed SaaS startup, not a personal VS Code extension that may merge into legilimens. The specs need pruning to focus on features that are (a) achievable by a solo developer, (b) valuable for the legilimens integration path, and (c) build on Phase 1's strengths (document management, MCP, search).

**Context & Where to Start:**
Read all three files in `.kiro/specs/hive-docs-phase2/`: requirements.md, design.md, tasks.md. Also read the current legilimens project docs if available to understand what capabilities would be most valuable there. Core-memory search for `legilimens` to find any existing integration plans.

```
# Session start
memory_search("hive-docs")
memory_search("legilimens")
execute_integration_action(
  accountId: "0b4764e3-a793-4537-89b7-b26eff7b7675",
  action: "linear_search_issues",
  params: { query: "hive-docs", first: 20 }
)
```

**Approach:**
1. Read all Phase 2 specs and categorize each epic as: keep, defer, or drop
2. Cross-reference with legilimens needs — what document management capabilities would be most useful there?
3. Likely keep: advanced search (Epic 3), Git integration (Epic 8), content features (Epic 6)
4. Likely defer/drop: enterprise security (Epic 5), collaboration (Epic 4), plugin system (Epic 10), analytics (Epic 9)
5. Produce a pruned Phase 2 spec with ~15-20 tasks instead of 71
6. Get user sign-off before any Phase 2 implementation begins

**Acceptance Criteria:**
- [ ] Phase 2 specs pruned to realistic scope (15-20 tasks max)
- [ ] Each remaining task has clear value for either standalone use or legilimens integration
- [ ] User has reviewed and approved the pruned scope

**Guardrails:**
- This is a documentation/planning task only — do not write code
- Do not delete the original Phase 2 specs — keep them as reference
- Do not use Linear CLI or native Linear MCP — use core-memory

---

### Summary

The Linear tracking for hive-docs is essentially empty — KHA-84 is a meta decision issue, not a work item tracker. The codebase is healthy for a Phase 1 project (233 tests, clean architecture) but has a critical usability gap (standalone web app has no real backend) and some maintenance debt (TS errors, npm vulnerabilities, dead files). The Phase 2 specs need radical pruning before any further development makes sense. The biggest open question is how hive-docs capabilities will map into legilimens — that decision will determine which Phase 2 features are worth building.
