# Ticket: Builder Panel Component Integration Tests

**Feature:** testing
**Status:** Todo
**Priority:** P1
**Estimate:** L
**Related:** ADR-0005

## Context

Five non-canvas builder components can be integration-tested with `@testing-library/react` in jsdom:

- `src/builder/components/PropertiesPanel.tsx` (~400 LOC) — renders form fields for the selected component/edge; dispatches store updates on change
- `src/builder/components/Toolbar.tsx` (~300 LOC) — buttons for new diagram, undo, redo, export, settings
- `src/builder/components/Palette.tsx` (~200 LOC) — zone list and component templates; drag-start initiates DnD
- `src/builder/components/RightSidebar.tsx` (~150 LOC) — tab switcher that renders the correct panel for each tab
- `src/builder/components/YamlPreview.tsx` (~200 LOC) — renders YAML from store state; textarea edit + apply

Canvas-related components (Canvas, ArchComponentNode, TierZoneNode, ArchConnectionEdge) are explicitly excluded per ADR-0005.

Depends on ticket 001 (infrastructure) and ticket 003 (store tests, for understanding store shape).

## Goal

Create co-located `.test.tsx` files for all five components verifying that they render correctly from store state, respond to user interactions, and dispatch the expected store actions.

## Acceptance Criteria

**`PropertiesPanel.test.tsx`:**
- [ ] Renders a message or empty state when no node/edge is selected (`selectedNodeId` and `selectedEdgeId` are null)
- [ ] When a component is selected (set via `useBuilderStore.setState`), the component's `title` and `technology` values appear in the rendered inputs
- [ ] Changing the `title` input value and blurring (or submitting) calls `updateComponent` on the store with the new title
- [ ] When a connection/edge is selected, the edge's `protocol` and `style` fields are rendered

**`Toolbar.test.tsx`:**
- [ ] All expected buttons render (at minimum: "New", undo, redo, export/download, settings trigger)
- [ ] Clicking the "New Diagram" button calls the store's reset or `loadDiagram` action (verify via `vi.spyOn` on the store action or by asserting state change)
- [ ] The undo button is disabled when there is no history to undo
- [ ] The redo button is disabled when there is no redo history

**`Palette.test.tsx`:**
- [ ] The palette renders at least one zone entry for each zone in the store's default `zones` array
- [ ] Component template items (e.g., "Service", "Database") are present in the DOM
- [ ] Each component template item has a `draggable` attribute or equivalent drag handler

**`RightSidebar.test.tsx`:**
- [ ] The sidebar renders four tab buttons: Properties, YAML, AI, Learn
- [ ] Clicking the "YAML" tab sets `activePanel` to `"yaml"` in the store
- [ ] Clicking the "AI" tab sets `activePanel` to `"ai"` in the store
- [ ] When `activePanel` is `"properties"`, the PropertiesPanel (or its container) is visible
- [ ] When `activePanel` changes to a different tab, the previously active panel is hidden (not unmounted — verify the `visibility` pattern is used for panels that retain state)

**`YamlPreview.test.tsx`:**
- [ ] The component renders a `<textarea>` or `<pre>` containing YAML derived from the current store state
- [ ] The rendered YAML contains the diagram name from store state
- [ ] Editing the textarea content and clicking "Apply" (or equivalent) calls `loadDiagram` with the parsed result
- [ ] Editing the textarea with invalid YAML and clicking "Apply" does not crash and shows an error message

**General:**
- [ ] All five test files use the `ReactFlowWrapper` from `src/test/react-flow-wrapper.tsx` as the `wrapper` option in `render()` calls (required for components that read ReactFlow context)
- [ ] `npm run test:coverage` shows ≥75% line coverage for all five components
- [ ] No lint errors
- [ ] No TypeScript errors

## Out of Scope

- Drag-and-drop from Palette to Canvas (requires real browser — E2E ticket 011)
- Testing Canvas or node/edge components
- Testing AIPanel or LearnPanel (ticket 009, due to MSW complexity)
- Pixel-perfect style assertions

## Notes

Pre-populate the store with fixture data in `beforeEach` using `useBuilderStore.setState(...)` from `src/test/store-helpers.ts`. For PropertiesPanel tests that require a selected component, set `selectedNodeId` to a component ID that exists in the fixture.

For Toolbar undo/redo button states, use zundo's `temporal.getState().pastStates.length` to determine expected disabled state — or simply assert the button's `disabled` attribute after each state transition.

`RightSidebar` re-exports whichever panel is active. The `visibility: hidden` pattern means all four panels are always mounted — verify `toBeVisible()` / `not.toBeVisible()` rather than `toBeInTheDocument()` / `not.toBeInTheDocument()`.

## Implementation Plan

_To be filled in by the executor before starting work._

1. Step 1
2. Step 2
3. Step 3
