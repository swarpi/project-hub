# Ticket: Toolbar — Undo/Redo, Delete, Zoom Controls, and Save/Load Actions

**Feature:** diagram-builder  
**Status:** Todo  
**Priority:** P1  
**Estimate:** M  
**Related:** ADR-0002

## Context

The builder needs a top toolbar with the primary action controls. ADR-0002 specifies undo/redo, and the builder UX requires a cohesive set of controls accessible without keyboard shortcuts: delete selected, zoom in/out/reset, fit view, auto-layout, download YAML, import YAML, and a settings button. The toolbar consolidates controls that are otherwise scattered.

This ticket creates `src/builder/components/Toolbar.tsx` and wires it to the existing store actions and React Flow utilities.

## Goal

Create a top toolbar for `BuilderPage` with all primary action buttons, keyboard shortcut bindings for the most common actions, and deletion of selected nodes/edges via button and keyboard.

## Acceptance Criteria

- [ ] `Toolbar.tsx` renders a horizontal bar at the top of the builder page with button groups separated by dividers
- [ ] Undo button calls `useBuilderStore.temporal.undo()` (or equivalent from the temporal middleware); is disabled when no history exists; keyboard shortcut `Cmd/Ctrl+Z`
- [ ] Redo button calls `useBuilderStore.temporal.redo()`; is disabled when no future history exists; keyboard shortcut `Cmd/Ctrl+Shift+Z`
- [ ] Delete button removes the selected node (calls `removeComponent`) or selected edge (calls `removeConnection`) based on Zustand selection state; keyboard shortcut `Delete` and `Backspace`; is disabled when nothing is selected
- [ ] Zoom In / Zoom Out / Reset Zoom buttons call React Flow's `zoomIn()`, `zoomOut()`, `setViewport({ x:0, y:0, zoom:1 })` via `useReactFlow()` hook
- [ ] Fit View button calls React Flow's `fitView()`
- [ ] Auto-layout button calls `computeTierLayout` and `updatePositions` (wired from ticket 011)
- [ ] Download YAML button triggers file download (wired from ticket 008)
- [ ] Import YAML button opens the import modal (wired from ticket 009)
- [ ] Settings button opens a settings modal with: API key input (masked, with show/hide toggle), snap-to-grid toggle, grid size input; changes are saved to the store `settings` slice
- [ ] Keyboard shortcuts are bound via a `useEffect` on `window` in `BuilderPage` or `Toolbar`; listeners are cleaned up on unmount; shortcuts do not fire when the user is typing in an input field (check `event.target` tag)
- [ ] All buttons have `title` attributes for tooltip accessibility
- [ ] No lint errors; no TypeScript errors

## Out of Scope

- Multi-select (React Flow provides this by default with shift+click and drag selection)
- Copy/paste of nodes (post-v1)
- Toolbar customization or reordering

## Notes

The `useReactFlow()` hook requires that `Toolbar` be rendered inside the `<ReactFlow>` provider context. If `Toolbar` is outside the `<ReactFlow>` component tree, use a `ReactFlowProvider` wrapper around `BuilderPage`, or pass zoom/fitView callbacks via props from `Canvas`. The settings modal can be a `<dialog>` element (same pattern as the import modal in ticket 009). The toolbar height should be approximately 48px; use a subtle bottom border to separate it from the canvas area.

## Implementation Plan

_To be filled in by the executor before starting work._

1. Step 1
2. Step 2
3. Step 3
