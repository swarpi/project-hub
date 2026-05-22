# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Dev Commands

```bash
npm run dev          # Start Vite dev server (HMR)
npm run build        # Prefetch GitHub data + tsc + vite build
npm run lint         # ESLint
npm run test         # Vitest (single run)
npm run test:watch   # Vitest (watch mode)
npm run preview      # Serve production build locally
```

`npm run build` runs `npm run prefetch` first (`tsx scripts/prefetch-data.ts`) which fetches live project data from GitHub into `public/data/projects.json`. The dev server works without this step — it falls back to live GitHub API calls.

Path alias: `@` → `./src` (configured in `vite.config.ts` and `tsconfig.app.json`). Base URL: `/project-hub/`.

## Architecture

This is a **React 19 + TypeScript + Vite** single-page app with two views:

### Hub view (`/` route)
Dashboard that fetches GitHub project data and renders orchestration/architecture graphs. Data flows: `data-loader.ts` → `github.ts` → sections + `GraphModal` (uses ReactFlow for visualization).

### Builder view (`/#/builder` route)
Interactive architecture diagram editor. This is the primary feature surface.

**Layout**: `BuilderPage.tsx` renders a 3-panel layout:
- **Left**: `Palette.tsx` (200px) — zone library, drag-to-add components
- **Center**: `Canvas.tsx` — ReactFlow canvas with custom nodes/edges
- **Right**: `RightSidebar.tsx` (268px) — tabbed panel (Properties | YAML | AI)

**State**: Zustand store in `builder-store.ts` with three slices:
- `DiagramSlice` — zones, components, connections, positions
- `UiSlice` — selection state, active panel (`activePanel: "properties" | "ai" | "yaml"`)
- `SettingsSlice` — API key, base URL, grid settings

Persisted to localStorage via `zustand/persist`. Undo/redo via `zundo`.

**Node types**: `archComponent` (services/DBs) and `tierZone` (grouping containers). Edge type: `archConnection` with protocol/style metadata.

**AI integration**: `AIPanel.tsx` sends user prompts + current diagram (as YAML) to the Anthropic API via `ai-client.ts`. AI returns YAML blocks which are parsed (`yaml-import.ts`) and applied to the store via `loadDiagram()`. Two modes: freeform and guided (confidence-tracked Q&A).

**Educational layer**: `education.ts` provides static explanations for tiers, protocols, and communication styles. Used by `Tooltip.tsx` (portal-based, render-prop pattern) in node/edge hover tooltips.

**Color system**: 8 colors (indigo, amber, green, blue, rose, teal, purple, slate) with 4 variants each (main, light, dim, border) using oklch — defined in `node-styles.ts`.

## Workflow

This project uses a hybrid agentic workflow: agents own process, plan mode owns execution.

| Phase | How | When |
|-------|-----|------|
| **Decide** | `/architect` agent | New feature, significant design choice |
| **Map** | `/system-architect` agent | New system or major structural change |
| **Decompose** | `/planner` agent | ADR ready, needs tickets |
| **Execute** | Plan mode (`shift+tab`) | Implementing a specific ticket |
| **Test** | `/qa-tester` agent | Feature complete |
| **Review** | `/reviewer` agent | Code ready for validation |
| **Maintain** | `/custodian` agent | After batch of work, or CLAUDE.md > 200 lines |
| **Report** | `/summarizer` agent | Sprint/feature complete |

**Before any feature**: check for an ADR in `architecture/decisions/` → if missing, run `/architect` first. Then check for tickets in `tickets/` → if missing, run `/planner`.

**Quick fixes** don't need the full pipeline.

### Sub-agent model selection

| Complexity | Model | Use when |
|------------|-------|----------|
| Low | Haiku | File lookups, grep, running tests |
| Medium | Sonnet | Multi-file changes, code review, tests |
| High | Opus | Architecture decisions, complex refactors |

Default to Haiku.

## Key Directories

- `architecture/decisions/` — ADRs
- `tickets/` — Work items by feature folder, `_backlog.md` as sprint board
- `conventions/` — Language-specific coding standards (check before writing code)
- `.claude/agents/` — Subagent role definitions
- `specs/` — Feature specifications

## Styling

All components use inline `CSSProperties` objects — no CSS modules or styled-components. Design tokens live in `src/styles/tokens.css` with `--hub-*` (dashboard) and `--wf-*` (builder) CSS variable prefixes. Font: Geist (sans) and Geist Mono.

## MCP Servers

- **Context7** — Use `resolve` then `get-library-docs` before writing code that depends on a third-party library.
