# Ticket: Polish — Snap-to-Grid, Keyboard Shortcuts, Alignment, and Empty State

**Feature:** diagram-builder  
**Status:** Todo  
**Priority:** P3  
**Estimate:** M  
**Related:** ADR-0002

## Context

With all core features in place, this ticket covers the polish layer: snap-to-grid visual feedback, a complete keyboard shortcut set, canvas alignment guides when dragging, an empty-state prompt for a fresh canvas, and minor UX improvements throughout the builder.

## Goal

Implement snap-to-grid visual grid, complete the keyboard shortcut set, add canvas empty state, and fix any UX rough edges discovered during integration of previous tickets.

## Acceptance Criteria

- [ ] When `settings.snapToGrid` is `true`, React Flow's `snapToGrid` and `snapGrid` props are active on the canvas, and the `Background` component shows a grid (dot or line) pattern that aligns with the snap grid size
- [ ] A settings panel toggle (from ticket 012's settings modal) controls snap-to-grid on/off and grid size (16px or 32px options)
- [ ] The complete keyboard shortcut set is functional and documented in a tooltip or help overlay accessible from the toolbar:
  - `Cmd/Ctrl+Z` — undo
  - `Cmd/Ctrl+Shift+Z` — redo
  - `Delete` / `Backspace` — delete selected node or edge
  - `Cmd/Ctrl+A` — select all nodes
  - `Escape` — deselect all / close modals
  - `Cmd/Ctrl+Shift+F` — fit view
- [ ] When the canvas has no components (diagram is empty), a centered empty-state overlay is shown on the canvas: "Drag a component from the palette to get started" with an icon, and optionally a quick "Import YAML" link
- [ ] The empty state disappears as soon as the first component is added
- [ ] Hovering over a node shows a subtle drop shadow or elevation effect (CSS `box-shadow` on the node card)
- [ ] Double-clicking the canvas background (not a node) triggers component creation: opens a small inline popup or places a default "New Service Component" at the click position (either behavior is acceptable for v1)
- [ ] The builder page has a correct `<title>` (e.g., "Diagram Builder — Project Hub") set via a `useEffect` that updates `document.title` and restores it on unmount
- [ ] `npm run build` completes without TypeScript errors or warnings
- [ ] `npm run lint` passes

## Out of Scope

- Multi-select alignment commands (align left, distribute horizontally) — post-v1
- Copy/paste of nodes — post-v1
- Touch/mobile UX optimization — deferred per ADR-0002
- Subcomponent UI — deferred per ADR-0002

## Notes

React Flow's `onPaneDoubleClick` prop can be used for canvas double-click. The help overlay for keyboard shortcuts can be a simple fixed-position panel toggled by a "?" button in the toolbar. For `document.title` management, the cleanup function of the `useEffect` should restore the previous title: capture `const prev = document.title` before setting, and `return () => { document.title = prev; }`. This ticket is intentionally a catch-all for polish — the executor should also fix any visual inconsistencies found during integration testing.

## Implementation Plan

_To be filled in by the executor before starting work._

1. Step 1
2. Step 2
3. Step 3
