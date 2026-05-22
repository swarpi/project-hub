# Ticket: Builder Store Unit Tests

**Feature:** testing
**Status:** Done
**Priority:** P1
**Estimate:** L
**Related:** ADR-0005

## Context

`src/builder/store/builder-store.ts` (353 LOC) is the largest single source file and the central nervous system of the builder. It contains three Zustand slices (DiagramSlice, UiSlice, SettingsSlice) with 8+ action groups, `persist` middleware writing to `localStorage`, and `temporal` (zundo) undo/redo tracking. Regressions in the store break the entire builder silently — there are currently zero tests for it.

The store is a singleton (`useBuilderStore`), so tests must reset state between runs. The `resetStore()` utility from ticket 001's `src/test/store-helpers.ts` handles this via `beforeEach`.

Depends on ticket 001 (infrastructure).

## Goal

Create `src/builder/store/builder-store.test.ts` that covers every action group in all three slices, verifies undo/redo behavior, and confirms `localStorage` persistence and rehydration.

## Acceptance Criteria

**DiagramSlice — component actions:**
- [ ] `addComponent` adds a component to `state.components` with the correct fields and generates a unique `id`
- [ ] `addComponent` called twice with the same title produces two components with distinct IDs
- [ ] `updateComponent` changes only the specified fields on the matching component; other components are unchanged
- [ ] `updateComponent` with a non-existent ID is a no-op (no throw, state unchanged)
- [ ] `removeComponent` removes the component by ID and also removes any connections referencing that component ID in `from` or `to`
- [ ] `removeComponent` with a non-existent ID is a no-op

**DiagramSlice — connection actions:**
- [ ] `addConnection` adds a connection with `from`, `to`, `protocol`, `style` to `state.connections`
- [ ] `removeConnection` removes the connection by ID; other connections remain
- [ ] `updateConnection` changes only specified fields on the matching connection

**DiagramSlice — zone actions:**
- [ ] `addZone` appends a new zone to `state.zones` with a unique ID
- [ ] `updateZone` changes the specified zone's `label` or `color`; other zones unchanged
- [ ] `removeZone` removes the zone and reassigns any components in that zone to the first remaining zone (or leaves them unzoned if no zones remain)
- [ ] `reorderZones` produces the expected new zone order

**DiagramSlice — diagram-level actions:**
- [ ] `loadDiagram` replaces all state (name, zones, components, connections, positions) with the provided `DiagramModel`
- [ ] `setDiagramName` updates `state.name`
- [ ] `updatePositions` merges the provided position record into `state.positions`

**UiSlice actions:**
- [ ] `setSelectedNodeId` updates `state.selectedNodeId`
- [ ] `setSelectedEdgeId` updates `state.selectedEdgeId`
- [ ] `setActivePanel` updates `state.activePanel` and accepts all four valid values (`"properties"`, `"ai"`, `"yaml"`, `"learn"`)

**SettingsSlice actions:**
- [ ] `setApiKey` updates `state.apiKey`
- [ ] `setAiBaseUrl` updates `state.aiBaseUrl`
- [ ] `setSnapToGrid` toggles the boolean correctly

**Undo/redo (temporal/zundo):**
- [ ] After `addComponent`, calling `useBuilderStore.temporal.getState().undo()` removes the added component from `state.components`
- [ ] After `undo`, calling `redo()` re-adds the component
- [ ] Undo/redo does not affect `UiSlice` or `SettingsSlice` (selection state is not part of the temporal history)

**Persistence (localStorage):**
- [ ] After calling `addComponent`, `localStorage.getItem('builder-store')` is non-null (persist middleware has written)
- [ ] The persisted JSON contains the component that was added
- [ ] Calling `resetStore()` followed by re-initializing the store reads back the persisted state (rehydration works)

**Coverage:**
- [ ] `npm run test:coverage` shows ≥85% line coverage for `builder-store.ts`
- [ ] No lint errors
- [ ] No TypeScript errors

## Out of Scope

- Testing the React hook (`useBuilderStore`) in a rendered component — that is covered by component integration tests (tickets 007–008)
- Testing `loadDiagram` with a full YAML parse pipeline — use a hand-crafted `DiagramModel` fixture directly
- Testing `persist` rehydration in a full browser session (that is E2E, ticket 011)

## Notes

`localStorage` is available in jsdom. The `persist` middleware writes synchronously in jsdom (no storage event delay), so assertions on `localStorage.getItem` can be made immediately after a store action.

For temporal/zundo tests, access the undo/redo API via `useBuilderStore.temporal.getState().undo()` and `.redo()` (not via a React hook). This works outside React render in a Vitest test.

Reset `localStorage` in `beforeEach` using `localStorage.clear()` in addition to the store state reset, to prevent persistence bleed between tests.

If certain internal helpers (e.g., `createInitialDiagram`) are not exported from `builder-store.ts`, define equivalent inline fixtures in the test file rather than importing them.

## Implementation Plan

_To be filled in by the executor before starting work._

1. Step 1
2. Step 2
3. Step 3
