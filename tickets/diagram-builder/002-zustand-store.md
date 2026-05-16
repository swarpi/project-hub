# Ticket: Zustand Store — Diagram Model, UI State, and Undo/Redo History

**Feature:** diagram-builder  
**Status:** Done  
**Priority:** P1  
**Estimate:** M  
**Related:** ADR-0002

## Context

The builder needs a single source of truth for: (1) the canonical diagram model (components and connections that map to YAML), (2) undo/redo history, and (3) UI state (selected panel, active tool, AI panel visibility). ADR-0002 specifies Zustand for this purpose, using its `temporal` middleware for undo/redo and `persist` middleware for localStorage auto-save.

This store is the backbone that all subsequent builder components will read from and write to. Getting the shape and actions right now prevents rework across every later ticket.

## Goal

Implement `src/builder/store/builder-store.ts` with the full diagram model state, undo/redo via `zustand/middleware/temporal`, localStorage persistence via `zustand/middleware/persist`, and all CRUD actions needed by the builder.

## Acceptance Criteria

- [ ] `builder-store.ts` exports a `useBuilderStore` hook powered by Zustand
- [ ] The store's `DiagramModel` type mirrors `Architecture` from `src/lib/types.ts` and extends `ArchComponent` / `ArchConnection` with an optional `position: { x: number; y: number }` field for canvas layout
- [ ] State slice `diagram` contains: `name: string`, `description: string`, `components: ArchComponent[]`, `connections: ArchConnection[]`, `positions: Record<string, { x: number; y: number }>`
- [ ] State slice `ui` contains: `selectedNodeId: string | null`, `selectedEdgeId: string | null`, `activePanel: 'properties' | 'ai' | 'yaml'`, `aiPanelOpen: boolean`
- [ ] State slice `settings` contains: `apiKey: string`, `snapToGrid: boolean`, `gridSize: number`
- [ ] Actions exposed: `addComponent`, `updateComponent`, `removeComponent`, `addConnection`, `updateConnection`, `removeConnection`, `updatePositions`, `setDiagramMeta`, `selectNode`, `selectEdge`, `clearSelection`, `setActivePanel`, `setApiKey`, `setSnapToGrid`
- [ ] `undo()` and `redo()` are available via the `temporal` middleware; calling `undo` after `addComponent` removes the added component
- [ ] `settings` slice (including `apiKey`) is persisted to localStorage under key `diagram-builder-settings`; `diagram` slice is persisted under key `diagram-builder-diagram`
- [ ] A unit-testable exported function `createInitialDiagram(): DiagramModel` returns an empty diagram (name: "Untitled Architecture", empty arrays)
- [ ] No lint errors; TypeScript strict mode passes

## Out of Scope

- React Flow node/edge synchronization (that happens in the Canvas ticket, 003)
- The `yaml-export.ts` and `yaml-import.ts` modules (tickets 008 and 009)
- Settings modal UI

## Notes

Use `zustand/middleware` `temporal` wrapper only around the `diagram` slice, not the `ui` or `settings` slices — history of UI state changes would be confusing and wasteful. The `persist` middleware should use `JSON.stringify`/`JSON.parse` with no custom serializer for v1. Position data should live in the store (not in React Flow's internal state) so that it round-trips through YAML import correctly.

Zustands `temporal` middleware is from the `zundo` package or from `zustand/middleware/temporal` depending on version — check the installed `zustand` version before implementing. As of Zustand v5, `temporal` is available via the separate `zundo` package.

## Implementation Plan

_To be filled in by the executor before starting work._

1. Step 1
2. Step 2
3. Step 3
