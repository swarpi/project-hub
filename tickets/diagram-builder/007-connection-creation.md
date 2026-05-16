# Ticket: Connection Creation via React Flow Port Handles

**Feature:** diagram-builder  
**Status:** Todo  
**Priority:** P1  
**Estimate:** S  
**Related:** ADR-0002

## Context

Users need to create connections between components by dragging from one node's port to another. ADR-0002 specifies using React Flow's built-in `Handle` components on each node — source handles and target handles appear as small circles on the node edges. When the user completes a drag from source to target, an `ArchConnection` is added to the Zustand store.

After creation, the edge should be immediately selected and the properties panel should open so the user can set label, protocol, and style.

## Goal

Add React Flow `Handle` components to `ArchComponentNode`, wire the `onConnect` callback in `Canvas.tsx` to call `addConnection` on the Zustand store, and ensure new connections are immediately selected and editable.

## Acceptance Criteria

- [ ] Each `ArchComponentNode` renders four `Handle` components: one `Position.Top` source, one `Position.Bottom` source, one `Position.Left` target, one `Position.Right` target (or equivalent — React Flow's connection validation allows flexible handle placement)
- [ ] Handles are visually small (10px circles) in the node's accent color; they appear on hover of the node (using CSS `:hover` or a React state flag) to avoid visual clutter when not connecting
- [ ] Dragging from any source handle to any target handle on a different node triggers `onConnect` in `Canvas.tsx`, which calls `addConnection({ from: sourceNodeId, to: targetNodeId, label: '', protocol: '', style: 'sync' })` on the Zustand store
- [ ] After connection creation, `selectEdge` is called with the new connection's identifier so the properties panel switches to edge editing mode
- [ ] Attempting to connect a node to itself is prevented (React Flow's `isValidConnection` callback returns `false` when `source === target`)
- [ ] Duplicate connections (same `from` and `to` pair) are prevented — `isValidConnection` checks the existing store connections
- [ ] Existing connections load correctly on canvas mount (they were present before this ticket; this ticket ensures handles don't break the existing edge rendering from ticket 004)
- [ ] No lint errors; no TypeScript errors

## Out of Scope

- Edge reconnection (dragging an existing edge endpoint to a different node) — can be enabled as a React Flow prop in v1 if trivial, but not required
- Visual edge routing customization
- Orthogonal or step edge types

## Notes

React Flow's `Handle` visibility on hover can be achieved with a CSS class toggled on the node wrapper, or with a React `useState` flag on the node component. The cleaner approach for v1 is a CSS rule in a `<style>` tag or inline style using the `:hover` pseudo-class on the node wrapper. Handles need `type="source"` and `type="target"` props — React Flow enforces that connections go from source to target. The `id` field on `Handle` is optional but helps if multiple handles of the same type exist on a node.

## Implementation Plan

_To be filled in by the executor before starting work._

1. Step 1
2. Step 2
3. Step 3
